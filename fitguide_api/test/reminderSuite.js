/**
 * Workout and streak reminders: settings, browser subscriptions and sending
 * what's due. Runs inside defineApiSuite.
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const reminders = require('../services/reminders');
const { prisma } = require('../db/prisma');

let unique = 0;
const endpoint = () => `https://fcm.googleapis.com/fcm/send/test-${Date.now()}-${(unique += 1)}`;
const subscription = (url = endpoint()) => ({ endpoint: url, keys: { p256dh: 'BKey', auth: 'secret' } });

// 07:31 on Thursday 5 November 2026 in Tokyo (UTC+9).
const TOKYO_0731 = new Date('2026-11-04T22:31:00Z');
const minutesLater = (date, minutes) => new Date(date.getTime() + minutes * 60 * 1000);

/** A finished session at an instant. */
const trainAt = (userId, completedAt) => prisma.workoutSession.create({
  data: { userId, workoutSlug: 'core-power-blast', workoutTitle: 'Core Power Blast', startedAt: minutesLater(completedAt, -30), completedAt, durationSec: 1800 },
});

function defineReminderSuite(ctx) {
  // Pushes that would have gone to browsers.
  let pushed = [];
  let failWith = null;
  before(() => {
    reminders.setSender(async (sub, payload) => {
      if (failWith) throw Object.assign(new Error('push failed'), { statusCode: failWith });
      pushed.push({ endpoint: sub.endpoint, ...JSON.parse(payload) });
    });
  });
  after(() => reminders.setSender(null));

  const pushesTo = (url) => pushed.filter((p) => p.endpoint === url);

  /** A member with reminders set up and one browser subscribed. */
  async function member(name, settings) {
    const account = await ctx().signUp(name);
    await account.agent.put('/api/reminders').send({ timeZone: 'Asia/Tokyo', ...settings }).expect(200);
    const sub = subscription();
    await account.agent.post('/api/reminders/push').send(sub).expect(201);
    return { ...account, endpoint: sub.endpoint };
  }

  it('saves the settings and lists the next two weeks for the app', async () => {
    const { app } = ctx();
    await request(app).get('/api/reminders').expect(401);
    const { agent } = await ctx().signUp('Reminder Settings');

    const start = await agent.get('/api/reminders').expect(200);
    assert.deepEqual(start.body.settings, { days: [], time: '18:00', streak: false, timeZone: null });
    assert.deepEqual(start.body.upcoming, []);

    await agent.put('/api/reminders').send({ days: [7] }).expect(400);
    await agent.put('/api/reminders').send({ time: '25:00' }).expect(400);
    await agent.put('/api/reminders').send({ timeZone: 'Mars/Olympus_Mons' }).expect(400);

    const saved = await agent.put('/api/reminders').send({ days: [3, 1, 3], time: '06:45', streak: true, timeZone: 'Europe/Paris' }).expect(200);
    assert.deepEqual(saved.body.settings, { days: [1, 3], time: '06:45', streak: true, timeZone: 'Europe/Paris' });
    // Mondays and Wednesdays for two weeks; no streak to keep yet.
    assert.equal(saved.body.upcoming.length, 4);
    for (const item of saved.body.upcoming) {
      assert.equal(item.kind, 'workout');
      assert.equal(item.time, '06:45');
      assert.ok([1, 3].includes(new Date(`${item.date}T00:00:00Z`).getUTCDay()));
    }
    // The app leaves the time zone alone.
    const fromApp = await agent.put('/api/reminders').send({ days: [] }).expect(200);
    assert.equal(fromApp.body.settings.timeZone, 'Europe/Paris');
    assert.deepEqual(fromApp.body.upcoming, []);
  });

  it('subscribes browsers only at push services', async () => {
    const { agent, user } = await ctx().signUp('Reminder Browser');
    await agent.post('/api/reminders/push').send(subscription('https://localhost/steal')).expect(400);
    await agent.post('/api/reminders/push').send(subscription('http://fcm.googleapis.com/fcm/send/x')).expect(400);
    await agent.post('/api/reminders/push').send({ endpoint: endpoint() }).expect(400);

    const sub = subscription();
    await agent.post('/api/reminders/push').send({ ...sub, timeZone: 'America/New_York' }).expect(201);
    await agent.post('/api/reminders/push').send(sub).expect(201); // again: still one
    assert.equal(await prisma.pushSubscription.count({ where: { userId: user.id } }), 1);
    assert.equal((await agent.get('/api/reminders').expect(200)).body.settings.timeZone, 'America/New_York');

    // The same browser signed in to another account now gets that account's reminders.
    const other = await ctx().signUp('Reminder Other');
    await other.agent.post('/api/reminders/push').send(sub).expect(201);
    assert.equal(await prisma.pushSubscription.count({ where: { userId: user.id } }), 0);

    await other.agent.delete('/api/reminders/push').send({ endpoint: sub.endpoint }).expect(200);
    assert.equal(await prisma.pushSubscription.count({ where: { endpoint: sub.endpoint } }), 0);
  });

  it('sends the workout reminder once, at the local time, on the chosen days', async () => {
    const { endpoint: url } = await member('Reminder Workout', { days: [4], time: '07:30' }); // Thursdays
    pushed = [];

    await reminders.runDue(minutesLater(TOKYO_0731, -2));
    assert.equal(pushesTo(url).length, 0, 'not before 07:30');

    await reminders.runDue(TOKYO_0731);
    assert.deepEqual(pushesTo(url).map((p) => [p.title, p.body, p.url]), [['Time to train', 'Your workout reminder. Even 15 minutes counts.', '/']]);

    await reminders.runDue(minutesLater(TOKYO_0731, 1));
    assert.equal(pushesTo(url).length, 1, 'only once a day');

    // Friday isn't a reminder day.
    await reminders.runDue(minutesLater(TOKYO_0731, 24 * 60));
    assert.equal(pushesTo(url).length, 1);
  });

  it("doesn't send a reminder hours late", async () => {
    const { endpoint: url } = await member('Reminder Late', { days: [4], time: '04:00' });
    pushed = [];
    await reminders.runDue(TOKYO_0731); // 3.5 hours after 04:00
    assert.equal(pushesTo(url).length, 0);
  });

  it('skips days the member has already trained', async () => {
    const { endpoint: url, user } = await member('Reminder Trained', { days: [4], time: '07:30' });
    await trainAt(user.id, minutesLater(TOKYO_0731, -60)); // 06:31 Tokyo time
    pushed = [];
    await reminders.runDue(TOKYO_0731);
    assert.equal(pushesTo(url).length, 0);
  });

  it('nudges at 8 pm when a streak would end tonight', async () => {
    const { endpoint: url, user } = await member('Reminder Streak', { streak: true });
    // Tuesday and Wednesday, but not yet Thursday.
    await trainAt(user.id, minutesLater(TOKYO_0731, -48 * 60));
    await trainAt(user.id, minutesLater(TOKYO_0731, -24 * 60));
    pushed = [];

    const tokyo2005 = minutesLater(TOKYO_0731, 12 * 60 + 34);
    await reminders.runDue(tokyo2005);
    assert.deepEqual(pushesTo(url).map((p) => [p.title, p.body]), [['Keep your streak going', "You've trained 2 days in a row. A short workout today keeps it going."]]);
    await reminders.runDue(minutesLater(tokyo2005, 5));
    assert.equal(pushesTo(url).length, 1);
  });

  it('forgets browsers that unsubscribed', async () => {
    const { endpoint: url } = await member('Reminder Gone', { days: [4], time: '07:30' });
    failWith = 410;
    try {
      await reminders.runDue(TOKYO_0731);
    } finally {
      failWith = null;
    }
    assert.equal(await prisma.pushSubscription.count({ where: { endpoint: url } }), 0);
  });

  it('works out local times across time zones', () => {
    assert.deepEqual(reminders.localNow(TOKYO_0731, 'Asia/Tokyo'), { date: '2026-11-05', minutes: 7 * 60 + 31, tzOffset: -540, weekday: 4 });
    assert.deepEqual(reminders.localNow(TOKYO_0731, 'America/Los_Angeles'), { date: '2026-11-04', minutes: 14 * 60 + 31, tzOffset: 480, weekday: 3 });
  });
}

module.exports = { defineReminderSuite };
