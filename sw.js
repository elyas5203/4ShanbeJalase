const CACHE_NAME = 'charshanbe-jalase-v2';
const CORE = ['./', 'index.php', 'assets/default-avatar.svg', 'assets/favicon.svg'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE).catch(() => null)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET') return;

  // API responses are live data; caching them causes stale dashboard/attendance state after writes.
  if (url.pathname.endsWith('/api.php')) {
    event.respondWith(fetch(req).catch(() => new Response(JSON.stringify({success:false, msg:'ارتباط با سرور برقرار نشد'}), {headers:{'Content-Type':'application/json; charset=utf-8'}})));
    return;
  }

  event.respondWith(fetch(req).then(res => {
    const copy = res.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => null);
    return res;
  }).catch(() => caches.match(req).then(cached => cached || caches.match('index.php'))));
});
