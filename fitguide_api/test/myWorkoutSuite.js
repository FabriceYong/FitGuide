/**
 * Members' own workouts from the workout builder. Runs inside defineApiSuite.
 */
const { it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { buildSteps, estimateMinutes } = require('../services/myWorkouts');

const minutesAgo = (n) => new Date(Date.now() - n * 60 * 1000).toISOString();

const legDay = {
  title: 'Leg day',
  restSec: 120,
  exercises: [
    { name: 'Barbell Back Squat', sets: 3, reps: '8-10', weighted: true },
    { name: 'Walking lunges', sets: 2, reps: '12', supersetNext: true },
    { name: 'Plank', sets: 2, seconds: 45 },
  ],
};

function defineMyWorkoutSuite(ctx) {
  it('turns sets into steps, going round a superset before resting', () => {
    const steps = buildSteps(legDay.exercises);
    assert.deepEqual(steps.map((s) => s.instruction), [
      'Barbell Back Squat — Set 1 of 3 (8–10 reps)',
      'Barbell Back Squat — Set 2 of 3 (8–10 reps)',
      'Barbell Back Squat — Set 3 of 3 (8–10 reps)',
      'Walking lunges — Set 1 of 2 (12 reps)',
      'Plank — Set 1 of 2 (45 seconds)',
      'Walking lunges — Set 2 of 2 (12 reps)',
      'Plank — Set 2 of 2 (45 seconds)',
    ]);
    // No rest between the lunges and the plank of each round.
    assert.deepEqual(steps.map((s) => s.restAfter ?? true), [true, true, true, false, true, false, true]);
    assert.deepEqual(steps.map((s) => s.duration ?? null), [null, null, null, null, 45, null, 45]);
    assert.ok(steps.every((s) => s.exerciseName && !s.exerciseName.includes('Set')));
    // 3×40 s + 2×48 s + 2×45 s of work, and 4 rests of 2 minutes.
    assert.equal(estimateMinutes(steps, 120), Math.round((120 + 96 + 90 + 4 * 120) / 60));
    assert.deepEqual(buildSteps([{ name: 'Burpees', sets: 1, reps: '15' }]).map((s) => s.instruction), ['Burpees (15 reps)']);
  });

  it('keeps a member’s workouts to themselves', async () => {
    const { app } = ctx();
    await request(app).get('/api/my-workouts').expect(401);
    const { agent } = await ctx().signUp('Workout Builder');

    await agent.post('/api/my-workouts').send({ title: 'Empty', exercises: [] }).expect(400);
    await agent.post('/api/my-workouts').send({ title: 'Both', exercises: [{ name: 'Plank', sets: 1, reps: '10', seconds: 30 }] }).expect(400);
    await agent.post('/api/my-workouts').send({ title: 'Neither', exercises: [{ name: 'Plank', sets: 1 }] }).expect(400);

    const created = (await agent.post('/api/my-workouts').send(legDay).expect(201)).body.workout;
    assert.match(created.slug, /^my-leg-day-[0-9a-f]{6}$/);
    assert.equal(created.title, 'Leg day');
    assert.equal(created.category, 'Strength');
    assert.equal(created.steps.length, 7);
    assert.equal(created.restPeriod, 120);
    // The squat is weighted, so the player asks for weights.
    assert.ok(created.equipment.includes('Barbell'));
    assert.ok(created.targetMuscles.includes('Quads'));
    assert.equal(created.builtFrom.exercises[0].name, 'Barbell Back Squat');
    assert.equal(created.ownerId, undefined);

    // Not in the catalog, and not visible to anyone else.
    await request(app).get(`/api/workouts/${created.slug}`).expect(404);
    assert.ok(!(await request(app).get('/api/workouts').expect(200)).body.workouts.some((w) => w.slug === created.slug));
    const other = await ctx().signUp('Workout Snooper');
    await other.agent.get(`/api/my-workouts/${created.slug}`).expect(404);
    await other.agent.put(`/api/my-workouts/${created.slug}`).send(legDay).expect(404);
    await other.agent.delete(`/api/my-workouts/${created.slug}`).expect(404);
    await other.agent.post('/api/sessions').send({ workoutSlug: created.slug, startedAt: minutesAgo(30), completedAt: minutesAgo(1), durationSec: 1500 }).expect(404);

    const listed = (await agent.get('/api/my-workouts').expect(200)).body.workouts;
    assert.deepEqual(listed.map((w) => w.slug), [created.slug]);
    assert.equal((await agent.get(`/api/my-workouts/${created.slug}`).expect(200)).body.workout.steps.length, 7);
  });

  it('plays, logs and remembers sets like any workout', async () => {
    const { agent } = await ctx().signUp('Workout Owner');
    const { slug } = (await agent.post('/api/my-workouts').send(legDay).expect(201)).body.workout;

    await agent.post('/api/sessions').send({
      workoutSlug: slug,
      startedAt: minutesAgo(40),
      completedAt: minutesAgo(1),
      durationSec: 35 * 60,
      sets: [
        { exerciseName: 'Barbell Back Squat', setNumber: 1, reps: 10, weightKg: 80 },
        { exerciseName: 'Barbell Back Squat', setNumber: 2, reps: 9, weightKg: 80 },
      ],
    }).expect(201);
    const previous = (await agent.post('/api/sessions/previous-sets').send({ steps: [{ name: 'Barbell Back Squat', reps: '8–10' }] }).expect(200)).body.steps;
    assert.deepEqual(previous[0].suggestion, { reps: 8, weightKg: 82.5, reason: 'add_weight' });

    const edited = (await agent.put(`/api/my-workouts/${slug}`).send({ ...legDay, title: 'Leg day B', exercises: legDay.exercises.slice(0, 1) }).expect(200)).body.workout;
    assert.equal(edited.slug, slug);
    assert.equal(edited.title, 'Leg day B');
    assert.equal(edited.steps.length, 3);

    await agent.delete(`/api/my-workouts/${slug}`).expect(200);
    await agent.get(`/api/my-workouts/${slug}`).expect(404);
    // The session stays in the history, under the title it was done with.
    const sessions = (await agent.get('/api/sessions').expect(200)).body.sessions;
    assert.equal(sessions[0].workoutTitle, 'Leg day');
  });
}

module.exports = { defineMyWorkoutSuite };
