// Service Worker for Shree Beauty Studio PWA & Offline / Low-Network Acceleration
const CACHE_VERSION = 'shree-beauty-v3';
const API_CACHE = 'shree-api-v2';
const STATIC_CACHE = 'shree-static-v2';

// Core routes and assets to precache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/services',
  '/bridal',
  '/offers',
  '/gallery',
  '/about',
  '/contact',
  '/book',
  '/reviews',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
  '/favicon-48x48.png',
  '/shree-logo.png',
  '/cropped-logo-icon-hd.png',
  '/studio-photos/0U3A2557.webp',
  '/studio-photos/0U3A2566.webp',
  '/studio-photos/0U3A2567.webp',
];

// Public API endpoints cached with Stale-While-Revalidate
const SWR_API_PATTERNS = ['/api/public-data', '/api/google-reviews'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      // Precache critical routes with graceful individual fallback (so one missing image doesn't fail install)
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          fetch(url, { cache: 'no-cache' })
            .then((res) => {
              if (res.ok) return cache.put(url, res);
            })
            .catch(() => {})
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const allowedCaches = [CACHE_VERSION, API_CACHE, STATIC_CACHE];
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (!allowedCaches.includes(key)) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Never intercept POST / PUT / DELETE / PATCH or non-http requests
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // 2. Never cache Admin panel, Auth APIs, WhatsApp/Email or Calendar mutations
  if (
    url.pathname.startsWith('/api/admin') ||
    url.pathname.startsWith('/api/auth') ||
    url.pathname.startsWith('/api/whatsapp') ||
    url.pathname.startsWith('/api/calendar') ||
    url.pathname.startsWith('/api/email') ||
    url.pathname.startsWith('/admin')
  ) {
    return;
  }

  // 3. Public API Routes: Stale-While-Revalidate (Instant response + background refresh)
  if (SWR_API_PATTERNS.some((pattern) => url.pathname.startsWith(pattern))) {
    event.respondWith(
      caches.open(API_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 4. Static Assets (Images, Next.js JS/CSS chunks, fonts, webp): Cache-First strategy
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/services/') ||
    url.pathname.startsWith('/studio-photos/') ||
    url.pathname.startsWith('/studio-bg/') ||
    url.pathname.startsWith('/salon-bg/') ||
    /\.(webp|png|jpg|jpeg|svg|gif|woff|woff2|ttf|ico|css|js)$/i.test(url.pathname);

  if (isStaticAsset) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => {
              // Return fallback empty or matched if available
              return cachedResponse;
            });
        });
      })
    );
    return;
  }

  // 5. HTML Navigation Requests (Fast Network with Cache Fallback for slow 2G/3G & Offline)
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_VERSION);
        const cachedResponse = await cache.match(request);

        // Try network with a fast 1.5s timeout; if network is slow/offline, serve cached HTML immediately!
        const networkPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse || cache.match('/'));

        // If we have cached version and connection might be slow, race with timeout
        if (cachedResponse) {
          const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => resolve(cachedResponse), 1200);
          });
          return Promise.race([networkPromise, timeoutPromise]);
        }

        return networkPromise;
      })()
    );
  }
});
