/* Etapa 3 · Revisar: consertar vários de uma vez (banco, categoria, conferir), sugestões e "mudar os parecidos" */
const { calmo, clica, certo, preparar } = require('../ajuda');
async function abrirRevisar(p, filtro, busca) {
  await p.evaluate(() => { A.ui.fseg = 'revisar'; A.ui.view = 'fin'; A.render(false); });
  await clica(p, `[data-a=seg][data-s=rvfil][data-v=${filtro}]`);
  if (busca) { await p.fill('#rvBusca', busca); await p.waitForTimeout(80); }
}
module.exports = { etapa: 'Revisar', testes: [
  ['trocar o banco de vários de uma vez (e desfazer)', async (st, abrir) => {
    const p = await abrir();
    await preparar(p, [1, 2, 3, 4].map(i => ({ 'DESCRIÇÃO': `Teste revisar ${i}`, 'BANCO': 'Não informado' })));
    certo(await p.isVisible('.rv-aviso'), 'a tela inicial não mostrou o aviso de revisar');
    await clica(p, '.rv-aviso');
    await abrirRevisar(p, 'banco', 'teste revisar');
    await clica(p, '[data-a=rvTodos]');
    certo(await p.textContent('.rv-barra b') === '4 marcados', 'marcou: ' + await p.textContent('.rv-barra b'));
    await clica(p, '[data-a=rvMudar]');
    await p.selectOption('#mB', 'Inter'); await clica(p, '#s2 .save'); await calmo(p);
    const L = st.linhas('extrato').filter(r => /^Teste revisar/.test(r.descricao));
    certo(L.length === 4 && L.every(r => r.banco === 'Inter'), 'bancos no Supabase: ' + L.map(r => r.banco).join());
    certo(!(await p.textContent('#view')).includes('Teste revisar'), 'continuaram na lista de sem banco');
    await clica(p, '#toast .ub'); await calmo(p);
    certo(st.linhas('extrato').filter(r => /^Teste revisar/.test(r.descricao)).every(r => r.banco === 'Não informado'), 'desfazer não voltou os bancos');
  }],
  ['marcar o mês inteiro de uma vez', async (st, abrir) => {
    const p = await abrir();
    await preparar(p, [['2026-08-03', 'a'], ['2026-08-20', 'b'], ['2026-07-11', 'c']].map(([d, x]) => ({ 'DATA': d, 'DESCRIÇÃO': 'Teste mês ' + x, 'BANCO': 'Não informado' })));
    await abrirRevisar(p, 'banco', 'teste mês');
    await clica(p, '[data-a=rvMes][data-v="2026-08"]');
    certo(await p.textContent('.rv-barra b') === '2 marcados', 'marcou: ' + await p.textContent('.rv-barra b'));
  }],
  ['sem categoria: usar as sugestões do histórico', async (st, abrir) => {
    const p = await abrir();
    await preparar(p, [
      ...[1, 2, 3].map(i => ({ 'DESCRIÇÃO': 'Teste Uber Trip', 'CATEGORIA': 'Transporte', 'SUB-CATEGORIA': 'Uber/99', 'GRUPO': 'Necessidades', 'DATA': `2026-08-0${i}` })),
      ...[1, 2].map(i => ({ 'DESCRIÇÃO': 'UBER teste uber trip', 'CATEGORIA': 'Outros', 'SUB-CATEGORIA': 'Outros', 'DATA': `2026-09-1${i}` })),
    ]);
    await abrirRevisar(p, 'categoria', 'uber trip');
    certo((await p.textContent('#view')).includes('Sugestão: Transporte'), 'não mostrou a sugestão');
    await clica(p, '[data-a=rvTodos]');
    await clica(p, '[data-a=rvSugestoes]'); await calmo(p);
    const L = st.linhas('extrato').filter(r => r.descricao === 'UBER teste uber trip');
    certo(L.length === 2 && L.every(r => r.categoria === 'Transporte' && r.subcategoria === 'Uber/99' && r.grupo === 'Necessidades'), 'sugestão aplicada errada: ' + JSON.stringify(L.map(r => [r.categoria, r.subcategoria, r.grupo])));
  }],
  ['para conferir: marcar como conferido tira o aviso', async (st, abrir) => {
    const p = await abrir();
    await preparar(p, [{ 'DESCRIÇÃO': 'Teste conferir', 'OBS': 'Conferir: era JPL?' }]);
    await abrirRevisar(p, 'conferir', 'teste conferir');
    await clica(p, '[data-a=rvTodos]'); await clica(p, '[data-a=rvMudar]');
    certo(await p.isChecked('#mOk'), 'conferido não veio marcado');
    await clica(p, '#s2 .save'); await calmo(p);
    const r = st.linhas('extrato').find(x => x.descricao === 'Teste conferir');
    certo(!/conferir/i.test(r.obs || ''), 'ficou o aviso: ' + r.obs);
  }],
  ['mudou a categoria de um? o app oferece mudar os parecidos', async (st, abrir) => {
    const p = await abrir();
    await preparar(p, [1, 2, 3].map(i => ({ 'DESCRIÇÃO': 'Teste Padaria Pão Quente', 'DATA': `2026-10-0${i}` })));
    const id = st.linhas('extrato').find(r => r.descricao === 'Teste Padaria Pão Quente').id;
    await p.evaluate(() => { A.ui.view = 'fin'; A.ui.fseg = 'extrato'; A.render(false); });
    await clica(p, `[data-a=editL][data-id="${id}"]`);
    await p.selectOption('#fC', 'Alimentação'); await p.selectOption('#fS', 'Padaria');
    await clica(p, '#s2 .save'); await calmo(p);
    certo(/outros 2/.test(await p.textContent('#toast')), 'não ofereceu: ' + await p.textContent('#toast'));
    await clica(p, '#toast .ub'); await calmo(p);
    const L = st.linhas('extrato').filter(r => r.descricao === 'Teste Padaria Pão Quente');
    certo(L.every(r => r.categoria === 'Alimentação' && r.subcategoria === 'Padaria' && r.grupo === 'Necessidades'), 'parecidos: ' + JSON.stringify(L.map(r => [r.categoria, r.subcategoria, r.grupo])));
  }],
] };
