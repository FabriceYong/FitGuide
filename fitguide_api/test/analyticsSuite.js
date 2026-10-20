/**
 * First-party analytics. Runs inside defineApiSuite.
 */
const { it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { prisma } = require('../db/prisma');

function defineAnalyticsSuite(ctx) {
  let app;
  let admin;
  before(async () => {
    ({ app } = ctx());
    admin = await ctx().signUp('Ana Lytics');
    await prisma.user.update({ where: { id: admin.user.id }, data: { role: 'admin' } });
  });

  it('records allowed events anonymously and drops query strings', async () => {
    await request(app).post('/api/events').send({ name: 'page_view', path: '/workouts?email=someone@example.com', visitorId: 'v-1', device: 'mobile' }).expect(202);
    await request(app).post('/api/events').send({ name: 'page_view', path: '/workouts', visitorId: 'v-2', device: 'desktop' }).expect(202);
    await request(app).post('/api/events').send({ name: 'workout_completed', path: '/workouts/x/play', visitorId: 'v-1', props: { slug: 'x', nested: { no: true } } }).expect(202);
    await request(app).post('/api/events').send({ name: 'credit_card_number', path: '/' }).expect(400);

    const stored = await prisma.analyticsEvent.findMany({ where: { visitorId: 'v-1' } });
    assert.ok(stored.every((e) => !String(e.path).includes('?')));
    assert.deepEqual(stored.find((e) => e.name === 'workout_completed').props, { slug: 'x' });
  });

  it('shows admins a dashboard', async () => {
    await request(app).get('/api/admin/analytics').expect(401);
    const res = await admin.agent.get('/api/admin/analytics').query({ days: 7 }).expect(200);
    assert.equal(res.body.days.length, 7);
    assert.equal(res.body.visitors, 2);
    assert.deepEqual(res.body.topPages[0], { path: '/workouts', count: 2 });
    assert.ok(res.body.events.some((e) => e.name === 'workout_completed'));
  });
}

module.exports = { defineAnalyticsSuite };
