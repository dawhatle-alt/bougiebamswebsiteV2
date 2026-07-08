import { Router, type IRouter, type Request, type Response } from "express";
import { logger } from "../lib/logger";
import { getSquareClient, getSquareLocationId, isSquareLocationConfigured } from "../lib/square";
import { syncOrdersFromSquare } from "../lib/orders";

const router: IRouter = Router();

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
    res.json({ ok: false, skipped: "Square not configured" });
    return;
  }

  try {
    await syncOrdersFromSquare(client, getSquareLocationId());
    logger.info("Cron order/registration reconciliation completed");
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Cron order/registration reconciliation failed");
    res.status(500).json({ ok: false });
  }
});

export default router;
