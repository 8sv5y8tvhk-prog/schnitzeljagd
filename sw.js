/* Service Worker: cached die App-Shell, damit sie auch bei wackligem
 * Mobilfunknetz unterwegs zuverlässig lädt. Daten (data/*.json) werden
 * network-first geladen, damit neue Städte/Korrekturen sofort ankommen. */

const CACHE = 'schnitzeljagd-v8';
const SHELL = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/crypto.js',
  './fonts/space-grotesk.woff2',
  './manifest.webmanifest',
  './icons/icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  if (url.pathname.includes('/data/')) {
    // Network first: aktuelle Daten bevorzugen, Cache als Fallback
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // Cache first für die App-Shell
    e.respondWith(
      caches.match(e.request).then((hit) => hit || fetch(e.request))
    );
  }
});
