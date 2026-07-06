import { Router, type IRouter } from "express";
import { db, subscribersTable, discountCodesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/coupons/validate", async (req, res): Promise<void> => {
  const raw = typeof req.query.code === "string" ? req.query.code.trim().toUpperCase() : null;
  if (!raw) {
    res.status(400).json({ error: "code query parameter is required" });
    return;
  }

  const appliesTo = typeof req.query.appliesTo === "string" ? req.query.appliesTo : "both";

  const [dbCode] = await db
    .select()
    .from(discountCodesTable)
    .where(eq(discountCodesTable.code, raw))
    .limit(1);

  if (dbCode) {
    if (!dbCode.active) {
      res.status(404).json({ valid: false, discountPercent: 0, message: "This code is no longer active" });
      return;
    }
    if (appliesTo !== "both" && dbCode.appliesTo !== "both" && dbCode.appliesTo !== appliesTo) {
      res.status(404).json({ valid: false, discountPercent: 0, message: `This code only applies to ${dbCode.appliesTo}` });
      return;
    }
    res.json({
      valid: true,
      discountPercent: dbCode.discountPercent,
      message: dbCode.description ?? `${dbCode.discountPercent}% off`,
    });
    return;
  }

  const [subscriber] = await db
    .select()
    .from(subscribersTable)
    .where(eq(subscribersTable.discountCode, raw))
    .limit(1);

  if (subscriber) {
    // Matches the welcome offer advertised by the signup popup.
    res.json({ valid: true, discountPercent: 15, message: "15% subscriber discount" });
    return;
  }

  res.status(404).json({ valid: false, discountPercent: 0, message: "Coupon not found" });
});

export default router;
