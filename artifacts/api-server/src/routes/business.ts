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
  ordersTable,
  eventsTable,
  registrationsTable,
  subscribersTable,
} from "@workspace/db";
import { requireAdmin } from "../middleware/auth";
import { ensureBusinessTables } from "../lib/businessBootstrap";
import { tableExists } from "../lib/dbBootstrap";
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

interface OrderItem {
  name?: string;
  quantity?: number | string;
  amountCents?: number;
}

// Real store performance, aggregated from orders/registrations/subscribers.
// Queries run sequentially — pipelined queries stall behind the transaction-
// mode pooler (same constraint as the admin dashboard).
router.get("/admin/business/actuals", requireAdmin, async (_req, res): Promise<void> => {
  try {
    const hasOrders = await tableExists("orders");
    const orders = hasOrders
      ? await db
          .select({
            kind: ordersTable.kind,
            totalCents: ordersTable.totalCents,
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
        spotsLeft: eventsTable.spotsLeft,
      })
      .from(eventsTable);

    const registrations = await db
      .select({
        eventId: registrationsTable.eventId,
        status: registrationsTable.status,
        paymentSessionId: registrationsTable.paymentSessionId,
      })
      .from(registrationsTable);

    const subscriberRows = await db
      .select({ subscribedAt: subscribersTable.subscribedAt })
      .from(subscribersTable);

    // Product vs event revenue, plus per-product breakdown from items JSON
    let productRevenueCents = 0;
    let productOrderCount = 0;
    let eventRevenueCents = 0;
    let eventOrderCount = 0;
    let discountCentsTotal = 0;
    let unitsSold = 0;
    const byProduct = new Map<string, { name: string; quantity: number; revenueCents: number }>();
    const monthly = new Map<string, { productCents: number; eventCents: number }>();

    for (const order of orders) {
      discountCentsTotal += order.discountCents ?? 0;
      const month = order.createdAt.toISOString().slice(0, 7);
      const bucket = monthly.get(month) ?? { productCents: 0, eventCents: 0 };
      if (order.kind === "event") {
        eventRevenueCents += order.totalCents;
        eventOrderCount += 1;
        bucket.eventCents += order.totalCents;
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

    // Per-event fill + paid revenue from registrations
    const regsByEvent = new Map<number, { confirmed: number; paid: number }>();
    for (const reg of registrations) {
      const entry = regsByEvent.get(reg.eventId) ?? { confirmed: 0, paid: 0 };
      if (reg.status === "confirmed") entry.confirmed += 1;
      if (reg.paymentSessionId) entry.paid += 1;
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

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const subscribers = {
      total: subscriberRows.length,
      last30: subscriberRows.filter((s) => s.subscribedAt.getTime() >= thirtyDaysAgo).length,
    };

    res.json({
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
      subscribers,
      discountCentsTotal,
    });
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
