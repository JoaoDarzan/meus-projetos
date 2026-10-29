/* Vigia diário do app no ar: faz o que um estranho faria (só com a chave pública) e confere que tudo continua fechado.
   Roda no GitHub todo dia (.github/workflows/vigia-seguranca.yml). Se algo abrir, o GitHub manda e-mail para o João.
   Só lê e tenta coisas que precisam ser recusadas: não grava nada. Uso: node financas-app/ferramentas/vigia_online.mjs */
const SUPABASE = 'https://sczpyzcozcaibyzekmau.supabase.co', CHAVE = 'sb_publishable_PLND7koek37GWekjKK50bQ_SodtXm14';
const SITES = ['https://joaodarzan.github.io/meus-projetos/financas/']; /* único endereço do app */
const TABELAS = ['extrato', 'contas', 'cartoes', 'parcelados', 'fixas', 'equipamentos', 'trabalhos', 'anexos', 'tarefas', 'metas', 'categorias', 'avisos', 'aparelhos', 'acesso_claude', 'config_servidor', 'sinal_de_vida'];
const problemas = [], ok = [], avisos = [];
const confere = (bom, txt) => (bom ? ok : problemas).push(txt);
const api = (caminho, op = {}) => fetch(SUPABASE + caminho, { ...op, headers: { apikey: CHAVE, 'Content-Type': 'application/json', ...(op.headers || {}) } });

/* 1. ninguém consegue criar conta nova */
const cfg = await (await api('/auth/v1/settings')).json();
confere(cfg.disable_signup === true, 'cadastro de contas novas desligado');
/* 2. sem login, nenhuma tabela abre */
for (const t of TABELAS) {
  const r = await api(`/rest/v1/${t}?select=*&limit=1`), corpo = await r.text();
  confere(r.status === 401 || r.status === 403 || corpo.trim() === '[]', `tabela ${t} fechada sem login (${r.status})`);
}
/* 3. sem login, não grava */
const g = await api('/rest/v1/extrato', { method: 'POST', body: JSON.stringify({ id: 'VIGIA-TESTE', descricao: 'vigia', valor: 0 }) });
confere(g.status === 401 || g.status === 403, `gravar sem login é recusado (${g.status})`);
/* 4. chave e segredo inventados são recusados */
const chute = 'dfc_' + crypto.randomUUID().replace(/-/g, '');
for (const [fn, corpo] of [['claude_ler', { p_chave: chute, p_tabela: 'extrato' }], ['claude_gravar', { p_chave: chute, p_ops: [] }], ['avisos_pendentes', { p_segredo: crypto.randomUUID(), p_hoje: new Date().toISOString().slice(0, 10) }]]) {
  const r = await api('/rest/v1/rpc/' + fn, { method: 'POST', body: JSON.stringify(corpo) });
  confere(r.status >= 400, `${fn} com chave inventada é recusada (${r.status})`);
}
/* 4b. o Netlify foi desligado: o endereço antigo não pode mais servir a versão velha do app */
const nf = await fetch('https://darzanproducoes.netlify.app/financas/', { redirect: 'manual' }).catch(() => null);
if (!nf || nf.status === 404 || (nf.status >= 300 && nf.status < 400)) ok.push('endereço antigo do Netlify não serve mais o app');
else avisos.push(`o endereço antigo do Netlify ainda responde (${nf.status}): confira se o projeto foi excluído lá.`);
/* 5. o site tem as proteções do navegador e está na versão mais nova (versão velha no ar = brechas já corrigidas abertas) */
const { readFileSync } = await import('node:fs');
const versao = (readFileSync(new URL('../../darzan-producoes/financas/index.html', import.meta.url), 'utf8').match(/\?v=(\d+)/) || [])[1];
for (const url of SITES) {
  const r = await fetch(url), html = await r.text(), noAr = (html.match(/\?v=(\d+)/) || [])[1];
  confere(noAr === versao, `${url}: está na versão nova (no ar: v${noAr}, código: v${versao})`);
  const csp = r.headers.get('content-security-policy') || (html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1] || '';
  confere(/script-src 'self'(;|$)/.test(csp) && !/unsafe-eval/.test(csp), `${url}: política de segurança (CSP) forte`);
  confere(!/<script>(?!\s*<\/script>)/.test(html), `${url}: nenhum script escrito direto na página`);
}
console.log(ok.map(x => '  ok  ' + x).join('\n'));
if (avisos.length) console.log('\nAVISOS:\n' + avisos.map(x => '  !  ' + x).join('\n'));
if (problemas.length) { console.log('\nPROBLEMAS DE SEGURANÇA:\n' + problemas.map(x => '  ✗  ' + x).join('\n')); process.exit(1); }
console.log(`\nTudo fechado: ${ok.length} conferências.`);
