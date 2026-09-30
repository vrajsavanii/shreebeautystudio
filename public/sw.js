// Service Worker for Shree Beauty Studio PWA
const CACHE_NAME = 'shree-beauty-v2';
const API_CACHE = 'shree-api-v1';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

// API routes to cache with stale-while-revalidate
const SWR_API_ROUTES = ['/api/public-data'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== API_CACHE) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Stale-while-revalidate for public API data
  if (event.request.method === 'GET' && SWR_API_ROUTES.some((r) => url.pathname === r)) {
    event.respondWith(
      caches.open(API_CACHE).then((cache) => {
        return cache.match(event.request).then((cached) => {
          const fetchPromise = fetch(event.request).then((response) => {
            if (response && response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(() => null);
          // Return cached immediately, update in background
          return cached || fetchPromise;
        });
      })
    );
    return;
  }

  // Pass through non-GET and API requests directly to network
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful static asset responses
        if (
          response &&
          response.status === 200 &&
          (event.request.url.includes('.png') ||
           event.request.url.includes('.jpg') ||
           event.request.url.includes('.webp') ||
           event.request.url.includes('.svg') ||
           event.request.url.includes('.woff2'))
        ) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
