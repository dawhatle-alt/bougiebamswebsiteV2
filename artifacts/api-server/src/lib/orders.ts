import { sql, eq, and, isNull, desc } from "drizzle-orm";
import { db, ordersTable } from "@workspace/db";
import { logger } from "./logger";
import { sendOrderNotificationEmail } from "./email";

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

export async function listOrders() {
  await ensureOrdersTable();
  return db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
}

/**
 * Persists a completed Square product order (skips event registrations, which
 * carry a referenceId and are handled by the registrations flow) and emails the
 * order details to the shop owner exactly once. Safe to call from multiple
 * capture paths — the insert is keyed on the Square order id, and the email is
 * claimed via a conditional update before sending.
 */
export async function recordProductOrder(order: SquareOrderLike): Promise<void> {
  if (!order.id) return;
  if (order.referenceId) return; // event registration — not a product order
  if (order.state !== "COMPLETED") return;

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
