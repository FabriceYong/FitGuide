/**
 * Program enrollment logic shared by the enrollments, sessions and progress routes.
 */
const { enrollmentStore, programStore, sessionStore } = require('../stores/records');
const { describeEnrollment } = require('./progress');

/** All of a user's enrollments with their schedules: active first, then newest. */
async function describeAll(userId, todayYmd) {
  const [enrollments, programs] = await Promise.all([enrollmentStore.list(userId), programStore.all({ userId })]);
  const bySlug = new Map(programs.map((p) => [p.slug, p]));
  return enrollments
    .map((e) => describeEnrollment(e, bySlug.get(e.programSlug), todayYmd))
    .sort((a, b) => (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1));
}

async function describeOne(userId, id, todayYmd) {
  const enrollment = await enrollmentStore.findOwned(userId, id);
  if (!enrollment) return null;
  return describeEnrollment(enrollment, await programStore.getBySlug(enrollment.programSlug, { userId }), todayYmd);
}

/**
 * Check that a session may count as a program day: the enrollment is the
 * user's, still active, and has that day scheduled with this workout.
 * @returns {Promise<{ ok: true } | { ok: false, message: string }>}
 */
async function checkProgramDay(userId, { enrollmentId, programWeek, programDay, workoutSlug }) {
  const enrollment = await enrollmentStore.findOwned(userId, enrollmentId);
  if (!enrollment) return { ok: false, message: 'Program enrollment not found.' };
  if (enrollment.status !== 'active') return { ok: false, message: 'That program is no longer active.' };
  const program = await programStore.getBySlug(enrollment.programSlug, { userId });
  const scheduled = program?.days.find((d) => d.week === programWeek && d.day === programDay);
  if (!scheduled) return { ok: false, message: 'That day is not part of the program.' };
  if (scheduled.workoutSlug !== workoutSlug) return { ok: false, message: 'This workout is not scheduled for that program day.' };
  return { ok: true };
}

/**
 * Record a finished program day. The first completed session for a day counts;
 * the enrollment is marked completed once every day is done.
 */
async function markDayComplete(userId, session) {
  const enrollment = await enrollmentStore.findOwned(userId, session.enrollmentId);
  if (!enrollment) return;
  const program = await programStore.getBySlug(enrollment.programSlug, { userId });
  await enrollmentStore.update(userId, enrollment.id, (e) => {
    if (e.completedDays.some((d) => d.week === session.programWeek && d.day === session.programDay)) return;
    e.completedDays.push({ week: session.programWeek, day: session.programDay, sessionId: session.id, completedAt: session.completedAt });
    if (program && e.completedDays.length >= program.days.length) {
      e.status = 'completed';
      e.endedAt = new Date();
    }
  });
}

/**
 * Undo markDayComplete after its session was deleted. If another session
 * logged the same day, that one counts instead. Otherwise the day is open
 * again, and a completed program becomes active again, unless the user has
 * started another program since (only one may be active).
 */
async function unmarkSession(userId, session) {
  if (!session.enrollmentId) return;
  const enrollment = await enrollmentStore.findOwned(userId, session.enrollmentId);
  if (!enrollment?.completedDays.some((d) => d.sessionId === session.id)) return;

  const sameDay = await sessionStore.list(userId, {
    where: { enrollmentId: enrollment.id, programWeek: session.programWeek, programDay: session.programDay },
    sortField: 'completedAt',
  });
  const replacement = sameDay[sameDay.length - 1]; // the earliest remaining
  const otherActive = !replacement && enrollment.status === 'completed'
    && (await enrollmentStore.list(userId, { where: { status: 'active' } })).length > 0;

  await enrollmentStore.update(userId, enrollment.id, (e) => {
    if (replacement) {
      const day = e.completedDays.find((d) => d.sessionId === session.id);
      day.sessionId = replacement.id;
      day.completedAt = replacement.completedAt;
      return;
    }
    e.completedDays = e.completedDays.filter((d) => d.sessionId !== session.id);
    if (e.status === 'completed' && !otherActive) {
      e.status = 'active';
      e.endedAt = null;
    }
  });
}

module.exports = { describeAll, describeOne, checkProgramDay, markDayComplete, unmarkSession };
