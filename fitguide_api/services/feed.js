/**
 * The friends' feed: recent workouts by the member and their friends, with
 * any personal records set in them, and cheers. Friends appear as first name
 * + initial, and only members who share their activity (User.shareActivity,
 * on by default) are in their friends' feeds.
 */
const { prisma, isUniqueViolation } = require('../db/prisma');
const { exerciseStore } = require('../stores/records');
const { personalRecords } = require('./progress');
const reminders = require('./reminders');
const { friendIds, SocialError } = require('./social');
const { displayName } = require('../utils/names');

const FEED_DAYS = 30;
const PAGE = 20;

const person = (u) => ({ id: u.id, name: displayName(u.name), avatarUrl: u.avatarUrl || null });

/** Whose workouts the member may see: themselves, and friends who share. */
async function visibleUserIds(userId) {
  const friends = await friendIds(userId);
  const sharing = await prisma.user.findMany({ where: { id: { in: friends }, shareActivity: true }, select: { id: true } });
  return [userId, ...sharing.map((u) => u.id)];
}

/**
 * A page of the feed, newest first.
 * @param {string} [before]  ISO time: only workouts completed before it (the previous page's nextBefore)
 */
async function feed(userId, { before } = {}) {
  const ids = await visibleUserIds(userId);
  const since = new Date(Date.now() - FEED_DAYS * 864e5);
  const upTo = before ? new Date(before) : null;
  const sessions = await prisma.workoutSession.findMany({
    where: { userId: { in: ids }, completedAt: { gte: since, ...(upTo && !Number.isNaN(upTo.getTime()) && { lt: upTo }) } },
    orderBy: { completedAt: 'desc' },
    take: PAGE + 1,
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
      sets: { select: { reps: true, weightKg: true } },
      cheers: { orderBy: { createdAt: 'asc' }, include: { user: { select: { id: true, name: true } } } },
    },
  });
  const page = sessions.slice(0, PAGE);

  // Records each person holds now, from their whole history; a workout shows the ones it set.
  const owners = [...new Set(page.map((s) => s.userId))];
  const exercises = new Map((await exerciseStore.all()).map((e) => [e.slug, e]));
  const history = await prisma.workoutSession.findMany({
    where: { userId: { in: owners } },
    select: { id: true, userId: true, workoutTitle: true, completedAt: true, sets: true },
  });
  const recordsBySession = new Map();
  for (const owner of owners) {
    for (const r of personalRecords(history.filter((h) => h.userId === owner), exercises)) {
      const list = recordsBySession.get(r.sessionId) || [];
      list.push({ exerciseName: r.exerciseName, unit: r.unit, value: r.value, reps: r.reps });
      recordsBySession.set(r.sessionId, list);
    }
  }

  return {
    items: page.map((s) => ({
      id: s.id,
      person: person(s.user),
      isYou: s.userId === userId,
      workoutTitle: s.workoutTitle,
      category: s.category,
      completedAt: s.completedAt,
      durationSec: s.durationSec,
      calories: s.calories,
      setCount: s.sets.length,
      volumeKg: Math.round(s.sets.reduce((n, set) => n + (set.reps || 0) * (set.weightKg || 0), 0)),
      records: recordsBySession.get(s.id) || [],
      cheers: s.cheers.length,
      cheeredByYou: s.cheers.some((c) => c.userId === userId),
      cheeredBy: s.cheers.slice(0, 3).map((c) => (c.userId === userId ? 'You' : displayName(c.user.name))),
    })),
    nextBefore: sessions.length > PAGE ? page[page.length - 1].completedAt : null,
  };
}

/** A workout the member may cheer: a friend's, in their feed. */
async function cheerable(userId, sessionId) {
  const session = await prisma.workoutSession.findUnique({ where: { id: String(sessionId) }, select: { id: true, userId: true, workoutTitle: true } });
  if (!session || session.userId === userId || !(await visibleUserIds(userId)).includes(session.userId)) {
    throw new SocialError('Workout not found.', 404);
  }
  return session;
}

/** Cheer a friend's workout; they get a browser notification the first time. */
async function cheer(user, sessionId) {
  const session = await cheerable(user.id, sessionId);
  try {
    await prisma.cheer.create({ data: { sessionId: session.id, userId: user.id } });
  } catch (err) {
    if (isUniqueViolation(err)) return; // already cheered
    throw err;
  }
  if (reminders.isConfigured()) {
    const subscriptions = await prisma.pushSubscription.findMany({ where: { userId: session.userId } });
    reminders.pushTo(subscriptions, { kind: 'cheer', title: `${displayName(user.name)} cheered your workout`, body: session.workoutTitle, url: '/community' })
      .catch((err) => console.warn('Cheer push failed:', err.message));
  }
}

async function uncheer(userId, sessionId) {
  await cheerable(userId, sessionId);
  await prisma.cheer.deleteMany({ where: { sessionId: String(sessionId), userId } });
}

async function setSharing(userId, shareActivity) {
  await prisma.user.update({ where: { id: userId }, data: { shareActivity } });
}

async function sharing(userId) {
  return (await prisma.user.findUnique({ where: { id: userId }, select: { shareActivity: true } })).shareActivity;
}

module.exports = { feed, cheer, uncheer, setSharing, sharing };
