import { eq } from "drizzle-orm";
import { db, subscribersTable, registrationsTable, eventsTable, ordersTable } from "@workspace/db";
import { tableExists } from "./dbBootstrap";

// Audience segments for email campaigns. Every segment is filtered against the
// opt-out list before it leaves this module — including the ones built from
// registrations and orders rather than the subscriber table, since someone who
// unsubscribed is still an attendee and would otherwise reappear here.

export type SegmentKey =
  | "subscribers"
  | "attendees_not_subscribed"
  | "repeat_attendees"
  | "attendees_never_bought"
  | "buyers_never_attended"
  | "event_attendees";

export interface SegmentDef {
  key: SegmentKey;
  label: string;
  description: string;
  /** Needs an event id to build. */
  needsEvent?: boolean;
}

export const SEGMENTS: SegmentDef[] = [
  {
    key: "subscribers",
    label: "All subscribers",
    description: "Everyone on the email list who hasn't opted out.",
  },
  {
    key: "attendees_not_subscribed",
    label: "Attendees not on the list",
    description: "People who attended an event but never joined the email list — your biggest growth pool.",
  },
  {
    key: "repeat_attendees",
    label: "Repeat attendees",
    description: "Attended two or more events. Your most loyal guests.",
  },
  {
    key: "attendees_never_bought",
    label: "Attendees who never bought",
    description: "Played at an event but never purchased a product. Prime cross-sell audience.",
  },
  {
    key: "buyers_never_attended",
    label: "Buyers who never attended",
    description: "Bought a product but never came to an event. Invite them to one.",
  },
  {
    key: "event_attendees",
    label: "Attendees of one event",
    description: "Everyone confirmed for a specific event — for follow-ups and reminders.",
    needsEvent: true,
  },
];

export interface SegmentRow {
  name: string;
  email: string;
  eventsAttended: number;
  lastEvent: string;
  lastEventDate: string;
  orders: number;
  totalSpent: number;
  onList: boolean;
  source: string;
}

interface OrderItemLike {
  name?: string;
}

const norm = (e: string) => e.trim().toLowerCase();

/** Builds a segment's recipient rows, newest-engagement first. */
export async function buildSegment(key: SegmentKey, eventId?: number): Promise<SegmentRow[]> {
  // Sequential queries on purpose (transaction pooler).
  const subs = await db.select().from(subscribersTable);
  const events = await db.select({ id: eventsTable.id, title: eventsTable.title, date: eventsTable.date }).from(eventsTable);
  const regs = await db
    .select({
      email: registrationsTable.email,
      name: registrationsTable.name,
      eventId: registrationsTable.eventId,
      status: registrationsTable.status,
      createdAt: registrationsTable.createdAt,
    })
    .from(registrationsTable)
    .where(eq(registrationsTable.status, "confirmed"));
  const hasOrders = await tableExists("orders");
  const orders = hasOrders
    ? await db
        .select({
          email: ordersTable.buyerEmail,
          name: ordersTable.buyerName,
          totalCents: ordersTable.totalCents,
          kind: ordersTable.kind,
          items: ordersTable.items,
        })
        .from(ordersTable)
    : [];

  const eventById = new Map(events.map((e) => [e.id, e]));

  // Anyone who opted out is removed from every segment, no exceptions.
  const optedOut = new Set(subs.filter((s) => s.unsubscribedAt).map((s) => norm(s.email)));
  const subByEmail = new Map(subs.map((s) => [norm(s.email), s]));

  interface Agg {
    name: string;
    email: string;
    eventIds: Set<number>;
    lastEventAt: number;
    lastEvent: string;
    lastEventDate: string;
    orders: number;
    totalSpent: number;
  }
  const people = new Map<string, Agg>();

  const get = (email: string, name: string): Agg => {
    const k = norm(email);
    let p = people.get(k);
    if (!p) {
      p = { name, email: email.trim(), eventIds: new Set(), lastEventAt: 0, lastEvent: "", lastEventDate: "", orders: 0, totalSpent: 0 };
      people.set(k, p);
    }
    // Prefer a real name over a blank one.
    if (!p.name && name) p.name = name;
    return p;
  };

  for (const r of regs) {
    if (!r.email?.trim()) continue;
    const p = get(r.email, r.name ?? "");
    p.eventIds.add(r.eventId);
    const at = r.createdAt.getTime();
    if (at >= p.lastEventAt) {
      p.lastEventAt = at;
      const evt = eventById.get(r.eventId);
      p.lastEvent = evt?.title ?? "";
      p.lastEventDate = evt?.date ?? "";
    }
  }

  for (const o of orders) {
    if (!o.email?.trim()) continue;
    // Event tickets bought through Square aren't product purchases.
    if (o.kind === "event") continue;
    const p = get(o.email, o.name ?? "");
    p.orders += 1;
    p.totalSpent += o.totalCents / 100;
  }

  const attendedIds = (p: Agg) => p.eventIds.size;
  const all = [...people.entries()];

  let picked: [string, Agg][];
  switch (key) {
    case "subscribers":
      // Driven by the subscriber table, so people who joined the list without
      // ever registering or buying are included.
      picked = subs
        .filter((s) => !s.unsubscribedAt)
        .map((s) => {
          const k = norm(s.email);
          const agg = people.get(k) ?? {
            name: s.name ?? "",
            email: s.email,
            eventIds: new Set<number>(),
            lastEventAt: 0,
            lastEvent: "",
            lastEventDate: "",
            orders: 0,
            totalSpent: 0,
          };
          return [k, agg] as [string, Agg];
        });
      break;
    case "attendees_not_subscribed":
      picked = all.filter(([k, p]) => attendedIds(p) > 0 && !subByEmail.has(k));
      break;
    case "repeat_attendees":
      picked = all.filter(([, p]) => attendedIds(p) >= 2);
      break;
    case "attendees_never_bought":
      picked = all.filter(([, p]) => attendedIds(p) > 0 && p.orders === 0);
      break;
    case "buyers_never_attended":
      picked = all.filter(([, p]) => p.orders > 0 && attendedIds(p) === 0);
      break;
    case "event_attendees":
      picked = eventId ? all.filter(([, p]) => p.eventIds.has(eventId)) : [];
      break;
    default:
      picked = [];
  }

  return picked
    .filter(([k]) => !optedOut.has(k))
    .map(([k, p]) => {
      const sub = subByEmail.get(k);
      return {
        name: p.name,
        email: p.email,
        eventsAttended: p.eventIds.size,
        lastEvent: p.lastEvent,
        lastEventDate: p.lastEventDate,
        orders: p.orders,
        totalSpent: p.totalSpent,
        onList: !!sub,
        source: sub?.source ?? "",
      };
    })
    .sort((a, b) => b.eventsAttended - a.eventsAttended || b.totalSpent - a.totalSpent);
}

export async function segmentCounts(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const seg of SEGMENTS) {
    if (seg.needsEvent) continue;
    out[seg.key] = (await buildSegment(seg.key)).length;
  }
  return out;
}

export function segmentCsv(rows: SegmentRow[]): string {
  const header = [
    "Name", "Email", "Events Attended", "Last Event", "Last Event Date",
    "Product Orders", "Total Spent", "On Email List", "Source",
  ];
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = rows.map((r) => [
    r.name, r.email, r.eventsAttended, r.lastEvent, r.lastEventDate,
    r.orders, r.totalSpent.toFixed(2), r.onList ? "Yes" : "No", r.source,
  ]);
  return [header, ...lines].map((row) => row.map(esc).join(",")).join("\n");
}
