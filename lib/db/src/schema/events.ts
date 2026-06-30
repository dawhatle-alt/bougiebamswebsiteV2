import { pgTable, text, serial, integer, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  date: text("date").notNull(),
  time: text("time").notNull(),
  location: text("location").notNull(),
  priceCents: integer("price_cents"),
  category: text("category").notNull().default("In-Person"),
  imagePath: text("image_path"),
  totalSpots: integer("total_spots").notNull().default(20),
  spotsLeft: integer("spots_left").notNull().default(20),
  host: text("host").notNull().default("BougieBams"),
  published: boolean("published").notNull().default(false),
  featured: boolean("featured").notNull().default(false),
  stripeProductId: text("stripe_product_id"),
  reminderHoursBefore: integer("reminder_hours_before"),
  reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEventSchema = createInsertSchema(eventsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;
