const CACHE_NAME = 'hazi-v2';
const ASSETS = [
  './',
  './index.html',
  './hazi.css',
  './hazi.js',
  './manifest.json',
  './img/icons/hazi-192.png',
  './img/icons/hazi-512.png',
];

// Instalacion: Cache inicial de archivos criticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting(); // Fuerza al SW nuevo a tomar el control
});

// Activacion: Limpieza de caches antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

// Estrategia: Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchedResponse = fetch(event.request).then((networkResponse) => {
          // Actualizamos la cache con la version mas reciente de la red
          if (networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });

        // Si esta en cache, lo devolvemos; si no, esperamos a la red
        return cachedResponse || fetchedResponse;
      });
    })
  );
});

// Permite que el service worker tome el control cuando el usuario acepte actualización
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});