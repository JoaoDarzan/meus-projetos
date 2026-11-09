/* Etapa 19 · Botão de voltar e gráfico do "Para onde foi" */
const { HOJE, calmo, clica, certo, igual, conferirLayout } = require('../ajuda');
const A_brl = v => 'R$ ' + Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const estado = p => p.evaluate(() => [A.ui.view, A.ui.fseg, A.ui.jseg, A.ui.filtro].join('|'));

module.exports = { etapa: 'Voltar e Para onde foi', testes: [
  ['Para onde foi: as barras somam o que saiu, todas as categorias aparecem em ordem, tocar abre as subcategorias e leva aos lançamentos; voltar desfaz o caminho', async (st, abrir) => {
    /* muitas categorias no mês: todas aparecem, da maior para a menor (sem juntar em "Outras") */
    ['Teste A', 'Teste B', 'Teste C', 'Teste D', 'Teste E', 'Teste F', 'Teste G', 'Teste H'].forEach((cat, i) => st.tabelas.extrato.push({ id: 'LCAT-' + i, user_id: 'u-joao', data: HOJE, banco: 'Nubank', descricao: 'gasto ' + cat, grupo: 'Desejos', tipo: 'conta', valor: -(5 + i), categoria: cat, subcategoria: 'Sub', status: 'Pago', parcela: '', obs: '' }));
    const p = await abrir({ aparelho: 'iphone-15' });
    certo(!(await p.$('#view [data-a=voltar]')), 'na tela inicial, sem botão de voltar');
    const r = await p.evaluate(() => { const r = A.c.resumo(A.ui.mes); return { saiu: r.saiu, cats: r.cats.map(x => [x.cat, x.valor, Object.values(x.subs).reduce((s, v) => s + v, 0)]) }; });
    certo(r.cats.length >= 2, 'dados de exemplo com gastos');
    const linhas = await p.$$eval('#view .catl', ls => ls.map(l => [l.dataset.v, +l.querySelector('b').textContent.replace(/[^\d,]/g, '').replace(',', '.')]));
    igual(linhas.length, r.cats.length, 'uma barra por categoria');
    certo(linhas.every((x, i) => x[0] === r.cats[i][0]) && !linhas.some(x => x[0] === 'Outras'), 'na ordem do maior para o menor, sem "Outras"');
    igual(linhas.reduce((s, x) => s + x[1], 0), r.saiu, 'a lista soma o total que saiu');
    igual(await p.$$eval('#view .ofbar i', x => x.length), r.cats.length, 'a faixa de cima tem um pedaço por categoria');
    const larg = await p.$$eval('#view .catl .ofb i', x => x.map(i => parseFloat(i.style.width)));
    certo(larg[0] === 100 && larg.every((w, i) => !i || w <= larg[i - 1]), 'a maior barra é cheia e as outras diminuem: ' + larg.join(','));
    const [cat, valor, somaSubs] = r.cats[0];
    igual(somaSubs, valor, 'subcategorias somam a categoria');
    await clica(p, `#view .catl[data-v="${cat}"]`);
    certo(await p.getAttribute(`#view .catl[data-v="${cat}"]`, 'aria-expanded') === 'true' && await p.isVisible('#view .ofsubs'), 'tocar abre as subcategorias');
    await conferirLayout(p, 'para onde foi aberto');
    await clica(p, '#view .ofsubs [data-a=filtroCat]');
    certo(await estado(p) === `fin|extrato|quadro|cat:${cat}`, 'foi para o extrato filtrado: ' + await estado(p));
    certo(await p.isVisible('#view .bar [data-a=voltar]'), 'aparece o botão de voltar');
    await clica(p, '#view .bar [data-a=voltar]'); await p.waitForTimeout(300);
    certo(await estado(p) === 'inicio|extrato|quadro|tudo', 'voltar volta para o início sem o filtro: ' + await estado(p));
  }],
  ['voltar passo a passo pelas abas e seções; o "voltar" do celular fecha a janela aberta antes de voltar a tela', async (st, abrir) => {
    const p = await abrir({ aparelho: 'iphone-15' });
    await clica(p, '#tabbar [data-a=go][data-v=trabalhos]');
    await clica(p, '#view [data-a=seg][data-s=jseg][data-v=balanco]');
    await clica(p, '#tabbar [data-a=go][data-v=fin]');
    await clica(p, '#view [data-a=seg][data-s=fseg][data-v=bancos]');
    certo(await estado(p) === 'fin|bancos|balanco|tudo', 'chegou em Finanças › Bancos');
    await clica(p, '#view .bar [data-a=voltar]'); await p.waitForTimeout(300);
    certo(await estado(p) === 'fin|extrato|balanco|tudo', '1 passo: Finanças › Extrato — ' + await estado(p));
    /* janela aberta + voltar do celular: fecha a janela e fica na mesma tela */
    await clica(p, '[data-a=fab]');
    await p.waitForSelector('#scrim2:not([hidden])');
    await p.goBack(); await p.waitForTimeout(300);
    certo(await p.$('#scrim2[hidden]') && await estado(p) === 'fin|extrato|balanco|tudo', 'o voltar do celular fechou a janela e ficou na tela: ' + await estado(p));
    await p.goBack(); await p.waitForTimeout(300);
    certo(await estado(p) === 'trabalhos|extrato|balanco|tudo', '2 passos: Trabalhos › Balanço — ' + await estado(p));
    await clica(p, '#view .bar [data-a=voltar]'); await p.waitForTimeout(300);
    certo(await estado(p) === 'trabalhos|extrato|quadro|tudo', '3 passos: Trabalhos › Quadro — ' + await estado(p));
    await clica(p, '#view .bar [data-a=voltar]'); await p.waitForTimeout(300);
    certo(await estado(p) === 'inicio|extrato|quadro|tudo' && !(await p.$('#view [data-a=voltar]')), 'de volta ao início, sem mais botão de voltar: ' + await estado(p));
    await calmo(p);
  }],
  ['o voltar não é "desfazer": no início nunca aparece, chegando no início o caminho recomeça, e a casinha leva direto ao início', async (st, abrir) => {
    const p = await abrir({ aparelho: 'iphone-15' });
    /* passeia e volta para o início pela barra de baixo */
    await clica(p, '#tabbar [data-a=go][data-v=trabalhos]');
    await clica(p, '#view [data-a=seg][data-s=jseg][data-v=balanco]');
    await clica(p, '#tabbar [data-a=go][data-v=inicio]');
    certo(!(await p.$('#view [data-a=voltar]')) && !(await p.$('#view .casa')), 'no início não tem voltar nem casinha');
    /* do início para Finanças: voltar vai direto ao início (não para os trabalhos de antes) */
    await clica(p, '#tabbar [data-a=go][data-v=fin]');
    certo(await p.isVisible('#view .bar [data-a=voltar]') && await p.isVisible('#view .bar .casa'), 'fora do início: voltar e casinha');
    await clica(p, '#view .bar [data-a=voltar]'); await p.waitForTimeout(300);
    certo((await estado(p)).startsWith('inicio|') && !(await p.$('#view [data-a=voltar]')), 'voltou ao início e parou: ' + await estado(p));
    /* clicar em voltar de novo não existe; o "voltar" do celular também não sai do início para outra tela */
    await p.goBack().catch(() => { }); await p.waitForTimeout(300);
    certo((await estado(p)).startsWith('inicio|'), 'o voltar do celular no início não voltou para outra tela: ' + await estado(p));
    /* casinha: de qualquer lugar, direto ao início */
    await clica(p, '#tabbar [data-a=go][data-v=trabalhos]');
    await clica(p, '#view [data-a=seg][data-s=jseg][data-v=recorrentes]');
    await clica(p, '#tabbar [data-a=go][data-v=fin]');
    await clica(p, '#view [data-a=seg][data-s=fseg][data-v=cartoes]');
    await clica(p, '#view .bar .casa'); await p.waitForTimeout(300);
    certo((await estado(p)).startsWith('inicio|') && !(await p.$('#view [data-a=voltar]')), 'a casinha levou direto ao início: ' + await estado(p));
  }],
  ['início: cartões com a fatura do mês escolhido, bancos só com a conta corrente e o ícone do banco, Entrou/Saiu/Guardou coloridos', async (st, abrir) => {
    const p = await abrir({ aparelho: 'iphone-15' });
    const m = await p.evaluate(() => A.ui.mes);
    const nomes = await p.$$eval('#view .rail .gcard .k', ks => ks.map(k => k.textContent));
    certo(nomes.length && nomes.every(t => t === 'Fatura de ' + new Date(m + '-15T12:00').toLocaleDateString('pt-BR', { month: 'long' })), 'cartões com a fatura do mês escolhido: ' + nomes + ' / ' + m);
    const esperado = await p.evaluate(() => A.c.contas().filter(x => A.u.sem(x['CONTA']) === 'conta').map(x => [x['BANCO'], A.c.saldo(x)]));
    const pills = await p.$$eval('#view .bp[data-a=irBancos][aria-label]', bs => bs.map(b => [b.getAttribute('aria-label'), !!b.querySelector('.logob')]));
    igual(pills.length, esperado.length, 'um por conta corrente');
    certo(pills.every(([, logo]) => logo), 'cada banco com o ícone');
    certo(esperado.every(([b, v], i) => pills[i][0].startsWith(b + ':') && (v == null || pills[i][0].includes(A_brl(v)))), 'só o saldo da conta corrente: ' + JSON.stringify(pills));
    const vis = await p.$$eval('#view .bp[data-a=irBancos][aria-label] b', bs => bs.map(b => b.textContent));
    certo(esperado.every(([, v], i) => v == null || vis[i] === A_brl(v)) && vis.some(t => /,\d\d$/.test(t)), 'no início, o saldo de cada banco com os centavos, sem arredondar: ' + vis);
    const cores = await p.$$eval('#view .flows .flow b', bs => bs.map(b => getComputedStyle(b).color));
    certo(new Set(cores).size === 3, 'Entrou, Saiu e Guardou com cores diferentes: ' + cores);
  }],
] };
