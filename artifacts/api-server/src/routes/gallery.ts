import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { eventGalleryTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth";

const router: IRouter = Router();

router.get("/gallery", async (_req: Request, res: Response): Promise<void> => {
  const rows = await db
    .select()
    .from(eventGalleryTable)
    .orderBy(eventGalleryTable.sortOrder, eventGalleryTable.createdAt);
  const photos = rows.map((r) => ({
    id: r.id,
    url: `/api/storage${r.objectPath}`,
    caption: r.caption ?? null,
    sortOrder: r.sortOrder,
  }));
  res.json({ photos });
});

router.post(
  "/admin/gallery",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const { objectPath, caption } = req.body as { objectPath?: string; caption?: string };
    if (!objectPath?.trim()) {
      res.status(400).json({ error: "objectPath is required" });
      return;
    }
    const existing = await db.select().from(eventGalleryTable).orderBy(eventGalleryTable.sortOrder);
    const maxOrder = existing.length > 0 ? Math.max(...existing.map((r) => r.sortOrder)) + 1 : 0;
    const [row] = await db
      .insert(eventGalleryTable)
      .values({ objectPath: objectPath.trim(), caption: caption?.trim() ?? null, sortOrder: maxOrder })
      .returning();
    res.status(201).json({ success: true, photo: { id: row.id, url: `/api/storage${row.objectPath}`, caption: row.caption, sortOrder: row.sortOrder } });
  }
);

router.put(
  "/admin/gallery/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
    const { caption } = req.body as { caption?: string | null };
    const [row] = await db
      .update(eventGalleryTable)
      .set({ caption: caption?.trim() ?? null })
      .where(eq(eventGalleryTable.id, id))
      .returning();
    if (!row) { res.status(404).json({ error: "not found" }); return; }
    res.json({ success: true });
  }
);

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

router.delete(
  "/admin/gallery/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
    await db.delete(eventGalleryTable).where(eq(eventGalleryTable.id, id));
    res.json({ success: true });
  }
);

export default router;
