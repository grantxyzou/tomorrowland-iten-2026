/* Tomorrowland 2026 — dependency-free service worker.
 *
 * Vite emits content-hashed asset filenames, so instead of a build-time
 * precache list we cache at runtime:
 *   - navigations: network-first, fall back to the cached app shell (so the
 *     SPA still loads with no connection; fresh HTML when online).
 *   - same-origin static assets (JS/CSS/img/font): stale-while-revalidate.
 *   - GET /api/picks: network-first with a cached fallback (complements the
 *     localStorage cache in usePicks). POSTs are never cached — writes still
 *     need a connection, matching the app's revert-on-failure behaviour.
 *   - Google Fonts: stale-while-revalidate.
 *
 * Bump VERSION to invalidate all caches on a future change.
 */
const VERSION = 'v1';
const SHELL  = `tml-shell-${VERSION}`;   // app shell + same-origin assets
const API    = `tml-api-${VERSION}`;     // last-known /api/picks
const FONTS  = `tml-fonts-${VERSION}`;   // Google Fonts
const KEEP   = new Set([SHELL, API, FONTS]);
const SHELL_URL = '/index.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL).then((c) => c.addAll(['/', SHELL_URL])).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !KEEP.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function staleWhileRevalidate(request, cacheName) {
  return caches.open(cacheName).then((cache) =>
    cache.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => { if (res && res.ok) cache.put(request, res.clone()); return res; })
        .catch(() => cached);
      return cached || network;
    })
  );
}

function networkFirst(request, cacheName) {
  return caches.open(cacheName).then((cache) =>
    fetch(request)
      .then((res) => { if (res && res.ok) cache.put(request, res.clone()); return res; })
      .catch(() => cache.match(request))
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return; // never cache writes (POST /api/picks)

  const url = new URL(request.url);

  // App shell — network-first, fall back to cached index.html offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(SHELL_URL).then((r) => r || caches.match('/'))
      )
    );
    return;
  }

  // Shared picks — network-first so it's fresh, cached as an offline fallback.
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API));
    return;
  }

  // Google Fonts (CSS + font files) — stale-while-revalidate.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(request, FONTS));
    return;
  }

  // Same-origin static assets (hashed JS/CSS, icons, images).
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, SHELL));
  }
});
