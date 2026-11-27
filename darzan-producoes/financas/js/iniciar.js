/* Liga o app (fica num arquivo, e não escrito na página, para a política de segurança só aceitar scripts do próprio site) */
document.querySelectorAll('[data-i]').forEach(el => { el.outerHTML = A.u.svg(el.dataset.i); });
document.getElementById('lgOlho').innerHTML = A.u.svg('eye');
try { localStorage.removeItem('df-chave-claude'); } catch (e) { /* versões antigas guardavam a chave do Claude no aparelho */ }
A.iniciar();
/* Versão nova do app (pedido do João: no iPhone o app ficava na versão velha).
   O app sabe a própria versão (o ?v= dos arquivos) e, ao abrir, ao voltar para a tela e a cada 15 min, pergunta ao site
   qual é a versão no ar (lê o sw.js sem cópia guardada). Se a do site for maior, abre a página de novo por um endereço
   novo (assim nem o navegador nem o service worker antigo devolvem a cópia velha). Se uma janela estiver aberta
   (preenchendo algo), espera fechar. Tenta uma vez por versão, para nunca ficar recarregando. */
A.versao = +(((document.querySelector('script[src*="iniciar.js"]') || {}).src || '').match(/[?&]v=(\d+)/) || [])[1] || 0;
{ const v = document.getElementById('sver'); if (v && A.versao) v.textContent = 'Versão ' + A.versao; }
{ const u = new URL(location.href); if (u.searchParams.has('atualizado')) { u.searchParams.delete('atualizado'); history.replaceState(history.state, '', u.pathname + u.search + u.hash); } }
A.novaVersao = nova => {
  if (A.recarregando) return;
  const chave = 'df-atualizou-' + (nova || 'sw');
  try { if (nova && sessionStorage.getItem(chave)) return; sessionStorage.setItem(chave, '1'); } catch (e) { /* sem armazenamento */ }
  const tenta = () => {
    if (!document.getElementById('scrim2').hidden) return setTimeout(tenta, 1500);
    A.recarregando = true;
    const u = new URL(location.href); u.searchParams.set('atualizado', nova || Date.now()); location.replace(u.href);
  };
  tenta();
};
let olhouEm = 0;
A.conferirVersao = async agora => {
  if (!A.versao || (agora !== true && Date.now() - olhouEm < 20000)) return; olhouEm = Date.now();
  try {
    const t = await (await fetch('sw.js?x=' + Date.now(), { cache: 'no-store' })).text();
    const nova = +((t.match(/darzan-financas-v(\d+)/) || [])[1] || 0);
    if (nova > A.versao) A.novaVersao(nova);
  } catch (e) { /* sem internet: confere depois */ }
};
const aoVoltar = () => { if (document.visibilityState === 'visible') A.conferirVersao(); };
document.addEventListener('visibilitychange', aoVoltar);
addEventListener('pageshow', aoVoltar); addEventListener('focus', aoVoltar);
setTimeout(A.conferirVersao, 2500); setInterval(A.conferirVersao, 15 * 60 * 1000);
if ('serviceWorker' in navigator && (location.protocol === 'https:' || /[?&]sw=teste/.test(location.search))) {
  const tinha = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (tinha) A.novaVersao(); });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => {
    const olhar = () => reg.update().catch(() => { });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') olhar(); });
    setInterval(olhar, 15 * 60 * 1000);
  }).catch(() => { });
}
