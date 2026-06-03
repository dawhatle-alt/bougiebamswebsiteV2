// Additive, idempotent seed of the ohmymahjong-inspired catalog into Square.
// Creates the TILES / MATS & RACKS / STORAGE / ACCESSORIES categories and their
// products. Existing categories (matched by name) and products (matched by SKU)
// are left untouched. Safe to re-run.
// Run with: node artifacts/api-server/scripts/seed-ohmymahjong.mjs
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

const CATEGORIES = ["TILES", "MATS & RACKS", "STORAGE", "ACCESSORIES"];

// price = cents. stock = starting inventory count. Placeholder pricing — the
// merchant can refine in Square. Photos are mapped locally by SKU in the web app.
const PRODUCTS = [
  { sku: "tiles_debutante", name: "Debutante Tile Sets", price: 29500, category: "TILES", stock: 25, description: "A refined starter set of debutante tiles, beautifully boxed and ready for your first game night." },
  { sku: "tiles_ohmyrummi", name: "Oh My Rummi", price: 4800, category: "TILES", stock: 40, description: "Our playful twist on rummy — bright, tactile tiles made for fast, social play." },
  { sku: "tiles_playingcards", name: "Playing Cards", price: 2800, category: "TILES", stock: 60, description: "Beautifully illustrated playing cards featuring our signature tile artwork." },
  { sku: "tiles_travelsets", name: "Travel Sets", price: 18500, category: "TILES", stock: 20, description: "A compact, chic mahjong set made for play on the go." },
  { sku: "tiles_intlcard", name: "International Mahjong Card", price: 1200, category: "TILES", stock: 100, description: "The official scoring card for international-style mahjong." },

  { sku: "mats_minitravel", name: "Mini Travel Mats", price: 4500, category: "MATS & RACKS", stock: 40, description: "A pocket-sized playing mat for smooth shuffling wherever the game takes you." },
  { sku: "mats_rackpushers", name: "Rack & Pushers", price: 11000, category: "MATS & RACKS", stock: 30, description: "Set of four sleek acrylic racks with integrated pushers." },
  { sku: "mats_tablecloths", name: "Tablecloths", price: 7500, category: "MATS & RACKS", stock: 25, description: "A premium tablecloth that protects your table and sets the mood for game night." },
  { sku: "mats_aquajong", name: "Aqua Jong Pool Mat", price: 6500, category: "MATS & RACKS", stock: 20, description: "A floating mat designed for mahjong by the pool." },

  { sku: "storage_zipperedbags", name: "Zippered Bags", price: 3800, category: "STORAGE", stock: 50, description: "Soft, protective zippered bags for tiles and accessories." },
  { sku: "storage_matstorage", name: "Mat Storage Bags", price: 4200, category: "STORAGE", stock: 40, description: "A tailored bag to keep your playing mat rolled and pristine." },
  { sku: "storage_acrylicboxes", name: "Acrylic Boxes", price: 5800, category: "STORAGE", stock: 30, description: "Clear acrylic boxes for elegant, organized storage." },

  { sku: "acc_babies", name: "American Mahjong for Babies", price: 2400, category: "ACCESSORIES", stock: 50, description: "A charming board book introducing little ones to the game we love." },
  { sku: "acc_cardfolios", name: "Card Folios", price: 3200, category: "ACCESSORIES", stock: 40, description: "Protective folios to keep your scoring cards crisp and organized." },
  { sku: "acc_book", name: "Mastering American Mahjong Book", price: 3500, category: "ACCESSORIES", stock: 35, description: "An in-depth guide to mastering American mahjong strategy." },
  { sku: "acc_napkins", name: "Napkins", price: 1800, category: "ACCESSORIES", stock: 80, description: "Custom cocktail napkins to dress up your table." },
];

function uid(p) {
  return `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function listAll(type) {
  const out = [];
  let cursor = "";
  do {
    const qs = cursor ? `&cursor=${encodeURIComponent(cursor)}` : "";
    const page = await sq(`/v2/catalog/list?types=${type}${qs}`);
    out.push(...(page.objects || []));
    cursor = page.cursor || "";
  } while (cursor);
  return out;
}

async function main() {
  const loc = await sq("/v2/locations");
  const location =
    (loc.locations || []).find((l) => l.status === "ACTIVE") ||
    (loc.locations || [])[0];
  if (!location) throw new Error("No Square location found");
  const locationId = location.id;
  const currency = location.currency || "USD";
  console.log("Location:", location.name, locationId, currency);

  // Existing categories by name -> real id.
  const existingCats = await listAll("CATEGORY");
  const catIdByName = new Map();
  for (const c of existingCats) {
    if (c.type === "CATEGORY" && c.category_data?.name) {
      catIdByName.set(c.category_data.name, c.id);
    }
  }

  // Existing SKUs so we never duplicate a product.
  const existingItems = await listAll("ITEM");
  const existingSkus = new Set();
  for (const item of existingItems) {
    for (const v of item.item_data?.variations || []) {
      const sku = v.item_variation_data?.sku;
      if (sku) existingSkus.add(sku);
    }
  }

  const objects = [];
  const catRef = {}; // category name -> id (real or temp #)

  for (const name of CATEGORIES) {
    if (catIdByName.has(name)) {
      catRef[name] = catIdByName.get(name);
      console.log(`Category exists, reusing: ${name}`);
    } else {
      const tempId = `#cat_${name.replace(/[^a-z0-9]/gi, "_")}`;
      catRef[name] = tempId;
      objects.push({ type: "CATEGORY", id: tempId, category_data: { name } });
      console.log(`Will create category: ${name}`);
    }
  }

  const toStock = [];
  for (const p of PRODUCTS) {
    if (existingSkus.has(p.sku)) {
      console.log(`Product exists, skipping: ${p.sku} (${p.name})`);
      continue;
    }
    const itemTempId = `#item_${p.sku}`;
    const varTempId = `#var_${p.sku}`;
    objects.push({
      type: "ITEM",
      id: itemTempId,
      item_data: {
        name: p.name,
        description: p.description,
        categories: [{ id: catRef[p.category] }],
        reporting_category: { id: catRef[p.category] },
        variations: [
          {
            type: "ITEM_VARIATION",
            id: varTempId,
            item_variation_data: {
              item_id: itemTempId,
              name: "Regular",
              sku: p.sku,
              pricing_type: "FIXED_PRICING",
              price_money: { amount: p.price, currency },
              track_inventory: true,
              location_overrides: [
                { location_id: locationId, track_inventory: true },
              ],
            },
          },
        ],
      },
    });
    toStock.push(p);
  }

  const newItems = objects.filter((o) => o.type === "ITEM").length;
  const newCats = objects.filter((o) => o.type === "CATEGORY").length;
  if (objects.length === 0) {
    console.log("Nothing to create — everything already exists.");
    return;
  }

  const upsert = await sq("/v2/catalog/batch-upsert", {
    method: "POST",
    body: JSON.stringify({
      idempotency_key: uid("upsert"),
      batches: [{ objects }],
    }),
  });

  const mappings = upsert.id_mappings || [];
  const realId = (tempId) => {
    const m = mappings.find((x) => x.client_object_id === tempId);
    return m ? m.object_id : null;
  };

  console.log(`Created ${newCats} categories and ${newItems} products.`);

  const now = new Date().toISOString();
  const changes = [];
  for (const p of toStock) {
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
      body: JSON.stringify({ idempotency_key: uid("inv"), changes }),
    });
    console.log(`Set inventory for ${changes.length} variations.`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
