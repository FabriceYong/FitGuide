/**
 * Phase 2 endpoints: exercise library, programs and enrollments, workout
 * sessions, body metrics and the progress summary. Runs inside
 * defineApiSuite against the test Postgres.
 */
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { today, addDays } = require('../utils/dates');

/**
 * @param {() => { app: import('express').Express, signUp: (name: string) => Promise<{ agent, user }> }} ctx
 */
function defineTrainingSuite(ctx) {
  const minutesAgo = (m) => new Date(Date.now() - m * 60 * 1000).toISOString();
  const session = (workoutSlug, overrides = {}) => ({
    workoutSlug,
    startedAt: minutesAgo(30),
    completedAt: minutesAgo(1),
    durationSec: 20 * 60,
    stepsCompleted: 5,
    totalSteps: 5,
    perceivedEffort: 7,
    ...overrides,
  });

  let app;
  let lifter; // logs sessions and body metrics
  let other; // must never see lifter's data
  before(async () => {
    ({ app } = ctx());
    lifter = await ctx().signUp('Lifter');
    other = await ctx().signUp('Other');
  });

  describe('exercise library', () => {
    it('lists and searches exercises', async () => {
      const all = await request(app).get('/api/exercises').expect(200);
      assert.ok(all.body.count >= 30);
      const res = await request(app).get('/api/exercises').query({ search: 'push' }).expect(200);
      assert.ok(res.body.exercises.some((e) => e.slug === 'push-up'));
      const core = await request(app).get('/api/exercises').query({ category: 'core' }).expect(200);
      assert.ok(core.body.exercises.length > 0 && core.body.exercises.every((e) => e.category === 'Core'));
    });

    it('gets one exercise by slug', async () => {
      const res = await request(app).get('/api/exercises/back-squat').expect(200);
      assert.equal(res.body.exercise.trackingType, 'weighted');
      await request(app).get('/api/exercises/no-such-exercise').expect(404);
    });
  });

  describe('programs', () => {
    it('lists programs with their size and session length', async () => {
      const res = await request(app).get('/api/programs').expect(200);
      assert.ok(res.body.count >= 4);
      for (const p of res.body.programs) {
        assert.ok(p.totalDays > 0);
        assert.ok(p.averageMinutes > 0);
        assert.equal(p.days, undefined);
      }
      const beginners = await request(app).get('/api/programs').query({ level: 'Beginner' }).expect(200);
      assert.ok(beginners.body.programs.every((p) => p.level === 'Beginner'));
    });

    it('gets a program with its schedule and every workout it uses', async () => {
      const res = await request(app).get('/api/programs/strength-builder').expect(200);
      const { program, workouts } = res.body;
      assert.equal(program.days.length, program.weeks * program.daysPerWeek);
      for (const d of program.days) assert.ok(workouts[d.workoutSlug], `workout ${d.workoutSlug}`);
      await request(app).get('/api/programs/nope').expect(404);
    });
  });

  describe('enrollments', () => {
    it('requires auth', async () => {
      await request(app).get('/api/enrollments').expect(401);
      await request(app).post('/api/enrollments').send({ programSlug: 'mobility-reset' }).expect(401);
    });

    it('enrolls with a schedule laid out from the start date', async () => {
      const start = addDays(today(), -7);
      const res = await lifter.agent.post('/api/enrollments').send({ programSlug: 'foundations-starter', startDate: start }).expect(201);
      const e = res.body.enrollment;
      assert.equal(e.status, 'active');
      assert.equal(e.startDate, start);
      assert.equal(e.totalDays, 12);
      assert.equal(e.schedule[0].date, start);
      assert.equal(e.schedule[0].status, 'missed');
      assert.equal(e.currentWeek, 2);
      assert.equal(e.adherencePct, 0);
      assert.deepEqual([e.nextDay.week, e.nextDay.day], [1, 1]);
    });

    it('rejects a second enrollment in the same program', async () => {
      const res = await lifter.agent.post('/api/enrollments').send({ programSlug: 'foundations-starter' }).expect(409);
      assert.equal(res.body.code, 'ALREADY_ENROLLED');
    });

    it('needs replace: true to switch programs, and ends the old one', async () => {
      const switcher = await ctx().signUp('Switcher');
      const first = (await switcher.agent.post('/api/enrollments').send({ programSlug: 'mobility-reset' }).expect(201)).body.enrollment;
      const blocked = await switcher.agent.post('/api/enrollments').send({ programSlug: 'hiit-fat-burn' }).expect(409);
      assert.equal(blocked.body.code, 'ACTIVE_ENROLLMENT');
      await switcher.agent.post('/api/enrollments').send({ programSlug: 'hiit-fat-burn', replace: true }).expect(201);

      const list = (await switcher.agent.get('/api/enrollments').expect(200)).body;
      assert.equal(list.active.programSlug, 'hiit-fat-burn');
      assert.equal(list.enrollments.find((e) => e.id === first.id).status, 'abandoned');
    });

    it('validates input', async () => {
      await other.agent.post('/api/enrollments').send({ programSlug: 'mobility-reset', startDate: '2026-02-30' }).expect(400);
      await other.agent.post('/api/enrollments').send({ programSlug: 'mobility-reset', startDate: addDays(today(), 200) }).expect(400);
      await other.agent.post('/api/enrollments').send({}).expect(400);
      await other.agent.post('/api/enrollments').send({ programSlug: 'nope' }).expect(404);
    });

    it("keeps enrollments private and lets the owner leave", async () => {
      const quitter = await ctx().signUp('Quitter');
      const { id } = (await quitter.agent.post('/api/enrollments').send({ programSlug: 'mobility-reset' }).expect(201)).body.enrollment;
      await other.agent.get(`/api/enrollments/${id}`).expect(404);
      await other.agent.patch(`/api/enrollments/${id}`).send({ status: 'abandoned' }).expect(404);
      await quitter.agent.patch(`/api/enrollments/${id}`).send({ status: 'active' }).expect(400);
      const res = await quitter.agent.patch(`/api/enrollments/${id}`).send({ status: 'abandoned' }).expect(200);
      assert.equal(res.body.enrollment.status, 'abandoned');
      assert.equal(res.body.enrollment.nextDay, null);
      await quitter.agent.patch(`/api/enrollments/${id}`).send({ status: 'abandoned' }).expect(409);
      await quitter.agent.get('/api/enrollments/not-an-id').expect(404);
    });
  });

  describe('workout sessions', () => {
    let firstId;

    it('requires auth', async () => {
      await request(app).post('/api/sessions').send(session('core-power-blast')).expect(401);
      await request(app).get('/api/sessions').expect(401);
    });

    it('saves a session, links sets to the library and reports new records', async () => {
      const res = await lifter.agent.post('/api/sessions').send(session('core-power-blast', {
        sets: [
          { exerciseName: 'Plank hold', durationSec: 60 },
          { exerciseName: 'Barbell Back Squats — Set 1 of 4 (8–10 reps)', setNumber: 1, reps: 8, weightKg: 60 },
          { exerciseName: 'Mystery move', reps: 12 },
          { exerciseName: 'Warm-Up: Easy Shake Out', durationSec: 90 },
        ],
        // Ignored: the server decides these.
        calories: 99999,
        userId: other.user.id,
      })).expect(201);

      const s = res.body.session;
      firstId = s.id;
      assert.equal(s.userId, lifter.user.id);
      assert.equal(s.workoutTitle, 'Core Strength Circuit');
      assert.equal(s.status, 'completed');
      assert.deepEqual(s.sets.map((x) => x.exerciseSlug), ['plank', 'back-squat', null, null]);
      // core-power-blast: 150 kcal over 20 min → 20 min logged = 150 kcal
      assert.equal(s.calories, 150);

      const recordKeys = res.body.newRecords.map((r) => r.exerciseSlug || r.exerciseName).sort();
      assert.deepEqual(recordKeys, ['Mystery move', 'back-squat', 'plank']);
      const squat = res.body.newRecords.find((r) => r.exerciseSlug === 'back-squat');
      assert.equal(squat.value, 60);
      assert.equal(squat.estimatedOneRepMaxKg, 76);
    });

    it('only reports records the session actually beat', async () => {
      const res = await lifter.agent.post('/api/sessions').send(session('core-power-blast', {
        sets: [
          { exerciseName: 'Plank', durationSec: 30 },
          { exerciseSlug: 'back-squat', exerciseName: 'Squat', reps: 5, weightKg: 70 },
        ],
      })).expect(201);
      assert.deepEqual(res.body.newRecords.map((r) => r.exerciseSlug), ['back-squat']);
    });

    it('caps active time at the time between start and finish', async () => {
      // One instant for both times, so they are exactly 5 minutes apart.
      const now = Date.now();
      const res = await lifter.agent.post('/api/sessions').send(session('morning-yoga-flow', {
        startedAt: new Date(now - 10 * 60e3).toISOString(),
        completedAt: new Date(now - 5 * 60e3).toISOString(),
        durationSec: 3600,
        status: 'partial',
      })).expect(201);
      assert.ok(res.body.session.durationSec <= 6 * 60);
      assert.equal(res.body.session.status, 'partial');
    });

    it('validates input', async () => {
      const post = (body) => lifter.agent.post('/api/sessions').send(body);
      await post({ ...session('core-power-blast'), workoutSlug: undefined }).expect(400);
      await post(session('core-power-blast', { startedAt: minutesAgo(1), completedAt: minutesAgo(5) })).expect(400);
      await post(session('core-power-blast', { completedAt: new Date(Date.now() + 3600e3).toISOString() })).expect(400);
      await post(session('core-power-blast', { perceivedEffort: 11 })).expect(400);
      await post(session('core-power-blast', { sets: 'lots' })).expect(400);
      await post(session('core-power-blast', { sets: [{ reps: 5 }] })).expect(400);
      await post(session('core-power-blast', { sets: [{ exerciseName: 'Squat', weightKg: -5 }] })).expect(400);
      await post(session('no-such-workout')).expect(404);
    });

    it('keeps sessions private', async () => {
      const mine = await lifter.agent.get('/api/sessions').expect(200);
      assert.equal(mine.body.count, 3);
      assert.ok(new Date(mine.body.sessions[0].completedAt) >= new Date(mine.body.sessions[1].completedAt));
      const theirs = await other.agent.get('/api/sessions').expect(200);
      assert.equal(theirs.body.count, 0);
      await other.agent.get(`/api/sessions/${firstId}`).expect(404);
      await other.agent.delete(`/api/sessions/${firstId}`).expect(404);
      await lifter.agent.get(`/api/sessions/${firstId}`).expect(200);
    });

    it('saves a session sent twice with the same clientId only once', async () => {
      const retrier = await ctx().signUp('Retrier');
      const body = session('core-power-blast', { clientId: 'device-42-session-1' });
      const first = await retrier.agent.post('/api/sessions').send(body).expect(201);
      const again = await retrier.agent.post('/api/sessions').send(body).expect(200);
      assert.equal(again.body.duplicate, true);
      assert.equal(again.body.session.id, first.body.session.id);
      // Sent at the same time: still one session.
      const both = await Promise.all([1, 2].map(() => retrier.agent.post('/api/sessions').send({ ...body, clientId: 'device-42-session-2' })));
      assert.deepEqual(both.map((r) => r.status).sort(), [200, 201]);
      assert.equal((await retrier.agent.get('/api/sessions').expect(200)).body.count, 2);
      // clientIds belong to one account.
      await other.agent.post('/api/sessions').send(body).expect(201);
      await other.agent.delete(`/api/sessions/${(await other.agent.get('/api/sessions')).body.sessions[0].id}`).expect(200);
      await retrier.agent.post('/api/sessions').send(session('core-power-blast', { clientId: 'x'.repeat(65) })).expect(400);
    });

    it('filters by workout', async () => {
      const res = await lifter.agent.get('/api/sessions').query({ workoutSlug: 'morning-yoga-flow' }).expect(200);
      assert.equal(res.body.count, 1);
    });
  });

  describe('program days', () => {
    let enrollmentId;
    let dayOne;
    before(async () => {
      const { active } = (await lifter.agent.get('/api/enrollments').expect(200)).body;
      enrollmentId = active.id;
      dayOne = active.schedule[0];
    });

    it('marks the scheduled day done when its workout is logged', async () => {
      const res = await lifter.agent.post('/api/sessions').send(session(dayOne.workoutSlug, {
        enrollmentId, programWeek: 1, programDay: dayOne.day,
      })).expect(201);
      const { enrollment } = (await lifter.agent.get(`/api/enrollments/${enrollmentId}`).expect(200)).body;
      assert.equal(enrollment.completedCount, 1);
      assert.equal(enrollment.schedule[0].status, 'done');
      assert.equal(enrollment.schedule[0].sessionId, res.body.session.id);
      assert.notDeepEqual([enrollment.nextDay.week, enrollment.nextDay.day], [1, dayOne.day]);
      dayOne.sessionId = res.body.session.id;
    });

    it('rejects sessions that do not match the schedule or the account', async () => {
      await lifter.agent.post('/api/sessions').send(session('leg-day-destroyer', { enrollmentId, programWeek: 1, programDay: dayOne.day })).expect(400);
      await lifter.agent.post('/api/sessions').send(session(dayOne.workoutSlug, { enrollmentId, programWeek: 9, programDay: 1 })).expect(400);
      await lifter.agent.post('/api/sessions').send(session(dayOne.workoutSlug, { enrollmentId })).expect(400);
      await other.agent.post('/api/sessions').send(session(dayOne.workoutSlug, { enrollmentId, programWeek: 1, programDay: dayOne.day })).expect(400);
    });

    it('un-marks the day when its session is deleted', async () => {
      await lifter.agent.delete(`/api/sessions/${dayOne.sessionId}`).expect(200);
      const { enrollment } = (await lifter.agent.get(`/api/enrollments/${enrollmentId}`).expect(200)).body;
      assert.equal(enrollment.completedCount, 0);
      // Log it again for the summary tests below.
      await lifter.agent.post('/api/sessions').send(session(dayOne.workoutSlug, { enrollmentId, programWeek: 1, programDay: dayOne.day })).expect(201);
    });
  });

  describe('deleting sessions of a finished program', () => {
    // A two-day personal plan, so it can be finished quickly.
    let finisher;
    let plan;
    const logDay = (d) => finisher.agent.post('/api/sessions')
      .send(session(d.workoutSlug, { enrollmentId: plan.id, programWeek: d.week, programDay: d.day }))
      .expect(201)
      .then((res) => res.body.session.id);
    const getPlan = async () => (await finisher.agent.get(`/api/enrollments/${plan.id}`).expect(200)).body.enrollment;

    before(async () => {
      finisher = await ctx().signUp('Finisher');
      ({ plan } = (await finisher.agent.post('/api/plan/generate').send({
        goal: 'Vitality', level: 'Beginner', daysPerWeek: 2, minutesPerSession: 30, equipment: [], weeks: 1,
      }).expect(201)).body);
      assert.equal(plan.totalDays, 2);
    });

    it('keeps the program finished while another session still covers the day', async () => {
      const [first, second] = plan.schedule;
      const counted = await logDay(first);
      const repeat = await logDay(first);
      const extra = await logDay(first);
      await logDay(second);
      const finished = await getPlan();
      assert.equal(finished.status, 'completed');

      // A repeat that never counted changes nothing.
      await finisher.agent.delete(`/api/sessions/${repeat}`).expect(200);
      assert.deepEqual(await getPlan(), finished);

      // The counted one is replaced by the other session of that day.
      await finisher.agent.delete(`/api/sessions/${counted}`).expect(200);
      let e = await getPlan();
      assert.equal(e.status, 'completed');
      assert.equal(e.completedCount, 2);
      assert.equal(e.schedule[0].sessionId, extra);

      // With no other session for the day, the day opens and the plan is active again.
      await finisher.agent.delete(`/api/sessions/${extra}`).expect(200);
      e = await getPlan();
      assert.equal(e.status, 'active');
      assert.equal(e.completedCount, 1);
      assert.deepEqual([e.nextDay.week, e.nextDay.day], [first.week, first.day]);
    });

    it('leaves the program finished when another one has been started', async () => {
      const dayId = await logDay(plan.schedule[0]);
      assert.equal((await getPlan()).status, 'completed');
      await finisher.agent.post('/api/enrollments').send({ programSlug: 'mobility-reset' }).expect(201);

      await finisher.agent.delete(`/api/sessions/${dayId}`).expect(200);
      const { enrollments, active } = (await finisher.agent.get('/api/enrollments').expect(200)).body;
      assert.equal(enrollments.filter((e) => e.status === 'active').length, 1);
      assert.equal(active.programSlug, 'mobility-reset');
      const finished = enrollments.find((e) => e.id === plan.id);
      assert.equal(finished.status, 'completed');
      assert.equal(finished.completedCount, 1);
    });
  });

  describe('body metrics', () => {
    it('logs a weigh-in and updates the profile weight', async () => {
      const res = await lifter.agent.post('/api/body-metrics').send({ weightKg: 64.5 }).expect(201);
      assert.equal(res.body.metric.date, today());
      assert.equal(res.body.user.weight, 64.5);
      const me = await lifter.agent.get('/api/auth/me').expect(200);
      assert.equal(me.body.user.weight, 64.5);
    });

    it('merges a second entry for the same day', async () => {
      const res = await lifter.agent.post('/api/body-metrics').send({ waistCm: 80, notes: 'after breakfast' }).expect(200);
      assert.equal(res.body.metric.weightKg, 64.5);
      assert.equal(res.body.metric.waistCm, 80);
    });

    it('does not change the profile for an older entry', async () => {
      const res = await lifter.agent.post('/api/body-metrics').send({ date: addDays(today(), -40), weightKg: 68 }).expect(201);
      assert.equal(res.body.user, undefined);
      const me = await lifter.agent.get('/api/auth/me').expect(200);
      assert.equal(me.body.user.weight, 64.5);
    });

    it('validates input', async () => {
      await lifter.agent.post('/api/body-metrics').send({}).expect(400);
      await lifter.agent.post('/api/body-metrics').send({ notes: 'just notes' }).expect(400);
      await lifter.agent.post('/api/body-metrics').send({ weightKg: 5 }).expect(400);
      await lifter.agent.post('/api/body-metrics').send({ weightKg: 'heavy' }).expect(400);
      await lifter.agent.post('/api/body-metrics').send({ date: addDays(today(), 3), weightKg: 70 }).expect(400);
    });

    it('lists newest first, privately, and deletes', async () => {
      const { metrics } = (await lifter.agent.get('/api/body-metrics').expect(200)).body;
      assert.deepEqual(metrics.map((m) => m.date), [today(), addDays(today(), -40)]);
      assert.equal((await other.agent.get('/api/body-metrics').expect(200)).body.count, 0);
      await other.agent.delete(`/api/body-metrics/${metrics[1].id}`).expect(404);
      const throwaway = (await lifter.agent.post('/api/body-metrics').send({ date: addDays(today(), -1), bodyFatPct: 20 }).expect(201)).body.metric;
      await lifter.agent.delete(`/api/body-metrics/${throwaway.id}`).expect(200);
      await lifter.agent.delete(`/api/body-metrics/${throwaway.id}`).expect(404);
    });
  });

  describe('progress summary', () => {
    it('requires auth', async () => {
      await request(app).get('/api/progress/summary').expect(401);
    });

    it('summarises the logged data', async () => {
      const { summary, recentSessions } = (await lifter.agent.get('/api/progress/summary').expect(200)).body;
      assert.equal(summary.totals.sessions, 4);
      assert.equal(recentSessions.length, 4);
      assert.equal(summary.days.length, 84);
      assert.equal(summary.days[83].date, today());
      assert.equal(summary.days[83].sessions, 4);
      assert.equal(summary.thisWeek.sessions, 4);
      assert.deepEqual(summary.streak, { current: 1, longest: 1, trainedToday: true });

      const squat = summary.personalRecords.find((r) => r.exerciseSlug === 'back-squat');
      assert.equal(squat.value, 70);
      assert.equal(summary.body.latestWeight.weightKg, 64.5);
      assert.equal(summary.body.weightChangeKg, -3.5);
      assert.equal(summary.body.latestMeasurements.waistCm.value, 80);
      assert.equal(summary.activeEnrollment.programSlug, 'foundations-starter');
      assert.equal(summary.activeEnrollment.completedCount, 1);
    });

    it('is empty for a new account', async () => {
      const fresh = await ctx().signUp('Fresh');
      const { summary } = (await fresh.agent.get('/api/progress/summary').query({ tzOffset: -120 }).expect(200)).body;
      assert.equal(summary.totals.sessions, 0);
      assert.deepEqual(summary.streak, { current: 0, longest: 0, trainedToday: false });
      assert.deepEqual(summary.personalRecords, []);
      assert.equal(summary.activeEnrollment, null);
      assert.equal(summary.body.latestWeight, null);
    });
  });
}

module.exports = { defineTrainingSuite };
