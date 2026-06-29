const CT = "America/Chicago";

export function formatDateCT(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: CT,
  });
}

export function formatDateShortCT(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: CT,
  });
}

export function formatDateFullCT(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: CT,
  });
}

export function formatTimeCT(date: Date | string): string {
  return new Date(date).toLocaleTimeString("en-US", {
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
