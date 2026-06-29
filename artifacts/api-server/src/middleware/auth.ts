import crypto from "crypto";
import { type Request, type Response, type NextFunction } from "express";

const TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function getAdminSecret(): string {
  return (
    process.env.ADMIN_SECRET ??
    process.env.ADMIN_PASSWORD ??
    "bougiebams2024"
  );
}

export function signAdminToken(): string {
  const payload = `bougiebams:${Date.now()}`;
  const secret = getAdminSecret();
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  return Buffer.from(`${payload}:${hmac}`).toString("base64");
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const lastColon = decoded.lastIndexOf(":");
    if (lastColon === -1) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    const payload = decoded.slice(0, lastColon);
    const providedHmac = decoded.slice(lastColon + 1);

    const secret = getAdminSecret();
    const expectedHmac = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("base64url");

    if (
      providedHmac.length !== expectedHmac.length ||
      !crypto.timingSafeEqual(
        Buffer.from(providedHmac),
        Buffer.from(expectedHmac),
      )
    ) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    const parts = payload.split(":");
    if (parts.length !== 2 || parts[0] !== "bougiebams") {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    const issuedAt = parseInt(parts[1], 10);
    if (Number.isNaN(issuedAt) || Date.now() - issuedAt > TOKEN_MAX_AGE_MS) {
      res.status(401).json({ error: "Token expired" });
      return;
    }
  } catch {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  next();
}
