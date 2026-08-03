import { Router, type IRouter } from "express";
import { requireAdmin } from "../middleware/auth";
import { SEGMENTS, buildSegment, segmentCounts, segmentCsv, type SegmentKey } from "../lib/marketingSegments";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const isSegmentKey = (k: string): k is SegmentKey => SEGMENTS.some((s) => s.key === k);

/** Segment catalogue plus live sizes, so the admin sees how many people a
 * campaign would reach before exporting anything. */
router.get("/admin/marketing/segments", requireAdmin, async (_req, res): Promise<void> => {
  try {
    const counts = await segmentCounts();
    res.json({
      segments: SEGMENTS.map((s) => ({ ...s, count: s.needsEvent ? null : counts[s.key] ?? 0 })),
    });
  } catch (err) {
    logger.error({ err }, "Failed to build segment counts");
    res.status(500).json({ error: "Could not load segments" });
  }
});

router.get("/admin/marketing/export", requireAdmin, async (req, res): Promise<void> => {
  const key = String(req.query.segment ?? "");
  if (!isSegmentKey(key)) {
    res.status(400).json({ error: "Unknown segment" });
    return;
  }
  const eventIdRaw = req.query.eventId;
  const eventId = eventIdRaw != null ? parseInt(String(eventIdRaw), 10) : undefined;
  const def = SEGMENTS.find((s) => s.key === key)!;
  if (def.needsEvent && (eventId == null || Number.isNaN(eventId))) {
    res.status(400).json({ error: "This segment needs an event" });
    return;
  }

  try {
    const rows = await buildSegment(key, eventId);
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="bougiebams-${key.replace(/_/g, "-")}-${stamp}.csv"`);
    res.setHeader("Cache-Control", "no-store");
    res.send(segmentCsv(rows));
  } catch (err) {
    logger.error({ err, segment: key }, "Failed to export segment");
    res.status(500).json({ error: "Could not export that segment" });
  }
});

export default router;
