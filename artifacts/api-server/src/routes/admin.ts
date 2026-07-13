import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { count, eq, sql, inArray, asc, desc } from "drizzle-orm";
import path from "path";
import fs from "fs";
import { ObjectStorageService } from "../lib/objectStorage";
import {
  db,
  eventsTable,
  productsTable,
  blogPostsTable,
  subscribersTable,
  productImagesTable,
  registrationsTable,
  heroImagesTable,
  discountCodesTable,
  siteSettingsTable,
} from "@workspace/db";
import { GetAdminStatsResponse } from "@workspace/api-zod";
import { requireAdmin } from "../middleware/auth";
import { logger } from "../lib/logger";
import { tableExists } from "../lib/dbBootstrap";
import { listOrders, syncOrdersFromSquare } from "../lib/orders";
import { sendCheckinReportEmail } from "../lib/email";
import { listRedemptions, deleteRedemption } from "../lib/discounts";
import { getSquareClient, getSquareLocationId, isSquareLocationConfigured } from "../lib/square";

const router: IRouter = Router();

// --- Site settings (announcement bar) ---------------------------------------
// Migrations here are applied manually (drizzle-kit push), which doesn't run on
// deploy, so lazily create the table on first use. CREATE TABLE IF NOT EXISTS is
// idempotent and safe to run per serverless instance.
const ANNOUNCEMENT_DEFAULT_TEXT = "Complimentary shipping on all orders over $150";
let settingsTableReady: Promise<void> | null = null;

function ensureSettingsTable(): Promise<void> {
  if (!settingsTableReady) {
    // Check the catalog first — DDL (even no-op ALTERs) takes exclusive locks
    // that queue behind live traffic when run on every cold start.
    settingsTableReady = tableExists("site_settings")
      .then(async (exists) => {
        if (exists) return;
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS site_settings (
            key text PRIMARY KEY,
            value text,
            updated_at timestamptz NOT NULL DEFAULT now()
          )
        `);
        // Deny-all via Supabase's public REST API; the server's direct Postgres
        // connection is the table owner and is unaffected.
        await db.execute(sql`ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY`);
      })
      .catch((err) => {
        settingsTableReady = null;
        throw err;
      });
  }
  return settingsTableReady;
}

async function readAnnouncement(): Promise<{ enabled: boolean; text: string }> {
  await ensureSettingsTable();
  const rows = await db
    .select()
    .from(siteSettingsTable)
    .where(inArray(siteSettingsTable.key, ["announcement_enabled", "announcement_text"]));
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const enabledRaw = map.get("announcement_enabled");
  return {
    // Default ON with the original copy so behavior is unchanged until edited.
    enabled: enabledRaw == null ? true : enabledRaw === "true",
    text: map.get("announcement_text") ?? ANNOUNCEMENT_DEFAULT_TEXT,
  };
}

async function readChatbotEnabled(): Promise<boolean> {
  await ensureSettingsTable();
  const rows = await db
    .select()
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, "chatbot_enabled"));
  const val = rows[0]?.value;
  // Default ON so the assistant stays available unless explicitly disabled.
  return val == null ? true : val === "true";
}

async function readBuildYourSetEnabled(): Promise<boolean> {
  await ensureSettingsTable();
  const rows = await db
    .select()
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, "build_your_set_enabled"));
  const val = rows[0]?.value;
  // Default ON so the experience stays available unless explicitly disabled.
  return val == null ? true : val === "true";
}

interface CuratedItem {
  title: string;
  imagePath: string;
  linkPath: string;
}

async function readCuratedCollections(): Promise<CuratedItem[]> {
  await ensureSettingsTable();
  const rows = await db
    .select()
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, "curated_collections"));
  const raw = rows[0]?.value;
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((x) => {
      if (!x || typeof x !== "object") return [];
      const o = x as Record<string, unknown>;
      return [{
        title: typeof o.title === "string" ? o.title : "",
        imagePath: typeof o.imagePath === "string" ? o.imagePath : "",
        linkPath: typeof o.linkPath === "string" ? o.linkPath : "",
      }];
    });
  } catch {
    return [];
  }
}

// Resolve stored objectPaths to servable URLs (same convention as the gallery).
function curatedToApi(items: CuratedItem[]) {
  return items.map((i) => ({
    title: i.title,
    imagePath: i.imagePath,
    imageUrl: i.imagePath ? `/api/storage${i.imagePath}` : "",
    linkPath: i.linkPath,
  }));
}

async function writeSetting(key: string, value: string): Promise<void> {
  await ensureSettingsTable();
  await db
    .insert(siteSettingsTable)
    .values({ key, value })
    .onConflictDoUpdate({ target: siteSettingsTable.key, set: { value, updatedAt: new Date() } });
}

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();
const uploadsDir = path.resolve(workspaceRoot, "artifacts/api-server/uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80) +
    "-" +
    Date.now().toString(36)
  );
}


function toApiPost(row: typeof blogPostsTable.$inferSelect) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    category: row.category,
    author: row.author,
    imagePath: row.imagePath ?? null,
    published: row.published,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toApiEvent(row: typeof eventsTable.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    date: row.date,
    time: row.time,
    location: row.location,
    priceCents: row.priceCents ?? null,
    category: row.category,
    imagePath: row.imagePath ?? null,
    totalSpots: row.totalSpots,
    spotsLeft: row.spotsLeft,
    host: row.host,
    published: row.published,
    archived: row.archived,
    reminderHoursBefore: row.reminderHoursBefore ?? null,
    externalRegistrationUrl: row.externalRegistrationUrl ?? null,
    collectRegistrationDetails: row.collectRegistrationDetails,
    compCode: row.compCode ?? null,
  };
}


router.get("/admin/stats", requireAdmin, async (_req, res): Promise<void> => {
  const [subRow] = await db.select({ count: count() }).from(subscribersTable);
  const [evtRow] = await db.select({ count: count() }).from(eventsTable);
  const [prodRow] = await db.select({ count: count() }).from(productsTable);
  const [blogRow] = await db.select({ count: count() }).from(blogPostsTable);
  res.json(
    GetAdminStatsResponse.parse({
      totalSubscribers: Number(subRow?.count ?? 0),
      totalEvents: Number(evtRow?.count ?? 0),
      totalProducts: Number(prodRow?.count ?? 0),
      totalBlogPosts: Number(blogRow?.count ?? 0),
    }),
  );
});

router.get("/admin/subscribers", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(subscribersTable).orderBy(subscribersTable.createdAt);
  res.json({
    subscribers: rows.map((s) => ({
      id: s.id,
      email: s.email,
      source: s.source ?? null,
      discountCode: s.discountCode ?? null,
      createdAt: s.createdAt.toISOString(),
    })),
  });
});

router.get("/admin/blog", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(blogPostsTable).orderBy(blogPostsTable.createdAt);
  res.json({ posts: rows.map(toApiPost) });
});

router.post("/admin/blog", requireAdmin, async (req, res): Promise<void> => {
  const b = req.body as Record<string, unknown>;
  if (!b.title || typeof b.title !== "string") {
    res.status(400).json({ error: "title is required" });
    return;
  }
  const [row] = await db
    .insert(blogPostsTable)
    .values({
      slug: slugify(b.title),
      title: b.title,
      excerpt: typeof b.excerpt === "string" ? b.excerpt : "",
      content: typeof b.content === "string" ? b.content : "",
      category: typeof b.category === "string" ? b.category : "Style",
      author: typeof b.author === "string" ? b.author : "BougieBams",
      published: b.published === true,
      imagePath: typeof b.imagePath === "string" ? b.imagePath : null,
    })
    .returning();
  res.status(201).json({ post: toApiPost(row) });
});

router.put("/admin/blog/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const b = req.body as Record<string, unknown>;
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (b.title !== undefined) updateData.title = b.title;
  if (b.excerpt !== undefined) updateData.excerpt = b.excerpt;
  if (b.content !== undefined) updateData.content = b.content;
  if (b.category !== undefined) updateData.category = b.category;
  if (b.author !== undefined) updateData.author = b.author;
  if (b.published !== undefined) updateData.published = b.published;
  if (b.imagePath !== undefined) updateData.imagePath = b.imagePath;
  const [row] = await db
    .update(blogPostsTable)
    .set(updateData)
    .where(eq(blogPostsTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  res.json({ post: toApiPost(row) });
});

router.delete("/admin/blog/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db.delete(blogPostsTable).where(eq(blogPostsTable.id, id)).returning();
  if (!row) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/admin/events", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(eventsTable).orderBy(eventsTable.createdAt);
  res.json({ events: rows.map(toApiEvent) });
});

router.post("/admin/events", requireAdmin, async (req, res): Promise<void> => {
  const b = req.body as Record<string, unknown>;
  if (!b.title || !b.date) {
    res.status(400).json({ error: "title and date are required" });
    return;
  }
  const [row] = await db
    .insert(eventsTable)
    .values({
      title: b.title as string,
      description: (b.description as string) ?? "",
      date: b.date as string,
      time: (b.time as string) ?? "",
      location: (b.location as string) ?? "",
      priceCents: b.priceCents != null ? Number(b.priceCents) : null,
      category: (b.category as string) ?? "In-Person",
      imagePath: (b.imagePath as string | null) ?? null,
      totalSpots: Number(b.totalSpots) || 0,
      spotsLeft: Number(b.spotsLeft) || 0,
      host: (b.host as string) ?? "BougieBams",
      published: b.published === true,
      reminderHoursBefore: b.reminderHoursBefore != null ? Number(b.reminderHoursBefore) : null,
      externalRegistrationUrl: typeof b.externalRegistrationUrl === "string" && b.externalRegistrationUrl.trim() ? b.externalRegistrationUrl.trim() : null,
      collectRegistrationDetails: b.collectRegistrationDetails === true,
      compCode: typeof b.compCode === "string" && b.compCode.trim() ? b.compCode.trim() : null,
    })
    .returning();
  res.status(201).json({ event: toApiEvent(row) });
});

router.put("/admin/events/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const b = req.body as Record<string, unknown>;
  const updateData: Record<string, unknown> = {};
  if (b.title !== undefined) updateData.title = b.title;
  if (b.description !== undefined) updateData.description = b.description;
  if (b.date !== undefined) updateData.date = b.date;
  if (b.time !== undefined) updateData.time = b.time;
  if (b.location !== undefined) updateData.location = b.location;
  if ("priceCents" in b) updateData.priceCents = b.priceCents != null ? Number(b.priceCents) : null;
  if (b.category !== undefined) updateData.category = b.category;
  if (b.imagePath !== undefined) updateData.imagePath = b.imagePath;
  if (b.totalSpots !== undefined) updateData.totalSpots = Number(b.totalSpots);
  if (b.spotsLeft !== undefined) updateData.spotsLeft = Number(b.spotsLeft);
  if (b.host !== undefined) updateData.host = b.host;
  if (b.published !== undefined) updateData.published = b.published;
  if (b.archived !== undefined) updateData.archived = b.archived === true;
  if ("reminderHoursBefore" in b) updateData.reminderHoursBefore = b.reminderHoursBefore != null ? Number(b.reminderHoursBefore) : null;
  if ("externalRegistrationUrl" in b) updateData.externalRegistrationUrl = typeof b.externalRegistrationUrl === "string" && b.externalRegistrationUrl.trim() ? b.externalRegistrationUrl.trim() : null;
  if ("collectRegistrationDetails" in b) updateData.collectRegistrationDetails = b.collectRegistrationDetails === true;
  if ("compCode" in b) updateData.compCode = typeof b.compCode === "string" && b.compCode.trim() ? b.compCode.trim() : null;
  const [row] = await db
    .update(eventsTable)
    .set(updateData)
    .where(eq(eventsTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  res.json({ event: toApiEvent(row) });
});

router.delete("/admin/events/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db.delete(eventsTable).where(eq(eventsTable.id, id)).returning();
  if (!row) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/hero-images", async (_req, res): Promise<void> => {
  const rows = await db.select().from(heroImagesTable).orderBy(heroImagesTable.position);
  // Admin changes must show up on the very next page load — never cache the list.
  res.setHeader("Cache-Control", "no-store");
  res.json({ images: rows.map((r) => ({ id: r.id, objectPath: r.objectPath, position: r.position })) });
});

router.get("/admin/hero-images", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(heroImagesTable).orderBy(heroImagesTable.position);
  res.json({ images: rows.map((r) => ({ id: r.id, objectPath: r.objectPath, position: r.position })) });
});

router.post("/admin/hero-images", requireAdmin, async (req, res): Promise<void> => {
  const { objectPath, position } = req.body as { objectPath?: string; position?: number };
  if (!objectPath) { res.status(400).json({ error: "objectPath is required" }); return; }
  const [row] = await db
    .insert(heroImagesTable)
    .values({ objectPath, position: position ?? 0 })
    .returning();
  res.status(201).json({ image: { id: row.id, objectPath: row.objectPath, position: row.position } });
});

router.put("/admin/hero-images/reorder", requireAdmin, async (req, res): Promise<void> => {
  const { order } = req.body as { order?: { id: number; position: number }[] };
  if (!Array.isArray(order)) { res.status(400).json({ error: "order array required" }); return; }
  for (const { id, position } of order) {
    await db.update(heroImagesTable).set({ position }).where(eq(heroImagesTable.id, id));
  }
  res.json({ ok: true });
});

router.delete("/admin/hero-images/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(heroImagesTable).where(eq(heroImagesTable.id, id));
  res.sendStatus(204);
});

router.get("/admin/registrations", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: registrationsTable.id,
      eventId: registrationsTable.eventId,
      eventTitle: eventsTable.title,
      name: registrationsTable.name,
      email: registrationsTable.email,
      notes: registrationsTable.notes,
      status: registrationsTable.status,
      paymentSessionId: registrationsTable.paymentSessionId,
      createdAt: registrationsTable.createdAt,
      seatingPreference: registrationsTable.seatingPreference,
      tilePreference: registrationsTable.tilePreference,
      skillLevel: registrationsTable.skillLevel,
      compCodeUsed: registrationsTable.compCodeUsed,
    })
    .from(registrationsTable)
    .leftJoin(eventsTable, eq(registrationsTable.eventId, eventsTable.id))
    .orderBy(registrationsTable.createdAt);

  res.json({
    registrations: rows.map((r) => ({
      id: r.id,
      eventId: r.eventId,
      eventTitle: r.eventTitle ?? "Unknown Event",
      name: r.name,
      email: r.email,
      notes: r.notes ?? null,
      status: r.status,
      paid: !!r.paymentSessionId,
      createdAt: r.createdAt.toISOString(),
      seatingPreference: r.seatingPreference ?? null,
      tilePreference: r.tilePreference ?? null,
      skillLevel: r.skillLevel ?? null,
      compCodeUsed: r.compCodeUsed ?? null,
    })),
  });
});

// Manually add a registration — for guests who paid out-of-band (Square
// invoice, manual payment link, at the door) and never went through the
// website's registration flow. Created confirmed and takes a spot.
router.post("/admin/registrations", requireAdmin, async (req, res): Promise<void> => {
  const { eventId, name, email, notes, paid } = req.body as {
    eventId?: unknown;
    name?: unknown;
    email?: unknown;
    notes?: unknown;
    paid?: unknown;
  };
  if (typeof eventId !== "number" || typeof name !== "string" || !name.trim() || typeof email !== "string" || !email.trim()) {
    res.status(400).json({ error: "eventId (number), name and email are required" });
    return;
  }

  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  const [row] = await db
    .insert(registrationsTable)
    .values({
      eventId,
      name: name.trim().slice(0, 120),
      email: email.trim().slice(0, 200),
      notes: typeof notes === "string" && notes.trim() ? notes.trim().slice(0, 500) : null,
      status: "confirmed",
      paymentSessionId: paid === true ? `manual-${Date.now()}` : null,
    })
    .returning();

  await db
    .update(eventsTable)
    .set({ spotsLeft: sql`GREATEST(0, ${eventsTable.spotsLeft} - 1)` })
    .where(eq(eventsTable.id, eventId));

  res.status(201).json({
    registration: {
      id: row.id,
      eventId: row.eventId,
      eventTitle: event.title,
      name: row.name,
      email: row.email,
      notes: row.notes ?? null,
      status: row.status,
      paid: !!row.paymentSessionId,
      createdAt: row.createdAt.toISOString(),
    },
  });
});

// Reconcile a registration's paid flag against Square by hand. Registrations
// made while an event was priced $0 (or paid out-of-band via a Square invoice
// or manual payment link) have no payment reference, so the Paid column can't
// see the money — the admin marks them paid here after checking Square.
router.patch("/admin/registrations/:id/paid", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { paid } = req.body as { paid?: unknown };
  if (typeof paid !== "boolean") {
    res.status(400).json({ error: "paid (boolean) is required" });
    return;
  }

  const [existing] = await db
    .select({ id: registrationsTable.id, paymentSessionId: registrationsTable.paymentSessionId })
    .from(registrationsTable)
    .where(eq(registrationsTable.id, id))
    .limit(1);
  if (!existing) {
    res.status(404).json({ error: "Registration not found" });
    return;
  }

  // Never clobber a real Square payment reference when un-marking; only
  // manual markers ("manual-...") may be removed.
  if (!paid && existing.paymentSessionId && !existing.paymentSessionId.startsWith("manual-")) {
    res.status(409).json({
      error: "This registration has a Square payment reference; it can't be marked unpaid from here.",
    });
    return;
  }

  await db
    .update(registrationsTable)
    .set({ paymentSessionId: paid ? `manual-${Date.now()}` : null })
    .where(eq(registrationsTable.id, id));

  res.json({ success: true, paid });
});

// --- Dashboard -------------------------------------------------------------

// Parses the events table's free-text date ("YYYY-MM-DD" preferred) to a local
// timestamp; returns null when unparseable so bad rows are skipped, not crashed on.
function eventDateMs(d: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
  const t = Date.parse(d);
  return Number.isNaN(t) ? null : t;
}

// The Square sync is best-effort decoration on admin reads — a slow Square API
// must not eat the function's 30s budget and 504 the whole screen, so cap it.
const SQUARE_SYNC_TIMEOUT_MS = 6000;

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

// Kick off the best-effort Square order sync WITHOUT awaiting it. Square's
// orders/search has been observed hanging well past 30s, and any await on it
// (even behind a Promise.race cap) has taken down admin screens with function
// timeouts. The webhook is the authoritative capture path; this only backfills.
function backgroundSquareSync(context: string): void {
  try {
    const client = getSquareClient();
    if (client && isSquareLocationConfigured()) {
      void withTimeout(syncOrdersFromSquare(client, getSquareLocationId()), SQUARE_SYNC_TIMEOUT_MS)
        .catch((err) => logger.warn({ err, context }, "Background Square order sync did not finish"));
    }
  } catch (err) {
    logger.warn({ err, context }, "Background Square order sync could not start");
  }
}

router.get("/admin/dashboard", requireAdmin, async (_req, res): Promise<void> => {
  logger.info("dashboard: start");
  backgroundSquareSync("dashboard");
  logger.info("dashboard: sync dispatched, querying");

  try {
    // Sequential on purpose: with one pooled connection per instance,
    // Promise.all pipelines concurrent queries onto a single wire, and
    // pipelined queries stall indefinitely behind Supavisor's transaction-mode
    // pooler (observed as 30s dashboard timeouts with healthy single-query
    // routes). Seven sequential selects complete in well under a second.
    const orders = await listOrders();
    const regs = await db
      .select({
        id: registrationsTable.id,
        eventId: registrationsTable.eventId,
        name: registrationsTable.name,
        status: registrationsTable.status,
        paymentSessionId: registrationsTable.paymentSessionId,
        createdAt: registrationsTable.createdAt,
      })
      .from(registrationsTable);
    const latestSubs = await db.select().from(subscribersTable).orderBy(desc(subscribersTable.createdAt)).limit(10);
    const prods = await db.select().from(productsTable);
    const eventsRows = await db.select().from(eventsTable);
    const [subCount] = await db.select({ count: count() }).from(subscribersTable);
    const [blogCount] = await db.select({ count: count() }).from(blogPostsTable);
    logger.info("dashboard: queries done");

    // Revenue
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
    const sum = (rows: { totalCents: number }[]) => rows.reduce((s, o) => s + o.totalCents, 0);
    const monthOrders = orders.filter((o) => o.createdAt.getTime() >= monthStart.getTime());
    const weekOrders = orders.filter((o) => o.createdAt.getTime() >= weekAgo);

    // Upcoming events with fill + collected
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const confirmedByEvent = new Map<number, { confirmed: number; paid: number }>();
    for (const r of regs) {
      if (r.status !== "confirmed") continue;
      const e = confirmedByEvent.get(r.eventId) ?? { confirmed: 0, paid: 0 };
      e.confirmed += 1;
      if (r.paymentSessionId) e.paid += 1;
      confirmedByEvent.set(r.eventId, e);
    }
    const upcomingEvents = eventsRows
      .map((e) => ({ e, ms: eventDateMs(e.date) }))
      .filter((x): x is { e: typeof x.e; ms: number } => x.ms !== null && x.ms >= todayStart.getTime())
      .sort((a, b) => a.ms - b.ms)
      .slice(0, 8)
      .map(({ e }) => {
        const c = confirmedByEvent.get(e.id) ?? { confirmed: 0, paid: 0 };
        return {
          id: e.id,
          title: e.title,
          date: e.date,
          time: e.time,
          totalSpots: e.totalSpots,
          spotsLeft: e.spotsLeft,
          priceCents: e.priceCents ?? 0,
          published: e.published,
          confirmedCount: c.confirmed,
          collectedCents: c.paid * (e.priceCents ?? 0),
        };
      });

    // Recent activity across orders, registrations, and subscribers
    const eventTitleById = new Map(eventsRows.map((e) => [e.id, e.title]));
    const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
    const activity = [
      // Event payments are covered by the registration entries below.
      ...orders.filter((o) => o.kind === "product").slice(0, 10).map((o) => ({
        type: "order" as const,
        at: o.createdAt.toISOString(),
        title: `Order ${money(o.totalCents)}`,
        detail: o.buyerName ?? o.buyerEmail ?? "",
      })),
      ...[...regs]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 10)
        .map((r) => ({
          type: "registration" as const,
          at: r.createdAt.toISOString(),
          title: `Registration — ${eventTitleById.get(r.eventId) ?? "Event"}`,
          detail: `${r.name}${r.status === "pending" ? " (pending)" : ""}`,
        })),
      ...latestSubs.map((s) => ({
        type: "subscriber" as const,
        at: s.createdAt.toISOString(),
        title: "New subscriber",
        detail: s.email,
      })),
    ]
      .sort((a, b) => (a.at < b.at ? 1 : -1))
      .slice(0, 12);

    res.json({
      revenue: {
        totalCents: sum(orders),
        monthCents: sum(monthOrders),
        weekCents: sum(weekOrders),
        totalOrders: orders.length,
        weekOrders: weekOrders.length,
      },
      upcomingEvents,
      activity,
      alerts: {
        pendingRegistrations: regs.filter((r) => r.status === "pending").length,
        outOfStockVisible: prods.filter((p) => !p.inStock && p.published).length,
      },
      totals: {
        subscribers: Number(subCount?.count ?? 0),
        events: eventsRows.length,
        products: prods.length,
        blogPosts: Number(blogCount?.count ?? 0),
      },
    });
  } catch (err) {
    logger.error({ err }, "Failed to build dashboard");
    res.status(500).json({ error: "Could not load dashboard." });
  }
});

// --- Event check-in report -----------------------------------------------

async function buildCheckinReport(eventId: number) {
  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
  if (!event) return null;

  const regs = await db
    .select()
    .from(registrationsTable)
    .where(eq(registrationsTable.eventId, eventId))
    .orderBy(asc(registrationsTable.name));

  const participants = regs.map((r) => ({
    name: r.name,
    email: r.email,
    status: r.status,
    paid: !!r.paymentSessionId,
    notes: r.notes ?? "",
    registered: r.createdAt.toISOString().slice(0, 10),
  }));

  const csvEscape = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const header = ["#", "Name", "Email", "Status", "Paid", "Notes", "Registered", "Checked In"];
  const rows = participants.map((p, i) => [
    String(i + 1),
    p.name,
    p.email,
    p.status,
    p.paid ? "Yes" : "No",
    p.notes,
    p.registered,
    "", // blank column to tick off at the door
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");

  const slug = event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "event";
  const csvFilename = `checkin-${slug}.csv`;

  return { event, participants, csv, csvFilename };
}

router.get("/admin/events/:id/checkin-report", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const report = await buildCheckinReport(id);
  if (!report) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${report.csvFilename}"`);
  res.send(report.csv);
});

router.post("/admin/events/:id/checkin-report/email", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { to } = req.body as { to?: unknown };
  if (typeof to !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())) {
    res.status(400).json({ error: "A valid recipient email address is required." });
    return;
  }
  const report = await buildCheckinReport(id);
  if (!report) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  try {
    await sendCheckinReportEmail({
      to: to.trim(),
      eventTitle: report.event.title,
      eventDate: report.event.date,
      eventTime: report.event.time,
      eventLocation: report.event.location,
      participants: report.participants,
      csv: report.csv,
      csvFilename: report.csvFilename,
    });
    res.json({ sent: true, to: to.trim(), count: report.participants.length });
  } catch (err) {
    logger.error({ err, eventId: id }, "Failed to email check-in report");
    res.status(500).json({ error: "Could not send the report email." });
  }
});

router.delete("/admin/registrations/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db
    .delete(registrationsTable)
    .where(eq(registrationsTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Registration not found" });
    return;
  }

  // A spot is consumed only once a registration reaches "confirmed" (paid events
  // after payment clears, free events immediately). Restore the spot on delete for
  // those, capped at the event's total capacity so counts never exceed totalSpots.
  if (row.status === "confirmed") {
    await db
      .update(eventsTable)
      .set({ spotsLeft: sql`LEAST(${eventsTable.totalSpots}, ${eventsTable.spotsLeft} + 1)` })
      .where(eq(eventsTable.id, row.eventId));
  }

  res.sendStatus(204);
});

// Public: the announcement bar shown site-wide. Fails soft (returns disabled)
// so a settings/DB hiccup never breaks page rendering.
router.get("/announcement", async (_req, res): Promise<void> => {
  try {
    res.json(await readAnnouncement());
  } catch (err) {
    logger.error({ err }, "Failed to read announcement setting");
    res.json({ enabled: false, text: "" });
  }
});

router.put("/admin/announcement", requireAdmin, async (req, res): Promise<void> => {
  const { enabled, text } = req.body as { enabled?: unknown; text?: unknown };
  if (typeof enabled !== "boolean" || typeof text !== "string") {
    res.status(400).json({ error: "enabled (boolean) and text (string) are required" });
    return;
  }
  try {
    await writeSetting("announcement_enabled", String(enabled));
    await writeSetting("announcement_text", text);
    res.json(await readAnnouncement());
  } catch (err) {
    logger.error({ err }, "Failed to update announcement setting");
    res.status(500).json({ error: "Could not save the announcement." });
  }
});

// Public: whether the chat assistant should be shown. Fails open (enabled).
router.get("/chatbot", async (_req, res): Promise<void> => {
  try {
    res.json({ enabled: await readChatbotEnabled() });
  } catch (err) {
    logger.error({ err }, "Failed to read chatbot setting");
    res.json({ enabled: true });
  }
});

router.put("/admin/chatbot", requireAdmin, async (req, res): Promise<void> => {
  const { enabled } = req.body as { enabled?: unknown };
  if (typeof enabled !== "boolean") {
    res.status(400).json({ error: "enabled (boolean) is required" });
    return;
  }
  try {
    await writeSetting("chatbot_enabled", String(enabled));
    res.json({ enabled: await readChatbotEnabled() });
  } catch (err) {
    logger.error({ err }, "Failed to update chatbot setting");
    res.status(500).json({ error: "Could not save the chatbot setting." });
  }
});

// Public: whether the Build Your Set experience should be shown. Fails open.
router.get("/build-your-set", async (_req, res): Promise<void> => {
  try {
    res.json({ enabled: await readBuildYourSetEnabled() });
  } catch (err) {
    logger.error({ err }, "Failed to read Build Your Set setting");
    res.json({ enabled: true });
  }
});

router.put("/admin/build-your-set", requireAdmin, async (req, res): Promise<void> => {
  const { enabled } = req.body as { enabled?: unknown };
  if (typeof enabled !== "boolean") {
    res.status(400).json({ error: "enabled (boolean) is required" });
    return;
  }
  try {
    await writeSetting("build_your_set_enabled", String(enabled));
    res.json({ enabled: await readBuildYourSetEnabled() });
  } catch (err) {
    logger.error({ err }, "Failed to update Build Your Set setting");
    res.status(500).json({ error: "Could not save the Build Your Set setting." });
  }
});

// Public: the "Curated Collections" cards on the homepage.
router.get("/curated-collections", async (_req, res): Promise<void> => {
  try {
    res.setHeader("Cache-Control", "no-store");
    res.json({ items: curatedToApi(await readCuratedCollections()) });
  } catch (err) {
    logger.error({ err }, "Failed to read curated collections");
    res.json({ items: [] });
  }
});

router.put("/admin/curated-collections", requireAdmin, async (req, res): Promise<void> => {
  const body = req.body as { items?: unknown };
  if (!Array.isArray(body.items)) {
    res.status(400).json({ error: "items array is required" });
    return;
  }
  if (body.items.length > 12) {
    res.status(400).json({ error: "Too many collections (maximum 12)." });
    return;
  }
  const items: CuratedItem[] = [];
  for (const raw of body.items) {
    if (!raw || typeof raw !== "object") {
      res.status(400).json({ error: "Each item must be an object." });
      return;
    }
    const o = raw as Record<string, unknown>;
    if (typeof o.title !== "string" || typeof o.imagePath !== "string" || typeof o.linkPath !== "string") {
      res.status(400).json({ error: "Each item needs title, imagePath and linkPath." });
      return;
    }
    items.push({
      title: o.title.slice(0, 120),
      imagePath: o.imagePath.slice(0, 300),
      linkPath: o.linkPath.slice(0, 300),
    });
  }
  try {
    await writeSetting("curated_collections", JSON.stringify(items));
    res.json({ items: curatedToApi(items) });
  } catch (err) {
    logger.error({ err }, "Failed to save curated collections");
    res.status(500).json({ error: "Could not save the collections." });
  }
});

// --- "As Featured In" press bar on the homepage -------------------------------
const PRESS_BAR_DEFAULT_NAMES = [
  "The Tile Edit",
  "Modern Hostess",
  "Salon & Soirée",
  "Heritage Living",
  "Atelier Weekly",
];

async function readPressBar(): Promise<{ enabled: boolean; names: string[] }> {
  await ensureSettingsTable();
  const rows = await db
    .select()
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, "press_bar"));
  const raw = rows[0]?.value;
  // Default to the original hardcoded list so behavior is unchanged until edited.
  if (!raw) return { enabled: true, names: PRESS_BAR_DEFAULT_NAMES };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") throw new Error("bad shape");
    const o = parsed as Record<string, unknown>;
    const names = Array.isArray(o.names)
      ? o.names.filter((n): n is string => typeof n === "string" && n.trim().length > 0)
      : [];
    return { enabled: o.enabled === true, names };
  } catch {
    return { enabled: true, names: PRESS_BAR_DEFAULT_NAMES };
  }
}

// Public: the "As Featured In" section on the homepage. Fails soft to the
// default list so a transient DB error doesn't blank the section.
router.get("/press-bar", async (_req, res): Promise<void> => {
  try {
    res.setHeader("Cache-Control", "no-store");
    res.json(await readPressBar());
  } catch (err) {
    logger.error({ err }, "Failed to read press bar setting");
    res.json({ enabled: true, names: PRESS_BAR_DEFAULT_NAMES });
  }
});

router.put("/admin/press-bar", requireAdmin, async (req, res): Promise<void> => {
  const { enabled, names } = req.body as { enabled?: unknown; names?: unknown };
  if (typeof enabled !== "boolean" || !Array.isArray(names)) {
    res.status(400).json({ error: "enabled (boolean) and names (array) are required" });
    return;
  }
  if (names.length > 12) {
    res.status(400).json({ error: "Too many names (maximum 12)." });
    return;
  }
  const clean: string[] = [];
  for (const raw of names) {
    if (typeof raw !== "string") {
      res.status(400).json({ error: "Each name must be a string." });
      return;
    }
    const name = raw.trim().slice(0, 60);
    if (name) clean.push(name);
  }
  try {
    await writeSetting("press_bar", JSON.stringify({ enabled, names: clean }));
    res.json({ enabled, names: clean });
  } catch (err) {
    logger.error({ err }, "Failed to save press bar setting");
    res.status(500).json({ error: "Could not save the Featured In section." });
  }
});

router.get("/admin/orders", requireAdmin, async (_req, res): Promise<void> => {
  // Best-effort pull of recent orders straight from Square so the view is
  // accurate even without the webhook or confirmation-page capture paths.
  backgroundSquareSync("admin-orders");

  try {
    const rows = await listOrders();
    res.json({
      orders: rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        totalCents: r.totalCents,
        discountCode: r.discountCode ?? null,
        discountCents: r.discountCents,
        currency: r.currency,
        buyerName: r.buyerName ?? null,
        buyerEmail: r.buyerEmail ?? null,
        buyerPhone: r.buyerPhone ?? null,
        shippingAddress: r.shippingAddress ?? null,
        items: r.items ?? "[]",
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    logger.error({ err }, "Failed to list orders");
    res.status(500).json({ error: "Could not load orders." });
  }
});

router.get("/admin/product-images", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(productImagesTable);
  const images: Record<string, string> = {};
  for (const row of rows) {
    images[row.sku] = row.imagePath;
  }
  res.json({ images });
});

router.put("/admin/product-images/:sku", requireAdmin, async (req, res): Promise<void> => {
  const sku = req.params.sku as string;
  const { imagePath } = req.body as { imagePath?: string };
  if (!imagePath) {
    res.status(400).json({ error: "imagePath is required" });
    return;
  }
  await db.delete(productImagesTable).where(eq(productImagesTable.sku, sku));
  const [row] = await db
    .insert(productImagesTable)
    .values({ productId: sku, sku, url: imagePath, imagePath })
    .returning();
  await db
    .update(productsTable)
    .set({ imagePath, updatedAt: new Date() })
    .where(eq(productsTable.sku, sku));
  res.json({ sku: row.sku, imagePath: row.imagePath });
});

router.delete("/admin/product-images/:sku", requireAdmin, async (req, res): Promise<void> => {
  const sku = req.params.sku as string;
  await db.delete(productImagesTable).where(eq(productImagesTable.sku, sku));
  await db
    .update(productsTable)
    .set({ imagePath: null, updatedAt: new Date() })
    .where(eq(productsTable.sku, sku));
  res.sendStatus(204);
});

const objectStorage = new ObjectStorageService();

router.post("/admin/storage/upload-url", requireAdmin, async (req, res): Promise<void> => {
  try {
    const uploadURL = await objectStorage.getObjectEntityUploadURL();
    const objectPath = objectStorage.normalizeObjectEntityPath(uploadURL);
    res.json({ uploadURL, objectPath });
  } catch (err) {
    logger.error({ err }, "Failed to generate upload URL");
    res.status(500).json({ error: "Could not generate upload URL" });
  }
});

// ── Discount Codes ───────────────────────────────────────────────────────────

router.get("/admin/discount-codes", requireAdmin, async (_req, res): Promise<void> => {
  const codes = await db.select().from(discountCodesTable).orderBy(discountCodesTable.createdAt);
  res.json({ codes });
});

router.post("/admin/discount-codes", requireAdmin, async (req, res): Promise<void> => {
  const { code, discountPercent, appliesTo, description, active } = req.body as {
    code?: string; discountPercent?: number; appliesTo?: string; description?: string | null; active?: boolean;
  };
  if (!code || typeof discountPercent !== "number") {
    res.status(400).json({ error: "code and discountPercent are required" });
    return;
  }
  try {
    const [row] = await db.insert(discountCodesTable).values({
      code: code.trim().toUpperCase(),
      discountPercent,
      appliesTo: appliesTo ?? "both",
      description: description ?? null,
      active: active !== false,
    }).returning();
    res.status(201).json({ code: row });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("unique")) {
      res.status(409).json({ error: "A code with that name already exists" });
    } else {
      res.status(500).json({ error: "Failed to create discount code" });
    }
  }
});

router.put("/admin/discount-codes/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const { code, discountPercent, appliesTo, description, active } = req.body as {
    code?: string; discountPercent?: number; appliesTo?: string; description?: string | null; active?: boolean;
  };
  try {
    const [row] = await db.update(discountCodesTable)
      .set({
        ...(code !== undefined && { code: code.trim().toUpperCase() }),
        ...(discountPercent !== undefined && { discountPercent }),
        ...(appliesTo !== undefined && { appliesTo }),
        ...(description !== undefined && { description }),
        ...(active !== undefined && { active }),
        updatedAt: new Date(),
      })
      .where(eq(discountCodesTable.id, id))
      .returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ code: row });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("unique")) {
      res.status(409).json({ error: "A code with that name already exists" });
    } else {
      res.status(500).json({ error: "Failed to update discount code" });
    }
  }
});

// Redemptions: who has used which code. Deleting one reinstates the code for
// that email (testing / customer-service resets).
router.get("/admin/discount-redemptions", requireAdmin, async (_req, res): Promise<void> => {
  try {
    const rows = await listRedemptions();
    res.json({
      redemptions: rows.map((r) => ({
        id: r.id,
        code: r.code,
        email: r.email,
        orderId: r.orderId ?? null,
        paidAt: r.paidAt ? r.paidAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    logger.error({ err }, "Failed to list discount redemptions");
    res.status(500).json({ error: "Could not load redemptions." });
  }
});

router.delete("/admin/discount-redemptions/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const removed = await deleteRedemption(id);
    if (!removed) {
      res.status(404).json({ error: "Redemption not found" });
      return;
    }
    res.sendStatus(204);
  } catch (err) {
    logger.error({ err, id }, "Failed to delete discount redemption");
    res.status(500).json({ error: "Could not reset the redemption." });
  }
});

router.delete("/admin/discount-codes/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(discountCodesTable).where(eq(discountCodesTable.id, id));
  res.json({ success: true });
});


export default router;
