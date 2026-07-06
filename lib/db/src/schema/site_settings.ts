import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Simple key/value store for editable site-wide settings (e.g. the announcement
// bar). Kept generic so new settings don't each need their own column/migration.
export const siteSettingsTable = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SiteSetting = typeof siteSettingsTable.$inferSelect;
