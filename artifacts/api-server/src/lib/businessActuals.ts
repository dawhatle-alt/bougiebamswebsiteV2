import { eq } from "drizzle-orm";
import {
  db,
  ordersTable,
  eventsTable,
  registrationsTable,
  subscribersTable,
} from "@workspace/db";
import { tableExists } from "./dbBootstrap";

// Real store performance aggregated from orders/registrations/subscribers.
// Used by the Business HQ Actuals endpoint and as grounding for the AI
// advisor. Queries run sequentially — pipelined queries stall behind the
// transaction-mode pooler.

interface OrderItem {
  name?: string;
  quantity?: number | string;
  amountCents?: number;
}

export interface BusinessActuals {
  products: {
    revenueCents: number;
    orderCount: number;
    unitsSold: number;
    byProduct: { name: string; quantity: number; revenueCents: number }[];
  };
  events: {
    revenueCents: number;
    orderCount: number;
    byEvent: {
      id: number;
      title: string;
      date: string;
      priceCents: number;
      capacity: number;
      confirmed: number;
      paid: number;
      revenueCents: number;
    }[];
  };
  monthly: { month: string; productCents: number; eventCents: number }[];
  subscribers: { total: number; last30: number };
  discountCentsTotal: number;
  byDiscountCode: { code: string; orders: number; revenueCents: number; discountCents: number }[];
}

export async function computeActuals(): Promise<BusinessActuals> {
  const hasOrders = await tableExists("orders");
  const orders = hasOrders
    ? await db
        .select({
          kind: ordersTable.kind,
          totalCents: ordersTable.totalCents,
          discountCode: ordersTable.discountCode,
          discountCents: ordersTable.discountCents,
          items: ordersTable.items,
          createdAt: ordersTable.createdAt,
        })
        .from(ordersTable)
        .where(eq(ordersTable.state, "COMPLETED"))
    : [];

  const events = await db
    .select({
      id: eventsTable.id,
      title: eventsTable.title,
      date: eventsTable.date,
      priceCents: eventsTable.priceCents,
      totalSpots: eventsTable.totalSpots,
    })
    .from(eventsTable);

  const registrations = await db
    .select({
      eventId: registrationsTable.eventId,
      status: registrationsTable.status,
      paymentSessionId: registrationsTable.paymentSessionId,
      createdAt: registrationsTable.createdAt,
    })
    .from(registrationsTable);

  const subscriberRows = await db
    .select({ subscribedAt: subscribersTable.subscribedAt })
    .from(subscribersTable);

  // Product vs event revenue, per-product breakdown, monthly trend,
  // per-discount-code attribution
  let productRevenueCents = 0;
  let productOrderCount = 0;
  let eventRevenueCents = 0;
  let eventOrderCount = 0;
  let discountCentsTotal = 0;
  let unitsSold = 0;
  const byProduct = new Map<string, { name: string; quantity: number; revenueCents: number }>();
  const monthly = new Map<string, { productCents: number; eventCents: number }>();
  const byCode = new Map<string, { code: string; orders: number; revenueCents: number; discountCents: number }>();

  for (const order of orders) {
    discountCentsTotal += order.discountCents ?? 0;
    if (order.discountCode) {
      const code = order.discountCode.toUpperCase();
      const entry = byCode.get(code) ?? { code, orders: 0, revenueCents: 0, discountCents: 0 };
      entry.orders += 1;
      entry.revenueCents += order.totalCents;
      entry.discountCents += order.discountCents ?? 0;
      byCode.set(code, entry);
    }
    const month = order.createdAt.toISOString().slice(0, 7);
    const bucket = monthly.get(month) ?? { productCents: 0, eventCents: 0 };
    if (order.kind === "event") {
      // Event money is counted from paid registrations below — registrations
      // are the complete record (Square event orders only exist for payments
      // captured since the July 2026 webhook fix, so counting them here would
      // undercount and double-count at the same time).
    } else {
      productRevenueCents += order.totalCents;
      productOrderCount += 1;
      bucket.productCents += order.totalCents;
      if (order.items) {
        try {
          const items = JSON.parse(order.items) as OrderItem[];
          for (const item of items) {
            const name = (item.name ?? "Unknown").trim();
            const qty = Number(item.quantity ?? 1) || 1;
            unitsSold += qty;
            const entry = byProduct.get(name) ?? { name, quantity: 0, revenueCents: 0 };
            entry.quantity += qty;
            entry.revenueCents += item.amountCents ?? 0;
            byProduct.set(name, entry);
          }
        } catch {
          // Malformed items JSON on an old order — skip the breakdown, keep totals.
        }
      }
    }
    monthly.set(month, bucket);
  }

  // Per-event fill + paid revenue from registrations — the authoritative
  // source for event money. Also buckets paid registrations into the monthly
  // trend by registration date.
  const priceByEvent = new Map(events.map((e) => [e.id, e.priceCents ?? 0]));
  const regsByEvent = new Map<number, { confirmed: number; paid: number }>();
  for (const reg of registrations) {
    const entry = regsByEvent.get(reg.eventId) ?? { confirmed: 0, paid: 0 };
    if (reg.status === "confirmed") entry.confirmed += 1;
    if (reg.paymentSessionId) {
      entry.paid += 1;
      const priceCents = priceByEvent.get(reg.eventId) ?? 0;
      if (priceCents > 0) {
        eventRevenueCents += priceCents;
        eventOrderCount += 1;
        const month = reg.createdAt.toISOString().slice(0, 7);
        const bucket = monthly.get(month) ?? { productCents: 0, eventCents: 0 };
        bucket.eventCents += priceCents;
        monthly.set(month, bucket);
      }
    }
    regsByEvent.set(reg.eventId, entry);
  }
  const byEvent = events
    .map((e) => {
      const regs = regsByEvent.get(e.id) ?? { confirmed: 0, paid: 0 };
      return {
        id: e.id,
        title: e.title,
        date: e.date,
        priceCents: e.priceCents ?? 0,
        capacity: e.totalSpots,
        confirmed: regs.confirmed,
        paid: regs.paid,
        revenueCents: regs.paid * (e.priceCents ?? 0),
      };
    })
    .filter((e) => e.confirmed > 0 || e.paid > 0)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  return {
    products: {
      revenueCents: productRevenueCents,
      orderCount: productOrderCount,
      unitsSold,
      byProduct: [...byProduct.values()].sort((a, b) => b.revenueCents - a.revenueCents),
    },
    events: {
      revenueCents: eventRevenueCents,
      orderCount: eventOrderCount,
      byEvent,
    },
    monthly: [...monthly.entries()]
      .map(([month, cents]) => ({ month, ...cents }))
      .sort((a, b) => (a.month < b.month ? -1 : 1)),
    subscribers: {
      total: subscriberRows.length,
      last30: subscriberRows.filter((s) => s.subscribedAt.getTime() >= thirtyDaysAgo).length,
    },
    discountCentsTotal,
    byDiscountCode: [...byCode.values()].sort((a, b) => b.revenueCents - a.revenueCents),
  };
}
