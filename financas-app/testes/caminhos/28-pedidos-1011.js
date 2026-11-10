/* Etapa 28 · Pedidos de 10/11: cartões do Início em vidro com a cor de cada um, Tarefas sem cara de jogo, tarefa atrasada lembra todo dia,
   equipamentos com o painel de valores (paguei x vale hoje) e Bancos com a logo de cada banco. Valores inventados. */
const { HOJE, calmo, clica, certo, igual, conferirLayout } = require('../ajuda');
const addDias = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const ir = (p, view, extra) => p.evaluate(([v, x]) => { A.ui.view = v; Object.assign(A.ui, x || {}); A.render(false); }, [view, extra]);
module.exports = { etapa: 'Pedidos de 10/11', testes: [
  ['Início: cartões em vidro com a cor de cada cartão; Tarefas sem nível, XP nem confete', async (st, abrir) => {
    const p = await abrir({ aparelho: 'iphone-15' });
    const cs = await p.$$eval('#view .gcard.glassc', xs => xs.map(x => getComputedStyle(x).getPropertyValue('--c').trim()));
    certo(cs.length >= 2 && new Set(cs).size === cs.length && cs.every(Boolean), 'cada cartão com a sua cor: ' + cs);
    await ir(p, 'tarefas');
    const t = await p.textContent('#view');
    certo(!/\bXP\b|Nv \d|nível/i.test(t) && !(await p.$('#view .miniplayer')), 'sem cara de jogo');
    certo((await p.$$eval('#view .divt', xs => xs.map(x => x.textContent))).join('|') === 'Resumo do mês|Calendário e lista', 'partes separadas com título');
    await conferirLayout(p, 'tarefas sem jogo');
  }],
  ['tarefa atrasada: o iPhone recebe um lembrete por dia até fazer (além da véspera e do dia)', async (st, abrir) => {
    st.tabelas.tarefas.push({ id: 'TATR', user_id: 'u-joao', tarefa: 'Mandar contrato teste', data: addDias(HOJE, -2), feita: false, grupo: 'darzan', obs: null },
      { id: 'TFUT', user_id: 'u-joao', tarefa: 'Gravar teste', data: addDias(HOJE, 3), feita: false, grupo: 'darzan', obs: null });
    const p = await abrir({ aparelho: 'iphone-15' });
    const av = await p.evaluate(() => A.c.avisos().map(a => [a['QUANDO'], a['TITULO']]));
    const atr = av.filter(a => /Atrasada: mandar contrato teste/i.test(a[1]));
    certo(atr.length === 7 && atr[0][0] === HOJE, 'lembra hoje e nos próximos 6 dias: ' + JSON.stringify(atr));
    const fut = av.filter(a => /gravar teste/i.test(a[1])).map(a => a[1].split(':')[0]);
    certo(fut.join() === 'Amanhã,Hoje', 'a futura continua com véspera e dia: ' + fut);
  }],
  ['equipamentos: painel com quanto paguei e quanto vale hoje (total e item por item); Bancos com a logo de cada banco', async (st, abrir) => {
    st.tabelas.equipamentos.push({ id: 'EQV1', user_id: 'u-joao', nome: 'Drone teste', tipo: 'Drone', valor: 1000, estado: 'Usado', como_pagou: 'Já tinha', data_da_compra: null, numero_de_serie: null, foto: null, obs: `Vale hoje 1500 em ${HOJE}` },
      { id: 'EQV2', user_id: 'u-joao', nome: 'Tripé teste', tipo: 'Estabilizador', valor: 0, estado: 'Usado', como_pagou: 'Já tinha', data_da_compra: null, numero_de_serie: null, foto: null, obs: `Vale hoje 100 em ${HOJE}` });
    const p = await abrir({ aparelho: 'iphone-se' });
    await ir(p, 'equip'); await calmo(p);
    const bar = (await p.textContent('#view .eqbar[data-id="EQV1"]')).replace(/\s+/g, ' ');
    certo(/Drone teste/.test(bar) && /R\$\s1\.000 → R\$\s1\.500/.test(bar), 'item: paguei → vale hoje: ' + bar);
    const larg = await p.$eval('#view .eqbar[data-id="EQV1"] .lv', e => e.style.width), larg2 = await p.$eval('#view .eqbar[data-id="EQV1"] .lp', e => e.style.width);
    certo(parseFloat(larg) > parseFloat(larg2), 'a barra do "vale hoje" é maior que a do "paguei"');
    certo(/Tripé teste/.test(await p.textContent('#view .eqval')), 'item que não custou nada também entra (vale R$ 100)');
    await conferirLayout(p, 'painel de valores dos equipamentos');
    await ir(p, 'fin', { fseg: 'bancos' }); await calmo(p);
    igual(await p.$$eval('#view .bank .bank-h .logob', x => x.length), await p.$$eval('#view .bank', x => x.length), 'cada banco com a logo');
  }],
] };
