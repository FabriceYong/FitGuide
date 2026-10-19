/**
 * Pure calculations over a user's logged data: activity by day, streaks,
 * personal records and program schedules. No I/O, so they are easy to test.
 */
const { localDate, addDays, daysBetween } = require('../utils/dates');

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
 * An enrollment with its program schedule laid out on the calendar and
 * adherence so far (share of the scheduled days up to today that were done).
 */
function describeEnrollment(enrollment, program, todayYmd) {
  const done = new Map((enrollment.completedDays || []).map((d) => [`${d.week}:${d.day}`, d]));
  const schedule = (program?.days || []).map((d) => {
    const date = scheduledDate(enrollment.startDate, d.week, d.day);
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
    totalDays: schedule.length,
    completedCount,
    percentComplete: schedule.length ? Math.round((completedCount / schedule.length) * 100) : 0,
    dueCount: due.length,
    adherencePct: due.length ? Math.round((dueDone / due.length) * 100) : null,
    currentWeek: Math.min(program?.weeks || 1, Math.max(1, Math.floor(daysBetween(enrollment.startDate, todayYmd) / 7) + 1)),
    nextDay,
    schedule,
  };
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
 */
function buildSummary({ sessions, bodyMetrics, enrollments, exercisesBySlug, tzOffset, todayYmd, externalActivities = [] }) {
  const byDate = activityByDate([...sessions, ...externalActivities], tzOffset);
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
    streak: streaks(new Set(byDate.keys()), todayYmd),
    days,
    personalRecords: personalRecords(sessions, exercisesBySlug),
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

module.exports = { activityByDate, streaks, personalRecords, scheduledDate, describeEnrollment, buildSummary };
