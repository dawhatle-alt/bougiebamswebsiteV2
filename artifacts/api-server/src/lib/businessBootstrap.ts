import { sql } from "drizzle-orm";
import {
  db,
  bizAssumptionsTable,
  bizMarketingChannelsTable,
  bizInventoryItemsTable,
  bizScenariosTable,
} from "@workspace/db";
import { tableExists } from "./dbBootstrap";
import { logger } from "./logger";

// Business HQ tables are created lazily on first use — same pattern as orders/
// site_settings. The catalog check runs once per instance; DDL only executes in
// environments where the tables don't exist yet.
let businessTablesReady: Promise<void> | null = null;

const defaultChannels = [
  { id: "mkt-01", name: "Photography / Video / Content", allocationPct: 35, spend: 0, leads: 0, customers: 0, revenueInfluenced: 0 },
  { id: "mkt-02", name: "Influencer / Product Seeding", allocationPct: 20, spend: 0, leads: 0, customers: 0, revenueInfluenced: 0 },
  { id: "mkt-03", name: "Meta Ads", allocationPct: 15, spend: 0, leads: 0, customers: 0, revenueInfluenced: 0 },
  { id: "mkt-04", name: "Pinterest Ads", allocationPct: 10, spend: 0, leads: 0, customers: 0, revenueInfluenced: 0 },
  { id: "mkt-05", name: "Email / CRM", allocationPct: 8, spend: 0, leads: 0, customers: 0, revenueInfluenced: 0 },
  { id: "mkt-06", name: "PR / Giveaways / Community", allocationPct: 7, spend: 0, leads: 0, customers: 0, revenueInfluenced: 0 },
  { id: "mkt-07", name: "Amazon / Affiliate", allocationPct: 5, spend: 0, leads: 0, customers: 0, revenueInfluenced: 0 },
];

const defaultInventory = [
  { productId: "tile-set", productName: "Premium Tile Set", onHand: 0, ordered: 0, inProduction: 0, leadTimeWeeks: 12, reorderPoint: 50, reorderQty: 100 },
  { productId: "mat", productName: "Matching Mat", onHand: 0, ordered: 0, inProduction: 0, leadTimeWeeks: 4, reorderPoint: 30, reorderQty: 50 },
  { productId: "luxury-box", productName: "Luxury Box", onHand: 0, ordered: 0, inProduction: 0, leadTimeWeeks: 3, reorderPoint: 20, reorderQty: 50 },
  { productId: "rack-set", productName: "Rack Set", onHand: 0, ordered: 0, inProduction: 0, leadTimeWeeks: 3, reorderPoint: 15, reorderQty: 25 },
];

const defaultScenarios = [
  { id: "scen-conservative", name: "Conservative", unitsSoldMultiplier: 0.5, marketingSpendMultiplier: 0.8, eventCount: 10 },
  { id: "scen-expected", name: "Expected", unitsSoldMultiplier: 1.0, marketingSpendMultiplier: 1.0, eventCount: 20 },
  { id: "scen-aggressive", name: "Aggressive", unitsSoldMultiplier: 1.5, marketingSpendMultiplier: 1.2, eventCount: 30 },
];

async function createTables(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS biz_assumptions (
      id integer PRIMARY KEY DEFAULT 1,
      startup_capital numeric NOT NULL DEFAULT 50000,
      year_one_marketing_budget numeric NOT NULL DEFAULT 15000,
      tile_set_msrp numeric NOT NULL DEFAULT 299,
      tile_set_cost_at_100 numeric NOT NULL DEFAULT 74.5,
      tile_set_cost_at_200 numeric NOT NULL DEFAULT 63.63,
      tile_set_units_target integer NOT NULL DEFAULT 500,
      mat_msrp numeric NOT NULL DEFAULT 120,
      mat_cost numeric NOT NULL DEFAULT 79,
      mat_units_target integer NOT NULL DEFAULT 500,
      luxury_box_msrp numeric NOT NULL DEFAULT 49.95,
      luxury_box_cost numeric NOT NULL DEFAULT 22,
      luxury_box_units_target integer NOT NULL DEFAULT 200,
      rack_set_msrp numeric NOT NULL DEFAULT 120,
      rack_set_cost numeric NOT NULL DEFAULT 45,
      rack_set_units_target integer NOT NULL DEFAULT 100,
      events_per_year integer NOT NULL DEFAULT 20,
      avg_attendees integer NOT NULL DEFAULT 30,
      avg_ticket_price numeric NOT NULL DEFAULT 30,
      avg_venue_cost_per_attendee numeric NOT NULL DEFAULT 12,
      laser_equipment_cost numeric NOT NULL DEFAULT 10000,
      tile_production_lead_time_months integer NOT NULL DEFAULT 3,
      updated_at timestamptz DEFAULT now()
    )
  `);
  await db.execute(sql`ALTER TABLE biz_assumptions ENABLE ROW LEVEL SECURITY`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS biz_events (
      id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name text NOT NULL,
      date text NOT NULL,
      status text NOT NULL DEFAULT 'upcoming',
      attendees integer NOT NULL DEFAULT 0,
      ticket_price numeric NOT NULL DEFAULT 0,
      venue_cost_per_attendee numeric NOT NULL DEFAULT 0,
      other_expenses numeric NOT NULL DEFAULT 0,
      email_signups integer NOT NULL DEFAULT 0,
      instagram_followers_gained integer NOT NULL DEFAULT 0,
      product_sales_generated numeric NOT NULL DEFAULT 0,
      created_at timestamptz DEFAULT now()
    )
  `);
  await db.execute(sql`ALTER TABLE biz_events ENABLE ROW LEVEL SECURITY`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS biz_marketing_channels (
      id text PRIMARY KEY,
      name text NOT NULL,
      allocation_pct numeric NOT NULL DEFAULT 0,
      spend numeric NOT NULL DEFAULT 0,
      leads integer NOT NULL DEFAULT 0,
      customers integer NOT NULL DEFAULT 0,
      revenue_influenced numeric NOT NULL DEFAULT 0,
      updated_at timestamptz DEFAULT now()
    )
  `);
  await db.execute(sql`ALTER TABLE biz_marketing_channels ENABLE ROW LEVEL SECURITY`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS biz_inventory_items (
      product_id text PRIMARY KEY,
      product_name text NOT NULL,
      on_hand integer NOT NULL DEFAULT 0,
      ordered integer NOT NULL DEFAULT 0,
      in_production integer NOT NULL DEFAULT 0,
      lead_time_weeks integer NOT NULL DEFAULT 0,
      reorder_point integer NOT NULL DEFAULT 0,
      reorder_qty integer NOT NULL DEFAULT 0,
      updated_at timestamptz DEFAULT now()
    )
  `);
  await db.execute(sql`ALTER TABLE biz_inventory_items ENABLE ROW LEVEL SECURITY`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS biz_scenarios (
      id text PRIMARY KEY,
      name text NOT NULL,
      units_sold_multiplier numeric NOT NULL DEFAULT 1,
      marketing_spend_multiplier numeric NOT NULL DEFAULT 1,
      event_count integer NOT NULL DEFAULT 20,
      updated_at timestamptz DEFAULT now()
    )
  `);
  await db.execute(sql`ALTER TABLE biz_scenarios ENABLE ROW LEVEL SECURITY`);
}

// Sequential on purpose: concurrent queries pipelined onto one postgres.js
// connection stall behind the transaction-mode pooler.
async function seedDefaults(): Promise<void> {
  const existing = await db.select({ id: bizAssumptionsTable.id }).from(bizAssumptionsTable);
  if (existing.length === 0) {
    await db.insert(bizAssumptionsTable).values({ id: 1 });
    logger.info("Seeded default business assumptions");
  }

  const channels = await db.select({ id: bizMarketingChannelsTable.id }).from(bizMarketingChannelsTable);
  if (channels.length === 0) {
    await db.insert(bizMarketingChannelsTable).values(defaultChannels);
    logger.info("Seeded default marketing channels");
  }

  const inventory = await db.select({ productId: bizInventoryItemsTable.productId }).from(bizInventoryItemsTable);
  if (inventory.length === 0) {
    await db.insert(bizInventoryItemsTable).values(defaultInventory);
    logger.info("Seeded default business inventory");
  }

  const scen = await db.select({ id: bizScenariosTable.id }).from(bizScenariosTable);
  if (scen.length === 0) {
    await db.insert(bizScenariosTable).values(defaultScenarios);
    logger.info("Seeded default scenarios");
  }
}

export function ensureBusinessTables(): Promise<void> {
  if (!businessTablesReady) {
    businessTablesReady = tableExists("biz_assumptions")
      .then(async (exists) => {
        if (!exists) {
          await createTables();
          await seedDefaults();
        }
      })
      .catch((err) => {
        businessTablesReady = null;
        throw err;
      });
  }
  return businessTablesReady;
}

// Ships after the phase-1 tables, so it needs its own guard — environments
// that already have biz_assumptions would otherwise never create it.
let eventCostsReady: Promise<void> | null = null;

export function ensureEventCostsTable(): Promise<void> {
  if (!eventCostsReady) {
    eventCostsReady = tableExists("biz_event_costs")
      .then(async (exists) => {
        if (exists) return;
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS biz_event_costs (
            source_event_id integer PRIMARY KEY,
            venue_cost_per_attendee numeric NOT NULL DEFAULT 0,
            other_expenses numeric NOT NULL DEFAULT 0,
            email_signups integer NOT NULL DEFAULT 0,
            instagram_followers_gained integer NOT NULL DEFAULT 0,
            updated_at timestamptz DEFAULT now()
          )
        `);
        await db.execute(sql`ALTER TABLE biz_event_costs ENABLE ROW LEVEL SECURITY`);
      })
      .catch((err) => {
        eventCostsReady = null;
        throw err;
      });
  }
  return eventCostsReady;
}

// Advisor chat tables ship after the phase-1 tables, so they need their own
// guard — environments that already have biz_assumptions would otherwise
// never create them.
let advisorTablesReady: Promise<void> | null = null;

export function ensureAdvisorTables(): Promise<void> {
  if (!advisorTablesReady) {
    advisorTablesReady = tableExists("biz_conversations")
      .then(async (exists) => {
        if (exists) return;
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS biz_conversations (
            id serial PRIMARY KEY,
            title text NOT NULL DEFAULT 'New conversation',
            created_at timestamptz NOT NULL DEFAULT now()
          )
        `);
        await db.execute(sql`ALTER TABLE biz_conversations ENABLE ROW LEVEL SECURITY`);
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS biz_messages (
            id serial PRIMARY KEY,
            conversation_id integer NOT NULL REFERENCES biz_conversations(id) ON DELETE CASCADE,
            role text NOT NULL,
            content text NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now()
          )
        `);
        await db.execute(sql`ALTER TABLE biz_messages ENABLE ROW LEVEL SECURITY`);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_biz_messages_conversation_id ON biz_messages (conversation_id)`);
      })
      .catch((err) => {
        advisorTablesReady = null;
        throw err;
      });
  }
  return advisorTablesReady;
}
