/* Etapa 21 · Contas certas: os erros de conta que o agente revisor achou (cada teste falhava antes da correção) */
const { HOJE, calmo, clica, certo, igual } = require('../ajuda');
const m0 = HOJE.slice(0, 7);
const addMes = (m, n) => { const d = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1 + n, 1)); return d.toISOString().slice(0, 7); };
const addDias = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const L = (id, extra) => Object.assign({ id, user_id: 'u-joao', data: HOJE, banco: 'Inter', descricao: id, grupo: 'Desejos', tipo: 'conta', valor: -10, categoria: 'Outros', subcategoria: 'Outros', status: 'Pago', parcela: '', obs: '' }, extra);
const JOB = (id, cliente, extra) => Object.assign({ id, user_id: 'u-joao', cliente, tipo_de_evento: 'Casamento', etapa: 'Fechado', valor_total: 1000 }, extra);

module.exports = { etapa: 'Contas certas (revisão)', testes: [
  ['marcar conta como paga fora do dia: a data vira o dia do pagamento e o saldo do banco fica certo; desfazer volta o vencimento', async (st, abrir) => {
    /* conta de R$ 100 que venceu 5 dias atrás; o Inter foi conferido 2 dias atrás (antes de pagar) */
    st.tabelas.contas = st.tabelas.contas.filter(x => x.banco !== 'Inter').concat([{ id: 'CINT', user_id: 'u-joao', banco: 'Inter', conta: 'Conta', saldo_conferido: 1000, data_da_conferencia: addDias(HOJE, -2) }]);
    st.tabelas.extrato.push(L('LCONTA', { data: addDias(HOJE, -5), valor: -100, descricao: 'Internet', status: 'Previsto' }));
    const p = await abrir();
    const saldo = () => p.evaluate(() => A.c.saldo(A.c.contas().find(x => x['BANCO'] === 'Inter' && x['CONTA'] === 'Conta')));
    igual(await saldo(), 1000, 'antes de pagar');
    await p.evaluate(() => { A.ui.view = 'tarefas'; A.render(false); });
    await clica(p, '#view [data-a=tarefa][data-id="l:LCONTA"]'); await calmo(p);
    const l = st.linhas('extrato').find(x => x.id === 'LCONTA');
    certo(l.status === 'Pago' && l.data === HOJE && /venc\. /.test(l.obs), 'pago hoje com o vencimento anotado: ' + JSON.stringify([l.status, l.data, l.obs]));
    igual(await saldo(), 900, 'o pagamento sai do saldo (pagou depois da conferência)');
    await clica(p, '#toast .ub'); await calmo(p);
    const d = st.linhas('extrato').find(x => x.id === 'LCONTA');
    certo(d.status === 'Previsto' && d.data === addDias(HOJE, -5) && !/venc\.|pelo app/.test(d.obs || ''), 'desfazer volta a data do vencimento: ' + JSON.stringify([d.status, d.data, d.obs]));
  }],
  ['registrar recebimento dá baixa na parcela prevista (não cobra de novo); pagar a mais abate a próxima; pagar a menos diminui a parcela', async (st, abrir) => {
    st.tabelas.trabalhos.push(JOB('JP', 'Bia Teste', { valor_total: 1000, parcela_mensal: 200, dia_da_parcela: 26, data_do_evento: addMes(m0, 10) + '-20' }));
    const p = await abrir(); await calmo(p);
    const prev = () => st.linhas('extrato').filter(l => /^LJP-JP-/.test(l.id)).sort((a, b) => a.id < b.id ? -1 : 1).map(l => [l.id.slice(-7), l.status, l.valor]);
    certo(JSON.stringify(prev()) === JSON.stringify([[m0, 'Previsto', 200], [addMes(m0, 1), 'Previsto', 200]]), 'duas parcelas previstas: ' + JSON.stringify(prev()));
    await p.evaluate(() => { A.ui.view = 'trabalhos'; A.render(false); });
    await clica(p, '#view [data-a=editJ][data-id="JP"]');
    await p.fill('#rV', '300'); await p.fill('#rD', 'parcela'); await clica(p, '#s2 [data-a=receber]'); await calmo(p);
    certo(JSON.stringify(prev()) === JSON.stringify([[m0, 'Pago', 300], [addMes(m0, 1), 'Previsto', 100]]), 'pagou 300: a parcela do mês virou o recebimento e a próxima caiu para 100: ' + JSON.stringify(prev()));
    const d = await p.evaluate(m => ({ rec: A.c.recebido(A.db.achar('TRABALHOS', 'JP')), tarefaAberta: A.c.tarefas().some(t => t.id === 'l:LJP-JP-' + m && !t.feita), entr: A.c.resumo(m).aReceber }), m0);
    certo(d.rec === 300 && !d.tarefaAberta && d.entr === 0, 'recebido 300, sem tarefa aberta nem "a receber" no mês: ' + JSON.stringify(d));
    await p.fill('#rV', '40'); await clica(p, '#s2 [data-a=receber]'); await calmo(p);
    const ult = prev().find(x => x[0] === addMes(m0, 1));
    certo(ult[1] === 'Previsto' && Math.abs(ult[2] - 60) < 0.01, 'pagou 40 de 100: a parcela prevista ficou em 60: ' + JSON.stringify(ult));
    igual(await p.evaluate(() => A.c.recebido(A.db.achar('TRABALHOS', 'JP'))), 340, 'recebido soma tudo');
  }],
  ['orçamento não cobra parcela; voltar para orçamento ou excluir o trabalho tira as parcelas previstas', async (st, abrir) => {
    st.tabelas.trabalhos.push(JOB('JO', 'Só Orçamento', { etapa: 'Orçamento', parcela_mensal: 300, dia_da_parcela: 10 }), JOB('JF', 'Fechou Agora', { parcela_mensal: 250, dia_da_parcela: 10 }));
    const p = await abrir(); await calmo(p);
    certo(!st.linhas('extrato').some(l => /^LJP-JO-/.test(l.id)), 'orçamento gerou parcela');
    certo(st.linhas('extrato').filter(l => /^LJP-JF-/.test(l.id)).length === 2, 'trabalho fechado gera parcelas');
    await p.evaluate(() => { A.ui.view = 'trabalhos'; A.render(false); });
    await clica(p, '#view [data-a=editJ][data-id="JF"]');
    await clica(p, '#s2 [data-a=etapaJ][data-v="Orçamento"]'); await calmo(p);
    certo(!st.linhas('extrato').some(l => /^LJP-JF-/.test(l.id)), 'voltar para orçamento tirou as parcelas');
    await clica(p, '#s2 [data-a=etapaJ][data-v="Fechado"]'); await calmo(p);
    certo(st.linhas('extrato').filter(l => /^LJP-JF-/.test(l.id)).length === 2, 'fechar de novo gera as parcelas');
    await clica(p, '#s2 [data-a=apagarJ]'); await clica(p, '#s2 [data-a=apagarJ]'); await calmo(p);
    certo(!st.linhas('extrato').some(l => /^LJP-JF-/.test(l.id)) && !(await p.evaluate(() => A.c.tarefas().some(t => /JF/.test(t.id)))), 'excluir o trabalho tira as parcelas e as tarefas');
  }],
  ['recebimento conta para um trabalho só: "Ana" não pega o sinal de "Ana e Pedro", nem a entrada ligada a outro trabalho', async (st, abrir) => {
    st.tabelas.trabalhos.push(JOB('JA1', 'Ana'), JOB('JA2', 'Ana e Pedro'));
    st.tabelas.extrato.push(L('LAP', { grupo: 'Renda', valor: 500, descricao: 'Ana e Pedro - sinal', categoria: 'Darzan Produções', subcategoria: 'Casamento' }),
      L('LANA', { grupo: 'Renda', valor: 100, descricao: 'ana - entrada', categoria: 'Darzan Produções', subcategoria: 'Casamento' }),
      L('LLIG', { grupo: 'Renda', valor: 70, descricao: 'Ana extra', categoria: 'Darzan Produções', subcategoria: 'Casamento', obs: 'Trabalho JA2' }),
      L('LBANANA', { grupo: 'Renda', valor: 9, descricao: 'venda de banana', categoria: 'Outras rendas', subcategoria: 'Outros' }));
    const p = await abrir();
    const r = await p.evaluate(() => ['JA1', 'JA2'].map(id => A.c.recebido(A.db.achar('TRABALHOS', id))));
    certo(r[0] === 100 && r[1] === 570, 'Ana 100 e Ana e Pedro 570 (500 pelo nome + 70 ligado): ' + JSON.stringify(r));
  }],
  ['conta fixa no cartão cai na fatura certa; conta fixa excluída não volta sozinha', async (st, abrir) => {
    st.tabelas.cartoes.push({ id: 'KNU', user_id: 'u-joao', cartao: 'Cartão Fecha31', limite: 1000, fecha_dia: 31, vence_dia: 7, paga_pela_conta: 'Nubank · Conta' });
    st.tabelas.fixas.push({ id: 'FNET', user_id: 'u-joao', descricao: 'Streaming teste', valor: 40, dia: 15, banco: 'Cartão Fecha31', tipo: 'cartão', grupo: 'Desejos', categoria: 'Assinaturas', subcategoria: 'Streaming', ativa: 'Sim' },
      { id: 'FAGUA', user_id: 'u-joao', descricao: 'Conta de água teste', valor: 80, dia: 20, banco: 'Nubank', tipo: 'conta', grupo: 'Necessidades', categoria: 'Casa', subcategoria: 'Contas', ativa: 'Sim' });
    const p = await abrir(); await calmo(p);
    const n = st.linhas('extrato').find(l => l.id === 'LFX-FNET-' + m0);
    certo(n && n.data === addMes(m0, 1) + '-15', 'compra do dia 15 num cartão que fecha dia 31 vai para a fatura do mês seguinte: ' + (n && n.data));
    const id = 'LFX-FAGUA-' + addMes(m0, 1);
    await p.evaluate(id => { A.ui.view = 'fin'; A.ui.fseg = 'extrato'; A.ui.mes = id.slice(-7); A.render(false); }, id);
    await clica(p, `#view [data-a=editL][data-id="${id}"]`);
    await clica(p, '#s2 [data-a=apagarL]'); await clica(p, '#s2 [data-a=apagarL]'); await calmo(p);
    await p.reload(); await p.waitForFunction(() => document.getElementById('splash').hidden && document.querySelector('#view').children.length); await calmo(p);
    const ag = st.linhas('extrato').filter(l => l.id === id);
    certo(ag.length === 1 && ag[0].status === 'Cancelado', 'a conta excluída ficou cancelada e não voltou: ' + JSON.stringify(ag.map(l => l.status)));
    certo(!(await p.evaluate(id => A.c.lancs().some(l => l.id === id) || A.c.tarefas().some(t => t.id === 'l:' + id), id)), 'cancelada não aparece em lugar nenhum');
  }],
  ['mês que vem: a previsão conta o que vai entrar; caixinhas de nome parecido não somam em dobro; mensagem do WhatsApp mostra o valor mesmo com "esconder valores"', async (st, abrir) => {
    const m1 = addMes(m0, 1);
    st.tabelas.extrato.push(L('LFUT-R', { data: m1 + '-10', grupo: 'Renda', valor: 500, status: 'Previsto', categoria: 'Darzan Produções', subcategoria: 'Casamento', descricao: 'parcela futura' }),
      L('LFUT-G', { data: m1 + '-12', valor: -120, status: 'Previsto', descricao: 'conta futura' }));
    st.tabelas.contas.push({ id: 'CV1', user_id: 'u-joao', banco: 'Nubank', conta: 'Caixinha Viagem', saldo_conferido: 100, data_da_conferencia: addDias(HOJE, -3) },
      { id: 'CV2', user_id: 'u-joao', banco: 'Nubank', conta: 'Caixinha Viagem Chile', saldo_conferido: 100, data_da_conferencia: addDias(HOJE, -3) });
    st.tabelas.extrato.push(L('LGUARD', { banco: 'Nubank', grupo: 'Guardado', valor: -500, categoria: 'Guardado', subcategoria: 'Caixinha', descricao: 'guardei', obs: 'Para Caixinha Viagem Chile' }));
    st.tabelas.trabalhos.push(JOB('JW', 'Cliente Whats', { telefone: '(19) 91234-5678' }));
    const p = await abrir();
    const r = await p.evaluate(m => { const r = A.c.resumo(m); return [r.entr, r.aReceber, r.prevSobra, r.sobra]; }, m1);
    certo(r[0] === 0 && r[1] === 500 && Math.abs(r[2] - (r[3] + 500)) < 0.01, 'previsão do mês que vem inclui o que vai entrar: ' + JSON.stringify(r));
    const cx = await p.evaluate(() => A.c.contas().filter(x => /Viagem/.test(x['CONTA'])).map(x => [x['CONTA'], A.c.saldo(x)]));
    certo(JSON.stringify(cx) === JSON.stringify([['Caixinha Viagem', 100], ['Caixinha Viagem Chile', 600]]), 'só a caixinha certa recebe: ' + JSON.stringify(cx));
    const msg = await p.evaluate(() => { A.ui.oculto = true; const j = A.db.achar('TRABALHOS', 'JW'); return decodeURIComponent(A.c.linkWhats(j, 250, null)); });
    certo(/R\$ 250,00/.test(msg) && !/••/.test(msg), 'mensagem com o valor de verdade: ' + msg.slice(0, 120));
  }],
  ['lançamento que veio do banco (Open Finance) e é excluído fica cancelado, para o robô não trazer de novo; o lançado à mão some de verdade', async (st, abrir) => {
    st.tabelas.extrato.push(L('LOF-aaaaaaaa-0000-0000-0000-000000000077', { descricao: 'veio do banco', obs: 'Open Finance · OF aaaaaaaa-0000-0000-0000-000000000077' }),
      L('LMAO-OF', { descricao: 'lançado à mão e conferido pelo banco', obs: 'gasolina · OF aaaaaaaa-0000-0000-0000-000000000078' }), L('LMAO-SO', { descricao: 'só à mão' }));
    const p = await abrir(); await calmo(p);
    await p.evaluate(() => { A.ui.view = 'fin'; A.ui.fseg = 'extrato'; A.render(false); });
    for (const id of ['LOF-aaaaaaaa-0000-0000-0000-000000000077', 'LMAO-OF', 'LMAO-SO']) {
      await clica(p, `#view [data-a=editL][data-id="${id}"]`);
      await clica(p, '#s2 [data-a=apagarL]'); await clica(p, '#s2 [data-a=apagarL]'); await calmo(p);
    }
    const ex = st.linhas('extrato'), st_ = id => (ex.find(l => l.id === id) || {}).status;
    certo(st_('LOF-aaaaaaaa-0000-0000-0000-000000000077') === 'Cancelado' && st_('LMAO-OF') === 'Cancelado', 'os do banco ficaram cancelados: ' + JSON.stringify(ex.filter(l => /LOF|LMAO/.test(l.id)).map(l => [l.id, l.status])));
    certo(!ex.some(l => l.id === 'LMAO-SO'), 'o só à mão foi apagado de verdade');
    certo(!(await p.evaluate(() => A.c.lancs().some(l => /LOF-|LMAO/.test(l.id)))), 'nenhum aparece no app');
  }],
] };
