/*
 * FitGuide service worker: makes the app installable and lets pages you've
 * opened (workouts, the player, programs) load without a connection.
 *  - Build assets (/_next/static): cache first; they never change.
 *  - Pages: network first, falling back to the cached copy, then /offline.
 *  - Other same-origin files (icons, images): stale-while-revalidate.
 * API calls go to the API's own origin and are never cached here.
 *
 * It also shows workout and streak reminders sent by the API (Web Push).
 * Development registers it as /sw.js?push-only=1: reminders only, no caching.
 */
const VERSION = 'v1';
const STATIC_CACHE = `fitguide-static-${VERSION}`;
const PAGE_CACHE = `fitguide-pages-${VERSION}`;
const OFFLINE_URL = '/offline';
const PUSH_ONLY = new URL(self.location.href).searchParams.has('push-only');

self.addEventListener('install', (event) => {
  if (PUSH_ONLY) {
    event.waitUntil(self.skipWaiting());
    return;
  }
  event.waitUntil(caches.open(PAGE_CACHE).then((cache) => cache.addAll([OFFLINE_URL])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('fitguide-') && !k.endsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(STATIC_CACHE)).put(request, response.clone());
  return response;
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || (await cache.match(OFFLINE_URL)) || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || network;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (PUSH_ONLY || request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request));
  } else if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request));
  } else if (!url.pathname.startsWith('/_next/')) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

// ─── Reminders ──────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data.text() };
  }
  event.waitUntil(self.registration.showNotification(data.title || 'FitGuide', {
    body: data.body || '',
    tag: data.tag,
    icon: '/icons/icon-192.png',
    data: { url: data.url || '/' },
  }));
});

// Open the page the reminder is about, in an open FitGuide tab if there is one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windows) => {
    const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
    if (!open) return self.clients.openWindow(url);
    await open.focus();
    return open.navigate(url).catch(() => self.clients.openWindow(url));
  }));
});
