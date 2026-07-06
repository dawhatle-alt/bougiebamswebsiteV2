import { sql, eq, and, isNull, desc } from "drizzle-orm";
import { db, ordersTable } from "@workspace/db";
import { logger } from "./logger";
import { sendOrderNotificationEmail } from "./email";
import { markRedemptionPaid } from "./discounts";

// Migrations are applied manually in this project (drizzle-kit push doesn't run
// on deploy), so lazily create the table on first use — same pattern as
// site_settings. Idempotent and safe per serverless instance.
let ordersTableReady: Promise<void> | null = null;

function ensureOrdersTable(): Promise<void> {
  if (!ordersTableReady) {
    ordersTableReady = db
      .execute(sql`
        CREATE TABLE IF NOT EXISTS orders (
          id text PRIMARY KEY,
          total_cents integer NOT NULL DEFAULT 0,
          currency text NOT NULL DEFAULT 'USD',
          buyer_name text,
          buyer_email text,
          buyer_phone text,
          shipping_address text,
          items text,
          state text NOT NULL DEFAULT 'COMPLETED',
          notified_at timestamptz,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `)
      .then(() => undefined)
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

/**
 * Persists a paid Square product order (skips event registrations, which
 * carry a referenceId and are handled by the registrations flow) and emails the
 * order details to the shop owner exactly once. Safe to call from multiple
 * capture paths — the insert is keyed on the Square order id, and the email is
 * claimed via a conditional update before sending. Pass notify=false for
 * backfill/sync of older orders to record them without emailing.
 */
export async function recordProductOrder(
  order: SquareOrderLike,
  opts: { notify?: boolean } = {},
): Promise<void> {
  const notify = opts.notify ?? true;
  if (!order.id) return;
  if (order.referenceId) return; // event registration — not a product order
  if (!isPaidOrder(order)) return;

  await ensureOrdersTable();

  const recipient =
    order.fulfillments?.map(
      (f) => f.shipmentDetails?.recipient ?? f.deliveryDetails?.recipient ?? f.pickupDetails?.recipient,
    ).find(Boolean) ?? null;

  const items = (order.lineItems ?? []).map((li) => ({
    name: li.name ?? "Item",
    quantity: li.quantity ?? "1",
    amountCents: toCents(li.totalMoney ?? li.grossSalesMoney),
  }));

  await db
    .insert(ordersTable)
    .values({
      id: order.id,
      totalCents: toCents(order.totalMoney),
      currency: order.totalMoney?.currency ?? "USD",
      buyerName: recipient?.displayName ?? null,
      buyerEmail: recipient?.emailAddress ?? null,
      buyerPhone: recipient?.phoneNumber ?? null,
      shippingAddress: formatAddress(recipient),
      items: JSON.stringify(items),
      state: order.state ?? "COMPLETED",
      ...(order.createdAt ? { createdAt: new Date(order.createdAt) } : {}),
    })
    .onConflictDoNothing({ target: ordersTable.id });

  // If this order used a discount code, stamp the redemption as consumed so the
  // code can't be reused by the same email.
  try {
    await markRedemptionPaid(order.id);
  } catch (err) {
    logger.error({ err, orderId: order.id }, "Failed to mark discount redemption as paid");
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
      buyerName: recipient?.displayName ?? null,
      buyerEmail: recipient?.emailAddress ?? null,
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
      await recordProductOrder(order, { notify: fresh });
    } catch (err) {
      logger.error({ err, orderId: order.id }, "Failed to record order during Square sync");
    }
  }
}
