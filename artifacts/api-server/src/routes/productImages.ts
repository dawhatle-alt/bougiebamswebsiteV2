import { Router, type IRouter } from "express";
import { db, productImagesTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAdmin } from "./admin";

const router: IRouter = Router();

// Admin: list all product image overrides as { sku: imagePath }
router.get("/admin/product-images", requireAdmin, async (req, res) => {
  try {
    const rows = await db.select().from(productImagesTable);
    const map: Record<string, string> = {};
    for (const row of rows) map[row.sku] = row.imagePath;
    return res.json({ images: map });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch product images");
    return res.status(500).json({ error: "Could not load product images." });
  }
});

// Admin: upsert the image path for a single SKU
router.put("/admin/product-images/:sku", requireAdmin, async (req, res) => {
  const sku = req.params.sku as string;
  const imagePath: string =
    typeof req.body?.imagePath === "string" ? req.body.imagePath.trim() : "";

  if (!sku) {
    return res.status(400).json({ error: "SKU is required." });
  }
  if (!imagePath.startsWith("/public-objects/")) {
    return res
      .status(400)
      .json({ error: "Invalid image path — must be a public object path." });
  }

  try {
    const existing = await db
      .select({ id: productImagesTable.id })
      .from(productImagesTable)
      .where(sql`sku = ${sku}`)
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(productImagesTable)
        .set({ imagePath, updatedAt: new Date() })
        .where(sql`sku = ${sku}`);
    } else {
      await db
        .insert(productImagesTable)
        .values([{ sku, imagePath, updatedAt: new Date() }]);
    }
    return res.json({ sku, imagePath });
  } catch (err) {
    req.log.error({ err }, "Failed to upsert product image");
    return res.status(500).json({ error: "Could not save the image." });
  }
});

// Admin: delete the image override for a SKU (revert to local default)
router.delete("/admin/product-images/:sku", requireAdmin, async (req, res) => {
  const sku = req.params.sku as string;
  try {
    await db.delete(productImagesTable).where(sql`sku = ${sku}`);
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete product image");
    return res.status(500).json({ error: "Could not remove the image." });
  }
});

export default router;
