/**
 * Coaches: applying and approval, coach profiles with contact details, coach
 * workouts with automatic demos, and the coach dashboard. Runs inside
 * defineApiSuite against the test Postgres.
 */
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { prisma } = require('../db/prisma');
const { today, addDays } = require('../utils/dates');

const application = (overrides = {}) => ({
  bio: 'Personal trainer for ten years, specialising in strength for beginners.',
  specialties: ['Strength', 'Mobility'],
  contactEmail: 'Coach.Kim@example.com',
  phone: '+44 7700 900123',
  location: 'Riverside Gym, Leeds',
  ...overrides,
});

const coachWorkout = (overrides = {}) => ({
  title: 'Kim’s Park Circuit',
  description: 'A bodyweight circuit we run together in the park on Saturdays.',
  category: 'Strength',
  difficulty: 'Beginner',
  duration: 20,
  steps: [
    { instruction: 'Push-ups: hands under shoulders, lower your chest to the ground.', duration: 40 },
    { instruction: 'Squats: sit back as if into a chair, then stand tall.', duration: 40 },
    { instruction: 'Own move', duration: 30, gifUrl: 'https://example.com/move.gif' },
    { instruction: 'Pretend to juggle invisible flaming torches.', duration: 20 },
  ],
  // Coaches can't set catalog flags themselves.
  isPublished: true,
  isPremium: true,
  ...overrides,
});

function defineCoachSuite(ctx) {
  let app;
  let admin;
  let kim;
  let member;
  let visitor;
  before(async () => {
    ({ app } = ctx());
    admin = await ctx().signUp('Ada Boss');
    kim = await ctx().signUp('Kim Coach');
    member = await ctx().signUp('Mo Member');
    visitor = request(app);
    await prisma.user.update({ where: { id: admin.user.id }, data: { role: 'admin' } });
  });

  describe('applying to coach', () => {
    it('validates the application', async () => {
      await kim.agent.post('/api/coaches/application').send(application({ bio: 'Too short' })).expect(400);
      await kim.agent.post('/api/coaches/application').send(application({ contactEmail: '', phone: '' })).expect(400);
      await kim.agent.post('/api/coaches/application').send(application({ phone: 'call me maybe' })).expect(400);
      await visitor.post('/api/coaches/application').send(application()).expect(401);
    });

    it('waits for an admin, who approves it', async () => {
      const res = await kim.agent.post('/api/coaches/application').send(application()).expect(201);
      assert.equal(res.body.application.status, 'pending');
      assert.equal(res.body.application.contactEmail, 'coach.kim@example.com');
      await kim.agent.get('/api/creator/programs').expect(403);

      const stats = await admin.agent.get('/api/admin/stats').expect(200);
      assert.ok(stats.body.stats.pendingCoaches >= 1);
      const pending = await admin.agent.get('/api/admin/coaches').query({ status: 'pending' }).expect(200);
      assert.ok(pending.body.coaches.some((c) => c.userId === kim.user.id && c.email === kim.creds.email));
      await member.agent.patch(`/api/admin/coaches/${kim.user.id}`).send({ status: 'approved' }).expect(403);

      await admin.agent.patch(`/api/admin/coaches/${kim.user.id}`).send({ status: 'declined', reviewNote: 'Add your gym.' }).expect(200);
      const declined = await kim.agent.get('/api/coaches/application').expect(200);
      assert.equal(declined.body.application.reviewNote, 'Add your gym.');
      await kim.agent.post('/api/coaches/application').send(application()).expect(201);

      await admin.agent.patch(`/api/admin/coaches/${kim.user.id}`).send({ status: 'approved' }).expect(200);
      const me = await kim.agent.get('/api/auth/me').expect(200);
      assert.equal(me.body.user.role, 'creator');
      await kim.agent.post('/api/coaches/application').send(application()).expect(409);
      await admin.agent.patch('/api/admin/coaches/no-such-user').send({ status: 'approved' }).expect(404);
    });

    it('shows contact details to signed-in members only', async () => {
      const anon = await visitor.get(`/api/coaches/${kim.user.id}`).expect(200);
      assert.equal(anon.body.coach.name, 'Kim C.');
      assert.equal(anon.body.coach.contact, null);
      const signedIn = await member.agent.get(`/api/coaches/${kim.user.id}`).expect(200);
      assert.equal(signedIn.body.coach.name, 'Kim Coach');
      assert.deepEqual(signedIn.body.coach.contact, { email: 'coach.kim@example.com', phone: '+44 7700 900123', location: 'Riverside Gym, Leeds' });
      await visitor.get(`/api/coaches/${member.user.id}`).expect(404);
    });

    it('lets the coach edit their profile in the studio', async () => {
      const res = await kim.agent.put('/api/creator/profile').send(application({ phone: '', location: 'Hyde Park, Leeds' })).expect(200);
      assert.equal(res.body.profile.phone, null);
      assert.equal(res.body.profile.location, 'Hyde Park, Leeds');
      await member.agent.put('/api/creator/profile').send(application()).expect(403);
    });
  });

  describe('coach workouts and programs', () => {
    let workoutSlug;
    let programSlug;

    it('drafts a workout with automatic demos', async () => {
      await kim.agent.post('/api/creator/workouts').send(coachWorkout({ category: 'Napping' })).expect(400);
      const res = await kim.agent.post('/api/creator/workouts').send(coachWorkout()).expect(201);
      const { workout } = res.body;
      workoutSlug = workout.slug;
      assert.equal(workout.status, 'draft');
      assert.equal(workout.isPublished, false);
      assert.equal(workout.isPremium, false);
      // Matched steps are named after their demo; steps with their own picture keep it.
      assert.equal(workout.steps[0].exerciseName, 'Push-up');
      assert.equal(workout.steps[1].exerciseName, 'Squat');
      assert.equal(workout.steps[2].exerciseName, undefined);
      assert.equal(workout.demos[0].name, 'Push-up');
      assert.deepEqual(workout.demos[2].media.frames, ['https://example.com/move.gif']);
      assert.equal(workout.demos[3], null);
      await visitor.get(`/api/workouts/${workoutSlug}`).expect(404);
      await member.agent.post('/api/creator/workouts').send(coachWorkout()).expect(403);
    });

    it('uses its own draft workouts in a program, which waits for them', async () => {
      const res = await kim.agent.post('/api/creator/programs').send({
        title: 'Saturday Park Club',
        description: 'Four weeks of in-person park sessions with Kim.',
        level: 'Beginner',
        goal: 'Get strong',
        weeks: 4,
        daysPerWeek: 1,
        inPerson: true,
        days: [1, 2, 3, 4].map((week) => ({ week, day: 6, title: 'Park circuit', workoutSlug })),
      }).expect(201);
      programSlug = res.body.program.slug;
      assert.equal(res.body.program.inPerson, true);
      await kim.agent.post(`/api/creator/programs/${programSlug}/submit`).expect(200);
      const blocked = await admin.agent.patch(`/api/admin/programs/${programSlug}`).send({ status: 'published' }).expect(409);
      assert.match(blocked.body.message, new RegExp(workoutSlug));
      await kim.agent.delete(`/api/creator/workouts/${workoutSlug}`).expect(409);
    });

    it('goes through review before it is in the catalog', async () => {
      await kim.agent.post(`/api/creator/workouts/${workoutSlug}/submit`).expect(200);
      await kim.agent.put(`/api/creator/workouts/${workoutSlug}`).send(coachWorkout()).expect(409);
      const queue = await admin.agent.get('/api/admin/workouts').query({ status: 'pending' }).expect(200);
      const queued = queue.body.workouts.find((w) => w.slug === workoutSlug);
      assert.equal(queued.creator.name, 'Kim Coach');

      await admin.agent.patch(`/api/admin/workouts/${workoutSlug}`).send({ status: 'rejected', reviewNote: 'Name the last move.' }).expect(200);
      const mine = await kim.agent.get('/api/creator/workouts').expect(200);
      assert.equal(mine.body.workouts[0].reviewNote, 'Name the last move.');
      const steps = coachWorkout().steps.slice(0, 3);
      await kim.agent.put(`/api/creator/workouts/${workoutSlug}`).send(coachWorkout({ steps })).expect(200);
      await kim.agent.post(`/api/creator/workouts/${workoutSlug}/submit`).expect(200);

      await admin.agent.patch(`/api/admin/workouts/${workoutSlug}`).send({ status: 'published' }).expect(200);
      const pub = await visitor.get(`/api/workouts/${workoutSlug}`).expect(200);
      assert.equal(pub.body.workout.steps.length, 3);
      assert.equal(pub.body.workout.status, undefined);
      assert.equal(pub.body.workout.creatorId, undefined);

      await admin.agent.patch(`/api/admin/programs/${programSlug}`).send({ status: 'published' }).expect(200);
      const program = await visitor.get(`/api/programs/${programSlug}`).expect(200);
      assert.equal(program.body.program.coachId, kim.user.id);
      assert.equal(program.body.program.inPerson, true);
      const profile = await visitor.get(`/api/coaches/${kim.user.id}`).expect(200);
      assert.deepEqual(profile.body.programs.map((p) => p.slug), [programSlug]);
    });

    it('shows the coach who follows each program and at what level', async () => {
      const intermediate = await ctx().signUp('Ivy Inter');
      await prisma.user.update({ where: { id: intermediate.user.id }, data: { fitnessLevel: 'Intermediate' } });
      await member.agent.post('/api/enrollments').send({ programSlug, startDate: today() }).expect(201);
      // Started eight days ago, so in week 2.
      await intermediate.agent.post('/api/enrollments').send({ programSlug, startDate: addDays(today(), -8) }).expect(201);

      await member.agent.get('/api/creator/dashboard').expect(403);
      const res = await kim.agent.get('/api/creator/dashboard').expect(200);
      const row = res.body.programs.find((p) => p.slug === programSlug);
      assert.deepEqual(row.enrolled, { total: 2, active: 2, completed: 0, left: 0 });
      assert.deepEqual(row.levels, { Beginner: 1, Intermediate: 1, Advanced: 0 });
      assert.deepEqual(row.weeks.map((w) => w.people), [1, 1, 0, 0]);
      assert.equal(res.body.totals.enrolled, 2);
      assert.equal(res.body.totals.levels.Intermediate, 1);
    });

    it('takes the role away when an admin declines an approved coach', async () => {
      const temp = await ctx().signUp('Tess Temp');
      await temp.agent.post('/api/coaches/application').send(application()).expect(201);
      await admin.agent.patch(`/api/admin/coaches/${temp.user.id}`).send({ status: 'approved' }).expect(200);
      await temp.agent.get('/api/creator/dashboard').expect(200);
      await admin.agent.patch(`/api/admin/coaches/${temp.user.id}`).send({ status: 'declined' }).expect(200);
      await temp.agent.get('/api/creator/dashboard').expect(403);
      await visitor.get(`/api/coaches/${temp.user.id}`).expect(404);
    });
  });
}

module.exports = { defineCoachSuite };
