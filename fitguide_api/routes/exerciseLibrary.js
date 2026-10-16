/**
 * exerciseLibrary.js
 * Route: /api/exercise-library
 *
 * Server-side proxy for the WorkoutX exercise API. The API key stays in
 * fitguide_api/.env (WORKOUTX_API_KEY) instead of being shipped to browsers.
 */
const express = require('express');

const router = express.Router();

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map(); // limit -> { body, timestamp }

// GET /api/exercise-library?limit=100
router.get('/', async (req, res) => {
  const apiKey = process.env.WORKOUTX_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ success: false, message: 'Exercise library is not configured on the server.' });
  }

  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 100);
  const cached = cache.get(limit);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return res.json({ ...cached.body, cached: true });
  }

  const base = process.env.WORKOUTX_API_BASE || 'https://workoutxapp.com/v1';
  try {
    const response = await fetch(`${base}/exercises?limit=${limit}`, {
      headers: { 'Content-Type': 'application/json', 'X-WorkoutX-Key': apiKey },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      return res.status(502).json({ success: false, message: `Exercise library returned HTTP ${response.status}.` });
    }
    const json = await response.json();
    const exercises = json.data || json.exercises || (Array.isArray(json) ? json : []);
    const body = { success: true, exercises, total: json.total || exercises.length };
    cache.set(limit, { body, timestamp: Date.now() });
    return res.json({ ...body, cached: false });
  } catch (err) {
    console.error('[exerciseLibrary] fetch error:', err.message);
    return res.status(502).json({ success: false, message: 'Could not reach the exercise library.' });
  }
});

module.exports = router;
