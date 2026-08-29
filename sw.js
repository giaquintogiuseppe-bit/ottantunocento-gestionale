const CACHE_NAME = 'otto8100-gestionale-v5';
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(['./','./index.html']).catch(()=>{}))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  if(e.request.method!=='GET') return;
  const url=new URL(e.request.url);
  if(url.hostname.includes('supabase')||url.hostname.includes('google')||url.hostname.includes('googleapis')) return;
  const isPagina = e.request.mode==='navigate'||url.pathname.endsWith('index.html')||url.pathname.endsWith('/');
  if(isPagina||url.pathname.endsWith('.png')||url.pathname.endsWith('manifest.json')){
    e.respondWith(fetch(e.request).then(r=>{ if(r&&r.status===200){const c=r.clone();caches.open(CACHE_NAME).then(x=>x.put(e.request,c));} return r;}).catch(()=>caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then(cached=>{ const nf=fetch(e.request).then(r=>{ if(r&&r.status===200&&r.type!=='opaque'){const c=r.clone();caches.open(CACHE_NAME).then(x=>x.put(e.request,c));} return r;}).catch(()=>cached); return cached||nf; }));
});
