import { Router, type RequestHandler } from "express";
import { db, subscribersTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router = Router();

const requireAdmin: RequestHandler = (req, res, next) => {
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    req.log.error("ADMIN_PASSWORD is not configured");
    return res
      .status(503)
      .json({ error: "Admin access is not configured yet." });
  }

  const header = req.headers.authorization ?? "";
  const provided = header.startsWith("Bearer ")
    ? header.slice("Bearer ".length)
    : "";

  if (provided !== expected) {
    return res.status(401).json({ error: "Invalid password" });
  }

  return next();
};

router.post("/admin/verify", requireAdmin, (_req, res) => {
  return res.json({ success: true });
});

router.get("/admin/subscribers", requireAdmin, async (req, res) => {
  try {
    const rows = await db
      .select({
        id: subscribersTable.id,
        email: subscribersTable.email,
        source: subscribersTable.source,
        discountCode: subscribersTable.discountCode,
        createdAt: subscribersTable.createdAt,
      })
      .from(subscribersTable)
      .orderBy(desc(subscribersTable.createdAt));

    return res.json({ subscribers: rows, count: rows.length });
  } catch (err) {
    req.log.error({ err }, "Failed to load subscribers");
    return res
      .status(500)
      .json({ error: "Something went wrong. Please try again." });
  }
});

export default router;
