import { Router, type IRouter } from "express";
import { eq, count, gte, lt, and, type SQL } from "drizzle-orm";
import { db, eventsTable, registrationsTable } from "@workspace/db";
import {
  ListEventsResponse,
  CreateEventBody,
  GetEventParams,
  GetEventResponse,
  UpdateEventParams,
  UpdateEventBody,
  UpdateEventResponse,
  DeleteEventParams,
  GetEventStatsResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../middleware/auth";

const router: IRouter = Router();

function toApiEvent(row: typeof eventsTable.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    date: row.date,
    time: row.time,
    location: row.location,
    priceCents: row.priceCents ?? null,
    category: row.category,
    imagePath: row.imagePath ?? null,
    totalSpots: row.totalSpots,
    spotsLeft: row.spotsLeft,
    host: row.host,
    published: row.published,
    featured: row.featured,
    stripeProductId: row.stripeProductId ?? null,
    externalRegistrationUrl: row.externalRegistrationUrl ?? null,
  };
}

router.get("/events", async (req, res): Promise<void> => {
  const { category, upcoming, past, featured } = req.query;
  const conditions: SQL[] = [eq(eventsTable.published, true), eq(eventsTable.archived, false)];

  if (category && typeof category === "string") {
    conditions.push(eq(eventsTable.category, category));
  }
  if (featured === "true") {
    conditions.push(eq(eventsTable.featured, true));
  }
  if (upcoming === "true") {
    const today = new Date().toISOString().slice(0, 10);
    conditions.push(gte(eventsTable.date, today));
  } else if (past === "true") {
    const today = new Date().toISOString().slice(0, 10);
    conditions.push(lt(eventsTable.date, today));
  }

  const rows = await db
    .select()
    .from(eventsTable)
    .where(and(...conditions))
    .orderBy(eventsTable.date);
  res.json(ListEventsResponse.parse({ events: rows.map(toApiEvent) }));
});

router.get("/events/stats", requireAdmin, async (_req, res): Promise<void> => {
  const today = new Date().toISOString().slice(0, 10);
  const [totalRow] = await db.select({ count: count() }).from(eventsTable);
  const [publishedRow] = await db
    .select({ count: count() })
    .from(eventsTable)
    .where(eq(eventsTable.published, true));
  const [upcomingRow] = await db
    .select({ count: count() })
    .from(eventsTable)
    .where(and(eq(eventsTable.published, true), gte(eventsTable.date, today)));
  const [regRow] = await db.select({ count: count() }).from(registrationsTable);

  res.json(
    GetEventStatsResponse.parse({
      total: Number(totalRow?.count ?? 0),
      published: Number(publishedRow?.count ?? 0),
      upcoming: Number(upcomingRow?.count ?? 0),
      totalRegistrations: Number(regRow?.count ?? 0),
    }),
  );
});

router.get("/events/:id", async (req, res): Promise<void> => {
  const params = GetEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.json(GetEventResponse.parse({ event: toApiEvent(row) }));
});

router.post("/events", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [row] = await db
    .insert(eventsTable)
    .values({
      title: parsed.data.title,
      description: parsed.data.description ?? "",
      date: parsed.data.date,
      time: parsed.data.time,
      location: parsed.data.location,
      priceCents: parsed.data.priceCents ?? null,
      category: parsed.data.category ?? "In-Person",
      totalSpots: parsed.data.totalSpots,
      spotsLeft: parsed.data.spotsLeft,
      host: parsed.data.host,
      published: parsed.data.published ?? false,
    })
    .returning();

  res.status(201).json(GetEventResponse.parse({ event: toApiEvent(row) }));
});

router.patch("/events/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.date !== undefined) updateData.date = parsed.data.date;
  if (parsed.data.time !== undefined) updateData.time = parsed.data.time;
  if (parsed.data.location !== undefined) updateData.location = parsed.data.location;
  if ("priceCents" in parsed.data) updateData.priceCents = parsed.data.priceCents ?? null;
  if (parsed.data.category !== undefined) updateData.category = parsed.data.category;
  if (parsed.data.totalSpots !== undefined) updateData.totalSpots = parsed.data.totalSpots;
  if (parsed.data.spotsLeft !== undefined) updateData.spotsLeft = parsed.data.spotsLeft;
  if (parsed.data.host !== undefined) updateData.host = parsed.data.host;
  if (parsed.data.published !== undefined) updateData.published = parsed.data.published;

  const [row] = await db
    .update(eventsTable)
    .set(updateData)
    .where(eq(eventsTable.id, params.data.id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.json(UpdateEventResponse.parse({ event: toApiEvent(row) }));
});

router.delete("/events/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .delete(eventsTable)
    .where(eq(eventsTable.id, params.data.id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
