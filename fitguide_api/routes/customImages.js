const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Workout = require('../models/Workout');
const { authMiddleware } = require('../middleware/authMiddleware');

/**
 * @route   POST /api/custom-images/:workoutId
 * @desc    Set custom image for a workout
 * @access  Private
 */
router.post('/:workoutId', authMiddleware, async (req, res) => {
  try {
    const { workoutId } = req.params;
    const { customImageUrl } = req.body;

    if (!customImageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Custom image URL is required'
      });
    }

    // Verify workout exists
    const workout = await Workout.findById(workoutId);
    if (!workout) {
      return res.status(404).json({
        success: false,
        message: 'Workout not found'
      });
    }

    // Update or add custom image for user
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if custom image already exists for this workout
    const existingIndex = user.customWorkoutImages?.findIndex(
      img => img.workoutId.toString() === workoutId
    );

    if (existingIndex !== undefined && existingIndex >= 0) {
      user.customWorkoutImages[existingIndex].customImageUrl = customImageUrl;
    } else {
      if (!user.customWorkoutImages) {
        user.customWorkoutImages = [];
      }
      user.customWorkoutImages.push({
        workoutId,
        customImageUrl,
      });
    }

    await user.save();

    res.json({
      success: true,
      message: 'Custom image set successfully',
      customImage: { workoutId, customImageUrl },
    });
  } catch (error) {
    console.error('Error setting custom image:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/custom-images/:workoutId
 * @desc    Get custom image for a workout
 * @access  Private
 */
router.get('/:workoutId', authMiddleware, async (req, res) => {
  try {
    const { workoutId } = req.params;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const customImage = user.customWorkoutImages?.find(
      img => img.workoutId.toString() === workoutId
    );

    res.json({
      success: true,
      customImageUrl: customImage?.customImageUrl || null,
    });
  } catch (error) {
    console.error('Error getting custom image:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/custom-images/:workoutId
 * @desc    Remove custom image for a workout
 * @access  Private
 */
router.delete('/:workoutId', authMiddleware, async (req, res) => {
  try {
    const { workoutId } = req.params;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.customWorkoutImages = user.customWorkoutImages?.filter(
      img => img.workoutId.toString() !== workoutId
    ) || [];

    await user.save();

    res.json({
      success: true,
      message: 'Custom image removed successfully',
    });
  } catch (error) {
    console.error('Error removing custom image:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/custom-images
 * @desc    Get all custom images for user
 * @access  Private
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      customImages: user.customWorkoutImages || [],
    });
  } catch (error) {
    console.error('Error getting custom images:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
