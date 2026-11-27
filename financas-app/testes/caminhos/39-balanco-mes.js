/* Etapa 39 · Balanço do mês em Bancos (v71): começou com, entrou, gastos, faturas pagas, rendeu nas caixinhas,
   deveria ter x tem; app x banco (o saldo que o banco informa); avisa quando falta lançamento. Valores inventados. */
const { HOJE, calmo, certo, conferirLayout } = require('../ajuda');
const M = HOJE.slice(0, 7), antes = (() => { const d = new Date(M + '-01T12:00:00Z'); d.setUTCDate(0); return d.toISOString().slice(0, 10); })();
const L = (id, dia, valor, grupo, extra) => Object.assign({ id, user_id: 'u-joao', data: `${M}-${dia}`, banco: 'Banco Teste', tipo: 'conta', descricao: id, grupo, valor, categoria: grupo, subcategoria: '', status: 'Pago', parcela: '', obs: '' }, extra || {});
function cenario(st, { semGasto = false, bancoDiz = 1800 } = {}) {
  st.tabelas.extrato = st.tabelas.extrato.filter(l => !(l.tipo === 'conta' && String(l.data).startsWith(M))); st.tabelas.fixas = []; /* contas fixas viram lançamentos do mês sozinhas */
  st.tabelas.contas = [{ id: 'CT1', user_id: 'u-joao', banco: 'Banco Teste', conta: 'Conta', saldo_conferido: 1800, data_da_conferencia: HOJE },
    { id: 'CT2', user_id: 'u-joao', banco: 'Banco Teste', conta: 'Caixinha Teste', saldo_conferido: 5412, data_da_conferencia: HOJE, obs: 'Rende' }];
  st.tabelas.saldos = [[antes, 'Conta', 1000], [antes, 'Caixinha Teste', 5000], [HOJE, 'Conta', 1800], [HOJE, 'Caixinha Teste', 5412]]
    .map(([data, conta, saldo], i) => ({ id: 'S' + i, user_id: 'u-joao', data, banco: 'Banco Teste', conta, saldo }));
  st.tabelas.extrato.push(L('BAL-ENTROU', '05', 2000, 'Renda'), L('BAL-FATURA', '15', -500, 'Transferência', { categoria: 'Transferência', subcategoria: 'Pagamento de fatura' }),
    L('BAL-GUARDOU', '20', -400, 'Guardado', { categoria: 'Guardado', obs: 'Para Caixinha Teste · para Caixinha Teste' }),
    { id: 'LOFS-banco-teste', user_id: 'u-joao', data: HOJE, banco: 'Banco Teste', tipo: 'conta', descricao: 'Saldo no banco (Open Finance)', grupo: '', valor: bancoDiz, categoria: '', subcategoria: '', status: 'Cancelado', parcela: '', obs: '' });
  if (!semGasto) st.tabelas.extrato.push(L('BAL-GASTO', '10', -300, 'Desejos'));
}
const abrirBancos = async p => { await p.evaluate(() => { Object.assign(A.ui, { view: 'fin', fseg: 'bancos' }); A.render(false); }); await calmo(p); };
module.exports = { etapa: 'Balanço do mês', testes: [
  ['tudo explicado: começou 6.000, entrou 2.000, gastou 300, fatura 500, rendeu 12, tem 7.212 = bate', async (st, abrir) => {
    cenario(st);
    const p = await abrir({ aparelho: 'iphone-15' });
    const b = await p.evaluate(m => A.c.balancoMes(m), M);
    certo(b && b.ini === 6000 && b.fim === 7212 && b.entrou === 2000 && b.gastou === 300 && b.faturas === 500 && b.rendeu === 12 && b.deveria === 7212 && b.sobra === 0, 'contas do balanço: ' + JSON.stringify(b));
    await abrirBancos(p);
    const t = (await p.textContent('#bBalanco')).replace(/\s+/g, ' ');
    certo(/Começou com/.test(t) && /Deveria ter\s*R\$\s7\.212,00/.test(t) && /Bate\./.test(t) && /Banco Teste\s*bate/.test(t), 'quadro: ' + t);
    await conferirLayout(p, 'balanço do mês');
  }],
  ['falta um gasto no app: mostra quanto está sem explicação', async (st, abrir) => {
    cenario(st, { semGasto: true });
    const p = await abrir({ aparelho: 'iphone-15' }); await abrirBancos(p);
    const t = (await p.textContent('#bBalanco')).replace(/\s+/g, ' ');
    certo(/R\$\s300,00 a menos sem explicação/.test(t), 'não avisou o dinheiro sem explicação: ' + t);
  }],
  ['o banco informa saldo diferente do app: avisa a diferença', async (st, abrir) => {
    cenario(st, { bancoDiz: 1850 });
    const p = await abrir({ aparelho: 'iphone-15' }); await abrirBancos(p);
    const t = (await p.textContent('#bBalanco')).replace(/\s+/g, ' ');
    certo(/Banco Teste\s*banco tem R\$\s50,00 a mais/.test(t) && /Diferença de R\$\s50,00 com o banco/.test(t), 'não avisou a diferença com o banco: ' + t);
  }],
] };
