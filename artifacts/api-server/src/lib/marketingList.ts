import { eq, sql, isNull } from "drizzle-orm";
import { db, subscribersTable, siteSettingsTable } from "@workspace/db";
import { logger } from "./logger";

// The marketing list: opt-ins, opt-outs, and the suppression check every
// promotional send must pass through. Transactional mail (order receipts,
// event confirmations, password resets) deliberately ignores all of this —
// CAN-SPAM only governs commercial messages.

/** Physical mailing address required in the footer of commercial email.
 * Stored in site_settings so it can be corrected without a deploy. */
export async function getBusinessAddress(): Promise<string> {
  try {
    const [row] = await db
      .select()
      .from(siteSettingsTable)
      .where(eq(siteSettingsTable.key, "business_postal_address"));
    return row?.value?.trim() ?? "";
  } catch {
    return "";
  }
}

export interface SubscribeResult {
  email: string;
  token: string;
  created: boolean;
  /** True when this address had previously opted out and has now opted back in. */
  resubscribed: boolean;
}

const normalize = (email: string) => email.trim().toLowerCase();

/**
 * Adds an address to the marketing list, or returns the existing row. A repeat
 * opt-in from someone who previously unsubscribed clears the opt-out — an
 * explicit new request is consent, and it's what the welcome popup does when a
 * lapsed subscriber signs up again.
 */
export async function subscribeEmail(opts: {
  email: string;
  name?: string | null;
  source?: string | null;
  discountCode?: string | null;
}): Promise<SubscribeResult> {
  const email = normalize(opts.email);

  const [existing] = await db
    .select()
    .from(subscribersTable)
    .where(sql`lower(${subscribersTable.email}) = ${email}`)
    .limit(1);

  if (existing) {
    const resubscribed = existing.unsubscribedAt != null;
    if (resubscribed) {
      await db
        .update(subscribersTable)
        .set({ unsubscribedAt: null, subscribedAt: new Date() })
        .where(eq(subscribersTable.id, existing.id));
      logger.info({ subscriberId: existing.id }, "Subscriber opted back in");
    }
    return { email: existing.email, token: existing.unsubscribeToken, created: false, resubscribed };
  }

  const [row] = await db
    .insert(subscribersTable)
    .values({
      email: opts.email.trim(),
      name: opts.name?.trim() || null,
      source: opts.source ?? "website",
      discountCode: opts.discountCode ?? null,
    })
    .returning();
  return { email: row.email, token: row.unsubscribeToken, created: true, resubscribed: false };
}

/** Marks an address as opted out. Returns the address, or null for a bad token. */
export async function unsubscribeByToken(token: string): Promise<string | null> {
  const clean = token.trim();
  if (!clean) return null;
  const [row] = await db
    .update(subscribersTable)
    .set({ unsubscribedAt: new Date() })
    .where(eq(subscribersTable.unsubscribeToken, clean))
    .returning({ email: subscribersTable.email });
  if (row) logger.info({ email: row.email }, "Subscriber unsubscribed");
  return row?.email ?? null;
}

/** Re-opts-in from the confirmation page, for accidental clicks. */
export async function resubscribeByToken(token: string): Promise<string | null> {
  const clean = token.trim();
  if (!clean) return null;
  const [row] = await db
    .update(subscribersTable)
    .set({ unsubscribedAt: null, subscribedAt: new Date() })
    .where(eq(subscribersTable.unsubscribeToken, clean))
    .returning({ email: subscribersTable.email });
  return row?.email ?? null;
}

export async function lookupByToken(token: string): Promise<{ email: string; unsubscribed: boolean } | null> {
  const clean = token.trim();
  if (!clean) return null;
  const [row] = await db
    .select({ email: subscribersTable.email, unsubscribedAt: subscribersTable.unsubscribedAt })
    .from(subscribersTable)
    .where(eq(subscribersTable.unsubscribeToken, clean))
    .limit(1);
  if (!row) return null;
  return { email: row.email, unsubscribed: row.unsubscribedAt != null };
}

/** True when this address has opted out — check before every marketing send. */
export async function isUnsubscribed(email: string): Promise<boolean> {
  const [row] = await db
    .select({ id: subscribersTable.id })
    .from(subscribersTable)
    .where(
      sql`lower(${subscribersTable.email}) = ${normalize(email)} AND ${subscribersTable.unsubscribedAt} IS NOT NULL`,
    )
    .limit(1);
  return !!row;
}

/** Everyone still opted in — the audience for any campaign. */
export async function listActiveSubscribers() {
  return db
    .select()
    .from(subscribersTable)
    .where(isNull(subscribersTable.unsubscribedAt))
    .orderBy(subscribersTable.createdAt);
}
