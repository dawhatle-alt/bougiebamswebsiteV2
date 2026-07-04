import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { logger } from "../lib/logger";

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
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;
  if (!jwtSecret) {
    logger.error("SUPABASE_JWT_SECRET is not set — shopper auth unavailable");
    res.status(503).json({ error: "Shopper authentication is not configured" });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, jwtSecret) as ShopperUser;
    req.shopperUser = decoded;
    next();
  } catch (err) {
    logger.warn({ err }, "Shopper JWT verification failed");
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function injectShopperUser(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;
  if (!jwtSecret) { next(); return; }
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) { next(); return; }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, jwtSecret) as ShopperUser;
    req.shopperUser = decoded;
  } catch {
  }
  next();
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
