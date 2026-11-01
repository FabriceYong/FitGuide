const express = require('express');
const { body } = require('express-validator');
const { PROFILE } = require('@fitguide/shared');
const plans = require('../services/plans');
const suggestions = require('../services/planSuggestions');
const { authMiddleware } = require('../middleware/authMiddleware');
const { rejectInvalid } = require('../utils/validate');
const { tzOffsetFrom, today, isValidYmd, daysBetween } = require('../utils/dates');

const router = express.Router();
router.use(authMiddleware);

const { LIMITS } = plans;

/** Send PlanErrors as their status; anything else goes to the error handler. */
const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (err instanceof plans.PlanError) return res.status(err.status).json({ success: false, message: err.message });
    if (err instanceof suggestions.SuggestionError) return res.status(err.status).json({ success: false, message: err.message, ...err.extra });
    return next(err);
  }
};

// ─── GET /api/plan/options ────────────────────────────────────────────────────
// Choices for the generator form (goals, levels, equipment found in the catalog).
router.get('/options', handle(async (_req, res) => {
  res.json({ success: true, ...(await plans.options()) });
}));

// ─── GET /api/plan?tzOffset= ──────────────────────────────────────────────────
// The personal plan the user is following, or null.
router.get('/', handle(async (req, res) => {
  res.json({ success: true, plan: await plans.current(req.user.id, today(tzOffsetFrom(req))) });
}));

// ─── POST /api/plan/generate?tzOffset= ────────────────────────────────────────
// Body: { goal, level, daysPerWeek, minutesPerSession, equipment[], weeks, startDate? }
// Builds a plan and starts it, ending any program the user was following.
router.post(
  '/generate',
  [
    body('goal').isIn(PROFILE.GOALS).withMessage('Choose a goal'),
    body('level').isIn(PROFILE.FITNESS_LEVELS).withMessage('Choose a level'),
    body('daysPerWeek').isInt({ min: LIMITS.daysPerWeek[0], max: LIMITS.daysPerWeek[1] }).withMessage('Days per week must be 1–7').toInt(),
    body('minutesPerSession').isInt({ min: LIMITS.minutesPerSession[0], max: LIMITS.minutesPerSession[1] }).withMessage('Minutes per session must be 10–120').toInt(),
    body('weeks').isInt({ min: LIMITS.weeks[0], max: LIMITS.weeks[1] }).withMessage('Weeks must be 1–12').toInt(),
    body('equipment').optional().isArray({ max: 50 }).withMessage('equipment must be a list'),
    body('equipment.*').isString().isLength({ max: 60 }),
    body('startDate').optional().custom(isValidYmd).withMessage('startDate must be a date (YYYY-MM-DD)'),
  ],
  rejectInvalid,
  handle(async (req, res) => {
    const todayYmd = today(tzOffsetFrom(req));
    if (req.body.startDate && Math.abs(daysBetween(todayYmd, req.body.startDate)) > 30) {
      return res.status(400).json({ success: false, message: 'Start date must be within 30 days of today.' });
    }
    const { plan, warnings } = await plans.create(req.user.id, { ...req.body, equipment: req.body.equipment || [] }, todayYmd);
    res.status(201).json({ success: true, plan, warnings });
  }),
);

// ─── POST /api/plan/adapt?tzOffset= ───────────────────────────────────────────
// Makes the rest of the plan easier or harder from recent effort and adherence.
router.post('/adapt', handle(async (req, res) => {
  const tzOffset = tzOffsetFrom(req);
  res.json({ success: true, ...(await plans.adapt(req.user.id, today(tzOffset), tzOffset)) });
}));

// ─── GET /api/plan/suggestion?tzOffset= ───────────────────────────────────────
// A change the active plan or program proposes (catch up after missed
// sessions, or easier/harder workouts), or null. Nothing changes until the
// member accepts it.
router.get('/suggestion', handle(async (req, res) => {
  const tzOffset = tzOffsetFrom(req);
  res.json({ success: true, suggestion: await suggestions.current(req.user.id, today(tzOffset), tzOffset) });
}));

// ─── POST /api/plan/suggestion/accept?tzOffset= ───────────────────────────────
// Body: { id } — the suggestion as it was shown. 409 with the new one if it changed.
router.post(
  '/suggestion/accept',
  [body('id').isString().isLength({ min: 1, max: 64 })],
  rejectInvalid,
  handle(async (req, res) => {
    const tzOffset = tzOffsetFrom(req);
    res.json({ success: true, ...(await suggestions.accept(req.user.id, req.body.id, today(tzOffset), tzOffset)) });
  }),
);

// ─── POST /api/plan/suggestion/dismiss?tzOffset= ──────────────────────────────
// Body: { kind } — no thanks: that kind isn't suggested again for a week.
router.post(
  '/suggestion/dismiss',
  [body('kind').isIn(suggestions.KINDS)],
  rejectInvalid,
  handle(async (req, res) => {
    await suggestions.dismiss(req.user.id, req.body.kind, today(tzOffsetFrom(req)));
    res.json({ success: true });
  }),
);

// ─── PATCH /api/plan/days?tzOffset= ───────────────────────────────────────────
// Body: { week, day, workoutSlug } — put another workout on an open day.
router.patch(
  '/days',
  [
    body('week').isInt({ min: 1, max: 52 }).toInt(),
    body('day').isInt({ min: 1, max: 7 }).toInt(),
    body('workoutSlug').isString().trim().notEmpty(),
  ],
  rejectInvalid,
  handle(async (req, res) => {
    const plan = await plans.swapDay(req.user.id, req.body, today(tzOffsetFrom(req)));
    res.json({ success: true, plan });
  }),
);

module.exports = router;
