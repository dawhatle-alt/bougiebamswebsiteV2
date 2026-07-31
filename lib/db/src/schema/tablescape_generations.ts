import { pgTable, text, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";

// One row per AI tablescape image. Doubles as the rate-limit ledger (each
// generation spends real API credit) and as merchandising data on which
// products shoppers pair together.
export const tablescapeGenerationsTable = pgTable(
  "tablescape_generations",
  {
    id: text("id").primaryKey(),
    // Anonymous per-browser id, sent by the builder page. Present for everyone.
    visitorId: text("visitor_id").notNull(),
    // Supabase user id once the shopper signs in; NULL for guests.
    shopperId: text("shopper_id"),
    // { slot: productId } for the selection that produced this image.
    selections: jsonb("selections").$type<Record<string, string>>().notNull(),
    imagePath: text("image_path").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("tablescape_generations_visitor_created_idx").on(t.visitorId, t.createdAt)],
);

export type TablescapeGeneration = typeof tablescapeGenerationsTable.$inferSelect;
