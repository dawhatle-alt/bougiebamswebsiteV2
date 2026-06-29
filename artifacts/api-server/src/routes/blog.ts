import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, blogPostsTable } from "@workspace/db";
import {
  ListBlogPostsResponse,
  CreateBlogPostBody,
  GetBlogPostParams,
  GetBlogPostResponse,
  UpdateBlogPostParams,
  UpdateBlogPostBody,
  UpdateBlogPostResponse,
  DeleteBlogPostParams,
} from "@workspace/api-zod";
import { requireAdmin } from "../middleware/auth";

const router: IRouter = Router();

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
    coverImage: row.coverImage ?? null,
    published: row.published,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

router.get("/blog", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(blogPostsTable)
    .where(eq(blogPostsTable.published, true))
    .orderBy(blogPostsTable.createdAt);
  res.json(ListBlogPostsResponse.parse({ posts: rows.map(toApiPost) }));
});

router.get("/blog/:slug", async (req, res): Promise<void> => {
  const params = GetBlogPostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select()
    .from(blogPostsTable)
    .where(eq(blogPostsTable.slug, params.data.slug));

  if (!row) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  res.json(GetBlogPostResponse.parse({ post: toApiPost(row) }));
});

router.post("/blog", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateBlogPostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [row] = await db
    .insert(blogPostsTable)
    .values({
      slug: parsed.data.slug,
      title: parsed.data.title,
      excerpt: parsed.data.excerpt ?? "",
      content: parsed.data.content ?? "",
      category: parsed.data.category ?? "Style",
      author: parsed.data.author ?? "BougieBams",
      published: parsed.data.published ?? false,
    })
    .returning();

  res.status(201).json(GetBlogPostResponse.parse({ post: toApiPost(row) }));
});

router.patch("/blog/:slug", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateBlogPostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateBlogPostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.excerpt !== undefined) updateData.excerpt = parsed.data.excerpt;
  if (parsed.data.content !== undefined) updateData.content = parsed.data.content;
  if (parsed.data.category !== undefined) updateData.category = parsed.data.category;
  if (parsed.data.author !== undefined) updateData.author = parsed.data.author;
  if (parsed.data.published !== undefined) updateData.published = parsed.data.published;

  const [row] = await db
    .update(blogPostsTable)
    .set(updateData)
    .where(eq(blogPostsTable.slug, params.data.slug))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  res.json(UpdateBlogPostResponse.parse({ post: toApiPost(row) }));
});

router.delete("/blog/:slug", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteBlogPostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .delete(blogPostsTable)
    .where(eq(blogPostsTable.slug, params.data.slug))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
