/**
 * The daily readiness score over the API. Runs inside defineApiSuite
 * against the test Postgres.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { prisma } = require('../db/prisma');
const { today, addDays } = require('../utils/dates');

function defineReadinessSuite(ctx) {
  describe('readiness', () => {
    it('asks for a check-in, then scores it', async () => {
      await request(ctx().app).get('/api/readiness').expect(401);
      const member = await ctx().signUp('Rea Dee');
      assert.deepEqual((await member.agent.get('/api/readiness').expect(200)).body.readiness, { date: today(), checkedIn: false });
      await member.agent.put('/api/readiness').send({ energy: 6, soreness: 1 }).expect(400);
      await member.agent.put('/api/readiness').send({ energy: 3 }).expect(400);

      const res = await member.agent.put('/api/readiness').send({ energy: 4, soreness: 1 }).expect(200);
      assert.deepEqual([res.body.readiness.score, res.body.readiness.band, res.body.readiness.energy], [78, 'push', 4]);
      assert.equal(res.body.readiness.easierSwap, null);
      // Asking again shows the same; checking in again changes it.
      assert.equal((await member.agent.get('/api/readiness').expect(200)).body.readiness.score, 78);
      assert.equal((await member.agent.put('/api/readiness').send({ energy: 3, soreness: 1 }).expect(200)).body.readiness.score, 70);
    });

    it('counts sleep, resting heart rate and a hard session yesterday, and offers an easier workout', async () => {
      const member = await ctx().signUp('Tia Red');
      const { plan } = (await member.agent.post('/api/plan/generate').send({
        goal: 'Muscle', level: 'Intermediate', daysPerWeek: 3, minutesPerSession: 45, equipment: ['Dumbbells'], weeks: 2,
      }).expect(201)).body;
      const userId = member.user.id;
      const todayYmd = today();
      // A usual resting heart rate of 55 over the last week, 63 this morning, and 5 hours' sleep.
      await prisma.dailyMetric.createMany({
        data: [
          ...Array.from({ length: 7 }, (_, i) => ({ userId, date: addDays(todayYmd, -(i + 1)), source: 'manual', restingHr: 55 })),
          { userId, date: todayYmd, source: 'manual', restingHr: 63, sleepMinutes: 300 },
        ],
      });
      const yesterday = new Date(`${addDays(todayYmd, -1)}T12:00:00Z`);
      await prisma.workoutSession.create({
        data: { userId, workoutSlug: 'core-power-blast', workoutTitle: 'Core Power Blast', startedAt: yesterday, completedAt: yesterday, durationSec: 1800, perceivedEffort: 9 },
      });

      const { readiness } = (await member.agent.put('/api/readiness').send({ energy: 3, soreness: 3 }).expect(200)).body;
      // 70 − 12 (sore) − 12 (5 h sleep) − 12 (heart rate +8) − 8 (hard yesterday)
      assert.deepEqual([readiness.score, readiness.band], [26, 'easy']);
      assert.deepEqual(readiness.reasons.map((r) => r.text), ['Sore', 'Slept 5 h', 'Resting heart rate 8 above your usual', 'Hard session yesterday']);

      // The plan starts today, so its first session is today's.
      const first = plan.schedule[0];
      assert.equal(first.date, todayYmd);
      assert.deepEqual([readiness.easierSwap.week, readiness.easierSwap.day], [first.week, first.day]);
      assert.notEqual(readiness.easierSwap.workoutSlug, first.workoutSlug);
      // Taking it is the member's choice, through the plan's day swap.
      const swapped = await member.agent.patch('/api/plan/days').send({ week: first.week, day: first.day, workoutSlug: readiness.easierSwap.workoutSlug }).expect(200);
      assert.equal(swapped.body.plan.schedule[0].workoutSlug, readiness.easierSwap.workoutSlug);
    });
  });
}

module.exports = { defineReadinessSuite };
