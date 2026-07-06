import { eq } from "drizzle-orm";
import { db, discountCodesTable, subscribersTable } from "@workspace/db";
import { logger } from "./logger";

// The welcome popup's built-in code and the offer it advertises (15% off).
const WELCOME_CODE = "BOUGIE15";
const WELCOME_PERCENT = 15;

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

  // The welcome popup hands out BOUGIE15 as its built-in code. If nobody has
  // created it in admin yet, seed it so the advertised offer always works —
  // and becomes visible/manageable under Admin → Discount Codes.
  if (code === WELCOME_CODE) {
    try {
      await db
        .insert(discountCodesTable)
        .values({
          code: WELCOME_CODE,
          discountPercent: WELCOME_PERCENT,
          appliesTo: "both",
          description: "Welcome offer — 15% off first order",
          active: true,
        })
        .onConflictDoNothing({ target: discountCodesTable.code });
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
