const units = ["KB", "MB", "GB"] as const;

const formatter = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });

/** Formats a byte count for people, e.g. "512 B", "1.5 KB", or "10 MB" (1024 base). */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${formatter.format(value)} ${units[unit]}`;
}
