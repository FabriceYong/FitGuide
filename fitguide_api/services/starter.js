/**
 * The first-week starter journey: seven small first steps, shown on the
 * home page for an account's first two weeks, each ticked off from what
 * the member has actually done (nothing to tick by hand). The member can
 * hide it.
 */
const { prisma } = require('../db/prisma');

const SHOW_DAYS = 14;

/** The steps, in order; `href` is the page that does it (null: the home page itself). */
const STEPS = [
  { id: 'first_workout', title: 'Finish your first workout', href: '/?tab=explore' },
  { id: 'meal', title: 'Log a meal', href: '/nutrition' },
  { id: 'reminder', title: 'Set a workout reminder', href: '/?tab=profile' },
  { id: 'friend', title: 'Add a friend or join a crew', href: '/community' },
  { id: 'photo', title: 'Take a progress photo', href: '/progress' },
  { id: 'checkin', title: 'Check your readiness', href: null },
  { id: 'second_workout', title: 'Finish a second workout', href: '/?tab=explore' },
];

async function journey(userId, now = new Date()) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true, starterHidden: true, reminderDays: true, streakReminder: true },
  });
  const ageDays = Math.floor((now - user.createdAt) / 864e5);
  const [sessions, meals, friends, crews, photos, checkins] = await Promise.all([
    prisma.workoutSession.count({ where: { userId } }),
    prisma.foodLog.count({ where: { userId } }),
    prisma.friendship.count({ where: { OR: [{ requesterId: userId }, { addresseeId: userId }] } }),
    prisma.crewMember.count({ where: { userId } }),
    prisma.progressPhoto.count({ where: { userId } }),
    prisma.readinessCheck.count({ where: { userId } }),
  ]);
  const done = {
    first_workout: sessions >= 1,
    meal: meals >= 1,
    reminder: user.reminderDays.length > 0 || user.streakReminder,
    friend: friends + crews > 0,
    photo: photos >= 1,
    checkin: checkins >= 1,
    second_workout: sessions >= 2,
  };
  const steps = STEPS.map((s) => ({ ...s, done: done[s.id] }));
  return {
    show: !user.starterHidden && ageDays < SHOW_DAYS,
    daysLeft: Math.max(0, SHOW_DAYS - ageDays),
    done: steps.filter((s) => s.done).length,
    total: steps.length,
    steps,
  };
}

async function hide(userId) {
  await prisma.user.update({ where: { id: userId }, data: { starterHidden: true } });
}

module.exports = { STEPS, SHOW_DAYS, journey, hide };
