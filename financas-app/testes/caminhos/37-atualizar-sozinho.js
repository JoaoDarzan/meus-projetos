/* Etapa 37 · App se atualiza sozinho (v67): com versão nova no ar, o app aberto troca sozinho (sem precisar fechar),
   mas espera a janela aberta fechar; arquivos com versão vêm da cópia guardada (abre mais rápido); a página sempre pergunta ao servidor. */
const { calmo, certo } = require('../ajuda');
const espera = async (p, fn, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await p.evaluate(fn).catch(() => false)) return true; await p.waitForTimeout(200); } return false; };
module.exports = { etapa: 'Atualizar sozinho', testes: [
  ['versão nova no ar: o app aberto recarrega sozinho quando volta para a tela, e espera a janela aberta fechar', async (st, abrir) => {
    const p = await abrir({ aparelho: 'iphone-15' });
    await p.goto(p.url().replace(/\?.*$/, '') + '?sw=teste'); await calmo(p);
    certo(await espera(p, () => !!navigator.serviceWorker.controller), 'o app não ligou o modo sem internet (service worker)');
    await p.reload(); await calmo(p); /* 2ª vez que abre: agora tudo passa pelo service worker */
    const cache = await p.evaluate(async () => { const ks = await caches.keys(), c = await caches.open(ks[0]); return (await c.keys()).map(r => r.url).filter(u => /telas\.js\?v=/.test(u)).length; });
    certo(cache === 1, 'arquivo com versão não ficou guardado para abrir rápido');
    st.estaticos = []; await p.reload(); await calmo(p);
    certo(!st.estaticos.some(u => /telas\.js\?v=/.test(u)), 'abriu de novo baixando os arquivos que já tinha guardado (lento)');
    certo(st.estaticos.some(u => /\/financas\/(\?|$)/.test(u)), 'a página não perguntou ao servidor se tem versão nova');
    /* sobe uma "versão nova" do app e abre uma janela antes */
    st.trocar = { 'financas/sw.js': t => t.replace(/darzan-financas-v\d+/, 'darzan-financas-v999') };
    await p.evaluate(() => { window.__velho = 1; document.getElementById('scrim2').hidden = false; document.dispatchEvent(new Event('visibilitychange')); });
    await p.waitForTimeout(2500);
    certo(await p.evaluate(() => window.__velho === 1), 'recarregou com uma janela aberta (perderia o que estava preenchendo)');
    await p.evaluate(() => { document.getElementById('scrim2').hidden = true; });
    certo(await espera(p, () => window.__velho === undefined && !!window.A), 'não trocou para a versão nova sozinho');
    certo(await espera(p, async () => (await caches.keys()).includes('darzan-financas-v999')), 'a cópia guardada não é da versão nova');
  }],
  ['sem a ajuda do navegador: o app confere a versão no site, abre a nova uma vez só e mostra o número no menu', async (st, abrir) => {
    const p = await abrir({ aparelho: 'iphone-15' });
    const v = await p.evaluate(() => A.versao);
    certo(v > 0 && new RegExp('Versão ' + v).test(await p.textContent('#sver')), 'o menu não mostra a versão do app');
    await p.waitForTimeout(3000);
    certo(await p.evaluate(() => !A.recarregando), 'recarregou sem ter versão nova');
    st.trocar = { 'financas/sw.js': t => t.replace(/darzan-financas-v\d+/, 'darzan-financas-v' + (v + 1)) };
    await p.evaluate(() => { window.__velho = 1; document.getElementById('scrim2').hidden = false; });
    await p.evaluate(() => A.conferirVersao(true));
    await p.waitForTimeout(2000);
    certo(await p.evaluate(() => window.__velho === 1), 'recarregou com uma janela aberta');
    await p.evaluate(() => { document.getElementById('scrim2').hidden = true; });
    certo(await espera(p, () => window.__velho === undefined && !!window.A), 'não abriu a versão nova sozinho');
    await calmo(p);
    certo(!/atualizado=/.test(p.url()), 'o endereço ficou com o "atualizado=": ' + p.url());
    /* o site continua dizendo que tem versão nova (a cópia do site ainda não chegou): não pode ficar recarregando */
    await p.evaluate(() => { window.__fica = 1; });
    await p.waitForTimeout(3500); await p.evaluate(() => { document.dispatchEvent(new Event('visibilitychange')); });
    await p.waitForTimeout(1500);
    certo(await p.evaluate(() => window.__fica === 1), 'ficou recarregando sem parar');
  }],
] };
