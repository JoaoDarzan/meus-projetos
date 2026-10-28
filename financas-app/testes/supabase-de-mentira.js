/* Um Supabase "de mentira" para testar o app sem mexer nos dados de verdade.
   Faz o que o app usa: login (senha e renovação), ler/gravar/apagar nas tabelas, cada usuário só vê o que é dele.
   É chato como o de verdade: recusa coluna que não existe, tipo errado, linhas com colunas diferentes no mesmo envio.
   Também serve os arquivos do site (darzan-producoes/) para o navegador abrir o app.                                  */
const http = require('http'), fs = require('fs'), path = require('path'), url = require('url');
require(path.resolve(__dirname, '../../darzan-producoes/financas/js/tabelas.js'));
const T = globalThis.TABELAS;
const SITE = path.resolve(__dirname, '../../darzan-producoes');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };

const SEGREDO_TESTE = 'segredo-de-teste';
function criar(op = {}) {
  const usuarios = op.usuarios || [{ id: 'u-joao', email: 'joao@teste.com', senha: 'senha-certa' }, { id: 'u-outro', email: 'outro@teste.com', senha: 'outra' }];
  const tabelas = Object.fromEntries(Object.values(T).map(t => [t.tabela, []]));
  const colunas = Object.fromEntries(Object.values(T).map(t => [t.tabela, Object.fromEntries([['id', 'text'], ['user_id', 'uuid'], ...t.colunas.map(c => [c[1], c[2]])])]));
  /* acesso do Claude (tabela fora do app: só a impressão digital da chave) */
  tabelas.acesso_claude = []; colunas.acesso_claude = { id: 'text', user_id: 'uuid', hash: 'text', ultimo_uso: 'text', criado_em: 'text' };
  const tokens = {}; /* token → {user, vence} */
  const st = { pushes: [], pushStatus: {}, tabelas, tokens, pedidos: [], fora: false, falharProximo: 0, duracaoToken: op.duracaoToken || 3600, sinal: null };
  let seq = 0;
  const novoToken = u => { const a = `acc-${u.id}-${++seq}`, r = `ref-${u.id}-${seq}`; tokens[a] = { u, vence: Date.now() / 1000 + st.duracaoToken }; tokens['R' + r] = { u }; return { access_token: a, refresh_token: r, expires_in: st.duracaoToken, expires_at: Math.floor(Date.now() / 1000 + st.duracaoToken), token_type: 'bearer', user: { id: u.id, email: u.email } }; };
  const json = (res, status, corpo) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); res.end(corpo === undefined ? '' : JSON.stringify(corpo)); };
  const quem = req => { const t = (req.headers.authorization || '').replace(/^Bearer /, ''); const x = tokens[t]; return x && x.vence > Date.now() / 1000 ? x.u : null; };
  const confere = (tab, linha) => {
    for (const [k, v] of Object.entries(linha)) {
      const tipo = colunas[tab][k];
      if (!tipo) return `Could not find the '${k}' column of '${tab}' in the schema cache`;
      if (v === null) continue;
      if (tipo === 'numeric' && typeof v !== 'number') return `invalid input syntax for type numeric: "${v}"`;
      if (tipo === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return `invalid input syntax for type date: "${v}"`;
      if (tipo === 'boolean' && typeof v !== 'boolean') return `invalid input syntax for type boolean: "${v}"`;
      if (tipo === 'text' && typeof v !== 'string') return `column "${k}" is of type text`;
    }
    return null;
  };

  const servidor = http.createServer((req, res) => {
    const u = url.parse(req.url, true), p = u.pathname;
    if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS' }); return res.end(); }
    const partes = [];
    req.on('data', d => partes.push(d));
    req.on('end', () => {
      const bruto = Buffer.concat(partes), corpo = bruto.toString('utf8');
      /* arquivos do site */
      /* serviço de avisos de mentira (faz o papel da Apple/Google): guarda o que chegou */
      if (p.startsWith('/__push/')) {
        const id = p.slice(8), status = st.pushStatus[id] || 201;
        st.pushes.push({ id, headers: req.headers, corpo: bruto, status });
        res.writeHead(status); return res.end();
      }
      if (!p.startsWith('/auth/') && !p.startsWith('/rest/')) {
        const arq = path.join(SITE, decodeURIComponent(p.endsWith('/') ? p + 'index.html' : p));
        if (!arq.startsWith(SITE) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) { res.writeHead(404); return res.end('não achei'); }
        res.writeHead(200, { 'Content-Type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
        return res.end(fs.readFileSync(arq));
      }
      st.pedidos.push({ metodo: req.method, caminho: req.url });
      if (st.fora) { req.socket.destroy(); return; } /* "sem internet" */
      if (st.falharProximo > 0 && p.startsWith('/rest/') && req.method !== 'GET') { st.falharProximo--; return json(res, 500, { message: 'falha de teste' }); }
      if (req.headers.apikey !== 'chave-de-teste') return json(res, 401, { message: 'Invalid API key' });
      let dados = null; try { dados = corpo ? JSON.parse(corpo) : null; } catch (e) { return json(res, 400, { message: 'JSON inválido' }); }

      if (p === '/auth/v1/token') {
        if (u.query.grant_type === 'password') {
          const us = usuarios.find(x => x.email === dados.email && x.senha === dados.password);
          return us ? json(res, 200, novoToken(us)) : json(res, 400, { error: 'invalid_grant', error_description: 'Invalid login credentials' });
        }
        if (u.query.grant_type === 'refresh_token') {
          const x = tokens['R' + dados.refresh_token];
          if (!x) return json(res, 400, { error: 'invalid_grant', error_description: 'Invalid Refresh Token' });
          delete tokens['R' + dados.refresh_token];
          return json(res, 200, novoToken(x.u));
        }
      }
      if (p === '/auth/v1/logout') return json(res, 204);
      if (p === '/rest/v1/rpc/manter_ativo') { st.sinal = new Date().toISOString(); return json(res, 200, st.sinal); }
      /* acesso do Claude (como no esquema.sql): a chave abre só os dados do dono */
      if (p === '/rest/v1/rpc/claude_ler' || p === '/rest/v1/rpc/claude_gravar') {
        const h = require('crypto').createHash('sha256').update(String(dados && dados.p_chave || '')).digest('hex');
        const ac = tabelas.acesso_claude.find(x => x.hash === h);
        if (!ac) return json(res, 400, { message: 'chave do Claude errada ou desligada' });
        ac.ultimo_uso = new Date().toISOString();
        const ok = t => Object.values(T).some(x => x.tabela === t) && t !== 'aparelhos';
        if (p.endsWith('claude_ler')) { if (!ok(dados.p_tabela)) return json(res, 400, { message: 'tabela não permitida' }); return json(res, 200, tabelas[dados.p_tabela].filter(l => l.user_id === ac.user_id)); }
        let n = 0;
        for (const o of dados.p_ops) {
          if (!ok(o.tabela)) return json(res, 400, { message: 'tabela não permitida' });
          const lista = tabelas[o.tabela], l = Object.assign({}, o.linha); delete l.user_id;
          const atual = lista.find(x => x.id === l.id);
          if (o.op === 'apagar') { if (atual && atual.user_id === ac.user_id) { lista.splice(lista.indexOf(atual), 1); n++; } continue; }
          const erro = confere(o.tabela, l); if (erro) return json(res, 400, { message: erro });
          if (atual) { if (atual.user_id === ac.user_id) { Object.assign(atual, l); n++; } }
          else { lista.push(Object.assign(Object.fromEntries(Object.entries(colunas[o.tabela]).map(([k, t]) => [k, t === 'boolean' ? false : null])), l, { user_id: ac.user_id })); n++; }
        }
        return json(res, 200, { ok: true, linhas: n });
      }
      /* funções dos avisos (como no esquema.sql): só com o segredo certo */
      if (p.startsWith('/rest/v1/rpc/aviso') || p === '/rest/v1/rpc/aparelho_sumiu') {
        if (!dados || dados.p_segredo !== SEGREDO_TESTE) return json(res, 400, { message: 'segredo dos avisos errado' });
        const fn = p.slice(13);
        if (fn === 'avisos_pendentes') {
          const ate = dados.p_hoje, de = new Date(Date.parse(ate + 'T12:00:00Z') - 2 * 864e5).toISOString().slice(0, 10);
          return json(res, 200, { avisos: tabelas.avisos.filter(a => !a.enviado && a.quando <= ate && a.quando >= de).map(({ id, user_id, quando, titulo, corpo, tipo }) => ({ id, user_id, quando, titulo, corpo, tipo })), aparelhos: tabelas.aparelhos.map(({ id, user_id, endpoint, p256dh, auth }) => ({ id, user_id, endpoint, p256dh, auth })) });
        }
        if (fn === 'avisos_enviados') { let n = 0; tabelas.avisos.forEach(a => { if (dados.p_ids.includes(a.id) && !a.enviado) { a.enviado = '2026-10-27 09:07'; n++; } }); return json(res, 200, n); }
        if (fn === 'aparelho_sumiu') { tabelas.aparelhos = tabelas.aparelhos.filter(a => a.id !== dados.p_id); return json(res, 200, null); }
      }

      const m = p.match(/^\/rest\/v1\/(\w+)$/);
      if (!m || !tabelas[m[1]]) return json(res, 404, { message: 'tabela não existe' });
      const tab = m[1], lista = tabelas[tab], us = quem(req);
      if (!us) return json(res, 401, { code: 'PGRST301', message: 'JWT expired' });
      const minhas = lista.filter(l => l.user_id === us.id);
      if (req.method === 'GET') {
        const ord = minhas.slice().sort((a, b) => a.id < b.id ? -1 : 1);
        const de = +(u.query.offset || 0), ate = de + +(u.query.limit || 1000);
        return json(res, 200, ord.slice(de, Math.min(ate, de + 1000)).map(l => { const o = Object.assign({}, l); delete o.user_id; return o; }));
      }
      if (req.method === 'POST') {
        const linhas = Array.isArray(dados) ? dados : [dados];
        const chaves = Object.keys(linhas[0] || {}).sort().join();
        if (linhas.some(l => Object.keys(l).sort().join() !== chaves)) return json(res, 400, { code: 'PGRST102', message: 'All object keys must match' });
        const ids = new Set();
        for (const l of linhas) {
          const erro = confere(tab, l); if (erro) return json(res, 400, { code: '22P02', message: erro });
          if (ids.has(l.id)) return json(res, 500, { code: '21000', message: 'ON CONFLICT DO UPDATE command cannot affect row a second time' });
          ids.add(l.id);
          const dono = lista.find(x => x.id === l.id);
          if (dono && dono.user_id !== us.id) return json(res, 403, { code: '42501', message: 'new row violates row-level security policy (USING expression)' });
        }
        linhas.forEach(l => {
          const atual = lista.find(x => x.id === l.id);
          if (atual) Object.assign(atual, l);
          else { const nova = Object.fromEntries(Object.entries(colunas[tab]).map(([k, t]) => [k, t === 'boolean' ? false : null])); lista.push(Object.assign(nova, l, { user_id: us.id })); }
        });
        return json(res, 201);
      }
      if (req.method === 'DELETE') {
        const f = String(u.query.id || '').match(/^in\.\((.*)\)$/);
        if (!f) return json(res, 400, { message: 'filtro de id obrigatório' });
        const ids = f[1].split(',').map(x => decodeURIComponent(x.replace(/^"|"$/g, '')));
        tabelas[tab] = lista.filter(l => !(l.user_id === us.id && ids.includes(l.id)));
        return json(res, 204);
      }
      json(res, 405, { message: 'método não aceito' });
    });
  });
  st.ligar = porta => new Promise(ok => servidor.listen(porta || 0, '127.0.0.1', () => ok(servidor.address().port)));
  st.desligar = () => new Promise(ok => servidor.close(() => ok()));
  /* coloca dados prontos para um usuário (como se já tivesse importado) */
  st.semear = (dadosApp, userId = 'u-joao') => {
    Object.entries(dadosApp.abas).forEach(([aba, regs]) => {
      const t = T[aba]; if (!t) return;
      regs.forEach(r => {
        const l = { id: r.ID, user_id: userId };
        t.colunas.forEach(([nome, col, tipo]) => { const v = r[nome]; l[col] = v === '' || v == null ? (tipo === 'boolean' ? false : null) : tipo === 'numeric' ? +v : tipo === 'boolean' ? !!v : String(v); });
        tabelas[t.tabela].push(l);
      });
    });
  };
  /* o Supabase "esquece" os logins (como se tivessem vencido lá antes do que o celular acha) */
  st.vencerLogins = () => Object.keys(tokens).filter(k => k.startsWith('acc-')).forEach(k => delete tokens[k]);
  st.linhas = (tab, userId = 'u-joao') => st.tabelas[tab].filter(l => l.user_id === userId);
  return st;
}
module.exports = { criar };
if (require.main === module) {
  /* abrir na mão: node financas-app/testes/supabase-de-mentira.js → http://127.0.0.1:8787/financas/ */
  const st = criar(); st.semear(JSON.parse(fs.readFileSync(path.resolve(__dirname, 'dados-exemplo.json'), 'utf8')));
  st.ligar(8787).then(p => console.log(`http://127.0.0.1:${p}/financas/  (e-mail joao@teste.com, senha senha-certa)`));
}
