const dayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

const pad = (n) => String(n).padStart(2, "0");

export function dayHeading(iso) {
  return dayFormatter.format(new Date(iso));
}

export function timeRange(startIso, endIso) {
  return `${timeFormatter.format(new Date(startIso))} – ${timeFormatter.format(new Date(endIso))}`;
}

export function dayKey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function fullTimestamp(iso) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function durationMinutes(startIso, endIso) {
  return Math.round((new Date(endIso) - new Date(startIso)) / 60000);
}

// Old bookings have long ids (bk_<uuid>); show them shortened. New ids are
// already short and are shown as-is. The full id is what gets copied/used.
export function shortRef(id) {
  return id.length <= 16 ? id : `${id.slice(0, 8)}…${id.slice(-4)}`;
}

export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

// Date helpers for the admin form (all in the viewer's local time).
export function ymd(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
export function localDate(iso) {
  return ymd(new Date(iso));
}
export function localTime(iso) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function toIso(ymdStr, hm, addMinutes = 0) {
  const [y, m, d] = ymdStr.split("-").map(Number);
  const [h, min] = hm.split(":").map(Number);
  return new Date(y, m - 1, d, h, min + addMinutes).toISOString();
}
