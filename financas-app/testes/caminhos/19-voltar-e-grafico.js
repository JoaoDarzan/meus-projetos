/* Etapa 19 · Botão de voltar e gráfico do "Para onde foi" */
const { HOJE, calmo, clica, certo, igual, conferirLayout } = require('../ajuda');
const estado = p => p.evaluate(() => [A.ui.view, A.ui.fseg, A.ui.jseg, A.ui.filtro].join('|'));

module.exports = { etapa: 'Voltar e Para onde foi', testes: [
  ['Para onde foi: a rosca soma o que saiu, tocar abre as subcategorias e leva aos lançamentos; voltar desfaz o caminho', async (st, abrir) => {
    /* muitas categorias no mês: as 6 maiores aparecem e o resto vira "Outras" */
    ['Teste A', 'Teste B', 'Teste C', 'Teste D', 'Teste E', 'Teste F', 'Teste G', 'Teste H'].forEach((cat, i) => st.tabelas.extrato.push({ id: 'LCAT-' + i, user_id: 'u-joao', data: HOJE, banco: 'Nubank', descricao: 'gasto ' + cat, grupo: 'Desejos', tipo: 'conta', valor: -(5 + i), categoria: cat, subcategoria: 'Sub', status: 'Pago', parcela: '', obs: '' }));
    const p = await abrir({ aparelho: 'iphone-15' });
    certo(!(await p.$('#view [data-a=voltar]')), 'na tela inicial, sem botão de voltar');
    const r = await p.evaluate(() => { const r = A.c.resumo(A.ui.mes); return { saiu: r.saiu, cats: r.cats.map(x => [x.cat, x.valor, Object.values(x.subs).reduce((s, v) => s + v, 0)]) }; });
    certo(r.cats.length >= 2, 'dados de exemplo com gastos');
    const n = await p.$$eval('#view .rosca .fatia', f => f.length);
    igual(n, Math.min(r.cats.length, 7), 'uma fatia por categoria (até 6 + "Outras")');
    const linhas = await p.$$eval('#view .catl', ls => ls.map(l => +l.querySelector('b').firstChild.textContent.replace(/[^\d,]/g, '').replace(',', '.')));
    igual(linhas.reduce((s, v) => s + v, 0), r.saiu, 'a lista soma o total que saiu');
    certo(r.cats.length > 7 && await p.isVisible('#view .catl[data-v="Outras"]'), 'mais de 6 categorias: o resto fica em "Outras"');
    await clica(p, '#view .catl[data-v="Outras"]');
    igual(await p.$$eval('#view .ofsubs .ofsub', x => x.length), r.cats.length - 6, '"Outras" abre mostrando as categorias que estão dentro');
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
] };
