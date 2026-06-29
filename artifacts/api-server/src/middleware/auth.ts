import { type Request, type Response, type NextFunction } from "express";
import { logger } from "../lib/logger";

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const adminUserIds = process.env.ADMIN_USER_IDS
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (adminUserIds && adminUserIds.length > 0) {
    if (!adminUserIds.includes(req.user!.id)) {
      logger.warn({ userId: req.user!.id }, "Unauthorized admin access attempt");
      res.status(403).json({ error: "Not authorized" });
      return;
    }
  }

  next();
}
