import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

// Lazy-create ensure functions must check the catalog before running any DDL:
// ALTER TABLE (ENABLE ROW LEVEL SECURITY, ADD COLUMN IF NOT EXISTS) takes an
// ACCESS EXCLUSIVE lock even as a no-op, and running it on every serverless
// cold start queues those locks behind live traffic — under load that starves
// the pool and requests hang until the function times out.
export async function tableExists(tablename: string): Promise<boolean> {
  const rows = await db.execute(
    sql`SELECT 1 FROM pg_catalog.pg_tables WHERE schemaname = 'public' AND tablename = ${tablename}`,
  );
  return (rows as unknown as unknown[]).length > 0;
}
