const CACHE_VERSION='turni-medici-pwa-v1';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith(fetch(event.request).catch(()=>new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Turni Medici</title><body style="font-family:system-ui;padding:24px"><h2>Connessione assente</h2><p>Riconnettiti a Internet e riapri Gestione Turni Medici.</p></body>',
    {headers:{'Content-Type':'text/html; charset=utf-8'}}
  )));
});