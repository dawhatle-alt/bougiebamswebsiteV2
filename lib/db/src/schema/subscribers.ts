import { sql } from "drizzle-orm";
import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const subscribersTable = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  source: text("source"),
  discountCode: text("discount_code"),
  subscribedAt: timestamp("subscribed_at", { withTimezone: true }).notNull().defaultNow(),
  // Set when the recipient opts out. Marketing sends must exclude these
  // addresses; transactional mail (receipts, event confirmations) is exempt
  // and keeps sending.
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
  // Unguessable id for the unsubscribe link in email footers, so opting out
  // never requires signing in.
  unsubscribeToken: text("unsubscribe_token").notNull().default(sql`gen_random_uuid()::text`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSubscriberSchema = createInsertSchema(subscribersTable).omit({
  id: true,
  createdAt: true,
});

export type InsertSubscriber = z.infer<typeof insertSubscriberSchema>;
export type Subscriber = typeof subscribersTable.$inferSelect;
