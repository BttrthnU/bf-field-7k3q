const CACHE='bf20700-v6';
const FILES=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','icon-180.png','pdffill.js','vendor/pdf-lib.min.js','tceq-20700.pdf','tx-pws.json','logo.jpg','logo-mark.jpg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const same=new URL(e.request.url).origin===location.origin;
  e.respondWith(fetch(e.request,same?{cache:'no-cache'}:undefined).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('index.html'))));
});
