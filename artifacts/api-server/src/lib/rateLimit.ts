import type { RequestHandler } from "express";

// Lightweight in-memory rate limiter. Keyed on the client IP (req.ip), which is
// only trustworthy once `app.set("trust proxy", ...)` is configured — see app.ts.
//
// This is intentionally dependency-free. For a single small deployment it is
// sufficient; if the API is ever scaled to multiple instances, swap the Map for
// a shared store (e.g. Redis) so limits are enforced across the fleet.

interface Bucket {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  windowMs: number;
  max: number;
  // Distinguishes buckets for different routes so, e.g., the checkout limit and
  // the subscribe limit don't share a counter.
  prefix: string;
  message?: string;
}

const store = new Map<string, Bucket>();

// Opportunistic cleanup so the Map can't grow without bound. Runs at most once
// per sweep window and only walks expired entries.
let lastSweep = 0;
const SWEEP_INTERVAL_MS = 1000 * 60 * 5;

function sweep(now: number): void {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of store) {
    if (bucket.resetAt < now) store.delete(key);
  }
}

export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  const { windowMs, max, prefix } = options;
  const message =
    options.message ??
    "Too many requests. Please wait a moment and try again.";

  return (req, res, next) => {
    const now = Date.now();
    sweep(now);

    const ip = req.ip || "unknown";
    const key = `${prefix}:${ip}`;
    const bucket = store.get(key);

    if (!bucket || bucket.resetAt < now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > max) {
      const retryAfterSec = Math.max(
        1,
        Math.ceil((bucket.resetAt - now) / 1000),
      );
      res.setHeader("Retry-After", String(retryAfterSec));
      return res.status(429).json({ error: message });
    }

    return next();
  };
}
