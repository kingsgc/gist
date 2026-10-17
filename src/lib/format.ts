/** Small formatting helpers. */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Compact "time ago" — 5m, 3h, 2d, else a short date. */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  if (diff < MINUTE) return "now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d`;
  return new Date(then).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
  });
}

/** Compact counts — 999, 1.2k, 45k. */
export function compactCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}m`;
}

/** First grapheme-ish character of a handle, for the avatar bubble. */
export function initials(handle: string): string {
  return (handle.trim()[0] ?? "?").toUpperCase();
}
