/* Etapa 36 · Agenda no computador (v66): calendário de um lado e a lista do outro, sem esticar a tela toda; no celular continua um embaixo do outro. */
const { calmo, certo, conferirLayout } = require('../ajuda');
const ir = (p, o) => p.evaluate(o => { Object.assign(A.ui, { mes: A.ui.mes || '2026-10' }, o); A.render(false); scrollTo(0, 0); }, o);
const caixa = (p, s) => p.$eval(s, e => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, w: r.width }; });
module.exports = { etapa: 'Agenda no computador', testes: [
  ['computador: Agenda e Calendário dos trabalhos em duas colunas, calendário com no máximo ~60% da largura', async (st, abrir) => {
    const p = await abrir({ larg: 1400, alt: 900 });
    for (const [nome, o, a, b] of [['Agenda', { view: 'tarefas' }, '#view .ag-pc .calw', '#view .ag-fazer'], ['Calendário', { view: 'trabalhos', jseg: 'calendario' }, '#view .cal-s', '#view .dias-s']]) {
      await ir(p, o); await calmo(p);
      const [x, y, v] = [await caixa(p, a), await caixa(p, b), await caixa(p, '#view')];
      certo(y.l >= x.r && Math.abs(y.t - x.t) < 140, `${nome}: lista não ficou ao lado do calendário (${JSON.stringify([x, y])})`);
      certo(x.w <= v.w * 0.62, `${nome}: calendário esticado (${Math.round(x.w)} de ${Math.round(v.w)})`);
      await conferirLayout(p, nome + ' no computador');
    }
  }],
  ['celular: calendário em cima e a lista embaixo, como antes', async (st, abrir) => {
    const p = await abrir({ aparelho: 'iphone-15' });
    for (const [o, a, b] of [[{ view: 'tarefas' }, '#view .ag-pc .calw', '#view .ag-fazer'], [{ view: 'trabalhos', jseg: 'calendario' }, '#view .cal-s', '#view .dias-s']]) {
      await ir(p, o); await calmo(p);
      const [x, y] = [await caixa(p, a), await caixa(p, b)];
      certo(y.t > x.t && Math.abs(y.l - x.l) < 30, 'no celular a lista não ficou embaixo: ' + JSON.stringify([x, y]));
    }
  }],
] };
