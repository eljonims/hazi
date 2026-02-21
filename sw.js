const CACHE_NAME = 'hazi-v1';
const ASSETS = [
  './',
  './index.html',
  './hazi.css',
  './hazi.js',
  './manifest.json',
  './img/icons/hazi-192.png',
  './img/icons/hazi-512.png',
];

// Instalación: Guardamos los archivos en la caché del navegador
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Estrategia: Cache First (Si está en caché, no lo pidas a internet)
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});
