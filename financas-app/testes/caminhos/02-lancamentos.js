/* Etapa 2 · Lançamentos: gastei, recebi, guardei, cartão parcelado, editar, excluir, desfazer, sugestão de categoria */
const { HOJE, calmo, clica, resumo, igual, certo, preparar } = require('../ajuda');
const m0 = HOJE.slice(0, 7);
module.exports = { etapa: 'Lançamentos', testes: [
  ['gastei: lançar, editar e excluir (com desfazer) e tudo chega no Supabase', async (st, abrir) => {
    const p = await abrir();
    const antes = (await resumo(p, m0)).saiu;
    await clica(p, '#view [data-a=novoL][data-t=saida]');
    await p.fill('#fV', '25,90'); await p.fill('#fD', 'Teste gasolina');
    await clica(p, '#s2 .save'); await calmo(p);
    let L = st.linhas('extrato').filter(r => r.descricao === 'Teste gasolina');
    certo(L.length === 1, 'não chegou no Supabase');
    igual(L[0].valor, -25.9, 'valor'); certo(L[0].data === HOJE, 'data: ' + L[0].data); certo(/^L/.test(L[0].id), 'ID');
    igual((await resumo(p, m0)).saiu, antes + 25.9, 'saiu do mês');
    await clica(p, `[data-a=editL][data-id="${L[0].id}"]`);
    await p.fill('#fV', '30'); await clica(p, '#s2 .save'); await calmo(p);
    igual(st.linhas('extrato').find(r => r.id === L[0].id).valor, -30, 'valor editado');
    certo(st.linhas('extrato').find(r => r.id === L[0].id).descricao === 'Teste gasolina', 'editar apagou a descrição');
    await clica(p, `[data-a=editL][data-id="${L[0].id}"]`);
    await clica(p, '#s2 [data-a=apagarL]'); await clica(p, '#s2 [data-a=apagarL]'); await calmo(p);
    certo(!st.linhas('extrato').some(r => r.id === L[0].id), 'não excluiu');
    await clica(p, '#toast .ub'); await calmo(p);
    certo(st.linhas('extrato').some(r => r.id === L[0].id && r.valor === -30), 'desfazer não trouxe de volta');
  }],
  ['recebi: entra como renda no banco escolhido', async (st, abrir) => {
    const p = await abrir();
    const antes = (await resumo(p, m0)).entr;
    await clica(p, '#view [data-a=novoL][data-t=entrada]');
    await p.fill('#fV', '850'); await p.fill('#fD', 'Teste cliente - storymaker');
    await p.selectOption('#fB', 'PicPay'); await p.selectOption('#fC', 'Darzan Produções');
    await clica(p, '#s2 .save'); await calmo(p);
    const r = st.linhas('extrato').find(x => x.descricao === 'Teste cliente - storymaker');
    certo(r && r.grupo === 'Renda' && r.valor === 850 && r.banco === 'PicPay' && r.categoria === 'Darzan Produções', 'renda gravada errada: ' + JSON.stringify(r));
    igual((await resumo(p, m0)).entr, antes + 850, 'entrou do mês');
  }],
  ['reembolso: o gasto reembolsado e o dinheiro devolvido ficam no extrato mas não contam como gasto nem renda', async (st, abrir) => {
    st.tabelas.categorias.push({ id: 'G-REEMB', user_id: 'u-joao', categoria: 'Reembolso', subcategoria: 'JPL SOM', grupo: 'Reembolso' });
    st.tabelas.extrato.push({ id: 'LTESTE-TR', user_id: 'u-joao', data: HOJE, banco: 'PicPay', descricao: 'Transferência de outra conta minha', grupo: 'Transferência', tipo: 'conta', valor: 1500, categoria: 'Transferência', subcategoria: 'Entre minhas contas', status: 'Pago', obs: 'extrato' });
    const p = await abrir();
    const antes = await resumo(p, m0);
    await clica(p, '#view [data-a=novoL][data-t=saida]');
    await p.fill('#fV', '199'); await p.fill('#fD', 'Teste hotel da viagem');
    await clica(p, '#s2 label[for=fG3]'); await clica(p, '#s2 .save'); await calmo(p);
    const g = st.linhas('extrato').find(r => r.descricao === 'Teste hotel da viagem');
    certo(g && g.grupo === 'Reembolso' && g.valor === -199, 'gasto reembolsado gravado errado: ' + JSON.stringify(g));
    igual((await resumo(p, m0)).saiu, antes.saiu, 'saiu não muda');
    certo(/reembolso/i.test(await p.locator(`[data-a=editL][data-id="${g.id}"]`).first().innerText()), 'a linha mostra "reembolso"');
    await clica(p, `[data-a=editL][data-id="${g.id}"]`);
    certo(await p.isChecked('#fG3'), 'editar abre com Reembolsado marcado');
    await p.fill('#fV', '200'); await clica(p, '#s2 .save'); await calmo(p);
    const g2 = st.linhas('extrato').find(r => r.id === g.id);
    certo(g2.grupo === 'Reembolso' && g2.valor === -200, 'editar manteve o reembolso: ' + JSON.stringify(g2));
    await clica(p, '#view [data-a=novoL][data-t=entrada]');
    await p.fill('#fV', '200'); await p.fill('#fD', 'Teste devolução do hotel');
    await p.selectOption('#fB', 'PicPay'); await p.selectOption('#fC', 'Reembolso');
    await clica(p, '#s2 .save'); await calmo(p);
    const d = st.linhas('extrato').find(r => r.descricao === 'Teste devolução do hotel');
    certo(d && d.grupo === 'Reembolso' && d.valor === 200, 'dinheiro devolvido gravado errado: ' + JSON.stringify(d));
    const depois = await resumo(p, m0);
    igual(depois.entr, antes.entr, 'entrou não muda'); igual(depois.saiu, antes.saiu, 'saiu não muda');
    // editar uma transferência que entrou não pode virar saída
    await clica(p, '[data-a=editL][data-id="LTESTE-TR"]');
    await p.fill('#fV', '1600'); await clica(p, '#s2 .save'); await calmo(p);
    igual(st.linhas('extrato').find(r => r.id === 'LTESTE-TR').valor, 1600, 'transferência que entrou continua positiva');
  }],
  ['guardei: vai para a caixinha e o saldo dela sobe', async (st, abrir) => {
    const p = await abrir();
    const cx = await p.evaluate(() => { const x = A.c.caixinhas().find(k => A.c.saldo(k) != null); return x && { nome: x['CONTA'], saldo: A.c.saldo(x) }; });
    certo(cx, 'nenhuma caixinha com saldo para testar');
    await clica(p, '#view [data-a=novoL][data-t=guardar]');
    await p.fill('#fV', '200'); await p.selectOption('#fX', cx.nome);
    await clica(p, '#s2 .save'); await calmo(p);
    const depois = await p.evaluate(n => A.c.saldo(A.c.caixinhas().find(k => k['CONTA'] === n)), cx.nome);
    igual(depois, cx.saldo + 200, 'saldo da caixinha');
    certo(st.linhas('extrato').some(x => x.grupo === 'Guardado' && x.valor === -200 && x.obs === 'Para ' + cx.nome), 'guardado não chegou certo no Supabase');
  }],
  ['compra no cartão vai para as faturas, não pesa no mês da compra; excluir apaga todas as parcelas', async (st, abrir) => {
    const p = await abrir();
    const antes = await resumo(p, m0);
    await clica(p, '#view [data-a=novoL][data-t=saida]');
    await p.fill('#fV', '300'); await p.fill('#fD', 'Teste lente');
    await p.selectOption('#fF', 'cartão'); await p.selectOption('#fB', 'Nubank'); await p.selectOption('#fP', '3');
    const aviso = await p.textContent('#avisoCartao');
    certo(/novembro/.test(aviso) && /janeiro/.test(aviso), 'aviso: ' + aviso);
    await clica(p, '#s2 .save'); await calmo(p);
    const L = st.linhas('extrato').filter(r => r.descricao === 'Teste lente').sort((a, b) => a.data < b.data ? -1 : 1);
    certo(L.map(r => r.data.slice(0, 7)).join() === '2026-11,2026-12,2027-01', 'meses: ' + L.map(r => r.data).join());
    certo(L.map(r => r.parcela).join() === '1/3,2/3,3/3', 'parcelas: ' + L.map(r => r.parcela).join());
    igual(L.reduce((s, r) => s + r.valor, 0), -300, 'soma');
    certo(st.linhas('parcelados').some(r => r.descricao === 'Teste lente' && r.parcelas === 3), 'PARCELADOS');
    igual((await resumo(p, m0)).saiu, antes.saiu, 'mês da compra mudou');
    await p.evaluate(() => { A.ui.mes = '2026-11'; A.render(false); });
    await clica(p, `[data-a=editL][data-id="${L[0].id}"]`);
    await clica(p, '#s2 [data-a=apagarCompra]'); await clica(p, '#s2 [data-a=apagarCompra]'); await calmo(p);
    certo(!st.linhas('extrato').some(r => r.descricao === 'Teste lente'), 'sobrou parcela');
    certo(!st.linhas('parcelados').some(r => r.descricao === 'Teste lente'), 'sobrou PARCELADOS');
  }],
  ['ao escrever o que foi, o app já põe a categoria que você costuma usar', async (st, abrir) => {
    const p = await abrir();
    await preparar(p, [1, 2, 3].map(i => ({ 'DESCRIÇÃO': 'Teste Posto Ipiranga', 'CATEGORIA': 'Transporte', 'SUB-CATEGORIA': 'Gasolina', 'GRUPO': 'Necessidades', 'DATA': `2026-09-0${i}` })));
    await clica(p, '#view [data-a=novoL][data-t=saida]');
    await p.fill('#fV', '120'); await p.type('#fD', 'PIX teste posto ipiranga');
    certo(await p.inputValue('#fC') === 'Transporte' && await p.inputValue('#fS') === 'Gasolina', `sugeriu ${await p.inputValue('#fC')} / ${await p.inputValue('#fS')}`);
    certo(await p.isVisible('#avisoSug'), 'não avisou que a categoria veio do histórico');
    /* se você escolheu outra categoria, o app não troca mais */
    await p.selectOption('#fC', 'Lazer'); await p.type('#fD', ' 2');
    certo(await p.inputValue('#fC') === 'Lazer', 'trocou a categoria que você escolheu');
  }],
] };
