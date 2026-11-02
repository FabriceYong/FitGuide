/**
 * The recap story: a month (or a year) of training in a few numbers, shown
 * as swipeable slides at the start of each month and of each year.
 * Everything comes from what was logged; dates are the member's local ones.
 */
const { prisma } = require('../db/prisma');
const { sessionStore, exerciseStore } = require('../stores/records');
const workoutStore = require('../stores/workoutStore');
const { activityByDate, personalRecords, muscleRegions } = require('./progress');
const { localDate } = require('../utils/dates');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

class RecapError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

/** The period's first and last local dates, its label, and the one before it. */
function period({ month, year }) {
  if (month) {
    const [y, m] = month.split('-').map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const before = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
    return { kind: 'month', key: month, label: `${MONTHS[m - 1]} ${y}`, from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}`, previous: { month: before } };
  }
  return { kind: 'year', key: String(year), label: String(year), from: `${year}-01-01`, to: `${year}-12-31`, previous: { year: year - 1 } };
}

/** The month before the one `todayYmd` is in (what the home card offers). */
function lastMonth(todayYmd) {
  const [y, m] = todayYmd.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

const inRange = (ymd, p) => ymd >= p.from && ymd <= p.to;
const mostCommon = (values) => {
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0] || null;
};

/**
 * A recap for { month: 'YYYY-MM' } or { year: YYYY }.
 * Null fields mean nothing was logged for them.
 */
async function recap(userId, which, tzOffset, todayYmd) {
  const p = period(which);
  if (p.from > todayYmd) throw new RecapError('That hasn’t happened yet.', 404);
  const [all, exercises] = await Promise.all([sessionStore.list(userId, { sortField: 'completedAt' }), exerciseStore.all()]);
  const exercisesBySlug = new Map(exercises.map((e) => [e.slug, e]));
  const sessions = all.filter((s) => inRange(localDate(s.completedAt, tzOffset), p));
  const prevPeriod = period(p.previous);
  const previousWorkouts = all.filter((s) => inRange(localDate(s.completedAt, tzOffset), prevPeriod)).length;

  const byDate = activityByDate(sessions, tzOffset);
  const volumeKg = Math.round(sessions.reduce((n, s) => n + (s.sets || []).reduce((m, set) => m + (set.reps || 0) * (set.weightKg || 0), 0), 0));

  // Records set in the period that still stand, best weighted one first.
  const records = personalRecords(all, exercisesBySlug).filter((r) => inRange(localDate(r.achievedAt, tzOffset), p));
  const topRecord = [...records].sort((a, b) => (b.unit === 'kg') - (a.unit === 'kg') || (b.estimatedOneRepMaxKg || b.value) - (a.estimatedOneRepMaxKg || a.value))[0] || null;

  const slugs = [...new Set(sessions.map((s) => s.workoutSlug))];
  const workoutMuscles = new Map((await workoutStore.getManyBySlugs(slugs, { ownerId: userId })).map((w) => [w.slug, w.targetMuscles || []]));
  const regions = muscleRegions(sessions, workoutMuscles, exercisesBySlug);
  const topRegion = Object.entries(regions).sort((a, b) => b[1] - a[1])[0];
  const favourite = mostCommon(sessions.map((s) => s.workoutTitle));

  const foodDays = (await prisma.foodLog.findMany({
    where: { userId, date: { gte: p.from, lte: p.to } },
    distinct: ['date'],
    select: { date: true },
  })).length;

  return {
    kind: p.kind,
    key: p.key,
    label: p.label,
    from: p.from,
    to: p.to,
    workouts: sessions.length,
    previousWorkouts,
    activeDays: byDate.size,
    minutes: Math.round(sessions.reduce((n, s) => n + s.durationSec, 0) / 60),
    calories: sessions.reduce((n, s) => n + (s.calories || 0), 0),
    volumeKg,
    records: records.length,
    topRecord: topRecord && { exerciseName: topRecord.exerciseName, unit: topRecord.unit, value: topRecord.value, reps: topRecord.reps },
    topMuscle: topRegion && topRegion[1] > 0 ? { region: topRegion[0], workouts: topRegion[1] } : null,
    favouriteWorkout: favourite ? { title: favourite[0], times: favourite[1] } : null,
    foodDays,
  };
}

module.exports = { MONTHS, RecapError, period, lastMonth, recap };
