/**
 * Badges for real progress, worked out from what the member has logged (so
 * there's nothing extra to store): workouts done, days in a row, total
 * minutes, personal records and finished programs. Each has the date it was
 * earned, or how far along the member is.
 */
const { daysBetween } = require('../utils/dates');

/** When a running total first reached each goal: [{ goal, at }]. */
function reachedAt(events, goals) {
  const ordered = [...events].sort((a, b) => new Date(a.at) - new Date(b.at));
  const result = new Map();
  let total = 0;
  for (const e of ordered) {
    total += e.amount;
    for (const goal of goals) if (!result.has(goal) && total >= goal) result.set(goal, e.at);
  }
  return { total, result };
}

/** The local date a run of `length` consecutive active days was first completed. */
function streakReachedOn(activeDates, length) {
  const dates = [...activeDates].sort();
  let run = 0;
  let prev = null;
  for (const date of dates) {
    run = prev && daysBetween(prev, date) === 1 ? run + 1 : 1;
    if (run >= length) return date;
    prev = date;
  }
  return null;
}

const badge = (id, title, description, goal, value, earnedAt) => ({
  id,
  title,
  description,
  earned: Boolean(earnedAt),
  earnedAt: earnedAt ? new Date(earnedAt).toISOString() : null,
  progress: { value: Math.min(value, goal), goal },
});

/**
 * @param {object} input
 * @param {object[]} input.sessions          Logged workouts (completedAt, durationSec)
 * @param {Set<string>} input.activeDates    Local dates with any activity
 * @param {object[]} input.records           personalRecords() output (achievedAt)
 * @param {object[]} input.enrollments       Program enrollments (status, endedAt)
 * @param {number} input.longestStreak
 */
function achievements({ sessions, activeDates, records, enrollments, longestStreak }) {
  const workouts = reachedAt(sessions.map((s) => ({ at: s.completedAt, amount: 1 })), [1, 10, 50, 100]);
  const minutes = reachedAt(sessions.map((s) => ({ at: s.completedAt, amount: (s.durationSec || 0) / 60 })), [1000]);
  const recordDates = records.map((r) => r.achievedAt).sort((a, b) => new Date(a) - new Date(b));
  const finished = enrollments.filter((e) => e.status === 'completed').map((e) => e.endedAt).filter(Boolean).sort();
  const streakDate = (n) => {
    const date = streakReachedOn(activeDates, n);
    return date ? `${date}T12:00:00Z` : null;
  };

  return [
    badge('first-workout', 'First workout', 'Finish your first workout.', 1, workouts.total, workouts.result.get(1)),
    badge('workouts-10', '10 workouts', 'Finish 10 workouts.', 10, workouts.total, workouts.result.get(10)),
    badge('workouts-50', '50 workouts', 'Finish 50 workouts.', 50, workouts.total, workouts.result.get(50)),
    badge('workouts-100', '100 workouts', 'Finish 100 workouts.', 100, workouts.total, workouts.result.get(100)),
    badge('streak-7', 'A week in a row', 'Be active 7 days in a row.', 7, longestStreak, streakDate(7)),
    badge('streak-30', 'A month in a row', 'Be active 30 days in a row.', 30, longestStreak, streakDate(30)),
    badge('minutes-1000', '1,000 minutes', 'Train for 1,000 minutes in all.', 1000, Math.floor(minutes.total), minutes.result.get(1000)),
    badge('first-record', 'First record', 'Set a personal record: log reps, weight or a hold.', 1, recordDates.length, recordDates[0]),
    badge('records-10', '10 records', 'Hold personal records in 10 exercises.', 10, recordDates.length, recordDates[9]),
    badge('program-done', 'Program finished', 'Finish every day of a program or plan.', 1, finished.length, finished[0]),
  ];
}

module.exports = { achievements, streakReachedOn };
