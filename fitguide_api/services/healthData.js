/**
 * Daily health numbers (steps, resting heart rate, sleep, active calories)
 * from manual entry, CSV import and connected services, merged per day.
 */
const { prisma } = require('../db/prisma');
const { addDays, isValidYmd } = require('../utils/dates');

// For each field, the first source that has a value wins.
const SOURCE_PRIORITY = ['manual', 'fitbit', 'csv', 'strava'];
const FIELDS = ['steps', 'restingHr', 'sleepMinutes', 'activeCalories'];
const RANGES = { steps: [0, 100000], restingHr: [25, 220], sleepMinutes: [0, 1440], activeCalories: [0, 10000] };
const MAX_CSV_ROWS = 1000;

class HealthDataError extends Error {}

/** One merged row per date, oldest first. */
function mergeByDate(rows) {
  const byDate = new Map();
  const rank = (source) => {
    const i = SOURCE_PRIORITY.indexOf(source);
    return i === -1 ? SOURCE_PRIORITY.length : i;
  };
  for (const row of [...rows].sort((a, b) => rank(a.source) - rank(b.source))) {
    const merged = byDate.get(row.date) || { date: row.date, sources: [] };
    for (const field of FIELDS) {
      if (merged[field] == null && row[field] != null) merged[field] = row[field];
    }
    if (!merged.sources.includes(row.source)) merged.sources.push(row.source);
    byDate.set(row.date, merged);
  }
  return [...byDate.values()]
    .map((d) => ({ ...Object.fromEntries(FIELDS.map((f) => [f, d[f] ?? null])), date: d.date, sources: d.sources }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

const average = (values) => {
  const present = values.filter((v) => v != null);
  return present.length ? Math.round(present.reduce((a, b) => a + b, 0) / present.length) : null;
};

/** Last `days` days merged, with today and 7-day averages. */
async function summary(userId, todayYmd, days = 30) {
  const start = addDays(todayYmd, -(days - 1));
  const rows = await prisma.dailyMetric.findMany({ where: { userId, date: { gte: start, lte: todayYmd } } });
  const merged = mergeByDate(rows);
  const lastWeek = merged.filter((d) => d.date > addDays(todayYmd, -7));
  const latestHr = [...merged].reverse().find((d) => d.restingHr != null);
  return {
    days: merged,
    today: merged.find((d) => d.date === todayYmd) || null,
    weekAverage: {
      steps: average(lastWeek.map((d) => d.steps)),
      sleepMinutes: average(lastWeek.map((d) => d.sleepMinutes)),
      activeCalories: average(lastWeek.map((d) => d.activeCalories)),
    },
    latestRestingHr: latestHr ? { value: latestHr.restingHr, date: latestHr.date } : null,
  };
}

/** Check and clean one day's numbers; returns { data } or { error }. */
function clean(fields) {
  const data = {};
  for (const field of FIELDS) {
    const value = fields[field];
    if (value === undefined || value === null || value === '') continue;
    const n = Number(value);
    const [min, max] = RANGES[field];
    if (!Number.isFinite(n) || n < min || n > max) return { error: `${field} must be between ${min} and ${max}` };
    data[field] = Math.round(n);
  }
  if (!Object.keys(data).length) return { error: 'Enter at least one value' };
  return { data };
}

async function saveDay(userId, date, source, data) {
  await prisma.dailyMetric.upsert({
    where: { userId_date_source: { userId, date, source } },
    create: { ...data, userId, date, source },
    update: data,
  });
}

/** Manual entry for one day (merges into that day's manual row). */
async function saveManual(userId, date, fields) {
  const { data, error } = clean(fields);
  if (error) throw new HealthDataError(error);
  await saveDay(userId, date, 'manual', data);
}

const COLUMN_ALIASES = {
  date: 'date',
  day: 'date',
  steps: 'steps',
  step_count: 'steps',
  resting_hr: 'restingHr',
  resting_heart_rate: 'restingHr',
  restinghr: 'restingHr',
  sleep_minutes: 'sleepMinutes',
  sleep_hours: 'sleepHours',
  active_calories: 'activeCalories',
  active_energy: 'activeCalories',
};

/** Split one CSV line, honouring double quotes. */
function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i += 1; } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',' || ch === ';') { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/**
 * Import daily numbers from CSV text with a header row, e.g.
 *   date,steps,resting_hr,sleep_hours,active_calories
 * Dates are YYYY-MM-DD. Rows for the same day replace earlier CSV imports.
 */
async function importCsv(userId, text, todayYmd) {
  const lines = String(text).replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new HealthDataError('The file needs a header row and at least one row of data.');
  if (lines.length - 1 > MAX_CSV_ROWS) throw new HealthDataError(`Import up to ${MAX_CSV_ROWS} days at a time.`);

  const header = splitCsvLine(lines[0]).map((h) => COLUMN_ALIASES[h.toLowerCase().replace(/[\s-]+/g, '_')] || null);
  if (!header.includes('date')) throw new HealthDataError('The header needs a "date" column.');
  if (!header.some((h) => h && h !== 'date')) throw new HealthDataError('Add at least one of: steps, resting_hr, sleep_hours, sleep_minutes, active_calories.');

  let imported = 0;
  const errors = [];
  for (const [index, line] of lines.slice(1).entries()) {
    const cells = splitCsvLine(line);
    const row = {};
    header.forEach((key, i) => { if (key) row[key] = cells[i]; });
    const lineNo = index + 2;
    if (!isValidYmd(row.date)) { errors.push(`Line ${lineNo}: date must be YYYY-MM-DD`); continue; }
    if (row.date > todayYmd) { errors.push(`Line ${lineNo}: date is in the future`); continue; }
    if (row.sleepHours !== undefined && row.sleepHours !== '' && row.sleepMinutes === undefined) {
      row.sleepMinutes = Number(row.sleepHours) * 60;
    }
    delete row.sleepHours;
    const { data, error } = clean(row);
    if (error) { errors.push(`Line ${lineNo}: ${error}`); continue; }
    await saveDay(userId, row.date, 'csv', data);
    imported += 1;
  }
  return { imported, skipped: errors.length, errors: errors.slice(0, 20) };
}

module.exports = { HealthDataError, mergeByDate, summary, saveManual, importCsv, splitCsvLine };
