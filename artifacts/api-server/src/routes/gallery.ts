import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { eventGalleryTable, eventsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth";

const router: IRouter = Router();

// The event_id/is_cover columns were added in production on 2026-07-07:
//   ALTER TABLE event_gallery
//     ADD COLUMN IF NOT EXISTS event_id integer,
//     ADD COLUMN IF NOT EXISTS is_cover boolean NOT NULL DEFAULT false
// Do NOT run DDL lazily per instance here — ALTER TABLE takes an ACCESS
// EXCLUSIVE lock even as a no-op, and a lock queue on this hot table under
// serverless cold-start fan-out can starve the whole connection pool.

// Past events without photos stay visible as "photos coming soon" tiles for
// this many days after the event date.
const COMING_SOON_WINDOW_DAYS = 45;

router.get("/gallery", async (_req: Request, res: Response): Promise<void> => {
  const rows = await db
    .select()
    .from(eventGalleryTable)
    .orderBy(eventGalleryTable.sortOrder, eventGalleryTable.createdAt);
  const photos = rows.map((r) => ({
    id: r.id,
    url: `/api/storage${r.objectPath}`,
    caption: r.caption ?? null,
    eventId: r.eventId ?? null,
    isCover: r.isCover,
    sortOrder: r.sortOrder,
  }));

  // Albums: every published event that has photos, plus recent past events
  // still waiting on their photos.
  const events = await db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.published, true));

  const today = new Date().toISOString().slice(0, 10);
  const windowStart = new Date(Date.now() - COMING_SOON_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const albums = events
    .map((e) => {
      const eventPhotos = rows.filter((r) => r.eventId === e.id);
      const cover =
        eventPhotos.find((r) => r.isCover) ??
        (eventPhotos.length > 0 ? eventPhotos[0] : null);
      return {
        id: e.id,
        title: e.title,
        date: e.date,
        time: e.time,
        location: e.location,
        totalSpots: e.totalSpots,
        spotsLeft: e.spotsLeft,
        photoCount: eventPhotos.length,
        coverUrl: cover ? `/api/storage${cover.objectPath}` : null,
      };
    })
    .filter((a) => a.photoCount > 0 || (a.date < today && a.date >= windowStart))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  res.json({ photos, albums });
});

router.post(
  "/admin/gallery",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const { objectPath, caption, eventId } = req.body as {
      objectPath?: string;
      caption?: string;
      eventId?: number | null;
    };
    if (!objectPath?.trim()) {
      res.status(400).json({ error: "objectPath is required" });
      return;
    }
    const existing = await db.select().from(eventGalleryTable).orderBy(eventGalleryTable.sortOrder);
    const maxOrder = existing.length > 0 ? Math.max(...existing.map((r) => r.sortOrder)) + 1 : 0;
    const [row] = await db
      .insert(eventGalleryTable)
      .values({
        objectPath: objectPath.trim(),
        caption: caption?.trim() ?? null,
        eventId: typeof eventId === "number" ? eventId : null,
        sortOrder: maxOrder,
      })
      .returning();
    res.status(201).json({
      success: true,
      photo: {
        id: row.id,
        url: `/api/storage${row.objectPath}`,
        caption: row.caption,
        eventId: row.eventId ?? null,
        isCover: row.isCover,
        sortOrder: row.sortOrder,
      },
    });
  }
);

// NOTE: must be declared before /admin/gallery/:id or Express matches
// "reorder" as an :id.
router.put(
  "/admin/gallery/reorder",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const { order } = req.body as { order?: { id: number; sortOrder: number }[] };
    if (!Array.isArray(order)) { res.status(400).json({ error: "order array required" }); return; }
    await Promise.all(
      order.map(({ id, sortOrder }) =>
        db.update(eventGalleryTable).set({ sortOrder }).where(eq(eventGalleryTable.id, id))
      )
    );
    res.json({ success: true });
  }
);

router.put(
  "/admin/gallery/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
    const body = req.body as {
      caption?: string | null;
      eventId?: number | null;
      isCover?: boolean;
    };

    const updates: Partial<{ caption: string | null; eventId: number | null; isCover: boolean }> = {};
    if ("caption" in body) updates.caption = body.caption?.trim() || null;
    if ("eventId" in body) {
      updates.eventId = typeof body.eventId === "number" ? body.eventId : null;
      // A photo moved to a different event (or unassigned) can't stay a cover.
      updates.isCover = false;
    }
    if ("isCover" in body) updates.isCover = body.isCover === true;
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "nothing to update" });
      return;
    }

    const [row] = await db
      .update(eventGalleryTable)
      .set(updates)
      .where(eq(eventGalleryTable.id, id))
      .returning();
    if (!row) { res.status(404).json({ error: "not found" }); return; }

    // One cover per event: crowning this photo un-crowns its siblings.
    if (row.isCover && row.eventId !== null) {
      await db
        .update(eventGalleryTable)
        .set({ isCover: false })
        .where(sql`${eventGalleryTable.eventId} = ${row.eventId} AND ${eventGalleryTable.id} <> ${row.id}`);
    }

    res.json({
      success: true,
      photo: {
        id: row.id,
        url: `/api/storage${row.objectPath}`,
        caption: row.caption,
        eventId: row.eventId ?? null,
        isCover: row.isCover,
        sortOrder: row.sortOrder,
      },
    });
  }
);

router.delete(
  "/admin/gallery/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
    await db.delete(eventGalleryTable).where(eq(eventGalleryTable.id, id));
    res.json({ success: true });
  }
);

export default router;
