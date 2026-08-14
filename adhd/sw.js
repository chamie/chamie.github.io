const CACHE = 'adhd-buffer-v13';
const ASSETS = ['./index.html', './manifest.json', './icon.svg', './style.css', './app.js'];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e=>{
  if(e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached=>{
      const fetchPromise = fetch(e.request).then(res=>{
        caches.open(CACHE).then(c=>c.put(e.request, res.clone()));
        return res;
      }).catch(()=>cached);
      return cached || fetchPromise;
    })
  );
});
