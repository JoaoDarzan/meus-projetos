(function (A) {
  const u = A.u, c = A.c, db = A.db;
  const ui = A.ui = { view: 'inicio', mes: null, fseg: 'extrato', rseg: 'mes', tfil: 'todas', efil: 'Todos', filtro: 'tudo', q: '', cartao: null, oculto: false };
  try { ui.oculto = localStorage.getItem('df-oculto') === '1'; } catch (e) { /* sem armazenamento */ }
  const R = {}, DEPOIS = {};
  const $ = id => document.getElementById(id);
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ================= peças ================= */
  const pill = () => {
    const ms = c.meses(), i = ms.indexOf(ui.mes);
    return `<div class="mpill"><button type="button" data-a="mes" data-d="-1" aria-label="Mês anterior" ${i <= 0 ? 'disabled' : ''}>${u.svg('chevron-left')}</button><span>${u.nomeMes(ui.mes)}${ui.mes.slice(0, 4) !== u.hoje().slice(0, 4) ? ' ' + ui.mes.slice(2, 4) : ''}</span><button type="button" data-a="mes" data-d="1" aria-label="Próximo mês" ${i >= ms.length - 1 ? 'disabled' : ''}>${u.svg('chevron-right')}</button></div>`;
  };
  const bar = (titulo, voltar, comMes = true) => `<header class="bar">${voltar ? `<button class="back" type="button" data-a="go" data-v="${voltar}" aria-label="Voltar">${u.svg('chevron-left')}</button>` : ''}<h1>${titulo}</h1>${comMes ? pill() : ''}</header>`;
  const seg = (nome, atual, ops) => `<div class="seg" role="group">${ops.map(([k, n]) => `<button type="button" data-a="seg" data-s="${nome}" data-v="${k}" aria-pressed="${atual === k}">${n}</button>`).join('')}</div>`;
  const vazio = (icone, txt, botao) => `<div class="vazio">${u.ti(icone, 'lg')}<span>${txt}</span>${botao || ''}</div>`;
  function linhaL(l) {
    const renda = l.grupo === 'Renda', ic = c.icone(l.cat, l.sub);
    const meta = [l.sub || l.cat, l.banco + (l.tipo === 'cartão' ? ' (cartão)' : ''), u.dm(l.data)].filter(Boolean).map(x => `<span>${u.esc(x)}</span>`).join('<span>·</span>');
    return `<button type="button" class="it btn" data-a="editL" data-id="${l.id}">${u.ti(ic)}<div style="min-width:0"><div class="t">${u.esc(u.cap(l.desc))}</div><div class="m">${meta}${l.parcela ? `<span>· ${u.esc(l.parcela)}</span>` : ''}${l.status === 'Previsto' ? '<span class="prev">previsto</span>' : ''}</div></div><div class="v num ${renda ? 'c-in' : ''}">${renda ? '+ ' : l.valor < 0 ? '− ' : ''}${u.brl(Math.abs(l.valor))}</div></button>`;
  }
  function barras(cats) {
    const mx = Math.max(...cats.map(x => x.valor), 1);
    return `<div class="bars">${cats.map((x, i) => { const s = c.icone(x.cat); return `<button type="button" class="bx" data-a="filtroCat" data-v="${u.esc(x.cat)}" style="border:0;background:none;padding:0;text-align:left;color:inherit;width:100%">${u.ti(s)}<span class="n">${u.esc(x.cat)} <span class="c-muted" style="font-weight:500">· ${x.n}</span></span><b class="v num">${u.brl(x.valor)}</b><span class="t"><i style="width:${x.valor / mx * 100}%;--a:${s[1]};--b:${s[2]};--d:${.1 + i * .05}s"></i></span></button>`; }).join('')}</div>`;
  }
  function anel(p, tam, esp, cor) { const r = (tam - esp) / 2, cf = 2 * Math.PI * r; return `<svg viewBox="0 0 ${tam} ${tam}" width="${tam}" height="${tam}"><circle cx="${tam / 2}" cy="${tam / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="${esp}"/><circle class="rg" cx="${tam / 2}" cy="${tam / 2}" r="${r}" fill="none" stroke="${cor}" stroke-width="${esp}" stroke-linecap="round" stroke-dasharray="${cf}" stroke-dashoffset="${cf}" data-off="${cf * (1 - Math.min(Math.max(p, 0), 1))}"/></svg>`; }
  const foto = () => window.FOTO_JOAO ? `<img class="ava" src="${window.FOTO_JOAO}" alt="">` : `<span class="ava" style="display:grid;place-items:center;background:linear-gradient(135deg,#ffe08a,#c98a2a);color:#3a2500;font-weight:800">JD</span>`;
  function tkLinha(t) {
    const ok = t.feita, urg = !ok && u.ateHoje(t.data) <= 1;
    const q = u.ateHoje(t.data), chip = ok ? '<span class="due feito">Feito</span>' : q < 0 ? '<span class="due amanha">Atrasada</span>' : q === 0 ? '<span class="due hoje">Hoje</span>' : q === 1 ? '<span class="due amanha">Amanhã</span>' : `<span class="due breve">${u.dm(t.data)}</span>`;
    return `<div class="tk ${ok ? 'ok' : ''} ${urg ? 'urgent' : ''}"><button class="ck" type="button" data-a="tarefa" data-id="${u.esc(t.id)}" aria-pressed="${ok}" aria-label="${ok ? 'Desmarcar' : 'Marcar como feito'}">${u.svg('check')}</button>${u.ti(t.icone)}
      <button type="button" data-a="editT" data-id="${u.esc(t.id)}" style="min-width:0;border:0;background:none;padding:0;text-align:left;color:inherit"><div class="t">${u.esc(t.titulo)}</div><div class="m">${t.valor ? `<b class="num" style="color:var(--fg)">${u.brl(t.valor)}</b>` : ''}${chip}${t.estimado && !ok ? '<span class="estim">vencimento estimado</span>' : ''}${t.banco && t.valor && t.banco !== 'Não informado' ? `<span>${t.grupo === 'receber' ? 'entra no' : 'sai do'} ${u.esc(t.banco)}</span>` : ''}</div></button>
      ${ok ? `<button class="undo" type="button" data-a="tarefa" data-id="${u.esc(t.id)}">${u.svg('undo-2')}Desfazer</button>` : '<span></span>'}</div>`;
  }

  /* fatura que importa agora: a mais antiga ainda sem pagar (até 10 dias de atraso) ou a que está aberta */
  function proxFatura(nome) {
    const m0 = u.mes(u.hoje());
    for (let mm = u.addMes(m0, -1); mm <= u.addMes(m0, 2); mm = u.addMes(mm, 1)) {
      if (c.pagFatura(nome, mm) || c.fatura(nome, mm) < 0.01) continue;
      if (u.ateHoje(c.vence(nome, mm).data) >= -10) return mm;
    }
    return c.faturaDe(u.hoje(), nome);
  }

  /* ================= INÍCIO ================= */
  R.inicio = () => {
    const r = c.resumo(ui.mes), m = ui.mes;
    const ult = r.L.slice().sort((a, b) => a.data < b.data ? 1 : a.data > b.data ? -1 : 0);
    const prox = c.tarefas().filter(t => !t.feita).slice(0, 3);
    const urg = c.urgentes();
    const bancos = c.bancosComConta().map(b => ({ b, v: c.saldoBanco(b), tem: c.contas().some(x => x['BANCO'] === b && c.saldo(x) != null) }));
    const cartoes = c.cartoes();
    const media = n => c.media(x => x.fonte[n], m);
    const dif = (v, med) => { if (!med) return ''; const d = v / med - 1; return `<span class="d ${d >= 0 ? 'c-in' : 'c-out'}">${d >= 0 ? '▲' : '▼'} ${u.pct(Math.abs(d))} vs média</span>`; };
    const d1 = c.dicas(m)[0];
    return `<div class="home"><div class="col-l">
      <section class="hero"><span class="blob b1"></span><span class="blob b2"></span>
        <div class="hello"><button type="button" class="ava-w" data-a="conta" aria-label="Sua conta" style="border:0;padding:0;background:none;cursor:pointer">${foto()}</button><div class="hi"><b>Olá, João!</b><span>${new Date(u.hoje() + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>
          <button class="eye" type="button" data-a="ocultar" aria-label="${ui.oculto ? 'Mostrar valores' : 'Esconder valores'}">${u.svg(ui.oculto ? 'eye-off' : 'eye')}</button>
          <button class="bell ${urg ? 'ring' : ''}" type="button" data-a="go" data-v="tarefas" aria-label="Tarefas">${u.svg('bell')}${urg ? `<span class="cnt">${urg}</span>` : ''}</button></div>
        <div class="bal"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><div class="lbl">${r.futuro ? 'Previsto para' : 'Sobrou em'} ${u.nomeMes(m).toLowerCase()}</div>${pill()}</div>
          <div class="big num" data-cnt="${r.sobra}" data-fmt="big">${u.big(r.sobra)}</div></div>
        <div class="flows num"><span class="flow">${u.svg('arrow-up')}<span>Entrou</span><b data-cnt="${r.entr}" data-fmt="k0">${u.k0(r.entr)}</b></span><span class="flow">${u.svg('arrow-down')}<span>Saiu</span><b data-cnt="${r.saiu}" data-fmt="k0">${u.k0(r.saiu)}</b></span><span class="flow">${u.svg('piggy-bank')}<span>Guardou</span><b data-cnt="${r.guardou}" data-fmt="k0">${u.k0(r.guardou)}</b></span></div>
        <div class="bankpills">${bancos.map(x => `<button type="button" class="bp" data-a="irBancos" style="--a:${(c.CORBANCO[x.b] || c.CORBANCO['Não informado'])[0]};--b:${(c.CORBANCO[x.b] || c.CORBANCO['Não informado'])[1]}"><i></i>${u.esc(x.b)} <b class="num">${x.tem ? u.k0(x.v) : '—'}</b></button>`).join('')}${c.semSaldo() ? `<button type="button" class="bp" data-a="irBancos" style="--a:#ffe08a;--b:#c98a2a"><i></i>Informar saldos</button>` : ''}</div>
      </section>
      ${cartoes.length ? `<section class="sec"><div class="sec-h"><h2>Cartões</h2><button class="more" type="button" data-a="irCartoes">Ver faturas</button></div><div class="rail">${cartoes.map(k => { const nome = k['CARTÃO'], fm = m === u.mes(u.hoje()) ? proxFatura(nome) : m, v = c.fatura(nome, fm), ven = c.vence(nome, fm), q = u.ateHoje(ven.data); return `<button type="button" class="gcard sm tilt" style="--g:${c.GRAD[nome] || 'var(--mp)'}" data-a="irCartoes" data-v="${u.esc(nome)}"><span class="sheen"></span><span class="bank">${u.esc(nome)}${u.svg('smartphone-nfc')}</span><span><span class="k">Fatura de ${u.nomeMes(fm).toLowerCase()}</span><br><span class="amt num">${u.brl(v)}</span></span><span class="foot"><span>${q < 0 ? 'Venceu' : 'Vence'} ${u.dm(ven.data)}${ven.estimado ? '*' : ''}</span><span>${c.pagFatura(nome, fm) ? 'Paga ✓' : q < 0 && v > 0 ? 'Atrasada' : 'Crédito'}</span></span></button>`; }).join('')}</div></section>` : ''}
      <section class="sec"><div class="acts">
        <button class="act" type="button" data-a="novoL" data-t="saida"><span class="o">${u.svg('arrow-down')}</span>Gastei</button>
        <button class="act" type="button" data-a="novoL" data-t="entrada"><span class="o">${u.svg('arrow-up')}</span>Recebi</button>
        <button class="act" type="button" data-a="novoL" data-t="guardar"><span class="o">${u.svg('piggy-bank')}</span>Guardei</button>
        <button class="act" type="button" data-a="novoE"><span class="o">${u.svg('camera')}</span>Equipamento</button></div></section>
      <section class="sec"><div class="sec-h"><h2>Minhas rendas</h2></div><div class="incomes">
        ${[['Salário CLT', 'Salário CLT'], ['Darzan Produções', 'Darzan'], ['JPL SOM', 'JPL SOM']].map(([k, n]) => `<button class="inc" type="button" data-a="irRel" data-v="${k === 'Darzan Produções' ? 'darzan' : k === 'JPL SOM' ? 'jpl' : 'mes'}">${u.ti(c.icone(k))}<span class="n">${n}</span><b class="v num">${u.k0(r.fonte[k])}</b>${dif(r.fonte[k], media(k))}</button>`).join('')}</div></section>
    </div><div class="col-r">
      <section class="sec"><div class="sec-h"><h2>${u.svg('list-checks')}Pra fazer</h2><button class="more" type="button" data-a="go" data-v="tarefas">Ver tudo</button></div>${prox.map(tkLinha).join('') || vazio(['circle-check', '#7cf0a8', '#15a352'], 'Nada pendente. Tudo em dia!')}</section>
      <section class="sec"><div class="sec-h"><h2>Para onde foi</h2><span class="c-muted num" style="font-size:.86rem">${r.cats.length} categorias</span></div>
        <div class="panel">${r.cats.length ? `<div class="scrollbox">${barras(r.cats)}</div><div class="tot-row"><span>Total que saiu</span><b class="num c-out">${u.brl(r.saiu)}</b></div>` : vazio(['shopping-bag', '#c2a8ff', '#6b34e0'], 'Nenhum gasto neste mês.')}</div></section>
      <section class="sec"><div class="sec-h"><h2>Lançamentos de ${u.nomeMes(m).toLowerCase()}</h2><button class="more" type="button" data-a="irExtrato">Ver extrato</button></div>
        <div class="panel" style="padding:6px 10px">${ult.length ? `<div class="scrollbox fade">${ult.map(linhaL).join('')}</div><div class="tot-row" style="font-weight:600;font-size:.84rem"><span class="c-muted">${ult.length} lançamentos · toque para editar</span></div>` : vazio(['list-checks', '#9cc6ff', '#2a62e0'], 'Nada lançado neste mês.', `<button class="btn2 pri" type="button" data-a="novoL" data-t="saida">${u.svg('plus')}Lançar</button>`)}</div></section>
      <section class="sec"><div class="panel insight"><span class="eyebrow">Dica de ${u.nomeMes(m).toLowerCase()}</span><h3>${u.esc(d1.t)}</h3><p>${d1.s}</p><button class="more" type="button" data-a="irRel" data-v="mes" style="margin-top:8px">Ver relatório →</button></div></section>
    </div></div>`;
  };

  /* ================= TAREFAS ================= */
  R.tarefas = () => {
    const lv = c.nivel(c.xp()), F = ui.tfil;
    const todas = c.tarefas().filter(t => F === 'todas' || t.grupo === F || (F === 'conta' && t.grupo === 'receber'));
    const abertas = todas.filter(t => !t.feita), feitas = todas.filter(t => t.feita);
    const G = [['Atrasadas', t => u.ateHoje(t.data) < 0], ['Hoje', t => u.ateHoje(t.data) === 0], ['Amanhã', t => u.ateHoje(t.data) === 1], ['Esta semana', t => u.ateHoje(t.data) > 1 && u.ateHoje(t.data) <= 7], ['Mais pra frente', t => u.ateHoje(t.data) > 7]];
    const cnt = g => c.tarefas().filter(t => !t.feita && (g === 'todas' || t.grupo === g || (g === 'conta' && t.grupo === 'receber'))).length;
    return bar('Tarefas', null, false) + `<div class="miniplayer"><div class="ringw">${anel(lv.atual / lv.prox, 52, 4, '#ffd36b')}${foto()}<span class="lvl">Nv ${lv.n}</span></div><div style="flex:1;min-width:0"><b>${lv.nome}</b><div class="xpbar"><i style="width:${lv.atual / lv.prox * 100}%"></i></div><div class="xpinfo num" style="margin-top:4px"><span>${lv.atual}/${lv.prox} XP</span><span>cada tarefa feita vale XP</span></div></div></div>
      <div class="sec" style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center;margin-top:16px"><div class="chips">${[['todas', 'Todas'], ['conta', 'Contas'], ['darzan', 'Darzan'], ['pessoal', 'Pessoais']].map(([k, n]) => `<button class="chip" type="button" data-a="seg" data-s="tfil" data-v="${k}" aria-pressed="${F === k}">${n} · ${cnt(k)}</button>`).join('')}</div><button class="chip" type="button" data-a="novoT" style="border-color:var(--blue);color:var(--blue-hi)">${u.svg('plus')} Nova tarefa</button></div>
      <div class="two"><div>${G.map(([n, f]) => { const a = abertas.filter(f); return a.length ? `<div class="grp"><span>${n}</span><b>${a.length}</b></div>${a.map(tkLinha).join('')}` : ''; }).join('') || `<div class="panel" style="margin-top:16px">${vazio(['party-popper', '#cf9cff', '#7a35e6'], 'Tudo em dia por aqui!')}</div>`}</div>
      <div><div class="grp"><span>Feitas</span><b>${feitas.length}</b></div>${feitas.map(tkLinha).join('') || '<p class="c-muted" style="font-size:.88rem">Marcou sem querer? É só tocar em “Desfazer”.</p>'}
      <p class="aviso">As contas do mês (seguro, boletos) e as faturas dos cartões entram aqui sozinhas. Marcar uma fatura como paga tira o valor do banco que paga o cartão.</p></div></div>`;
  };

  /* ================= TRABALHOS ================= */
  const ETAPAS = [['Orçamento', '#9eabcd'], ['Fechado', '#8fb0ff'], ['Em andamento', '#ffc86b'], ['Entregue', '#5fe0a1']];
  const TIPOEV = { 'Casamento': ['heart', '#ff9cd0', '#d2257f'], '15 anos': ['cake', '#cf9cff', '#7a35e6'], 'Aniversário': ['cake', '#cf9cff', '#7a35e6'], 'Social media': ['smartphone', '#8fb6ff', '#2148d6'], 'Corporativo': ['building-2', '#5fe3f5', '#0a8bb0'], 'Palestra': ['speaker', '#d79bf0', '#8a3fb0'], 'Evento': ['party-popper', '#ffd97a', '#c07a0a'] };
  function cardJob(j) {
    const s = TIPOEV[j['TIPO DE EVENTO']] || TIPOEV.Evento, tot = c.num(j['VALOR TOTAL']), rec = c.recebido(j), falta = c.faltaReceber(j), d = String(j['DATA DO EVENTO'] || '');
    return `<button type="button" class="job" data-a="editJ" data-id="${j.ID}" style="--a:${s[1]};--b:${s[2]}"><div class="cov"></div><div class="in">
      <div class="tp"><span>${u.esc(j['TIPO DE EVENTO'] || 'Trabalho')}</span>${j['ETAPA'] === 'Entregue' ? '<span class="c-in">✓</span>' : ''}</div><div class="nm">${u.esc(j['CLIENTE'])}</div>
      <div class="meta">${d ? `<span>${u.svg('calendar-days')}${u.dm(d)}${u.ateHoje(d) >= 0 && u.ateHoje(d) <= 60 ? ` · em ${u.ateHoje(d)} dias` : ''}</span>` : ''}${j['LOCAL'] ? `<span>${u.svg('map-pin')}${u.esc(j['LOCAL'])}</span>` : ''}</div>
      ${tot ? `<div class="money"><i style="width:${Math.min(rec / tot, 1) * 100}%"></i></div><div class="mrow num"><span class="c-muted">${u.k0(rec)} de ${u.k0(tot)}</span>${falta > 0 ? `<b class="c-warn">falta ${u.k0(falta)}</b>` : '<b class="c-in">pago</b>'}</div>` : `<div class="mrow num"><span class="c-muted">Recebido ${u.k0(rec)}</span><span class="estim">sem valor total</span></div>`}
      ${j['O QUE FOI FECHADO'] ? `<div class="ft"><span>${u.svg('package')}${u.esc(j['O QUE FOI FECHADO'])}</span></div>` : ''}</div></button>`;
  }
  R.trabalhos = () => {
    const js = c.trabalhos(), abertos = js.filter(j => j['ETAPA'] !== 'Entregue' && j['ETAPA'] !== 'Orçamento');
    const receber = u.sum(abertos, j => Math.max(c.faltaReceber(j) || 0, 0)), orc = u.sum(js.filter(j => j['ETAPA'] === 'Orçamento'), j => c.num(j['VALOR TOTAL']));
    const prox = js.filter(j => j['DATA DO EVENTO'] && u.ateHoje(String(j['DATA DO EVENTO'])) >= 0).sort((a, b) => String(a['DATA DO EVENTO']) < String(b['DATA DO EVENTO']) ? -1 : 1)[0];
    const fat = c.resumo(ui.mes).fonte['Darzan Produções'];
    return bar('Trabalhos', null, false) + `<div class="sub" style="margin-top:-4px">Darzan Produções</div>
      <section class="sec"><div class="kpis k4"><div class="kpi"><span>A receber</span><b class="num c-warn">${u.k0(receber)}</b><small>dos trabalhos fechados</small></div><div class="kpi"><span>Em orçamento</span><b class="num">${u.k0(orc)}</b><small>${js.filter(j => j['ETAPA'] === 'Orçamento').length} esperando resposta</small></div><div class="kpi"><span>Próximo evento</span><b>${prox ? u.dm(String(prox['DATA DO EVENTO'])) : '—'}</b><small>${prox ? u.esc(prox['CLIENTE']) : 'nenhum marcado'}</small></div><div class="kpi"><span>Faturou em ${u.nomeMes(ui.mes).toLowerCase()}</span><b class="num c-in">${u.k0(fat)}</b><small>na Darzan</small></div></div></section>
      <section class="sec"><div class="sec-h"><h2>${u.svg('layers')}Quadro</h2><button class="chip" type="button" data-a="novoJ" style="border-color:var(--blue);color:var(--blue-hi)">${u.svg('plus')} Novo trabalho</button></div>
        <div class="board">${ETAPAS.map(([n, cor]) => { const l = js.filter(j => (j['ETAPA'] || 'Orçamento') === n); return `<div class="col"><div class="col-h"><span><i style="--c:${cor}"></i>${n}</span><em>${l.length}</em></div>${l.map(cardJob).join('') || '<p class="c-muted" style="font-size:.84rem;margin:6px 4px">Nada aqui.</p>'}</div>`; }).join('')}</div>
        <p class="aviso">“Recebido” soma sozinho as entradas do extrato que têm o nome do cliente na descrição (ex.: “Ana - casamento”). Use o botão <b>Registrar recebimento</b> dentro do trabalho.</p></section>`;
  };

  /* ================= EQUIPAMENTOS ================= */
  const TIPOS_EQ = ['Câmera', 'Lente', 'Celular', 'Áudio', 'Iluminação', 'Estabilizador', 'Armazenamento', 'Computador', 'Acessório'];
  const ICON_EQ = { 'Câmera': ['camera', '#8fb6ff', '#2148d6'], 'Lente': ['camera', '#8fb6ff', '#2148d6'], 'Celular': ['smartphone', '#c2a8ff', '#6b34e0'], 'Áudio': ['music', '#ff9cd0', '#d2257f'], 'Iluminação': ['lightbulb', '#ffe066', '#d08a00'], 'Estabilizador': ['video', '#6cc8ff', '#1f5fe0'], 'Armazenamento': ['hard-drive', '#5fe3f5', '#0a8bb0'], 'Computador': ['cpu', '#7cf0c0', '#068a5a'], 'Acessório': ['battery', '#9aa5ff', '#4a46e0'] };
  const FOTOP = [[/zv-?e?10.*(23|lente)|zve10 \+|c[aâ]mera/i, 'zve10'], [/iphone/i, 'iphone'], [/gimbal|scorp/i, 'scorp'], [/ssd|xs1000/i, 'ssd'], [/sokani|bast[aã]o/i, 'sokani'], [/cart[aã]o de mem/i, 'cartao'], [/bateria/i, 'bateria'], [/mem[oó]ria ram|\bram\b/i, 'ram'], [/case hd|hd externo/i, 'casehd']];
  c.fotoEquip = e => { if (e['FOTO']) return e['FOTO']; const P = window.FOTOS_PADRAO || {}; const k = (FOTOP.find(([re]) => re.test(e['NOME'])) || [])[1]; return k && P[k] ? P[k] : null; };
  R.equip = () => {
    const es = c.equips(), tipos = ['Todos', ...new Set(es.map(e => e['TIPO']).filter(Boolean))];
    const lista = es.filter(e => ui.efil === 'Todos' || e['TIPO'] === ui.efil);
    const tot = u.sum(es, e => c.num(e['VALOR'])), falta = u.sum(es, c.faltaPagar);
    return bar('Equipamentos', null, false) + `<section><div class="kpis k4"><div class="kpi"><span>Investido</span><b class="num">${u.k0(tot)}</b><small>${es.length} itens</small></div><div class="kpi"><span>Falta pagar</span><b class="num c-warn">${u.k0(falta)}</b><small>parcelas no cartão</small></div><div class="kpi"><span>Quitados</span><b class="num">${es.filter(e => !c.faltaPagar(e)).length}</b><small>de ${es.length}</small></div><div class="kpi"><span>Mais caro</span><b class="num">${u.k0(Math.max(0, ...es.map(e => c.num(e['VALOR']))))}</b><small>${u.esc((es.slice().sort((a, b) => c.num(b['VALOR']) - c.num(a['VALOR']))[0] || {})['NOME'] || '')}</small></div></div></section>
      <div class="sec" style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center"><div class="chips">${tipos.map(t => `<button class="chip mini" type="button" data-a="seg" data-s="efil" data-v="${u.esc(t)}" aria-pressed="${ui.efil === t}">${u.esc(t)}</button>`).join('')}</div><button class="chip" type="button" data-a="novoE">${u.svg('plus')}Novo equipamento</button></div>
      <section class="sec"><div class="eqs">${lista.map(e => { const f = c.fotoEquip(e), fp = c.faltaPagar(e), s = ICON_EQ[e['TIPO']] || ICON_EQ['Acessório']; return `<button type="button" class="eq" data-a="editE" data-id="${e.ID}"><div class="ph">${f ? `<img src="${f}" alt="" loading="lazy">` : `<div class="art" style="--a:${s[1]};--b:${s[2]};height:100%">${u.svg(s[0])}</div>`}</div>${fp ? `<span class="st pd">falta ${u.k0(fp)}</span>` : '<span class="st ok">Quitado</span>'}<div class="t">${u.esc(e['NOME'])}</div><div class="m">${u.esc(e['TIPO'] || '')}${e['ESTADO'] ? ' · ' + u.esc(e['ESTADO']) : ''}</div><div class="v num">${u.brl(c.num(e['VALOR']))}</div><div class="m">${u.esc(e['COMO PAGOU'] || '')}</div></button>`; }).join('') || vazio(['camera', '#8fb6ff', '#2148d6'], 'Nenhum equipamento cadastrado.')}</div></section>`;
  };

  /* ================= FINANÇAS ================= */
  R.fin = () => {
    const s = seg('fseg', ui.fseg, [['extrato', 'Extrato'], ['bancos', 'Bancos'], ['cartoes', 'Cartões'], ['metas', 'Metas'], ['relatorios', 'Relatórios']]);
    return bar('Finanças', null, ui.fseg !== 'bancos' && ui.fseg !== 'metas') + `<div class="fin">${s}</div>` + (FIN[ui.fseg] || FIN.extrato)();
  };
  const FIN = {};
  FIN.extrato = () => {
    const r = c.resumo(ui.mes), q = u.sem(ui.q), F = ui.filtro;
    const L = r.L.filter(l => (F === 'tudo' || (F === 'entradas' && l.grupo === 'Renda') || (F === 'saidas' && c.ehGasto(l)) || (F === 'cartao' && l.tipo === 'cartão') || (F === 'previstos' && l.status === 'Previsto') || (F.startsWith('cat:') && l.cat === F.slice(4))) && (!q || u.sem(l.desc + ' ' + l.cat + ' ' + l.sub + ' ' + l.banco).indexOf(q) >= 0)).sort((a, b) => a.data < b.data ? 1 : a.data > b.data ? -1 : 0);
    let html = '', dia = null;
    L.forEach(l => { if (l.data !== dia) { dia = l.data; const q = u.quando(l.data), sem = new Date(l.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' }); html += `<div class="day">${/^(Hoje|Ontem|Amanhã)$/.test(q) ? q : sem} · ${u.ddmmaa(l.data)}</div>`; } html += linhaL(l); });
    const chips = [['tudo', 'Tudo'], ['entradas', 'Entradas'], ['saidas', 'Saídas'], ['cartao', 'Cartão'], ['previstos', 'Previstos']].concat(F.startsWith('cat:') ? [[F, F.slice(4)]] : []);
    return `<section class="sec"><div class="kpis k4"><div class="kpi"><span>Entrou</span><b class="num c-in">${u.brl(r.entr)}</b></div><div class="kpi"><span>Saiu</span><b class="num c-out">${u.brl(r.saiu)}</b></div><div class="kpi"><span>Guardou</span><b class="num">${u.brl(r.guardou)}</b></div><div class="kpi"><span>Sobrou</span><b class="num">${u.brl(r.sobra)}</b></div></div></section>
      <div class="sec" style="display:grid;gap:12px"><input class="search" id="busca" type="search" placeholder="Buscar: gasolina, cliente, iFood…" value="${u.esc(ui.q)}" aria-label="Buscar"><div class="chips">${chips.map(([k, n]) => `<button class="chip" type="button" data-a="seg" data-s="filtro" data-v="${u.esc(k)}" aria-pressed="${F === k}">${u.esc(n)}</button>`).join('')}</div></div>
      <div class="panel" style="margin-top:14px;padding:4px 10px 10px">${html || vazio(['search', '#9cc6ff', '#2a62e0'], 'Nada encontrado neste mês.')}</div>`;
  };
  FIN.bancos = () => {
    const tot = c.totalBancos(), falta = c.semSaldo();
    return `<section class="sec"><div class="sub">Dinheiro nos bancos</div><div class="bignum num" data-cnt="${tot}" data-fmt="big">${u.big(tot)}</div>${falta ? `<p class="c-warn" style="font-size:.84rem;margin:6px 0 0">● Falta informar ${falta} saldo${falta > 1 ? 's' : ''}. Toque em “Conferir saldo”.</p>` : ''}</section>
      <div class="two"><div><section class="sec">${c.bancosComConta().map(b => {
        const cor = c.CORBANCO[b] || c.CORBANCO['Não informado'], subs = c.contas().filter(x => x['BANCO'] === b);
        return `<article class="bank" style="--a:${cor[0]}"><div class="bank-h">${u.ti(['landmark', cor[0], cor[1]])}<div><b>${u.esc(b)}</b><span class="c-muted" style="font-size:.78rem">conferência manual</span></div><div class="tot"><span>no banco</span><b class="num">${u.brl(c.saldoBanco(b))}</b></div></div>
          ${subs.map(x => { const v = c.saldo(x), d = String(x['DATA DA CONFERÊNCIA'] || ''), n = d ? -u.ateHoje(d) : null, mv = c.movimentos(x).length; return `<div class="sub-row"><span class="n">${u.esc(x['CONTA'])}</span><b class="v num">${v == null ? '<span class="nonec">—</span>' : u.brl(v)}</b><span class="s">${!d ? '<span class="nonec">Informe o saldo</span>' : n <= 0 ? '<span class="okc">Conferido hoje</span>' : n <= 7 ? `<span class="okc">Conferido há ${n} dias</span>` : `<span class="oldc">Conferido há ${n} dias</span>`}${mv ? `<span>· ${mv} movimento${mv > 1 ? 's' : ''} desde então</span>` : ''}</span></div>`; }).join('')}
          ${c.ehCartao(b) ? `<div class="sub-row"><span class="n">Fatura do cartão (${u.nomeMes(u.mes(u.hoje())).toLowerCase()})</span><b class="v num c-out">${u.brl(c.fatura(b, u.mes(u.hoje())))}</b><span class="s">não sai do saldo até você pagar</span></div>` : ''}
          <div class="bank-a"><button class="chip" type="button" data-a="conferir" data-v="${u.esc(b)}">${u.svg('refresh-ccw')} Conferir saldo</button><button class="chip" type="button" data-a="novaCx" data-v="${u.esc(b)}">${u.svg('plus')} Caixinha</button></div></article>`;
      }).join('')}</section></div>
      <div><section class="sec"><div class="panel"><div class="sec-h"><h2>${u.svg('shield-check')}Como o saldo bate certinho</h2></div><ol class="howto"><li><div><b>Você informa o saldo uma vez</b><span>Abre o app do banco e digita aqui em “Conferir saldo”.</span></div></li><li><div><b>O app soma o que entra e sai</b><span>Cada lançamento na conta, depois da data da conferência, mexe no saldo daquele banco.</span></div></li><li><div><b>De vez em quando, confere de novo</b><span>Se não bater, o app mostra a diferença na hora. Dica: confira depois de lançar os gastos do dia.</span></div></li></ol></div></section></div></div>`;
  };
  FIN.cartoes = () => {
    const ks = c.cartoes();
    if (!ks.length) return vazio(['credit-card', '#9fd8ff', '#2a62d8'], 'Nenhum cartão na aba CARTOES.');
    if (!ui.cartao || !c.cartao(ui.cartao)) ui.cartao = ks[0]['CARTÃO'];
    const k = c.cartao(ui.cartao), nome = k['CARTÃO'], m = ui.mes, it = c.itensFatura(nome, m).sort((a, b) => a.data < b.data ? 1 : -1), v = c.fatura(nome, m), ven = c.vence(nome, m), uso = c.emUso(nome), lim = c.num(k['LIMITE']);
    const prox = [1, 2, 3].map(n => { const mm = u.addMes(m, n); return { m: mm, v: c.fatura(nome, mm) }; }), mx = Math.max(...prox.map(p => p.v), 1);
    return `<div class="cardsel sec" style="margin-top:14px">${ks.map(x => `<button class="chip" type="button" data-a="seg" data-s="cartao" data-v="${u.esc(x['CARTÃO'])}" aria-pressed="${x['CARTÃO'] === nome}">${u.esc(x['CARTÃO'])}</button>`).join('')}</div>
      <div class="two"><div><section class="sec"><div class="gcard lg tilt" style="--g:${c.GRAD[nome] || 'var(--mp)'};width:100%"><span class="sheen"></span><div class="bank"><span style="font-size:1.1rem">${u.esc(nome)}</span>${u.svg('smartphone-nfc')}</div><div><span class="chipc"></span><span class="pan num">•••• •••• •••• ••••</span></div><div style="display:flex;justify-content:space-between;align-items:end"><div><div class="k">Fatura de ${u.nomeMes(m).toLowerCase()}</div><div class="amt num">${u.brl(v)}</div></div><span class="k">${c.pagFatura(nome, m) ? 'paga ✓' : 'vence ' + u.dm(ven.data)}</span></div></div></section>
        <section class="sec"><div class="panel"><div class="mrow2"><span>Fecha dia</span><b>${u.esc(k['FECHA DIA'] || '—')}</b></div><div class="mrow2"><span>Vence dia</span><b>${k['VENCE DIA'] ? u.esc(k['VENCE DIA']) : '<span class="estim">preencha</span>'}</b></div><div class="mrow2"><span>Pago pela conta</span><b>${u.esc(c.contaQuePaga(nome))}</b></div>
          ${lim ? `<div class="limit"><i style="width:${Math.min(uso / lim, 1) * 100}%"></i></div><div class="mrow2 num"><span>${u.k0(uso)} em uso</span><b>${u.k0(Math.max(lim - uso, 0))} livre de ${u.k0(lim)}</b></div>` : ''}
          <button class="btn2" type="button" data-a="editK" data-v="${u.esc(nome)}" style="width:100%;margin-top:10px">${u.svg('pencil')}Editar cartão</button></div></section>
        <section class="sec"><div class="panel"><div class="sec-h" style="margin:0"><h2>Próximas faturas</h2></div><div class="minibars">${prox.map((p, j) => `<div class="mb"><b class="num">${u.k0(p.v)}</b><i style="height:${Math.max(p.v / mx * 96, 4)}px;--d:${j * .1}s"></i><span>${u.CURTO[+p.m.slice(5) - 1]}</span></div>`).join('')}</div></div></section></div>
      <div><section class="sec"><div class="sec-h"><h2>Na fatura de ${u.nomeMes(m).toLowerCase()}</h2><b class="num">${u.brl(v)}</b></div><div class="panel" style="padding:6px 10px">${it.map(linhaL).join('') || vazio(['credit-card', '#9fd8ff', '#2a62d8'], 'Nenhuma compra nesta fatura.')}</div></section></div></div>`;
  };
  FIN.metas = () => {
    const gs = db.linhas('METAS').filter(g => g['META']);
    const tem = g => { const cx = c.caixinhas().find(x => u.sem(x['CONTA']).indexOf(u.sem(g['ONDE ESTÁ'])) >= 0 && g['ONDE ESTÁ']); return cx ? (c.saldo(cx) || 0) : c.num(g['JÁ GUARDADO']); };
    return `<section class="sec"><div class="sec-h"><h2>${u.svg('target')}Minhas metas</h2><button class="chip" type="button" data-a="novoM">${u.svg('plus')} Nova meta</button></div>
      <div class="goals">${gs.map(g => { const alvo = c.num(g['VALOR ALVO']) || 1, t = tem(g), p = t / alvo; return `<button type="button" class="goal" data-a="editM" data-id="${g.ID}"><div class="top">${u.ti(['target', '#9cc6ff', '#2a62e0'], 'lg')}<div class="gring">${anel(p, 52, 5, '#8fb0ff')}<b class="num">${u.pct(p)}</b></div></div><div><div class="t">${u.esc(g['META'])}</div><div class="m num">${u.k0(t)} de ${u.k0(alvo)}</div></div><div class="m">${g['ONDE ESTÁ'] ? 'Em: ' + u.esc(g['ONDE ESTÁ']) : 'Toque para editar'}${g['PRAZO'] ? ' · até ' + u.dm(String(g['PRAZO'])) : ''}</div></button>`; }).join('') || vazio(['target', '#9cc6ff', '#2a62e0'], 'Nenhuma meta ainda.')}</div>
      <p class="aviso">Se em “Onde está” você escrever o nome de uma caixinha (ex.: “Caixinha Reserva”), o app usa o saldo dela como “já guardado”.</p></section>`;
  };
  FIN.relatorios = () => {
    const s = seg('rseg', ui.rseg, [['mes', 'Mês'], ['ano', 'Ano'], ['darzan', 'Darzan'], ['jpl', 'JPL SOM']]);
    return `<div class="sec">${s}</div>` + (REL[ui.rseg] || REL.mes)();
  };
  const REL = {};
  REL.mes = () => {
    const r = c.resumo(ui.mes), mm = u.nomeMes(ui.mes).toLowerCase(), mg = c.media(x => x.saiu, ui.mes);
    return `<section class="sec"><div class="panel insight story"><span class="eyebrow">${u.nomeMes(ui.mes)} em poucas palavras</span>
        <p style="margin-top:10px">Entraram <b class="num">${u.brl(r.entr)}</b>: ${u.k0(r.fonte['Salário CLT'])} do salário, ${u.k0(r.fonte['Darzan Produções'])} da Darzan e ${u.k0(r.fonte['JPL SOM'])} da JPL SOM.</p>
        <p>Saíram <b class="num">${u.brl(r.saiu)}</b>${mg ? `, ${r.saiu > mg ? u.pct(r.saiu / mg - 1) + ' a mais' : u.pct(1 - r.saiu / mg) + ' a menos'} que a sua média` : ''}. Você guardou <b class="num">${u.k0(r.guardou)}</b> e ${r.sobra >= 0 ? 'sobraram' : 'faltaram'} <b class="num">${u.brl(Math.abs(r.sobra))}</b>.</p></div></section>
      <div class="two"><section class="sec"><div class="sec-h"><h2>O que dá pra melhorar</h2></div><ol class="tips">${c.dicas(ui.mes).slice(0, 4).map((d, n) => `<li><span class="n">${n + 1}</span><div><b>${u.esc(d.t)}</b><span class="s">${d.s}</span></div></li>`).join('')}</ol></section>
      <section class="sec"><div class="sec-h"><h2>Para onde foi</h2></div><div class="panel">${r.cats.length ? `<div class="scrollbox">${barras(r.cats)}</div><div class="tot-row"><span>Total</span><b class="num">${u.brl(r.saiu)}</b></div>` : vazio(['shopping-bag', '#c2a8ff', '#6b34e0'], 'Nenhum gasto em ' + mm + '.')}</div></section></div>`;
  };
  REL.ano = () => {
    const ms = c.mesesPassados().concat(c.doMes(u.mes(u.hoje())).length ? [u.mes(u.hoje())] : []);
    const rs = ms.map(c.resumo), E = u.sum(rs, r => r.entr), G = u.sum(rs, r => r.saiu), S = u.sum(rs, r => r.guardou);
    return `<section class="sec"><div class="sub">Sobrou desde ${ms[0] ? u.nomeMes(ms[0]).toLowerCase() : ''}</div><div class="bignum num">${u.big(E - G - S)}</div>
      <div class="kpis k4" style="margin-top:16px"><div class="kpi"><span>Entrou</span><b class="num c-in">${u.k0(E)}</b></div><div class="kpi"><span>Saiu</span><b class="num c-out">${u.k0(G)}</b></div><div class="kpi"><span>Guardou</span><b class="num">${u.k0(S)}</b><small>${u.pct(E ? S / E : 0)} da renda</small></div><div class="kpi"><span>Meses</span><b class="num">${ms.length}</b></div></div></section>
      <section class="sec"><div class="sec-h"><h2>Entrou e saiu, mês a mês</h2></div><div class="panel"><div class="lgd">${Object.entries(c.FONTES).map(([k, v]) => `<span><i style="background:var(${v})"></i>${k}</span>`).join('')}<span><i class="ln"></i>Quanto saiu</span></div><div class="chart" id="chAno"></div></div></section>
      <section class="sec"><div class="panel tbl"><table><thead><tr><th>Mês</th><th>Entrou</th><th>Saiu</th><th>Guardou</th><th>Sobrou</th></tr></thead><tbody>${rs.map(r => `<tr><td>${u.nomeMes(r.m)}</td><td class="num">${u.k0(r.entr)}</td><td class="num">${u.k0(r.saiu)}</td><td class="num">${u.k0(r.guardou)}</td><td class="num ${r.sobra < 0 ? 'c-out' : ''}">${u.k0(r.sobra)}</td></tr>`).join('')}</tbody><tfoot><tr><td>Total</td><td class="num">${u.k0(E)}</td><td class="num">${u.k0(G)}</td><td class="num">${u.k0(S)}</td><td class="num">${u.k0(E - G - S)}</td></tr></tfoot></table></div></section>`;
  };
  const relFonte = (nome) => () => {
    const ms = c.mesesPassados().concat([u.mes(u.hoje())]), rs = ms.map(c.resumo), ano = u.sum(rs, r => r.fonte[nome]);
    const doMes = c.resumo(ui.mes).ent.filter(l => l.cat === nome).sort((a, b) => a.data < b.data ? 1 : -1);
    return `<section class="sec"><div style="display:flex;gap:14px;align-items:center">${u.ti(c.icone(nome), 'xl')}<div><div class="sub">${nome} em ${u.nomeMes(ui.mes).toLowerCase()}</div><div class="bignum num">${u.big(c.resumo(ui.mes).fonte[nome])}</div></div></div>
      <div class="kpis" style="margin-top:16px"><div class="kpi"><span>No ano</span><b class="num">${u.k0(ano)}</b></div><div class="kpi"><span>Média por mês</span><b class="num">${u.k0(ms.length ? ano / ms.length : 0)}</b></div></div></section>
      <section class="sec"><div class="sec-h"><h2>Mês a mês</h2></div><div class="panel"><div class="chart" id="chFonte" data-fonte="${nome}"></div></div></section>
      <section class="sec"><div class="sec-h"><h2>Entradas do mês</h2></div><div class="panel" style="padding:6px 10px">${doMes.map(linhaL).join('') || vazio(c.icone(nome), 'Nada neste mês.')}</div></section>`;
  };
  REL.darzan = relFonte('Darzan Produções');
  REL.jpl = relFonte('JPL SOM');
  DEPOIS.fin = () => {
    if (ui.fseg === 'relatorios' && ui.rseg === 'ano') { const ms = c.mesesPassados().concat(c.doMes(u.mes(u.hoje())).length ? [u.mes(u.hoje())] : []); colunas('chAno', ms.map(m => { const r = c.resumo(m); return { l: u.CURTO[+m.slice(5) - 1], parts: Object.entries(c.FONTES).map(([k, v]) => ({ k, v: r.fonte[k], c: v })), line: { k: 'Saiu', v: r.saiu } }; })); }
    const el = $('chFonte'); if (el) { const nome = el.dataset.fonte, ms = c.mesesPassados().concat([u.mes(u.hoje())]); colunas('chFonte', ms.map(m => ({ l: u.CURTO[+m.slice(5) - 1], parts: [{ k: nome, v: c.resumo(m).fonte[nome], c: c.FONTES[nome] }] }))); }
    const b = $('busca'); if (b) b.addEventListener('input', () => { ui.q = b.value; const pos = b.selectionStart; render(false); const n = $('busca'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } });
  };

  /* ================= gráfico de colunas ================= */
  function colunas(id, data) {
    const el = $(id); if (!el) return;
    const W = 680, H = 250, pl = 48, pr = 10, pt = 14, pb = 28, iw = W - pl - pr, ih = H - pt - pb;
    const mx = Math.max(...data.map(d => Math.max(u.sum(d.parts, p => p.v), d.line ? d.line.v : 0)), 1);
    const passo = mx > 8000 ? 2000 : mx > 4000 ? 1000 : mx > 1500 ? 500 : 250, top = Math.ceil(mx / passo) * passo, y = v => pt + ih - (v / top) * ih, gap = iw / data.length, bw = Math.min(40, gap * .55);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Colunas por mês">`;
    for (let v = 0; v <= top; v += passo) s += `<line class="gl" x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}"/><text x="${pl - 8}" y="${y(v) + 4}" text-anchor="end">${v >= 1000 ? v / 1000 + ' mil' : v}</text>`;
    data.forEach((d, i) => {
      const cx = pl + gap * i + gap / 2, x = cx - bw / 2; let acc = 0; const ps = d.parts.filter(p => p.v > 0);
      s += `<g class="col" style="animation-delay:${i * .05}s">`;
      ps.forEach((p, j) => { const yy = y(acc + p.v), hh = Math.max((p.v / top) * ih - (j > 0 ? 2 : 0), 0); s += j === ps.length - 1 ? `<path d="M${x},${yy + hh}V${yy + 5}Q${x},${yy} ${x + 5},${yy}H${x + bw - 5}Q${x + bw},${yy} ${x + bw},${yy + 5}V${yy + hh}Z" fill="var(${p.c})"/>` : `<rect x="${x}" y="${yy}" width="${bw}" height="${hh}" fill="var(${p.c})"/>`; acc += p.v; });
      s += '</g>';
      if (d.line) s += `<line x1="${x - 6}" x2="${x + bw + 6}" y1="${y(d.line.v)}" y2="${y(d.line.v)}" stroke="var(--fg)" stroke-width="2.5" stroke-linecap="round"/>`;
      s += `<text x="${cx}" y="${H - 8}" text-anchor="middle">${d.l}</text><rect class="hit" data-i="${i}" x="${pl + gap * i}" y="${pt}" width="${gap}" height="${ih}" rx="8" tabindex="0"/>`;
    });
    el.innerHTML = s + '</svg>';
    const tip = $('tip');
    const mostrar = (e, i) => { const d = data[i]; tip.innerHTML = `<b>${d.l}</b>` + d.parts.filter(p => p.v > 0).map(p => `<div class="r"><span>${p.k}</span><span class="num">${u.k0(p.v)}</span></div>`).join('') + (d.line ? `<div class="r"><span>${d.line.k}</span><span class="num">${u.k0(d.line.v)}</span></div>` : ''); tip.hidden = false; const r = e.target.getBoundingClientRect(), tw = tip.offsetWidth; tip.style.left = Math.max(8, Math.min(r.left + r.width / 2 - tw / 2, innerWidth - tw - 8)) + 'px'; tip.style.top = Math.max(8, r.top + 8) + 'px'; };
    el.querySelectorAll('.hit').forEach(h => { const i = +h.dataset.i; ['mouseenter', 'focus', 'click'].forEach(ev => h.addEventListener(ev, e => mostrar(e, i))); ['mouseleave', 'blur'].forEach(ev => h.addEventListener(ev, () => tip.hidden = true)); });
  }

  /* ================= folha (formulários) ================= */
  let aoEnviar = null;
  function abrir(html, enviar, largo) { const f = $('s2'); f.className = 'sheet f2' + (largo ? ' wide' : ''); f.innerHTML = `<div class="grab"></div><button type="button" class="x2" data-a="fechar" aria-label="Fechar">${u.svg('x')}</button>` + html; aoEnviar = enviar; $('scrim2').hidden = false; f.scrollTop = 0; }
  function fechar() { $('scrim2').hidden = true; aoEnviar = null; }
  const val = id => { const e = $(id); return e ? e.value : ''; };
  const opts = (lista, atual) => lista.map(x => { const [v, n] = Array.isArray(x) ? x : [x, x]; return `<option value="${u.esc(v)}" ${String(v) === String(atual) ? 'selected' : ''}>${u.esc(n)}</option>`; }).join('');
  const campo = (rot, html) => `<label class="fl">${rot}</label>${html}`;

  /* ---------- lançamento ---------- */
  function formLanc(tipo, l) {
    const ed = !!l, hoje = u.hoje();
    tipo = l ? (l.grupo === 'Renda' ? 'entrada' : l.grupo === 'Guardado' ? 'guardar' : l.grupo === 'Transferência' ? 'transf' : 'saida') : tipo;
    const catsSaida = c.listaCats().filter(k => !['Renda', 'Guardado', 'Transferência'].includes(c.grupoDe(k)));
    const catsEntrada = c.listaCats().filter(k => c.grupoDe(k) === 'Renda');
    const cats = tipo === 'entrada' ? catsEntrada : catsSaida;
    const cat0 = l ? l.cat : tipo === 'entrada' ? 'Darzan Produções' : cats[0];
    const forma0 = l ? l.tipo : 'conta';
    const bancosConta = c.BANCOS, cartoes = c.cartoes().map(k => k['CARTÃO']);
    const compra = l && (l.obs.match(/Compra (P[\w-]+)/) || [])[1];
    const titulo = { saida: 'Gastei', entrada: 'Recebi', guardar: 'Guardei', transf: 'Transferência' }[tipo];
    abrir(`<h3 style="margin:0 0 12px">${ed ? 'Editar lançamento' : titulo}</h3>
      ${ed ? '' : `<div class="seg" style="margin:0 0 16px;display:grid;grid-template-columns:repeat(3,1fr);width:100%">${[['saida', 'Gastei'], ['entrada', 'Recebi'], ['guardar', 'Guardei']].map(([k, n]) => `<button type="button" data-a="trocaTipo" data-v="${k}" aria-pressed="${tipo === k}">${n}</button>`).join('')}</div>`}
      <label class="amount" for="fV"><span>R$</span><input id="fV" class="num" inputmode="decimal" placeholder="0,00" value="${l ? String(Math.abs(l.valor).toFixed(2)).replace('.', ',') : ''}" aria-label="Valor" required></label>
      ${campo('O que foi', `<input class="txt" id="fD" value="${u.esc(l ? l.desc : '')}" placeholder="${tipo === 'entrada' ? 'Ex.: Ana - casamento, JPL SOM 2 dias' : 'Ex.: gasolina, mercado'}" required>`)}
      <div class="grid2">${campo('Data', `<input class="txt" id="fDt" type="date" value="${l ? l.data : hoje}">`)}${tipo === 'saida' && !ed ? campo('Como pagou', `<select class="txt" id="fF">${opts([['conta', 'Pix / débito'], ['cartão', 'Cartão de crédito']], forma0)}</select>`) : campo('Banco', `<select class="txt" id="fB">${opts(l && l.tipo === 'cartão' ? cartoes : bancosConta, l ? l.banco : 'Nubank')}</select>`)}</div>
      ${tipo === 'saida' && !ed ? `<div class="grid2" id="linhaBanco">${campo('Banco', `<select class="txt" id="fB">${opts(bancosConta, 'Nubank')}</select>`)}<div id="boxParc" hidden>${campo('Parcelas', `<select class="txt" id="fP">${opts(Array.from({ length: 24 }, (_, i) => [i + 1, i ? i + 1 + 'x' : 'À vista']), 1)}</select>`)}</div></div><p class="aviso" id="avisoCartao" hidden></p>` : ''}
      ${tipo === 'guardar' ? campo('Para onde foi', `<select class="txt" id="fX">${opts(c.caixinhas().map(x => [x['CONTA'], `${x['CONTA']} (${x['BANCO']})`]).concat([['', 'Outro lugar']]), l ? (l.obs.match(/Para (.+)/) || [])[1] : '')}</select>`) : ''}
      ${tipo === 'saida' || tipo === 'entrada' ? `<div class="grid2">${campo(tipo === 'entrada' ? 'De onde veio' : 'Categoria', `<select class="txt" id="fC">${opts(cats, cat0)}</select>`)}${campo('Sub-categoria', `<select class="txt" id="fS">${opts(c.subsDe(cat0), l ? l.sub : '')}</select>`)}</div>` : ''}
      ${tipo === 'saida' ? campo('Grupo', `<div class="rchips"><input type="radio" name="fG" id="fG1" value="Necessidades" ${(l ? l.grupo : c.grupoDe(cat0)) === 'Necessidades' ? 'checked' : ''}><label for="fG1">Necessidade</label><input type="radio" name="fG" id="fG2" value="Desejos" ${(l ? l.grupo : c.grupoDe(cat0)) !== 'Necessidades' ? 'checked' : ''}><label for="fG2">Desejo</label></div>`) : ''}
      <div class="checkline"><input type="checkbox" id="fPrev" ${l && l.status === 'Previsto' ? 'checked' : ''}><label for="fPrev">${tipo === 'entrada' ? 'Ainda não recebi (previsto)' : 'Ainda não paguei (previsto)'}</label></div>
      ${campo('Anotação', `<input class="txt" id="fO" value="${u.esc(l ? l.obs.replace(/Compra P[\w-]+\s*·?\s*/, '').replace(/^Para .+$/, '') : '')}" placeholder="opcional">`)}
      ${compra ? `<p class="aviso">Esta é a parcela <b>${u.esc(l.parcela)}</b> de uma compra parcelada. Salvar muda só esta parcela.</p>` : ''}
      ${ed ? `<div class="acoes"><button type="button" class="btn2 perigo" data-a="apagarL" data-id="${l.id}">${u.svg('trash-2')}Excluir</button><button class="save" type="submit">Salvar</button></div>${compra ? `<button type="button" class="btn2 perigo" data-a="apagarCompra" data-id="${compra}" style="width:100%;margin-top:10px">${u.svg('trash-2')}Excluir a compra inteira (todas as parcelas)</button>` : ''}` : '<button class="save" type="submit">Salvar</button>'}`,
      () => salvarLanc(tipo, l));
    ligarForm(tipo);
  }
  function ligarForm(tipo) {
    const fC = $('fC'), fS = $('fS'), fF = $('fF');
    if (fC) fC.addEventListener('change', () => { fS.innerHTML = opts(c.subsDe(fC.value), ''); const g = c.grupoDe(fC.value); const r = document.querySelector(`input[name=fG][value="${g === 'Necessidades' ? 'Necessidades' : 'Desejos'}"]`); if (r) r.checked = true; });
    const atualizaCartao = () => {
      if (!fF) return;
      const cart = fF.value === 'cartão', fB = $('fB');
      const atual = fB.value;
      fB.innerHTML = opts(cart ? c.cartoes().map(k => k['CARTÃO']) : c.BANCOS, cart ? (c.cartao(atual) ? atual : (c.cartoes()[0] || {})['CARTÃO']) : 'Nubank');
      $('boxParc').hidden = !cart;
      avisoFatura();
    };
    const avisoFatura = () => {
      const av = $('avisoCartao'); if (!av) return;
      if (!fF || fF.value !== 'cartão') { av.hidden = true; return; }
      const nome = val('fB'), d = val('fDt') || u.hoje(), n = +val('fP') || 1, fm = c.faturaDe(d, nome), v = u.num(val('fV'));
      av.hidden = false;
      av.innerHTML = `Não pesa no mês da compra: ${n > 1 ? `as ${n} parcelas${v ? ` de ${u.brl(v / n)}` : ''} entram` : 'entra'} na fatura de <b>${u.nomeMes(fm).toLowerCase()}</b>${n > 1 ? ` até <b>${u.nomeMes(u.addMes(fm, n - 1)).toLowerCase()}</b>` : ''} do ${u.esc(nome)}.`;
    };
    if (fF) { fF.addEventListener('change', atualizaCartao); ['fB', 'fDt', 'fP', 'fV'].forEach(id => { const e = $(id); if (e) e.addEventListener('input', avisoFatura); if (e) e.addEventListener('change', avisoFatura); }); }
  }
  /* cria as linhas de uma compra no cartão (uma por fatura) e o registro da aba PARCELADOS */
  function opsCompraCartao(o) {
    const n = Math.max(1, o.parcelas || 1), fm = c.faturaDe(o.data, o.cartao), dia = +o.data.slice(8, 10), pid = db.novoId('PARCELADOS');
    const parcela = u.r2(o.valor / n), ops = [], m0 = u.mes(u.hoje());
    for (let k = 1; k <= n; k++) {
      const mm = u.addMes(fm, k - 1), v = k === n ? u.r2(o.valor - parcela * (n - 1)) : parcela;
      ops.push({ op: 'salvar', aba: 'EXTRATO', registro: { 'DATA': u.dataNoMes(mm, dia), 'BANCO': o.cartao, 'DESCRIÇÃO': o.desc, 'GRUPO': o.grupo, 'TIPO': 'cartão', 'VALOR': -v, 'CATEGORIA': o.cat, 'SUB-CATEGORIA': o.sub, 'STATUS': mm <= m0 ? 'Pago' : 'Previsto', 'PARCELA': n > 1 ? `${k}/${n}` : '', 'OBS': `Compra ${pid} · feita em ${u.ddmmaa(o.data)}${o.obs ? ' · ' + o.obs : ''}` } });
    }
    ops.unshift({ op: 'salvar', aba: 'PARCELADOS', registro: { ID: pid, 'DATA DA COMPRA': o.data, 'DESCRIÇÃO': o.desc, 'CARTÃO': o.cartao, 'VALOR TOTAL': u.r2(o.valor), 'PARCELAS': n, 'VALOR DA PARCELA': parcela, '1ª PARCELA': `${u.cap(u.CURTO[+fm.slice(5) - 1])}/${fm.slice(2, 4)}`, 'CATEGORIA': o.cat, 'SUB-CATEGORIA': o.sub } });
    return { ops, pid };
  }
  function salvarLanc(tipo, l) {
    const v = u.num(val('fV'));
    if (!(v > 0)) { toast('Digite um valor, por exemplo 25,90'); return false; }
    const desc = val('fD').trim() || ({ saida: 'Gasto', entrada: 'Recebimento', guardar: 'Guardado' }[tipo]);
    const data = val('fDt') || u.hoje(), prev = $('fPrev').checked, obs = val('fO').trim();
    const transf = tipo === 'transf' && l; /* pagamento de fatura e outras transferências: só muda valor, data, banco e anotação */
    const grupo = transf ? l.grupo : tipo === 'entrada' ? 'Renda' : tipo === 'guardar' ? 'Guardado' : (document.querySelector('input[name=fG]:checked') || {}).value || 'Desejos';
    const cat = transf ? l.cat : tipo === 'guardar' ? 'Guardado' : val('fC'), sub = transf ? l.sub : tipo === 'guardar' ? (val('fX') ? 'Caixinha' : 'Reserva') : val('fS');
    const status = prev ? 'Previsto' : 'Pago';
    const obsFinal = transf ? l.obs : [tipo === 'guardar' && val('fX') ? `Para ${val('fX')}` : '', l && (l.obs.match(/Compra P[\w-]+/) || [])[0], obs].filter(Boolean).join(' · ');
    if (l) {
      db.salvar('EXTRATO', { ID: l.id, 'DATA': data, 'BANCO': val('fB') || l.banco, 'DESCRIÇÃO': desc, 'GRUPO': grupo, 'VALOR': grupo === 'Renda' ? v : -v, 'CATEGORIA': cat, 'SUB-CATEGORIA': sub, 'STATUS': status, 'OBS': obsFinal });
      fechar(); render(false); toast('Lançamento atualizado');
      return;
    }
    if (tipo === 'saida' && val('fF') === 'cartão') {
      const { ops } = opsCompraCartao({ data, cartao: val('fB'), valor: v, parcelas: +val('fP') || 1, desc, grupo, cat, sub, obs });
      db.lote(ops); fechar(); render(false);
      toast(`Compra lançada na fatura de ${u.nomeMes(u.mes(ops[1].registro['DATA'])).toLowerCase()}`);
      return;
    }
    db.salvar('EXTRATO', { 'DATA': data, 'BANCO': val('fB'), 'DESCRIÇÃO': desc, 'GRUPO': grupo, 'TIPO': 'conta', 'VALOR': grupo === 'Renda' ? v : -v, 'CATEGORIA': cat, 'SUB-CATEGORIA': sub, 'STATUS': status, 'PARCELA': '', 'OBS': obsFinal });
    fechar(); render(false);
    if (u.mes(data) !== ui.mes) toast(`Lançado em ${u.nomeMes(u.mes(data)).toLowerCase()}`); else toast('Lançamento salvo');
    if (tipo === 'guardar') confete(innerWidth / 2, 160);
  }
  function apagarLanc(id, botao) {
    if (botao.dataset.certeza !== '1') { botao.dataset.certeza = '1'; botao.innerHTML = u.svg('trash-2') + 'Toque de novo para excluir'; return; }
    const r = db.achar('EXTRATO', id), copia = Object.assign({}, r);
    db.apagar('EXTRATO', id); fechar(); render(false);
    toast('Lançamento excluído', () => { db.salvar('EXTRATO', copia); render(false); });
  }
  function apagarCompra(pid, botao) {
    const linhas = c.linhasDaCompra(pid);
    if (botao.dataset.certeza !== '1') { botao.dataset.certeza = '1'; botao.innerHTML = u.svg('trash-2') + `Toque de novo: apaga ${linhas.length} parcelas`; return; }
    const ops = linhas.map(l => ({ op: 'apagar', aba: 'EXTRATO', id: l.id }));
    if (db.achar('PARCELADOS', pid)) ops.push({ op: 'apagar', aba: 'PARCELADOS', id: pid });
    db.lote(ops); fechar(); render(false); toast(`Compra excluída (${linhas.length} parcelas)`);
  }

  /* ---------- equipamento ---------- */
  let fotoNova = null;
  function formEquip(e) {
    const ed = !!e, f = e ? c.fotoEquip(e) : null, pid = e && c.compraDo(e), lid = e && c.lancDo(e);
    const vinc = pid ? c.linhasDaCompra(pid) : lid ? c.lancs().filter(l => l.id === lid) : [];
    fotoNova = null;
    const notas = e ? String(e['OBS'] || '').replace(/(Compra P[\w-]+|Lançamento L[\w-]+)\s*·?\s*/g, '').trim() : '';
    abrir(`<h3 style="margin:0 0 12px">${ed ? 'Editar equipamento' : 'Novo equipamento'}</h3>
      <div class="fotoedit"><div class="ph" id="fotoPrev">${f ? `<img src="${f}" alt="">` : u.svg('camera')}</div><div><label class="btn2">${u.svg('camera')}${f ? 'Trocar foto' : 'Pôr foto'}<input type="file" accept="image/*" id="fFoto"></label><p class="c-muted" style="font-size:.78rem;margin:8px 0 0">No celular, dá para tirar a foto na hora.</p></div></div>
      ${campo('Nome', `<input class="txt" id="eN" required value="${u.esc(e ? e['NOME'] : '')}" placeholder="Ex.: Rode Wireless GO II">`)}
      <div class="grid2">${campo('Tipo', `<select class="txt" id="eT">${opts(TIPOS_EQ, e ? e['TIPO'] : 'Câmera')}</select>`)}${campo('Valor', `<input class="txt num" id="eV" inputmode="decimal" value="${e ? String(c.num(e['VALOR']).toFixed(2)).replace('.', ',') : ''}" placeholder="R$ 0,00" required>`)}</div>
      <div class="grid2">${campo('Data da compra', `<input class="txt" id="eD" type="date" value="${e ? String(e['DATA DA COMPRA'] || '') : u.hoje()}">`)}${campo('Estado', `<select class="txt" id="eE">${opts(['Novo', 'Semi-novo', 'Usado', 'Na manutenção', 'Vendido'], e ? e['ESTADO'] : 'Novo')}</select>`)}</div>
      ${ed ? '' : campo('Como entrou', `<div class="rchips">${[['catalogo', 'Já tinha'], ['vista', 'Paguei à vista'], ['cartao', 'No cartão']].map(([k, n], i) => `<input type="radio" name="eF" id="eF${i}" value="${k}" ${i === 0 ? 'checked' : ''}><label for="eF${i}">${n}</label>`).join('')}</div>
        <div class="grid2" id="eLinha" hidden><div>${campo('Banco / cartão', `<select class="txt" id="eB"></select>`)}</div><div id="eParcBox">${campo('Parcelas', `<select class="txt" id="eP">${opts(Array.from({ length: 24 }, (_, i) => [i + 1, i ? i + 1 + 'x' : 'À vista']), 1)}</select>`)}</div></div><p class="aviso" id="eAviso">“Já tinha” só cataloga: não mexe no dinheiro de nenhum mês.</p>`)}
      ${campo('Nº de série', `<input class="txt" id="eS" value="${u.esc(e ? e['Nº DE SÉRIE'] || '' : '')}" placeholder="opcional">`)}
      ${campo('Anotações', `<input class="txt" id="eO" value="${u.esc(notas)}" placeholder="opcional">`)}
      ${ed && vinc.length ? `<p class="aviso">Ligado a ${pid ? `uma compra no cartão: <b>${vinc.length} parcelas</b> (${u.brl(-u.sum(vinc))})` : `um lançamento de <b>${u.brl(-u.sum(vinc))}</b> em ${u.nomeMes(u.mes(vinc[0].data)).toLowerCase()}`}. Se mudar o valor, as parcelas acompanham.</p>` : ''}
      ${ed ? `<div class="checkline" id="eApagarJunto" ${vinc.length ? '' : 'hidden'}><input type="checkbox" id="eJunto" checked><label for="eJunto">Ao excluir, apagar também ${pid ? `as ${vinc.length} parcelas no cartão` : 'o lançamento ligado'} (${u.brl(-u.sum(vinc))})</label></div>
        <div class="acoes"><button type="button" class="btn2 perigo" data-a="apagarE" data-id="${e.ID}">${u.svg('trash-2')}Excluir</button><button class="save" type="submit">Salvar</button></div>` : '<button class="save" type="submit">Cadastrar</button>'}`,
      () => salvarEquip(e), true);
    $('fFoto').addEventListener('change', ev => { const arq = ev.target.files[0]; if (arq) reduzirFoto(arq).then(url => { fotoNova = url; $('fotoPrev').innerHTML = `<img src="${url}" alt="">`; }).catch(() => toast('Não consegui ler essa foto')); });
    document.querySelectorAll('input[name=eF]').forEach(r => r.addEventListener('change', () => {
      const k = document.querySelector('input[name=eF]:checked').value;
      $('eLinha').hidden = k === 'catalogo';
      $('eParcBox').hidden = k !== 'cartao';
      $('eB').innerHTML = opts(k === 'cartao' ? c.cartoes().map(x => x['CARTÃO']) : c.BANCOS, k === 'cartao' ? '' : 'Nubank');
      $('eAviso').innerHTML = k === 'catalogo' ? '“Já tinha” só cataloga: não mexe no dinheiro de nenhum mês.' : k === 'vista' ? 'Sai do banco na data da compra.' : 'Não pesa no mês da compra: as parcelas entram nas próximas faturas do cartão.';
    }));
  }
  /* foto pequena (até 420px) para caber na célula da planilha */
  function reduzirFoto(arq) {
    return new Promise((ok, erro) => {
      const rd = new FileReader();
      rd.onerror = erro;
      rd.onload = () => { const img = new Image(); img.onerror = erro; img.onload = () => { const s = Math.min(1, 420 / Math.max(img.width, img.height)), cv = document.createElement('canvas'); cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); let q = .72, url = cv.toDataURL('image/jpeg', q); while (url.length > 45000 && q > .3) { q -= .1; url = cv.toDataURL('image/jpeg', q); } ok(url); }; img.src = rd.result; };
      rd.readAsDataURL(arq);
    });
  }
  function salvarEquip(e) {
    const nome = val('eN').trim(), v = u.num(val('eV'));
    if (!nome) { toast('Dê um nome para o equipamento'); return false; }
    const base = { 'NOME': nome, 'TIPO': val('eT'), 'VALOR': u.r2(v), 'DATA DA COMPRA': val('eD'), 'ESTADO': val('eE'), 'Nº DE SÉRIE': val('eS') };
    if (fotoNova) base['FOTO'] = fotoNova;
    const notas = val('eO').trim();
    if (e) {
      const pid = c.compraDo(e), lid = c.lancDo(e), ops = [];
      base['OBS'] = [pid ? 'Compra ' + pid : '', lid ? 'Lançamento ' + lid : '', notas].filter(Boolean).join(' · ');
      ops.push({ op: 'salvar', aba: 'EQUIPAMENTOS', registro: Object.assign({ ID: e.ID }, base) });
      if (u.r2(c.num(e['VALOR'])) !== u.r2(v)) {
        if (pid) { const ls = c.linhasDaCompra(pid), n = ls.length || 1, p = u.r2(v / n); ls.sort((a, b) => a.data < b.data ? -1 : 1).forEach((l, i) => ops.push({ op: 'salvar', aba: 'EXTRATO', registro: { ID: l.id, 'VALOR': -(i === n - 1 ? u.r2(v - p * (n - 1)) : p) } })); if (db.achar('PARCELADOS', pid)) ops.push({ op: 'salvar', aba: 'PARCELADOS', registro: { ID: pid, 'VALOR TOTAL': u.r2(v), 'VALOR DA PARCELA': p } }); }
        if (lid && db.achar('EXTRATO', lid)) ops.push({ op: 'salvar', aba: 'EXTRATO', registro: { ID: lid, 'VALOR': -u.r2(v) } });
      }
      db.lote(ops); fechar(); render(false); toast('Equipamento atualizado');
      return;
    }
    const forma = (document.querySelector('input[name=eF]:checked') || {}).value || 'catalogo', ops = [];
    let ligacao = '';
    if (forma === 'vista') {
      const id = db.novoId('EXTRATO');
      ops.push({ op: 'salvar', aba: 'EXTRATO', registro: { ID: id, 'DATA': base['DATA DA COMPRA'] || u.hoje(), 'BANCO': val('eB'), 'DESCRIÇÃO': nome, 'GRUPO': 'Necessidades', 'TIPO': 'conta', 'VALOR': -u.r2(v), 'CATEGORIA': 'Trabalho', 'SUB-CATEGORIA': 'Equipamentos', 'STATUS': 'Pago', 'PARCELA': '', 'OBS': 'Equipamento' } });
      ligacao = 'Lançamento ' + id; base['COMO PAGOU'] = 'À vista · ' + val('eB');
    }
    if (forma === 'cartao') {
      const r = opsCompraCartao({ data: base['DATA DA COMPRA'] || u.hoje(), cartao: val('eB'), valor: v, parcelas: +val('eP') || 1, desc: nome, grupo: 'Necessidades', cat: 'Trabalho', sub: 'Equipamentos', obs: '' });
      ops.push(...r.ops); ligacao = 'Compra ' + r.pid; base['COMO PAGOU'] = `${+val('eP') || 1}x no ${val('eB')}`;
    }
    if (forma === 'catalogo') base['COMO PAGOU'] = 'Já tinha';
    base['OBS'] = [ligacao, notas].filter(Boolean).join(' · ');
    ops.push({ op: 'salvar', aba: 'EQUIPAMENTOS', registro: base });
    db.lote(ops); fechar(); ui.view = 'equip'; render(); toast('Equipamento cadastrado');
  }
  function apagarEquip(id, botao) {
    if (botao.dataset.certeza !== '1') { botao.dataset.certeza = '1'; botao.innerHTML = u.svg('trash-2') + 'Toque de novo para excluir'; return; }
    const e = db.achar('EQUIPAMENTOS', id), junto = $('eJunto') && $('eJunto').checked, ops = [{ op: 'apagar', aba: 'EQUIPAMENTOS', id }];
    if (junto) {
      const pid = c.compraDo(e), lid = c.lancDo(e);
      if (pid) { c.linhasDaCompra(pid).forEach(l => ops.push({ op: 'apagar', aba: 'EXTRATO', id: l.id })); if (db.achar('PARCELADOS', pid)) ops.push({ op: 'apagar', aba: 'PARCELADOS', id: pid }); }
      if (lid && db.achar('EXTRATO', lid)) ops.push({ op: 'apagar', aba: 'EXTRATO', id: lid });
    }
    db.lote(ops); fechar(); render(false); toast(junto && ops.length > 1 ? `Equipamento e ${ops.length - 1} lançamento(s) excluídos` : 'Equipamento excluído');
  }

  /* ---------- trabalhos ---------- */
  function formJob(j) {
    const ed = !!j, recs = j ? c.recebimentos(j) : [];
    const SUBJ = { 'Casamento': 'Casamento', 'Social media': 'Social media', 'Palestra': 'Palestra', '15 anos': 'Evento', 'Aniversário': 'Evento', 'Corporativo': 'Evento', 'Evento': 'Evento' };
    abrir(`<h3 style="margin:0 0 12px">${ed ? u.esc(j['CLIENTE']) : 'Novo trabalho'}</h3>
      ${campo('Cliente ou casal', `<input class="txt" id="jC" required value="${u.esc(j ? j['CLIENTE'] : '')}" placeholder="Ex.: Ana e Pedro">`)}
      <div class="grid2">${campo('Tipo de evento', `<select class="txt" id="jT">${opts(Object.keys(TIPOEV), j ? j['TIPO DE EVENTO'] : 'Casamento')}</select>`)}${campo('Etapa', `<select class="txt" id="jE">${opts(ETAPAS.map(x => x[0]), j ? j['ETAPA'] || 'Orçamento' : 'Orçamento')}</select>`)}</div>
      <div class="grid2">${campo('Data do evento', `<input class="txt" id="jD" type="date" value="${j ? String(j['DATA DO EVENTO'] || '') : ''}">`)}${campo('Entrega', `<input class="txt" id="jEn" type="date" value="${j ? String(j['ENTREGA'] || '') : ''}">`)}</div>
      <div class="grid2">${campo('Valor total', `<input class="txt num" id="jV" inputmode="decimal" value="${j && j['VALOR TOTAL'] !== '' ? String(c.num(j['VALOR TOTAL']).toFixed(2)).replace('.', ',') : ''}" placeholder="R$ 0,00">`)}${campo('Local', `<input class="txt" id="jL" value="${u.esc(j ? j['LOCAL'] || '' : '')}">`)}</div>
      ${campo('O que foi fechado', `<input class="txt" id="jF" value="${u.esc(j ? j['O QUE FOI FECHADO'] || '' : '')}" placeholder="Ex.: Teaser + filme completo + 10 reels">`)}
      <div class="grid2">${campo('WhatsApp', `<input class="txt" id="jW" inputmode="tel" value="${u.esc(j ? j['TELEFONE'] || '' : '')}" placeholder="(19) 9…">`)}${campo('Contrato (link)', `<input class="txt" id="jK" value="${u.esc(j ? j['CONTRATO'] || '' : '')}" placeholder="link do PDF no Drive">`)}</div>
      ${campo('Anotações', `<textarea class="txt" id="jO">${u.esc(j ? j['OBS'] || '' : '')}</textarea>`)}
      ${ed ? `<div class="jsec"><h4>Recebimentos · ${u.brl(c.recebido(j))}${c.num(j['VALOR TOTAL']) ? ` de ${u.brl(c.num(j['VALOR TOTAL']))}` : ''}</h4>${recs.map(linhaL).join('') || '<p class="c-muted" style="font-size:.86rem">Nada recebido ainda.</p>'}
        <div class="panel" style="margin-top:10px;padding:12px"><b style="font-size:.9rem">Registrar recebimento</b><div class="grid2" style="margin-top:8px"><input class="txt num" id="rV" inputmode="decimal" placeholder="R$ 0,00" aria-label="Valor recebido"><select class="txt" id="rB" aria-label="Banco">${opts(c.BANCOS, 'PicPay')}</select></div><div class="grid2" style="margin-top:8px"><input class="txt" id="rD" placeholder="Ex.: sinal, restante" aria-label="Descrição"><input class="txt" id="rDt" type="date" value="${u.hoje()}" aria-label="Data"></div><button type="button" class="btn2 pri" data-a="receber" data-id="${j.ID}" data-sub="${SUBJ[j['TIPO DE EVENTO']] || 'Outros'}" style="width:100%;margin-top:10px">${u.svg('plus')}Registrar</button></div></div>
        <div class="acoes"><button type="button" class="btn2 perigo" data-a="apagarJ" data-id="${j.ID}">${u.svg('trash-2')}Excluir</button><button class="save" type="submit">Salvar</button></div>` : '<button class="save" type="submit">Criar trabalho</button>'}`,
      () => {
        const nome = val('jC').trim(); if (!nome) { toast('Coloque o nome do cliente'); return false; }
        db.salvar('TRABALHOS', Object.assign(j ? { ID: j.ID } : {}, { 'CLIENTE': nome, 'TIPO DE EVENTO': val('jT'), 'ETAPA': val('jE'), 'DATA DO EVENTO': val('jD'), 'ENTREGA': val('jEn'), 'VALOR TOTAL': val('jV') ? u.r2(u.num(val('jV'))) : '', 'LOCAL': val('jL'), 'O QUE FOI FECHADO': val('jF'), 'TELEFONE': val('jW'), 'CONTRATO': val('jK'), 'OBS': val('jO') }));
        fechar(); render(false); toast(j ? 'Trabalho atualizado' : 'Trabalho criado');
      }, true);
  }
  function receber(id, sub) {
    const j = db.achar('TRABALHOS', id), v = u.num(val('rV'));
    if (!(v > 0)) { toast('Digite o valor recebido'); return; }
    db.salvar('EXTRATO', { 'DATA': val('rDt') || u.hoje(), 'BANCO': val('rB'), 'DESCRIÇÃO': `${j['CLIENTE']} - ${val('rD').trim() || 'pagamento'}`, 'GRUPO': 'Renda', 'TIPO': 'conta', 'VALOR': u.r2(v), 'CATEGORIA': 'Darzan Produções', 'SUB-CATEGORIA': sub, 'STATUS': 'Pago', 'PARCELA': '', 'OBS': 'Recebido pelo app' });
    confete(innerWidth / 2, 200); formJob(j); render(false); toast(`Recebido ${u.brl(v)} de ${j['CLIENTE']}`);
  }

  /* ---------- tarefas ---------- */
  function alternarTarefa(id, botao) {
    const t = c.tarefas().find(x => x.id === id); if (!t) return;
    const [tipo, a, b] = id.split(':');
    const lv0 = c.nivel(c.xp()).n;
    if (tipo === 'l') {
      const l = db.achar('EXTRATO', a), obs = String(l['OBS'] || '').replace(/\s*·?\s*(Pago|Recebido) pelo app/g, '');
      db.salvar('EXTRATO', { ID: a, 'STATUS': t.feita ? 'Previsto' : 'Pago', 'OBS': t.feita ? obs : [obs, t.grupo === 'receber' ? 'Recebido pelo app' : 'Pago pelo app'].filter(Boolean).join(' · ') });
    } else if (tipo === 'f') {
      const pg = c.pagFatura(a, b);
      if (pg) db.apagar('EXTRATO', pg.id);
      else db.salvar('EXTRATO', { 'DATA': u.hoje(), 'BANCO': c.contaQuePaga(a), 'DESCRIÇÃO': `Pagamento fatura ${a} (${u.nomeMes(b).toLowerCase()})`, 'GRUPO': 'Transferência', 'TIPO': 'conta', 'VALOR': -t.valor, 'CATEGORIA': 'Transferência', 'SUB-CATEGORIA': 'Pagamento de fatura', 'STATUS': 'Pago', 'PARCELA': '', 'OBS': `Fatura ${a} ${b}` });
    } else {
      db.salvar('TAREFAS', { ID: a, 'FEITA': !t.feita });
    }
    if (!t.feita && botao) { const r = botao.getBoundingClientRect(); confete(r.left + r.width / 2, r.top + r.height / 2); xpVoa(r.left + r.width / 2, r.top - 6, t.xp); }
    setTimeout(() => { render(false); const lv = c.nivel(c.xp()); if (lv.n > lv0) toast(`Subiu para o nível ${lv.n}: ${lv.nome}!`); }, t.feita ? 0 : 350);
    if (!t.feita) toast(`Feito: ${t.titulo}`, () => { alternarTarefa(id); });
  }
  function formTarefa(t) {
    const ed = !!t;
    abrir(`<h3 style="margin:0 0 12px">${ed ? 'Editar tarefa' : 'Nova tarefa'}</h3>
      ${campo('O que precisa fazer', `<input class="txt" id="tT" required value="${u.esc(t ? t['TAREFA'] : '')}" placeholder="Ex.: pagar o Igor, mandar orçamento">`)}
      <div class="grid2">${campo('Quando', `<input class="txt" id="tD" type="date" value="${t ? String(t['DATA'] || '') : u.hoje()}">`)}${campo('Valor (se tiver)', `<input class="txt num" id="tV" inputmode="decimal" value="${t && t['VALOR'] !== '' ? String(c.num(t['VALOR']).toFixed(2)).replace('.', ',') : ''}" placeholder="R$ 0,00">`)}</div>
      ${campo('Tipo', `<select class="txt" id="tY">${opts(['Conta', 'Darzan', 'Pessoal'], t ? t['TIPO'] : 'Pessoal')}</select>`)}
      ${campo('Anotação', `<input class="txt" id="tO" value="${u.esc(t ? t['OBS'] || '' : '')}">`)}
      ${ed ? `<div class="acoes"><button type="button" class="btn2 perigo" data-a="apagarT" data-id="${t.ID}">${u.svg('trash-2')}Excluir</button><button class="save" type="submit">Salvar</button></div>` : '<button class="save" type="submit">Criar tarefa</button>'}`,
      () => { const n = val('tT').trim(); if (!n) return false; db.salvar('TAREFAS', Object.assign(t ? { ID: t.ID } : { 'FEITA': false }, { 'TAREFA': n, 'DATA': val('tD'), 'VALOR': val('tV') ? u.r2(u.num(val('tV'))) : '', 'TIPO': val('tY'), 'OBS': val('tO') })); fechar(); render(false); toast(t ? 'Tarefa atualizada' : 'Tarefa criada'); });
  }

  /* ---------- bancos, cartões, metas ---------- */
  function formConferir(banco) {
    const subs = c.contas().filter(x => x['BANCO'] === banco);
    abrir(`<h3 style="margin:0 0 4px">Conferir ${u.esc(banco)}</h3><p class="c-muted" style="margin:0 0 6px;font-size:.88rem">Abra o app do ${u.esc(banco)} e digite o saldo que aparece lá agora.</p>
      ${subs.map((x, i) => { const v = c.saldo(x); return campo(u.esc(x['CONTA']), `<input class="txt num" id="cf${i}" inputmode="decimal" data-calc="${v == null ? '' : v}" value="${v == null ? '' : String(v.toFixed(2)).replace('.', ',')}" placeholder="R$ 0,00"><div class="diff" id="df${i}">${v == null ? '' : `O app calculou ${u.brl(v)}`}</div>`); }).join('')}
      <button class="save" type="submit">Salvar conferência</button>`,
      () => {
        let aj = 0; const ops = [];
        subs.forEach((x, i) => { const raw = val('cf' + i).trim(); if (!raw) return; const nv = u.num(raw), old = c.saldo(x); if (old != null) aj += nv - old; ops.push({ op: 'salvar', aba: 'CONTAS', registro: { ID: x.ID, 'SALDO CONFERIDO': u.r2(nv), 'DATA DA CONFERÊNCIA': u.hoje() } }); });
        if (ops.length) db.lote(ops); fechar(); render(false); toast(Math.abs(aj) >= .01 ? `Conferido. Diferença de ${u.brl(aj)} em relação ao que o app tinha.` : `${banco} conferido: bateu certinho.`);
      });
    subs.forEach((x, i) => { const inp = $('cf' + i); inp.addEventListener('input', () => { const calc = inp.dataset.calc, el = $('df' + i); if (calc === '') return; const d = u.num(inp.value) - (+calc); el.innerHTML = Math.abs(d) < .01 ? '<span class="okc">Bateu certinho</span>' : `<span class="oldc">Diferença de ${u.brl(d)}</span>`; }); });
  }
  function formCaixinha(banco) {
    abrir(`<h3 style="margin:0 0 12px">Nova caixinha no ${u.esc(banco)}</h3>${campo('Nome', `<input class="txt" id="xN" required placeholder="Ex.: Caixinha Viagem">`)}<div class="grid2">${campo('Saldo hoje', `<input class="txt num" id="xV" inputmode="decimal" placeholder="R$ 0,00">`)}${campo('Para quê', `<input class="txt" id="xP" placeholder="opcional">`)}</div><button class="save" type="submit">Criar</button>`,
      () => { const n = val('xN').trim(); if (!n) return false; db.salvar('CONTAS', { 'BANCO': banco, 'CONTA': /^caixinha/i.test(n) ? n : 'Caixinha ' + n, 'SALDO CONFERIDO': val('xV') ? u.r2(u.num(val('xV'))) : '', 'DATA DA CONFERÊNCIA': val('xV') ? u.hoje() : '', 'PARA QUÊ': val('xP'), 'OBS': '' }); fechar(); render(false); toast('Caixinha criada'); });
  }
  function formCartao(nome) {
    const k = c.cartao(nome);
    abrir(`<h3 style="margin:0 0 12px">Cartão ${u.esc(nome)}</h3><div class="grid2">${campo('Fecha dia', `<input class="txt num" id="kF" inputmode="numeric" value="${u.esc(k['FECHA DIA'] || '')}">`)}${campo('Vence dia', `<input class="txt num" id="kV" inputmode="numeric" value="${u.esc(k['VENCE DIA'] || '')}" placeholder="ex.: 14">`)}</div><div class="grid2">${campo('Limite', `<input class="txt num" id="kL" inputmode="decimal" value="${k['LIMITE'] !== '' ? String(c.num(k['LIMITE'])) : ''}">`)}${campo('Pago pela conta', `<select class="txt" id="kP">${opts(c.BANCOS.filter(b => b !== 'Não informado').map(b => [b + ' · Conta', b]), String(k['PAGA PELA CONTA'] || nome + ' · Conta'))}</select>`)}</div><button class="save" type="submit">Salvar</button>`,
      () => { db.salvar('CARTOES', { ID: k.ID, 'FECHA DIA': parseInt(val('kF'), 10) || '', 'VENCE DIA': parseInt(val('kV'), 10) || '', 'LIMITE': u.num(val('kL')) || '', 'PAGA PELA CONTA': val('kP') }); fechar(); render(false); toast('Cartão atualizado'); });
  }
  function formMeta(g) {
    abrir(`<h3 style="margin:0 0 12px">${g ? 'Editar meta' : 'Nova meta'}</h3>${campo('Meta', `<input class="txt" id="gN" required value="${u.esc(g ? g['META'] : '')}" placeholder="Ex.: Viagem Chile">`)}<div class="grid2">${campo('Valor alvo', `<input class="txt num" id="gA" inputmode="decimal" value="${g ? String(c.num(g['VALOR ALVO'])) : ''}">`)}${campo('Já guardado', `<input class="txt num" id="gJ" inputmode="decimal" value="${g ? String(c.num(g['JÁ GUARDADO'])) : ''}">`)}</div><div class="grid2">${campo('Onde está', `<select class="txt" id="gO">${opts([['', '—']].concat(c.caixinhas().map(x => [x['CONTA'], x['CONTA']])), g ? g['ONDE ESTÁ'] : '')}</select>`)}${campo('Prazo', `<input class="txt" id="gP" type="date" value="${g ? String(g['PRAZO'] || '') : ''}">`)}</div>
      ${g ? `<div class="acoes"><button type="button" class="btn2 perigo" data-a="apagarM" data-id="${g.ID}">${u.svg('trash-2')}Excluir</button><button class="save" type="submit">Salvar</button></div>` : '<button class="save" type="submit">Criar meta</button>'}`,
      () => { const n = val('gN').trim(); if (!n) return false; db.salvar('METAS', Object.assign(g ? { ID: g.ID } : {}, { 'META': n, 'VALOR ALVO': u.num(val('gA')), 'JÁ GUARDADO': u.num(val('gJ')), 'ONDE ESTÁ': val('gO'), 'PRAZO': val('gP') })); fechar(); render(false); toast('Meta salva'); });
  }
  function apagarSimples(aba, id, botao, msg) {
    if (botao.dataset.certeza !== '1') { botao.dataset.certeza = '1'; botao.innerHTML = u.svg('trash-2') + 'Toque de novo para excluir'; return; }
    const copia = Object.assign({}, db.achar(aba, id));
    db.apagar(aba, id); fechar(); render(false); toast(msg, () => { db.salvar(aba, copia); render(false); });
  }

  /* ================= efeitos ================= */
  function toast(t, desfazer) {
    const el = $('toast'); el.hidden = true; void el.offsetWidth;
    el.innerHTML = `<span>${u.esc(t)}</span>${desfazer ? '<button type="button" class="ub">Desfazer</button>' : ''}`; el.hidden = false;
    if (desfazer) el.querySelector('.ub').onclick = () => { el.hidden = true; desfazer(); };
    clearTimeout(toast.h); toast.h = setTimeout(() => el.hidden = true, desfazer ? 5500 : 3000);
  }
  A.toast = toast;
  const fx = () => $('fx');
  let parts = [], raf = 0;
  function confete(x, y) {
    if (RM) return; const cv = fx(), ctx = cv.getContext('2d'); cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    const cores = ['#ffd36b', '#5fe0a1', '#8fb0ff', '#ff8fb0', '#c4a5ff', '#ffffff'];
    for (let i = 0; i < 70; i++) { const a = Math.random() * Math.PI * 2, v = 4 + Math.random() * 6; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 5, s: 4 + Math.random() * 5, c: cores[i % cores.length], r: Math.random() * 6, vr: (Math.random() - .5) * .4, vida: 1 }); }
    const passo = () => { ctx.clearRect(0, 0, innerWidth, innerHeight); parts.forEach(p => { p.vy += .28; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.vida -= .013; ctx.save(); ctx.globalAlpha = Math.max(p.vida, 0); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * .66); ctx.restore(); }); parts = parts.filter(p => p.vida > 0 && p.y < innerHeight + 20); raf = parts.length ? requestAnimationFrame(passo) : 0; if (!raf) ctx.clearRect(0, 0, innerWidth, innerHeight); };
    if (!raf) raf = requestAnimationFrame(passo);
  }
  function xpVoa(x, y, v) { if (!v) return; const el = document.createElement('div'); el.className = 'xpfly'; el.textContent = `+${v} XP`; el.style.left = x + 'px'; el.style.top = y + 'px'; document.body.appendChild(el); setTimeout(() => el.remove(), 1400); }
  function animar(raiz) {
    if (RM) { raiz.querySelectorAll('.rg').forEach(k => k.style.strokeDashoffset = k.dataset.off); return; }
    let n = 0; raiz.querySelectorAll('#view .hero,#view .panel,#view .gcard,#view .act,#view .inc,#view .tk,#view .goal,#view .eq,#view .kpi,#view .job,#view .bank,#view .tips li,#view .sec-h,#view .bignum,#view .miniplayer').forEach(el => { el.classList.add('rise'); el.style.setProperty('--rd', Math.min(n++ * .035, .7) + 's'); });
    raiz.querySelectorAll('[data-cnt]').forEach(el => { const to = +el.dataset.cnt, fmt = el.dataset.fmt, t0 = performance.now(), f = v => fmt === 'big' ? u.big(v) : fmt === 'k0' ? u.k0(v) : u.brl(v); const passo = t => { const p = Math.min((t - t0) / 900, 1), e = 1 - Math.pow(1 - p, 4); el.innerHTML = f(to * e); if (p < 1) requestAnimationFrame(passo); }; requestAnimationFrame(passo); });
    requestAnimationFrame(() => requestAnimationFrame(() => raiz.querySelectorAll('.rg').forEach(k => { k.style.transition = 'stroke-dashoffset 1.3s cubic-bezier(.2,.8,.2,1)'; k.style.strokeDashoffset = k.dataset.off; })));
  }

  /* ================= navegação ================= */
  const TABS = [['inicio', 'Início', 'house'], ['trabalhos', 'Trabalhos', 'clapperboard'], ['tarefas', 'Tarefas', 'list-checks'], ['equip', 'Equipamentos', 'camera'], ['fin', 'Finanças', 'wallet']];
  function nav() {
    const urg = c.urgentes();
    $('tabbar').innerHTML = TABS.map(([k, n, i]) => k === 'tarefas' ? `<button class="tab mid" type="button" data-a="go" data-v="tarefas" ${ui.view === k ? 'aria-current="page"' : ''}><span class="orb">${u.svg(i)}</span>${urg ? `<span class="cnt">${urg}</span>` : ''}<span>${n}</span></button>` : `<button class="tab" type="button" data-a="go" data-v="${k}" ${ui.view === k ? 'aria-current="page"' : ''}>${u.svg(i)}<span>${n}</span></button>`).join('');
    $('snav').innerHTML = TABS.map(([k, n, i]) => `<button type="button" data-a="go" data-v="${k}" ${ui.view === k ? 'aria-current="page"' : ''}>${u.svg(i)}${n}${k === 'tarefas' && urg ? `<span class="cnt">${urg}</span>` : ''}</button>`).join('') + `<div class="sep"></div><button type="button" data-a="irRel" data-v="mes">${u.svg('chart-column')}Relatórios</button><button type="button" data-a="ocultar">${u.svg(ui.oculto ? 'eye-off' : 'eye')}${ui.oculto ? 'Mostrar valores' : 'Esconder valores'}</button><button type="button" data-a="conta">${u.svg('user')}Sua conta</button>`;
    const lv = c.nivel(c.xp());
    $('sbrand').innerHTML = `<div class="ringw">${anel(lv.atual / lv.prox, 56, 4, '#ffd36b')}${foto()}<span class="lvl">Nv ${lv.n}</span></div><div><b>João Darzan</b><span>${lv.nome}</span></div>`;
    $('fabwrap').hidden = ui.view === 'inicio';
  }
  function render(anim = true) {
    nav();
    const v = $('view');
    v.innerHTML = (R[ui.view] || R.inicio)();
    if (DEPOIS[ui.view]) DEPOIS[ui.view]();
    if (anim) animar(document); else v.querySelectorAll('.rg').forEach(k => k.style.strokeDashoffset = k.dataset.off);
  }
  A.render = render;
  function go(v) { ui.view = v; render(); scrollTo({ top: 0 }); }

  /* ================= cliques ================= */
  const ACOES = {
    go: b => go(b.dataset.v),
    mes: b => { const ms = c.meses(), i = ms.indexOf(ui.mes) + +b.dataset.d; if (ms[i]) { ui.mes = ms[i]; render(); } },
    seg: b => { ui[b.dataset.s] = b.dataset.v; render(b.dataset.s !== 'filtro' && b.dataset.s !== 'tfil'); },
    ocultar: () => { ui.oculto = !ui.oculto; try { localStorage.setItem('df-oculto', ui.oculto ? '1' : '0'); } catch (e) { /* sem armazenamento */ } render(false); },
    irBancos: () => { ui.fseg = 'bancos'; go('fin'); },
    irCartoes: b => { ui.fseg = 'cartoes'; if (b.dataset.v) ui.cartao = b.dataset.v; go('fin'); },
    irExtrato: () => { ui.fseg = 'extrato'; ui.filtro = 'tudo'; go('fin'); },
    irRel: b => { ui.fseg = 'relatorios'; ui.rseg = b.dataset.v || 'mes'; go('fin'); },
    filtroCat: b => { ui.fseg = 'extrato'; ui.filtro = 'cat:' + b.dataset.v; go('fin'); },
    novoL: b => formLanc(b.dataset.t),
    trocaTipo: b => formLanc(b.dataset.v),
    editL: b => { const r = db.achar('EXTRATO', b.dataset.id); if (r) formLanc(null, c.l(r)); },
    apagarL: b => apagarLanc(b.dataset.id, b),
    apagarCompra: b => apagarCompra(b.dataset.id, b),
    novoE: () => formEquip(null),
    editE: b => formEquip(db.achar('EQUIPAMENTOS', b.dataset.id)),
    apagarE: b => apagarEquip(b.dataset.id, b),
    novoJ: () => formJob(null),
    editJ: b => formJob(db.achar('TRABALHOS', b.dataset.id)),
    apagarJ: b => apagarSimples('TRABALHOS', b.dataset.id, b, 'Trabalho excluído'),
    receber: b => receber(b.dataset.id, b.dataset.sub),
    tarefa: b => alternarTarefa(b.dataset.id, b),
    novoT: () => formTarefa(null),
    editT: b => { const [tp, id] = b.dataset.id.split(':'); if (tp === 't') formTarefa(db.achar('TAREFAS', id)); else if (tp === 'l') { const r = db.achar('EXTRATO', id); if (r) formLanc(null, c.l(r)); } else { ui.fseg = 'cartoes'; ui.cartao = id; ui.mes = b.dataset.id.split(':')[2]; go('fin'); } },
    apagarT: b => apagarSimples('TAREFAS', b.dataset.id, b, 'Tarefa excluída'),
    conferir: b => formConferir(b.dataset.v),
    novaCx: b => formCaixinha(b.dataset.v),
    editK: b => formCartao(b.dataset.v),
    novoM: () => formMeta(null),
    editM: b => formMeta(db.achar('METAS', b.dataset.id)),
    apagarM: b => apagarSimples('METAS', b.dataset.id, b, 'Meta excluída'),
    fechar: () => fechar(),
    fab: () => ui.view === 'equip' ? formEquip(null) : ui.view === 'trabalhos' ? formJob(null) : ui.view === 'tarefas' ? formTarefa(null) : formLanc('saida'),
  };
  document.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b || b.disabled) return; const f = ACOES[b.dataset.a]; if (f) { e.preventDefault(); f(b, e); } });
  document.addEventListener('submit', e => { if (e.target.id !== 's2') return; e.preventDefault(); if (aoEnviar) aoEnviar(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fechar(); });
  document.addEventListener('pointermove', e => { const k = e.target.closest && e.target.closest('.tilt'); if (!k || RM || e.pointerType !== 'mouse') return; const r = k.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; k.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 8}deg) translateY(-3px)`; });
  document.addEventListener('pointerout', e => { const k = e.target.closest && e.target.closest('.tilt'); if (k && !k.contains(e.relatedTarget)) k.style.transform = ''; });
  addEventListener('scroll', () => { const t = $('tip'); if (t) t.hidden = true; }, { passive: true });
  $('scrim2').addEventListener('click', e => { if (e.target.id === 'scrim2') fechar(); });

  /* ================= sincronia ================= */
  const N = A.nuvem;
  db.aoSincronizar((estado, msg) => {
    const s = $('sync'); s.hidden = false; s.className = 'sync ' + (estado === 'ok' || estado === 'recarregado' ? 'ok' : estado === 'erro' ? 'erro' : estado === 'offline' ? 'off' : '');
    s.innerHTML = `<i></i>${{ ok: 'Salvo', recarregado: 'Atualizado', erro: 'Não salvou', offline: 'Sem internet · guardado no celular', login: 'Entre de novo para salvar' }[estado] || 'Salvando…'}`;
    clearTimeout(s.h); if (estado === 'ok' || estado === 'recarregado') s.h = setTimeout(() => s.hidden = true, 1600);
    if (estado === 'erro') toast('O Supabase não aceitou essa mudança (' + (msg || 'erro') + '). Voltei a mostrar o que está salvo lá.');
    if (estado === 'recarregado') render(false);
    if (estado === 'login') mostrarLogin('Sua sessão terminou. Entre de novo: o que você mudou continua guardado no celular.');
  });

  /* ================= entrar ================= */
  const splash = {
    sair: () => { const sp = $('splash'); sp.classList.add('out'); setTimeout(() => sp.hidden = true, 500); },
    erro: (msg, botao) => { const sp = $('splash'); sp.hidden = false; sp.classList.remove('out'); sp.querySelector('.spin').hidden = true; sp.querySelector('p').innerHTML = `<span class="erro">${u.esc(msg)}</span><br><button class="btn2" type="button" data-a="recomecar" style="margin-top:14px">${botao || 'Tentar de novo'}</button>`; },
  };
  function mostrarLogin(aviso) {
    const L = $('login');
    $('lgAviso').textContent = aviso || ''; $('lgAviso').hidden = !aviso; $('lgErro').hidden = true;
    $('lgFoto').innerHTML = foto();
    L.hidden = false; L.classList.remove('out'); splash.sair();
    setTimeout(() => { const e = $('lgEmail'); if (e && !e.value) e.focus(); }, 50);
  }
  $('lgForm').addEventListener('submit', async e => {
    e.preventDefault();
    const bt = $('lgBtn'), er = $('lgErro');
    bt.disabled = true; bt.textContent = 'Entrando…'; er.hidden = true;
    try {
      await N.entrar($('lgEmail').value, $('lgSenha').value);
      $('lgSenha').value = '';
      const L = $('login'); L.classList.add('out'); setTimeout(() => L.hidden = true, 450);
      await abrirApp();
    } catch (x) { er.textContent = x.message; er.hidden = false; }
    finally { bt.disabled = false; bt.textContent = 'Entrar'; }
  });
  $('lgOlho').addEventListener('click', () => { const i = $('lgSenha'); i.type = i.type === 'password' ? 'text' : 'password'; $('lgOlho').innerHTML = u.svg(i.type === 'password' ? 'eye' : 'eye-off'); });

  function escolherMes() {
    ui.mes = u.mes(u.hoje());
    if (!c.doMes(ui.mes).length) { const ms = c.mesesPassados(); if (ms.length) ui.mes = ms[ms.length - 1]; }
  }
  async function abrirApp() {
    const temCopia = db.abrirCopia();
    if (temCopia) { escolherMes(); render(); splash.sair(); }
    try {
      await db.atualizar();
      if (db.vazio()) { splash.sair(); return telaImportar(); }
      const criou = db.garantirFixas();
      if (!temCopia) { escolherMes(); render(); splash.sair(); } else render(false);
      if (!criou) db.enviar();
    } catch (e) {
      if (e.status === 401) return mostrarLogin('Entre de novo.');
      if (temCopia) { toast(e.semInternet ? 'Sem internet: mostrando o que está guardado no celular.' : 'Não consegui atualizar agora: ' + e.message); return; }
      splash.erro(e.semInternet ? 'Sem internet. Confira o Wi-Fi ou os dados móveis.' : 'Não consegui abrir seus dados: ' + e.message);
    }
  }
  /* primeira vez: trazer os dados da planilha */
  function telaImportar() {
    nav(); $('fabwrap').hidden = true;
    $('view').innerHTML = `<header class="bar"><h1>Trazer seus dados</h1></header>
      <div class="panel" style="max-width:520px;margin:20px auto 0;padding:24px;display:grid;gap:14px;text-align:center;justify-items:center">
        ${u.ti(['upload', '#8fb0ff', '#2c55d6'], 'lg')}
        <p style="margin:0">Sua conta ainda está vazia. Escolha o arquivo <b>darzan-dados.json</b> que o Claude te mandou: ele tem todo o histórico da planilha.</p>
        <label class="btn2 pri" style="cursor:pointer">${u.svg('file-text')}Escolher o arquivo<input type="file" id="impArq" accept=".json,application/json" hidden></label>
        <p class="c-muted" id="impMsg" style="margin:0;font-size:.88rem"></p>
      </div>`;
    $('impArq').addEventListener('change', async ev => {
      const arq = ev.target.files[0], msg = $('impMsg'); if (!arq) return;
      try {
        const dados = JSON.parse(await arq.text());
        if (!dados.abas || !dados.abas.EXTRATO) throw new Error('esse arquivo não é o dos seus dados');
        msg.textContent = 'Trazendo…';
        const n = await db.importar(dados, (f, t) => { msg.textContent = `Trazendo… ${f} de ${t}`; });
        db.garantirFixas(); escolherMes(); render(); toast(`Pronto! ${n} registros trazidos.`); confete(innerWidth / 2, 200);
      } catch (e) { msg.innerHTML = `<span class="c-out">Não deu certo: ${u.esc(e.message)}</span>`; }
    });
  }
  /* sua conta: cópia de segurança, dados no Supabase, sair */
  function formConta() {
    const ref = (N.config.url.match(/https:\/\/([^.]+)\./) || [])[1];
    abrir(`<h3 style="margin:0 0 4px">Sua conta</h3><p class="c-muted" style="margin:0 0 16px">${u.esc((N.sessao && N.sessao.user.email) || '')}</p>
      <div style="display:grid;gap:10px">
        <button type="button" class="btn2" data-a="baixarCopia">${u.svg('file-text')}Baixar uma cópia dos dados</button>
        ${ref ? `<a class="btn2" href="https://supabase.com/dashboard/project/${ref}/editor" target="_blank" rel="noopener">${u.svg('pencil')}Ver e mexer nos dados no Supabase</a>` : ''}
        <button type="button" class="btn2" data-a="ocultar">${u.svg(ui.oculto ? 'eye' : 'eye-off')}${ui.oculto ? 'Mostrar os valores' : 'Esconder os valores'}</button>
        <button type="button" class="btn2 perigo" data-a="sair">${u.svg('log-out')}Sair deste aparelho</button>
      </div>
      <p class="c-muted" style="font-size:.8rem;margin:16px 0 0">${db.pendentes() ? `${db.pendentes()} mudança(s) esperando internet para salvar.` : 'Tudo salvo no Supabase.'}</p>`, null);
  }
  function baixarCopia() {
    const blob = new Blob([JSON.stringify(db.copia(), null, 1)], { type: 'application/json' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `darzan-dados-${u.hoje()}.json`; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast('Cópia baixada');
  }
  Object.assign(ACOES, {
    conta: () => formConta(),
    baixarCopia: () => baixarCopia(),
    sair: b => {
      if (db.pendentes() && b.dataset.certeza !== '1') { b.dataset.certeza = '1'; b.innerHTML = u.svg('log-out') + 'Tem mudança sem salvar. Toque de novo para sair mesmo assim'; return; }
      N.sair(); db.abas = {}; fechar(); mostrarLogin();
    },
    recomecar: () => { $('splash').querySelector('.spin').hidden = false; $('splash').querySelector('p').textContent = 'Abrindo…'; iniciar(); },
  });
  N.aoSair = () => mostrarLogin('Sua sessão terminou. Entre de novo.');

  async function iniciar() {
    if (!N.sessao) return mostrarLogin();
    await abrirApp();
  }
  A.iniciar = iniciar;
})(window.A);
