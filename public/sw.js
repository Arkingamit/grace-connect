// Service Worker for Grace Connect
// Handles push notifications AND offline caching for performance.

const CACHE_VERSION = 'grace-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

// Assets to precache on install
const PRECACHE_URLS = [
  '/logo.png',
  '/logo2.png',
  '/manifest.json',
  '/favicon.ico',
];

// ── Install: Precache critical assets ────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: Clean up old caches ────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// ── Fetch: Strategy-based caching ────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (POST, PUT, DELETE should always go to network)
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http schemes
  if (!url.protocol.startsWith('http')) return;

  // Strategy 1: Cache-first for static assets (Next.js fingerprinted files)
  if (url.pathname.startsWith('/_next/static/') || 
      url.pathname.startsWith('/logo') ||
      url.pathname === '/favicon.ico' ||
      url.pathname === '/manifest.json') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Strategy 2: Network-first for API calls
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Strategy 3: Stale-while-revalidate for app pages and other assets
  event.respondWith(staleWhileRevalidate(request));
});

// ── Cache-first: Return cached version, fallback to network ──────────
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return a basic offline fallback for images
    return new Response('', { status: 408, statusText: 'Offline' });
  }
}

// ── Network-first: Try network, fall back to cache for offline ───────
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ── Stale-while-revalidate: Return cache, update in background ───────
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        const responseClone = response.clone();
        caches.open(DYNAMIC_CACHE).then((c) => c.put(request, responseClone));
      }
      return response;
    })
    .catch(() => cached || new Response('', { status: 408 }));

  // Return cached response immediately if available, otherwise wait for network
  return cached || fetchPromise;
}

// ── Push Notifications ───────────────────────────────────────────────

// Map notification types to URL paths for click navigation
const TYPE_TO_PATH = {
  new_event: '/events',
  new_announcement: '/notifications',
  new_note: '/broadcasts',
  new_prayer: '/prayer-wall',
  new_sermon: '/#sermons',
  new_worship_video: '/#worship-videos',
  recurring_announcement: '/notifications',
  event_reminder: '/events',
  system: '/notifications',
};

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Grace Connect', body: event.data.text() };
  }

  const title = data.title || 'Grace Connect';
  const options = {
    body: data.body || data.message || '',
    icon: '/logo.png',
    badge: '/logo.png',
    vibrate: [200, 100, 200],
    tag: data.tag || `gc-${Date.now()}`,
    renotify: true,
    data: {
      url: data.url || TYPE_TO_PATH[data.type] || '/',
      type: data.type || 'system',
    },
    actions: [
      { action: 'open', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(targetUrl);
    })
  );
});
