/**
 * Gyms near a point, for the "Find a gym near you" map, plus a place search
 * for when the browser or phone won't share its location.
 *
 * Both come from OpenStreetMap through Photon (photon.komoot.io by default,
 * PHOTON_URL for a self-hosted one): no key needed. Positions are rounded to
 * about 100 m before they leave this server, which also lets nearby members
 * share cached results. Nothing about the search is stored.
 */
const express = require('express');

const router = express.Router();

const MAX_GYMS = 50;
const DEFAULT_RADIUS_KM = 5;
const MAX_RADIUS_KM = 25;
const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_MAX = 500;
const TIMEOUT_MS = 10000;
const USER_AGENT = 'FitGuide/1.0 (gym finder)';

// key -> { at, value }. Oldest entries go first once it's full.
const cache = new Map();

const photonBase = () => (process.env.PHOTON_URL || 'https://photon.komoot.io').replace(/\/+$/, '');

const round = (n) => Math.round(n * 1000) / 1000;

const toRad = (deg) => (deg * Math.PI) / 180;

/** Great-circle distance in km. */
function distanceKm(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

const number = (value, min, max) => {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

async function cached(key, load) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
  const value = await load();
  cache.delete(key);
  cache.set(key, { at: Date.now(), value });
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
  return value;
}

async function photon(path, params) {
  const response = await fetch(`${photonBase()}${path}?${new URLSearchParams(params)}`, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Photon returned HTTP ${response.status}`);
  const body = await response.json();
  return Array.isArray(body.features) ? body.features : [];
}

const point = (feature) => {
  const [lng, lat] = feature.geometry?.coordinates || [];
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};

const join = (parts) => parts.filter(Boolean).join(', ');

function toGym(feature) {
  const p = feature.properties || {};
  const at = point(feature);
  if (!at) return null;
  const street = p.street ? [p.housenumber, p.street].filter(Boolean).join(' ') : '';
  return {
    id: `${p.osm_type || 'N'}${p.osm_id}`,
    name: p.name || null,
    ...at,
    address: join([street, p.locality || p.district, p.city]) || null,
  };
}

function toPlace(feature) {
  const p = feature.properties || {};
  const at = point(feature);
  if (!at || !p.name) return null;
  // "Nairobi, Kenya" rather than "Nairobi, Nairobi, Nairobi, Kenya".
  const parts = [p.name, p.city, p.state, p.country].filter((part, i, all) => part && all.indexOf(part) === i);
  return { label: join(parts), ...at };
}

/** One entry per label: the first (best) match. */
const uniqueByLabel = (places) => places.filter((place, i) => places.findIndex((p) => p.label === place.label) === i);

// ─── GET /api/gyms/nearby?lat=&lng=&radius= ───────────────────────────────────
// Up to 50 gyms within `radius` km (1–25, default 5), nearest first, each with
// its distance from the given point.
router.get('/nearby', async (req, res) => {
  const lat = number(req.query.lat, -90, 90);
  const lng = number(req.query.lng, -180, 180);
  if (lat === null || lng === null) {
    return res.status(400).json({ success: false, message: 'Send lat and lng as numbers.' });
  }
  const radiusKm = Math.min(Math.max(number(req.query.radius, 0, 1000) ?? DEFAULT_RADIUS_KM, 1), MAX_RADIUS_KM);
  const qLat = round(lat);
  const qLng = round(lng);

  try {
    const found = await cached(`gyms:${qLat},${qLng},${radiusKm}`, async () => (await photon('/reverse', {
      lat: qLat, lon: qLng, radius: radiusKm, limit: MAX_GYMS, osm_tag: 'leisure:fitness_centre',
    })).map(toGym).filter(Boolean));

    const gyms = found
      .map((gym) => ({ ...gym, distanceKm: Math.round(distanceKm(lat, lng, gym.lat, gym.lng) * 100) / 100 }))
      .filter((gym) => gym.distanceKm <= radiusKm + 0.2)
      .sort((a, b) => a.distanceKm - b.distanceKm);
    return res.json({ success: true, radiusKm, gyms, attribution: '© OpenStreetMap contributors' });
  } catch (err) {
    console.error('[gyms] nearby error:', err.message);
    return res.status(502).json({ success: false, message: 'The gym map service isn’t responding. Please try again in a minute.' });
  }
});

// ─── GET /api/gyms/places?q= ──────────────────────────────────────────────────
// Up to 5 towns, streets or addresses matching q, to search from instead of
// the device's location.
router.get('/places', async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 100);
  if (q.length < 2) return res.status(400).json({ success: false, message: 'Type at least 2 letters.' });
  try {
    const places = await cached(`places:${q.toLowerCase()}`, async () => uniqueByLabel((await photon('/api', { q, limit: 8 }))
      .map(toPlace).filter(Boolean)).slice(0, 5));
    return res.json({ success: true, places });
  } catch (err) {
    console.error('[gyms] places error:', err.message);
    return res.status(502).json({ success: false, message: 'Place search isn’t responding. Please try again in a minute.' });
  }
});

module.exports = router;
module.exports.clearCache = () => cache.clear();
module.exports.distanceKm = distanceKm;
