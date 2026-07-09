import { sql } from "drizzle-orm";
import { integer, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// Business HQ (forecasting/planning) tables, ported from the BougieBams-Business
// repo. Prefixed biz_ to stay clear of the storefront's events/conversations
// tables. Created lazily by the api-server on first use (see businessBootstrap).

const num = (name: string) => numeric(name, { mode: "number" });

export const bizAssumptionsTable = pgTable("biz_assumptions", {
  id: integer("id").primaryKey().default(1),
  startupCapital: num("startup_capital").notNull().default(50000),
  yearOneMarketingBudget: num("year_one_marketing_budget").notNull().default(15000),
  tileSetMSRP: num("tile_set_msrp").notNull().default(299),
  tileSetCostAt100: num("tile_set_cost_at_100").notNull().default(74.5),
  tileSetCostAt200: num("tile_set_cost_at_200").notNull().default(63.63),
  tileSetUnitsTarget: integer("tile_set_units_target").notNull().default(500),
  matMSRP: num("mat_msrp").notNull().default(120),
  matCost: num("mat_cost").notNull().default(79),
  matUnitsTarget: integer("mat_units_target").notNull().default(500),
  luxuryBoxMSRP: num("luxury_box_msrp").notNull().default(49.95),
  luxuryBoxCost: num("luxury_box_cost").notNull().default(22),
  luxuryBoxUnitsTarget: integer("luxury_box_units_target").notNull().default(200),
  rackSetMSRP: num("rack_set_msrp").notNull().default(120),
  rackSetCost: num("rack_set_cost").notNull().default(45),
  rackSetUnitsTarget: integer("rack_set_units_target").notNull().default(100),
  eventsPerYear: integer("events_per_year").notNull().default(20),
  avgAttendees: integer("avg_attendees").notNull().default(30),
  avgTicketPrice: num("avg_ticket_price").notNull().default(30),
  avgVenueCostPerAttendee: num("avg_venue_cost_per_attendee").notNull().default(12),
  laserEquipmentCost: num("laser_equipment_cost").notNull().default(10000),
  tileProductionLeadTimeMonths: integer("tile_production_lead_time_months").notNull().default(3),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}).enableRLS();

export const bizEventsTable = pgTable("biz_events", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  name: text("name").notNull(),
  date: text("date").notNull(),
  status: text("status").notNull().default("upcoming"),
  attendees: integer("attendees").notNull().default(0),
  ticketPrice: num("ticket_price").notNull().default(0),
  venueCostPerAttendee: num("venue_cost_per_attendee").notNull().default(0),
  otherExpenses: num("other_expenses").notNull().default(0),
  emailSignups: integer("email_signups").notNull().default(0),
  instagramFollowersGained: integer("instagram_followers_gained").notNull().default(0),
  productSalesGenerated: num("product_sales_generated").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}).enableRLS();

export const bizMarketingChannelsTable = pgTable("biz_marketing_channels", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  allocationPct: num("allocation_pct").notNull().default(0),
  spend: num("spend").notNull().default(0),
  leads: integer("leads").notNull().default(0),
  customers: integer("customers").notNull().default(0),
  revenueInfluenced: num("revenue_influenced").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}).enableRLS();

export const bizInventoryItemsTable = pgTable("biz_inventory_items", {
  productId: text("product_id").primaryKey(),
  productName: text("product_name").notNull(),
  onHand: integer("on_hand").notNull().default(0),
  ordered: integer("ordered").notNull().default(0),
  inProduction: integer("in_production").notNull().default(0),
  leadTimeWeeks: integer("lead_time_weeks").notNull().default(0),
  reorderPoint: integer("reorder_point").notNull().default(0),
  reorderQty: integer("reorder_qty").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}).enableRLS();

export const bizScenariosTable = pgTable("biz_scenarios", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  unitsSoldMultiplier: num("units_sold_multiplier").notNull().default(1),
  marketingSpendMultiplier: num("marketing_spend_multiplier").notNull().default(1),
  eventCount: integer("event_count").notNull().default(20),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}).enableRLS();

// AI advisor chat threads (separate from the storefront chatbot's
// conversations/messages tables).
export const bizConversationsTable = pgTable("biz_conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull().default("New conversation"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

export const bizMessagesTable = pgTable("biz_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => bizConversationsTable.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();
