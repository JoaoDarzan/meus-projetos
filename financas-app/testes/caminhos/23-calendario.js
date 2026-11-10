/* Etapa 23 · Calendário dos dias trabalhados: marcar dias, um pagamento para vários dias (R$ 500 por sábado e domingo = 2 trabalhos de R$ 250) */
const { HOJE, calmo, clica, certo, igual, conferirLayout } = require('../ajuda');
const m0 = HOJE.slice(0, 7);
const addDias = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const mesmo = (a, b, msg) => certo(a === b, `${msg}: esperava ${b}, veio ${a}`);
const SAB = addDias(HOJE, -3), DOM = addDias(HOJE, -2); /* um fim de semana antes de hoje, no mesmo mês */
const L = (id, extra) => Object.assign({ id, user_id: 'u-joao', data: addDias(HOJE, -1), banco: 'PicPay', descricao: id, grupo: 'Renda', tipo: 'conta', valor: 500, categoria: 'JPL SOM', subcategoria: 'Diária de som', status: 'Pago', parcela: '', obs: '' }, extra);
const irCalendario = async p => { await p.evaluate(() => { A.ui.view = 'trabalhos'; A.ui.jseg = 'calendario'; A.render(false); }); await p.waitForSelector('#view .cal'); };
const dias = st => st.linhas('dias').sort((a, b) => a.data < b.data ? -1 : 1);

module.exports = { etapa: 'Calendário dos dias trabalhados', testes: [
  ['marcar o fim de semana (2 dias de R$ 250 da JPL SOM): conta 2 dias, R$ 500 a receber, e o "Receber JPL SOM" aparece no Pra fazer', async (st, abrir) => {
    const p = await abrir({ aparelho: 'iphone-15' });
    await irCalendario(p);
    await clica(p, '#view [data-a=calMulti]');
    await clica(p, `#view .cd[data-v="${SAB}"]`); await clica(p, `#view .cd[data-v="${DOM}"]`);
    certo(await p.isVisible(`#view .cd.sel[data-v="${SAB}"]`) && await p.isVisible(`#view .cd.sel[data-v="${DOM}"]`), 'os dois dias ficaram marcados');
    await conferirLayout(p, 'calendário escolhendo dias');
    await clica(p, '#view [data-a=calMarcar]');
    await p.waitForSelector('#s2 #wD');
    await p.check('#s2 input[name=wE][value="JPL SOM"]', { force: true });
    await p.fill('#s2 #wD', 'som no evento'); await p.fill('#s2 #wV', '250');
    await conferirLayout(p, 'marcar dias');
    await clica(p, '#s2 .save'); await calmo(p);
    const ds = dias(st);
    certo(ds.length === 2 && ds.every(d => d.empresa === 'JPL SOM' && d.valor === 250 && !d.pagamento) && ds[0].data === SAB && ds[1].data === DOM, 'gravou 2 dias de R$ 250 sem pagamento: ' + JSON.stringify(ds));
    const k = await p.evaluate(m => { const k = A.c.calendario(m); return { t: k.trabalhados, v: k.valor, r: k.aReceber, med: k.media }; }, m0);
    certo(k.t === 2 && k.v === 500 && k.r === 500 && k.med === 250, '2 dias, R$ 500, tudo a receber, média R$ 250: ' + JSON.stringify(k));
    certo(await p.isVisible(`#view .cd.falta[data-v="${SAB}"]`), 'dia sem pagamento com a borda de "falta receber"');
    const t = await p.evaluate(() => A.c.tarefas().find(t => t.id === 'w:JPL SOM'));
    certo(t && t.valor === 500 && /2 dias/.test(t.titulo) && !t.feita, 'tarefa "Receber JPL SOM · 2 dias": ' + JSON.stringify(t));
    await p.evaluate(() => { A.ui.view = 'tarefas'; A.render(false); });
    certo(await p.isVisible('#view .tk:has-text("Receber JPL SOM")'), 'aparece nas Tarefas');
  }],
  ['o Pix de R$ 500 chega: ligar aos 2 dias divide R$ 250 cada, os dias ficam pagos, a tarefa some e a renda não conta em dobro', async (st, abrir) => {
    st.tabelas.dias.push({ id: 'WSAB', user_id: 'u-joao', data: SAB, empresa: 'JPL SOM', descricao: 'som', valor: null, pagamento: null, obs: null },
      { id: 'WDOM', user_id: 'u-joao', data: DOM, empresa: 'JPL SOM', descricao: 'som', valor: null, pagamento: null, obs: null },
      { id: 'WOUT', user_id: 'u-joao', data: SAB, empresa: 'Buffet Teste', descricao: 'outro trampo', valor: 100, pagamento: null, obs: null });
    st.tabelas.extrato.push(L('LPIXJPL', { descricao: 'Pix do cliente JPL SOM' }));
    const p = await abrir({ aparelho: 'iphone-15' });
    const renda0 = await p.evaluate(m => A.c.resumo(m).fonte['JPL SOM'], m0);
    await p.evaluate(() => { A.ui.view = 'fin'; A.ui.fseg = 'extrato'; A.render(false); });
    await clica(p, '#view [data-a=editL][data-id="LPIXJPL"]');
    await clica(p, '#s2 [data-a=ligarPag]');
    await p.waitForSelector('#s2 .lpd');
    mesmo(await p.inputValue('#s2 #lpP'), 'LPIXJPL', 'o pagamento já vem escolhido');
    await p.check('#s2 #lp-WSAB'); await p.check('#s2 #lp-WDOM');
    await clica(p, '#s2 [data-a=dividirPag]');
    certo(/R\$\s500,00 de R\$\s500,00 ✓/.test(await p.textContent('#s2 #lpTot')), 'soma confere com o pagamento: ' + await p.textContent('#s2 #lpTot'));
    await conferirLayout(p, 'ligar pagamento aos dias');
    await clica(p, '#s2 .save'); await calmo(p);
    const ds = Object.fromEntries(st.linhas('dias').map(d => [d.id, d]));
    certo(ds.WSAB.pagamento === 'LPIXJPL' && ds.WDOM.pagamento === 'LPIXJPL' && ds.WSAB.valor === 250 && ds.WDOM.valor === 250, 'R$ 250 cada, ligados ao Pix: ' + JSON.stringify([ds.WSAB, ds.WDOM]));
    certo(!ds.WOUT.pagamento, 'o dia de outra empresa, não marcado, ficou de fora');
    const k = await p.evaluate(m => { const k = A.c.calendario(m); return { t: k.trabalhados, r: k.aReceber, e: k.empresas.find(x => x.empresa === 'JPL SOM') }; }, m0);
    certo(k.t === 1 + 1 && k.e.n === 2 && k.e.valor === 500 && k.e.aReceber === 0 && k.r === 100, 'JPL SOM: 2 dias pagos, R$ 500; só o Buffet a receber: ' + JSON.stringify(k));
    igual(await p.evaluate(m => A.c.resumo(m).fonte['JPL SOM'], m0), renda0, 'a renda da JPL SOM no mês é a mesma: o Pix conta uma vez');
    certo(!(await p.evaluate(() => A.c.tarefas().some(t => t.id === 'w:JPL SOM'))), 'a tarefa de receber da JPL SOM sumiu');
    await clica(p, '#view [data-a=editL][data-id="LPIXJPL"]');
    certo(/Pagou 2 dias trabalhados/.test(await p.textContent('#s2 [data-a=ligarPag]')), 'o lançamento mostra quantos dias pagou');
  }],
  ['marcar dias já escolhendo o pagamento e sem valor: o app divide o Pix entre os dias', async (st, abrir) => {
    st.tabelas.extrato.push(L('LPIX300', { valor: 300, descricao: 'Pix corrida' }));
    const p = await abrir({ aparelho: 'iphone-15' });
    await irCalendario(p);
    await clica(p, '#view [data-a=calMulti]');
    for (const d of [SAB, DOM, addDias(HOJE, -1)]) await clica(p, `#view .cd[data-v="${d}"]`);
    await clica(p, '#view [data-a=calMarcar]'); await p.waitForSelector('#s2 #wP');
    await p.selectOption('#s2 #wP', 'LPIX300');
    await clica(p, '#s2 .save'); await calmo(p);
    const vs = dias(st).map(d => [d.valor, d.pagamento]);
    certo(vs.length === 3 && vs.every(([, pg]) => pg === 'LPIX300') && Math.abs(vs.reduce((s, [v]) => s + v, 0) - 300) < 0.001 && vs.every(([v]) => v === 100), 'R$ 300 / 3 dias = R$ 100 cada: ' + JSON.stringify(vs));
  }],
  ['evento da Darzan entra sozinho no calendário (orçamento não); tocar no dia mostra o que teve; editar e excluir um dia', async (st, abrir) => {
    const JOB = (id, etapa, data) => ({ id, user_id: 'u-joao', cliente: 'Noiva ' + id, tipo_de_evento: 'Casamento', data_do_evento: data, local: '', o_que_foi_fechado: '', valor_total: 1000, entrega: null, etapa, telefone: '', contrato: '', obs: '' });
    st.tabelas.trabalhos.push(JOB('JCF', 'Fechado', m0 + '-10'), JOB('JCO', 'Orçamento', m0 + '-11'));
    st.tabelas.dias.push({ id: 'WED', user_id: 'u-joao', data: m0 + '-12', empresa: 'JPL SOM', descricao: 'ensaio', valor: 200, pagamento: null, obs: null });
    const p = await abrir({ aparelho: 'iphone-15' });
    await irCalendario(p);
    const k = await p.evaluate(m => { const k = A.c.calendario(m); return { ev: Object.entries(k.porData).filter(([, x]) => x.eventos.length).map(([d, x]) => [d, x.eventos.map(j => j.ID).join()]), dz: (k.empresas.find(x => x.empresa === 'Darzan Produções') || {}).n }; }, m0);
    certo(JSON.stringify(k.ev) === JSON.stringify([[m0 + '-10', 'JCF']]) && k.dz === 1, 'só o fechado entra, e conta 1 dia da Darzan: ' + JSON.stringify(k));
    await clica(p, `#view .cd[data-v="${m0}-10"]`);
    certo(await p.isVisible('#s2 [data-a=editJ][data-id="JCF"]'), 'o dia mostra o evento da Darzan');
    await p.evaluate(() => { document.getElementById('scrim2').hidden = true; });
    await clica(p, '#view [data-a=editDia][data-id="WED"]'); await p.waitForSelector('#s2 #wV');
    await p.fill('#s2 #wV', '180'); await clica(p, '#s2 .save'); await calmo(p);
    igual(st.linhas('dias').find(d => d.id === 'WED').valor, 180, 'editou o valor do dia');
    await clica(p, '#view [data-a=editDia][data-id="WED"]'); await clica(p, '#s2 [data-a=apagarDia]'); await calmo(p);
    certo(!st.linhas('dias').some(d => d.id === 'WED'), 'excluiu o dia');
  }],
  ['o ano e os próximos: quantos dias trabalhou em cada mês (só o que já passou) e o que vem pela frente (dias marcados e eventos da Darzan)', async (st, abrir) => {
    const ano = HOJE.slice(0, 4), D = (id, data, empresa) => ({ id, user_id: 'u-joao', data, empresa, descricao: 'x', valor: 100, pagamento: null, obs: null });
    st.tabelas.dias.push(D('WA1', ano + '-03-07', 'JPL SOM'), D('WA2', ano + '-03-08', 'JPL SOM'), D('WA3', SAB, 'JPL SOM'), D('WFUT', addDias(HOJE, 3), 'JPL SOM'));
    st.tabelas.trabalhos.push({ id: 'JPAS', user_id: 'u-joao', cliente: 'Noiva Passada', tipo_de_evento: 'Casamento', data_do_evento: ano + '-03-21', etapa: 'Entregue', valor_total: 1000 },
      { id: 'JFUT', user_id: 'u-joao', cliente: 'Noiva Futura', tipo_de_evento: 'Casamento', data_do_evento: addDias(HOJE, 10), etapa: 'Fechado', valor_total: 1000 },
      { id: 'JORC', user_id: 'u-joao', cliente: 'Só orçamento', tipo_de_evento: 'Casamento', data_do_evento: addDias(HOJE, 5), etapa: 'Orçamento', valor_total: 1000 });
    const p = await abrir({ aparelho: 'iphone-15' });
    await irCalendario(p);
    const a = await p.evaluate(ano => { const a = A.c.anoTrabalho(ano), h = A.u.hoje(), k = A.c.calendario(h.slice(0, 7)); return { mar: a.meses[2].dias, agora: a.meses[+h.slice(5, 7) - 1].dias, passados: k.datas.filter(d => d <= h).length, todos: k.datas.length, agendados: a.agendados }; }, ano);
    certo(a.mar === 3, 'março: 2 dias JPL + 1 evento da Darzan = 3: ' + JSON.stringify(a));
    certo(a.agora === a.passados && a.todos > a.passados && a.agendados >= 1, 'no mês de hoje só conta o que já passou; o dia marcado para frente fica em "agendados": ' + JSON.stringify(a));
    const pr = await p.evaluate(() => A.c.proximosTrabalhos().map(x => x.titulo));
    certo(pr[0] === 'x' && pr[1] === 'Noiva Futura' && !pr.includes('Só orçamento') && !pr.includes('Noiva Passada'), 'próximos, do mais perto ao mais longe: o dia marcado e o casamento fechado (orçamento e passado não): ' + pr);
    certo(await p.isVisible('#view h2:has-text("Próximos trabalhos")') && await p.isVisible('#view .anob'), 'as duas partes aparecem na tela');
    await conferirLayout(p, 'calendário com ano e próximos');
    await clica(p, `#view .anob [data-v="${ano}-03"]`);
    mesmo(await p.evaluate(() => A.ui.mes), ano + '-03', 'tocar no mês do gráfico vai para ele');
  }],
  ['Pix que chegou pelo banco vai para o Revisar; conferir tira de lá, mas a marca do robô continua (senão ele traria de novo) e dá para ligar aos dias', async (st, abrir) => {
    const OF = 'OF aaaaaaaa-1111-2222-3333-444444444444';
    st.tabelas.extrato.push(L('LOF-PIX', { descricao: 'PIX recebido', categoria: '', subcategoria: '', obs: `Open Finance · ${OF} · conferir` }),
      L('LOF-PIX2', { descricao: 'PIX recebido 2', valor: 80, categoria: '', subcategoria: '', obs: `Open Finance · ${OF.replace('4444', '5555')} · conferir` }));
    const p = await abrir({ aparelho: 'iphone-15' });
    certo(await p.evaluate(() => A.c.paraRevisar('conferir').some(l => l.id === 'LOF-PIX')), 'está no Revisar › Para conferir');
    await p.evaluate(() => { A.ui.view = 'fin'; A.ui.fseg = 'extrato'; A.render(false); });
    await clica(p, '#view [data-a=editL][data-id="LOF-PIX"]');
    mesmo(await p.inputValue('#s2 #fO'), '', 'a anotação não mostra a marca do robô');
    certo(await p.isChecked('#s2 #fOk') && await p.isVisible('#s2 [data-a=ligarPag]'), 'vem com "Já conferi" marcado e o botão dos dias');
    await p.selectOption('#s2 #fC', 'JPL SOM'); await p.fill('#s2 #fO', 'fim de semana');
    await clica(p, '#s2 .save'); await calmo(p);
    const l = st.linhas('extrato').find(x => x.id === 'LOF-PIX');
    certo(l.obs.includes(OF) && !/conferir/.test(l.obs) && /fim de semana/.test(l.obs) && l.categoria === 'JPL SOM', 'guardou a marca do robô e a anotação, e saiu do Revisar: ' + l.obs);
    await clica(p, '#view [data-a=editL][data-id="LOF-PIX2"]');
    await p.uncheck('#s2 #fOk'); await clica(p, '#s2 .save'); await calmo(p);
    certo(/conferir/.test(st.linhas('extrato').find(x => x.id === 'LOF-PIX2').obs), 'sem marcar "Já conferi", continua no Revisar');
  }],
  ['sem a tabela no Supabase (falta rodar a atualização): o calendário explica o passo e não deixa marcar (nada se perde)', async (st, abrir) => {
    delete st.tabelas.dias;
    const p = await abrir({ aparelho: 'iphone-15' });
    await p.evaluate(() => { A.ui.view = 'trabalhos'; A.ui.jseg = 'calendario'; A.render(false); });
    certo(await p.isVisible('#view :text("Falta 1 passo para usar o calendário")') && !(await p.$('#view .cal')), 'mostra o passo a passo no lugar do calendário');
    certo(await p.evaluate(() => A.c.tarefas().every(t => !t.id.startsWith('w:'))), 'sem tarefa de dias');
  }],
] };
