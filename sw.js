// Service worker "pulitore" — disattiva la vecchia cache e si autodistrugge.
// Sostituisce il vecchio sw.js che teneva in cache la versione datata dell'app.
self.addEventListener('install', e => {
  self.skipWaiting(); // attiva subito questa versione
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    // svuota TUTTE le cache salvate
    const nomi = await caches.keys();
    await Promise.all(nomi.map(n => caches.delete(n)));
    // prende il controllo di tutte le schede aperte
    await self.clients.claim();
    // disattiva definitivamente questo service worker
    await self.registration.unregister();
    // ricarica le pagine aperte così prendono la versione fresca dal server
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(c => c.navigate(c.url));
  })());
});
// durante la vita: non intercetta nulla, lascia passare tutto alla rete
self.addEventListener('fetch', () => {});
