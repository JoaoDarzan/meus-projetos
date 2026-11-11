/* Etapa 31 · Visual mais calmo (v59): ícones neutros, gráfico numa cor só, sino com pontinho, banco zerado escondido,
   aba do meio igual às outras, extrato com o total de cada dia e cartão de equipamento limpo. Valores inventados. */
const { HOJE, calmo, certo, conferirLayout } = require('../ajuda');
const ir = (p, view, extra) => p.evaluate(([v, x]) => { A.ui.view = v; Object.assign(A.ui, x || {}); A.render(false); }, [view, extra]);
module.exports = { etapa: 'Visual calmo', testes: [
  ['Início: ícones sem cor forte, gráfico em tons de uma cor, aba Tarefas do mesmo tamanho das outras, banco zerado não aparece', async (st, abrir) => {
    const cc = st.tabelas.contas.find(c => /conta/i.test(c.conta || ''));
    if (cc) st.tabelas.contas.push(Object.assign({}, cc, { id: 'CZERO', banco: 'Banco Zerado Teste', saldo_conferido: 0, data_da_conferencia: HOJE }));
    const p = await abrir({ aparelho: 'iphone-15' });
    const bgs = await p.$$eval('#view .ti', ts => [...new Set(ts.map(t => getComputedStyle(t).backgroundImage + getComputedStyle(t).backgroundColor))]);
    certo(bgs.length === 1, 'todos os ícones com o mesmo fundo discreto: ' + bgs.length);
    const cores = await p.$$eval('#view .pizza circle.fat', cs => cs.map(c => getComputedStyle(c).stroke.match(/\d+/g).map(Number)));
    certo(cores.length >= 2 && cores.every(([r, g, b]) => b >= r && b >= g), 'fatias em tons de azul: ' + JSON.stringify(cores));
    const [hm, ho] = await p.$$eval('#tabbar .tab', ts => [ts.find(t => t.classList.contains('mid')), ts.find(t => !t.classList.contains('mid'))].map(t => t.getBoundingClientRect().height));
    certo(Math.abs(hm - ho) < 2, `aba Tarefas da mesma altura (${hm} x ${ho})`);
    certo(!/Banco Zerado Teste/.test(await p.textContent('#view .bankpills')), 'banco com R$ 0,00 não aparece no Início');
    await conferirLayout(p, 'início calmo');
  }],
  ['Extrato: cada dia mostra o total do dia ao lado da data', async (st, abrir) => {
    const p = await abrir({ aparelho: 'iphone-15' });
    await ir(p, 'fin', { fseg: 'extrato', filtro: 'tudo' }); await calmo(p);
    const dias = await p.$$eval('#view .day', ds => ds.slice(0, 3).map(d => {
      let s = 0, n = d.nextElementSibling;
      while (n && !n.classList.contains('day')) { const v = n.querySelector('.v'); if (v) s += +v.textContent.replace(/[^\d,−+-]/g, '').replace(/[−]/, '-').replace(/\./g, '').replace(',', '.'); n = n.nextElementSibling; }
      return [d.querySelector('b')?.textContent || '', Math.round(s * 100) / 100];
    }));
    certo(dias.length, 'tem dias no extrato');
    dias.forEach(([t, s]) => { const v = +t.replace(/[^\d,]/g, '').replace(',', '.') * (/−/.test(t) ? -1 : 1); certo(Math.abs(v - s) < 0.01, `total do dia ${t} = soma das linhas ${s}`); });
  }],
] };
