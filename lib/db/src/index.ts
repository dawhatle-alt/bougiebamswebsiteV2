import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ?? process.env.SUPABASE_DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL or SUPABASE_DATABASE_URL must be set.");
}

const needsSSL =
  connectionString.includes("supabase.com") ||
  process.env.NODE_ENV === "production";

const client = postgres(connectionString, {
  ssl: needsSSL ? { rejectUnauthorized: false } : false,
  prepare: false,
  // One connection per serverless instance: Vercel scales by spawning
  // instances, and the Supabase pooler caps concurrent clients (pool_size 15
  // in session mode) — two connections per instance halves how many
  // instances fit before EMAXCONNSESSION errors. postgres.js queues
  // concurrent queries on the single connection.
  max: 1,
  idle_timeout: 10,
  connect_timeout: 5,
});

export const db = drizzle(client, { schema });

export * from "./schema";

