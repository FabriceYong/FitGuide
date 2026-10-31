/**
 * FitGuide's small AI helpers: what's available and left today, and the
 * exercise swap, workout feedback, weekly check-in and writing help.
 * Each counts against its own daily allowance (services/ai.js).
 */
const express = require('express');
const { body } = require('express-validator');
const { rateLimit } = require('express-rate-limit');
const ai = require('../services/ai');
const { suggestSwap, REASONS } = require('../services/exerciseSwap');
const { workoutFeedback, weeklyCheckin } = require('../services/insights');
const writingHelp = require('../services/writingHelp');
const { requireRole } = require('../middleware/requireRole');
const { tzOffsetFrom, today } = require('../utils/dates');
const { authMiddleware } = require('../middleware/authMiddleware');
const { rejectInvalid } = require('../utils/validate');
const { intFromEnv } = require('../utils/config');

const router = express.Router();
router.use(authMiddleware);

// A ceiling per account on top of the daily allowances.
const perUser = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: () => intFromEnv('AI_REQUESTS_PER_HOUR', 40),
  keyGenerator: (req) => `ai:${req.user.id}`,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: "You've used the AI helpers a lot this hour. Please try again a bit later." },
});

// ─── GET /api/ai ──────────────────────────────────────────────────────────────
// Whether AI helpers work on this server, and each one's allowance today.
router.get('/', async (req, res, next) => {
  try {
    const allowance = {};
    for (const kind of Object.keys(ai.LIMITS)) allowance[kind] = await ai.usage(req.user, kind);
    res.json({ success: true, available: ai.isConfigured(), allowance });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/ai/swap ────────────────────────────────────────────────────────
// Body: { step: { instruction, exerciseName? }, reason, details?, workout: { title, category, difficulty, equipment } }
router.post(
  '/swap',
  perUser,
  [
    body('step.instruction').isString().trim().isLength({ min: 2, max: 300 }).withMessage('Which step should be swapped?'),
    body('reason').isIn(Object.keys(REASONS)).withMessage('Choose why you want to swap it.'),
    body('details').optional({ values: 'null' }).isString().isLength({ max: 200 }),
    body('workout').optional().isObject(),
  ],
  rejectInvalid,
  async (req, res, next) => {
    try {
      res.json({ success: true, ...(await suggestSwap(req.user, req.body)) });
    } catch (err) {
      ai.sendError(res, next, err, "Swaps can't be suggested right now. Please try again shortly.");
    }
  },
);

// ─── POST /api/ai/feedback?tzOffset= { sessionId } ────────────────────────────
// A short note on a saved workout, compared with earlier times.
router.post(
  '/feedback',
  perUser,
  [body('sessionId').isString().isLength({ min: 1, max: 64 }).withMessage('Which workout?')],
  rejectInvalid,
  async (req, res, next) => {
    try {
      res.json({ success: true, ...(await workoutFeedback(req.user, req.body.sessionId, { tzOffset: tzOffsetFrom(req) })) });
    } catch (err) {
      ai.sendError(res, next, err, "Feedback can't be written right now.");
    }
  },
);

// ─── POST /api/ai/writing { mode: 'outline' | 'polish', … } ───────────────────
// Writing help in the article editor, for coaches and admins.
router.post(
  '/writing',
  perUser,
  requireRole('creator', 'admin'),
  [
    body('mode').isIn(['outline', 'polish']).withMessage('mode must be outline or polish'),
    body('title').if(body('mode').equals('outline')).isString().trim().isLength({ min: 5, max: 160 }).withMessage('Give the article a title first.'),
    body('notes').optional({ values: 'null' }).isString().isLength({ max: 2000 }),
    body('text').if(body('mode').equals('polish')).isString().trim().isLength({ min: 20, max: 6000 }).withMessage('Write at least a sentence or two to tidy up.'),
  ],
  rejectInvalid,
  async (req, res, next) => {
    try {
      const result = req.body.mode === 'outline' ? await writingHelp.outline(req.user, req.body) : await writingHelp.polish(req.user, req.body);
      res.json({ success: true, ...result });
    } catch (err) {
      ai.sendError(res, next, err, "Writing help isn't available right now.");
    }
  },
);

// ─── POST /api/ai/checkin?tzOffset= ───────────────────────────────────────────
// The weekly check-in: the last 7 days against the 7 before.
router.post('/checkin', perUser, async (req, res, next) => {
  try {
    const tzOffset = tzOffsetFrom(req);
    res.json({ success: true, ...(await weeklyCheckin(req.user, { todayYmd: today(tzOffset), tzOffset })) });
  } catch (err) {
    ai.sendError(res, next, err, "Your check-in can't be written right now.");
  }
});

module.exports = router;
