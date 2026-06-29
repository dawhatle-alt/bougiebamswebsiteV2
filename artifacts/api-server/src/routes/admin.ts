import { Router, type IRouter } from "express";
import { count } from "drizzle-orm";
import { db, eventsTable, productsTable, blogPostsTable, subscribersTable } from "@workspace/db";
import { AdminLoginBody, GetAdminStatsResponse } from "@workspace/api-zod";
import { requireAdmin } from "../middleware/auth";

const router: IRouter = Router();

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

  const token = Buffer.from(`bougiebams:${Date.now()}`).toString("base64");
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

export default router;
