/* Etapa 24 · Vendas (CRM): cliente novo → "mandei o orçamento" (o orçamento é feito por fora) → follow-up no WhatsApp → fechou / não fechou */
const { HOJE, calmo, clica, certo, igual, conferirLayout } = require('../ajuda');
const m0 = HOJE.slice(0, 7);
const addDias = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const mesmo = (a, b, msg) => certo(a === b, `${msg}: esperava ${b}, veio ${a}`);
const LEAD = (id, extra, crm) => Object.assign({ id, user_id: 'u-joao', cliente: 'Ana e Pedro', tipo_de_evento: 'Casamento', data_do_evento: addDias(HOJE, 200), local: 'Espaço Jardim', o_que_foi_fechado: null, valor_total: null, entrega: null, etapa: 'Orçamento',
  telefone: '(19) 98888-1111', contrato: null, obs: null, briefing: null, entregas: null, parcela_mensal: null, dia_da_parcela: null, crm: JSON.stringify(Object.assign({ origem: 'Instagram', criado: HOJE, contato: HOJE }, crm)) }, extra);
const job = (st, id) => st.linhas('trabalhos').find(j => j.id === id);
const crm = (st, id) => JSON.parse(job(st, id).crm || '{}');
const irQuadro = async p => { await p.evaluate(() => { A.ui.view = 'trabalhos'; A.ui.jseg = 'quadro'; A.render(false); }); await p.waitForSelector('#view .board'); };
module.exports = { etapa: 'Vendas (CRM)', testes: [
  ['cliente novo: entra direto em "Orçamento" (todo contato novo já recebe orçamento) com WhatsApp, de onde veio e o dia em que chamou; conta nos números do mês', async (st, abrir) => {
    const p = await abrir({ aparelho: 'iphone-15' });
    await irQuadro(p);
    await clica(p, '#view [data-a=novoLead]'); await p.waitForSelector('#s2 #nN');
    await p.fill('#s2 #nN', 'Mariana Souza'); await p.fill('#s2 #nW', '(19) 97777-2222');
    await p.selectOption('#s2 #nT', 'Casamento'); await p.fill('#s2 #nD', addDias(HOJE, 300));
    await clica(p, '#s2 label[for="nO1"]'); await p.fill('#s2 #nB', 'filme da igreja e festa');
    await conferirLayout(p, 'novo cliente');
    await clica(p, '#s2 .save'); await calmo(p);
    const j = st.linhas('trabalhos').find(x => x.cliente === 'Mariana Souza'), k = JSON.parse(j.crm);
    certo(j.etapa === 'Orçamento' && j.telefone === '(19) 97777-2222' && j.briefing === 'filme da igreja e festa', 'gravou o cliente em Orçamento: ' + JSON.stringify(j));
    certo(k.origem === 'Indicação' && k.criado === HOJE && k.enviado === HOJE && k.contato === HOJE, 'de onde veio e quando chamou: ' + j.crm);
    certo(await p.isVisible(`#view .col[data-etapa="Orçamento"] .job[data-id="${j.id}"]`) && !(await p.$('#view .col[data-etapa="Novo contato"]')), 'aparece na coluna Orçamento (não existe mais a coluna Novo contato)');
    igual(await p.evaluate(m => A.c.funil(m).novos, m0), 1, '1 cliente novo no mês');
    igual(await p.evaluate(m => A.c.funil(m).enviados, m0), 1, 'e 1 orçamento no mês');
    certo(await p.evaluate(id => !A.c.eventosDoMes(A.ui.mes).some(x => x.ID === id) && !A.c.proximosTrabalhos(50).some(x => x.job && x.job.ID === id), j.id), 'quem ainda não fechou não entra no calendário');
  }],
  ['quem estava em "Novo contato" (antigo) aparece em Orçamento; sem botão "Mandei o orçamento"; a ficha tem o WhatsApp para retomar a conversa e anota que chamou', async (st, abrir) => {
    st.tabelas.trabalhos.push(LEAD('JL1', { etapa: 'Novo contato' }, { contato: addDias(HOJE, -2) }), LEAD('JL4', { etapa: 'Novo contato', cliente: 'Bruna Arrastada' }));
    const p = await abrir({ aparelho: 'iphone-15' });
    await irQuadro(p);
    certo(await p.isVisible('#view .col[data-etapa="Orçamento"] .job[data-id="JL1"]') && await p.isVisible('#view .col[data-etapa="Orçamento"] .job[data-id="JL4"]'), 'os antigos de Novo contato estão em Orçamento');
    await clica(p, '#view [data-a=editJ][data-id="JL1"]'); await p.waitForSelector('#s2 #jVenda');
    certo(!(await p.$('#s2 [data-a=enviouOrc]')) && await p.getAttribute('#s2 .etapas [data-v="Orçamento"]', 'aria-pressed') === 'true' && !(await p.$('#s2 .etapas [data-v="Novo contato"]')), 'sem "Mandei o orçamento"; a etapa marcada é Orçamento');
    certo(!(await p.$('#s2 [data-a=mandarOrc]')) && !(await p.$('#s2 .oit')), 'nada de montar ou gerar orçamento no app');
    const href = decodeURIComponent(await p.getAttribute('#s2 #jVenda a.whats', 'href'));
    certo(href.startsWith('https://wa.me/5519988881111?text=Oi, Ana e Pedro!') && /retomar a nossa conversa sobre o seu casamento/.test(href), 'WhatsApp para retomar a conversa: ' + href);
    await conferirLayout(p, 'ficha de venda');
    await clica(p, '#s2 #jVenda a.whats'); await calmo(p);
    mesmo(crm(st, 'JL1').contato, HOJE, 'tocar no WhatsApp anota que chamou hoje');
    await clica(p, '#s2 [data-a=fechar]');
    await p.evaluate(() => { const b = document.createElement('button'); b.dataset.a = 'enviouOrc'; b.dataset.id = 'JL1'; document.body.appendChild(b); b.click(); b.remove(); }); await calmo(p); /* o mesmo caminho do arrastar: moverJob */
    const k = crm(st, 'JL1');
    certo(job(st, 'JL1').etapa === 'Orçamento' && k.enviado === HOJE && k.contato === HOJE, 'passou para Orçamento e anotou o envio: ' + job(st, 'JL1').crm);
    certo(await p.isVisible('#view .col[data-etapa="Orçamento"] .job[data-id="JL1"]'), 'está na coluna Orçamento');
    await p.evaluate(() => { const b = document.createElement('button'); b.dataset.a = 'enviouOrc'; b.dataset.id = 'JL4'; document.body.appendChild(b); b.click(); b.remove(); }); await calmo(p); /* o mesmo caminho do arrastar: moverJob */
    certo(job(st, 'JL4').etapa === 'Orçamento' && crm(st, 'JL4').enviado === HOJE, 'o outro também conta');
    igual(await p.evaluate(m => A.c.funil(m).enviados, m0), 2, '2 orçamentos no mês');
    await clica(p, '#view [data-a=editJ][data-id="JL1"]');
    certo(/Perguntar se viu o orçamento/.test(await p.textContent('#s2 #jVenda a.whats')) && /orçamento enviado em/.test(await p.textContent('#s2 #jVenda')), 'depois do orçamento, a mensagem muda');
  }],
  ['cliente sem responder há 4 dias: aparece no cartão e no Pra fazer ("Chamar de novo", com o WhatsApp pronto); marcar anota que chamou hoje, com Desfazer', async (st, abrir) => {
    st.tabelas.trabalhos.push(LEAD('JL2', {}, { enviado: addDias(HOJE, -4), contato: addDias(HOJE, -4) }), LEAD('JL3', { cliente: 'Respondeu Ontem' }, { contato: addDias(HOJE, -1) }));
    const p = await abrir({ aparelho: 'iphone-15' });
    const t = await p.evaluate(() => A.c.tarefas().filter(t => t.id.startsWith('v:')).map(t => [t.id, t.titulo, t.nota]));
    certo(t.length === 1 && t[0][0] === 'v:JL2' && /Chamar Ana e Pedro de novo/.test(t[0][1]) && /há 4 dias/.test(t[0][2]), 'só quem passou de 3 dias: ' + JSON.stringify(t));
    igual(await p.evaluate(m => A.c.funil(m).esperando, m0), 1, '1 esperando resposta');
    await p.evaluate(() => { A.ui.view = 'tarefas'; A.render(false); });
    certo(await p.isVisible('#view .tk:has-text("Chamar Ana e Pedro de novo")'), 'está nas Tarefas');
    const href = await p.getAttribute('#view .tk:has-text("Chamar Ana e Pedro") a.whats', 'href');
    certo(decodeURIComponent(href).startsWith('https://wa.me/5519988881111?text=Oi, Ana e Pedro!') && /orçamento/.test(decodeURIComponent(href)), 'WhatsApp com a mensagem de retorno: ' + href);
    await irQuadro(p);
    certo(/sem resposta há 4 dias/.test(await p.textContent('#view .job[data-id="JL2"]')), 'o cartão mostra há quantos dias');
    await p.evaluate(() => { A.ui.view = 'tarefas'; A.render(false); });
    await clica(p, '#view .tk:has-text("Chamar Ana e Pedro") [data-a=tarefa]'); await calmo(p);
    mesmo(crm(st, 'JL2').contato, HOJE, 'anotou que chamou hoje');
    certo(!(await p.evaluate(() => A.c.tarefas().some(t => t.id === 'v:JL2'))), 'a tarefa saiu');
    await clica(p, '#toast .ub'); await calmo(p);
    mesmo(crm(st, 'JL2').contato, addDias(HOJE, -4), 'Desfazer volta a data');
  }],
  ['fechou: vai para "Fechado" no quadro, conta no mês e passa a cobrar as parcelas; não fechou: guarda o motivo, sai do quadro e dá para voltar a negociar', async (st, abrir) => {
    st.tabelas.trabalhos.push(LEAD('JF', { valor_total: 1200, parcela_mensal: 300, dia_da_parcela: 10 }), LEAD('JP', { cliente: 'Lucas Perdido', valor_total: 900, parcela_mensal: 300, dia_da_parcela: 10 }));
    const p = await abrir({ aparelho: 'iphone-15' });
    await irQuadro(p);
    certo(await p.evaluate(() => A.c.parcelasPrevistas(A.db.achar('TRABALHOS', 'JF')).length === 0), 'em orçamento não cobra');
    await clica(p, '#view [data-a=editJ][data-id="JF"]'); await clica(p, '#s2 [data-a=fechouJ]'); await calmo(p);
    certo(job(st, 'JF').etapa === 'Fechado' && crm(st, 'JF').fechado === HOJE, 'fechou hoje: ' + job(st, 'JF').crm);
    certo(await p.isVisible('#view .col[data-etapa="Fechado"] .job[data-id="JF"]'), 'está na coluna Fechado');
    certo(await p.evaluate(() => A.c.parcelasPrevistas(A.db.achar('TRABALHOS', 'JF')).length > 0), 'começou a cobrar as parcelas');
    igual(await p.evaluate(m => A.c.funil(m).fechados, m0), 1, '1 fechou no mês');
    await clica(p, '#view [data-a=editJ][data-id="JP"]'); await clica(p, '#s2 [data-a=perdeuJ]');
    await clica(p, '#s2 label[for="pM0"]'); await clica(p, '#s2 .save'); await calmo(p);
    certo(job(st, 'JP').etapa === 'Perdido' && crm(st, 'JP').motivo === 'Preço' && crm(st, 'JP').perdido === HOJE, 'não fechou por preço: ' + job(st, 'JP').crm);
    certo(!(await p.$('#view .board .job[data-id="JP"]')) && /Lucas Perdido/.test(await p.textContent('#view details.perd')) && /Preço/.test(await p.textContent('#view details.perd')), 'saiu do quadro e está em "Não fecharam" com o motivo');
    certo(await p.evaluate(() => A.c.parcelasPrevistas(A.db.achar('TRABALHOS', 'JP')).length === 0 && !A.c.tarefas().some(t => t.id === 'v:JP')), 'sem parcelas e sem lembrete');
    await p.evaluate(() => { document.querySelector('#view details.perd').open = true; });
    await clica(p, '#view details.perd [data-a=editJ][data-id="JP"]'); await clica(p, '#s2 [data-a=reabrirJ]'); await calmo(p);
    certo(job(st, 'JP').etapa === 'Orçamento' && !crm(st, 'JP').motivo, 'voltou a negociar: ' + job(st, 'JP').crm);
  }],
  ['sem a atualização do Supabase (falta a coluna crm): o quadro explica o passo e não deixa criar cliente pela metade', async (st, abrir) => {
    st.semColunas('trabalhos', ['crm']);
    const p = await abrir({ aparelho: 'iphone-15' });
    await irQuadro(p);
    certo(await p.isVisible('#view :text("Falta 1 passo para usar as vendas (CRM)")'), 'mostra o passo a passo');
    await clica(p, '#view [data-a=novoLead]');
    certo(await p.$('#scrim2[hidden]') && /atualização do CRM/.test(await p.textContent('#toast')), 'não abre o cadastro e avisa');
  }],
] };
