/* Etapa 22 · Pedidos do fim de outubro: extrato em ordem do que aconteceu, "Pra fazer" só do mês, porcentagem no gráfico e escolher o mês direto */
const { HOJE, calmo, clica, certo, igual, conferirLayout, ir } = require('../ajuda');
const mesmo = (a, b, msg) => certo(a === b, `${msg}: esperava ${b}, veio ${a}`); /* igual() é só para números */
const m0 = HOJE.slice(0, 7);
const addMes = (m, n) => { const d = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1 + n, 1)); return d.toISOString().slice(0, 7); };
const addDias = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const L = (id, extra) => Object.assign({ id, user_id: 'u-joao', data: HOJE, banco: 'PicPay', descricao: id, grupo: 'Desejos', tipo: 'conta', valor: -10, categoria: 'Lazer', subcategoria: 'Passeios e cinema', status: 'Pago', parcela: '', obs: '' }, extra);
const ordemDe = (p, sel, ids) => p.$$eval(sel, (bs, ids) => bs.map(b => b.dataset.id).filter(id => ids.includes(id)), ids);

module.exports = { etapa: 'Ordem, mês e gráfico', testes: [
  ['extrato e início em ordem do que aconteceu: o último gasto em cima; parcela do cartão com data mais para frente vai para o fim', async (st, abrir) => {
    st.tabelas.extrato.push(L('ZANTES', { data: addDias(HOJE, -2), descricao: 'gasto de anteontem' }), L('ZHOJE1', { descricao: 'primeiro de hoje' }), L('ZHOJE2', { descricao: 'segundo de hoje' }),
      L('ZPARC', { data: addDias(HOJE, 3), descricao: 'MERCADOLIVRE parcela', tipo: 'cartão', banco: 'Mercado Pago', parcela: '3/3' }), L('ZDEPOIS', { data: addDias(HOJE, 1), descricao: 'conta de amanhã', status: 'Previsto' }));
    const ids = ['ZANTES', 'ZHOJE1', 'ZHOJE2', 'ZPARC', 'ZDEPOIS'], esperado = ['ZHOJE2', 'ZHOJE1', 'ZANTES', 'ZDEPOIS', 'ZPARC'];
    const p = await abrir({ aparelho: 'iphone-15' });
    mesmo((await ordemDe(p, '#view .scrollbox [data-a=editL]', ids)).join(), esperado.join(), 'início: hoje (o último lançado em cima), depois os dias antes; o que ainda vai acontecer no fim, do mais perto ao mais longe');
    await p.evaluate(() => { A.ui.view = 'fin'; A.ui.fseg = 'extrato'; A.render(false); });
    mesmo((await ordemDe(p, '#view .panel [data-a=editL]', ids)).join(), esperado.join(), 'extrato na mesma ordem');
    const antes = await p.$$eval('#view .panel > *', (xs) => { const i = xs.findIndex(x => x.classList.contains('day-fut')); return [i, xs.findIndex(x => x.dataset && x.dataset.id === 'ZDEPOIS'), xs.findIndex(x => x.dataset && x.dataset.id === 'ZANTES')]; });
    certo(antes[0] > antes[2] && antes[0] < antes[1], '"Ainda vai acontecer" separa o que já foi do que vai ser: ' + antes);
    await conferirLayout(p, 'extrato com "ainda vai acontecer"');
  }],
  ['o Início não tem mais o "Pra fazer": as tarefas ficam na aba Tarefas, separadas por mês', async (st, abrir) => {
    st.tabelas.extrato.push(L('ZT-ESTE', { data: addDias(HOJE, 2), descricao: 'Conta deste mês', status: 'Previsto' }),
      L('ZT-PROX', { data: addMes(m0, 1) + '-10', descricao: 'Conta do mês que vem', status: 'Previsto' }));
    const p = await abrir({ aparelho: 'iphone-15' });
    certo(!(await p.$('#view .tk')) && !(await p.isVisible('#view h2:has-text("Pra fazer")')), 'o Início não mostra tarefas');
    await ir(p, 'tarefas');
    const ts = await p.$$eval('#view .tk .t', xs => xs.map(t => t.textContent));
    certo(ts.some(t => t.includes('deste mês')) && !ts.some(t => t.includes('mês que vem')), 'na aba Tarefas, o mês atual: ' + ts);
  }],
  ['Para onde foi em anel (app de investimento): total no meio, porcentagem na lista, tocar no pedaço abre as subcategorias e os lançamentos; o total compara com o mês anterior', async (st, abrir) => {
    const ant = addMes(m0, -1);
    st.tabelas.extrato.push(L('LG1', { categoria: 'Teste Grande', valor: -3000 }), L('LG3', { categoria: 'Teste Grande', valor: -100, data: ant + '-10' }));
    const p = await abrir({ aparelho: 'iphone-15' });
    const d = await p.evaluate(() => { const r = A.c.resumo(A.ui.mes), t = r.cats.reduce((s, x) => s + x.valor, 0); return { cats: r.cats.map(x => x.cat), p0: Math.round(r.cats[0].valor / t * 100) }; });
    mesmo(d.cats[0], 'Teste Grande', 'a maior categoria vem primeiro');
    certo((await p.$$eval('#view .catl small', t => t.map(x => x.textContent.trim()))).some(x => x.startsWith(d.p0 + '%') || x.startsWith(d.p0 + ',')), 'a porcentagem aparece na lista');
    certo(/Saiu em .*R\$ [\d.]+,\d\d/.test(await p.textContent('#view .pizza.donut')), 'o total do mês fica no meio do anel');
    certo(/a mais que|a menos que|igual a/.test(await p.textContent('#view .ofcmp')), 'o total compara com o mês anterior');
    await p.$eval('#view .pizza', e => e.scrollIntoView({ block: 'center' }));
    await p.$eval('#view .pizza .fat[data-v="Teste Grande"]', e => e.dispatchEvent(new MouseEvent('click', { bubbles: true }))); await p.waitForTimeout(350);
    certo(await p.getAttribute('#view .catl[data-v="Teste Grande"]', 'aria-expanded') === 'true' && await p.isVisible('#view .ofsubs'), 'tocar na fatia abre as subcategorias');
    certo(/Teste Grande/.test(await p.textContent('#view .pizza.donut')) && await p.$$eval('#view .oflancs .ofl1', ls => ls.length) >= 1, 'o meio mostra a categoria aberta e a lista mostra os lançamentos dela');
    certo(await p.$eval('#view .pizza .fat[data-v="Teste Grande"]', e => e.classList.contains('on')) && await p.$eval('#view .ondefoi', e => e.classList.contains('foco')), 'a fatia aberta fica em destaque');
    await p.$eval('#view .pizza .fmeio', e => e.dispatchEvent(new MouseEvent('click', { bubbles: true }))); await p.waitForTimeout(200);
    certo(/Saiu em/.test(await p.textContent('#view .pizza.donut')) && !(await p.$('#view .ondefoi.foco')), 'tocar no meio (ou de novo no pedaço) volta para o total');
    await p.$eval('#view .pizza .fhit[data-v="Teste Grande"]', e => e.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await p.$eval('#view .pizza .fhit[data-v="Teste Grande"]', e => e.dispatchEvent(new MouseEvent('click', { bubbles: true }))); await p.waitForTimeout(200);
    certo(/Saiu em/.test(await p.textContent('#view .pizza.donut')), 'tocar duas vezes no mesmo pedaço também volta');
    await conferirLayout(p, 'para onde foi em anel');
  }],
  ['escolher o mês direto: tocar no nome do mês abre os 12 meses; vai de outubro para janeiro num toque; mês sem nada fica apagado', async (st, abrir) => {
    const p = await abrir({ aparelho: 'iphone-15' });
    await clica(p, '#view .mpill .mnome');
    await p.waitForSelector('#scrim2:not([hidden]) .mpgrid');
    const alvo = await p.evaluate(() => { const ms = A.c.meses(); return ms[ms.length - 1]; }); /* o mês mais para frente que existe (o app vai até 3 meses depois de hoje) */
    if (alvo.slice(0, 4) !== m0.slice(0, 4)) await clica(p, '#s2 .mpano [data-a=mpAno][aria-label="Próximo ano"]');
    certo(await p.isVisible(`#s2 .mpm[data-v="${alvo}"]:not([disabled])`), 'o mês ' + alvo + ' dá para escolher');
    await clica(p, `#s2 .mpm[data-v="${alvo}"]`); await p.waitForTimeout(300);
    mesmo(await p.evaluate(() => A.ui.mes), alvo, 'foi direto para ' + alvo);
    certo(await p.$('#scrim2[hidden]'), 'a janela fechou');
    await clica(p, '#view .mpill .mnome');
    const fora = await p.evaluate(() => { const ms = A.c.meses(); let m = ms[ms.length - 1]; const d = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 1)).toISOString().slice(0, 7); return d; });
    if (fora.slice(0, 4) === alvo.slice(0, 4)) certo(await p.$(`#s2 .mpm[data-v="${fora}"][disabled]`), 'mês depois do último fica apagado');
    await conferirLayout(p, 'escolher o mês');
    await clica(p, `#s2 [data-a=irMes][data-v="${m0}"]`); await p.waitForTimeout(300);
    mesmo(await p.evaluate(() => A.ui.mes), m0, '"voltar para o mês atual" funciona');
  }],
] };
