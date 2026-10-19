/**
 * Program enrollment logic shared by the enrollments, sessions and progress routes.
 */
const { enrollmentStore, programStore } = require('../stores/records');
const { describeEnrollment } = require('./progress');

/** All of a user's enrollments with their schedules: active first, then newest. */
async function describeAll(userId, todayYmd) {
  const [enrollments, programs] = await Promise.all([enrollmentStore.list(userId), programStore.all()]);
  const bySlug = new Map(programs.map((p) => [p.slug, p]));
  return enrollments
    .map((e) => describeEnrollment(e, bySlug.get(e.programSlug), todayYmd))
    .sort((a, b) => (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1));
}

async function describeOne(userId, id, todayYmd) {
  const enrollment = await enrollmentStore.findOwned(userId, id);
  if (!enrollment) return null;
  return describeEnrollment(enrollment, await programStore.getBySlug(enrollment.programSlug), todayYmd);
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
  const program = await programStore.getBySlug(enrollment.programSlug);
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
  const program = await programStore.getBySlug(enrollment.programSlug);
  await enrollmentStore.update(userId, enrollment.id, (e) => {
    if (e.completedDays.some((d) => d.week === session.programWeek && d.day === session.programDay)) return;
    e.completedDays.push({ week: session.programWeek, day: session.programDay, sessionId: session.id, completedAt: session.completedAt });
    if (program && e.completedDays.length >= program.days.length) {
      e.status = 'completed';
      e.endedAt = new Date();
    }
  });
}

/** Undo markDayComplete when its session is deleted. */
async function unmarkSession(userId, session) {
  if (!session.enrollmentId) return;
  await enrollmentStore.update(userId, session.enrollmentId, (e) => {
    e.completedDays = e.completedDays.filter((d) => d.sessionId !== session.id);
    if (e.status === 'completed') {
      e.status = 'active';
      e.endedAt = null;
    }
  });
}

module.exports = { describeAll, describeOne, checkProgramDay, markDayComplete, unmarkSession };
