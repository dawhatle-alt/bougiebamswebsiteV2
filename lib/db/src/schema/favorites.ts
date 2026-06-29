import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

export const favoriteProductImagesTable = pgTable("favorite_product_images", {
  id: serial("id").primaryKey(),
  productId: text("product_id").notNull().unique(),
  objectPath: text("object_path").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const favoriteCustomProductsTable = pgTable("favorite_custom_products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull().default(""),
  affiliateUrl: text("affiliate_url").notNull().default(""),
  objectPath: text("object_path"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
