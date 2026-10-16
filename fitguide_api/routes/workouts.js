const express = require('express');
const Workout = require('../models/Workout');
const workoutsData = require('../seed/workoutSeeder');

const router = express.Router();

// ─── GET /api/workouts ────────────────────────────────────────────────────────
// Get all workouts with optional filtering
router.get('/', async (req, res) => {
  try {
    const {
      category,
      difficulty,
      minDuration,
      maxDuration,
      intensity,
      equipment,
      search
    } = req.query;

    // Build query object
    let query = { isPublished: true };

    if (category) {
      query.category = category;
    }

    if (difficulty) {
      query.difficulty = difficulty;
    }

    if (intensity) {
      query.intensity = intensity;
    }

    if (minDuration || maxDuration) {
      query.duration = {};
      if (minDuration) query.duration.$gte = parseInt(minDuration);
      if (maxDuration) query.duration.$lte = parseInt(maxDuration);
    }

    if (equipment) {
      query.equipment = { $in: [equipment] };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    if (process.env.MOCK_DB === 'true') {
      // Filter mock data
      let filtered = workoutsData.filter(w => {
        if (category && w.category !== category) return false;
        if (difficulty && w.difficulty !== difficulty) return false;
        if (intensity && w.intensity !== intensity) return false;
        if (minDuration && w.duration < parseInt(minDuration)) return false;
        if (maxDuration && w.duration > parseInt(maxDuration)) return false;
        if (equipment && !w.equipment.includes(equipment)) return false;
        if (search) {
          const searchLower = search.toLowerCase();
          return w.title.toLowerCase().includes(searchLower) ||
                 w.description.toLowerCase().includes(searchLower) ||
                 w.tags.some(tag => tag.includes(searchLower));
        }
        return true;
      });

      // Add mock IDs
      filtered = filtered.map((w, index) => ({
        ...w,
        id: `mock-workout-${index + 1}`,
        viewCount: Math.floor(Math.random() * 1000),
        likeCount: Math.floor(Math.random() * 100),
        averageRating: (Math.random() * 2 + 3).toFixed(1),
        totalReviews: Math.floor(Math.random() * 50)
      }));

      return res.status(200).json({
        success: true,
        count: filtered.length,
        workouts: filtered
      });
    }

    // MongoDB query
    const workouts = await Workout.find(query).sort({ createdAt: -1 });

    // If no workouts in MongoDB, return seeded data as fallback
    if (workouts.length === 0) {
      console.log('No workouts in MongoDB, returning seeded data');
      const workoutsData = require('../seed/workoutSeeder');
      let filtered = workoutsData.filter(w => {
        if (category && w.category !== category) return false;
        if (difficulty && w.difficulty !== difficulty) return false;
        if (intensity && w.intensity !== intensity) return false;
        if (minDuration && w.duration < parseInt(minDuration)) return false;
        if (maxDuration && w.duration > parseInt(maxDuration)) return false;
        if (equipment && !w.equipment.includes(equipment)) return false;
        if (search) {
          const searchLower = search.toLowerCase();
          return w.title.toLowerCase().includes(searchLower) ||
                 w.description.toLowerCase().includes(searchLower) ||
                 w.tags.some(tag => tag.includes(searchLower));
        }
        return true;
      });

      filtered = filtered.map((w, index) => ({
        ...w,
        id: w.slug,
        viewCount: Math.floor(Math.random() * 1000),
        likeCount: Math.floor(Math.random() * 100),
        averageRating: parseFloat((Math.random() * 2 + 3).toFixed(1)),
        totalReviews: Math.floor(Math.random() * 50)
      }));

      return res.status(200).json({
        success: true,
        count: filtered.length,
        workouts: filtered
      });
    }

    return res.status(200).json({
      success: true,
      count: workouts.length,
      workouts: workouts.map(w => w.toPublicObject())
    });
  } catch (err) {
    console.error('[Get Workouts Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving workouts.'
    });
  }
});

// ─── GET /api/workouts/:slug ──────────────────────────────────────────────────
// Get single workout by slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    if (process.env.MOCK_DB === 'true') {
      const workout = workoutsData.find(w => w.slug === slug);

      if (!workout) {
        return res.status(404).json({
          success: false,
          message: 'Workout not found.'
        });
      }

      // Add mock data
      const workoutWithMockData = {
        ...workout,
        id: `mock-workout-${slug}`,
        viewCount: Math.floor(Math.random() * 1000) + 100,
        likeCount: Math.floor(Math.random() * 100) + 10,
        averageRating: (Math.random() * 2 + 3).toFixed(1),
        totalReviews: Math.floor(Math.random() * 50) + 5
      };

      return res.status(200).json({
        success: true,
        workout: workoutWithMockData
      });
    }

    const workout = await Workout.findOne({ slug, isPublished: true });

    if (!workout) {
      // Fallback to seeded data
      const workoutsData = require('../seed/workoutSeeder');
      const seededWorkout = workoutsData.find(w => w.slug === slug);

      if (!seededWorkout) {
        return res.status(404).json({
          success: false,
          message: 'Workout not found.'
        });
      }

      return res.status(200).json({
        success: true,
        workout: {
          ...seededWorkout,
          id: seededWorkout.slug,
          viewCount: Math.floor(Math.random() * 1000) + 100,
          likeCount: Math.floor(Math.random() * 100) + 10,
          averageRating: parseFloat((Math.random() * 2 + 3).toFixed(1)),
          totalReviews: Math.floor(Math.random() * 50) + 5
        }
      });
    }

    // Increment view count
    workout.viewCount += 1;
    await workout.save();

    return res.status(200).json({
      success: true,
      workout: workout.toPublicObject()
    });
  } catch (err) {
    console.error('[Get Workout Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving workout.'
    });
  }
});

// ─── POST /api/workouts/:slug/like ────────────────────────────────────────────
// Like a workout
router.post('/:slug/like', async (req, res) => {
  try {
    const { slug } = req.params;

    if (process.env.MOCK_DB === 'true') {
      // Mock response
      return res.status(200).json({
        success: true,
        message: 'Workout liked!',
        likes: Math.floor(Math.random() * 100) + 1
      });
    }

    const workout = await Workout.findOne({ slug });

    if (!workout) {
      return res.status(404).json({
        success: false,
        message: 'Workout not found.'
      });
    }

    workout.likeCount += 1;
    await workout.save();

    return res.status(200).json({
      success: true,
      message: 'Workout liked!',
      likes: workout.likeCount
    });
  } catch (err) {
    console.error('[Like Workout Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Server error liking workout.'
    });
  }
});

// ─── GET /api/workouts/categories/list ────────────────────────────────────────
// Get all available categories
router.get('/categories/list', async (req, res) => {
  try {
    const categories = ['HIIT', 'Yoga', 'Strength', 'Cardio', 'Flexibility', 'Pilates', 'CrossFit', 'Dance', 'Martial Arts', 'Swimming'];

    return res.status(200).json({
      success: true,
      categories
    });
  } catch (err) {
    console.error('[Get Categories Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving categories.'
    });
  }
});

// ─── POST /api/workouts/seed ──────────────────────────────────────────────────
// Seed workouts (dev only)
if (process.env.NODE_ENV !== 'production') {
  router.post('/seed', async (req, res) => {
    try {
      if (process.env.MOCK_DB === 'true') {
        return res.status(200).json({
          success: true,
          message: 'Mock DB already seeded',
          count: workoutsData.length
        });
      }

      // Clear existing workouts
      await Workout.deleteMany({});

      // Insert all workouts
      const workouts = await Workout.insertMany(workoutsData);

      return res.status(201).json({
        success: true,
        message: 'Workouts seeded successfully!',
        count: workouts.length
      });
    } catch (err) {
      console.error('[Seed Workouts Error]', err);
      return res.status(500).json({
        success: false,
        message: 'Server error seeding workouts.',
        error: err.message
      });
    }
  });
}

module.exports = router;