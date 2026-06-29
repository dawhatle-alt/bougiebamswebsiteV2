import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const waitlistTable = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id"),
  email: text("email").notNull(),
  name: text("name"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Waitlist = typeof waitlistTable.$inferSelect;
