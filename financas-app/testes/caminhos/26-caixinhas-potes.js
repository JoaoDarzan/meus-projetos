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
] };
