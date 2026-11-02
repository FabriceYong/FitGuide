// /api/gyms: the Photon (OpenStreetMap) proxy. Doesn't touch the database, so it runs once.
const { createApp } = require('./helpers/setup');
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const gyms = require('../routes/gyms');

const feature = (props, lng, lat) => ({ type: 'Feature', properties: props, geometry: { type: 'Point', coordinates: [lng, lat] } });

describe('gyms proxy', () => {
  const realFetch = global.fetch;
  let calls;
  let reply;
  const app = createApp();

  beforeEach(() => {
    gyms.clearCache();
    calls = [];
    reply = (url) => {
      const features = url.pathname === '/reverse'
        ? [
          feature({ osm_type: 'W', osm_id: 2, name: 'Far Gym', street: 'High Street', city: 'London' }, -0.1, 51.52),
          feature({ osm_type: 'N', osm_id: 1, name: 'Near Gym', housenumber: '32', street: 'Woburn Place', locality: 'Bloomsbury', city: 'London' }, -0.1279, 51.5075),
          feature({ osm_type: 'N', osm_id: 3 }, -0.128, 51.508),
          feature({ osm_type: 'N', osm_id: 4, name: 'Outside' }, -0.5, 51.9),
          feature({ osm_type: 'N', osm_id: 5, name: 'No position' }),
        ]
        : [
          feature({ name: 'Nairobi', state: 'Nairobi County', country: 'Kenya', city: 'Nairobi' }, 36.8172, -1.2864),
          feature({ name: 'Nairobi', state: 'Nairobi County', country: 'Kenya' }, 36.83, -1.30),
          feature({ name: 'Nairobi', state: 'Nairobi', country: 'Kenya' }, 36.83, -1.30),
          feature({ country: 'Kenya' }, 36, -1),
        ];
      return new Response(JSON.stringify({ features }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
    global.fetch = async (url, init) => {
      const u = new URL(url);
      calls.push({ url: u, init });
      return reply(u);
    };
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  it('returns gyms nearest first within the radius, sending only a rounded position', async () => {
    const res = await request(app).get('/api/gyms/nearby').query({ lat: '51.507412', lng: '-0.127812', radius: '5' }).expect(200);
    assert.equal(calls.length, 1);
    const { searchParams } = calls[0].url;
    assert.equal(searchParams.get('lat'), '51.507');
    assert.equal(searchParams.get('lon'), '-0.128');
    assert.equal(searchParams.get('radius'), '5');
    assert.equal(searchParams.get('osm_tag'), 'leisure:fitness_centre');
    assert.match(calls[0].init.headers['User-Agent'], /FitGuide/);

    assert.equal(res.body.radiusKm, 5);
    assert.deepEqual(res.body.gyms.map((g) => g.id), ['N1', 'N3', 'W2']);
    const [near, unnamed] = res.body.gyms;
    assert.equal(near.name, 'Near Gym');
    assert.equal(near.address, '32 Woburn Place, Bloomsbury, London');
    assert.equal(near.lat, 51.5075);
    assert.ok(near.distanceKm < 0.05);
    assert.equal(unnamed.name, null);
    assert.equal(unnamed.address, null);
    assert.match(res.body.attribution, /OpenStreetMap/);
  });

  it('caches by rounded position and radius', async () => {
    await request(app).get('/api/gyms/nearby').query({ lat: 51.50741, lng: -0.12781 }).expect(200);
    const again = await request(app).get('/api/gyms/nearby').query({ lat: 51.50739, lng: -0.12779 }).expect(200);
    assert.equal(calls.length, 1);
    assert.equal(again.body.radiusKm, 5);
    await request(app).get('/api/gyms/nearby').query({ lat: 51.50741, lng: -0.12781, radius: 10 }).expect(200);
    assert.equal(calls.length, 2);
  });

  it('keeps the radius between 1 and 25 km', async () => {
    const big = await request(app).get('/api/gyms/nearby').query({ lat: 0, lng: 0, radius: 500 }).expect(200);
    assert.equal(big.body.radiusKm, 25);
    const small = await request(app).get('/api/gyms/nearby').query({ lat: 0, lng: 1, radius: 0.1 }).expect(200);
    assert.equal(small.body.radiusKm, 1);
  });

  it('rejects missing or out-of-range positions', async () => {
    await request(app).get('/api/gyms/nearby').expect(400);
    await request(app).get('/api/gyms/nearby').query({ lat: 91, lng: 0 }).expect(400);
    await request(app).get('/api/gyms/nearby').query({ lat: 'abc', lng: 0 }).expect(400);
    assert.equal(calls.length, 0);
  });

  it('says so when the map service fails', async () => {
    reply = () => new Response('busy', { status: 503 });
    const res = await request(app).get('/api/gyms/nearby').query({ lat: 1, lng: 1 }).expect(502);
    assert.match(res.body.message, /try again/);
  });

  it('finds places to search from', async () => {
    const res = await request(app).get('/api/gyms/places').query({ q: ' Nairobi ' }).expect(200);
    assert.equal(calls[0].url.pathname, '/api');
    assert.equal(calls[0].url.searchParams.get('q'), 'Nairobi');
    assert.deepEqual(res.body.places, [
      { label: 'Nairobi, Nairobi County, Kenya', lat: -1.2864, lng: 36.8172 },
      { label: 'Nairobi, Kenya', lat: -1.30, lng: 36.83 },
    ]);
    await request(app).get('/api/gyms/places').query({ q: 'a' }).expect(400);
  });

  it('measures distance in km', () => {
    // London to Paris is about 344 km.
    assert.ok(Math.abs(gyms.distanceKm(51.5074, -0.1278, 48.8566, 2.3522) - 344) < 2);
  });
});
