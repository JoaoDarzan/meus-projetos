/* Etapa 30 · "Para onde foi": nenhuma fatia do anel pode ser cortada (a maior aparecia só como um risquinho). */
const { calmo, certo } = require('../ajuda');
module.exports = { etapa: 'Gráfico em anel', testes: [
  ['cada fatia do anel aparece inteira, do tamanho da porcentagem', async (st, abrir) => {
    const p = await abrir({ aparelho: 'iphone-15' });
    await p.evaluate(() => { A.ui.view = 'inicio'; A.render(false); }); await calmo(p);
    const fs = await p.$$eval('#view .pizza circle.fat', cs => cs.map(c => { const r = +c.getAttribute('r'), C = 2 * Math.PI * r, len = +c.getAttribute('stroke-dasharray').split(' ')[0], off = +c.getAttribute('stroke-dashoffset'); return { C, len, ini: -off }; }));
    certo(fs.length >= 2, 'o anel tem fatias: ' + fs.length);
    fs.forEach((f, i) => certo(f.ini >= -0.01 && f.ini + f.len <= f.C + 0.5, `fatia ${i + 1} cortada (começa em ${f.ini.toFixed(1)}, tamanho ${f.len.toFixed(1)}, volta ${f.C.toFixed(1)})`));
    const soma = fs.reduce((s, f) => s + f.len, 0) / fs[0].C;
    certo(soma > 0.9, 'as fatias cobrem o anel quase todo (só os respiros): ' + soma.toFixed(2));
  }],
] };
