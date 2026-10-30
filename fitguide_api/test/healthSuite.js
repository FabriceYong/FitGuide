/**
 * Health data (manual, CSV) and wearable connections (Strava, Fitbit) with
 * a fake HTTP layer. Runs inside defineApiSuite against the test Postgres.
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const integrations = require('../services/integrations');
const { prisma } = require('../db/prisma');
const { today, addDays } = require('../utils/dates');

const jsonResponse = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });

/** Fake provider APIs. Records each call. */
function fakeHttp() {
  const calls = [];
  const fn = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const u = String(url);
    if (u === 'https://www.strava.com/oauth/token') {
      const params = new URLSearchParams(init.body);
      if (params.get('grant_type') === 'refresh_token') {
        return jsonResponse({ access_token: 'strava-access-2', refresh_token: 'strava-refresh-2', expires_at: Math.floor(Date.now() / 1000) + 3600 });
      }
      return jsonResponse({ access_token: 'strava-access-1', refresh_token: 'strava-refresh-1', expires_at: Math.floor(Date.now() / 1000) + 3600, athlete: { id: 42 } });
    }
    if (u.startsWith('https://www.strava.com/api/v3/athlete/activities')) {
      return jsonResponse([
        { id: 1001, name: 'Morning run', sport_type: 'Run', start_date: new Date(Date.now() - 3 * 3600e3).toISOString(), moving_time: 1800, distance: 5000, average_heartrate: 150 },
        { id: 1002, name: 'Commute', sport_type: 'Ride', start_date: new Date(Date.now() - 26 * 3600e3).toISOString(), moving_time: 1200, distance: 8000, kilojoules: 210 },
      ]);
    }
    if (u === 'https://api.fitbit.com/oauth2/token') {
      return jsonResponse({ access_token: 'fitbit-access', refresh_token: 'fitbit-refresh', expires_in: 28800, user_id: 'ABC', scope: 'activity heartrate sleep' });
    }
    if (u.startsWith('https://api.fitbit.com/1/user/-/activities/date/')) {
      return jsonResponse({ summary: { steps: 8000, restingHeartRate: 58, activityCalories: 450 } });
    }
    if (u.startsWith('https://api.fitbit.com/1.2/user/-/sleep/date/')) {
      return jsonResponse({ summary: { totalMinutesAsleep: 420 } });
    }
    return jsonResponse({ message: 'unexpected' }, 404);
  };
  fn.calls = calls;
  return fn;
}

const PROVIDER_ENV = {
  STRAVA_CLIENT_ID: 'strava-client',
  STRAVA_CLIENT_SECRET: 'strava-secret',
  FITBIT_CLIENT_ID: 'fitbit-client',
  FITBIT_CLIENT_SECRET: 'fitbit-secret',
};

function defineHealthSuite(ctx) {
  let app;
  let athlete;
  before(async () => {
    ({ app } = ctx());
    athlete = await ctx().signUp('Athlete');
  });

  describe('health data', () => {
    it('requires auth', async () => {
      await request(app).get('/api/health-data').expect(401);
    });

    it('saves manual entries and validates them', async () => {
      await athlete.agent.put(`/api/health-data/${today()}`).send({ steps: 6500, sleepMinutes: 400 }).expect(200);
      await athlete.agent.put(`/api/health-data/${today()}`).send({ restingHr: 300 }).expect(400);
      await athlete.agent.put(`/api/health-data/${today()}`).send({}).expect(400);
      await athlete.agent.put(`/api/health-data/${addDays(today(), 1)}`).send({ steps: 1 }).expect(400);
      await athlete.agent.put('/api/health-data/yesterday').send({ steps: 1 }).expect(400);
      const res = await athlete.agent.get('/api/health-data').expect(200);
      assert.equal(res.body.today.steps, 6500);
      assert.equal(res.body.today.sleepMinutes, 400);
    });

    it('imports CSV rows and reports bad ones', async () => {
      const csv = [
        'Date,Steps,Resting HR,Sleep hours',
        `${addDays(today(), -2)},9000,60,7.5`,
        `${addDays(today(), -1)},"10,500",61,8`,
        'not-a-date,100,60,7',
        `${addDays(today(), -3)},5000,999,7`,
      ].join('\n');
      const res = await athlete.agent.post('/api/health-data/import').send({ csv }).expect(200);
      assert.equal(res.body.imported, 1);
      assert.equal(res.body.skipped, 3);
      assert.ok(res.body.errors.some((e) => /Line 4/.test(e)));
      const days = (await athlete.agent.get('/api/health-data').expect(200)).body.days;
      const twoDaysAgo = days.find((d) => d.date === addDays(today(), -2));
      assert.deepEqual([twoDaysAgo.steps, twoDaysAgo.restingHr, twoDaysAgo.sleepMinutes], [9000, 60, 450]);
      await athlete.agent.post('/api/health-data/import').send({ csv: 'steps\n100' }).expect(400);
    });

    it('takes the phone health store upload and replaces each synced day', async () => {
      const phone = await ctx().signUp('Phone Sync');
      const yesterday = addDays(today(), -1);
      const sync = (body) => phone.agent.post('/api/health-data/sync').send(body);
      const first = await sync({
        source: 'health_connect',
        days: [
          { date: today(), steps: 4200, activeCalories: 180 },
          { date: yesterday, steps: 11000, restingHr: 57, sleepMinutes: 450, activeCalories: 520 },
          { date: addDays(today(), 1), steps: 10 },
          { date: yesterday, steps: -5 },
        ],
        bloodPressure: [
          { measuredAt: new Date(Date.now() - 3600e3).toISOString(), systolic: 118, diastolic: 76, pulse: 64 },
          { measuredAt: new Date(Date.now() - 2 * 3600e3).toISOString(), systolic: 70, diastolic: 90 },
          { systolic: 120, diastolic: 80 },
        ],
      }).expect(200);
      assert.deepEqual([first.body.days, first.body.readings, first.body.skipped], [2, 1, 4]);

      // A manual entry wins over the phone for that field; the rest still shows.
      await phone.agent.put(`/api/health-data/${today()}`).send({ steps: 5000 }).expect(200);
      let res = (await phone.agent.get('/api/health-data').expect(200)).body;
      assert.deepEqual([res.today.steps, res.today.activeCalories], [5000, 180]);
      assert.deepEqual(res.today.sources.sort(), ['health_connect', 'manual']);
      assert.equal(res.latestRestingHr.value, 57);
      assert.equal(res.weekAverage.activeCalories, 350);
      assert.equal(res.bloodPressure.latest.systolic, 118);
      assert.equal(res.bloodPressure.latest.category, 'normal');

      // Syncing again replaces the day (resting HR gone from the store → cleared)
      // and doesn't duplicate readings; an empty day removes the source's row.
      await sync({
        source: 'health_connect',
        days: [{ date: yesterday, steps: 12000 }, { date: today() }],
        bloodPressure: [{ measuredAt: res.bloodPressure.latest.measuredAt, systolic: 119, diastolic: 77 }],
      }).expect(200);
      res = (await phone.agent.get('/api/health-data').expect(200)).body;
      const y = res.days.find((d) => d.date === yesterday);
      assert.deepEqual([y.steps, y.restingHr, y.activeCalories], [12000, null, null]);
      assert.deepEqual(res.today.sources, ['manual']);
      assert.equal(res.bloodPressure.readings.length, 1);
      assert.equal(res.bloodPressure.latest.systolic, 119);

      await sync({ source: 'fitbit', days: [] }).expect(400);
      await sync({ source: 'apple_health', days: Array(32).fill({ date: today(), steps: 1 }) }).expect(400);
    });

    it('records blood pressure readings typed in, with their category', async () => {
      const bp = await ctx().signUp('Pressure');
      const add = (body) => bp.agent.post('/api/health-data/blood-pressure').send(body);
      const reading = (await add({ systolic: 135, diastolic: 85, pulse: 70 }).expect(201)).body.reading;
      assert.deepEqual([reading.category, reading.source, reading.date], ['high_1', 'manual', today()]);
      const older = (await add({ systolic: 125, diastolic: 75, measuredAt: new Date(Date.now() - 86400e3).toISOString() }).expect(201)).body.reading;
      assert.equal(older.category, 'elevated');

      await add({ systolic: 80, diastolic: 120 }).expect(400);
      await add({ systolic: 300, diastolic: 80 }).expect(400);
      await add({ systolic: 120 }).expect(400);
      await add({ systolic: 120, diastolic: 80, measuredAt: new Date(Date.now() + 3600e3).toISOString() }).expect(400);

      const res = (await bp.agent.get('/api/health-data').expect(200)).body.bloodPressure;
      assert.deepEqual(res.readings.map((r) => r.systolic), [135, 125]);

      const stranger = await ctx().signUp('Stranger');
      await stranger.agent.delete(`/api/health-data/blood-pressure/${reading.id}`).expect(404);
      assert.equal((await stranger.agent.get('/api/health-data').expect(200)).body.bloodPressure.latest, null);
      await bp.agent.delete(`/api/health-data/blood-pressure/${reading.id}`).expect(200);
      await bp.agent.delete(`/api/health-data/blood-pressure/${reading.id}`).expect(404);
    });

    it('keeps health data private', async () => {
      const other = await ctx().signUp('Private');
      const res = await other.agent.get('/api/health-data').expect(200);
      assert.deepEqual(res.body.days, []);
    });
  });

  describe('connections', () => {
    let http;
    before(() => {
      Object.assign(process.env, PROVIDER_ENV);
      http = fakeHttp();
      integrations.setHttp(http);
    });
    after(() => {
      for (const key of Object.keys(PROVIDER_ENV)) delete process.env[key];
      integrations.setHttp(null);
    });

    it('lists services and whether they are available', async () => {
      const res = await athlete.agent.get('/api/integrations').expect(200);
      const strava = res.body.integrations.find((i) => i.id === 'strava');
      assert.equal(strava.available, true);
      assert.equal(strava.connected, false);
    });

    it('connects Strava, stores tokens encrypted and imports activities', async () => {
      const { url } = (await athlete.agent.post('/api/integrations/strava/connect').expect(200)).body;
      const auth = new URL(url);
      assert.equal(auth.origin, 'https://www.strava.com');
      const state = auth.searchParams.get('state');
      assert.ok(state);
      assert.match(auth.searchParams.get('redirect_uri'), /\/api\/integrations\/strava\/callback$/);

      const back = await request(app).get('/api/integrations/strava/callback').query({ code: 'abc', state }).expect(302);
      assert.match(back.headers.location, /\/progress\?integration=strava&result=connected$/);

      const stored = await prisma.connection.findFirst({ where: { userId: athlete.user.id, provider: 'strava' } });
      assert.ok(stored.accessToken.startsWith('v1:'));
      assert.ok(!stored.accessToken.includes('strava-access-1'));

      const activities = await prisma.externalActivity.findMany({ where: { userId: athlete.user.id } });
      assert.equal(activities.length, 2);
      assert.equal(activities.find((a) => a.externalId === '1002').calories, 210);

      // Activities count as active days in the progress summary.
      const summary = (await athlete.agent.get('/api/progress/summary').expect(200)).body;
      assert.equal(summary.summary.totals.externalActivities, 2);
      assert.ok(summary.summary.streak.current >= 1);
      assert.equal(summary.recentActivities[0].name, 'Morning run');
    });

    it('rejects reused or unknown states', async () => {
      await request(app).get('/api/integrations/strava/callback').query({ code: 'abc', state: 'made-up' })
        .expect(302)
        .expect('location', /result=expired/);
      const { url } = (await athlete.agent.post('/api/integrations/strava/connect').expect(200)).body;
      const state = new URL(url).searchParams.get('state');
      await request(app).get('/api/integrations/fitbit/callback').query({ code: 'abc', state }).expect(302).expect('location', /result=expired/);
      await request(app).get('/api/integrations/strava/callback').query({ error: 'access_denied', state: 'whatever' }).expect(302);
    });

    it('re-syncs without duplicating, refreshing an expired token', async () => {
      await prisma.connection.updateMany({ where: { userId: athlete.user.id, provider: 'strava' }, data: { expiresAt: new Date(Date.now() - 1000) } });
      await athlete.agent.post('/api/integrations/strava/sync').expect(200);
      assert.equal(await prisma.externalActivity.count({ where: { userId: athlete.user.id } }), 2);
      assert.ok(http.calls.some((c) => c.url.includes('strava.com/oauth/token') && String(c.init.body).includes('refresh_token')));
    });

    it('connects Fitbit with PKCE and imports daily numbers', async () => {
      const { url } = (await athlete.agent.post('/api/integrations/fitbit/connect').expect(200)).body;
      const auth = new URL(url);
      assert.equal(auth.searchParams.get('code_challenge_method'), 'S256');
      await request(app).get('/api/integrations/fitbit/callback').query({ code: 'xyz', state: auth.searchParams.get('state') }).expect(302);
      const tokenCall = http.calls.find((c) => c.url === 'https://api.fitbit.com/oauth2/token');
      assert.ok(new URLSearchParams(tokenCall.init.body).get('code_verifier'));
      const health = (await athlete.agent.get('/api/health-data').expect(200)).body;
      // Manual steps win over Fitbit's for today; Fitbit fills in the rest.
      assert.equal(health.today.steps, 6500);
      assert.equal(health.today.restingHr, 58);
      assert.ok(health.today.sources.includes('fitbit'));
    });

    it('disconnects', async () => {
      await athlete.agent.delete('/api/integrations/strava').expect(200);
      await athlete.agent.delete('/api/integrations/strava').expect(404);
      await athlete.agent.post('/api/integrations/strava/sync').expect(404);
    });

    it('says when a service is not set up', async () => {
      delete process.env.STRAVA_CLIENT_ID;
      await athlete.agent.post('/api/integrations/strava/connect').expect(503);
      process.env.STRAVA_CLIENT_ID = PROVIDER_ENV.STRAVA_CLIENT_ID;
      await athlete.agent.post('/api/integrations/garmin/connect').expect(404);
    });
  });
}

module.exports = { defineHealthSuite };
