import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { count, eq, sql } from "drizzle-orm";
import path from "path";
import fs from "fs";
import { ObjectStorageService } from "../lib/objectStorage";
import {
  db,
  eventsTable,
  productsTable,
  blogPostsTable,
  subscribersTable,
  productImagesTable,
  registrationsTable,
  heroImagesTable,
  discountCodesTable,
} from "@workspace/db";
import { GetAdminStatsResponse } from "@workspace/api-zod";
import { requireAdmin } from "../middleware/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();
const uploadsDir = path.resolve(workspaceRoot, "artifacts/api-server/uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80) +
    "-" +
    Date.now().toString(36)
  );
}


function toApiPost(row: typeof blogPostsTable.$inferSelect) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    category: row.category,
    author: row.author,
    imagePath: row.imagePath ?? null,
    published: row.published,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

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
    reminderHoursBefore: row.reminderHoursBefore ?? null,
  };
}


router.get("/admin/stats", requireAdmin, async (_req, res): Promise<void> => {
  const [subRow] = await db.select({ count: count() }).from(subscribersTable);
  const [evtRow] = await db.select({ count: count() }).from(eventsTable);
  const [prodRow] = await db.select({ count: count() }).from(productsTable);
  const [blogRow] = await db.select({ count: count() }).from(blogPostsTable);
  res.json(
    GetAdminStatsResponse.parse({
      totalSubscribers: Number(subRow?.count ?? 0),
      totalEvents: Number(evtRow?.count ?? 0),
      totalProducts: Number(prodRow?.count ?? 0),
      totalBlogPosts: Number(blogRow?.count ?? 0),
    }),
  );
});

router.get("/admin/subscribers", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(subscribersTable).orderBy(subscribersTable.createdAt);
  res.json({
    subscribers: rows.map((s) => ({
      id: s.id,
      email: s.email,
      source: s.source ?? null,
      discountCode: s.discountCode ?? null,
      createdAt: s.createdAt.toISOString(),
    })),
  });
});

router.get("/admin/blog", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(blogPostsTable).orderBy(blogPostsTable.createdAt);
  res.json({ posts: rows.map(toApiPost) });
});

router.post("/admin/blog", requireAdmin, async (req, res): Promise<void> => {
  const b = req.body as Record<string, unknown>;
  if (!b.title || typeof b.title !== "string") {
    res.status(400).json({ error: "title is required" });
    return;
  }
  const [row] = await db
    .insert(blogPostsTable)
    .values({
      slug: slugify(b.title),
      title: b.title,
      excerpt: typeof b.excerpt === "string" ? b.excerpt : "",
      content: typeof b.content === "string" ? b.content : "",
      category: typeof b.category === "string" ? b.category : "Style",
      author: typeof b.author === "string" ? b.author : "BougieBams",
      published: b.published === true,
      imagePath: typeof b.imagePath === "string" ? b.imagePath : null,
    })
    .returning();
  res.status(201).json({ post: toApiPost(row) });
});

router.put("/admin/blog/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const b = req.body as Record<string, unknown>;
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (b.title !== undefined) updateData.title = b.title;
  if (b.excerpt !== undefined) updateData.excerpt = b.excerpt;
  if (b.content !== undefined) updateData.content = b.content;
  if (b.category !== undefined) updateData.category = b.category;
  if (b.author !== undefined) updateData.author = b.author;
  if (b.published !== undefined) updateData.published = b.published;
  if (b.imagePath !== undefined) updateData.imagePath = b.imagePath;
  const [row] = await db
    .update(blogPostsTable)
    .set(updateData)
    .where(eq(blogPostsTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  res.json({ post: toApiPost(row) });
});

router.delete("/admin/blog/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db.delete(blogPostsTable).where(eq(blogPostsTable.id, id)).returning();
  if (!row) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/admin/events", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(eventsTable).orderBy(eventsTable.createdAt);
  res.json({ events: rows.map(toApiEvent) });
});

router.post("/admin/events", requireAdmin, async (req, res): Promise<void> => {
  const b = req.body as Record<string, unknown>;
  if (!b.title || !b.date) {
    res.status(400).json({ error: "title and date are required" });
    return;
  }
  const [row] = await db
    .insert(eventsTable)
    .values({
      title: b.title as string,
      description: (b.description as string) ?? "",
      date: b.date as string,
      time: (b.time as string) ?? "",
      location: (b.location as string) ?? "",
      priceCents: b.priceCents != null ? Number(b.priceCents) : null,
      category: (b.category as string) ?? "In-Person",
      imagePath: (b.imagePath as string | null) ?? null,
      totalSpots: Number(b.totalSpots) || 0,
      spotsLeft: Number(b.spotsLeft) || 0,
      host: (b.host as string) ?? "BougieBams",
      published: b.published === true,
      reminderHoursBefore: b.reminderHoursBefore != null ? Number(b.reminderHoursBefore) : null,
    })
    .returning();
  res.status(201).json({ event: toApiEvent(row) });
});

router.put("/admin/events/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const b = req.body as Record<string, unknown>;
  const updateData: Record<string, unknown> = {};
  if (b.title !== undefined) updateData.title = b.title;
  if (b.description !== undefined) updateData.description = b.description;
  if (b.date !== undefined) updateData.date = b.date;
  if (b.time !== undefined) updateData.time = b.time;
  if (b.location !== undefined) updateData.location = b.location;
  if ("priceCents" in b) updateData.priceCents = b.priceCents != null ? Number(b.priceCents) : null;
  if (b.category !== undefined) updateData.category = b.category;
  if (b.imagePath !== undefined) updateData.imagePath = b.imagePath;
  if (b.totalSpots !== undefined) updateData.totalSpots = Number(b.totalSpots);
  if (b.spotsLeft !== undefined) updateData.spotsLeft = Number(b.spotsLeft);
  if (b.host !== undefined) updateData.host = b.host;
  if (b.published !== undefined) updateData.published = b.published;
  if ("reminderHoursBefore" in b) updateData.reminderHoursBefore = b.reminderHoursBefore != null ? Number(b.reminderHoursBefore) : null;
  const [row] = await db
    .update(eventsTable)
    .set(updateData)
    .where(eq(eventsTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  res.json({ event: toApiEvent(row) });
});

router.delete("/admin/events/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db.delete(eventsTable).where(eq(eventsTable.id, id)).returning();
  if (!row) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/hero-images", async (_req, res): Promise<void> => {
  const rows = await db.select().from(heroImagesTable).orderBy(heroImagesTable.position);
  res.json({ images: rows.map((r) => ({ id: r.id, objectPath: r.objectPath, position: r.position })) });
});

router.get("/admin/hero-images", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(heroImagesTable).orderBy(heroImagesTable.position);
  res.json({ images: rows.map((r) => ({ id: r.id, objectPath: r.objectPath, position: r.position })) });
});

router.post("/admin/hero-images", requireAdmin, async (req, res): Promise<void> => {
  const { objectPath, position } = req.body as { objectPath?: string; position?: number };
  if (!objectPath) { res.status(400).json({ error: "objectPath is required" }); return; }
  const [row] = await db
    .insert(heroImagesTable)
    .values({ objectPath, position: position ?? 0 })
    .returning();
  res.status(201).json({ image: { id: row.id, objectPath: row.objectPath, position: row.position } });
});

router.put("/admin/hero-images/reorder", requireAdmin, async (req, res): Promise<void> => {
  const { order } = req.body as { order?: { id: number; position: number }[] };
  if (!Array.isArray(order)) { res.status(400).json({ error: "order array required" }); return; }
  for (const { id, position } of order) {
    await db.update(heroImagesTable).set({ position }).where(eq(heroImagesTable.id, id));
  }
  res.json({ ok: true });
});

router.delete("/admin/hero-images/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(heroImagesTable).where(eq(heroImagesTable.id, id));
  res.sendStatus(204);
});

router.get("/admin/registrations", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: registrationsTable.id,
      eventId: registrationsTable.eventId,
      eventTitle: eventsTable.title,
      name: registrationsTable.name,
      email: registrationsTable.email,
      notes: registrationsTable.notes,
      status: registrationsTable.status,
      paymentSessionId: registrationsTable.paymentSessionId,
      createdAt: registrationsTable.createdAt,
    })
    .from(registrationsTable)
    .leftJoin(eventsTable, eq(registrationsTable.eventId, eventsTable.id))
    .orderBy(registrationsTable.createdAt);

  res.json({
    registrations: rows.map((r) => ({
      id: r.id,
      eventId: r.eventId,
      eventTitle: r.eventTitle ?? "Unknown Event",
      name: r.name,
      email: r.email,
      notes: r.notes ?? null,
      status: r.status,
      paid: !!r.paymentSessionId,
      createdAt: r.createdAt.toISOString(),
    })),
  });
});

router.delete("/admin/registrations/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db
    .delete(registrationsTable)
    .where(eq(registrationsTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Registration not found" });
    return;
  }

  // A spot is consumed only once a registration reaches "confirmed" (paid events
  // after payment clears, free events immediately). Restore the spot on delete for
  // those, capped at the event's total capacity so counts never exceed totalSpots.
  if (row.status === "confirmed") {
    await db
      .update(eventsTable)
      .set({ spotsLeft: sql`LEAST(${eventsTable.totalSpots}, ${eventsTable.spotsLeft} + 1)` })
      .where(eq(eventsTable.id, row.eventId));
  }

  res.sendStatus(204);
});

router.get("/admin/product-images", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(productImagesTable);
  const images: Record<string, string> = {};
  for (const row of rows) {
    images[row.sku] = row.imagePath;
  }
  res.json({ images });
});

router.put("/admin/product-images/:sku", requireAdmin, async (req, res): Promise<void> => {
  const sku = req.params.sku as string;
  const { imagePath } = req.body as { imagePath?: string };
  if (!imagePath) {
    res.status(400).json({ error: "imagePath is required" });
    return;
  }
  await db.delete(productImagesTable).where(eq(productImagesTable.sku, sku));
  const [row] = await db
    .insert(productImagesTable)
    .values({ productId: sku, sku, url: imagePath, imagePath })
    .returning();
  await db
    .update(productsTable)
    .set({ imagePath, updatedAt: new Date() })
    .where(eq(productsTable.sku, sku));
  res.json({ sku: row.sku, imagePath: row.imagePath });
});

router.delete("/admin/product-images/:sku", requireAdmin, async (req, res): Promise<void> => {
  const sku = req.params.sku as string;
  await db.delete(productImagesTable).where(eq(productImagesTable.sku, sku));
  await db
    .update(productsTable)
    .set({ imagePath: null, updatedAt: new Date() })
    .where(eq(productsTable.sku, sku));
  res.sendStatus(204);
});

const objectStorage = new ObjectStorageService();

router.post("/admin/storage/upload-url", requireAdmin, async (req, res): Promise<void> => {
  try {
    const uploadURL = await objectStorage.getObjectEntityUploadURL();
    const objectPath = objectStorage.normalizeObjectEntityPath(uploadURL);
    res.json({ uploadURL, objectPath });
  } catch (err) {
    logger.error({ err }, "Failed to generate upload URL");
    res.status(500).json({ error: "Could not generate upload URL" });
  }
});

// ── Discount Codes ───────────────────────────────────────────────────────────

router.get("/admin/discount-codes", requireAdmin, async (_req, res): Promise<void> => {
  const codes = await db.select().from(discountCodesTable).orderBy(discountCodesTable.createdAt);
  res.json({ codes });
});

router.post("/admin/discount-codes", requireAdmin, async (req, res): Promise<void> => {
  const { code, discountPercent, appliesTo, description, active } = req.body as {
    code?: string; discountPercent?: number; appliesTo?: string; description?: string | null; active?: boolean;
  };
  if (!code || typeof discountPercent !== "number") {
    res.status(400).json({ error: "code and discountPercent are required" });
    return;
  }
  try {
    const [row] = await db.insert(discountCodesTable).values({
      code: code.trim().toUpperCase(),
      discountPercent,
      appliesTo: appliesTo ?? "both",
      description: description ?? null,
      active: active !== false,
    }).returning();
    res.status(201).json({ code: row });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("unique")) {
      res.status(409).json({ error: "A code with that name already exists" });
    } else {
      res.status(500).json({ error: "Failed to create discount code" });
    }
  }
});

router.put("/admin/discount-codes/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const { code, discountPercent, appliesTo, description, active } = req.body as {
    code?: string; discountPercent?: number; appliesTo?: string; description?: string | null; active?: boolean;
  };
  try {
    const [row] = await db.update(discountCodesTable)
      .set({
        ...(code !== undefined && { code: code.trim().toUpperCase() }),
        ...(discountPercent !== undefined && { discountPercent }),
        ...(appliesTo !== undefined && { appliesTo }),
        ...(description !== undefined && { description }),
        ...(active !== undefined && { active }),
        updatedAt: new Date(),
      })
      .where(eq(discountCodesTable.id, id))
      .returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ code: row });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("unique")) {
      res.status(409).json({ error: "A code with that name already exists" });
    } else {
      res.status(500).json({ error: "Failed to update discount code" });
    }
  }
});

router.delete("/admin/discount-codes/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(discountCodesTable).where(eq(discountCodesTable.id, id));
  res.json({ success: true });
});


export default router;
