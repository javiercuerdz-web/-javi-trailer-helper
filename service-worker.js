const CACHE='javi-trailer-helper-v9.7.0';
const FILES=['./','./index.html','./styles.css?v=9.6.0','./app.js?v=9.6.0','./manifest.json','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{const clone=r.clone();caches.open(CACHE).then(c=>c.put(e.request,clone));return r}).catch(()=>caches.match(e.request))));
