/* Regras do robô do Open Finance (sem rede: dá para testar com dados inventados).
   Transforma cada lançamento do banco no formato do app e acha se ele já está lá (para não repetir). */
export const sem = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const r2 = v => Math.round(v * 100) / 100;
const pad = n => String(n).padStart(2, '0');
const dias = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);
const addMes = (m, n) => { let [y, mm] = m.split('-').map(Number); mm += n; y += Math.floor((mm - 1) / 12); mm = ((mm - 1) % 12 + 12) % 12 + 1; return `${y}-${pad(mm)}`; };
const diaMax = m => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)).getUTCDate();
const dataNoMes = (m, d) => `${m}-${pad(Math.min(Math.max(1, d), diaMax(m)))}`;
const dataBR = d => { /* a data do lançamento no fuso de Brasília */
  const t = new Date(d); if (isNaN(t)) return String(d).slice(0, 10);
  return new Date(t.getTime() - 3 * 3600e3).toISOString().slice(0, 10);
};

/* PLUGGY_ITEMS = "Nubank=uuid,PicPay=uuid,..." ou só os números "uuid,uuid" (o nome vem do próprio banco) → [{ banco, id }] */
const ID_OK = /^[A-Za-z0-9_-]{16,}$/;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const tirarAspas = x => x.trim().replace(/^["']|["']$/g, '').trim();
/* cada parte: "Banco=número", só o número, ou um texto qualquer com o número dentro (ex.: um link copiado) */
const partes = txt => String(txt || '').split(/[,\n;]/).map(tirarAspas).filter(Boolean).flatMap(x => {
  const m = x.match(/^([^=:]*?)\s*[=:]\s*(.*)$/), banco = m && !/^https?$/i.test(m[1].trim()) ? tirarAspas(m[1]) : '', id = m && banco ? tirarAspas(m[2]) : x;
  if (ID_OK.test(id)) return [{ banco, id }];
  const achados = id.match(UUID) || (/\s/.test(id) ? id.split(/\s+/).filter(t => ID_OK.test(t) && /\d/.test(t)) : []);
  return achados.length ? achados.map(u => ({ banco: achados.length === 1 ? banco : '', id: u })) : [{ banco, id }];
});
export const lerItens = txt => partes(txt).filter(x => ID_OK.test(x.id));
/* o que está errado no segredo, sem mostrar o conteúdo (o registro do GitHub é público) */
export const conferirItens = txt => {
  const ps = partes(txt);
  if (!ps.length) return ['o segredo está vazio'];
  const nome = (x, i) => x.banco || `parte ${i + 1}`;
  return ps.map((x, i) => !x.id ? `${nome(x, i)}: falta o número depois do "="`
    : ID_OK.test(x.id) ? null
    : /\s/.test(x.id) ? `${nome(x, i)}: isso é um texto com ${x.id.split(/\s+/).length} palavras, não o número da conexão (o itemId tem 36 caracteres, tipo 1a2b3c4d-1a2b-...)`
    : `${nome(x, i)}: o número tem ${x.id.length} caracteres e ${/[^A-Za-z0-9_-]/.test(x.id) ? 'tem símbolo ou acento' : 'é curto demais'} (o itemId tem 36, tipo 1a2b3c4d-1a2b-...)`).filter(Boolean);
};
/* nome do banco no app a partir do nome que a Pluggy dá ("Banco Inter" → "Inter"): o mais parecido entre os bancos do app */
export function nomeBanco(conector, bancosDoApp) {
  const norm = t => sem(t).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(), c = norm(conector);
  if (!c) return '';
  const achados = [...new Set(bancosDoApp.filter(Boolean))].filter(b => { const x = norm(b); return x && (` ${c} `.includes(` ${x} `) || ` ${x} `.includes(` ${c} `)); });
  return achados.sort((a, b) => b.length - a.length)[0] || String(conector).trim();
}

/* mês da fatura em que a compra cai (igual ao app: a fatura tem o nome do mês em que vence) */
export function faturaDe(data, cartao) {
  const fecha = parseInt(cartao && cartao.fecha_dia, 10) || 31;
  let dia = parseInt(cartao && cartao.vence_dia, 10); if (!dia) dia = Math.min(fecha + 7, 28);
  const m = data.slice(0, 7), fechou = +data.slice(8, 10) <= fecha ? m : addMes(m, 1);
  return dia > fecha ? fechou : addMes(fechou, 1);
}

/* um lançamento da Pluggy no formato do app */
export function paraApp(t, conta, banco, cartoes, faturas = {}) {
  const ehCartao = conta.type === 'CREDIT';
  const valor = r2((t.type === 'DEBIT' ? -1 : 1) * Math.abs(+t.amountInAccountCurrency || +t.amount || 0));
  const cm = t.creditCardMetadata || {};
  let data = dataBR(t.date), parcela = '';
  if (ehCartao) {
    const cartao = cartoes.find(k => sem(k.cartao) === sem(banco)) || null;
    const compra = cm.purchaseDate ? dataBR(cm.purchaseDate) : data;
    const venc = cm.billId && faturas[cm.billId] ? dataBR(faturas[cm.billId]).slice(0, 7) : null;
    const fm = venc || faturaDe(data, cartao);
    data = dataNoMes(fm, +compra.slice(8, 10));
    if (cm.totalInstallments > 1 && cm.installmentNumber) parcela = `${cm.installmentNumber}/${cm.totalInstallments}`;
  }
  /* pagamento da fatura que aparece dentro do cartão: o app já registra pelo lado da conta */
  const pagFatura = ehCartao && valor > 0 && /pagamento|pgto|payment|pag fatura/i.test(t.description || '');
  return { pid: t.id, data, banco, tipo: ehCartao ? 'cartão' : 'conta', valor, desc: String(t.description || '').trim(), parcela, pendente: t.status === 'PENDING', pagFatura, categoriaPluggy: t.category || '' };
}

/* acha o lançamento do app que é o mesmo (mesmo banco e tipo, mesmo valor, data até 3 dias de diferença) */
export function casar(propostas, extrato) {
  const usados = new Set(), porPid = new Map();
  /* já importado = linha de verdade com a marca "OF <id>" (a prévia escondida não conta) */
  extrato.forEach(l => { if (/^LOFP-/.test(l.id) || l.status === 'Cancelado') return; const m = String(l.obs || '').match(/OF ([0-9a-f-]{20,})/i); if (m) { porPid.set(m[1], l.id); usados.add(l.id); } });
  return propostas.map(p => {
    if (porPid.has(p.pid)) return Object.assign({ acao: 'ja-importado', app: porPid.get(p.pid) }, p);
    const cands = extrato.filter(l => !usados.has(l.id) && l.status !== 'Cancelado' && !/^LOFP-/.test(l.id) && sem(l.banco) === sem(p.banco)
      && (/cart/i.test(l.tipo) ? 'cartão' : 'conta') === p.tipo && Math.abs((+l.valor || 0) - p.valor) < 0.011
      && Math.abs(dias(String(l.data).slice(0, 10), p.data)) <= 3)
      .sort((a, b) => Math.abs(dias(String(a.data).slice(0, 10), p.data)) - Math.abs(dias(String(b.data).slice(0, 10), p.data)));
    if (cands.length) { usados.add(cands[0].id); return Object.assign({ acao: 'conferir', app: cands[0].id }, p); }
    return Object.assign({ acao: p.pagFatura ? 'ignorar' : 'novo' }, p);
  });
}

/* memória de categorias, igual à do app: "PIX ENVIADO Posto Shell 123" e "posto shell" viram a mesma chave */
const RUIDO = /\b(pix|enviado|enviada|recebido|recebida|transf\w*|compra|no|na|debito|credito|pagamento|pagto|pag|de|do|da|dos|das|para|em|com|cartao|parcela|ltda|me|sa)\b/g;
export const chave = d => sem(d).replace(/[^a-z\s]/g, ' ').replace(RUIDO, ' ').replace(/\s+/g, ' ').trim().split(' ').slice(0, 3).join(' ');
export function memoria(extrato) {
  const m = new Map();
  extrato.forEach(l => {
    if (!l.categoria || l.categoria === 'Outros' || l.grupo === 'Transferência' || l.grupo === 'Reembolso' || l.status === 'Cancelado') return;
    const k = chave(l.descricao); if (!k) return;
    const x = m.get(k) || { total: 0, op: {} }, id = [l.categoria, l.subcategoria || '', l.grupo].join('|');
    x.total++; x.op[id] = (x.op[id] || 0) + 1; m.set(k, x);
  });
  return m;
}
export function sugerir(desc, mem) {
  let x = mem.get(chave(desc));
  if (!x) {
    const tem = new Set(sem(desc).replace(/[^a-z\s]/g, ' ').replace(RUIDO, ' ').split(/\s+/).filter(Boolean)); let pts = 0;
    mem.forEach((v, k) => { const ps = k.split(' '); if (!ps.every(w => tem.has(w)) || (ps.length < 2 && ps[0].length < 5)) return; const n = ps.join('').length; if (n > pts) { x = v; pts = n; } });
  }
  if (!x) return null;
  const [id, n] = Object.entries(x.op).sort((a, b) => b[1] - a[1])[0];
  if (n / x.total < 0.6) return null;
  const [categoria, subcategoria, grupo] = id.split('|');
  return { categoria, subcategoria, grupo };
}

/* linha nova do app (o que o banco tem e o app ainda não) */
export function linhaNova(p, mem, prefixo = 'LOF-') {
  const s = sugerir(p.desc, mem);
  const grupo = s ? s.grupo : p.valor > 0 ? 'Renda' : 'Desejos';
  return { id: prefixo + p.pid, data: p.data, banco: p.banco, descricao: p.desc.slice(0, 120), grupo, tipo: p.tipo, valor: p.valor,
    categoria: s ? s.categoria : '', subcategoria: s ? s.subcategoria : '', status: 'Pago', parcela: p.parcela,
    obs: `Open Finance · OF ${p.pid}${s ? '' : ' · conferir'}` };
}
