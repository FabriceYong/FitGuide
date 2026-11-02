/**
 * POST /api/events — first-party usage analytics. Anonymous, cookie-free,
 * and limited to a fixed list of event names; the web app doesn't send
 * anything when the browser asks not to be tracked (DNT / GPC).
 */
const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { prisma } = require('../db/prisma');

const router = express.Router();

const EVENT_NAMES = new Set([
  'page_view',
  'signup',
  'workout_started',
  'workout_completed',
  'plan_created',
  'coach_message',
  'food_logged',
  'challenge_joined',
  'checkout_started',
  'card_shared',
]);

// Analytics shouldn't be able to flood the database.
const limiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false });

const clean = (value, max) => (typeof value === 'string' && value.length ? value.slice(0, max) : null);

router.post('/', limiter, async (req, res, next) => {
  try {
    const { name, path, visitorId, device, props } = req.body || {};
    if (!EVENT_NAMES.has(name)) return res.status(400).json({ success: false, message: 'Unknown event.' });
    // Keep only the path: query strings can carry personal data.
    const pathOnly = clean(path, 200)?.split(/[?#]/)[0] || null;
    const safeProps = props && typeof props === 'object' && !Array.isArray(props)
      ? Object.fromEntries(Object.entries(props).slice(0, 10)
        .filter(([, v]) => ['string', 'number', 'boolean'].includes(typeof v))
        .map(([k, v]) => [String(k).slice(0, 40), typeof v === 'string' ? v.slice(0, 100) : v]))
      : null;
    await prisma.analyticsEvent.create({
      data: {
        name,
        path: pathOnly,
        visitorId: clean(visitorId, 40),
        device: ['mobile', 'desktop'].includes(device) ? device : null,
        props: safeProps,
      },
    });
    res.status(202).json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.EVENT_NAMES = EVENT_NAMES;
