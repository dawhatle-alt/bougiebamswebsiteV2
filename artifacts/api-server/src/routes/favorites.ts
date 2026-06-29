import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { favoriteProductImagesTable, favoriteCustomProductsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth";

const router: IRouter = Router();

router.get("/favorites/images", async (_req: Request, res: Response): Promise<void> => {
  const rows = await db.select().from(favoriteProductImagesTable);
  const images: Record<string, string> = {};
  for (const row of rows) {
    images[row.productId] = `/api/storage${row.objectPath}`;
  }
  res.json({ images });
});

router.get("/favorites/custom-products", async (_req: Request, res: Response): Promise<void> => {
  const rows = await db
    .select()
    .from(favoriteCustomProductsTable)
    .orderBy(favoriteCustomProductsTable.sortOrder, favoriteCustomProductsTable.createdAt);
  const products = rows.map((r) => ({
    id: `custom-${r.id}`,
    dbId: r.id,
    name: r.name,
    category: r.category,
    description: r.description,
    affiliateUrl: r.affiliateUrl,
    image: r.objectPath ? `/api/storage${r.objectPath}` : null,
  }));
  res.json({ products });
});

router.post(
  "/admin/favorites/:productId/image",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const { productId } = req.params;
    const { objectPath } = req.body as { objectPath?: string };
    if (!objectPath || typeof objectPath !== "string" || objectPath.trim() === "") {
      res.status(400).json({ error: "objectPath is required" });
      return;
    }
    await db
      .insert(favoriteProductImagesTable)
      .values({ productId, objectPath })
      .onConflictDoUpdate({
        target: favoriteProductImagesTable.productId,
        set: { objectPath, updatedAt: new Date() },
      });
    res.json({ success: true, imageUrl: `/api/storage${objectPath}` });
  }
);

router.delete(
  "/admin/favorites/:productId/image",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const { productId } = req.params;
    await db.delete(favoriteProductImagesTable).where(eq(favoriteProductImagesTable.productId, productId));
    res.json({ success: true });
  }
);

router.post(
  "/admin/favorites/custom-products",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const { name, category, description, affiliateUrl, objectPath } =
      req.body as { name?: string; category?: string; description?: string; affiliateUrl?: string; objectPath?: string };
    if (!name?.trim() || !category?.trim()) {
      res.status(400).json({ error: "name and category are required" });
      return;
    }
    const [row] = await db
      .insert(favoriteCustomProductsTable)
      .values({ name: name.trim(), category: category.trim(), description: description?.trim() ?? "", affiliateUrl: affiliateUrl?.trim() ?? "", objectPath: objectPath ?? null })
      .returning();
    res.status(201).json({ success: true, product: row });
  }
);

router.put(
  "/admin/favorites/custom-products/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
    const { name, category, description, affiliateUrl, objectPath } =
      req.body as { name?: string; category?: string; description?: string; affiliateUrl?: string; objectPath?: string | null };
    if (!name?.trim() || !category?.trim()) {
      res.status(400).json({ error: "name and category are required" });
      return;
    }
    const [row] = await db
      .update(favoriteCustomProductsTable)
      .set({ name: name.trim(), category: category.trim(), description: description?.trim() ?? "", affiliateUrl: affiliateUrl?.trim() ?? "", ...(objectPath !== undefined ? { objectPath } : {}) })
      .where(eq(favoriteCustomProductsTable.id, id))
      .returning();
    if (!row) { res.status(404).json({ error: "not found" }); return; }
    res.json({ success: true, product: row });
  }
);

router.delete(
  "/admin/favorites/custom-products/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
    await db.delete(favoriteCustomProductsTable).where(eq(favoriteCustomProductsTable.id, id));
    res.json({ success: true });
  }
);

export default router;
