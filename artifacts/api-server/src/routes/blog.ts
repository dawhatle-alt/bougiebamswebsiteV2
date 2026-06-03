import { Router, type IRouter } from "express";
import { db, blogPostsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requireAdmin } from "./admin";

const router: IRouter = Router();

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || "post";
}

async function uniqueSlug(title: string, ignoreId?: number): Promise<string> {
  const base = slugify(title);
  let candidate = base;
  let n = 1;
  // Loop until we find a slug not used by another post.
  while (true) {
    const [existing] = await db
      .select({ id: blogPostsTable.id })
      .from(blogPostsTable)
      .where(eq(blogPostsTable.slug, candidate))
      .limit(1);
    if (!existing || existing.id === ignoreId) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

interface BlogInput {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  imagePath: string | null;
  published: boolean;
}

function parseBody(body: unknown): { data?: BlogInput; error?: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Invalid request body." };
  }
  const b = body as Record<string, unknown>;
  const title = typeof b.title === "string" ? b.title.trim() : "";
  if (!title) return { error: "A title is required." };

  const asString = (v: unknown, fallback = "") =>
    typeof v === "string" ? v : fallback;

  return {
    data: {
      title,
      excerpt: asString(b.excerpt).trim(),
      content: asString(b.content),
      category: asString(b.category, "General").trim() || "General",
      author: asString(b.author, "BougieBams").trim() || "BougieBams",
      imagePath:
        typeof b.imagePath === "string" && b.imagePath.trim()
          ? b.imagePath.trim()
          : null,
      published: b.published === undefined ? true : Boolean(b.published),
    },
  };
}

// ---- Public endpoints ----

// List published posts (newest first).
router.get("/blog", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(blogPostsTable)
      .where(eq(blogPostsTable.published, true))
      .orderBy(desc(blogPostsTable.createdAt));
    return res.json({ posts: rows });
  } catch (err) {
    req.log.error({ err }, "Failed to load blog posts");
    return res
      .status(500)
      .json({ error: "Something went wrong. Please try again." });
  }
});

// Single published post by slug.
router.get("/blog/:slug", async (req, res) => {
  try {
    const [row] = await db
      .select()
      .from(blogPostsTable)
      .where(eq(blogPostsTable.slug, req.params.slug))
      .limit(1);
    if (!row || !row.published) {
      return res.status(404).json({ error: "Post not found." });
    }
    return res.json({ post: row });
  } catch (err) {
    req.log.error({ err }, "Failed to load blog post");
    return res
      .status(500)
      .json({ error: "Something went wrong. Please try again." });
  }
});

// ---- Admin endpoints ----

// List all posts (including drafts).
router.get("/admin/blog", requireAdmin, async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(blogPostsTable)
      .orderBy(desc(blogPostsTable.createdAt));
    return res.json({ posts: rows });
  } catch (err) {
    req.log.error({ err }, "Failed to load admin blog posts");
    return res
      .status(500)
      .json({ error: "Something went wrong. Please try again." });
  }
});

// Create a post.
router.post("/admin/blog", requireAdmin, async (req, res) => {
  const { data, error } = parseBody(req.body);
  if (error || !data) return res.status(400).json({ error });
  try {
    const slug = await uniqueSlug(data.title);
    const [row] = await db
      .insert(blogPostsTable)
      .values({ ...data, slug })
      .returning();
    return res.status(201).json({ post: row });
  } catch (err) {
    req.log.error({ err }, "Failed to create blog post");
    return res
      .status(500)
      .json({ error: "Could not save the post. Please try again." });
  }
});

// Update a post.
router.put("/admin/blog/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid post id." });
  const { data, error } = parseBody(req.body);
  if (error || !data) return res.status(400).json({ error });
  try {
    const slug = await uniqueSlug(data.title, id);
    const [row] = await db
      .update(blogPostsTable)
      .set({ ...data, slug, updatedAt: new Date() })
      .where(eq(blogPostsTable.id, id))
      .returning();
    if (!row) return res.status(404).json({ error: "Post not found." });
    return res.json({ post: row });
  } catch (err) {
    req.log.error({ err }, "Failed to update blog post");
    return res
      .status(500)
      .json({ error: "Could not save the post. Please try again." });
  }
});

// Delete a post.
router.delete("/admin/blog/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid post id." });
  try {
    const [row] = await db
      .delete(blogPostsTable)
      .where(eq(blogPostsTable.id, id))
      .returning({ id: blogPostsTable.id });
    if (!row) return res.status(404).json({ error: "Post not found." });
    return res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete blog post");
    return res
      .status(500)
      .json({ error: "Could not delete the post. Please try again." });
  }
});

export default router;
