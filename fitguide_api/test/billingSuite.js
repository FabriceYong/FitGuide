/**
 * PLUS subscriptions with a fake Stripe client and webhooks signed with
 * Stripe's own test helper. Runs inside defineApiSuite.
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const Stripe = require('stripe');
const billing = require('../services/billing');
const { prisma } = require('../db/prisma');

const WEBHOOK_SECRET = 'whsec_test_secret';
const ENV = { STRIPE_SECRET_KEY: 'sk_test_fake', STRIPE_PRICE_MONTHLY: 'price_month', STRIPE_PRICE_YEARLY: 'price_year', STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET };

function fakeStripe() {
  const calls = { customers: [], checkout: [], portal: [] };
  const subs = new Map();
  return {
    calls,
    subs,
    customers: { create: async (params) => { calls.customers.push(params); return { id: `cus_${calls.customers.length}` }; } },
    checkout: { sessions: { create: async (params) => { calls.checkout.push(params); return { url: 'https://checkout.stripe.test/session' }; } } },
    billingPortal: { sessions: { create: async (params) => { calls.portal.push(params); return { url: 'https://billing.stripe.test/portal' }; } } },
    prices: { retrieve: async (id) => ({ id, unit_amount: id === 'price_month' ? 999 : 7999, currency: 'usd' }) },
    subscriptions: { retrieve: async (id) => subs.get(id) },
  };
}

/** POST a webhook signed like Stripe would. */
function sendWebhook(app, event, secret = WEBHOOK_SECRET) {
  const payload = JSON.stringify(event);
  return request(app)
    .post('/api/billing/webhook')
    .set('Content-Type', 'application/json')
    .set('Stripe-Signature', Stripe.webhooks.generateTestHeaderString({ payload, secret }))
    .send(payload);
}

const subscription = (customer, status, extra = {}) => ({
  id: 'sub_1',
  object: 'subscription',
  customer,
  status,
  cancel_at_period_end: false,
  items: { data: [{ current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400 }] },
  metadata: {},
  ...extra,
});

function defineBillingSuite(ctx) {
  let app;
  let payer;
  let stripe;

  before(async () => {
    ({ app } = ctx());
    payer = await ctx().signUp('Pat Payer');
  });

  it('is off without Stripe settings', async () => {
    const res = await payer.agent.get('/api/billing').expect(200);
    assert.equal(res.body.enabled, false);
    assert.equal(res.body.plan, 'free');
    await payer.agent.post('/api/billing/checkout').send({ interval: 'monthly' }).expect(503);
    // Without billing, the free exercise GIFs stay on.
    const workout = await request(app).get('/api/workouts/core-power-blast').expect(200);
    assert.ok(workout.body.workout.steps.some((s) => s.gifUrl));
  });

  describe('with Stripe configured', () => {
    before(() => {
      Object.assign(process.env, ENV);
      stripe = fakeStripe();
      billing.setStripe(stripe);
    });
    after(() => {
      for (const key of Object.keys(ENV)) delete process.env[key];
      billing.setStripe(null);
    });

    it('shows prices and starts checkout', async () => {
      const status = await payer.agent.get('/api/billing').expect(200);
      assert.equal(status.body.enabled, true);
      assert.deepEqual(status.body.prices.map((p) => [p.interval, p.amount]), [['monthly', 999], ['yearly', 7999]]);

      await payer.agent.post('/api/billing/checkout').send({ interval: 'weekly' }).expect(400);
      const res = await payer.agent.post('/api/billing/checkout').send({ interval: 'yearly' }).expect(200);
      assert.equal(res.body.url, 'https://checkout.stripe.test/session');
      const params = stripe.calls.checkout[0];
      assert.equal(params.mode, 'subscription');
      assert.deepEqual(params.line_items, [{ price: 'price_year', quantity: 1 }]);
      assert.equal(params.client_reference_id, payer.user.id);
      assert.equal(stripe.calls.customers.length, 1);

      // A second checkout reuses the same customer.
      await payer.agent.post('/api/billing/checkout').send({ interval: 'monthly' }).expect(200);
      assert.equal(stripe.calls.customers.length, 1);
    });

    it('turns PLUS on from a verified webhook only', async () => {
      const customer = (await prisma.user.findUnique({ where: { id: payer.user.id } })).stripeCustomerId;
      stripe.subs.set('sub_1', subscription(customer, 'active'));
      const event = { id: 'evt_checkout_1', type: 'checkout.session.completed', data: { object: { mode: 'subscription', subscription: 'sub_1', customer } } };

      await sendWebhook(app, event, 'whsec_wrong').expect(400);
      assert.equal((await payer.agent.get('/api/auth/me').expect(200)).body.user.plan, 'free');

      await sendWebhook(app, event).expect(200);
      const me = (await payer.agent.get('/api/auth/me').expect(200)).body.user;
      assert.equal(me.plan, 'plus');
      assert.ok(me.planRenewsAt);

      // The same event again is ignored.
      const again = await sendWebhook(app, event).expect(200);
      assert.equal(again.body.duplicate, true);
      await payer.agent.post('/api/billing/checkout').send({ interval: 'monthly' }).expect(409);
    });

    it('opens the customer portal', async () => {
      const res = await payer.agent.post('/api/billing/portal').expect(200);
      assert.equal(res.body.url, 'https://billing.stripe.test/portal');
      const nobody = await ctx().signUp('No Sub');
      await nobody.agent.post('/api/billing/portal').expect(404);
    });

    it('gates PLUS workouts and programs', async () => {
      const admin = await ctx().signUp('Gate Admin');
      await prisma.user.update({ where: { id: admin.user.id }, data: { role: 'admin' } });
      await admin.agent.patch('/api/admin/workouts/leg-day-destroyer').send({ isPremium: true }).expect(200);
      await admin.agent.patch('/api/admin/programs/strength-builder').send({ isPremium: true }).expect(200);

      const free = await ctx().signUp('Free Fran');
      const locked = await free.agent.get('/api/workouts/leg-day-destroyer').expect(200);
      assert.equal(locked.body.workout.locked, true);
      assert.deepEqual(locked.body.workout.steps, []);
      await request(app).get('/api/workouts/leg-day-destroyer').expect(200).expect((r) => assert.equal(r.body.workout.locked, true));
      // The list and favorites don't leak the steps either.
      const listed = (await request(app).get('/api/workouts').expect(200)).body.workouts.find((w) => w.slug === 'leg-day-destroyer');
      assert.equal(listed.locked, true);
      assert.deepEqual(listed.steps, []);
      const faved = await free.agent.post('/api/favorites/leg-day-destroyer').expect(200);
      assert.equal(faved.body.favorites[0].locked, true);
      assert.deepEqual(faved.body.favorites[0].steps, []);
      const now = Date.now();
      await free.agent.post('/api/sessions').send({ workoutSlug: 'leg-day-destroyer', startedAt: new Date(now - 3600e3).toISOString(), completedAt: new Date(now - 60e3).toISOString(), durationSec: 1800 }).expect(402);
      const enroll = await free.agent.post('/api/enrollments').send({ programSlug: 'strength-builder' }).expect(402);
      assert.equal(enroll.body.code, 'PLUS_REQUIRED');

      const open = await payer.agent.get('/api/workouts/leg-day-destroyer').expect(200);
      assert.equal(open.body.workout.locked, undefined);
      const openList = (await payer.agent.get('/api/workouts').expect(200)).body.workouts.find((w) => w.slug === 'leg-day-destroyer');
      assert.equal(openList.locked, undefined);
      await payer.agent.post('/api/enrollments').send({ programSlug: 'strength-builder' }).expect(201);

      await admin.agent.patch('/api/admin/workouts/leg-day-destroyer').send({ isPremium: false }).expect(200);
      await admin.agent.patch('/api/admin/programs/strength-builder').send({ isPremium: false }).expect(200);
    });

    it('switches off the non-commercial exercise GIFs while billing is on', async () => {
      const workout = await request(app).get('/api/workouts/core-power-blast').expect(200);
      assert.ok(workout.body.workout.steps.every((s) => !s.gifUrl));
      await request(app).get('/api/exercise-media/gif').query({ name: 'plank' }).expect(404);
      process.env.EXERCISE_GIFS_LICENSED = 'true';
      const licensed = await request(app).get('/api/workouts/core-power-blast').expect(200);
      assert.ok(licensed.body.workout.steps.some((s) => s.gifUrl));
      delete process.env.EXERCISE_GIFS_LICENSED;
    });

    it('turns PLUS off when the subscription ends', async () => {
      const customer = (await prisma.user.findUnique({ where: { id: payer.user.id } })).stripeCustomerId;
      await sendWebhook(app, { id: 'evt_cancel_soon', type: 'customer.subscription.updated', data: { object: subscription(customer, 'active', { cancel_at_period_end: true }) } }).expect(200);
      let me = (await payer.agent.get('/api/auth/me').expect(200)).body.user;
      assert.equal(me.plan, 'plus');
      assert.equal(me.cancelAtPeriodEnd, true);
      await sendWebhook(app, { id: 'evt_deleted', type: 'customer.subscription.deleted', data: { object: subscription(customer, 'canceled') } }).expect(200);
      me = (await payer.agent.get('/api/auth/me').expect(200)).body.user;
      assert.equal(me.plan, 'free');
    });
  });
}

module.exports = { defineBillingSuite };
