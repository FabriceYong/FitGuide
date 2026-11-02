/**
 * Crews: small invite-only groups (up to 8 people) that train together
 * towards a shared weekly goal (workouts by the whole crew, Monday to
 * Sunday), see each other's workouts and chat. Joining a crew is joining
 * its circle: members see each other's workouts there whatever their
 * friends-feed setting. People appear as first name + initial.
 */
const crypto = require('crypto');
const { prisma, isUniqueViolation } = require('../db/prisma');
const reminders = require('./reminders');
const { displayName } = require('../utils/names');
const { addDays, localDate } = require('../utils/dates');

const MAX_MEMBERS = 8;
const MAX_CREWS = 5;
const MESSAGES = 50;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I

class CrewError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const randomCode = () => Array.from(crypto.randomBytes(8), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');

/** Monday of the week `todayYmd` is in. */
function weekStart(todayYmd) {
  const weekday = new Date(`${todayYmd}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(todayYmd, -((weekday + 6) % 7));
}

/** Each member's workouts this week (local dates), and the crew's total. */
async function weekCounts(userIds, todayYmd, tzOffset) {
  const monday = weekStart(todayYmd);
  // A day either side, so every local date in the week is covered whatever the time zone.
  const sessions = await prisma.workoutSession.findMany({
    where: { userId: { in: userIds }, completedAt: { gte: new Date(`${addDays(monday, -1)}T00:00:00Z`) } },
    select: { userId: true, completedAt: true },
  });
  const counts = new Map(userIds.map((id) => [id, 0]));
  for (const s of sessions) {
    const day = localDate(s.completedAt, tzOffset);
    if (day >= monday && day <= todayYmd) counts.set(s.userId, counts.get(s.userId) + 1);
  }
  return { monday, counts, total: [...counts.values()].reduce((a, b) => a + b, 0) };
}

async function membership(userId, crewId) {
  const member = await prisma.crewMember.findUnique({ where: { crewId_userId: { crewId: String(crewId), userId } } });
  if (!member) throw new CrewError('Crew not found.', 404);
  return member;
}

/** The member's crews with this week's progress. */
async function list(userId, todayYmd, tzOffset) {
  const crews = await prisma.crew.findMany({
    where: { members: { some: { userId } } },
    include: { members: { select: { userId: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return Promise.all(crews.map(async (c) => {
    const { total } = await weekCounts(c.members.map((m) => m.userId), todayYmd, tzOffset);
    return { id: c.id, name: c.name, weeklyGoal: c.weeklyGoal, memberCount: c.members.length, thisWeek: total };
  }));
}

async function create(userId, { name, weeklyGoal }) {
  if (await prisma.crewMember.count({ where: { userId } }) >= MAX_CREWS) throw new CrewError(`You can be in up to ${MAX_CREWS} crews.`, 409);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const crew = await prisma.crew.create({
        data: { name, weeklyGoal, inviteCode: randomCode(), creatorId: userId, members: { create: { userId, role: 'owner' } } },
      });
      return crew.id;
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }
  }
  throw new Error('Could not make an invite code.');
}

async function join(userId, code) {
  const crew = await prisma.crew.findUnique({ where: { inviteCode: String(code).trim().toUpperCase() }, include: { members: { select: { userId: true } } } });
  if (!crew) throw new CrewError('No crew has that invite code.', 404);
  if (crew.members.some((m) => m.userId === userId)) return crew.id;
  if (crew.members.length >= MAX_MEMBERS) throw new CrewError(`${crew.name} is full (${MAX_MEMBERS} people).`, 409);
  if (await prisma.crewMember.count({ where: { userId } }) >= MAX_CREWS) throw new CrewError(`You can be in up to ${MAX_CREWS} crews.`, 409);
  await prisma.crewMember.create({ data: { crewId: crew.id, userId } });
  return crew.id;
}

/** A crew as its members see it: goal progress, members, the week's workouts and the chat. */
async function get(userId, crewId, todayYmd, tzOffset) {
  const me = await membership(userId, crewId);
  const crew = await prisma.crew.findUnique({
    where: { id: me.crewId },
    include: {
      members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } }, orderBy: { joinedAt: 'asc' } },
      messages: { orderBy: { createdAt: 'desc' }, take: MESSAGES, include: { user: { select: { id: true, name: true } } } },
    },
  });
  const ids = crew.members.map((m) => m.userId);
  const { monday, counts, total } = await weekCounts(ids, todayYmd, tzOffset);
  const activity = await prisma.workoutSession.findMany({
    where: { userId: { in: ids }, completedAt: { gte: new Date(Date.now() - 7 * 864e5) } },
    orderBy: { completedAt: 'desc' },
    take: 30,
    select: { id: true, userId: true, workoutTitle: true, completedAt: true, durationSec: true },
  });
  const names = new Map(crew.members.map((m) => [m.userId, displayName(m.user.name)]));
  return {
    id: crew.id,
    name: crew.name,
    weeklyGoal: crew.weeklyGoal,
    inviteCode: crew.inviteCode,
    weekStart: monday,
    thisWeek: total,
    isOwner: me.role === 'owner',
    members: crew.members.map((m) => ({
      id: m.userId,
      name: names.get(m.userId),
      avatarUrl: m.user.avatarUrl || null,
      role: m.role,
      isYou: m.userId === userId,
      workoutsThisWeek: counts.get(m.userId),
    })),
    activity: activity.map((a) => ({ id: a.id, name: names.get(a.userId), isYou: a.userId === userId, workoutTitle: a.workoutTitle, completedAt: a.completedAt, durationSec: a.durationSec })),
    // Oldest first, like a chat.
    messages: crew.messages.reverse().map((m) => ({ id: m.id, name: displayName(m.user.name), isYou: m.userId === userId, text: m.text, createdAt: m.createdAt })),
  };
}

async function update(userId, crewId, { name, weeklyGoal }) {
  const me = await membership(userId, crewId);
  if (me.role !== 'owner') throw new CrewError('Only the crew’s owner can change it.', 403);
  await prisma.crew.update({ where: { id: me.crewId }, data: { ...(name !== undefined && { name }), ...(weeklyGoal !== undefined && { weeklyGoal }) } });
}

/** Say something to the crew; the others get a browser notification if they have reminders on. */
async function say(user, crewId, text) {
  const me = await membership(user.id, crewId);
  const message = await prisma.crewMessage.create({ data: { crewId: me.crewId, userId: user.id, text } });
  if (reminders.isConfigured()) {
    const crew = await prisma.crew.findUnique({ where: { id: me.crewId }, select: { id: true, name: true, members: { select: { userId: true } } } });
    const others = crew.members.map((m) => m.userId).filter((id) => id !== user.id);
    const subscriptions = await prisma.pushSubscription.findMany({ where: { userId: { in: others } } });
    const body = `${displayName(user.name)}: ${text.length > 100 ? `${text.slice(0, 99)}…` : text}`;
    reminders.pushTo(subscriptions, { kind: 'crew', title: crew.name, body, url: `/community/crews/${crew.id}` }).catch((err) => console.warn('Crew push failed:', err.message));
  }
  return { id: message.id, name: displayName(user.name), isYou: true, text: message.text, createdAt: message.createdAt };
}

/** Leave; if the owner leaves, the longest-standing member takes over, and an empty crew is deleted. */
async function leave(userId, crewId) {
  const me = await membership(userId, crewId);
  await prisma.$transaction(async (tx) => {
    await tx.crewMember.delete({ where: { crewId_userId: { crewId: me.crewId, userId } } });
    const next = await tx.crewMember.findFirst({ where: { crewId: me.crewId }, orderBy: { joinedAt: 'asc' } });
    if (!next) await tx.crew.delete({ where: { id: me.crewId } });
    else if (me.role === 'owner') await tx.crewMember.update({ where: { crewId_userId: { crewId: me.crewId, userId: next.userId } }, data: { role: 'owner' } });
  });
}

/** The owner removes someone from the crew. */
async function remove(userId, crewId, memberId) {
  const me = await membership(userId, crewId);
  if (me.role !== 'owner') throw new CrewError('Only the crew’s owner can remove people.', 403);
  if (memberId === userId) throw new CrewError('To leave the crew, use Leave.');
  const { count } = await prisma.crewMember.deleteMany({ where: { crewId: me.crewId, userId: String(memberId) } });
  if (!count) throw new CrewError('Not in this crew.', 404);
}

module.exports = { MAX_MEMBERS, MAX_CREWS, CrewError, weekStart, list, create, join, get, update, say, leave, remove };
