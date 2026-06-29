import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { count, eq } from "drizzle-orm";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import {
  db,
  eventsTable,
  productsTable,
  blogPostsTable,
  subscribersTable,
  productImagesTable,
} from "@workspace/db";
import { AdminLoginBody, GetAdminStatsResponse } from "@workspace/api-zod";
import { requireAdmin, signAdminToken } from "../middleware/auth";
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

function rawBodyMiddleware(req: Request, res: Response, next: NextFunction) {
  const chunks: Buffer[] = [];
  req.on("data", (chunk: Buffer) => chunks.push(chunk));
  req.on("end", () => {
    (req as Request & { body: Buffer }).body = Buffer.concat(chunks);
    next();
  });
  req.on("error", (err: Error) => {
    logger.error({ err }, "Upload stream error");
    res.status(500).json({ error: "Stream error" });
  });
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
  };
}

router.post("/admin/auth/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const adminPassword = process.env.ADMIN_PASSWORD ?? "bougiebams2024";
  if (parsed.data.password !== adminPassword) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }
  const token = signAdminToken();
  res.json({ token });
});

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
  const id = parseInt(req.params.id, 10);
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
  const id = parseInt(req.params.id, 10);
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
    })
    .returning();
  res.status(201).json({ event: toApiEvent(row) });
});

router.put("/admin/events/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
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
  const id = parseInt(req.params.id, 10);
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

router.get("/admin/product-images", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(productImagesTable);
  const images: Record<string, string> = {};
  for (const row of rows) {
    images[row.sku] = row.imagePath;
  }
  res.json({ images });
});

router.put("/admin/product-images/:sku", requireAdmin, async (req, res): Promise<void> => {
  const { sku } = req.params;
  const { imagePath } = req.body as { imagePath?: string };
  if (!imagePath) {
    res.status(400).json({ error: "imagePath is required" });
    return;
  }
  const [row] = await db
    .insert(productImagesTable)
    .values({ sku, imagePath })
    .onConflictDoUpdate({
      target: productImagesTable.sku,
      set: { imagePath, updatedAt: new Date() },
    })
    .returning();
  res.json({ sku: row.sku, imagePath: row.imagePath });
});

router.delete("/admin/product-images/:sku", requireAdmin, async (req, res): Promise<void> => {
  const { sku } = req.params;
  await db.delete(productImagesTable).where(eq(productImagesTable.sku, sku));
  res.sendStatus(204);
});

router.post("/admin/storage/upload-url", requireAdmin, async (req, res): Promise<void> => {
  const ext = ((req.query.ext as string | undefined) ?? "jpg")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase() || "jpg";
  const filename = `${crypto.randomUUID()}.${ext}`;
  res.json({
    uploadURL: `/api/admin/storage/upload/${filename}`,
    objectPath: `/${filename}`,
  });
});

router.put("/admin/storage/upload/:filename", rawBodyMiddleware, async (req, res): Promise<void> => {
  const { filename } = req.params;
  if (!filename || !/^[\w-]+\.\w+$/.test(filename)) {
    res.status(400).json({ error: "Invalid filename" });
    return;
  }
  const destPath = path.resolve(uploadsDir, filename);
  if (!destPath.startsWith(uploadsDir)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    fs.writeFileSync(destPath, (req as Request & { body: Buffer }).body);
    logger.info({ filename }, "File uploaded");
    res.json({ objectPath: `/${filename}` });
  } catch (err) {
    logger.error({ err }, "File upload failed");
    res.status(500).json({ error: "Upload failed" });
  }
});

export default router;
