/**
 * Changes a plan proposes on its own, for the member to approve:
 * - catch up: after missed sessions in a row, move them and the rest of the
 *   schedule so the first missed one is today (any program);
 * - easier or harder: other workouts on the open days of a personal plan,
 *   from recent effort and adherence (the rules of POST /api/plan/adapt).
 * Nothing changes until the member accepts. Saying no hides that kind of
 * suggestion for a week.
 */
const crypto = require('crypto');
const { prisma } = require('../db/prisma');
const { enrollmentStore } = require('../stores/records');
const { describeOne } = require('./enrollments');
const plans = require('./plans');
const { addDays, daysBetween } = require('../utils/dates');

const KINDS = ['catch_up', 'easier', 'harder'];
// Missed sessions in a row before catching up is suggested.
const MISSED_IN_A_ROW = 2;
const HIDE_DAYS = 7;
const MAX_SHIFTS = 20;

class SuggestionError extends Error {
  constructor(message, status = 400, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** The same suggestion always gets the same id, so a stale one can't be accepted. */
const withId = (enrollmentId, suggestion) => ({
  id: crypto.createHash('sha256').update(JSON.stringify([enrollmentId, suggestion.kind, suggestion.changes])).digest('hex').slice(0, 16),
  ...suggestion,
});

/**
 * Missed sessions since the last one done: move them and everything after so
 * the first is today.
 */
function catchUp(described, todayYmd, shiftCount) {
  if (shiftCount >= MAX_SHIFTS) return null;
  const { schedule } = described;
  const after = schedule.slice(schedule.findLastIndex((d) => d.status === 'done') + 1);
  const missed = after.filter((d) => d.status === 'missed');
  if (missed.length < MISSED_IN_A_ROW) return null;
  const days = daysBetween(missed[0].date, todayYmd);
  return {
    kind: 'catch_up',
    reason: `You missed the last ${plural(missed.length, 'session')}. Pick up today where you left off, and move the rest of the plan ${plural(days, 'day')} later.`,
    moveDays: days,
    endDate: addDays(described.endDate, days),
    changes: after.map((d) => ({ week: d.week, day: d.day, title: d.title, date: d.date, newDate: addDays(d.date, days) })),
  };
}

/** The member's active enrollment, described, and the suggestion for it (or null). */
async function find(userId, todayYmd, tzOffset) {
  const [active] = await enrollmentStore.list(userId, { where: { status: 'active' } });
  if (!active) return null;
  const described = await describeOne(userId, active.id, todayYmd);
  if (!described) return null;
  const hidden = (kind) => active.hiddenSuggestion === kind && active.hiddenSuggestionUntil > todayYmd;

  let suggestion = null;
  const caught = catchUp(described, todayYmd, Array.isArray(active.shifts) ? active.shifts.length : 0);
  if (caught && !hidden('catch_up')) suggestion = caught;

  const personal = !suggestion && await plans.activePersonal(userId);
  if (personal) {
    const { direction, reason, changes } = await plans.proposeAdaptation(personal, described, todayYmd, tzOffset);
    if (direction !== 'keep' && changes.length && !hidden(direction)) {
      suggestion = { kind: direction, reason, changes: changes.map(({ week, day, date, title, newTitle, from, to }) => ({ week, day, date, title, newTitle, from, to })) };
      suggestion.programId = personal.program.id;
    }
  }
  if (!suggestion) return { enrollment: active, described, suggestion: null };
  const { programId, ...shown } = suggestion;
  return {
    enrollment: active,
    described,
    programId,
    suggestion: { enrollmentId: active.id, programTitle: described.programTitle, ...withId(active.id, shown) },
  };
}

async function current(userId, todayYmd, tzOffset) {
  return (await find(userId, todayYmd, tzOffset))?.suggestion || null;
}

/**
 * Make the suggested change. The id must match the suggestion as it is now;
 * otherwise nothing changes and the new one is returned with a 409.
 */
async function accept(userId, id, todayYmd, tzOffset) {
  const found = await find(userId, todayYmd, tzOffset);
  if (!found?.suggestion) throw new SuggestionError('There is nothing to change right now.', 404);
  const { enrollment, suggestion } = found;
  if (suggestion.id !== id) {
    throw new SuggestionError('Your plan has changed since. Have a look at the new suggestion.', 409, { suggestion });
  }
  if (suggestion.kind === 'catch_up') {
    const first = suggestion.changes[0];
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { shifts: [...(enrollment.shifts || []), { week: first.week, day: first.day, days: suggestion.moveDays }], hiddenSuggestion: null, hiddenSuggestionUntil: null },
    });
  } else {
    await plans.applySwaps(found.programId, suggestion.changes);
    await prisma.enrollment.update({ where: { id: enrollment.id }, data: { hiddenSuggestion: null, hiddenSuggestionUntil: null } });
  }
  return { applied: suggestion, enrollment: await describeOne(userId, enrollment.id, todayYmd) };
}

/** Hide this kind of suggestion for a week. */
async function dismiss(userId, kind, todayYmd) {
  const [active] = await enrollmentStore.list(userId, { where: { status: 'active' } });
  if (!active) throw new SuggestionError('You are not following a plan.', 404);
  await prisma.enrollment.update({
    where: { id: active.id },
    data: { hiddenSuggestion: kind, hiddenSuggestionUntil: addDays(todayYmd, HIDE_DAYS) },
  });
}

module.exports = { KINDS, SuggestionError, current, accept, dismiss };
