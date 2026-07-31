import { eq, sql } from "drizzle-orm";
import { db, siteSettingsTable } from "@workspace/db";
import { tableExists } from "./dbBootstrap";

// Shared access to the site_settings key/value table. Migrations are applied
// manually (drizzle-kit push doesn't run on deploy), so the table is created
// lazily on first use — but only after a catalog check, because DDL takes an
// ACCESS EXCLUSIVE lock even as a no-op and running it per cold start queues
// those locks behind live traffic.
let settingsTableReady: Promise<void> | null = null;

export function ensureSettingsTable(): Promise<void> {
  if (!settingsTableReady) {
    settingsTableReady = tableExists("site_settings")
      .then(async (exists) => {
        if (exists) return;
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS site_settings (
            key text PRIMARY KEY,
            value text,
            updated_at timestamptz NOT NULL DEFAULT now()
          )
        `);
        await db.execute(sql`ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY`);
      })
      .catch((err) => {
        settingsTableReady = null;
        throw err;
      });
  }
  return settingsTableReady;
}

export async function readSetting(key: string): Promise<string | null> {
  await ensureSettingsTable();
  const rows = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key));
  return rows[0]?.value ?? null;
}

export async function writeSetting(key: string, value: string): Promise<void> {
  await ensureSettingsTable();
  await db
    .insert(siteSettingsTable)
    .values({ key, value })
    .onConflictDoUpdate({ target: siteSettingsTable.key, set: { value, updatedAt: new Date() } });
}
