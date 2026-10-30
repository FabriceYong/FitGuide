/**
 * Daily health numbers (steps, resting heart rate, sleep, active calories)
 * from manual entry, CSV import, connected services and the phone's health
 * store (Apple Health / Health Connect, sent by the mobile app), merged per
 * day; and blood pressure readings.
 */
const { prisma } = require('../db/prisma');
const { addDays, isValidYmd, localDate } = require('../utils/dates');

// The phone health stores the mobile app reads and uploads.
const PHONE_SOURCES = ['apple_health', 'health_connect'];
// For each field, the first source that has a value wins. The phone's store
// already merges the watch, phone and other apps, so it comes before Fitbit.
const SOURCE_PRIORITY = ['manual', ...PHONE_SOURCES, 'fitbit', 'csv', 'strava'];
const FIELDS = ['steps', 'restingHr', 'sleepMinutes', 'activeCalories'];
const RANGES = { steps: [0, 100000], restingHr: [25, 220], sleepMinutes: [0, 1440], activeCalories: [0, 10000] };
const MAX_CSV_ROWS = 1000;
const MAX_SYNC_DAYS = 31;
const MAX_SYNC_READINGS = 500;
const BP_RANGES = { systolic: [60, 260], diastolic: [30, 160], pulse: [25, 220] };
const BP_HISTORY_DAYS = 90;

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

/**
 * The American Heart Association category for a reading (adults): the higher
 * of the two numbers' categories.
 */
function bpCategory({ systolic, diastolic }) {
  if (systolic > 180 || diastolic > 120) return 'crisis';
  if (systolic >= 140 || diastolic >= 90) return 'high_2';
  if (systolic >= 130 || diastolic >= 80) return 'high_1';
  if (systolic >= 120) return 'elevated';
  return 'normal';
}

const bpPublic = (r) => ({
  id: r.id,
  measuredAt: r.measuredAt.toISOString(),
  date: r.date,
  systolic: r.systolic,
  diastolic: r.diastolic,
  pulse: r.pulse,
  source: r.source,
  category: bpCategory(r),
});

/** Last `days` days merged, with today and 7-day averages, and blood pressure. */
async function summary(userId, todayYmd, days = 30) {
  const start = addDays(todayYmd, -(days - 1));
  const [rows, readings] = await Promise.all([
    prisma.dailyMetric.findMany({ where: { userId, date: { gte: start, lte: todayYmd } } }),
    prisma.bloodPressureReading.findMany({
      where: { userId, date: { gte: addDays(todayYmd, -(Math.max(days, BP_HISTORY_DAYS) - 1)) } },
      orderBy: { measuredAt: 'desc' },
      take: 100,
    }),
  ]);
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
    bloodPressure: { latest: readings[0] ? bpPublic(readings[0]) : null, readings: readings.map(bpPublic) },
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

/** Check one blood pressure reading; returns { data } or { error }. */
function cleanReading(fields) {
  const data = {};
  for (const [field, [min, max]] of Object.entries(BP_RANGES)) {
    const value = fields[field];
    if (value === undefined || value === null || value === '') {
      if (field === 'pulse') continue;
      return { error: `${field} is required` };
    }
    const n = Number(value);
    if (!Number.isFinite(n) || n < min || n > max) return { error: `${field} must be between ${min} and ${max}` };
    data[field] = Math.round(n);
  }
  if (data.systolic <= data.diastolic) return { error: 'The top number (systolic) must be higher than the bottom number (diastolic)' };
  return { data };
}

/** When a reading was taken: a valid instant not in the future (with a little clock skew). */
function readingTime(value, now = Date.now()) {
  const at = value == null || value === '' ? new Date(now) : new Date(value);
  if (Number.isNaN(at.getTime())) return { error: 'measuredAt must be a date and time' };
  if (at.getTime() > now + 5 * 60 * 1000) return { error: 'measuredAt cannot be in the future' };
  return { at };
}

/** A reading the user typed in. */
async function addBloodPressure(userId, fields, tzOffset) {
  const { data, error } = cleanReading(fields);
  if (error) throw new HealthDataError(error);
  const { at, error: timeError } = readingTime(fields.measuredAt);
  if (timeError) throw new HealthDataError(timeError);
  const row = await prisma.bloodPressureReading.upsert({
    where: { userId_source_measuredAt: { userId, source: 'manual', measuredAt: at } },
    create: { ...data, userId, source: 'manual', measuredAt: at, date: localDate(at, tzOffset) },
    update: data,
  });
  return bpPublic(row);
}

async function deleteBloodPressure(userId, id) {
  const { count } = await prisma.bloodPressureReading.deleteMany({ where: { id: String(id), userId } });
  return count === 1;
}

/**
 * What the mobile app read from the phone's health store:
 *   { source, days: [{ date, steps?, restingHr?, sleepMinutes?, activeCalories? }],
 *     bloodPressure: [{ measuredAt, systolic, diastolic, pulse? }] }
 * Each day replaces that day's numbers from this source (the store's totals
 * are the latest truth); readings are added once each.
 */
async function syncFromPhone(userId, input, todayYmd, tzOffset) {
  const { source } = input || {};
  if (!PHONE_SOURCES.includes(source)) throw new HealthDataError(`source must be one of: ${PHONE_SOURCES.join(', ')}`);
  const days = Array.isArray(input.days) ? input.days : [];
  const readings = Array.isArray(input.bloodPressure) ? input.bloodPressure : [];
  if (days.length > MAX_SYNC_DAYS) throw new HealthDataError(`Send up to ${MAX_SYNC_DAYS} days at a time.`);
  if (readings.length > MAX_SYNC_READINGS) throw new HealthDataError(`Send up to ${MAX_SYNC_READINGS} readings at a time.`);

  const errors = [];
  let savedDays = 0;
  for (const [i, day] of days.entries()) {
    if (!isValidYmd(day?.date)) { errors.push(`days[${i}]: date must be YYYY-MM-DD`); continue; }
    if (day.date > todayYmd) { errors.push(`days[${i}]: date is in the future`); continue; }
    const values = Object.fromEntries(FIELDS.filter((f) => day[f] != null).map((f) => [f, day[f]]));
    // A day with nothing in the store clears what this source said before.
    if (!Object.keys(values).length) {
      await prisma.dailyMetric.deleteMany({ where: { userId, date: day.date, source } });
      continue;
    }
    const { data, error } = clean(values);
    if (error) { errors.push(`days[${i}]: ${error}`); continue; }
    const full = { ...Object.fromEntries(FIELDS.map((f) => [f, null])), ...data };
    await saveDay(userId, day.date, source, full);
    savedDays += 1;
  }

  let savedReadings = 0;
  for (const [i, reading] of readings.entries()) {
    const { data, error } = cleanReading(reading || {});
    const { at, error: timeError } = readingTime(reading?.measuredAt);
    if (error || timeError || reading?.measuredAt == null) {
      errors.push(`bloodPressure[${i}]: ${error || timeError || 'measuredAt is required'}`);
      continue;
    }
    await prisma.bloodPressureReading.upsert({
      where: { userId_source_measuredAt: { userId, source, measuredAt: at } },
      create: { ...data, userId, source, measuredAt: at, date: localDate(at, tzOffset) },
      update: data,
    });
    savedReadings += 1;
  }
  return { days: savedDays, readings: savedReadings, skipped: errors.length, errors: errors.slice(0, 20) };
}

module.exports = {
  HealthDataError,
  PHONE_SOURCES,
  mergeByDate,
  summary,
  saveManual,
  importCsv,
  splitCsvLine,
  bpCategory,
  addBloodPressure,
  deleteBloodPressure,
  syncFromPhone,
};
