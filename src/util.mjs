// Small shared helpers. Dates are handled as "YYYY-MM-DD" keys and integer day numbers (UTC)
// so results never depend on the machine's time zone.

export const DAY = 86400000;

/** "2026-03-01" -> integer day number (days since 1970-01-01, UTC). */
export const dayNum = (key) =>
  Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10)) / DAY;

/** integer day number -> "YYYY-MM-DD". */
export const keyFromNum = (n) => new Date(n * DAY).toISOString().slice(0, 10);

/** 0 = Sunday … 6 = Saturday. */
export const weekdayOf = (n) => new Date(n * DAY).getUTCDay();

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const hourLabel = (h) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;

export const fmt = (n) => Number(n).toLocaleString("en-US");

export const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** "2026-03-01" -> "Mar 1, 2026" */
export function prettyDate(key) {
  return `${MONTHS[+key.slice(5, 7) - 1]} ${+key.slice(8, 10)}, ${key.slice(0, 4)}`;
}

export const plural = (n, one, many = one + "s") => `${fmt(n)} ${n === 1 ? one : many}`;
