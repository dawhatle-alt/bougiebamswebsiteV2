import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const heroImagesTable = pgTable("hero_images", {
  id: serial("id").primaryKey(),
  objectPath: text("object_path").notNull(),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type HeroImage = typeof heroImagesTable.$inferSelect;
