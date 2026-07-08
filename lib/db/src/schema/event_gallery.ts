import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const eventGalleryTable = pgTable("event_gallery", {
  id: serial("id").primaryKey(),
  objectPath: text("object_path").notNull(),
  caption: text("caption"),
  // Photos can be tied to an event to form per-event albums; null = general
  // "community moments" photo that only appears in the All Moments view.
  eventId: integer("event_id"),
  // At most one photo per event is the album cover (enforced in the API).
  isCover: boolean("is_cover").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type EventGalleryPhoto = typeof eventGalleryTable.$inferSelect;
