import { Router, type IRouter } from "express";
import { eq, asc, or } from "drizzle-orm";
import { db, productsTable, productImagesTable } from "@workspace/db";
import {
  ListProductsResponse,
  CreateProductBody,
  GetProductParams,
  GetProductResponse,
  UpdateProductParams,
  UpdateProductBody,
  UpdateProductResponse,
  DeleteProductParams,
} from "@workspace/api-zod";
import { requireAdmin } from "../middleware/auth";

const router: IRouter = Router();

// Ordered gallery image paths per product; legacy rows keyed by sku. A product
// with no gallery rows falls back to its single image_path.
async function loadGalleries(): Promise<Map<string, string[]>> {
  const rows = await db
    .select()
    .from(productImagesTable)
    .orderBy(asc(productImagesTable.sortOrder), asc(productImagesTable.id));
  const map = new Map<string, string[]>();
  for (const r of rows) {
    for (const key of new Set([r.productId, r.sku])) {
      const list = map.get(key) ?? [];
      list.push(r.imagePath);
      map.set(key, list);
    }
  }
  return map;
}

function imagesFor(galleries: Map<string, string[]>, id: string, sku: string, imagePath: string | null): string[] {
  return galleries.get(id) ?? galleries.get(sku) ?? (imagePath ? [imagePath] : []);
}

router.get("/products", async (req, res): Promise<void> => {
  const { category } = req.query;
  const conditions = [eq(productsTable.published, true)];
  if (category && typeof category === "string") {
    conditions.push(eq(productsTable.category, category));
  }
  const { and } = await import("drizzle-orm");
  const rows = await db
    .select()
    .from(productsTable)
    .where(and(...conditions))
    .orderBy(productsTable.createdAt);
  const galleries = await loadGalleries();
  const products = rows.map((r) => ({
    id: r.id,
    sku: r.sku,
    name: r.name,
    description: r.description,
    price: Number(r.price),
    category: r.category,
    inStock: r.inStock,
    imagePath: r.imagePath ?? null,
    images: imagesFor(galleries, r.id, r.sku, r.imagePath ?? null),
    featured: r.featured,
    published: r.published,
    buildYourSet: r.buildYourSet,
    shippingIncluded: r.shippingIncluded,
    tabs: r.tabs ?? null,
    affiliateUrl: r.affiliateUrl ?? null,
  }));
  res.json(ListProductsResponse.parse({ products }));
});

router.get("/products/featured", async (_req, res): Promise<void> => {
  const { eq: eqFn, and: andFn } = await import("drizzle-orm");
  const rows = await db.select().from(productsTable)
    .where(andFn(eqFn(productsTable.featured, true), eqFn(productsTable.published, true)))
    .orderBy(productsTable.createdAt);
  const galleries = await loadGalleries();
  const products = rows.map((r) => ({
    id: r.id,
    sku: r.sku,
    name: r.name,
    description: r.description,
    price: Number(r.price),
    category: r.category,
    inStock: r.inStock,
    imagePath: r.imagePath ?? null,
    images: imagesFor(galleries, r.id, r.sku, r.imagePath ?? null),
    featured: r.featured,
    published: r.published,
    buildYourSet: r.buildYourSet,
    shippingIncluded: r.shippingIncluded,
    tabs: r.tabs ?? null,
    affiliateUrl: r.affiliateUrl ?? null,
  }));
  res.json(ListProductsResponse.parse({ products }));
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const gallery = await db
    .select()
    .from(productImagesTable)
    .where(or(eq(productImagesTable.productId, row.id), eq(productImagesTable.sku, row.sku)))
    .orderBy(asc(productImagesTable.sortOrder), asc(productImagesTable.id));

  res.json(
    GetProductResponse.parse({
      product: {
        id: row.id,
        sku: row.sku,
        name: row.name,
        description: row.description,
        price: Number(row.price),
        category: row.category,
        inStock: row.inStock,
        imagePath: row.imagePath ?? null,
        images: gallery.length ? gallery.map((g) => g.imagePath) : row.imagePath ? [row.imagePath] : [],
        featured: row.featured,
        published: row.published,
        buildYourSet: row.buildYourSet,
        shippingIncluded: row.shippingIncluded,
        tabs: row.tabs ?? null,
        affiliateUrl: row.affiliateUrl ?? null,
      },
    }),
  );
});

router.get("/admin/products", requireAdmin, async (req, res): Promise<void> => {
  const { category } = req.query;
  const baseQuery = db.select().from(productsTable);
  const rows = await (
    category && typeof category === "string"
      ? baseQuery.where(eq(productsTable.category, category))
      : baseQuery
  ).orderBy(productsTable.createdAt);
  const products = rows.map((r) => ({
    id: r.id,
    sku: r.sku,
    name: r.name,
    description: r.description,
    price: Number(r.price),
    category: r.category,
    inStock: r.inStock,
    imagePath: r.imagePath ?? null,
    featured: r.featured,
    published: r.published,
    buildYourSet: r.buildYourSet,
    shippingIncluded: r.shippingIncluded,
    tabs: r.tabs ?? null,
    affiliateUrl: r.affiliateUrl ?? null,
  }));
  res.json(ListProductsResponse.parse({ products }));
});

router.post("/products", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const id = parsed.data.sku;
  const [row] = await db
    .insert(productsTable)
    .values({
      id,
      sku: parsed.data.sku,
      name: parsed.data.name,
      description: parsed.data.description ?? "",
      price: String(parsed.data.price),
      category: parsed.data.category,
      inStock: parsed.data.inStock,
      shippingIncluded: parsed.data.shippingIncluded ?? false,
      tabs: parsed.data.tabs ?? null,
    })
    .returning();

  res.status(201).json(
    GetProductResponse.parse({
      product: {
        id: row.id,
        sku: row.sku,
        name: row.name,
        description: row.description,
        price: Number(row.price),
        category: row.category,
        inStock: row.inStock,
        imagePath: row.imagePath ?? null,
        featured: row.featured,
        published: row.published,
        buildYourSet: row.buildYourSet,
        shippingIncluded: row.shippingIncluded,
        tabs: row.tabs ?? null,
        affiliateUrl: row.affiliateUrl ?? null,
      },
    }),
  );
});

router.patch("/products/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.price !== undefined) updateData.price = String(parsed.data.price);
  if (parsed.data.category !== undefined) updateData.category = parsed.data.category;
  if (parsed.data.inStock !== undefined) updateData.inStock = parsed.data.inStock;
  if (parsed.data.published !== undefined) updateData.published = parsed.data.published;
  if (parsed.data.buildYourSet !== undefined) updateData.buildYourSet = parsed.data.buildYourSet;
  if (parsed.data.shippingIncluded !== undefined) updateData.shippingIncluded = parsed.data.shippingIncluded;
  if (parsed.data.tabs !== undefined) updateData.tabs = parsed.data.tabs ?? null;

  const [row] = await db
    .update(productsTable)
    .set(updateData)
    .where(eq(productsTable.id, params.data.id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json(
    UpdateProductResponse.parse({
      product: {
        id: row.id,
        sku: row.sku,
        name: row.name,
        description: row.description,
        price: Number(row.price),
        category: row.category,
        inStock: row.inStock,
        imagePath: row.imagePath ?? null,
        featured: row.featured,
        published: row.published,
        buildYourSet: row.buildYourSet,
        shippingIncluded: row.shippingIncluded,
        tabs: row.tabs ?? null,
        affiliateUrl: row.affiliateUrl ?? null,
      },
    }),
  );
});

router.delete("/products/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .delete(productsTable)
    .where(eq(productsTable.id, params.data.id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
