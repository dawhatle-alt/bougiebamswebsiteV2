import { Router, type IRouter, type Request, type Response } from "express";
import { inArray } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { getSquareClient, getSquareLocationId, isSquareLocationConfigured } from "../lib/square";
import { resolveProductDiscount } from "../lib/discounts";

/**
 * Meta (Facebook/Instagram) Shop offsite checkout. Meta redirects buyers here
 * with their cart as ?products=<contentId>:<qty>,... (+ optional &coupon= and
 * utm_ / fbclid tracking). Content ids are the catalog feed's ids
 * (product-<id> / event-<id>). We resolve them server-side, build a Square
 * payment link with production prices from the DB, and 302 the buyer straight
 * to Square's hosted checkout — no JS required, which is also what Meta's URL
 * checker verifies.
 *
 * This endpoint must never 500: every failure degrades to a redirect into the
 * shop (Meta penalizes erroring checkout URLs).
 */
const router: IRouter = Router();

const SITE_ORIGIN = process.env.PUBLIC_SITE_ORIGIN ?? "https://bougiebams.com";

interface CartEntry {
  id: string;
  qty: number;
}

function parseCart(productsParam: string): CartEntry[] {
  return productsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const [id, qty] = entry.split(":");
      return {
        id: (id ?? "").trim(),
        qty: Math.min(99, Math.max(1, parseInt(qty ?? "1", 10) || 1)),
      };
    })
    .filter((e) => e.id.length > 0);
}

router.get("/fb-checkout", async (req: Request, res: Response): Promise<void> => {
  const rawQuery = req.originalUrl.split("?")[1] ?? "";
  const toShop = (error = false): void => {
    res.redirect(302, `${SITE_ORIGIN}/shop${error ? "?checkout_error=1" : ""}`);
  };

  try {
    const productsParam = typeof req.query.products === "string" ? req.query.products : "";
    const entries = parseCart(productsParam);
    if (entries.length === 0) {
      logger.warn({ rawQuery }, "fb-checkout: no parseable cart entries");
      toShop();
      return;
    }

    // Events can't join a Square product order (registration needs attendee
    // details) — collect them separately and route to the event page instead.
    const eventIds: number[] = [];
    const productKeys: string[] = [];
    for (const e of entries) {
      const eventMatch = /^event-(\d+)$/i.exec(e.id);
      if (eventMatch) {
        eventIds.push(parseInt(eventMatch[1], 10));
      } else {
        productKeys.push(e.id.startsWith("product-") ? e.id.slice("product-".length) : e.id);
      }
    }

    // Resolve against our ids first, then SKUs as a fallback, so the endpoint
    // tolerates either form in the Meta catalog's Content ID field.
    const unique = [...new Set(productKeys)];
    let rows = unique.length
      ? await db.select().from(productsTable).where(inArray(productsTable.id, unique))
      : [];
    const foundIds = new Set(rows.map((r) => r.id));
    const unresolved = unique.filter((k) => !foundIds.has(k));
    if (unresolved.length) {
      const bySku = await db.select().from(productsTable).where(inArray(productsTable.sku, unresolved));
      rows = rows.concat(bySku);
    }
    const byKey = new Map<string, (typeof rows)[number]>();
    for (const r of rows) {
      byKey.set(r.id, r);
      byKey.set(r.sku, r);
    }

    const lineItems: { name: string; quantity: string; basePriceMoney: { amount: bigint; currency: string } }[] = [];
    for (const entry of entries) {
      if (/^event-\d+$/i.test(entry.id)) continue;
      const key = entry.id.startsWith("product-") ? entry.id.slice("product-".length) : entry.id;
      const p = byKey.get(key);
      if (!p || !p.published || !p.inStock) {
        logger.warn({ rawQuery, contentId: entry.id }, "fb-checkout: skipping unknown/unavailable item");
        continue;
      }
      lineItems.push({
        name: p.name,
        quantity: String(entry.qty),
        basePriceMoney: { amount: BigInt(Math.round(Number(p.price) * 100)), currency: "USD" },
      });
    }

    if (lineItems.length === 0) {
      if (eventIds.length > 0) {
        // Events-only cart: registration happens on the event page.
        res.redirect(302, `${SITE_ORIGIN}/events/${eventIds[0]}`);
        return;
      }
      logger.warn({ rawQuery }, "fb-checkout: nothing resolved to a sellable item");
      toShop(true);
      return;
    }
    if (eventIds.length > 0) {
      logger.warn({ rawQuery, eventIds }, "fb-checkout: mixed cart — event tickets dropped from Square order");
    }

    const client = getSquareClient();
    if (!client || !isSquareLocationConfigured()) {
      logger.error({ rawQuery }, "fb-checkout: Square is not configured");
      toShop(true);
      return;
    }

    // Best-effort coupon: Meta sends no buyer email, so the per-email
    // single-use rule can't be enforced here — valid codes apply, unknown
    // codes are ignored rather than blocking checkout.
    let discount: { code: string; percent: number } | null = null;
    const coupon = typeof req.query.coupon === "string" ? req.query.coupon.trim() : "";
    if (coupon) {
      try {
        discount = await resolveProductDiscount(coupon);
      } catch (err) {
        logger.error({ err, coupon }, "fb-checkout: coupon lookup failed — proceeding without");
      }
      if (!discount) logger.warn({ rawQuery, coupon }, "fb-checkout: unknown coupon ignored");
    }

    // Attribution: mark the payment as Facebook Shop-originated and keep
    // Meta's tracking params with it.
    const tracking = Object.entries(req.query)
      .filter(([k]) => k.startsWith("utm_") || k === "fbclid" || k === "cart_origin")
      .map(([k, v]) => `${k}=${String(v)}`)
      .join(" ");
    const paymentNote = `source=facebook_shop${tracking ? ` ${tracking}` : ""}`.slice(0, 500);

    const response = await client.checkout.paymentLinks.create({
      idempotencyKey: `fbshop-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      order: {
        locationId: getSquareLocationId(),
        lineItems,
        ...(discount
          ? {
              discounts: [
                {
                  name: `${discount.code} (${discount.percent}% off)`,
                  type: "FIXED_PERCENTAGE" as const,
                  percentage: String(discount.percent),
                  scope: "ORDER" as const,
                },
              ],
            }
          : {}),
      },
      paymentNote,
      checkoutOptions: {
        redirectUrl: `${SITE_ORIGIN}/checkout/confirmation`,
        askForShippingAddress: true,
      },
    });

    const url = response.paymentLink?.url;
    if (!url) throw new Error("Square did not return a checkout URL");
    logger.info(
      { items: lineItems.length, droppedEvents: eventIds.length, coupon: discount?.code ?? null },
      "fb-checkout: Square checkout created",
    );
    res.redirect(302, url);
  } catch (err) {
    logger.error({ err, rawQuery }, "fb-checkout failed");
    toShop(true);
  }
});

export default router;
