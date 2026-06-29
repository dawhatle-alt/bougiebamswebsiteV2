import { type Request, type Response, type NextFunction } from "express";
import { logger } from "../lib/logger";

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
