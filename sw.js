// Service worker : l'app reste utilisable hors connexion.
// Stratégie « réseau d'abord » : la dernière version est toujours servie quand on est en ligne.
const CACHE = 'suivi-v3';
const SHELL = ['./', './index.html', './css/app.css', './js/app.js', './js/data.js', './js/ui.js', './js/seed.js', './js/fiche.js', './js/public.js', './js/admin.js', './js/prof.js', './js/i18n.js', './js/annonces.js', './js/import.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then((r) => {
      if (r.ok && new URL(e.request.url).origin === location.origin) {
        const copy = r.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
      }
      return r;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
  );
});
