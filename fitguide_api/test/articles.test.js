// /api/articles: the rss2json proxy. Doesn't touch the database, so it runs once.
const { createApp } = require('./helpers/setup');
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const articles = require('../routes/articles');

describe('articles proxy', () => {
  const realFetch = global.fetch;
  let calls;
  let reply;
  const app = createApp();

  beforeEach(() => {
    articles.clearCache();
    calls = [];
    reply = () => new Response(JSON.stringify({
      status: 'ok',
      items: Array.from({ length: 5 }, (_, i) => ({
        title: `<b>Story ${i}</b>`,
        link: `https://example.com/${i}`,
        description: `<p>Body <img src=x onerror=alert(1)> ${i}</p>`,
        pubDate: '2026-10-01 10:00:00',
        thumbnail: '',
        enclosure: { link: `https://example.com/${i}.jpg` },
        author: 'Writer',
      })),
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    global.fetch = async (url) => {
      calls.push(new URL(url));
      return reply();
    };
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  it('adds the server-side key and returns cleaned articles', async () => {
    const res = await request(app).get('/api/articles').query({ feed: 'healthline', count: 3 }).expect(200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].searchParams.get('api_key'), 'test-rss-key');
    assert.equal(calls[0].searchParams.get('rss_url'), articles.FEEDS.healthline);
    assert.equal(res.body.articles.length, 3);
    assert.deepEqual(res.body.articles[0], {
      title: 'Story 0',
      link: 'https://example.com/0',
      description: 'Body 0',
      pubDate: '2026-10-01 10:00:00',
      thumbnail: 'https://example.com/0.jpg',
      author: 'Writer',
    });
    assert.ok(!JSON.stringify(res.body).includes('test-rss-key'));
  });

  it('caches per feed', async () => {
    await request(app).get('/api/articles').query({ feed: 'mnt' }).expect(200);
    const res = await request(app).get('/api/articles').query({ feed: 'mnt' }).expect(200);
    assert.equal(res.body.cached, true);
    assert.equal(calls.length, 1);
  });

  it('only fetches allow-listed feeds', async () => {
    await request(app).get('/api/articles').query({ feed: 'https://evil.example/rss' }).expect(400);
    await request(app).get('/api/articles').expect(400);
    assert.equal(calls.length, 0);
  });

  it('returns 502 when the upstream fails', async () => {
    reply = () => new Response('nope', { status: 500 });
    await request(app).get('/api/articles').query({ feed: 'healthline' }).expect(502);
    reply = () => new Response(JSON.stringify({ status: 'error', message: 'bad key' }), { status: 200 });
    await request(app).get('/api/articles').query({ feed: 'healthline' }).expect(502);
    global.fetch = async () => { throw new Error('network down'); };
    await request(app).get('/api/articles').query({ feed: 'healthline' }).expect(502);
  });
});
