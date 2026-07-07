import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

// Completed Square product orders, captured from the payment webhook and the
// post-checkout confirmation lookup. `id` is the Square order id, which makes
// inserts idempotent across both capture paths.
export const ordersTable = pgTable("orders", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull().default("product"), // "product" | "event"
  totalCents: integer("total_cents").notNull().default(0),
  discountCode: text("discount_code"), // e.g. "BOUGIE15" when a code was applied
  discountCents: integer("discount_cents").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  buyerName: text("buyer_name"),
  buyerEmail: text("buyer_email"),
  buyerPhone: text("buyer_phone"),
  shippingAddress: text("shipping_address"),
  items: text("items"), // JSON array of { name, quantity, amountCents }
  state: text("state").notNull().default("COMPLETED"),
  notifiedAt: timestamp("notified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Order = typeof ordersTable.$inferSelect;
