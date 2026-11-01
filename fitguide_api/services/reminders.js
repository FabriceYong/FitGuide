/**
 * Workout and streak reminders.
 *
 * Members choose weekdays and a time for a "time to train" reminder, and can
 * turn on an evening nudge when a streak of 2+ days would end tonight. No
 * reminder comes on a day they've already trained.
 *
 * - Browsers get them from the server by Web Push: runDue() runs every
 *   minute and sends what's due in each member's time zone. Set
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT (keys from
 *   `npm run vapid-keys`).
 * - The app schedules its own notifications on the phone from upcoming().
 */
const webpush = require('web-push');
const { prisma } = require('../db/prisma');
const { describeAll } = require('./enrollments');
const { streaks, activityByDate } = require('./progress');
const { addDays } = require('../utils/dates');

const STREAK_TIME = '20:00';
// A reminder more than this late (the server was down) isn't sent.
const LATE_MINUTES = 180;
const UPCOMING_DAYS = 14;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// Push services the browsers use. The server posts to a subscription's
// endpoint, so only these hosts are accepted.
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^android\.googleapis\.com$/, /\.push\.services\.mozilla\.com$/, /\.notify\.windows\.com$/, /\.push\.apple\.com$/];

let sender = null;

const publicKey = () => process.env.VAPID_PUBLIC_KEY || null;
const isConfigured = () => Boolean(sender || (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY));

/** Replace how pushes are sent (tests): fn(subscription, payloadJson). */
function setSender(fn) {
  sender = fn;
}

function send(subscription, payload) {
  if (sender) return sender(subscription, payload);
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:support@fitguide.app', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  return webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload, { TTL: 60 * 60 });
}

const isTime = (value) => typeof value === 'string' && TIME.test(value);
const minutesOf = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));

function isTimeZone(value) {
  if (typeof value !== 'string' || !value || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function isPushEndpoint(value) {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && PUSH_HOSTS.some((host) => host.test(url.hostname));
  } catch {
    return false;
  }
}

/** The local date, minutes past midnight and UTC offset (as tzOffset) in a time zone. */
function localNow(now, timeZone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map((p) => [p.type, p.value]));
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  const localMs = Date.parse(`${date}T00:00:00Z`) + minutes * 60 * 1000;
  const tzOffset = Math.round((Math.floor(now.getTime() / 60000) * 60000 - localMs) / 60000);
  return { date, minutes, tzOffset, weekday: new Date(`${date}T00:00:00Z`).getUTCDay() };
}

const settingsOf = (user) => ({
  days: [...(user.reminderDays || [])].sort((a, b) => a - b),
  time: user.reminderTime,
  streak: user.streakReminder,
  timeZone: user.timeZone || null,
});

/** Whether the user trained today, and their current streak. */
async function activity(userId, tzOffset, todayYmd) {
  const since = new Date(Date.parse(`${addDays(todayYmd, -400)}T00:00:00Z`));
  const [sessions, external] = await Promise.all([
    prisma.workoutSession.findMany({ where: { userId, completedAt: { gte: since } }, select: { completedAt: true } }),
    prisma.externalActivity.findMany({ where: { userId, startedAt: { gte: since } }, select: { startedAt: true, durationSec: true } }),
  ]);
  const done = [...sessions, ...external.map((a) => ({ completedAt: new Date(a.startedAt.getTime() + a.durationSec * 1000) }))];
  const dates = new Set(activityByDate(done, tzOffset).keys());
  const { current, trainedToday } = streaks(dates, todayYmd);
  return { current, trainedToday };
}

/** Planned workouts by date (the active program or plan), not yet done. */
async function plannedTitles(userId, todayYmd) {
  const [active] = (await describeAll(userId, todayYmd)).filter((e) => e.status === 'active');
  return new Map((active?.schedule || []).filter((d) => d.status !== 'done').map((d) => [d.date, d.title]));
}

const workoutMessage = (planned) => (planned
  ? { kind: 'workout', title: 'Time to train', body: `Today's plan: ${planned}. Tap to start.`, url: '/plan' }
  : { kind: 'workout', title: 'Time to train', body: 'Your workout reminder. Even 15 minutes counts.', url: '/' });

const streakMessage = (days) => ({
  kind: 'streak',
  title: 'Keep your streak going',
  body: `You've trained ${days} days in a row. A short workout today keeps it going.`,
  url: '/',
});

async function settings(userId) {
  const user = await prisma.user.findUnique({ where: { id: String(userId) } });
  return user ? settingsOf(user) : null;
}

/** Save the settings; a time zone, when given, is the browser's. */
async function update(userId, { days, time, streak, timeZone }) {
  const data = {};
  if (days !== undefined) data.reminderDays = [...new Set(days)].sort((a, b) => a - b);
  if (time !== undefined) data.reminderTime = time;
  if (streak !== undefined) data.streakReminder = streak;
  if (timeZone) data.timeZone = timeZone;
  return settingsOf(await prisma.user.update({ where: { id: String(userId) }, data }));
}

/**
 * The reminders for the next two weeks, for a phone to schedule: each with
 * its local date and time. Today's are left out once the user has trained.
 */
async function upcoming(userId, tzOffset, todayYmd) {
  const user = await prisma.user.findUnique({ where: { id: String(userId) } });
  if (!user || (!user.reminderDays.length && !user.streakReminder)) return [];
  const [{ current, trainedToday }, planned] = await Promise.all([activity(user.id, tzOffset, todayYmd), plannedTitles(user.id, todayYmd)]);

  const items = [];
  for (let i = 0; i < UPCOMING_DAYS; i += 1) {
    const date = addDays(todayYmd, i);
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    if (user.reminderDays.includes(weekday) && !(i === 0 && trainedToday)) {
      items.push({ date, time: user.reminderTime, ...workoutMessage(planned.get(date)) });
    }
  }
  // Tonight if the streak is at risk; after training today, tomorrow night.
  if (user.streakReminder && current >= 2) {
    items.push({ date: trainedToday ? addDays(todayYmd, 1) : todayYmd, time: STREAK_TIME, ...streakMessage(current) });
  }
  return items.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

/** Add (or move to this user) a browser's push subscription. */
async function subscribe(userId, { endpoint, keys, timeZone }) {
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: String(userId), endpoint, p256dh: keys.p256dh, auth: keys.auth },
    update: { userId: String(userId), p256dh: keys.p256dh, auth: keys.auth },
  });
  if (timeZone) await prisma.user.update({ where: { id: String(userId) }, data: { timeZone } });
}

async function unsubscribe(userId, endpoint) {
  await prisma.pushSubscription.deleteMany({ where: { userId: String(userId), endpoint } });
}

/** Mark a kind of reminder sent for a local date; false if it already was. */
async function claim(userId, field, date) {
  const { count } = await prisma.user.updateMany({
    where: { id: userId, OR: [{ [field]: null }, { [field]: { not: date } }] },
    data: { [field]: date },
  });
  return count === 1;
}

async function pushTo(subscriptions, message) {
  const payload = JSON.stringify({ title: message.title, body: message.body, url: message.url, tag: `fitguide-${message.kind}` });
  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await send(subscription, payload);
    } catch (err) {
      // The browser unsubscribed or the subscription expired.
      if (err.statusCode === 404 || err.statusCode === 410) await prisma.pushSubscription.deleteMany({ where: { id: subscription.id } });
      else console.warn('Reminder push failed:', err.statusCode || err.message);
    }
  }));
}

/**
 * Send every reminder that's due now to the members' browsers. Each kind is
 * claimed per local date before sending, so it goes out once a day even
 * with several API servers.
 * @returns {Promise<{ userId: string, kind: string }[]>} what was sent
 */
async function runDue(now = new Date()) {
  if (!isConfigured()) return [];
  const users = await prisma.user.findMany({
    where: { pushSubscriptions: { some: {} }, OR: [{ reminderDays: { isEmpty: false } }, { streakReminder: true }] },
    include: { pushSubscriptions: true },
  });
  const sent = [];
  for (const user of users) {
    try {
      const { date, minutes, tzOffset, weekday } = localNow(now, user.timeZone || 'UTC');
      const inWindow = (hhmm) => minutes >= minutesOf(hhmm) && minutes < minutesOf(hhmm) + LATE_MINUTES;
      const workoutDue = user.reminderDays.includes(weekday) && inWindow(user.reminderTime) && user.workoutReminderOn !== date;
      const streakDue = user.streakReminder && inWindow(STREAK_TIME) && user.streakReminderOn !== date;
      if (!workoutDue && !streakDue) continue;

      const { current, trainedToday } = await activity(user.id, tzOffset, date);
      if (workoutDue && await claim(user.id, 'workoutReminderOn', date) && !trainedToday) {
        await pushTo(user.pushSubscriptions, workoutMessage((await plannedTitles(user.id, date)).get(date)));
        sent.push({ userId: user.id, kind: 'workout' });
      }
      if (streakDue && await claim(user.id, 'streakReminderOn', date) && !trainedToday && current >= 2) {
        await pushTo(user.pushSubscriptions, streakMessage(current));
        sent.push({ userId: user.id, kind: 'streak' });
      }
    } catch (err) {
      console.error(`Reminders for user ${user.id} failed:`, err.message);
    }
  }
  return sent;
}

/** Check for due reminders every minute (server.js). */
function start() {
  const timer = setInterval(() => runDue().catch((err) => console.error('Reminders failed:', err.message)), 60 * 1000);
  timer.unref();
  return timer;
}

module.exports = {
  STREAK_TIME, isTime, isTimeZone, isPushEndpoint, localNow,
  publicKey, isConfigured, setSender, settings, update, upcoming, subscribe, unsubscribe, runDue, start,
};
