// One-time (idempotent) sync of BougieBams products into the Square catalog.
// Run with: node artifacts/api-server/scripts/sync-square-catalog.mjs
// Requires SQUARE_ACCESS_TOKEN in the environment.

const TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const BASE = "https://connect.squareup.com";
const VERSION = "2025-04-16";

if (!TOKEN) {
  console.error("Missing SQUARE_ACCESS_TOKEN");
  process.exit(1);
}

async function sq(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Square-Version": VERSION,
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${path} -> ${res.status} ${JSON.stringify(json)}`);
  }
  return json;
}

const CATEGORIES = [
  "Complete Sets",
  "Tiles & Accessories",
  "Gift Sets",
  "Apparel & Lifestyle",
];

// Canonical product list. price = cents. stock = starting inventory count.
const PRODUCTS = [
  { sku: "prod_1", name: "The Jade Collection", price: 35000, category: "Complete Sets", stock: 25, description: "Our signature jade green mahjong set with custom gold engraving. Elevate your game night with tiles that look as good as they play. Includes 166 tiles, custom dice, and a luxury velvet carrying case." },
  { sku: "prod_2", name: "The Rose Gold Edition", price: 32500, category: "Complete Sets", stock: 25, description: "A stunning blush and rose gold set that catches the light beautifully. Perfect for the modern player who loves a touch of warmth." },
  { sku: "prod_3", name: "Classic Ivory & Navy", price: 29500, category: "Complete Sets", stock: 25, description: "Timeless sophistication. Crisp ivory tiles with deep navy and gold detailing. The perfect set for the purist." },
  { sku: "prod_4", name: "Blush Playing Mat", price: 8500, category: "Tiles & Accessories", stock: 40, description: "A premium neoprene playing mat in our signature blush color with gold stitched edging. Provides the perfect surface for smooth tile shuffling." },
  { sku: "prod_5", name: "Gold Foil Playing Cards", price: 3500, category: "Tiles & Accessories", stock: 40, description: "For when you want the mahjong aesthetic in a portable format. Beautifully illustrated cards featuring our tile designs." },
  { sku: "prod_6", name: "The Hostess Gift Set", price: 15000, category: "Gift Sets", stock: 30, description: "The perfect gift for your mahjong group host. Includes custom cocktail napkins, a set of luxury score cards, and our signature gold pen." },
  { sku: "prod_7", name: "Midnight Blue Racks", price: 11000, category: "Tiles & Accessories", stock: 30, description: "Set of 4 deep navy acrylic racks with integrated pushers. A sleek upgrade to standard plastic racks." },
  { sku: "prod_8", name: "BougieBams Silk Scarf", price: 6500, category: "Apparel & Lifestyle", stock: 20, description: "A 100% silk scarf featuring a custom print of our most iconic tile designs. Wear it, frame it, or tie it to your mahjong bag." },
  { sku: "prod_9", name: "The Beginner's Bundle", price: 39500, category: "Gift Sets", stock: 25, description: "Everything you need to start playing in style. Includes the Classic Ivory Set, a playing mat, and our beautifully illustrated rulebook." },
  { sku: "prod_10", name: "Champagne Coin Set", price: 4500, category: "Tiles & Accessories", stock: 40, description: "A set of heavy, metal coins in a champagne gold finish for keeping score in style." },
  { sku: "prod_11", name: "Embroidered Crewneck", price: 9500, category: "Apparel & Lifestyle", stock: 25, description: "A cozy, premium cotton crewneck subtly embroidered with a single gold Bam tile." },
  { sku: "prod_12", name: "Travel Mahjong Set", price: 18500, category: "Complete Sets", stock: 0, description: "A beautifully compact set for the player on the go. Smaller tiles in a chic vegan leather zip case." },
];

function uid(p) {
  return `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function main() {
  // Resolve active location.
  const loc = await sq("/v2/locations");
  const location = (loc.locations || []).find((l) => l.status === "ACTIVE") || (loc.locations || [])[0];
  if (!location) throw new Error("No Square location found");
  const locationId = location.id;
  console.log("Location:", location.name, locationId);

  // Guard: don't duplicate if items already exist.
  const existing = await sq("/v2/catalog/list?types=ITEM");
  if ((existing.objects || []).length > 0) {
    console.log(`Catalog already has ${existing.objects.length} items. Aborting to avoid duplicates.`);
    console.log("Delete existing items in Square first if you want a clean re-sync.");
    return;
  }

  // Build batch upsert: categories + items.
  const catTempIds = {};
  const objects = [];

  for (const name of CATEGORIES) {
    const tempId = `#cat_${name.replace(/[^a-z0-9]/gi, "_")}`;
    catTempIds[name] = tempId;
    objects.push({
      type: "CATEGORY",
      id: tempId,
      category_data: { name },
    });
  }

  for (const p of PRODUCTS) {
    const itemTempId = `#item_${p.sku}`;
    const varTempId = `#var_${p.sku}`;
    objects.push({
      type: "ITEM",
      id: itemTempId,
      item_data: {
        name: p.name,
        description: p.description,
        categories: [{ id: catTempIds[p.category] }],
        reporting_category: { id: catTempIds[p.category] },
        variations: [
          {
            type: "ITEM_VARIATION",
            id: varTempId,
            item_variation_data: {
              item_id: itemTempId,
              name: "Regular",
              sku: p.sku,
              pricing_type: "FIXED_PRICING",
              price_money: { amount: p.price, currency: "USD" },
              track_inventory: true,
              location_overrides: [
                { location_id: locationId, track_inventory: true },
              ],
            },
          },
        ],
      },
    });
  }

  const upsert = await sq("/v2/catalog/batch-upsert", {
    method: "POST",
    body: JSON.stringify({
      idempotency_key: uid("upsert"),
      batches: [{ objects }],
    }),
  });

  // Map temp ids -> real ids.
  const mappings = upsert.id_mappings || [];
  const realId = (tempId) => {
    const m = mappings.find((x) => x.client_object_id === tempId);
    return m ? m.object_id : null;
  };

  console.log(`Upserted ${(upsert.objects || []).length} objects.`);

  // Set inventory counts per variation.
  const now = new Date().toISOString();
  const changes = [];
  for (const p of PRODUCTS) {
    const variationId = realId(`#var_${p.sku}`);
    if (!variationId) {
      console.warn(`No real id for ${p.sku}`);
      continue;
    }
    changes.push({
      type: "PHYSICAL_COUNT",
      physical_count: {
        catalog_object_id: variationId,
        location_id: locationId,
        quantity: String(p.stock),
        state: "IN_STOCK",
        occurred_at: now,
      },
    });
  }

  if (changes.length) {
    await sq("/v2/inventory/changes/batch-create", {
      method: "POST",
      body: JSON.stringify({
        idempotency_key: uid("inv"),
        changes,
      }),
    });
    console.log(`Set inventory for ${changes.length} variations.`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
