import { Router, type RequestHandler } from "express";
import { db, subscribersTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { createHmac, timingSafeEqual } from "node:crypto";

const router = Router();

const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours
const MAX_ATTEMPTS = 8;
const ATTEMPT_WINDOW_MS = 1000 * 60 * 10; // 10 minutes

const attempts = new Map<string, { count: number; resetAt: number }>();

function getSecret(): string | null {
  return process.env.ADMIN_PASSWORD || null;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function issueToken(secret: string): string {
  const exp = String(Date.now() + SESSION_TTL_MS);
  const sig = createHmac("sha256", secret).update(exp).digest("hex");
  return Buffer.from(`${exp}.${sig}`).toString("base64url");
}

function verifyToken(token: string, secret: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const dot = decoded.indexOf(".");
    if (dot < 1) return false;
    const exp = decoded.slice(0, dot);
    const sig = decoded.slice(dot + 1);
    const expMs = Number(exp);
    if (!Number.isFinite(expMs) || expMs < Date.now()) return false;
    const expected = createHmac("sha256", secret).update(exp).digest("hex");
    return safeEqual(sig, expected);
  } catch {
    return false;
  }
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || rec.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS });
    return false;
  }
  rec.count += 1;
  return rec.count > MAX_ATTEMPTS;
}

function bearer(req: { headers: { authorization?: string } }): string {
  const header = req.headers.authorization ?? "";
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
}

const requireAdmin: RequestHandler = (req, res, next) => {
  const secret = getSecret();
  if (!secret) {
    req.log.error("ADMIN_PASSWORD is not configured");
    return res
      .status(503)
      .json({ error: "Admin access is not configured yet." });
  }

  const token = bearer(req);
  if (!token || !verifyToken(token, secret)) {
    return res
      .status(401)
      .json({ error: "Your session has expired. Please sign in again." });
  }

  return next();
};

router.post("/admin/verify", (req, res) => {
  const secret = getSecret();
  if (!secret) {
    req.log.error("ADMIN_PASSWORD is not configured");
    return res
      .status(503)
      .json({ error: "Admin access is not configured yet." });
  }

  const key = req.ip ?? "unknown";
  if (isRateLimited(key)) {
    return res.status(429).json({
      error: "Too many attempts. Please wait a few minutes and try again.",
    });
  }

  const provided = bearer(req);
  if (!provided || !safeEqual(provided, secret)) {
    return res.status(401).json({ error: "Incorrect password" });
  }

  attempts.delete(key);
  return res.json({ success: true, token: issueToken(secret) });
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
