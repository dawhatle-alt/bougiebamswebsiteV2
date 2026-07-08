import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, shopperProfilesTable } from "@workspace/db";
import { requireShopperAuth, requireAnyAuth } from "../middleware/auth";
import { listOrdersByEmail } from "../lib/orders";
import { logger } from "../lib/logger";

const router: IRouter = Router();

interface OrderItem {
  name: string;
  quantity: string;
  amountCents: number;
}

function parseItems(raw: string | null): OrderItem[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((x) => {
      if (!x || typeof x !== "object") return [];
      const o = x as Record<string, unknown>;
      return [{
        name: typeof o.name === "string" ? o.name : "Item",
        quantity: typeof o.quantity === "string" ? o.quantity : "1",
        amountCents: typeof o.amountCents === "number" ? o.amountCents : 0,
      }];
    });
  } catch {
    return [];
  }
}

// Orders placed with the signed-in account's email — shop purchases and event
// payments alike. Works for shoppers and admin (OIDC) sessions.
router.get("/account/orders", requireAnyAuth, async (req: Request, res: Response): Promise<void> => {
  const email = (req.shopperUser?.email ?? req.user?.email ?? "").trim();
  if (!email) {
    res.json({ orders: [] });
    return;
  }
  try {
    const rows = await listOrdersByEmail(email);
    res.json({
      orders: rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        totalCents: r.totalCents,
        discountCents: r.discountCents,
        discountCode: r.discountCode ?? null,
        currency: r.currency,
        state: r.state,
        items: parseItems(r.items),
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    logger.error({ err }, "Error fetching account orders");
    res.status(500).json({ error: "Could not fetch orders" });
  }
});

router.get("/account/me", requireShopperAuth, async (req: Request, res: Response): Promise<void> => {
  const supabaseId = req.shopperUser!.sub;
  try {
    const [profile] = await db
      .select()
      .from(shopperProfilesTable)
      .where(eq(shopperProfilesTable.supabaseId, supabaseId))
      .limit(1);

    if (!profile) {
      res.status(404).json({ profile: null });
      return;
    }

    res.json({ profile });
  } catch (err) {
    logger.error({ err }, "Error fetching shopper profile");
    res.status(500).json({ error: "Could not fetch profile" });
  }
});

const UpdateProfileBody = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  marketingConsent: z.boolean().optional(),
});

router.put("/account/profile", requireShopperAuth, async (req: Request, res: Response): Promise<void> => {
  const supabaseId = req.shopperUser!.sub;
  const email = req.shopperUser!.email;

  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request" });
    return;
  }

  const { firstName, lastName, phone, marketingConsent } = parsed.data;

  try {
    const [existing] = await db
      .select({ id: shopperProfilesTable.id })
      .from(shopperProfilesTable)
      .where(eq(shopperProfilesTable.supabaseId, supabaseId))
      .limit(1);

    let profile;
    if (existing) {
      [profile] = await db
        .update(shopperProfilesTable)
        .set({
          ...(firstName !== undefined ? { firstName } : {}),
          ...(lastName !== undefined ? { lastName } : {}),
          ...(phone !== undefined ? { phone } : {}),
          ...(marketingConsent !== undefined ? { marketingConsent } : {}),
        })
        .where(eq(shopperProfilesTable.supabaseId, supabaseId))
        .returning();
    } else {
      [profile] = await db
        .insert(shopperProfilesTable)
        .values({
          supabaseId,
          email: email ?? null,
          firstName: firstName ?? null,
          lastName: lastName ?? null,
          phone: phone ?? null,
          marketingConsent: marketingConsent ?? false,
        })
        .returning();
    }

    res.json({ profile });
  } catch (err) {
    logger.error({ err }, "Error upserting shopper profile");
    res.status(500).json({ error: "Could not update profile" });
  }
});

export default router;
