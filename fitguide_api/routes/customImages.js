const express = require('express');
const userStore = require('../stores/userStore');
const workoutStore = require('../stores/workoutStore');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// Per-user custom images for workouts, keyed by workout slug.
router.use(authMiddleware);

const getImages = (userId) => userStore.getCustomImages(userId);

/**
 * @route   GET /api/custom-images
 * @desc    Get all custom images for the user
 */
router.get('/', async (req, res, next) => {
  try {
    res.json({ success: true, customImages: await getImages(req.user.id) });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/custom-images/:slug
 * @desc    Get the user's custom image for a workout
 */
router.get('/:slug', async (req, res, next) => {
  try {
    const image = (await getImages(req.user.id)).find((img) => img.workoutId === req.params.slug);
    res.json({ success: true, customImageUrl: image?.customImageUrl || null });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /api/custom-images/:slug
 * @desc    Set a custom image for a workout
 */
router.post('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { customImageUrl } = req.body;
    if (!customImageUrl || typeof customImageUrl !== 'string' || customImageUrl.length > 500) {
      return res.status(400).json({ success: false, message: 'A custom image URL (max 500 characters) is required' });
    }
    if (!(await workoutStore.exists(slug))) {
      return res.status(404).json({ success: false, message: 'Workout not found' });
    }
    await userStore.setCustomImage(req.user.id, slug, customImageUrl);
    res.json({ success: true, message: 'Custom image set successfully', customImage: { workoutId: slug, customImageUrl } });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   DELETE /api/custom-images/:slug
 * @desc    Remove the user's custom image for a workout
 */
router.delete('/:slug', async (req, res, next) => {
  try {
    await userStore.removeCustomImage(req.user.id, req.params.slug);
    res.json({ success: true, message: 'Custom image removed successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
