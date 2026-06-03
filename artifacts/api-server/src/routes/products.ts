import { Router } from "express";
import { db, subscribersTable, productImagesTable } from "@workspace/db";
import { and, eq, isNull } from "drizzle-orm";
import { squareFetch, getLocationId, getSquareToken, SquareError } from "../lib/square";

const router = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface NormalizedProduct {
  id: string; // Square variation id
  sku: string;
  name: string;
  description: string;
  price: number; // dollars
  category: string;
  inStock: boolean;
  imagePath: string | null; // admin-uploaded image override, null = use local default
}

interface CatalogObject {
  type: string;
  id: string;
  item_data?: {
    name?: string;
    description?: string;
    categories?: Array<{ id: string }>;
    reporting_category?: { id: string };
    variations?: Array<{
      id: string;
      item_variation_data?: {
        sku?: string;
        price_money?: { amount?: number };
        track_inventory?: boolean;
      };
    }>;
  };
  category_data?: { name?: string };
}

// Trusted storefront origin for the post-payment redirect. Never derived from
// request headers (Host-header injection / open-redirect risk). Returns "" when
// no trusted origin is configured, in which case we omit redirect_url and Square
// shows its own confirmation page.
function getRedirectBase(): string {
  const explicit = process.env.PUBLIC_WEB_ORIGIN;
  if (explicit) return explicit.replace(/\/+$/, "");
  const dev = process.env.REPLIT_DEV_DOMAIN;
  if (dev) return `https://${dev}`;
  return "";
}

// Welcome promo: 15% off the whole order. Kept in lockstep with the value shown
// in the welcome popup / email (see routes/subscribe.ts).
const DISCOUNT_CODE = "BOUGIE15";
const DISCOUNT_PERCENTAGE = "15";

// All sellable variation ids in the catalog. Used to reject checkout requests
// referencing ids that are not part of the storefront.
async function getCatalogVariationIds(): Promise<Set<string>> {
  const res = await squareFetch<{ objects?: CatalogObject[] }>(
    "/v2/catalog/list?types=ITEM",
  );
  const ids = new Set<string>();
  for (const item of res.objects || []) {
    if (item.type !== "ITEM") continue;
    for (const variation of item.item_data?.variations || []) {
      if (variation.id) ids.add(variation.id);
    }
  }
  return ids;
}

// GET /api/products — live catalog from Square, merged with inventory.
router.get("/products", async (req, res) => {
  if (!getSquareToken()) {
    return res
      .status(503)
      .json({ error: "Store is not connected yet.", products: [] });
  }

  try {
    const [itemsRes, catsRes] = await Promise.all([
      squareFetch<{ objects?: CatalogObject[] }>("/v2/catalog/list?types=ITEM"),
      squareFetch<{ objects?: CatalogObject[] }>("/v2/catalog/list?types=CATEGORY"),
    ]);

    const categoryNames = new Map<string, string>();
    for (const c of catsRes.objects || []) {
      if (c.type === "CATEGORY" && c.category_data?.name) {
        categoryNames.set(c.id, c.category_data.name);
      }
    }

    const items = (itemsRes.objects || []).filter(
      (o) => o.type === "ITEM" && o.item_data?.variations?.length,
    );

    // Collect variation ids that track inventory so we can check stock.
    const variationIds: string[] = [];
    for (const item of items) {
      const variation = item.item_data!.variations![0];
      if (variation.item_variation_data?.track_inventory) {
        variationIds.push(variation.id);
      }
    }

    const stockByVariation = new Map<string, number>();
    if (variationIds.length > 0) {
      const locationId = await getLocationId();
      const inv = await squareFetch<{
        counts?: Array<{ catalog_object_id: string; state: string; quantity: string }>;
      }>("/v2/inventory/counts/batch-retrieve", {
        method: "POST",
        body: JSON.stringify({
          catalog_object_ids: variationIds,
          location_ids: [locationId],
        }),
      });
      for (const count of inv.counts || []) {
        if (count.state === "IN_STOCK") {
          stockByVariation.set(
            count.catalog_object_id,
            Number(count.quantity) || 0,
          );
        }
      }
    }

    // Fetch admin-uploaded image overrides from DB (one extra query, always fast).
    const dbImages = await db.select().from(productImagesTable);
    const imageMap = new Map(dbImages.map((r) => [r.sku, r.imagePath]));

    const products: NormalizedProduct[] = items.map((item) => {
      const data = item.item_data!;
      const variation = data.variations![0];
      const vData = variation.item_variation_data || {};
      const sku = vData.sku || "";
      const categoryId =
        data.reporting_category?.id || data.categories?.[0]?.id || "";
      const tracks = !!vData.track_inventory;
      const inStock = tracks
        ? (stockByVariation.get(variation.id) ?? 0) > 0
        : true;

      return {
        id: variation.id,
        sku,
        name: data.name || "Untitled",
        description: data.description || "",
        price: (vData.price_money?.amount ?? 0) / 100,
        category: categoryNames.get(categoryId) || "Other",
        inStock,
        imagePath: imageMap.get(sku) ?? null,
      };
    });

    return res.json({ products });
  } catch (err) {
    const status = err instanceof SquareError ? err.status : 500;
    if (err instanceof SquareError) {
      req.log.error({ status: err.status, body: err.body }, "Square catalog fetch failed");
    } else {
      req.log.error({ err }, "Square catalog fetch failed");
    }
    return res.status(status >= 500 ? 502 : status).json({
      error: "We couldn't load the collection right now. Please try again.",
      products: [],
    });
  }
});

// POST /api/checkout — create a Square hosted checkout (payment link).
router.post("/checkout", async (req, res) => {
  if (!getSquareToken()) {
    return res.status(503).json({ error: "Checkout is not available yet." });
  }

  const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
  const lineItems: Array<{ quantity: string; catalog_object_id: string }> = [];

  for (const item of rawItems) {
    const variationId =
      typeof item?.variationId === "string"
        ? item.variationId
        : typeof item?.id === "string"
          ? item.id
          : "";
    const qtyNum = Math.floor(Number(item?.quantity));
    if (!variationId || !Number.isFinite(qtyNum) || qtyNum < 1 || qtyNum > 999) {
      continue;
    }
    lineItems.push({ quantity: String(qtyNum), catalog_object_id: variationId });
  }

  if (lineItems.length === 0) {
    return res.status(400).json({ error: "Your cart is empty." });
  }

  const rawCode =
    typeof req.body?.discountCode === "string"
      ? req.body.discountCode.trim().toUpperCase()
      : "";
  const rawEmail =
    typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";
  if (rawCode && rawCode !== DISCOUNT_CODE) {
    return res.status(400).json({ error: "That discount code isn't valid." });
  }
  const wantsDiscount = rawCode === DISCOUNT_CODE;

  // Tracks a reserved (atomically claimed) welcome redemption so it can be rolled
  // back if anything downstream fails before a checkout link is returned.
  let discountSubscriberId: number | null = null;

  try {
    // Reject any variation ids that are not part of the live storefront catalog.
    const validIds = await getCatalogVariationIds();
    const safeLineItems = lineItems.filter((li) =>
      validIds.has(li.catalog_object_id),
    );
    if (safeLineItems.length === 0) {
      return res
        .status(400)
        .json({ error: "These items are no longer available." });
    }

    // The welcome discount is one-time and reserved for subscribers: it requires
    // the email used to claim the offer and can only be redeemed once.
    if (wantsDiscount) {
      if (!EMAIL_REGEX.test(rawEmail)) {
        return res.status(400).json({
          error: "Enter the email you subscribed with to use this code.",
        });
      }
      const [subscriber] = await db
        .select({
          id: subscribersTable.id,
          redeemedAt: subscribersTable.discountRedeemedAt,
        })
        .from(subscribersTable)
        .where(eq(subscribersTable.email, rawEmail))
        .limit(1);
      if (!subscriber) {
        return res.status(400).json({
          error:
            "This welcome code is for subscribers. Claim your offer from the welcome popup first.",
        });
      }
      if (subscriber.redeemedAt) {
        return res
          .status(400)
          .json({ error: "This welcome code has already been used." });
      }
      // Atomically claim the one-time redemption: only the request that flips
      // the still-null timestamp wins, so concurrent checkouts can't double-use.
      // Rolled back in the catch block if the checkout link can't be created.
      const reserved = await db
        .update(subscribersTable)
        .set({ discountRedeemedAt: new Date() })
        .where(
          and(
            eq(subscribersTable.id, subscriber.id),
            isNull(subscribersTable.discountRedeemedAt),
          ),
        )
        .returning({ id: subscribersTable.id });
      if (reserved.length === 0) {
        return res
          .status(400)
          .json({ error: "This welcome code has already been used." });
      }
      discountSubscriberId = subscriber.id;
    }
    const applyDiscount = discountSubscriberId !== null;

    const locationId = await getLocationId();
    const base = getRedirectBase();

    const checkoutOptions: Record<string, unknown> = {
      ask_for_shipping_address: true,
      allow_tipping: false,
    };
    if (base) {
      checkoutOptions.redirect_url = `${base}/?checkout=success`;
    }

    const idempotencyKey = `bb_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    const order: Record<string, unknown> = {
      location_id: locationId,
      line_items: safeLineItems,
    };
    if (applyDiscount) {
      order.discounts = [
        {
          uid: "welcome15",
          name: `${DISCOUNT_CODE} — ${DISCOUNT_PERCENTAGE}% off`,
          percentage: DISCOUNT_PERCENTAGE,
          scope: "ORDER",
        },
      ];
    }

    const result = await squareFetch<{ payment_link?: { url?: string } }>(
      "/v2/online-checkout/payment-links",
      {
        method: "POST",
        body: JSON.stringify({
          idempotency_key: idempotencyKey,
          order,
          checkout_options: checkoutOptions,
        }),
      },
    );

    const url = result.payment_link?.url;
    if (!url) {
      throw new SquareError("No checkout URL returned", 502, result);
    }

    return res.json({ url });
  } catch (err) {
    // Release the reserved redemption so a failed checkout doesn't burn the code.
    if (discountSubscriberId !== null) {
      try {
        await db
          .update(subscribersTable)
          .set({ discountRedeemedAt: null })
          .where(eq(subscribersTable.id, discountSubscriberId));
      } catch (rollbackErr) {
        req.log.error(
          { err: rollbackErr },
          "Failed to roll back welcome discount reservation",
        );
      }
    }
    const status = err instanceof SquareError ? err.status : 500;
    if (err instanceof SquareError) {
      req.log.error({ status: err.status, body: err.body }, "Square checkout failed");
    } else {
      req.log.error({ err }, "Square checkout failed");
    }
    return res.status(status >= 500 ? 502 : status).json({
      error: "We couldn't start checkout. Please try again.",
    });
  }
});

export default router;
