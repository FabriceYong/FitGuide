/**
 * The first-week starter journey. Runs inside defineApiSuite against the
 * test Postgres.
 */
const { it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { prisma } = require('../db/prisma');

const minutesAgo = (m) => new Date(Date.now() - m * 60e3).toISOString();
const doneIds = (starter) => starter.steps.filter((s) => s.done).map((s) => s.id);

function defineStarterSuite(ctx) {
  it('starts with nothing done, and ticks steps off from what the member does', async () => {
    await request(ctx().app).get('/api/progress/starter').expect(401);
    const member = await ctx().signUp('New Starter');
    let { starter } = (await member.agent.get('/api/progress/starter').expect(200)).body;
    assert.deepEqual([starter.show, starter.done, starter.total, starter.daysLeft], [true, 0, 7, 14]);
    assert.deepEqual(starter.steps.map((s) => s.id), ['first_workout', 'meal', 'reminder', 'friend', 'photo', 'checkin', 'second_workout']);

    await member.agent.post('/api/sessions').send({ workoutSlug: 'core-power-blast', startedAt: minutesAgo(30), completedAt: minutesAgo(5), durationSec: 1500 }).expect(201);
    await member.agent.put('/api/readiness').send({ energy: 4, soreness: 2 }).expect(200);
    await member.agent.put('/api/reminders').send({ days: [1, 3], time: '07:30', streak: false }).expect(200);
    await member.agent.post('/api/crews').send({ name: 'Starters', weeklyGoal: 3 }).expect(201);
    ({ starter } = (await member.agent.get('/api/progress/starter').expect(200)).body);
    assert.deepEqual(doneIds(starter), ['first_workout', 'reminder', 'friend', 'checkin']);
    assert.equal(starter.done, 4);
  });

  it('shows for the first two weeks, until hidden', async () => {
    const member = await ctx().signUp('Old Timer');
    await prisma.user.update({ where: { id: member.user.id }, data: { createdAt: new Date(Date.now() - 15 * 864e5) } });
    assert.equal((await member.agent.get('/api/progress/starter').expect(200)).body.starter.show, false);

    const fresh = await ctx().signUp('Hider');
    await fresh.agent.post('/api/progress/starter/hide').expect(200);
    assert.equal((await fresh.agent.get('/api/progress/starter').expect(200)).body.starter.show, false);
  });
}

module.exports = { defineStarterSuite };
