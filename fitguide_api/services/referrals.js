/**
 * Invites: a member shares their link (their friend code); someone who
 * signs up with it becomes their friend, and once the new member finishes
 * their first workout, both get a week of PLUS (User.plusUntil, added on
 * top of any time left). An inviter is rewarded for up to 12 people.
 */
const { prisma } = require('../db/prisma');
const reminders = require('./reminders');
const { friendCode } = require('./social');
const { displayName } = require('../utils/names');

const REWARD_DAYS = 7;
const MAX_REWARDS = 12;

/** The member's invite code and how their invites have gone. */
async function info(userId) {
  const [code, invited, rewarded, user] = await Promise.all([
    friendCode(userId),
    prisma.user.count({ where: { referredById: userId } }),
    prisma.user.count({ where: { referredById: userId, referralRewardedAt: { not: null } } }),
    prisma.user.findUnique({ where: { id: userId }, select: { plusUntil: true } }),
  ]);
  const plusUntil = user.plusUntil && user.plusUntil > new Date() ? user.plusUntil : null;
  return { code, invited, rewarded, rewardDays: REWARD_DAYS, rewardsLeft: Math.max(0, MAX_REWARDS - rewarded), plusUntil };
}

/** At sign-up: who invited the new member (an unknown code is ignored), and make them friends. */
async function attach(newUserId, code) {
  if (!code) return;
  const inviter = await prisma.user.findUnique({ where: { friendCode: String(code).trim().toUpperCase() }, select: { id: true } });
  if (!inviter || inviter.id === newUserId) return;
  await prisma.user.update({ where: { id: newUserId }, data: { referredById: inviter.id } });
  await prisma.friendship.create({ data: { requesterId: inviter.id, addresseeId: newUserId, status: 'accepted' } }).catch(() => {});
}

/** PLUS for `days` more, from now or from when the current invite PLUS ends. */
async function extendPlus(userId, days) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plusUntil: true } });
  const from = user.plusUntil && user.plusUntil > new Date() ? user.plusUntil : new Date();
  await prisma.user.update({ where: { id: userId }, data: { plusUntil: new Date(from.getTime() + days * 864e5) } });
}

/**
 * After a workout is saved: if it's an invited member's first, reward both
 * (once). Returns true when it did.
 */
async function rewardFirstWorkout(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, referredById: true, referralRewardedAt: true } });
  if (!user?.referredById || user.referralRewardedAt) return false;
  // Claimed in one step, so two saves at once reward only once.
  const { count } = await prisma.user.updateMany({ where: { id: userId, referralRewardedAt: null }, data: { referralRewardedAt: new Date() } });
  if (!count) return false;
  await extendPlus(userId, REWARD_DAYS);
  const rewarded = await prisma.user.count({ where: { referredById: user.referredById, referralRewardedAt: { not: null } } });
  if (rewarded <= MAX_REWARDS) {
    await extendPlus(user.referredById, REWARD_DAYS);
    if (reminders.isConfigured()) {
      const subscriptions = await prisma.pushSubscription.findMany({ where: { userId: user.referredById } });
      reminders.pushTo(subscriptions, { kind: 'invite', title: 'A week of PLUS for you both', body: `${displayName(user.name)} finished their first workout.`, url: '/plus' })
        .catch((err) => console.warn('Invite push failed:', err.message));
    }
  }
  return true;
}

module.exports = { REWARD_DAYS, MAX_REWARDS, info, attach, extendPlus, rewardFirstWorkout };
