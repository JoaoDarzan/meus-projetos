/* Deixa o app abrir mesmo sem internet: tenta buscar a versão nova e, se não der, usa a guardada. */
const CACHE = 'darzan-financas-v2';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  const nosso = url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (req.method !== 'GET' || !nosso) return; /* dados do Supabase nunca passam por aqui */
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const resp = await Promise.race([fetch(req), new Promise((_, n) => setTimeout(() => n(new Error('lento')), 4000))]);
      if (resp && resp.ok) cache.put(req, resp.clone());
      return resp;
    } catch (err) {
      const guardado = await cache.match(req, { ignoreSearch: url.origin === location.origin });
      if (guardado) return guardado;
      throw err;
    }
  })());
});
