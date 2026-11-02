/**
 * The daily readiness score (0–100): how ready the member is to train today,
 * from a quick morning check-in (energy and soreness, 1–5), last night's
 * sleep and today's resting heart rate when a phone or watch syncs them, and
 * how hard the last few days' workouts were.
 *
 * On a low day, a member following a personal plan is offered an easier
 * workout in place of today's; nothing changes unless they take it.
 * This is guidance for training, not a medical measure.
 */
const { prisma } = require('../db/prisma');
const { mergeByDate } = require('./healthData');
const plans = require('./plans');
const { swapFor } = require('./planGenerator');
const { addDays, localDate } = require('../utils/dates');

const BANDS = [
  { min: 75, band: 'push', headline: 'Ready to push', advice: 'A good day for a harder session or a new personal record.' },
  { min: 50, band: 'steady', headline: 'Good to train', advice: 'Train as planned and listen to your body.' },
  { min: 0, band: 'easy', headline: 'Take it easy', advice: 'Go lighter today: an easier session, mobility or a walk.' },
];

const hm = (minutes) => `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ''}`;

/**
 * The score and why, from what's known. Missing numbers count as neutral.
 * @param {object} f
 * @param {number} f.energy        1 (drained) – 5 (great)
 * @param {number} f.soreness      1 (none) – 5 (very sore)
 * @param {number|null} f.sleepMinutes      last night
 * @param {number|null} f.restingHrDiff     today's resting heart rate minus the usual
 * @param {boolean} f.hardYesterday         a session yesterday at effort 8+ or over 75 minutes
 * @param {number} f.daysInARow             days trained in a row up to yesterday
 */
function score(f) {
  let value = 70;
  const reasons = [];
  const add = (points, text) => {
    value += points;
    if (text) reasons.push({ text, effect: points > 0 ? 'up' : points < 0 ? 'down' : 'none' });
  };

  add((f.energy - 3) * 8, ['Feeling drained', 'Low on energy', null, 'Feeling energetic', 'Feeling great'][f.energy - 1]);
  add(-(f.soreness - 1) * 6, [null, 'A little sore', 'Sore', 'Quite sore', 'Very sore'][f.soreness - 1]);

  if (f.sleepMinutes != null) {
    const m = f.sleepMinutes;
    const points = m < 300 ? -20 : m < 360 ? -12 : m < 420 ? -4 : m >= 480 ? 8 : 0;
    add(points, `Slept ${hm(m)}`);
  }
  if (f.restingHrDiff != null) {
    const d = f.restingHrDiff;
    if (d >= 7) add(-12, `Resting heart rate ${d} above your usual`);
    else if (d >= 4) add(-6, `Resting heart rate ${d} above your usual`);
    else if (d <= -3) add(4, 'Resting heart rate below your usual');
  }
  if (f.hardYesterday) add(-8, 'Hard session yesterday');
  if (f.daysInARow >= 3) add(-6, `Trained ${f.daysInARow} days in a row`);

  const final = Math.max(0, Math.min(100, Math.round(value)));
  const { band, headline, advice } = BANDS.find((b) => final >= b.min);
  return { score: final, band, headline, advice, reasons };
}

/** The numbers behind today's score. */
async function factors(userId, todayYmd, tzOffset) {
  const [rows, sessions] = await Promise.all([
    prisma.dailyMetric.findMany({ where: { userId, date: { gte: addDays(todayYmd, -28), lte: todayYmd } } }),
    prisma.workoutSession.findMany({
      where: { userId, completedAt: { gte: new Date(Date.now() - 10 * 864e5) } },
      select: { completedAt: true, perceivedEffort: true, durationSec: true },
    }),
  ]);
  const days = mergeByDate(rows);
  const byDate = new Map(days.map((d) => [d.date, d]));
  // Sleep is filed under the morning it ended, or the evening before on some phones.
  const sleepMinutes = byDate.get(todayYmd)?.sleepMinutes ?? byDate.get(addDays(todayYmd, -1))?.sleepMinutes ?? null;

  const todayHr = byDate.get(todayYmd)?.restingHr ?? null;
  const usual = days.filter((d) => d.date < todayYmd && d.restingHr != null).map((d) => d.restingHr);
  const restingHrDiff = todayHr != null && usual.length >= 7 ? Math.round(todayHr - usual.reduce((a, b) => a + b, 0) / usual.length) : null;

  const yesterday = addDays(todayYmd, -1);
  const trainedOn = new Set(sessions.map((s) => localDate(s.completedAt, tzOffset)));
  const hardYesterday = sessions.some((s) => localDate(s.completedAt, tzOffset) === yesterday && ((s.perceivedEffort ?? 0) >= 8 || s.durationSec > 75 * 60));
  let daysInARow = 0;
  while (trainedOn.has(addDays(todayYmd, -(daysInARow + 1)))) daysInARow += 1;

  return { sleepMinutes, restingHrDiff, hardYesterday, daysInARow };
}

/** On a low day: an easier workout for today's open day of the member's personal plan. */
async function easierToday(userId, todayYmd) {
  const found = await plans.activePersonal(userId);
  if (!found) return null;
  const today = (await plans.current(userId, todayYmd))?.schedule.find((d) => d.date === todayYmd && d.status !== 'done');
  if (!today) return null;
  const all = await plans.catalog();
  const current = all.find((w) => w.slug === today.workoutSlug);
  const easier = current && swapFor(current, 'easier', await plans.candidatesFor(found.program));
  if (!easier) return null;
  return { week: today.week, day: today.day, title: today.title, newTitle: today.title.replace(/:.*$/, `: ${easier.title}`), workoutSlug: easier.slug };
}

/** Today's readiness: the check-in, and once it's done, the score. */
async function today(userId, todayYmd, tzOffset) {
  const check = await prisma.readinessCheck.findUnique({ where: { userId_date: { userId, date: todayYmd } } });
  if (!check) return { date: todayYmd, checkedIn: false };
  const result = score({ energy: check.energy, soreness: check.soreness, ...(await factors(userId, todayYmd, tzOffset)) });
  return {
    date: todayYmd,
    checkedIn: true,
    energy: check.energy,
    soreness: check.soreness,
    ...result,
    easierSwap: result.band === 'easy' ? await easierToday(userId, todayYmd) : null,
  };
}

async function checkIn(userId, todayYmd, { energy, soreness }) {
  await prisma.readinessCheck.upsert({
    where: { userId_date: { userId, date: todayYmd } },
    create: { userId, date: todayYmd, energy, soreness },
    update: { energy, soreness },
  });
}

module.exports = { BANDS, score, factors, today, checkIn };
