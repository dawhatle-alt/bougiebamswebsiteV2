import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const registrationsTable = pgTable("registrations", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("confirmed"),
  paymentSessionId: text("payment_session_id"),
  referralCode: text("referral_code"),
  userId: text("user_id"),
  // Standard registration questions (collected when the event has
  // collect_registration_details enabled).
  seatingPreference: text("seating_preference"),
  tilePreference: text("tile_preference"),
  skillLevel: text("skill_level"),
  compCodeUsed: text("comp_code_used"),
  // One registration can cover several attendees (e.g. a mother buying a seat
  // for her daughter in one transaction). Spots, revenue and the check-in list
  // are all seat-weighted; every legacy row is a single seat.
  seats: integer("seats").notNull().default(1),
  // Names of the additional attendees on a multi-seat registration (the
  // registrant's own name is `name`). Free text, one per line or comma-separated.
  guestNames: text("guest_names"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRegistrationSchema = createInsertSchema(registrationsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;
export type Registration = typeof registrationsTable.$inferSelect;
