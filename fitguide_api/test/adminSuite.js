/**
 * Admin CMS and creator studio. Runs inside defineApiSuite against the test
 * Postgres.
 */
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { prisma } = require('../db/prisma');
const { today, addDays } = require('../utils/dates');
const { promoteConfiguredAdmins } = require('../services/admins');

const newWorkout = (overrides = {}) => ({
  slug: 'admin-test-burner',
  title: 'Admin Test Burner',
  description: 'A short test workout created through the admin CMS.',
  category: 'HIIT',
  difficulty: 'Beginner',
  duration: 15,
  calories: 120,
  equipment: ['None'],
  steps: [{ instruction: 'Jumping jacks for 30 seconds', duration: 30 }],
  ...overrides,
});

const newProgram = (overrides = {}) => ({
  title: 'Creator Core Weeks',
  description: 'Two weeks of short core sessions written by a creator.',
  level: 'Beginner',
  goal: 'Core strength',
  weeks: 2,
  daysPerWeek: 2,
  days: [
    { week: 1, day: 1, title: 'Core basics', workoutSlug: 'core-power-blast' },
    { week: 1, day: 4, title: 'Mobility', workoutSlug: 'morning-yoga-flow' },
    { week: 2, day: 1, title: 'Core again', workoutSlug: 'core-power-blast' },
  ],
  ...overrides,
});

const setRole = (user, role) => prisma.user.update({ where: { id: user.id }, data: { role } });

function defineAdminSuite(ctx) {
  let app;
  let admin;
  let creator;
  let member;
  before(async () => {
    ({ app } = ctx());
    admin = await ctx().signUp('Ada Admin');
    creator = await ctx().signUp('Cara Creator');
    member = await ctx().signUp('Max Member');
    await setRole(admin.user, 'admin');
    await setRole(creator.user, 'creator');
  });

  it('is for admins only', async () => {
    await request(app).get('/api/admin/stats').expect(401);
    await member.agent.get('/api/admin/stats').expect(403);
    await creator.agent.get('/api/admin/stats').expect(403);
    const res = await admin.agent.get('/api/admin/stats').expect(200);
    assert.ok(res.body.stats.users >= 3);
    const me = await admin.agent.get('/api/auth/me').expect(200);
    assert.equal(me.body.user.role, 'admin');
  });

  describe('workouts', () => {
    it('creates and validates workouts', async () => {
      await admin.agent.post('/api/admin/workouts').send(newWorkout({ category: 'Napping' })).expect(400);
      await admin.agent.post('/api/admin/workouts').send(newWorkout({ slug: 'Bad Slug!' })).expect(400);
      await admin.agent.post('/api/admin/workouts').send(newWorkout()).expect(201);
      await admin.agent.post('/api/admin/workouts').send(newWorkout()).expect(409);
      const res = await request(app).get('/api/workouts/admin-test-burner').expect(200);
      assert.equal(res.body.workout.steps[0].instruction, 'Jumping jacks for 30 seconds');
    });

    it('updates, unpublishes and republishes', async () => {
      await admin.agent.put('/api/admin/workouts/admin-test-burner').send(newWorkout({ title: 'Admin Test Burner 2' })).expect(200);
      await admin.agent.patch('/api/admin/workouts/admin-test-burner').send({ isPublished: false }).expect(200);
      await request(app).get('/api/workouts/admin-test-burner').expect(404);
      const list = await admin.agent.get('/api/admin/workouts').query({ search: 'Burner 2' }).expect(200);
      assert.equal(list.body.workouts[0].isPublished, false);
      await admin.agent.patch('/api/admin/workouts/admin-test-burner').send({ isPublished: true }).expect(200);
      await request(app).get('/api/workouts/admin-test-burner').expect(200);
      await admin.agent.put('/api/admin/workouts/no-such').send(newWorkout({ slug: 'no-such' })).expect(404);
    });

    it('edits exercises', async () => {
      await admin.agent.post('/api/admin/exercises').send({ slug: 'test-hold', name: 'Test hold', category: 'Core', trackingType: 'duration' }).expect(201);
      await admin.agent.put('/api/admin/exercises/test-hold').send({ name: 'Test hold v2', category: 'Core', trackingType: 'duration' }).expect(200);
      await admin.agent.post('/api/admin/exercises').send({ slug: 'bad', name: 'Bad', category: 'Core', trackingType: 'vibes' }).expect(400);
    });
  });

  describe('creator programs', () => {
    let slug;

    it('creators draft programs that stay private', async () => {
      await member.agent.post('/api/creator/programs').send(newProgram()).expect(403);
      await creator.agent.post('/api/creator/programs').send(newProgram({ days: [{ week: 3, day: 1, title: 'x', workoutSlug: 'core-power-blast' }] })).expect(400);
      await creator.agent.post('/api/creator/programs').send(newProgram({ days: [{ week: 1, day: 1, title: 'x', workoutSlug: 'not-a-workout' }] })).expect(400);
      const res = await creator.agent.post('/api/creator/programs').send(newProgram()).expect(201);
      slug = res.body.program.slug;
      assert.equal(res.body.program.status, 'draft');
      await request(app).get(`/api/programs/${slug}`).expect(404);
    });

    it('goes through review before publishing', async () => {
      await creator.agent.post(`/api/creator/programs/${slug}/submit`).expect(200);
      await creator.agent.put(`/api/creator/programs/${slug}`).send(newProgram()).expect(409);
      const pending = await admin.agent.get('/api/admin/programs').query({ status: 'pending' }).expect(200);
      assert.ok(pending.body.programs.some((p) => p.slug === slug));

      await admin.agent.patch(`/api/admin/programs/${slug}`).send({ status: 'rejected', reviewNote: 'Add a third week.' }).expect(200);
      const mine = await creator.agent.get('/api/creator/programs').expect(200);
      assert.equal(mine.body.programs[0].reviewNote, 'Add a third week.');
      await creator.agent.put(`/api/creator/programs/${slug}`).send(newProgram({ weeks: 3 })).expect(200);
      await creator.agent.post(`/api/creator/programs/${slug}/submit`).expect(200);

      await admin.agent.patch(`/api/admin/programs/${slug}`).send({ status: 'published' }).expect(200);
      const pub = await request(app).get(`/api/programs/${slug}`).expect(200);
      assert.equal(pub.body.program.createdBy, 'Cara C.');
      assert.equal(pub.body.program.weeks, 3);
      // Members can follow it.
      await member.agent.post('/api/enrollments').send({ programSlug: slug }).expect(201);
    });

    it("published programs can't be deleted by their creator", async () => {
      await creator.agent.delete(`/api/creator/programs/${slug}`).expect(409);
      const draft = await creator.agent.post('/api/creator/programs').send(newProgram({ title: 'Throwaway draft' })).expect(201);
      await member.agent.delete(`/api/creator/programs/${draft.body.program.slug}`).expect(403);
      await creator.agent.delete(`/api/creator/programs/${draft.body.program.slug}`).expect(200);
    });
  });

  describe('users, challenges and moderation', () => {
    it('changes roles', async () => {
      await admin.agent.patch(`/api/admin/users/${member.user.id}`).send({ role: 'creator' }).expect(200);
      await member.agent.get('/api/creator/programs').expect(200);
      await admin.agent.patch(`/api/admin/users/${member.user.id}`).send({ role: 'wizard' }).expect(400);
      await admin.agent.patch(`/api/admin/users/${admin.user.id}`).send({ role: 'user' }).expect(400);
      const users = await admin.agent.get('/api/admin/users').query({ search: 'Max' }).expect(200);
      assert.equal(users.body.users[0].role, 'creator');
    });

    it('makes existing ADMIN_EMAILS accounts admins at start', async () => {
      const boss = await ctx().signUp('Bo Boss');
      const saved = process.env.ADMIN_EMAILS;
      // Any case and spacing; an email with no account is reported, not created.
      process.env.ADMIN_EMAILS = ` ${boss.creds.email.toUpperCase()} , nobody-yet@example.com,${admin.creds.email}`;
      try {
        await boss.agent.get('/api/admin/stats').expect(403);
        const result = await promoteConfiguredAdmins();
        assert.deepEqual(result, { promoted: [boss.creds.email], missing: ['nobody-yet@example.com'] });
        await boss.agent.get('/api/admin/stats').expect(200);
        assert.equal(await prisma.user.count({ where: { email: 'nobody-yet@example.com' } }), 0);
        // Running again changes nothing.
        assert.deepEqual((await promoteConfiguredAdmins()).promoted, []);
      } finally {
        if (saved === undefined) delete process.env.ADMIN_EMAILS;
        else process.env.ADMIN_EMAILS = saved;
      }
    });

    it('creates official challenges everyone can see', async () => {
      await admin.agent.post('/api/admin/challenges').send({
        title: 'FitGuide October', metric: 'activeDays', startDate: addDays(today(), -1), endDate: addDays(today(), 20),
      }).expect(201);
      const list = await member.agent.get('/api/social/challenges').expect(200);
      const official = list.body.challenges.find((c) => c.title === 'FitGuide October');
      assert.equal(official.visibility, 'public');
      await member.agent.post(`/api/social/challenges/${official.id}/join`).expect(200);
    });

    it('removes reviews', async () => {
      const review = await member.agent.post('/api/reviews').field('rating', '1').field('comment', 'spam spam').expect(201);
      await member.agent.delete(`/api/admin/reviews/${review.body.review.id}`).expect(403);
      await admin.agent.delete(`/api/admin/reviews/${review.body.review.id}`).expect(200);
      await admin.agent.delete(`/api/admin/reviews/${review.body.review.id}`).expect(404);
    });

    it('reports 30 days of activity', async () => {
      const res = await admin.agent.get('/api/admin/activity').expect(200);
      assert.equal(res.body.days.length, 30);
      assert.ok(res.body.days.at(-1).signups >= 3);
    });
  });
}

module.exports = { defineAdminSuite };
