import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const productImagesTable = pgTable("product_images", {
  id: serial("id").primaryKey(),
  productId: text("product_id").notNull(),
  sku: text("sku").notNull(),
  url: text("url").notNull(),
  imagePath: text("image_path").notNull(),
  alt: text("alt"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ProductImage = typeof productImagesTable.$inferSelect;
