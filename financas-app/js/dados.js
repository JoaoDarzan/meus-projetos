/* Guarda e altera os dados. Hoje salva no próprio aparelho (localStorage);
   na etapa do Supabase só esta camada muda, o resto do app continua igual. */
(function (A) {
  const u = A.u, c = A.c;
  const CHAVE = 'darzan-financas-v1';
  const CATEGORIAS = [
    ['mercado', 'Mercado', 'shopping-cart', '#4ee0a0', '#05905c', true], ['gasolina', 'Gasolina', 'fuel', '#ffc94d', '#e3600e', true],
    ['comida-fora', 'Comida fora', 'utensils', '#ff8aa0', '#d61c4e'], ['ifood', 'iFood', 'pizza', '#ff8a7a', '#d42a1f'],
    ['transporte', 'Transporte', 'car', '#6cc8ff', '#1f5fe0', true], ['uber-99', 'Uber/99', 'car-taxi-front', '#ffe066', '#b98a00', true],
    ['lazer', 'Lazer', 'party-popper', '#cf9cff', '#7a35e6'], ['presente', 'Presente', 'gift', '#ff9cd0', '#d2257f'],
    ['beleza', 'Beleza', 'scissors', '#f2a0ff', '#a51fc4', true], ['saude', 'Saúde', 'pill', '#7cf0a8', '#15a352', true],
    ['assinaturas', 'Assinaturas', 'tv', '#9aa5ff', '#4a46e0'], ['eletronicos', 'Eletrônicos', 'cpu', '#5fe3f5', '#0a8bb0'],
    ['equipamentos', 'Equipamentos', 'camera', '#8fb6ff', '#2148d6', true], ['compras', 'Compras parceladas', 'shopping-bag', '#c2a8ff', '#6b34e0'],
    ['negocio', 'Negócio', 'briefcase', '#ffd97a', '#b06a08', true], ['moradia', 'Moradia', 'house', '#5ff0d6', '#0b8a78', true],
    ['contas', 'Contas', 'receipt', '#b9c3ff', '#5a5fe0', true], ['divida', 'Dívida', 'hand-coins', '#ffaab8', '#c0183f', true],
    ['dizimo-doacoes', 'Doações', 'hand-heart', '#ffd97a', '#d0780a'], ['desenvolvimento', 'Cursos', 'graduation-cap', '#9cc6ff', '#2a62e0', true],
    ['futebol', 'Futebol', 'volleyball', '#8ff0a0', '#1a9a3c'], ['brinquedo', 'Brinquedo', 'gift', '#ffb3e0', '#c2338a'],
    ['roupas', 'Roupas', 'shirt', '#9ad8ff', '#2a7ad0'], ['necessidades', 'Casa e higiene', 'package', '#c7d0e6', '#5a6788', true],
    ['receita', 'Receita', 'banknote', '#7cf0c0', '#068a5a'], ['investimento', 'Guardado', 'piggy-bank', '#7cf0c0', '#068a5a'],
    ['outros', 'Outros', 'circle-help', '#b5bfd6', '#5c6886'],
  ].map(([id, nome, icone, a, b, nec]) => ({ id, nome, icone, cor: [a, b], nec: !!nec }));

  const d = A.dados = {};
  let ouvintes = [];
  d.aoMudar = f => ouvintes.push(f);

  d.carregar = () => {
    let salvo = null;
    try { salvo = JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch (e) { salvo = null; }
    A.d = salvo && salvo.versao === 1 ? salvo : u.clone(window.DADOS_INICIAIS || window.DADOS_EXEMPLO);
    A.d.categorias = A.d.categorias || CATEGORIAS;
    A.d.apagados = A.d.apagados || [];
    A.d.tarefas = A.d.tarefas || [];
    d.gerarRecorrentes();
  };
  d.salvar = () => {
    try { localStorage.setItem(CHAVE, JSON.stringify(A.d)); d.erroSalvar = null; }
    catch (e) { d.erroSalvar = 'Não consegui salvar neste aparelho (memória cheia ou navegação privada).'; }
    ouvintes.forEach(f => f());
  };
  d.recomecar = () => { try { localStorage.removeItem(CHAVE); } catch (e) { /* sem armazenamento */ } A.d = null; d.carregar(); d.salvar(); };

  /* contas que se repetem todo mês viram lançamentos previstos até 3 meses à frente */
  d.gerarRecorrentes = () => {
    const ate = u.addMes(u.mes(u.hoje()), 3);
    (A.d.recorrentes || []).forEach(r => {
      for (let m = r.desde; m <= ate; m = u.addMes(m, 1)) {
        const id = `r-${r.id}-${m}`;
        if (A.d.apagados.includes(id) || A.d.lancamentos.some(l => l.id === id)) continue;
        const data = u.dataNoMes(m, r.dia);
        const l = { id, data, desc: r.desc, valor: r.valor, tipo: 'saida', categoria: r.categoria, nec: !!r.nec, recorrente: r.id, status: 'previsto' };
        if (r.cartao) Object.assign(l, { cartao: r.cartao, fatura: c.faturaDe(data, r.cartao), status: 'pago' });
        else Object.assign(l, { conta: r.conta, forma: r.forma || null, auto: r.forma === 'debito' });
        A.d.lancamentos.push(l);
      }
    });
  };

  const achar = id => A.d.lancamentos.find(l => l.id === id);
  const statusPor = data => data <= u.hoje() ? 'pago' : 'previsto';

  /* ---------- lançamentos ---------- */
  /* novo: {tipo, valor, desc, data, categoria, fonte, conta, cartao, parcelas, meta} */
  d.novo = o => {
    const base = { id: u.id('l'), criado: Date.now(), data: o.data || u.hoje(), desc: (o.desc || '').trim() || (o.tipo === 'entrada' ? 'Recebimento' : o.tipo === 'guardado' ? 'Guardado' : 'Gasto'), valor: u.r2(o.valor) };
    if (o.tipo === 'saida' && o.cartao && o.parcelas > 1) {
      const cp = { id: u.id('c'), desc: base.desc, cartao: o.cartao, total: base.valor, parcelas: o.parcelas, valorParcela: u.r2(base.valor / o.parcelas), data: base.data, primeiraFatura: c.faturaDe(base.data, o.cartao), categoria: o.categoria === 'equipamentos' ? 'equipamentos' : (o.categoria || 'compras') };
      A.d.compras.push(cp);
      d.salvar();
      return { compra: cp };
    }
    const l = Object.assign(base, { tipo: o.tipo, categoria: o.categoria || (o.tipo === 'entrada' ? 'receita' : o.tipo === 'guardado' ? 'investimento' : 'outros') });
    if (o.tipo === 'entrada') l.fonte = o.fonte || 'outros';
    if (o.tipo === 'saida') l.nec = c.categoria(l.categoria).nec;
    if (o.tipo === 'guardado') { l.meta = o.meta || null; const g = A.d.metas.find(x => x.id === o.meta); l.destino = g && g.subconta || null; }
    if (o.cartao) Object.assign(l, { cartao: o.cartao, fatura: c.faturaDe(l.data, o.cartao), status: 'pago' });
    else Object.assign(l, { conta: o.conta || null, status: statusPor(l.data) });
    if (o.extra) Object.assign(l, o.extra);
    A.d.lancamentos.push(l);
    d.salvar();
    return { lanc: l };
  };
  d.editar = (id, p) => {
    const l = achar(id); if (!l) return;
    Object.assign(l, p);
    if (p.valor != null) l.valor = u.r2(p.valor);
    if (l.cartao) { l.fatura = c.faturaDe(l.data, l.cartao); delete l.conta; } else { delete l.fatura; if (p.data && l.status !== 'previsto') l.status = statusPor(l.data); }
    if (l.tipo === 'saida' && p.categoria) l.nec = c.categoria(l.categoria).nec;
    /* equipamento ligado acompanha o valor */
    A.d.equipamentos.filter(e => e.lancamento === id).forEach(e => { e.valor = l.valor; });
    d.salvar();
  };
  d.apagar = id => {
    const l = achar(id); if (!l) return;
    A.d.lancamentos = A.d.lancamentos.filter(x => x.id !== id);
    if (l.recorrente) A.d.apagados.push(id);
    A.d.equipamentos.forEach(e => { if (e.lancamento === id) delete e.lancamento; });
    A.d.trabalhos.forEach(j => j.pagamentos.forEach(p => { if (p.lancamento === id) { delete p.lancamento; delete p.recebido; } }));
    d.salvar();
    return l;
  };
  d.restaurar = l => { A.d.lancamentos.push(l); A.d.apagados = A.d.apagados.filter(x => x !== l.id); d.salvar(); };

  /* ---------- compras parceladas ---------- */
  d.editarCompra = (id, p) => {
    const cp = A.d.compras.find(x => x.id === id); if (!cp) return;
    Object.assign(cp, p);
    cp.total = u.r2(cp.total); cp.parcelas = Math.max(1, Math.round(cp.parcelas));
    cp.valorParcela = u.r2(cp.total / cp.parcelas);
    if (p.data || p.cartao) cp.primeiraFatura = c.faturaDe(cp.data, cp.cartao);
    A.d.equipamentos.filter(e => e.compra === id).forEach(e => { e.valor = cp.total; });
    d.salvar();
  };
  d.apagarCompra = id => {
    const cp = A.d.compras.find(x => x.id === id);
    A.d.compras = A.d.compras.filter(x => x.id !== id);
    A.d.equipamentos.forEach(e => { if (e.compra === id) delete e.compra; });
    d.salvar();
    return cp;
  };

  /* ---------- equipamentos ---------- */
  /* forma: 'catalogo' (já tinha, não mexe no dinheiro) | 'vista' (sai da conta na data) | 'cartao' (entra nas faturas) */
  d.novoEquip = o => {
    const e = { id: u.id('e'), nome: o.nome.trim() || 'Equipamento', tipo: o.tipo || 'Acessório', valor: u.r2(o.valor), dataCompra: o.data || u.hoje(), foto: o.foto || null, estado: o.estado || 'novo', serie: o.serie || '', nota: o.nota || '' };
    if (o.forma === 'vista') e.lancamento = d.novo({ tipo: 'saida', valor: e.valor, desc: e.nome, data: e.dataCompra, categoria: 'equipamentos', conta: o.conta }).lanc.id;
    if (o.forma === 'cartao') {
      const r = d.novo({ tipo: 'saida', valor: e.valor, desc: e.nome, data: e.dataCompra, categoria: 'equipamentos', cartao: o.cartao, parcelas: Math.max(1, o.parcelas || 1) });
      if (r.compra) e.compra = r.compra.id; else e.lancamento = r.lanc.id;
    }
    A.d.equipamentos.unshift(e);
    d.salvar();
    return e;
  };
  d.editarEquip = (id, p) => {
    const e = A.d.equipamentos.find(x => x.id === id); if (!e) return;
    Object.assign(e, p);
    if (p.valor != null) {
      e.valor = u.r2(p.valor);
      if (e.lancamento) { const l = achar(e.lancamento); if (l) l.valor = e.valor; }
      if (e.compra) { const cp = A.d.compras.find(x => x.id === e.compra); if (cp) { cp.total = e.valor; cp.valorParcela = u.r2(cp.total / cp.parcelas); } }
    }
    d.salvar();
  };
  d.apagarEquip = (id, junto) => {
    const e = A.d.equipamentos.find(x => x.id === id); if (!e) return;
    A.d.equipamentos = A.d.equipamentos.filter(x => x.id !== id);
    if (junto && e.lancamento) A.d.lancamentos = A.d.lancamentos.filter(l => l.id !== e.lancamento);
    if (junto && e.compra) A.d.compras = A.d.compras.filter(x => x.id !== e.compra);
    d.salvar();
  };

  /* ---------- tarefas ---------- */
  d.alternarTarefa = id => {
    const [tipo, a, b] = id.split(':');
    let feita;
    if (tipo === 'l') {
      const l = achar(a); if (!l) return;
      if (l.status === 'pago') { l.status = 'previsto'; delete l.pagoEm; feita = false; }
      else { l.status = 'pago'; l.pagoEm = Date.now(); l.criado = l.criado || Date.now(); feita = true; }
    } else if (tipo === 'f') {
      const pg = c.faturaPaga(a, b);
      if (pg) { A.d.lancamentos = A.d.lancamentos.filter(l => l !== pg); feita = false; }
      else { const k = c.cartao(a); A.d.lancamentos.push({ id: u.id('pf'), tipo: 'pag_fatura', cartao: a, fatura: b, valor: c.fatura(a, b), desc: `Fatura ${k.nome} de ${u.nomeMes(b).toLowerCase()}`, conta: k.conta, data: u.hoje(), status: 'pago', criado: Date.now() }); feita = true; }
    } else {
      const t = A.d.tarefas.find(x => x.id === a); if (!t) return;
      t.feita = !t.feita; feita = t.feita;
      if (t.feita && t.valor && t.conta) t.lancamento = d.novo({ tipo: 'saida', valor: t.valor, desc: t.titulo.replace(/^Pagar /, ''), categoria: t.categoria || 'contas', conta: t.conta }).lanc.id;
      if (!t.feita && t.lancamento) { A.d.lancamentos = A.d.lancamentos.filter(l => l.id !== t.lancamento); delete t.lancamento; }
    }
    d.salvar();
    return feita;
  };
  d.novaTarefa = o => { const t = Object.assign({ id: u.id('t'), feita: false }, o); A.d.tarefas.push(t); d.salvar(); return t; };
  d.apagarTarefa = id => { A.d.tarefas = A.d.tarefas.filter(t => t.id !== id); d.salvar(); };

  /* ---------- bancos ---------- */
  d.conferir = (subId, valor) => {
    const s = c.subReal(subId), antes = c.saldo(subId);
    s.saldo = u.r2(valor); s.data = u.hoje(); s.em = Date.now();
    d.salvar();
    return antes == null ? null : u.r2(valor - antes);
  };
  d.editarCartao = (id, p) => { Object.assign(c.cartao(id), p); A.d.lancamentos.filter(l => l.cartao === id).forEach(l => { if (!l.origem) l.fatura = c.faturaDe(l.data, id); }); d.salvar(); };

  /* ---------- trabalhos (Darzan) ---------- */
  d.receber = (jid, i, conta) => {
    const j = A.d.trabalhos.find(x => x.id === jid), p = j.pagamentos[i];
    if (p.recebido) { if (p.lancamento) A.d.lancamentos = A.d.lancamentos.filter(l => l.id !== p.lancamento); delete p.recebido; delete p.lancamento; d.salvar(); return false; }
    p.recebido = u.hoje();
    p.lancamento = d.novo({ tipo: 'entrada', valor: p.valor, desc: `${j.cliente} · ${p.desc}`, fonte: 'darzan', conta, extra: { trabalho: jid } }).lanc.id;
    d.salvar();
    return true;
  };
  d.salvarTrabalho = j => { const i = A.d.trabalhos.findIndex(x => x.id === j.id); if (i >= 0) A.d.trabalhos[i] = j; else A.d.trabalhos.push(j); d.salvar(); };
  d.apagarTrabalho = id => { A.d.trabalhos = A.d.trabalhos.filter(j => j.id !== id); d.salvar(); };

  /* ---------- metas ---------- */
  d.salvarMeta = g => { const i = A.d.metas.findIndex(x => x.id === g.id); if (i >= 0) A.d.metas[i] = g; else A.d.metas.push(g); d.salvar(); };
  d.apagarMeta = id => { A.d.metas = A.d.metas.filter(g => g.id !== id); d.salvar(); };
})(window.A);
