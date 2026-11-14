/* Etapa 32 · Pedidos de 14/11 (v60): aba Agenda (calendário dos trabalhos + tarefas a fazer), número da aba no lugar,
   categoria sem chute (nada de "Alimentação" sempre), palpite pela descrição, tela de categorias e trabalho de vários dias com uma paga só. */
const { HOJE, calmo, clica, certo, conferirLayout } = require('../ajuda');
const addDias = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const ir = (p, view, extra) => p.evaluate(([v, x]) => { A.ui.view = v; Object.assign(A.ui, x || {}); A.render(false); }, [view, extra]);
const L = (id, desc, v) => ({ id, user_id: 'u-joao', data: HOJE, banco: 'Nubank', descricao: desc, grupo: 'Desejos', tipo: 'conta', valor: -v, categoria: '', subcategoria: '', status: 'Confirmado', parcela: '', obs: '' });
module.exports = { etapa: 'Agenda, categorias e trabalho de vários dias', testes: [
  ['aba Agenda: calendário dos trabalhos em cima, "A fazer" embaixo; o número da aba fica dentro do botão', async (st, abrir) => {
    st.tabelas.tarefas.push({ id: 'TAG1', user_id: 'u-joao', tarefa: 'Tarefa teste agenda', data: addDias(HOJE, -1), feita: false, grupo: 'darzan', obs: null });
    const p = await abrir({ aparelho: 'iphone-15' });
    certo(/Agenda/.test(await p.textContent('#tabbar .tab.mid')), 'a aba se chama Agenda');
    const cnt = await p.$('#tabbar .tab.mid .cnt');
    if (cnt) { const [b, t] = await p.evaluate(() => [document.querySelector('#tabbar .tab.mid .cnt').getBoundingClientRect(), document.querySelector('#tabbar .tab.mid').getBoundingClientRect()].map(r => [r.top, r.bottom])); certo(b[0] >= t[0] - 1 && b[1] <= t[1] + 1, `número dentro da aba (${b} / ${t})`); }
    await ir(p, 'tarefas'); await calmo(p);
    certo(await p.$('#view .cal'), 'calendário dos trabalhos na Agenda');
    certo(/A fazer/.test(await p.textContent('#view')) && /Tarefa teste agenda/i.test(await p.textContent('#tLista')), 'tarefas a fazer embaixo');
    await conferirLayout(p, 'agenda');
  }],
  ['lançamento sem categoria: abre com o palpite certo (lava-rápido = Lavagem) ou em branco, nunca em "Alimentação"', async (st, abrir) => {
    st.tabelas.extrato.push(L('LLAVA', 'PIX ENVIADO LAVA RAPIDO TESTE', 70), L('LNADA', 'PIX ENVIADO FULANO XYZ', 33));
    const p = await abrir({ aparelho: 'iphone-15' });
    await p.evaluate(() => A.acoes ? 0 : 0);
    await ir(p, 'fin', { fseg: 'extrato', filtro: 'tudo' }); await calmo(p);
    await clica(p, '#view [data-a=editL][data-id=LLAVA]');
    certo(await p.inputValue('#fC') === 'Carro e transporte' && await p.inputValue('#fS') === 'Lavagem', 'palpite: ' + await p.inputValue('#fC') + ' > ' + await p.inputValue('#fS'));
    await clica(p, '#s2 [data-a=fechar]');
    await clica(p, '#view [data-a=editL][data-id=LNADA]');
    certo(await p.inputValue('#fC') === '', 'sem palpite: categoria em branco (era "' + await p.inputValue('#fC') + '")');
    await clica(p, '#s2 .save');
    certo(/Escolha a categoria/.test(await p.textContent('body')) && !(await p.isHidden('#s2')), 'não salva sem categoria');
  }],
  ['categorias: criar subcategoria, renomear (muda os lançamentos junto) e apagar movendo para outra', async (st, abrir) => {
    st.tabelas.extrato.push(Object.assign(L('LCAT', 'Cinema teste', 40), { categoria: 'Lazer', subcategoria: 'Passeios e cinema' }));
    const p = await abrir({ aparelho: 'iphone-15' });
    await clica(p, '#view [data-a=conta]'); await clica(p, '#s2 [data-a=categorias]');
    await clica(p, '#s2 details.catg:has([data-cat="Lazer"]) summary'); /* abre a categoria */
    await clica(p, '#s2 [data-a=catNova][data-cat="Lazer"]');
    await p.fill('#cS', 'Shows teste'); await clica(p, '#s2 .save'); await calmo(p);
    certo(await p.evaluate(() => A.c.subsDe('Lazer').includes('Shows teste')), 'criou a subcategoria');
    certo(await p.$('#s2 details.catg[open] [data-cat="Lazer"]'), 'volta para a lista com Lazer aberta');
    await clica(p, '#s2 [data-a=catRen][data-cat="Lazer"][data-sub="Passeios e cinema"]');
    await p.fill('#cR', 'Cinema e passeios'); await clica(p, '#s2 .save'); await calmo(p);
    certo(st.tabelas.extrato.find(l => l.id === 'LCAT').subcategoria === 'Cinema e passeios', 'o lançamento mudou junto');
    await clica(p, '#s2 [data-a=catDel][data-cat="Lazer"][data-sub="Cinema e passeios"]');
    await p.selectOption('#cD', 'Lazer|Shows teste'); await clica(p, '#s2 .save'); await calmo(p);
    certo(st.tabelas.extrato.find(l => l.id === 'LCAT').subcategoria === 'Shows teste' && await p.evaluate(() => !A.c.subsDe('Lazer').includes('Cinema e passeios')), 'apagou e moveu o lançamento');
    await conferirLayout(p, 'categorias');
  }],
  ['trabalho de 2 dias com uma paga só: valor em branco ("a combinar"), depois o valor divide entre os dias e o pagamento liga os dois', async (st, abrir) => {
    const d1 = addDias(HOJE, 1), d2 = addDias(HOJE, 2);
    st.tabelas.dias.push({ id: 'WJ1', user_id: 'u-joao', data: d1, empresa: 'JPL SOM', descricao: 'Montagem teste', valor: null, pagamento: null, obs: null },
      { id: 'WJ2', user_id: 'u-joao', data: d2, empresa: 'JPL SOM', descricao: 'Corrida teste', valor: null, pagamento: null, obs: null });
    const p = await abrir({ aparelho: 'iphone-15' });
    await ir(p, 'trabalhos', { jseg: 'calendario', mes: d1.slice(0, 7) }); await calmo(p);
    await clica(p, '#view .diai[data-id=WJ1]');
    await p.check('#s2 input[data-jd=WJ2]'); await clica(p, '#s2 .save'); await calmo(p);
    const g = id => (st.tabelas.dias.find(d => d.id === id).obs || '').match(/Junto: (\S+)/);
    certo(g('WJ1') && g('WJ2') && g('WJ1')[1] === g('WJ2')[1], 'os dois dias no mesmo trabalho');
    const linhas = await p.$$eval('#view .diai.junto', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ')));
    certo(linhas.length === 1 && /2 dias, uma paga/.test(linhas[0]) && /valor a combinar/.test(linhas[0]), 'uma linha só, valor a combinar: ' + linhas);
    await clica(p, '#view .diai.junto'); await p.fill('#wV', '1000'); await clica(p, '#s2 .save'); await calmo(p);
    certo(['WJ1', 'WJ2'].every(id => +st.tabelas.dias.find(d => d.id === id).valor === 500), 'R$ 1.000 dividido: R$ 500 por dia');
    await conferirLayout(p, 'trabalho de vários dias');
  }],
] };
