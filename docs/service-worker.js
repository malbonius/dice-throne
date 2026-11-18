const scope = self.registration.scope;
const cachePrefix = 'dice-throne:' + scope + ':';
const cacheName = cachePrefix + '0.30.0';
const shell = new URL('index.html', scope).href;
const assets = ['index.html', 'manifest.webmanifest', 'install.js', 'heroes/barbarian.js', 'heroes/moon-elf.js', 'heroes/pyromancer.js', 'heroes/shadow-thief.js', 'heroes/monk.js', 'heroes/paladin.js', 'heroes/ninja.js', 'heroes/treant.js', 'heroes/cursed-pirate.js', 'heroes/artificer.js', 'heroes/seraph.js', 'heroes/vampire-lord.js', 'heroes/gunslinger.js', 'heroes/samurai.js', 'heroes/tactician.js', 'heroes/huntress.js', 'heroes/headless-horseman.js', 'heroes/necromancer.js', 'heroes/pale-lady.js', 'heroes/raveness.js', 'heroes/druid.js', 'heroes/duelist.js', 'heroes/forgemaster.js', 'heroes/sun-elf.js', 'engine.js', 'app.js', 'art-shared.js', 'art-hero-1.js', 'art-hero-2.js', 'art-hero-3.js', 'art-hero-4.js', 'art-hero-5.js', 'art-hero-6.js', 'art-hero-7.js', 'art-hero-8.js', 'art-hero-9.js', 'art-hero-10.js', 'art-hero-11.js', 'art-hero-12.js', 'art-hero-13.js', 'art-hero-14.js', 'art-hero-15.js', 'art-hero-16.js', 'art-hero-17.js', 'art-hero-18.js', 'art-hero-19.js', 'art-hero-20.js', 'art-hero-21.js', 'art-hero-22.js', 'art-hero-23.js', 'art-hero-24.js', 'icons/die-192.png', 'icons/die-512.png'].map(path => new URL(path, scope).href);

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
