// ⚠️ Incrémentez ce numéro à CHAQUE déploiement sur GitHub
const CACHE_NAME = 'jeux-v2';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Syne:wght@700;800&display=swap'
];

// Fichiers pour lesquels on veut TOUJOURS la dernière version en ligne
// (tout ce qui contient votre code : HTML, manifest)
function isFreshnessCritical(request) {
  if (request.mode === 'navigate') return true; // navigation vers une page HTML
  const url = new URL(request.url);
  return url.pathname.endsWith('.html') || url.pathname.endsWith('manifest.json');
}

// Installation : mise en cache des ressources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS.map(url => new Request(url, { mode: 'no-cors' })))
        .catch(() => cache.addAll(['./index.html']));
    })
  );
  self.skipWaiting();
});

// Activation : suppression des anciens caches + prise de contrôle immédiate
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch :
// - HTML / manifest -> network-first (toujours la dernière version GitHub si en ligne)
// - reste (icônes, fonts) -> cache-first (rapide, change rarement)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  if (isFreshnessCritical(event.request)) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
