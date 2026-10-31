/**
 * The small AI helpers: exercise swap, workout feedback, the weekly check-in
 * and writing help, with their allowances and what's sent to the model.
 * Runs inside defineApiSuite against the test Postgres, with a fake client.
 */
const { it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { prisma } = require('../db/prisma');
const ai = require('../services/ai');

/** Answers each request by calling the forced tool with `answers[toolName]`; keeps the requests. */
function fakeClient(answers) {
  const requests = [];
  return {
    requests,
    beta: {
      messages: {
        async create(params) {
          requests.push(params);
          const name = params.tool_choice.name;
          return { stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 't', name, input: answers[name] }] };
        },
      },
    },
  };
}

const ANSWERS = {
  suggest_swap: { name: 'Glute bridge', instruction: 'Glute bridge × 15 reps', why: 'Works the same legs and glutes without loading the knee.', formCues: ['Feet flat', 'Squeeze at the top', 'Lower slowly'], safetyNote: 'Stop anything that hurts and check with a physiotherapist if the knee pain continues.' },
  workout_feedback: { headline: 'Faster than last time', notes: ['You finished 3 minutes quicker than on Monday.'], nextTime: 'Add two reps to the squats.' },
  weekly_checkin: { summary: 'Three workouts this week, up from one.', wins: ['Trained 3 days', 'Walked more'], focus: 'Log your dinners.', planChange: 'harder' },
  article_draft: { description: 'A five-minute warm-up.', takeaways: ['Get warm', 'Rehearse', 'Build up'], sections: [{ heading: 'Get warm', paragraphs: ['Easy cardio for two minutes.'], tip: null }] },
  polished_text: { text: 'A tidier paragraph.' },
};

function defineAiSuite(ctx) {
  let app;
  let member;
  let fake;
  before(async () => {
    ({ app } = ctx());
    member = await ctx().signUp('Ada Helper');
    fake = fakeClient(ANSWERS);
    ai.setClient(fake);
  });
  after(() => ai.setClient(null));

  const step = { instruction: 'Round 1 — Exercise B: Jump Squats × 15 reps' };
  const workout = { title: 'Tabata Burn', category: 'HIIT', difficulty: 'Advanced', equipment: ['None'] };

  it('lists what is available and left today', async () => {
    await request(app).get('/api/ai').expect(401);
    const res = await member.agent.get('/api/ai').expect(200);
    assert.equal(res.body.available, true);
    assert.deepEqual(res.body.allowance.swap, { used: 0, max: 10, left: 10 });
    assert.deepEqual(res.body.allowance.checkin, { used: 0, max: 2, left: 2 });
  });

  it('suggests a swap for a sore knee, with a safety note', async () => {
    await member.agent.post('/api/ai/swap').send({ step, reason: 'bored', workout }).expect(400);
    await member.agent.post('/api/ai/swap').send({ reason: 'pain', workout }).expect(400);
    const res = await member.agent.post('/api/ai/swap').send({ step, reason: 'pain', details: 'left knee aches', workout }).expect(200);
    assert.equal(res.body.swap.name, 'Glute bridge');
    assert.equal(res.body.swap.instruction, 'Glute bridge × 15 reps');
    assert.equal(res.body.swap.formCues.length, 3);
    assert.match(res.body.swap.safetyNote, /physiotherapist/);
    assert.deepEqual(res.body.allowance, { used: 1, max: 10, left: 9 });
    const prompt = fake.requests.at(-1).messages[0].content[0].text;
    assert.match(prompt, /Jump Squats × 15 reps/);
    assert.match(prompt, /joint is sore/);
    assert.match(prompt, /left knee aches/);
  });

  it('writes feedback on a saved workout, compared with earlier ones, and only for its owner', async () => {
    const save = (minutesAgo, durationSec) => member.agent.post('/api/sessions').send({
      workoutSlug: 'highintensity-tabata-burn', startedAt: new Date(Date.now() - (minutesAgo + 30) * 60e3).toISOString(),
      completedAt: new Date(Date.now() - minutesAgo * 60e3).toISOString(), durationSec, stepsCompleted: 8, totalSteps: 8,
      sets: [{ exerciseName: 'Jump squats', reps: 15 }],
    }).expect(201);
    await save(60 * 24 * 3, 1500);
    const latest = (await save(5, 1320)).body.session;

    const res = await member.agent.post('/api/ai/feedback').send({ sessionId: latest.id }).expect(200);
    assert.equal(res.body.feedback.headline, 'Faster than last time');
    assert.equal(res.body.feedback.nextTime, 'Add two reps to the squats.');
    const facts = JSON.parse(fake.requests.at(-1).messages[0].content[0].text);
    assert.equal(facts.thisSession.minutes, 22);
    assert.equal(facts.earlierTimesThisWorkout.length, 1);
    assert.equal(facts.earlierTimesThisWorkout[0].minutes, 25);
    assert.deepEqual(facts.thisSession.sets, [{ exercise: 'Jump squats', reps: 15, kg: null }]);

    const other = await ctx().signUp('Not Yours');
    await other.agent.post('/api/ai/feedback').send({ sessionId: latest.id }).expect(404);
  });

  it('writes the weekly check-in from this week against the last, within its allowance', async () => {
    const res = await member.agent.post('/api/ai/checkin').expect(200);
    assert.equal(res.body.checkin.summary, 'Three workouts this week, up from one.');
    assert.equal(res.body.checkin.planChange, null, 'no plan, so no plan change');
    assert.equal(res.body.checkin.week.workouts, 2);
    const facts = JSON.parse(fake.requests.at(-1).messages[0].content[0].text);
    assert.equal(facts.thisWeek.workouts, 2);
    assert.equal(facts.weekBefore.workouts, 0);
    assert.equal(facts.thisWeek.averageSteps, null);

    await member.agent.post('/api/ai/checkin').expect(200);
    const third = await member.agent.post('/api/ai/checkin').expect(429);
    assert.equal(third.body.code, 'LIMIT_REACHED');
    assert.match(third.body.message, /2 weekly check-ins a day/);
  });

  it('gives writing help to coaches and admins only', async () => {
    await member.agent.post('/api/ai/writing').send({ mode: 'outline', title: 'Warm up properly' }).expect(403);
    const coach = await ctx().signUp('Kim Coach');
    await prisma.user.update({ where: { id: coach.user.id }, data: { role: 'creator' } });
    await coach.agent.post('/api/ai/writing').send({ mode: 'outline', title: 'Hi' }).expect(400);
    const draft = await coach.agent.post('/api/ai/writing').send({ mode: 'outline', title: 'Warm up properly', notes: 'five minutes, cardio then rehearsal sets', category: 'TRAINING' }).expect(200);
    assert.equal(draft.body.draft.sections[0].heading, 'Get warm');
    assert.equal(draft.body.draft.sections[0].tip, undefined);
    assert.equal(draft.body.draft.takeaways.length, 3);
    const polished = await coach.agent.post('/api/ai/writing').send({ mode: 'polish', heading: 'Get warm', text: 'warm up is good u should do it for like 5 min before lifting heavy' }).expect(200);
    assert.equal(polished.body.text, 'A tidier paragraph.');
  });

  it('says when the helpers are not set up', async () => {
    ai.setClient(null);
    const res = await member.agent.post('/api/ai/swap').send({ step, reason: 'space', workout }).expect(503);
    assert.match(res.body.message, /not set up/);
    ai.setClient(fake);
  });
}

module.exports = { defineAiSuite };
