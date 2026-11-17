const scope = self.registration.scope;
const cachePrefix = 'dice-throne:' + scope + ':';
const cacheName = cachePrefix + '0.13.3';
const shell = new URL('index.html', scope).href;
const assets = ['index.html', 'manifest.webmanifest', 'install.js', 'heroes/barbarian.js', 'art-shared.js', 'art-hero-1.js', 'art-hero-2.js', 'art-hero-3.js', 'art-hero-4.js', 'art-hero-5.js', 'art-hero-6.js', 'art-hero-7.js', 'art-hero-8.js', 'icons/die-192.png', 'icons/die-512.png'].map(path => new URL(path, scope).href);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll(assets.map(url => new Request(url, {cache:'reload'})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(cachePrefix) && key !== cacheName) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const {request} = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const appNavigation = request.mode === 'navigate' && (url.origin + url.pathname === scope || url.origin + url.pathname === shell);
  if (!appNavigation && !assets.includes(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(appNavigation ? shell : request.url);
    return cached ?? fetch(request);
  })());
});
