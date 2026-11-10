/* Etapa 26 · Caixinhas conferidas todo dia e quanto renderam (tabela saldos, gravada pelo robô do Open Finance) e metas como potes
   (o dinheiro fica numa caixinha de verdade e o app separa quanto é de cada meta). Valores inventados. */
const { HOJE, clica, calmo, certo, conferirLayout } = require('../ajuda');
const addDias = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const txt = (p, sel) => p.textContent(sel).then(t => t.replace(/\s+/g, ' '));
/* a Caixinha Reserva (Nubank) conferida hoje pelo robô em R$ 5.000; você guardou R$ 200 nela há 5 dias; fotos do fim do mês passado, de há 10 dias e de ontem */
function caixinhaComFotos(st) {
  const cx = st.tabelas.contas.find(c => c.conta === 'Caixinha Reserva');
  Object.assign(cx, { saldo_conferido: 5000, data_da_conferencia: HOJE });
  st.tabelas.extrato = st.tabelas.extrato.filter(l => !/Para Caixinha Reserva/.test(l.obs || ''));
  st.tabelas.extrato.push({ id: 'LGUARD-TESTE', user_id: 'u-joao', data: addDias(HOJE, -5), banco: 'Nubank', descricao: 'Guardado', grupo: 'Guardado', tipo: 'conta', valor: -200, categoria: 'Guardado', subcategoria: 'Caixinha', status: 'Pago', parcela: '', obs: 'Para Caixinha Reserva' });
  const fimAnt = addDias(HOJE.slice(0, 7) + '-01', -1);
  [[fimAnt, 4500], [addDias(HOJE, -10), 4700], [addDias(HOJE, -1), 4996.79]].forEach(([data, saldo]) => st.tabelas.saldos.push({ id: `Z${data}-C2`, user_id: 'u-joao', data, banco: 'Nubank', conta: 'Caixinha Reserva', saldo, obs: 'conferido pelo banco (Open Finance)' }));
}
const irBancos = async p => { await p.evaluate(() => { Object.assign(A.ui, { view: 'fin', fseg: 'bancos' }); A.render(false); }); await p.waitForSelector('#view .bank'); };

module.exports = { etapa: 'Caixinhas e potes', testes: [
  ['caixinhas: quanto rendeu ontem e no mês (cresceu menos o que você guardou), o fim do mês passado e o gráfico dia a dia', async (st, abrir) => {
    caixinhaComFotos(st);
    const p = await abrir({ aparelho: 'iphone-15' });
    await irBancos(p);
    const card = await txt(p, '#cxRende');
    certo(/Rendeu ontem\s*\+ R\$ 3,21/.test(card), 'rendeu ontem = 5.000 − 4.996,79: ' + card);
    certo(/Rendeu no mês\s*\+ R\$ 300,00/.test(card), 'no mês = 5.000 − 4.500 − 200 guardados: ' + card);
    certo(/Fim do mês passado\s*R\$ 4\.500,00.*cresceu R\$ 500,00 até hoje/.test(card), 'fim do mês passado: ' + card);
    certo(await p.$$eval('#cxRende svg.cxg circle', cs => cs.length) === 4, 'gráfico com um ponto por dia de foto (3 fotos + hoje)');
    const linhas = await p.$$eval('#view .bank .sub-row', rs => rs.map(r => r.textContent.replace(/\s+/g, ' ')));
    const linha = linhas.find(t => /Caixinha Reserva/.test(t)) || '';
    certo(/Conferido hoje/.test(linha) && /rendeu R\$ 300,00 no mês/.test(linha), 'a caixinha mostra que foi conferida hoje e quanto rendeu: ' + linha);
    await conferirLayout(p, 'caixinhas rendendo');
  }],
  ['bruto e líquido: as caixinhas ficam no bruto, e cada banco mostra quanto cai se sacar hoje e o imposto (o que o banco informou pelo Open Finance)', async (st, abrir) => {
    caixinhaComFotos(st);
    st.tabelas.extrato.push({ id: 'LOFI-nubank', user_id: 'u-joao', data: HOJE, banco: 'Nubank', descricao: 'Guardado no banco (Open Finance)', grupo: 'Guardado', tipo: 'conta', valor: 5000, categoria: '', subcategoria: '', status: 'Cancelado', parcela: '',
      obs: `Open Finance · total bruto das caixinhas/aplicações (3) informado pelo banco em ${HOJE} · líquido 4940.25 · IR 59.75 · IOF 0.00 · só para conferência` });
    const p = await abrir({ aparelho: 'iphone-15' });
    await irBancos(p);
    const linha = async b => { const t = await p.$$eval('#tbBancos tbody tr', (rs, b) => { const r = rs.find(x => x.cells[0].textContent.trim() === b); return r ? [...r.cells].map(c => c.textContent.trim()) : null; }, b);
      const n = v => +String(v).replace(/[^\d,-]/g, '').replace(',', '.'); return t && { bruto: n(t[1]), liquido: n(t[2]), rendeu: t[3] }; };
    const nu = await linha('Nubank'), saldoNu = await p.evaluate(() => A.c.saldoBanco('Nubank'));
    certo(nu && nu.bruto === saldoNu && Math.round((nu.bruto - nu.liquido) * 100) === 5975 && /\+ R\$ 300,00/.test(nu.rendeu), 'Nubank: bruto = o que o app do banco mostra, líquido = bruto − imposto, e quanto rendeu no mês: ' + JSON.stringify(nu));
    const topo = await txt(p, '#bResumo');
    certo(/Se sacar tudo hoje: R\$ [\d.]+,\d\d · imposto R\$ 59,75/.test(topo) && /Total/.test(topo), 'o topo mostra o líquido total e o imposto: ' + topo.slice(0, 200));
    await clica(p, '#view [data-a=conferir][data-v="Nubank"]');
    certo(/valor bruto/.test(await txt(p, '#s2')), 'a conferência explica que nas caixinhas vai o valor bruto');
    /* banco que mostra o líquido no app (como o PicPay): o app explica que as caixinhas já estão no líquido e a conferência pede o valor que aparece */
    await p.evaluate(() => { const cx = A.db.linhas('CONTAS').find(x => x['CONTA'] === 'Caixinha Reserva'); A.db.salvar('CONTAS', { ID: cx.ID, 'OBS': 'Rende 100% do CDI · o app do banco mostra o valor líquido' }); A.fechar && A.fechar(); });
    await p.keyboard.press('Escape').catch(() => {}); await irBancos(p);
    const nu2 = await linha('Nubank'), saldoNu2 = await p.evaluate(() => A.c.saldoBanco('Nubank'));
    certo(nu2.liquido === saldoNu2 && Math.round((nu2.bruto - nu2.liquido) * 100) === 5975, 'banco que mostra o líquido: o app já está no líquido e o bruto soma o imposto: ' + JSON.stringify(nu2));
    await clica(p, '#view [data-a=conferir][data-v="Nubank"]');
    certo(/já é o líquido/.test(await txt(p, '#s2')), 'a conferência explica que o valor do app já é o líquido');
  }],
  ['sem a tabela de saldos no Supabase: avisa o passo e o resto de Bancos funciona', async (st, abrir) => {
    st.semTabela('saldos');
    const p = await abrir({ aparelho: 'iphone-15' });
    await irBancos(p);
    certo(/atualizacao-saldos\.sql/.test(await txt(p, '#cxRende')), 'avisa o passo do Supabase');
    certo((await p.$$('#view .bank')).length >= 2 && /Caixinha Reserva/.test(await txt(p, '#view')), 'os bancos e caixinhas continuam aparecendo');
  }],
  ['metas como potes: Guardei pergunta o pote, a meta enche sozinha e a caixinha mostra os potes e o que está livre; editar mantém caixinha e pote', async (st, abrir) => {
    caixinhaComFotos(st);
    st.tabelas.metas.push({ id: 'M9', user_id: 'u-joao', meta: 'Viagem teste', valor_alvo: 1000, ja_guardado: 100, onde_esta: 'Caixinha Reserva', prazo: null, obs: '' });
    const p = await abrir({ aparelho: 'iphone-15' });
    await clica(p, '#view [data-a=novoL][data-t=guardar]');
    await p.fill('#fV', '50'); await p.selectOption('#fX', 'Caixinha Reserva'); await p.selectOption('#fPt', 'M9');
    await clica(p, '#s2 .save'); await calmo(p);
    const L = st.linhas('extrato').filter(r => r.grupo === 'Guardado' && r.valor === -50);
    certo(L.length === 1 && L[0].obs === 'Para Caixinha Reserva · Pote M9', 'gravou a caixinha e o pote: ' + JSON.stringify(L.map(r => r.obs)));
    certo(await p.evaluate(() => A.c.noPote(A.db.achar('METAS', 'M9'))) === 150, 'o pote tem o que já estava separado (100) + o que você guardou nele (50)');
    await irBancos(p);
    const potes = await txt(p, '#view .potes');
    certo(/Viagem teste R\$ 150,00/.test(potes) && /Livre R\$ 4\.850,00/.test(potes), 'a caixinha mostra o pote e o que sobra livre: ' + potes);
    await p.evaluate(() => { Object.assign(A.ui, { view: 'fin', fseg: 'metas' }); A.render(false); });
    const metas = await txt(p, '#view .goals');
    certo(/Viagem teste.*R\$ 150 de R\$ 1\.000/.test(metas) && /15%/.test(metas), 'a meta mostra 15%: ' + metas);
    await p.evaluate(() => { Object.assign(A.ui, { view: 'fin', fseg: 'extrato' }); A.render(false); });
    await clica(p, `#view [data-a=editL][data-id="${L[0].id}"]`);
    certo(await p.inputValue('#fX') === 'Caixinha Reserva' && await p.inputValue('#fPt') === 'M9' && !/Pote|Para/.test(await p.inputValue('#fO')), 'editar mantém a caixinha e o pote, e a anotação fica limpa');
    await conferirLayout(p, 'guardei com pote');
  }],
  ['meta com parte fixa da caixinha (70% da Reserva): o pote acompanha o saldo, a caixinha mostra o resto livre e o formulário guarda a porcentagem', async (st, abrir) => {
    caixinhaComFotos(st);
    st.tabelas.metas.push({ id: 'M8', user_id: 'u-joao', meta: 'Apê teste', valor_alvo: 100000, ja_guardado: 0, onde_esta: 'Caixinha Reserva', prazo: null, obs: '70% da caixinha' });
    const p = await abrir({ aparelho: 'iphone-15' });
    certo(await p.evaluate(() => A.c.noPote(A.db.achar('METAS', 'M8'))) === 3500, 'o pote é 70% dos R$ 5.000 da caixinha');
    await irBancos(p);
    const potes = await txt(p, '#view .potes');
    certo(/Apê teste R\$ 3\.500,00/.test(potes) && /Livre R\$ 1\.500,00/.test(potes), 'a caixinha mostra a parte do apê e o resto livre: ' + potes);
    await p.evaluate(() => { Object.assign(A.ui, { view: 'fin', fseg: 'metas' }); A.render(false); });
    certo(/70% da Caixinha Reserva/.test(await txt(p, '#view .goals')), 'a meta diz que é 70% da caixinha');
    await clica(p, '#view [data-a=editM][data-id="M8"]');
    certo(await p.inputValue('#gPc') === '70', 'o formulário mostra os 70%');
    await p.fill('#gPc', '50'); await clica(p, '#s2 .save'); await calmo(p);
    certo(st.linhas('metas').find(m => m.id === 'M8').obs === '50% da caixinha', 'salvou 50%: ' + st.linhas('metas').find(m => m.id === 'M8').obs);
  }],
  ['tela inicial nova: dinheiro nos bancos em cima, 6 atalhos, caixinhas e metas deslizando; a barra tem 4 abas e "Mais" leva às Tarefas', async (st, abrir) => {
    caixinhaComFotos(st);
    st.tabelas.metas.push({ id: 'M7', user_id: 'u-joao', meta: 'Meta inicial teste', valor_alvo: 1000, ja_guardado: 250, onde_esta: 'Caixinha Reserva', prazo: null, obs: '' });
    const p = await abrir({ aparelho: 'iphone-15' });
    const B = await p.evaluate(() => A.c.bancosComConta().map(A.c.resumoBanco).reduce((t, x) => t + x.bruto, 0));
    const topo = await txt(p, '#view .hero .bal');
    certo(/Dinheiro nos bancos/.test(topo) && await p.$eval('#view .hero .bal .big', e => +e.dataset.cnt) === Math.round(B * 100) / 100, 'o número grande é o dinheiro nos bancos: ' + topo);
    certo(await p.$$eval('#view .atalhos .at', a => a.length) === 6, 'seis atalhos');
    const rail = await txt(p, '#hCaixinhas');
    certo(/Meta inicial teste\s*R\$ 250,00/.test(rail) && /25% de/.test(rail) && /Reserva\s*R\$ 5\.000,00/.test(rail), 'metas e caixinhas na tela inicial: ' + rail);
    certo(await p.$$eval('#tabbar .tab', t => t.length) === 4 && !(await p.$('#tabbar [data-v=tarefas]')), 'a barra tem 4 abas');
    await clica(p, '#tabbar [data-a=mais]');
    await clica(p, '#s2 [data-a=maisIr][data-v=tarefas]');
    certo(await p.evaluate(() => A.ui.view) === 'tarefas' && await p.$eval('#tabbar [data-a=mais]', e => e.getAttribute('aria-current')) === 'page', 'Mais leva às Tarefas e fica marcado');
    await clica(p, '#tabbar [data-a=go][data-v=inicio]');
    await clica(p, '#view .atalhos [data-a=novoL][data-t=saida]');
    certo(await p.isVisible('#s2 #fV'), 'o atalho Lançar gasto abre o formulário');
  }],
  ['computador: com muitas caixinhas e metas, os cartões ficam dentro da coluna (não invadem o resto da tela) e o anel não gira de novo a cada toque', async (st, abrir) => {
    for (let k = 1; k <= 9; k++) st.tabelas.contas.push({ id: 'CXT' + k, user_id: 'u-joao', banco: 'Nubank', conta: 'Caixinha muitas ' + k, saldo_conferido: 1000 * k, data_da_conferencia: HOJE, obs: 'Rende 100% do CDI' });
    for (let k = 1; k <= 3; k++) st.tabelas.metas.push({ id: 'MTT' + k, user_id: 'u-joao', meta: 'Meta muitas ' + k, valor_alvo: 10000, ja_guardado: 1000 * k, onde_esta: '', prazo: null, obs: '' });
    const p = await abrir({ aparelho: 'notebook' });
    await p.waitForSelector('#hCaixinhas .cxm');
    const fora = await p.evaluate(() => { const col = document.querySelector('.home .col-l').getBoundingClientRect(); return [...document.querySelectorAll('#hCaixinhas .cxm')].filter(e => { const r = e.getBoundingClientRect(); return r.right > col.right + 1 || r.left < col.left - 1; }).length; });
    certo(fora === 0, fora + ' cartões de caixinha/meta saem da coluna da esquerda');
    certo(await p.$eval('#view .pizza.donut .pzg', e => getComputedStyle(e).animationName) === 'none', 'o anel não tem animação de girar');
    certo(await p.$$eval('#view .pizza.donut .pzp', t => t.length) >= 1, 'a porcentagem aparece em cima do anel');
  }],
  ['lembrete do mês: com caixinhas que rendem no banco, o app cria "Conferir as caixinhas" no dia 1º (uma vez só) e dá para marcar como feito', async (st, abrir) => {
    const m0 = HOJE.slice(0, 7);
    Object.assign(st.tabelas.contas.find(c => c.conta === 'Caixinha Reserva'), { obs: 'Rende 100% do CDI' });
    const p = await abrir({ aparelho: 'iphone-15' }); await calmo(p);
    const T = () => st.linhas('tarefas').filter(t => t.id === `TCX-${m0}`);
    certo(T().length === 1 && T()[0].data === `${m0}-01` && T()[0].tarefa === 'Conferir as caixinhas no app do banco' && /Nubank/.test(T()[0].obs), 'criou o lembrete do mês: ' + JSON.stringify(T()));
    await p.evaluate(() => { A.ui.view = 'tarefas'; A.render(false); });
    await clica(p, `#view [data-a=tarefa][data-id="t:TCX-${m0}"]`); await calmo(p);
    certo(T()[0].feita === true, 'marcou como feito');
    await p.reload(); await calmo(p);
    certo(st.linhas('tarefas').filter(t => /^TCX-/.test(t.id)).length === 1 && T()[0].feita === true, 'abrir de novo não repete nem desmarca');
  }],
  ['sem caixinha que rende no banco, não aparece lembrete de conferir caixinhas', async (st, abrir) => {
    const p = await abrir({ aparelho: 'iphone-15' }); await calmo(p);
    certo(!st.linhas('tarefas').some(t => /^TCX-/.test(t.id)), 'não criou lembrete à toa');
  }],
] };
