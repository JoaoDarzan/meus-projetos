(function (A) {
  const u = A.u, c = A.c, db = A.db;
  const ui = A.ui = { jseg: 'quadro', jano: '', rvfil: 'banco', rvq: '', rvsel: new Set(), view: 'inicio', mes: null, fseg: 'extrato', rseg: 'mes', tfil: 'todas', efil: 'Todos', filtro: 'tudo', q: '', cartao: null, oculto: false };
  try { ui.oculto = localStorage.getItem('df-oculto') === '1'; } catch (e) { /* sem armazenamento */ }
  const R = {}, DEPOIS = {};
  const $ = id => document.getElementById(id);
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ================= peças ================= */
  const pill = () => {
    const ms = c.meses(), i = ms.indexOf(ui.mes);
    return `<div class="mpill"><button type="button" data-a="mes" data-d="-1" aria-label="Mês anterior" ${i <= 0 ? 'disabled' : ''}>${u.svg('chevron-left')}</button><button type="button" class="mnome" data-a="escolherMes" aria-haspopup="dialog" aria-label="Escolher o mês (agora: ${u.esc(u.nomeMes(ui.mes))} de ${ui.mes.slice(0, 4)})">${u.nomeMes(ui.mes)}${ui.mes.slice(0, 4) !== u.hoje().slice(0, 4) ? ' ' + ui.mes.slice(2, 4) : ''}</button><button type="button" data-a="mes" data-d="1" aria-label="Próximo mês" ${i >= ms.length - 1 ? 'disabled' : ''}>${u.svg('chevron-right')}</button></div>`;
  };
  /* fora do início: voltar (um passo, até chegar no início) e a casinha (direto para o início). No início não tem nenhum dos dois */
  const bar = (titulo, voltar, comMes = true) => `<header class="bar">${ui.view !== 'inicio' ? `<span class="navb"><button class="back" type="button" data-a="voltar" aria-label="Voltar">${u.svg('chevron-left')}</button><button class="back casa" type="button" data-a="go" data-v="inicio" aria-label="Ir para o início">${u.svg('house')}</button></span>` : ''}<h1>${titulo}</h1>${comMes ? pill() : ''}</header>`;
  const seg = (nome, atual, ops) => `<div class="seg" role="group">${ops.map(([k, n]) => `<button type="button" data-a="seg" data-s="${u.esc(nome)}" data-v="${u.esc(k)}" aria-pressed="${atual === k}">${n}</button>`).join('')}</div>`;
  const vazio = (icone, txt, botao) => `<div class="vazio">${u.ti(icone, 'lg')}<span>${txt}</span>${botao || ''}</div>`;
  function linhaL(l) {
    const renda = l.grupo === 'Renda' || (l.grupo === 'Reembolso' && l.valor > 0), ic = c.icone(l.cat, l.sub);
    const meta = [l.sub || l.cat, l.banco + (l.tipo === 'cartão' ? ' (cartão)' : ''), u.dm(l.data)].filter(Boolean).map(x => `<span>${u.esc(x)}</span>`).join('<span>·</span>');
    return `<button type="button" class="it btn" data-a="editL" data-id="${u.esc(l.id)}">${u.ti(ic)}<div style="min-width:0"><div class="t">${u.esc(u.cap(l.desc))}</div><div class="m">${meta}${l.parcela ? `<span>· ${u.esc(l.parcela)}</span>` : ''}${l.status === 'Previsto' ? '<span class="prev">previsto</span>' : ''}${l.grupo === 'Reembolso' ? '<span class="prev">reembolso</span>' : ''}</div></div><div class="v num ${renda ? 'c-in' : ''}">${l.valor > 0 ? '+ ' : l.valor < 0 ? '− ' : ''}${u.brl(Math.abs(l.valor))}</div></button>`;
  }
  /* "Para onde foi": rosca com as categorias (cores validadas para o fundo escuro) e a lista; tocar abre as subcategorias */
  const CAT_COR = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9'];
  function ondeFoi(r, onde) {
    if (!r.cats.length) return '';
    const tot = u.sum(r.cats, x => x.valor) || 1, top = r.cats.slice(0, 6), resto = r.cats.slice(6);
    const fatias = top.map((x, i) => Object.assign({ cor: CAT_COR[i] }, x));
    if (resto.length) fatias.push({ cat: 'Outras', valor: u.sum(resto, x => x.valor), n: u.sum(resto, x => x.n), cor: '#6b7591', outras: resto });
    let acc = 0;
    const R = 70, C = 2 * Math.PI * R, gap = fatias.length > 1 ? 1.6 : 0;
    const rotulos = [];
    const arcos = fatias.map(f => { const len = Math.max(f.valor / tot * C - gap, .6), a = `<circle class="fatia" r="${R}" cx="90" cy="90" fill="none" stroke="${f.cor}" stroke-width="24" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-acc}" data-a="abreCat" data-v="${u.esc(f.cat)}"><title>${u.esc(f.cat)}: ${u.brl(f.valor)} (${u.pct(f.valor / tot)})</title></circle>`;
      /* a porcentagem em cima da fatia (só nas que têm espaço: 6% ou mais) */
      if (f.valor / tot >= .06) { const ang = (acc + f.valor / tot * C / 2) / C * 2 * Math.PI - Math.PI / 2; rotulos.push(`<text class="pf num" x="${(90 + R * Math.cos(ang)).toFixed(1)}" y="${(90 + R * Math.sin(ang)).toFixed(1)}" text-anchor="middle" dominant-baseline="central">${Math.round(f.valor / tot * 100)}%</text>`); }
      acc += f.valor / tot * C; return a; }).join('');
    const aberta = ui.cexp && fatias.find(f => f.cat === ui.cexp);
    /* no meio: o total; com uma categoria aberta, o valor dela */
    const meio = aberta ? [u.k0(aberta.valor), `${u.esc(aberta.cat.length > 16 ? aberta.cat.slice(0, 15) + '…' : aberta.cat)} · ${u.pct(aberta.valor / tot)}`] : [u.k0(r.saiu), 'saiu no mês'];
    const subs = f => {
      if (f.outras) return f.outras.map(x => [x.cat, x.valor]);
      return Object.entries(f.subs || {}).map(([k, v]) => [k, u.r2(v)]).sort((a, b) => b[1] - a[1]);
    };
    return `<div class="ondefoi"><div class="rosca"><svg viewBox="0 0 180 180" role="img" aria-label="Gastos por categoria"><g transform="rotate(-90 90 90)">${arcos}</g><g class="pfs" aria-hidden="true">${rotulos.join('')}</g><text x="90" y="86" text-anchor="middle" class="rv num">${meio[0]}</text><text x="90" y="106" text-anchor="middle" class="rl">${meio[1]}</text></svg></div>
      <div class="ofl">${fatias.map(f => `<button type="button" class="catl${aberta === f ? ' on' : ''}" data-a="abreCat" data-v="${u.esc(f.cat)}" aria-expanded="${aberta === f}"><i style="background:${f.cor}"></i><span class="n">${u.esc(f.cat)}<small>${f.n} ${f.n === 1 ? 'gasto' : 'gastos'}</small></span><b class="num">${u.brl(f.valor)}<small>${u.pct(f.valor / tot)}</small></b></button>${aberta === f ? (() => { const ss = subs(f), mx = Math.max(...ss.map(x => x[1]), 1); return `<div class="ofsubs">${ss.map(([k, v]) => `<div class="ofsub"><span>${u.esc(k === '—' ? 'Sem subcategoria' : k)}</span><b class="num">${u.brl(v)}</b><em><i style="width:${v / mx * 100}%;background:${f.cor}"></i></em></div>`).join('')}${f.outras ? '' : `<button type="button" class="chip mini" data-a="filtroCat" data-v="${u.esc(f.cat)}">${u.svg('search')}Ver os lançamentos</button>`}</div>`; })() : ''}`).join('')}<div class="tot-row"><span>Total que saiu</span><b class="num c-out">${u.brl(r.saiu)}</b></div></div></div>`;
  }

  function anel(p, tam, esp, cor) { const r = (tam - esp) / 2, cf = 2 * Math.PI * r; return `<svg viewBox="0 0 ${tam} ${tam}" width="${tam}" height="${tam}"><circle cx="${tam / 2}" cy="${tam / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="${esp}"/><circle class="rg" cx="${tam / 2}" cy="${tam / 2}" r="${r}" fill="none" stroke="${cor}" stroke-width="${esp}" stroke-linecap="round" stroke-dasharray="${cf}" stroke-dashoffset="${cf}" data-off="${cf * (1 - Math.min(Math.max(p, 0), 1))}"/></svg>`; }
  const foto = () => window.FOTO_JOAO ? `<img class="ava" src="${window.FOTO_JOAO}" alt="">` : `<span class="ava" style="display:grid;place-items:center;background:linear-gradient(135deg,#ffe08a,#c98a2a);color:#3a2500;font-weight:800">JD</span>`;
  /* botão "Lembrar no WhatsApp" (abre o WhatsApp com a mensagem pronta; você confere e envia) */
  const botaoWhats = (j, valor, venc, mini) => {
    const link = j && c.linkWhats(j, valor, venc);
    if (link) return `<a class="whats${mini ? ' mini' : ''}" href="${u.esc(link)}" target="_blank" rel="noopener noreferrer">${u.svg('message-circle')}${mini ? 'Lembrar' : 'Lembrar no WhatsApp'}</a>`;
    return j && !mini ? `<button type="button" class="whats sem" data-a="editJ" data-id="${u.esc(j.ID)}" data-foco="jW">${u.svg('message-circle')}Coloque o WhatsApp do cliente para lembrar</button>` : '';
  };
  /* tarefa de receber parcela de um trabalho: de qual trabalho é */
  const jobDoLanc = id => { const l = db.achar('EXTRATO', id), m = l && String(l['OBS'] || '').match(/Trabalho (J[\w-]+)/); return m ? db.achar('TRABALHOS', m[1]) : null; };
  function tkLinha(t) {
    const ok = t.feita, urg = !ok && u.ateHoje(t.data) <= 1;
    const q = u.ateHoje(t.data), chip = ok ? '<span class="due feito">Feito</span>' : q < 0 ? '<span class="due amanha">Atrasada</span>' : q === 0 ? '<span class="due hoje">Hoje</span>' : q === 1 ? '<span class="due amanha">Amanhã</span>' : `<span class="due breve">${u.dm(t.data)}</span>`;
    return `<div class="tk ${ok ? 'ok' : ''} ${urg ? 'urgent' : ''}"><button class="ck" type="button" data-a="tarefa" data-id="${u.esc(t.id)}" aria-pressed="${ok}" aria-label="${ok ? 'Desmarcar' : 'Marcar como feito'}">${u.svg('check')}</button>${u.ti(t.icone)}
      <button type="button" data-a="editT" data-id="${u.esc(t.id)}" style="min-width:0;border:0;background:none;padding:0;text-align:left;color:inherit"><div class="t">${u.esc(t.titulo)}</div><div class="m">${t.valor ? `<b class="num" style="color:var(--fg)">${u.brl(t.valor)}</b>` : ''}${chip}${t.estimado && !ok ? '<span class="estim">vencimento estimado</span>' : ''}${t.banco && t.valor && t.banco !== 'Não informado' ? `<span>${t.grupo === 'receber' ? 'entra no' : 'sai do'} ${u.esc(t.banco)}</span>` : ''}</div></button>
      ${ok ? `<button class="undo" type="button" data-a="tarefa" data-id="${u.esc(t.id)}">${u.svg('undo-2')}Desfazer</button>` : t.grupo === 'receber' && t.id.startsWith('l:') ? botaoWhats(jobDoLanc(t.id.slice(2)), t.valor, t.data, true) || '<span></span>' : '<span></span>'}</div>`;
  }

  /* fatura que importa agora: a mais antiga ainda sem pagar (até 10 dias de atraso) ou a que está aberta */
  /* ícone de cada banco (Nubank, PicPay e Mercado Pago: desenhos do Simple Icons, licença CC0; Inter e Pan: a marca em texto) */
  const LOGOS = Object.assign(Object.create(null), {
    'Nubank': ['#820AD1', '<path fill="#fff" d="M7.2795 5.4336c-1.1815 0-2.1846.4628-2.9432 1.252h-.002c-.0541-.0022-.1074-.002-.162-.002-1.5436 0-2.9925.8835-3.699 2.2559-.3088.5996-.4234 1.2442-.459 1.9003-.0321.589 0 1.1863 0 1.7696v5.6523H3.184s.0022-2.784 0-5.1777c-.0014-1.6112-.0118-3.0471 0-3.3418.056-1.3937.4372-2.3053 1.1484-3.0508 2.3585.0018 3.8852 1.6091 3.9705 4.168.0196.5874.0254 3.7304.0254 3.7304v3.672h3.1678v-4.965c0-1.5007.0127-2.8006-.0918-3.6952-.292-2.5-1.821-4.168-4.1248-4.168zm8.3903.3008l-3.166.0039v4.9648c0 1.5009-.0127 2.8007.0919 3.6953.2921 2.5001 1.821 4.168 4.1248 4.168 1.1815 0 2.1846-.4628 2.9432-1.252.0003-.0003.0016.0004.002 0 .0542.0023.1093.002.164.002 1.5435 0 2.9905-.8835 3.6971-2.2558.3088-.5997.4233-1.2442.459-1.9004.032-.5889 0-1.1862 0-1.7695V5.7383H20.816s-.0022 2.784 0 5.1777c.0015 1.6113.0119 3.047 0 3.3418-.056 1.3935-.4372 2.3053-1.1483 3.0508-2.3586-.0018-3.8853-1.6091-3.9706-4.168-.0196-.5874-.0273-2.0437-.0273-3.7324Z"/>'],
    'PicPay': ['#21C25E', '<path fill="#fff" d="M16.463 1.587v7.537H24V1.587zm1.256 1.256h5.025v5.025h-5.025zm1.256 1.256v2.513h2.513V4.099zM3.77 5.355V8.53h3.376c2.142 0 3.358 1.04 3.358 2.939 0 1.947-1.216 3.011-3.358 3.011H3.769V8.53H0v13.884h3.769v-4.76h3.57c4.333 0 6.815-2.352 6.815-6.32 0-3.771-2.482-5.978-6.814-5.978Z"/>'],
    'Mercado Pago': ['#00B1EA', '<path fill="#fff" d="M11.115 16.479a.93.927 0 0 1-.939-.886c-.002-.042-.006-.155-.103-.155-.04 0-.074.023-.113.059-.112.103-.254.206-.46.206a.816.814 0 0 1-.305-.066c-.535-.214-.542-.578-.521-.725.006-.038.007-.08-.02-.11l-.032-.03h-.034c-.027 0-.055.012-.093.039a.788.786 0 0 1-.454.16.7.699 0 0 1-.253-.05c-.708-.27-.65-.928-.617-1.126.005-.041-.005-.072-.03-.092l-.05-.04-.047.043a.728.726 0 0 1-.505.203.73.728 0 0 1-.732-.725c0-.4.328-.722.732-.722.364 0 .675.27.721.63l.026.195.11-.165c.01-.018.307-.46.852-.46.102 0 .21.016.316.05.434.13.508.52.519.68.008.094.075.1.09.1.037 0 .064-.024.083-.045a.746.744 0 0 1 .54-.225c.128 0 .263.03.402.09.69.293.379 1.158.374 1.167-.058.144-.061.207-.005.244l.027.013h.02c.03 0 .07-.014.134-.035.093-.032.235-.08.367-.08a.944.942 0 0 1 .94.93.936.934 0 0 1-.94.928zm7.302-4.171c-1.138-.98-3.768-3.24-4.481-3.77-.406-.302-.685-.462-.928-.533a1.559 1.554 0 0 0-.456-.07c-.182 0-.376.032-.58.095-.46.145-.918.505-1.362.854l-.023.018c-.414.324-.84.66-1.164.73a1.986 1.98 0 0 1-.43.049c-.362 0-.687-.104-.81-.258-.02-.025-.007-.066.04-.125l.008-.008 1-1.067c.783-.774 1.525-1.506 3.23-1.545h.085c1.062 0 2.12.469 2.24.524a7.03 7.03 0 0 0 3.056.724c1.076 0 2.188-.263 3.354-.795a9.135 9.11 0 0 0-.405-.317c-1.025.44-2.003.66-2.946.66-.962 0-1.925-.229-2.858-.68-.05-.022-1.22-.567-2.44-.57-.032 0-.065 0-.096.002-1.434.033-2.24.536-2.782.976-.528.013-.982.138-1.388.25-.361.1-.673.186-.979.185-.125 0-.35-.01-.37-.012-.35-.01-2.115-.437-3.518-.962-.143.1-.28.203-.415.31 1.466.593 3.25 1.053 3.812 1.089.157.01.323.027.491.027.372 0 .744-.103 1.104-.203.213-.059.446-.123.692-.17l-.196.194-1.017 1.087c-.08.08-.254.294-.14.557a.705.703 0 0 0 .268.292c.243.162.677.27 1.08.271.152 0 .297-.015.43-.044.427-.095.874-.448 1.349-.82.377-.296.913-.672 1.323-.782a1.494 1.49 0 0 1 .37-.05.611.61 0 0 1 .095.005c.27.034.533.125 1.003.472.835.62 4.531 3.815 4.566 3.846.002.002.238.203.22.537-.007.186-.11.352-.294.466a.902.9 0 0 1-.484.15.804.802 0 0 1-.428-.124c-.014-.01-1.28-1.157-1.746-1.543-.074-.06-.146-.115-.22-.115a.122.122 0 0 0-.096.045c-.073.09.01.212.105.294l1.48 1.47c.002 0 .184.17.204.395.012.244-.106.447-.35.606a.957.955 0 0 1-.526.171.766.764 0 0 1-.42-.127l-.214-.206a21.035 20.978 0 0 0-1.08-1.009c-.072-.058-.148-.112-.221-.112a.127.127 0 0 0-.094.038c-.033.037-.056.103.028.212a.698.696 0 0 0 .075.083l1.078 1.198c.01.01.222.26.024.511l-.038.048a1.18 1.178 0 0 1-.1.096c-.184.15-.43.164-.527.164a.8.798 0 0 1-.147-.012c-.106-.018-.178-.048-.212-.089l-.013-.013c-.06-.06-.602-.609-1.054-.98-.059-.05-.133-.11-.21-.11a.128.128 0 0 0-.096.042c-.09.096.044.24.1.293l.92 1.003a.204.204 0 0 1-.033.062c-.033.044-.144.155-.479.196a.91.907 0 0 1-.122.007c-.345 0-.712-.164-.902-.264a1.343 1.34 0 0 0 .13-.576 1.368 1.365 0 0 0-1.42-1.357c.024-.342-.025-.99-.697-1.274a1.455 1.452 0 0 0-.575-.125c-.146 0-.287.025-.42.075a1.153 1.15 0 0 0-.671-.564 1.52 1.515 0 0 0-.494-.085c-.28 0-.537.08-.767.242a1.168 1.165 0 0 0-.903-.43 1.173 1.17 0 0 0-.82.335c-.287-.217-1.425-.93-4.467-1.613a17.39 17.344 0 0 1-.692-.189 4.822 4.82 0 0 0-.077.494l.67.157c3.108.682 4.136 1.391 4.309 1.525a1.145 1.142 0 0 0-.09.442 1.16 1.158 0 0 0 1.378 1.132c.096.467.406.821.879 1.003a1.165 1.162 0 0 0 .415.08c.09 0 .179-.012.266-.034.086.22.282.493.722.668a1.233 1.23 0 0 0 .457.094c.122 0 .241-.022.355-.063a1.373 1.37 0 0 0 1.269.841c.37.002.726-.147.985-.41.221.121.688.341 1.163.341.06 0 .118-.002.175-.01.47-.059.689-.24.789-.382a.571.57 0 0 0 .048-.078c.11.032.234.058.373.058.255 0 .501-.086.75-.265.244-.174.418-.424.444-.637v-.01c.083.017.167.026.251.026.265 0 .527-.082.773-.242.48-.31.562-.715.554-.98a1.28 1.279 0 0 0 .978-.194 1.04 1.04 0 0 0 .502-.808 1.088 1.085 0 0 0-.16-.653c.804-.342 2.636-1.003 4.795-1.483a4.734 4.721 0 0 0-.067-.492 27.742 27.667 0 0 0-5.049 1.62zm5.123-.763c0 4.027-5.166 7.293-11.537 7.293-6.372 0-11.538-3.266-11.538-7.293 0-4.028 5.165-7.293 11.539-7.293 6.371 0 11.537 3.265 11.537 7.293zm.46.004c0-4.272-5.374-7.755-12-7.755S.002 7.277.002 11.55L0 12.004c0 4.533 4.695 8.203 11.999 8.203 7.347 0 12-3.67 12-8.204z"/>'],
    'Inter': ['#FF7A00', '<text x="12" y="15.2" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="8.6" font-weight="700" fill="#fff">inter</text>'],
    'Banco Pan': ['#0A9DE3', '<text x="12" y="15.8" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="10" font-weight="800" fill="#fff">pan</text>'],
  });
  const logoBanco = nome => { const l = LOGOS[nome]; if (l) return `<span class="logob" style="background:${l[0]}" aria-hidden="true"><svg viewBox="0 0 24 24">${l[1]}</svg></span>`; const g = c.CORBANCO[nome] || c.CORBANCO['Não informado']; return `<span class="logob" style="background:linear-gradient(145deg,${g[0]},${g[1]})" aria-hidden="true">${u.esc(String(nome || '?').charAt(0))}</span>`; };


  /* ================= INÍCIO ================= */
  R.inicio = () => {
    const r = c.resumo(ui.mes), m = ui.mes;
    const ult = c.ordenar(r.L);
    /* pra fazer só do mês escolhido (no mês atual, o que ficou atrasado de antes também aparece, para não esquecer) */
    const doMesT = c.tarefas().filter(t => !t.feita && (u.mes(t.data) === m || (m === u.mes(u.hoje()) && t.data < u.hoje()))), prox = doMesT.slice(0, 3);
    const urg = c.urgentes();
    /* no início, só o que está na conta corrente de cada banco (caixinhas e cofrinhos ficam na aba Bancos) */
    const bancos = c.contas().filter(x => u.sem(x['CONTA']) === 'conta').map(x => ({ b: x['BANCO'], v: c.saldo(x), tem: c.saldo(x) != null }));
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
          <div class="big num" data-cnt="${r.futuro ? r.prevSobra : r.sobra}" data-fmt="big">${u.big(r.futuro ? r.prevSobra : r.sobra)}</div></div>
        <div class="flows num"><span class="flow f-in">${u.svg('arrow-up')}<span>Entrou</span><b data-cnt="${r.entr}" data-fmt="k0">${u.k0(r.entr)}</b>${r.aReceber ? `<small class="arec">+ ${u.k0(r.aReceber)} a receber</small>` : ''}</span><span class="flow f-out">${u.svg('arrow-down')}<span>Saiu</span><b data-cnt="${r.saiu}" data-fmt="k0">${u.k0(r.saiu)}</b></span><span class="flow f-sav">${u.svg('piggy-bank')}<span>Guardou</span><b data-cnt="${r.guardou}" data-fmt="k0">${u.k0(r.guardou)}</b></span></div>
        <div class="bankpills" aria-label="Saldo na conta corrente">${bancos.map(x => `<button type="button" class="bp" data-a="irBancos" aria-label="${u.esc(x.b)}: ${x.tem ? u.brl(x.v) : 'sem saldo informado'} na conta">${logoBanco(x.b)}${u.esc(x.b)} <b class="num">${x.tem ? u.k0(x.v) : '—'}</b></button>`).join('')}${c.semSaldo() ? `<button type="button" class="bp" data-a="irBancos" style="--a:#ffe08a;--b:#c98a2a"><i></i>Informar saldos</button>` : ''}</div>
      </section>
      ${cartoes.length ? `<section class="sec"><div class="sec-h"><h2>Cartões</h2><button class="more" type="button" data-a="irCartoes">Ver faturas</button></div><div class="rail">${cartoes.map(k => { const nome = k['CARTÃO'], fm = m, v = c.fatura(nome, fm), ven = c.vence(nome, fm), q = u.ateHoje(ven.data); return `<button type="button" class="gcard sm tilt" style="--g:${c.GRAD[nome] || 'var(--mp)'}" data-a="irCartoes" data-v="${u.esc(nome)}"><span class="sheen"></span><span class="bank">${u.esc(nome)}${u.svg('smartphone-nfc')}</span><span><span class="k">Fatura de ${u.nomeMes(fm).toLowerCase()}</span><br><span class="amt num">${u.brl(v)}</span></span><span class="foot"><span>${q < 0 ? 'Venceu' : 'Vence'} ${u.dm(ven.data)}${ven.estimado ? '*' : ''}</span><span>${c.pagFatura(nome, fm) ? 'Paga ✓' : q < 0 && v > 0 ? 'Atrasada' : 'Crédito'}</span></span></button>`; }).join('')}</div></section>` : ''}
      <section class="sec"><div class="acts">
        <button class="act" type="button" data-a="novoL" data-t="saida"><span class="o">${u.svg('arrow-down')}</span>Gastei</button>
        <button class="act" type="button" data-a="novoL" data-t="entrada"><span class="o">${u.svg('arrow-up')}</span>Recebi</button>
        <button class="act" type="button" data-a="novoL" data-t="guardar"><span class="o">${u.svg('piggy-bank')}</span>Guardei</button>
        <button class="act" type="button" data-a="novoE"><span class="o">${u.svg('camera')}</span>Equipamento</button></div></section>
      <section class="sec"><div class="sec-h"><h2>Minhas rendas</h2></div><div class="incomes">
        ${[['Salário CLT', 'Salário CLT'], ['Darzan Produções', 'Darzan'], ['JPL SOM', 'JPL SOM']].map(([k, n]) => `<button class="inc" type="button" data-a="irRel" data-v="${u.esc(k === 'Darzan Produções' ? 'darzan' : k === 'JPL SOM' ? 'jpl' : 'mes')}">${u.ti(c.icone(k))}<span class="n">${n}</span><b class="v num">${u.k0(r.fonte[k])}</b>${dif(r.fonte[k], media(k))}</button>`).join('')}</div></section>
    </div><div class="col-r">
      <section class="sec"><div class="sec-h"><h2>${u.svg('list-checks')}Pra fazer em ${u.nomeMes(m).toLowerCase()}</h2><button class="more" type="button" data-a="go" data-v="tarefas">${doMesT.length > 3 ? `Ver as ${doMesT.length}` : 'Ver tudo'}</button></div>${prox.map(tkLinha).join('') || vazio(['circle-check', '#7cf0a8', '#15a352'], `Nada pendente em ${u.nomeMes(m).toLowerCase()}. Tudo em dia!`)}</section>
      ${(() => { const n = c.totalRevisar(); return n ? `<button type="button" class="rv-aviso" data-a="irRevisar">${u.ti(['sparkles', '#ffd36b', '#c07a12'])}<span><b>${n} lançamento${n > 1 ? 's' : ''} para revisar</b><small>Sem banco, sem categoria ou para conferir. Conserte vários de uma vez.</small></span>${u.svg('chevron-right')}</button>` : ''; })()}
      <section class="sec"><div class="sec-h"><h2>Para onde foi</h2><span class="c-muted num" style="font-size:.86rem">${r.cats.length} categorias</span></div>
        <div class="panel">${r.cats.length ? ondeFoi(r) : vazio(['shopping-bag', '#c2a8ff', '#6b34e0'], 'Nenhum gasto neste mês.')}</div></section>
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
      <div class="sec" style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center;margin-top:16px"><div class="chips">${[['todas', 'Todas'], ['conta', 'Contas'], ['darzan', 'Darzan'], ['pessoal', 'Pessoais']].map(([k, n]) => `<button class="chip" type="button" data-a="seg" data-s="tfil" data-v="${u.esc(k)}" aria-pressed="${F === k}">${n} · ${cnt(k)}</button>`).join('')}</div><button class="chip" type="button" data-a="novoT" style="border-color:var(--blue);color:var(--blue-hi)">${u.svg('plus')} Nova tarefa</button></div>
      <div class="two"><div>${G.map(([n, f]) => { const a = abertas.filter(f); return a.length ? `<div class="grp"><span>${n}</span><b>${a.length}</b></div>${a.map(tkLinha).join('')}` : ''; }).join('') || `<div class="panel" style="margin-top:16px">${vazio(['party-popper', '#cf9cff', '#7a35e6'], 'Tudo em dia por aqui!')}</div>`}</div>
      <div><div class="grp"><span>Feitas</span><b>${feitas.length}</b></div>${feitas.map(tkLinha).join('') || '<p class="c-muted" style="font-size:.88rem">Marcou sem querer? É só tocar em “Desfazer”.</p>'}
      <p class="aviso">As contas do mês (seguro, boletos) e as faturas dos cartões entram aqui sozinhas. Marcar uma fatura como paga tira o valor do banco que paga o cartão.</p></div></div>`;
  };

  /* ================= TRABALHOS ================= */
  const ETAPAS = [['Orçamento', '#9eabcd'], ['Fechado', '#8fb0ff'], ['Em andamento', '#ffc86b'], ['Entregue', '#5fe0a1']];
  const TIPOEV = { 'Casamento': ['heart', '#ff9cd0', '#d2257f'], '15 anos': ['cake', '#cf9cff', '#7a35e6'], 'Aniversário': ['cake', '#cf9cff', '#7a35e6'], 'Social media': ['smartphone', '#8fb6ff', '#2148d6'], 'Corporativo': ['building-2', '#5fe3f5', '#0a8bb0'], 'Palestra': ['speaker', '#d79bf0', '#8a3fb0'], 'Formatura': ['graduation-cap', '#9cc6ff', '#2a62e0'], 'Evento': ['party-popper', '#ffd97a', '#c07a0a'] };
  function cardJob(j) {
    const s = TIPOEV[j['TIPO DE EVENTO']] || TIPOEV.Evento, tot = c.num(j['VALOR TOTAL']), rec = c.recebido(j), falta = c.faltaReceber(j), d = String(j['DATA DO EVENTO'] || '');
    const vs = c.entregas(j), ok = vs.filter(v => v.feito).length, nx = c.anexos(j).length;
    return `<button type="button" class="job" data-a="editJ" data-id="${u.esc(j.ID)}" style="--a:${s[1]};--b:${s[2]}"><div class="cov"></div><div class="in">
      <div class="tp"><span>${u.esc(j['TIPO DE EVENTO'] || 'Trabalho')}</span>${j['ETAPA'] === 'Entregue' ? '<span class="c-in">✓</span>' : ''}</div><div class="nm">${u.esc(j['CLIENTE'])}</div>
      <div class="meta">${d ? `<span>${u.svg('calendar-days')}${u.dm(d)}${u.ateHoje(d) >= 0 && u.ateHoje(d) <= 60 ? ` · em ${u.ateHoje(d)} dias` : ''}</span>` : ''}${j['LOCAL'] ? `<span>${u.svg('map-pin')}${u.esc(j['LOCAL'])}</span>` : ''}</div>
      ${tot ? `<div class="money"><i style="width:${Math.min(rec / tot, 1) * 100}%"></i></div><div class="mrow num"><span class="c-muted">${u.k0(rec)} de ${u.k0(tot)}</span>${falta > 0 ? `<b class="c-warn">falta ${u.k0(falta)}</b>` : '<b class="c-in">pago</b>'}</div>` : `<div class="mrow num"><span class="c-muted">Recebido ${u.k0(rec)}</span><span class="estim">sem valor total</span></div>`}
      ${j['O QUE FOI FECHADO'] ? `<div class="ft"><span>${u.svg('package')}${u.esc(j['O QUE FOI FECHADO'])}</span></div>` : ''}
      ${vs.length || nx ? `<div class="meta">${vs.length ? `<span class="${ok < vs.length ? 'c-warn' : ''}">${u.svg('clapperboard')}${ok} de ${vs.length} vídeos</span>` : ''}${nx ? `<span>${u.svg('paperclip')}${nx} ${nx > 1 ? 'arquivos' : 'arquivo'}</span>` : ''}</div>` : ''}</div></button>`;
  }
  const BAL_COR = [['trab', 'Trabalhos e outros', '--clt-sal'], ['rec', 'Recorrentes', '--clt-bon']];
  R.trabalhos = () => {
    const js = c.trabalhos(), quadro = js.filter(j => !c.recorrente(j)), abertos = quadro.filter(j => j['ETAPA'] !== 'Entregue' && j['ETAPA'] !== 'Orçamento');
    const receber = u.sum(quadro.filter(j => j['ETAPA'] !== 'Orçamento'), j => Math.max(c.faltaReceber(j) || 0, 0)), /* inclui entregue que ainda deve */ orc = u.sum(quadro.filter(j => j['ETAPA'] === 'Orçamento'), j => c.num(j['VALOR TOTAL']));
    const prox = quadro.filter(j => j['DATA DO EVENTO'] && u.ateHoje(String(j['DATA DO EVENTO'])) >= 0).sort((a, b) => String(a['DATA DO EVENTO']) < String(b['DATA DO EVENTO']) ? -1 : 1)[0];
    const fat = c.resumo(ui.mes).fonte['Darzan Produções'], S = ui.jseg || 'quadro';
    const corpo = S === 'recorrentes' ? recorrentes(js.filter(c.recorrente)) : S === 'balanco' ? balanco() : `<section class="sec"><div class="sec-h"><h2>${u.svg('layers')}Quadro</h2><button class="chip" type="button" data-a="novoJ" style="border-color:var(--blue);color:var(--blue-hi)">${u.svg('plus')} Novo trabalho</button></div>
        <p class="dica-q">${u.svg('hand-coins')}Segure um cartão e arraste para outra coluna para mudar a etapa.</p>
        <div class="board">${ETAPAS.map(([n, cor]) => { const l = quadro.filter(j => (j['ETAPA'] || 'Orçamento') === n); return `<div class="col" data-etapa="${u.esc(n)}"><div class="col-h"><span><i style="--c:${cor}"></i>${n}</span><em>${l.length}</em></div>${l.map(cardJob).join('') || '<p class="c-muted vaziocol">Nada aqui.</p>'}</div>`; }).join('')}</div>
        <p class="aviso">Toque no trabalho para ver os vídeos, os comprovantes e o contrato. “Recebido” soma o que você registra dentro do trabalho (dá para anexar o comprovante junto) e as entradas que têm o nome do cliente.</p></section>`;
    return bar('Trabalhos', null, false) + `<div class="sub" style="margin-top:-4px">Darzan Produções</div>
      <section class="sec"><div class="kpis k4"><div class="kpi"><span>A receber</span><b class="num c-warn">${u.k0(receber)}</b><small>dos trabalhos fechados</small></div><div class="kpi"><span>Em orçamento</span><b class="num">${u.k0(orc)}</b><small>${quadro.filter(j => j['ETAPA'] === 'Orçamento').length} esperando resposta</small></div><div class="kpi"><span>Próximo evento</span><b>${prox ? u.dm(String(prox['DATA DO EVENTO'])) : '—'}</b><small>${prox ? u.esc(prox['CLIENTE']) : 'nenhum marcado'}</small></div><div class="kpi"><span>Faturou em ${u.nomeMes(ui.mes).toLowerCase()}</span><b class="num c-in">${u.k0(fat)}</b><small>na Darzan</small></div></div></section>
      <div class="sec">${seg('jseg', S, [['quadro', 'Quadro'], ['recorrentes', 'Recorrentes'], ['balanco', 'Balanço']])}</div>` + corpo;
  };
  /* clientes que pagam todo mês: quanto rendeu cada mês, a média e o total */
  function recorrentes(rs) {
    const m0 = u.mes(u.hoje());
    return `<section class="sec"><div class="sec-h"><h2>${u.svg('refresh-cw')}Clientes recorrentes</h2><button class="chip" type="button" data-a="novoRec" style="border-color:var(--blue);color:var(--blue-hi)">${u.svg('plus')} Novo</button></div>
      ${rs.length ? rs.map((j, i) => {
        const g = c.ganhosPorMes(j), ms = Object.keys(g).sort(), ini = ms[0] || m0, lista = [];
        for (let m = ini; m <= m0; m = u.addMes(m, 1)) lista.push(m);
        const tot = u.sum(Object.values(g), v => v), meses = lista.length, media = meses ? tot / meses : 0, n = c.recebimentos(j);
        return `<div class="panel recp"><button type="button" class="rech" data-a="editJ" data-id="${u.esc(j.ID)}"><span>${u.ti(TIPOEV[j['TIPO DE EVENTO']] ? [TIPOEV[j['TIPO DE EVENTO']][0], TIPOEV[j['TIPO DE EVENTO']][1], TIPOEV[j['TIPO DE EVENTO']][2]] : ['user', '#9cc6ff', '#2a62e0'])}</span><div style="min-width:0"><b>${u.esc(j['CLIENTE'])}</b><small>${u.esc(j['O QUE FOI FECHADO'] || j['TIPO DE EVENTO'] || '')}</small></div>${u.svg('chevron-right')}</button>
          <div class="kpis"><div class="kpi"><span>Este mês</span><b class="num c-in">${u.k0(g[m0] || 0)}</b><small>${u.nomeMes(m0).toLowerCase()}</small></div><div class="kpi"><span>Média por mês</span><b class="num">${u.k0(media)}</b><small>em ${meses} ${meses > 1 ? 'meses' : 'mês'}</small></div><div class="kpi"><span>Total</span><b class="num">${u.k0(tot)}</b><small>desde ${u.nomeMes(ini).toLowerCase()}${ini.slice(0, 4) !== m0.slice(0, 4) ? ' de ' + ini.slice(0, 4) : ''}</small></div><div class="kpi"><span>Pagamentos</span><b class="num">${n.length}</b><small>${n.length ? 'último em ' + u.dm(n[n.length - 1].data) : '—'}</small></div></div>
          <div class="chart" id="chRec${i}" data-id="${u.esc(j.ID)}" style="margin-top:12px"></div>
          <div class="recm">${lista.slice().reverse().map(m => `<div class="mrow2"><span>${u.cap(u.nomeMes(m))}${m.slice(0, 4) !== m0.slice(0, 4) ? ' ' + m.slice(0, 4) : ''}</span><b class="num ${g[m] ? '' : 'c-muted'}">${g[m] ? u.brl(g[m]) : '—'}</b></div>`).join('')}</div></div>`;
      }).join('') : `<div class="panel">${vazio(['refresh-cw', '#c9a7ff', '#7a35e6'], 'Nenhum cliente recorrente ainda. Abra um trabalho e toque em “Recorrente”.')}</div>`}
      <p class="aviso">Cliente recorrente é quem te paga todo mês (social media, pacote de vídeos). Ele não fica no quadro; aqui aparece quanto rendeu em cada mês, somando as entradas com o nome dele.</p></section>`;
  }
  /* balanço da Darzan: trabalhos por mês e no ano, faturamento e clientes */
  function balanco() {
    const anos = c.anosDarzan(), ano = anos.includes(ui.jano) ? ui.jano : anos[anos.length - 1] || u.hoje().slice(0, 4), ms = c.balancoDarzan(ano);
    const jobs = ms.flatMap(x => x.jobs), fat = u.sum(ms, x => x.fat), rec = u.sum(ms, x => x.rec), vt = u.sum(jobs, j => c.num(j['VALOR TOTAL'])), comValor = jobs.filter(j => c.num(j['VALOR TOTAL'])).length;
    const melhor = ms.slice().sort((a, b) => b.fat - a.fat)[0];
    return `${anos.length > 1 ? `<div class="sec chips">${anos.map(a => `<button class="chip" type="button" data-a="seg" data-s="jano" data-v="${u.esc(a)}" aria-pressed="${a === ano}">${a}</button>`).join('')}</div>` : ''}
      <section class="sec"><div class="kpis k4"><div class="kpi"><span>Trabalhos em ${ano}</span><b class="num">${jobs.length}</b><small>eventos que aconteceram</small></div><div class="kpi"><span>Faturou em ${ano}</span><b class="num c-in">${u.k0(fat)}</b><small>tudo da Darzan</small></div><div class="kpi"><span>Dos recorrentes</span><b class="num">${u.k0(rec)}</b><small>${fat ? u.pct(rec / fat) + ' do total' : '—'}</small></div><div class="kpi"><span>Valor médio</span><b class="num">${u.k0(comValor ? vt / comValor : 0)}</b><small>por trabalho fechado</small></div></div></section>
      <section class="sec"><div class="panel"><div class="sec-h"><h2>${u.svg('chart-column')}Quanto entrou por mês</h2></div><div class="lgd">${BAL_COR.map(([, n, cor]) => `<span><i style="background:var(${cor})"></i>${n}</span>`).join('')}</div><div class="chart" id="chBal" data-ano="${u.esc(ano)}"></div>${melhor && melhor.fat ? `<p class="c-muted" style="font-size:.84rem;margin:8px 2px 0">Melhor mês: ${u.nomeMes(melhor.m).toLowerCase()}, com ${u.k0(melhor.fat)}.</p>` : ''}</div></section>
      <section class="sec"><div class="sec-h"><h2>${u.svg('calendar-days')}Mês a mês</h2></div>
        ${ms.slice().reverse().filter(x => x.fat || x.jobs.length).map(x => `<div class="panel balm"><div class="mrow2"><b>${u.cap(u.nomeMes(x.m))}</b><b class="num c-in">${u.brl(x.fat)}</b></div><div class="c-muted" style="font-size:.8rem;margin-bottom:${x.jobs.length ? 8 : 0}px">${x.jobs.length} ${x.jobs.length === 1 ? 'trabalho' : 'trabalhos'}${x.rec ? ` · ${u.k0(x.rec)} dos recorrentes` : ''}</div>${x.jobs.map(j => `<button type="button" class="balj" data-a="editJ" data-id="${u.esc(j.ID)}"><span>${u.dm(String(j['DATA DO EVENTO']))}</span><b>${u.esc(j['CLIENTE'])}</b><small>${u.esc(j['TIPO DE EVENTO'] || '')}${c.num(j['VALOR TOTAL']) ? ' · ' + u.k0(c.num(j['VALOR TOTAL'])) : ''}</small></button>`).join('')}</div>`).join('') || `<div class="panel">${vazio(['calendar-days', '#9cc6ff', '#2a62e0'], 'Nada neste ano ainda.')}</div>`}</section>`;
  }
  DEPOIS.trabalhos = () => {
    const b = $('chBal');
    if (b) colunas('chBal', c.balancoDarzan(b.dataset.ano).map(x => ({ l: u.CURTO[+x.m.slice(5) - 1], parts: BAL_COR.map(([k, n, cor]) => ({ k: n, v: Math.max(x[k], 0), c: cor })) })));
    document.querySelectorAll('#view [id^=chRec]').forEach(el => {
      const j = db.achar('TRABALHOS', el.dataset.id), g = c.ganhosPorMes(j), m0 = u.mes(u.hoje()), ms = [];
      for (let m = Object.keys(g).sort()[0] || m0; m <= m0; m = u.addMes(m, 1)) ms.push(m);
      colunas(el.id, ms.slice(-12).map(m => ({ l: u.CURTO[+m.slice(5) - 1], parts: [{ k: 'Recebido', v: g[m] || 0, c: '--clt-bon' }] })));
    });
    /* no celular o gráfico rola para o lado: começa mostrando os meses mais novos */
    document.querySelectorAll('#view #chBal, #view [id^=chRec]').forEach(el => { el.scrollLeft = el.scrollWidth; });
  };
  /* arrastar cartões entre as colunas: no celular segura ~0,3s e arrasta; no computador é só arrastar */
  (() => {
    let s = null, engole = false;
    const limpa = () => { if (!s) return; clearTimeout(s.t); cancelAnimationFrame(s.raf); if (s.fant) s.fant.remove(); s.card.classList.remove('arrastando'); const bd = s.card.closest('.board'); if (bd) bd.classList.remove('arrastando'); document.querySelectorAll('.board .col.alvo').forEach(x => x.classList.remove('alvo')); s = null; };
    const segue = () => {
      s.fant.style.transform = `translate(${s.x - s.dx}px,${s.y - s.dy}px) rotate(2deg)`;
      /* a coluna é escolhida pela posição na horizontal: dá para soltar em qualquer altura, mesmo com a coluna curta */
      const bd = s.card.closest('.board'), b = bd && bd.getBoundingClientRect(), dentro = b && s.y >= b.top - 60 && s.y <= Math.max(b.bottom, innerHeight - 90);
      let col = null, perto = Infinity;
      if (dentro) document.querySelectorAll('#view .board .col').forEach(x => { const r = x.getBoundingClientRect(), d = s.x < r.left ? r.left - s.x : s.x > r.right ? s.x - r.right : 0; if (d < perto && d < 40) { perto = d; col = x; } });
      document.querySelectorAll('#view .board .col').forEach(x => x.classList.toggle('alvo', x === col && x.dataset.etapa !== s.de));
      s.alvo = col;
    };
    const comeca = () => {
      const r = s.card.getBoundingClientRect(), bd = s.card.closest('.board');
      s.on = true; s.dx = s.x - r.left; s.dy = s.y - r.top;
      s.fant = s.card.cloneNode(true); s.fant.classList.add('fantasma'); s.fant.style.width = r.width + 'px'; s.fant.removeAttribute('data-a');
      document.body.appendChild(s.fant); s.card.classList.add('arrastando'); bd.classList.add('arrastando'); segue();
      if (navigator.vibrate) navigator.vibrate(12);
      const rola = () => { if (!s) return; const b = bd.getBoundingClientRect(); if (s.x < b.left + 40) bd.scrollLeft -= 14; else if (s.x > b.right - 40) bd.scrollLeft += 14; if (s.y < 80) scrollBy(0, -12); else if (s.y > innerHeight - 120) scrollBy(0, 12); segue(); s.raf = requestAnimationFrame(rola); };
      s.raf = requestAnimationFrame(rola);
    };
    document.addEventListener('pointerdown', e => {
      const card = e.target.closest('#view .board .job'); if (!card || (e.pointerType === 'mouse' && e.button !== 0)) return;
      limpa();
      s = { card, id: card.dataset.id, de: card.closest('.col').dataset.etapa, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, on: false, toque: e.pointerType !== 'mouse' };
      if (s.toque) s.t = setTimeout(() => { if (s && !s.on) comeca(); }, 300);
    });
    document.addEventListener('pointermove', e => {
      if (!s) return;
      s.x = e.clientX; s.y = e.clientY;
      if (!s.on) { const d = Math.hypot(s.x - s.x0, s.y - s.y0); if (s.toque) { if (d > 10) limpa(); } else if (d > 6) comeca(); return; }
      e.preventDefault(); segue();
    });
    document.addEventListener('touchmove', e => { if (s && s.on) e.preventDefault(); }, { passive: false });
    document.addEventListener('pointerup', () => {
      if (!s) return;
      if (!s.on) { limpa(); return; }
      const alvo = s.alvo && s.alvo.dataset.etapa, id = s.id, de = s.de;
      engole = true; setTimeout(() => { engole = false; }, 400); limpa();
      if (alvo && alvo !== de) moverJob(id, alvo);
    });
    document.addEventListener('pointercancel', () => limpa());
    document.addEventListener('contextmenu', e => { if (s) e.preventDefault(); });
    document.addEventListener('click', e => { if (engole && e.target.closest('#view .board')) { e.stopPropagation(); e.preventDefault(); engole = false; } }, true);
  })();


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
      <section class="sec"><div class="eqs">${lista.map(e => { const f = c.fotoEquip(e), fp = c.faltaPagar(e), s = ICON_EQ[e['TIPO']] || ICON_EQ['Acessório']; return `<button type="button" class="eq" data-a="editE" data-id="${u.esc(e.ID)}"><div class="ph">${f ? `<img src="${u.esc(u.dadoSeguro(f))}" alt="" loading="lazy">` : `<div class="art" style="--a:${s[1]};--b:${s[2]};height:100%">${u.svg(s[0])}</div>`}</div>${fp ? `<span class="st pd">falta ${u.k0(fp)}</span>` : '<span class="st ok">Quitado</span>'}<div class="t">${u.esc(e['NOME'])}</div><div class="m">${u.esc(e['TIPO'] || '')}${e['ESTADO'] ? ' · ' + u.esc(e['ESTADO']) : ''}</div><div class="v num">${u.brl(c.num(e['VALOR']))}</div><div class="m">${u.esc(e['COMO PAGOU'] || '')}</div></button>`; }).join('') || vazio(['camera', '#8fb6ff', '#2148d6'], 'Nenhum equipamento cadastrado.')}</div></section>`;
  };

  /* ================= FINANÇAS ================= */
  R.fin = () => {
    const s = seg('fseg', ui.fseg, [['extrato', 'Extrato'], ['revisar', 'Revisar'], ['bancos', 'Bancos'], ['cartoes', 'Cartões'], ['fixas', 'Contas fixas'], ['metas', 'Metas'], ['relatorios', 'Relatórios']]);
    return bar('Finanças', null, !['bancos', 'metas', 'revisar', 'fixas'].includes(ui.fseg)) + `<div class="fin">${s}</div>` + (FIN[ui.fseg] || FIN.extrato)();
  };
  const FIN = {};
  FIN.extrato = () => {
    const r = c.resumo(ui.mes), q = u.sem(ui.q), F = ui.filtro;
    const L = r.L.filter(l => (F === 'tudo' || (F === 'entradas' && l.grupo === 'Renda') || (F === 'saidas' && c.ehGasto(l)) || (F === 'cartao' && l.tipo === 'cartão') || (F === 'previstos' && l.status === 'Previsto') || (F.startsWith('cat:') && l.cat === F.slice(4))) && (!q || u.sem(l.desc + ' ' + l.cat + ' ' + l.sub + ' ' + l.banco).indexOf(q) >= 0));
    let html = '', dia = null, futuro = false;
    c.ordenar(L).forEach(l => { if (!futuro && l.data > u.hoje() && ui.mes <= u.mes(u.hoje())) { futuro = true; html += `<div class="day day-fut">${u.svg('calendar-clock')}Ainda vai acontecer</div>`; }
      if (l.data !== dia) { dia = l.data; const q = u.quando(l.data), sem = new Date(l.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' }); html += `<div class="day">${/^(Hoje|Ontem|Amanhã)$/.test(q) ? q : sem} · ${u.ddmmaa(l.data)}</div>`; } html += linhaL(l); });
    const chips = [['tudo', 'Tudo'], ['entradas', 'Entradas'], ['saidas', 'Saídas'], ['cartao', 'Cartão'], ['previstos', 'Previstos']].concat(F.startsWith('cat:') ? [[F, F.slice(4)]] : []);
    return `<section class="sec"><div class="kpis k4"><div class="kpi"><span>Entrou</span><b class="num c-in">${u.brl(r.entr)}</b>${r.aReceber ? `<small>+ ${u.brl(r.aReceber)} a receber (ainda não entrou)</small>` : ''}</div><div class="kpi"><span>Saiu</span><b class="num c-out">${u.brl(r.saiu)}</b></div><div class="kpi"><span>Guardou</span><b class="num c-sav">${u.brl(r.guardou)}</b></div><div class="kpi"><span>Sobrou</span><b class="num">${u.brl(r.sobra)}</b></div></div></section>
      <div class="sec" style="display:grid;gap:12px"><input class="search" id="busca" type="search" placeholder="Buscar: gasolina, cliente, iFood…" value="${u.esc(ui.q)}" aria-label="Buscar"><div class="chips">${chips.map(([k, n]) => `<button class="chip" type="button" data-a="seg" data-s="filtro" data-v="${u.esc(k)}" aria-pressed="${F === k}">${u.esc(n)}</button>`).join('')}</div></div>
      <div class="panel" style="margin-top:14px;padding:4px 10px 10px">${html || vazio(['search', '#9cc6ff', '#2a62e0'], 'Nada encontrado neste mês.')}</div>`;
  };
  FIN.bancos = () => {
    const tot = c.totalBancos(), falta = c.semSaldo();
    return `<section class="sec"><div class="sub">Dinheiro nos bancos</div><div class="bignum num" data-cnt="${tot}" data-fmt="big">${u.big(tot)}</div>${falta ? `<p class="c-warn" style="font-size:.84rem;margin:6px 0 0">● Falta informar ${falta} saldo${falta > 1 ? 's' : ''}. Toque em “Conferir saldo”.</p>` : ''}</section>
      <div class="sec"><button type="button" class="btn2" data-a="transferir">${u.svg('arrow-left-right')}Transferir entre minhas contas</button></div>
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
  /* ---------- revisar: consertar vários lançamentos de uma vez ---------- */
  /* o que aparece na lista do Revisar (com o filtro digitado) */
  const listaRevisar = () => { const q = u.sem(ui.rvq); return c.paraRevisar(ui.rvfil).filter(l => !q || u.sem(l.desc + ' ' + l.cat + ' ' + l.sub + ' ' + l.banco).indexOf(q) >= 0).sort((a, b) => a.data < b.data ? 1 : a.data > b.data ? -1 : 0); };
  FIN.revisar = () => {
    const K = ui.rvfil, mem = c.memoria();
    const L = listaRevisar();
    const ids = new Set(c.lancs().map(l => l.id));
    [...ui.rvsel].forEach(id => { if (!ids.has(id)) ui.rvsel.delete(id); });
    const sel = ui.rvsel.size, todosVis = L.length && L.every(l => ui.rvsel.has(l.id));
    const chips = Object.entries(c.REVISAR).map(([k, x]) => `<button class="chip" type="button" data-a="seg" data-s="rvfil" data-v="${u.esc(k)}" aria-pressed="${K === k}">${x.nome} · ${c.paraRevisar(k).length}</button>`).join('');
    let html = '', mes = null;
    L.forEach(l => {
      const m = u.mes(l.data);
      if (m !== mes) { mes = m; const doMes = L.filter(x => u.mes(x.data) === m), tudo = doMes.every(x => ui.rvsel.has(x.id)); html += `<div class="rv-mes"><span>${u.nomeMes(m)} ${m.slice(0, 4)} · ${doMes.length}</span><button type="button" class="more" data-a="rvMes" data-v="${u.esc(m)}">${tudo ? 'Desmarcar o mês' : 'Marcar o mês'}</button></div>`; }
      const sug = K === 'categoria' ? c.sugerir(l.desc, mem) : null, on = ui.rvsel.has(l.id);
      html += `<div class="rv ${on ? 'on' : ''}"><button type="button" class="rv-ck" data-a="rvMarca" data-id="${u.esc(l.id)}" aria-pressed="${on}" aria-label="Marcar ${u.esc(l.desc)}">${u.svg('check')}</button>
        <button type="button" class="rv-txt" data-a="rvMarca" data-id="${u.esc(l.id)}"><span class="t">${u.esc(u.cap(l.desc))}</span><span class="m">${u.dm(l.data)} · ${u.esc(l.banco || 'sem banco')}${l.tipo === 'cartão' ? ' (cartão)' : ''} · ${u.esc(l.sub || l.cat || 'sem categoria')}</span>${sug ? `<span class="sug">${u.svg('sparkles')}Sugestão: ${u.esc(sug.cat)} · ${u.esc(sug.sub)}</span>` : ''}</button>
        <span class="v num ${l.grupo === 'Renda' ? 'c-in' : ''}">${u.brl(Math.abs(l.valor))}</span>
        <button type="button" class="rv-ed" data-a="editL" data-id="${u.esc(l.id)}" aria-label="Editar">${u.svg('pencil')}</button></div>`;
    });
    const comSug = K === 'categoria' ? [...ui.rvsel].filter(id => { const l = c.lancs().find(x => x.id === id); return l && c.sugerir(l.desc, mem); }).length : 0;
    return `<section class="sec rvwrap">
      <p class="c-muted" style="margin:0 0 12px;font-size:.88rem">Marque os lançamentos e conserte todos de uma vez. Toque no lápis para mudar só um.</p>
      <div class="chips">${chips}</div>
      <div class="rv-topo"><input class="search" id="rvBusca" type="search" placeholder="Filtrar: uber, gasolina, cliente…" value="${u.esc(ui.rvq)}" aria-label="Filtrar"><button type="button" class="chip" data-a="rvTodos">${todosVis ? 'Desmarcar todos' : `Marcar todos (${L.length})`}</button></div>
      <div class="panel rvlista">${html || vazio(['circle-check', '#7cf0c0', '#068a5a'], K === 'banco' ? 'Todos os lançamentos têm banco.' : K === 'categoria' ? 'Todos têm categoria.' : 'Nada para conferir.')}</div>
      <div class="rv-barra" ${sel ? '' : 'hidden'}><b>${sel} marcado${sel > 1 ? 's' : ''}</b>${comSug ? `<button type="button" class="btn2" data-a="rvSugestoes">${u.svg('sparkles')}Usar sugestões (${comSug})</button>` : ''}<button type="button" class="btn2 pri" data-a="rvMudar">${u.svg('pencil')}Mudar</button></div>
    </section>`;
  };
  DEPOIS.revisar = () => { const b = $('rvBusca'); if (b) b.addEventListener('input', () => { ui.rvq = b.value; const pos = b.selectionStart; render(false); const n = $('rvBusca'); n.focus(); n.setSelectionRange(pos, pos); }); };
  /* aplica as mudanças em vários lançamentos; devolve o "desfazer" */
  function mudarVarios(ids, mud) {
    const antes = [], ops = [];
    ids.forEach(id => {
      const r = db.achar('EXTRATO', id); if (!r) return;
      const reg = { ID: id };
      if (mud.banco) reg['BANCO'] = mud.banco;
      if (mud.cat) {
        reg['CATEGORIA'] = mud.cat; reg['SUB-CATEGORIA'] = mud.sub || '';
        const g = mud.grupo || c.grupoDe(mud.cat);
        if (['Necessidades', 'Desejos'].includes(r['GRUPO']) && ['Necessidades', 'Desejos'].includes(g)) reg['GRUPO'] = g;
      }
      if (mud.conferido) reg['OBS'] = String(r['OBS'] || '').replace(/\s*·?\s*conferir[^·]*/ig, '').replace(/^\s*·\s*/, '').trim();
      antes.push(Object.fromEntries(Object.keys(reg).map(k => [k, r[k]])));
      ops.push({ op: 'salvar', aba: 'EXTRATO', registro: reg });
    });
    if (ops.length) db.lote(ops);
    return () => { db.lote(antes.map(r => ({ op: 'salvar', aba: 'EXTRATO', registro: r }))); render(false); };
  }
  function formMudar() {
    const ids = [...ui.rvsel], n = ids.length;
    const cats = c.listaCats();
    abrir(`<h3 style="margin:0 0 4px">Mudar ${n} lançamento${n > 1 ? 's' : ''}</h3><p class="c-muted" style="margin:0 0 6px;font-size:.88rem">Deixe em “Não mudar” o que deve ficar como está.</p>
      ${campo('Banco', `<select class="txt" id="mB">${opts([['', 'Não mudar']].concat(c.BANCOS.filter(b => b !== 'Não informado')), '')}</select>`)}
      <div class="grid2">${campo('Categoria', `<select class="txt" id="mC">${opts([['', 'Não mudar']].concat(cats), '')}</select>`)}${campo('Sub-categoria', `<select class="txt" id="mS"><option value="">—</option></select>`)}</div>
      ${ui.rvfil === 'conferir' ? `<div class="checkline"><input type="checkbox" id="mOk" checked><label for="mOk">Marcar como conferido</label></div>` : ''}
      <button class="save" type="submit">Mudar ${n}</button>`,
      () => {
        const mud = { banco: val('mB'), cat: val('mC'), sub: val('mS'), conferido: !!($('mOk') && $('mOk').checked) };
        if (!mud.banco && !mud.cat && !mud.conferido) { toast('Escolha o que mudar'); return false; }
        const desfazer = mudarVarios(ids, mud);
        ui.rvsel.clear(); fechar(); render(false);
        toast(`${n} lançamento${n > 1 ? 's' : ''} mudado${n > 1 ? 's' : ''}`, desfazer);
      });
    $('mC').addEventListener('change', () => { $('mS').innerHTML = $('mC').value ? opts(c.subsDe($('mC').value), '') : '<option value="">—</option>'; });
  }

  /* contas fixas: o que sai todo mês (assinaturas, seguro…), quanto dá por mês e por ano, e se já saiu neste mês */
  const COMO = { 'cartão': 'no cartão', 'débito': 'débito automático', 'conta': 'pagar na mão', 'anual': 'paga 1 vez por ano', 'parcelado': 'parcelado no cartão' };
  FIN.fixas = () => {
    const m0 = u.mes(u.hoje()), fs = c.fixas().sort((a, b) => (c.fixaAtiva(b) - c.fixaAtiva(a)) || (c.fixaMensal(b) - c.fixaMensal(a)));
    const on = fs.filter(c.fixaAtiva), mes = c.totalFixas();
    const linha = f => {
      const t = c.fixaTipo(f), l = c.fixaNoMes(f, m0), ativa = c.fixaAtiva(f), dia = parseInt(f['DIA'], 10);
      const estado = !ativa ? '<span class="prev">desligada</span>' : t === 'anual' ? '' : l ? (c.paga(l) || l.tipo === 'cartão' ? '<span class="okc">saiu este mês ✓</span>' : '<span class="prev">previsto</span>') : '';
      const meta = [COMO[t], f['BANCO'] && f['BANCO'] !== 'Não informado' ? f['BANCO'] : '', dia ? 'dia ' + dia : ''].filter(Boolean).map(x => `<span>${u.esc(x)}</span>`).join('<span>·</span>');
      return `<button type="button" class="it btn${ativa ? '' : ' off'}" data-a="editF" data-id="${u.esc(f.ID)}">${u.ti(c.icone(f['CATEGORIA'], f['SUB-CATEGORIA']))}<div style="min-width:0"><div class="t">${u.esc(f['DESCRIÇÃO'])}</div><div class="m">${meta}${estado}</div>${f['OBS'] ? `<div class="m">${u.esc(f['OBS'])}</div>` : ''}</div><div class="v num">${u.brl(c.fixaMensal(f))}<small>${t === 'anual' ? `/mês · ${u.brl(Math.abs(c.num(f['VALOR'])))} no ano` : '/mês'}</small></div></button>`;
    };
    return `<section class="sec"><div class="kpis"><div class="kpi"><span>Por mês</span><b class="num c-out">${u.brl(mes)}</b></div><div class="kpi"><span>Por ano</span><b class="num">${u.brl(mes * 12)}</b></div></div></section>
      <section class="sec"><div class="sec-h"><h2>${u.svg('calendar-clock')}Contas fixas · ${on.length}</h2><button class="chip" type="button" data-a="novoF">${u.svg('plus')} Nova conta fixa</button></div>
      <div class="panel" style="padding:4px 10px 10px">${fs.map(linha).join('') || vazio(['calendar-clock', '#9cc6ff', '#2a62e0'], 'Nenhuma conta fixa ainda.')}</div>
      <p class="aviso">O que é "no cartão", "débito automático" ou "pagar na mão" entra sozinho como lançamento todo mês. "Paga 1 vez por ano" conta dividido por 12 aqui, e "parcelado no cartão" já vem das parcelas da fatura.</p></section>`;
  };
  function formFixa(f) {
    const cats = c.listaCats().filter(k => !['Renda', 'Guardado', 'Transferência', 'Reembolso'].includes(c.grupoDe(k))), cat0 = f ? f['CATEGORIA'] : 'Assinaturas';
    const tipos = [['cartão', 'No cartão de crédito'], ['débito automático', 'Débito automático'], ['conta', 'Pagar na mão (Pix/boleto)'], ['anual', 'Paga 1 vez por ano'], ['parcelado', 'Parcelado no cartão']];
    const onde = c.BANCOS.filter(b => b !== 'Não informado'), t0 = f ? (c.fixaTipo(f) === 'débito' ? 'débito automático' : c.fixaTipo(f)) : 'cartão';
    abrir(`<h3 style="margin:0 0 12px">${f ? 'Editar conta fixa' : 'Nova conta fixa'}</h3>
      ${campo('O que é', `<input class="txt" id="xD" required value="${u.esc(f ? f['DESCRIÇÃO'] : '')}" placeholder="Ex.: Netflix, seguro do carro">`)}
      <div class="grid2">${campo(t0 === 'anual' ? 'Valor no ano' : 'Valor', `<input class="txt num" id="xV" inputmode="decimal" value="${u.esc(f ? String(Math.abs(c.num(f['VALOR']))).replace('.', ',') : '')}" placeholder="R$ 0,00">`)}${campo('Dia que cobra', `<input class="txt num" id="xDia" inputmode="numeric" value="${u.esc(f ? f['DIA'] || '' : '')}" placeholder="ex.: 15">`)}</div>
      <div class="grid2">${campo('Como paga', `<select class="txt" id="xT">${opts(tipos, t0)}</select>`)}${campo('Banco ou cartão', `<select class="txt" id="xB">${opts(onde, f ? f['BANCO'] : 'Inter')}</select>`)}</div>
      <div class="grid2">${campo('Categoria', `<select class="txt" id="xC">${opts(cats, cat0)}</select>`)}${campo('Sub-categoria', `<select class="txt" id="xS">${opts(c.subsDe(cat0), f ? f['SUB-CATEGORIA'] : '')}</select>`)}</div>
      <div class="checkline"><input type="checkbox" id="xA" ${!f || c.fixaAtiva(f) ? 'checked' : ''}><label for="xA">Ativa (ainda pago)</label></div>
      ${campo('Anotação', `<input class="txt" id="xO" value="${u.esc(f ? f['OBS'] || '' : '')}" placeholder="opcional, ex.: promoção até nov/2027">`)}
      ${f ? `<div class="acoes"><button type="button" class="btn2 perigo" data-a="apagarF" data-id="${u.esc(f.ID)}">${u.svg('trash-2')}Excluir</button><button class="save" type="submit">Salvar</button></div>` : '<button class="save" type="submit">Criar conta fixa</button>'}`,
      () => {
        const d = val('xD').trim(), v = u.num(val('xV')); if (!d) return false;
        if (!(v > 0)) { toast('Digite o valor, por exemplo 19,90'); return false; }
        const cat = val('xC');
        db.salvar('FIXAS', Object.assign(f ? { ID: f.ID } : {}, { 'DESCRIÇÃO': d, 'VALOR': v, 'DIA': parseInt(val('xDia'), 10) || '', 'BANCO': val('xB'), 'TIPO': val('xT'), 'GRUPO': c.grupoDe(cat) === 'Necessidades' ? 'Necessidades' : 'Desejos', 'CATEGORIA': cat, 'SUB-CATEGORIA': val('xS'), 'ATIVA': $('xA').checked ? 'Sim' : 'Não', 'OBS': val('xO').trim() }));
        db.garantirFixas(); fechar(); render(false); toast('Conta fixa salva');
      });
    $('xC').addEventListener('change', () => { $('xS').innerHTML = opts(c.subsDe(val('xC')), ''); });
    $('xT').addEventListener('change', () => { const l = $('xV').closest('.campo').querySelector('label'); l.textContent = val('xT') === 'anual' ? 'Valor no ano' : 'Valor'; });
  }
  FIN.metas = () => {
    const gs = db.linhas('METAS').filter(g => g['META']);
    const tem = g => { const cx = g['ONDE ESTÁ'] && c.caixinhas().find(x => u.sem(x['CONTA']).trim() === u.sem(g['ONDE ESTÁ']).trim()); return cx ? (c.saldo(cx) || 0) : c.num(g['JÁ GUARDADO']); };
    return `<section class="sec"><div class="sec-h"><h2>${u.svg('target')}Minhas metas</h2><button class="chip" type="button" data-a="novoM">${u.svg('plus')} Nova meta</button></div>
      <div class="goals">${gs.map(g => { const alvo = c.num(g['VALOR ALVO']) || 1, t = tem(g), p = t / alvo; return `<button type="button" class="goal" data-a="editM" data-id="${u.esc(g.ID)}"><div class="top">${u.ti(['target', '#9cc6ff', '#2a62e0'], 'lg')}<div class="gring">${anel(p, 52, 5, '#8fb0ff')}<b class="num">${u.pct(p)}</b></div></div><div><div class="t">${u.esc(g['META'])}</div><div class="m num">${u.k0(t)} de ${u.k0(alvo)}</div></div><div class="m">${g['ONDE ESTÁ'] ? 'Em: ' + u.esc(g['ONDE ESTÁ']) : 'Toque para editar'}${g['PRAZO'] ? ' · até ' + u.dm(String(g['PRAZO'])) : ''}</div></button>`; }).join('') || vazio(['target', '#9cc6ff', '#2a62e0'], 'Nenhuma meta ainda.')}</div>
      <p class="aviso">Se em “Onde está” você escrever o nome de uma caixinha (ex.: “Caixinha Reserva”), o app usa o saldo dela como “já guardado”.</p></section>`;
  };
  FIN.relatorios = () => {
    const s = seg('rseg', ui.rseg, [['mes', 'Mês'], ['ano', 'Ano'], ['darzan', 'Darzan'], ['jpl', 'JPL SOM'], ['clt', 'Meu trabalho']]);
    return `<div class="sec">${s}</div>` + (REL[ui.rseg] || REL.mes)();
  };
  const REL = {};
  REL.mes = () => {
    const r = c.resumo(ui.mes), mm = u.nomeMes(ui.mes).toLowerCase(), mg = c.media(x => x.saiu, ui.mes);
    return `<section class="sec"><div class="panel insight story"><span class="eyebrow">${u.nomeMes(ui.mes)} em poucas palavras</span>
        <p style="margin-top:10px">Entraram <b class="num">${u.brl(r.entr)}</b>: ${u.k0(r.fonte['Salário CLT'])} do salário, ${u.k0(r.fonte['Darzan Produções'])} da Darzan e ${u.k0(r.fonte['JPL SOM'])} da JPL SOM.</p>
        <p>Saíram <b class="num">${u.brl(r.saiu)}</b>${mg ? `, ${r.saiu > mg ? u.pct(r.saiu / mg - 1) + ' a mais' : u.pct(1 - r.saiu / mg) + ' a menos'} que a sua média` : ''}. Você guardou <b class="num">${u.k0(r.guardou)}</b> e ${r.sobra >= 0 ? 'sobraram' : 'faltaram'} <b class="num">${u.brl(Math.abs(r.sobra))}</b>.</p></div></section>
      <div class="two"><section class="sec"><div class="sec-h"><h2>O que dá pra melhorar</h2></div><ol class="tips">${c.dicas(ui.mes).slice(0, 4).map((d, n) => `<li><span class="n">${n + 1}</span><div><b>${u.esc(d.t)}</b><span class="s">${d.s}</span></div></li>`).join('')}</ol></section>
      <section class="sec"><div class="sec-h"><h2>Para onde foi</h2></div><div class="panel">${r.cats.length ? ondeFoi(r) : vazio(['shopping-bag', '#c2a8ff', '#6b34e0'], 'Nenhum gasto em ' + mm + '.')}</div></section></div>`;
  };
  REL.ano = () => {
    const ms = c.mesesPassados().concat(c.doMes(u.mes(u.hoje())).length ? [u.mes(u.hoje())] : []);
    const rs = ms.map(c.resumo), E = u.sum(rs, r => r.entr), G = u.sum(rs, r => r.saiu), S = u.sum(rs, r => r.guardou);
    return `<section class="sec"><div class="sub">Sobrou desde ${ms[0] ? u.nomeMes(ms[0]).toLowerCase() : ''}</div><div class="bignum num">${u.big(E - G - S)}</div>
      <div class="kpis k4" style="margin-top:16px"><div class="kpi"><span>Entrou</span><b class="num c-in">${u.k0(E)}</b></div><div class="kpi"><span>Saiu</span><b class="num c-out">${u.k0(G)}</b></div><div class="kpi"><span>Guardou</span><b class="num c-sav">${u.k0(S)}</b><small>${u.pct(E ? S / E : 0)} da renda</small></div><div class="kpi"><span>Meses</span><b class="num">${ms.length}</b></div></div></section>
      <section class="sec"><div class="sec-h"><h2>Entrou e saiu, mês a mês</h2></div><div class="panel"><div class="lgd">${Object.entries(c.FONTES).map(([k, v]) => `<span><i style="background:var(${v})"></i>${k}</span>`).join('')}<span><i class="ln"></i>Quanto saiu</span></div><div class="chart" id="chAno"></div></div></section>
      <section class="sec"><div class="panel tbl"><table><thead><tr><th>Mês</th><th>Entrou</th><th>Saiu</th><th>Guardou</th><th>Sobrou</th></tr></thead><tbody>${rs.map(r => `<tr><td>${u.nomeMes(r.m)}</td><td class="num">${u.k0(r.entr)}</td><td class="num">${u.k0(r.saiu)}</td><td class="num">${u.k0(r.guardou)}</td><td class="num ${r.sobra < 0 ? 'c-out' : ''}">${u.k0(r.sobra)}</td></tr>`).join('')}</tbody><tfoot><tr><td>Total</td><td class="num">${u.k0(E)}</td><td class="num">${u.k0(G)}</td><td class="num">${u.k0(S)}</td><td class="num">${u.k0(E - G - S)}</td></tr></tfoot></table></div></section>`;
  };
  const relFonte = (nome) => () => {
    const ms = c.mesesPassados().concat([u.mes(u.hoje())]), rs = ms.map(c.resumo), ano = u.sum(rs, r => r.fonte[nome]);
    const doMes = c.resumo(ui.mes).ent.filter(l => l.cat === nome).sort((a, b) => a.data < b.data ? 1 : -1);
    return `<section class="sec"><div style="display:flex;gap:14px;align-items:center">${u.ti(c.icone(nome), 'xl')}<div><div class="sub">${nome} em ${u.nomeMes(ui.mes).toLowerCase()}</div><div class="bignum num">${u.big(c.resumo(ui.mes).fonte[nome])}</div></div></div>
      <div class="kpis" style="margin-top:16px"><div class="kpi"><span>No ano</span><b class="num">${u.k0(ano)}</b></div><div class="kpi"><span>Média por mês</span><b class="num">${u.k0(ms.length ? ano / ms.length : 0)}</b></div></div></section>
      <section class="sec"><div class="sec-h"><h2>Mês a mês</h2></div><div class="panel"><div class="chart" id="chFonte" data-fonte="${u.esc(nome)}"></div></div></section>
      <section class="sec"><div class="sec-h"><h2>Entradas do mês</h2></div><div class="panel" style="padding:6px 10px">${doMes.map(linhaL).join('') || vazio(c.icone(nome), 'Nada neste mês.')}</div></section>`;
  };
  /* meu trabalho (CLT): quanto entrou de cada holerite, o que mudou e o que a empresa guardou de FGTS */
  const CLT_COR = [['sal', 'Salário e horas extras', '--clt-sal'], ['ben', 'Vale-transporte e refeição', '--clt-ben'], ['bon', 'Bonificação', '--clt-bon']];
  REL.clt = () => {
    const ps = c.clt(); if (!ps.length) return vazio(['briefcase', '#9cc6ff', '#2a62e0'], 'Nenhum salário CLT lançado ainda.');
    const ult = ps[ps.length - 1], tot = u.sum(ps, p => p.liq), fgts = u.sum(ps, p => p.fgts || 0), inss = u.sum(ps, p => p.inss || 0);
    const nomeComp = p => p.comp ? u.cap(p.comp.replace('/', ' de ')) : 'pago em ' + u.nomeMes(p.m).toLowerCase();
    const dest = [];
    const bases = ps.filter(p => p.base);
    for (let i = 1; i < bases.length; i++) if (bases[i].base > bases[i - 1].base) dest.push(['trending-up', `<b>Aumento de salário</b> em ${nomeComp(bases[i]).toLowerCase()}: de ${u.k0(bases[i - 1].base)} para ${u.k0(bases[i].base)} (+${u.pct(bases[i].base / bases[i - 1].base - 1)}).`]);
    const bons = ps.filter(p => p.bon > 0), hb = bons.filter(p => p.comp && p.bon > p.com).map(p => p.bon - p.com); /* a comparação só usa bônus de holerite, sem comissão */
    if (bons.length) dest.push(['award', `<b>Bonificação${bons.some(p => p.com) ? ' e comissão' : ''}</b> em ${bons.length} ${bons.length > 1 ? 'meses' : 'mês'}: ${u.k0(u.sum(bons, p => p.bon))} no total${hb.length > 1 ? `, de ${u.k0(hb[0])} para ${u.k0(hb[hb.length - 1])} nos holerites (${hb[hb.length - 1] >= hb[0] ? '+' : ''}${u.pct(hb[hb.length - 1] / hb[0] - 1)})` : ''}.`]);
    const hes = ps.filter(p => p.he > 0);
    if (hes.length) dest.push(['clock', `<b>Horas extras</b>: ${u.sum(hes, p => p.horas)} h em ${hes.length} ${hes.length > 1 ? 'meses' : 'mês'}, ${u.k0(u.sum(hes, p => p.he))} a mais no salário.`]);
    if (fgts) dest.push(['piggy-bank', `<b>FGTS</b>: a empresa já guardou ${u.k0(fgts)} para você (não entra na conta, fica no FGTS).`]);
    if (inss) dest.push(['receipt', `<b>INSS</b> descontado: ${u.k0(inss)} no total (conta para a sua aposentadoria).`]);
    const lista = ps.slice().reverse().map(p => `<div class="it"><span>${u.ti(['briefcase', '#9cc6ff', '#2a62e0'])}</span><div style="min-width:0"><div class="t">${nomeComp(p)}</div><div class="m">${[p.bruto ? 'bruto ' + u.k0(p.bruto) : '', p.inss ? 'INSS ' + u.k0(p.inss) : '', p.bon > p.com ? 'bônus ' + u.k0(p.bon - p.com) : '', p.com ? 'comissão ' + u.k0(p.com) : '', p.horas ? p.horas + ' h extras' : ''].filter(Boolean).map(x => `<span>${x}</span>`).join('<span>·</span>')}</div></div><div class="v num">${u.brl(p.liq)}<small>recebido ${u.dm(p.data)}</small></div></div>`).join('');
    return `<section class="sec"><div style="display:flex;gap:14px;align-items:center">${u.ti(['briefcase', '#9cc6ff', '#2a62e0'], 'xl')}<div><div class="sub">Último salário (${nomeComp(ult).toLowerCase()})</div><div class="bignum num">${u.big(ult.liq)}</div></div></div></section>
      <section class="sec"><div class="kpis"><div class="kpi"><span>Recebido no ano</span><b class="num">${u.brl(tot)}</b></div><div class="kpi"><span>Média por mês</span><b class="num">${u.brl(tot / ps.length)}</b></div>${fgts ? `<div class="kpi"><span>FGTS guardado</span><b class="num">${u.brl(fgts)}</b></div>` : ''}${ult.base ? `<div class="kpi"><span>Salário base</span><b class="num">${u.brl(ult.base)}</b></div>` : ''}</div></section>
      <section class="sec"><div class="sec-h"><h2>O que entrou de cada salário</h2></div><div class="panel"><div class="lgd">${CLT_COR.map(([, n, v]) => `<span><i style="background:var(${v})"></i>${n}</span>`).join('')}</div><div class="chart" id="chClt"></div></div></section>
      ${dest.length ? `<section class="sec"><div class="sec-h"><h2>${u.svg('sparkles')}Destaques</h2></div><div class="panel" style="display:grid;gap:12px">${dest.map(([i, t]) => `<div class="dest">${u.svg(i)}<span>${t}</span></div>`).join('')}</div></section>` : ''}
      <section class="sec"><div class="sec-h"><h2>Holerites</h2></div><div class="panel" style="padding:4px 10px 10px">${lista}</div></section>`;
  };
  REL.darzan = relFonte('Darzan Produções');
  REL.jpl = relFonte('JPL SOM');
  DEPOIS.fin = () => {
    if (ui.fseg === 'revisar') DEPOIS.revisar();
    if (ui.fseg === 'relatorios' && ui.rseg === 'ano') { const ms = c.mesesPassados().concat(c.doMes(u.mes(u.hoje())).length ? [u.mes(u.hoje())] : []); colunas('chAno', ms.map(m => { const r = c.resumo(m); return { l: u.CURTO[+m.slice(5) - 1], parts: Object.entries(c.FONTES).map(([k, v]) => ({ k, v: r.fonte[k], c: v })), line: { k: 'Saiu', v: r.saiu } }; })); }
    if ($('chClt')) colunas('chClt', c.clt().map(p => ({ l: u.CURTO[+p.m.slice(5) - 1], parts: CLT_COR.map(([k, n, v]) => ({ k: n, v: k === 'sal' ? p.sal + p.he : p[k], c: v })) })));
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
      s += `<text x="${cx}" y="${H - 8}" text-anchor="middle">${d.l}</text><rect class="hit" data-i="${u.esc(i)}" x="${pl + gap * i}" y="${pt}" width="${gap}" height="${ih}" rx="8" tabindex="0"/>`;
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
  /* escolher o mês direto (sem passar um por um): grade dos 12 meses de cada ano */
  function seletorMes(ano) {
    const ms = c.meses(), anos = [...new Set(ms.map(m => m.slice(0, 4)))].sort(), m0 = u.mes(u.hoje());
    ano = anos.includes(ano) ? ano : ui.mes.slice(0, 4);
    const i = anos.indexOf(ano);
    abrir(`<h3 style="margin:0 0 12px">Escolher o mês</h3>
      <div class="mpano"><button type="button" data-a="mpAno" data-v="${u.esc(anos[i - 1] || '')}" aria-label="Ano anterior" ${i <= 0 ? 'disabled' : ''}>${u.svg('chevron-left')}</button><b class="num">${u.esc(ano)}</b><button type="button" data-a="mpAno" data-v="${u.esc(anos[i + 1] || '')}" aria-label="Próximo ano" ${i >= anos.length - 1 ? 'disabled' : ''}>${u.svg('chevron-right')}</button></div>
      <div class="mpgrid">${u.CURTO.map((n, k) => { const m = `${ano}-${String(k + 1).padStart(2, '0')}`, tem = ms.includes(m);
        return `<button type="button" class="mpm${m === m0 ? ' hoje' : ''}" data-a="irMes" data-v="${m}" aria-pressed="${m === ui.mes}" aria-label="${u.esc(u.nomeMes(m))} de ${ano}" ${tem ? '' : 'disabled'}>${u.esc(n)}</button>`; }).join('')}</div>
      ${ui.mes !== m0 ? `<button type="button" class="btn2" data-a="irMes" data-v="${m0}" style="margin-top:14px;width:100%">${u.svg('calendar')}Voltar para ${u.esc(u.nomeMes(m0).toLowerCase())} (mês atual)</button>` : ''}`);
  }
  const val = id => { const e = $(id); return e ? e.value : ''; };
  const opts = (lista, atual) => lista.map(x => { const [v, n] = Array.isArray(x) ? x : [x, x]; return `<option value="${u.esc(v)}" ${String(v) === String(atual) ? 'selected' : ''}>${u.esc(n)}</option>`; }).join('');
  /* nome do campo + caixa ficam juntos num bloco (em linhas de 2 colunas, cada bloco é uma coluna) */
  const campo = (rot, html) => `<div class="campo"><label class="fl">${rot}</label>${html}</div>`;

  /* ---------- lançamento ---------- */
  function formLanc(tipo, l) {
    const ed = !!l, hoje = u.hoje();
    tipo = l ? (l.grupo === 'Renda' || (l.grupo === 'Reembolso' && l.valor > 0) ? 'entrada' : l.grupo === 'Guardado' ? 'guardar' : l.grupo === 'Transferência' ? 'transf' : 'saida') : tipo;
    const catsSaida = c.listaCats().filter(k => !['Renda', 'Guardado', 'Transferência', 'Reembolso'].includes(c.grupoDe(k)));
    const catsEntrada = c.listaCats().filter(k => c.grupoDe(k) === 'Renda' || c.grupoDe(k) === 'Reembolso');
    const cats = tipo === 'entrada' ? catsEntrada : catsSaida;
    const cat0 = l ? l.cat : tipo === 'entrada' ? 'Darzan Produções' : cats[0];
    const forma0 = l ? l.tipo : 'conta';
    const bancosConta = c.BANCOS, cartoes = c.cartoes().map(k => k['CARTÃO']);
    const compra = l && (l.obs.match(/Compra (P[\w-]+)/) || [])[1];
    const titulo = { saida: 'Gastei', entrada: 'Recebi', guardar: 'Guardei', transf: 'Transferência' }[tipo];
    abrir(`<h3 style="margin:0 0 12px">${ed ? 'Editar lançamento' : titulo}</h3>
      ${ed ? '' : `<div class="seg" style="margin:0 0 16px;display:grid;grid-template-columns:repeat(4,1fr);width:100%">${[['saida', 'Gastei'], ['entrada', 'Recebi'], ['guardar', 'Guardei'], ['transferir', 'Transferi']].map(([k, n]) => `<button type="button" data-a="trocaTipo" data-v="${u.esc(k)}" aria-pressed="${tipo === k}">${n}</button>`).join('')}</div>`}
      <label class="amount" for="fV"><span>R$</span><input id="fV" class="num" inputmode="decimal" placeholder="0,00" value="${u.esc(l ? String(Math.abs(l.valor).toFixed(2)).replace('.', ',') : '')}" aria-label="Valor" required></label>
      ${campo('O que foi', `<input class="txt" id="fD" value="${u.esc(l ? l.desc : '')}" placeholder="${tipo === 'entrada' ? 'Ex.: Ana - casamento, JPL SOM 2 dias' : 'Ex.: gasolina, mercado'}">`)}
      <div class="grid2">${campo('Data', `<input class="txt" id="fDt" type="date" value="${u.esc(l ? l.data : hoje)}">`)}${tipo === 'saida' && !ed ? campo('Como pagou', `<select class="txt" id="fF">${opts([['conta', 'Pix / débito'], ['cartão', 'Cartão de crédito']], forma0)}</select>`) : campo('Banco', `<select class="txt" id="fB">${opts(l && l.tipo === 'cartão' ? cartoes : bancosConta, l ? l.banco : 'Nubank')}</select>`)}</div>
      ${tipo === 'saida' && !ed ? `<div class="grid2" id="linhaBanco">${campo('Banco', `<select class="txt" id="fB">${opts(bancosConta, 'Nubank')}</select>`)}<div id="boxParc" hidden>${campo('Parcelas', `<select class="txt" id="fP">${opts(Array.from({ length: 24 }, (_, i) => [i + 1, i ? i + 1 + 'x' : 'À vista']), 1)}</select>`)}</div></div><p class="aviso" id="avisoCartao" hidden></p>` : ''}
      ${tipo === 'guardar' ? campo('Para onde foi', `<select class="txt" id="fX">${opts(c.caixinhas().map(x => [x['CONTA'], `${x['CONTA']} (${x['BANCO']})`]).concat([['', 'Outro lugar']]), l ? (l.obs.match(/Para (.+)/) || [])[1] : '')}</select>`) : ''}
      ${tipo === 'saida' || tipo === 'entrada' ? `<div class="grid2">${campo(tipo === 'entrada' ? 'De onde veio' : 'Categoria', `<select class="txt" id="fC">${opts(cats, cat0)}</select>`)}${campo('Sub-categoria', `<select class="txt" id="fS">${opts(c.subsDe(cat0), l ? l.sub : '')}</select>`)}</div>` : ''}
      ${tipo === 'saida' ? campo('Grupo', `<div class="rchips"><input type="radio" name="fG" id="fG1" value="Necessidades" ${(l ? l.grupo : c.grupoDe(cat0)) === 'Necessidades' ? 'checked' : ''}><label for="fG1">Necessidade</label><input type="radio" name="fG" id="fG2" value="Desejos" ${!['Necessidades', 'Reembolso'].includes(l ? l.grupo : c.grupoDe(cat0)) ? 'checked' : ''}><label for="fG2">Desejo</label><input type="radio" name="fG" id="fG3" value="Reembolso" ${l && l.grupo === 'Reembolso' ? 'checked' : ''}><label for="fG3">Reembolsado</label></div>`) + '<p class="dica-g">Reembolsado: alguém te devolve (ex.: gasto da JPL SOM). Fica no extrato, mas não conta como gasto.</p>' : ''}
      <div class="checkline"><input type="checkbox" id="fPrev" ${l && l.status === 'Previsto' ? 'checked' : ''}><label for="fPrev">${tipo === 'entrada' ? 'Ainda não recebi (previsto)' : 'Ainda não paguei (previsto)'}</label></div>
      ${campo('Anotação', `<input class="txt" id="fO" value="${u.esc(l ? l.obs.replace(/Compra P[\w-]+\s*·?\s*/, '').replace(/^Para .+$/, '') : '')}" placeholder="opcional">`)}
      ${compra ? `<p class="aviso">Esta é a parcela <b>${u.esc(l.parcela)}</b> de uma compra parcelada. Salvar muda só esta parcela.</p>` : ''}
      ${ed ? `<div class="acoes"><button type="button" class="btn2 perigo" data-a="apagarL" data-id="${u.esc(l.id)}">${u.svg('trash-2')}Excluir</button><button class="save" type="submit">Salvar</button></div>${compra ? `<button type="button" class="btn2 perigo" data-a="apagarCompra" data-id="${u.esc(compra)}" style="width:100%;margin-top:10px">${u.svg('trash-2')}Excluir a compra inteira (todas as parcelas)</button>` : ''}` : '<button class="save" type="submit">Salvar</button>'}`,
      () => salvarLanc(tipo, l));
    ligarForm(tipo);
  }
  function ligarForm(tipo) {
    const fC = $('fC'), fS = $('fS'), fF = $('fF');
    let mexeuNaCategoria = false;
    if (fC) fC.addEventListener('change', () => { mexeuNaCategoria = true; fS.innerHTML = opts(c.subsDe(fC.value), ''); const g = c.grupoDe(fC.value); const r = $('fG3') && $('fG3').checked ? null : document.querySelector(`input[name=fG][value="${g === 'Necessidades' ? 'Necessidades' : 'Desejos'}"]`); if (r) r.checked = true; });
    if (fS) fS.addEventListener('change', () => { mexeuNaCategoria = true; });
    /* novo lançamento: escreveu "gasolina"? o app já põe a categoria que você costuma usar */
    const fD = $('fD'), novo = !!$('fF') || tipo === 'entrada';
    if (fD && fC && novo) fD.addEventListener('input', () => {
      if (mexeuNaCategoria) return;
      const s = c.sugerir(fD.value);
      if (!s || ![...fC.options].some(o => o.value === s.cat)) return;
      fC.value = s.cat; fS.innerHTML = opts(c.subsDe(s.cat), s.sub);
      const r = document.querySelector(`input[name=fG][value="${s.grupo}"]`); if (r) r.checked = true;
      let av = $('avisoSug'); if (!av) { fC.closest('.grid2').insertAdjacentHTML('afterend', '<p class="aviso" id="avisoSug"></p>'); av = $('avisoSug'); }
      av.innerHTML = `${u.svg('sparkles')} Categoria pelo seu histórico (${s.n} de ${s.total} vezes). Pode trocar se quiser.`;
    });
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
    const grupo = transf ? l.grupo : tipo === 'entrada' ? (c.grupoDe(val('fC')) === 'Reembolso' ? 'Reembolso' : 'Renda') : tipo === 'guardar' ? 'Guardado' : (document.querySelector('input[name=fG]:checked') || {}).value || 'Desejos';
    const cat = transf ? l.cat : tipo === 'guardar' ? 'Guardado' : val('fC'), sub = transf ? l.sub : tipo === 'guardar' ? (val('fX') ? 'Caixinha' : 'Reserva') : val('fS');
    const status = prev ? 'Previsto' : 'Pago';
    const obsFinal = transf ? l.obs : [tipo === 'guardar' && val('fX') ? `Para ${val('fX')}` : '', l && (l.obs.match(/Compra P[\w-]+/) || [])[0], obs].filter(Boolean).join(' · ');
    if (l) {
      db.salvar('EXTRATO', { ID: l.id, 'DATA': data, 'BANCO': val('fB') || l.banco, 'DESCRIÇÃO': desc, 'GRUPO': grupo, 'VALOR': (transf || tipo === 'saida') && l.valor > 0 ? v : tipo === 'entrada' ? v : -v, 'CATEGORIA': cat, 'SUB-CATEGORIA': sub, 'STATUS': status, 'OBS': obsFinal });
      fechar(); render(false);
      /* mudou a categoria: oferece mudar também os outros com a mesma descrição */
      const k = c.chave(desc), outros = !transf && (cat !== l.cat || sub !== l.sub) && k ? c.lancs().filter(x => x.id !== l.id && c.chave(x.desc) === k && (x.cat !== cat || x.sub !== sub) && x.grupo === l.grupo) : [];
      if (outros.length) toast(`Mudar também os outros ${outros.length} “${u.cap(k)}”?`, () => { const volta = mudarVarios(outros.map(x => x.id), { cat, sub, grupo }); render(false); toast(`${outros.length} mudado${outros.length > 1 ? 's' : ''} para ${sub || cat}`, volta); }, 'Mudar todos');
      else toast('Lançamento atualizado');
      return;
    }
    if (tipo === 'saida' && val('fF') === 'cartão') {
      const { ops } = opsCompraCartao({ data, cartao: val('fB'), valor: v, parcelas: +val('fP') || 1, desc, grupo, cat, sub, obs });
      db.lote(ops); fechar(); render(false);
      toast(`Compra lançada na fatura de ${u.nomeMes(u.mes(ops[1].registro['DATA'])).toLowerCase()}`);
      return;
    }
    db.salvar('EXTRATO', { 'DATA': data, 'BANCO': val('fB'), 'DESCRIÇÃO': desc, 'GRUPO': grupo, 'TIPO': 'conta', 'VALOR': tipo === 'entrada' ? v : -v, 'CATEGORIA': cat, 'SUB-CATEGORIA': sub, 'STATUS': status, 'PARCELA': '', 'OBS': obsFinal });
    fechar(); render(false);
    if (u.mes(data) !== ui.mes) toast(`Lançado em ${u.nomeMes(u.mes(data)).toLowerCase()}`); else toast('Lançamento salvo');
    if (tipo === 'guardar') confete(innerWidth / 2, 160);
  }
  function apagarLanc(id, botao) {
    if (botao.dataset.certeza !== '1') { botao.dataset.certeza = '1'; botao.innerHTML = u.svg('trash-2') + 'Toque de novo para excluir'; return; }
    const r = db.achar('EXTRATO', id), copia = Object.assign({}, r);
    if (/^L(FX|JP)-/.test(id)) db.salvar('EXTRATO', { ID: id, 'STATUS': 'Cancelado' }); /* gerado pelo app: fica guardado como cancelado para não voltar sozinho */
    else db.apagar('EXTRATO', id); /* o que veio do banco também fica como cancelado (db.doBanco) */
    fechar(); render(false);
    toast('Lançamento excluído', () => { db.salvar('EXTRATO', copia); render(false); });
  }
  function apagarCompra(pid, botao) {
    const linhas = c.linhasDaCompra(pid);
    if (botao.dataset.certeza !== '1') { botao.dataset.certeza = '1'; botao.innerHTML = u.svg('trash-2') + `Toque de novo: apaga ${linhas.length} parcelas`; return; }
    const ops = linhas.map(l => ({ op: 'apagar', aba: 'EXTRATO', id: l.id }));
    if (db.achar('PARCELADOS', pid)) ops.push({ op: 'apagar', aba: 'PARCELADOS', id: pid });
    db.lote(ops); fechar(); render(false); toast(`Compra excluída (${linhas.length} parcelas)`);
  }

  /* ---------- transferência entre as suas contas: não é entrada nem saída, só muda de banco ---------- */
  function formTransferir(par) {
    const ed = !!par, sai = par && par.sai, entra = par && par.entra, bancos = c.BANCOS.filter(b => b !== 'Não informado');
    const nota = sai ? sai.obs.replace(/^Transferência T[\w-]+\s*·?\s*/, '') : '';
    abrir(`<h3 style="margin:0 0 12px">${ed ? 'Editar transferência' : 'Transferi'}</h3>
      ${ed ? '' : `<div class="seg" style="margin:0 0 16px;display:grid;grid-template-columns:repeat(4,1fr);width:100%">${[['saida', 'Gastei'], ['entrada', 'Recebi'], ['guardar', 'Guardei'], ['transferir', 'Transferi']].map(([k, n]) => `<button type="button" data-a="trocaTipo" data-v="${u.esc(k)}" aria-pressed="${k === 'transferir'}">${n}</button>`).join('')}</div>`}
      <label class="amount" for="fV"><span>R$</span><input id="fV" class="num" inputmode="decimal" placeholder="0,00" value="${u.esc(sai ? String(Math.abs(sai.valor).toFixed(2)).replace('.', ',') : '')}" aria-label="Valor" required></label>
      <div class="grid2">${campo('Saiu do', `<select class="txt" id="tDe">${opts(bancos, sai ? sai.banco : 'Nubank')}</select>`)}${campo('Foi para o', `<select class="txt" id="tPara">${opts(bancos, entra ? entra.banco : 'PicPay')}</select>`)}</div>
      ${campo('Data', `<input class="txt" id="fDt" type="date" value="${u.esc(sai ? sai.data : u.hoje())}">`)}
      ${campo('Anotação', `<input class="txt" id="fO" value="${u.esc(nota)}" placeholder="opcional">`)}
      <p class="aviso">Dinheiro passando de uma conta sua para outra: <b>não conta como entrada nem como saída</b>. Só muda o saldo de cada banco.</p>
      ${ed ? `<div class="acoes"><button type="button" class="btn2 perigo" data-a="apagarTransf" data-id="${u.esc(sai.id)}">${u.svg('trash-2')}Excluir</button><button class="save" type="submit">Salvar</button></div>` : '<button class="save" type="submit">Salvar</button>'}`,
      () => {
        const v = u.num(val('fV')), de = val('tDe'), para = val('tPara'), data = val('fDt') || u.hoje(), obs = val('fO').trim();
        if (!(v > 0)) { toast('Digite um valor, por exemplo 200'); return false; }
        if (de === para) { toast('Escolha bancos diferentes'); return false; }
        const tid = ed ? (sai.obs.match(/Transferência (T[\w-]+)/) || [])[1] : 'T' + Date.now().toString(36).toUpperCase();
        const base = { 'DATA': data, 'GRUPO': 'Transferência', 'TIPO': 'conta', 'CATEGORIA': 'Transferência', 'SUB-CATEGORIA': 'Entre minhas contas', 'STATUS': 'Pago', 'PARCELA': '', 'OBS': [`Transferência ${tid}`, obs].filter(Boolean).join(' · ') };
        db.lote([
          { op: 'salvar', aba: 'EXTRATO', registro: Object.assign({ ID: ed ? sai.id : db.novoId('EXTRATO'), 'BANCO': de, 'DESCRIÇÃO': `Transferência para ${para}`, 'VALOR': -u.r2(v) }, base) },
          { op: 'salvar', aba: 'EXTRATO', registro: Object.assign({ ID: ed ? entra.id : db.novoId('EXTRATO') + 'E', 'BANCO': para, 'DESCRIÇÃO': `Transferência do ${de}`, 'VALOR': u.r2(v) }, base) },
        ]);
        fechar(); render(false); toast(ed ? 'Transferência atualizada' : `Transferido ${u.brl(v)}: ${de} → ${para}`);
      });
  }
  function apagarTransf(id, botao) {
    if (botao.dataset.certeza !== '1') { botao.dataset.certeza = '1'; botao.innerHTML = u.svg('trash-2') + 'Toque de novo para excluir'; return; }
    const par = c.parTransf(c.l(db.achar('EXTRATO', id))), copias = [par.sai, par.entra].map(l => Object.assign({}, l.r));
    db.lote(copias.map(r => ({ op: 'apagar', aba: 'EXTRATO', id: r.ID }))); fechar(); render(false);
    toast('Transferência excluída', () => { db.lote(copias.map(r => ({ op: 'salvar', aba: 'EXTRATO', registro: r }))); render(false); });
  }

  /* ---------- trazer correções de um arquivo (o Claude manda): junta com o que já tem ---------- */
  function trazerCorrecoes(dados) {
    const ops = []; let novos = 0, mudados = 0, ignorados = 0;
    Object.entries(dados.abas || {}).forEach(([aba, regs]) => {
      /* só as abas dos seus dados: avisos, aparelhos (quem recebe as notificações) e anexos nunca vêm de arquivo */
      if (!window.TABELAS[aba] || window.TABELAS[aba].opcional || !Array.isArray(regs)) return;
      const cols = new Set(['ID', '_apagar'].concat(window.TABELAS[aba].colunas.map(x => x[0])));
      regs.forEach(r => {
        if (!r || !db.idOk(r.ID) || Object.keys(r).some(k => !cols.has(k))) { ignorados++; return; }
        const x = db.achar(aba, r.ID);
        if (r._apagar) { if (x) { ops.push({ op: 'apagar', aba, id: r.ID }); mudados++; } return; }
        if (x && Object.keys(r).every(k => k === 'ID' || String(x[k]) === String(r[k]))) return; /* já está igual */
        x ? mudados++ : novos++;
        ops.push({ op: 'salvar', aba, registro: r });
      });
    });
    return { ops, novos, mudados, ignorados };
  }
  A.trazerCorrecoesTeste = trazerCorrecoes; /* para o teste de segurança (etapa 20) */
  function formCorrecoes() {
    abrir(`<h3 style="margin:0 0 4px">Trazer correções</h3><p class="c-muted" style="margin:0 0 14px;font-size:.88rem">Escolha o arquivo que o Claude te mandou. Antes de mudar qualquer coisa, o app mostra o que vai fazer.</p>
      <label class="btn2 pri" style="cursor:pointer;justify-content:center">${u.svg('file-text')}Escolher o arquivo<input type="file" id="corArq" accept=".json,application/json" hidden></label>
      <div id="corRes" style="margin-top:14px"></div>`, null);
    $('corArq').addEventListener('change', async ev => {
      const arq = ev.target.files[0], res = $('corRes'); if (!arq) return;
      try {
        const dados = JSON.parse(await arq.text());
        const r = trazerCorrecoes(dados);
        if (!r.ops.length) { res.innerHTML = `<p class="aviso">Nada para mudar: o app já está igual ao arquivo.</p>`; return; }
        res.innerHTML = `${dados.descricao ? `<p class="aviso">${u.esc(dados.descricao)}</p>` : ''}<p style="margin:12px 0">Vai <b>adicionar ${r.novos}</b> e <b>corrigir ${r.mudados}</b> lançamento(s).</p>${r.ignorados ? `<p class="aviso">${r.ignorados} linha(s) com algo estranho foram deixadas de fora, por segurança.</p>` : ""}<button type="button" class="save" id="corOk">Fazer as correções</button>`;
        $('corOk').addEventListener('click', () => { db.lote(r.ops); fechar(); render(false); toast(`Pronto: ${r.novos} adicionado(s) e ${r.mudados} corrigido(s)`); });
      } catch (e) { res.innerHTML = `<p class="aviso" style="color:var(--out)">Não consegui ler esse arquivo: ${u.esc(e.message)}</p>`; }
    });
  }
  A.trazerCorrecoes = trazerCorrecoes;

  /* ---------- equipamento ---------- */
  let fotoNova = null;
  function formEquip(e) {
    const ed = !!e, f = e ? c.fotoEquip(e) : null, pid = e && c.compraDo(e), lid = e && c.lancDo(e);
    const vinc = pid ? c.linhasDaCompra(pid) : lid ? c.lancs().filter(l => l.id === lid) : [];
    fotoNova = null;
    const notas = e ? String(e['OBS'] || '').replace(/(Compra P[\w-]+|Lançamento L[\w-]+)\s*·?\s*/g, '').trim() : '';
    abrir(`<h3 style="margin:0 0 12px">${ed ? 'Editar equipamento' : 'Novo equipamento'}</h3>
      <div class="fotoedit"><div class="ph" id="fotoPrev">${f ? `<img src="${u.esc(u.dadoSeguro(f))}" alt="">` : u.svg('camera')}</div><div><label class="btn2">${u.svg('camera')}${f ? 'Trocar foto' : 'Pôr foto'}<input type="file" accept="image/*" id="fFoto"></label><p class="c-muted" style="font-size:.78rem;margin:8px 0 0">No celular, dá para tirar a foto na hora.</p></div></div>
      ${campo('Nome', `<input class="txt" id="eN" required value="${u.esc(e ? e['NOME'] : '')}" placeholder="Ex.: Rode Wireless GO II">`)}
      <div class="grid2">${campo('Tipo', `<select class="txt" id="eT">${opts(TIPOS_EQ, e ? e['TIPO'] : 'Câmera')}</select>`)}${campo('Valor', `<input class="txt num" id="eV" inputmode="decimal" value="${u.esc(e ? String(c.num(e['VALOR']).toFixed(2)).replace('.', ',') : '')}" placeholder="R$ 0,00" required>`)}</div>
      <div class="grid2">${campo('Data da compra', `<input class="txt" id="eD" type="date" value="${u.esc(e ? String(e['DATA DA COMPRA'] || '') : u.hoje())}">`)}${campo('Estado', `<select class="txt" id="eE">${opts(['Novo', 'Semi-novo', 'Usado', 'Na manutenção', 'Vendido'], e ? e['ESTADO'] : 'Novo')}</select>`)}</div>
      ${ed ? '' : campo('Como entrou', `<div class="rchips">${[['catalogo', 'Já tinha'], ['vista', 'Paguei à vista'], ['cartao', 'No cartão']].map(([k, n], i) => `<input type="radio" name="eF" id="eF${i}" value="${u.esc(k)}" ${i === 0 ? 'checked' : ''}><label for="eF${i}">${n}</label>`).join('')}</div>
        <div class="grid2" id="eLinha" hidden><div>${campo('Banco / cartão', `<select class="txt" id="eB"></select>`)}</div><div id="eParcBox">${campo('Parcelas', `<select class="txt" id="eP">${opts(Array.from({ length: 24 }, (_, i) => [i + 1, i ? i + 1 + 'x' : 'À vista']), 1)}</select>`)}</div></div><p class="aviso" id="eAviso">“Já tinha” só cataloga: não mexe no dinheiro de nenhum mês.</p>`)}
      ${campo('Nº de série', `<input class="txt" id="eS" value="${u.esc(e ? e['Nº DE SÉRIE'] || '' : '')}" placeholder="opcional">`)}
      ${campo('Anotações', `<input class="txt" id="eO" value="${u.esc(notas)}" placeholder="opcional">`)}
      ${ed && vinc.length ? `<p class="aviso">Ligado a ${pid ? `uma compra no cartão: <b>${vinc.length} parcelas</b> (${u.brl(-u.sum(vinc))})` : `um lançamento de <b>${u.brl(-u.sum(vinc))}</b> em ${u.nomeMes(u.mes(vinc[0].data)).toLowerCase()}`}. Se mudar o valor, as parcelas acompanham.</p>` : ''}
      ${ed ? `<div class="checkline" id="eApagarJunto" ${vinc.length ? '' : 'hidden'}><input type="checkbox" id="eJunto" checked><label for="eJunto">Ao excluir, apagar também ${pid ? `as ${vinc.length} parcelas no cartão` : 'o lançamento ligado'} (${u.brl(-u.sum(vinc))})</label></div>
        <div class="acoes"><button type="button" class="btn2 perigo" data-a="apagarE" data-id="${u.esc(e.ID)}">${u.svg('trash-2')}Excluir</button><button class="save" type="submit">Salvar</button></div>` : '<button class="save" type="submit">Cadastrar</button>'}`,
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
  function reduzirFoto(arq, lado = 420, maximo = 45000) {
    return new Promise((ok, erro) => {
      const rd = new FileReader();
      rd.onerror = erro;
      rd.onload = () => { const img = new Image(); img.onerror = erro; img.onload = () => { const s = Math.min(1, lado / Math.max(img.width, img.height)), cv = document.createElement('canvas'); cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s); const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height); let q = lado > 420 ? .82 : .72, url = cv.toDataURL('image/jpeg', q); while (url.length > maximo && q > .3) { q -= .1; url = cv.toDataURL('image/jpeg', q); } ok(url); }; img.src = rd.result; };
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
  const SUBJ = { 'Casamento': 'Casamento', 'Social media': 'Social media', 'Palestra': 'Palestra' };
  const TIPOANX = { 'Comprovante': ['receipt', '#5fe0a1', '#0f8a55'], 'Contrato': ['file-text', '#9cc6ff', '#2a62e0'], 'Orçamento': ['file-text', '#ffd97a', '#c07a0a'], 'Outro': ['paperclip', '#b9c3ff', '#5a5fe0'] };
  const arquivos = {}; /* arquivos já abertos nesta visita (para não baixar de novo) */
  const semAnexos = () => db.faltando && db.faltando.has('ANEXOS');
  const anexoDoLanc = id => db.linhas('ANEXOS').find(x => x['LANÇAMENTO'] === id);
  function videosJob(j) {
    const vs = c.entregas(j), ok = vs.filter(v => v.feito).length;
    return `<h4>${u.svg('clapperboard')} Vídeos${vs.length ? ` · ${ok} de ${vs.length} prontos` : ''}</h4>
      ${vs.length ? `<div class="vids">${vs.map((v, i) => `<div class="vid${v.feito ? ' ok' : ''}"><button type="button" class="vck" data-a="vidJ" data-id="${u.esc(j.ID)}" data-i="${u.esc(i)}" aria-pressed="${v.feito}">${u.svg(v.feito ? 'circle-check' : 'circle')}<span>${u.esc(v.nome)}</span></button><button type="button" class="vx" data-a="tiraVid" data-id="${u.esc(j.ID)}" data-i="${u.esc(i)}" aria-label="Tirar ${u.esc(v.nome)}">${u.svg('x')}</button></div>`).join('')}</div>` : '<p class="c-muted" style="font-size:.86rem;margin:0 0 8px">Coloque aqui cada vídeo que precisa entregar e marque quando ficar pronto.</p>'}
      <div class="addv"><input class="txt" id="jNv" placeholder="Novo vídeo, ex.: teaser" aria-label="Novo vídeo"><button type="button" class="btn2" data-a="addVid" data-id="${u.esc(j.ID)}">${u.svg('plus')}Pôr</button></div>`;
  }
  const tipoArq = m => /pdf/.test(m) ? 'PDF' : /^image\//.test(m) ? 'foto' : 'arquivo';
  function anexosJob(j) {
    const xs = c.anexos(j);
    return `<h4>${u.svg('paperclip')} Comprovantes e contratos${xs.length ? ` · ${xs.length}` : ''}</h4>
      ${xs.map(x => `<button type="button" class="it btn" data-a="verX" data-id="${u.esc(x.ID)}">${u.ti(TIPOANX[x['TIPO']] || TIPOANX.Outro)}<div style="min-width:0"><div class="t">${u.esc(x['NOME'] || x['TIPO'])}</div><div class="m">${[x['TIPO'], x['DATA'] ? u.dm(String(x['DATA'])) : '', tipoArq(x['ARQUIVO'])].filter(Boolean).map(t => `<span>${u.esc(t)}</span>`).join('<span>·</span>')}</div></div><div class="v num">${c.num(x['VALOR']) ? u.brl(c.num(x['VALOR'])) : u.svg('eye')}</div></button>`).join('')}
      ${semAnexos() ? `<div class="aviso">Não consegui carregar os anexos agora (sem internet?). <button type="button" class="chip mini" data-a="recarregarX" data-id="${u.esc(j.ID)}">${u.svg('refresh-cw')}Tentar de novo</button></div>` : `<div class="addx2">
        <label class="btn2 grande" for="aArqC">${u.svg('receipt')}<span>Anexar comprovante<small>foto, print ou PDF do Pix</small></span></label><input type="file" id="aArqC" hidden>
        <label class="btn2 grande" for="aArqD">${u.svg('file-text')}<span>Anexar contrato ou PDF<small>contrato, orçamento, outros</small></span></label><input type="file" id="aArqD" hidden>
      </div><p class="c-muted" id="aSt" style="font-size:.82rem;margin:8px 2px 0" hidden></p>`}`;
  }
  function recebimentosJob(j) {
    const recs = c.recebimentos(j), prev = c.parcelasPrevistas(j), tot = c.num(j['VALOR TOTAL']);
    return `<h4>${u.svg('hand-coins')} Recebimentos · ${u.brl(c.recebido(j))}${tot ? ` de ${u.brl(tot)}` : ''}</h4>${recs.map(l => { const x = anexoDoLanc(l.id); return linhaL(l) + (x ? `<button type="button" class="vercomp" data-a="verX" data-id="${u.esc(x.ID)}">${u.svg('receipt')}Ver comprovante</button>` : ''); }).join('') || '<p class="c-muted" style="font-size:.86rem">Nada recebido ainda.</p>'}
      ${prev.length ? `<p class="c-muted" style="font-size:.84rem;margin:10px 2px 4px">${u.svg('calendar-clock')} Parcelas a receber (aparecem nas Tarefas, com aviso no celular):</p>${prev.map(l => linhaL(l) + `<div class="whatsl">${botaoWhats(j, l.valor, l.data)}</div>`).join('')}` : (c.faltaReceber(j) > 0 && j['ETAPA'] !== 'Orçamento' ? `<div class="whatsl">${botaoWhats(j, c.faltaReceber(j), null)}</div>` : '')}
      <div class="panel" style="margin-top:10px;padding:12px"><b style="font-size:.9rem">Registrar recebimento</b><div class="grid2" style="margin-top:8px"><input class="txt num" id="rV" inputmode="decimal" placeholder="R$ 0,00" aria-label="Valor recebido"><select class="txt" id="rB" aria-label="Banco">${opts(c.BANCOS, 'PicPay')}</select></div><div class="grid2" style="margin-top:8px"><input class="txt" id="rD" placeholder="Ex.: sinal, parcela" aria-label="Descrição"><input class="txt" id="rDt" type="date" value="${u.esc(u.hoje())}" aria-label="Data"></div>
        ${semAnexos() ? '' : `<label class="btn2 comp" for="rArq">${u.svg('paperclip')}<span id="rArqN">Anexar comprovante (opcional)</span></label><input type="file" id="rArq" hidden>`}
        <button type="button" class="btn2 pri" data-a="receber" data-id="${u.esc(j.ID)}" data-sub="${u.esc(SUBJ[j['TIPO DE EVENTO']] || 'Evento')}" style="width:100%;margin-top:10px">${u.svg('plus')}Registrar</button></div>`;
  }
  function formJob(j, novo) {
    const ed = !!j, tot = j ? c.num(j['VALOR TOTAL']) : 0, rec = j ? c.recebido(j) : 0, falta = j ? c.faltaReceber(j) : null, prox = j ? c.parcelasPrevistas(j)[0] : null;
    const sem = TAB.falta.TRABALHOS || new Set();
    const et0 = (j && j['ETAPA']) || (novo && novo['ETAPA']) || 'Orçamento';
    abrir(`<h3 style="margin:0 0 10px">${ed ? u.esc(j['CLIENTE']) : 'Novo trabalho'}</h3>
      <div class="etapas" role="group" aria-label="Etapa">${ETAPAS.concat([['Recorrente', '#c9a7ff']]).map(([n, cor]) => `<button type="button" class="chip" data-a="etapaJ" ${ed ? `data-id="${u.esc(j.ID)}"` : ''} data-v="${u.esc(n)}" aria-pressed="${et0 === n}" style="--c:${cor}"><i></i>${n}</button>`).join('')}</div><input type="hidden" id="jE" value="${u.esc(et0)}">
      ${ed && tot ? `<div class="jres"><div class="money"><i style="width:${Math.min(rec / tot, 1) * 100}%"></i></div><div class="mrow num"><span>${u.brl(rec)} de ${u.brl(tot)}</span>${falta > 0 ? `<b class="c-warn">falta ${u.brl(falta)}</b>` : '<b class="c-in">pago</b>'}</div>${prox ? `<small>Próxima parcela: ${u.brl(prox.valor)} em ${u.dm(prox.data)}</small>` : ''}</div>` : ''}
      ${ed ? `<div class="jsec" id="jVid">${videosJob(j)}</div><div class="jsec" id="jAnx">${anexosJob(j)}</div><div class="jsec" id="jRec">${recebimentosJob(j)}</div><div class="jsec"><h4>${u.svg('pencil')} Dados do trabalho</h4></div>` : ''}
      ${campo('Cliente ou casal', `<input class="txt" id="jC" required value="${u.esc(j ? j['CLIENTE'] : '')}" placeholder="Ex.: Ana e Pedro">`)}
      ${campo('Tipo de evento', `<select class="txt" id="jT">${opts(Object.keys(TIPOEV), j ? j['TIPO DE EVENTO'] : (novo && novo['TIPO DE EVENTO']) || 'Casamento')}</select>`)}
      <div class="grid2">${campo('Data do evento', `<input class="txt" id="jD" type="date" value="${u.esc(j ? String(j['DATA DO EVENTO'] || '') : '')}">`)}${campo('Entrega', `<input class="txt" id="jEn" type="date" value="${u.esc(j ? String(j['ENTREGA'] || '') : '')}">`)}</div>
      <div class="grid2">${campo('Valor total', `<input class="txt num" id="jV" inputmode="decimal" value="${u.esc(j && j['VALOR TOTAL'] !== '' ? String(c.num(j['VALOR TOTAL']).toFixed(2)).replace('.', ',') : '')}" placeholder="R$ 0,00">`)}${campo('Local', `<input class="txt" id="jL" value="${u.esc(j ? j['LOCAL'] || '' : '')}">`)}</div>
      <div class="grid2">${campo('Paga por mês', `<input class="txt num" id="jPm" inputmode="decimal" value="${u.esc(j && c.num(j['PARCELA MENSAL']) ? String(c.num(j['PARCELA MENSAL']).toFixed(2)).replace('.', ',') : '')}" placeholder="se paga parcelado">`)}${campo('Todo dia', `<input class="txt num" id="jPd" inputmode="numeric" value="${u.esc(j && j['DIA DA PARCELA'] ? parseInt(j['DIA DA PARCELA'], 10) : '')}" placeholder="ex.: 26">`)}</div>
      ${campo('O que foi fechado', `<input class="txt" id="jF" value="${u.esc(j ? j['O QUE FOI FECHADO'] || '' : '')}" placeholder="Ex.: Teaser + filme completo + 10 reels">`)}
      ${campo('Briefing / orçamento', `<textarea class="txt" id="jBr" rows="5" placeholder="Horário, equipe, o que está incluso, adicionais…">${u.esc(j ? j['BRIEFING'] || '' : '')}</textarea>`)}
      <div class="grid2">${campo('WhatsApp', `<input class="txt" id="jW" inputmode="tel" value="${u.esc(j ? j['TELEFONE'] || '' : '')}" placeholder="(19) 9…">`)}${campo('Contrato (link)', `<input class="txt" id="jK" value="${u.esc(j ? j['CONTRATO'] || '' : '')}" placeholder="ou anexe o PDF acima">`)}</div>
      ${campo('Anotações', `<textarea class="txt" id="jO">${u.esc(j ? j['OBS'] || '' : '')}</textarea>`)}
      ${sem.has('briefing') ? '<p class="aviso">Briefing, vídeos e parcela mensal só ficam salvos depois de rodar a atualização no Supabase (atualizacao-trabalhos.sql).</p>' : ''}
      ${ed ? `<div class="acoes"><button type="button" class="btn2 perigo" data-a="apagarJ" data-id="${u.esc(j.ID)}">${u.svg('trash-2')}Excluir</button><button class="save" type="submit">Salvar</button></div>` : '<button class="save" type="submit">Criar trabalho</button>'}`,
      () => {
        const nome = val('jC').trim(); if (!nome) { toast('Coloque o nome do cliente'); return false; }
        const pm = u.num(val('jPm')), pd = parseInt(val('jPd'), 10);
        db.salvar('TRABALHOS', Object.assign(j ? { ID: j.ID } : {}, { 'CLIENTE': nome, 'TIPO DE EVENTO': val('jT'), 'ETAPA': val('jE') || 'Orçamento', 'DATA DO EVENTO': val('jD'), 'ENTREGA': val('jEn'), 'VALOR TOTAL': val('jV') ? u.r2(u.num(val('jV'))) : '', 'LOCAL': val('jL'), 'O QUE FOI FECHADO': val('jF'), 'BRIEFING': val('jBr'), 'PARCELA MENSAL': pm > 0 ? u.r2(pm) : '', 'DIA DA PARCELA': pd >= 1 && pd <= 31 ? pd : '', 'TELEFONE': val('jW'), 'CONTRATO': val('jK'), 'OBS': val('jO') }));
        db.garantirFixas(); fechar(); render(false); toast(j ? 'Trabalho atualizado' : 'Trabalho criado');
      }, true);
    if (ed) ligarArquivosJob(j);
  }
  /* muda a etapa (pelo arrastar do quadro ou pelos botões da ficha), com "Desfazer" */
  const semParcelas = j => c.parcelasPrevistas(j).map(l => ({ op: 'apagar', aba: 'EXTRATO', id: l.id }));
  function moverJob(id, etapa, quieto) {
    const j = db.achar('TRABALHOS', id); if (!j || j['ETAPA'] === etapa) return;
    const de = j['ETAPA'] || 'Orçamento';
    db.lote([{ op: 'salvar', aba: 'TRABALHOS', registro: { ID: id, 'ETAPA': etapa } }].concat(etapa === 'Orçamento' ? semParcelas(j) : []));
    if (etapa !== 'Orçamento') db.garantirFixas();
    render(false);
    if (!quieto) toast(`${j['CLIENTE']}: ${etapa}`, () => moverJob(id, de, true));
  }
  function etapaNaFicha(b) {
    document.querySelectorAll('#s2 .etapas [data-a=etapaJ]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    $('jE').value = b.dataset.v;
    if (b.dataset.id) moverJob(b.dataset.id, b.dataset.v);
  }
  /* troca só um pedaço da ficha (o que você digitou nos outros campos continua lá) */
  function refazJob(id, secoes) {
    const j = db.achar('TRABALHOS', id); if (!j) return;
    const f = { jVid: videosJob, jAnx: anexosJob, jRec: recebimentosJob };
    secoes.forEach(k => { const el = $(k); if (el) el.innerHTML = f[k](j); });
    ligarArquivosJob(j); render(false);
  }
  function ligarArquivosJob(j) {
    [['aArqC', 'Comprovante'], ['aArqD', 'Contrato']].forEach(([k, tipo]) => { const a = $(k); if (a) a.onchange = async ev => { const arq = ev.target.files[0]; ev.target.value = ''; if (!arq) return; const id = await anexar(j.ID, arq, { 'TIPO': tipo }); if (id) verAnexo(id, true); }; });
    const r = $('rArq'); if (r) r.onchange = ev => { const arq = ev.target.files[0]; $('rArqN').textContent = arq ? arq.name : 'Anexar comprovante (opcional)'; };
  }
  function mexerVideos(id, f) {
    const j = db.achar('TRABALHOS', id), vs = c.entregas(j);
    f(vs); db.salvar('TRABALHOS', { ID: id, 'ENTREGAS': c.textoEntregas(vs) }); refazJob(id, ['jVid']);
  }
  function addVideo(id) {
    const n = val('jNv').trim(); if (!n) { toast('Escreva o nome do vídeo'); return; }
    mexerVideos(id, vs => vs.push({ feito: false, nome: n }));
    const i = $('jNv'); if (i) i.focus();
  }
  /* foto vira JPEG de até ~1600px (fica leve); PDF e qualquer outro arquivo vão como estão, até 8 MB */
  const lerCru = (arq, tipo) => arq.size > 8e6 ? Promise.reject(new Error('O arquivo passa de 8 MB')) : new Promise((ok, erro) => { const rd = new FileReader(); rd.onerror = () => erro(new Error('Não consegui ler o arquivo')); rd.onload = () => ok({ dado: String(rd.result).replace(/^data:[^;,]*/, 'data:' + tipo), tipo }); rd.readAsDataURL(arq); });
  function lerArquivo(arq) {
    const ext = (arq.name.match(/\.([a-z0-9]+)$/i) || [])[1] || '', tipo = arq.type || { pdf: 'application/pdf', heic: 'image/heic', heif: 'image/heif', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[ext.toLowerCase()] || 'application/octet-stream';
    if (/pdf/.test(tipo)) return lerCru(arq, 'application/pdf');
    if (/^image\//.test(tipo)) return reduzirFoto(arq, 1600, 900000).then(dado => ({ dado, tipo: 'image/jpeg' })).catch(() => lerCru(arq, tipo)); /* foto que o navegador não abre (HEIC no PC): vai como está */
    return lerCru(arq, tipo);
  }
  async function anexar(trabalho, arq, extra) {
    const st = $('aSt'), diz = t => { if (st) { st.hidden = false; st.textContent = t; } };
    try {
      diz('Preparando o arquivo…');
      const { dado, tipo } = await lerArquivo(arq), id = db.novoId('ANEXOS');
      diz('Enviando…');
      await N.guardarArquivo(id, dado);
      arquivos[id] = dado;
      db.salvar('ANEXOS', Object.assign({ ID: id, 'TRABALHO': trabalho, 'NOME': arq.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || extra['TIPO'], 'DATA': u.hoje(), 'ARQUIVO': tipo, 'TAMANHO': dado.length, 'VALOR': '', 'LANÇAMENTO': '' }, extra));
      refazJob(trabalho, ['jAnx', 'jRec']); toast(`${extra['TIPO'] || 'Arquivo'} guardado`);
      return id;
    } catch (e) {
      diz(''); if (st) st.hidden = true;
      toast(e.semInternet ? 'Sem internet: o arquivo não foi. Tente de novo quando voltar.' : e.status === 404 ? 'Falta rodar a atualização no Supabase para guardar arquivos' : e.message || 'Não consegui guardar o arquivo');
      return null;
    }
  }
  async function receber(id, sub) {
    const j = db.achar('TRABALHOS', id), v = u.num(val('rV')), arq = $('rArq') && $('rArq').files[0];
    if (!(v > 0)) { toast('Digite o valor recebido'); return; }
    const data = val('rDt') || u.hoje(), desc = val('rD').trim() || 'pagamento', prev = c.parcelasPrevistas(j).sort((a, b) => a.data < b.data ? -1 : 1), ops = [];
    const pago = { 'DATA': data, 'BANCO': val('rB'), 'DESCRIÇÃO': `${j['CLIENTE']} - ${desc}`, 'GRUPO': 'Renda', 'TIPO': 'conta', 'VALOR': u.r2(v), 'CATEGORIA': 'Darzan Produções', 'SUB-CATEGORIA': sub, 'STATUS': 'Pago', 'PARCELA': '' };
    let lid;
    if (prev.length && v >= prev[0].valor - 0.005) {
      /* pagou a parcela (ou mais): a parcela prevista mais antiga vira este recebimento; o que passar, abate das próximas */
      lid = prev[0].id; ops.push({ op: 'salvar', aba: 'EXTRATO', registro: Object.assign({ ID: lid, 'OBS': `Trabalho ${j.ID} · venc. ${prev[0].data} · Recebido pelo app` }, pago) });
      let sobra = u.r2(v - prev[0].valor);
      prev.slice(1).forEach(p => { if (sobra < 0.01) return; if (sobra >= p.valor - 0.005) { ops.push({ op: 'salvar', aba: 'EXTRATO', registro: { ID: p.id, 'STATUS': 'Cancelado' } }); sobra = u.r2(sobra - p.valor); } else { ops.push({ op: 'salvar', aba: 'EXTRATO', registro: { ID: p.id, 'VALOR': u.r2(p.valor - sobra) } }); sobra = 0; } });
    } else {
      /* pagou só um pedaço: entra o que veio e a parcela prevista diminui */
      lid = db.novoId('EXTRATO'); ops.push({ op: 'salvar', aba: 'EXTRATO', registro: Object.assign({ ID: lid, 'OBS': `Trabalho ${j.ID} · Recebido pelo app` }, pago) });
      if (prev.length) ops.push({ op: 'salvar', aba: 'EXTRATO', registro: { ID: prev[0].id, 'VALOR': u.r2(prev[0].valor - v) } });
    }
    db.lote(ops);
    confete(innerWidth / 2, 200); toast(`Recebido ${u.brl(v)} de ${j['CLIENTE']}`);
    if (arq) await anexar(id, arq, { 'TIPO': 'Comprovante', 'NOME': `Comprovante ${desc} ${u.dm(data)}`, 'VALOR': u.r2(v), 'DATA': data, 'LANÇAMENTO': lid });
    formJob(db.achar('TRABALHOS', id)); render(false);
  }
  /* ficha do anexo: vê, abre em tela cheia, compartilha/salva e ajusta nome, tipo, valor e de qual recebimento é */
  const dadoDe = async id => arquivos[id] || (arquivos[id] = await N.arquivo(id));
  const bytesDe = dado => { const bin = atob(dado.split(',')[1] || ''), b = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i); return b; };
  async function verAnexo(id, novo) {
    const x = db.achar('ANEXOS', id); if (!x) return;
    const j = db.achar('TRABALHOS', x['TRABALHO']), recs = j ? c.recebimentos(j) : [], pdf = /pdf/.test(x['ARQUIVO']), img = /^image\//.test(x['ARQUIVO']);
    abrir(`<h3 style="margin:0 0 4px">${u.esc(x['NOME'] || x['TIPO'])}</h3><p class="c-muted" style="margin:0 0 12px;font-size:.86rem">${[j ? j['CLIENTE'] : '', x['TIPO'], x['DATA'] ? u.dm(String(x['DATA'])) : '', tipoArq(x['ARQUIVO'])].filter(Boolean).map(u.esc).join(' · ')}</p>
      ${novo ? `<p class="aviso ok-av">${u.svg('circle-check')} Guardado no trabalho. Confira o nome e, se for comprovante, o valor e de qual recebimento é.</p>` : ''}
      <button type="button" class="xver" id="xVer" data-a="telaX" data-id="${u.esc(x.ID)}" aria-label="Abrir em tela cheia"><p class="c-muted">Abrindo…</p></button>
      <div class="grid2" style="margin-top:10px"><button type="button" class="btn2" data-a="telaX" data-id="${u.esc(x.ID)}">${u.svg('eye')}Tela cheia</button><button type="button" class="btn2" data-a="shareX" data-id="${u.esc(x.ID)}">${u.svg('upload')}Compartilhar</button></div>
      <div class="jsec"><h4>${u.svg('pencil')} Sobre o arquivo</h4></div>
      ${campo('Nome', `<input class="txt" id="xN" value="${u.esc(x['NOME'] || '')}">`)}
      <div class="grid2">${campo('Tipo', `<select class="txt" id="xT">${opts(Object.keys(TIPOANX), x['TIPO'] || 'Outro')}</select>`)}${campo('Valor (se for comprovante)', `<input class="txt num" id="xV" inputmode="decimal" value="${u.esc(c.num(x['VALOR']) ? String(c.num(x['VALOR']).toFixed(2)).replace('.', ',') : '')}" placeholder="R$ 0,00">`)}</div>
      ${recs.length ? campo('É o comprovante de qual recebimento?', `<select class="txt" id="xL">${opts([['', 'Nenhum']].concat(recs.map(l => [l.id, `${u.dm(l.data)} · ${u.brl(l.valor)} · ${l.desc}`])), x['LANÇAMENTO'] || '')}</select>`) : ''}
      <div class="acoes"><button type="button" class="btn2 perigo" data-a="apagarX" data-id="${u.esc(x.ID)}">${u.svg('trash-2')}Excluir</button><button class="save" type="submit">Salvar</button></div>
      <button type="button" class="btn2" data-a="editJ" data-id="${u.esc(x['TRABALHO'])}" style="width:100%;margin-top:10px">${u.svg('chevron-left')}Voltar para ${u.esc(j ? j['CLIENTE'] : 'o trabalho')}</button>`,
      () => {
        const v = u.num(val('xV')), lid = val('xL'), l = lid && recs.find(r => r.id === lid);
        db.salvar('ANEXOS', { ID: id, 'NOME': val('xN').trim() || x['TIPO'], 'TIPO': val('xT'), 'VALOR': v > 0 ? u.r2(v) : l ? l.valor : '', 'LANÇAMENTO': lid || '', 'DATA': l ? l.data : x['DATA'] });
        toast('Arquivo atualizado'); if (j) formJob(db.achar('TRABALHOS', j.ID)); else fechar(); render(false);
      }, true);
    let dado = null;
    try { dado = await dadoDe(id); } catch (e) { dado = null; }
    const el = $('xVer'); if (!el || el.closest('#s2') !== $('s2')) return;
    if (!dado) { el.innerHTML = `<p class="aviso">Não consegui abrir agora (sem internet?). Toque para tentar de novo.</p>`; return; }
    if (img) { el.innerHTML = `<img src="${u.esc(u.dadoSeguro(dado))}" alt="${u.esc(x['NOME'] || 'comprovante')}">`; return; }
    if (!pdf) { el.innerHTML = `<div class="xarq">${u.svg('file-text')}<span>Este tipo de arquivo não abre aqui. Use “Compartilhar” para abrir em outro app ou salvar.</span></div>`; return; }
    try {
      const doc = await (await carregarPdfjs()).getDocument({ data: bytesDe(dado), isEvalSupported: false }).promise, pg = await doc.getPage(1), v1 = pg.getViewport({ scale: 1 });
      const vp = pg.getViewport({ scale: Math.min(2, ((el.clientWidth || 340) * (devicePixelRatio || 1)) / v1.width) }), cv = document.createElement('canvas');
      cv.width = vp.width; cv.height = vp.height; await pg.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
      if (!$('xVer')) return;
      el.innerHTML = ''; el.appendChild(cv);
      el.insertAdjacentHTML('beforeend', `<span class="xpag">${doc.numPages > 1 ? `Página 1 de ${doc.numPages} · ` : ''}toque para abrir em tela cheia</span>`);
    } catch (e) { el.innerHTML = `<div class="xarq">${u.svg('file-text')}<span>PDF · toque em “Tela cheia” ou “Compartilhar” para ver.</span></div>`; }
  }
  /* tela cheia: todas as páginas, com zoom (botões ou dois toques) */
  let visor = null;
  async function telaCheia(id) {
    const x = db.achar('ANEXOS', id); if (!x) return;
    fecharVisor();
    visor = document.createElement('div'); visor.className = 'visor'; visor.id = 'visor'; visor.dataset.zoom = '1';
    visor.innerHTML = `<div class="vbar"><button type="button" data-a="fecharVisor" aria-label="Fechar">${u.svg('x')}</button><b>${u.esc(x['NOME'] || x['TIPO'])}</b><button type="button" data-a="zoomV" data-v="-1" aria-label="Diminuir">${u.svg('minus')}</button><button type="button" data-a="zoomV" data-v="1" aria-label="Aumentar">${u.svg('plus')}</button><button type="button" data-a="shareX" data-id="${u.esc(x.ID)}" aria-label="Compartilhar">${u.svg('upload')}</button></div><div class="vpg" id="vPg"><p class="c-muted">Abrindo…</p></div>`;
    document.body.appendChild(visor); document.body.classList.add('com-visor');
    const box = $('vPg');
    box.addEventListener('dblclick', () => zoomVisor(visor.dataset.zoom === '1' ? 1 : -9));
    let dado; try { dado = await dadoDe(id); } catch (e) { dado = null; }
    if (!visor || !box.isConnected) return;
    if (!dado) { box.innerHTML = '<p class="aviso">Não consegui abrir agora (sem internet?).</p>'; return; }
    if (/^image\//.test(x['ARQUIVO'])) { box.innerHTML = `<img src="${u.esc(u.dadoSeguro(dado))}" alt="">`; return; }
    if (!/pdf/.test(x['ARQUIVO'])) { box.innerHTML = '<p class="aviso">Este tipo de arquivo não abre aqui. Use o botão de compartilhar.</p>'; return; }
    try {
      const doc = await (await carregarPdfjs()).getDocument({ data: bytesDe(dado), isEvalSupported: false }).promise; box.innerHTML = '';
      for (let i = 1; i <= Math.min(doc.numPages, 40); i++) {
        if (!box.isConnected) return;
        const pg = await doc.getPage(i), v1 = pg.getViewport({ scale: 1 }), vp = pg.getViewport({ scale: Math.min(3, (innerWidth * (devicePixelRatio || 1) * 1.6) / v1.width) });
        const cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height; cv.setAttribute('aria-label', `Página ${i} de ${doc.numPages}`);
        box.appendChild(cv); await pg.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
      }
    } catch (e) { box.innerHTML = '<p class="aviso">Não consegui desenhar o PDF. Use o botão de compartilhar para abrir em outro app.</p>'; }
  }
  function zoomVisor(d) {
    if (!visor) return;
    const box = $('vPg'), z0 = +visor.dataset.zoom, z = Math.max(1, Math.min(3, z0 + d * .5)), cx = (box.scrollLeft + box.clientWidth / 2) / z0, cy = (box.scrollTop + box.clientHeight / 2) / z0;
    visor.dataset.zoom = String(z); box.style.setProperty('--z', z);
    box.scrollLeft = cx * z - box.clientWidth / 2; box.scrollTop = cy * z - box.clientHeight / 2; /* o zoom mantém o mesmo ponto no meio da tela */
  }
  function fecharVisor() { if (visor) { visor.remove(); visor = null; } document.body.classList.remove('com-visor'); }
  const EXT = { 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png', 'image/heic': '.heic', 'image/webp': '.webp' };
  async function compartilharAnexo(id) {
    const x = db.achar('ANEXOS', id); if (!x) return;
    let dado; try { dado = await dadoDe(id); } catch (e) { dado = null; }
    if (!dado) { toast('Não consegui pegar o arquivo agora (sem internet?)'); return; }
    /* foto e PDF vão com o tipo certo; qualquer outro arquivo vai como "arquivo" (o navegador não abre como página) */
    const tipo = /^(image\/(jpeg|png|webp|gif|heic|heif)|application\/pdf)$/.test(x['ARQUIVO']) ? x['ARQUIVO'] : 'application/octet-stream', nome = String(x['NOME'] || 'arquivo').replace(/[\\/:*?"<>|]+/g, ' ').trim() + (EXT[tipo] || ''), blob = new Blob([bytesDe(dado)], { type: tipo });
    try { const arq = new File([blob], nome, { type: tipo }); if (navigator.canShare && navigator.canShare({ files: [arq] })) { await navigator.share({ files: [arq], title: nome }); return; } } catch (e) { if (e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 30000);
  }
  /* leitor de PDF (pdf.js), carregado só na primeira vez que abrir um PDF */
  const PDFJS = 'vendor/pdfjs/'; /* pdf.js 3.11.174 guardado no próprio app (veja vendor/pdfjs/LEIA-ME.md) */
  let pdfjs = null;
  const carregarPdfjs = () => pdfjs || (pdfjs = new Promise((ok, erro) => {
    const sc = document.createElement('script'); sc.src = PDFJS + 'pdf.min.js';
    sc.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; ok(window.pdfjsLib); };
    sc.onerror = () => { pdfjs = null; erro(new Error('leitor de PDF não carregou')); };
    document.head.appendChild(sc);
  }));
  /* excluir o trabalho leva junto os comprovantes e contratos dele (LGPD: não fica documento de cliente esquecido) */
  function apagarJob(id, botao) {
    const xs = c.anexos({ ID: id }), parc = semParcelas(db.achar('TRABALHOS', id) || { ID: id });
    if (!xs.length && !parc.length) return apagarSimples('TRABALHOS', id, botao, 'Trabalho excluído');
    if (botao.dataset.certeza !== '1') { botao.dataset.certeza = '1'; botao.innerHTML = u.svg('trash-2') + (xs.length ? `Toque de novo: apaga também ${xs.length} ${xs.length > 1 ? 'arquivos' : 'arquivo'}` : 'Toque de novo para excluir (e as parcelas a receber)'); return; }
    db.lote([{ op: 'apagar', aba: 'TRABALHOS', id }].concat(xs.map(x => ({ op: 'apagar', aba: 'ANEXOS', id: x.ID })), parc));
    xs.forEach(x => { delete arquivos[x.ID]; });
    fechar(); render(false); toast(xs.length ? `Trabalho e ${xs.length} ${xs.length > 1 ? 'arquivos excluídos' : 'arquivo excluído'}` : 'Trabalho excluído');
  }
  function apagarAnexo(id, botao) {
    if (botao.dataset.certeza !== '1') { botao.dataset.certeza = '1'; botao.innerHTML = u.svg('trash-2') + 'Toque de novo para excluir'; return; }
    const x = db.achar('ANEXOS', id); db.apagar('ANEXOS', id); delete arquivos[id];
    fecharVisor(); toast('Arquivo excluído'); if (x) formJob(db.achar('TRABALHOS', x['TRABALHO'])); render(false);
  }

  /* ---------- tarefas ---------- */
  function alternarTarefa(id, botao) {
    const t = c.tarefas().find(x => x.id === id); if (!t) return;
    const [tipo, a, b] = id.split(':');
    const lv0 = c.nivel(c.xp()).n;
    if (tipo === 'l') {
      /* pagou/recebeu: a data passa a ser hoje (o saldo do banco conta a partir de quando o dinheiro mexeu) e o vencimento fica anotado */
      const l = db.achar('EXTRATO', a), venc = (String(l['OBS'] || '').match(/venc\. (\d{4}-\d{2}-\d{2})/) || [])[1];
      const obs = String(l['OBS'] || '').replace(/\s*·?\s*(Pago|Recebido) pelo app/g, '').replace(/\s*·?\s*venc\. \d{4}-\d{2}-\d{2}/g, '').replace(/^\s*·\s*/, '');
      if (t.feita) db.salvar('EXTRATO', { ID: a, 'STATUS': 'Previsto', 'DATA': venc || l['DATA'], 'OBS': obs });
      else db.salvar('EXTRATO', { ID: a, 'STATUS': 'Pago', 'DATA': u.hoje(), 'OBS': [obs, `venc. ${String(l['DATA']).slice(0, 10)}`, t.grupo === 'receber' ? 'Recebido pelo app' : 'Pago pelo app'].filter(Boolean).join(' · ') });
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
      <div class="grid2">${campo('Quando', `<input class="txt" id="tD" type="date" value="${u.esc(t ? String(t['DATA'] || '') : u.hoje())}">`)}${campo('Valor (se tiver)', `<input class="txt num" id="tV" inputmode="decimal" value="${u.esc(t && t['VALOR'] !== '' ? String(c.num(t['VALOR']).toFixed(2)).replace('.', ',') : '')}" placeholder="R$ 0,00">`)}</div>
      ${campo('Tipo', `<select class="txt" id="tY">${opts(['Conta', 'Darzan', 'Pessoal'], t ? t['TIPO'] : 'Pessoal')}</select>`)}
      ${campo('Anotação', `<input class="txt" id="tO" value="${u.esc(t ? t['OBS'] || '' : '')}">`)}
      ${ed ? `<div class="acoes"><button type="button" class="btn2 perigo" data-a="apagarT" data-id="${u.esc(t.ID)}">${u.svg('trash-2')}Excluir</button><button class="save" type="submit">Salvar</button></div>` : '<button class="save" type="submit">Criar tarefa</button>'}`,
      () => { const n = val('tT').trim(); if (!n) return false; db.salvar('TAREFAS', Object.assign(t ? { ID: t.ID } : { 'FEITA': false }, { 'TAREFA': n, 'DATA': val('tD'), 'VALOR': val('tV') ? u.r2(u.num(val('tV'))) : '', 'TIPO': val('tY'), 'OBS': val('tO') })); fechar(); render(false); toast(t ? 'Tarefa atualizada' : 'Tarefa criada'); });
  }

  /* ---------- bancos, cartões, metas ---------- */
  function formConferir(banco) {
    const subs = c.contas().filter(x => x['BANCO'] === banco);
    abrir(`<h3 style="margin:0 0 4px">Conferir ${u.esc(banco)}</h3><p class="c-muted" style="margin:0 0 6px;font-size:.88rem">Abra o app do ${u.esc(banco)} e digite o saldo que aparece lá agora.</p>
      ${subs.map((x, i) => { const v = c.saldo(x); return campo(u.esc(x['CONTA']), `<input class="txt num" id="cf${i}" inputmode="decimal" data-calc="${v == null ? '' : v}" value="${u.esc(v == null ? '' : String(v.toFixed(2)).replace('.', ','))}" placeholder="R$ 0,00"><div class="diff" id="df${i}">${v == null ? '' : `O app calculou ${u.brl(v)}`}</div>`); }).join('')}
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
    abrir(`<h3 style="margin:0 0 12px">Cartão ${u.esc(nome)}</h3><div class="grid2">${campo('Fecha dia', `<input class="txt num" id="kF" inputmode="numeric" value="${u.esc(k['FECHA DIA'] || '')}">`)}${campo('Vence dia', `<input class="txt num" id="kV" inputmode="numeric" value="${u.esc(k['VENCE DIA'] || '')}" placeholder="ex.: 14">`)}</div><div class="grid2">${campo('Limite', `<input class="txt num" id="kL" inputmode="decimal" value="${u.esc(k['LIMITE'] !== '' ? String(c.num(k['LIMITE'])) : '')}">`)}${campo('Pago pela conta', `<select class="txt" id="kP">${opts(c.BANCOS.filter(b => b !== 'Não informado').map(b => [b + ' · Conta', b]), String(k['PAGA PELA CONTA'] || nome + ' · Conta'))}</select>`)}</div><button class="save" type="submit">Salvar</button>`,
      () => { db.salvar('CARTOES', { ID: k.ID, 'FECHA DIA': parseInt(val('kF'), 10) || '', 'VENCE DIA': parseInt(val('kV'), 10) || '', 'LIMITE': u.num(val('kL')) || '', 'PAGA PELA CONTA': val('kP') }); fechar(); render(false); toast('Cartão atualizado'); });
  }
  function formMeta(g) {
    abrir(`<h3 style="margin:0 0 12px">${g ? 'Editar meta' : 'Nova meta'}</h3>${campo('Meta', `<input class="txt" id="gN" required value="${u.esc(g ? g['META'] : '')}" placeholder="Ex.: Viagem Chile">`)}<div class="grid2">${campo('Valor alvo', `<input class="txt num" id="gA" inputmode="decimal" value="${u.esc(g ? String(c.num(g['VALOR ALVO'])) : '')}">`)}${campo('Já guardado', `<input class="txt num" id="gJ" inputmode="decimal" value="${u.esc(g ? String(c.num(g['JÁ GUARDADO'])) : '')}">`)}</div><div class="grid2">${campo('Onde está', `<select class="txt" id="gO">${opts([['', '—']].concat(c.caixinhas().map(x => [x['CONTA'], x['CONTA']])), g ? g['ONDE ESTÁ'] : '')}</select>`)}${campo('Prazo', `<input class="txt" id="gP" type="date" value="${u.esc(g ? String(g['PRAZO'] || '') : '')}">`)}</div>
      ${g ? `<div class="acoes"><button type="button" class="btn2 perigo" data-a="apagarM" data-id="${u.esc(g.ID)}">${u.svg('trash-2')}Excluir</button><button class="save" type="submit">Salvar</button></div>` : '<button class="save" type="submit">Criar meta</button>'}`,
      () => { const n = val('gN').trim(); if (!n) return false; db.salvar('METAS', Object.assign(g ? { ID: g.ID } : {}, { 'META': n, 'VALOR ALVO': u.num(val('gA')), 'JÁ GUARDADO': u.num(val('gJ')), 'ONDE ESTÁ': val('gO'), 'PRAZO': val('gP') })); fechar(); render(false); toast('Meta salva'); });
  }
  function apagarSimples(aba, id, botao, msg) {
    if (botao.dataset.certeza !== '1') { botao.dataset.certeza = '1'; botao.innerHTML = u.svg('trash-2') + 'Toque de novo para excluir'; return; }
    const copia = Object.assign({}, db.achar(aba, id));
    db.apagar(aba, id); fechar(); render(false); toast(msg, () => { db.salvar(aba, copia); render(false); });
  }

  /* ================= efeitos ================= */
  function toast(t, desfazer, rotulo = 'Desfazer') {
    const el = $('toast'); el.hidden = true; void el.offsetWidth;
    el.innerHTML = `<span>${u.esc(t)}</span>${desfazer ? `<button type="button" class="ub">${u.esc(rotulo)}</button>` : ''}`; el.hidden = false;
    if (desfazer) el.querySelector('.ub').onclick = () => { el.hidden = true; desfazer(); };
    clearTimeout(toast.h); toast.h = setTimeout(() => el.hidden = true, desfazer ? 6500 : 3000);
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
    $('tabbar').innerHTML = TABS.map(([k, n, i]) => k === 'tarefas' ? `<button class="tab mid" type="button" data-a="go" data-v="tarefas" ${ui.view === k ? 'aria-current="page"' : ''}><span class="orb">${u.svg(i)}</span>${urg ? `<span class="cnt">${urg}</span>` : ''}<span>${n}</span></button>` : `<button class="tab" type="button" data-a="go" data-v="${u.esc(k)}" ${ui.view === k ? 'aria-current="page"' : ''}>${u.svg(i)}<span>${n}</span></button>`).join('');
    $('snav').innerHTML = TABS.map(([k, n, i]) => `<button type="button" data-a="go" data-v="${u.esc(k)}" ${ui.view === k ? 'aria-current="page"' : ''}>${u.svg(i)}${n}${k === 'tarefas' && urg ? `<span class="cnt">${urg}</span>` : ''}</button>`).join('') + `<div class="sep"></div><button type="button" data-a="irRel" data-v="mes">${u.svg('chart-column')}Relatórios</button><button type="button" data-a="ocultar">${u.svg(ui.oculto ? 'eye-off' : 'eye')}${ui.oculto ? 'Mostrar valores' : 'Esconder valores'}</button><button type="button" data-a="conta">${u.svg('user')}Sua conta</button>`;
    const lv = c.nivel(c.xp());
    $('sbrand').innerHTML = `<div class="ringw">${anel(lv.atual / lv.prox, 56, 4, '#ffd36b')}${foto()}<span class="lvl">Nv ${lv.n}</span></div><div><b>João Darzan</b><span>${lv.nome}</span></div>`;
    $('fabwrap').hidden = ui.view === 'inicio' || (ui.view === 'fin' && ui.fseg === 'revisar');
  }
  function render(anim = true) {
    lembrarNav(); nav();
    const v = $('view');
    v.innerHTML = (R[ui.view] || R.inicio)();
    if (DEPOIS[ui.view]) DEPOIS[ui.view]();
    corDoTopo();
    if (anim) animar(document); else v.querySelectorAll('.rg').forEach(k => k.style.strokeDashoffset = k.dataset.off);
  }
  A.render = render;
  function go(v) { ui.view = v; render(); scrollTo({ top: 0 }); }
  /* ---------- voltar: o app lembra por onde você passou (aba, seção, filtro) e volta um passo de cada vez.
     O "voltar" do celular (Android) fecha primeiro a janela aberta; depois volta a tela */
  const pilha = [];
  let navAnt = null;
  const navAgora = () => ({ view: ui.view, fseg: ui.fseg, rseg: ui.rseg, jseg: ui.jseg, filtro: ui.filtro, cartao: ui.cartao });
  function lembrarNav() {
    const n = navAgora();
    if (n.view === 'inicio') { pilha.length = 0; navAnt = n; return; } /* chegou no início: o caminho recomeça daqui */
    if (navAnt && JSON.stringify(n) !== JSON.stringify(navAnt)) { pilha.push(navAnt); try { if (pilha.length > 40) { pilha.shift(); history.replaceState({ df: 1 }, ''); } else history.pushState({ df: 1 }, ''); } catch (e) { /* sem histórico */ } }
    navAnt = n;
  }
  function voltarUmPasso() { const n = pilha.pop(); if (!n) return; Object.assign(ui, n); navAnt = n; render(); scrollTo({ top: 0 }); }
  A.voltar = () => { if (pilha.length) history.back(); else go('inicio'); };
  addEventListener('popstate', () => {
    const segura = () => { try { history.pushState({ df: 1 }, ''); } catch (e) { /* sem histórico */ } };
    if (visor) { fecharVisor(); segura(); return; }
    if (!$('scrim2').hidden) { fechar(); segura(); return; }
    voltarUmPasso();
  });

  /* ================= cliques ================= */
  const ACOES = {
    go: b => go(b.dataset.v),
    voltar: () => A.voltar(),
    mes: b => { const ms = c.meses(), i = ms.indexOf(ui.mes) + +b.dataset.d; if (ms[i]) { ui.mes = ms[i]; render(); } },
    escolherMes: () => seletorMes(ui.mes.slice(0, 4)),
    mpAno: b => { if (b.dataset.v) seletorMes(b.dataset.v); },
    irMes: b => { if (c.meses().includes(b.dataset.v)) { ui.mes = b.dataset.v; fechar(); render(); } },
    seg: b => { if (b.dataset.s === 'rvfil' && ui.rvfil !== b.dataset.v) ui.rvsel.clear(); ui[b.dataset.s] = b.dataset.v; render(!['filtro', 'tfil', 'rvfil'].includes(b.dataset.s)); },
    ocultar: () => { ui.oculto = !ui.oculto; try { localStorage.setItem('df-oculto', ui.oculto ? '1' : '0'); } catch (e) { /* sem armazenamento */ } render(false); },
    irBancos: () => { ui.fseg = 'bancos'; go('fin'); },
    irRevisar: () => { ui.fseg = 'revisar'; go('fin'); },
    rvMarca: b => { const id = b.dataset.id; if (ui.rvsel.has(id)) ui.rvsel.delete(id); else ui.rvsel.add(id); render(false); },
    rvMes: b => { const L = listaRevisar().filter(l => u.mes(l.data) === b.dataset.v), tudo = L.every(l => ui.rvsel.has(l.id)); L.forEach(l => tudo ? ui.rvsel.delete(l.id) : ui.rvsel.add(l.id)); render(false); },
    rvTodos: () => { const L = listaRevisar(), tudo = L.length && L.every(l => ui.rvsel.has(l.id)); L.forEach(l => tudo ? ui.rvsel.delete(l.id) : ui.rvsel.add(l.id)); render(false); },
    rvMudar: () => formMudar(),
    rvSugestoes: () => {
      const mem = c.memoria(), por = {};
      [...ui.rvsel].forEach(id => { const l = c.lancs().find(x => x.id === id), s = l && c.sugerir(l.desc, mem); if (s) (por[[s.cat, s.sub, s.grupo].join('|')] = por[[s.cat, s.sub, s.grupo].join('|')] || []).push(id); });
      const voltas = Object.entries(por).map(([k, ids]) => { const [cat, sub, grupo] = k.split('|'); ids.forEach(id => ui.rvsel.delete(id)); return mudarVarios(ids, { cat, sub, grupo }); });
      const n = Object.values(por).flat().length; render(false);
      toast(`${n} lançamento${n > 1 ? 's' : ''} categorizado${n > 1 ? 's' : ''} pelas sugestões`, () => voltas.forEach(f => f()));
    },
    irCartoes: b => { ui.fseg = 'cartoes'; if (b.dataset.v) ui.cartao = b.dataset.v; go('fin'); },
    irExtrato: () => { ui.fseg = 'extrato'; ui.filtro = 'tudo'; go('fin'); },
    irRel: b => { ui.fseg = 'relatorios'; ui.rseg = b.dataset.v || 'mes'; go('fin'); },
    abreCat: b => { ui.cexp = ui.cexp === b.dataset.v ? null : b.dataset.v; render(false); },
    filtroCat: b => { ui.fseg = 'extrato'; ui.filtro = 'cat:' + b.dataset.v; go('fin'); },
    novoL: b => formLanc(b.dataset.t),
    trocaTipo: b => b.dataset.v === 'transferir' ? formTransferir() : formLanc(b.dataset.v),
    transferir: () => formTransferir(),
    apagarTransf: b => apagarTransf(b.dataset.id, b),
    correcoes: () => formCorrecoes(),
    editL: b => { const r = db.achar('EXTRATO', b.dataset.id); if (!r) return; const par = c.parTransf(c.l(r)); if (par) formTransferir(par); else formLanc(null, c.l(r)); },
    apagarL: b => apagarLanc(b.dataset.id, b),
    apagarCompra: b => apagarCompra(b.dataset.id, b),
    novoE: () => formEquip(null),
    editE: b => formEquip(db.achar('EQUIPAMENTOS', b.dataset.id)),
    apagarE: b => apagarEquip(b.dataset.id, b),
    novoJ: () => formJob(null),
    editJ: b => { formJob(db.achar('TRABALHOS', b.dataset.id)); const f = b.dataset.foco && $(b.dataset.foco); if (f) { f.scrollIntoView({ block: 'center' }); f.focus(); } },
    apagarJ: b => apagarJob(b.dataset.id, b),
    receber: b => receber(b.dataset.id, b.dataset.sub),
    etapaJ: b => etapaNaFicha(b),
    novoRec: () => formJob(null, { 'ETAPA': 'Recorrente', 'TIPO DE EVENTO': 'Social media' }),
    vidJ: b => mexerVideos(b.dataset.id, vs => { const v = vs[+b.dataset.i]; if (v) v.feito = !v.feito; }),
    tiraVid: b => mexerVideos(b.dataset.id, vs => vs.splice(+b.dataset.i, 1)),
    addVid: b => addVideo(b.dataset.id),
    verX: b => verAnexo(b.dataset.id),
    telaX: b => telaCheia(b.dataset.id),
    shareX: b => compartilharAnexo(b.dataset.id),
    zoomV: b => zoomVisor(+b.dataset.v),
    fecharVisor: () => fecharVisor(),
    recarregarX: b => { toast('Tentando de novo…'); db.atualizar().then(() => { refazJob(b.dataset.id, ['jAnx', 'jRec']); toast(semAnexos() ? 'Ainda não deu. Confira a internet.' : 'Pronto!'); }).catch(() => toast('Sem internet agora')); },
    apagarX: b => apagarAnexo(b.dataset.id, b),
    tarefa: b => alternarTarefa(b.dataset.id, b),
    novoT: () => formTarefa(null),
    editT: b => { const [tp, id] = b.dataset.id.split(':'); if (tp === 't') formTarefa(db.achar('TAREFAS', id)); else if (tp === 'l') { const r = db.achar('EXTRATO', id); if (r) formLanc(null, c.l(r)); } else { ui.fseg = 'cartoes'; ui.cartao = id; ui.mes = b.dataset.id.split(':')[2]; go('fin'); } },
    apagarT: b => apagarSimples('TAREFAS', b.dataset.id, b, 'Tarefa excluída'),
    conferir: b => formConferir(b.dataset.v),
    novaCx: b => formCaixinha(b.dataset.v),
    editK: b => formCartao(b.dataset.v),
    novoM: () => formMeta(null),
    novoF: () => formFixa(null),
    editF: b => formFixa(db.achar('FIXAS', b.dataset.id)),
    apagarF: b => apagarSimples('FIXAS', b.dataset.id, b, 'Conta fixa excluída'),
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
  const corDoTopo = () => document.body.classList.toggle('topo-azul', ui.view === 'inicio' && scrollY < 40 && !!document.querySelector('#view .hero'));
  addEventListener('scroll', () => { const t = $('tip'); if (t) t.hidden = true; corDoTopo(); }, { passive: true });
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
    document.body.classList.remove('demo');
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
    pilha.length = 0; navAnt = null;
    document.body.classList.toggle('demo', N.ehDemo());
    const temCopia = db.abrirCopia();
    if (temCopia) { escolherMes(); render(); splash.sair(); }
    try {
      await db.atualizar();
      if (db.vazio()) { splash.sair(); return telaImportar(); }
      const criou = db.garantirFixas();
      setTimeout(sincronizarAvisos, 300);
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
    const demo = N.ehDemo(), ref = !demo && (N.config.url.match(/https:\/\/([^.]+)\./) || [])[1];
    abrir(`<h3 style="margin:0 0 4px">Sua conta</h3><p class="c-muted" style="margin:0 0 16px">${u.esc((N.sessao && N.sessao.user.email) || '')}</p>
      ${demo ? '<p class="aviso" id="avisoDemo" style="margin:0 0 14px">Modo demonstração: os dados são inventados e ficam só neste aparelho. Pode mexer à vontade; ao sair, tudo volta ao começo.</p>' : ''}
      <div style="display:grid;gap:10px">
        <button type="button" class="btn2" data-a="correcoes">${u.svg('upload')}Trazer correções de um arquivo</button>
        <button type="button" class="btn2" data-a="baixarCopia">${u.svg('file-text')}Baixar uma cópia dos dados</button>
        ${ref ? `<a class="btn2" href="https://supabase.com/dashboard/project/${ref}/editor" target="_blank" rel="noopener">${u.svg('pencil')}Ver e mexer nos dados no Supabase</a>` : ''}
        <button type="button" class="btn2" data-a="ocultar">${u.svg(ui.oculto ? 'eye' : 'eye-off')}${ui.oculto ? 'Mostrar os valores' : 'Esconder os valores'}</button>
        ${demo ? '' : `<h4 class="fl" style="margin:6px 0 0">Avisos no celular</h4>${blocoAvisos()}
        <h4 class="fl" style="margin:6px 0 0">Acesso do Claude</h4><div id="blClaude" style="display:grid;gap:10px"><p class="c-muted" style="margin:0;font-size:.86rem">Carregando…</p></div>`}
        <h4 class="fl" style="margin:6px 0 0">Aparelho e dados</h4>
        <button type="button" class="btn2" data-a="faceid" id="btFace" hidden>${u.svg('scan-face')}${A.face && A.face.ligado() ? `Desligar o ${A.face.nome}` : `Abrir o app com ${A.face ? A.face.nome : 'Face ID'}`}</button>
        <button type="button" class="btn2 perigo" data-a="sair">${u.svg('log-out')}Sair deste aparelho</button>
      </div>
      <p class="c-muted" style="font-size:.8rem;margin:16px 0 0">${demo ? 'Demonstração: nada vai para o Supabase.' : db.pendentes() ? `${db.pendentes()} mudança(s) esperando internet para salvar.` : 'Tudo salvo no Supabase.'}</p>`, null);
    if (!demo) blocoClaude();
    A.face.disponivel().then(ok => { const b = $('btFace'); if (!b) return; b.hidden = false; if (!ok && !A.face.ligado()) { b.disabled = true; b.innerHTML = `${u.svg('scan-face')}Este aparelho não liberou o ${A.face.nome} para o app`; } });
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
      sairDoAparelho().then(() => { fechar(); mostrarLogin(); });
    },
    recomecar: () => { $('splash').querySelector('.spin').hidden = false; $('splash').querySelector('p').textContent = 'Abrindo…'; iniciar(); },
  });
  N.aoSair = () => mostrarLogin('Sua sessão terminou. Entre de novo.');
  /* sair deste aparelho: tira ele dos avisos, esquece o Face ID e apaga a cópia dos dados (num aparelho emprestado não sobra nada) */
  async function sairDoAparelho() {
    try { const id = avisos.meu(); if (id && N.sessao && !N.ehDemo()) await N.apagar('aparelhos', [id]); } catch (e) { /* sem internet: o aparelho fica na lista até o aviso falhar */ }
    try { await avisos.desligar(); } catch (e) { /* nada */ }
    try { face.desligar(); localStorage.removeItem('df-chave-claude'); localStorage.removeItem('df-ultimo-uso'); } catch (e) { /* nada */ }
    claude.nova = ''; db.esquecer(); await N.sair();
  }

  /* ================= Face ID (trava do aparelho) ================= */
  /* Usa a biometria do próprio aparelho (WebAuthn). Fica só neste aparelho: o login continua salvo
     e o app só mostra os valores depois do Face ID. Se falhar, dá para entrar com a senha. */
  const face = {
    nome: /iPhone|iPad|Macintosh/.test(navigator.userAgent) ? 'Face ID' : 'biometria do aparelho',
    chave: () => 'df-faceid-' + ((N.sessao && N.sessao.user.id) || 'x'),
    ligado: () => { try { return !!localStorage.getItem(face.chave()); } catch (e) { return false; } },
    disponivel: async () => { try { return !!(window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch (e) { return false; } },
    b64: buf => btoa(String.fromCharCode(...new Uint8Array(buf))),
    bytes: b64 => Uint8Array.from(atob(b64), ch => ch.charCodeAt(0)),
    desafio: () => crypto.getRandomValues(new Uint8Array(32)),
    async ligar() {
      const s = N.sessao;
      const cred = await navigator.credentials.create({ publicKey: {
        challenge: face.desafio(), rp: { name: 'Darzan Finanças' },
        user: { id: new TextEncoder().encode(s.user.id), name: s.user.email, displayName: s.user.email },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' }, timeout: 60000,
      } });
      localStorage.setItem(face.chave(), face.b64(cred.rawId));
    },
    desligar: () => { try { localStorage.removeItem(face.chave()); } catch (e) { /* nada */ } },
    pedido: null,
    async conferir() {
      /* uma tentativa de cada vez: se a automática ainda está esperando, cancela antes da do toque */
      if (face.pedido) face.pedido.abort();
      const ctl = face.pedido = new AbortController();
      const id = localStorage.getItem(face.chave());
      try { await navigator.credentials.get({ signal: ctl.signal, publicKey: { challenge: face.desafio(), allowCredentials: [{ type: 'public-key', id: face.bytes(id), transports: ['internal', 'hybrid'] }], userVerification: 'required', timeout: 60000 } }); }
      finally { if (face.pedido === ctl) face.pedido = null; }
    },
    detalhe: e => e ? `${e.name || 'Erro'}: ${e.message || e}` : '',
  };
  A.face = face;
  /* como tela de bloqueio: só pede o rosto quando você fica 15 minutos fora do app.
     Um toque em qualquer lugar da tela já chama o Face ID (o iPhone exige um toque antes). */
  const PRAZO = 15 * 60 * 1000, CHAVE_USO = 'df-ultimo-uso';
  const usou = () => { try { localStorage.setItem(CHAVE_USO, String(Date.now())); } catch (e) { /* nada */ } };
  const ultimoUso = () => { try { return +localStorage.getItem(CHAVE_USO) || 0; } catch (e) { return 0; } };
  face.precisa = () => face.ligado() && Date.now() - ultimoUso() > PRAZO;
  let travado = false, destravando = false, abrindo = null;
  function mostrarTrava() {
    travado = true;
    $('trFoto').innerHTML = foto(); $('trErro').hidden = true;
    $('trMsg').textContent = 'Toque na tela para abrir'; $('trBtnTxt').textContent = `Abrir com ${face.nome}`;
    fechar(); $('trava').hidden = false; $('trava').classList.remove('out'); splash.sair();
  }
  async function destravar() {
    if (destravando) return; /* um pedido de cada vez: tocar de novo não atrapalha o que já está aberto */
    destravando = true;
    const er = $('trErro'); er.hidden = true; $('trBtnTxt').textContent = 'Olhe para o celular…';
    try {
      await face.conferir();
      travado = false; usou();
      const T = $('trava'); T.classList.add('out'); setTimeout(() => T.hidden = true, 300);
      if (abrindo) await abrindo; else if (!db.carregado) await abrirApp(); else render(false);
    } catch (e) {
      if (!(e && e.name === 'AbortError')) {
        er.innerHTML = `${e && e.name === 'NotAllowedError' ? 'Não reconheceu. Toque de novo para tentar.' : `O ${face.nome} não funcionou aqui. Entre com a senha.`}<br><small style="opacity:.7">${u.esc(face.detalhe(e))}</small>`;
        er.hidden = false;
      }
    } finally { destravando = false; if (travado) $('trBtnTxt').textContent = `Abrir com ${face.nome}`; }
  }
  /* a tela inteira é o botão (menos o "Entrar com a senha") */
  $('trava').addEventListener('click', e => { if (!e.target.closest('#trSenha')) destravar(); });
  $('trSenha').addEventListener('click', () => { face.desligar(); db.esquecer(); N.sair(); $('trava').hidden = true; travado = false; mostrarLogin('Entre com a senha. Depois dá para ligar o Face ID de novo em “Sua conta”.'); });
  /* enquanto está usando, vai marcando; saiu e voltou depois de 15 minutos, pede o rosto */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (!travado) usou(); return; }
    if (!travado && N.sessao && face.precisa()) mostrarTrava();
  });
  addEventListener('pagehide', () => { if (!travado) usou(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || travado || !db.carregado || !N.sessao || Date.now() - (db.quando || 0) < 60000) return;
    db.atualizar().then(() => render(false)).catch(() => { });
  });
  setInterval(() => { if (!document.hidden && !travado) usou(); }, 30000);
  A.trava = { usou, ultimoUso };
  ACOES.faceid = async b => {
    if (face.ligado()) { face.desligar(); toast(`${face.nome} desligado neste aparelho`); return formConta(); }
    try { await face.ligar(); usou(); toast(`Pronto! Quando você ficar 15 minutos fora, o app pede o ${face.nome}`); formConta(); }
    catch (e) { toast(e && e.name === 'NotAllowedError' ? `Não ligou (${face.detalhe(e)}). Tente de novo.` : `Não consegui ligar o ${face.nome}: ${face.detalhe(e)}`); }
  };

  /* ================= avisos no celular ================= */
  /* a agenda acompanha os dados: pagou a conta, o aviso sai; nova fatura, o aviso entra */
  function sincronizarAvisos() {
    if (!db.carregado || !N.sessao || N.ehDemo() || (db.faltando && db.faltando.has('AVISOS'))) return;
    const hoje = u.hoje(), quero = c.avisos(), mapa = new Map(quero.map(a => [a.ID, a])), ops = [];
    quero.forEach(a => {
      const x = db.achar('AVISOS', a.ID);
      if (!x) ops.push({ op: 'salvar', aba: 'AVISOS', registro: a });
      else if (!x['ENVIADO'] && (x['TITULO'] !== a.TITULO || x['CORPO'] !== a.CORPO)) ops.push({ op: 'salvar', aba: 'AVISOS', registro: { ID: a.ID, 'TITULO': a.TITULO, 'CORPO': a.CORPO } });
    });
    db.linhas('AVISOS').forEach(x => {
      const velho = String(x['QUANDO']) < u.addDias(hoje, x['TIPO'] === 'teste' ? -1 : -30);
      if ((!x['ENVIADO'] && x['TIPO'] !== 'teste' && !mapa.has(x.ID)) || velho) ops.push({ op: 'apagar', aba: 'AVISOS', id: x.ID });
    });
    if (ops.length) db.lote(ops);
  }
  let agendaH = 0;
  db.aoMudar(ops => { if (ops.some(o => o.aba !== 'AVISOS' && o.aba !== 'APARELHOS')) { clearTimeout(agendaH); agendaH = setTimeout(sincronizarAvisos, 1200); } });
  A.sincronizarAvisos = sincronizarAvisos;

  const avisos = {
    suporte: () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window,
    noIphoneSemIcone: () => /iPhone|iPad/.test(navigator.userAgent) && !navigator.standalone && !matchMedia('(display-mode: standalone)').matches,
    meu: () => { try { return localStorage.getItem('df-aparelho'); } catch (e) { return null; } },
    ligado: () => !!avisos.meu() && !!db.achar('APARELHOS', avisos.meu()) && (!!window.DF_PUSH_FALSO || (!!window.Notification && Notification.permission === 'granted')),
    chave: () => { const b = atob(N.config.vapid.replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, ch => ch.charCodeAt(0)); },
    nome: () => /iPhone/.test(navigator.userAgent) ? 'iPhone' : /iPad/.test(navigator.userAgent) ? 'iPad' : /Android/.test(navigator.userAgent) ? 'Android' : 'Computador',
    async inscrever() {
      if (window.DF_PUSH_FALSO) return window.DF_PUSH_FALSO; /* testes */
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: avisos.chave() });
      return sub.toJSON();
    },
    async ligar() {
      /* o iPhone só deixa pedir permissão no toque: isto vem primeiro */
      const perm = window.DF_PUSH_FALSO ? 'granted' : await Notification.requestPermission();
      if (perm !== 'granted') throw new Error(perm === 'denied' ? 'os avisos estão bloqueados para o app nos Ajustes do iPhone' : 'você não permitiu os avisos');
      const j = await avisos.inscrever();
      const h = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(j.endpoint)))).slice(0, 10).map(b => b.toString(16).padStart(2, '0')).join('');
      const id = 'D' + h;
      db.salvar('APARELHOS', { ID: id, 'NOME': avisos.nome(), 'ENDPOINT': j.endpoint, 'P256DH': j.keys.p256dh, 'AUTH': j.keys.auth });
      try { localStorage.setItem('df-aparelho', id); } catch (e) { /* nada */ }
      sincronizarAvisos();
      avisos.agora('Avisos ligados', 'Você vai receber aqui as faturas, contas e trabalhos, 1 dia antes e no dia.').catch(() => { });
    },
    /* mostra um aviso na hora, neste aparelho (sem passar pelo servidor) */
    async agora(titulo, corpo) {
      if (window.DF_PUSH_FALSO) { (window.DF_NOTIFS = window.DF_NOTIFS || []).push({ titulo, corpo }); return; } /* testes */
      if (!window.Notification || Notification.permission !== 'granted') throw new Error('os avisos não estão liberados para o app nos Ajustes do iPhone');
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(titulo, { body: corpo, icon: 'img/icone-192.png', badge: 'img/icone-192.png', tag: 'agora-' + Date.now(), renotify: true, silent: false, vibrate: [200, 100, 200] });
    },
    async desligar() {
      const id = avisos.meu();
      if (id && db.achar('APARELHOS', id)) db.apagar('APARELHOS', id);
      try { localStorage.removeItem('df-aparelho'); } catch (e) { /* nada */ }
      if (!window.DF_PUSH_FALSO && avisos.suporte()) { const reg = await navigator.serviceWorker.getRegistration(); const sub = reg && await reg.pushManager.getSubscription(); if (sub) await sub.unsubscribe(); }
    },
    /* teste: um aviso na hora (confere se aparece, toca e vibra) e outro pelo servidor (confere o caminho com o app fechado) */
    async teste() {
      await avisos.agora('Teste do Darzan Finanças', 'Chegou! Os avisos estão funcionando neste aparelho.');
      db.salvar('AVISOS', { ID: 'AV-teste-' + Date.now().toString(36), 'QUANDO': u.hoje(), 'TITULO': 'Teste pelo servidor', 'CORPO': 'Este veio pelo servidor: os avisos chegam mesmo com o app fechado.', 'TIPO': 'teste', 'ENVIADO': '' });
      for (let i = 0; i < 40 && db.pendentes(); i++) await new Promise(r => setTimeout(r, 250));
      if (db.pendentes()) throw new Error('sem internet agora');
    },
  };
  A.avisos = avisos;
  /* ================= acesso do Claude ================= */
  /* uma chave que o João cria aqui e manda para o Claude no chat: com ela o Claude lê e corrige os dados direto.
     No Supabase fica só a impressão digital (sha256) da chave; trocar ou desligar aqui corta o acesso na hora. */
  const claude = {
    /* a chave aparece só logo depois de criar e nunca fica guardada no aparelho (se alguém pegar o celular, não acha) */
    nova: '',
    chaveLocal: () => claude.nova,
    async estado() { const r = await N.ler('acesso_claude'); return r[0] || null; },
    async criar() {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      const chave = 'dfc_' + btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(chave)))).map(b => b.toString(16).padStart(2, '0')).join('');
      await N.gravar('acesso_claude', [{ id: N.sessao.user.id, hash }]);
      claude.nova = chave;
      return chave;
    },
    async desligar() { await N.apagar('acesso_claude', [N.sessao.user.id]); claude.nova = ''; },
  };
  A.claude = claude;
  async function blocoClaude() {
    const el = $('blClaude'); if (!el) return;
    let est;
    try { est = await claude.estado(); } catch (e) { el.innerHTML = `<div class="aviso">${e.semInternet ? 'Sem internet agora: o acesso do Claude aparece aqui quando a conexão voltar.' : 'O acesso do Claude ainda não está instalado no Supabase (falta rodar o SQL novo).'}</div>`; return; }
    const chave = claude.chaveLocal();
    el.innerHTML = est ? `<div class="aviso ok-av">${u.svg('sparkles')} Acesso ligado${est.ultimo_uso ? ` · o Claude usou em ${new Date(est.ultimo_uso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : ' · o Claude ainda não usou'}.</div>
        ${chave ? `<input class="txt" id="clChave" readonly value="${u.esc(chave)}" aria-label="Chave do Claude"><button type="button" class="btn2 pri" data-a="claudeCopiar">${u.svg('file-text')}Copiar a chave</button><p class="aviso">Copie agora: por segurança, a chave não fica guardada no aparelho e some quando você sair desta tela. Se perder, é só trocar.</p>` : ''}
        <button type="button" class="btn2" data-a="claudeCriar">${u.svg('refresh-ccw')}Trocar a chave</button>
        <button type="button" class="btn2 perigo" data-a="claudeDesligar">${u.svg('x')}Desligar o acesso do Claude</button>`
      : `<p class="c-muted" style="margin:0;font-size:.86rem">Com uma chave, o Claude lê e corrige seus dados direto, sem você precisar trazer arquivos. Você troca ou desliga quando quiser.</p>
        <button type="button" class="btn2 pri" data-a="claudeCriar">${u.svg('sparkles')}Criar a chave para o Claude</button>`;
  }
  Object.assign(ACOES, {
    claudeCriar: async b => { b.disabled = true; try { await claude.criar(); await blocoClaude(); toast('Chave criada: toque em Copiar e mande para o Claude no chat'); } catch (e) { b.disabled = false; toast('Não deu para criar a chave: ' + e.message); } },
    claudeCopiar: () => { const i = $('clChave'), ok = () => toast('Chave copiada: cole no chat do Claude'); try { navigator.clipboard.writeText(i.value).then(ok, () => { i.select(); toast('Selecionei a chave: copie e cole no chat'); }); } catch (e) { i.select(); } },
    claudeDesligar: async b => {
      if (b.dataset.certeza !== '1') { b.dataset.certeza = '1'; b.innerHTML = u.svg('x') + 'Toque de novo para desligar'; return; }
      try { await claude.desligar(); await blocoClaude(); toast('Acesso do Claude desligado'); } catch (e) { toast('Não deu para desligar: ' + e.message); }
    },
  });

  function blocoAvisos() {
    if (!avisos.suporte() && !window.DF_PUSH_FALSO) return `<div class="aviso">${u.svg('bell')} ${avisos.noIphoneSemIcone() ? 'Para receber avisos no iPhone, abra o app pelo <b>ícone da tela de início</b> (Safari → Compartilhar → Adicionar à Tela de Início) e volte aqui.' : 'Este navegador não recebe avisos.'}</div>`;
    if (avisos.ligado()) return `<div class="aviso ok-av">${u.svg('bell-ring')} Avisos ligados neste aparelho: faturas, contas para pagar e trabalhos, 1 dia antes e no dia, às 9h.</div>
      <button type="button" class="btn2" data-a="avisoTeste">${u.svg('bell')}Testar os avisos agora</button>
      <button type="button" class="btn2" data-a="avisoDesligar">${u.svg('bell')}Desligar os avisos neste aparelho</button>`;
    return `<button type="button" class="btn2 pri" data-a="avisoLigar">${u.svg('bell-ring')}Ligar avisos neste aparelho</button>`;
  }
  Object.assign(ACOES, {
    avisoLigar: async b => { b.disabled = true; try { await avisos.ligar(); toast('Avisos ligados!'); formConta(); } catch (e) { b.disabled = false; toast('Não deu para ligar os avisos: ' + e.message); } },
    avisoDesligar: async () => { await avisos.desligar(); toast('Avisos desligados neste aparelho'); formConta(); },
    avisoTeste: async b => { b.disabled = true; try { await avisos.teste(); toast('Aviso de teste enviado agora. Outro vem pelo servidor em até 30 minutos, mesmo com o app fechado.'); } catch (e) { toast('Não deu para testar: ' + e.message); } finally { b.disabled = false; } },
  });

  async function iniciar() {
    if (!N.sessao) return mostrarLogin();
    if (face.precisa()) {
      /* já vai carregando os dados por trás da tela de bloqueio: destravou, está tudo pronto */
      mostrarTrava();
      abrindo = abrirApp().finally(() => { abrindo = null; });
      return;
    }
    usou();
    await abrirApp();
  }
  A.iniciar = iniciar;
})(window.A);
