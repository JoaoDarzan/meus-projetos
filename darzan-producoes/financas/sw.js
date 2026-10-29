/* Deixa o app abrir mesmo sem internet: tenta buscar a versão nova e, se não der, usa a guardada. */
const CACHE = 'darzan-financas-v28';
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

/* cada aviso com etiqueta própria (um não some debaixo do outro), com som/vibração do aparelho (silent: false;
   vibrate vale no Android, no iPhone quem manda é Ajustes → Notificações → Finanças → Sons) */
const opcoesAviso = (corpo, tag, url) => ({ body: corpo || '', icon: 'img/icone-192.png', badge: 'img/icone-192.png', tag: tag || 'aviso-' + Date.now(), renotify: true, silent: false, vibrate: [200, 100, 200], timestamp: Date.now(), data: { url: url || './' } });
/* avisos no celular: chegou um aviso (mesmo com o app fechado), mostra na tela */
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { titulo: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.titulo || 'Darzan Finanças', opcoesAviso(d.corpo, d.tag, d.url)));
});
/* tocou no aviso: abre o app */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const aberto = cs.find(c => 'focus' in c);
    /* só abre endereço do próprio app: um aviso falso não consegue mandar você para um site de golpe */
    let url = './';
    try { const u = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope); if (u.href.startsWith(self.registration.scope)) url = u.href; } catch (x) { /* fica no app */ }
    return aberto ? aberto.focus() : self.clients.openWindow(url);
  }));
});
