/* Etapa 18 · Trabalhos no dia a dia: arrastar entre as etapas, clientes recorrentes, balanço da Darzan e anexos de qualquer tipo (valores inventados) */
const { HOJE, calmo, clica, certo, igual, conferirLayout } = require('../ajuda');
const ano = HOJE.slice(0, 4), m0 = HOJE.slice(0, 7);
const addMes = (m, n) => { const d = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1 + n, 1)); return d.toISOString().slice(0, 7); };
const JOB = (id, cliente, etapa, extra) => Object.assign({ id, user_id: 'u-joao', cliente, tipo_de_evento: 'Casamento', data_do_evento: null, local: null, o_que_foi_fechado: null, valor_total: 1000, entrega: null, etapa, telefone: null, contrato: null, obs: null, briefing: null, entregas: null, parcela_mensal: null, dia_da_parcela: null }, extra);
const REC = (id, data, desc, valor) => ({ id, user_id: 'u-joao', data, banco: 'PicPay', descricao: desc, grupo: 'Renda', tipo: 'conta', valor, categoria: 'Darzan Produções', subcategoria: 'Storymaker', status: 'Pago', parcela: '', obs: '' });
const PNG = { name: 'print do pix.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64') };
const quadro = st => { st.tabelas.trabalhos = [JOB('JA', 'Noivos Um', 'Fechado'), JOB('JB', 'Noivos Dois', 'Entregue'), JOB('JC', 'Empresa Três', 'Orçamento')]; };
const etapa = (st, id) => st.linhas('trabalhos').find(j => j.id === id).etapa;
const centro = async (p, sel) => { const r = await p.locator(sel).first().boundingBox(); return { x: r.x + r.width / 2, y: r.y + Math.min(r.height / 2, 40) }; };

module.exports = { etapa: 'Trabalhos: quadro, recorrentes e balanço', testes: [
  ['no computador: arrastar o cartão para outra coluna muda a etapa, com Desfazer; só tocar abre o trabalho', async (st, abrir) => {
    quadro(st);
    const p = await abrir({ larg: 1280, alt: 900 });
    await p.evaluate(() => { A.ui.view = 'trabalhos'; A.render(false); });
    const de = await centro(p, '#view .job[data-id="JA"]'), para = await centro(p, '#view .col[data-etapa="Em andamento"] .col-h');
    await p.mouse.move(de.x, de.y); await p.mouse.down();
    await p.mouse.move(de.x + 30, de.y + 10, { steps: 4 });
    certo(await p.$('.job.fantasma') && await p.$('#view .job.arrastando'), 'o cartão "levanta" ao arrastar');
    await p.mouse.move(para.x, para.y + 40, { steps: 12 });
    certo(await p.$('#view .col[data-etapa="Em andamento"].alvo'), 'a coluna de destino acende');
    await p.mouse.up(); await calmo(p);
    igual(st.linhas('trabalhos').length, 3, 'nenhum trabalho a mais nem a menos');
    certo(etapa(st, 'JA') === 'Em andamento', 'foi para Em andamento no Supabase: ' + etapa(st, 'JA'));
    certo(!(await p.$('.job.fantasma')) && (await p.$('#scrim2[hidden]')), 'soltar não abre a ficha e não deixa sobra na tela');
    certo(await p.$('#view .col[data-etapa="Em andamento"] .job[data-id="JA"]'), 'o cartão aparece na coluna nova');
    await clica(p, '#toast .ub'); await calmo(p); /* Desfazer */
    certo(etapa(st, 'JA') === 'Fechado', 'Desfazer volta para Fechado');
    /* soltar na mesma coluna não muda nada */
    const a2 = await centro(p, '#view .job[data-id="JB"]');
    await p.mouse.move(a2.x, a2.y); await p.mouse.down(); await p.mouse.move(a2.x + 20, a2.y + 20, { steps: 4 }); await p.mouse.up(); await calmo(p);
    certo(etapa(st, 'JB') === 'Entregue', 'arrastar um pouquinho e soltar na mesma coluna não muda');
    await clica(p, '#view .job[data-id="JC"]');
    certo(await p.isVisible('#s2 #jVid'), 'um toque normal abre o trabalho');
  }],
  ['no celular: segurar o cartão e arrastar (a tela rola sozinha até a coluna); deslizar rápido só rola o quadro', async (st, abrir) => {
    quadro(st);
    const p = await abrir({ aparelho: 'iphone-15' });
    await p.evaluate(() => { A.ui.view = 'trabalhos'; A.render(false); });
    const toque = (tipo, x, y) => p.evaluate(([tipo, x, y]) => { const el = document.elementFromPoint(x, y) || document.body; el.dispatchEvent(new PointerEvent(tipo, { bubbles: true, cancelable: true, pointerType: 'touch', pointerId: 7, isPrimary: true, clientX: x, clientY: y })); }, [tipo, x, y]);
    await p.evaluate(() => document.querySelector('#view .job[data-id="JC"]').scrollIntoView({ block: 'center' }));
    const c0 = await centro(p, '#view .job[data-id="JC"]');
    /* deslizar sem segurar: não arrasta */
    await toque('pointerdown', c0.x, c0.y); await p.waitForTimeout(80); await toque('pointermove', c0.x - 60, c0.y);
    const levantou = !!(await p.$('.job.fantasma'));
    await toque('pointerup', c0.x - 60, c0.y); await p.waitForTimeout(400);
    certo(!levantou && etapa(st, 'JC') === 'Orçamento', 'deslizar rápido não levanta nem move o trabalho');
    /* segurar e arrastar até a última coluna (fora da tela: o quadro rola sozinho) */
    await toque('pointerdown', c0.x, c0.y); await p.waitForTimeout(420);
    certo(await p.$('.job.fantasma'), 'segurar ~0,3s levanta o cartão');
    const W = await p.evaluate(() => innerWidth);
    for (let i = 0; i < 60; i++) { await toque('pointermove', W - 12, c0.y); await p.waitForTimeout(30); }
    await toque('pointerup', W - 12, c0.y); await calmo(p);
    certo(etapa(st, 'JC') === 'Entregue', 'arrastou até Entregue: ' + etapa(st, 'JC'));
    await conferirLayout(p, 'quadro no celular');
  }],
  ['dentro do trabalho: as etapas mudam com um toque e "Salvar" não desfaz a mudança', async (st, abrir) => {
    quadro(st);
    const p = await abrir({ aparelho: 'iphone-15' });
    await p.evaluate(() => { A.ui.view = 'trabalhos'; A.render(false); });
    await clica(p, '#view .job[data-id="JB"]');
    await clica(p, '#s2 [data-a=etapaJ][data-v="Em andamento"]'); await calmo(p);
    certo(etapa(st, 'JB') === 'Em andamento', 'toque na etapa salva na hora');
    certo(await p.getAttribute('#s2 [data-a=etapaJ][data-v="Em andamento"]', 'aria-pressed') === 'true', 'a etapa escolhida fica marcada');
    await p.fill('#jL', 'Salão novo'); await clica(p, '#s2 .save'); await calmo(p);
    const j = st.linhas('trabalhos').find(x => x.id === 'JB');
    certo(j.etapa === 'Em andamento' && j.local === 'Salão novo', 'salvar a ficha mantém a etapa: ' + j.etapa);
    await clica(p, '#view [data-a=novoJ]');
    await clica(p, '#s2 [data-a=etapaJ][data-v="Fechado"]');
    await p.fill('#jC', 'Cliente Novo'); await clica(p, '#s2 .save'); await calmo(p);
    certo(st.linhas('trabalhos').find(x => x.cliente === 'Cliente Novo').etapa === 'Fechado', 'trabalho novo nasce na etapa escolhida');
  }],
  ['cliente recorrente sai do quadro e mostra quanto rendeu em cada mês, a média e o total', async (st, abrir) => {
    quadro(st);
    st.tabelas.trabalhos.push(JOB('JR', 'Cliente Mensal', 'Em andamento', { tipo_de_evento: 'Social media', valor_total: null }));
    st.tabelas.extrato.push(REC('LR1', addMes(m0, -2) + '-05', 'cliente mensal - 3 vídeos', 300), REC('LR2', addMes(m0, -2) + '-20', 'cliente mensal - captação', 200), REC('LR3', m0 + '-02', 'Cliente Mensal 4 vídeos', 400));
    const p = await abrir({ aparelho: 'iphone-15' });
    await p.evaluate(() => { A.ui.view = 'trabalhos'; A.render(false); });
    await clica(p, '#view .job[data-id="JR"]');
    await clica(p, '#s2 [data-a=etapaJ][data-v="Recorrente"]'); await calmo(p);
    await clica(p, '#s2 [data-a=fechar]');
    certo(etapa(st, 'JR') === 'Recorrente' && !(await p.$('#view .board .job[data-id="JR"]')), 'saiu do quadro');
    await clica(p, '#view [data-a=seg][data-s=jseg][data-v=recorrentes]'); await p.waitForTimeout(500);
    const txt = (await p.textContent('#view')).replace(/\s+/g, ' ');
    certo(/Cliente Mensal/.test(txt), 'aparece nos recorrentes');
    certo(/Este mês\s*R\$\s?400/.test(txt), 'este mês: 400 — ' + txt.slice(0, 600));
    certo(/Média por mês\s*R\$\s?300\s*em 3 meses/.test(txt), 'média: 900 em 3 meses = 300');
    certo(/Total\s*R\$\s?900/.test(txt) && /Pagamentos\s*3/.test(txt), 'total 900 em 3 pagamentos');
    certo(/R\$\s?500,00/.test(txt), 'o mês de 2 pagamentos soma 500');
    igual(await p.$$eval('#view [id^=chRec] svg .col', g => g.length), 3, 'gráfico com uma coluna por mês');
    await conferirLayout(p, 'recorrentes');
  }],
  ['balanço da Darzan: trabalhos por mês e no ano, quanto entrou (trabalhos e recorrentes) e quais clientes', async (st, abrir) => {
    st.tabelas.trabalhos = [JOB('J1', 'Casal Março', 'Entregue', { data_do_evento: ano + '-03-14', valor_total: 2000 }), JOB('J2', 'Casal Março 2', 'Entregue', { data_do_evento: ano + '-03-28', valor_total: 1000 }),
      JOB('J3', 'Palestra Maio', 'Entregue', { tipo_de_evento: 'Palestra', data_do_evento: ano + '-05-10', valor_total: 600 }), JOB('J4', 'Orçamento Maio', 'Orçamento', { data_do_evento: ano + '-05-20' }),
      JOB('J5', 'Ano Passado', 'Entregue', { data_do_evento: (+ano - 1) + '-12-10' }), JOB('J6', 'Mensal', 'Recorrente', { tipo_de_evento: 'Social media', valor_total: null })];
    st.tabelas.extrato = st.tabelas.extrato.filter(l => l.categoria !== 'Darzan Produções').concat([REC('B1', ano + '-03-14', 'casal março', 2000), REC('B2', ano + '-03-20', 'mensal - vídeos', 300), REC('B3', ano + '-05-10', 'palestra maio', 600), REC('B4', ano + '-05-15', 'mensal - vídeos', 300)]);
    const p = await abrir({ aparelho: 'iphone-15' });
    const b = await p.evaluate(a => A.c.balancoDarzan(a).map(x => [x.m, x.fat, x.rec, x.trab, x.jobs.map(j => j.ID)]), ano);
    const mar = b.find(x => x[0] === ano + '-03'), mai = b.find(x => x[0] === ano + '-05');
    certo(JSON.stringify(mar) === JSON.stringify([ano + '-03', 2300, 300, 2000, ['J1', 'J2']]), 'março: ' + JSON.stringify(mar));
    certo(JSON.stringify(mai) === JSON.stringify([ano + '-05', 900, 300, 600, ['J3']]), 'maio sem o orçamento: ' + JSON.stringify(mai));
    await p.evaluate(() => { A.ui.view = 'trabalhos'; A.ui.jseg = 'balanco'; A.render(false); });
    await p.waitForTimeout(500);
    const txt = (await p.textContent('#view')).replace(/\s+/g, ' ');
    certo(new RegExp(`Trabalhos em ${ano}\\s*3\\s*eventos`).test(txt), 'trabalhos no ano: 3 (sem orçamento, recorrente e ano passado)');
    certo(new RegExp(`Faturou em ${ano}\\s*R\\$\\s?3\\.200`).test(txt) && /Dos recorrentes\s*R\$\s?600/.test(txt), 'faturou 3.200, 600 dos recorrentes');
    certo(/Valor médio\s*R\$\s?1\.200/.test(txt), 'valor médio 1.200');
    certo(/Março\s*R\$\s?2\.300,00\s*2 trabalhos · R\$\s?300 dos recorrentes/.test(txt) && /Casal Março/.test(txt) && /Palestra Maio/.test(txt), 'mês a mês com os clientes');
    certo(await p.$$eval('#chBal svg .col', g => g.length) >= 5, 'gráfico do ano por mês');
    await clica(p, `#view [data-a=seg][data-s=jano][data-v="${+ano - 1}"]`); await p.waitForTimeout(300);
    certo(/Ano Passado/.test(await p.textContent('#view')), 'dá para ver o ano anterior');
    await conferirLayout(p, 'balanço');
  }],
  ['anexos: o aviso some quando a tabela passa a existir; foto, print PNG e PDF entram; o comprovante fica ligado ao recebimento', async (st, abrir) => {
    quadro(st);
    st.tabelas.extrato.push(Object.assign(REC('LX1', m0 + '-05', 'noivos um - sinal', 300), { obs: 'Trabalho JA' }));
    st.semTabela('anexos');
    const p = await abrir({ aparelho: 'iphone-15' });
    await p.evaluate(() => { A.ui.view = 'trabalhos'; A.render(false); });
    await clica(p, '#view .job[data-id="JA"]');
    certo(await p.isVisible('#jAnx [data-a=recarregarX]') && !(await p.$('#aArqC')), 'sem a tabela: avisa e oferece tentar de novo');
    st.criarTabela('anexos');
    await clica(p, '#jAnx [data-a=recarregarX]');
    await p.waitForSelector('#aArqC', { state: 'attached' });
    certo(!/rodar a atualização|Não consegui carregar/.test(await p.textContent('#jAnx')), 'o aviso sumiu sem precisar fechar o app');
    await p.setInputFiles('#aArqC', PNG);
    await p.waitForSelector('#s2 #xVer img'); await calmo(p);
    const x = st.linhas('anexos')[0];
    certo(x && x.tipo === 'Comprovante' && x.arquivo === 'image/jpeg' && x.nome === 'print do pix', 'print PNG vira JPEG leve: ' + JSON.stringify(x && Object.assign({}, x, { conteudo: undefined })));
    await p.selectOption('#xL', 'LX1'); await clica(p, '#s2 .save'); await calmo(p);
    const y = st.linhas('anexos')[0];
    certo(y.lancamento === 'LX1' && y.valor === 300 && y.data === m0 + '-05', 'ligado ao recebimento (valor e data dele): ' + JSON.stringify(Object.assign({}, y, { conteudo: undefined })));
    certo(await p.isVisible('#jRec .vercomp'), 'o recebimento mostra "Ver comprovante"');
    await p.setInputFiles('#aArqC', { name: 'foto.heic', mimeType: 'image/heic', buffer: Buffer.from('nao-e-uma-foto-que-o-chrome-abre') });
    await p.waitForSelector('#s2 #xVer'); await calmo(p);
    certo(st.linhas('anexos').some(a => a.arquivo === 'image/heic'), 'foto que o navegador não abre (HEIC) entra como está');
  }],
  ['tela cheia com zoom e botão de compartilhar/salvar', async (st, abrir) => {
    quadro(st);
    st.tabelas.anexos.push({ id: 'XV1', user_id: 'u-joao', trabalho: 'JA', lancamento: null, nome: 'Comprovante teste', tipo: 'Comprovante', data: m0 + '-05', valor: 300, arquivo: 'image/png', tamanho: 100, conteudo: 'data:image/png;base64,' + PNG.buffer.toString('base64') });
    const p = await abrir({ aparelho: 'iphone-15' });
    await p.evaluate(() => { A.ui.view = 'trabalhos'; A.render(false); });
    await clica(p, '#view .job[data-id="JA"]');
    await clica(p, '#jAnx [data-a=verX]');
    await p.waitForSelector('#xVer img');
    await clica(p, '#s2 .grid2 [data-a=telaX]');
    await p.waitForSelector('#visor .vpg img');
    await clica(p, '#visor [data-a=zoomV][data-v="1"]');
    certo(await p.evaluate(() => getComputedStyle(document.getElementById('vPg')).getPropertyValue('--z').trim()) === '1.5', 'o zoom aumenta');
    const baixou = p.waitForEvent('download', { timeout: 5000 });
    await clica(p, '#visor [data-a=shareX]');
    certo((await baixou).suggestedFilename() === 'Comprovante teste.png', 'sem "compartilhar" no aparelho, o arquivo é baixado com o nome certo');
    await clica(p, '#visor [data-a=fecharVisor]');
    certo(!(await p.$('#visor')) && await p.isVisible('#s2 #xVer'), 'fechar a tela cheia volta para o anexo');
  }],
] };
