/* Robô do Open Finance: traz os lançamentos dos bancos (Meu Pluggy) para o app, sem repetir o que já está lá.
   Modos (MODO): diagnostico (só confere a conexão e conta), previa (monta o que entraria, guardado escondido no app
   para conferir antes) e importar (grava de verdade).
   ⚠️ O registro do GitHub é público: aqui só se escrevem CONTAGENS, nunca valores, nomes ou descrições.
   Segredos (GitHub): PLUGGY_CLIENT_ID, PLUGGY_CLIENT_SECRET, PLUGGY_ITEMS ("Nubank=id,PicPay=id,..." ou só os ids separados por vírgula), DF_CLAUDE_CHAVE. */
import { criarPluggy } from './pluggy.mjs';
import { avisosDoBanco, sem, lerItens, conferirItens, nomeBanco, identificarBanco, paraApp, casar, estornos, memoria, linhaNova, saldoBate, saldoCaixinha, caixinhaDoBanco, ajustarCaixinhas, mostraLiquido, diaNoBrasil } from './regras.mjs';

const SUPABASE = process.env.DF_SUPABASE_URL || 'https://sczpyzcozcaibyzekmau.supabase.co';
const PUBLICA = process.env.DF_SUPABASE_CHAVE || 'sb_publishable_PLND7koek37GWekjKK50bQ_SodtXm14';
const MODO = (process.env.MODO || process.argv[2] || 'diagnostico').toLowerCase();
const DESDE = process.env.DESDE || '2026-10-29'; /* dia depois da conferência dos saldos no app (antes disso foi tudo lançado à mão) */
const hoje = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);

const rpc = async (fn, corpo) => {
  const r = await fetch(`${SUPABASE}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: PUBLICA, 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ p_chave: process.env.DF_CLAUDE_CHAVE }, corpo)) });
  if (!r.ok) throw new Error(`o app recusou (${fn}, ${r.status}): confira o segredo DF_CLAUDE_CHAVE`);
  return r.json();
};
const ler = t => rpc('claude_ler', { p_tabela: t });
const gravar = async ops => { for (let i = 0; i < ops.length; i += 400) await rpc('claude_gravar', { p_ops: ops.slice(i, i + 400) }); };
const u2 = v => Math.round(v * 100) / 100;
const contar = (xs, f) => xs.reduce((o, x) => { const k = f(x); o[k] = (o[k] || 0) + 1; return o; }, {});

async function principal() {
  /* confere os 4 segredos, um por um, antes de tudo (✓/✗ sem mostrar nenhum valor) */
  const itens = lerItens(process.env.PLUGGY_ITEMS), probs = conferirItens(process.env.PLUGGY_ITEMS);
  console.log(`Modo: ${MODO} · lançamentos desde ${DESDE}\n\nConferindo os segredos:`);
  let ok = true, pg = null, cartoes = [], bancosDoApp = [], contasApp = [];
  if (!process.env.PLUGGY_CLIENT_ID || !process.env.PLUGGY_CLIENT_SECRET) { ok = false; console.log('  ✗ PLUGGY_CLIENT_ID / PLUGGY_CLIENT_SECRET: falta um dos dois'); }
  else {
    pg = criarPluggy({ clientId: process.env.PLUGGY_CLIENT_ID, clientSecret: process.env.PLUGGY_CLIENT_SECRET, base: process.env.PLUGGY_URL || undefined });
    try { await pg.entrar(); console.log('  ✓ PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET: a Pluggy aceitou'); }
    catch (e) { ok = false; console.log(`  ✗ PLUGGY_CLIENT_ID / PLUGGY_CLIENT_SECRET: ${e.message}`); }
  }
  try { cartoes = await ler('cartoes'); contasApp = await ler('contas'); bancosDoApp = contasApp.map(c => c.banco).concat(cartoes.map(k => k.cartao)); console.log('  ✓ DF_CLAUDE_CHAVE: o app aceitou'); }
  catch (e) { ok = false; console.log(`  ✗ DF_CLAUDE_CHAVE: ${e.message}`); }
  if (probs.length || !itens.length) { ok = false; console.log(`  ✗ PLUGGY_ITEMS: ${itens.length} número(s) de conexão certos${probs.length ? '; problemas:\n' + probs.map(x => '      · ' + x).join('\n') : ''}`); }
  else console.log(`  ✓ PLUGGY_ITEMS: ${itens.length} número(s) de conexão no formato certo`);
  if (!ok) throw new Error('arrume o segredo marcado com ✗ e rode de novo (nada foi gravado)');
  let abertos = 0, semNome = 0;
  const saldos = [], caixas = [], detalhes = [];
  const propostas = [];
  for (const [i, item] of itens.entries()) {
    const id = item.id;
    let it, banco = item.banco;
    try { it = await pg.item(id); } catch (e) { console.log(`\n✗ ${banco || 'conexão ' + (i + 1)}: não consegui abrir a conexão (${e.message}). Confira o itemId.`); continue; }
    const contas = await pg.contas(id);
    /* sem nome no segredo: descobre o banco (o Meu Pluggy chama todos de "MeuPluggy"), sempre com o nome do app */
    let como = 'nome no segredo';
    if (!banco) {
      const ac = identificarBanco(it, contas, bancosDoApp, cartoes), doConector = nomeBanco(it.connector && it.connector.name, bancosDoApp);
      if (ac.banco) { banco = ac.banco; como = ac.por; }
      else if (bancosDoApp.includes(doConector)) { banco = doConector; como = 'nome da conexão'; }
      else { banco = `Banco ${i + 1}`; como = ''; }
    }
    abertos++;
    if (!como) semNome++;
    console.log(`\n${banco}${como ? ` (reconhecido pelo ${como})` : ' ✗ não reconheci qual banco é'}: conexão ${it.status}${it.lastUpdatedAt ? ' · atualizada em ' + String(it.lastUpdatedAt).slice(0, 10) : ''} · ${contas.length} conta(s)`);
    contas.filter(c => c.type === 'BANK' && c.subtype !== 'SAVINGS_ACCOUNT').slice(0, 1).forEach(c => saldos.push({ banco, saldo: c.balance, em: it.lastUpdatedAt || '' }));
    /* caixinhas e cofrinhos: o banco manda como investimento (ou poupança); guarda o saldo de cada um para o app conferir todo dia */
    const invs = await pg.investimentos(id);
    /* o Open Finance não manda o nome da caixinha (cada depósito vira uma aplicação "CDB - banco"): soma tudo do banco num total só */
    /* modo "caixinhas": guarda o detalhe de cada aplicação escondido no app (só para o Claude entender o que o banco manda; nada no registro público) */
    if (MODO === 'caixinhas') detalhes.push({ banco, lotes: invs.map(v => Object.fromEntries(Object.entries(v).filter(([k, x]) => x != null && typeof x !== 'object' && !/^(id|itemId|accountId)$/.test(k)))), poup: contas.filter(c => c.subtype === 'SAVINGS_ACCOUNT').length });
    const ativos = invs.filter(v => v.status !== 'TOTAL_WITHDRAWAL' && v.balance != null);
    const poup = contas.filter(c => c.subtype === 'SAVINGS_ACCOUNT' && c.balance != null);
    /* bruto (amount: com o rendimento, antes do imposto, o número grande do app do banco) e líquido (balance: o que cai na conta se sacar hoje) */
    const soma = f => u2(ativos.reduce((t, v) => t + +(f(v) || 0), 0) + poup.reduce((t, c) => t + +c.balance, 0));
    if (ativos.length || poup.length) caixas.push({ banco, saldo: soma(v => v.amount != null ? v.amount : v.balance), liquido: soma(v => v.balance), ir: soma(v => v.taxes), iof: soma(v => v.taxes2), n: ativos.length + poup.length,
      /* a data da posição que o banco mandou (alguns bancos mandam com dias de atraso); sem ela, a da última atualização */
      em: ativos.map(v => String(v.date || '').slice(0, 10)).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().pop() || it.lastUpdatedAt || '' });
    console.log(`  · caixinhas e aplicações: ${invs.length} pelo banco${contas.some(c => c.subtype === 'SAVINGS_ACCOUNT') ? ' + poupança' : ''}${invs.length ? ' (' + Object.entries(contar(invs, v => `${v.type || '?'}/${v.status || 'sem status'}/${v.balance != null ? 'com saldo' : v.amount != null ? 'só amount' : 'sem valor'}`)).map(([k, n]) => `${n} ${k}`).join(', ') + ')' : ''}`);
    for (const c of contas) {
      /* no cartão, o banco pode mandar a compra com a data em que ela entrou na fatura (antes do começo); busca 45 dias antes e fica só com o que cai a partir de DESDE */
      const ts = await pg.lancamentos(c.id, c.type === 'CREDIT' ? new Date(Date.parse(DESDE + 'T12:00:00Z') - 45 * 864e5).toISOString().slice(0, 10) : DESDE), faturas = {};
      if (c.type === 'CREDIT' && MODO !== 'diagnostico') (await pg.faturas(c.id)).forEach(f => { faturas[f.id] = f.dueDate; });
      const tipos = contar(ts, t => t.type), pend = ts.filter(t => t.status === 'PENDING').length, parc = ts.filter(t => t.creditCardMetadata && t.creditCardMetadata.totalInstallments > 1).length;
      console.log(`  · ${c.type === 'CREDIT' ? 'cartão de crédito' : c.subtype === 'SAVINGS_ACCOUNT' ? 'poupança' : 'conta'}: ${ts.length} lançamentos (${tipos.DEBIT || 0} saídas, ${tipos.CREDIT || 0} entradas${pend ? `, ${pend} pendentes` : ''}${parc ? `, ${parc} parcelados` : ''})`);
      if (MODO !== 'diagnostico') ts.forEach(t => { const p = paraApp(t, c, banco, cartoes, faturas); if (c.type !== 'CREDIT' || p.data >= DESDE) propostas.push(p); });
    }
  }
  if (!abertos) throw new Error('nenhum banco abriu: confira o segredo PLUGGY_ITEMS');
  if (semNome && MODO !== 'diagnostico') throw new Error(`${semNome} conexão(ões) sem banco reconhecido: escreva o nome no segredo PLUGGY_ITEMS (Nubank=número,...) e rode de novo (nada foi gravado)`);
  if (MODO === 'caixinhas') {
    await gravar(detalhes.map(d => ({ tabela: 'extrato', op: 'salvar', linha: { id: 'LOFD-' + sem(d.banco).replace(/[^a-z0-9]+/g, '-'), data: hoje, banco: d.banco, descricao: 'Detalhe das caixinhas (Open Finance)', grupo: 'Guardado', tipo: 'conta', valor: 0, categoria: '', subcategoria: '', status: 'Cancelado', parcela: '', obs: JSON.stringify(d).slice(0, 60000) } })));
    console.log(`\nDetalhe das caixinhas guardado no app (escondido): ${detalhes.length} banco(s).`); return;
  }
  if (MODO === 'diagnostico') { console.log('\nDiagnóstico pronto: a conexão com os bancos funciona. Nada foi gravado.'); return; }

  const extrato = await ler('extrato'), mem = memoria(extrato);
  /* compras do cartão ainda pendentes (fatura aberta e parcelas futuras: o Inter deixa a fatura aberta inteira como pendente) também entram,
     marcadas "OFP <id>" e como previstas; quando o banco lançar de vez, a mesma linha ganha "OF <id>" (não duplica). Pendente na conta corrente continua esperando */
  const casados = estornos(casar(propostas.filter(p => !p.pendente || p.tipo === 'cartão'), extrato), extrato);
  const resumo = contar(casados, p => p.acao);
  console.log(`\nComparando com o app: ${resumo.conferir || 0} já estavam lá, ${resumo.novo || 0} novos, ${resumo['ja-importado'] || 0} já importados antes, ${resumo.ignorar || 0} ignorados (pagamento de fatura ou compra estornada), ${propostas.filter(p => p.pendente).length} pendentes (ficam para quando confirmarem).`);
  Object.entries(contar(casados.filter(p => p.acao === 'novo'), p => `${p.banco} (${p.tipo})`)).forEach(([k, n]) => console.log(`  · novos em ${k}: ${n}`));

  /* o saldo de cada conta no app (depois desta importação) bate com o do banco? só diz sim ou não (o registro é público) */
  const depois = extrato.map(l => { const p = casados.find(x => x.acao === 'conferir' && (x.grupo || [x.app]).includes(l.id)); return p && l.status === 'Previsto' && p.data <= hoje ? Object.assign({}, l, { status: 'Pago', data: p.data }) : l; })
    .concat(casados.filter(p => p.acao === 'novo').map(p => linhaNova(p, mem)));
  console.log('\nSaldo das contas (o app depois desta importação × o banco):');
  saldos.forEach(({ banco, saldo }) => { const b = saldoBate(saldo, contasApp.find(c => c.banco === banco && String(c.conta).toLowerCase() === 'conta'), depois);
    console.log(`  · ${banco}: ${b == null ? 'sem saldo conferido no app' : b ? 'confere ✓' : '✗ diferente do banco (conferir)'}`); });

  /* o saldo que o banco informou fica guardado no app, escondido (cancelado, fora de todas as contas), para o João e o Claude
     conferirem a diferença sem o valor aparecer no registro público. Um por banco, trocado a cada execução. */
  const opsSaldo = saldos.filter(x => x.saldo != null).map(({ banco, saldo, em }) => ({ tabela: 'extrato', op: 'salvar', linha: {
    id: 'LOFS-' + sem(banco).replace(/[^a-z0-9]+/g, '-'), data: String(em).slice(0, 10) || hoje, banco, descricao: 'Saldo no banco (Open Finance)', grupo: 'Transferência', tipo: 'conta',
    valor: Math.round(+saldo * 100) / 100, categoria: '', subcategoria: '', status: 'Cancelado', parcela: '', obs: `Open Finance · saldo informado pelo banco em ${em || hoje} · só para conferência` } }));
  /* o saldo de cada caixinha que o banco informou, escondido do mesmo jeito (o app usa para conferir e para a foto diária) */
  caixas.forEach(x => opsSaldo.push({ tabela: 'extrato', op: 'salvar', linha: {
    id: 'LOFI-' + sem(x.banco).replace(/[^a-z0-9]+/g, '-'), data: String(x.em).slice(0, 10) || hoje, banco: x.banco, descricao: 'Guardado no banco (Open Finance)', grupo: 'Guardado', tipo: 'conta',
    valor: x.saldo, categoria: '', subcategoria: '', status: 'Cancelado', parcela: '', obs: `Open Finance · total bruto das caixinhas/aplicações (${x.n}) informado pelo banco em ${x.em || hoje} · líquido ${x.liquido.toFixed(2)} · IR ${x.ir.toFixed(2)} · IOF ${x.iof.toFixed(2)} · só para conferência` } }));
  if (opsSaldo.length) await gravar(opsSaldo);

  if (MODO === 'previa') {
    /* a prévia fica no app como "cancelada" (escondida de todas as telas e contas), só para o Claude conferir; o modo importar apaga */
    const antigas = extrato.filter(l => /^LOFP-/.test(l.id)).map(l => ({ tabela: 'extrato', op: 'apagar', linha: { id: l.id } }));
    const ops = casados.filter(p => p.acao !== 'ja-importado').map(p => {
      const l = linhaNova(p, mem, 'LOFP-');
      return { tabela: 'extrato', op: 'salvar', linha: Object.assign(l, { status: 'Cancelado', obs: `Open Finance · prévia · ${p.acao}${p.app ? ' ' + p.app : ''}${p.pendente ? ' · pendente' : ''} · ${l.obs}` }) };
    });
    await gravar(antigas.concat(ops));
    console.log(`\nPrévia guardada (${ops.length} linhas escondidas para conferência). Nada mudou nas contas do app.`);
    return;
  }
  if (MODO === 'importar') {
    const ops = extrato.filter(l => /^LOFP-/.test(l.id)).map(l => ({ tabela: 'extrato', op: 'apagar', linha: { id: l.id } }));
    casados.forEach(p => {
      if (p.acao === 'novo') { const l = linhaNova(p, mem); if (p.pendente) Object.assign(l, { status: 'Previsto', obs: (p.parcela ? `Compra ${grupoParcelas(p)} · ` : '') + l.obs.replace(`OF ${p.pid}`, `OFP ${p.pid}`) }); ops.push({ tabela: 'extrato', op: 'salvar', linha: l }); }
      /* conferido pelo banco (no holerite, todas as linhas que somam o depósito ganham a marca) */
      if (p.acao === 'conferir') (p.grupo || [p.app]).forEach(id => {
        const l = extrato.find(x => x.id === id), obs = [String(l.obs || '').replace(/\s*·?\s*OFP [0-9a-f-]{20,}/gi, '').trim(), `${p.pendente ? 'OFP' : 'OF'} ${p.pid}`].filter(Boolean).join(' · ');
        /* no cartão, a data do banco diz em qual fatura a compra cai: a linha do app vai para a mesma data (e a mesma fatura) */
        ops.push({ tabela: 'extrato', op: 'salvar', linha: Object.assign({ id: l.id, obs }, p.tipo === 'cartão' && !p.grupo && String(l.data).slice(0, 10) !== p.data ? { data: p.data } : {}, !p.pendente && l.status === 'Previsto' && p.data <= hoje ? { status: 'Pago', data: p.data } : {}) });
      });
    });
    await gravar(ops);
    /* aviso no iPhone do que entrou e saiu (se a tabela de avisos falhar, a importação já está salva) */
    try { const av = avisosDoBanco(casados, hoje); if (av.length) await gravar(av.map(linha => ({ tabela: 'avisos', op: 'salvar', linha }))); console.log(`  · ${av.length} aviso(s) para o celular`); } catch (e) { console.log('  · avisos não gravados: ' + e.message); }
    console.log(`\nImportado: ${resumo.novo || 0} novos e ${resumo.conferir || 0} conferidos pelo banco.`);
    await conferenciaDiaria(saldos, caixas, contasApp, depois);
  }
}
/* conferência de todo dia: a conta que bateu com o banco fica "conferida hoje"; as caixinhas que rendem ficam iguais ao total
   que o banco informou; e o saldo de cada conta e caixinha vai para a foto diária (tabela saldos), que mostra quanto rendeu */
/* as parcelas futuras de uma mesma compra ganham a mesma marca "Compra OF…" (no Revisar aparecem juntas, uma vez só) */
const grupoParcelas = p => { const k = `${sem(p.banco)}|${sem(String(p.desc || '').replace(/\s*\d+\/\d+\s*$/, ''))}|${Math.abs(+p.valor).toFixed(2)}`; let h = 0; for (const ch of k) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return 'POF' + h.toString(36).toUpperCase(); };
async function conferenciaDiaria(saldos, caixas, contasApp, extrato) {
  const ops = [], dataDe = em => diaNoBrasil(em, hoje), ajustado = new Map();
  console.log('\nConferência do dia:');
  saldos.forEach(({ banco, saldo, em }) => {
    const cx = contasApp.find(c => c.banco === banco && String(c.conta).toLowerCase() === 'conta'), d = dataDe(em);
    if (!cx || saldo == null || !saldoBate(saldo, cx, extrato) || d < String(cx.data_da_conferencia || '').slice(0, 10)) return;
    const n = { id: cx.id, saldo_conferido: Math.round(+saldo * 100) / 100, data_da_conferencia: d }; ops.push(n); ajustado.set(cx.id, n);
  });
  console.log(`  · contas que bateram com o banco: ${ops.length} conferida(s) hoje`);
  caixas.forEach(({ banco, saldo, liquido, em }) => {
    const deste = contasApp.filter(c => c.banco === banco && caixinhaDoBanco(c));
    if (!deste.length) return;
    /* o mesmo valor que o app do banco mostra: bruto (Nubank) ou líquido (PicPay) */
    const liq = mostraLiquido(deste) && liquido != null, r = ajustarCaixinhas(liq ? liquido : saldo, deste, extrato, dataDe(em), hoje);
    r.mudancas.forEach(n => { ops.push(n); ajustado.set(n.id, n); });
    if (r.mudancas.length) console.log(`  · ${banco}: ${r.mudancas.length} caixinha(s) iguais ao total ${liq ? 'líquido' : 'bruto'} do banco (diferença ${Math.abs(r.diferenca) <= Math.max(5, r.soma * 0.01) ? 'pequena: rendimento' : 'grande: dinheiro que entrou ou saiu das caixinhas'})`);
  });
  if (ops.length) await gravar(ops.map(linha => ({ tabela: 'contas', op: 'salvar', linha })));
  /* foto do dia: o saldo de cada conta e caixinha do app depois da conferência */
  const foto = contasApp.map(c => {
    const a = ajustado.get(c.id), cc = a ? Object.assign({}, c, a) : c, ehConta = String(c.conta).toLowerCase() === 'conta';
    let v = null;
    if (ehConta) { if (cc.saldo_conferido != null && cc.saldo_conferido !== '' && cc.data_da_conferencia) { const base = String(cc.data_da_conferencia).slice(0, 10); v = Math.round((+cc.saldo_conferido + extrato.filter(l => !/^LOFP-/.test(l.id) && sem(l.banco) === sem(c.banco) && !/cart/i.test(l.tipo) && l.status !== 'Cancelado' && l.status !== 'Previsto' && String(l.data).slice(0, 10) > base).reduce((t, l) => t + (+l.valor || 0), 0)) * 100) / 100; } }
    else v = saldoCaixinha(cc, extrato, hoje);
    return v == null ? null : { id: `Z${hoje}-${c.id}`, data: hoje, banco: c.banco, conta: c.conta, saldo: v, obs: a ? 'conferido pelo banco (Open Finance)' : 'calculado pelo app' };
  }).filter(Boolean);
  try { if (foto.length) await gravar(foto.map(linha => ({ tabela: 'saldos', op: 'salvar', linha }))); console.log(`  · foto do dia: ${foto.length} saldos guardados`); }
  catch (e) { console.log('  · foto do dia: não guardada (falta rodar financas-app/supabase/atualizacao-saldos.sql no Supabase)'); }
}

principal().catch(e => { console.error('\n✗ ' + e.message); process.exit(1); });
