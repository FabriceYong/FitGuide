const express = require('express');
const { body, query } = require('express-validator');
const { sessionStore, exerciseStore } = require('../stores/records');
const workoutStore = require('../stores/workoutStore');
const { checkProgramDay, markDayComplete, unmarkSession } = require('../services/enrollments');
const { personalRecords } = require('../services/progress');
const { authMiddleware } = require('../middleware/authMiddleware');
const { isPlus } = require('../services/billing');
const { rejectInvalid, pick } = require('../utils/validate');
const { isUniqueViolation } = require('../db/prisma');
const { calorieFactor, heartRateCalories } = require('@fitguide/shared');

const router = express.Router();
router.use(authMiddleware);

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
const SET_FIELDS = ['exerciseSlug', 'exerciseName', 'setNumber', 'reps', 'weightKg', 'durationSec', 'distanceM', 'rpe'];
const nullable = { values: 'null' };

const heartRateRules = () => [
  body('avgHr').optional(nullable).isInt({ min: 25, max: 250 }).withMessage('avgHr must be 25–250').toInt(),
  body('maxHr').optional(nullable).isInt({ min: 25, max: 250 }).withMessage('maxHr must be 25–250').toInt(),
];

/**
 * Calories for a session: from the wearer's heart rate when there's a usable
 * reading, otherwise the workout's rate for a reference adult scaled to this
 * user's body (see calorieFactor).
 */
function sessionCalories(workout, user, { durationSec, avgHr }) {
  const fromHr = heartRateCalories({ avgHr, durationSec }, user);
  if (fromHr != null) return { calories: fromHr, calorieSource: 'heart_rate' };
  const rate = workout && workout.calories && workout.duration ? (workout.calories / (workout.duration * 60)) * calorieFactor(user) : 0;
  return { calories: Math.round(rate * durationSec), calorieSource: 'estimate' };
}

const sessionRules = [
  body('workoutSlug').isString().trim().notEmpty().withMessage('workoutSlug is required'),
  body('startedAt').isISO8601().withMessage('startedAt must be an ISO date'),
  body('completedAt').isISO8601().withMessage('completedAt must be an ISO date'),
  body('durationSec').isInt({ min: 0, max: 24 * 60 * 60 }).withMessage('durationSec must be 0–86400').toInt(),
  body('status').optional().isIn(['completed', 'partial']),
  body('stepsCompleted').optional().isInt({ min: 0, max: 500 }).toInt(),
  body('totalSteps').optional().isInt({ min: 0, max: 500 }).toInt(),
  body('perceivedEffort').optional(nullable).isInt({ min: 1, max: 10 }).withMessage('perceivedEffort must be 1–10').toInt(),
  ...heartRateRules(),
  body('notes').optional().isString().isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters').trim(),
  body('sets').optional().isArray({ max: 200 }).withMessage('sets must be a list of at most 200 entries'),
  body('sets.*.exerciseName').isString().trim().notEmpty().isLength({ max: 200 }).withMessage('Each set needs an exerciseName'),
  body('sets.*.exerciseSlug').optional(nullable).isString().isLength({ max: 100 }),
  body('sets.*.setNumber').optional(nullable).isInt({ min: 1, max: 100 }).toInt(),
  body('sets.*.reps').optional(nullable).isInt({ min: 0, max: 1000 }).withMessage('reps must be 0–1000').toInt(),
  body('sets.*.weightKg').optional(nullable).isFloat({ min: 0, max: 1000 }).withMessage('weightKg must be 0–1000').toFloat(),
  body('sets.*.durationSec').optional(nullable).isInt({ min: 0, max: 36000 }).toInt(),
  body('sets.*.distanceM').optional(nullable).isFloat({ min: 0, max: 1000000 }).toFloat(),
  body('sets.*.rpe').optional(nullable).isInt({ min: 1, max: 10 }).toInt(),
  body('enrollmentId').optional(nullable).isString().isLength({ max: 100 }),
  body('programWeek').optional(nullable).isInt({ min: 1, max: 52 }).toInt(),
  body('programDay').optional(nullable).isInt({ min: 1, max: 7 }).toInt(),
  body('clientId').optional(nullable).isString().trim().isLength({ min: 1, max: 64 }).withMessage('clientId must be 1–64 characters'),
];

/** The user's session saved earlier with this clientId, if any. */
const findByClientId = async (userId, clientId) => (clientId
  ? (await sessionStore.list(userId, { where: { clientId }, limit: 1 }))[0] || null
  : null);

/** A session that was already saved: answer as if it had just been saved, without repeating side effects. */
const sendSaved = (res, session) => res.status(200).json({ success: true, session, newRecords: [], duplicate: true });

/** Link each set to the exercise library where its name (or given slug) matches. */
function linkExercises(sets, exercises) {
  const bySlug = new Map(exercises.map((e) => [e.slug, e]));
  return sets.map((raw) => {
    const set = Object.fromEntries(Object.entries(pick(raw, SET_FIELDS)).filter(([, v]) => v !== null));
    const exercise = bySlug.get(set.exerciseSlug) || exerciseStore.matchExercise(set.exerciseName, exercises);
    return { ...set, exerciseSlug: exercise ? exercise.slug : null };
  });
}

// ─── POST /api/sessions ───────────────────────────────────────────────────────
// Save a finished (or partly finished) workout. Calories are worked out here
// (sessionCalories), not taken from the client. With a clientId,
// sending the same session again returns the saved one (200, duplicate: true).
router.post('/', sessionRules, rejectInvalid, async (req, res, next) => {
  try {
    const b = req.body;
    const saved = await findByClientId(req.user.id, b.clientId);
    if (saved) return sendSaved(res, saved);

    const [workout] = await workoutStore.getManyBySlugs([b.workoutSlug]);
    if (!workout) return res.status(404).json({ success: false, message: 'Workout not found.' });
    if (workout.isPremium && !isPlus(req.user)) {
      return res.status(402).json({ success: false, code: 'PLUS_REQUIRED', message: 'This workout is part of FitGuide PLUS.' });
    }

    const startedAt = new Date(b.startedAt);
    const completedAt = new Date(b.completedAt);
    if (completedAt < startedAt) {
      return res.status(400).json({ success: false, message: 'completedAt must be after startedAt.' });
    }
    if (completedAt.getTime() > Date.now() + MAX_CLOCK_SKEW_MS) {
      return res.status(400).json({ success: false, message: 'completedAt cannot be in the future.' });
    }
    // Active time can't exceed the wall-clock time between start and finish.
    const durationSec = Math.min(b.durationSec, Math.ceil((completedAt - startedAt) / 1000) + 60);

    const program = b.enrollmentId ? { enrollmentId: b.enrollmentId, programWeek: b.programWeek, programDay: b.programDay } : null;
    if (program) {
      if (!program.programWeek || !program.programDay) {
        return res.status(400).json({ success: false, message: 'programWeek and programDay are required with enrollmentId.' });
      }
      const check = await checkProgramDay(req.user.id, { ...program, workoutSlug: workout.slug });
      if (!check.ok) return res.status(400).json({ success: false, message: check.message });
    }

    const exercises = await exerciseStore.all();
    const heartRate = { avgHr: b.avgHr ?? null, maxHr: b.maxHr ?? null };
    let session;
    try {
      session = await sessionStore.create(req.user.id, {
        workoutSlug: workout.slug,
        workoutTitle: workout.title,
        category: workout.category || null,
        status: b.status || 'completed',
        startedAt,
        completedAt,
        durationSec,
        ...heartRate,
        ...sessionCalories(workout, req.user, { durationSec, avgHr: heartRate.avgHr }),
        stepsCompleted: b.stepsCompleted || 0,
        totalSteps: b.totalSteps || 0,
        perceivedEffort: b.perceivedEffort ?? null,
        notes: b.notes || '',
        sets: linkExercises(b.sets || [], exercises),
        clientId: b.clientId || null,
        ...(program || {}),
      });
    } catch (err) {
      // The same session sent twice at once: the other request saved it.
      if (isUniqueViolation(err) && b.clientId) return sendSaved(res, await findByClientId(req.user.id, b.clientId));
      throw err;
    }

    if (program) await markDayComplete(req.user.id, session);

    // Records this session set (it holds the best value for those exercises).
    const all = await sessionStore.list(req.user.id);
    const newRecords = personalRecords(all, new Map(exercises.map((e) => [e.slug, e])))
      .filter((r) => r.sessionId === session.id);

    res.status(201).json({ success: true, session, newRecords });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/sessions?limit=&workoutSlug= ────────────────────────────────────
router.get(
  '/',
  [query('limit').optional().isInt({ min: 1, max: 500 }).toInt(), query('workoutSlug').optional().isString()],
  rejectInvalid,
  async (req, res, next) => {
    try {
      const where = req.query.workoutSlug ? { workoutSlug: String(req.query.workoutSlug) } : {};
      const sessions = await sessionStore.list(req.user.id, { where, sortField: 'completedAt', limit: req.query.limit || 50 });
      res.json({ success: true, count: sessions.length, sessions });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/sessions/:id ────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const session = await sessionStore.findOwned(req.user.id, req.params.id);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });
    res.json({ success: true, session });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/sessions/:id/heart-rate ─────────────────────────────────────────
// Body: { avgHr, maxHr? } — the watch's readings for the session, which can
// reach the phone's health store minutes after the workout is saved. The
// calories are worked out again from them.
router.put('/:id/heart-rate', [body('avgHr').exists().withMessage('avgHr is required'), ...heartRateRules()], rejectInvalid, async (req, res, next) => {
  try {
    const existing = await sessionStore.findOwned(req.user.id, req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Session not found.' });
    const [workout] = await workoutStore.getManyBySlugs([existing.workoutSlug]);
    const session = await sessionStore.update(req.user.id, existing.id, (draft) => {
      draft.avgHr = req.body.avgHr;
      draft.maxHr = req.body.maxHr ?? null;
      const next = sessionCalories(workout, req.user, { durationSec: draft.durationSec, avgHr: draft.avgHr });
      // A workout that's since been removed has no rate: keep the saved estimate.
      if (next.calorieSource === 'estimate' && !workout) next.calories = draft.calories;
      Object.assign(draft, next);
    });
    res.json({ success: true, session });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/sessions/:id ─────────────────────────────────────────────────
// Also un-marks the program day it completed, if any.
router.delete('/:id', async (req, res, next) => {
  try {
    const session = await sessionStore.findOwned(req.user.id, req.params.id);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });
    await sessionStore.remove(req.user.id, session.id);
    await unmarkSession(req.user.id, session);
    res.json({ success: true, message: 'Session deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
