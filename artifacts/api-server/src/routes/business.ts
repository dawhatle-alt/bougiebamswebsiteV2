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
} from "@workspace/db";
import { requireAdmin } from "../middleware/auth";
import { ensureBusinessTables } from "../lib/businessBootstrap";
import { computeActuals } from "../lib/businessActuals";
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

router.get("/admin/business/events", requireAdmin, async (_req, res): Promise<void> => {
  try {
    await ensureBusinessTables();
    const rows = await db.select().from(bizEventsTable).orderBy(asc(bizEventsTable.date));
    res.json(rows.map(({ createdAt: _createdAt, ...row }) => row));
  } catch (err) {
    logger.error({ err }, "Failed to fetch business events");
    res.status(500).json({ error: "Failed to fetch events" });
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

router.get("/admin/business/inventory", requireAdmin, async (_req, res): Promise<void> => {
  try {
    await ensureBusinessTables();
    const rows = await db
      .select()
      .from(bizInventoryItemsTable)
      .orderBy(asc(bizInventoryItemsTable.productId));
    res.json(rows.map(({ updatedAt: _updatedAt, ...row }) => row));
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
