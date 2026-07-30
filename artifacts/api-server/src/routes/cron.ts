import { Router, type IRouter, type Request, type Response } from "express";
import { sql } from "drizzle-orm";
import { db, registrationsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { getSquareClient, getSquareLocationId, isSquareLocationConfigured } from "../lib/square";
import { syncOrdersFromSquare } from "../lib/orders";

const router: IRouter = Router();

// Abandoned checkouts leave a pending registration behind (the row is written
// before the guest reaches Square). They hold no spot, but they pile up in the
// Registrations list and their payment links are long dead. Anything still
// pending after this window is cleared. Runs AFTER the Square reconciliation
// below, so a genuinely paid registration is confirmed first and never swept.
const STALE_PENDING_HOURS = 48;

async function clearStalePendingRegistrations(): Promise<number> {
  const rows = await db
    .delete(registrationsTable)
    .where(
      sql`${registrationsTable.status} = 'pending'
        AND ${registrationsTable.createdAt} < now() - interval '${sql.raw(String(STALE_PENDING_HOURS))} hours'`,
    )
    .returning({ id: registrationsTable.id });
  return rows.length;
}

// Daily safety net (Vercel cron): pull recent paid orders from Square and let
// recordSquareOrder repair anything the webhook / confirmation page missed —
// stuck-pending registrations, "Free" mislabels, and registrations that are
// missing entirely. Square is the source of truth for money; this makes the
// registration list converge to it even after outages.
//
// Idempotent read-repair, so an unauthenticated call is harmless — but when
// CRON_SECRET is set (Vercel sends it as a Bearer token), it's enforced.
router.get("/cron/reconcile-orders", async (req: Request, res: Response): Promise<void> => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const client = getSquareClient();
  if (!client || !isSquareLocationConfigured()) {
    // The pending sweep doesn't need Square, so still run it.
    try {
      const swept = await clearStalePendingRegistrations();
      res.json({ ok: true, skipped: "Square not configured", stalePendingCleared: swept });
    } catch (err) {
      logger.error({ err }, "Stale pending registration cleanup failed");
      res.json({ ok: false, skipped: "Square not configured" });
    }
    return;
  }

  try {
    await syncOrdersFromSquare(client, getSquareLocationId());
    logger.info("Cron order/registration reconciliation completed");
    // Only sweep after reconciliation: a paid-but-pending registration gets
    // confirmed above, so it can never be deleted here.
    let stalePendingCleared = 0;
    try {
      stalePendingCleared = await clearStalePendingRegistrations();
      if (stalePendingCleared > 0) {
        logger.info({ stalePendingCleared }, "Cleared abandoned pending registrations");
      }
    } catch (err) {
      logger.error({ err }, "Stale pending registration cleanup failed");
    }
    res.json({ ok: true, stalePendingCleared });
  } catch (err) {
    logger.error({ err }, "Cron order/registration reconciliation failed");
    res.status(500).json({ ok: false });
  }
});

export default router;
