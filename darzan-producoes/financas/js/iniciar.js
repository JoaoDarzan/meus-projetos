/* Liga o app (fica num arquivo, e não escrito na página, para a política de segurança só aceitar scripts do próprio site) */
document.querySelectorAll('[data-i]').forEach(el => { el.outerHTML = A.u.svg(el.dataset.i); });
document.getElementById('lgOlho').innerHTML = A.u.svg('eye');
try { localStorage.removeItem('df-chave-claude'); } catch (e) { /* versões antigas guardavam a chave do Claude no aparelho */ }
A.iniciar();
/* Versão nova do app: quando o celular volta para o app (ou a cada 15 min aberto) ele pergunta se tem versão nova;
   se tiver, recarrega sozinho. Se uma janela estiver aberta (preenchendo algo), espera fechar para não perder nada. */
A.novaVersao = () => {
  if (A.recarregando) return;
  const tenta = () => { if (!document.getElementById('scrim2').hidden) return setTimeout(tenta, 1500); A.recarregando = true; location.reload(); };
  tenta();
};
if ('serviceWorker' in navigator && (location.protocol === 'https:' || /[?&]sw=teste/.test(location.search))) {
  const tinha = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (tinha) A.novaVersao(); });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => {
    const olhar = () => reg.update().catch(() => { });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') olhar(); });
    setInterval(olhar, 15 * 60 * 1000);
  }).catch(() => { });
}
