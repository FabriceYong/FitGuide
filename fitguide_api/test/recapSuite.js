/**
 * The monthly and yearly recap. Runs inside defineApiSuite against the
 * test Postgres; workouts are put in a fixed past month.
 */
const { it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { period, lastMonth } = require('../services/recap');
const { today } = require('../utils/dates');

const at = (ymd, hour = 12) => new Date(`${ymd}T${String(hour).padStart(2, '0')}:00:00Z`).toISOString();
const log = (agent, ymd, sets = [], slug = 'core-power-blast') => agent.post('/api/sessions').send({
  workoutSlug: slug, startedAt: at(ymd, 11), completedAt: at(ymd), durationSec: 1800, sets,
}).expect(201);

function defineRecapSuite(ctx) {
  it('knows its periods', () => {
    assert.deepEqual(period({ month: '2026-02' }), { kind: 'month', key: '2026-02', label: 'February 2026', from: '2026-02-01', to: '2026-02-28', previous: { month: '2026-01' } });
    assert.equal(period({ month: '2026-01' }).previous.month, '2025-12');
    assert.deepEqual([period({ year: 2025 }).from, period({ year: 2025 }).to], ['2025-01-01', '2025-12-31']);
    assert.equal(lastMonth('2026-11-02'), '2026-10');
    assert.equal(lastMonth('2026-01-05'), '2025-12');
  });

  it("sums up a month's training", async () => {
    await request(ctx().app).get('/api/progress/recap').expect(401);
    const member = await ctx().signUp('Recap Rita');
    await log(member.agent, '2025-09-20');
    await log(member.agent, '2025-10-03', [{ exerciseName: 'Bench Press', setNumber: 1, reps: 5, weightKg: 50 }]);
    await log(member.agent, '2025-10-10', [{ exerciseName: 'Bench Press', setNumber: 1, reps: 5, weightKg: 55 }]);
    await log(member.agent, '2025-10-10');
    await member.agent.post('/api/nutrition/log').query({ date: '2025-10-04' }).send({ date: '2025-10-04', meal: 'lunch', name: 'Soup', servings: 1, calories: 300, protein: 10, carbs: 40, fat: 8 }).expect(201);

    await member.agent.get('/api/progress/recap').query({ month: '2025-13' }).expect(400);
    await member.agent.get('/api/progress/recap').query({ month: '2099-01' }).expect(404);
    const { recap } = (await member.agent.get('/api/progress/recap').query({ month: '2025-10' }).expect(200)).body;
    assert.deepEqual(
      [recap.label, recap.workouts, recap.previousWorkouts, recap.activeDays, recap.minutes, recap.volumeKg, recap.records],
      ['October 2025', 3, 1, 2, 90, 525, 1],
    );
    assert.deepEqual(recap.topRecord, { exerciseName: 'Bench Press', unit: 'kg', value: 55, reps: 5 });
    assert.deepEqual(recap.favouriteWorkout, { title: 'Core Strength Circuit', times: 3 });
    assert.ok(recap.topMuscle.workouts >= 1);
    assert.equal(recap.foodDays, 1);

    const year = (await member.agent.get('/api/progress/recap').query({ year: 2025 }).expect(200)).body.recap;
    assert.deepEqual([year.kind, year.label, year.workouts], ['year', '2025', 4]);
  });

  it('offers last month at the start of a month, when anything was logged', async () => {
    const member = await ctx().signUp('Offer Olly');
    const { offers } = (await member.agent.get('/api/progress/recap/offers').expect(200)).body;
    assert.deepEqual(offers, [], 'nothing logged');
    const month = lastMonth(today());
    await log(member.agent, `${month}-15`);
    const again = (await member.agent.get('/api/progress/recap/offers').expect(200)).body.offers;
    if (Number(today().slice(8)) <= 7) assert.deepEqual(again.map((o) => [o.kind, o.key, o.workouts]), [['month', month, 1]]);
    else assert.deepEqual(again, []);
  });
}

module.exports = { defineRecapSuite };
