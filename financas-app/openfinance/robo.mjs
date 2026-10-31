/* Robô do Open Finance: traz os lançamentos dos bancos (Meu Pluggy) para o app, sem repetir o que já está lá.
   Modos (MODO): diagnostico (só confere a conexão e conta), previa (monta o que entraria, guardado escondido no app
   para conferir antes) e importar (grava de verdade).
   ⚠️ O registro do GitHub é público: aqui só se escrevem CONTAGENS, nunca valores, nomes ou descrições.
   Segredos (GitHub): PLUGGY_CLIENT_ID, PLUGGY_CLIENT_SECRET, PLUGGY_ITEMS ("Nubank=id,PicPay=id,..." ou só os ids separados por vírgula), DF_CLAUDE_CHAVE. */
import { criarPluggy } from './pluggy.mjs';
import { lerItens, conferirItens, nomeBanco, identificarBanco, paraApp, casar, memoria, linhaNova } from './regras.mjs';

const SUPABASE = process.env.DF_SUPABASE_URL || 'https://sczpyzcozcaibyzekmau.supabase.co';
const PUBLICA = process.env.DF_SUPABASE_CHAVE || 'sb_publishable_PLND7koek37GWekjKK50bQ_SodtXm14';
const MODO = (process.env.MODO || process.argv[2] || 'diagnostico').toLowerCase();
const DESDE = process.env.DESDE || '2026-09-01';
const hoje = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);

const rpc = async (fn, corpo) => {
  const r = await fetch(`${SUPABASE}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: PUBLICA, 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ p_chave: process.env.DF_CLAUDE_CHAVE }, corpo)) });
  if (!r.ok) throw new Error(`o app recusou (${fn}, ${r.status}): confira o segredo DF_CLAUDE_CHAVE`);
  return r.json();
};
const ler = t => rpc('claude_ler', { p_tabela: t });
const gravar = async ops => { for (let i = 0; i < ops.length; i += 400) await rpc('claude_gravar', { p_ops: ops.slice(i, i + 400) }); };
const contar = (xs, f) => xs.reduce((o, x) => { const k = f(x); o[k] = (o[k] || 0) + 1; return o; }, {});

async function principal() {
  /* confere os 4 segredos, um por um, antes de tudo (✓/✗ sem mostrar nenhum valor) */
  const itens = lerItens(process.env.PLUGGY_ITEMS), probs = conferirItens(process.env.PLUGGY_ITEMS);
  console.log(`Modo: ${MODO} · lançamentos desde ${DESDE}\n\nConferindo os segredos:`);
  let ok = true, pg = null, cartoes = [], bancosDoApp = [];
  if (!process.env.PLUGGY_CLIENT_ID || !process.env.PLUGGY_CLIENT_SECRET) { ok = false; console.log('  ✗ PLUGGY_CLIENT_ID / PLUGGY_CLIENT_SECRET: falta um dos dois'); }
  else {
    pg = criarPluggy({ clientId: process.env.PLUGGY_CLIENT_ID, clientSecret: process.env.PLUGGY_CLIENT_SECRET, base: process.env.PLUGGY_URL || undefined });
    try { await pg.entrar(); console.log('  ✓ PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET: a Pluggy aceitou'); }
    catch (e) { ok = false; console.log(`  ✗ PLUGGY_CLIENT_ID / PLUGGY_CLIENT_SECRET: ${e.message}`); }
  }
  try { cartoes = await ler('cartoes'); bancosDoApp = (await ler('contas')).map(c => c.banco).concat(cartoes.map(k => k.cartao)); console.log('  ✓ DF_CLAUDE_CHAVE: o app aceitou'); }
  catch (e) { ok = false; console.log(`  ✗ DF_CLAUDE_CHAVE: ${e.message}`); }
  if (probs.length || !itens.length) { ok = false; console.log(`  ✗ PLUGGY_ITEMS: ${itens.length} número(s) de conexão certos${probs.length ? '; problemas:\n' + probs.map(x => '      · ' + x).join('\n') : ''}`); }
  else console.log(`  ✓ PLUGGY_ITEMS: ${itens.length} número(s) de conexão no formato certo`);
  if (!ok) throw new Error('arrume o segredo marcado com ✗ e rode de novo (nada foi gravado)');
  let abertos = 0, semNome = 0;
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
    for (const c of contas) {
      const ts = await pg.lancamentos(c.id, DESDE), faturas = {};
      if (c.type === 'CREDIT' && MODO !== 'diagnostico') (await pg.faturas(c.id)).forEach(f => { faturas[f.id] = f.dueDate; });
      const tipos = contar(ts, t => t.type), pend = ts.filter(t => t.status === 'PENDING').length, parc = ts.filter(t => t.creditCardMetadata && t.creditCardMetadata.totalInstallments > 1).length;
      console.log(`  · ${c.type === 'CREDIT' ? 'cartão de crédito' : c.subtype === 'SAVINGS_ACCOUNT' ? 'poupança' : 'conta'}: ${ts.length} lançamentos (${tipos.DEBIT || 0} saídas, ${tipos.CREDIT || 0} entradas${pend ? `, ${pend} pendentes` : ''}${parc ? `, ${parc} parcelados` : ''})`);
      if (MODO !== 'diagnostico') ts.forEach(t => propostas.push(paraApp(t, c, banco, cartoes, faturas)));
    }
  }
  if (!abertos) throw new Error('nenhum banco abriu: confira o segredo PLUGGY_ITEMS');
  if (semNome && MODO !== 'diagnostico') throw new Error(`${semNome} conexão(ões) sem banco reconhecido: escreva o nome no segredo PLUGGY_ITEMS (Nubank=número,...) e rode de novo (nada foi gravado)`);
  if (MODO === 'diagnostico') { console.log('\nDiagnóstico pronto: a conexão com os bancos funciona. Nada foi gravado.'); return; }

  const extrato = await ler('extrato'), mem = memoria(extrato);
  const casados = casar(propostas.filter(p => !p.pendente), extrato);
  const resumo = contar(casados, p => p.acao);
  console.log(`\nComparando com o app: ${resumo.conferir || 0} já estavam lá, ${resumo.novo || 0} novos, ${resumo['ja-importado'] || 0} já importados antes, ${resumo.ignorar || 0} pagamentos de fatura (ignorados), ${propostas.filter(p => p.pendente).length} pendentes (ficam para quando confirmarem).`);
  Object.entries(contar(casados.filter(p => p.acao === 'novo'), p => `${p.banco} (${p.tipo})`)).forEach(([k, n]) => console.log(`  · novos em ${k}: ${n}`));

  if (MODO === 'previa') {
    /* a prévia fica no app como "cancelada" (escondida de todas as telas e contas), só para o Claude conferir; o modo importar apaga */
    const antigas = extrato.filter(l => /^LOFP-/.test(l.id)).map(l => ({ tabela: 'extrato', op: 'apagar', linha: { id: l.id } }));
    const ops = casados.filter(p => p.acao !== 'ja-importado').map(p => {
      const l = linhaNova(p, mem, 'LOFP-');
      return { tabela: 'extrato', op: 'salvar', linha: Object.assign(l, { status: 'Cancelado', obs: `Open Finance · prévia · ${p.acao}${p.app ? ' ' + p.app : ''} · ${l.obs}` }) };
    });
    await gravar(antigas.concat(ops));
    console.log(`\nPrévia guardada (${ops.length} linhas escondidas para conferência). Nada mudou nas contas do app.`);
    return;
  }
  if (MODO === 'importar') {
    const ops = extrato.filter(l => /^LOFP-/.test(l.id)).map(l => ({ tabela: 'extrato', op: 'apagar', linha: { id: l.id } }));
    casados.forEach(p => {
      if (p.acao === 'novo') ops.push({ tabela: 'extrato', op: 'salvar', linha: linhaNova(p, mem) });
      if (p.acao === 'conferir') {
        const l = extrato.find(x => x.id === p.app), obs = [String(l.obs || '').trim(), `OF ${p.pid}`].filter(Boolean).join(' · ');
        ops.push({ tabela: 'extrato', op: 'salvar', linha: Object.assign({ id: l.id, obs }, l.status === 'Previsto' && p.data <= hoje ? { status: 'Pago', data: p.data } : {}) });
      }
    });
    await gravar(ops);
    console.log(`\nImportado: ${resumo.novo || 0} novos e ${resumo.conferir || 0} conferidos pelo banco.`);
  }
}
principal().catch(e => { console.error('\n✗ ' + e.message); process.exit(1); });
