const units = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["week", 7 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
  ["second", 1],
] as const;

const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** Formats an ISO timestamp relative to `now`, e.g. "2 hours ago" or "yesterday". */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const seconds = Math.round((Date.parse(iso) - now) / 1000);
  if (Number.isNaN(seconds)) return "";
  const magnitude = Math.abs(seconds);
  if (magnitude < 45) return formatter.format(0, "second");
  for (const [unit, size] of units)
    if (magnitude >= size) return formatter.format(Math.round(seconds / size), unit);
  return formatter.format(0, "second");
}

/** Formats an ISO timestamp as an absolute local date and time for titles. */
export function formatAbsoluteTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" });
}
