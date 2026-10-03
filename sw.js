/* Service Worker: cached die App-Shell, damit sie auch bei wackligem
 * Mobilfunknetz unterwegs zuverlässig lädt. Daten (data/*.json) werden
 * network-first geladen, damit neue Städte/Korrekturen sofort ankommen. */

const CACHE = 'schnitzeljagd-v18';
const SHELL = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/crypto.js',
  './games/memory.js',
  './games/runner.js',
  './games/golf.js',
  './games/sign.js',
  './fonts/space-grotesk.woff2',
  './manifest.webmanifest',
  './icons/icon.svg',
];

self.addEventListener('install', (e) => {
  // cache: 'reload' umgeht den HTTP-Cache des Browsers, sonst kann ein
  // Update noch minutenlang alte Dateien in den neuen Cache übernehmen
  e.waitUntil(caches.open(CACHE).then((c) =>
    c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))
  ));
  self.skipWaiting();
});

// Die App fragt so nach der laufenden Version (Anzeige auf dem Startbildschirm)
self.addEventListener('message', (e) => {
  if (e.data === 'version' && e.ports && e.ports[0]) e.ports[0].postMessage(CACHE);
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
