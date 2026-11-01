/**
 * Personal plans and the AI coach. Runs inside defineApiSuite against the
 * test Postgres. The coach talks to a scripted fake Claude client, so no
 * real API calls are made.
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const coach = require('../services/coach');

const planRequest = {
  goal: 'Muscle',
  level: 'Intermediate',
  daysPerWeek: 3,
  minutesPerSession: 45,
  equipment: ['Dumbbells'],
  weeks: 2,
};

/** A fake Anthropic client that returns the scripted responses in order and records requests. */
function fakeClient(responses) {
  const requests = [];
  return {
    requests,
    beta: {
      messages: {
        async create(params) {
          requests.push(JSON.parse(JSON.stringify(params)));
          const next = responses.shift();
          if (!next) throw new Error('No scripted response left');
          if (next instanceof Error) throw next;
          return next;
        },
      },
    },
  };
}

const text = (t) => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: t }] });

function definePlanCoachSuite(ctx) {
  let app;
  let user;
  before(() => {
    ({ app } = ctx());
  });

  describe('personal plans', () => {
    before(async () => {
      user = await ctx().signUp('Planner');
    });

    it('requires auth', async () => {
      await request(app).get('/api/plan').expect(401);
      await request(app).post('/api/plan/generate').send(planRequest).expect(401);
    });

    it('offers form options from the catalog', async () => {
      const res = await user.agent.get('/api/plan/options').expect(200);
      assert.ok(res.body.goals.includes('Muscle'));
      assert.ok(res.body.equipment.includes('Dumbbells'));
      assert.ok(!res.body.equipment.includes('None'));
    });

    it('validates the answers', async () => {
      await user.agent.post('/api/plan/generate').send({ ...planRequest, goal: 'Fame' }).expect(400);
      await user.agent.post('/api/plan/generate').send({ ...planRequest, daysPerWeek: 9 }).expect(400);
      await user.agent.post('/api/plan/generate').send({ ...planRequest, equipment: 'all' }).expect(400);
    });

    it('generates a plan, starts it and keeps it private', async () => {
      assert.equal((await user.agent.get('/api/plan').expect(200)).body.plan, null);
      const res = await user.agent.post('/api/plan/generate').send(planRequest).expect(201);
      const { plan } = res.body;
      assert.equal(plan.status, 'active');
      assert.equal(plan.totalDays, 6);
      assert.equal(plan.weeks, 2);

      const again = await user.agent.get('/api/plan').expect(200);
      assert.equal(again.body.plan.programSlug, plan.programSlug);

      // Not in the public catalog, not visible to another account.
      const catalog = await request(app).get('/api/programs').expect(200);
      assert.ok(!catalog.body.programs.some((p) => p.slug === plan.programSlug));
      await request(app).get(`/api/programs/${plan.programSlug}`).expect(404);
      const other = await ctx().signUp('Snoop');
      await other.agent.post('/api/enrollments').send({ programSlug: plan.programSlug }).expect(404);
    });

    it('a new plan ends the previous program', async () => {
      const first = (await user.agent.get('/api/plan').expect(200)).body.plan;
      const res = await user.agent.post('/api/plan/generate').send({ ...planRequest, goal: 'Flexibility' }).expect(201);
      assert.notEqual(res.body.plan.programSlug, first.programSlug);
      const enrollments = (await user.agent.get('/api/enrollments').expect(200)).body.enrollments;
      assert.equal(enrollments.filter((e) => e.status === 'active').length, 1);
      assert.equal(enrollments.find((e) => e.programSlug === first.programSlug).status, 'abandoned');
    });

    it('swaps a workout on an open day', async () => {
      const { plan } = (await user.agent.get('/api/plan').expect(200)).body;
      const day = plan.schedule[plan.schedule.length - 1];
      const res = await user.agent.patch('/api/plan/days').send({ week: day.week, day: day.day, workoutSlug: 'morning-yoga-flow' }).expect(200);
      const changed = res.body.plan.schedule.find((d) => d.week === day.week && d.day === day.day);
      assert.equal(changed.workoutSlug, 'morning-yoga-flow');
      assert.match(changed.title, /: Morning Sun Salutation Flow$/);
      await user.agent.patch('/api/plan/days').send({ week: 9, day: 1, workoutSlug: 'morning-yoga-flow' }).expect(404);
      await user.agent.patch('/api/plan/days').send({ week: day.week, day: day.day, workoutSlug: 'nope' }).expect(404);
    });

    it('adapts to how hard training feels', async () => {
      const { plan } = (await user.agent.get('/api/plan').expect(200)).body;
      const first = plan.schedule[0];
      // Two very hard sessions logged in the last few days.
      for (const minutesAgo of [90, 30]) {
        await user.agent.post('/api/sessions').send({
          workoutSlug: first.workoutSlug,
          startedAt: new Date(Date.now() - (minutesAgo + 20) * 60e3).toISOString(),
          completedAt: new Date(Date.now() - minutesAgo * 60e3).toISOString(),
          durationSec: 1200,
          perceivedEffort: 10,
        }).expect(201);
      }
      const res = await user.agent.post('/api/plan/adapt').expect(200);
      assert.equal(res.body.direction, 'easier');
      assert.match(res.body.reason, /very hard/);
      assert.ok(Array.isArray(res.body.changes));
    });

    it('adapt needs a personal plan', async () => {
      const fresh = await ctx().signUp('NoPlan');
      await fresh.agent.post('/api/plan/adapt').expect(404);
    });
  });

  describe('plan suggestions', () => {
    const todayYmd = new Date().toISOString().slice(0, 10); // no tzOffset sent: UTC dates
    const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

    it('requires auth and validates', async () => {
      await request(app).get('/api/plan/suggestion').expect(401);
      const member = await ctx().signUp('Suggest Check');
      assert.equal((await member.agent.get('/api/plan/suggestion').expect(200)).body.suggestion, null);
      await member.agent.post('/api/plan/suggestion/dismiss').send({ kind: 'bogus' }).expect(400);
      await member.agent.post('/api/plan/suggestion/accept').send({}).expect(400);
      await member.agent.post('/api/plan/suggestion/accept').send({ id: 'abc' }).expect(404);
    });

    it('suggests catching up after missed sessions, and changes nothing until accepted', async () => {
      const member = await ctx().signUp('Catch Up');
      await member.agent.post('/api/plan/generate').send({ ...planRequest, startDate: daysAgo(9) }).expect(201);
      const { suggestion } = (await member.agent.get('/api/plan/suggestion').expect(200)).body;
      assert.equal(suggestion.kind, 'catch_up');
      assert.match(suggestion.reason, /missed the last \d+ sessions/);
      const [first] = suggestion.changes;
      assert.equal(first.newDate, todayYmd);
      assert.equal(suggestion.moveDays, Math.round((Date.parse(todayYmd) - Date.parse(first.date)) / 864e5));
      // Still as it was.
      const before = (await member.agent.get('/api/plan').expect(200)).body.plan;
      assert.equal(before.schedule[0].date, first.date);

      const stale = await member.agent.post('/api/plan/suggestion/accept').send({ id: 'not-this-one' }).expect(409);
      assert.equal(stale.body.suggestion.id, suggestion.id);

      const res = await member.agent.post('/api/plan/suggestion/accept').send({ id: suggestion.id }).expect(200);
      const day = res.body.enrollment.schedule.find((d) => d.week === first.week && d.day === first.day);
      assert.deepEqual([day.date, day.status], [todayYmd, 'today']);
      assert.equal(res.body.enrollment.endDate, suggestion.endDate);
      assert.equal(res.body.enrollment.schedule.filter((d) => d.status === 'missed').length, 0);
      assert.equal((await member.agent.get('/api/plan/suggestion').expect(200)).body.suggestion, null);
    });

    it('works for catalog programs too, and no thanks hides it for a week', async () => {
      const member = await ctx().signUp('Program Gap');
      await member.agent.post('/api/enrollments').send({ programSlug: 'foundations-starter', startDate: daysAgo(10) }).expect(201);
      const { suggestion } = (await member.agent.get('/api/plan/suggestion').expect(200)).body;
      assert.equal(suggestion.kind, 'catch_up');
      await member.agent.post('/api/plan/suggestion/dismiss').send({ kind: 'catch_up' }).expect(200);
      assert.equal((await member.agent.get('/api/plan/suggestion').expect(200)).body.suggestion, null, 'not a personal plan, so nothing else to suggest');
    });

    it('suggests easier workouts after very hard sessions', async () => {
      const member = await ctx().signUp('Too Hard');
      const { plan } = (await member.agent.post('/api/plan/generate').send(planRequest).expect(201)).body;
      for (const minutesAgo of [90, 30]) {
        await member.agent.post('/api/sessions').send({
          workoutSlug: plan.schedule[0].workoutSlug,
          startedAt: new Date(Date.now() - (minutesAgo + 20) * 60e3).toISOString(),
          completedAt: new Date(Date.now() - minutesAgo * 60e3).toISOString(),
          durationSec: 1200,
          perceivedEffort: 10,
        }).expect(201);
      }
      const { suggestion } = (await member.agent.get('/api/plan/suggestion').expect(200)).body;
      assert.equal(suggestion.kind, 'easier');
      assert.ok(suggestion.changes.length > 0);
      const change = suggestion.changes[0];
      assert.ok(change.date && change.title && change.newTitle && change.to);

      const res = await member.agent.post('/api/plan/suggestion/accept').send({ id: suggestion.id }).expect(200);
      const day = res.body.enrollment.schedule.find((d) => d.week === change.week && d.day === change.day);
      assert.deepEqual([day.workoutSlug, day.title], [change.to, change.newTitle]);
    });
  });

  describe('coach', () => {
    let coachUser;
    before(async () => {
      coachUser = await ctx().signUp('Coachee');
      await coachUser.agent.post('/api/plan/generate').send(planRequest).expect(201);
    });
    after(() => coach.setClient(null));

    it('says when it is not configured', async () => {
      coach.setClient(null);
      const status = await coachUser.agent.get('/api/coach').expect(200);
      assert.equal(status.body.available, false);
      await coachUser.agent.post('/api/coach/messages').send({ text: 'Hi' }).expect(503);
    });

    it('answers with the user context and keeps the conversation', async () => {
      const fake = fakeClient([text('Great question! Keep your back straight.')]);
      coach.setClient(fake);
      const res = await coachUser.agent.post('/api/coach/messages').send({ text: 'How do I deadlift?' }).expect(201);
      assert.equal(res.body.reply.text, 'Great question! Keep your back straight.');

      const sent = fake.requests[0];
      assert.equal(sent.model, 'claude-opus-5-5');
      assert.equal(sent.fallbacks, 'default');
      assert.deepEqual(sent.tool_choice, { type: 'auto' });
      assert.ok(sent.tools.every((t) => t.strict === true));
      const [userTurn, context] = sent.messages;
      assert.equal(userTurn.role, 'user');
      assert.equal(context.role, 'system');
      assert.match(context.content, /"name":"Coachee"/);
      assert.match(context.content, /"plan":\{"title":"Your muscle plan"/);

      const history = await coachUser.agent.get('/api/coach').expect(200);
      assert.deepEqual(history.body.messages.map((m) => m.role), ['user', 'assistant']);
    });

    it('replays the history unchanged on the next turn', async () => {
      const fake = fakeClient([text('Sure.')]);
      coach.setClient(fake);
      await coachUser.agent.post('/api/coach/messages').send({ text: 'Thanks!' }).expect(201);
      const { messages } = fake.requests[0];
      assert.deepEqual(messages.map((m) => m.role), ['user', 'system', 'assistant', 'user', 'system']);
      assert.equal(messages[2].content[0].text, 'Great question! Keep your back straight.');
    });

    it('uses tools to change the plan', async () => {
      const { plan } = (await coachUser.agent.get('/api/plan').expect(200)).body;
      const open = plan.schedule.find((d) => d.status !== 'done');
      const fake = fakeClient([
        { stop_reason: 'tool_use', content: [{ type: 'text', text: 'Let me check.' }, { type: 'tool_use', id: 'tu_1', name: 'get_plan', input: {} }] },
        { stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'tu_2', name: 'swap_plan_day', input: { week: open.week, day: open.day, workoutSlug: 'morning-yoga-flow' } }] },
        text('Done: I put Morning Yoga Flow on that day.'),
      ]);
      coach.setClient(fake);
      const res = await coachUser.agent.post('/api/coach/messages').send({ text: 'Swap my next workout for yoga please' }).expect(201);
      assert.equal(res.body.changedPlan, true);
      assert.match(res.body.reply.text, /Morning Yoga Flow/);

      // The tool results went back in the follow-up requests.
      const toolResult = fake.requests[1].messages.at(-1).content[0];
      assert.equal(toolResult.type, 'tool_result');
      assert.equal(toolResult.tool_use_id, 'tu_1');
      assert.match(toolResult.content, /"schedule"/);

      const updated = (await coachUser.agent.get('/api/plan').expect(200)).body.plan;
      assert.equal(updated.schedule.find((d) => d.week === open.week && d.day === open.day).workoutSlug, 'morning-yoga-flow');
    });

    it('returns tool errors to the model instead of failing', async () => {
      const fake = fakeClient([
        { stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'tu_3', name: 'swap_plan_day', input: { week: 40, day: 1, workoutSlug: 'morning-yoga-flow' } }] },
        text("I couldn't find that day in your plan."),
      ]);
      coach.setClient(fake);
      await coachUser.agent.post('/api/coach/messages').send({ text: 'Change week 40' }).expect(201);
      const result = fake.requests[1].messages.at(-1).content[0];
      assert.equal(result.is_error, true);
    });

    it('handles refusals politely', async () => {
      coach.setClient(fakeClient([{ stop_reason: 'refusal', content: [] }]));
      const res = await coachUser.agent.post('/api/coach/messages').send({ text: 'Something off-limits' }).expect(201);
      assert.match(res.body.reply.text, /can't help/);
    });

    it('rolls back the turn when the API call fails', async () => {
      const before = (await coachUser.agent.get('/api/coach').expect(200)).body.messages.length;
      coach.setClient(fakeClient([new Error('network down')]));
      await coachUser.agent.post('/api/coach/messages').send({ text: 'Hello?' }).expect(500);
      const afterFail = (await coachUser.agent.get('/api/coach').expect(200)).body.messages.length;
      assert.equal(afterFail, before);
      // And the next turn still sends a valid history (no dangling system message).
      const fake = fakeClient([text('Back again.')]);
      coach.setClient(fake);
      await coachUser.agent.post('/api/coach/messages').send({ text: 'Hello?' }).expect(201);
      const roles = fake.requests[0].messages.map((m) => m.role);
      for (let i = 0; i < roles.length; i += 1) {
        if (roles[i] === 'system') assert.ok(i === roles.length - 1 || roles[i + 1] === 'assistant', `system at ${i} followed by ${roles[i + 1]}`);
      }
    });

    it('keeps conversations private and can start over', async () => {
      const other = await ctx().signUp('Other');
      assert.deepEqual((await other.agent.get('/api/coach').expect(200)).body.messages, []);
      await coachUser.agent.delete('/api/coach/messages').expect(200);
      assert.deepEqual((await coachUser.agent.get('/api/coach').expect(200)).body.messages, []);
    });

    it('validates the message', async () => {
      coach.setClient(fakeClient([]));
      await coachUser.agent.post('/api/coach/messages').send({ text: '' }).expect(400);
      await coachUser.agent.post('/api/coach/messages').send({ text: 'x'.repeat(2001) }).expect(400);
    });
  });
}

module.exports = { definePlanCoachSuite };
