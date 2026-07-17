import { eq, and, sql, isNotNull, desc } from "drizzle-orm";
import { db, discountCodesTable, subscribersTable, discountRedemptionsTable, siteSettingsTable } from "@workspace/db";
import { logger } from "./logger";
import { tableExists } from "./dbBootstrap";

// The welcome popup's built-in code and the offer it advertises. The code
// name is admin-configurable (site_settings) with this default; the percent
// only seeds a missing discount_codes row — the row is the source of truth.
export const DEFAULT_WELCOME_CODE = "BOUGIE15";
const WELCOME_PERCENT = 15;

export async function getWelcomeCode(): Promise<string> {
  try {
    const [row] = await db
      .select()
      .from(siteSettingsTable)
      .where(eq(siteSettingsTable.key, "welcome_discount_code"));
    const value = row?.value?.trim().toUpperCase();
    return value || DEFAULT_WELCOME_CODE;
  } catch {
    return DEFAULT_WELCOME_CODE;
  }
}

// Guarantee the advertised welcome code exists (and is manageable) under
// Admin → Discount Codes. Existing rows are left untouched.
export async function ensureWelcomeCodeRow(code: string): Promise<void> {
  await db
    .insert(discountCodesTable)
    .values({
      code,
      discountPercent: WELCOME_PERCENT,
      appliesTo: "both",
      description: "Welcome offer",
      active: true,
    })
    .onConflictDoNothing({ target: discountCodesTable.code });
}

export interface ResolvedDiscount {
  code: string;
  percent: number;
}

/**
 * Resolves a shopper-entered discount code to a percentage for product checkout.
 * Returns null when the code is unknown, inactive, or events-only.
 */
export async function resolveProductDiscount(raw: string): Promise<ResolvedDiscount | null> {
  const code = raw.trim().toUpperCase();
  if (!code) return null;

  const [row] = await db
    .select()
    .from(discountCodesTable)
    .where(eq(discountCodesTable.code, code))
    .limit(1);

  if (row) {
    if (!row.active) return null;
    if (row.appliesTo !== "both" && row.appliesTo !== "products") return null;
    return { code, percent: row.discountPercent };
  }

  // The welcome popup hands out a configurable code. If nobody has created it
  // in admin yet, seed it so the advertised offer always works — and becomes
  // visible/manageable under Admin → Discount Codes.
  const welcomeCode = await getWelcomeCode();
  if (code === welcomeCode) {
    try {
      await ensureWelcomeCodeRow(welcomeCode);
    } catch (err) {
      logger.error({ err }, "Failed to seed welcome discount code");
    }
    return { code, percent: WELCOME_PERCENT };
  }

  // Personal codes stored on a subscriber record (same offer as the popup).
  const [subscriber] = await db
    .select()
    .from(subscribersTable)
    .where(eq(subscribersTable.discountCode, code))
    .limit(1);
  if (subscriber) return { code, percent: WELCOME_PERCENT };

  return null;
}

// --- Single-use-per-email enforcement ---------------------------------------
// Migrations are applied manually in this project, so lazily create the table
// on first use (same pattern as site_settings/orders).
let redemptionsTableReady: Promise<void> | null = null;

function ensureRedemptionsTable(): Promise<void> {
  if (!redemptionsTableReady) {
    // Check the catalog first — DDL (even no-op ALTERs) takes exclusive locks
    // that queue behind live traffic when run on every cold start.
    redemptionsTableReady = tableExists("discount_redemptions")
      .then(async (exists) => {
        if (exists) return;
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS discount_redemptions (
            id serial PRIMARY KEY,
            code text NOT NULL,
            email text NOT NULL,
            order_id text,
            paid_at timestamptz,
            created_at timestamptz NOT NULL DEFAULT now(),
            CONSTRAINT discount_redemptions_code_email UNIQUE (code, email)
          )
        `);
        // Deny-all via Supabase's public REST API; the server's direct Postgres
        // connection is the table owner and is unaffected.
        await db.execute(sql`ALTER TABLE discount_redemptions ENABLE ROW LEVEL SECURITY`);
      })
      .catch((err) => {
        redemptionsTableReady = null;
        throw err;
      });
  }
  return redemptionsTableReady;
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** True when this code has already been used on a PAID order by this email. */
export async function hasRedeemed(code: string, email: string): Promise<boolean> {
  await ensureRedemptionsTable();
  const [row] = await db
    .select({ id: discountRedemptionsTable.id })
    .from(discountRedemptionsTable)
    .where(
      and(
        eq(discountRedemptionsTable.code, code.trim().toUpperCase()),
        eq(discountRedemptionsTable.email, normalizeEmail(email)),
        isNotNull(discountRedemptionsTable.paidAt),
      ),
    )
    .limit(1);
  return !!row;
}

/**
 * Records that a checkout was started with this code/email, linked to the Square
 * order so the redemption can be marked paid on capture. Re-running (retry after
 * an abandoned checkout) just points the pair at the newest order.
 */
export async function recordPendingRedemption(code: string, email: string, orderId: string): Promise<void> {
  await ensureRedemptionsTable();
  await db
    .insert(discountRedemptionsTable)
    .values({ code: code.trim().toUpperCase(), email: normalizeEmail(email), orderId })
    .onConflictDoUpdate({
      target: [discountRedemptionsTable.code, discountRedemptionsTable.email],
      set: { orderId },
      // Never re-point a redemption that already consumed the code.
      setWhere: sql`${discountRedemptionsTable.paidAt} IS NULL`,
    });
}

/** All recorded redemptions, newest first — for the admin view. */
export async function listRedemptions() {
  await ensureRedemptionsTable();
  return db.select().from(discountRedemptionsTable).orderBy(desc(discountRedemptionsTable.createdAt));
}

/**
 * Removes a redemption record, reinstating the code for that email (used for
 * end-to-end testing and customer-service resets). Returns false if not found.
 */
export async function deleteRedemption(id: number): Promise<boolean> {
  await ensureRedemptionsTable();
  const [row] = await db
    .delete(discountRedemptionsTable)
    .where(eq(discountRedemptionsTable.id, id))
    .returning({ id: discountRedemptionsTable.id });
  return !!row;
}

/** Stamps the redemption tied to this order as consumed. Safe no-op otherwise. */
export async function markRedemptionPaid(orderId: string): Promise<void> {
  await ensureRedemptionsTable();
  await db
    .update(discountRedemptionsTable)
    .set({ paidAt: new Date() })
    .where(and(eq(discountRedemptionsTable.orderId, orderId), sql`${discountRedemptionsTable.paidAt} IS NULL`));
}
