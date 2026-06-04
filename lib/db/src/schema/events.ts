import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  date: text("date").notNull(),
  time: text("time").notNull().default(""),
  location: text("location").notNull().default(""),
  priceCents: integer("price_cents"),
  category: text("category").notNull().default("In-Person"),
  imagePath: text("image_path"),
  totalSpots: integer("total_spots").notNull().default(0),
  spotsLeft: integer("spots_left").notNull().default(0),
  host: text("host").notNull().default("BougieBams"),
  published: boolean("published").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Event = typeof eventsTable.$inferSelect;
export type InsertEvent = typeof eventsTable.$inferInsert;
