import { inArray } from "drizzle-orm";
import {
  db,
  ordersTable,
  eventsTable,
  registrationsTable,
  productsTable,
  bizEventCostsTable,
  bizExpensesTable,
} from "@workspace/db";
import { tableExists } from "./dbBootstrap";
import { ensureExpensesTable } from "./businessBootstrap";

// Monthly cash-basis P&L built from the same sources as the actuals engine:
// revenue from paid orders/registrations, product COGS from unit costs, event
// direct costs from the Event Profit Engine overlay, operating expenses from
// the owner-entered biz_expenses ledger. Queries run sequentially —
// pipelined queries stall behind the transaction-mode pooler.

export const EXPENSE_CATEGORIES = [
  "processing-fees",
  "software",
  "marketing",
  "shipping-supplies",
  "travel",
  "event-fees",
  "event-food",
  "insurance",
  "other",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

// Square's standard online rate, used when the owner hasn't entered the real
// monthly fee total as a processing-fees expense row.
const FEE_RATE = 0.029;
const FEE_FLAT_CENTS = 30;

interface OrderItem {
  name?: string;
  quantity?: number | string;
}

export interface PnlStatement {
  month: string;
  revenue: {
    productCents: number;
    eventCents: number;
    totalCents: number;
    productOrders: number;
    paidSeats: number;
  };
  cogs: {
    productCogsCents: number;
    unmatchedUnits: number;
    eventCostsCents: number;
    eventCostEvents: { title: string; cents: number }[];
    totalCents: number;
  };
  grossProfitCents: number;
  expenses: {
    feesCents: number;
    feesSource: "estimated" | "manual";
    rows: { id: number; category: string; description: string; amountCents: number }[];
    byCategory: { category: string; cents: number }[];
    totalCents: number;
  };
  netProfitCents: number;
}

const toCents = (dollars: number) => Math.round(dollars * 100);

/** Computes P&L statements for the given months (e.g. current + prior) from a
 * single sequential data pull. Months are "YYYY-MM". */
export async function computePnl(months: string[]): Promise<PnlStatement[]> {
  await ensureExpensesTable();

  const hasOrders = await tableExists("orders");
  const orders = hasOrders
    ? await db
        .select({
          kind: ordersTable.kind,
          totalCents: ordersTable.totalCents,
          items: ordersTable.items,
          createdAt: ordersTable.createdAt,
        })
        .from(ordersTable)
    : [];
  const products = await db
    .select({ name: productsTable.name, unitCost: productsTable.unitCost })
    .from(productsTable);
  const events = await db
    .select({
      id: eventsTable.id,
      title: eventsTable.title,
      date: eventsTable.date,
      priceCents: eventsTable.priceCents,
    })
    .from(eventsTable);
  const registrations = await db
    .select({
      eventId: registrationsTable.eventId,
      paymentSessionId: registrationsTable.paymentSessionId,
      createdAt: registrationsTable.createdAt,
    })
    .from(registrationsTable);
  const hasEventCosts = await tableExists("biz_event_costs");
  const eventCosts = hasEventCosts ? await db.select().from(bizEventCostsTable) : [];
  const expenseRows =
    months.length > 0
      ? await db.select().from(bizExpensesTable).where(inArray(bizExpensesTable.month, months))
      : [];

  const unitCostByName = new Map(
    products
      .filter((p) => p.unitCost != null)
      .map((p) => [p.name, Number(p.unitCost)]),
  );
  const priceByEvent = new Map(events.map((e) => [e.id, e.priceCents ?? 0]));
  const eventById = new Map(events.map((e) => [e.id, e]));
  const costsByEvent = new Map(eventCosts.map((c) => [c.sourceEventId, c]));

  return months.map((month) => {
    // Revenue + product COGS from orders created in the month
    let productCents = 0;
    let productOrders = 0;
    let productCogsCents = 0;
    let unmatchedUnits = 0;
    for (const order of orders) {
      if (order.createdAt.toISOString().slice(0, 7) !== month) continue;
      if (order.kind === "event") continue; // counted from registrations below
      productCents += order.totalCents;
      productOrders += 1;
      if (order.items) {
        try {
          const items = JSON.parse(order.items) as OrderItem[];
          for (const item of items) {
            const qty = Number(item.quantity ?? 1) || 1;
            const cost = unitCostByName.get((item.name ?? "").trim());
            if (cost != null) productCogsCents += toCents(cost) * qty;
            else unmatchedUnits += qty;
          }
        } catch {
          // Malformed items JSON on an old order — revenue still counts.
        }
      }
    }

    // Event revenue from paid registrations created in the month (cash basis)
    let eventCents = 0;
    let paidSeats = 0;
    for (const reg of registrations) {
      if (!reg.paymentSessionId) continue;
      if (reg.createdAt.toISOString().slice(0, 7) !== month) continue;
      const priceCents = priceByEvent.get(reg.eventId) ?? 0;
      if (priceCents > 0) {
        eventCents += priceCents;
        paidSeats += 1;
      }
    }

    // Event direct costs land in the month the event happens
    let eventCostsCents = 0;
    const eventCostEvents: { title: string; cents: number }[] = [];
    for (const cost of eventCosts) {
      const evt = eventById.get(cost.sourceEventId);
      if (!evt || evt.date.slice(0, 7) !== month) continue;
      const cents = toCents(cost.venueCost) + toCents(cost.otherExpenses);
      if (cents > 0) {
        eventCostsCents += cents;
        eventCostEvents.push({ title: evt.title, cents });
      }
    }

    // Operating expenses: owner-entered ledger rows, plus processing fees —
    // real (manual rows) when entered, otherwise Square's standard rate.
    const rows = expenseRows
      .filter((r) => r.month === month)
      .map((r) => ({
        id: r.id,
        category: r.category,
        description: r.description,
        amountCents: r.amountCents,
      }));
    const manualFeesCents = rows
      .filter((r) => r.category === "processing-fees")
      .reduce((s, r) => s + r.amountCents, 0);
    const hasManualFees = rows.some((r) => r.category === "processing-fees");
    const revenueTotal = productCents + eventCents;
    const estFeesCents =
      revenueTotal > 0
        ? Math.round(revenueTotal * FEE_RATE) + FEE_FLAT_CENTS * (productOrders + paidSeats)
        : 0;
    const feesCents = hasManualFees ? manualFeesCents : estFeesCents;

    const byCategoryMap = new Map<string, number>();
    for (const r of rows) {
      byCategoryMap.set(r.category, (byCategoryMap.get(r.category) ?? 0) + r.amountCents);
    }
    if (!hasManualFees && estFeesCents > 0) {
      byCategoryMap.set("processing-fees", estFeesCents);
    }
    const byCategory = [...byCategoryMap.entries()]
      .map(([category, cents]) => ({ category, cents }))
      .sort((a, b) => b.cents - a.cents);
    const expensesTotal = byCategory.reduce((s, c) => s + c.cents, 0);

    const cogsTotal = productCogsCents + eventCostsCents;
    const grossProfitCents = revenueTotal - cogsTotal;

    return {
      month,
      revenue: {
        productCents,
        eventCents,
        totalCents: revenueTotal,
        productOrders,
        paidSeats,
      },
      cogs: {
        productCogsCents,
        unmatchedUnits,
        eventCostsCents,
        eventCostEvents,
        totalCents: cogsTotal,
      },
      grossProfitCents,
      expenses: {
        feesCents,
        feesSource: hasManualFees ? "manual" : "estimated",
        rows,
        byCategory,
        totalCents: expensesTotal,
      },
      netProfitCents: grossProfitCents - expensesTotal,
    };
  });
}
