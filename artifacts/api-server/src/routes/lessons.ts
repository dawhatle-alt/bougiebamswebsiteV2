import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";
import { db, lessonsTable } from "@workspace/db";
import { requireAdmin } from "../middleware/auth";

const router: IRouter = Router();

function toApiLesson(row: typeof lessonsTable.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    videoUrl: row.videoUrl,
    category: row.category,
    sortOrder: row.sortOrder,
    published: row.published,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const LessonBody = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  videoUrl: z.string().min(1),
  category: z.string().default("General"),
  sortOrder: z.number().int().default(0),
  published: z.boolean().default(false),
});

router.get("/lessons", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(lessonsTable)
    .where(eq(lessonsTable.published, true))
    .orderBy(asc(lessonsTable.sortOrder), asc(lessonsTable.createdAt));
  res.json({ lessons: rows.map(toApiLesson) });
});

router.get("/admin/lessons", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(lessonsTable)
    .orderBy(asc(lessonsTable.sortOrder), asc(lessonsTable.createdAt));
  res.json({ lessons: rows.map(toApiLesson) });
});

router.post("/admin/lessons", requireAdmin, async (req, res): Promise<void> => {
  const parsed = LessonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(lessonsTable)
    .values(parsed.data)
    .returning();
  res.status(201).json({ lesson: toApiLesson(row) });
});

router.put("/admin/lessons/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = LessonBody.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db
    .update(lessonsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(lessonsTable.id, id))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ lesson: toApiLesson(row) });
});

router.delete("/admin/lessons/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(lessonsTable).where(eq(lessonsTable.id, id));
  res.json({ ok: true });
});

export default router;
