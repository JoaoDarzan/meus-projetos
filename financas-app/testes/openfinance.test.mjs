/* Testes do robô do Open Finance com uma Pluggy "de mentira" e o Supabase de mentira (dados inventados).
   Uso: node --test financas-app/testes/openfinance.test.mjs */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { avisosDoBanco, lerItens, conferirItens, nomeBanco, identificarBanco, faturaDe, paraApp, linhaNova, entreMinhas, estornos, casar, saldoBate, saldoCaixinha, caixinhaDoBanco, ajustarCaixinhas, mostraLiquido, diaNoBrasil } from '../openfinance/regras.mjs';
const require = createRequire(import.meta.url);
const { criar } = require('./supabase-de-mentira.js');
const ROBO = new URL('../openfinance/robo.mjs', import.meta.url).pathname;
const CHAVE = 'dfc_chave-de-teste-open-finance';

/* Pluggy de mentira: 1 banco com conta e cartão */
const ITEM = '11111111-2222-3333-4444-555555555555';
function pluggyFalsa(lancs0, { conector = 'BancoTeste S.A.', nomeConta = undefined, investimentos = [], atualizado = '2026-10-27T09:00:00Z', extras = [] } = {}) {
  const s = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x'), json = (c, b) => { res.writeHead(c, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(b)); };
    if (u.pathname === '/auth') { let b = ''; req.on('data', d => b += d); return req.on('end', () => JSON.parse(b).clientSecret === 'segredo-certo' ? json(200, { apiKey: 'k1' }) : json(401, { message: 'no' })); }
    if (req.headers['x-api-key'] !== 'k1') return json(403, {});
    if (u.pathname === `/items/${ITEM}`) return json(200, { id: ITEM, status: 'UPDATED', lastUpdatedAt: atualizado, connector: { name: conector } });
    if (u.pathname === '/accounts') return json(200, { results: [{ id: 'conta1', type: 'BANK', subtype: 'CHECKING_ACCOUNT', balance: 500, name: nomeConta }, { id: 'cartao1', type: 'CREDIT', subtype: 'CREDIT_CARD', balance: 300 }] });
    if (u.pathname === '/investments') return json(200, { results: investimentos });
    if (u.pathname === '/bills') return json(200, { results: [{ id: 'fat-nov', dueDate: '2026-11-07T00:00:00Z' }] });
    if (u.pathname === '/v2/transactions') {
      const lancs = lancs0.concat(extras), conta = u.searchParams.get('accountId'), todos = lancs.filter(t => t.accountId === conta), depois = u.searchParams.get('after');
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
    { id: 'LMAO', user_id: 'u-joao', data: '2026-10-19', banco: 'BancoTeste', descricao: 'gasolina', grupo: 'Necessidades', tipo: 'conta', valor: -42.5, categoria: 'Carro e transporte', subcategoria: 'Gasolina', status: 'Pago', obs: '' },
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
  assert.deepEqual(ln('Rendimento de Conta de Pagamento', 3), ['Renda', 'Renda extra', 'Rendimentos']);
  assert.deepEqual(ln('IOF DIARIO DB PF', -0.2, 'cartão'), ['Necessidades', 'Dívidas e taxas', 'Juros e multas']);
  assert.deepEqual(ln('Juros do rotativo', -2.8, 'cartão'), ['Necessidades', 'Dívidas e taxas', 'Juros e multas']);
  assert.deepEqual(ln('AJUSTE A CREDITO', 5.26, 'cartão'), ['Reembolso', 'Reembolso', 'Compra devolvida']);
  /* redistribuir o salário não é renda nova nem gasto */
  assert.deepEqual(ln('Aplicação Cofrinho', -500), ['Guardado', 'Guardado', 'Reserva'], 'mandar para o cofrinho é guardar');
  assert.deepEqual(ln('Dinheiro guardado na Caixinha', -300), ['Guardado', 'Guardado', 'Reserva']);
  assert.deepEqual(ln('Resgate Meu Porquinho', 200), ['Guardado', 'Guardado', 'Reserva'], 'tirar do cofrinho também não é renda');
  assert.deepEqual(ln('Pix recebido', 1000, 'conta', true), ['Transferência', 'Transferência', 'Entre minhas contas'], 'vindo de outra conta minha');
  assert.deepEqual((l => [l.grupo, l.subcategoria])(linhaNova({ pid: 'y', data: '2026-11-01', banco: 'B', tipo: 'conta', valor: 800, desc: 'Pix recebido', parcela: '', categoriaPluggy: 'Same person transfer' }, new Map())), ['Transferência', 'Entre minhas contas'], 'o banco diz que é a mesma pessoa');
  assert.deepEqual(ln('Rendimento da aplicação', 1.2), ['Renda', 'Renda extra', 'Rendimentos'], 'o rendimento continua sendo renda');
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

test('salário: o depósito do banco é a soma das linhas do holerite (salário, vales, bonificação, horas extras) → confere todas, não repete', () => {
  /* valores inventados */
  const H = (k, valor, extra) => Object.assign({ id: 'LCLT-2030-01-' + k, banco: 'BancoTeste', tipo: 'conta', valor, data: '2030-01-05', status: 'Previsto', obs: 'holerite' }, extra);
  const ex = [H('SAL', 2000.5), H('VR', 400), H('VT', 100), H('BON', 600), H('HE', 49.5), H('X', 99, { banco: 'Outro' }), { id: 'LOUTRA', banco: 'BancoTeste', tipo: 'conta', valor: 1000, data: '2030-01-05', status: 'Previsto', obs: '' }];
  const um = casar([{ pid: 'd1', banco: 'BancoTeste', tipo: 'conta', valor: 3150, data: '2030-01-05', desc: 'PIX RECEBIDO EMPRESA' }], ex)[0];
  assert.deepEqual([um.acao, [...um.grupo].sort()], ['conferir', ['LCLT-2030-01-BON', 'LCLT-2030-01-HE', 'LCLT-2030-01-SAL', 'LCLT-2030-01-VR', 'LCLT-2030-01-VT']]);
  /* pago em dois depósitos: o salário à parte e os vales juntos */
  const dois = casar([{ pid: 'd2', banco: 'BancoTeste', tipo: 'conta', valor: 2650, data: '2030-01-05', desc: 'SALARIO' }, { pid: 'd3', banco: 'BancoTeste', tipo: 'conta', valor: 500, data: '2030-01-06', desc: 'BENEFICIO' }], ex);
  assert.deepEqual(dois.map(x => [x.acao, [...(x.grupo || [])].sort()]), [['conferir', ['LCLT-2030-01-BON', 'LCLT-2030-01-HE', 'LCLT-2030-01-SAL']], ['conferir', ['LCLT-2030-01-VR', 'LCLT-2030-01-VT']]]);
  assert.equal(casar([{ pid: 'd4', banco: 'BancoTeste', tipo: 'conta', valor: 3000, data: '2030-01-05', desc: 'x' }], ex)[0].acao, 'novo', 'valor que nenhuma soma dá: é novo');
  assert.equal(casar([{ pid: 'd5', banco: 'Outro', tipo: 'conta', valor: 3150, data: '2030-01-05', desc: 'x' }], ex)[0].acao, 'novo', 'outro banco não casa');
  assert.equal(casar([{ pid: 'd6', banco: 'BancoTeste', tipo: 'conta', valor: 3150, data: '2030-02-20', desc: 'x' }], ex)[0].acao, 'novo', 'longe da data não casa');
  assert.equal(casar([{ pid: 'd7', banco: 'BancoTeste', tipo: 'conta', valor: 1400, data: '2030-01-05', desc: 'x' }], ex)[0].acao, 'novo', 'não mistura com linha que não é do holerite');
});

test('Pix dividido: o Pix inteiro do banco é a soma das partes LDV (pagamento + reembolso) → confere todas, não repete', () => {
  /* valores inventados */
  const D = (k, valor, extra) => Object.assign({ id: 'LDV-X1-' + k, banco: 'BancoTeste', tipo: 'conta', valor, data: '2030-01-05', status: 'Previsto', obs: 'Pix dividido' }, extra);
  const ex = [D('PAG', 250), D('R1', 80.4), D('R2', 19.6), { id: 'LDV-Y2-PAG', banco: 'BancoTeste', tipo: 'conta', valor: 250, data: '2030-01-05', status: 'Previsto', obs: '' }];
  const um = casar([{ pid: 'p1', banco: 'BancoTeste', tipo: 'conta', valor: 350, data: '2030-01-06', desc: 'PIX RECEBIDO' }], ex)[0];
  assert.deepEqual([um.acao, [...um.grupo].sort()], ['conferir', ['LDV-X1-PAG', 'LDV-X1-R1', 'LDV-X1-R2']]);
  assert.equal(casar([{ pid: 'p2', banco: 'BancoTeste', tipo: 'conta', valor: 330.4, data: '2030-01-06', desc: 'x' }], ex)[0].acao, 'novo', 'só parte das partes não casa: tem que ser o Pix inteiro');
  assert.equal(casar([{ pid: 'p3', banco: 'Outro', tipo: 'conta', valor: 350, data: '2030-01-06', desc: 'x' }], ex)[0].acao, 'novo', 'outro banco não casa');
  assert.equal(casar([{ pid: 'p4', banco: 'BancoTeste', tipo: 'conta', valor: 350, data: '2030-03-01', desc: 'x' }], ex)[0].acao, 'novo', 'longe da data não casa');
  assert.equal(casar([{ pid: 'p5', banco: 'BancoTeste', tipo: 'conta', valor: 350, data: '2030-01-06', desc: 'x' }], ex.map(l => Object.assign({}, l, { status: 'Pago' })))[0].acao, 'novo', 'parte já paga não casa de novo');
  const dois = casar([{ pid: 'p6', banco: 'BancoTeste', tipo: 'conta', valor: 350, data: '2030-01-06', desc: 'x' }, { pid: 'p7', banco: 'BancoTeste', tipo: 'conta', valor: 350, data: '2030-01-06', desc: 'x' }], ex);
  assert.deepEqual(dois.map(x => x.acao), ['conferir', 'novo'], 'o mesmo dividido não casa duas vezes');
  assert.equal(casar([{ pid: 'p8', banco: 'BancoTeste', tipo: 'conta', valor: 250, data: '2030-01-06', desc: 'x' }], ex)[0].acao, 'novo', 'uma parte sozinha não casa com outro Pix do mesmo valor');
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
  assert.ok(previa.length === 5 && previa.every(l => l.status === 'Cancelado'), 'prévia escondida (o Pix pendente da conta espera): ' + JSON.stringify(previa.map(l => [l.id, l.status])));
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
  assert.ok(novos.every(l => /conferir/.test(l.obs)), 'tudo que chega do banco vai para o Revisar, mesmo com a categoria sugerida');
  assert.ok(cli.categoria === '' && /conferir/.test(cli.obs) && cli.valor === 300, 'sem categoria vai para o Revisar');
  assert.deepEqual([loja.tipo, loja.data, loja.valor, loja.parcela], ['cartão', '2026-11-25', -100, '1/3']);
  assert.match(i.saida, /BancoTeste: sem saldo conferido no app/);
  st.tabelas.contas.push({ id: 'CB', user_id: 'u-joao', banco: 'BancoTeste', conta: 'Conta', saldo_conferido: 262.4, data_da_conferencia: '2026-10-01' });
  const de2 = await rodar(Object.assign({}, env, { MODO: 'importar' }));
  assert.match(de2.saida, /BancoTeste: confere ✓/, 'saldo do app (262,40 − 42,50 − 19,90 + 300) = banco (500)');
  const sb = st.linhas('extrato').filter(l => /^LOFS-/.test(l.id));
  assert.ok(sb.length === 1 && sb[0].id === 'LOFS-bancoteste' && sb[0].valor === 500 && sb[0].status === 'Cancelado', 'o saldo do banco fica guardado no app, escondido e um só por banco: ' + JSON.stringify(sb));
  st.tabelas.contas.find(c => c.id === 'CB').saldo_conferido = 262;
  assert.match((await rodar(Object.assign({}, env, { MODO: 'importar' }))).saida, /BancoTeste: ✗ diferente do banco/);
  assert.match(de2.saida, /Importado: 0 novos/);
  assert.equal(st.linhas('extrato').filter(l => !/^LOFS-/.test(l.id)).length, 5, 'rodar de novo não duplicou');
  } finally { await fim(); }
});

test('caixinhas: saldo do jeito do app, só as que rendem no banco, e a diferença para o total do banco dividida na proporção', () => {
  /* valores inventados */
  const cx = (id, conta, saldo, obs = 'Rende 100% do CDI', data = '2026-10-01') => ({ id, banco: 'BancoTeste', conta, saldo_conferido: saldo, data_da_conferencia: data, obs });
  const ex = [{ id: 'G1', grupo: 'Guardado', status: 'Pago', data: '2026-10-10', valor: -100, obs: 'Para Caixinha A' }, { id: 'G2', grupo: 'Guardado', status: 'Pago', data: '2026-09-10', valor: -999, obs: 'Para Caixinha A' },
    { id: 'G3', grupo: 'Guardado', status: 'Previsto', data: '2026-10-11', valor: -50, obs: 'Para Caixinha A' }, { id: 'G4', grupo: 'Guardado', status: 'Pago', data: '2026-10-12', valor: -70, obs: 'Para Caixinha Aa' }];
  assert.equal(saldoCaixinha(cx('A', 'Caixinha A', 1000), ex, '2026-10-30'), 1100, 'soma só o guardado nela, pago e depois da conferência');
  assert.equal(saldoCaixinha(cx('A', 'Caixinha A', ''), ex, '2026-10-30'), null, 'sem saldo conferido: não inventa');
  assert.deepEqual([cx('A', 'Caixinha A', 1), cx('E', 'Caixinha Empréstimo', 1, 'Rende os juros combinados (dinheiro emprestado)'), cx('C', 'Conta', 1), cx('X', 'Caixinha Sem Nada', 1, '')].map(caixinhaDoBanco), [true, false, false, false]);
  const r = ajustarCaixinhas(1712.34, [cx('A', 'Caixinha A', 1000), cx('B', 'Caixinha B', 600)], ex, '2026-10-27', '2026-10-30');
  assert.equal(r.diferenca, 12.34, 'banco 1712,34 − app (1100 + 600)');
  assert.equal(Math.round(r.mudancas.reduce((t, n) => t + n.saldo_conferido, 0) * 100) / 100, 1712.34, 'a soma fica igual à do banco');
  assert.deepEqual(r.mudancas.map(n => [n.id, n.saldo_conferido, n.data_da_conferencia]), [['A', 1107.98, '2026-10-27'], ['B', 604.36, '2026-10-27']], 'cada uma na proporção do saldo');
  assert.deepEqual([mostraLiquido([{ obs: 'Rende 102% do CDI · o app do PicPay mostra o valor líquido' }]), mostraLiquido([{ obs: 'mostra liquido' }]), mostraLiquido([{ obs: 'Rende 100% do CDI' }])], [true, true, false]);
  assert.deepEqual(ajustarCaixinhas(500, [cx('A', 'Caixinha A', 1000, 'Rende', '2026-11-05')], ex, '2026-10-27', '2026-10-30').mudancas, [], 'conferência mais nova que a do banco: não volta no tempo');
  assert.deepEqual(ajustarCaixinhas(500, [cx('A', 'Caixinha A', 1000, 'Rende', '2026-10-27')], ex, '2026-10-27', '2026-10-30').mudancas, [], 'conferência do mesmo dia da posição do banco: a sua vale mais');
});

test('dia do banco no horário de Brasília: atualização à noite não vira o dia seguinte (senão os lançamentos do dia ficam de fora da conferência)', async () => {
  assert.deepEqual([diaNoBrasil('2026-11-09T01:39:01.493Z'), diaNoBrasil('2026-11-09T14:00:00Z'), diaNoBrasil('2026-11-09T00:00:00.000Z'), diaNoBrasil('2026-11-09'), diaNoBrasil('', '2026-11-10')],
    ['2026-11-08', '2026-11-09', '2026-11-09', '2026-11-09', '2026-11-10'], 'meia-noite em ponto é data sem horário (posição das caixinhas): fica como veio');
  const { st, env, fim } = await preparar({ atualizado: '2026-10-28T01:30:00Z' });
  try {
    st.tabelas.contas.push({ id: 'CB', user_id: 'u-joao', banco: 'BancoTeste', conta: 'Conta', saldo_conferido: 262.4, data_da_conferencia: '2026-10-01' });
    const i = await rodar(Object.assign({}, env, { MODO: 'importar' }));
    assert.equal(i.codigo, 0, i.saida);
    assert.equal(st.linhas('contas').find(x => x.id === 'CB').data_da_conferencia, '2026-10-27', 'o banco atualizou às 22h30 de 27/10 (01:30Z de 28/10): conferida em 27/10');
  } finally { await fim(); }
});

test('pagamento da fatura do Inter ("PAGTO DEBITO AUTOMATICO") é reconhecido e ignorado no cartão', () => {
  const p = paraApp({ id: 'x1', type: 'CREDIT', amount: 542.51, description: 'PAGTO DEBITO AUTOMATICO', date: '2026-11-26T12:00:00Z', status: 'PENDING' }, { type: 'CREDIT' }, 'Inter', [], {});
  assert.equal(p.pagFatura, true);
});

test('cartão: compras pendentes (fatura aberta e parcelas futuras) entram como previstas, juntas no Revisar, sem aviso; quando o banco lança, a mesma linha é conferida (não duplica)', async () => {
  const cc = (n, d, extra = {}) => T(n, 'cartao1', 'DEBIT', 80, 'LOJA PARCELADA TESTE', d, Object.assign({ status: 'PENDING', creditCardMetadata: { purchaseDate: '2026-09-20T15:00:00Z', billId: 'fat-nov', installmentNumber: +n - 6, totalInstallments: 4 } }, extra));
  const extras = [cc('8', '2026-11-20T12:00:00Z'), cc('9', '2026-12-20T12:00:00Z')];
  const { st, env, fim } = await preparar({ extras });
  try {
    const i = await rodar(Object.assign({}, env, { MODO: 'importar' }));
    assert.equal(i.codigo, 0, i.saida);
    const pend = () => st.linhas('extrato').filter(l => /LOJA PARCELADA TESTE/.test(l.descricao));
    assert.equal(pend().length, 2, 'as 2 parcelas pendentes entraram');
    assert.ok(pend().every(l => l.status === 'Previsto' && /OFP aaaaaaaa/.test(l.obs) && !/\bOF aaaaaaaa/.test(l.obs) && /conferir/.test(l.obs)), 'previstas, com a marca de pendente: ' + JSON.stringify(pend().map(l => [l.status, l.obs])));
    const g = pend().map(l => (l.obs.match(/Compra (POF\w+) ·/) || [])[1]);
    assert.ok(g[0] && g[0] === g[1], 'as parcelas da mesma compra têm a mesma marca (aparecem juntas no Revisar): ' + g);
    assert.ok(!st.linhas('avisos').some(a => /LOJA PARCELADA/.test(a.corpo || '')), 'pendente não manda aviso no celular');
    await rodar(Object.assign({}, env, { MODO: 'importar' }));
    assert.equal(pend().length, 2, 'rodar de novo não duplica');
    /* o banco lança a parcela de novembro de vez, com outro número */
    extras[0] = cc('10', '2026-11-20T12:00:00Z', { status: 'POSTED' });
    await rodar(Object.assign({}, env, { MODO: 'importar' }));
    assert.equal(pend().length, 2, 'lançada de vez: confere a mesma linha, não cria outra');
    const nov = pend().find(l => l.data === '2026-11-20');
    assert.ok(/\bOF aaaaaaaa-0000-0000-0000-000000000010/.test(nov.obs) && !/OFP/.test(nov.obs), 'a linha de novembro agora tem a marca de lançada: ' + nov.obs);
    /* a parcela de dezembro você cancelou no app (não era sua): o robô não traz de volta */
    const dez = st.tabelas.extrato.find(l => /LOJA PARCELADA TESTE/.test(l.descricao) && /OFP/.test(l.obs)); dez.status = 'Cancelado';
    await rodar(Object.assign({}, env, { MODO: 'importar' }));
    assert.equal(pend().length, 2, 'a cancelada não volta como nova');
    assert.equal(pend().find(l => l.id === dez.id).status, 'Cancelado', 'continua cancelada');
  } finally { await fim(); }
});

test('cartão: a compra conferida vai para a data (e a fatura) que o banco diz', async () => {
  const extras = [T('11', 'cartao1', 'DEBIT', 55, 'LOJA MANUAL TESTE', '2026-11-30T12:00:00Z', { status: 'PENDING', creditCardMetadata: { purchaseDate: '2026-10-30T12:00:00Z', billId: 'fat-nov' } })];
  const { st, env, fim } = await preparar({ extras });
  try {
    st.tabelas.extrato.push({ id: 'LMANUAL', user_id: 'u-joao', data: '2026-12-01', banco: 'BancoTeste', descricao: 'loja manual', grupo: 'Desejos', tipo: 'cartão', valor: -55, categoria: 'Compras', subcategoria: 'Para casa', status: 'Previsto', parcela: '', obs: '' });
    const i = await rodar(Object.assign({}, env, { MODO: 'importar' }));
    assert.equal(i.codigo, 0, i.saida);
    const l = st.linhas('extrato').find(x => x.id === 'LMANUAL');
    assert.ok(l.data === '2026-11-30' && /OFP aaaaaaaa-0000-0000-0000-000000000011/.test(l.obs) && l.status === 'Previsto', 'foi para a data do banco: ' + JSON.stringify([l.data, l.obs, l.status]));
    assert.equal(st.linhas('extrato').filter(x => /LOJA MANUAL TESTE/i.test(x.descricao)).length, 0, 'não criou outra');
  } finally { await fim(); }
});

test('conferência do dia: a conta que bateu fica conferida, as caixinhas ficam iguais ao total do banco, e a foto do dia vai para a tabela saldos', async () => {
  const inv = [{ id: 'i1', type: 'FIXED_INCOME', status: 'ACTIVE', balance: 1000.5, amount: 1004.5, taxes: 4, taxes2: 0, date: '2026-10-26T00:00:00Z', name: 'CDB - BANCOTESTE' }, { id: 'i2', type: 'FIXED_INCOME', status: 'ACTIVE', balance: 610, name: 'CDB - BANCOTESTE' },
    { id: 'i3', type: 'FIXED_INCOME', status: 'TOTAL_WITHDRAWAL', balance: 0, name: 'CDB - BANCOTESTE' }];
  const { st, env, fim } = await preparar({ investimentos: inv });
  try {
    st.tabelas.contas.push({ id: 'CB', user_id: 'u-joao', banco: 'BancoTeste', conta: 'Conta', saldo_conferido: 262.4, data_da_conferencia: '2026-10-01' },
      { id: 'CA', user_id: 'u-joao', banco: 'BancoTeste', conta: 'Caixinha A', saldo_conferido: 1000, data_da_conferencia: '2026-10-01', obs: 'Rende 100% do CDI' },
      { id: 'CC', user_id: 'u-joao', banco: 'BancoTeste', conta: 'Caixinha B', saldo_conferido: 600, data_da_conferencia: '2026-10-01', obs: 'Rende 100% do CDI' },
      { id: 'CE', user_id: 'u-joao', banco: 'BancoTeste', conta: 'Caixinha Empréstimo', saldo_conferido: 300, data_da_conferencia: '2026-10-01', obs: 'Dinheiro que emprestei' });
    const i = await rodar(Object.assign({}, env, { MODO: 'importar' }));
    assert.equal(i.codigo, 0, i.saida);
    const c = id => st.linhas('contas').find(x => x.id === id);
    assert.deepEqual([c('CB').saldo_conferido, c('CB').data_da_conferencia], [500, '2026-10-27'], 'a conta bateu com o banco: conferida no dia do banco');
    assert.equal(Math.round((c('CA').saldo_conferido + c('CC').saldo_conferido) * 100) / 100, 1614.5, 'caixinhas = total BRUTO do banco (amount; quem não manda amount usa balance; a retirada total não conta)');
    const lofi = st.linhas('extrato').find(l => l.id === 'LOFI-bancoteste');
    assert.ok(lofi && lofi.valor === 1614.5 && /líquido 1610\.50 · IR 4\.00 · IOF 0\.00/.test(lofi.obs) && lofi.status === 'Cancelado', 'guarda o bruto, o líquido e o imposto, escondido: ' + JSON.stringify(lofi));
    assert.ok(c('CA').data_da_conferencia === '2026-10-26' && c('CC').data_da_conferencia === '2026-10-26', 'caixinhas conferidas no dia da posição que o banco mandou (não no da atualização)');
    assert.deepEqual([c('CE').saldo_conferido, c('CE').data_da_conferencia], [300, '2026-10-01'], 'dinheiro emprestado não é do banco: fica como está');
    const foto = st.linhas('saldos');
    assert.equal(foto.length, 4, 'uma foto por conta: ' + JSON.stringify(foto));
    assert.ok(foto.every(f => /^Z\d{4}-\d{2}-\d{2}-C[A-Z]$/.test(f.id)), 'id com o dia e a conta');
    assert.equal(foto.find(f => f.conta === 'Caixinha A').saldo, c('CA').saldo_conferido);
    assert.match(i.saida, /contas que bateram com o banco: 1/);
    assert.match(i.saida, /BancoTeste: 2 caixinha\(s\) iguais ao total bruto do banco \(diferença pequena: rendimento\)/);
    assert.ok(!/1610|1614|1000,5|610/.test(i.saida), 'o registro público não mostra valores');
    /* banco que mostra o líquido no app (PicPay): com "mostra líquido" na OBS de uma caixinha, as caixinhas seguem o líquido */
    st.tabelas.contas.find(x => x.id === 'CA').obs = 'Rende 100% do CDI · o app do banco mostra o valor líquido';
    ['CA', 'CC'].forEach(id => { st.tabelas.contas.find(x => x.id === id).data_da_conferencia = '2026-10-20'; });
    const liq = await rodar(Object.assign({}, env, { MODO: 'importar' }));
    assert.equal(Math.round((c('CA').saldo_conferido + c('CC').saldo_conferido) * 100) / 100, 1610.5, 'caixinhas = total LÍQUIDO do banco');
    assert.match(liq.saida, /iguais ao total líquido do banco/);
    /* rodar de novo no mesmo dia: troca a foto, não duplica */
    await rodar(Object.assign({}, env, { MODO: 'importar' }));
    assert.equal(st.linhas('saldos').length, 4, 'não duplicou');
    /* sem a tabela de saldos (falta rodar o SQL): o resto funciona e o registro avisa */
    st.semTabela('saldos');
    const s2 = await rodar(Object.assign({}, env, { MODO: 'importar' }));
    assert.equal(s2.codigo, 0, s2.saida);
    assert.match(s2.saida, /foto do dia: não guardada \(falta rodar financas-app\/supabase\/atualizacao-saldos\.sql/);
  } finally { await fim(); }
});

test('avisos do banco: até 4 movimentos um aviso para cada (entrou/saiu, banco, descrição); mais que isso um resumo; velho e já importado não avisam', () => {
  const H = '2026-11-09', P = (n, valor, extra) => Object.assign({ pid: `a1b2c3d4-0000-4000-8000-00000000000${n}`, acao: 'novo', data: H, banco: 'Nubank', tipo: 'conta', valor, desc: 'Teste ' + n }, extra);
  const um = avisosDoBanco([P(1, -1234.5), P(2, 500, { acao: 'conferir', banco: 'Inter' }), P(3, -9, { acao: 'ja-importado' }), P(4, -9, { data: '2026-10-01' }), P(5, -30, { tipo: 'cartão' })], H);
  assert.deepEqual(um.map(a => a.titulo), ['Saiu R$ 1.234,50 · Nubank', 'Entrou R$ 500,00 · Inter', 'Saiu R$ 30,00 · Nubank (cartão)']);
  assert.ok(um.every(a => a.tipo === 'banco' && a.quando === H && a.id.startsWith('VOF-') && a.enviado === null && /^Teste/.test(a.corpo)));
  const muitos = avisosDoBanco([1, 2, 3, 4, 5].map(n => P(n, n === 1 ? 100 : -10)), H);
  assert.equal(muitos.length, 1);
  assert.equal(muitos[0].titulo, '5 novidades do banco');
  assert.equal(muitos[0].corpo, 'Entrou R$ 100,00 · Saiu R$ 40,00. Toque para ver no app.');
  assert.ok(!/[<>"'`&\\]/.test(muitos[0].id) && muitos[0].id.length <= 120);
});
