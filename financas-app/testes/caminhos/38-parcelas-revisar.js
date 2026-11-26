/* Etapa 38 · Compra parcelada no Revisar (v68): as 3 parcelas da mesma compra do cartão aparecem uma vez só
   (contam como 1), e mudar a categoria muda todas. Vale para parcela que veio do banco sem a marca "Compra P…". Valores inventados. */
const { HOJE, calmo, clica, certo, conferirLayout } = require('../ajuda');
const addMes = (d, n) => { const [y, m, dd] = d.split('-').map(Number), x = new Date(Date.UTC(y, m - 1 + n, Math.min(dd, 28))); return x.toISOString().slice(0, 10); };
const parc = k => ({ id: 'LPARC' + k, user_id: 'u-joao', data: addMes(HOJE, k - 1), banco: 'Nubank', tipo: 'cartão', descricao: `CAGE TESTE PARCELADA ${k}/3`, grupo: 'Desejos', valor: k === 1 ? -133.34 : -133.33, categoria: '', subcategoria: '', status: k === 1 ? 'Pago' : 'Previsto', parcela: `${k}/3`, obs: `Compra POFTESTE${k === 1 ? 'A' : 'B'} · Open Finance · OF 0000000${k}-aaaa-bbbb-cccc-dddddddddddd · conferir` });
module.exports = { etapa: 'Parcelas no Revisar', testes: [
  ['compra em 3x aparece uma vez no Revisar e mudar a categoria muda as 3', async (st, abrir) => {
    st.tabelas.extrato.push(parc(1), parc(2), parc(3));
    const p = await abrir({ aparelho: 'iphone-15' });
    certo(await p.evaluate(() => A.c.contaCompras(A.c.lancs().filter(l => /^LPARC/.test(l.id))) === 1), 'as 3 parcelas deveriam contar como 1 compra');
    await p.evaluate(() => { Object.assign(A.ui, { view: 'fin', fseg: 'revisar', rvfil: 'categoria', rvq: 'cage teste' }); A.render(false); }); await calmo(p);
    const linhas = await p.$$eval('#view .rv:not(.rvg)', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ')));
    certo(linhas.length === 1 && /3 parcelas de R\$\s133,34/.test(linhas[0]) && /R\$\s400,00/.test(linhas[0]), 'deveria ser 1 linha com as 3 parcelas: ' + JSON.stringify(linhas));
    certo(/Sem categoria · \d+/.test(await p.textContent('#view .chips')), 'chips');
    await clica(p, '#view .rv-ed');
    await p.selectOption('#fC', 'Trabalho'); await p.selectOption('#fS', (await p.$$eval('#fS option', os => os.map(o => o.value).filter(Boolean)))[0]);
    await clica(p, '#s2 .save'); await calmo(p);
    const L = st.linhas('extrato').filter(r => /^LPARC/.test(r.id));
    certo(L.length === 3 && L.every(r => r.categoria === 'Trabalho'), 'as 3 parcelas não mudaram juntas: ' + JSON.stringify(L.map(r => r.categoria)));
    certo(!(await p.textContent('#view')).includes('CAGE TESTE'), 'continua no Revisar');
    await conferirLayout(p, 'parcelas no revisar');
  }],
] };
