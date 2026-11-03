/* Etapa 22 · Pedidos do fim de outubro: extrato em ordem do que aconteceu, "Pra fazer" só do mês, porcentagem no gráfico e escolher o mês direto */
const { HOJE, calmo, clica, certo, igual, conferirLayout } = require('../ajuda');
const mesmo = (a, b, msg) => certo(a === b, `${msg}: esperava ${b}, veio ${a}`); /* igual() é só para números */
const m0 = HOJE.slice(0, 7);
const addMes = (m, n) => { const d = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1 + n, 1)); return d.toISOString().slice(0, 7); };
const addDias = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const L = (id, extra) => Object.assign({ id, user_id: 'u-joao', data: HOJE, banco: 'PicPay', descricao: id, grupo: 'Desejos', tipo: 'conta', valor: -10, categoria: 'Lazer', subcategoria: 'Outros', status: 'Pago', parcela: '', obs: '' }, extra);
const dadosRosca = p => p.evaluate(() => { const r = A.c.resumo(A.ui.mes), tot = r.cats.reduce((s, x) => s + x.valor, 0); return { cats: r.cats.map(x => x.cat), pcts: r.cats.slice(0, 6).map(x => Math.round(x.valor / tot * 100)) }; });
/* o ponto da tela no meio do arco da fatia i (onde o dedo ou o mouse encosta) */
const pontoFatia = async (p, i) => { await p.$eval('#view .rosca', e => e.scrollIntoView({ block: 'center' })); return p.$$eval('#view .rosca .fatia', (fs, i) => { const f = fs[i], len = parseFloat(f.getAttribute('stroke-dasharray')), ini = -parseFloat(f.getAttribute('stroke-dashoffset')); const pt = f.getPointAtLength(ini + len / 2), m = f.getScreenCTM(); const q = new DOMPoint(pt.x, pt.y).matrixTransform(m); return { x: q.x, y: q.y }; }, i); };
const textosMeio = p => p.$$eval('#view .rosca svg > text', ts => ts.map(t => t.textContent).join(' | '));
const meio = p => p.$eval('#view .rosca .rv', t => t.textContent);
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
  ['"Pra fazer" do início só mostra o que é do mês escolhido (no mês atual, o atrasado de antes também)', async (st, abrir) => {
    st.tabelas.extrato.push(L('ZT-ESTE', { data: addDias(HOJE, 2), descricao: 'Conta deste mês', status: 'Previsto' }),
      L('ZT-PROX', { data: addMes(m0, 1) + '-10', descricao: 'Conta do mês que vem', status: 'Previsto' }),
      L('ZT-ATRAS', { data: addMes(m0, -1) + '-20', descricao: 'Conta atrasada', status: 'Previsto' }));
    const p = await abrir({ aparelho: 'iphone-15' });
    const titulos = () => p.$$eval('#view .tk .t', ts => ts.map(t => t.textContent));
    const tem = (ts, x) => ts.some(t => t.includes(x));
    let ts = await titulos();
    certo(!tem(ts, 'mês que vem'), 'no mês atual não aparece a conta do mês que vem: ' + ts);
    certo(await p.isVisible('#view h2:has-text("Pra fazer em")'), 'o título diz de qual mês é');
    const todas = await p.evaluate(() => A.c.tarefas().filter(t => !t.feita).map(t => t.titulo));
    certo(tem(todas, 'mês que vem'), 'a tarefa existe (só não aparece neste mês)');
    await clica(p, '#view .mpill [data-a=mes][data-d="1"]');
    ts = await titulos();
    certo(tem(ts, 'mês que vem') && !tem(ts, 'deste mês') && !tem(ts, 'atrasada'), 'no mês que vem: só a do mês que vem: ' + ts);
  }],
  ['Para onde foi: anel limpo, sem porcentagem fixa; no celular, tocar ou arrastar o dedo na fatia mostra a porcentagem no meio', async (st, abrir) => {
    const p = await abrir({ aparelho: 'iphone-15' });
    const d = await dadosRosca(p);
    certo(!(await p.$('#view .rosca .pf')) && !/%/.test(await textosMeio(p)), 'sem porcentagem antes de tocar');
    mesmo(await p.textContent('#view .rosca .rl'), 'saiu no mês', 'no meio, o total do mês');
    /* arrastar o dedo: encosta na 1ª fatia e vai até a 2ª (sem soltar) */
    const cdp = await p.context().newCDPSession(p), [a, b] = [await pontoFatia(p, 0), await pontoFatia(p, 1)];
    const toque = (type, pt) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pt ? [{ x: pt.x, y: pt.y }] : [] });
    await toque('touchStart', a); await p.waitForTimeout(80);
    mesmo(await meio(p), d.pcts[0] + '%', 'encostou na 1ª fatia: mostra a porcentagem dela');
    certo(await p.$eval('#view .ondefoi', e => e.classList.contains('foco')) && await p.$eval(`#view .rosca .fatia[data-v="${d.cats[0]}"]`, e => e.classList.contains('on')), 'a fatia fica em destaque e as outras apagam');
    for (let i = 1; i <= 8; i++) { await toque('touchMove', { x: a.x + (b.x - a.x) * i / 8, y: a.y + (b.y - a.y) * i / 8 }); await p.waitForTimeout(20); }
    mesmo(await meio(p), d.pcts[1] + '%', 'arrastou até a 2ª fatia: troca para a dela');
    certo((await textosMeio(p)).includes(d.cats[1].slice(0, 15)), 'e o nome da categoria');
    await toque('touchEnd'); await calmo(p);
    /* tocar: abre as subcategorias e o meio fica com a categoria tocada */
    await p.touchscreen.tap(a.x, a.y); await calmo(p);
    certo(await p.getAttribute(`#view .catl[data-v="${d.cats[0]}"]`, 'aria-expanded') === 'true', 'tocar na fatia abre as subcategorias');
    mesmo(await meio(p), d.pcts[0] + '%', 'o meio mostra a porcentagem da categoria aberta');
    await conferirLayout(p, 'para onde foi tocando');
  }],
  ['Para onde foi no computador: passar o mouse na fatia ou na linha mostra a porcentagem; tirar o mouse volta ao total', async (st, abrir) => {
    const p = await abrir({ aparelho: 'notebook' });
    const d = await dadosRosca(p), b = await pontoFatia(p, 1);
    await p.mouse.move(b.x, b.y); await p.waitForTimeout(80);
    mesmo(await meio(p), d.pcts[1] + '%', 'mouse na 2ª fatia');
    await p.mouse.move(5, 5); await p.waitForTimeout(80);
    mesmo(await p.textContent('#view .rosca .rl'), 'saiu no mês', 'tirou o mouse: volta ao total');
    certo(!(await p.$eval('#view .ondefoi', e => e.classList.contains('foco'))), 'e nada fica apagado');
    await p.hover(`#view .catl[data-v="${d.cats[2]}"]`); await p.waitForTimeout(80);
    mesmo(await meio(p), d.pcts[2] + '%', 'mouse na linha da 3ª categoria também mostra');
    await clica(p, `#view .catl[data-v="${d.cats[2]}"]`); await p.mouse.move(5, 5); await p.waitForTimeout(80);
    mesmo(await meio(p), d.pcts[2] + '%', 'clicou para abrir e tirou o mouse: o meio fica com a categoria aberta');
    await p.mouse.move(b.x, b.y); await p.mouse.move(5, 5); await p.waitForTimeout(80);
    mesmo(await meio(p), d.pcts[2] + '%', 'passou em outra fatia e saiu: volta para a aberta, não para o total');
    certo(await p.$eval(`#view .rosca .fatia[data-v="${d.cats[2]}"]`, e => e.classList.contains('on')) && await p.$eval('#view .ondefoi', e => e.classList.contains('foco')), 'a fatia aberta continua em destaque');
    await p.evaluate(c => { A.ui.cexp = c; A.render(false); }, d.cats[1]);
    mesmo(await meio(p), d.pcts[1] + '%', 'categoria aberta, antes de mexer o mouse: o meio já mostra a porcentagem dela');
    await conferirLayout(p, 'para onde foi com o mouse');
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
