/* Etapa 17 · Trabalhos completos: vídeos a entregar, comprovantes e contratos dentro do app, parcela mensal automática (valores inventados) */
const { HOJE, calmo, clica, certo, igual, conferirLayout } = require('../ajuda');
const m0 = HOJE.slice(0, 7);
const addMes = (m, n) => { const d = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1 + n, 1)); return d.toISOString().slice(0, 7); };
const FOTO = { name: 'comprovante_pix.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64') };
const PDF = { name: 'contrato_teste.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF') };
const JOB = (id, extra) => Object.assign({ id, user_id: 'u-joao', cliente: 'Casal Teste', tipo_de_evento: 'Casamento', data_do_evento: null, local: 'Espaço Teste', o_que_foi_fechado: 'Filme', valor_total: 1000, entrega: null, etapa: 'Fechado', telefone: null, contrato: null, obs: null, briefing: null, entregas: null, parcela_mensal: null, dia_da_parcela: null }, extra);
const abrirJob = async (p, id) => { await p.evaluate(() => { A.ui.view = 'trabalhos'; A.render(false); }); await clica(p, `#view [data-a=editJ][data-id="${id}"]`); await p.waitForSelector('#s2 #jVid'); };

module.exports = { etapa: 'Trabalhos: vídeos, anexos e parcelas', testes: [
  ['marcar, pôr e tirar vídeos do trabalho: fica salvo e o cartão mostra quantos estão prontos', async (st, abrir) => {
    st.tabelas.trabalhos.push(JOB('JT1', { entregas: '[ ] Teaser\n[ ] Filme' }));
    const p = await abrir({ aparelho: 'iphone-15' });
    await abrirJob(p, 'JT1');
    await clica(p, '#s2 [data-a=vidJ][data-i="0"]');
    await p.fill('#jNv', 'Making of'); await clica(p, '#s2 [data-a=addVid]');
    await p.fill('#jC', 'Casal Teste editado'); /* o que você digitou na ficha não some ao mexer nos vídeos */
    await clica(p, '#s2 [data-a=tiraVid][data-i="1"]');
    await calmo(p);
    certo(st.linhas('trabalhos').find(j => j.id === 'JT1').entregas === '[x] Teaser\n[ ] Making of', 'vídeos salvos no Supabase: ' + JSON.stringify(st.linhas('trabalhos').find(j => j.id === 'JT1').entregas));
    certo(await p.inputValue('#jC') === 'Casal Teste editado', 'o nome digitado continua na ficha');
    certo(/1 de 2 prontos/.test(await p.textContent('#jVid')), 'mostra 1 de 2 prontos');
    await conferirLayout(p, 'ficha do trabalho');
    await clica(p, '#s2 [data-a=fechar]');
    certo(/1 de 2 vídeos/.test(await p.textContent('#view [data-a=editJ][data-id="JT1"]')), 'o cartão do trabalho mostra 1 de 2 vídeos');
  }],
  ['registrar recebimento com comprovante: entra no extrato ligado ao trabalho e a foto abre no app', async (st, abrir) => {
    st.tabelas.trabalhos.push(JOB('JT2', { cliente: 'Noivos Alfa' }));
    const p = await abrir({ aparelho: 'iphone-15' });
    certo(!st.pedidos.some(x => /\/anexos\?/.test(x.caminho) && /select=\*|conteudo/.test(decodeURIComponent(x.caminho))), 'abrir o app não baixa os arquivos dos anexos: ' + st.pedidos.filter(x => /anexos/.test(x.caminho)).map(x => x.caminho));
    await abrirJob(p, 'JT2');
    await p.fill('#rV', '250'); await p.fill('#rD', 'sinal'); await p.selectOption('#rB', 'Nubank');
    await p.setInputFiles('#rArq', FOTO);
    certo(/comprovante_pix/.test(await p.textContent('#rArqN')), 'mostra o nome do arquivo escolhido');
    await clica(p, '#s2 [data-a=receber]');
    await p.waitForSelector('#s2 .vercomp'); await calmo(p);
    const l = st.linhas('extrato').find(x => x.descricao === 'Noivos Alfa - sinal');
    certo(l && l.valor === 250 && l.banco === 'Nubank' && /Trabalho JT2/.test(l.obs) && l.status === 'Pago', 'recebimento no extrato: ' + JSON.stringify(l));
    const x = st.linhas('anexos')[0];
    certo(x && x.trabalho === 'JT2' && x.lancamento === l.id && x.tipo === 'Comprovante' && x.valor === 250 && x.arquivo === 'image/jpeg', 'comprovante ligado ao recebimento: ' + JSON.stringify(x && Object.assign({}, x, { conteudo: undefined })));
    certo(/^data:image\/jpeg;base64,/.test(x.conteudo), 'a foto foi guardada no Supabase');
    igual(await p.evaluate(() => A.c.recebido(A.db.achar('TRABALHOS', 'JT2'))), 250, 'recebido do trabalho');
    await clica(p, '#s2 .vercomp');
    await p.waitForSelector('#xVer img');
    certo(/^data:image\/jpeg/.test(await p.getAttribute('#xVer img', 'src')), 'o comprovante aparece na tela');
    await conferirLayout(p, 'comprovante aberto');
    /* abrir de novo em outro aparelho: o arquivo vem do Supabase só quando abre */
    await p.evaluate(() => { localStorage.clear(); });
    const p2 = await abrir({ aparelho: 'iphone-15' });
    await abrirJob(p2, 'JT2');
    await clica(p2, '#s2 [data-a=verX]');
    await p2.waitForSelector('#xVer img');
    certo(st.pedidos.some(x => /anexos\?select=conteudo&id=eq\./.test(x.caminho)), 'o arquivo foi buscado só na hora de abrir');
  }],
  ['contrato em PDF e arquivo de outro tipo: guarda, abre e exclui', async (st, abrir) => {
    st.tabelas.trabalhos.push(JOB('JT3'));
    const p = await abrir();
    await abrirJob(p, 'JT3');
    await p.fill('#jNv', 'Filme'); await clica(p, '#s2 [data-a=addVid]'); /* mexer nos vídeos antes não pode fazer o arquivo ir duas vezes */
    await p.setInputFiles('#aArqD', PDF);
    await p.waitForSelector('#s2 #xVer'); await calmo(p); await p.waitForTimeout(300);
    certo(/Guardado no trabalho/.test(await p.textContent('#s2')), 'depois de anexar, abre o arquivo para conferir');
    igual(st.linhas('anexos').length, 1, 'o contrato foi guardado uma vez só');
    const x = st.linhas('anexos')[0];
    certo(x && x.tipo === 'Contrato' && x.arquivo === 'application/pdf' && x.nome === 'contrato teste' && /^data:application\/pdf;base64,/.test(x.conteudo), 'contrato guardado: ' + JSON.stringify(x && Object.assign({}, x, { conteudo: String(x.conteudo).slice(0, 40) })));
    certo(Buffer.from(x.conteudo.split(',')[1], 'base64').equals(PDF.buffer), 'o PDF guardado é igual ao original');
    await clica(p, '#s2 [data-a=editJ]');
    await p.setInputFiles('#aArqD', { name: 'planilha.xlsx', mimeType: 'application/vnd.ms-excel', buffer: Buffer.from('xyz') });
    await p.waitForSelector('#s2 #xVer .xarq'); await calmo(p);
    const xl = st.linhas('anexos').find(a => a.arquivo === 'application/vnd.ms-excel');
    certo(xl && Buffer.from(xl.conteudo.split(',')[1], 'base64').toString() === 'xyz', 'arquivo de outro tipo também entra, igual ao original');
    await clica(p, '#s2 [data-a=apagarX]'); await clica(p, '#s2 [data-a=apagarX]'); await calmo(p);
    await clica(p, `#jAnx [data-a=verX]`);
    await p.waitForSelector('#xVer canvas, #xVer .xarq', { timeout: 15000 });
    await clica(p, '#s2 [data-a=apagarX]'); await clica(p, '#s2 [data-a=apagarX]');
    await calmo(p);
    igual(st.linhas('anexos').length, 0, 'contrato e planilha excluídos do Supabase');
    certo(await p.isVisible('#s2 #jAnx'), 'volta para a ficha do trabalho');
  }],
  ['cliente que paga todo mês: a parcela vira "a receber" com aviso, e para quando completa o valor', async (st, abrir) => {
    st.tabelas.trabalhos.push(JOB('JT4', { cliente: 'Casal Parcela', valor_total: 600, parcela_mensal: 200, dia_da_parcela: 26, data_do_evento: addMes(m0, 10) + '-22' }));
    st.tabelas.extrato.push({ id: 'LT-P1', user_id: 'u-joao', data: addMes(m0, -1) + '-26', banco: 'PicPay', descricao: 'casamento - entrada', grupo: 'Renda', tipo: 'conta', valor: 200, categoria: 'Darzan Produções', subcategoria: 'Casamento', status: 'Pago', parcela: '', obs: 'Trabalho JT4' });
    /* outro cliente: falta só R$ 100 → uma parcela de 100 e mais nenhuma */
    st.tabelas.trabalhos.push(JOB('JT5', { cliente: 'Quase Pago', valor_total: 300, parcela_mensal: 200, dia_da_parcela: 5 }));
    st.tabelas.extrato.push({ id: 'LT-P2', user_id: 'u-joao', data: addMes(m0, -1) + '-05', banco: 'PicPay', descricao: 'quase pago - entrada', grupo: 'Renda', tipo: 'conta', valor: 200, categoria: 'Darzan Produções', subcategoria: 'Casamento', status: 'Pago', parcela: '', obs: 'Trabalho JT5' });
    /* casamento no mês que vem (dia 10): parcela normal neste mês e o saldo até 7 dias antes do evento */
    st.tabelas.trabalhos.push(JOB('JT6', { cliente: 'Casa Logo', valor_total: 1000, parcela_mensal: 200, dia_da_parcela: 26, data_do_evento: addMes(m0, 1) + '-10' }));
    st.tabelas.extrato.push({ id: 'LT-P3', user_id: 'u-joao', data: addMes(m0, -1) + '-26', banco: 'PicPay', descricao: 'entrada', grupo: 'Renda', tipo: 'conta', valor: 200, categoria: 'Darzan Produções', subcategoria: 'Casamento', status: 'Pago', parcela: '', obs: 'Trabalho JT6' });
    const p = await abrir();
    await calmo(p);
    const ev = st.linhas('extrato').filter(l => /^LJP-JT6-/.test(l.id)).sort((a, b) => a.id < b.id ? -1 : 1).map(l => [l.data, l.valor]);
    certo(JSON.stringify(ev) === JSON.stringify([[m0 + '-26', 200], [addMes(m0, 1) + '-03', 600]]), 'saldo até a semana do evento: ' + JSON.stringify(ev));
    const ult = st.linhas('extrato').filter(l => /^LJP-JT5-/.test(l.id));
    certo(ult.length === 1 && ult[0].valor === 100, 'falta R$ 100: só uma parcela de R$ 100: ' + JSON.stringify(ult.map(l => [l.id, l.valor])));
    const prev = st.linhas('extrato').filter(l => /^LJP-JT4-/.test(l.id)).sort((a, b) => a.id < b.id ? -1 : 1);
    certo(prev.length === 2 && prev[0].data === m0 + '-26' && prev[1].data === addMes(m0, 1) + '-26' && prev.every(l => l.valor === 200 && l.status === 'Previsto' && l.grupo === 'Renda'), 'parcelas deste mês e do próximo: ' + JSON.stringify(prev.map(l => [l.id, l.data, l.valor, l.status])));
    const d = await p.evaluate(() => ({ rec: A.c.recebido(A.db.achar('TRABALHOS', 'JT4')), tarefa: A.c.tarefas().find(t => t.id === 'l:LJP-JT4-' + A.u.mes(A.u.hoje())), aviso: A.c.avisos().some(a => /casal parcela - parcela/i.test(a['TITULO'])) }));
    igual(d.rec, 200, 'parcela prevista não conta como recebida');
    const r0 = await p.evaluate(m => { const r = A.c.resumo(m); return [r.entr, r.aReceber]; }, m0);
    certo(d.tarefa && d.tarefa.grupo === 'receber' && !d.tarefa.feita, 'a parcela aparece nas Tarefas para receber');
    certo(d.aviso, 'tem aviso no celular da parcela');
    /* lembrete no WhatsApp: sem número, a ficha pede o número; com número, abre o WhatsApp com a mensagem pronta */
    await p.evaluate(() => { A.ui.view = 'trabalhos'; A.render(false); });
    await clica(p, '#view [data-a=editJ][data-id="JT4"]');
    certo(await p.isVisible('#jRec .whats.sem'), 'sem WhatsApp do cliente: pede para colocar');
    await clica(p, '#jRec .whats.sem'); certo(await p.evaluate(() => document.activeElement && document.activeElement.id === 'jW'), 'leva até o campo do WhatsApp');
    await p.fill('#jW', '(19) 98888-7777'); await clica(p, '#s2 .save'); await calmo(p);
    await clica(p, '#view [data-a=editJ][data-id="JT4"]');
    const links = await p.$$eval('#jRec a.whats', as => as.map(a => decodeURIComponent(a.getAttribute('href'))));
    certo(links.length === 2 && links.every(l => l.startsWith('https://wa.me/5519988887777?text=Oi, Casal!') && /R\$ 200,00/.test(l) && /Darzan Produções/.test(l)), 'link do WhatsApp com número e mensagem: ' + links[0]);
    certo(/vence em 26\//.test(links[1]) && /desconsiderar/.test(links[1]), 'parcela que ainda vai vencer: lembrete leve');
    await clica(p, '#s2 [data-a=fechar]');
    await p.evaluate(() => { A.ui.view = 'tarefas'; A.render(false); });
    certo(await p.isVisible(`#view .tk a.whats`), 'a tarefa de receber tem o botão Lembrar');
    certo(/Receber Casal Parcela/.test(await p.textContent('#view')), 'nome do cliente com maiúscula na tarefa');
    /* ela pagou: marca a tarefa */
    await p.evaluate(() => { A.ui.view = 'tarefas'; A.render(false); });
    await clica(p, `#view [data-a=tarefa][data-id="l:LJP-JT4-${m0}"]`);
    await calmo(p);
    certo(st.linhas('extrato').find(l => l.id === 'LJP-JT4-' + m0).status === 'Pago', 'parcela marcada como recebida');
    igual(await p.evaluate(() => A.c.recebido(A.db.achar('TRABALHOS', 'JT4'))), 400, 'recebido sobe para 400');
    const r1 = await p.evaluate(m => { const r = A.c.resumo(m); return [r.entr, r.aReceber]; }, m0);
    certo(Math.abs(r1[0] - r0[0] - 200) < 0.01 && Math.abs(r0[1] - r1[1] - 200) < 0.01, 'a parcela só entra em "Entrou" quando chega (antes fica em "a receber"): ' + JSON.stringify([r0, r1]));
    /* abrir de novo não repete e não passa do valor do trabalho (600 = 3 parcelas) */
    await p.reload(); await p.waitForFunction(() => document.getElementById('splash').hidden && document.querySelector('#view').children.length); await calmo(p);
    igual(st.linhas('extrato').filter(l => /^LJP-JT4-/.test(l.id)).length, 2, 'sem parcela repetida nem a mais');
    await p.evaluate(() => { A.ui.view = 'trabalhos'; A.render(false); });
    await abrirJob(p, 'JT4');
    certo(/Próxima parcela: R\$\s?200,00 em 26\//.test(await p.textContent('#s2 .jres')), 'a ficha mostra a próxima parcela');
    await p.fill('#jPm', '150'); await clica(p, '#s2 .save'); await calmo(p);
    igual(st.linhas('trabalhos').find(j => j.id === 'JT4').parcela_mensal, 150, 'mudar o valor da parcela fica salvo');
  }],
  ['Supabase sem a atualização do SQL: o app abre, salva o trabalho e avisa o que falta', async (st, abrir) => {
    st.semColunas('trabalhos', ['briefing', 'entregas', 'parcela_mensal', 'dia_da_parcela']);
    st.semTabela('anexos');
    const p = await abrir();
    const j = await p.evaluate(() => A.c.trabalhos()[0].ID);
    await abrirJob(p, j);
    certo(await p.isVisible('#jAnx .aviso') && !(await p.$('#aArqC')) && !(await p.$('#aArqD')) && !(await p.$('#rArq')), 'avisa que não conseguiu carregar os anexos');
    certo(/rodar a atualização/.test(await p.textContent('#s2')), 'avisa que briefing e parcela dependem da atualização');
    await p.fill('#jL', 'Local novo'); await p.fill('#jBr', 'briefing que ainda não tem onde ficar');
    await clica(p, '#s2 .save'); await calmo(p);
    certo(st.linhas('trabalhos').find(x => x.id === j).local === 'Local novo', 'o resto do trabalho foi salvo');
    certo(!(await p.$('#sync.erro')), 'sem erro de salvamento');
    certo(!p.erros.length, 'sem erro na tela: ' + p.erros.join(' | '));
  }],
] };
