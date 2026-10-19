const express = require('express');
const workoutStore = require('../stores/workoutStore');
const { seedCatalog } = require('../seed/catalog');
const { WORKOUT_CATEGORIES } = require('../utils/enums');
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
  res.status(200).json({ success: true, categories: WORKOUT_CATEGORIES });
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
// Re-loads the catalog (workouts, exercises, programs) from seed/. Only
// mounted when ENABLE_DEV_ROUTES=true, because it is unauthenticated.
if (process.env.ENABLE_DEV_ROUTES === 'true') {
  router.post('/seed', async (_req, res, next) => {
    try {
      const counts = await seedCatalog();
      return res.status(201).json({ success: true, message: 'Catalog seeded.', count: counts.workouts, counts });
    } catch (err) {
      next(err);
    }
  });
}

module.exports = router;
