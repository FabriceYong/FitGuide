/**
 * API behaviour, run against a real Postgres by api.test.js.
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp, createAppWith, useDatabase } = require('./helpers/setup');
const { defineTrainingSuite } = require('./trainingSuite');
const { definePlanCoachSuite } = require('./planCoachSuite');
const { defineNutritionSuite } = require('./nutritionSuite');
const { defineHealthSuite } = require('./healthSuite');
const { defineSocialSuite } = require('./socialSuite');
const { defineAdminSuite } = require('./adminSuite');
const { defineBillingSuite } = require('./billingSuite');
const { defineAnalyticsSuite } = require('./analyticsSuite');
const { defineAccountSuite } = require('./accountSuite');

const ALLOWED_ORIGIN = 'http://localhost:3000';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

let counter = 0;
const newAccount = (name = 'Test User') => ({
  name,
  email: `user${Date.now()}-${(counter += 1)}@example.com`,
  password: 'correct-horse-battery',
});

/** Find a cookie in a response, parsed into { value, attrs }. */
function cookie(res, name) {
  const raw = (res.headers['set-cookie'] || []).find((c) => c.startsWith(`${name}=`));
  if (!raw) return null;
  const [pair, ...attrs] = raw.split(';').map((s) => s.trim());
  return { value: pair.slice(name.length + 1), attrs: attrs.map((a) => a.toLowerCase()) };
}
const authCookie = (res) => cookie(res, 'fitguide_token');
const refreshCookie = (res) => cookie(res, 'fitguide_refresh');

function defineApiSuite() {
  describe('FitGuide API', () => {
    let app;
    let teardown;

    // A registered user with a cookie-carrying agent, plus a second user.
    let alice;
    let bob;

    /** Register an account and return { agent, user, creds }. */
    async function signUp(name) {
      const creds = newAccount(name);
      const agent = request.agent(app);
      const res = await agent.post('/api/auth/register').send(creds).expect(201);
      return { agent, user: res.body.user, creds };
    }

    before(async () => {
      teardown = await useDatabase();
      app = createApp();
      alice = await signUp('Alice');
      bob = await signUp('Bob');
    });

    after(async () => {
      await teardown();
    });

    it('reports health', async () => {
      const res = await request(app).get('/api/health').expect(200);
      assert.equal(res.body.database, 'postgres');
    });

    describe('security headers', () => {
      it('sets helmet headers and lets other origins embed uploads', async () => {
        const res = await request(app).get('/api/health');
        assert.equal(res.headers['x-content-type-options'], 'nosniff');
        assert.equal(res.headers['cross-origin-resource-policy'], 'cross-origin');
        assert.ok(res.headers['content-security-policy']);
        assert.equal(res.headers['x-powered-by'], undefined);
      });

      it('allows credentialed CORS only from configured origins', async () => {
        const ok = await request(app).get('/api/health').set('Origin', ALLOWED_ORIGIN);
        assert.equal(ok.headers['access-control-allow-origin'], ALLOWED_ORIGIN);
        assert.equal(ok.headers['access-control-allow-credentials'], 'true');
        const bad = await request(app).get('/api/health').set('Origin', 'https://evil.example');
        assert.equal(bad.headers['access-control-allow-origin'], undefined);
      });

      it('lets local dev servers on any port call the API without cookies, outside production', async () => {
        // `flutter run -d chrome` serves the app from a new port each run
        const preflight = (origin) => request(app).options('/api/auth/login').set('Origin', origin)
          .set('Access-Control-Request-Method', 'POST').set('Access-Control-Request-Headers', 'content-type,x-auth-transport');
        const dev = await preflight('http://localhost:61234').expect(204);
        assert.equal(dev.headers['access-control-allow-origin'], 'http://localhost:61234');
        assert.equal(dev.headers['access-control-allow-credentials'], undefined);
        const lookalike = await preflight('http://localhost.evil.example');
        assert.equal(lookalike.headers['access-control-allow-origin'], undefined);

        process.env.NODE_ENV = 'production';
        try {
          const prod = await preflight('http://localhost:61234');
          assert.equal(prod.headers['access-control-allow-origin'], undefined);
        } finally {
          process.env.NODE_ENV = 'test';
        }
      });
    });

    describe('auth', () => {
      it('register sets an httpOnly SameSite cookie and keeps the token out of the body', async () => {
        const res = await request(app).post('/api/auth/register').send(newAccount()).expect(201);
        const cookie = authCookie(res);
        assert.ok(cookie?.value, 'auth cookie set');
        assert.ok(cookie.attrs.includes('httponly'));
        assert.ok(cookie.attrs.includes('samesite=lax'));
        assert.ok(cookie.attrs.includes('path=/'));
        assert.ok(cookie.attrs.some((a) => a.startsWith('max-age=') || a.startsWith('expires=')));
        assert.equal(res.body.token, undefined);
        assert.equal(res.body.user.password, undefined);
      });

      it('returns the token in the body for bearer clients that ask for it', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .set('X-Auth-Transport', 'bearer')
          .send(newAccount('Mobile'))
          .expect(201);
        assert.ok(res.body.token);
        const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${res.body.token}`).expect(200);
        assert.equal(me.body.user.name, 'Mobile');
      });

      it('rejects duplicate emails', async () => {
        await request(app).post('/api/auth/register').send(alice.creds).expect(409);
      });

      it('validates registration input', async () => {
        await request(app).post('/api/auth/register').send({ name: 'X', email: 'not-an-email', password: 'secret1' }).expect(400);
        await request(app).post('/api/auth/register').send({ ...newAccount(), password: '123' }).expect(400);
      });

      it('login checks the password and sets the cookie', async () => {
        await request(app).post('/api/auth/login').send({ ...alice.creds, password: 'wrong-password' }).expect(401);
        await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'whatever' }).expect(401);

        const agent = request.agent(app);
        const res = await agent.post('/api/auth/login').send({ email: alice.creds.email, password: alice.creds.password }).expect(200);
        assert.ok(authCookie(res)?.value);
        assert.equal(res.body.token, undefined);
        const me = await agent.get('/api/auth/me').expect(200);
        assert.equal(me.body.user.id, alice.user.id);
      });

      it('/me requires a valid token', async () => {
        await request(app).get('/api/auth/me').expect(401);
        await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-jwt').expect(401);
        const res = await request(app).get('/api/auth/me').set('Cookie', 'fitguide_token=tampered.jwt.value').expect(401);
        // A bad cookie is cleared so the browser stops sending it.
        assert.equal(authCookie(res)?.value, '');
      });

      it('logout clears the cookie', async () => {
        const { agent } = await signUp('Leaver');
        await agent.get('/api/auth/me').expect(200);
        const res = await agent.post('/api/auth/logout').expect(200);
        const cookie = authCookie(res);
        assert.equal(cookie?.value, '');
        assert.ok(cookie.attrs.some((a) => a.startsWith('expires=thu, 01 jan 1970')));
        await agent.get('/api/auth/me').expect(401);
      });

      it('issues a refresh token limited to the auth routes, plus a session hint', async () => {
        const res = await request(app).post('/api/auth/register').send(newAccount()).expect(201);
        const refresh = refreshCookie(res);
        assert.ok(refresh?.value);
        assert.ok(refresh.attrs.includes('httponly'));
        assert.ok(refresh.attrs.includes('path=/api/auth'));
        const hint = cookie(res, 'fitguide_session');
        assert.equal(hint?.value, '1');
        assert.ok(!hint.attrs.includes('httponly'));
      });

      it('refresh rotates the token and keeps the session going', async () => {
        const { agent, user } = await signUp('Rotator');
        const first = await agent.post('/api/auth/refresh').expect(200);
        assert.equal(first.body.user.id, user.id);
        assert.ok(authCookie(first)?.value);
        const second = await agent.post('/api/auth/refresh').expect(200);
        assert.notEqual(refreshCookie(second).value, refreshCookie(first).value);
        await agent.get('/api/auth/me').expect(200);
      });

      it('a replayed refresh token ends the whole session', async () => {
        const creds = newAccount('Victim');
        const res = await request(app).post('/api/auth/register').send(creds).expect(201);
        const stolen = refreshCookie(res).value;
        const victim = await request(app).post('/api/auth/refresh').set('Cookie', `fitguide_refresh=${stolen}`).expect(200);
        const current = refreshCookie(victim).value;
        // The attacker replays the old token: everything in the family is revoked.
        const replay = await request(app).post('/api/auth/refresh').set('Cookie', `fitguide_refresh=${stolen}`).expect(401);
        assert.equal(replay.body.code, 'SESSION_ENDED');
        assert.equal(refreshCookie(replay)?.value, '');
        await request(app).post('/api/auth/refresh').set('Cookie', `fitguide_refresh=${current}`).expect(401);
      });

      it('refresh needs a valid token and an allowed origin', async () => {
        await request(app).post('/api/auth/refresh').expect(401);
        await request(app).post('/api/auth/refresh').set('Cookie', 'fitguide_refresh=made-up').expect(401);
        const { agent } = await signUp('Origin');
        await agent.post('/api/auth/refresh').set('Origin', 'https://evil.example').expect(403);
        await agent.post('/api/auth/refresh').set('Origin', ALLOWED_ORIGIN).expect(200);
      });

      it('bearer clients refresh with the token in the body', async () => {
        const login = await request(app).post('/api/auth/register').set('X-Auth-Transport', 'bearer').send(newAccount('App')).expect(201);
        assert.ok(login.body.refreshToken);
        const res = await request(app)
          .post('/api/auth/refresh')
          .set('X-Auth-Transport', 'bearer')
          .send({ refreshToken: login.body.refreshToken })
          .expect(200);
        assert.ok(res.body.token);
        assert.notEqual(res.body.refreshToken, login.body.refreshToken);
        await request(app).get('/api/auth/me').set('Authorization', `Bearer ${res.body.token}`).expect(200);
      });

      it('reports expired access tokens so clients know to refresh', async () => {
        const expired = jwt.sign({ id: alice.user.id }, process.env.JWT_SECRET, { expiresIn: -10 });
        const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`).expect(401);
        assert.equal(res.body.code, 'TOKEN_EXPIRED');
      });

      it('logout revokes the refresh token', async () => {
        const { agent } = await signUp('Done');
        const res = await agent.post('/api/auth/logout').expect(200);
        assert.equal(refreshCookie(res)?.value, '');
        assert.equal(cookie(res, 'fitguide_session')?.value, '');
        await agent.post('/api/auth/refresh').expect(401);
      });

      it('rejects cookie-authenticated writes from foreign origins (CSRF)', async () => {
        await alice.agent.put('/api/auth/profile').set('Origin', 'https://evil.example').send({ name: 'Pwned' }).expect(403);
        await alice.agent.put('/api/auth/profile').set('Origin', ALLOWED_ORIGIN).send({ name: 'Alice' }).expect(200);
        // Reads are fine from anywhere (CORS still hides the response).
        await alice.agent.get('/api/auth/me').set('Origin', 'https://evil.example').expect(200);
      });
    });

    describe('profile', () => {
      it('updates only the signed-in user, whatever the body says', async () => {
        const res = await alice.agent
          .put('/api/auth/profile')
          .send({ id: bob.user.id, _id: bob.user.id, email: bob.creds.email, name: 'Alice Updated', weight: 65 })
          .expect(200);
        assert.equal(res.body.user.id, alice.user.id);
        assert.equal(res.body.user.name, 'Alice Updated');
        assert.equal(res.body.user.email, alice.user.email);
        assert.equal(res.body.user.weight, 65);

        const bobNow = await bob.agent.get('/api/auth/me').expect(200);
        assert.equal(bobNow.body.user.name, 'Bob');
        assert.equal(bobNow.body.user.email, bob.user.email);
      });

      it('validates profile fields', async () => {
        await alice.agent.put('/api/auth/profile').send({ gender: 'Robot' }).expect(400);
        await alice.agent.put('/api/auth/profile').send({ height: 9999 }).expect(400);
      });

      it('stores training preferences from sign-up and profile edits', async () => {
        const creds = { ...newAccount('Prefs'), gender: 'Female', focusAreas: ['Glutes', 'Core', 'Glutes'], equipment: ['none'], limitations: ['knees'], workoutMinutes: 30, daysPerWeek: 3 };
        const agent = request.agent(app);
        const { user } = (await agent.post('/api/auth/register').send(creds).expect(201)).body;
        assert.deepEqual(user.focusAreas, ['Glutes', 'Core']);
        assert.deepEqual(user.equipment, ['none']);
        assert.deepEqual(user.limitations, ['knees']);
        assert.equal(user.workoutMinutes, 30);
        assert.equal(user.daysPerWeek, 3);

        // "No equipment" plus a kit keeps the kit; null clears a list or a number.
        const edited = (await agent.put('/api/auth/profile').send({ equipment: ['none', 'weights'], limitations: null, workoutMinutes: null }).expect(200)).body.user;
        assert.deepEqual(edited.equipment, ['weights']);
        assert.deepEqual(edited.limitations, []);
        assert.equal(edited.workoutMinutes, null);
        assert.deepEqual(edited.focusAreas, ['Glutes', 'Core']);

        // Accounts that never answered get empty preferences.
        assert.deepEqual(bob.user.focusAreas, []);
        assert.equal(bob.user.daysPerWeek, null);
      });

      it('validates training preferences', async () => {
        await alice.agent.put('/api/auth/profile').send({ focusAreas: ['Toes'] }).expect(400);
        await alice.agent.put('/api/auth/profile').send({ focusAreas: 'Glutes' }).expect(400);
        await alice.agent.put('/api/auth/profile').send({ equipment: ['spaceship'] }).expect(400);
        await alice.agent.put('/api/auth/profile').send({ limitations: ['everything'] }).expect(400);
        await alice.agent.put('/api/auth/profile').send({ workoutMinutes: 5 }).expect(400);
        await alice.agent.put('/api/auth/profile').send({ daysPerWeek: 8 }).expect(400);
      });

      it('requires auth', async () => {
        await request(app).put('/api/auth/profile').send({ name: 'Anon' }).expect(401);
      });

      it('has no public users list', async () => {
        await request(app).get('/api/auth/users').expect(404);
      });
    });

    describe('workouts and search', () => {
      let workouts;
      before(async () => {
        workouts = (await request(app).get('/api/workouts').expect(200)).body.workouts;
      });

      it('lists workouts identified by slug', () => {
        assert.ok(workouts.length > 0);
        for (const w of workouts) assert.ok(w.slug);
      });

      it('gets one workout by slug', async () => {
        const res = await request(app).get(`/api/workouts/${workouts[0].slug}`).expect(200);
        assert.equal(res.body.workout.slug, workouts[0].slug);
        await request(app).get('/api/workouts/no-such-workout').expect(404);
      });

      it('finds workouts by a plain search term', async () => {
        const word = workouts[0].title.split(' ')[0];
        const res = await request(app).get('/api/workouts').query({ search: word }).expect(200);
        assert.ok(res.body.workouts.some((w) => w.slug === workouts[0].slug));
      });

      it('treats regex metacharacters in search literally', async () => {
        // As a regex, '.*' would match every workout; literally, it matches none.
        const literalMatches = (q) => workouts.filter((w) => [w.title, w.description, ...(w.tags || [])]
          .some((text) => text.toLowerCase().includes(q.toLowerCase()))).length;
        for (const search of ['(', '[', '(a+)+$', '\\', '*', '.*']) {
          const res = await request(app).get('/api/workouts').query({ search }).expect(200);
          assert.equal(res.body.count, literalMatches(search), `search ${JSON.stringify(search)}`);
        }
        assert.equal(literalMatches('.*'), 0);
      });

      it('likes are idempotent per user', async () => {
        const { slug } = workouts[1];
        await request(app).post(`/api/workouts/${slug}/like`).expect(401);
        const first = await alice.agent.post(`/api/workouts/${slug}/like`).expect(200);
        const again = await alice.agent.post(`/api/workouts/${slug}/like`).expect(200);
        assert.equal(again.body.likes, first.body.likes);
        const other = await bob.agent.post(`/api/workouts/${slug}/like`).expect(200);
        assert.equal(other.body.likes, first.body.likes + 1);
        await alice.agent.post('/api/workouts/no-such-workout/like').expect(404);
      });
    });

    describe('favorites', () => {
      let slug;
      before(async () => {
        slug = (await request(app).get('/api/workouts').expect(200)).body.workouts[0].slug;
      });

      it('requires auth', async () => {
        await request(app).get('/api/favorites').expect(401);
        await request(app).post(`/api/favorites/${slug}`).expect(401);
      });

      it('adds by slug, idempotently', async () => {
        const res = await alice.agent.post(`/api/favorites/${slug}`).expect(200);
        assert.deepEqual(res.body.favoriteSlugs, [slug]);
        assert.equal(res.body.favorites[0].slug, slug);

        const again = await alice.agent.post(`/api/favorites/${slug}`).expect(200);
        assert.deepEqual(again.body.favoriteSlugs, [slug]);

        const check = await alice.agent.get(`/api/favorites/check/${slug}`).expect(200);
        assert.equal(check.body.isFavorite, true);

        const list = await alice.agent.get('/api/favorites').expect(200);
        assert.deepEqual(list.body.favorites.map((w) => w.slug), [slug]);
      });

      it('rejects unknown slugs', async () => {
        await alice.agent.post('/api/favorites/no-such-workout').expect(404);
      });

      it('keeps favorites per account', async () => {
        const res = await bob.agent.get('/api/favorites').expect(200);
        assert.deepEqual(res.body.favoriteSlugs, []);
      });

      it('removes by slug', async () => {
        const res = await alice.agent.delete(`/api/favorites/${slug}`).expect(200);
        assert.deepEqual(res.body.favoriteSlugs, []);
        const check = await alice.agent.get(`/api/favorites/check/${slug}`).expect(200);
        assert.equal(check.body.isFavorite, false);
      });

      it('works with a bearer token too', async () => {
        const login = await request(app)
          .post('/api/auth/login')
          .set('X-Auth-Transport', 'bearer')
          .send({ email: bob.creds.email, password: bob.creds.password })
          .expect(200);
        const res = await request(app)
          .post(`/api/favorites/${slug}`)
          .set('Authorization', `Bearer ${login.body.token}`)
          .expect(200);
        assert.deepEqual(res.body.favoriteSlugs, [slug]);
      });
    });

    describe('reviews', () => {
      let slug;
      let reviewId;
      before(async () => {
        slug = (await request(app).get('/api/workouts').expect(200)).body.workouts[2].slug;
      });

      it('requires auth to post', async () => {
        await request(app).post('/api/reviews').field('rating', '5').field('comment', 'Great').expect(401);
      });

      it('ties the review to the account, not the form', async () => {
        const res = await alice.agent
          .post('/api/reviews')
          .field('rating', '4')
          .field('comment', 'Solid workout')
          .field('workoutId', slug)
          .field('name', 'Somebody Else')
          .field('userId', bob.user.id)
          .attach('beforeImage', PNG, { filename: 'before.svg', contentType: 'image/png' })
          .expect(201);
        const { review } = res.body;
        reviewId = String(review.id);
        assert.equal(String(review.userId), alice.user.id);
        assert.equal(review.name, 'Alice Updated');
        assert.equal(review.workoutId, slug);
        assert.match(review.beforeImage, /^\/uploads\/reviews\/[^/]+\.png$/);
        assert.equal(review.likedBy, undefined);

        const list = await request(app).get('/api/reviews').query({ workoutId: slug }).expect(200);
        assert.ok(list.body.reviews.some((r) => String(r.id) === reviewId));
      });

      it('allows one review per user per workout', async () => {
        await alice.agent.post('/api/reviews').field('rating', '5').field('comment', 'Again').field('workoutId', slug).expect(409);
      });

      it('validates rating and comment', async () => {
        await alice.agent.post('/api/reviews').field('rating', '9').field('comment', 'x').expect(400);
        await alice.agent.post('/api/reviews').field('rating', '3').field('comment', '   ').expect(400);
      });

      it('likes are idempotent per user', async () => {
        await request(app).post(`/api/reviews/${reviewId}/like`).expect(401);
        const first = await bob.agent.post(`/api/reviews/${reviewId}/like`).expect(200);
        assert.equal(first.body.likes, 1);
        const again = await bob.agent.post(`/api/reviews/${reviewId}/like`).expect(200);
        assert.equal(again.body.likes, 1);
        const other = await alice.agent.post(`/api/reviews/${reviewId}/like`).expect(200);
        assert.equal(other.body.likes, 2);
        await bob.agent.post('/api/reviews/000000000000000000000000/like').expect(404);
        await bob.agent.post('/api/reviews/not-an-id/like').expect(404);
      });
    });

    describe('uploads', () => {
      it('requires auth', async () => {
        await request(app).post('/api/upload/avatar').attach('avatar', PNG, { filename: 'a.png', contentType: 'image/png' }).expect(401);
      });

      it('stores the extension from the MIME type, not the filename', async () => {
        const res = await alice.agent
          .post('/api/upload/avatar')
          .attach('avatar', PNG, { filename: 'evil.html', contentType: 'image/png' })
          .expect(200);
        assert.match(res.body.avatarUrl, /^\/uploads\/avatars\/[^/]+\.png$/);

        const file = await request(app).get(res.body.avatarUrl).expect(200);
        assert.equal(file.headers['content-type'], 'image/png');
        assert.equal(file.headers['x-content-type-options'], 'nosniff');
      });

      it('rejects non-image MIME types', async () => {
        for (const [filename, contentType] of [['x.html', 'text/html'], ['x.svg', 'image/svg+xml'], ['x.png', 'application/octet-stream']]) {
          await alice.agent
            .post('/api/upload/avatar')
            .attach('avatar', Buffer.from('<svg onload="alert(1)"/>'), { filename, contentType })
            .expect(400);
        }
      });

      it('requires a file', async () => {
        await alice.agent.post('/api/upload/avatar').expect(400);
      });

      it('rejects files whose content is not the image type they claim', async () => {
        const res = await alice.agent
          .post('/api/upload/avatar')
          .attach('avatar', Buffer.from('<html><script>alert(1)</script></html>'), { filename: 'x.png', contentType: 'image/png' })
          .expect(400);
        assert.match(res.body.message, /not a valid image/);
      });
    });

    describe('training data', () => defineTrainingSuite(() => ({ app, signUp })));

    describe('plans and coach', () => definePlanCoachSuite(() => ({ app, signUp })));

    describe('nutrition', () => defineNutritionSuite(() => ({ app, signUp })));

    describe('health data and wearables', () => defineHealthSuite(() => ({ app, signUp })));

    describe('community', () => defineSocialSuite(() => ({ app, signUp })));

    describe('admin and creators', () => defineAdminSuite(() => ({ app, signUp })));

    describe('billing', () => defineBillingSuite(() => ({ app, signUp })));

    describe('analytics', () => defineAnalyticsSuite(() => ({ app, signUp })));

    describe('account', () => defineAccountSuite(() => ({ app, signUp })));

    describe('rate limits', () => {
      it('limits failed logins', async () => {
        const limited = createAppWith({ LOGIN_RATE_LIMIT_MAX: '3' });
        const bad = { email: alice.creds.email, password: 'wrong-password' };
        for (let i = 0; i < 3; i += 1) {
          await request(limited).post('/api/auth/login').send(bad).expect(401);
        }
        const res = await request(limited).post('/api/auth/login').send(bad).expect(429);
        assert.equal(res.body.success, false);
        assert.ok(res.headers.ratelimit || res.headers['ratelimit-policy']);
        // Even the right password is blocked until the window resets.
        await request(limited).post('/api/auth/login').send(alice.creds).expect(429);
      });

      it('does not count successful logins', async () => {
        const limited = createAppWith({ LOGIN_RATE_LIMIT_MAX: '2' });
        for (let i = 0; i < 4; i += 1) {
          await request(limited).post('/api/auth/login').send(alice.creds).expect(200);
        }
      });

      it('limits wrong current-password attempts', async () => {
        const limited = createAppWith({ LOGIN_RATE_LIMIT_MAX: '2' });
        const agent = request.agent(limited);
        const creds = newAccount('Guesser');
        await agent.post('/api/auth/register').send(creds).expect(201);
        await agent.put('/api/auth/password').send({ currentPassword: 'guess-1', newPassword: 'whatever-new' }).expect(403);
        await agent.delete('/api/auth/account').send({ password: 'guess-2' }).expect(403);
        await agent.put('/api/auth/password').send({ currentPassword: creds.password, newPassword: 'whatever-new' }).expect(429);
      });

      it('limits registrations', async () => {
        const limited = createAppWith({ REGISTER_RATE_LIMIT_MAX: '2' });
        await request(limited).post('/api/auth/register').send(newAccount()).expect(201);
        await request(limited).post('/api/auth/register').send(newAccount()).expect(201);
        await request(limited).post('/api/auth/register').send(newAccount()).expect(429);
      });
    });
  });
}

module.exports = { defineApiSuite };
