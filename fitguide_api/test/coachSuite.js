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
    let sam;
    let samId;

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

    it('shows the coach only clients who share their progress, slipping first', async () => {
      // Sessions on day 6 of each week: started 15 days ago, the last two were missed.
      sam = await ctx().signUp('Sam Slip');
      const enrolled = await sam.agent.post('/api/enrollments').send({ programSlug, startDate: addDays(today(), -15) }).expect(201);
      samId = enrolled.body.enrollment.id;
      assert.equal(enrolled.body.enrollment.shareWithCoach, false);
      assert.ok(!(await kim.agent.get('/api/creator/clients').expect(200)).body.clients.some((c) => c.enrollmentId === samId));

      await sam.agent.patch(`/api/enrollments/${samId}`).send({}).expect(400);
      const shared = await sam.agent.patch(`/api/enrollments/${samId}`).send({ shareWithCoach: true }).expect(200);
      assert.equal(shared.body.enrollment.shareWithCoach, true);
      assert.equal(shared.body.enrollment.status, 'active');
      const moId = (await member.agent.get('/api/enrollments').expect(200)).body.active.id;
      await member.agent.patch(`/api/enrollments/${moId}`).send({ shareWithCoach: true }).expect(200);

      await member.agent.get('/api/creator/clients').expect(403);
      const { clients } = (await kim.agent.get('/api/creator/clients').expect(200)).body;
      assert.deepEqual(clients.map((c) => c.name), ['Sam Slip', 'Mo Member']);
      const [samRow, moRow] = clients;
      assert.equal(samRow.slipping, true);
      assert.deepEqual(samRow.reasons, ['Missed the last 2 sessions', 'No workout logged yet']);
      assert.equal(samRow.adherencePct, 0);
      assert.equal(moRow.slipping, false);
      assert.deepEqual(moRow.reasons, []);
    });

    it('lets the coach send a client a note a day, which the client reads', async () => {
      await kim.agent.post(`/api/creator/clients/${samId}/notes`).send({ text: ' ' }).expect(400);
      await kim.agent.post('/api/creator/clients/nope/notes').send({ text: 'Hi' }).expect(404);
      await kim.agent.post(`/api/creator/clients/${samId}/notes`).send({ text: 'Missed you on Saturday. Shall we do a short one this week?' }).expect(201);
      const again = await kim.agent.post(`/api/creator/clients/${samId}/notes`).send({ text: 'Hello?' }).expect(429);
      assert.match(again.body.message, /^You sent Sam S\. a note today/);
      assert.ok((await kim.agent.get('/api/creator/clients').expect(200)).body.clients.find((c) => c.enrollmentId === samId).lastNoteAt);

      const { notes } = (await sam.agent.get('/api/enrollments/notes').expect(200)).body;
      assert.equal(notes.length, 1);
      assert.deepEqual([notes[0].coachName, notes[0].programTitle], ['Kim C.', 'Saturday Park Club']);
      assert.equal((await member.agent.get('/api/enrollments/notes').expect(200)).body.notes.length, 0);
      await member.agent.post(`/api/enrollments/notes/${notes[0].id}/read`).expect(404);
      await sam.agent.post(`/api/enrollments/notes/${notes[0].id}/read`).expect(200);
      await sam.agent.post(`/api/enrollments/notes/${notes[0].id}/read`).expect(404);
      assert.equal((await sam.agent.get('/api/enrollments/notes').expect(200)).body.notes.length, 0);
    });

    it('stops showing a client who stops sharing, and only coached programs can be shared', async () => {
      await sam.agent.patch(`/api/enrollments/${samId}`).send({ shareWithCoach: false }).expect(200);
      assert.ok(!(await kim.agent.get('/api/creator/clients').expect(200)).body.clients.some((c) => c.enrollmentId === samId));
      await kim.agent.post(`/api/creator/clients/${samId}/notes`).send({ text: 'Still there?' }).expect(404);

      const pat = await ctx().signUp('Pat Plain');
      const plain = await pat.agent.post('/api/enrollments').send({ programSlug: 'foundations-starter' }).expect(201);
      await pat.agent.patch(`/api/enrollments/${plain.body.enrollment.id}`).send({ shareWithCoach: true }).expect(400);
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
