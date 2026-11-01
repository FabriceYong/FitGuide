/**
 * Pure calculations over a user's logged data: activity by day, streaks,
 * personal records and program schedules. No I/O, so they are easy to test.
 */
const { localDate, addDays, daysBetween } = require('../utils/dates');
const { MUSCLE_REGIONS } = require('@fitguide/shared');
const { achievements } = require('./achievements');

const ACTIVITY_DAYS = 84; // 12 weeks, for the activity calendar

/** Sessions grouped by the user's local date: Map<date, { sessions, minutes, calories }>. */
function activityByDate(sessions, tzOffset) {
  const byDate = new Map();
  for (const s of sessions) {
    const date = localDate(s.completedAt, tzOffset);
    const day = byDate.get(date) || { sessions: 0, minutes: 0, calories: 0 };
    day.sessions += 1;
    day.minutes += Math.round((s.durationSec || 0) / 60);
    day.calories += s.calories || 0;
    byDate.set(date, day);
  }
  return byDate;
}

/**
 * Consecutive active days. The current streak stays alive through today if
 * the user trained yesterday but not yet today.
 */
function streaks(activeDates, todayYmd) {
  const dates = [...activeDates].sort();
  let longest = 0;
  let run = 0;
  let prev = null;
  for (const date of dates) {
    run = prev && daysBetween(prev, date) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = date;
  }

  let current = 0;
  let cursor = activeDates.has(todayYmd) ? todayYmd : addDays(todayYmd, -1);
  while (activeDates.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  return { current, longest, trainedToday: activeDates.has(todayYmd) };
}

/**
 * Best set per exercise. What "best" means depends on the exercise's
 * trackingType. Ties keep the earlier record.
 * @param {object[]} sessions  Oldest first is not required
 * @param {Map<string, object>} exercisesBySlug
 */
function personalRecords(sessions, exercisesBySlug) {
  const records = new Map();
  const ordered = [...sessions].sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));

  for (const session of ordered) {
    for (const set of session.sets || []) {
      const exercise = set.exerciseSlug ? exercisesBySlug.get(set.exerciseSlug) : null;
      // Without a library match, only count sets the user measured explicitly.
      let type = exercise?.trackingType;
      if (!type) {
        if (set.weightKg > 0) type = 'weighted';
        else if (set.reps > 0) type = 'reps';
        else continue;
      }

      let value;
      let estimatedOneRepMaxKg;
      if (type === 'weighted') {
        if (!(set.weightKg > 0)) continue;
        value = set.weightKg;
        if (set.reps > 0) estimatedOneRepMaxKg = Math.round(set.weightKg * (1 + set.reps / 30) * 10) / 10; // Epley
      } else if (type === 'reps') {
        if (!(set.reps > 0)) continue;
        value = set.reps;
      } else if (type === 'duration') {
        if (!(set.durationSec > 0)) continue;
        value = set.durationSec;
      } else {
        if (!(set.distanceM > 0)) continue;
        value = set.distanceM;
      }

      const key = exercise ? exercise.slug : `name:${String(set.exerciseName).toLowerCase()}`;
      const existing = records.get(key);
      if (existing && existing.value >= value) continue;
      records.set(key, {
        exerciseSlug: exercise?.slug || null,
        exerciseName: exercise?.name || set.exerciseName,
        trackingType: type,
        value,
        unit: { weighted: 'kg', reps: 'reps', duration: 'sec', distance: 'm' }[type],
        reps: set.reps ?? null,
        weightKg: set.weightKg ?? null,
        ...(estimatedOneRepMaxKg && { estimatedOneRepMaxKg }),
        sessionId: session.id,
        workoutTitle: session.workoutTitle,
        achievedAt: session.completedAt,
      });
    }
  }
  return [...records.values()].sort((a, b) => new Date(b.achievedAt) - new Date(a.achievedAt));
}

/** Calendar date of a program day for an enrollment. */
const scheduledDate = (startDate, week, day) => addDays(startDate, (week - 1) * 7 + (day - 1));

/**
 * Days a program day moved from catch-ups: each shift moves its day and every
 * later one.
 * @param {{ week: number, day: number, days: number }[]} shifts
 */
const shiftFor = (shifts, week, day) => (Array.isArray(shifts) ? shifts : [])
  .reduce((n, s) => (week > s.week || (week === s.week && day >= s.day) ? n + s.days : n), 0);

/**
 * An enrollment with its program schedule laid out on the calendar and
 * adherence so far (share of the scheduled days up to today that were done).
 */
function describeEnrollment(enrollment, program, todayYmd) {
  const done = new Map((enrollment.completedDays || []).map((d) => [`${d.week}:${d.day}`, d]));
  const schedule = (program?.days || []).map((d) => {
    const date = addDays(scheduledDate(enrollment.startDate, d.week, d.day), shiftFor(enrollment.shifts, d.week, d.day));
    const completed = done.get(`${d.week}:${d.day}`);
    let status;
    if (completed) status = 'done';
    else if (date < todayYmd) status = 'missed';
    else if (date === todayYmd) status = 'today';
    else status = 'upcoming';
    return { ...d, date, status, sessionId: completed?.sessionId || null, completedAt: completed?.completedAt || null };
  });

  // Today's session only counts once it's done, so the day isn't scored as missed early.
  const due = schedule.filter((d) => d.date < todayYmd || (d.date === todayYmd && d.status === 'done'));
  const dueDone = due.filter((d) => d.status === 'done').length;
  const completedCount = schedule.filter((d) => d.status === 'done').length;
  const nextDay = enrollment.status === 'active' ? schedule.find((d) => d.status !== 'done') || null : null;
  const lastDate = schedule.length ? schedule[schedule.length - 1].date : enrollment.startDate;
  // Weeks count from the start, moved by any catch-up that applies to what's next.
  const open = schedule.find((d) => d.status !== 'done');
  const weekStart = addDays(enrollment.startDate, open ? shiftFor(enrollment.shifts, open.week, open.day) : shiftFor(enrollment.shifts, Infinity, 0));

  return {
    id: enrollment.id,
    programSlug: enrollment.programSlug,
    programTitle: program?.title || enrollment.programSlug,
    level: program?.level || null,
    weeks: program?.weeks || null,
    startDate: enrollment.startDate,
    endDate: lastDate,
    status: enrollment.status,
    endedAt: enrollment.endedAt || null,
    shareWithCoach: Boolean(enrollment.shareWithCoach),
    totalDays: schedule.length,
    completedCount,
    percentComplete: schedule.length ? Math.round((completedCount / schedule.length) * 100) : 0,
    dueCount: due.length,
    adherencePct: due.length ? Math.round((dueDone / due.length) * 100) : null,
    currentWeek: Math.min(program?.weeks || 1, Math.max(1, Math.floor(daysBetween(weekStart, todayYmd) / 7) + 1)),
    nextDay,
    schedule,
  };
}

/**
 * How many of the last 7 days' workouts worked each body region: from the
 * workout's target muscles and the library exercises of its logged sets.
 * "Full Body" counts for every region.
 * @param {object[]} sessions  Already only this week's
 * @param {Map<string, string[]>} workoutMuscles  workout slug → target muscles
 * @param {Map<string, object>} exercisesBySlug
 */
function muscleRegions(sessions, workoutMuscles, exercisesBySlug) {
  const regions = Object.fromEntries(Object.keys(MUSCLE_REGIONS).map((r) => [r, 0]));
  for (const s of sessions) {
    const muscles = new Set([
      ...(workoutMuscles.get(s.workoutSlug) || []),
      ...(s.sets || []).flatMap((set) => exercisesBySlug.get(set.exerciseSlug)?.primaryMuscles || []),
    ]);
    for (const [region, names] of Object.entries(MUSCLE_REGIONS)) {
      if (muscles.has('Full Body') || names.some((m) => muscles.has(m))) regions[region] += 1;
    }
  }
  return regions;
}

/**
 * Everything the Progress page shows.
 * @param {object} input
 * @param {object[]} input.sessions
 * @param {object[]} input.bodyMetrics   Any order
 * @param {object[]} input.enrollments   Already described with describeEnrollment
 * @param {Map<string, object>} input.exercisesBySlug
 * @param {number} input.tzOffset
 * @param {string} input.todayYmd
 * @param {object[]} [input.externalActivities]  From connected services; they
 *   count toward activity and streaks (with completedAt, durationSec, calories)
 * @param {Map<string, string[]>} [input.workoutMuscles]  workout slug → target muscles
 */
function buildSummary({ sessions, bodyMetrics, enrollments, exercisesBySlug, tzOffset, todayYmd, externalActivities = [], workoutMuscles = new Map() }) {
  const byDate = activityByDate([...sessions, ...externalActivities], tzOffset);
  const streak = streaks(new Set(byDate.keys()), todayYmd);
  const records = personalRecords(sessions, exercisesBySlug);
  const days = [];
  for (let i = ACTIVITY_DAYS - 1; i >= 0; i -= 1) {
    const date = addDays(todayYmd, -i);
    days.push({ date, ...(byDate.get(date) || { sessions: 0, minutes: 0, calories: 0 }) });
  }
  const lastWeek = days.slice(-7);
  const sum = (rows, key) => rows.reduce((total, r) => total + (r[key] || 0), 0);

  const metrics = [...bodyMetrics].sort((a, b) => a.date.localeCompare(b.date));
  const weights = metrics.filter((m) => m.weightKg != null).map((m) => ({ date: m.date, weightKg: m.weightKg }));
  const latestWeight = weights[weights.length - 1] || null;
  // Change against the latest weigh-in at least 30 days before the most recent one.
  const baseline = latestWeight
    ? [...weights].reverse().find((w) => daysBetween(w.date, latestWeight.date) >= 30) || weights[0]
    : null;
  const latestMeasurements = {};
  for (const m of metrics) {
    for (const [k, v] of Object.entries(m)) {
      if (v != null && /(Kg|Pct|Cm)$/.test(k)) latestMeasurements[k] = { value: v, date: m.date };
    }
  }

  return {
    today: todayYmd,
    totals: {
      sessions: sessions.length,
      minutes: Math.round(sum(sessions, 'durationSec') / 60),
      calories: sum(sessions, 'calories'),
      externalActivities: externalActivities.length,
    },
    thisWeek: {
      sessions: sum(lastWeek, 'sessions'),
      minutes: sum(lastWeek, 'minutes'),
      calories: sum(lastWeek, 'calories'),
      activeDays: lastWeek.filter((d) => d.sessions > 0).length,
    },
    streak,
    days,
    personalRecords: records,
    muscles: { regions: muscleRegions(sessions.filter((s) => localDate(s.completedAt, tzOffset) > addDays(todayYmd, -7)), workoutMuscles, exercisesBySlug) },
    achievements: achievements({ sessions, activeDates: new Set(byDate.keys()), records, enrollments, longestStreak: streak.longest }),
    body: {
      latestWeight,
      weightChangeKg: latestWeight && baseline && baseline !== latestWeight
        ? Math.round((latestWeight.weightKg - baseline.weightKg) * 10) / 10
        : null,
      weightChangeSince: baseline && baseline !== latestWeight ? baseline.date : null,
      weights,
      latestMeasurements,
    },
    activeEnrollment: enrollments.find((e) => e.status === 'active') || null,
  };
}

/** A step's rep target as numbers: "8–10" → { min: 8, max: 10 }, "12" → { min: 12, max: 12 }; else null. */
function repRange(target) {
  const m = /^\s*(\d+)\s*(?:[–-]\s*(\d+))?\s*$/.exec(String(target ?? ''));
  if (!m) return null;
  const min = Number(m[1]);
  const max = Number(m[2] ?? m[1]);
  return min > 0 && max >= min ? { min, max } : null;
}

const roundToHalf = (n) => Math.round(n * 2) / 2;
const LB_PER_KG = 2.20462;

/**
 * The next weight up, in the plates the lifter uses: 1 kg under 20 kg, else
 * 2.5 kg; in pounds, 2.5 lb under 45 lb, else 5 lb. Always returned in kg.
 */
function nextWeight(kg, units = 'metric') {
  if (units !== 'imperial') return roundToHalf(kg + (kg < 20 ? 1 : 2.5));
  const lb = roundToHalf(kg * LB_PER_KG);
  return Math.round(((lb + (lb < 45 ? 2.5 : 5)) / LB_PER_KG) * 10000) / 10000;
}

/**
 * What to aim for this time, from the same set last time (double
 * progression): add reps until the top of the step's rep range, then add
 * weight (nextWeight, in the user's units) and start again from the bottom.
 * @param {{ reps?: number, weightKg?: number }} last
 * @param {string} [target]  The step's rep target, like "8–10"
 * @param {'metric' | 'imperial'} [units]
 * @returns {{ reps: number, weightKg?: number, reason: 'add_weight' | 'reach_range' | 'more_reps' } | null}
 */
function suggestNext(last, target, units = 'metric') {
  if (!last || !(last.reps > 0)) return null;
  const range = repRange(target);
  const weight = last.weightKg > 0 ? last.weightKg : null;
  if (weight && range && last.reps >= range.max) {
    return { reps: range.min, weightKg: nextWeight(weight, units), reason: 'add_weight' };
  }
  if (range && last.reps < range.min) {
    return { reps: range.min, ...(weight && { weightKg: weight }), reason: 'reach_range' };
  }
  const reps = range && weight ? Math.min(last.reps + 1, range.max) : last.reps + 1;
  return { reps, ...(weight && { weightKg: weight }), reason: 'more_reps' };
}

/**
 * For each step of a workout about to be done: the same set in the latest
 * session that had its exercise, and what to aim for now. A step's
 * exercise is its library match, or its name when there is none. The 2nd
 * step of an exercise pairs with the 2nd set of it last time (or the last
 * one, if there were fewer). Only sets with reps or a weight count.
 * @param {object[]} sessions  Newest first
 * @param {{ name: string, reps?: string }[]} steps
 * @param {(name: string) => string} keyOf  The exercise a step name refers to
 * @param {'metric' | 'imperial'} [units]  For the weight to add
 */
function previousSets(sessions, steps, keyOf, units = 'metric') {
  const setKey = (set) => (set.exerciseSlug ? `slug:${set.exerciseSlug}` : keyOf(set.exerciseName));
  const latest = new Map(); // key → that exercise's sets in its latest session
  const seen = new Map(); // key → steps of it so far
  return steps.map((step) => {
    const key = keyOf(step.name);
    if (!latest.has(key)) {
      let found = null;
      for (const session of sessions) {
        const sets = (session.sets || []).filter((s) => (s.reps > 0 || s.weightKg > 0) && setKey(s) === key);
        if (sets.length) {
          found = sets.map((s) => ({ reps: s.reps ?? null, weightKg: s.weightKg ?? null, completedAt: session.completedAt }));
          break;
        }
      }
      latest.set(key, found);
    }
    const index = seen.get(key) || 0;
    seen.set(key, index + 1);
    const sets = latest.get(key);
    const last = sets ? sets[Math.min(index, sets.length - 1)] : null;
    return { last, suggestion: suggestNext(last, step.reps, units) };
  });
}

module.exports = { activityByDate, streaks, personalRecords, scheduledDate, shiftFor, describeEnrollment, buildSummary, muscleRegions, repRange, suggestNext, previousSets };
