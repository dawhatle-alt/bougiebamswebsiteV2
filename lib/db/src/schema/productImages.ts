import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const productImagesTable = pgTable("product_images", {
  id: serial("id").primaryKey(),
  sku: text("sku").notNull().unique(),
  imagePath: text("image_path").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type ProductImage = typeof productImagesTable.$inferSelect;
