import { type Request, type Response, type NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import { logger } from "../lib/logger";

function getSupabaseAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export interface ShopperUser {
  sub: string;
  email?: string;
  role?: string;
}

declare global {
  namespace Express {
    interface Request {
      shopperUser?: ShopperUser;
    }
  }
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const adminUserIds = (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (adminUserIds.length === 0 || !adminUserIds.includes(req.user!.id)) {
    logger.warn({ userId: req.user!.id }, "Unauthorized admin access attempt");
    res.status(403).json({
      error: adminUserIds.length === 0
        ? "Admin access requires the ADMIN_USER_IDS environment variable to be set. See replit.md for setup instructions."
        : "Not authorized",
    });
    return;
  }

  next();
}

export function requireShopperAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }
  const token = authHeader.slice(7);
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    logger.error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — shopper auth unavailable");
    res.status(503).json({ error: "Shopper authentication is not configured" });
    return;
  }
  supabase.auth.getUser(token).then(({ data, error }) => {
    if (error || !data.user) {
      logger.warn({ error }, "Shopper JWT verification failed");
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    req.shopperUser = { sub: data.user.id, email: data.user.email, role: data.user.role };
    next();
  }).catch((err) => {
    logger.warn({ err }, "Shopper auth error");
    res.status(401).json({ error: "Invalid or expired token" });
  });
}

export function injectShopperUser(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) { next(); return; }
  const token = authHeader.slice(7);
  const supabase = getSupabaseAdminClient();
  if (!supabase) { next(); return; }
  supabase.auth.getUser(token).then(({ data }) => {
    if (data.user) {
      req.shopperUser = { sub: data.user.id, email: data.user.email, role: data.user.role };
    }
    next();
  }).catch(() => next());
}

export function requireAnyAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.isAuthenticated() || req.shopperUser) {
    next();
    return;
  }
  res.status(401).json({ error: "Authentication required" });
}