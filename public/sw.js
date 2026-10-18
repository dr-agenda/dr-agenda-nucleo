/**
 * Service Worker de Dr Agenda Núcleos (PWA)
 * Regla crítica de seguridad y privacidad (Sección 14):
 * - Cachea únicamente el shell estático de la interfaz.
 * - NUNCA almacena en caché respuestas de `/api/*`, datos de pacientes, agendas ni movimientos financieros.
 */

const CACHE_NAME = 'dr-agenda-nucleos-shell-v1';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Solo interceptar recursos del mismo origen (no beacons externos como Cloudflare Insights)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Jamás cachear llamadas a la API ni métodos distintos de GET
  if (url.pathname.startsWith('/api/') || event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      if (event.request.mode === 'navigate') {
        const fallback = await caches.match('/index.html');
        if (fallback) return fallback;
      }
      return new Response('Sin conexión de red', { status: 503, statusText: 'Offline' });
    })
  );
});
