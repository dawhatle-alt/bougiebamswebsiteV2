import { sql, eq, and, isNull, desc } from "drizzle-orm";
import { db, ordersTable, registrationsTable, eventsTable } from "@workspace/db";
import { logger } from "./logger";
import { sendOrderNotificationEmail, sendRegistrationConfirmationEmail } from "./email";
import { markRedemptionPaid } from "./discounts";
import { tableExists } from "./dbBootstrap";

// Migrations are applied manually in this project (drizzle-kit push doesn't run
// on deploy), so lazily create the table on first use — same pattern as
// site_settings. Idempotent and safe per serverless instance.
let ordersTableReady: Promise<void> | null = null;

function ensureOrdersTable(): Promise<void> {
  if (!ordersTableReady) {
    // Check the catalog first — DDL (even no-op ALTERs) takes exclusive locks
    // that queue behind live traffic when run on every cold start. Production
    // already has the table with all columns (kind/discount_code/discount_cents
    // were added in place); the create path only runs in fresh environments.
    ordersTableReady = tableExists("orders")
      .then(async (exists) => {
        if (exists) return;
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS orders (
            id text PRIMARY KEY,
            kind text NOT NULL DEFAULT 'product',
            total_cents integer NOT NULL DEFAULT 0,
            currency text NOT NULL DEFAULT 'USD',
            buyer_name text,
            buyer_email text,
            buyer_phone text,
            shipping_address text,
            items text,
            state text NOT NULL DEFAULT 'COMPLETED',
            notified_at timestamptz,
            discount_code text,
            discount_cents integer NOT NULL DEFAULT 0,
            created_at timestamptz NOT NULL DEFAULT now()
          )
        `);
        // Deny-all via Supabase's public REST API; the server's direct Postgres
        // connection is the table owner and is unaffected.
        await db.execute(sql`ALTER TABLE orders ENABLE ROW LEVEL SECURITY`);
      })
      .catch((err) => {
        ordersTableReady = null;
        throw err;
      });
  }
  return ordersTableReady;
}

interface SquareOrderLike {
  id?: string;
  state?: string | null;
  referenceId?: string | null;
  totalMoney?: { amount?: bigint | number | null; currency?: string | null } | null;
  totalDiscountMoney?: { amount?: bigint | number | null } | null;
  discounts?: { name?: string | null }[] | null;
  tenders?: unknown[] | null;
  createdAt?: string | null;
  lineItems?: {
    name?: string | null;
    quantity?: string | null;
    totalMoney?: { amount?: bigint | number | null } | null;
    grossSalesMoney?: { amount?: bigint | number | null } | null;
  }[] | null;
  fulfillments?: {
    shipmentDetails?: { recipient?: RecipientLike | null } | null;
    pickupDetails?: { recipient?: RecipientLike | null } | null;
    deliveryDetails?: { recipient?: RecipientLike | null } | null;
  }[] | null;
}

interface RecipientLike {
  displayName?: string | null;
  emailAddress?: string | null;
  phoneNumber?: string | null;
  address?: {
    addressLine1?: string | null;
    addressLine2?: string | null;
    locality?: string | null;
    administrativeDistrictLevel1?: string | null;
    postalCode?: string | null;
    country?: string | null;
  } | null;
}

function formatAddress(r: RecipientLike | null | undefined): string | null {
  const a = r?.address;
  if (!a) return null;
  const cityLine = [a.locality, a.administrativeDistrictLevel1, a.postalCode]
    .filter(Boolean)
    .join(", ");
  const lines = [a.addressLine1, a.addressLine2, cityLine, a.country].filter(
    (x): x is string => !!x && x.trim().length > 0,
  );
  return lines.length > 0 ? lines.join("\n") : null;
}

const toCents = (m?: { amount?: bigint | number | null } | null): number =>
  m?.amount != null ? Number(m.amount) : 0;

// Payment-link orders stay in state OPEN after payment (they only become
// COMPLETED once the seller finishes fulfillment), so "paid" must be detected
// from the tenders (payments) attached to the order, not the order state.
export function isPaidOrder(order: SquareOrderLike): boolean {
  if (order.state === "COMPLETED") return true;
  return order.state === "OPEN" && (order.tenders?.length ?? 0) > 0;
}

export async function listOrders() {
  await ensureOrdersTable();
  return db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
}

/** Orders placed with a given buyer email (Square records the email the buyer
 * entered at checkout, so this is the best available link to an account). */
export async function listOrdersByEmail(email: string) {
  await ensureOrdersTable();
  const normalized = email.trim().toLowerCase();
  return db
    .select()
    .from(ordersTable)
    .where(sql`lower(${ordersTable.buyerEmail}) = ${normalized}`)
    .orderBy(desc(ordersTable.createdAt));
}

/**
 * Persists a paid Square order — product purchases and event registration
 * payments alike (events carry a referenceId pointing at the registration and
 * are tagged kind="event"). Product orders email the shop owner exactly once;
 * event payments don't (the registrations flow owns those emails). Safe to call
 * from multiple capture paths — the insert is keyed on the Square order id, and
 * the email is claimed via a conditional update before sending. Pass
 * notify=false for backfill/sync of older orders to record them silently.
 */
export async function recordSquareOrder(
  order: SquareOrderLike,
  opts: { notify?: boolean } = {},
): Promise<void> {
  if (!order.id) return;
  if (!isPaidOrder(order)) return;

  await ensureOrdersTable();

  const isEvent = !!order.referenceId;
  const notify = (opts.notify ?? true) && !isEvent;

  const recipient =
    order.fulfillments?.map(
      (f) => f.shipmentDetails?.recipient ?? f.deliveryDetails?.recipient ?? f.pickupDetails?.recipient,
    ).find(Boolean) ?? null;

  let buyerName = recipient?.displayName ?? null;
  let buyerEmail = recipient?.emailAddress ?? null;

  // Event checkouts don't collect a shipping recipient — pull the buyer's
  // details from the registration the order references.
  if (isEvent) {
    const regId = parseInt(order.referenceId!, 10);
    if (!Number.isNaN(regId)) {
      const [reg] = await db
        .select({ name: registrationsTable.name, email: registrationsTable.email })
        .from(registrationsTable)
        .where(eq(registrationsTable.id, regId))
        .limit(1);
      if (reg) {
        buyerName = buyerName ?? reg.name;
        buyerEmail = buyerEmail ?? reg.email;
      }
    }
  }

  const items = (order.lineItems ?? []).map((li) => ({
    name: li.name ?? "Item",
    quantity: li.quantity ?? "1",
    amountCents: toCents(li.totalMoney ?? li.grossSalesMoney),
  }));

  // Checkout names order-level discounts "CODE (NN% off)"; the code is the part
  // before the parenthetical. totalDiscountMoney is the dollars Square took off.
  const discountName = order.discounts?.map((d) => d.name).find(Boolean) ?? null;
  const discountCode = discountName ? discountName.split(" (")[0].trim() || null : null;
  const discountCents = toCents(order.totalDiscountMoney);

  await db
    .insert(ordersTable)
    .values({
      id: order.id,
      kind: isEvent ? "event" : "product",
      totalCents: toCents(order.totalMoney),
      currency: order.totalMoney?.currency ?? "USD",
      discountCode,
      discountCents,
      buyerName,
      buyerEmail,
      buyerPhone: recipient?.phoneNumber ?? null,
      shippingAddress: formatAddress(recipient),
      items: JSON.stringify(items),
      state: order.state ?? "COMPLETED",
      ...(order.createdAt ? { createdAt: new Date(order.createdAt) } : {}),
    })
    // Refresh just the discount fields on re-capture so orders recorded before
    // these columns existed get backfilled by the next Square sync.
    .onConflictDoUpdate({
      target: ordersTable.id,
      set: { discountCode, discountCents },
    });

  // If this order used a discount code, stamp the redemption as consumed so the
  // code can't be reused by the same email.
  try {
    await markRedemptionPaid(order.id);
  } catch (err) {
    logger.error({ err, orderId: order.id }, "Failed to mark discount redemption as paid");
  }

  // Every paid event order repairs its registration: seats are limited, so a
  // paid guest must never be missing from the list because a webhook or the
  // confirmation redirect failed at the wrong moment.
  if (isEvent) {
    try {
      await repairRegistrationFromOrder(order, { buyerName, buyerEmail });
    } catch (err) {
      logger.error({ err, orderId: order.id }, "Failed to reconcile registration from Square order");
    }
  }

  if (!notify) return;

  // Claim the notification (notified_at flips exactly once) so concurrent
  // capture paths can't double-send. Reset the claim if the send fails so a
  // later capture retries.
  const [claimed] = await db
    .update(ordersTable)
    .set({ notifiedAt: new Date() })
    .where(and(eq(ordersTable.id, order.id), isNull(ordersTable.notifiedAt)))
    .returning({ id: ordersTable.id });

  if (!claimed) return;

  try {
    await sendOrderNotificationEmail({
      orderId: order.id,
      totalCents: toCents(order.totalMoney),
      currency: order.totalMoney?.currency ?? "USD",
      discountCode,
      discountCents,
      buyerName,
      buyerEmail,
      buyerPhone: recipient?.phoneNumber ?? null,
      shippingAddress: formatAddress(recipient),
      items,
    });
  } catch (err) {
    logger.error({ err, orderId: order.id }, "Order notification failed — releasing claim for retry");
    await db
      .update(ordersTable)
      .set({ notifiedAt: null })
      .where(eq(ordersTable.id, order.id))
      .catch(() => {});
  }
}

/**
 * Reconciles a registration against its PAID Square order (the caller has
 * already verified payment). Three repairs, all idempotent:
 * - stuck "pending" despite payment → confirm, take a spot, email the guest
 * - confirmed but no payment reference (shows "Free") → stamp the reference
 * - registration missing entirely → restore it from the order, take a spot
 */
async function repairRegistrationFromOrder(
  order: SquareOrderLike,
  buyer: { buyerName: string | null; buyerEmail: string | null },
): Promise<void> {
  if (!order.id || !order.referenceId) return;
  const regId = parseInt(order.referenceId, 10);
  if (Number.isNaN(regId)) return;

  const paymentRef = `square-order-${order.id}`;

  const [reg] = await db
    .select()
    .from(registrationsTable)
    .where(eq(registrationsTable.id, regId))
    .limit(1);

  if (reg) {
    if (reg.status === "pending") {
      await db
        .update(registrationsTable)
        .set({ status: "confirmed", paymentSessionId: reg.paymentSessionId ?? paymentRef })
        .where(eq(registrationsTable.id, reg.id));
      await db
        .update(eventsTable)
        .set({ spotsLeft: sql`GREATEST(0, ${eventsTable.spotsLeft} - 1)` })
        .where(eq(eventsTable.id, reg.eventId));
      logger.warn({ registrationId: reg.id, orderId: order.id }, "Reconciled paid-but-pending registration from Square order");

      const [evt] = await db.select().from(eventsTable).where(eq(eventsTable.id, reg.eventId)).limit(1);
      if (evt && reg.email) {
        try {
          await sendRegistrationConfirmationEmail({
            registrantName: reg.name,
            registrantEmail: reg.email,
            eventTitle: evt.title,
            eventDate: evt.date,
            eventTime: evt.time,
            eventLocation: evt.location,
            eventHost: evt.host,
          });
        } catch (err) {
          logger.error({ err, registrationId: reg.id }, "Reconciliation confirmation email failed");
        }
      }
    } else if (reg.status === "confirmed" && !reg.paymentSessionId) {
      await db
        .update(registrationsTable)
        .set({ paymentSessionId: paymentRef })
        .where(eq(registrationsTable.id, reg.id));
      logger.info({ registrationId: reg.id, orderId: order.id }, "Stamped payment reference on confirmed registration");
    }
    return;
  }

  // The registration row is gone (or was never written). Restore it so the
  // guest holds their seat — idempotent via the exact note marker.
  const restoreNote = `Restored from Square order ${order.id}`;
  const [alreadyRestored] = await db
    .select({ id: registrationsTable.id })
    .from(registrationsTable)
    .where(eq(registrationsTable.notes, restoreNote))
    .limit(1);
  if (alreadyRestored) return;

  const eventTitle = order.lineItems?.[0]?.name;
  if (!eventTitle) {
    logger.warn({ orderId: order.id }, "Paid event order references a missing registration but has no line item to match an event");
    return;
  }
  const [evt] = await db.select().from(eventsTable).where(eq(eventsTable.title, eventTitle)).limit(1);
  if (!evt) {
    logger.warn({ orderId: order.id, eventTitle }, "Paid event order references a missing registration; no event matches its line item");
    return;
  }

  await db.insert(registrationsTable).values({
    eventId: evt.id,
    name: buyer.buyerName ?? "Guest (restored from Square)",
    email: buyer.buyerEmail ?? "",
    notes: restoreNote,
    status: "confirmed",
    paymentSessionId: paymentRef,
  });
  await db
    .update(eventsTable)
    .set({ spotsLeft: sql`GREATEST(0, ${eventsTable.spotsLeft} - 1)` })
    .where(eq(eventsTable.id, evt.id));
  logger.warn({ orderId: order.id, eventId: evt.id }, "Restored missing registration from paid Square order — check name/email against Square");
}

// Orders placed within this window still get the owner notification when they
// are first seen via sync; anything older is backfilled silently.
const NOTIFY_WINDOW_MS = 2 * 60 * 60 * 1000;

interface OrdersSearchClient {
  orders: {
    search(req: object): Promise<{ orders?: SquareOrderLike[] }>;
  };
}

/**
 * Pulls recent orders straight from Square and records any paid product orders
 * that are missing locally. This makes the admin Orders view accurate even when
 * the payment webhook isn't configured and the buyer never lands on the
 * confirmation page with an order reference.
 */
export async function syncOrdersFromSquare(
  client: OrdersSearchClient,
  locationId: string,
): Promise<void> {
  if (!locationId) return;

  const resp = await client.orders.search({
    locationIds: [locationId],
    limit: 100,
    query: {
      filter: { stateFilter: { states: ["OPEN", "COMPLETED"] } },
      sort: { sortField: "CREATED_AT", sortOrder: "DESC" },
    },
  });

  for (const order of resp.orders ?? []) {
    const createdMs = order.createdAt ? Date.parse(order.createdAt) : 0;
    const fresh = createdMs > 0 && Date.now() - createdMs < NOTIFY_WINDOW_MS;
    try {
      await recordSquareOrder(order, { notify: fresh });
    } catch (err) {
      logger.error({ err, orderId: order.id }, "Failed to record order during Square sync");
    }
  }
}
