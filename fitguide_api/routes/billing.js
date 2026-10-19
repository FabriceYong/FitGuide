const express = require('express');
const { body } = require('express-validator');
const billing = require('../services/billing');
const { authMiddleware } = require('../middleware/authMiddleware');
const { rejectInvalid } = require('../utils/validate');

const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (err instanceof billing.BillingError) return res.status(err.status).json({ success: false, message: err.message });
    return next(err);
  }
};

/**
 * POST /api/billing/webhook — Stripe events. Mounted in app.js before the
 * JSON body parser, because the signature covers the raw bytes.
 */
const webhook = [
  express.raw({ type: 'application/json', limit: '1mb' }),
  handle(async (req, res) => {
    const result = await billing.handleWebhook(req.body, req.get('stripe-signature'));
    res.json({ received: true, ...result });
  }),
];

const router = express.Router();
router.use(authMiddleware);

// GET /api/billing — plan, renewal and prices
router.get('/', handle(async (req, res) => {
  res.json({ success: true, ...(await billing.status(req.user)) });
}));

// POST /api/billing/checkout { interval: monthly|yearly } — returns the Stripe Checkout URL
router.post('/checkout', [body('interval').isIn(['monthly', 'yearly'])], rejectInvalid, handle(async (req, res) => {
  res.json({ success: true, url: await billing.checkout(req.user, req.body.interval) });
}));

// POST /api/billing/portal — returns the Stripe customer portal URL
router.post('/portal', handle(async (req, res) => {
  res.json({ success: true, url: await billing.portal(req.user) });
}));

module.exports = router;
module.exports.webhook = webhook;
