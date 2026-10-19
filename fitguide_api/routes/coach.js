const express = require('express');
const { body } = require('express-validator');
const { rateLimit } = require('express-rate-limit');
const Anthropic = require('@anthropic-ai/sdk');
const coach = require('../services/coach');
const { authMiddleware } = require('../middleware/authMiddleware');
const { rejectInvalid } = require('../utils/validate');
const { intFromEnv } = require('../utils/config');
const { tzOffsetFrom, today } = require('../utils/dates');

const router = express.Router();
router.use(authMiddleware);

// Each message costs model tokens: limit per account, not per IP.
const perUser = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: () => intFromEnv('COACH_MESSAGES_PER_HOUR', 30),
  keyGenerator: (req) => `coach:${req.user.id}`,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: "You've sent a lot of messages this hour. Please try again a bit later." },
});

// ─── GET /api/coach ───────────────────────────────────────────────────────────
// Whether the coach is available, and the conversation so far.
router.get('/', async (req, res, next) => {
  try {
    res.json({ success: true, available: coach.isConfigured(), maxMessages: coach.MAX_USER_TURNS, messages: await coach.history(req.user.id) });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/coach/messages?tzOffset= ───────────────────────────────────────
// Body: { text } — returns the coach's reply.
router.post(
  '/messages',
  perUser,
  [body('text').isString().trim().isLength({ min: 1, max: 2000 }).withMessage('Write a message (up to 2000 characters).')],
  rejectInvalid,
  async (req, res, next) => {
    try {
      const tzOffset = tzOffsetFrom(req);
      const { reply, changedPlan } = await coach.chat(req.user, req.body.text, { todayYmd: today(tzOffset), tzOffset });
      res.status(201).json({ success: true, reply, changedPlan });
    } catch (err) {
      if (err instanceof coach.CoachError) return res.status(err.status).json({ success: false, message: err.message, ...(err.code && { code: err.code }) });
      if (err instanceof Anthropic.APIError) {
        // Anthropic API failure (rate limit, overload, ...): don't leak details.
        console.error('[coach] API error', err.status, err.message);
        return res.status(502).json({ success: false, message: 'The coach is unavailable right now. Please try again shortly.' });
      }
      return next(err);
    }
  },
);

// ─── DELETE /api/coach/messages ───────────────────────────────────────────────
// Start a new conversation.
router.delete('/messages', async (req, res, next) => {
  try {
    await coach.reset(req.user.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
