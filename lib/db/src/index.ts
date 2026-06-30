import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let poolConfig: pg.PoolConfig;

if (process.env.SUPABASE_DATABASE_URL) {
  poolConfig = {
    host: "aws-1-us-east-2.pooler.supabase.com",
    port: 5432,
    user: "postgres.gsnljjezxlfjlxtdtrpu",
    password: process.env.SUPABASE_DB_PASSWORD,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  };
} else if (process.env.DATABASE_URL) {
  poolConfig = { connectionString: process.env.DATABASE_URL };
} else {
  throw new Error("SUPABASE_DATABASE_URL must be set.");
}

export const pool = new Pool(poolConfig);
export const db = drizzle(pool, { schema });

export * from "./schema";
