/**
 * FitGuide PLUS subscriptions with Stripe Checkout and the customer portal.
 *
 * Billing is on when STRIPE_SECRET_KEY and at least one price
 * (STRIPE_PRICE_MONTHLY / STRIPE_PRICE_YEARLY) are set. The user's plan
 * only changes from verified webhook events, never from the browser.
 */
const Stripe = require('stripe');
const { prisma, isUniqueViolation } = require('../db/prisma');
const { getCorsOrigins } = require('../utils/config');

// Statuses that keep PLUS on. past_due keeps access while Stripe retries the card.
const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);
const PRICE_ENV = { monthly: 'STRIPE_PRICE_MONTHLY', yearly: 'STRIPE_PRICE_YEARLY' };

class BillingError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

let stripe = null;
const priceIds = () => Object.fromEntries(Object.entries(PRICE_ENV).filter(([, env]) => process.env[env]).map(([k, env]) => [k, process.env[env]]));
const isEnabled = () => Boolean((stripe || process.env.STRIPE_SECRET_KEY) && Object.keys(priceIds()).length);

function getStripe() {
  if (!isEnabled()) throw new BillingError('Subscriptions are not available on this server.', 503);
  stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY, { maxNetworkRetries: 2 });
  return stripe;
}

/** Replace the Stripe client (tests). Pass null to reset. */
const setStripe = (client) => { stripe = client; };

const webBase = () => (process.env.WEB_APP_URL || getCorsOrigins()[0] || 'http://localhost:3000').replace(/\/+$/, '');
const isPlus = (user) => user?.plan === 'plus';

/** A PLUS workout as this viewer may see it: the overview for everyone, the steps for members and admins. */
const forViewer = (workout, user) => (workout.isPremium && !isPlus(user) && user?.role !== 'admin'
  ? { ...workout, steps: [], locked: true }
  : workout);

// Prices change rarely; cache what Stripe says for an hour.
let priceCache = { at: 0, data: null };
async function prices() {
  if (!isEnabled()) return [];
  if (priceCache.data && Date.now() - priceCache.at < 60 * 60 * 1000) return priceCache.data;
  const client = getStripe();
  const data = await Promise.all(Object.entries(priceIds()).map(async ([interval, id]) => {
    const p = await client.prices.retrieve(id);
    return { interval, amount: p.unit_amount, currency: p.currency };
  }));
  priceCache = { at: Date.now(), data };
  return data;
}

async function status(user) {
  return {
    enabled: isEnabled(),
    plan: user.plan || 'free',
    subscriptionStatus: user.subscriptionStatus || null,
    renewsAt: user.planRenewsAt || null,
    plusUntil: user.plusUntil || null,
    cancelAtPeriodEnd: Boolean(user.cancelAtPeriodEnd),
    prices: await prices().catch((err) => {
      console.error('[billing] could not load prices:', err.message);
      return [];
    }),
  };
}

/** The user's Stripe customer, created on first checkout. */
async function customerFor(user) {
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { stripeCustomerId: true, email: true, name: true } });
  if (row.stripeCustomerId) return row.stripeCustomerId;
  const customer = await getStripe().customers.create({ email: row.email, name: row.name, metadata: { userId: user.id } });
  await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

async function checkout(user, interval) {
  const price = priceIds()[interval];
  if (!isEnabled()) throw new BillingError('Subscriptions are not available on this server.', 503);
  if (!price) throw new BillingError('That billing period is not offered.');
  // PLUS from invites alone doesn't stop subscribing.
  if (isPlus(user) && ACTIVE_STATUSES.has(user.subscriptionStatus)) throw new BillingError('You already have PLUS. Manage it from your billing settings.', 409);
  const session = await getStripe().checkout.sessions.create({
    mode: 'subscription',
    customer: await customerFor(user),
    client_reference_id: user.id,
    line_items: [{ price, quantity: 1 }],
    allow_promotion_codes: true,
    subscription_data: { metadata: { userId: user.id } },
    success_url: `${webBase()}/plus?checkout=success`,
    cancel_url: `${webBase()}/plus?checkout=cancelled`,
  });
  return session.url;
}

async function portal(user) {
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { stripeCustomerId: true } });
  if (!row.stripeCustomerId) throw new BillingError('No subscription to manage yet.', 404);
  const session = await getStripe().billingPortal.sessions.create({ customer: row.stripeCustomerId, return_url: `${webBase()}/plus` });
  return session.url;
}

/** Copy a subscription's state onto its user. */
async function applySubscription(sub) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
  const periodEnd = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end ?? null;
  const data = {
    plan: ACTIVE_STATUSES.has(sub.status) ? 'plus' : 'free',
    subscriptionStatus: sub.status,
    planRenewsAt: periodEnd ? new Date(periodEnd * 1000) : null,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
  };
  let { count } = await prisma.user.updateMany({ where: { stripeCustomerId: customerId }, data });
  // Fall back to the user id we put in the subscription metadata.
  if (!count && sub.metadata?.userId) {
    ({ count } = await prisma.user.updateMany({ where: { id: sub.metadata.userId }, data: { ...data, stripeCustomerId: customerId } }));
  }
  if (!count) console.warn(`[billing] no user for Stripe customer ${customerId}`);
}

/**
 * Verify and apply a webhook. `rawBody` must be the exact bytes Stripe sent.
 * @returns {Promise<{ handled: boolean, duplicate?: boolean }>}
 */
async function handleWebhook(rawBody, signature) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new BillingError('Webhooks are not configured.', 503);
  let event;
  try {
    event = Stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    throw new BillingError('Invalid signature.', 400);
  }

  try {
    await prisma.stripeEvent.create({ data: { id: event.id, type: event.type } });
  } catch (err) {
    if (isUniqueViolation(err)) return { handled: false, duplicate: true };
    throw err;
  }

  try {
    const object = event.data.object;
    switch (event.type) {
      case 'checkout.session.completed':
        if (object.mode === 'subscription' && object.subscription) {
          const subId = typeof object.subscription === 'string' ? object.subscription : object.subscription.id;
          await applySubscription(await getStripe().subscriptions.retrieve(subId));
        }
        return { handled: true };
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await applySubscription(object);
        return { handled: true };
      default:
        return { handled: false };
    }
  } catch (err) {
    // Let Stripe retry: forget that we saw it.
    await prisma.stripeEvent.delete({ where: { id: event.id } }).catch(() => {});
    throw err;
  }
}

// Subscriptions in these states will never bill again.
const ENDED_STATUSES = new Set(['canceled', 'incomplete_expired']);

/**
 * Cancel every live subscription of a user who is deleting their account,
 * right away rather than at the period end. Throws if Stripe can't be
 * reached, so the account is not deleted while it could still be billed.
 * @returns {Promise<number>} how many subscriptions were cancelled
 */
async function cancelSubscriptions(userId) {
  const row = await prisma.user.findUnique({ where: { id: userId }, select: { stripeCustomerId: true } });
  if (!row?.stripeCustomerId) return 0;
  if (!isEnabled()) {
    console.warn(`[billing] billing is off; cannot cancel subscriptions of Stripe customer ${row.stripeCustomerId}`);
    return 0;
  }
  const client = getStripe();
  let cancelled = 0;
  for await (const sub of client.subscriptions.list({ customer: row.stripeCustomerId, status: 'all' })) {
    if (ENDED_STATUSES.has(sub.status)) continue;
    await client.subscriptions.cancel(sub.id);
    cancelled += 1;
  }
  return cancelled;
}

module.exports = { BillingError, isEnabled, isPlus, forViewer, setStripe, status, checkout, portal, handleWebhook, applySubscription, cancelSubscriptions };
