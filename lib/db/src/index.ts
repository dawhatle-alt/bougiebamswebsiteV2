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
  // A few connections per instance: Vercel Fluid serves concurrent requests
  // from one instance, and queries pipelined together onto a single wire stall
  // behind Supavisor's transaction-mode pooler. Transaction mode multiplexes
  // client connections across the server-side pool, so a handful per instance
  // is cheap; DO NOT point DATABASE_URL back at session mode (port 5432),
  // which pins one server slot per client connection (EMAXCONNSESSION).
  max: 3,
  idle_timeout: 10,
  connect_timeout: 5,
});

export const db = drizzle(client, { schema });

export * from "./schema";

