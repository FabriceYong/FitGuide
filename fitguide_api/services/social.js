/**
 * Community: friends (added with a shareable code, so nobody can look up
 * accounts), challenges scored from logged data, and leaderboards.
 *
 * On leaderboards people appear as first name + last initial, and only if
 * they're friends of the viewer or joined the same challenge. Anyone can
 * hide themselves (showOnLeaderboards).
 */
const crypto = require('crypto');
const { prisma, isUniqueViolation } = require('../db/prisma');
const { mergeByDate } = require('./healthData');
const { addDays } = require('../utils/dates');
const { displayName } = require('../utils/names');

const METRICS = {
  sessions: { label: 'Workouts', unit: 'workouts' },
  minutes: { label: 'Active minutes', unit: 'min' },
  activeDays: { label: 'Active days', unit: 'days' },
  steps: { label: 'Steps', unit: 'steps' },
  // Reps × weight over every logged set.
  volume: { label: 'Weight lifted', unit: 'kg' },
  foodDays: { label: 'Days with food logged', unit: 'days' },
};
const VISIBILITIES = ['public', 'friends', 'private'];
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I

class SocialError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const randomCode = (length) => Array.from(crypto.randomBytes(length), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');


const person = (u) => ({ id: u.id, name: displayName(u.name), avatarUrl: u.avatarUrl || null });

// ─── Friends ─────────────────────────────────────────────────────────────────

async function friendCode(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { friendCode: true } });
  if (user.friendCode) return user.friendCode;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const { friendCode: code } = await prisma.user.update({ where: { id: userId }, data: { friendCode: randomCode(8) }, select: { friendCode: true } });
      return code;
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }
  }
  throw new Error('Could not create a friend code.');
}

const userSelect = { id: true, name: true, avatarUrl: true };

async function friendships(userId) {
  const rows = await prisma.friendship.findMany({
    where: { OR: [{ requesterId: userId }, { addresseeId: userId }] },
    include: { requester: { select: userSelect }, addressee: { select: userSelect } },
    orderBy: { createdAt: 'asc' },
  });
  const other = (f) => (f.requesterId === userId ? f.addressee : f.requester);
  return {
    friends: rows.filter((f) => f.status === 'accepted').map((f) => ({ friendshipId: f.id, ...person(other(f)) })),
    incoming: rows.filter((f) => f.status === 'pending' && f.addresseeId === userId).map((f) => ({ friendshipId: f.id, ...person(f.requester) })),
    outgoing: rows.filter((f) => f.status === 'pending' && f.requesterId === userId).map((f) => ({ friendshipId: f.id, ...person(f.addressee) })),
  };
}

async function friendIds(userId) {
  const rows = await prisma.friendship.findMany({
    where: { status: 'accepted', OR: [{ requesterId: userId }, { addresseeId: userId }] },
    select: { requesterId: true, addresseeId: true },
  });
  return rows.map((f) => (f.requesterId === userId ? f.addresseeId : f.requesterId));
}

/** Send a request to whoever owns `code`. If they already asked us, accept it. */
async function addFriend(userId, code) {
  const target = await prisma.user.findUnique({ where: { friendCode: String(code).trim().toUpperCase() }, select: { id: true } });
  if (!target) throw new SocialError('No one has that friend code.', 404);
  if (target.id === userId) throw new SocialError("That's your own code.");
  const existing = await prisma.friendship.findFirst({
    where: { OR: [{ requesterId: userId, addresseeId: target.id }, { requesterId: target.id, addresseeId: userId }] },
  });
  if (existing?.status === 'accepted') throw new SocialError("You're already friends.", 409);
  if (existing && existing.requesterId === target.id) {
    await prisma.friendship.update({ where: { id: existing.id }, data: { status: 'accepted' } });
    return 'accepted';
  }
  if (existing) throw new SocialError('Request already sent.', 409);
  await prisma.friendship.create({ data: { requesterId: userId, addresseeId: target.id } });
  return 'requested';
}

async function acceptFriend(userId, friendshipId) {
  const { count } = await prisma.friendship.updateMany({
    where: { id: String(friendshipId), addresseeId: userId, status: 'pending' },
    data: { status: 'accepted' },
  });
  if (!count) throw new SocialError('Request not found.', 404);
}

/** Decline, cancel or unfriend. */
async function removeFriend(userId, friendshipId) {
  const { count } = await prisma.friendship.deleteMany({
    where: { id: String(friendshipId), OR: [{ requesterId: userId }, { addresseeId: userId }] },
  });
  if (!count) throw new SocialError('Not found.', 404);
}

// ─── Scores ──────────────────────────────────────────────────────────────────

const dayStart = (ymd) => new Date(`${ymd}T00:00:00.000Z`);
const dayEnd = (ymd) => new Date(`${ymd}T23:59:59.999Z`);

/**
 * Score each user on a metric between two dates (inclusive, UTC days).
 * Workouts logged in FitGuide and activities from connected services both count.
 * @returns {Promise<Map<string, number>>}
 */
async function scores(userIds, metric, startYmd, endYmd) {
  const result = new Map(userIds.map((id) => [id, 0]));
  if (!userIds.length) return result;

  if (metric === 'steps') {
    const rows = await prisma.dailyMetric.findMany({ where: { userId: { in: userIds }, date: { gte: startYmd, lte: endYmd } } });
    for (const id of userIds) {
      const merged = mergeByDate(rows.filter((r) => r.userId === id));
      result.set(id, merged.reduce((sum, d) => sum + (d.steps || 0), 0));
    }
    return result;
  }

  if (metric === 'foodDays') {
    const days = await prisma.foodLog.groupBy({ by: ['userId', 'date'], where: { userId: { in: userIds }, date: { gte: startYmd, lte: endYmd } } });
    for (const d of days) result.set(d.userId, result.get(d.userId) + 1);
    return result;
  }

  const range = { gte: dayStart(startYmd), lte: dayEnd(endYmd) };
  if (metric === 'volume') {
    const sets = await prisma.setLog.findMany({
      where: { session: { userId: { in: userIds }, completedAt: range }, reps: { gt: 0 }, weightKg: { gt: 0 } },
      select: { reps: true, weightKg: true, session: { select: { userId: true } } },
    });
    for (const s of sets) result.set(s.session.userId, result.get(s.session.userId) + s.reps * s.weightKg);
    for (const [id, kg] of result) result.set(id, Math.round(kg));
    return result;
  }
  const [sessions, external] = await Promise.all([
    prisma.workoutSession.findMany({ where: { userId: { in: userIds }, completedAt: range }, select: { userId: true, completedAt: true, durationSec: true } }),
    prisma.externalActivity.findMany({ where: { userId: { in: userIds }, startedAt: range }, select: { userId: true, startedAt: true, durationSec: true } }),
  ]);
  const all = [
    ...sessions.map((s) => ({ userId: s.userId, at: s.completedAt, durationSec: s.durationSec })),
    ...external.map((a) => ({ userId: a.userId, at: a.startedAt, durationSec: a.durationSec })),
  ];
  for (const id of userIds) {
    const mine = all.filter((x) => x.userId === id);
    if (metric === 'sessions') result.set(id, mine.length);
    if (metric === 'minutes') result.set(id, Math.round(mine.reduce((sum, x) => sum + x.durationSec, 0) / 60));
    if (metric === 'activeDays') result.set(id, new Set(mine.map((x) => x.at.toISOString().slice(0, 10))).size);
  }
  return result;
}

/** Ranked rows for these users (hidden users are left out, except the viewer). */
async function rank(userIds, metric, startYmd, endYmd, viewerId) {
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { ...userSelect, showOnLeaderboards: true } });
  const visible = users.filter((u) => u.showOnLeaderboards || u.id === viewerId);
  const byUser = await scores(visible.map((u) => u.id), metric, startYmd, endYmd);
  const rows = visible
    .map((u) => ({ ...person(u), score: byUser.get(u.id) || 0, isYou: u.id === viewerId }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  // Ties share a rank.
  rows.forEach((row, i) => { row.rank = i > 0 && rows[i - 1].score === row.score ? rows[i - 1].rank : i + 1; });
  return rows;
}

/** The viewer and their friends over the last 7 days. */
async function weeklyLeaderboard(userId, todayYmd, metric = 'minutes') {
  const ids = [userId, ...(await friendIds(userId))];
  const start = addDays(todayYmd, -6);
  return { metric, startDate: start, endDate: todayYmd, rows: await rank(ids, metric, start, todayYmd, userId) };
}

// ─── Challenges ──────────────────────────────────────────────────────────────

/** Challenges this user may see: public ones, friends' "friends" ones, and any they're in or made. */
async function visibleWhere(userId) {
  const friends = await friendIds(userId);
  return {
    OR: [
      { visibility: 'public' },
      { visibility: 'friends', creatorId: { in: [userId, ...friends] } },
      { creatorId: userId },
      { members: { some: { userId } } },
    ],
  };
}

function describe(c, userId, todayYmd) {
  const status = todayYmd < c.startDate ? 'upcoming' : todayYmd > c.endDate ? 'finished' : 'active';
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    metric: c.metric,
    metricLabel: METRICS[c.metric].label,
    unit: METRICS[c.metric].unit,
    target: c.target,
    startDate: c.startDate,
    endDate: c.endDate,
    visibility: c.visibility,
    status,
    memberCount: c._count?.members ?? c.members?.length ?? 0,
    joined: (c.members || []).some((m) => m.userId === userId),
    isCreator: c.creatorId === userId,
    // Only the creator sees the code; it's how others join a private challenge.
    ...(c.creatorId === userId && { joinCode: c.joinCode }),
  };
}

async function listChallenges(userId, todayYmd) {
  const challenges = await prisma.challenge.findMany({
    where: { AND: [await visibleWhere(userId), { endDate: { gte: addDays(todayYmd, -30) } }] },
    include: { members: { where: { userId }, select: { userId: true } }, _count: { select: { members: true } } },
    orderBy: [{ startDate: 'asc' }, { createdAt: 'asc' }],
  });
  return challenges.map((c) => describe(c, userId, todayYmd));
}

async function createChallenge(userId, input, todayYmd) {
  if (input.endDate < input.startDate) throw new SocialError('The end date must be after the start date.');
  if (input.endDate < todayYmd) throw new SocialError('The challenge would already be over.');
  const challenge = await prisma.challenge.create({
    data: {
      title: input.title,
      description: input.description || '',
      metric: input.metric,
      target: input.target ?? null,
      startDate: input.startDate,
      endDate: input.endDate,
      visibility: input.visibility,
      joinCode: randomCode(8),
      creatorId: userId,
      members: { create: { userId } },
    },
    include: { members: true },
  });
  return describe(challenge, userId, todayYmd);
}

/** A challenge the user may see, with its leaderboard. */
async function getChallenge(userId, id, todayYmd) {
  const challenge = await prisma.challenge.findFirst({
    where: { AND: [{ id: String(id) }, await visibleWhere(userId)] },
    include: { members: { select: { userId: true } } },
  });
  if (!challenge) throw new SocialError('Challenge not found.', 404);
  const end = challenge.endDate < todayYmd ? challenge.endDate : todayYmd;
  const leaderboard = todayYmd < challenge.startDate
    ? []
    : await rank(challenge.members.map((m) => m.userId), challenge.metric, challenge.startDate, end, userId);
  return { ...describe(challenge, userId, todayYmd), leaderboard };
}

/** Join by id (public / friends) or by join code (any visibility). */
async function joinChallenge(userId, { id, code }, todayYmd) {
  const challenge = code
    ? await prisma.challenge.findUnique({ where: { joinCode: String(code).trim().toUpperCase() } })
    : await prisma.challenge.findFirst({ where: { AND: [{ id: String(id) }, await visibleWhere(userId)] } });
  if (!challenge) throw new SocialError('Challenge not found.', 404);
  if (challenge.visibility === 'private' && !code && challenge.creatorId !== userId) throw new SocialError('Challenge not found.', 404);
  if (challenge.endDate < todayYmd) throw new SocialError('That challenge has finished.', 409);
  await prisma.challengeMember.upsert({
    where: { challengeId_userId: { challengeId: challenge.id, userId } },
    create: { challengeId: challenge.id, userId },
    update: {},
  });
  return getChallenge(userId, challenge.id, todayYmd);
}

async function leaveChallenge(userId, id) {
  const { count } = await prisma.challengeMember.deleteMany({ where: { challengeId: String(id), userId } });
  if (!count) throw new SocialError("You're not in that challenge.", 404);
}

async function deleteChallenge(userId, id) {
  const { count } = await prisma.challenge.deleteMany({ where: { id: String(id), creatorId: userId } });
  if (!count) throw new SocialError('Only the creator can delete a challenge.', 404);
}

module.exports = {
  METRICS,
  VISIBILITIES,
  SocialError,
  displayName,
  friendCode,
  friendships,
  friendIds,
  addFriend,
  acceptFriend,
  removeFriend,
  scores,
  weeklyLeaderboard,
  listChallenges,
  createChallenge,
  getChallenge,
  joinChallenge,
  leaveChallenge,
  deleteChallenge,
};
