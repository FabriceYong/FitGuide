/**
 * articles.js
 * Route: /api/articles
 *
 * Server-side proxy for rss2json (live fitness articles on the home tab). The
 * API key stays in fitguide_api/.env (RSS2JSON_API_KEY) instead of being
 * shipped to browsers. Only the feeds listed below can be fetched, so the
 * endpoint can't be used as an open proxy on our key.
 */
const express = require('express');

const router = express.Router();

const FEEDS = {
  healthline: 'https://www.healthline.com/rss/health-news',
  mnt: 'https://www.medicalnewstoday.com/rss',
};

const MAX_ITEMS = 10;
const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map(); // feed -> { body, timestamp }

const stripTags = (html) => String(html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

const toArticle = (item) => ({
  title: stripTags(item.title),
  link: item.link,
  description: stripTags(item.description).slice(0, 300),
  pubDate: item.pubDate,
  thumbnail: item.thumbnail || item.enclosure?.link || '',
  author: item.author || '',
});

// GET /api/articles?feed=healthline&count=3
router.get('/', async (req, res) => {
  const feed = String(req.query.feed || '');
  const feedUrl = FEEDS[feed];
  if (!feedUrl) {
    return res.status(400).json({ success: false, message: `Unknown feed. Use one of: ${Object.keys(FEEDS).join(', ')}.` });
  }
  const count = Math.min(Math.max(parseInt(req.query.count, 10) || 3, 1), MAX_ITEMS);

  const cached = cache.get(feed);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return res.json({ ...cached.body, articles: cached.body.articles.slice(0, count), cached: true });
  }

  // rss2json works without a key (lower rate limit, default item count).
  const params = new URLSearchParams({ rss_url: feedUrl });
  const apiKey = process.env.RSS2JSON_API_KEY;
  if (apiKey) {
    params.set('api_key', apiKey);
    params.set('count', String(MAX_ITEMS));
  }
  const base = process.env.RSS2JSON_API_BASE || 'https://api.rss2json.com/v1/api.json';

  try {
    const response = await fetch(`${base}?${params}`, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      return res.status(502).json({ success: false, message: `Article feed returned HTTP ${response.status}.` });
    }
    const json = await response.json();
    if (json.status !== 'ok' || !Array.isArray(json.items)) {
      return res.status(502).json({ success: false, message: 'Article feed is unavailable.' });
    }
    const body = { success: true, feed, articles: json.items.slice(0, MAX_ITEMS).map(toArticle) };
    cache.set(feed, { body, timestamp: Date.now() });
    return res.json({ ...body, articles: body.articles.slice(0, count), cached: false });
  } catch (err) {
    console.error('[articles] fetch error:', err.message);
    return res.status(502).json({ success: false, message: 'Could not reach the article feed.' });
  }
});

module.exports = router;
module.exports.FEEDS = FEEDS;
module.exports.clearCache = () => cache.clear();
