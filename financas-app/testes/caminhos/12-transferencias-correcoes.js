/* Etapa 12 · Transferência entre as minhas contas (não é entrada nem saída) e trazer correções de um arquivo */
const { HOJE, CAPTURAS, calmo, clica, resumo, igual, certo, path, fs } = require('../ajuda');
const m0 = HOJE.slice(0, 7);
const saldo = (p, b) => p.evaluate(b => A.c.saldoBanco(b), b);
module.exports = { etapa: 'Transferências e correções', testes: [
  ['transferir entre contas: não conta como entrada nem saída, só muda o saldo dos bancos', async (st, abrir) => {
    const p = await abrir();
    const antes = await resumo(p, m0), nu = await saldo(p, 'Nubank'), it = await saldo(p, 'Inter');
    await clica(p, '#view [data-a=novoL][data-t=saida]');
    await clica(p, '#s2 [data-a=trocaTipo][data-v=transferir]');
    await p.fill('#fV', '300'); await p.selectOption('#tDe', 'Nubank'); await p.selectOption('#tPara', 'Inter');
    await clica(p, '#s2 .save'); await calmo(p);
    const L = st.linhas('extrato').filter(r => r.grupo === 'Transferência' && /^Transferência T/.test(r.obs || ''));
    certo(L.length === 2 && L.some(r => r.banco === 'Nubank' && r.valor === -300) && L.some(r => r.banco === 'Inter' && r.valor === 300), 'as duas pontas: ' + JSON.stringify(L.map(r => [r.banco, r.valor])));
    const depois = await resumo(p, m0);
    igual(depois.entr, antes.entr, 'entrou mudou'); igual(depois.saiu, antes.saiu, 'saiu mudou'); igual(depois.guardou, antes.guardou, 'guardou mudou');
    igual(await saldo(p, 'Nubank'), nu - 300, 'saldo do Nubank'); igual(await saldo(p, 'Inter'), it + 300, 'saldo do Inter');
    certo(!(await p.evaluate(() => A.c.paraRevisar('categoria').some(l => l.grupo === 'Transferência'))), 'transferência apareceu como sem categoria');
    /* editar muda as duas pontas; excluir apaga as duas; desfazer volta as duas */
    await p.evaluate(() => { A.ui.view = 'fin'; A.ui.fseg = 'extrato'; A.render(false); });
    await clica(p, `[data-a=editL][data-id="${L.find(r => r.valor > 0).id}"]`);
    await p.fill('#fV', '350'); await clica(p, '#s2 .save'); await calmo(p);
    const L2 = st.linhas('extrato').filter(r => /^Transferência T/.test(r.obs || ''));
    certo(L2.length === 2 && L2.every(r => Math.abs(r.valor) === 350), 'editar: ' + JSON.stringify(L2.map(r => r.valor)));
    await clica(p, `[data-a=editL][data-id="${L2[0].id}"]`);
    await clica(p, '#s2 [data-a=apagarTransf]'); await clica(p, '#s2 [data-a=apagarTransf]'); await calmo(p);
    certo(!st.linhas('extrato').some(r => /^Transferência T/.test(r.obs || '')), 'sobrou uma ponta');
    await clica(p, '#toast .ub'); await calmo(p);
    certo(st.linhas('extrato').filter(r => /^Transferência T/.test(r.obs || '')).length === 2, 'desfazer não trouxe as duas pontas');
  }],
  ['trazer correções: mostra antes o que vai fazer, adiciona, corrige e não repete', async (st, abrir) => {
    const p = await abrir();
    const existente = st.linhas('extrato').find(r => r.grupo === 'Renda');
    const arq = path.join(CAPTURAS, 'correcoes.json');
    fs.writeFileSync(arq, JSON.stringify({ app: 'Darzan Finanças', descricao: 'Teste de correções', abas: { EXTRATO: [
      { ID: 'LCOR-1', 'DATA': '2026-09-04', 'BANCO': 'Nubank', 'DESCRIÇÃO': 'Teste salário que faltou', 'GRUPO': 'Renda', 'TIPO': 'conta', 'VALOR': 3000, 'CATEGORIA': 'Salário CLT', 'SUB-CATEGORIA': 'Salário', 'STATUS': 'Pago', 'PARCELA': '', 'OBS': 'correção' },
      { ID: existente.id, 'CATEGORIA': 'Outras rendas', 'SUB-CATEGORIA': 'Venda' },
    ] } }));
    await clica(p, '#view [data-a=conta]'); await clica(p, '#s2 [data-a=correcoes]');
    await p.setInputFiles('#corArq', arq);
    await p.waitForSelector('#corOk');
    certo(/adicionar 1/.test(await p.textContent('#corRes')) && /corrigir 1/.test(await p.textContent('#corRes')), 'resumo: ' + await p.textContent('#corRes'));
    certo(!st.linhas('extrato').some(r => r.id === 'LCOR-1'), 'mudou antes de confirmar');
    await clica(p, '#corOk'); await calmo(p);
    const novo = st.linhas('extrato').find(r => r.id === 'LCOR-1'), mud = st.linhas('extrato').find(r => r.id === existente.id);
    certo(novo && novo.valor === 3000 && novo.grupo === 'Renda', 'não adicionou');
    certo(mud.categoria === 'Outras rendas' && mud.subcategoria === 'Venda' && mud.valor === existente.valor && mud.descricao === existente.descricao, 'correção mexeu no que não devia: ' + JSON.stringify(mud));
    await clica(p, '#view [data-a=conta]'); await clica(p, '#s2 [data-a=correcoes]');
    await p.setInputFiles('#corArq', arq);
    await p.waitForFunction(() => /Nada para mudar/.test(document.getElementById('corRes').textContent));
    fs.unlinkSync(arq);
  }],
] };
