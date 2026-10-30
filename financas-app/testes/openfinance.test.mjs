/* Testes do robô do Open Finance com uma Pluggy "de mentira" e o Supabase de mentira (dados inventados).
   Uso: node --test financas-app/testes/openfinance.test.mjs */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { lerItens, conferirItens, nomeBanco, faturaDe, paraApp } from '../openfinance/regras.mjs';
const require = createRequire(import.meta.url);
const { criar } = require('./supabase-de-mentira.js');
const ROBO = new URL('../openfinance/robo.mjs', import.meta.url).pathname;
const CHAVE = 'dfc_chave-de-teste-open-finance';

/* Pluggy de mentira: 1 banco com conta e cartão */
const ITEM = '11111111-2222-3333-4444-555555555555';
function pluggyFalsa(lancs) {
  const s = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x'), json = (c, b) => { res.writeHead(c, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(b)); };
    if (u.pathname === '/auth') { let b = ''; req.on('data', d => b += d); return req.on('end', () => JSON.parse(b).clientSecret === 'segredo-certo' ? json(200, { apiKey: 'k1' }) : json(401, { message: 'no' })); }
    if (req.headers['x-api-key'] !== 'k1') return json(403, {});
    if (u.pathname === `/items/${ITEM}`) return json(200, { id: ITEM, status: 'UPDATED', lastUpdatedAt: '2026-10-27T09:00:00Z', connector: { name: 'BancoTeste S.A.' } });
    if (u.pathname === '/accounts') return json(200, { results: [{ id: 'conta1', type: 'BANK', subtype: 'CHECKING_ACCOUNT', balance: 500 }, { id: 'cartao1', type: 'CREDIT', subtype: 'CREDIT_CARD', balance: 300 }] });
    if (u.pathname === '/bills') return json(200, { results: [{ id: 'fat-nov', dueDate: '2026-11-07T00:00:00Z' }] });
    if (u.pathname === '/v2/transactions') {
      const conta = u.searchParams.get('accountId'), todos = lancs.filter(t => t.accountId === conta), depois = u.searchParams.get('after');
      /* duas páginas, para testar a paginação */
      return depois ? json(200, { results: todos.slice(1), next: null }) : json(200, { results: todos.slice(0, 1), next: todos.length > 1 ? `/v2/transactions?after=pag2&accountId=${conta}` : null });
    }
    json(404, {});
  });
  return new Promise(ok => s.listen(0, '127.0.0.1', () => ok(s)));
}
const T = (id, accountId, type, amount, description, date, extra = {}) => Object.assign({ id: `aaaaaaaa-0000-0000-0000-${id.padStart(12, '0')}`, accountId, type, amount, description, date, status: 'POSTED', creditCardMetadata: null }, extra);
const LANCS = [
  T('1', 'conta1', 'DEBIT', -42.5, 'PIX ENVIADO Posto Shell 123', '2026-10-20T13:00:00Z'),        // já está no app (lançado à mão) → conferir
  T('2', 'conta1', 'DEBIT', -19.9, 'Padaria Pão Quente', '2026-10-21T15:00:00Z'),                 // novo, a memória sabe a categoria
  T('3', 'conta1', 'CREDIT', 300, 'PIX RECEBIDO Cliente X', '2026-10-22T15:00:00Z'),              // novo, sem categoria → Revisar
  T('4', 'cartao1', 'DEBIT', 100, 'LOJA ONLINE', '2026-10-25T15:00:00Z', { creditCardMetadata: { purchaseDate: '2026-10-25T15:00:00Z', billId: 'fat-nov', installmentNumber: 1, totalInstallments: 3 } }),
  T('5', 'cartao1', 'CREDIT', 250, 'Pagamento recebido', '2026-10-08T15:00:00Z'),                 // pagamento da fatura → ignorar
  T('6', 'conta1', 'DEBIT', -55, 'Mercado Talvez', '2026-10-27T15:00:00Z', { status: 'PENDING' }), // pendente → espera
];

function rodar(env) {
  return new Promise(ok => execFile('node', [ROBO], { env: Object.assign({ PATH: process.env.PATH }, env) }, (e, out, err) => ok({ codigo: e ? e.code : 0, saida: out + err })));
}
async function preparar() {
  const st = criar(); st.porta = await st.ligar();
  st.tabelas.acesso_claude.push({ id: 'u-joao', user_id: 'u-joao', hash: crypto.createHash('sha256').update(CHAVE).digest('hex') });
  st.tabelas.cartoes.push({ id: 'K1', user_id: 'u-joao', cartao: 'BancoTeste', fecha_dia: 31, vence_dia: 7 });
  st.tabelas.extrato.push(
    { id: 'LMAO', user_id: 'u-joao', data: '2026-10-19', banco: 'BancoTeste', descricao: 'gasolina', grupo: 'Necessidades', tipo: 'conta', valor: -42.5, categoria: 'Transporte', subcategoria: 'Gasolina', status: 'Pago', obs: '' },
    { id: 'LPAD', user_id: 'u-joao', data: '2026-09-02', banco: 'BancoTeste', descricao: 'padaria pao quente', grupo: 'Necessidades', tipo: 'conta', valor: -12, categoria: 'Alimentação', subcategoria: 'Padaria', status: 'Pago', obs: '' });
  const pg = await pluggyFalsa(LANCS);
  const env = { MODO: '', DESDE: '2026-09-01', PLUGGY_CLIENT_ID: 'id', PLUGGY_CLIENT_SECRET: 'segredo-certo', PLUGGY_ITEMS: `BancoTeste=${ITEM}`, DF_CLAUDE_CHAVE: CHAVE,
    PLUGGY_URL: `http://127.0.0.1:${pg.address().port}`, DF_SUPABASE_URL: `http://127.0.0.1:${st.porta}`, DF_SUPABASE_CHAVE: 'chave-de-teste' };
  return { st, pg, env, fim: async () => { pg.close(); await st.desligar().catch(() => { }); } };
}

test('regras: itens, fatura e formato do app', () => {
  assert.deepEqual(lerItens(`Nubank=${ITEM}, Mercado Pago=${ITEM}\nlixo,X=123`), [{ banco: 'Nubank', id: ITEM }, { banco: 'Mercado Pago', id: ITEM }]);
  assert.deepEqual(lerItens(`Inter: "${ITEM}"`), [{ banco: 'Inter', id: ITEM }], 'aceita ":" e aspas');
  assert.deepEqual(lerItens(`${ITEM}, "${ITEM}"`), [{ banco: '', id: ITEM }, { banco: '', id: ITEM }], 'só os números, sem o nome do banco');
  assert.deepEqual(lerItens(`${ITEM} ${ITEM}`).length, 2, 'números separados por espaço');
  assert.deepEqual(conferirItens(`${ITEM},${ITEM}`), [], 'só os números está certo');
  const pr = conferirItens('Nubank=xxxx,PicPay=,abc,os números dos 5 bancos');
  assert.ok(pr.length === 4 && /Nubank.*curto/.test(pr[0]) && /PicPay: falta o número/.test(pr[1]) && /parte 3.*curto/.test(pr[2]) && /parte 4: isso é um texto com 5 palavras/.test(pr[3]) && !/xxxx|abc|números/.test(pr.join()), 'explica sem mostrar o conteúdo: ' + pr);
  assert.deepEqual(lerItens(`Nubank ${ITEM}, https://meu.pluggy.ai/items/${ITEM}`), [{ banco: '', id: ITEM }, { banco: '', id: ITEM }], 'acha o número dentro de um texto ou link copiado');
  const app = ['Nubank', 'Inter', 'Mercado Pago', 'PicPay', 'Pan', 'C6'];
  assert.deepEqual(['Banco Inter', 'Nu Pagamentos', 'Nubank', 'Mercado Pago', 'PicPay', 'Banco Pan', 'C6 Bank', 'Itaú'].map(n => nomeBanco(n, app)), ['Inter', 'Nu Pagamentos', 'Nubank', 'Mercado Pago', 'PicPay', 'Pan', 'C6', 'Itaú'], 'nome do banco igual ao do app');
  assert.equal(faturaDe('2026-10-15', { fecha_dia: 31, vence_dia: 7 }), '2026-11');
  assert.equal(faturaDe('2026-10-20', { fecha_dia: 18, vence_dia: 25 }), '2026-11');
  const p = paraApp(LANCS[3], { type: 'CREDIT' }, 'BancoTeste', [{ cartao: 'BancoTeste', fecha_dia: 31, vence_dia: 7 }], { 'fat-nov': '2026-11-07T00:00:00Z' });
  assert.deepEqual([p.tipo, p.valor, p.data, p.parcela], ['cartão', -100, '2026-11-25', '1/3'], 'compra no cartão: negativa, no mês da fatura, com a parcela');
  assert.equal(paraApp(LANCS[4], { type: 'CREDIT' }, 'BancoTeste', []).pagFatura, true);
});

test('diagnóstico: confere a conexão e só escreve contagens (o registro do GitHub é público)', async () => {
  const { env, fim } = await preparar();
  let r; try { r = await rodar(Object.assign({}, env, { MODO: 'diagnostico' })); } finally { await fim(); }
  assert.equal(r.codigo, 0, r.saida);
  assert.match(r.saida, /conexão UPDATED/); assert.match(r.saida, /cartão de crédito: 2 lançamentos/);
  for (const proibido of ['42', '19,9', '19.9', 'Shell', 'Padaria', 'Cliente', 'LOJA', '300']) assert.ok(!r.saida.includes(proibido), `a saída mostrou "${proibido}": ${r.saida}`);
});

test('segredo só com o número (sem "Banco="): o nome vem do banco e bate com o do app', async () => {
  const { st, env, fim } = await preparar();
  let r, ex; try { r = await rodar(Object.assign({}, env, { MODO: 'importar', PLUGGY_ITEMS: ` "${ITEM}" ` })); ex = st.linhas('extrato'); } finally { await fim(); }
  assert.equal(r.codigo, 0, r.saida);
  assert.match(r.saida, /\nBancoTeste: conexão UPDATED/);
  const novos = ex.filter(l => /^LOF-/.test(l.id));
  assert.ok(novos.length === 3 && novos.every(l => l.banco === 'BancoTeste'), 'gravou com o nome do banco do app: ' + novos.map(l => l.banco));
  assert.ok(/OF /.test(ex.find(l => l.id === 'LMAO').obs), 'e conferiu o lançamento feito à mão (mesmo banco)');
});

test('segredos conferidos um por um: diz qual está errado sem mostrar o valor', async () => {
  const { st, env, fim } = await preparar();
  let r, n; try { r = await rodar(Object.assign({}, env, { MODO: 'importar', PLUGGY_ITEMS: 'os números dos 5 bancos, numa linha só', DF_CLAUDE_CHAVE: 'dfc_errada' })); n = st.linhas('extrato').length; } finally { await fim(); }
  assert.notEqual(r.codigo, 0);
  assert.match(r.saida, /✓ PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET/); assert.match(r.saida, /✗ DF_CLAUDE_CHAVE/); assert.match(r.saida, /✗ PLUGGY_ITEMS: 0 número/); assert.match(r.saida, /isso é um texto com 5 palavras/);
  assert.ok(!/números|linha só|dfc_errada/.test(r.saida), 'não mostrou o conteúdo: ' + r.saida); assert.equal(n, 2);
});

test('credenciais erradas: avisa e para, sem gravar nada', async () => {
  const { st, env, fim } = await preparar();
  let r, n; try { r = await rodar(Object.assign({}, env, { MODO: 'importar', PLUGGY_CLIENT_SECRET: 'errado' })); n = st.linhas('extrato').length; } finally { await fim(); }
  assert.notEqual(r.codigo, 0); assert.match(r.saida, /✗ PLUGGY_CLIENT_ID \/ PLUGGY_CLIENT_SECRET: a Pluggy recusou/); assert.equal(n, 2);
  assert.match(r.saida, /✓ DF_CLAUDE_CHAVE/); assert.match(r.saida, /✓ PLUGGY_ITEMS/);
});

test('prévia fica escondida (cancelada) e importar grava sem repetir; rodar de novo não duplica', async () => {
  const { st, env, fim } = await preparar();
  try {
  const p = await rodar(Object.assign({}, env, { MODO: 'previa' }));
  assert.equal(p.codigo, 0, p.saida);
  const previa = st.linhas('extrato').filter(l => /^LOFP-/.test(l.id));
  assert.ok(previa.length === 5 && previa.every(l => l.status === 'Cancelado'), 'prévia escondida: ' + JSON.stringify(previa.map(l => [l.id, l.status])));
  assert.match(p.saida, /1 já estavam lá, 3 novos/);
  const i = await rodar(Object.assign({}, env, { MODO: 'importar' }));
  assert.equal(i.codigo, 0, i.saida);
  const ex = st.linhas('extrato');
  assert.ok(!ex.some(l => /^LOFP-/.test(l.id)), 'a prévia saiu');
  const mao = ex.find(l => l.id === 'LMAO');
  assert.ok(/OF aaaaaaaa-0000-0000-0000-000000000001/.test(mao.obs) && mao.valor === -42.5, 'o lançamento feito à mão foi conferido, não repetido');
  const novos = ex.filter(l => /^LOF-/.test(l.id));
  assert.equal(novos.length, 3, 'só os 3 novos (pagamento de fatura ignorado, pendente espera)');
  const pad = novos.find(l => /Padaria/.test(l.descricao)), cli = novos.find(l => /Cliente/.test(l.descricao)), loja = novos.find(l => /LOJA/.test(l.descricao));
  assert.deepEqual([pad.categoria, pad.subcategoria, pad.grupo, pad.valor], ['Alimentação', 'Padaria', 'Necessidades', -19.9], 'categoria aprendida');
  assert.ok(cli.categoria === '' && /conferir/.test(cli.obs) && cli.valor === 300, 'sem categoria vai para o Revisar');
  assert.deepEqual([loja.tipo, loja.data, loja.valor, loja.parcela], ['cartão', '2026-11-25', -100, '1/3']);
  const de2 = await rodar(Object.assign({}, env, { MODO: 'importar' }));
  assert.match(de2.saida, /Importado: 0 novos/);
  assert.equal(st.linhas('extrato').length, 5, 'rodar de novo não duplicou');
  } finally { await fim(); }
});
