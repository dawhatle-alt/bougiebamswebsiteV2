import { pgTable, text, serial, numeric, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Per-product content for the detail-page tabs. A missing tab (or missing
// column value) means "enabled but no content yet" — the storefront hides
// tabs with no content.
export interface ProductTab {
  enabled: boolean;
  content: string;
}

export interface ProductTabs {
  details?: ProductTab;
  care?: ProductTab;
  shipping?: ProductTab;
}

export const productsTable = pgTable("products", {
  id: text("id").primaryKey(),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(),
  inStock: boolean("in_stock").notNull().default(true),
  imagePath: text("image_path"),
  featured: boolean("featured").notNull().default(false),
  published: boolean("published").notNull().default(true),
  buildYourSet: boolean("build_your_set").notNull().default(true),
  shippingIncluded: boolean("shipping_included").notNull().default(false),
  tabs: jsonb("tabs").$type<ProductTabs>(),
  affiliateUrl: text("affiliate_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
