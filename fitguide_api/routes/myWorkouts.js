/**
 * A member's own workouts, made in the workout builder (services/myWorkouts.js).
 * Only their owner sees them; they play and log like any other workout.
 */
const express = require('express');
const myWorkouts = require('../services/myWorkouts');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (err instanceof myWorkouts.MyWorkoutError) return res.status(err.status).json({ success: false, message: err.message });
    return next(err);
  }
};

const notFound = (res) => res.status(404).json({ success: false, message: 'Workout not found.' });

// GET /api/my-workouts — newest change first, each with builtFrom (the builder's answers).
router.get('/', handle(async (req, res) => {
  res.json({ success: true, workouts: await myWorkouts.list(req.user.id) });
}));

router.get('/:slug', handle(async (req, res) => {
  const workout = await myWorkouts.get(req.user.id, req.params.slug);
  return workout ? res.json({ success: true, workout }) : notFound(res);
}));

// POST /api/my-workouts { title, category?, restSec?, exercises: [{ name, sets, reps | seconds, weighted?, supersetNext? }] }
router.post('/', handle(async (req, res) => {
  res.status(201).json({ success: true, workout: await myWorkouts.create(req.user.id, req.body) });
}));

router.put('/:slug', handle(async (req, res) => {
  const workout = await myWorkouts.update(req.user.id, req.params.slug, req.body);
  return workout ? res.json({ success: true, workout }) : notFound(res);
}));

router.delete('/:slug', handle(async (req, res) => {
  return (await myWorkouts.remove(req.user.id, req.params.slug)) ? res.json({ success: true }) : notFound(res);
}));

module.exports = router;
