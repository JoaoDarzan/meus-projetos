/* Etapa 24 · Vendas (CRM): cliente novo → orçamento em PDF pelo WhatsApp → lembrete de quem não respondeu → fechou / não fechou */
const { HOJE, calmo, clica, certo, igual, conferirLayout } = require('../ajuda');
const m0 = HOJE.slice(0, 7);
const addDias = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const mesmo = (a, b, msg) => certo(a === b, `${msg}: esperava ${b}, veio ${a}`);
const LEAD = (id, extra, crm) => Object.assign({ id, user_id: 'u-joao', cliente: 'Ana e Pedro', tipo_de_evento: 'Casamento', data_do_evento: addDias(HOJE, 200), local: 'Espaço Jardim', o_que_foi_fechado: null, valor_total: null, entrega: null, etapa: 'Orçamento',
  telefone: '(19) 98888-1111', contrato: null, obs: null, briefing: null, entregas: null, parcela_mensal: null, dia_da_parcela: null, crm: JSON.stringify(Object.assign({ origem: 'Instagram', criado: HOJE, contato: HOJE }, crm)) }, extra);
const job = (st, id) => st.linhas('trabalhos').find(j => j.id === id);
const crm = (st, id) => JSON.parse(job(st, id).crm || '{}');
const irQuadro = async p => { await p.evaluate(() => { A.ui.view = 'trabalhos'; A.ui.jseg = 'quadro'; A.render(false); }); await p.waitForSelector('#view .board'); };
/* o "compartilhar" do celular, de mentira: guarda o que seria mandado */
const fingirCompartilhar = p => p.evaluate(() => { navigator.canShare = () => true; navigator.share = d => { window.__mandado = { texto: d.text, arquivo: d.files[0].name, tipo: d.files[0].type, tam: d.files[0].size }; return Promise.resolve(); }; });
/* lê o texto do PDF com o pdf.js que o app já tem */
const textoDoPdf = p => p.evaluate(async () => {
  if (!window.pdfjsLib) await new Promise((ok, erro) => { const s = document.createElement('script'); s.src = 'vendor/pdfjs/pdf.min.js'; s.onload = ok; s.onerror = erro; document.head.appendChild(s); });
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdfjs/pdf.worker.min.js';
  const doc = await window.pdfjsLib.getDocument({ data: A.ultimoOrcamento.bytes.slice(), isEvalSupported: false }).promise;
  let t = ''; for (let i = 1; i <= doc.numPages; i++) { const pg = await doc.getPage(i); t += (await pg.getTextContent()).items.map(x => x.str).join(' ') + '\n'; }
  return { paginas: doc.numPages, texto: t };
});

module.exports = { etapa: 'Vendas (CRM)', testes: [
  ['cliente novo: entra em "Novo contato" com WhatsApp, de onde veio e o dia em que chamou; conta nos números do mês', async (st, abrir) => {
    const p = await abrir({ aparelho: 'iphone-15' });
    await irQuadro(p);
    await clica(p, '#view [data-a=novoLead]'); await p.waitForSelector('#s2 #nN');
    await p.fill('#s2 #nN', 'Mariana Souza'); await p.fill('#s2 #nW', '(19) 97777-2222');
    await p.selectOption('#s2 #nT', 'Casamento'); await p.fill('#s2 #nD', addDias(HOJE, 300));
    await clica(p, '#s2 label[for="nO1"]'); await p.fill('#s2 #nB', 'filme da igreja e festa');
    await conferirLayout(p, 'novo cliente');
    await clica(p, '#s2 .save'); await calmo(p);
    const j = st.linhas('trabalhos').find(x => x.cliente === 'Mariana Souza'), k = JSON.parse(j.crm);
    certo(j.etapa === 'Novo contato' && j.telefone === '(19) 97777-2222' && j.briefing === 'filme da igreja e festa', 'gravou o cliente em Novo contato: ' + JSON.stringify(j));
    certo(k.origem === 'Indicação' && k.criado === HOJE && k.contato === HOJE, 'de onde veio e quando chamou: ' + j.crm);
    certo(await p.isVisible(`#view .col[data-etapa="Novo contato"] .job[data-id="${j.id}"]`), 'aparece na coluna Novo contato');
    igual(await p.evaluate(m => A.c.funil(m).novos, m0), 1, '1 cliente novo no mês');
    certo(await p.evaluate(id => !A.c.eventosDoMes(A.ui.mes).some(x => x.ID === id) && !A.c.proximosTrabalhos(50).some(x => x.job && x.job.ID === id), j.id), 'quem ainda não fechou não entra no calendário');
  }],
  ['orçamento: itens com total, PDF com a marca (nome, itens, total, "incluso", condições) mandado pelo WhatsApp; vira "Orçamento" e guarda uma cópia', async (st, abrir) => {
    st.tabelas.trabalhos.push(LEAD('JL1', { etapa: 'Novo contato' }));
    const p = await abrir({ aparelho: 'iphone-15' });
    await irQuadro(p);
    await clica(p, '#view [data-a=editJ][data-id="JL1"]'); await p.waitForSelector('#s2 #oItens');
    const linhas = async () => p.$$('#s2 .oit');
    await p.fill('#s2 .oit:nth-child(1) [data-oi=d]', 'Filme do casamento (até 15 min), captação de 10h'); await p.fill('#s2 .oit:nth-child(1) [data-oi=v]', '2.800,00');
    await clica(p, '#s2 [data-a=addItemOrc]'); await p.fill('#s2 .oit:nth-child(2) [data-oi=d]', 'Teaser para redes sociais'); await p.fill('#s2 .oit:nth-child(2) [data-oi=v]', '400');
    await clica(p, '#s2 [data-a=addItemOrc]'); await p.fill('#s2 .oit:nth-child(3) [data-oi=d]', 'Drone');
    igual((await linhas()).length, 3, '3 itens');
    certo(/R\$\s?3\.200,00/.test(await p.textContent('#s2 #oTot')), 'total ao vivo: ' + await p.textContent('#s2 #oTot'));
    certo(/^3\.?200,00$/.test(await p.inputValue('#s2 #jV')), 'o total vai para o valor do trabalho: ' + await p.inputValue('#s2 #jV'));
    await conferirLayout(p, 'orçamento na ficha');
    await fingirCompartilhar(p);
    await clica(p, '#s2 [data-a=mandarOrc]'); await calmo(p);
    const m = await p.evaluate(() => window.__mandado);
    certo(m && m.tipo === 'application/pdf' && /^Orcamento-Darzan-ana-e-pedro\.pdf$/.test(m.arquivo) && /Ana e Pedro/.test(m.texto) && /orçamento/i.test(m.texto) && m.tam > 5000, 'mandou o PDF com a mensagem: ' + JSON.stringify(m));
    const j = job(st, 'JL1'), k = crm(st, 'JL1');
    certo(j.etapa === 'Orçamento' && j.valor_total === 3200 && k.enviado === HOJE && k.contato === HOJE && k.itens.length === 3 && k.itens[2].v === 0, 'passou para Orçamento e guardou o que foi mandado: ' + JSON.stringify([j.etapa, j.valor_total, k]));
    const pdf = await textoDoPdf(p);
    const t = pdf.texto.replace(/\s+/g, ' ');
    certo(pdf.paginas === 1 && /ORÇAMENTO/.test(t) && /Ana e Pedro/.test(t) && /Teaser para redes sociais/.test(t) && /R\$ 3\.200,00/.test(t) && /incluso/.test(t) && /Espaço Jardim/.test(t) && /ACEITO/.test(t) && /\(19\) 99527-3041/.test(t), 'o PDF abre e tem tudo: ' + t.slice(0, 400));
    const ax = st.linhas('anexos').filter(x => x.trabalho === 'JL1');
    certo(ax.length === 1 && ax[0].tipo === 'Orçamento' && /^data:application\/pdf;base64,JVBER/.test(ax[0].conteudo), 'a cópia do PDF ficou nos arquivos do trabalho');
    igual(await p.evaluate(m => A.c.funil(m).enviados, m0), 1, '1 orçamento enviado no mês');
  }],
  ['cliente sem responder há 4 dias: aparece no cartão e no Pra fazer ("Chamar de novo", com o WhatsApp pronto); marcar anota que chamou hoje, com Desfazer', async (st, abrir) => {
    st.tabelas.trabalhos.push(LEAD('JL2', {}, { enviado: addDias(HOJE, -4), contato: addDias(HOJE, -4) }), LEAD('JL3', { cliente: 'Respondeu Ontem' }, { contato: addDias(HOJE, -1) }));
    const p = await abrir({ aparelho: 'iphone-15' });
    const t = await p.evaluate(() => A.c.tarefas().filter(t => t.id.startsWith('v:')).map(t => [t.id, t.titulo, t.nota]));
    certo(t.length === 1 && t[0][0] === 'v:JL2' && /Chamar Ana e Pedro de novo/.test(t[0][1]) && /há 4 dias/.test(t[0][2]), 'só quem passou de 3 dias: ' + JSON.stringify(t));
    igual(await p.evaluate(m => A.c.funil(m).esperando, m0), 1, '1 esperando resposta');
    certo(await p.isVisible('#view .tk:has-text("Chamar Ana e Pedro de novo")'), 'está no Pra fazer do início');
    const href = await p.getAttribute('#view .tk:has-text("Chamar Ana e Pedro") a.whats', 'href');
    certo(decodeURIComponent(href).startsWith('https://wa.me/5519988881111?text=Oi, Ana e Pedro!') && /orçamento/.test(decodeURIComponent(href)), 'WhatsApp com a mensagem de retorno: ' + href);
    await irQuadro(p);
    certo(/sem resposta há 4 dias/.test(await p.textContent('#view .job[data-id="JL2"]')), 'o cartão mostra há quantos dias');
    await p.evaluate(() => { A.ui.view = 'inicio'; A.render(false); });
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
