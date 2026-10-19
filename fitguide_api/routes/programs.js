const express = require('express');
const { programStore } = require('../stores/records');
const workoutStore = require('../stores/workoutStore');

const router = express.Router();

const WORKOUT_SUMMARY_FIELDS = ['slug', 'title', 'shortDescription', 'category', 'difficulty', 'duration', 'calories', 'intensity', 'equipment'];

/** The workouts a program uses, keyed by slug, with just the fields a schedule needs. */
async function workoutSummaries(program) {
  const slugs = [...new Set(program.days.map((d) => d.workoutSlug))];
  const workouts = await workoutStore.getManyBySlugs(slugs);
  return Object.fromEntries(workouts.map((w) => [w.slug, Object.fromEntries(WORKOUT_SUMMARY_FIELDS.map((f) => [f, w[f]]))]));
}

// ─── GET /api/programs ────────────────────────────────────────────────────────
// Query: level, goal (optional)
router.get('/', async (req, res, next) => {
  try {
    const { level, goal } = req.query;
    const matching = (await programStore.all())
      .filter((p) => (!level || p.level === String(level)) && (!goal || p.goal === String(goal)));
    const allSlugs = [...new Set(matching.flatMap((p) => p.days.map((d) => d.workoutSlug)))];
    const minutes = new Map((await workoutStore.getManyBySlugs(allSlugs)).map((w) => [w.slug, w.duration || 0]));
    const programs = matching.map(({ days, ...p }) => ({
      ...p,
      totalDays: days.length,
      averageMinutes: Math.round(days.reduce((sum, d) => sum + (minutes.get(d.workoutSlug) || 0), 0) / (days.length || 1)),
      workoutSlugs: [...new Set(days.map((d) => d.workoutSlug))],
    }));
    res.json({ success: true, count: programs.length, programs });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/programs/:slug ──────────────────────────────────────────────────
router.get('/:slug', async (req, res, next) => {
  try {
    const program = await programStore.getBySlug(req.params.slug);
    if (!program) return res.status(404).json({ success: false, message: 'Program not found.' });
    res.json({ success: true, program, workouts: await workoutSummaries(program) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
