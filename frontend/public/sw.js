const CACHE='mmf-v3';
const SHELL=['/','/index.html','/depart.html','/track.html','/manifest.json','/icons/icon-192.png','/icons/icon-512.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL.map(u=>new Request(u,{cache:'reload'})))).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.origin!==location.origin)return;
  e.respondWith(
    caches.match(e.request).then(cached=>{
      const network=fetch(e.request).then(r=>{
        if(r.ok){const c=r.clone();caches.open(CACHE).then(cache=>cache.put(e.request,c))}
        return r;
      }).catch(()=>cached||new Response('Offline',{status:503}));
      return cached||network;
    })
  );
});

self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const url=e.notification.data&&e.notification.data.url?e.notification.data.url:'/';
  e.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
      for(const c of list){if(c.url.includes(location.origin)&&'focus' in c)return c.focus();}
      if(clients.openWindow)return clients.openWindow(url);
    })
  );
});
