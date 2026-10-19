const express = require('express');
const { exerciseStore } = require('../stores/records');

const router = express.Router();

// ─── GET /api/exercises ───────────────────────────────────────────────────────
// Query: search, category, muscle, equipment (all optional, case-insensitive)
router.get('/', async (req, res, next) => {
  try {
    const q = (key) => (req.query[key] ? String(req.query[key]).toLowerCase().slice(0, 100) : '');
    const [search, category, muscle, equipment] = ['search', 'category', 'muscle', 'equipment'].map(q);
    const term = exerciseStore.normalizeName(search);
    const exercises = (await exerciseStore.all()).filter((e) => {
      if (category && e.category.toLowerCase() !== category) return false;
      if (muscle && !e.primaryMuscles.some((m) => m.toLowerCase() === muscle)) return false;
      if (equipment && !e.equipment.some((m) => m.toLowerCase() === equipment)) return false;
      if (term) {
        return [e.name, ...(e.aliases || [])].some((n) => exerciseStore.normalizeName(n).includes(term));
      }
      return true;
    });
    res.json({ success: true, count: exercises.length, exercises });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/exercises/:slug ─────────────────────────────────────────────────
router.get('/:slug', async (req, res, next) => {
  try {
    const exercise = await exerciseStore.getBySlug(req.params.slug);
    if (!exercise) return res.status(404).json({ success: false, message: 'Exercise not found.' });
    res.json({ success: true, exercise });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
