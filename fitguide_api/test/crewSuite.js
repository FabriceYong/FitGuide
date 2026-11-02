/**
 * Crews: invite-only groups with a weekly goal, activity and chat. Runs
 * inside defineApiSuite against the test Postgres.
 */
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { weekStart } = require('../services/crews');

const minutesAgo = (m) => new Date(Date.now() - m * 60e3).toISOString();
const logWorkout = (agent) => agent.post('/api/sessions').send({ workoutSlug: 'core-power-blast', startedAt: minutesAgo(30), completedAt: minutesAgo(5), durationSec: 1500 }).expect(201);

function defineCrewSuite(ctx) {
  let gus;
  let hal;
  let ivy;
  let crewId;
  let code;
  before(async () => {
    gus = await ctx().signUp('Gus Mann');
    hal = await ctx().signUp('Hal Moss');
    ivy = await ctx().signUp('Ivy Nunn');
  });

  it('weeks start on Monday', () => {
    assert.equal(weekStart('2026-11-02'), '2026-11-02'); // a Monday
    assert.equal(weekStart('2026-11-08'), '2026-11-02'); // Sunday
    assert.equal(weekStart('2026-11-04'), '2026-11-02');
  });

  it('creates a crew with an invite code', async () => {
    await request(ctx().app).get('/api/crews').expect(401);
    await gus.agent.post('/api/crews').send({ name: 'X', weeklyGoal: 5 }).expect(400);
    await gus.agent.post('/api/crews').send({ name: 'Early Birds', weeklyGoal: 0 }).expect(400);
    const res = await gus.agent.post('/api/crews').send({ name: 'Early Birds', weeklyGoal: 6 }).expect(201);
    ({ id: crewId, inviteCode: code } = res.body.crew);
    assert.match(code, /^[A-Z2-9]{8}$/);
    assert.equal(res.body.crew.isOwner, true);
    assert.deepEqual(res.body.crew.members.map((m) => [m.name, m.role, m.isYou]), [['Gus M.', 'owner', true]]);
  });

  it('is joined by code, and only members can see it', async () => {
    await ivy.agent.get(`/api/crews/${crewId}`).expect(404);
    await hal.agent.post('/api/crews/join').send({ code: 'NOPE2345' }).expect(404);
    const res = await hal.agent.post('/api/crews/join').send({ code: code.toLowerCase() }).expect(200);
    assert.equal(res.body.crew.isOwner, false);
    assert.equal(res.body.crew.members.length, 2);
    // Joining again changes nothing.
    await hal.agent.post('/api/crews/join').send({ code }).expect(200);
    assert.equal((await hal.agent.get('/api/crews').expect(200)).body.crews[0].memberCount, 2);
  });

  it("counts the week's workouts towards the goal and shows them", async () => {
    await logWorkout(gus.agent);
    await logWorkout(hal.agent);
    await logWorkout(hal.agent);
    await logWorkout(ivy.agent); // not in the crew
    const { crew } = (await gus.agent.get(`/api/crews/${crewId}`).expect(200)).body;
    assert.equal(crew.thisWeek, 3);
    assert.deepEqual(crew.members.map((m) => m.workoutsThisWeek), [1, 2]);
    assert.equal(crew.activity.length, 3);
    assert.ok(crew.activity.every((a) => ['Gus M.', 'Hal M.'].includes(a.name)));
    assert.deepEqual((await gus.agent.get('/api/crews').expect(200)).body.crews.map((c) => [c.name, c.thisWeek, c.weeklyGoal]), [['Early Birds', 3, 6]]);
  });

  it('chats', async () => {
    await hal.agent.post(`/api/crews/${crewId}/messages`).send({ text: '  ' }).expect(400);
    await ivy.agent.post(`/api/crews/${crewId}/messages`).send({ text: 'Hi' }).expect(404);
    await hal.agent.post(`/api/crews/${crewId}/messages`).send({ text: 'Morning run tomorrow?' }).expect(201);
    await gus.agent.post(`/api/crews/${crewId}/messages`).send({ text: 'In!' }).expect(201);
    const { messages } = (await gus.agent.get(`/api/crews/${crewId}`).expect(200)).body.crew;
    assert.deepEqual(messages.map((m) => [m.name, m.text, m.isYou]), [['Hal M.', 'Morning run tomorrow?', false], ['Gus M.', 'In!', true]]);
  });

  it('only the owner changes the crew or removes people', async () => {
    await hal.agent.patch(`/api/crews/${crewId}`).send({ weeklyGoal: 10 }).expect(403);
    const res = await gus.agent.patch(`/api/crews/${crewId}`).send({ weeklyGoal: 8 }).expect(200);
    assert.equal(res.body.crew.weeklyGoal, 8);
    await hal.agent.delete(`/api/crews/${crewId}/members/${gus.user.id}`).expect(403);
    await gus.agent.post('/api/crews/join').send({ code }).expect(200);
    await ivy.agent.post('/api/crews/join').send({ code }).expect(200);
    await gus.agent.delete(`/api/crews/${crewId}/members/${ivy.user.id}`).expect(200);
    await ivy.agent.get(`/api/crews/${crewId}`).expect(404);
  });

  it('hands the crew on when the owner leaves, and goes when the last person does', async () => {
    await gus.agent.delete(`/api/crews/${crewId}/membership`).expect(200);
    assert.equal((await hal.agent.get(`/api/crews/${crewId}`).expect(200)).body.crew.isOwner, true);
    await hal.agent.delete(`/api/crews/${crewId}/membership`).expect(200);
    await hal.agent.post('/api/crews/join').send({ code }).expect(404);
  });

  it('holds up to 8 people', async () => {
    const owner = await ctx().signUp('Full Crew');
    const { inviteCode } = (await owner.agent.post('/api/crews').send({ name: 'Full House', weeklyGoal: 10 }).expect(201)).body.crew;
    for (let i = 0; i < 7; i++) await (await ctx().signUp(`Joiner ${i}`)).agent.post('/api/crews/join').send({ code: inviteCode }).expect(200);
    const late = await (await ctx().signUp('Too Late')).agent.post('/api/crews/join').send({ code: inviteCode }).expect(409);
    assert.match(late.body.message, /is full/);
  });
}

module.exports = { defineCrewSuite };
