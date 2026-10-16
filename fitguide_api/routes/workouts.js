const express = require('express');
const Workout = require('../models/Workout');
const workoutStore = require('../stores/workoutStore');
const workoutsData = require('../seed/workoutSeeder');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// ─── GET /api/workouts ────────────────────────────────────────────────────────
// Query: category, difficulty, intensity, minDuration, maxDuration, equipment, search
router.get('/', async (req, res, next) => {
  try {
    const workouts = await workoutStore.list(req.query);
    return res.status(200).json({ success: true, count: workouts.length, workouts });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/workouts/categories/list ────────────────────────────────────────
// Declared before /:slug so "categories" isn't treated as a slug.
router.get('/categories/list', (_req, res) => {
  res.status(200).json({ success: true, categories: Workout.schema.path('category').enumValues });
});

// ─── GET /api/workouts/:slug ──────────────────────────────────────────────────
router.get('/:slug', async (req, res, next) => {
  try {
    const workout = await workoutStore.getBySlug(req.params.slug);
    if (!workout) {
      return res.status(404).json({ success: false, message: 'Workout not found.' });
    }
    return res.status(200).json({ success: true, workout });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/workouts/:slug/like ────────────────────────────────────────────
// Signed-in users only; each user counts once.
router.post('/:slug/like', authMiddleware, async (req, res, next) => {
  try {
    const likes = await workoutStore.like(req.params.slug, req.user.id);
    if (likes === null) {
      return res.status(404).json({ success: false, message: 'Workout not found.' });
    }
    return res.status(200).json({ success: true, message: 'Workout liked!', likes });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/workouts/seed ──────────────────────────────────────────────────
// Replaces every workout in MongoDB with the seed data. Only mounted when
// ENABLE_DEV_ROUTES=true, because it is destructive and unauthenticated.
if (process.env.ENABLE_DEV_ROUTES === 'true') {
  router.post('/seed', async (_req, res, next) => {
    try {
      if (process.env.MOCK_DB === 'true') {
        return res.status(200).json({ success: true, message: 'Mock DB serves seed data directly', count: workoutsData.length });
      }
      await Workout.deleteMany({});
      const workouts = await Workout.insertMany(workoutsData);
      return res.status(201).json({ success: true, message: 'Workouts seeded successfully!', count: workouts.length });
    } catch (err) {
      next(err);
    }
  });
}

module.exports = router;
