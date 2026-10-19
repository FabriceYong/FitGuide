const express = require('express');
const userStore = require('../stores/userStore');
const workoutStore = require('../stores/workoutStore');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// Every favorites route requires a signed-in user. Workouts are referenced by slug.
router.use(authMiddleware);

const respondWithFavorites = async (res, slugs, message) => {
  res.json({
    success: true,
    ...(message && { message }),
    favoriteSlugs: slugs,
    favorites: await workoutStore.getManyBySlugs(slugs),
  });
};

/**
 * @route   GET /api/favorites
 * @desc    Get the user's favorite workouts
 */
router.get('/', async (req, res, next) => {
  try {
    await respondWithFavorites(res, await userStore.getFavorites(req.user.id));
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/favorites/check/:slug
 * @desc    Check whether a workout is in the user's favorites
 */
router.get('/check/:slug', async (req, res, next) => {
  try {
    const slugs = await userStore.getFavorites(req.user.id);
    res.json({ success: true, isFavorite: slugs.includes(req.params.slug) });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /api/favorites/:slug
 * @desc    Add a workout to favorites (idempotent)
 */
router.post('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    if (!(await workoutStore.exists(slug))) {
      return res.status(404).json({ success: false, message: 'Workout not found' });
    }
    await respondWithFavorites(res, await userStore.addFavorite(req.user.id, slug), 'Workout added to favorites');
  } catch (err) {
    next(err);
  }
});

/**
 * @route   DELETE /api/favorites/:slug
 * @desc    Remove a workout from favorites (idempotent)
 */
router.delete('/:slug', async (req, res, next) => {
  try {
    await respondWithFavorites(res, await userStore.removeFavorite(req.user.id, req.params.slug), 'Workout removed from favorites');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
