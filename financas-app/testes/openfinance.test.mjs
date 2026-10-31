/* Testes do robô do Open Finance com uma Pluggy "de mentira" e o Supabase de mentira (dados inventados).
   Uso: node --test financas-app/testes/openfinance.test.mjs */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { lerItens, conferirItens, nomeBanco, identificarBanco, faturaDe, paraApp, linhaNova, entreMinhas, estornos, casar, saldoBate } from '../openfinance/regras.mjs';
const require = createRequire(import.meta.url);
const { criar } = require('./supabase-de-mentira.js');
const ROBO = new URL('../openfinance/robo.mjs', import.meta.url).pathname;
const CHAVE = 'dfc_chave-de-teste-open-finance';

/* Pluggy de mentira: 1 banco com conta e cartão */
const ITEM = '11111111-2222-3333-4444-555555555555';
function pluggyFalsa(lancs, { conector = 'BancoTeste S.A.', nomeConta = undefined } = {}) {
  const s = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x'), json = (c, b) => { res.writeHead(c, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(b)); };
    if (u.pathname === '/auth') { let b = ''; req.on('data', d => b += d); return req.on('end', () => JSON.parse(b).clientSecret === 'segredo-certo' ? json(200, { apiKey: 'k1' }) : json(401, { message: 'no' })); }
    if (req.headers['x-api-key'] !== 'k1') return json(403, {});
    if (u.pathname === `/items/${ITEM}`) return json(200, { id: ITEM, status: 'UPDATED', lastUpdatedAt: '2026-10-27T09:00:00Z', connector: { name: conector } });
    if (u.pathname === '/accounts') return json(200, { results: [{ id: 'conta1', type: 'BANK', subtype: 'CHECKING_ACCOUNT', balance: 500, name: nomeConta }, { id: 'cartao1', type: 'CREDIT', subtype: 'CREDIT_CARD', balance: 300 }] });
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
async function preparar(opcoes) {
  const st = criar(); st.porta = await st.ligar();
  st.tabelas.acesso_claude.push({ id: 'u-joao', user_id: 'u-joao', hash: crypto.createHash('sha256').update(CHAVE).digest('hex') });
  st.tabelas.cartoes.push({ id: 'K1', user_id: 'u-joao', cartao: 'BancoTeste', fecha_dia: 31, vence_dia: 7 });
  st.tabelas.extrato.push(
    { id: 'LMAO', user_id: 'u-joao', data: '2026-10-19', banco: 'BancoTeste', descricao: 'gasolina', grupo: 'Necessidades', tipo: 'conta', valor: -42.5, categoria: 'Transporte', subcategoria: 'Gasolina', status: 'Pago', obs: '' },
    { id: 'LPAD', user_id: 'u-joao', data: '2026-09-02', banco: 'BancoTeste', descricao: 'padaria pao quente', grupo: 'Necessidades', tipo: 'conta', valor: -12, categoria: 'Alimentação', subcategoria: 'Padaria', status: 'Pago', obs: '' });
  const pg = await pluggyFalsa(LANCS, opcoes);
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
  const bancos = ['Nubank', 'PicPay', 'Mercado Pago', 'Inter', 'Banco Pan'], cartoes = [{ cartao: 'Nubank', vence_dia: 7 }, { cartao: 'Mercado Pago', vence_dia: 16 }, { cartao: 'Inter', vence_dia: 25 }];
  const mp = { connector: { name: 'MeuPluggy' } }, ib = (contas) => identificarBanco(mp, contas, bancos, cartoes);
  assert.deepEqual(ib([{ type: 'BANK', name: 'NU PAGAMENTOS S.A.' }]), { banco: 'Nubank', por: 'nome' }, 'Nubank pelo nome da conta');
  assert.equal(ib([{ type: 'BANK', name: 'Conta' }, { type: 'CREDIT', marketingName: 'Cartão Mercado Pago' }]).banco, 'Mercado Pago');
  assert.equal(ib([{ type: 'BANK', name: 'Banco Inter S.A.' }]).banco, 'Inter');
  assert.equal(ib([{ type: 'BANK', name: 'BANCO PAN S.A.' }]).banco, 'Banco Pan');
  assert.equal(ib([{ type: 'BANK', name: 'PicPay' }]).banco, 'PicPay');
  assert.deepEqual(ib([{ type: 'BANK', name: 'Conta corrente' }, { type: 'CREDIT', creditData: { balanceDueDate: '2026-11-25T03:00:00Z' } }]), { banco: 'Inter', por: 'vencimento do cartão' }, 'pelo dia do vencimento');
  assert.deepEqual(ib([{ type: 'BANK', name: 'Conta corrente', owner: 'Fulano Inter' }]), { banco: '', por: '' }, 'sem pista: não chuta (o nome do dono não conta)');
  const app = ['Nubank', 'Inter', 'Mercado Pago', 'PicPay', 'Pan', 'C6'];
  assert.deepEqual(['Banco Inter', 'Nu Pagamentos', 'Nubank', 'Mercado Pago', 'PicPay', 'Banco Pan', 'C6 Bank', 'Itaú'].map(n => nomeBanco(n, app)), ['Inter', 'Nu Pagamentos', 'Nubank', 'Mercado Pago', 'PicPay', 'Pan', 'C6', 'Itaú'], 'nome do banco igual ao do app');
  assert.equal(faturaDe('2026-10-15', { fecha_dia: 31, vence_dia: 7 }), '2026-11');
  assert.equal(faturaDe('2026-10-20', { fecha_dia: 18, vence_dia: 25 }), '2026-11');
  const p = paraApp(LANCS[3], { type: 'CREDIT' }, 'BancoTeste', [{ cartao: 'BancoTeste', fecha_dia: 31, vence_dia: 7 }], { 'fat-nov': '2026-11-07T00:00:00Z' });
  assert.deepEqual([p.tipo, p.valor, p.data, p.parcela], ['cartão', -100, '2026-11-25', '1/3'], 'compra no cartão: negativa, no mês da fatura, com a parcela');
  assert.equal(paraApp(LANCS[4], { type: 'CREDIT' }, 'BancoTeste', []).pagFatura, true);
  /* banco que manda as 12 parcelas juntas, todas com a data da compra: cada uma na sua fatura */
  const inter = [{ cartao: 'Inter', fecha_dia: 18, vence_dia: 25 }];
  const parc = (k, data = '2026-09-10T15:00:00Z', billId) => paraApp(T('9' + k, 'cartao1', 'DEBIT', 30, 'LOJA X', data, { creditCardMetadata: { purchaseDate: '2026-09-10T15:00:00Z', billId, installmentNumber: k, totalInstallments: 12 } }), { type: 'CREDIT' }, 'Inter', inter, { f: '2026-12-25T00:00:00Z' });
  assert.deepEqual([1, 2, 12].map(k => [parc(k).data, parc(k).parcela]), [['2026-09-10', '1/12'], ['2026-10-10', '2/12'], ['2027-08-10', '12/12']], 'parcelas mandadas juntas: cada uma na sua fatura');
  assert.equal(parc(4, '2026-12-10T15:00:00Z', 'f').data, '2026-12-10', 'banco que já manda a parcela na data dela: usa a fatura dela');
  /* regras fixas */
  assert.ok(entreMinhas('Pix enviado  - Fulano Pereira Silva', 'FULANO PEREIRA SILVA') && entreMinhas('Transferência Recebida|FULANO PEREIR', 'Fulano Pereira Silva'), 'Pix para mim mesmo');
  assert.ok(!entreMinhas('Pix recebido - Beltrano Pereira Silva', 'Fulano Pereira Silva') && !entreMinhas('Pix enviado', ''), 'outra pessoa da família não é "minhas contas"');
  const ln = (desc, valor, tipo = 'conta', propria = false) => { const l = linhaNova({ pid: 'x', data: '2026-11-01', banco: 'B', tipo, valor, desc, parcela: '', propria }, new Map()); return [l.grupo, l.categoria, l.subcategoria]; };
  assert.deepEqual(ln('Pix enviado - eu', -100, 'conta', true), ['Transferência', 'Transferência', 'Entre minhas contas']);
  assert.deepEqual(ln('Salário recebido - Portabilidade', 5000), ['Renda', 'Salário CLT', 'Salário']);
  assert.deepEqual(ln('Rendimento de Conta de Pagamento', 3), ['Renda', 'Outras rendas', 'Rendimentos']);
  assert.deepEqual(ln('IOF DIARIO DB PF', -0.2, 'cartão'), ['Necessidades', 'Dívidas', 'Juros e multas']);
  assert.deepEqual(ln('Juros do rotativo', -2.8, 'cartão'), ['Necessidades', 'Dívidas', 'Juros e multas']);
  assert.deepEqual(ln('AJUSTE A CREDITO', 5.26, 'cartão'), ['Reembolso', 'Reembolso', 'Compra devolvida']);
  assert.deepEqual(ln('Padaria', -10), ['Desejos', '', ''], 'o resto vai para o Revisar');
});

test('estorno: devolução completa deixa os dois de fora; um pouco menor entra como reembolso (o saldo bate); devolução de algo ignorado fica de fora', () => {
  const N = (pid, valor, desc, data, extra) => Object.assign({ acao: 'novo', pid, banco: 'PicPay', tipo: 'conta', valor, desc, data }, extra);
  const r = estornos([N('a', -58.84, 'PIX ENVIADO 99 FOOD', '2026-10-14'), N('b', 58.84, 'Devolução de recebimento via PIX', '2026-10-14'),
    N('c', -34.92, 'PIX ENVIADO FULANA', '2026-10-29'), N('d', 32.92, 'Devolução de recebimento via PIX', '2026-10-31'),
    N('e', 20, 'Devolução de recebimento via PIX', '2026-10-20'), N('f', -100, 'Mercado', '2026-10-20'), N('g', 100, 'PIX recebido', '2026-10-21'),
    N('h', 9.5, 'Devolução de recebimento via PIX', '2026-11-03')],
    [{ id: 'LOF-x', status: 'Cancelado', obs: 'Open Finance · OF aaaaaaaa-0000-0000-0000-000000000099 · ignorado', banco: 'PicPay', tipo: 'conta', valor: -9.5, data: '2026-11-01' }]);
  const a = Object.fromEntries(r.map(x => [x.pid, x.acao]));
  assert.deepEqual(a, { a: 'ignorar', b: 'ignorar', c: 'novo', d: 'novo', e: 'novo', f: 'novo', g: 'novo', h: 'ignorar' }, JSON.stringify(a));
  const cd = r.filter(x => x.pid === 'c' || x.pid === 'd').map(x => { const l = linhaNova(x, new Map()); return [l.grupo, l.categoria, l.subcategoria, l.valor]; });
  assert.deepEqual(cd, [['Reembolso', 'Reembolso', 'Compra devolvida', -34.92], ['Reembolso', 'Reembolso', 'Compra devolvida', 32.92]], 'os dois como reembolso: o saldo cai R$ 2, mas não vira gasto');
  assert.ok(!r.find(x => x.pid === 'e').reembolso && !r.find(x => x.pid === 'f').reembolso, 'quem não tem par não vira reembolso');
});

test('conta prevista paga atrasada (o seguro venceu dia 27 e foi pago dia 31) é conferida, não repetida; saldo bate ou não com o banco', () => {
  const ex = [{ id: 'LSEG', banco: 'PicPay', tipo: 'conta', valor: -115, data: '2026-10-27', status: 'Previsto', obs: '' }, { id: 'LPAGO', banco: 'PicPay', tipo: 'conta', valor: -115, data: '2026-10-01', status: 'Pago', obs: '' }];
  const r = casar([{ pid: 'p1', banco: 'PicPay', tipo: 'conta', valor: -115, data: '2026-10-31', desc: 'Pagamento seguro' }], ex);
  assert.deepEqual([r[0].acao, r[0].app], ['conferir', 'LSEG']);
  assert.equal(casar([{ pid: 'p2', banco: 'PicPay', tipo: 'conta', valor: -115, data: '2026-10-08', desc: 'x' }], ex)[0].acao, 'novo', 'pago à mão 7 dias antes não casa (só a prevista tem prazo maior)');
  const conta = { banco: 'PicPay', conta: 'Conta', saldo_conferido: 1000, data_da_conferencia: '2026-10-28' };
  const mov = [{ id: 'A', banco: 'PicPay', tipo: 'conta', valor: -28.94, data: '2026-10-30', status: 'Pago' }, { id: 'B', banco: 'PicPay', tipo: 'conta', valor: -50, data: '2026-10-28', status: 'Pago' },
    { id: 'C', banco: 'PicPay', tipo: 'conta', valor: -9, data: '2026-10-30', status: 'Cancelado' }, { id: 'D', banco: 'PicPay', tipo: 'conta', valor: -7, data: '2026-11-03', status: 'Previsto' }, { id: 'E', banco: 'PicPay', tipo: 'cartão', valor: -5, data: '2026-10-30', status: 'Pago' }];
  assert.equal(saldoBate(971.06, conta, mov), true, 'só conta o que saiu depois da conferência, pago, da conta');
  assert.equal(saldoBate(973.06, conta, mov), false);
  assert.equal(saldoBate(1000, { banco: 'PicPay' }, mov), null, 'sem saldo conferido: não dá para dizer');
});

test('o que o João mandou ignorar (cancelado com a marca OF) não volta', async () => {
  const { st, env, fim } = await preparar();
  st.tabelas.extrato.push({ id: 'LOF-aaaaaaaa-0000-0000-0000-000000000002', user_id: 'u-joao', data: '2026-10-21', banco: 'BancoTeste', descricao: 'Padaria Pão Quente', grupo: 'Desejos', tipo: 'conta', valor: -19.9, categoria: '', subcategoria: '', status: 'Cancelado', obs: 'Open Finance · OF aaaaaaaa-0000-0000-0000-000000000002 · ignorado' });
  let r, ex; try { r = await rodar(Object.assign({}, env, { MODO: 'importar' })); ex = st.linhas('extrato'); } finally { await fim(); }
  assert.equal(r.codigo, 0, r.saida);
  assert.ok(!ex.some(l => l.id !== 'LOF-aaaaaaaa-0000-0000-0000-000000000002' && /Padaria Pão/.test(l.descricao)), 'a padaria ignorada não voltou');
  assert.equal(ex.find(l => l.id === 'LOF-aaaaaaaa-0000-0000-0000-000000000002').status, 'Cancelado', 'e continua cancelada');
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
  assert.match(r.saida, /\nBancoTeste \(reconhecido pelo nome da conexão\): conexão UPDATED/);
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

test('Meu Pluggy: descobre o banco pelo nome da conta; sem pista, o diagnóstico avisa e importar não grava', async () => {
  let a = await preparar({ conector: 'MeuPluggy', nomeConta: 'BancoTeste S.A.' }), r;
  try { r = await rodar(Object.assign({}, a.env, { MODO: 'diagnostico', PLUGGY_ITEMS: ITEM })); } finally { await a.fim(); }
  assert.equal(r.codigo, 0, r.saida); assert.match(r.saida, /\nBancoTeste \(reconhecido pelo nome\): conexão UPDATED/);
  a = await preparar({ conector: 'MeuPluggy' });
  let d, n; try { d = await rodar(Object.assign({}, a.env, { MODO: 'diagnostico', PLUGGY_ITEMS: ITEM })); r = await rodar(Object.assign({}, a.env, { MODO: 'importar', PLUGGY_ITEMS: ITEM })); n = a.st.linhas('extrato').length; } finally { await a.fim(); }
  assert.equal(d.codigo, 0); assert.match(d.saida, /Banco 1 ✗ não reconheci/);
  assert.notEqual(r.codigo, 0); assert.match(r.saida, /sem banco reconhecido/); assert.equal(n, 2, 'nada gravado');
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
  assert.match(i.saida, /BancoTeste: sem saldo conferido no app/);
  st.tabelas.contas.push({ id: 'CB', user_id: 'u-joao', banco: 'BancoTeste', conta: 'Conta', saldo_conferido: 262.4, data_da_conferencia: '2026-10-01' });
  const de2 = await rodar(Object.assign({}, env, { MODO: 'importar' }));
  assert.match(de2.saida, /BancoTeste: confere ✓/, 'saldo do app (262,40 − 42,50 − 19,90 + 300) = banco (500)');
  st.tabelas.contas.find(c => c.id === 'CB').saldo_conferido = 262;
  assert.match((await rodar(Object.assign({}, env, { MODO: 'importar' }))).saida, /BancoTeste: ✗ diferente do banco/);
  assert.match(de2.saida, /Importado: 0 novos/);
  assert.equal(st.linhas('extrato').length, 5, 'rodar de novo não duplicou');
  } finally { await fim(); }
});
