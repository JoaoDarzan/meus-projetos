/* Etapa 35 · Pedidos de 23/11 (v64): trabalho de mais de um dia marcado no próprio formulário (montagem no sábado,
   evento no domingo, uma paga só); pagamento ligado aos dias ganha a categoria da empresa e sai do Revisar;
   barra de marcados do Revisar presa acima das abas. Valores inventados. */
const { HOJE, calmo, clica, certo, conferirLayout } = require('../ajuda');
const addDias = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const ir = (p, view, extra) => p.evaluate(([v, x]) => { A.ui.view = v; Object.assign(A.ui, x || {}); A.render(false); }, [view, extra]);
const pix = (id, data, v, extra) => Object.assign({ id, user_id: 'u-joao', data, banco: 'PicPay', descricao: 'PIX recebido', grupo: 'Renda', tipo: 'conta', valor: v, categoria: '', subcategoria: '', status: 'Pago', parcela: '', obs: 'Open Finance · OF teste · conferir' }, extra || {});
module.exports = { etapa: 'Trabalho de vários dias e pagamento', testes: [
  ['editar um dia já pago e marcar o dia anterior: vira um trabalho de 2 dias, valor dividido, Pix com categoria e fora do Revisar', async (st, abrir) => {
    const dom = addDias(HOJE, -2), sab = addDias(HOJE, -3);
    st.tabelas.extrato.push(pix('LANTJPL', addDias(HOJE, -20), 300, { categoria: 'JPL SOM', subcategoria: 'Diária de som', obs: '' }), pix('LPIX500', dom, 500));
    st.tabelas.dias.push({ id: 'WDOM', user_id: 'u-joao', data: dom, empresa: 'JPL SOM', descricao: 'Corrida teste', valor: 500, pagamento: null, obs: null });
    const p = await abrir({ aparelho: 'iphone-15' });
    await ir(p, 'trabalhos', { jseg: 'calendario', mes: dom.slice(0, 7) }); await calmo(p);
    await clica(p, '#view .diai[data-id=WDOM]');
    certo(await p.isVisible(`#s2 label[for="wX-${sab}"]`), 'não mostrou o dia anterior para marcar junto');
    await clica(p, `#s2 label[for="wX-${sab}"]`);
    certo(/todos os dias juntos/.test(await p.textContent('#s2 #wV >> xpath=ancestor::div[contains(@class,"campo")][1]')), 'o valor não virou do trabalho todo');
    await p.selectOption('#wP', 'LPIX500'); await clica(p, '#s2 .save'); await calmo(p);
    const ds = st.tabelas.dias.filter(d => d.empresa === 'JPL SOM' && [sab, dom].includes(d.data));
    const g = ds.map(d => (d.obs || '').match(/Junto: (\S+)/));
    certo(ds.length === 2 && g.every(x => x && x[1] === g[0][1]), 'os dois dias no mesmo trabalho: ' + JSON.stringify(ds.map(d => [d.data, d.obs])));
    certo(ds.every(d => +d.valor === 250 && d.pagamento === 'LPIX500'), 'R$ 500 dividido e ligado ao Pix: ' + JSON.stringify(ds.map(d => [d.valor, d.pagamento])));
    const l = st.tabelas.extrato.find(x => x.id === 'LPIX500');
    certo(l.categoria === 'JPL SOM' && l.subcategoria === 'Diária de som' && !/conferir/i.test(l.obs), 'Pix sem categoria da empresa ou ainda "conferir": ' + JSON.stringify([l.categoria, l.subcategoria, l.obs]));
    certo(await p.evaluate(() => !A.c.paraRevisar('categoria').concat(A.c.paraRevisar('conferir')).some(x => x.id === 'LPIX500')), 'o Pix continua no Revisar');
  }],
  ['dia novo com o dia seguinte marcado no formulário: 2 dias, uma paga só', async (st, abrir) => {
    const d1 = addDias(HOJE, 5), d2 = addDias(HOJE, 6);
    const p = await abrir({ aparelho: 'iphone-15' });
    await ir(p, 'trabalhos', { jseg: 'calendario', mes: d1.slice(0, 7) }); await calmo(p);
    await clica(p, `#view .cd[data-v="${d1}"]`);
    if (!(await p.isVisible('#s2 #wD'))) await clica(p, '#s2 [data-a=novoDia]');
    await p.fill('#wD', 'Montagem e evento teste'); await clica(p, `#s2 label[for="wX-${d2}"]`); await p.fill('#wV', '500');
    await clica(p, '#s2 .save'); await calmo(p);
    const ds = st.tabelas.dias.filter(d => d.descricao === 'Montagem e evento teste').sort((a, b) => a.data < b.data ? -1 : 1);
    certo(ds.length === 2 && ds[0].data === d1 && ds[1].data === d2 && ds.every(d => +d.valor === 250 && /Junto: /.test(d.obs || '')), 'dias: ' + JSON.stringify(ds.map(d => [d.data, d.valor, d.obs])));
    await conferirLayout(p, 'trabalho de 2 dias no formulário');
  }],
  ['Revisar: barra de marcados fica presa logo acima das abas, com lista curta ou rolando', async (st, abrir) => {
    st.tabelas.extrato.push(pix('LRV1', HOJE, 12.8, { descricao: 'Compra teste barra', tipo: 'conta', grupo: 'Desejos', valor: -12.8, obs: '' }));
    const p = await abrir({ aparelho: 'iphone-se' });
    await ir(p, 'fin', { fseg: 'revisar', rvfil: 'categoria', rvq: 'teste barra' }); await calmo(p);
    await clica(p, '#view .rv-ck');
    const pos = () => p.evaluate(() => { const b = document.querySelector('.rv-barra').getBoundingClientRect(), t = document.getElementById('tabbar').getBoundingClientRect(); return [Math.round(t.top - b.bottom), Math.round(b.top)]; });
    const [gap, y1] = await pos();
    certo(gap >= 0 && gap <= 14, 'barra longe das abas: ' + gap);
    await p.evaluate(() => scrollTo(0, 9999)); await p.waitForTimeout(200);
    certo((await pos())[1] === y1, 'a barra mudou de lugar ao rolar');
    await conferirLayout(p, 'revisar barra presa');
  }],
] };
