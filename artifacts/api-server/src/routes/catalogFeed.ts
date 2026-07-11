import { Router, type IRouter } from "express";
import { eq, and, gte } from "drizzle-orm";
import { db, productsTable, eventsTable } from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Canonical origin for links in the feed — Meta fetches this from outside, so
// relative URLs won't do.
const SITE_ORIGIN = process.env.PUBLIC_SITE_ORIGIN ?? "https://bougiebams.com";

const FEED_COLUMNS = [
  "id",
  "title",
  "description",
  "availability",
  "condition",
  "price",
  "link",
  "image_link",
  "brand",
] as const;

function csvField(value: string): string {
  return `"${value.replace(/\s+/g, " ").trim().replace(/"/g, '""')}"`;
}

function storageUrl(imagePath: string): string {
  return `${SITE_ORIGIN}/api/storage${imagePath}`;
}

/**
 * Meta (Facebook/Instagram) Shops scheduled product feed. Commerce Manager
 * fetches this CSV on a schedule, so the Facebook shop mirrors the site's
 * catalog — published products plus upcoming paid events — without manual
 * data entry. Items link back to the site, where checkout happens via Square.
 */
router.get("/facebook/catalog.csv", async (_req, res): Promise<void> => {
  try {
    const products = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.published, true))
      .orderBy(productsTable.createdAt);

    const today = new Date().toISOString().slice(0, 10);
    const events = await db
      .select()
      .from(eventsTable)
      .where(and(
        eq(eventsTable.published, true),
        eq(eventsTable.archived, false),
        gte(eventsTable.date, today),
      ))
      .orderBy(eventsTable.date);

    const rows: string[] = [FEED_COLUMNS.join(",")];

    for (const p of products) {
      // Meta requires an image for every item; unphotographed products can't
      // be listed yet.
      if (!p.imagePath) continue;
      rows.push([
        csvField(`product-${p.id}`),
        csvField(p.name),
        csvField(p.description || p.name),
        csvField(p.inStock ? "in stock" : "out of stock"),
        csvField("new"),
        csvField(`${Number(p.price).toFixed(2)} USD`),
        csvField(`${SITE_ORIGIN}/shop/${encodeURIComponent(p.id)}`),
        csvField(storageUrl(p.imagePath)),
        csvField("BougieBams"),
      ].join(","));
    }

    for (const e of events) {
      const priceCents = e.priceCents ?? 0;
      if (priceCents <= 0) continue; // free events aren't sellable items
      rows.push([
        csvField(`event-${e.id}`),
        csvField(`${e.title} — ${e.date}`),
        csvField(e.description || `${e.title} at ${e.location} on ${e.date}, ${e.time}.`),
        csvField(e.spotsLeft > 0 ? "in stock" : "out of stock"),
        csvField("new"),
        csvField(`${(priceCents / 100).toFixed(2)} USD`),
        csvField(`${SITE_ORIGIN}/events/${e.id}`),
        csvField(e.imagePath ? storageUrl(e.imagePath) : `${SITE_ORIGIN}/opengraph.jpg`),
        csvField("BougieBams"),
      ].join(","));
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(rows.join("\n") + "\n");
  } catch (err) {
    logger.error({ err }, "Failed to generate Facebook catalog feed");
    res.status(500).send("feed unavailable");
  }
});

export default router;
