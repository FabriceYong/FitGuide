/**
 * "Download my data": everything FitGuide keeps about a member, as one JSON
 * file, and their workouts and body measurements as CSV files for a
 * spreadsheet. Secrets (password hash, wearable tokens, link tokens) and
 * other people's data are left out.
 */
const { prisma } = require('../db/prisma');
const userStore = require('../stores/userStore');

const omit = (row, keys) => Object.fromEntries(Object.entries(row).filter(([k]) => !keys.includes(k)));
const withoutIds = (rows, keys = ['userId']) => rows.map((r) => omit(r, keys));

/** Everything about the user, newest first where it's a log. */
async function everything(userId) {
  const id = String(userId);
  const [
    user, sessions, bodyMetrics, enrollments, plans, ownWorkouts, favorites, reviews, foods, foodLogs,
    dailyMetrics, bloodPressure, activities, connections, friendships, challenges, coachMessages, water, photos, coachNotes,
  ] = await Promise.all([
    prisma.user.findUnique({ where: { id } }),
    prisma.workoutSession.findMany({ where: { userId: id }, orderBy: { completedAt: 'desc' }, include: { sets: { orderBy: { position: 'asc' } } } }),
    prisma.bodyMetric.findMany({ where: { userId: id }, orderBy: { date: 'desc' } }),
    prisma.enrollment.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, include: { completedDays: true } }),
    prisma.program.findMany({ where: { ownerId: id }, include: { days: { orderBy: [{ week: 'asc' }, { day: 'asc' }] } } }),
    prisma.workout.findMany({ where: { ownerId: id }, select: { slug: true, title: true, category: true, builtFrom: true, createdAt: true, updatedAt: true } }),
    prisma.favorite.findMany({ where: { userId: id } }),
    prisma.review.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' } }),
    prisma.food.findMany({ where: { ownerId: id } }),
    prisma.foodLog.findMany({ where: { userId: id }, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }] }),
    prisma.dailyMetric.findMany({ where: { userId: id }, orderBy: { date: 'desc' } }),
    prisma.bloodPressureReading.findMany({ where: { userId: id }, orderBy: { measuredAt: 'desc' } }),
    prisma.externalActivity.findMany({ where: { userId: id }, orderBy: { startedAt: 'desc' } }),
    prisma.connection.findMany({ where: { userId: id }, select: { provider: true, scopes: true, lastSyncAt: true, createdAt: true } }),
    prisma.friendship.findMany({
      where: { OR: [{ requesterId: id }, { addresseeId: id }] },
      include: { requester: { select: { id: true, name: true } }, addressee: { select: { id: true, name: true } } },
    }),
    prisma.challengeMember.findMany({ where: { userId: id }, include: { challenge: { select: { title: true, metric: true, startDate: true, endDate: true } } } }),
    prisma.coachMessage.findMany({ where: { userId: id, role: { in: ['user', 'assistant'] } }, orderBy: { createdAt: 'asc' }, select: { role: true, display: true, content: true, createdAt: true } }),
    prisma.waterIntake.findMany({ where: { userId: id }, orderBy: { date: 'desc' }, select: { date: true, ml: true } }),
    prisma.progressPhoto.findMany({ where: { userId: id }, orderBy: { date: 'asc' }, select: { date: true, note: true, createdAt: true } }),
    prisma.coachNote.findMany({ where: { userId: id }, orderBy: { createdAt: 'asc' }, select: { text: true, createdAt: true, readAt: true, coach: { select: { name: true } } } }),
  ]);
  if (!user) return null;

  const profile = await userStore.findById(id);
  return {
    exportedAt: new Date().toISOString(),
    note: 'Weights are in kg and lengths in cm, whatever units you show them in.',
    profile: {
      ...omit(profile, ['favoriteWorkouts']),
      reminders: { days: user.reminderDays, time: user.reminderTime, streak: user.streakReminder, timeZone: user.timeZone },
    },
    workoutSessions: sessions.map((s) => ({ ...omit(s, ['userId', 'clientId']), sets: s.sets.map((set) => omit(set, ['id', 'sessionId'])) })),
    bodyMetrics: withoutIds(bodyMetrics),
    programEnrollments: enrollments.map((e) => ({ ...omit(e, ['userId']), completedDays: e.completedDays.map((d) => omit(d, ['id', 'enrollmentId'])) })),
    personalPlans: plans.map((p) => ({ ...omit(p, ['id', 'ownerId', 'creatorId', 'reviewNote']), days: p.days.map((d) => omit(d, ['id', 'programId'])) })),
    ownWorkouts,
    favoriteWorkouts: favorites.map((f) => ({ workoutSlug: f.workoutSlug, addedAt: f.createdAt })),
    reviews: withoutIds(reviews),
    foods: withoutIds(foods, ['ownerId']),
    foodLog: withoutIds(foodLogs),
    water,
    // The pictures themselves stay in the app; save them from Progress.
    progressPhotos: photos,
    notesFromCoaches: coachNotes.map((n) => ({ from: n.coach.name, text: n.text, sentAt: n.createdAt, readAt: n.readAt })),
    dailyHealth: withoutIds(dailyMetrics),
    bloodPressure: withoutIds(bloodPressure),
    connectedActivities: withoutIds(activities),
    connectedServices: connections,
    friends: friendships.map((f) => ({
      name: (f.requesterId === id ? f.addressee : f.requester).name,
      status: f.status,
      since: f.createdAt,
    })),
    challenges: challenges.map((c) => ({ ...c.challenge, joinedAt: c.joinedAt })),
    coachConversation: coachMessages.map((m) => ({ role: m.role, text: m.display ?? (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)), at: m.createdAt })),
  };
}

/** A CSV cell: quoted when it holds a comma, quote or line break. */
const cell = (value) => {
  if (value == null) return '';
  const text = value instanceof Date ? value.toISOString() : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
const csv = (header, rows) => [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';

/** One row per logged set (or one per session without sets). */
async function workoutsCsv(userId) {
  const sessions = await prisma.workoutSession.findMany({
    where: { userId: String(userId) },
    orderBy: { completedAt: 'desc' },
    include: { sets: { orderBy: { position: 'asc' } } },
  });
  const rows = sessions.flatMap((s) => {
    const base = [s.completedAt, s.workoutTitle, s.status, Math.round(s.durationSec / 60), s.calories, s.perceivedEffort, s.notes];
    if (!s.sets.length) return [[...base, '', '', '', '', '', '']];
    return s.sets.map((set) => [...base, set.exerciseName, set.setNumber, set.reps, set.weightKg, set.durationSec, set.distanceM]);
  });
  return csv(['completed_at', 'workout', 'status', 'minutes', 'calories', 'effort_1_10', 'notes', 'exercise', 'set', 'reps', 'weight_kg', 'seconds', 'distance_m'], rows);
}

async function bodyMetricsCsv(userId) {
  const metrics = await prisma.bodyMetric.findMany({ where: { userId: String(userId) }, orderBy: { date: 'desc' } });
  return csv(
    ['date', 'weight_kg', 'body_fat_pct', 'waist_cm', 'hips_cm', 'chest_cm', 'arm_cm', 'thigh_cm', 'notes'],
    metrics.map((m) => [m.date, m.weightKg, m.bodyFatPct, m.waistCm, m.hipsCm, m.chestCm, m.armCm, m.thighCm, m.notes]),
  );
}

module.exports = { everything, workoutsCsv, bodyMetricsCsv };
