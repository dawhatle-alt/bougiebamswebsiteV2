import { sql, eq, and, isNull } from "drizzle-orm";
import {
  db,
  eventsTable,
  registrationsTable,
  siteSettingsTable,
  subscribersTable,
} from "@workspace/db";
import { tableExists } from "./dbBootstrap";
import { sendEventFollowupEmail } from "./email";
import { subscribeEmail, getBusinessAddress } from "./marketingList";
import { logger } from "./logger";

// Automated thank-you sent after each event: photos, an invitation onto the
// email list, and the next event. Commercial mail, so it goes out through the
// marketing path — opt-outs suppressed, unsubscribe footer, postal address.

export interface FollowupConfig {
  enabled: boolean;
  /** Hours after the event date before sending. */
  hoursAfter: number;
  subject: string;
  body: string;
  /** Optional discount code to feature. Blank = no offer block. */
  discountCode: string;
  discountBlurb: string;
}

export const DEFAULT_FOLLOWUP: FollowupConfig = {
  enabled: false,
  hoursAfter: 20,
  subject: "Thank you for joining us at {{event}}!",
  body: `Hi {{name}},

Thank you for spending your afternoon with us at {{event}} — it wouldn't have been the same without you.

We'll be posting photos from the day on our Community Moments page, so keep an eye out for yourself at the table.

We'd love to see you at the next one — you can always find what's coming up at bougiebams.com/events.

See you at the table,
Patsy
BougieBams`,
  discountCode: "",
  discountBlurb: "As a thank you, here's a little something for your next order:",
};

const CONFIG_KEY = "event_followup_config";

export async function getFollowupConfig(): Promise<FollowupConfig> {
  try {
    const [row] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, CONFIG_KEY));
    if (!row?.value) return DEFAULT_FOLLOWUP;
    const parsed = JSON.parse(row.value) as Partial<FollowupConfig>;
    return { ...DEFAULT_FOLLOWUP, ...parsed };
  } catch {
    return DEFAULT_FOLLOWUP;
  }
}

export async function saveFollowupConfig(cfg: FollowupConfig): Promise<void> {
  await db
    .insert(siteSettingsTable)
    .values({ key: CONFIG_KEY, value: JSON.stringify(cfg) })
    .onConflictDoUpdate({ target: siteSettingsTable.key, set: { value: JSON.stringify(cfg) } });
}

// Records which events have been followed up, so a re-run never double-sends.
let followupTableReady: Promise<void> | null = null;

export function ensureFollowupTable(): Promise<void> {
  if (!followupTableReady) {
    followupTableReady = tableExists("event_followups")
      .then(async (exists) => {
        if (exists) return;
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS event_followups (
            event_id integer PRIMARY KEY,
            sent_at timestamptz NOT NULL DEFAULT now(),
            recipients integer NOT NULL DEFAULT 0
          )
        `);
        await db.execute(sql`ALTER TABLE event_followups ENABLE ROW LEVEL SECURITY`);
      })
      .catch((err) => {
        followupTableReady = null;
        throw err;
      });
  }
  return followupTableReady;
}

/** Event dates are free text ("2026-07-14" or "August 3, 2026"). */
function eventDateMs(d: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d ?? "");
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
  const t = Date.parse(d ?? "");
  return Number.isNaN(t) ? null : t;
}

const fill = (tpl: string, vars: Record<string, string>) =>
  tpl.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? "");

export interface FollowupRunResult {
  eventsProcessed: number;
  emailsSent: number;
  skipped: string[];
}

/**
 * Sends the follow-up for every event that finished at least `hoursAfter` ago
 * and hasn't been followed up yet. Safe to call repeatedly — each event is
 * claimed in event_followups before any mail goes out.
 */
export async function runEventFollowups(opts: { force?: number } = {}): Promise<FollowupRunResult> {
  const cfg = await getFollowupConfig();
  const result: FollowupRunResult = { eventsProcessed: 0, emailsSent: 0, skipped: [] };
  if (!cfg.enabled && opts.force == null) {
    result.skipped.push("Follow-ups are turned off");
    return result;
  }

  await ensureFollowupTable();
  const events = await db.select().from(eventsTable);
  const doneRows = await db.execute<{ event_id: number }>(sql`SELECT event_id FROM event_followups`);
  const done = new Set((doneRows as unknown as { event_id: number }[]).map((r) => Number(r.event_id)));
  const cutoff = Date.now() - cfg.hoursAfter * 3600 * 1000;
  const address = await getBusinessAddress();

  for (const evt of events) {
    if (opts.force != null && evt.id !== opts.force) continue;
    if (done.has(evt.id)) continue;
    const ms = eventDateMs(evt.date);
    if (ms == null) continue;
    if (opts.force == null && ms > cutoff) continue; // hasn't finished long enough ago

    // Claim the event first: if sending dies halfway we won't spam on retry.
    try {
      await db.execute(sql`INSERT INTO event_followups (event_id, recipients) VALUES (${evt.id}, 0)`);
    } catch {
      continue; // another run already claimed it
    }
    result.eventsProcessed += 1;

    const regs = await db
      .select({ name: registrationsTable.name, email: registrationsTable.email })
      .from(registrationsTable)
      .where(and(eq(registrationsTable.eventId, evt.id), eq(registrationsTable.status, "confirmed")));

    const seen = new Set<string>();
    let sent = 0;
    for (const reg of regs) {
      const email = reg.email?.trim().toLowerCase();
      if (!email || seen.has(email)) continue;
      seen.add(email);

      // Everyone gets a working opt-out, which means a subscriber row. Attending
      // is the business relationship that makes this mail permissible; the row
      // is what lets them stop it.
      let token: string;
      try {
        const sub = await subscribeEmail({ email: reg.email, name: reg.name, source: "event_followup" });
        token = sub.token;
      } catch (err) {
        logger.error({ err, eventId: evt.id }, "Follow-up: could not prepare subscriber record");
        continue;
      }

      // Anyone who opted out is skipped — subscribeEmail returns their row but
      // never resurrects consent for an automated send.
      const [optedOut] = await db
        .select({ id: subscribersTable.id })
        .from(subscribersTable)
        .where(
          sql`lower(${subscribersTable.email}) = ${email} AND ${subscribersTable.unsubscribedAt} IS NOT NULL`,
        )
        .limit(1);
      if (optedOut) continue;

      const vars = {
        name: (reg.name ?? "").split(" ")[0] || "there",
        event: evt.title,
        date: evt.date,
      };
      try {
        await sendEventFollowupEmail({
          to: reg.email,
          subject: fill(cfg.subject, vars),
          body: fill(cfg.body, vars),
          discountCode: cfg.discountCode.trim(),
          discountBlurb: cfg.discountBlurb,
          unsubscribeToken: token,
          postalAddress: address,
        });
        sent += 1;
      } catch (err) {
        logger.error({ err, eventId: evt.id }, "Follow-up email failed for one recipient");
      }
    }

    await db.execute(sql`UPDATE event_followups SET recipients = ${sent} WHERE event_id = ${evt.id}`);
    result.emailsSent += sent;
    logger.info({ eventId: evt.id, sent }, "Event follow-up sent");
  }

  return result;
}

/** Events that have finished, with whether a follow-up already went out. */
export async function listFollowupStatus() {
  await ensureFollowupTable();
  const events = await db.select().from(eventsTable).where(eq(eventsTable.archived, false));
  const rows = await db.execute<{ event_id: number; sent_at: string; recipients: number }>(
    sql`SELECT event_id, sent_at, recipients FROM event_followups`,
  );
  const byId = new Map(
    (rows as unknown as { event_id: number; sent_at: string; recipients: number }[]).map((r) => [
      Number(r.event_id),
      r,
    ]),
  );
  const now = Date.now();
  return events
    .map((e) => {
      const ms = eventDateMs(e.date);
      const rec = byId.get(e.id);
      return {
        eventId: e.id,
        title: e.title,
        date: e.date,
        past: ms != null && ms < now,
        sentAt: rec?.sent_at ?? null,
        recipients: rec?.recipients ?? 0,
      };
    })
    .filter((e) => e.past)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}
