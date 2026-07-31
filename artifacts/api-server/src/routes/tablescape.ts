import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import { and, desc, eq, gte, inArray, isNotNull } from "drizzle-orm";
import { db, productsTable, tablescapeGenerationsTable } from "@workspace/db";
import { requireAdmin } from "../middleware/auth";
import { logger } from "../lib/logger";
import { tableExists } from "../lib/dbBootstrap";
import { readSetting, writeSetting } from "../lib/siteSettings";
import { ObjectStorageService, getPublicStorageUrl } from "../lib/objectStorage";
import {
  composeTablescape,
  sniffImageMime,
  TablescapeGenerationError,
  type ReferenceImage,
} from "../lib/tablescapeImage";

const router: IRouter = Router();
const objectStorage = new ObjectStorageService();

// The positions a shopper fills in. Mat and tiles are required — they carry the
// look of the whole table, and the AI needs both to compose anything useful.
// This list is the single source of truth; the builder page renders from it.
export const TABLESCAPE_SLOTS = [
  { slot: "mat", label: "Mat", description: "The statement piece your table is built around.", required: true },
  { slot: "tiles", label: "Tiles", description: "The set you'll play with.", required: true },
  { slot: "rack", label: "Racks", description: "Racks and pushers for each player.", required: false },
  { slot: "brags", label: "Brags", description: "Brags to show off your hand.", required: false },
  { slot: "brag_dish", label: "Brag Dish", description: "Where the brags live between hands.", required: false },
  { slot: "accessory", label: "Accessories", description: "The finishing touches.", required: false },
] as const;

const SLOT_IDS = TABLESCAPE_SLOTS.map((s) => s.slot) as string[];
const REQUIRED_SLOTS = TABLESCAPE_SLOTS.filter((s) => s.required).map((s) => s.slot);

// Products in this category stage in a swimming pool instead of on a table.
// Must match SHOP_CATEGORIES in artifacts/bougiebams/src/data/categories.ts.
const FLOATING_CATEGORY = "Floating Mahjong";

const SETTINGS_KEY = "tablescape";
const DEFAULTS = { enabled: false, guestLimit: 3, memberLimit: 20 };

interface TablescapeSettings {
  /** Hides the builder everywhere until the owner turns it on. */
  enabled: boolean;
  /** Free generations per browser per day before we ask for a sign-in. */
  guestLimit: number;
  /** Daily ceiling for signed-in shoppers — every image costs real credit. */
  memberLimit: number;
}

async function readSettings(): Promise<TablescapeSettings> {
  const raw = await readSetting(SETTINGS_KEY);
  if (!raw) return { ...DEFAULTS };
  try {
    const parsed = JSON.parse(raw) as Partial<TablescapeSettings>;
    return {
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : DEFAULTS.enabled,
      guestLimit: Number.isFinite(parsed.guestLimit) ? Number(parsed.guestLimit) : DEFAULTS.guestLimit,
      memberLimit: Number.isFinite(parsed.memberLimit) ? Number(parsed.memberLimit) : DEFAULTS.memberLimit,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

// Same lazy-create contract as site_settings: check the catalog first, and skip
// all DDL once the table is there.
let generationsTableReady: Promise<void> | null = null;

function ensureGenerationsTable(): Promise<void> {
  if (!generationsTableReady) {
    generationsTableReady = tableExists("tablescape_generations")
      .then(async (exists) => {
        if (exists) return;
        const { sql } = await import("drizzle-orm");
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS tablescape_generations (
            id text PRIMARY KEY,
            visitor_id text NOT NULL,
            shopper_id text,
            selections jsonb NOT NULL,
            image_path text NOT NULL,
            provider text NOT NULL,
            model text NOT NULL,
            duration_ms integer,
            created_at timestamptz NOT NULL DEFAULT now()
          )
        `);
        await db.execute(
          sql`CREATE INDEX IF NOT EXISTS tablescape_generations_visitor_created_idx ON tablescape_generations (visitor_id, created_at)`,
        );
        await db.execute(sql`ALTER TABLE tablescape_generations ENABLE ROW LEVEL SECURITY`);
      })
      .catch((err) => {
        generationsTableReady = null;
        throw err;
      });
  }
  return generationsTableReady;
}

function storageUrl(imagePath: string): string {
  return imagePath.startsWith("http") ? imagePath : `/api/storage${imagePath}`;
}

// Public: what the builder needs to render itself.
router.get("/tablescape/config", async (_req, res): Promise<void> => {
  try {
    res.setHeader("Cache-Control", "no-store");
    const settings = await readSettings();
    res.json({
      enabled: settings.enabled,
      guestLimit: settings.guestLimit,
      memberLimit: settings.memberLimit,
      slots: TABLESCAPE_SLOTS,
    });
  } catch (err) {
    logger.error({ err }, "Failed to read tablescape config");
    // Fail closed: a broken settings read shouldn't expose a half-built feature.
    res.json({ enabled: false, guestLimit: DEFAULTS.guestLimit, memberLimit: DEFAULTS.memberLimit, slots: TABLESCAPE_SLOTS });
  }
});

// Public: in-stock, published products grouped by the slot they fill.
router.get("/tablescape/products", async (_req, res): Promise<void> => {
  try {
    const settings = await readSettings();
    if (!settings.enabled) {
      res.status(404).json({ error: "The tablescape builder is not available." });
      return;
    }
    const rows = await db
      .select()
      .from(productsTable)
      .where(and(eq(productsTable.published, true), isNotNull(productsTable.tablescapeSlot)))
      .orderBy(productsTable.createdAt);

    const groups = TABLESCAPE_SLOTS.map((slot) => ({
      ...slot,
      products: rows
        .filter((r) => r.tablescapeSlot === slot.slot && r.inStock)
        .map((r) => ({
          id: r.id,
          name: r.name,
          price: Number(r.price),
          imageUrl: r.imagePath ? storageUrl(r.imagePath) : null,
        })),
    })).filter((g) => g.products.length > 0);

    res.json({ slots: groups });
  } catch (err) {
    logger.error({ err }, "Failed to list tablescape products");
    res.status(500).json({ error: "Could not load the builder." });
  }
});

/** Downloads a product photo to hand the model as a reference. */
async function fetchReference(
  imagePath: string,
  slot: string,
  label: string,
  floating: boolean,
): Promise<ReferenceImage> {
  const { path: filePath } = await objectStorage.getObjectEntityFile(imagePath);
  // Ask Supabase's image CDN for a 1024px variant: the originals run several MB
  // and the upload time counts against the function's ceiling.
  const publicUrl = getPublicStorageUrl(filePath);
  const resized = `${publicUrl.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/")}?width=1024&height=1024&resize=contain&quality=80`;
  let response = await fetch(resized, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) {
    // Render CDN is a paid Supabase add-on on some plans — fall back to the original.
    response = await fetch(publicUrl, { signal: AbortSignal.timeout(15_000) });
  }
  if (!response.ok) {
    throw new TablescapeGenerationError(`Could not load the photo for ${label}.`, 502);
  }
  const data = Buffer.from(await response.arrayBuffer());
  return { slot, label, data, mimeType: sniffImageMime(data), floating };
}

// Public: compose one tablescape image from the shopper's selections.
router.post("/tablescape/generate", async (req, res): Promise<void> => {
  const startedAt = Date.now();
  try {
    const settings = await readSettings();
    if (!settings.enabled) {
      res.status(404).json({ error: "The tablescape builder is not available." });
      return;
    }

    const body = req.body as { selections?: unknown; visitorId?: unknown };
    const visitorId = typeof body.visitorId === "string" ? body.visitorId.trim().slice(0, 64) : "";
    if (!visitorId) {
      res.status(400).json({ error: "visitorId is required" });
      return;
    }

    const rawSelections = body.selections;
    if (!rawSelections || typeof rawSelections !== "object" || Array.isArray(rawSelections)) {
      res.status(400).json({ error: "selections must be an object of slot → product id" });
      return;
    }
    const selections: Record<string, string> = {};
    for (const [slot, productId] of Object.entries(rawSelections as Record<string, unknown>)) {
      if (!SLOT_IDS.includes(slot) || typeof productId !== "string" || !productId) continue;
      selections[slot] = productId;
    }
    const missing = REQUIRED_SLOTS.filter((s) => !selections[s]);
    if (missing.length > 0) {
      res.status(400).json({
        error: `Choose a ${missing.map((m) => (m === "mat" ? "mat" : "tile set")).join(" and a ")} to build your table.`,
      });
      return;
    }

    await ensureGenerationsTable();

    // Rate limit on successful generations only, so a failed attempt never
    // costs the shopper one of their tries.
    const shopperId = req.shopperUser?.sub ?? null;
    const limit = shopperId ? settings.memberLimit : settings.guestLimit;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await db
      .select({ id: tablescapeGenerationsTable.id })
      .from(tablescapeGenerationsTable)
      .where(
        and(
          eq(tablescapeGenerationsTable.visitorId, visitorId),
          gte(tablescapeGenerationsTable.createdAt, since),
        ),
      );
    if (recent.length >= limit) {
      res.status(429).json({
        error: shopperId
          ? "You've reached today's limit for new tablescapes. Please try again tomorrow."
          : "You've used your free tablescapes for today. Sign in to create more.",
        requiresSignIn: !shopperId,
        remaining: 0,
      });
      return;
    }

    const ids = Object.values(selections);
    const rows = await db
      .select()
      .from(productsTable)
      .where(and(inArray(productsTable.id, ids), eq(productsTable.published, true)));
    const byId = new Map(rows.map((r) => [r.id, r]));

    const refs: ReferenceImage[] = [];
    // Keep the model's inputs in slot order — mat first, then tiles — so the
    // prompt's references line up with the images it receives.
    const ordered = TABLESCAPE_SLOTS.filter((s) => selections[s.slot]);
    for (const slotDef of ordered) {
      const product = byId.get(selections[slotDef.slot]);
      if (!product || product.tablescapeSlot !== slotDef.slot) {
        res.status(400).json({ error: "One of those products is no longer available." });
        return;
      }
      const imagePath = product.tablescapeImagePath ?? product.imagePath;
      if (!imagePath) {
        res.status(400).json({ error: `${product.name} has no photo to work from.` });
        return;
      }
      refs.push(
        await fetchReference(imagePath, slotDef.slot, product.name, product.category === FLOATING_CATEGORY),
      );
    }

    const composed = await composeTablescape(refs);
    const storedPath = await objectStorage.uploadBuffer(composed.buffer, composed.mimeType, "tablescapes");

    const id = randomUUID();
    await db.insert(tablescapeGenerationsTable).values({
      id,
      visitorId,
      shopperId,
      selections,
      imagePath: storedPath,
      provider: composed.provider,
      model: composed.model,
      durationMs: composed.durationMs,
    });

    logger.info(
      { id, slots: Object.keys(selections), durationMs: composed.durationMs, totalMs: Date.now() - startedAt },
      "Tablescape generated",
    );

    res.json({
      id,
      imageUrl: storageUrl(storedPath),
      remaining: Math.max(0, limit - recent.length - 1),
    });
  } catch (err) {
    if (err instanceof TablescapeGenerationError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    logger.error({ err }, "Tablescape generation failed");
    res.status(500).json({ error: "Something went wrong building your tablescape. Please try again." });
  }
});

// --- Admin ------------------------------------------------------------------

router.get("/admin/tablescape/settings", requireAdmin, async (_req, res): Promise<void> => {
  try {
    res.json({ ...(await readSettings()), slots: TABLESCAPE_SLOTS });
  } catch (err) {
    logger.error({ err }, "Failed to read tablescape settings");
    res.status(500).json({ error: "Could not load the tablescape settings." });
  }
});

router.put("/admin/tablescape/settings", requireAdmin, async (req, res): Promise<void> => {
  const body = req.body as { enabled?: unknown; guestLimit?: unknown; memberLimit?: unknown };
  const current = await readSettings();
  const next: TablescapeSettings = {
    enabled: typeof body.enabled === "boolean" ? body.enabled : current.enabled,
    guestLimit: Number.isFinite(Number(body.guestLimit))
      ? Math.min(50, Math.max(0, Math.floor(Number(body.guestLimit))))
      : current.guestLimit,
    memberLimit: Number.isFinite(Number(body.memberLimit))
      ? Math.min(200, Math.max(0, Math.floor(Number(body.memberLimit))))
      : current.memberLimit,
  };
  try {
    await writeSetting(SETTINGS_KEY, JSON.stringify(next));
    res.json(next);
  } catch (err) {
    logger.error({ err }, "Failed to save tablescape settings");
    res.status(500).json({ error: "Could not save the tablescape settings." });
  }
});

// Every product plus its slot, for the admin's tagging screen.
router.get("/admin/tablescape/products", requireAdmin, async (_req, res): Promise<void> => {
  try {
    const rows = await db.select().from(productsTable).orderBy(productsTable.category, productsTable.name);
    res.json({
      products: rows.map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        published: r.published,
        inStock: r.inStock,
        imageUrl: r.imagePath ? storageUrl(r.imagePath) : null,
        tablescapeSlot: r.tablescapeSlot ?? null,
        tablescapeImagePath: r.tablescapeImagePath ?? null,
      })),
      slots: TABLESCAPE_SLOTS,
    });
  } catch (err) {
    logger.error({ err }, "Failed to list products for tablescape admin");
    res.status(500).json({ error: "Could not load products." });
  }
});

router.put("/admin/tablescape/products/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const body = req.body as { tablescapeSlot?: unknown; tablescapeImagePath?: unknown };
  const update: Record<string, unknown> = {};

  if ("tablescapeSlot" in body) {
    const slot = body.tablescapeSlot;
    if (slot !== null && (typeof slot !== "string" || !SLOT_IDS.includes(slot))) {
      res.status(400).json({ error: "Unknown tablescape slot" });
      return;
    }
    update.tablescapeSlot = slot;
  }
  if ("tablescapeImagePath" in body) {
    const p = body.tablescapeImagePath;
    if (p !== null && typeof p !== "string") {
      res.status(400).json({ error: "tablescapeImagePath must be a path or null" });
      return;
    }
    update.tablescapeImagePath = p;
  }
  if (Object.keys(update).length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }

  try {
    const [row] = await db.update(productsTable).set(update).where(eq(productsTable.id, id)).returning();
    if (!row) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json({
      product: {
        id: row.id,
        name: row.name,
        tablescapeSlot: row.tablescapeSlot ?? null,
        tablescapeImagePath: row.tablescapeImagePath ?? null,
      },
    });
  } catch (err) {
    logger.error({ err, id }, "Failed to update tablescape slot");
    res.status(500).json({ error: "Could not save that change." });
  }
});

// Recent generations — what shoppers are pairing, and what it's costing.
router.get("/admin/tablescape/generations", requireAdmin, async (_req, res): Promise<void> => {
  try {
    await ensureGenerationsTable();
    const rows = await db
      .select()
      .from(tablescapeGenerationsTable)
      .orderBy(desc(tablescapeGenerationsTable.createdAt))
      .limit(60);
    res.json({
      generations: rows.map((r) => ({
        id: r.id,
        imageUrl: storageUrl(r.imagePath),
        selections: r.selections,
        model: r.model,
        durationMs: r.durationMs,
        signedIn: Boolean(r.shopperId),
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    logger.error({ err }, "Failed to list tablescape generations");
    res.status(500).json({ error: "Could not load generations." });
  }
});

export default router;
