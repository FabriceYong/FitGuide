/**
 * Coaches and the members who follow their programs. A member is a coach's
 * client only while they share their progress with them (Enrollment
 * shareWithCoach, off by default); the creator dashboard stays counts only.
 * The coach sees how each client is doing, who is slipping and why, and can
 * send a short note, at most one a day per client.
 */
const { prisma } = require('../db/prisma');
const { describeEnrollment } = require('./progress');
const reminders = require('./reminders');
const { displayName } = require('../utils/names');
const { localDate, daysBetween } = require('../utils/dates');

// When a client counts as slipping.
const SLIPPING = { missedInARow: 2, quietDays: 7, adherencePct: 60, minDue: 3 };
const NOTE_GAP_MS = 20 * 60 * 60 * 1000;

class ClientError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Why a client is slipping (empty when they're on track). */
function slippingReasons({ missedInARow, daysSinceWorkout, daysSinceStart, adherencePct, dueCount }) {
  const reasons = [];
  if (missedInARow >= SLIPPING.missedInARow) reasons.push(`Missed the last ${plural(missedInARow, 'session')}`);
  if (daysSinceWorkout === null ? daysSinceStart >= SLIPPING.quietDays : daysSinceWorkout >= SLIPPING.quietDays) {
    reasons.push(daysSinceWorkout === null ? 'No workout logged yet' : `No workout in ${daysSinceWorkout} days`);
  }
  if (adherencePct !== null && adherencePct < SLIPPING.adherencePct && dueCount >= SLIPPING.minDue) reasons.push(`${adherencePct}% of sessions done`);
  return reasons;
}

/** Active, shared enrollments in this coach's programs. */
const sharedWith = (coachId) => ({ status: 'active', shareWithCoach: true, program: { creatorId: String(coachId) } });

/** The coach's clients, slipping first. */
async function list(coachId, todayYmd, tzOffset) {
  const enrollments = await prisma.enrollment.findMany({
    where: sharedWith(coachId),
    include: {
      completedDays: true,
      program: { include: { days: { orderBy: [{ week: 'asc' }, { day: 'asc' }] } } },
      user: { select: { id: true, name: true } },
      coachNotes: { where: { coachId: String(coachId) }, orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
    },
  });
  const last = await prisma.workoutSession.groupBy({
    by: ['userId'],
    where: { userId: { in: enrollments.map((e) => e.userId) } },
    _max: { completedAt: true },
  });
  const lastByUser = new Map(last.map((l) => [l.userId, l._max.completedAt]));

  const clients = enrollments.map((e) => {
    const d = describeEnrollment(e, e.program, todayYmd);
    const after = d.schedule.slice(d.schedule.findLastIndex((s) => s.status === 'done') + 1);
    const lastAt = lastByUser.get(e.userId);
    const lastWorkoutDate = lastAt ? localDate(lastAt, tzOffset) : null;
    const facts = {
      missedInARow: after.filter((s) => s.status === 'missed').length,
      daysSinceWorkout: lastWorkoutDate ? daysBetween(lastWorkoutDate, todayYmd) : null,
      daysSinceStart: daysBetween(e.startDate, todayYmd),
      adherencePct: d.adherencePct,
      dueCount: d.dueCount,
    };
    const reasons = slippingReasons(facts);
    return {
      enrollmentId: e.id,
      name: e.user.name,
      programSlug: e.programSlug,
      programTitle: e.program.title,
      currentWeek: d.currentWeek,
      weeks: d.weeks,
      completedCount: d.completedCount,
      totalDays: d.totalDays,
      adherencePct: d.adherencePct,
      missedInARow: facts.missedInARow,
      lastWorkoutDate,
      daysSinceWorkout: facts.daysSinceWorkout,
      slipping: reasons.length > 0,
      reasons,
      lastNoteAt: e.coachNotes[0]?.createdAt || null,
    };
  });
  return clients.sort((a, b) => Number(b.slipping) - Number(a.slipping)
    || (a.adherencePct ?? 101) - (b.adherencePct ?? 101)
    || a.name.localeCompare(b.name));
}

/** Send a client a note (and a browser notification if they have them on). */
async function sendNote(coach, enrollmentId, text) {
  const enrollment = await prisma.enrollment.findFirst({
    where: { id: String(enrollmentId), ...sharedWith(coach.id) },
    include: { program: { select: { title: true } }, user: { select: { name: true } } },
  });
  if (!enrollment) throw new ClientError('Client not found.', 404);
  const recent = await prisma.coachNote.findFirst({
    where: { enrollmentId: enrollment.id, coachId: coach.id, createdAt: { gt: new Date(Date.now() - NOTE_GAP_MS) } },
  });
  if (recent) throw new ClientError(`You sent ${displayName(enrollment.user.name)} a note today. Send another tomorrow.`, 429);

  const note = await prisma.coachNote.create({ data: { coachId: coach.id, userId: enrollment.userId, enrollmentId: enrollment.id, text } });
  if (reminders.isConfigured()) {
    const subscriptions = await prisma.pushSubscription.findMany({ where: { userId: enrollment.userId } });
    const body = text.length > 120 ? `${text.slice(0, 119)}…` : text;
    reminders.pushTo(subscriptions, { kind: 'coach-note', title: `A note from ${displayName(coach.name)}`, body, url: '/' })
      .catch((err) => console.warn('Coach note push failed:', err.message));
  }
  return { id: note.id, text: note.text, createdAt: note.createdAt };
}

/** A member's unread notes from coaches, oldest first. */
async function unread(userId) {
  const notes = await prisma.coachNote.findMany({
    where: { userId: String(userId), readAt: null },
    orderBy: { createdAt: 'asc' },
    include: { coach: { select: { name: true } }, enrollment: { select: { program: { select: { title: true } } } } },
  });
  return notes.map((n) => ({ id: n.id, text: n.text, createdAt: n.createdAt, coachName: displayName(n.coach.name), programTitle: n.enrollment.program.title }));
}

async function markRead(userId, id) {
  const { count } = await prisma.coachNote.updateMany({ where: { id: String(id), userId: String(userId), readAt: null }, data: { readAt: new Date() } });
  return count === 1;
}

module.exports = { SLIPPING, ClientError, slippingReasons, list, sendNote, unread, markRead };
