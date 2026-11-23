/* Etapa 34 · Celular (v63): barra de baixo com as 5 abas do mesmo tamanho e nomes inteiros; Revisar com o nome
   do lançamento mais largo (valor em cima, lápis embaixo); aviso "Salvo" não cobre a barra de marcados. Valores inventados. */
const { calmo, clica, certo, preparar, conferirLayout } = require('../ajuda');
module.exports = { etapa: 'Barra e Revisar no celular', testes: [
  ['barra de baixo: 5 abas iguais e nenhum nome cortado (iPhone SE, iPhone 15 e Android de 360)', async (st, abrir) => {
    for (const o of [{ aparelho: 'iphone-se' }, { aparelho: 'iphone-15' }, { larg: 360, alt: 740 }]) {
      const p = await abrir(o);
      const abas = await p.$$eval('#tabbar .tab', ts => ts.map(t => { const s = t.querySelector('span:last-child'); return [t.getBoundingClientRect().width, s.scrollWidth, t.clientWidth, s.textContent]; }));
      const ls = abas.map(a => a[0]);
      certo(abas.length === 5 && Math.max(...ls) - Math.min(...ls) < 1, `${JSON.stringify(o)}: abas de larguras diferentes ${ls.map(Math.round)}`);
      abas.forEach(([, sw, cw, n]) => certo(sw <= cw, `${JSON.stringify(o)}: "${n}" não cabe (${sw} > ${cw})`));
    }
  }],
  ['Revisar no celular: nome do lançamento com espaço, valor e lápis na mesma coluna, "Salvo" acima da barra', async (st, abrir) => {
    const p = await abrir({ aparelho: 'iphone-se' });
    await preparar(p, [1, 2, 3].map(i => ({ 'DESCRIÇÃO': `Compra no débito teste de largura ${i}`, 'CATEGORIA': '', 'SUBCATEGORIA': '' })));
    await p.evaluate(() => { Object.assign(A.ui, { view: 'fin', fseg: 'revisar', rvfil: 'categoria', rvq: 'teste de largura' }); A.render(false); }); await calmo(p);
    const r = await p.$eval('#view .rv:not(.rvg)', el => { const b = s => el.querySelector(s).getBoundingClientRect(); return { t: b('.rv-txt .t').width, v: b('.v'), e: b('.rv-ed') }; });
    certo(r.t >= 170, 'nome do lançamento estreito demais: ' + Math.round(r.t));
    certo(r.e.top >= r.v.bottom - 1 && Math.abs(r.e.right - r.v.right) < 8, 'lápis não ficou embaixo do valor');
    await clica(p, '#view .rv-ck');
    await p.evaluate(() => { const s = document.getElementById('sync'); if (s) { s.hidden = false; s.className = 'sync ok'; } });
    const [sy, bar] = await p.evaluate(() => ['sync', null].map((id, i) => (i ? document.querySelector('.rv-barra') : document.getElementById(id))?.getBoundingClientRect()));
    certo(sy && bar && sy.bottom <= bar.top + 1, `aviso Salvo em cima da barra de marcados (${sy && Math.round(sy.bottom)} > ${bar && Math.round(bar.top)})`);
    await conferirLayout(p, 'revisar no celular');
  }],
] };
