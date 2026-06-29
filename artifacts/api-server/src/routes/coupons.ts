import { Router, type IRouter } from "express";
import { db, subscribersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const STATIC_COUPONS: Record<string, { discountPercent: number; message: string }> = {
  BOUGIE10: { discountPercent: 10, message: "10% off your order" },
  BOUGIE20: { discountPercent: 20, message: "20% off your order" },
  WELCOME15: { discountPercent: 15, message: "15% welcome discount" },
};

router.get("/coupons/validate", async (req, res): Promise<void> => {
  const code = typeof req.query.code === "string" ? req.query.code.trim().toUpperCase() : null;
  if (!code) {
    res.status(400).json({ error: "code query parameter is required" });
    return;
  }

  const staticCoupon = STATIC_COUPONS[code];
  if (staticCoupon) {
    res.json({ valid: true, discountPercent: staticCoupon.discountPercent, message: staticCoupon.message });
    return;
  }

  const [subscriber] = await db
    .select()
    .from(subscribersTable)
    .where(eq(subscribersTable.discountCode, code))
    .limit(1);

  if (subscriber) {
    res.json({ valid: true, discountPercent: 10, message: "10% subscriber discount" });
    return;
  }

  res.status(404).json({ valid: false, discountPercent: 0, message: "Coupon not found" });
});

export default router;
