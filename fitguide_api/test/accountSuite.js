/**
 * Changing and resetting the password, and deleting the account. Runs inside defineApiSuite.
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { PROFILE } = require('@fitguide/shared');
const billing = require('../services/billing');
const mailer = require('../services/mailer');
const passwordReset = require('../services/passwordReset');
const { prisma } = require('../db/prisma');
const { UPLOADS_ROOT } = require('../utils/storage');

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
const NEW_PASSWORD = 'a-brand-new-passphrase';

const refreshValue = (res) => (res.headers['set-cookie'] || []).find((c) => c.startsWith('fitguide_refresh='))?.split(';')[0].slice('fitguide_refresh='.length);
const uploadedFile = (url) => path.join(UPLOADS_ROOT, url.replace(/^\/uploads\//, ''));

async function uploadAvatar(agent) {
  const res = await agent.post('/api/upload/avatar').attach('avatar', PNG, { filename: 'a.png', contentType: 'image/png' }).expect(200);
  await agent.put('/api/auth/profile').send({ avatarUrl: res.body.avatarUrl }).expect(200);
  return res.body.avatarUrl;
}

/**
 * Collect sent emails instead of sending them. nextMail() resolves with the
 * next one, since the forgot-password route answers before it sends.
 */
function captureMail() {
  const inbox = [];
  const waiting = [];
  mailer.setTransport({
    sendMail: async (message) => {
      const resolve = waiting.shift();
      if (resolve) resolve(message);
      else inbox.push(message);
    },
  });
  return {
    nextMail: () => (inbox.length ? Promise.resolve(inbox.shift()) : new Promise((resolve) => { waiting.push(resolve); })),
    count: () => inbox.length,
  };
}
const tokenFrom = (mail) => new URL(mail.text.match(/https?:\/\/\S+/)[0]).searchParams.get('token');

let unique = 0;
const slug = (what) => `${what}-${Date.now()}-${(unique += 1)}`;

function defineAccountSuite(ctx) {
  describe('change password', () => {
    it('requires a session, the current password and a long enough new one', async () => {
      const { app } = ctx();
      const { agent, creds } = await ctx().signUp('Pass Checker');
      await request(app).put('/api/auth/password').send({ currentPassword: creds.password, newPassword: NEW_PASSWORD }).expect(401);
      await agent.put('/api/auth/password').send({ currentPassword: creds.password, newPassword: 'x'.repeat(PROFILE.PASSWORD_MIN - 1) }).expect(400);
      await agent.put('/api/auth/password').send({ newPassword: NEW_PASSWORD }).expect(400);
      await agent.put('/api/auth/password').send({ currentPassword: creds.password, newPassword: creds.password }).expect(400);
      // 403, not 401: clients treat 401 as an expired session and sign out.
      const wrong = await agent.put('/api/auth/password').send({ currentPassword: 'not-my-password', newPassword: NEW_PASSWORD }).expect(403);
      assert.equal(wrong.body.code, 'WRONG_PASSWORD');
      // A wrong password must not end the session.
      await agent.get('/api/auth/me').expect(200);
      await request(app).post('/api/auth/login').send({ email: creds.email, password: creds.password }).expect(200);
    });

    it('signs out other devices and keeps this one', async () => {
      const { app } = ctx();
      const { agent, creds } = await ctx().signUp('Pass Changer');
      const laptop = request.agent(app);
      await laptop.post('/api/auth/login').send({ email: creds.email, password: creds.password }).expect(200);

      const res = await agent.put('/api/auth/password').send({ currentPassword: creds.password, newPassword: NEW_PASSWORD }).expect(200);
      assert.ok(refreshValue(res), 'a fresh refresh token is issued');
      assert.equal(res.body.token, undefined);

      // This device keeps going, including through a refresh.
      await agent.get('/api/auth/me').expect(200);
      await agent.post('/api/auth/refresh').expect(200);
      // The other device can't refresh any more.
      const other = await laptop.post('/api/auth/refresh').expect(401);
      assert.equal(other.body.code, 'SESSION_ENDED');

      await request(app).post('/api/auth/login').send({ email: creds.email, password: creds.password }).expect(401);
      await request(app).post('/api/auth/login').send({ email: creds.email, password: NEW_PASSWORD }).expect(200);
    });

    it('gives bearer clients their new tokens', async () => {
      const { app } = ctx();
      const { creds } = await ctx().signUp('Pass Mobile');
      const login = await request(app).post('/api/auth/login').set('X-Auth-Transport', 'bearer').send({ email: creds.email, password: creds.password }).expect(200);
      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${login.body.token}`)
        .set('X-Auth-Transport', 'bearer')
        .send({ currentPassword: creds.password, newPassword: NEW_PASSWORD })
        .expect(200);
      assert.ok(res.body.token && res.body.refreshToken);
      await request(app).post('/api/auth/refresh').send({ refreshToken: login.body.refreshToken }).expect(401);
      await request(app).post('/api/auth/refresh').set('X-Auth-Transport', 'bearer').send({ refreshToken: res.body.refreshToken }).expect(200);
    });
  });

  describe('forgot password', () => {
    let mail;
    before(() => { mail = captureMail(); });
    after(() => mailer.setTransport(null));

    it('answers the same for unknown emails and sends nothing', async () => {
      const { app } = ctx();
      const { creds } = await ctx().signUp('Reset Known');
      const known = await request(app).post('/api/auth/forgot-password').send({ email: creds.email }).expect(200);
      const unknown = await request(app).post('/api/auth/forgot-password').send({ email: `nobody-${slug('x')}@example.com` }).expect(200);
      assert.equal(unknown.body.message, known.body.message);
      await mail.nextMail();
      await passwordReset.requestReset(`nobody-${slug('y')}@example.com`);
      assert.equal(mail.count(), 0);
      await request(app).post('/api/auth/forgot-password').send({ email: 'not-an-email' }).expect(400);
    });

    it('emails a one-time link that sets the password and signs out other devices', async () => {
      const { app } = ctx();
      const { agent, creds } = await ctx().signUp('Reset Me');
      await request(app).post('/api/auth/forgot-password').send({ email: creds.email.toUpperCase() }).expect(200);
      const message = await mail.nextMail();
      assert.equal(message.to, creds.email);
      assert.match(message.text, /^Hi Reset,/);
      assert.ok(message.text.includes('http://localhost:3000/reset-password?token='));
      const token = tokenFrom(message);

      await request(app).post('/api/auth/reset-password').send({ token, password: 'x'.repeat(PROFILE.PASSWORD_MIN - 1) }).expect(400);
      await request(app).post('/api/auth/reset-password').send({ token: 'made-up', password: NEW_PASSWORD }).expect(400);
      const browser = request.agent(app);
      const res = await browser.post('/api/auth/reset-password').send({ token, password: NEW_PASSWORD }).expect(200);
      assert.equal(res.body.user.email, creds.email);
      assert.ok(refreshValue(res), 'the browser is signed in');
      await browser.get('/api/auth/me').expect(200);

      const again = await request(app).post('/api/auth/reset-password').send({ token, password: 'yet-another-password' }).expect(400);
      assert.equal(again.body.code, 'RESET_LINK_INVALID');
      const old = await agent.post('/api/auth/refresh').expect(401);
      assert.equal(old.body.code, 'SESSION_ENDED');
      await request(app).post('/api/auth/login').send({ email: creds.email, password: creds.password }).expect(401);
      await request(app).post('/api/auth/login').send({ email: creds.email, password: NEW_PASSWORD }).expect(200);
    });

    it('gives bearer clients their tokens', async () => {
      const { app } = ctx();
      const { creds } = await ctx().signUp('Reset Mobile');
      await request(app).post('/api/auth/forgot-password').set('X-Auth-Transport', 'bearer').send({ email: creds.email }).expect(200);
      const token = tokenFrom(await mail.nextMail());
      const res = await request(app).post('/api/auth/reset-password').set('X-Auth-Transport', 'bearer').send({ token, password: NEW_PASSWORD }).expect(200);
      assert.ok(res.body.token && res.body.refreshToken);
    });

    it('sends one link a minute, and a newer link replaces the old one', async () => {
      const { app } = ctx();
      const { user, creds } = await ctx().signUp('Reset Twice');
      await passwordReset.requestReset(creds.email);
      const first = tokenFrom(await mail.nextMail());
      await passwordReset.requestReset(creds.email);
      assert.equal(mail.count(), 0, 'no second email within a minute');

      await prisma.passwordReset.updateMany({ where: { userId: user.id }, data: { createdAt: new Date(Date.now() - 2 * 60 * 1000) } });
      await passwordReset.requestReset(creds.email);
      const second = tokenFrom(await mail.nextMail());
      await request(app).post('/api/auth/reset-password').send({ token: first, password: NEW_PASSWORD }).expect(400);
      await request(app).post('/api/auth/reset-password').send({ token: second, password: NEW_PASSWORD }).expect(200);
    });

    it('refuses expired links and voids links when the password changes', async () => {
      const { app } = ctx();
      const { agent, user, creds } = await ctx().signUp('Reset Late');
      await passwordReset.requestReset(creds.email);
      const expired = tokenFrom(await mail.nextMail());
      await prisma.passwordReset.updateMany({ where: { userId: user.id }, data: { expiresAt: new Date(Date.now() - 1000), createdAt: new Date(Date.now() - 2 * 60 * 1000) } });
      await request(app).post('/api/auth/reset-password').send({ token: expired, password: NEW_PASSWORD }).expect(400);

      await passwordReset.requestReset(creds.email);
      const pending = tokenFrom(await mail.nextMail());
      await agent.put('/api/auth/password').send({ currentPassword: creds.password, newPassword: NEW_PASSWORD }).expect(200);
      await request(app).post('/api/auth/reset-password').send({ token: pending, password: 'someone-elses-choice' }).expect(400);
    });
  });

  describe('delete account', () => {
    it('requires a session and the password', async () => {
      const { app } = ctx();
      const { agent, user, creds } = await ctx().signUp('Not Leaving');
      await request(app).delete('/api/auth/account').send({ password: creds.password }).expect(401);
      await agent.delete('/api/auth/account').send({}).expect(400);
      const res = await agent.delete('/api/auth/account').send({ password: 'not-my-password' }).expect(403);
      assert.equal(res.body.code, 'WRONG_PASSWORD');
      assert.ok(await prisma.user.findUnique({ where: { id: user.id } }));
      await agent.delete('/api/auth/account').set('Origin', 'https://evil.example').send({ password: creds.password }).expect(403);
      assert.ok(await prisma.user.findUnique({ where: { id: user.id } }));
    });

    it('deletes the user, their data and their files, and signs them out', async () => {
      const { app } = ctx();
      const leaver = await ctx().signUp('Lea Ving');
      const friend = await ctx().signUp('Fran Stays');
      const id = leaver.user.id;
      const workout = 'core-power-blast';

      const avatarUrl = await uploadAvatar(leaver.agent);
      const review = await leaver.agent.post('/api/reviews')
        .field('rating', '5').field('comment', 'Great').field('workoutId', workout)
        .attach('beforeImage', PNG, { filename: 'b.png', contentType: 'image/png' })
        .expect(201);
      const photoUrl = review.body.review.beforeImage;
      assert.ok(fs.existsSync(uploadedFile(avatarUrl)) && fs.existsSync(uploadedFile(photoUrl)));

      const friendReview = await friend.agent.post('/api/reviews').field('rating', '4').field('comment', 'Nice').expect(201);
      await leaver.agent.post(`/api/reviews/${friendReview.body.review.id}/like`).expect(200);
      const likesBefore = (await prisma.workout.findUnique({ where: { slug: workout } })).likeCount;
      await leaver.agent.post(`/api/workouts/${workout}/like`).expect(200);
      await leaver.agent.post(`/api/favorites/${workout}`).expect(200);

      const plan = await prisma.program.create({
        data: { slug: slug('plan'), title: 'My plan', description: 'Mine', level: 'Beginner', goal: 'Vitality', weeks: 4, daysPerWeek: 3, ownerId: id },
      });
      await prisma.enrollment.create({ data: { userId: id, programSlug: plan.slug, startDate: '2026-10-01' } });
      const draft = await prisma.program.create({
        data: { slug: slug('draft'), title: 'Draft', description: 'Draft', level: 'Beginner', goal: 'Vitality', weeks: 4, daysPerWeek: 3, creatorId: id, status: 'draft' },
      });
      const published = await prisma.program.create({
        data: { slug: slug('pub'), title: 'Published', description: 'Shared', level: 'Beginner', goal: 'Vitality', weeks: 4, daysPerWeek: 3, creatorId: id, status: 'published' },
      });
      await prisma.workoutSession.create({
        data: { userId: id, workoutSlug: workout, workoutTitle: 'Core', startedAt: new Date(), completedAt: new Date(), durationSec: 600 },
      });
      await prisma.bodyMetric.create({ data: { userId: id, date: '2026-10-01', weightKg: 70 } });
      await prisma.coachMessage.create({ data: { userId: id, role: 'user', content: [{ type: 'text', text: 'hi' }], display: 'hi' } });
      await prisma.dailyMetric.create({ data: { userId: id, date: '2026-10-01', source: 'manual', steps: 1000 } });
      await prisma.bloodPressureReading.create({ data: { userId: id, date: '2026-10-01', measuredAt: new Date(), source: 'manual', systolic: 120, diastolic: 80 } });
      await prisma.connection.create({ data: { userId: id, provider: 'strava', accessToken: 'encrypted' } });
      await prisma.food.create({ data: { slug: slug('food'), name: 'Mine', category: 'custom', servingLabel: '1', servingSize: 1, calories: 1, protein: 0, carbs: 0, fat: 0, ownerId: id } });
      await prisma.friendship.create({ data: { requesterId: id, addresseeId: friend.user.id, status: 'accepted' } });
      const solo = await prisma.challenge.create({
        data: { title: 'Solo', metric: 'sessions', startDate: '2026-10-01', endDate: '2026-10-30', visibility: 'private', joinCode: slug('S').slice(0, 20), creatorId: id, members: { create: [{ userId: id }] } },
      });
      const shared = await prisma.challenge.create({
        data: { title: 'Shared', metric: 'sessions', startDate: '2026-10-01', endDate: '2026-10-30', visibility: 'friends', joinCode: slug('T').slice(0, 20), creatorId: id, members: { create: [{ userId: id }, { userId: friend.user.id }] } },
      });

      const res = await leaver.agent.delete('/api/auth/account').send({ password: leaver.creds.password }).expect(200);
      const cleared = (res.headers['set-cookie'] || []).filter((c) => /^fitguide_(token|refresh|session)=;/.test(c));
      assert.equal(cleared.length, 3, 'all three session cookies are cleared');
      await leaver.agent.get('/api/auth/me').expect(401);
      await request(app).post('/api/auth/login').send({ email: leaver.creds.email, password: leaver.creds.password }).expect(401);

      assert.equal(await prisma.user.count({ where: { id } }), 0);
      const where = { userId: id };
      const counts = await Promise.all([
        prisma.refreshToken.count({ where }), prisma.review.count({ where }), prisma.reviewLike.count({ where }),
        prisma.workoutLike.count({ where }), prisma.favorite.count({ where }), prisma.enrollment.count({ where }),
        prisma.workoutSession.count({ where }), prisma.bodyMetric.count({ where }), prisma.coachMessage.count({ where }),
        prisma.dailyMetric.count({ where }), prisma.bloodPressureReading.count({ where }), prisma.connection.count({ where }), prisma.challengeMember.count({ where }),
        prisma.food.count({ where: { ownerId: id } }), prisma.program.count({ where: { ownerId: id } }),
        prisma.friendship.count({ where: { OR: [{ requesterId: id }, { addresseeId: id }] } }),
      ]);
      assert.deepEqual(counts, Array(counts.length).fill(0));

      // Counters the user added are taken back.
      assert.equal((await prisma.workout.findUnique({ where: { slug: workout } })).likeCount, likesBefore);
      assert.equal((await prisma.review.findUnique({ where: { id: friendReview.body.review.id } })).likes, 0);
      // Unpublished creator work and solo challenges go; shared things stay for others.
      assert.equal(await prisma.program.count({ where: { id: draft.id } }), 0);
      assert.equal((await prisma.program.findUnique({ where: { id: published.id } })).creatorId, null);
      assert.equal(await prisma.challenge.count({ where: { id: solo.id } }), 0);
      assert.equal((await prisma.challenge.findUnique({ where: { id: shared.id } })).creatorId, null);
      await friend.agent.get('/api/auth/me').expect(200);

      assert.ok(!fs.existsSync(uploadedFile(avatarUrl)), 'avatar file removed');
      assert.ok(!fs.existsSync(uploadedFile(photoUrl)), 'review photo removed');
    });

    it("keeps a file another account still uses", async () => {
      const owner = await ctx().signUp('File Owner');
      const copier = await ctx().signUp('File Copier');
      const avatarUrl = await uploadAvatar(owner.agent);
      await copier.agent.put('/api/auth/profile').send({ avatarUrl }).expect(200);
      await copier.agent.delete('/api/auth/account').send({ password: copier.creds.password }).expect(200);
      assert.ok(fs.existsSync(uploadedFile(avatarUrl)));
    });

    describe('with a subscription', () => {
      const ENV = { STRIPE_SECRET_KEY: 'sk_test_fake', STRIPE_PRICE_MONTHLY: 'price_month' };
      let cancelled;
      let failCancel;

      function fakeStripe(subs) {
        return {
          subscriptions: {
            list: ({ customer }) => (async function* list() { yield* subs.filter((s) => s.customer === customer); }()),
            cancel: async (subId) => {
              if (failCancel) throw Object.assign(new Error('Stripe is down'), { type: 'StripeConnectionError' });
              cancelled.push(subId);
              return { id: subId, status: 'canceled' };
            },
          },
        };
      }

      async function subscriber(name, customer) {
        const account = await ctx().signUp(name);
        await prisma.user.update({ where: { id: account.user.id }, data: { stripeCustomerId: customer, plan: 'plus', subscriptionStatus: 'active' } });
        return account;
      }

      after(() => {
        for (const key of Object.keys(ENV)) delete process.env[key];
        billing.setStripe(null);
      });

      it('cancels live subscriptions before deleting', async () => {
        Object.assign(process.env, ENV);
        cancelled = [];
        failCancel = false;
        billing.setStripe(fakeStripe([
          { id: 'sub_live', customer: 'cus_leaving', status: 'active' },
          { id: 'sub_old', customer: 'cus_leaving', status: 'canceled' },
          { id: 'sub_other', customer: 'cus_someone_else', status: 'active' },
        ]));
        const account = await subscriber('Plus Leaver', 'cus_leaving');
        await account.agent.delete('/api/auth/account').send({ password: account.creds.password }).expect(200);
        assert.deepEqual(cancelled, ['sub_live']);
        assert.equal(await prisma.user.count({ where: { id: account.user.id } }), 0);
      });

      it('keeps the account if the subscription could not be cancelled', async () => {
        Object.assign(process.env, ENV);
        cancelled = [];
        failCancel = true;
        billing.setStripe(fakeStripe([{ id: 'sub_stuck', customer: 'cus_stuck', status: 'active' }]));
        const account = await subscriber('Plus Stuck', 'cus_stuck');
        const res = await account.agent.delete('/api/auth/account').send({ password: account.creds.password }).expect(502);
        assert.match(res.body.message, /not deleted/);
        assert.equal(await prisma.user.count({ where: { id: account.user.id } }), 1);
        await account.agent.get('/api/auth/me').expect(200);
      });
    });
  });
}

module.exports = { defineAccountSuite };
