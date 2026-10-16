const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Workout = require('../models/Workout');
const { authMiddleware } = require('../middleware/authMiddleware');

/**
 * @route   GET /api/favorites
 * @desc    Get user's favorite workouts
 * @access  Private
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('favoriteWorkouts');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      favorites: user.favoriteWorkouts || [],
    });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/favorites/:workoutId
 * @desc    Add workout to favorites
 * @access  Private
 */
router.post('/:workoutId', authMiddleware, async (req, res) => {
  try {
    const { workoutId } = req.params;

    // Verify workout exists
    const workout = await Workout.findById(workoutId);
    if (!workout) {
      return res.status(404).json({ message: 'Workout not found' });
    }

    // Add to user's favorites if not already there
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.favoriteWorkouts) {
      user.favoriteWorkouts = [];
    }

    if (user.favoriteWorkouts.includes(workoutId)) {
      return res.status(400).json({ message: 'Workout already in favorites' });
    }

    user.favoriteWorkouts.push(workoutId);
    await user.save();

    // Populate and return updated favorites
    await user.populate('favoriteWorkouts');

    res.json({
      success: true,
      message: 'Workout added to favorites',
      favorites: user.favoriteWorkouts,
    });
  } catch (error) {
    console.error('Error adding to favorites:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   DELETE /api/favorites/:workoutId
 * @desc    Remove workout from favorites
 * @access  Private
 */
router.delete('/:workoutId', authMiddleware, async (req, res) => {
  try {
    const { workoutId } = req.params;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.favoriteWorkouts || !user.favoriteWorkouts.includes(workoutId)) {
      return res.status(400).json({ message: 'Workout not in favorites' });
    }

    user.favoriteWorkouts = user.favoriteWorkouts.filter(
      (id) => id.toString() !== workoutId
    );
    await user.save();

    // Populate and return updated favorites
    await user.populate('favoriteWorkouts');

    res.json({
      success: true,
      message: 'Workout removed from favorites',
      favorites: user.favoriteWorkouts,
    });
  } catch (error) {
    console.error('Error removing from favorites:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/favorites/check/:workoutId
 * @desc    Check if workout is in user's favorites
 * @access  Private
 */
router.get('/check/:workoutId', authMiddleware, async (req, res) => {
  try {
    const { workoutId } = req.params;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isFavorite = user.favoriteWorkouts && user.favoriteWorkouts.includes(workoutId);

    res.json({
      success: true,
      isFavorite,
    });
  } catch (error) {
    console.error('Error checking favorite status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
