// ═══════════════════════════════════════════════════════════════
// GenyX Service Worker — PWA Offline + Cache Strategy
// ═══════════════════════════════════════════════════════════════
const CACHE_NAME = 'genyx-v1';
const PRECACHE = [
  '/',
  '/index.html',
  '/genyx-logo.png',
  '/genyx-192.png',
  '/favicon.svg',
];

// Install: precache shell
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for assets
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Never cache API calls or WS
  if (url.pathname.startsWith('/api') || url.protocol === 'ws:') return;

  // Cache-first for static assets (images, fonts, CSS, JS)
  if (
    e.request.destination === 'image' ||
    e.request.destination === 'font' ||
    e.request.destination === 'style' ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css')
  ) {
    e.respondWith(
      caches.match(e.request).then((cached) =>
        cached || fetch(e.request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
          return res;
        })
      )
    );
    return;
  }

  // Network-first for navigation (HTML)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }
});
