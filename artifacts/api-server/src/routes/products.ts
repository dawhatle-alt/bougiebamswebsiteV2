import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
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

router.get("/products", async (req, res): Promise<void> => {
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
  }));
  res.json(ListProductsResponse.parse({ products }));
});

router.get("/products/featured", async (_req, res): Promise<void> => {
  const rows = await db.select().from(productsTable).orderBy(productsTable.createdAt);
  const products = rows.map((r) => ({
    id: r.id,
    sku: r.sku,
    name: r.name,
    description: r.description,
    price: Number(r.price),
    category: r.category,
    inStock: r.inStock,
    imagePath: r.imagePath ?? null,
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
      },
    }),
  );
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
