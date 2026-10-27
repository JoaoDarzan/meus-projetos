/* Contas do app: mês, faturas, saldos, tarefas e dicas. Só lê A.d, não altera nada. */
(function (A) {
  const u = A.u, c = A.c = {};
  const D = () => A.d;

  c.cartao = id => D().cartoes.find(x => x.id === id);
  c.sub = id => { for (const b of D().contas) for (const s of b.subcontas) if (s.id === id) return Object.assign({ banco: b }, s); return null; };
  c.subReal = id => { for (const b of D().contas) for (const s of b.subcontas) if (s.id === id) return s; return null; };
  c.nomeConta = id => { const s = c.sub(id); if (!s) return ''; return s.nome === 'Conta' ? s.banco.nome : `${s.banco.nome} · ${s.nome}`; };
  c.categoria = id => D().categorias.find(x => x.id === id) || D().categorias.find(x => x.id === 'outros');
  c.icone = id => { const k = c.categoria(id); return [k.icone, k.cor[0], k.cor[1]]; };
  c.FONTES = { clt: { nome: 'Salário CLT', cor: '--s-clt', i: ['briefcase', '#7fb0ff', '#2a5fd6'] }, darzan: { nome: 'Darzan', cor: '--s-dz', i: ['clapperboard', '#f2c46d', '#a86b16'] }, jpl: { nome: 'JPL SOM', cor: '--s-jpl', i: ['speaker', '#d79bf0', '#8a3fb0'] }, outros: { nome: 'Outros', cor: '--s-out', i: ['banknote', '#a7b3cf', '#56627f'] } };

  /* ---------- cartão de crédito ---------- */
  /* compra feita até o dia do fechamento entra na fatura do mês; depois, na do mês seguinte */
  c.faturaDe = (data, cid) => { const k = c.cartao(cid); return +data.slice(8, 10) <= k.fecha ? u.mes(data) : u.addMes(u.mes(data), 1); };
  c.vencimento = (cid, fm) => { const k = c.cartao(cid); return k.vence > k.fecha ? u.dataNoMes(fm, k.vence) : u.dataNoMes(u.addMes(fm, 1), k.vence); };
  c.parcela = (cp, m) => {
    const k = u.difMes(cp.primeiraFatura, m) + 1;
    if (k < 1 || k > cp.parcelas) return null;
    return { compra: cp, k, valor: cp.valorParcela != null ? cp.valorParcela : u.r2(cp.total / cp.parcelas) };
  };
  c.itensFatura = (cid, m) => {
    const ls = D().lancamentos.filter(l => l.tipo === 'saida' && l.cartao === cid && l.fatura === m);
    const ps = D().compras.filter(cp => cp.cartao === cid).map(cp => c.parcela(cp, m)).filter(Boolean);
    return { lancs: ls, parcelas: ps, total: u.r2(u.sum(ls) + u.sum(ps)) };
  };
  c.fatura = (cid, m) => c.itensFatura(cid, m).total;
  c.faturaPaga = (cid, m) => D().lancamentos.find(l => l.tipo === 'pag_fatura' && l.cartao === cid && l.fatura === m);
  /* quanto do limite já está comprometido: fatura do mês + todas as parcelas futuras */
  c.emUso = (cid, m) => {
    let t = c.faturaPaga(cid, m) ? 0 : c.fatura(cid, m);
    for (let i = 1; i <= 24; i++) t += c.fatura(cid, u.addMes(m, i));
    return u.r2(t);
  };

  /* ---------- mês ---------- */
  c.doMes = m => D().lancamentos.filter(l => l.data.slice(0, 7) === m);
  c.resumo = m => {
    const L = c.doMes(m);
    const ent = L.filter(l => l.tipo === 'entrada'), vista = L.filter(l => l.tipo === 'saida' && !l.cartao), guard = L.filter(l => l.tipo === 'guardado');
    const fonte = { clt: 0, darzan: 0, jpl: 0, outros: 0 };
    ent.forEach(l => fonte[l.fonte || 'outros'] += l.valor);
    const faturas = {}, itens = [];
    vista.forEach(l => itens.push({ categoria: l.categoria, valor: l.valor, nec: !!l.nec, desc: l.desc, ref: l }));
    D().cartoes.forEach(k => {
      const f = c.itensFatura(k.id, m);
      faturas[k.id] = f.total;
      f.lancs.forEach(l => itens.push({ categoria: l.categoria, valor: l.valor, nec: !!l.nec, desc: l.desc, ref: l }));
      f.parcelas.forEach(p => itens.push({ categoria: p.compra.categoria, valor: p.valor, nec: p.compra.categoria === 'equipamentos', desc: p.compra.desc, parcela: p }));
    });
    const cats = {};
    itens.forEach(x => { const k = cats[x.categoria] || (cats[x.categoria] = { categoria: x.categoria, valor: 0, n: 0 }); k.valor += x.valor; k.n++; });
    const entr = u.r2(u.sum(ent)), gastos = u.r2(u.sum(itens)), guardado = u.r2(u.sum(guard));
    const nec = u.r2(u.sum(itens.filter(x => x.nec)));
    return { m, L, ent, vista, guard, fonte, faturas, itens, cats: Object.values(cats).map(k => (k.valor = u.r2(k.valor), k)).sort((a, b) => b.valor - a.valor), entr, gastos, guardado, sobra: u.r2(entr - gastos - guardado), nec, des: u.r2(gastos - nec), futuro: m > u.mes(u.hoje()) };
  };
  c.meses = () => {
    const ms = new Set(D().lancamentos.filter(l => l.tipo !== 'pag_fatura').map(l => u.mes(l.data)));
    const fim = u.addMes(u.mes(u.hoje()), 2);
    let ini = [...ms].sort()[0] || u.mes(u.hoje());
    const out = [];
    for (let m = ini; m <= fim; m = u.addMes(m, 1)) out.push(m);
    return out;
  };
  c.mesesFechados = () => c.meses().filter(m => m <= u.mes(u.hoje()) && c.doMes(m).length);
  c.media = (f, exceto) => { const ms = c.mesesFechados().filter(m => m !== exceto && m < u.mes(u.hoje())); return ms.length ? u.sum(ms, m => f(c.resumo(m))) / ms.length : 0; };

  /* ---------- bancos ---------- */
  const pago = l => l.status === 'pago' || (l.auto && l.data <= u.hoje());
  const depois = (l, s) => l.data > s.data || (l.data === s.data && (l.criado || 0) > (s.em || 0));
  c.movimentos = id => {
    const s = c.subReal(id);
    if (!s || s.saldo == null) return [];
    return D().lancamentos.filter(l => pago(l) && !l.cartao && (l.conta === id || l.destino === id) && depois(l, s));
  };
  c.efeito = (l, id) => {
    if (l.tipo === 'entrada') return l.valor;
    if (l.tipo === 'guardado') return l.destino === id ? l.valor : -l.valor;
    return -l.valor; /* saída e pagamento de fatura */
  };
  c.saldo = id => { const s = c.subReal(id); if (!s || s.saldo == null) return null; return u.r2(s.saldo + u.sum(c.movimentos(id), l => c.efeito(l, id))); };
  c.saldoBanco = b => u.r2(u.sum(b.subcontas, s => c.saldo(s.id) || 0));
  c.totalBancos = () => u.r2(u.sum(D().contas, b => c.saldoBanco(b)));
  c.faltaInformar = () => D().contas.reduce((n, b) => n + b.subcontas.filter(s => s.saldo == null).length, 0);

  /* ---------- tarefas (contas a pagar + faturas + tarefas próprias) ---------- */
  c.XP = { conta: 40, fatura: 60, darzan: 30, pessoal: 20 };
  c.tarefas = () => {
    const T = [], hoje = u.hoje(), lim = u.addMes(u.mes(hoje), 3);
    D().lancamentos.forEach(l => {
      if (l.tipo !== 'saida' || l.cartao || l.forma === 'debito') return;
      if (l.status === 'previsto' || l.pagoEm) T.push({ id: 'l:' + l.id, grupo: 'conta', titulo: 'Pagar ' + l.desc.charAt(0).toLowerCase() + l.desc.slice(1), valor: l.valor, data: l.data, conta: l.conta, feita: l.status === 'pago', icone: c.icone(l.categoria), xp: c.XP.conta });
    });
    D().cartoes.forEach(k => {
      for (let m = u.addMes(k.pagaAte, 1); m <= lim; m = u.addMes(m, 1)) {
        const v = c.fatura(k.id, m), pg = c.faturaPaga(k.id, m);
        if (v < 0.01 && !pg) continue;
        T.push({ id: `f:${k.id}:${m}`, grupo: 'conta', titulo: `Pagar fatura ${k.nome} de ${u.nomeMes(m).toLowerCase()}`, valor: pg ? pg.valor : v, data: c.vencimento(k.id, m), conta: k.conta, feita: !!pg, icone: ['credit-card', ...(D().contas.find(b => b.subcontas.some(s => s.id === k.conta)) || { cor: ['#9fd8ff', '#2a62d8'] }).cor], xp: c.XP.fatura });
      }
    });
    D().tarefas.forEach(t => T.push({ id: 't:' + t.id, grupo: t.grupo, titulo: t.titulo, valor: t.valor || 0, data: t.data, conta: t.conta, feita: !!t.feita, nota: t.nota, icone: t.grupo === 'darzan' ? ['clapperboard', '#f2c46d', '#a86b16'] : t.grupo === 'conta' ? ['receipt', '#b9c3ff', '#5a5fe0'] : ['user', '#9cc6ff', '#2a62e0'], xp: c.XP[t.grupo] || 20 }));
    return T.sort((a, b) => a.data < b.data ? -1 : a.data > b.data ? 1 : 0);
  };
  c.abertas = () => c.tarefas().filter(t => !t.feita);
  c.urgentes = () => c.abertas().filter(t => u.ateHoje(t.data) <= 1).length;

  /* ---------- jogo ---------- */
  c.NIVEIS = ['Iniciante', 'Organizado', 'Poupador', 'Estrategista', 'Investidor', 'Magnata', 'Lenda'];
  c.xp = () => {
    const ms = c.mesesFechados().filter(m => m < u.mes(u.hoje()));
    const rs = ms.map(c.resumo);
    const feitas = c.tarefas().filter(t => t.feita); /* só existem as marcadas pelo app */
    return rs.filter(r => r.sobra > 0).length * 100 + rs.filter(r => r.guardado > 0).length * 100 + u.sum(D().historicoXP || [], x => x.xp) + u.sum(feitas, t => t.xp);
  };
  c.nivel = xp => { const n = Math.floor(xp / 500); return { n: n + 1, nome: c.NIVEIS[Math.min(n, c.NIVEIS.length - 1)], atual: xp % 500, prox: 500 }; };
  c.mesesAzul = () => c.mesesFechados().filter(m => m < u.mes(u.hoje()) && c.resumo(m).sobra > 0).length;

  /* ---------- metas ---------- */
  c.metaTem = g => g.subconta ? (c.saldo(g.subconta) || 0) : u.sum(D().lancamentos.filter(l => l.tipo === 'guardado' && l.meta === g.id));

  /* ---------- dicas do mês ---------- */
  c.dicas = m => {
    const r = c.resumo(m), o = [], mm = u.nomeMes(m).toLowerCase(), cat = id => (r.cats.find(k => k.categoria === id) || { valor: 0, n: 0 });
    const comer = cat('comida-fora').valor + cat('ifood').valor, nComer = cat('comida-fora').n + cat('ifood').n;
    const mc = c.media(x => (x.cats.find(k => k.categoria === 'comida-fora') || { valor: 0 }).valor + (x.cats.find(k => k.categoria === 'ifood') || { valor: 0 }).valor, m);
    if (comer > 150) o.push({ w: comer, t: `Comer fora levou ${u.k0(comer)}`, s: `${nComer} pedidos e lanches em ${mm}${mc ? ` (média de ${u.k0(mc)} nos outros meses)` : ''}. Cortando pela metade, sobram uns ${u.k0(comer / 2)} por mês.` });
    const carro = cat('gasolina').valor + cat('transporte').valor + cat('uber-99').valor;
    if (carro > 300 && r.entr) o.push({ w: carro * .8, t: `O carro custou ${u.k0(carro)}`, s: `Gasolina, manutenção, seguro e Uber: ${u.pct(carro / r.entr)} do que entrou. Coloque o deslocamento no orçamento da Darzan e da JPL.` });
    const meta = D().regra.pou * r.entr;
    if (r.entr && r.guardado < meta) o.push({ w: meta - r.guardado + 200, t: `Faltaram ${u.k0(meta - r.guardado)} para guardar ${u.pct(D().regra.pou)}`, s: `Você guardou ${u.k0(r.guardado)} (${u.pct(r.guardado / r.entr)} da renda).${r.sobra > 0 ? ` Como sobraram ${u.k0(r.sobra)}, dá para mandar a diferença pra reserva.` : ''}` });
    const dz = c.media(x => x.fonte.darzan, m);
    if (dz && r.fonte.darzan < dz * .75) o.push({ w: dz - r.fonte.darzan, t: `A Darzan faturou ${u.pct(1 - r.fonte.darzan / dz)} abaixo da média`, s: `${u.k0(r.fonte.darzan)} em ${mm}, contra ${u.k0(dz)} por mês. Bom momento pra chamar clientes antigos.` });
    if (r.entr && r.des / r.entr > D().regra.des) o.push({ w: r.des - D().regra.des * r.entr + 100, t: 'Gastos com vontades passaram da meta', s: `Lazer, presentes, comida fora e compras deram ${u.k0(r.des)}, ${u.pct(r.des / r.entr)} da renda. A meta é até ${u.pct(D().regra.des)}.` });
    o.sort((a, b) => b.w - a.w);
    if (!o.length) o.push({ t: 'Mês equilibrado', s: 'Nenhum gasto fora do normal. Segue assim.' });
    return o;
  };
})(window.A);
