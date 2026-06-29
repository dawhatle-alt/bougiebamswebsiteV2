import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const productImagesTable = pgTable("product_images", {
  id: serial("id").primaryKey(),
  sku: text("sku").notNull().unique(),
  imagePath: text("image_path").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ProductImage = typeof productImagesTable.$inferSelect;
