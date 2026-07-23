import { Router, type IRouter } from "express";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  bizAssumptionsTable,
  bizEventsTable,
  bizMarketingChannelsTable,
  bizInventoryItemsTable,
  bizScenariosTable,
  bizEventCostsTable,
  bizExpensesTable,
  eventsTable,
  registrationsTable,
  productsTable,
} from "@workspace/db";
import { requireAdmin } from "../middleware/auth";
import { ensureBusinessTables, ensureEventCostsTable, ensureExpensesTable } from "../lib/businessBootstrap";
import { computeActuals } from "../lib/businessActuals";
import { computePnl, EXPENSE_CATEGORIES } from "../lib/businessPnl";
import { logger } from "../lib/logger";

// Business HQ (forecasting/planning) endpoints, ported from the
// BougieBams-Business repo. Admin-only; tables are lazily created + seeded.

const router: IRouter = Router();

const money = z.number().finite();
const count = z.number().int().nonnegative();

const assumptionsUpdateSchema = z
  .object({
    startupCapital: money,
    yearOneMarketingBudget: money,
    tileSetMSRP: money,
    tileSetCostAt100: money,
    tileSetCostAt200: money,
    tileSetUnitsTarget: count,
    matMSRP: money,
    matCost: money,
    matUnitsTarget: count,
    luxuryBoxMSRP: money,
    luxuryBoxCost: money,
    luxuryBoxUnitsTarget: count,
    rackSetMSRP: money,
    rackSetCost: money,
    rackSetUnitsTarget: count,
    eventsPerYear: count,
    avgAttendees: count,
    avgTicketPrice: money,
    avgVenueCostPerAttendee: money,
    laserEquipmentCost: money,
    tileProductionLeadTimeMonths: count,
  })
  .partial();

const eventCreateSchema = z.object({
  name: z.string().trim().min(1),
  date: z.string().trim().min(1),
  status: z.enum(["completed", "upcoming"]).default("upcoming"),
  attendees: count.default(0),
  ticketPrice: money.default(0),
  venueCostPerAttendee: money.default(0),
  otherExpenses: money.default(0),
  emailSignups: count.default(0),
  instagramFollowersGained: count.default(0),
  productSalesGenerated: money.default(0),
});

const marketingChannelUpdateSchema = z
  .object({
    allocationPct: money,
    spend: money,
    leads: count,
    customers: count,
    revenueInfluenced: money,
  })
  .partial();

const scenarioUpdateSchema = z
  .object({
    unitsSoldMultiplier: money,
    marketingSpendMultiplier: money,
    eventCount: count,
  })
  .partial();

router.get("/admin/business/assumptions", requireAdmin, async (_req, res): Promise<void> => {
  try {
    await ensureBusinessTables();
    const [row] = await db.select().from(bizAssumptionsTable).where(eq(bizAssumptionsTable.id, 1));
    if (!row) {
      res.status(404).json({ error: "Assumptions not found" });
      return;
    }
    const { updatedAt: _updatedAt, id: _id, ...data } = row;
    res.json(data);
  } catch (err) {
    logger.error({ err }, "Failed to fetch business assumptions");
    res.status(500).json({ error: "Failed to fetch assumptions" });
  }
});

router.put("/admin/business/assumptions", requireAdmin, async (req, res): Promise<void> => {
  const parsed = assumptionsUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", issues: parsed.error.issues });
    return;
  }
  try {
    await ensureBusinessTables();
    const [row] = await db
      .update(bizAssumptionsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(bizAssumptionsTable.id, 1))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Assumptions not found" });
      return;
    }
    const { updatedAt: _updatedAt, id: _id, ...data } = row;
    res.json(data);
  } catch (err) {
    logger.error({ err }, "Failed to update business assumptions");
    res.status(500).json({ error: "Failed to update assumptions" });
  }
});

// Manual planning events merged with REAL store events: attendance and
// revenue come from registrations; costs/marketing outcomes come from the
// owner-editable biz_event_costs overlay. Queries run sequentially.
router.get("/admin/business/events", requireAdmin, async (_req, res): Promise<void> => {
  try {
    await ensureBusinessTables();
    await ensureEventCostsTable();

    const manual = await db.select().from(bizEventsTable).orderBy(asc(bizEventsTable.date));
    const storeEvents = await db
      .select({
        id: eventsTable.id,
        title: eventsTable.title,
        date: eventsTable.date,
        priceCents: eventsTable.priceCents,
        published: eventsTable.published,
      })
      .from(eventsTable);
    const registrations = await db
      .select({
        eventId: registrationsTable.eventId,
        status: registrationsTable.status,
        paymentSessionId: registrationsTable.paymentSessionId,
      })
      .from(registrationsTable);
    const costs = await db.select().from(bizEventCostsTable);

    const regsByEvent = new Map<number, { confirmed: number; paid: number }>();
    for (const reg of registrations) {
      const entry = regsByEvent.get(reg.eventId) ?? { confirmed: 0, paid: 0 };
      if (reg.status === "confirmed") entry.confirmed += 1;
      if (reg.paymentSessionId) entry.paid += 1;
      regsByEvent.set(reg.eventId, entry);
    }
    const costsByEvent = new Map(costs.map((c) => [c.sourceEventId, c]));
    const today = new Date().toISOString().slice(0, 10);

    const store = storeEvents
      .filter((e) => e.published || regsByEvent.has(e.id))
      .map((e) => {
        const regs = regsByEvent.get(e.id) ?? { confirmed: 0, paid: 0 };
        const cost = costsByEvent.get(e.id);
        const price = (e.priceCents ?? 0) / 100;
        return {
          id: `store-${e.id}`,
          source: "store" as const,
          sourceEventId: e.id,
          name: e.title,
          date: e.date,
          status: e.date < today ? "completed" : "upcoming",
          attendees: regs.confirmed,
          ticketPrice: price,
          revenue: regs.paid * price,
          venueCost: cost?.venueCost ?? 0,
          otherExpenses: cost?.otherExpenses ?? 0,
          emailSignups: cost?.emailSignups ?? 0,
          instagramFollowersGained: cost?.instagramFollowersGained ?? 0,
          productSalesGenerated: 0,
        };
      });

    res.json([
      ...manual.map(({ createdAt: _createdAt, ...row }) => ({ ...row, source: "manual" as const })),
      ...store,
    ]);
  } catch (err) {
    logger.error({ err }, "Failed to fetch business events");
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

const eventCostsUpdateSchema = z
  .object({
    // Total venue bill for the event (flat dollars, not per attendee).
    venueCost: money,
    otherExpenses: money,
    emailSignups: count,
    instagramFollowersGained: count,
  })
  .partial();

router.put("/admin/business/events/store/:sourceEventId/costs", requireAdmin, async (req, res): Promise<void> => {
  const sourceEventId = parseInt(req.params.sourceEventId as string, 10);
  if (!Number.isInteger(sourceEventId)) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }
  const parsed = eventCostsUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", issues: parsed.error.issues });
    return;
  }
  try {
    await ensureEventCostsTable();
    const [row] = await db
      .insert(bizEventCostsTable)
      .values({ sourceEventId, ...parsed.data })
      .onConflictDoUpdate({
        target: bizEventCostsTable.sourceEventId,
        set: { ...parsed.data, updatedAt: new Date() },
      })
      .returning();
    res.json(row);
  } catch (err) {
    logger.error({ err }, "Failed to update event costs");
    res.status(500).json({ error: "Failed to update event costs" });
  }
});

router.post("/admin/business/events", requireAdmin, async (req, res): Promise<void> => {
  const parsed = eventCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", issues: parsed.error.issues });
    return;
  }
  try {
    await ensureBusinessTables();
    const [row] = await db.insert(bizEventsTable).values(parsed.data).returning();
    const { createdAt: _createdAt, ...data } = row;
    res.status(201).json(data);
  } catch (err) {
    logger.error({ err }, "Failed to create business event");
    res.status(500).json({ error: "Failed to create event" });
  }
});

router.delete("/admin/business/events/:id", requireAdmin, async (req, res): Promise<void> => {
  try {
    await ensureBusinessTables();
    await db.delete(bizEventsTable).where(eq(bizEventsTable.id, req.params.id as string));
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to delete business event");
    res.status(500).json({ error: "Failed to delete event" });
  }
});

router.get("/admin/business/marketing-channels", requireAdmin, async (_req, res): Promise<void> => {
  try {
    await ensureBusinessTables();
    const rows = await db
      .select()
      .from(bizMarketingChannelsTable)
      .orderBy(desc(bizMarketingChannelsTable.allocationPct));
    res.json(rows.map(({ updatedAt: _updatedAt, ...row }) => row));
  } catch (err) {
    logger.error({ err }, "Failed to fetch marketing channels");
    res.status(500).json({ error: "Failed to fetch marketing channels" });
  }
});

router.put("/admin/business/marketing-channels/:id", requireAdmin, async (req, res): Promise<void> => {
  const parsed = marketingChannelUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", issues: parsed.error.issues });
    return;
  }
  try {
    await ensureBusinessTables();
    const [row] = await db
      .update(bizMarketingChannelsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(bizMarketingChannelsTable.id, req.params.id as string))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Marketing channel not found" });
      return;
    }
    const { updatedAt: _updatedAt, ...data } = row;
    res.json(data);
  } catch (err) {
    logger.error({ err }, "Failed to update marketing channel");
    res.status(500).json({ error: "Failed to update marketing channel" });
  }
});

// The four ids seeded from the original business plan before the real catalog
// existed; pruned automatically once they're untouched placeholders.
const PLACEHOLDER_INVENTORY_IDS = ["tile-set", "mat", "luxury-box", "rack-set"];

router.get("/admin/business/inventory", requireAdmin, async (_req, res): Promise<void> => {
  try {
    await ensureBusinessTables();
    // Keep the tracked item list in sync with the real catalog: every current
    // product gets a row (quantities stay manual — they describe the physical
    // world), and untouched plan-era placeholders are dropped. Sequential
    // queries on purpose (transaction pooler).
    const products = await db.select().from(productsTable);
    const rows = await db
      .select()
      .from(bizInventoryItemsTable)
      .orderBy(asc(bizInventoryItemsTable.productId));
    const known = new Set(rows.map((r) => r.productId));
    for (const p of products) {
      if (!known.has(p.id)) {
        await db
          .insert(bizInventoryItemsTable)
          .values({ productId: p.id, productName: p.name, onHand: 0, ordered: 0, inProduction: 0, leadTimeWeeks: 0, reorderPoint: 0, reorderQty: 0 })
          .onConflictDoNothing({ target: bizInventoryItemsTable.productId });
      }
    }
    for (const row of rows) {
      const untouched = row.onHand === 0 && row.ordered === 0 && row.inProduction === 0;
      if (PLACEHOLDER_INVENTORY_IDS.includes(row.productId) && untouched) {
        await db.delete(bizInventoryItemsTable).where(eq(bizInventoryItemsTable.productId, row.productId));
      }
    }
    const fresh = await db
      .select()
      .from(bizInventoryItemsTable)
      .orderBy(asc(bizInventoryItemsTable.productId));
    res.json(fresh.map(({ updatedAt: _updatedAt, ...row }) => row));
  } catch (err) {
    logger.error({ err }, "Failed to fetch business inventory");
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

router.get("/admin/business/scenarios", requireAdmin, async (_req, res): Promise<void> => {
  try {
    await ensureBusinessTables();
    const rows = await db
      .select()
      .from(bizScenariosTable)
      .orderBy(asc(bizScenariosTable.unitsSoldMultiplier));
    res.json(rows.map(({ updatedAt: _updatedAt, ...row }) => row));
  } catch (err) {
    logger.error({ err }, "Failed to fetch scenarios");
    res.status(500).json({ error: "Failed to fetch scenarios" });
  }
});

// ---------- Monthly P&L + expense ledger ----------

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function prevMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return d.toISOString().slice(0, 7);
}

const expenseCreateSchema = z.object({
  month: z.string().regex(MONTH_RE),
  category: z.enum(EXPENSE_CATEGORIES),
  description: z.string().trim().max(200).default(""),
  amountCents: z.number().int().nonnegative(),
});

router.get("/admin/business/pnl", requireAdmin, async (req, res): Promise<void> => {
  const month = typeof req.query.month === "string" ? req.query.month : "";
  if (!MONTH_RE.test(month)) {
    res.status(400).json({ error: "month must be YYYY-MM" });
    return;
  }
  try {
    const [current, prior] = await computePnl([month, prevMonth(month)]);
    res.json({ current, prior });
  } catch (err) {
    logger.error({ err }, "Failed to compute P&L");
    res.status(500).json({ error: "Failed to compute P&L" });
  }
});

router.post("/admin/business/expenses", requireAdmin, async (req, res): Promise<void> => {
  const parsed = expenseCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", issues: parsed.error.issues });
    return;
  }
  try {
    await ensureExpensesTable();
    const [row] = await db.insert(bizExpensesTable).values(parsed.data).returning();
    res.status(201).json(row);
  } catch (err) {
    logger.error({ err }, "Failed to create expense");
    res.status(500).json({ error: "Failed to create expense" });
  }
});

router.delete("/admin/business/expenses/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid expense id" });
    return;
  }
  try {
    await ensureExpensesTable();
    await db.delete(bizExpensesTable).where(eq(bizExpensesTable.id, id));
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to delete expense");
    res.status(500).json({ error: "Failed to delete expense" });
  }
});

// Copies the prior month's recurring expenses into the given month.
// Processing fees are skipped (they're month-specific actuals), as are rows
// the month already has (same category + description).
router.post("/admin/business/expenses/copy-previous", requireAdmin, async (req, res): Promise<void> => {
  const month = typeof req.body?.month === "string" ? req.body.month : "";
  if (!MONTH_RE.test(month)) {
    res.status(400).json({ error: "month must be YYYY-MM" });
    return;
  }
  try {
    await ensureExpensesTable();
    const source = await db.select().from(bizExpensesTable).where(eq(bizExpensesTable.month, prevMonth(month)));
    const existing = await db.select().from(bizExpensesTable).where(eq(bizExpensesTable.month, month));
    const seen = new Set(existing.map((r) => `${r.category}|${r.description}`));
    let copied = 0;
    for (const row of source) {
      if (row.category === "processing-fees") continue;
      if (seen.has(`${row.category}|${row.description}`)) continue;
      await db.insert(bizExpensesTable).values({
        month,
        category: row.category,
        description: row.description,
        amountCents: row.amountCents,
      });
      copied += 1;
    }
    res.json({ copied });
  } catch (err) {
    logger.error({ err }, "Failed to copy expenses");
    res.status(500).json({ error: "Failed to copy expenses" });
  }
});

// Real store performance, aggregated from orders/registrations/subscribers
// (see lib/businessActuals — shared with the AI advisor's grounding context).
router.get("/admin/business/actuals", requireAdmin, async (_req, res): Promise<void> => {
  try {
    res.json(await computeActuals());
  } catch (err) {
    logger.error({ err }, "Failed to compute business actuals");
    res.status(500).json({ error: "Failed to compute actuals" });
  }
});


router.put("/admin/business/scenarios/:id", requireAdmin, async (req, res): Promise<void> => {
  const parsed = scenarioUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", issues: parsed.error.issues });
    return;
  }
  try {
    await ensureBusinessTables();
    const [row] = await db
      .update(bizScenariosTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(bizScenariosTable.id, req.params.id as string))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Scenario not found" });
      return;
    }
    const { updatedAt: _updatedAt, ...data } = row;
    res.json(data);
  } catch (err) {
    logger.error({ err }, "Failed to update scenario");
    res.status(500).json({ error: "Failed to update scenario" });
  }
});

export default router;
