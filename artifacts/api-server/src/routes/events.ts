import { Router, type IRouter } from "express";
import { db, eventsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAdmin } from "./admin";

const router: IRouter = Router();

function normalizePrice(priceCents: number | null): number | "Free" {
  return priceCents === null ? "Free" : priceCents / 100;
}

function parseBody(body: Record<string, unknown>) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  const date = typeof body.date === "string" ? body.date.trim() : "";
  const time = typeof body.time === "string" ? body.time.trim() : "";
  const location =
    typeof body.location === "string" ? body.location.trim() : "";
  const category =
    typeof body.category === "string" ? body.category.trim() : "In-Person";
  const host =
    typeof body.host === "string" ? body.host.trim() : "BougieBams";
  const imagePath =
    typeof body.imagePath === "string" && body.imagePath ? body.imagePath : null;
  const published = body.published !== false;

  const rawPrice = body.priceCents;
  const priceCents =
    rawPrice === null || rawPrice === undefined
      ? null
      : Math.max(0, Math.round(Number(rawPrice)));

  const totalSpots = Math.max(0, Math.round(Number(body.totalSpots) || 0));
  const spotsLeft = Math.max(
    0,
    Math.min(totalSpots, Math.round(Number(body.spotsLeft) || 0)),
  );

  return {
    title,
    description,
    date,
    time,
    location,
    category,
    host,
    imagePath,
    published,
    priceCents,
    totalSpots,
    spotsLeft,
  };
}

// Public: list published events (newest/upcoming first by id desc as proxy).
router.get("/events", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.published, true))
      .orderBy(desc(eventsTable.id));
    const events = rows.map((r) => ({ ...r, price: normalizePrice(r.priceCents) }));
    return res.json({ events });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch events");
    return res.status(500).json({ error: "Could not load events.", events: [] });
  }
});

// Admin: list all events (including drafts).
router.get("/admin/events", requireAdmin, async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(eventsTable)
      .orderBy(desc(eventsTable.id));
    const events = rows.map((r) => ({ ...r, price: normalizePrice(r.priceCents) }));
    return res.json({ events });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch admin events");
    return res.status(500).json({ error: "Could not load events." });
  }
});

// Admin: create event.
router.post("/admin/events", requireAdmin, async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const parsed = parseBody(body);
  if (!parsed.title) {
    return res.status(400).json({ error: "Title is required." });
  }
  if (!parsed.date) {
    return res.status(400).json({ error: "Date is required." });
  }
  try {
    const [row] = await db
      .insert(eventsTable)
      .values({ ...parsed, updatedAt: new Date() })
      .returning();
    return res.status(201).json({ event: { ...row, price: normalizePrice(row.priceCents) } });
  } catch (err) {
    req.log.error({ err }, "Failed to create event");
    return res.status(500).json({ error: "Could not create the event." });
  }
});

// Admin: update event.
router.put("/admin/events/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid event ID." });
  }
  const body = req.body as Record<string, unknown>;
  const parsed = parseBody(body);
  if (!parsed.title) {
    return res.status(400).json({ error: "Title is required." });
  }
  if (!parsed.date) {
    return res.status(400).json({ error: "Date is required." });
  }
  try {
    const [row] = await db
      .update(eventsTable)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(eventsTable.id, id))
      .returning();
    if (!row) return res.status(404).json({ error: "Event not found." });
    return res.json({ event: { ...row, price: normalizePrice(row.priceCents) } });
  } catch (err) {
    req.log.error({ err }, "Failed to update event");
    return res.status(500).json({ error: "Could not update the event." });
  }
});

// Admin: delete event.
router.delete("/admin/events/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid event ID." });
  }
  try {
    await db.delete(eventsTable).where(eq(eventsTable.id, id));
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete event");
    return res.status(500).json({ error: "Could not delete the event." });
  }
});

export default router;
