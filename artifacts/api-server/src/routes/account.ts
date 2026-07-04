import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, shopperProfilesTable } from "@workspace/db";
import { requireShopperAuth } from "../middleware/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

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
