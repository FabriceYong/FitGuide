/**
 * exerciseMedia.js
 * Route: /api/exercise-media
 * 
 * Proxy endpoint that fetches animated GIF URLs from ExerciseDB (free tier).
 * Uses in-memory caching to avoid hammering the external API.
 * 
 * Attribution: Powered by AscendAPI / ExerciseDB (https://ascendapi.com)
 */

const express = require('express');
const https = require('https');
const { gifsAllowed } = require('../utils/media');

const router = express.Router();

// ExerciseDB media is non-commercial: off once paid plans are on (see utils/media.js).
router.use((_req, res, next) => {
  if (gifsAllowed()) return next();
  return res.status(404).json({ error: 'Exercise media is not available.' });
});

const EXERCISEDB_BASE = 'https://oss.exercisedb.dev';

// ─── Simple in-memory cache (LRU-like, max 500 entries) ──────────────────────
const cache = new Map();
const MAX_CACHE_SIZE = 500;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function cacheSet(key, value) {
  if (cache.size >= MAX_CACHE_SIZE) {
    // Evict oldest entry
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(key, { value, timestamp: Date.now() });
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────
function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: null });
        }
      });
    }).on('error', reject);
  });
}

// ─── GET /api/exercise-media/gif?name=<exercise_name> ────────────────────────
/**
 * Returns the best-matching exercise GIF for a given exercise name.
 * Response: { gifUrl, exerciseId, exerciseName, cached }
 */
router.get('/gif', async (req, res) => {
  const { name } = req.query;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'Query parameter "name" is required (min 2 chars)' });
  }

  const searchTerm = name.trim().toLowerCase().substring(0, 80);
  const cacheKey = `gif:${searchTerm}`;

  // Check cache
  const cached = cacheGet(cacheKey);
  if (cached) {
    return res.json({ ...cached, cached: true });
  }

  try {
    const url = `${EXERCISEDB_BASE}/api/v1/exercises/search?search=${encodeURIComponent(searchTerm)}&threshold=0.8`;
    const { status, body } = await httpGet(url);

    if (status === 429) {
      return res.status(429).json({ error: 'Exercise API rate limit hit, please retry shortly.' });
    }

    if (status !== 200 || !body?.success || !body?.data?.length) {
      return res.status(404).json({ error: 'No exercise found matching that name', gifUrl: null });
    }

    const best = body.data[0];
    const result = {
      gifUrl: best.gifUrl,
      exerciseId: best.exerciseId,
      exerciseName: best.name,
      attribution: 'Powered by AscendAPI (ascendapi.com)',
    };

    cacheSet(cacheKey, result);
    return res.json({ ...result, cached: false });

  } catch (err) {
    console.error('[exerciseMedia] GIF fetch error:', err.message);
    return res.status(502).json({ error: 'Could not reach exercise database', gifUrl: null });
  }
});

// ─── GET /api/exercise-media/search?name=<term>&limit=<n> ────────────────────
/**
 * Returns multiple exercise matches (useful for admin/editing tools).
 */
router.get('/search', async (req, res) => {
  const { name, limit = '5' } = req.query;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'Query parameter "name" is required (min 2 chars)' });
  }

  const searchTerm = name.trim().toLowerCase().substring(0, 80);
  const cacheKey = `search:${searchTerm}`;

  const cached = cacheGet(cacheKey);
  if (cached) {
    return res.json({ results: cached, cached: true });
  }

  try {
    const url = `${EXERCISEDB_BASE}/api/v1/exercises/search?search=${encodeURIComponent(searchTerm)}&threshold=0.8`;
    const { status, body } = await httpGet(url);

    if (status !== 200 || !body?.success) {
      return res.status(404).json({ results: [], error: 'No matches found' });
    }

    const maxResults = Math.min(parseInt(limit, 10) || 5, 10);
    const results = (body.data || []).slice(0, maxResults).map(ex => ({
      exerciseId: ex.exerciseId,
      exerciseName: ex.name,
      gifUrl: ex.gifUrl,
    }));

    cacheSet(cacheKey, results);
    return res.json({ results, cached: false });

  } catch (err) {
    console.error('[exerciseMedia] Search error:', err.message);
    return res.status(502).json({ results: [], error: 'Could not reach exercise database' });
  }
});

module.exports = router;
