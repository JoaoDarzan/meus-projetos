/* Etapa 33 · Conta fixa dividida com alguém (ex.: Netflix com o irmão): todo mês entra a sua parte como gasto e a parte do outro
   como reembolso, previstas; o robô confere o débito inteiro com a soma das duas. Valores inventados. */
const { HOJE, calmo, clica, certo, conferirLayout } = require('../ajuda');
const ir = (p, view, extra) => p.evaluate(([v, x]) => { A.ui.view = v; Object.assign(A.ui, x || {}); A.render(false); }, [view, extra]);
module.exports = { etapa: 'Conta fixa dividida', testes: [
  ['fixa com "Divide: 50% com Irmão": cada mês vira sua parte (gasto) + parte do irmão (reembolso), sem a linha inteira', async (st, abrir) => {
    st.tabelas.fixas.push({ id: 'FDIV', user_id: 'u-joao', descricao: 'Streaming teste', valor: 41, dia: 15, banco: 'Nubank', tipo: 'débito automático', grupo: 'Desejos', categoria: 'Assinaturas', subcategoria: 'Streaming', ativa: 'Sim', obs: 'Divide: 50% com Irmão teste' });
    const p = await abrir({ aparelho: 'iphone-15' }); await calmo(p);
    const m = HOJE.slice(0, 7).replace('-', ''), x = id => st.tabelas.extrato.find(l => l.id === id);
    const eu = x(`LDV-FFDIV${m}-EU`), ou = x(`LDV-FFDIV${m}-OUTRO`);
    certo(eu && ou, 'as duas partes do mês');
    certo(+eu.valor === -20.5 && eu.categoria === 'Assinaturas' && eu.status === 'Previsto', 'sua parte é gasto: ' + JSON.stringify(eu));
    certo(+ou.valor === -20.5 && ou.grupo === 'Reembolso' && ou.categoria === 'Reembolso' && /Irmão teste/.test(ou.descricao), 'parte do irmão é reembolso: ' + JSON.stringify(ou));
    certo(!st.tabelas.extrato.some(l => /^LFX-FDIV-/.test(l.id)), 'não cria a linha inteira junto');
    await p.reload(); await p.waitForFunction(() => window.A && A.render); await calmo(p);
    certo(st.tabelas.extrato.filter(l => l.id.startsWith(`LDV-FFDIV${m}-`)).length === 2, 'abrir de novo não repete');
  }],
  ['no formulário da conta fixa: "Divide com alguém?" e a parte da outra pessoa', async (st, abrir) => {
    st.tabelas.fixas.push({ id: 'FDV2', user_id: 'u-joao', descricao: 'Música teste', valor: 30, dia: 10, banco: 'Nubank', tipo: 'débito automático', grupo: 'Desejos', categoria: 'Assinaturas', subcategoria: 'Streaming', ativa: 'Sim', obs: 'plano família' });
    const p = await abrir({ aparelho: 'iphone-15' });
    await ir(p, 'fin', { fseg: 'fixas' }); await calmo(p);
    await clica(p, '#view [data-a=editF][data-id=FDV2]');
    await p.fill('#xQ', 'Prima teste'); await p.fill('#xP', '40');
    await conferirLayout(p, 'conta fixa dividida');
    await clica(p, '#s2 .save'); await calmo(p);
    const f = st.tabelas.fixas.find(x => x.id === 'FDV2');
    certo(/plano família/.test(f.obs) && /Divide: 40% com Prima teste/.test(f.obs), 'gravou a divisão sem perder a anotação: ' + f.obs);
    const m = HOJE.slice(0, 7).replace('-', ''), ou = st.tabelas.extrato.find(l => l.id === `LDV-FFDV2${m}-OUTRO`);
    certo(ou && +ou.valor === -12, 'parte da prima = 40% de R$ 30: ' + (ou && ou.valor));
    await clica(p, '#view [data-a=editF][data-id=FDV2]');
    certo(await p.inputValue('#xQ') === 'Prima teste' && !/Divide/.test(await p.inputValue('#xO')), 'ao editar de novo, a divisão volta nos campos e não na anotação');
  }],
] };
