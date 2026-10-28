/* Etapa 10 · Telas: todas as telas e todos os formulários em 7 tamanhos de aparelho.
   Em cada um confere: nada passa da tela, campos no lugar, letra que não faz o iPhone dar zoom,
   nada embaixo do relógio, último item não fica escondido atrás do menu. Tira foto de tudo. */
const { APARELHOS, CAPTURAS, problemasDeLayout, path } = require('../ajuda');
const TELAS = [['inicio'], ['trabalhos'], ['tarefas'], ['equip'], ['fin', 'extrato'], ['fin', 'revisar'], ['fin', 'bancos'], ['fin', 'cartoes'], ['fin', 'metas'], ['fin', 'relatorios']];
/* cada formulário: como abrir (o mesmo botão que o João toca) */
const FORMULARIOS = {
  'gastei': ['novoL', { t: 'saida' }],
  'gastei-no-cartao': ['novoL', { t: 'saida' }, `const f = document.getElementById('fF'); f.value = 'cartão'; f.dispatchEvent(new Event('change')); const n = document.getElementById('fP'); n.value = '3'; n.dispatchEvent(new Event('change'));`],
  'recebi': ['novoL', { t: 'entrada' }],
  'transferi': ['transferir', {}],
  'trazer-correcoes': ['correcoes', {}],
  'guardei': ['novoL', { t: 'guardar' }],
  'editar-lancamento': ['editL', { id: `A.db.linhas('EXTRATO').find(r => r['TIPO'] === 'conta' && r['GRUPO'] !== 'Renda').ID` }],
  'editar-parcela': ['editL', { id: `(A.db.linhas('EXTRATO').find(r => /Compra P/.test(r['OBS'])) || A.db.linhas('EXTRATO')[0]).ID` }],
  'novo-equipamento': ['novoE', {}],
  'editar-equipamento': ['editE', { id: `A.db.linhas('EQUIPAMENTOS')[0].ID` }],
  'novo-trabalho': ['novoJ', {}],
  'editar-trabalho': ['editJ', { id: `A.db.linhas('TRABALHOS')[0].ID` }],
  'nova-tarefa': ['novoT', {}],
  'conferir-banco': ['conferir', { v: `'Nubank'` }],
  'nova-caixinha': ['novaCx', { v: `'Nubank'` }],
  'cartao': ['editK', { v: `A.c.cartoes()[0]['CARTÃO']` }],
  'meta': ['novoM', {}],
  'sua-conta': ['conta', {}],
  'mudar-varios': ['rvMudar', {}, null, `A.c.lancs().slice(0, 3).forEach(l => A.ui.rvsel.add(l.id));`],
};
const testes = Object.keys(APARELHOS).map(ap => [`${ap} (${APARELHOS[ap].w}x${APARELHOS[ap].h}): telas e formulários sem nada fora do lugar`, async (st, abrir) => {
  const p = await abrir({ aparelho: ap }), ruins = [];
  const anota = (onde, r) => r.forEach(x => ruins.push(`${onde}: ${x}`));
  for (const [v, s] of TELAS) {
    await p.evaluate(([v, s]) => { A.ui.view = v; if (s) A.ui.fseg = s; A.render(false); scrollTo(0, 0); }, [v, s]);
    await p.waitForTimeout(120);
    const nome = s ? `${v}-${s}` : v;
    anota(nome, await problemasDeLayout(p));
    /* rolou até o fim: o último item aparece acima do menu de baixo */
    const escondido = await p.evaluate(() => { scrollTo(0, 1e6); const t = document.getElementById('tabbar'); if (!t.offsetParent) return 0; const ult = [...document.querySelectorAll('#view > *')].filter(e => e.getBoundingClientRect().height).pop(); return ult ? Math.round(ult.getBoundingClientRect().bottom - t.getBoundingClientRect().top) : 0; });
    if (escondido > 4) ruins.push(`${nome}: o fim da tela fica ${escondido}px escondido atrás do menu de baixo`);
    await p.evaluate(() => scrollTo(0, 0));
    await p.screenshot({ path: path.join(CAPTURAS, `${ap}-tela-${nome}.png`) });
  }
  for (const [nome, [acao, dados, depois, antes]] of Object.entries(FORMULARIOS)) {
    await p.evaluate(([acao, dados, depois, antes]) => {
      document.getElementById('scrim2').hidden = true;
      if (antes) (0, eval)(antes);
      const b = document.createElement('button'); b.dataset.a = acao;
      Object.entries(dados).forEach(([k, v]) => { b.dataset[k] = /^[A-Z(']/.test(v) ? (0, eval)(v) : v; });
      document.body.appendChild(b); b.click(); b.remove();
      if (depois) (0, eval)(depois);
    }, [acao, dados, depois || null, antes || null]);
    await p.waitForTimeout(150);
    if (await p.evaluate(() => document.getElementById('scrim2').hidden)) { ruins.push(`${nome}: o formulário não abriu`); continue; }
    anota(`formulário ${nome}`, await problemasDeLayout(p));
    await p.screenshot({ path: path.join(CAPTURAS, `${ap}-form-${nome}.png`) });
    await p.keyboard.press('Escape');
  }
  if (ruins.length) throw new Error(`${ruins.length} problema(s):\n         - ${ruins.slice(0, 12).join('\n         - ')}${ruins.length > 12 ? `\n         … e mais ${ruins.length - 12}` : ''}`);
}]);
module.exports = { etapa: 'Telas em vários aparelhos', testes };
