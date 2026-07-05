const CT = "America/Chicago";

// A bare calendar date ("YYYY-MM-DD") carries no time or zone. `new Date()` parses
// it as UTC midnight, which rolls back to the previous day when rendered in CT
// (UTC-5/-6) — the classic off-by-one. Anchoring it at noon UTC keeps it on the
// same calendar day in any zone within ±11h of UTC. Full timestamps pass through
// unchanged so the time formatters still convert instants correctly.
function toDate(date: Date | string): Date {
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Date(`${date}T12:00:00Z`);
  }
  return new Date(date);
}

// Parse a bare "YYYY-MM-DD" into a *local* calendar date (local midnight) so that
// local-time libraries like date-fns (format, isSameDay) render the exact day
// stored, with no UTC-midnight off-by-one. Use this for local date-math/display;
// use the CT formatters above when you need Central Time output.
export function parseCalendarDate(date: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  return new Date(date);
}

export function formatDateCT(date: Date | string): string {
  return toDate(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: CT,
  });
}

export function formatDateShortCT(date: Date | string): string {
  return toDate(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: CT,
  });
}

export function formatDateFullCT(date: Date | string): string {
  return toDate(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: CT,
  });
}

export function formatTimeCT(date: Date | string): string {
  return toDate(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: CT,
  });
}

export function formatDateTimeCT(date: Date | string): string {
  return `${formatDateShortCT(date)} · ${formatTimeCT(date)}`;
}

export function formatDateTimeFullCT(date: Date | string): string {
  return `${formatDateFullCT(date)} · ${formatTimeCT(date)}`;
}

export function formatTimeRangeCT(start: Date | string, end?: Date | string | null): string {
  const startStr = formatTimeCT(start);
  if (!end) return `${startStr} CT`;
  return `${startStr} – ${formatTimeCT(end)} CT`;
}
