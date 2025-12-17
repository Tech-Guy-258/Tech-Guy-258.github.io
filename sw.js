
const CACHE_NAME = 'merceariagest-v14'; // V14 FORCE UPDATE
const EXTERNAL_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'https://aistudiocdn.com/react@^19.2.0/',
  'https://aistudiocdn.com/react@^19.2.0',
  'https://aistudiocdn.com/react-dom@^19.2.0/',
  'https://aistudiocdn.com/@google/genai@^1.30.0',
  'https://aistudiocdn.com/lucide-react@^0.555.0',
  'https://aistudiocdn.com/recharts@^3.5.1',
  'https://aistudiocdn.com/react-router-dom@^7.9.6'
];

const LOCAL_ASSETS = [
  '/',
  '/index.html',
  '/index.tsx?v=3.2.3', // Match the cache buster in index.html
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force activation immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      const cachePromises = EXTERNAL_ASSETS.map(url => {
        return fetch(url, { mode: 'no-cors' }).then(response => {
          return cache.put(url, response);
        }).catch(e => console.warn('Failed to cache external:', url));
      });
      return Promise.all([...cachePromises, cache.addAll(LOCAL_ASSETS)]);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim(); // Take control of all clients immediately
});

self.addEventListener('fetch', (event) => {
  // NETWORK FIRST for everything to ensure updates are seen on reload
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          // Only cache valid http/https requests
          if (event.request.url.startsWith('http')) {
             cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
