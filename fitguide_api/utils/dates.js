/**
 * Calendar-date helpers. Streaks, schedules and body metrics are about the
 * user's local days, so the client passes its UTC offset (the value of
 * Date#getTimezoneOffset(), in minutes) as ?tzOffset=.
 * Dates are 'YYYY-MM-DD' strings throughout.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const YMD = /^\d{4}-\d{2}-\d{2}$/;

/** Read ?tzOffset= from a request, clamped to real-world offsets. Defaults to UTC. */
function tzOffsetFrom(req) {
  const value = Number.parseInt(req.query.tzOffset, 10);
  if (!Number.isFinite(value)) return 0;
  return Math.max(-840, Math.min(840, value));
}

/** The user's local calendar date for an instant. */
function localDate(instant, tzOffset = 0) {
  return new Date(new Date(instant).getTime() - tzOffset * 60 * 1000).toISOString().slice(0, 10);
}

const today = (tzOffset = 0) => localDate(Date.now(), tzOffset);

function addDays(ymd, days) {
  return new Date(Date.parse(`${ymd}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from a to b (b - a). */
function daysBetween(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
}

/** True for a real calendar date in YYYY-MM-DD form (rejects 2026-02-30). */
function isValidYmd(value) {
  if (typeof value !== 'string' || !YMD.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

module.exports = { tzOffsetFrom, localDate, today, addDays, daysBetween, isValidYmd };
