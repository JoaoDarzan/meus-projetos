// Painel Darzan — abas, filtro de período, números, gráficos e tabelas.
(() => {
  const root = document.querySelector('.dz');
  const $ = (sel, ctx = root) => ctx.querySelector(sel);
  const $$ = (sel, ctx = root) => [...ctx.querySelectorAll(sel)];

  const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const pct = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });
  const int = new Intl.NumberFormat('pt-BR');
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const fmtData = (d) => {
    const s = String(d || '');
    return s.length >= 10 ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : s;
  };
  const FMT = { brl: (v) => brl.format(v || 0), pct: (v) => (v == null ? '—' : pct.format(v)), int: (v) => int.format(v || 0) };
  const curto = (v) => {
    const a = Math.abs(v);
    if (a >= 1000) return `${v < 0 ? '−' : ''}R$ ${int.format(Math.round(a / 100) / 10)} mil`;
    return `${v < 0 ? '−' : ''}R$ ${int.format(a)}`;
  };
  const enc = (v) => encodeURIComponent(String(v));

  const GOLD = '#d6a85f', BRONZE = '#8a6634', MUTED = '#6b5f52', BAD = '#ef8a78';

  // ---------- dados ----------
  const rowsOf = (id) => {
    const d = dash.data(id);
    return d.status === 'ok' ? (Array.isArray(d.data) ? d.data : []) : null;
  };
  const statusOf = (id) => dash.data(id).status;
  const failNode = () => {
    const p = document.createElement('p');
    p.className = 'dz-empty';
    p.textContent = 'Não foi possível carregar estes dados.';
    return p;
  };
  // Deixa o elemento pronto para desenhar; devolve as linhas ou null (carregando / erro).
  const prepare = (el, id) => {
    const rows = rowsOf(id);
    if (rows) { el.classList.remove('dash-skeleton'); return rows; }
    el.replaceChildren();
    if (['error', 'connect', 'declined', 'missing'].includes(statusOf(id))) {
      el.classList.remove('dash-skeleton');
      el.append(failNode());
    } else {
      el.classList.add('dash-skeleton');
    }
    return null;
  };
  const emptyNote = (el, text) => {
    const p = document.createElement('p');
    p.className = 'dz-empty';
    p.textContent = text;
    el.replaceChildren(p);
  };

  // ---------- período ----------
  const setDefaults = () => dash.setParams({ ano: String(new Date().getFullYear()) });
  setDefaults();

  const anoAtual = () => {
    const anos = rowsOf('anos') || [];
    const p = String(dash.params().ano ?? 'todos');
    return anos.some((a) => a.ano === p) ? p : 'todos';
  };
  const noAno = (ano, d) => ano === 'todos' || String(d || '').slice(0, 4) === ano;

  const sel = $('#dz-ano');
  sel.addEventListener('change', () => dash.setParams({ ano: sel.value }));

  // ---------- abas ----------
  const tabs = $$('.dz-tab');
  let aba = 'visao';
  const showTab = (id, link = true) => {
    if (!tabs.some((t) => t.dataset.tab === id)) return;
    aba = id;
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === id)));
    $$('.dz-page').forEach((p) => { p.hidden = p.id !== id; });
    if (link) dash.setLink(id);
    draw();
  };
  tabs.forEach((t) => t.addEventListener('click', () => showTab(t.dataset.tab)));

  // ---------- números marcados ----------
  const fillKpis = (ano) => {
    const kpis = rowsOf('kpis');
    $$('.js-kpi').forEach((el) => {
      const escopo = el.dataset.scope || ano;
      el.dataset.where = `ano=${enc(escopo)}`;
      if (!kpis) { el.textContent = '—'; return; }
      const row = kpis.find((r) => r.ano === escopo);
      el.textContent = row ? FMT[el.dataset.fmt](row[el.dataset.field]) : '—';
      el.classList.toggle('dz-neg', !!row && el.dataset.fmt === 'brl' && row[el.dataset.field] < 0);
    });
    $$('.js-funnel').forEach((el) => {
      const row = kpis && kpis.find((r) => r.ano === ano);
      const total = row ? row.orc_enviados : 0;
      el.style.width = total ? `${(row[el.dataset.part] / total) * 100}%` : '0%';
    });
    const geral = kpis && kpis.find((r) => r.ano === 'todos');
    const ret = $('.js-retorno');
    if (ret) ret.style.width = geral && geral.retorno_equip != null ? `${Math.min(1, geral.retorno_equip) * 100}%` : '0%';
  };

  const mark = (text, field, ano) => {
    const b = document.createElement('b');
    b.textContent = text;
    b.dataset.source = 'kpis';
    b.dataset.field = field;
    b.dataset.where = `ano=${enc(ano)}`;
    return b;
  };
  const fillTakeaway = (ano) => {
    const el = $('#dz-takeaway');
    const kpis = rowsOf('kpis');
    const row = kpis && kpis.find((r) => r.ano === ano);
    if (!row) { el.replaceChildren(); return; }
    const quando = ano === 'todos' ? 'Desde o início' : `Em ${ano}`;
    if (!row.trabalhos) {
      el.replaceChildren(`${quando} ainda não há trabalhos lançados.`);
      return;
    }
    el.replaceChildren(
      `${quando} você faturou `, mark(brl.format(row.bruto), 'bruto', ano),
      ' em ', mark(int.format(row.trabalhos), 'trabalhos', ano), ' trabalhos e ficou com ',
      mark(brl.format(row.lucro), 'lucro', ano), ' de lucro. Fechou ',
      mark(int.format(row.orc_fechados), 'orc_fechados', ano), ' de ',
      mark(int.format(row.orc_enviados), 'orc_enviados', ano), ' orçamentos passados.',
    );
  };

  // ---------- gráfico de colunas agrupadas ----------
  function colunas(el, rows, { x, series, fmt, eixo, extra }) {
    el.replaceChildren();
    const W = Math.max(280, Math.round(el.clientWidth || 600));
    const H = 260;
    const m = { t: 12, r: 6, b: 28, l: 40 };
    const vals = rows.flatMap((r) => series.map((s) => +r[s.key] || 0));
    const lo = Math.min(0, d3.min(vals) ?? 0);
    const hi = Math.max(0, d3.max(vals) ?? 0) || 1;
    const y = d3.scaleLinear([lo, hi], [H - m.b, m.t]).nice(4);
    const ticks = y.ticks(4);

    const svg = d3.select(el).append('svg')
      .attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`)
      .attr('font-family', 'inherit');

    const medidor = svg.append('g').attr('font-size', 11);
    let largura = 0;
    ticks.forEach((t) => { largura = Math.max(largura, medidor.append('text').text(eixo(t)).node().getComputedTextLength()); });
    medidor.remove();
    m.l = Math.ceil(largura) + 10;

    const x0 = d3.scaleBand(rows.map(x), [m.l, W - m.r]).paddingInner(0.28).paddingOuter(0.12);
    const x1 = d3.scaleBand(series.map((s) => s.key), [0, x0.bandwidth()]).padding(0.12);

    svg.append('g').selectAll('line').data(ticks).join('line')
      .attr('x1', m.l).attr('x2', W - m.r).attr('y1', (d) => y(d)).attr('y2', (d) => y(d))
      .attr('stroke', 'rgba(232, 200, 150, .09)');
    svg.append('g').selectAll('text').data(ticks).join('text')
      .attr('x', m.l - 8).attr('y', (d) => y(d)).attr('dy', '0.32em').attr('text-anchor', 'end')
      .attr('font-size', 11).attr('fill', '#7d7266').text(eixo);
    svg.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(0)).attr('y2', y(0))
      .attr('stroke', 'rgba(232, 200, 150, .32)');

    const grupos = svg.append('g').selectAll('g').data(rows).join('g')
      .attr('transform', (r) => `translate(${x0(x(r))},0)`);
    const barras = grupos.selectAll('rect').data((r) => series.map((s) => ({ s, v: +r[s.key] || 0 }))).join('rect')
      .attr('x', (d) => x1(d.s.key)).attr('width', x1.bandwidth())
      .attr('y', (d) => y(Math.max(0, d.v)))
      .attr('height', (d) => (d.v ? Math.max(1, Math.abs(y(d.v) - y(0))) : 0))
      .attr('rx', Math.min(4, x1.bandwidth() / 2))
      .attr('fill', (d) => (d.v < 0 ? BAD : d.s.color));

    const passo = Math.max(1, Math.ceil((rows.length * 30) / Math.max(1, W - m.l)));
    svg.append('g').selectAll('text').data(rows.filter((r, i) => i % passo === 0)).join('text')
      .attr('x', (r) => x0(x(r)) + x0.bandwidth() / 2).attr('y', H - 8)
      .attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', '#b3a798').text(x);

    const tip = document.createElement('div');
    tip.className = 'dz-tip';
    tip.hidden = true;
    el.append(tip);

    const mostrar = (ev, r) => {
      barras.attr('opacity', (d, i, nodes) => (nodes[i].parentNode.__data__ === r ? 1 : 0.45));
      const titulo = document.createElement('div');
      titulo.className = 't';
      titulo.textContent = x(r);
      const linhas = series.map((s) => {
        const div = document.createElement('div');
        const cor = document.createElement('i');
        cor.style.background = s.color;
        div.append(cor, `${s.label}: ${fmt(+r[s.key] || 0)}`);
        return div;
      });
      const extras = (extra ? extra(r) : []).map((t) => {
        const div = document.createElement('div');
        div.textContent = t;
        return div;
      });
      tip.replaceChildren(titulo, ...linhas, ...extras);
      tip.hidden = false;
      const [px, py] = d3.pointer(ev, el);
      const maxX = el.clientWidth - tip.offsetWidth - 4;
      tip.style.left = `${Math.max(0, Math.min(maxX, px + 14))}px`;
      tip.style.top = `${Math.max(0, py - tip.offsetHeight - 10)}px`;
    };
    svg.append('g').selectAll('rect').data(rows).join('rect')
      .attr('x', (r) => x0(x(r)) - (x0.step() * x0.paddingInner()) / 2)
      .attr('width', x0.step()).attr('y', m.t).attr('height', H - m.t - m.b)
      .attr('fill', 'transparent')
      .on('mousemove', mostrar)
      .on('click', mostrar)
      .on('mouseleave', () => { tip.hidden = true; barras.attr('opacity', 1); });
  }

  // Mês a mês do ano escolhido; em "Desde o início", um total por ano.
  const serieTempo = (mensal, ano, campos) => {
    if (ano !== 'todos') {
      return mensal.filter((r) => r.ano === ano).map((r) => ({ ...r, rotulo: MESES[+r.mes.slice(5, 7) - 1] }));
    }
    const anos = [...new Set(mensal.map((r) => r.ano))].sort();
    return anos.map((a) => {
      const linha = { rotulo: a };
      campos.forEach((c) => { linha[c] = mensal.filter((r) => r.ano === a).reduce((s, r) => s + (+r[c] || 0), 0); });
      return linha;
    });
  };

  // ---------- barras horizontais ----------
  function barras(el, rows, { label, value, fmt, sub, vazio }) {
    const lista = rows.filter((r) => (+r[value] || 0) > 0).sort((a, b) => b[value] - a[value]);
    if (!lista.length) { emptyNote(el, vazio); return; }
    const max = d3.max(lista, (r) => +r[value]) || 1;
    el.replaceChildren(...lista.map((r) => {
      const row = document.createElement('div');
      row.className = 'dz-bar-row';
      const top = document.createElement('div');
      top.className = 'dz-bar-top';
      const nome = document.createElement('span');
      nome.textContent = r[label];
      const val = document.createElement('b');
      val.textContent = fmt(+r[value]);
      top.append(nome, val);
      row.append(top);
      if (sub) {
        const s = document.createElement('div');
        s.className = 'dz-bar-sub';
        s.textContent = sub(r);
        row.append(s);
      }
      const track = document.createElement('div');
      track.className = 'dz-bar-track';
      const fill = document.createElement('div');
      fill.className = 'dz-bar-fill';
      fill.style.width = `${(+r[value] / max) * 100}%`;
      track.append(fill);
      row.append(track);
      return row;
    }));
  }

  // ---------- tabelas ----------
  const ordem = {};
  const busca = {};
  function tabela(table, rows, colunasDef, chave) {
    const st = ordem[table.id];
    let lista = rows.slice();
    if (st) {
      lista.sort((a, b) => {
        const A = a[st.f], B = b[st.f];
        const c = typeof A === 'number' && typeof B === 'number' ? A - B : String(A ?? '').localeCompare(String(B ?? ''), 'pt-BR');
        return st.dir === 'asc' ? c : -c;
      });
    }
    const q = (busca[table.id] || '').trim().toLowerCase();
    if (q) lista = lista.filter((r) => colunasDef.some((c) => String(r[c.f] ?? '').toLowerCase().includes(q)));

    const tbody = table.tBodies[0];
    tbody.replaceChildren(...lista.map((r) => {
      const tr = document.createElement('tr');
      tr.dataset.key = chave(r);
      colunasDef.forEach((c) => {
        const td = document.createElement('td');
        const v = r[c.f];
        if (c.num) td.className = 'num';
        if (c.pill) {
          const s = document.createElement('span');
          s.className = `dz-pill dz-pill--${c.pill(v)}`;
          s.textContent = v ?? '';
          td.append(s);
        } else {
          td.textContent = c.fmt ? c.fmt(v) : (v ?? '');
          if (c.num && typeof v === 'number' && v < 0) td.classList.add('dz-neg');
        }
        tr.append(td);
      });
      return tr;
    }));
    const vazio = document.getElementById(`vazio-${table.id}`);
    if (vazio) vazio.hidden = lista.length > 0;
    $$('th', table).forEach((th) => {
      if (st && th.dataset.field === st.f) th.setAttribute('aria-sort', st.dir === 'asc' ? 'ascending' : 'descending');
      else th.removeAttribute('aria-sort');
    });
  }
  $$('.dz-table').forEach((table) => {
    $$('th', table).forEach((th) => {
      $('.dz-th-btn', th).addEventListener('click', () => {
        const atual = ordem[table.id];
        ordem[table.id] = { f: th.dataset.field, dir: atual && atual.f === th.dataset.field && atual.dir === 'desc' ? 'asc' : 'desc' };
        draw();
      });
    });
  });
  [['busca-trabalhos', 'tb-trabalhos'], ['busca-orc', 'tb-orc']].forEach(([inputId, tableId]) => {
    const input = $(`#${inputId}`);
    input.addEventListener('input', () => { busca[tableId] = input.value; draw(); });
  });

  const pillPagamento = (v) => (v === 'Pago' ? 'ok' : v === 'Parcial' ? 'warn' : 'bad');
  const pillStatus = (v) => (v === 'Fechado' ? 'ok' : v === 'Aguardando' ? 'warn' : 'bad');
  const pillSimNao = (v) => (v === 'Sim' ? 'ok' : 'warn');
  const chave2 = (a, b) => (r) => `${enc(r[a])},${enc(r[b])}`;

  // ---------- agenda ----------
  function agenda(el, rows, limite) {
    const lista = limite ? rows.slice(0, limite) : rows;
    if (!lista.length) { emptyNote(el, 'Nenhum evento marcado daqui para frente.'); return; }
    el.replaceChildren(...lista.map((r) => {
      const card = document.createElement('div');
      card.className = `dz-event${r.dias <= 7 ? ' dz-event--soon' : ''}`;
      const data = document.createElement('div');
      data.className = 'dz-date';
      const dia = document.createElement('b');
      dia.textContent = String(r.data).slice(8, 10);
      const mes = document.createElement('span');
      mes.textContent = `${MESES[+String(r.data).slice(5, 7) - 1]} ${String(r.data).slice(2, 4)}`;
      data.append(dia, mes);
      const main = document.createElement('div');
      main.className = 'dz-event-main';
      const nome = document.createElement('strong');
      nome.textContent = r.cliente;
      const desc = document.createElement('span');
      desc.textContent = [r.servico, r.evento].filter(Boolean).join(' · ');
      const onde = document.createElement('span');
      onde.textContent = [r.local, r.horario && `às ${r.horario}`].filter(Boolean).join(' ');
      main.append(nome, desc, onde);
      const side = document.createElement('div');
      side.className = 'dz-event-side';
      const pill = document.createElement('span');
      pill.className = `dz-pill dz-pill--${r.dias <= 7 ? 'warn' : 'gold'}`;
      pill.textContent = r.dias === 0 ? 'Hoje' : r.dias === 1 ? 'Amanhã' : `em ${r.dias} dias`;
      const receber = document.createElement('span');
      receber.textContent = r.a_receber > 0 ? `A receber ${brl.format(r.a_receber)}` : 'Pago';
      side.append(pill, receber);
      card.append(data, main, side);
      return card;
    }));
  }

  // ---------- desenho de cada aba ----------
  const desenhar = {
    visao(ano) {
      const elM = $('#ch-mensal');
      const mensal = prepare(elM, 'mensal');
      $('.js-mensal-title').textContent = ano === 'todos' ? 'Ganho bruto e lucro por ano' : `Ganho bruto e lucro por mês em ${ano}`;
      if (mensal) {
        colunas(elM, serieTempo(mensal, ano, ['bruto', 'lucro', 'freelas', 'outros', 'trabalhos']), {
          x: (r) => r.rotulo,
          series: [{ key: 'bruto', label: 'Ganho bruto', color: GOLD }, { key: 'lucro', label: 'Lucro', color: BRONZE }],
          fmt: (v) => brl.format(v), eixo: curto,
          extra: (r) => [`Freelancers: ${brl.format(r.freelas)}`, `Outros gastos: ${brl.format(r.outros)}`, `Trabalhos: ${int.format(r.trabalhos)}`],
        });
      }
      const elS = $('#bars-servico');
      const serv = prepare(elS, 'por_servico');
      if (serv) {
        barras(elS, serv.filter((r) => r.ano === ano), {
          label: 'servico', value: 'bruto', fmt: (v) => brl.format(v),
          sub: (r) => `${int.format(r.trabalhos)} ${r.trabalhos === 1 ? 'trabalho' : 'trabalhos'} · lucro ${brl.format(r.lucro)}`,
          vazio: 'Nenhum trabalho neste período.',
        });
      }
      const elA = $('#agenda-mini');
      const ag = prepare(elA, 'agenda');
      if (ag) agenda(elA, ag, 3);
    },

    trabalhos(ano) {
      const tbS = $('#tb-servico');
      const serv = rowsOf('por_servico');
      if (serv) {
        tabela(tbS, serv.filter((r) => r.ano === ano && (r.trabalhos || r.orcamentos)), [
          { f: 'servico' }, { f: 'trabalhos', num: true, fmt: FMT.int }, { f: 'bruto', num: true, fmt: FMT.brl },
          { f: 'lucro', num: true, fmt: FMT.brl }, { f: 'medio', num: true, fmt: FMT.brl },
          { f: 'orcamentos', num: true, fmt: FMT.int }, { f: 'taxa', num: true, fmt: FMT.pct },
        ], chave2('ano', 'servico'));
      }
      const tbE = $('#tb-evento');
      const ev = rowsOf('por_evento');
      if (ev) {
        tabela(tbE, ev.filter((r) => r.ano === ano && (r.trabalhos || r.orcamentos)), [
          { f: 'evento' }, { f: 'trabalhos', num: true, fmt: FMT.int }, { f: 'bruto', num: true, fmt: FMT.brl },
          { f: 'freelas', num: true, fmt: FMT.brl }, { f: 'lucro', num: true, fmt: FMT.brl },
          { f: 'medio', num: true, fmt: FMT.brl }, { f: 'taxa', num: true, fmt: FMT.pct },
        ], chave2('ano', 'evento'));
      }
      const tbT = $('#tb-trabalhos');
      const det = rowsOf('trabalhos_detalhe');
      if (det) {
        tabela(tbT, det.filter((r) => noAno(ano, r.data)), [
          { f: 'codigo' }, { f: 'data', fmt: fmtData }, { f: 'cliente' }, { f: 'servico' }, { f: 'evento' },
          { f: 'cobrado', num: true, fmt: FMT.brl }, { f: 'freelas', num: true, fmt: FMT.brl },
          { f: 'outros', num: true, fmt: FMT.brl }, { f: 'lucro', num: true, fmt: FMT.brl },
          { f: 'pagamento', pill: pillPagamento },
        ], (r) => r.codigo);
      }
    },

    orcamentos(ano) {
      const elO = $('#ch-orc');
      const mensal = prepare(elO, 'mensal');
      $('.js-orc-title').textContent = ano === 'todos' ? 'Orçamentos por ano' : `Orçamentos por mês em ${ano}`;
      if (mensal) {
        colunas(elO, serieTempo(mensal, ano, ['orc_enviados', 'orc_fechados']), {
          x: (r) => r.rotulo,
          series: [{ key: 'orc_enviados', label: 'Passados', color: MUTED }, { key: 'orc_fechados', label: 'Fechados', color: GOLD }],
          fmt: (v) => int.format(v), eixo: (v) => int.format(v),
        });
      }
      const tbO = $('#tb-orc');
      const orc = rowsOf('orcamentos');
      if (orc) {
        tabela(tbO, orc.filter((r) => noAno(ano, r.data_envio)), [
          { f: 'data_envio', fmt: fmtData }, { f: 'cliente' }, { f: 'servico' }, { f: 'evento' },
          { f: 'data_evento', fmt: fmtData }, { f: 'valor', num: true, fmt: FMT.brl }, { f: 'status', pill: pillStatus },
        ], (r) => r.id);
      }
    },

    gastos(ano) {
      const elC = $('#ch-custos');
      const mensal = prepare(elC, 'mensal');
      $('.js-custos-title').textContent = ano === 'todos' ? 'Custos por ano' : `Custos por mês em ${ano}`;
      if (mensal) {
        colunas(elC, serieTempo(mensal, ano, ['freelas', 'outros']), {
          x: (r) => r.rotulo,
          series: [{ key: 'freelas', label: 'Freelancers', color: GOLD }, { key: 'outros', label: 'Outros gastos', color: BRONZE }],
          fmt: (v) => brl.format(v), eixo: curto,
        });
      }
      const elF = $('#bars-freela');
      const fp = prepare(elF, 'freelas_pessoa');
      if (fp) {
        barras(elF, fp.filter((r) => r.ano === ano), {
          label: 'freelancer', value: 'valor', fmt: (v) => brl.format(v),
          sub: (r) => `${int.format(r.trabalhos)} ${r.trabalhos === 1 ? 'trabalho' : 'trabalhos'}`,
          vazio: 'Nenhum pagamento a freelancer neste período.',
        });
      }
      const elG = $('#bars-gasto');
      const gc = prepare(elG, 'gastos_categoria');
      if (gc) {
        barras(elG, gc.filter((r) => r.ano === ano), {
          label: 'categoria', value: 'valor', fmt: (v) => brl.format(v), vazio: 'Nenhum gasto neste período.',
        });
      }
      const fr = rowsOf('freelancers');
      if (fr) {
        tabela($('#tb-freela'), fr.filter((r) => noAno(ano, r.data)), [
          { f: 'data', fmt: fmtData }, { f: 'codigo' }, { f: 'freelancer' }, { f: 'funcao' },
          { f: 'valor', num: true, fmt: FMT.brl }, { f: 'pago', pill: pillSimNao },
        ], (r) => r.id);
      }
      const gs = rowsOf('gastos');
      if (gs) {
        tabela($('#tb-gastos'), gs.filter((r) => noAno(ano, r.data)), [
          { f: 'data', fmt: fmtData }, { f: 'categoria' }, { f: 'descricao' }, { f: 'codigo' },
          { f: 'valor', num: true, fmt: FMT.brl },
        ], (r) => r.id);
      }
    },

    equipamentos() {
      const elE = $('#bars-equip');
      const ec = prepare(elE, 'equip_categoria');
      if (ec) {
        barras(elE, ec, {
          label: 'categoria', value: 'valor', fmt: (v) => brl.format(v),
          sub: (r) => `${int.format(r.itens)} ${r.itens === 1 ? 'item' : 'itens'}`,
          vazio: 'Nenhum equipamento cadastrado.',
        });
      }
      const eq = rowsOf('equipamentos');
      if (eq) {
        tabela($('#tb-equip'), eq, [
          { f: 'equipamento' }, { f: 'categoria' }, { f: 'data_compra', fmt: fmtData },
          { f: 'valor', num: true, fmt: FMT.brl }, { f: 'pagamento' }, { f: 'situacao' },
        ], (r) => r.id);
      }
    },

    clientes() {
      const elO = $('#bars-origem');
      const og = prepare(elO, 'origem');
      if (og) {
        barras(elO, og, {
          label: 'origem', value: 'total', fmt: (v) => brl.format(v),
          sub: (r) => `${int.format(r.clientes)} ${r.clientes === 1 ? 'cliente' : 'clientes'}`,
          vazio: 'Nenhum cliente com trabalho fechado ainda.',
        });
      }
      const cr = rowsOf('clientes_resumo');
      if (cr) {
        tabela($('#tb-clientes'), cr, [
          { f: 'nome' }, { f: 'cidade' }, { f: 'origem' },
          { f: 'trabalhos', num: true, fmt: FMT.int }, { f: 'total', num: true, fmt: FMT.brl },
        ], (r) => r.nome);
      }
    },

    agenda() {
      const el = $('#agenda-full');
      const ag = prepare(el, 'agenda');
      if (ag) agenda(el, ag);
    },
  };

  function draw() {
    const ano = anoAtual();
    const anos = rowsOf('anos');
    if (anos) {
      sel.replaceChildren(...anos.map((a) => new Option(a.nome, a.ano)));
      sel.value = ano;
    }
    $$('.js-scope').forEach((el) => { el.textContent = ano === 'todos' ? 'Período: desde o início' : `Período: ${ano}`; });
    fillKpis(ano);
    fillTakeaway(ano);
    desenhar[aba](ano);
  }

  dash.onData(draw);

  const inicial = location.hash.slice(1);
  if (inicial && tabs.some((t) => t.dataset.tab === inicial)) showTab(inicial, false);
})();
