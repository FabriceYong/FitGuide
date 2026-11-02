/**
 * Friends, challenges, leaderboards and verified reviews. Runs inside
 * defineApiSuite against the test Postgres.
 */
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { displayName } = require('../services/social');
const { today, addDays } = require('../utils/dates');

const minutesAgo = (m) => new Date(Date.now() - m * 60e3).toISOString();
const logWorkout = (agent, minutes, slug = 'core-power-blast') => agent.post('/api/sessions').send({
  workoutSlug: slug,
  startedAt: minutesAgo(minutes + 5),
  completedAt: minutesAgo(5),
  durationSec: minutes * 60,
}).expect(201);

function defineSocialSuite(ctx) {
  let app;
  let ana;
  let ben;
  let cleo;
  before(async () => {
    ({ app } = ctx());
    ana = await ctx().signUp('Ana Lopez');
    ben = await ctx().signUp('Ben Okafor');
    cleo = await ctx().signUp('Cleo');
  });

  it('shows first name and last initial only', () => {
    assert.equal(displayName('Ana Maria Lopez'), 'Ana L.');
    assert.equal(displayName('Cleo'), 'Cleo');
    assert.equal(displayName('  '), 'Member');
  });

  describe('friends', () => {
    let benCode;

    it('gives each account a friend code', async () => {
      const res = await ben.agent.get('/api/social/friends').expect(200);
      benCode = res.body.friendCode;
      assert.match(benCode, /^[A-Z2-9]{8}$/);
      const again = await ben.agent.get('/api/social/friends').expect(200);
      assert.equal(again.body.friendCode, benCode);
    });

    it('sends, accepts and lists friend requests', async () => {
      await ana.agent.post('/api/social/friends').send({ code: benCode.toLowerCase() }).expect(201);
      await ana.agent.post('/api/social/friends').send({ code: benCode }).expect(409);
      await ana.agent.post('/api/social/friends').send({ code: 'NOPE2345' }).expect(404);
      const anaCode = (await ana.agent.get('/api/social/friends').expect(200)).body.friendCode;
      await ana.agent.post('/api/social/friends').send({ code: anaCode }).expect(400);

      const incoming = (await ben.agent.get('/api/social/friends').expect(200)).body.incoming;
      assert.equal(incoming[0].name, 'Ana L.');
      assert.equal(incoming[0].email, undefined);
      // Only the addressee can accept.
      await ana.agent.post(`/api/social/friends/${incoming[0].friendshipId}/accept`).expect(404);
      await ben.agent.post(`/api/social/friends/${incoming[0].friendshipId}/accept`).expect(200);
      const friends = (await ana.agent.get('/api/social/friends').expect(200)).body.friends;
      assert.deepEqual(friends.map((f) => f.name), ['Ben O.']);
    });

    it('accepts automatically when both people add each other', async () => {
      const cleoCode = (await cleo.agent.get('/api/social/friends').expect(200)).body.friendCode;
      const benCodeNow = (await ben.agent.get('/api/social/friends').expect(200)).body.friendCode;
      await ben.agent.post('/api/social/friends').send({ code: cleoCode }).expect(201);
      const res = await cleo.agent.post('/api/social/friends').send({ code: benCodeNow }).expect(201);
      assert.equal(res.body.result, 'accepted');
    });

    it('ranks me and my friends on the weekly leaderboard', async () => {
      await logWorkout(ana.agent, 30);
      await logWorkout(ben.agent, 45);
      const res = await ana.agent.get('/api/social/leaderboard').expect(200);
      assert.deepEqual(res.body.rows.map((r) => [r.name, r.score, r.rank]), [['Ben O.', 45, 1], ['Ana L.', 30, 2]]);
      assert.equal(res.body.rows[1].isYou, true);
      // Cleo is Ben's friend, not Ana's.
      assert.ok(!res.body.rows.some((r) => r.name === 'Cleo'));
    });

    it('lets people hide from leaderboards', async () => {
      await ben.agent.put('/api/auth/profile').send({ showOnLeaderboards: false }).expect(200);
      const res = await ana.agent.get('/api/social/leaderboard').expect(200);
      assert.deepEqual(res.body.rows.map((r) => r.name), ['Ana L.']);
      // You still see yourself.
      const own = await ben.agent.get('/api/social/leaderboard').expect(200);
      assert.ok(own.body.rows.some((r) => r.isYou));
      await ben.agent.put('/api/auth/profile').send({ showOnLeaderboards: true }).expect(200);
    });

    it('unfriends', async () => {
      const [friend] = (await ana.agent.get('/api/social/friends').expect(200)).body.friends;
      await cleo.agent.delete(`/api/social/friends/${friend.friendshipId}`).expect(404);
      await ana.agent.delete(`/api/social/friends/${friend.friendshipId}`).expect(200);
      assert.deepEqual((await ana.agent.get('/api/social/friends').expect(200)).body.friends, []);
    });
  });

  describe('challenges', () => {
    let friendsChallenge;
    let privateChallenge;
    const challenge = (overrides = {}) => ({
      title: 'October minutes',
      metric: 'minutes',
      startDate: addDays(today(), -3),
      endDate: addDays(today(), 10),
      visibility: 'friends',
      ...overrides,
    });

    it('validates new challenges', async () => {
      await ben.agent.post('/api/social/challenges').send(challenge({ metric: 'likes' })).expect(400);
      await ben.agent.post('/api/social/challenges').send(challenge({ visibility: 'public' })).expect(400);
      await ben.agent.post('/api/social/challenges').send(challenge({ endDate: addDays(today(), -10), startDate: addDays(today(), -20) })).expect(400);
      await ben.agent.post('/api/social/challenges').send(challenge({ endDate: addDays(today(), 200) })).expect(400);
    });

    it("creates a friends challenge only friends can see and join", async () => {
      const res = await ben.agent.post('/api/social/challenges').send(challenge()).expect(201);
      friendsChallenge = res.body.challenge;
      assert.equal(friendsChallenge.joined, true);
      assert.ok(friendsChallenge.joinCode);

      // Cleo is Ben's friend; Ana no longer is.
      const cleoList = (await cleo.agent.get('/api/social/challenges').expect(200)).body.challenges;
      assert.ok(cleoList.some((c) => c.id === friendsChallenge.id));
      assert.equal(cleoList.find((c) => c.id === friendsChallenge.id).joinCode, undefined);
      const anaList = (await ana.agent.get('/api/social/challenges').expect(200)).body.challenges;
      assert.ok(!anaList.some((c) => c.id === friendsChallenge.id));
      await ana.agent.post(`/api/social/challenges/${friendsChallenge.id}/join`).expect(404);

      await cleo.agent.post(`/api/social/challenges/${friendsChallenge.id}/join`).expect(200);
    });

    it('scores members from logged workouts', async () => {
      await logWorkout(cleo.agent, 20, 'morning-yoga-flow');
      const res = await ben.agent.get(`/api/social/challenges/${friendsChallenge.id}`).expect(200);
      const board = res.body.challenge.leaderboard;
      assert.deepEqual(board.map((r) => [r.name, r.score]), [['Ben O.', 45], ['Cleo', 20]]);
      assert.equal(res.body.challenge.status, 'active');
    });

    it('private challenges are joined by code', async () => {
      const res = await ana.agent.post('/api/social/challenges').send(challenge({ title: 'Secret steps', metric: 'steps', visibility: 'private' })).expect(201);
      privateChallenge = res.body.challenge;
      await cleo.agent.get(`/api/social/challenges/${privateChallenge.id}`).expect(404);
      await cleo.agent.post(`/api/social/challenges/${privateChallenge.id}/join`).expect(404);
      const joined = await cleo.agent.post('/api/social/challenges/join').send({ code: privateChallenge.joinCode }).expect(200);
      assert.equal(joined.body.challenge.joined, true);
      await cleo.agent.post('/api/social/challenges/join').send({ code: 'WRONG234' }).expect(404);
    });

    it('scores steps from health data', async () => {
      await cleo.agent.put(`/api/health-data/${today()}`).send({ steps: 12000 }).expect(200);
      await ana.agent.put(`/api/health-data/${addDays(today(), -1)}`).send({ steps: 4000 }).expect(200);
      const board = (await ana.agent.get(`/api/social/challenges/${privateChallenge.id}`).expect(200)).body.challenge.leaderboard;
      assert.deepEqual(board.map((r) => [r.name, r.score]), [['Cleo', 12000], ['Ana L.', 4000]]);
    });

    it('scores weight lifted and days with food logged', async () => {
      const lifting = (await ana.agent.post('/api/social/challenges').send(challenge({ title: 'Lift it', metric: 'volume', visibility: 'private' })).expect(201)).body.challenge;
      assert.equal(lifting.unit, 'kg');
      const eating = (await ana.agent.post('/api/social/challenges').send(challenge({ title: 'Log it', metric: 'foodDays', visibility: 'private' })).expect(201)).body.challenge;
      await cleo.agent.post('/api/social/challenges/join').send({ code: lifting.joinCode }).expect(200);
      await cleo.agent.post('/api/social/challenges/join').send({ code: eating.joinCode }).expect(200);

      const now = Date.now();
      await ana.agent.post('/api/sessions').send({
        workoutSlug: 'core-power-blast', startedAt: new Date(now - 40 * 60000).toISOString(), completedAt: new Date(now - 60000).toISOString(), durationSec: 1800,
        sets: [{ exerciseName: 'Squat', reps: 5, weightKg: 100 }, { exerciseName: 'Squat', reps: 5, weightKg: 100 }, { exerciseName: 'Plank', durationSec: 60 }],
      }).expect(201);
      const lifted = (await ana.agent.get(`/api/social/challenges/${lifting.id}`).expect(200)).body.challenge.leaderboard;
      assert.deepEqual(lifted.map((r) => [r.name, r.score]), [['Ana L.', 1000], ['Cleo', 0]]);

      for (const date of [today(), addDays(today(), -1)]) {
        await cleo.agent.post('/api/nutrition/log').send({ date, meal: 'lunch', servings: 1, name: 'Soup', calories: 200, protein: 8, carbs: 20, fat: 6 }).expect(201);
      }
      await cleo.agent.post('/api/nutrition/log').send({ meal: 'dinner', servings: 1, name: 'Bread', calories: 150, protein: 5, carbs: 30, fat: 1 }).expect(201);
      const logged = (await cleo.agent.get(`/api/social/challenges/${eating.id}`).expect(200)).body.challenge.leaderboard;
      assert.deepEqual(logged.map((r) => [r.name, r.score]), [['Cleo', 2], ['Ana L.', 0]]);
    });

    it('members can leave; only the creator can delete', async () => {
      await cleo.agent.delete(`/api/social/challenges/${privateChallenge.id}/membership`).expect(200);
      await cleo.agent.delete(`/api/social/challenges/${privateChallenge.id}/membership`).expect(404);
      await cleo.agent.delete(`/api/social/challenges/${friendsChallenge.id}`).expect(404);
      await ben.agent.delete(`/api/social/challenges/${friendsChallenge.id}`).expect(200);
      await cleo.agent.get(`/api/social/challenges/${friendsChallenge.id}`).expect(404);
    });

    it('requires auth', async () => {
      await request(app).get('/api/social/challenges').expect(401);
    });
  });

  describe('friends feed', () => {
    let dee;
    let eli;
    let fay;
    let workoutId;
    before(async () => {
      dee = await ctx().signUp('Dee Fox');
      eli = await ctx().signUp('Eli Grant');
      fay = await ctx().signUp('Fay Hill');
      const code = (await dee.agent.get('/api/social/friends').expect(200)).body.friendCode;
      await eli.agent.post('/api/social/friends').send({ code }).expect(201);
      const [request] = (await dee.agent.get('/api/social/friends').expect(200)).body.incoming;
      await dee.agent.post(`/api/social/friends/${request.friendshipId}/accept`).expect(200);
      const saved = await dee.agent.post('/api/sessions').send({
        workoutSlug: 'core-power-blast',
        startedAt: minutesAgo(40),
        completedAt: minutesAgo(5),
        durationSec: 35 * 60,
        sets: [{ exerciseName: 'Goblet Squat', setNumber: 1, reps: 10, weightKg: 20 }, { exerciseName: 'Goblet Squat', setNumber: 2, reps: 8, weightKg: 24 }],
      }).expect(201);
      workoutId = saved.body.session.id;
    });

    it("shows friends' workouts with the records they set, and not to others", async () => {
      const res = await eli.agent.get('/api/social/feed').expect(200);
      const item = res.body.items.find((i) => i.id === workoutId);
      assert.equal(item.person.name, 'Dee F.');
      assert.equal(item.isYou, false);
      assert.deepEqual([item.setCount, item.volumeKg, item.durationSec], [2, 392, 2100]);
      assert.ok(item.records.some((r) => r.unit === 'kg' && r.value === 24));
      assert.equal(res.body.shareActivity, true);
      assert.equal((await dee.agent.get('/api/social/feed').expect(200)).body.items.find((i) => i.id === workoutId).isYou, true);
      assert.ok(!(await fay.agent.get('/api/social/feed').expect(200)).body.items.some((i) => i.id === workoutId));
      await request(app).get('/api/social/feed').expect(401);
      await eli.agent.get('/api/social/feed').query({ before: 'yesterday' }).expect(400);
      const older = await eli.agent.get('/api/social/feed').query({ before: item.completedAt }).expect(200);
      assert.ok(!older.body.items.some((i) => i.id === workoutId));
    });

    it('lets friends cheer a workout once, and take it back', async () => {
      await fay.agent.post(`/api/social/feed/${workoutId}/cheer`).expect(404);
      await dee.agent.post(`/api/social/feed/${workoutId}/cheer`).expect(404);
      await eli.agent.post(`/api/social/feed/${workoutId}/cheer`).expect(200);
      await eli.agent.post(`/api/social/feed/${workoutId}/cheer`).expect(200);
      const mine = (await dee.agent.get('/api/social/feed').expect(200)).body.items.find((i) => i.id === workoutId);
      assert.deepEqual([mine.cheers, mine.cheeredBy, mine.cheeredByYou], [1, ['Eli G.'], false]);
      assert.equal((await eli.agent.get('/api/social/feed').expect(200)).body.items.find((i) => i.id === workoutId).cheeredByYou, true);
      await eli.agent.delete(`/api/social/feed/${workoutId}/cheer`).expect(200);
      assert.equal((await dee.agent.get('/api/social/feed').expect(200)).body.items.find((i) => i.id === workoutId).cheers, 0);
    });

    it('keeps workouts out of friends feeds when sharing is off', async () => {
      await dee.agent.put('/api/social/sharing').send({ shareActivity: 'maybe' }).expect(400);
      await dee.agent.put('/api/social/sharing').send({ shareActivity: false }).expect(200);
      assert.ok(!(await eli.agent.get('/api/social/feed').expect(200)).body.items.some((i) => i.id === workoutId));
      await eli.agent.post(`/api/social/feed/${workoutId}/cheer`).expect(404);
      const own = (await dee.agent.get('/api/social/feed').expect(200)).body;
      assert.equal(own.shareActivity, false);
      assert.ok(own.items.some((i) => i.id === workoutId));
    });
  });

  describe('verified reviews', () => {
    it('marks reviews from people who completed the workout', async () => {
      // Ana logged core-power-blast above; Cleo didn't.
      await ana.agent.post('/api/reviews').field('rating', '5').field('comment', 'Tough!').field('workoutId', 'core-power-blast').expect(201);
      await cleo.agent.post('/api/reviews').field('rating', '3').field('comment', 'Looks hard').field('workoutId', 'core-power-blast').expect(201);
      const reviews = (await request(app).get('/api/reviews').query({ workoutId: 'core-power-blast' }).expect(200)).body.reviews;
      const byName = Object.fromEntries(reviews.map((r) => [r.name, r.verified]));
      assert.equal(byName['Ana Lopez'], true);
      assert.equal(byName.Cleo, false);
    });
  });
}

module.exports = { defineSocialSuite };
