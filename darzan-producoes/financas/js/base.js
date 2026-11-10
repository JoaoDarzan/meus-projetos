window.A = window.A || {};
(function (A) {
  /* ================= utilidades ================= */
  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const u = A.u = { MESES, CURTO };
  u.oculto = () => !!(A.ui && A.ui.oculto);
  u.brl = (v, cents = true) => { v = +v || 0; if (u.oculto()) return 'R$ ••••'; return (v < 0 ? '−' : '') + 'R$ ' + Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 }); };
  u.k0 = v => u.brl(v, false);
  /* valor sem esconder: para mensagem ao cliente e avisos no celular (o "esconder valores" vale só para a tela) */
  u.reais = v => (v < 0 ? '−' : '') + 'R$ ' + Math.abs(+v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  u.big = v => { if (u.oculto()) return 'R$ ••••••'; const [a, b] = Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).split(','); return `${v < 0 ? '−' : ''}R$ ${a}<span class="cents">,${b}</span>`; };
  u.pct = v => Math.round((v || 0) * 100) + '%';
  u.r2 = v => Math.round((+v || 0) * 100) / 100;
  u.num = s => { if (typeof s === 'number') return s; s = String(s == null ? '' : s).replace(/[^\d,.-]/g, ''); if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); else if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, ''); const n = parseFloat(s); return isFinite(n) ? n : 0; };
  u.sum = (a, f = x => x.valor) => a.reduce((s, x) => s + (+f(x) || 0), 0);
  u.hoje = () => { if (A.hoje) return A.hoje; const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  u.mes = d => String(d || '').slice(0, 7);
  u.addMes = (m, n) => { let [y, mm] = m.split('-').map(Number); mm += n; y += Math.floor((mm - 1) / 12); mm = ((mm - 1) % 12 + 12) % 12 + 1; return `${y}-${String(mm).padStart(2, '0')}`; };
  u.difMes = (a, b) => { const [y1, m1] = a.split('-').map(Number), [y2, m2] = b.split('-').map(Number); return (y2 - y1) * 12 + (m2 - m1); };
  u.diaMax = m => { const [y, mm] = m.split('-').map(Number); return new Date(y, mm, 0).getDate(); };
  u.dataNoMes = (m, dia) => `${m}-${String(Math.min(Math.max(1, dia), u.diaMax(m))).padStart(2, '0')}`;
  u.dias = (a, b) => { const p = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); }; return Math.round((p(b) - p(a)) / 864e5); };
  u.ateHoje = d => u.dias(u.hoje(), d);
  u.addDias = (d, n) => { const [y, m, dd] = d.split('-').map(Number), x = new Date(Date.UTC(y, m - 1, dd + n)); return x.toISOString().slice(0, 10); };
  u.nomeMes = m => MESES[+m.slice(5, 7) - 1];
  u.dm = d => d ? `${d.slice(8, 10)}/${CURTO[+d.slice(5, 7) - 1]}${d.slice(0, 4) !== u.hoje().slice(0, 4) ? '/' + d.slice(2, 4) : ''}` : '';
  u.ddmmaa = d => d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '';
  u.quando = d => { const n = u.ateHoje(d); if (n === 0) return 'Hoje'; if (n === 1) return 'Amanhã'; if (n === -1) return 'Ontem'; return u.dm(d); };
  /* só aceita imagem ou PDF em "data:...;base64," (nada de script, link ou outro tipo escondido) */
  u.dadoSeguro = s => /^data:(image\/(jpeg|png|webp|gif|heic|heif|svg\+xml)|application\/pdf);base64,[A-Za-z0-9+/=]+$/.test(String(s || '')) ? String(s) : '';
  u.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  u.cap = s => s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : '';
  u.sem = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  u.svg = (n, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${(window.ICONES || {})[n] || (window.ICONES || {})['circle-help'] || ''}</svg>`;
  u.ti = (s, tam = '') => `<span class="ti ${tam}" style="--a:${s[1]};--b:${s[2]}">${u.svg(s[0])}</span>`;

  /* ================= dados: no celular + no Supabase ================= */
  /* O app guarda uma cópia de tudo no aparelho (abre na hora, funciona sem internet)
     e manda cada mudança para o Supabase numa fila que não se perde. */
  const N = A.nuvem, T = window.TABELAS, TAB = window.TAB;
  const ABAS = Object.keys(T);
  const db = A.db = { abas: {}, ouvintes: [], fila: [], carregado: false };
  const guarda = {
    ler: k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } },
    gravar: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  };
  const chave = nome => `df-${nome}-${(N.sessao && N.sessao.user.id) || 'x'}`;
  db.aoSincronizar = f => db.ouvintes.push(f);
  db.mudou = [];
  db.aoMudar = f => db.mudou.push(f);
  const avisar = (estado, msg) => db.ouvintes.forEach(f => f(estado, msg));
  db.linhas = aba => db.abas[aba] || (db.abas[aba] = []);
  db.achar = (aba, id) => db.linhas(aba).find(x => x.ID === id);
  db.novoId = aba => ((T[aba] || {}).prefixo || 'X') + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 46656).toString(36).toUpperCase().padStart(3, '0');
  db.vazio = () => !db.linhas('EXTRATO').length && !db.linhas('CATEGORIAS').length;

  function guardarCopia() {
    const dados = { quando: Date.now(), abas: db.abas };
    if (guarda.gravar(chave('dados'), dados)) return;
    /* aparelho sem espaço: guarda sem as fotos */
    const leve = { quando: dados.quando, abas: Object.assign({}, db.abas, { EQUIPAMENTOS: db.linhas('EQUIPAMENTOS').map(e => Object.assign({}, e, { FOTO: '' })) }) };
    guarda.gravar(chave('dados'), leve);
  }
  const guardarFila = () => guarda.gravar(chave('fila'), db.fila);

  /* aplica uma lista de mudanças nos dados do app (sem mandar para a nuvem) */
  function aplicar(ops) {
    ops.forEach(o => {
      const lista = db.linhas(o.aba);
      if (o.op === 'salvar') {
        const i = lista.findIndex(x => x.ID === o.registro.ID);
        if (i >= 0) Object.assign(lista[i], o.registro);
        else { const novo = {}; T[o.aba].colunas.forEach(([nome, , tipo]) => { novo[nome] = tipo === 'boolean' ? false : ''; }); lista.push(Object.assign(novo, o.registro)); }
      } else {
        const i = lista.findIndex(x => x.ID === o.id);
        if (i >= 0) lista.splice(i, 1);
      }
    });
  }

  /* ID de registro: só letras, números e - _ : . (nada que vire código na tela) */
  db.idOk = id => /^[A-Za-z0-9_:.-]{1,120}$/.test(String(id || ''));
  /* sair do aparelho: apaga a cópia dos dados guardada nele (num aparelho emprestado, ninguém lê depois) */
  db.esquecer = () => {
    try { ['dados', 'fila'].forEach(k => localStorage.removeItem(chave(k))); } catch (e) { /* sem armazenamento */ }
    db.abas = {}; db.fila = []; db.carregado = false; db.quando = 0;
  };
  /* abre na hora com a cópia do aparelho (se tiver) */
  db.abrirCopia = () => {
    const c0 = guarda.ler(chave('dados'));
    db.fila = guarda.ler(chave('fila')) || [];
    if (!c0 || !c0.abas) return false;
    db.abas = c0.abas; db.quando = c0.quando; db.carregado = true;
    return true;
  };
  /* busca tudo no Supabase; mudanças que ainda estão na fila continuam valendo por cima */
  db.atualizar = async () => {
    /* tabelas opcionais (avisos): se ainda não existem no Supabase, o app abre normal sem elas */
    /* começa do zero a cada leitura: se a tabela passou a existir (rodou a atualização), o aviso some */
    const faltando = new Set();
    const lido = await Promise.all(ABAS.map(aba => N.ler(T[aba].tabela).catch(e => { if (T[aba].opcional && !e.semInternet && e.status !== 401) { faltando.add(aba); return []; } throw e; })));
    db.faltando = faltando;
    const abas = {};
    ABAS.forEach((aba, i) => {
      abas[aba] = lido[i].map(l => TAB.doNuvem(aba, l));
      /* coluna nova que o Supabase ainda não tem: o app segue funcionando e só não manda essa coluna */
      const sem = lido[i].length ? T[aba].colunas.map(x => x[1]).filter(col => !(col in lido[i][0])) : [];
      if (sem.length) TAB.falta[aba] = new Set(sem); else delete TAB.falta[aba];
    });
    db.abas = abas;
    aplicar(db.fila.flatMap(x => x.ops));
    db.carregado = true; db.quando = Date.now();
    guardarCopia();
    return db;
  };

  /* fila de envio: uma mudança de cada vez, na ordem; se cair a internet, espera e tenta de novo */
  let enviando = false, tentarDepois = null;
  async function enviar() {
    if (enviando) return;
    enviando = true;
    let deNovo = false;
    try {
      while (db.fila.length) {
        avisar('salvando');
        const item = db.fila[0];
        await mandar(item.ops);
        db.fila.shift(); guardarFila();
      }
      avisar('ok');
    } catch (e) {
      if (e.semInternet) { avisar('offline'); clearTimeout(tentarDepois); tentarDepois = setTimeout(enviar, 15000); }
      else if (e.status === 401) { avisar('login'); }
      else if (db.fila[0].ops.every(o => T[o.aba].opcional)) {
        /* só avisos (tabela ainda não criada?): tira da fila sem incomodar */
        console.warn('avisos não salvos:', e.message); db.fila.shift(); guardarFila(); deNovo = true;
      }
      else {
        /* o Supabase recusou: tira da fila e volta a mostrar o que está lá de verdade */
        db.fila.shift(); guardarFila();
        avisar('erro', e.message);
        db.atualizar().then(() => avisar('recarregado')).catch(() => { });
      }
    } finally { enviando = false; }
    if (deNovo) enviar();
  }
  db.enviar = enviar;
  addEventListener('online', () => enviar());
  async function mandar(ops) {
    /* junta as mudanças seguidas da mesma tabela num envio só, mantendo a ordem */
    let lote = null;
    const despacha = async () => {
      if (!lote) return;
      const t = T[lote.aba].tabela, l = lote; lote = null;
      if (l.op === 'salvar') await N.gravar(t, l.itens.map(o => TAB.paraNuvem(o.aba, o.envio || o.registro)));
      else await N.apagar(t, l.itens.map(o => o.id));
    };
    for (const o of ops) {
      const id = o.op === 'salvar' ? o.registro.ID : o.id;
      if (lote && (lote.op !== o.op || lote.aba !== o.aba || lote.ids.has(id))) await despacha();
      if (!lote) lote = { op: o.op, aba: o.aba, itens: [], ids: new Set() };
      lote.itens.push(o); lote.ids.add(id);
    }
    await despacha();
  }
  db.pendentes = () => db.fila.length;

  /* aplica na hora no app e põe na fila para o Supabase */
  /* lançamento conferido pelo banco (Open Finance, marca "OF <id>"): apagado, o robô traria de novo; fica guardado como cancelado */
  db.doBanco = id => { const r = db.achar('EXTRATO', id); return !!r && /\bOF [0-9a-f-]{20,}/i.test(r['OBS'] || ''); };
  db.lote = ops => {
    const lista = ops.map(o => {
      if (o.op !== 'salvar' && o.aba === 'EXTRATO' && db.doBanco(o.id)) o = { op: 'salvar', aba: 'EXTRATO', registro: { ID: o.id, 'STATUS': 'Cancelado' } };
      if (o.op !== 'salvar') return { op: 'apagar', aba: o.aba, id: o.id };
      const registro = Object.assign({}, o.registro);
      if (!registro.ID) registro.ID = o.registro.ID = db.novoId(o.aba);
      const existe = db.achar(o.aba, registro.ID);
      /* linha nova vai completa; linha que já existe manda só o que mudou */
      return { op: 'salvar', aba: o.aba, registro, envio: existe ? registro : null };
    });
    aplicar(lista);
    lista.forEach(o => { if (o.op === 'salvar' && !o.envio) o.envio = Object.assign({}, db.achar(o.aba, o.registro.ID)); });
    db.fila.push({ ops: lista.map(o => o.op === 'salvar' ? { op: 'salvar', aba: o.aba, registro: o.registro, envio: o.envio } : o), em: Date.now() });
    guardarFila(); guardarCopia();
    enviar();
    db.mudou.forEach(f => f(lista));
    return Promise.resolve();
  };
  db.salvar = (aba, registro) => db.lote([{ op: 'salvar', aba, registro }]);
  db.apagar = (aba, id) => db.lote([{ op: 'apagar', aba, id }]);

  /* contas fixas (e parcelas de trabalhos) viram lançamentos "previstos" no mês atual e no próximo; o ID fixo evita repetir em dois aparelhos */
  db.garantirFixas = () => {
    const ops = [], ext = db.linhas('EXTRATO'), m0 = u.mes(u.hoje());
    db.linhas('FIXAS').filter(f => String(f['ATIVA']).toLowerCase() !== 'não' && f['DESCRIÇÃO'] && f['VALOR'] && !/anual|parcel/i.test(f['TIPO'])).forEach(f => {
      [m0, u.addMes(m0, 1)].forEach(m => {
        const nome = String(f['DESCRIÇÃO']).trim().toLowerCase(), id = `LFX-${f.ID}-${m}`, tipo = /cart/i.test(f['TIPO']) ? 'cartão' : 'conta', dia = parseInt(f['DIA'], 10) || 1;
        /* no cartão, o lançamento fica no mês da fatura em que a cobrança cai */
        const mf = tipo === 'cartão' && A.c.cartao(f['BANCO']) ? A.c.faturaDe(u.dataNoMes(m, dia), f['BANCO']) : m;
        if (db.achar('EXTRATO', id) || ext.some(l => String(l['DATA']).slice(0, 7) === mf && String(l['DESCRIÇÃO']).trim().toLowerCase() === nome)) return;
        ops.push({ op: 'salvar', aba: 'EXTRATO', registro: { ID: id, 'DATA': u.dataNoMes(mf, dia), 'BANCO': f['BANCO'], 'DESCRIÇÃO': f['DESCRIÇÃO'], 'GRUPO': f['GRUPO'] || 'Necessidades', 'TIPO': tipo, 'VALOR': -Math.abs(u.num(f['VALOR'])), 'CATEGORIA': f['CATEGORIA'], 'SUB-CATEGORIA': f['SUB-CATEGORIA'], 'STATUS': 'Previsto', /* no cartão também: fica prevista até o banco mostrar a cobrança */ 'PARCELA': '', 'OBS': /d[eé]bito/i.test(f['TIPO']) ? 'Fixa · débito automático' : 'Fixa' } });
      });
    });
    ops.push(...parcelasDosTrabalhos(m0));
    /* lembrete do mês: conferir as caixinhas no app do banco (o Open Finance só manda o total de cada banco; conferir à mão deixa a divisão
       entre as caixinhas igual à do banco). Uma tarefa por mês, no dia 1º, com ID fixo para não repetir em dois aparelhos */
    const cxsBanco = A.c.caixinhas().filter(x => /rende/i.test(x['OBS'] || '') && !/emprest/i.test((x['OBS'] || '') + ' ' + (x['CONTA'] || '')));
    if (cxsBanco.length && !db.achar('TAREFAS', `TCX-${m0}`)) ops.push({ op: 'salvar', aba: 'TAREFAS', registro: { ID: `TCX-${m0}`, 'TAREFA': 'Conferir as caixinhas no app do banco', 'DATA': `${m0}-01`, 'VALOR': '', 'TIPO': 'Pessoal', 'FEITA': false,
      'OBS': `Em Bancos, toque em “Conferir saldo” e digite o valor de cada caixinha (${[...new Set(cxsBanco.map(x => x['BANCO']))].join(' e ')}). Assim a divisão entre elas fica igual à do banco.` } });
    if (!db.linhas('CATEGORIAS').some(x => x['SUB-CATEGORIA'] === 'Pagamento de fatura') && db.linhas('CATEGORIAS').length) ops.push({ op: 'salvar', aba: 'CATEGORIAS', registro: { ID: 'G-PAGFATURA', 'CATEGORIA': 'Transferência', 'SUB-CATEGORIA': 'Pagamento de fatura', 'GRUPO': 'Transferência' } });
    if (ops.length) db.lote(ops);
    return ops.length;
  };

  /* cliente que paga um tanto por mês (ex.: R$ 200 todo dia 26): a parcela vira um "a receber" no mês atual e no próximo,
     com aviso no celular, até completar o valor do trabalho. Se a parcela do mês já entrou, não cria de novo */
  const SUBJ = { 'Casamento': 'Casamento', 'Social media': 'Social media', 'Palestra': 'Palestra' };
  function parcelasDosTrabalhos(m0) {
    const ops = [];
    A.c.trabalhos().forEach(j => {
      const mensal = A.c.num(j['PARCELA MENSAL']), total = A.c.num(j['VALOR TOTAL']);
      if (!(mensal > 0) || !(total > 0) || c.naoFechado(j) || j['ETAPA'] === 'Recorrente') return; /* orçamento (e contato novo, e quem não fechou) ainda não cobra */
      const recs = A.c.recebimentos(j), dia = parseInt(j['DIA DA PARCELA'], 10) || 1;
      /* o que faltar é pago até a semana do evento: no mês do evento a parcela é o saldo, até 7 dias antes */
      const ev = /^\d{4}-\d{2}-\d{2}$/.test(String(j['DATA DO EVENTO'])) ? u.addDias(String(j['DATA DO EVENTO']), -7) : null;
      let resta = u.r2(total - u.sum(recs) - u.sum(A.c.parcelasPrevistas(j)));
      [m0, u.addMes(m0, 1)].forEach(m => {
        const id = `LJP-${j.ID}-${m}`;
        if (resta < 0.01 || db.achar('EXTRATO', id) || recs.some(l => !/^LJP-/.test(l.id) && u.mes(l.data) === m)) return;
        const saldo = ev && m >= u.mes(ev), data = !saldo ? u.dataNoMes(m, dia) : m === u.mes(ev) ? (u.dataNoMes(m, dia) < ev ? u.dataNoMes(m, dia) : ev) : u.dataNoMes(m, dia); /* evento já passou: cobra no dia normal do mês, não numa data antiga */
        const v = saldo ? resta : u.r2(Math.min(mensal, resta)); resta = u.r2(resta - v);
        ops.push({ op: 'salvar', aba: 'EXTRATO', registro: { ID: id, 'DATA': data, 'BANCO': (recs[recs.length - 1] || {}).banco || 'PicPay', 'DESCRIÇÃO': `${j['CLIENTE']} - ${saldo ? 'restante (até a semana do evento)' : 'parcela'}`, 'GRUPO': 'Renda', 'TIPO': 'conta', 'VALOR': v, 'CATEGORIA': 'Darzan Produções', 'SUB-CATEGORIA': SUBJ[j['TIPO DE EVENTO']] || 'Evento', 'STATUS': 'Previsto', 'PARCELA': '', 'OBS': `Trabalho ${j.ID} · parcela mensal` } });
      });
    });
    return ops;
  }

  /* trazer os dados da planilha (arquivo .json) e fazer cópia de segurança */
  db.importar = async (dados, progresso) => {
    const abas = dados.abas || dados;
    const todas = ABAS.filter(a => Array.isArray(abas[a]) && !T[a].opcional); /* avisos, aparelhos e anexos nunca vêm de arquivo */
    let feito = 0;
    const total = todas.reduce((s, a) => s + abas[a].length, 0);
    for (const aba of todas) {
      const linhas = abas[aba].filter(r => !r.ID || db.idOk(r.ID)).map(r => TAB.paraNuvem(aba, Object.assign({}, r, { ID: r.ID || db.novoId(aba) })));
      /* todas as linhas com as mesmas colunas */
      const cols = ['id'].concat(T[aba].colunas.map(x => x[1]));
      const cheias = linhas.map(l => Object.fromEntries(cols.map(k => [k, k in l ? l[k] : (T[aba].colunas.find(x => x[1] === k) || [])[2] === 'boolean' ? false : null])));
      for (let i = 0; i < cheias.length; i += 200) { await N.gravar(T[aba].tabela, cheias.slice(i, i + 200)); feito += Math.min(200, cheias.length - i); if (progresso) progresso(feito, total); }
    }
    await db.atualizar();
    return total;
  };
  db.copia = () => ({ app: 'Darzan Finanças', versao: 1, feito_em: new Date().toISOString(), abas: db.abas });

  /* ================= contas do app ================= */
  const c = A.c = {};
  c.L = () => db.linhas('EXTRATO');
  c.num = v => u.num(v);
  c.categorias = () => db.linhas('CATEGORIAS');
  c.listaCats = () => [...new Set(c.categorias().map(x => x['CATEGORIA']).filter(Boolean))];
  c.subsDe = cat => c.categorias().filter(x => x['CATEGORIA'] === cat).map(x => x['SUB-CATEGORIA']);
  /* o grupo vem da subcategoria quando ela tem um próprio (ex.: Alimentação > Mercado é necessidade, Alimentação > Delivery é desejo) */
  c.grupoDe = (cat, sub) => ((sub && c.categorias().find(x => x['CATEGORIA'] === cat && x['SUB-CATEGORIA'] === sub)) || c.categorias().find(x => x['CATEGORIA'] === cat) || {})['GRUPO'] || 'Desejos';
  c.BANCOS = ['Nubank', 'PicPay', 'Mercado Pago', 'Inter', 'Banco Pan', 'Não informado'];
  c.CORBANCO = Object.assign(Object.create(null), { 'Nubank': ['#c3b0ff', '#5b38d0'], 'PicPay': ['#7cf0a8', '#15a352'], 'Mercado Pago': ['#9fd8ff', '#2a62d8'], 'Inter': ['#ffc996', '#d0621e'], 'Banco Pan': ['#9be7ff', '#0a8fc7'], 'Não informado': ['#b5bfd6', '#5c6886'] });
  c.CORCARTAO = Object.assign(Object.create(null), { 'Nubank': '#8a05be', 'Mercado Pago': '#00a6e0', 'Inter': '#ff7a00', 'PicPay': '#21c25e' });
  c.GRAD = Object.assign(Object.create(null), { 'Nubank': 'var(--nu)', 'Mercado Pago': 'var(--mp)', 'Inter': 'var(--inter)', 'PicPay': 'linear-gradient(135deg,#b7f5cc 0%,#3cc46f 48%,#137a3d 100%)' });
  const ICAT = {
    'Alimentação': ['utensils', '#ff8aa0', '#d61c4e'], 'Carro e transporte': ['car', '#6cc8ff', '#1f5fe0'], 'Casa': ['house', '#5ff0d6', '#0b8a78'],
    'Saúde': ['pill', '#7cf0a8', '#15a352'], 'Cuidados pessoais': ['sparkles', '#f2a0ff', '#a51fc4'], 'Trabalho': ['camera', '#8fb6ff', '#2148d6'],
    'Assinaturas': ['tv', '#9aa5ff', '#4a46e0'], 'Lazer': ['party-popper', '#cf9cff', '#7a35e6'], 'Compras': ['shopping-bag', '#c2a8ff', '#6b34e0'],
    'Presentes e doações': ['gift', '#ffd97a', '#d0780a'], 'Dívidas e taxas': ['hand-coins', '#ffaab8', '#c0183f'], 'Guardado': ['piggy-bank', '#7cf0c0', '#068a5a'],
    'Transferência': ['arrow-left-right', '#b9c3ff', '#5a5fe0'], 'Salário CLT': ['briefcase', '#7fb0ff', '#2a5fd6'], 'Darzan Produções': ['clapperboard', '#f2c46d', '#a86b16'],
    'JPL SOM': ['speaker', '#d79bf0', '#8a3fb0'], 'Renda extra': ['banknote', '#a7b3cf', '#56627f'], 'Reembolso': ['undo-2', '#9ad8ff', '#2a7ad0'], 'Outros': ['circle-help', '#b5bfd6', '#5c6886'],
  };
  const ISUB = { 'Mercado': ['shopping-cart', '#4ee0a0', '#05905c'], 'Padaria': ['shopping-bag', '#ffc996', '#d0621e'], 'Almoço do trabalho': ['briefcase', '#ff8aa0', '#d61c4e'], 'Delivery': ['pizza', '#ff8a7a', '#d42a1f'],
    'Contas da casa': ['lightbulb', '#ffe066', '#b98a00'], 'Limpeza e higiene': ['sparkles', '#5ff0d6', '#0b8a78'], 'Móveis e eletros': ['zap', '#5ff0d6', '#0b8a78'],
    'Gasolina': ['fuel', '#ffc94d', '#e3600e'], 'Manutenção': ['wrench', '#6cc8ff', '#1f5fe0'], 'Seguro': ['shield-check', '#6cc8ff', '#1f5fe0'], 'IPVA e licenciamento': ['file-text', '#6cc8ff', '#1f5fe0'], 'Multas': ['receipt', '#ffaab8', '#c0183f'], 'Pedágio': ['map-pin', '#9cc6ff', '#2a62e0'], 'Estacionamento': ['map-pin', '#9cc6ff', '#2a62e0'], 'Uber/99': ['car-taxi-front', '#ffe066', '#b98a00'],
    'Farmácia': ['pill', '#7cf0a8', '#15a352'], 'Consultas e exames': ['heart', '#7cf0a8', '#15a352'], 'Academia e esporte': ['trophy', '#7cf0a8', '#15a352'],
    'Cabelo e barba': ['scissors', '#f2a0ff', '#a51fc4'], 'Tatuagem e estética': ['palette', '#f2a0ff', '#a51fc4'],
    'Streaming': ['tv', '#9aa5ff', '#4a46e0'], 'Apps': ['cloud', '#9cd3ff', '#2a7ad0'],
    'Roupas e calçados': ['shirt', '#9ad8ff', '#2a7ad0'], 'Eletrônicos': ['smartphone', '#5fe3f5', '#0a8bb0'], 'Colecionáveis': ['star', '#c2a8ff', '#6b34e0'], 'Para casa': ['house', '#c2a8ff', '#6b34e0'],
    'Passeios e cinema': ['video', '#cf9cff', '#7a35e6'], 'Viagens': ['plane', '#cf9cff', '#7a35e6'], 'Futebol': ['volleyball', '#8ff0a0', '#1a9a3c'], 'Apostas e loteria': ['coins', '#cf9cff', '#7a35e6'],
    'Igreja': ['hand-heart', '#ffd97a', '#d0780a'], 'Caridade': ['hand-heart', '#ffd97a', '#d0780a'], 'Ajuda à família': ['heart', '#ffd97a', '#d0780a'],
    'Equipamentos': ['camera', '#8fb6ff', '#2148d6'], 'Software': ['cpu', '#8fb6ff', '#2148d6'], 'Equipe e freelancers': ['user', '#8fb6ff', '#2148d6'], 'Viagem de trabalho': ['plane', '#8fb6ff', '#2148d6'], 'Cursos': ['graduation-cap', '#9cc6ff', '#2a62e0'], 'Impostos e MEI': ['landmark', '#8fb6ff', '#2148d6'],
    'Juros e multas': ['receipt', '#ffaab8', '#c0183f'], 'Tarifas de banco': ['landmark', '#ffaab8', '#c0183f'],
    'Pagamento de fatura': ['credit-card', '#b9c3ff', '#5a5fe0'] };
  c.icone = (cat, sub) => ISUB[sub] || ICAT[cat] || ICAT['Outros'];
  c.FONTES = { 'Salário CLT': '--s-clt', 'Darzan Produções': '--s-dz', 'JPL SOM': '--s-jpl', 'Renda extra': '--s-out' };

  /* lançamento do EXTRATO em forma fácil */
  c.l = r => ({ id: r.ID, data: String(r['DATA'] || ''), banco: r['BANCO'] || '', desc: String(r['DESCRIÇÃO'] || ''), grupo: r['GRUPO'] || '', tipo: /cart/i.test(r['TIPO']) ? 'cartão' : 'conta', valor: c.num(r['VALOR']), cat: r['CATEGORIA'] || '', sub: r['SUB-CATEGORIA'] || '', status: r['STATUS'] || 'Pago', parcela: r['PARCELA'] || '', obs: String(r['OBS'] || ''), r });
  c.lancs = () => c.L().filter(r => r['DATA'] && r['STATUS'] !== 'Cancelado').map(c.l); /* cancelado: some de tudo, mas fica guardado para a conta fixa/parcela não voltar sozinha */
  c.doMes = m => c.lancs().filter(l => u.mes(l.data) === m);
  /* ordem do extrato: o que já aconteceu primeiro, do mais recente para o mais antigo (no mesmo dia, o último lançado em cima);
     o que ainda vai acontecer (conta prevista, parcela do cartão com data mais para frente) vai para o fim, do mais perto para o mais longe */
  c.ordenar = L => { const h = u.hoje();
    return L.map((l, i) => [l, i]).sort(([a, i], [b, j]) => { const fa = a.data > h, fb = b.data > h;
      if (fa !== fb) return fa ? 1 : -1;
      if (a.data !== b.data) return (a.data < b.data ? 1 : -1) * (fa ? -1 : 1);
      return j - i; }).map(x => x[0]); };
  c.ehGasto = l => l.grupo === 'Necessidades' || l.grupo === 'Desejos';

  c.resumo = m => {
    const L = c.doMes(m);
    /* dinheiro previsto (ex.: parcela que o cliente ainda vai pagar) não conta como "entrou": fica em "a receber" até você marcar que chegou */
    const ent = L.filter(l => l.grupo === 'Renda' && l.status !== 'Previsto'), aRec = L.filter(l => l.grupo === 'Renda' && l.status === 'Previsto'), gastos = L.filter(c.ehGasto), guard = L.filter(l => l.grupo === 'Guardado');
    const fonte = { 'Salário CLT': 0, 'Darzan Produções': 0, 'JPL SOM': 0, 'Renda extra': 0 };
    ent.forEach(l => { fonte[fonte[l.cat] !== undefined ? l.cat : 'Renda extra'] += l.valor; });
    const cats = {};
    gastos.forEach(l => { const k = l.cat || 'Outros'; const x = cats[k] || (cats[k] = { cat: k, valor: 0, n: 0, subs: {} }); x.valor -= l.valor; x.n++; x.subs[l.sub || '—'] = (x.subs[l.sub || '—'] || 0) - l.valor; });
    const entr = u.r2(u.sum(ent)), saiu = u.r2(-u.sum(gastos)), guardou = u.r2(-u.sum(guard));
    const nec = u.r2(-u.sum(gastos.filter(l => l.grupo === 'Necessidades')));
    const prevSobra = u.r2(u.sum(ent) + u.sum(aRec) + u.sum(gastos) + u.sum(guard)); /* previsão do mês: conta também o que está para receber */
    return { m, L, ent, aReceber: u.r2(u.sum(aRec)), aRec, prevSobra, gastos, guard, fonte, cats: Object.values(cats).map(x => (x.valor = u.r2(x.valor), x)).sort((a, b) => b.valor - a.valor), entr, saiu, guardou, sobra: u.r2(entr - saiu - guardou), nec, des: u.r2(saiu - nec), cartao: u.r2(-u.sum(gastos.filter(l => l.tipo === 'cartão'))), futuro: m > u.mes(u.hoje()) };
  };
  c.meses = () => {
    const ms = [...new Set(c.lancs().map(l => u.mes(l.data)))].sort();
    const ini = ms[0] || u.mes(u.hoje()), fim = u.addMes(u.mes(u.hoje()), 3), out = [];
    for (let m = ini; m <= fim; m = u.addMes(m, 1)) out.push(m);
    return out;
  };
  c.mesesPassados = () => c.meses().filter(m => m < u.mes(u.hoje()) && c.doMes(m).length);
  c.media = (f, exceto) => { const ms = c.mesesPassados().filter(m => m !== exceto); return ms.length ? u.sum(ms, m => f(c.resumo(m))) / ms.length : 0; };

  /* ---------- cartões ---------- */
  c.cartoes = () => db.linhas('CARTOES').filter(k => k['CARTÃO']);
  c.cartao = nome => c.cartoes().find(k => k['CARTÃO'] === nome);
  c.ehCartao = banco => c.cartoes().some(k => k['CARTÃO'] === banco);
  /* a fatura tem o nome do mês em que VENCE (igual aos apps dos bancos: a "fatura de julho" vence em julho).
     Compra feita até o fechamento entra na fatura que fecha naquele mês; depois, na seguinte. Se o vencimento
     cai depois do fechamento no mesmo mês (Inter: fecha 18, vence 25), é a fatura daquele mês; se cai antes
     (Nubank: fecha 31, vence 7), ela vence no mês seguinte. */
  c.diasCartao = k => {
    const fecha = parseInt(k['FECHA DIA'], 10) || 31;
    let dia = parseInt(k['VENCE DIA'], 10), estimado = false;
    if (!dia) { dia = Math.min(fecha + 7, 28); estimado = true; }
    return { fecha, dia, estimado };
  };
  c.faturaDe = (data, nome) => {
    const k = c.cartao(nome); if (!k) return u.mes(data);
    const { fecha, dia } = c.diasCartao(k), fechou = +data.slice(8, 10) <= fecha ? u.mes(data) : u.addMes(u.mes(data), 1);
    return dia > fecha ? fechou : u.addMes(fechou, 1);
  };
  c.vence = (nome, m) => { const { dia, estimado } = c.diasCartao(c.cartao(nome) || {}); return { data: u.dataNoMes(m, dia), estimado }; };
  /* compra devolvida ou reembolsada continua na fatura (o banco cobra e depois devolve), mas não conta como gasto */
  c.naFatura = l => c.ehGasto(l) || l.grupo === 'Reembolso';
  c.itensFatura = (nome, m) => c.doMes(m).filter(l => l.tipo === 'cartão' && l.banco === nome && c.naFatura(l));
  /* o banco já mostrou essa cobrança (o robô marcou "OF <id>", ou "OFP <id>" se ainda está pendente na fatura aberta) */
  c.noBanco = l => /\bOFP? [0-9a-f-]{20,}/i.test(l.obs || '');
  /* conta fixa no cartão que o banco ainda não cobrou (fatura deste mês em diante): fica fora do total e aparece como "ainda não cobrado" */
  c.fixaSemCobranca = l => l.status === 'Previsto' && !c.noBanco(l) && (/^LFX-/.test(l.id) || /^Fixa\b/.test(l.obs || '')) && u.mes(l.data) >= u.mes(u.hoje());
  c.fatura = (nome, m) => u.r2(-u.sum(c.itensFatura(nome, m).filter(l => !c.fixaSemCobranca(l))));
  c.pagFatura = (nome, m) => c.lancs().find(l => l.obs.indexOf(`Fatura ${nome} ${m}`) === 0);
  c.emUso = nome => { const m0 = u.mes(u.hoje()); return u.r2(-u.sum(c.lancs().filter(l => l.tipo === 'cartão' && l.banco === nome && c.naFatura(l) && u.mes(l.data) >= m0 && !(u.mes(l.data) === m0 && c.pagFatura(nome, m0))))); };
  c.contaQuePaga = nome => { const k = c.cartao(nome) || {}; return String(k['PAGA PELA CONTA'] || nome).split('·')[0].trim(); };

  /* transferência entre contas: as duas pontas (saiu de um banco, entrou no outro) */
  c.parTransf = l => {
    const t = l && (l.obs.match(/^Transferência (T[\w-]+)/) || [])[1]; if (!t) return null;
    const dois = c.lancs().filter(x => x.obs.indexOf('Transferência ' + t) === 0);
    const sai = dois.find(x => x.valor < 0), entra = dois.find(x => x.valor > 0);
    return sai && entra ? { sai, entra } : null;
  };

  /* ---------- meu trabalho (CLT): o que entrou de cada holerite ---------- */
  /* os lançamentos de "Salário CLT" de um mês são um pagamento; o de "Salário" guarda na anotação os números do
     holerite ("Holerite de março/2026 · bruto R$ 4.000,78 · INSS R$ 259,78 · FGTS R$ 247,47 · salário base R$ 3.200,00") */
  const CLT_PARTE = { 'Salário': 'sal', 'Horas extras': 'he', 'Vale-transporte': 'ben', 'Vale-refeição': 'ben', 'Benefícios': 'ben', 'Bonificação': 'bon', 'Comissão': 'bon' };
  c.clt = () => {
    const meses = {}, n = (t, re) => { const x = (String(t).match(re) || [])[1]; return x ? c.num(x.replace(/\./g, '').replace(',', '.')) : null; };
    c.lancs().filter(l => l.grupo === 'Renda' && l.cat === 'Salário CLT' && l.status !== 'Cancelado').forEach(l => { /* o que ainda vai cair entra marcado como "a receber" */
      const m = u.mes(l.data), x = meses[m] || (meses[m] = { m, sal: 0, he: 0, ben: 0, bon: 0, com: 0, liq: 0, horas: 0, bruto: null, inss: null, irrf: null, fgts: null, base: null, comp: null, data: l.data });
      x[CLT_PARTE[l.sub] || 'sal'] += l.valor; x.liq += l.valor; if (l.status === 'Previsto') x.prev = true; if (l.data > x.data) x.data = l.data;
      if (l.sub === 'Comissão') x.com += l.valor; /* comissão fora do holerite: conta junto da bonificação, mas aparece com o nome dela */
      if (l.sub === 'Horas extras') x.horas = u.r2(x.horas + (n(l.desc, /(\d+(?:[.,]\d+)?)\s*h\b/i) || 0)); /* "10 h" ou "4,55 h" */
      if (/holerite de [a-zç]+\/\d{4}/i.test(l.obs)) {
        x.bruto = n(l.obs, /bruto R\$\s*([\d.,]+)/i); x.inss = n(l.obs, /INSS R\$\s*([\d.,]+)/i); x.fgts = n(l.obs, /FGTS R\$\s*([\d.,]+)/i); x.base = n(l.obs, /sal[aá]rio base R\$\s*([\d.,]+)/i); x.irrf = n(l.obs, /IRRF R\$\s*([\d.,]+)/i);
        x.comp = (l.obs.match(/holerite de ([a-zç]+\/\d{4})/i) || [])[1] || null;
      }
    });
    /* com o holerite guardado inteiro, os números vêm dele (mais certos que a anotação) */
    const hs = c.holerites();
    return Object.values(meses).sort((a, b) => a.m < b.m ? -1 : 1).map(x => {
      ['sal', 'he', 'ben', 'bon', 'com', 'liq'].forEach(k => { x[k] = u.r2(x[k]); });
      const h = hs.find(y => u.mes(y.pagamento) === x.m);
      if (h) {
        x.h = h; x.comp = `${u.MESES[+h.comp.slice(5, 7) - 1].toLowerCase()}/${h.comp.slice(0, 4)}`;
        const de = re => u.r2(u.sum(h.itens.filter(i => re.test(u.sem(i.descricao))), i => i.desconto));
        x.bruto = h.totalVenc != null ? h.totalVenc : u.r2(u.sum(h.itens, i => i.vencimento)); x.inss = de(/inss/) || null; x.irrf = de(/irrf|imposto de renda/) || null;
        if (h.fgts != null) x.fgts = h.fgts; if (h.base != null) x.base = h.base;
        x.horas = u.r2(u.sum(h.itens.filter(i => c.parteHolerite(i.descricao) === 'HE' && !/d\.?s\.?r|repouso/.test(u.sem(i.descricao))), i => u.num(i.referencia))) || x.horas;
      }
      return x;
    });
  };

  /* holerites guardados inteiros (tabela HOLERITES; DADOS = itens, totais e bases em JSON) */
  c.holerites = () => db.linhas('HOLERITES').filter(h => h['COMPETÊNCIA']).map(h => {
    let d = {}; try { d = JSON.parse(h['DADOS'] || '{}') || {}; } catch (e) { d = {}; }
    const itens = (Array.isArray(d.itens) ? d.itens : []).map(i => ({ codigo: String(i.codigo || ''), descricao: String(i.descricao || ''), referencia: String(i.referencia || ''), vencimento: +i.vencimento || 0, desconto: +i.desconto || 0 }));
    const n = v => v == null || v === '' || !isFinite(+v) ? null : +v;
    return { id: h.ID, comp: String(h['COMPETÊNCIA']).slice(0, 7), empresa: String(h['EMPRESA'] || ''), pagamento: String(h['PAGAMENTO'] || '').slice(0, 10), banco: String(h['BANCO'] || ''),
      liquido: c.num(h['LÍQUIDO']), itens, totalVenc: n(d.total_vencimentos), totalDesc: n(d.total_descontos), base: n(d.salario_base), baseInss: n(d.base_inss), baseFgts: n(d.base_fgts),
      fgts: n(d.fgts_mes), baseIrrf: n(d.base_irrf), faixaIrrf: n(d.faixa_irrf) };
  });
  /* o holerite de um pagamento (mês em que caiu) */
  c.holeriteDoMes = m => c.holerites().find(h => u.mes(h.pagamento) === m) || null;
  /* em que parte do salário entra cada item do holerite: vale-refeição, vale-transporte, bonificação, horas extras (com o DSR delas) ou o resto ("Salário") */
  c.parteHolerite = d => { const t = u.sem(d);
    if (/refei|alimenta|\bv\.?r\b/.test(t)) return 'VR';
    if (/passe|transporte|\bv\.?t\b/.test(t)) return 'VT';
    if (/bonifica|premio|comiss|gratifica|\bplr\b|participacao/.test(t)) return 'BON';
    if (/hora.*extra|extra.*hora|\bh\.?e\.?\b/.test(t)) return 'HE';
    return 'SAL'; };

  /* ---------- contas fixas ---------- */
  /* TIPO: "cartão", "débito automático", "conta" (pagar na mão) viram lançamento todo mês;
     "anual" (paga uma vez por ano, conta 1/12 por mês) e "parcelado" (as parcelas já estão no cartão) não */
  c.fixas = () => db.linhas('FIXAS').filter(f => f['DESCRIÇÃO']);
  c.fixaAtiva = f => String(f['ATIVA']).toLowerCase() !== 'não';
  c.fixaTipo = f => { const t = String(f['TIPO'] || ''); return /anual/i.test(t) ? 'anual' : /parcel/i.test(t) ? 'parcelado' : /cart/i.test(t) ? 'cartão' : /d[eé]bito/i.test(t) ? 'débito' : 'conta'; };
  c.fixaMensal = f => u.r2(Math.abs(c.num(f['VALOR'])) / (c.fixaTipo(f) === 'anual' ? 12 : 1));
  c.fixaNoMes = (f, m) => { const nome = u.sem(f['DESCRIÇÃO']).trim(); return c.lancs().find(l => l.id === `LFX-${f.ID}-${m}` || (u.mes(l.data) === m && u.sem(l.desc).trim() === nome)) || null; };
  c.totalFixas = () => u.r2(u.sum(c.fixas().filter(c.fixaAtiva), c.fixaMensal));

  /* ---------- bancos ---------- */
  c.contas = () => db.linhas('CONTAS').filter(x => x['BANCO']);
  c.paga = l => l.status === 'Pago' || (/d[eé]bito autom/i.test(l.obs) && l.data <= u.hoje());
  c.movimentos = cx => {
    const base = cx['DATA DA CONFERÊNCIA'], ehConta = String(cx['CONTA']).toLowerCase() === 'conta';
    if (cx['SALDO CONFERIDO'] === '' || cx['SALDO CONFERIDO'] == null || !base) return [];
    const nomeCx = u.sem(cx['CONTA']);
    return c.lancs().filter(l => l.data > base && c.paga(l) && (ehConta ? (l.tipo === 'conta' && l.banco === cx['BANCO']) : (l.grupo === 'Guardado' && u.sem(l.obs).split(' · ').some(p => p.trim() === 'para ' + nomeCx))));
  };
  c.saldo = cx => {
    if (cx['SALDO CONFERIDO'] === '' || cx['SALDO CONFERIDO'] == null) return null;
    const ehConta = String(cx['CONTA']).toLowerCase() === 'conta';
    return u.r2(c.num(cx['SALDO CONFERIDO']) + u.sum(c.movimentos(cx), l => ehConta ? l.valor : -l.valor));
  };
  c.saldoBanco = b => u.r2(u.sum(c.contas().filter(x => x['BANCO'] === b), x => c.saldo(x) || 0));
  c.bancosComConta = () => [...new Set(c.contas().map(x => x['BANCO']))];
  c.totalBancos = () => u.r2(u.sum(c.contas(), x => c.saldo(x) || 0));
  c.semSaldo = () => c.contas().filter(x => c.saldo(x) == null).length;
  c.caixinhas = () => c.contas().filter(x => String(x['CONTA']).toLowerCase() !== 'conta');

  /* ---------- foto diária dos saldos (tabela SALDOS, gravada pelo robô do Open Finance) e quanto rendeu ---------- */
  c.semSaldos = () => !!(db.faltando && db.faltando.has('SALDOS'));
  c.fotos = cx => db.linhas('SALDOS').filter(z => z['BANCO'] === cx['BANCO'] && u.sem(z['CONTA']).trim() === u.sem(cx['CONTA']).trim() && /^\d{4}-\d{2}-\d{2}/.test(String(z['DATA'])))
    .map(z => ({ data: String(z['DATA']).slice(0, 10), saldo: c.num(z['SALDO']) })).sort((a, b) => a.data < b.data ? -1 : 1);
  /* saldo da caixinha num dia: a última foto até aquele dia (null se ainda não tinha foto) */
  c.saldoEm = (cx, d) => { const f = c.fotos(cx).filter(z => z.data <= d); return f.length ? f[f.length - 1].saldo : null; };
  /* o que você guardou (+) ou tirou (−) da caixinha entre dois dias (depois de "de", até "ate") */
  c.aportes = (cx, de, ate) => { const nome = 'para ' + u.sem(cx['CONTA']).trim();
    return u.r2(-u.sum(c.lancs().filter(l => l.grupo === 'Guardado' && c.paga(l) && l.data > de && l.data <= ate && u.sem(l.obs).split(' · ').some(p => p.trim() === nome)), l => l.valor)); };
  /* quanto rendeu desde um dia: o que cresceu menos o que você mesmo colocou (null sem foto daquele dia) */
  c.rendeu = (cx, de) => { const a = c.saldoEm(cx, de), h = c.saldo(cx); return a == null || h == null ? null : u.r2(h - a - c.aportes(cx, de, u.hoje())); };
  /* a soma de todas as caixinhas por dia (para o gráfico e para o fim do mês passado) */
  c.fotosTotal = () => { const ds = [...new Set(c.caixinhas().flatMap(cx => c.fotos(cx).map(z => z.data)))].sort();
    return ds.map(d => ({ data: d, saldo: u.r2(u.sum(c.caixinhas(), cx => c.saldoEm(cx, d) || 0)) })); };
  /* o que o banco informou das caixinhas (robô, escondido): total bruto, líquido se sacar hoje e imposto */
  /* o app desse banco mostra a caixinha pelo valor líquido (PicPay)? então o app segue o líquido; senão, o bruto (Nubank) */
  c.mostraLiquido = b => c.caixinhas().some(x => x['BANCO'] === b && /mostra (o valor )?l[ií]quido/i.test(x['OBS'] || ''));
  c.caixinhasNoBanco = b => { const l = db.linhas('EXTRATO').find(x => /^LOFI-/.test(x.ID) && x['BANCO'] === b); if (!l) return null;
    const o = String(l['OBS'] || ''), n = re => { const m = o.match(re); return m ? +m[1] : null; };
    return { bruto: c.num(l['VALOR']), liquido: n(/líquido (-?[\d.]+)/), ir: n(/IR (-?[\d.]+)/) || 0, iof: n(/IOF (-?[\d.]+)/) || 0, data: String(l['DATA'] || '').slice(0, 10) }; };
  /* cada banco em bruto e líquido: na conta é igual; nas caixinhas o imposto é a diferença que o banco informou (sem informação, zero) */
  c.resumoBanco = b => { const cs = c.contas().filter(x => x['BANCO'] === b), conta = u.r2(u.sum(cs.filter(x => String(x['CONTA']).toLowerCase() === 'conta'), x => c.saldo(x) || 0)),
    cx = u.r2(u.sum(cs.filter(x => String(x['CONTA']).toLowerCase() !== 'conta'), x => c.saldo(x) || 0)), q = c.caixinhasNoBanco(b),
    imposto = cx && q && q.liquido != null ? u.r2(Math.max(0, q.bruto - q.liquido)) : 0, ml = c.mostraLiquido(b);
    /* banco que mostra o líquido (PicPay): o João só vê o líquido, então não existe bruto nem imposto para ele */
    if (ml) return { banco: b, conta, cx, imposto: 0, bruto: u.r2(conta + cx), liquido: u.r2(conta + cx), soLiquido: true };
    return { banco: b, conta, cx, imposto, bruto: u.r2(conta + cx), liquido: u.r2(conta + cx - imposto) }; };
  c.conferidoPeloBanco = b => db.linhas('EXTRATO').some(l => /^LOF[SI]-/.test(l.ID) && l['BANCO'] === b);

  /* ---------- metas como potes: o dinheiro fica numa caixinha de verdade e o app separa quanto é de cada meta ---------- */
  c.metas = () => db.linhas('METAS').filter(g => g['META']);
  /* meta que é uma parte fixa da caixinha (OBS "70% da caixinha"): o pote é sempre essa parte do saldo dela */
  c.pctDaCaixinha = g => { const m = String(g['OBS'] || '').match(/(\d+(?:[.,]\d+)?)\s*% da caixinha/i); return m ? +m[1].replace(',', '.') / 100 : null; };
  c.noPote = g => { const p = c.pctDaCaixinha(g), cx = p != null && g['ONDE ESTÁ'] ? c.caixinhas().find(x => u.sem(x['CONTA']).trim() === u.sem(g['ONDE ESTÁ']).trim()) : null;
    return cx ? u.r2(p * (c.saldo(cx) || 0)) : c.noPoteGuardado(g); };
  c.noPoteGuardado = g => u.r2(c.num(g['JÁ GUARDADO']) - u.sum(c.lancs().filter(l => l.grupo === 'Guardado' && c.paga(l) && new RegExp('(^|· )Pote ' + g.ID + '( ·|$)').test(l.obs)), l => l.valor));
  c.potesDa = cx => c.metas().filter(g => g['ONDE ESTÁ'] && u.sem(g['ONDE ESTÁ']).trim() === u.sem(cx['CONTA']).trim());

  /* ---------- tarefas: contas previstas + faturas + aba TAREFAS ---------- */
  c.XP = { conta: 40, fatura: 60, darzan: 30, pessoal: 20, receber: 30 };
  c.tarefas = (mBase) => {
    const T = [], hoje = u.hoje(), m0 = mBase && mBase > u.mes(hoje) ? mBase : u.mes(hoje);
    c.lancs().forEach(l => {
      if (l.tipo !== 'conta' || /d[eé]bito autom/i.test(l.obs)) return;
      const feitaPeloApp = /pago pelo app|recebido pelo app/i.test(l.obs) && l.status === 'Pago' && u.ateHoje(l.data) > -45;
      if (l.status !== 'Previsto' && !feitaPeloApp) return;
      if (u.mes(l.data) > u.addMes(m0, 2)) return;
      const renda = l.grupo === 'Renda';
      T.push({ id: 'l:' + l.id, grupo: renda ? 'receber' : 'conta', titulo: renda ? 'Receber ' + l.desc : 'Pagar ' + l.desc.charAt(0).toLowerCase() + l.desc.slice(1), /* receber: costuma ser nome de cliente, fica com maiúscula */ valor: Math.abs(l.valor), data: l.data, banco: l.banco, feita: l.status === 'Pago', icone: c.icone(l.cat, l.sub), xp: c.XP[renda ? 'receber' : 'conta'] });
    });
    c.cartoes().forEach(k => {
      const nome = k['CARTÃO'];
      for (let m = u.addMes(m0, -1); m <= u.addMes(m0, 2); m = u.addMes(m, 1)) {
        const v = c.fatura(nome, m), pg = c.pagFatura(nome, m), ven = c.vence(nome, m);
        if (v < 0.01 && !pg) continue;
        if (!pg && u.ateHoje(ven.data) < -10) continue; /* faturas antigas: já devem ter sido pagas */
        T.push({ id: `f:${nome}:${m}`, grupo: 'conta', titulo: `Pagar fatura ${nome} de ${u.nomeMes(m).toLowerCase()}`, valor: pg ? Math.abs(pg.valor) : v, data: ven.data, estimado: ven.estimado, banco: c.contaQuePaga(nome), feita: !!pg, icone: ['credit-card', ...(c.CORBANCO[nome] || c.CORBANCO['Não informado'])], xp: c.XP.fatura });
      }
    });
    /* dias trabalhados que ainda não foram pagos: uma tarefa "Receber" por empresa (marcar abre "de quais dias é o pagamento") */
    const aRec = {};
    c.diasAReceber().filter(d => d.valor > 0).forEach(d => { const x = aRec[d.empresa] || (aRec[d.empresa] = { n: 0, v: 0, data: d.data }); x.n++; x.v += d.valor; if (d.data < x.data) x.data = d.data; });
    Object.entries(aRec).forEach(([e, x]) => T.push({ id: 'w:' + e, grupo: 'receber', titulo: `Receber ${e} · ${x.n} ${x.n > 1 ? 'dias trabalhados' : 'dia trabalhado'}`, valor: u.r2(x.v), data: x.data, feita: false, icone: ['calendar-days', '#9cc6ff', '#2a62e0'], xp: c.XP.receber }));
    /* cliente sem responder há 3 dias ou mais: lembrar de chamar de novo (marcar = "chamei hoje") */
    c.trabalhos().forEach(j => { const n = c.semResposta(j); if (n == null || n < c.DIAS_RESPOSTA) return;
      T.push({ id: 'v:' + j.ID, grupo: 'darzan', titulo: `Chamar ${c.primeiroNome(j)} de novo`, nota: `orçamento sem resposta há ${n} dias`, valor: 0, data: u.addDias(String(c.crm(j).contato), c.DIAS_RESPOSTA), feita: false, icone: ['message-circle', '#7cf0a8', '#15a352'], xp: c.XP.darzan }); });
    const jaTem = (d, v) => v && T.some(x => x.data === d && Math.abs(x.valor - v) < 0.01);
    db.linhas('TAREFAS').filter(t => t['TAREFA']).forEach(t => {
      if (jaTem(String(t['DATA'] || ''), c.num(t['VALOR']))) return; /* a mesma conta já aparece pelo extrato */
      const g = u.sem(t['TIPO']).indexOf('darzan') >= 0 ? 'darzan' : u.sem(t['TIPO']).indexOf('conta') >= 0 ? 'conta' : 'pessoal';
      T.push({ id: 't:' + t.ID, grupo: g, titulo: t['TAREFA'], valor: c.num(t['VALOR']), data: String(t['DATA'] || hoje), feita: t['FEITA'] === true || String(t['FEITA']).toUpperCase() === 'TRUE', nota: t['OBS'], icone: g === 'darzan' ? ['clapperboard', '#f2c46d', '#a86b16'] : g === 'conta' ? ['receipt', '#b9c3ff', '#5a5fe0'] : ['user', '#9cc6ff', '#2a62e0'], xp: c.XP[g] });
    });
    return T.sort((a, b) => a.data < b.data ? -1 : a.data > b.data ? 1 : 0);
  };
  /* novidades do banco: o que o robô do Open Finance trouxe (linha nova "LOF-" ou conferida, com a marca "OF <id>"; as escondidas LOFP/LOFS/LOFI/LOFD não contam).
     O que já foi visto fica guardado no aparelho; na primeira vez, só os últimos 3 dias contam como novos */
  const VISTO = 'df-visto';
  const lerVisto = () => { try { const o = JSON.parse(localStorage.getItem(VISTO) || 'null'); if (o && o.ini) return { ini: o.ini, ids: new Set(o.ids || []) }; } catch (e) { /* sem armazenamento */ } return { ini: u.addDias(u.hoje(), -3), ids: new Set() }; };
  c.doRobo = () => c.lancs().filter(l => !/^LOF[PSID]-/.test(l.id) && !/\bOFP [0-9a-f-]{20,}/i.test(l.obs) && (/^LOF-/.test(l.id) || /\bOF [0-9a-f-]{20,}/i.test(l.obs))).sort((a, b) => a.data < b.data ? 1 : a.data > b.data ? -1 : a.id < b.id ? 1 : -1);
  c.novidades = () => { const v = lerVisto(), ls = c.doRobo(); return { novas: ls.filter(l => l.data >= v.ini && !v.ids.has(l.id)), vistas: ls.filter(l => l.data < v.ini || v.ids.has(l.id)) }; };
  c.marcarVisto = () => { const ini = u.addDias(u.hoje(), -60), v = lerVisto(), ids = c.doRobo().filter(l => l.data >= ini).map(l => l.id);
    try { localStorage.setItem(VISTO, JSON.stringify({ ini: v.ini < ini ? ini : v.ini, ids: [...new Set([...v.ids].concat(ids))].filter(id => ids.includes(id)) })); } catch (e) { /* sem armazenamento */ } };
  c.urgentes = () => c.tarefas().filter(t => !t.feita && u.ateHoje(t.data) <= 1).length;

  /* ---------- equipamentos ---------- */
  c.equips = () => db.linhas('EQUIPAMENTOS').filter(e => e['NOME']);
  c.compraDo = e => { const m = String(e['OBS'] || '').match(/Compra (P[\w-]+)/); return m ? m[1] : null; };
  c.lancDo = e => { const m = String(e['OBS'] || '').match(/Lançamento (L[\w-]+)/); return m ? m[1] : null; };
  c.linhasDaCompra = pid => { const re = new RegExp('Compra ' + pid + '(?![\\w-])'); return c.lancs().filter(l => re.test(l.obs)); };
  /* quanto o equipamento vale hoje: o que o João anotou ("Vale hoje 1234.56 em AAAA-MM-DD" na OBS) ou uma estimativa
     (perde uns 20% por ano desde a compra, nunca abaixo de 25% do que pagou). Vendido não vale mais nada para você */
  /* compra junta (ex.: câmera + lente): "Peças: Câmera = 3500; Lente 23mm = 2000" na OBS. O que pagou se divide na proporção do valor de cada peça */
  c.pecas = e => { const m = String(e['OBS'] || '').match(/Peças: ([^·]*)/); return m ? m[1].split(';').map(x => x.match(/^\s*(.+?)\s*=\s*(\d+(?:\.\d+)?)\s*$/)).filter(Boolean).map(x => ({ nome: x[1], vale: +x[2] })) : []; };
  c.valeHoje = e => { const pago = c.num(e['VALOR']) || 0, m = String(e['OBS'] || '').match(/Vale hoje (\d+(?:\.\d+)?)(?: em (\d{4}-\d{2}-\d{2}))?/);
    if (e['ESTADO'] === 'Vendido') return { v: 0, estimado: false, vendido: true, pago };
    const ps = c.pecas(e), tv = u.sum(ps, p => p.vale);
    if (ps.length && tv > 0) return { v: u.r2(tv), estimado: false, pago, pecas: ps.map(p => Object.assign({}, p, { pago: u.r2(pago * p.vale / tv) })) };
    if (m) return { v: +m[1], data: m[2] || '', estimado: false, pago };
    const d = String(e['DATA DA COMPRA'] || '').slice(0, 10), anos = /^\d{4}-\d{2}-\d{2}$/.test(d) ? Math.max(0, -u.ateHoje(d) / 365.25) : 0;
    return { v: u.r2(pago * Math.max(0.25, Math.pow(0.8, anos))), estimado: true, pago }; };
  c.faltaPagar = e => { const p = c.compraDo(e); return p ? u.r2(-u.sum(c.linhasDaCompra(p).filter(l => l.status === 'Previsto' || l.data > u.hoje()))) : 0; };

  /* ---------- trabalhos ---------- */
  c.trabalhos = () => db.linhas('TRABALHOS').filter(j => j['CLIENTE']);
  /* o que entrou do trabalho: lançamentos ligados a ele ("Trabalho J012" na anotação) ou com o nome do cliente na descrição.
     Parcela ainda prevista não conta como recebida */
  c.doTrabalho = (j, l) => new RegExp('Trabalho ' + j.ID + '(?![\\w-])').test(l.obs);
  c.nomeCliente = j => u.sem(String(j['CLIENTE'] || '').replace(/\(.*?\)/g, ' ')).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const temNome = (desc, n) => n && (' ' + u.sem(desc).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ') + ' ').indexOf(' ' + n + ' ') >= 0;
  /* uma entrada sem ligação conta para o cliente cujo nome aparece nela; se dois servem ("Ana" e "Ana e Pedro"), fica com o nome mais completo */
  const donoPeloNome = (l, js) => { let melhor = null; js.forEach(x => { const n = c.nomeCliente(x); if (temNome(l.desc, n) && (!melhor || n.length > c.nomeCliente(melhor).length)) melhor = x; }); return melhor; };
  c.recebimentos = j => {
    const js = c.trabalhos(), n = c.nomeCliente(j);
    return c.lancs().filter(l => {
      if (l.grupo !== 'Renda' || l.status === 'Previsto') return false;
      if (/Trabalho J/.test(l.obs)) return c.doTrabalho(j, l); /* ligada a um trabalho: só conta nele */
      const d = temNome(l.desc, n) && donoPeloNome(l, js);
      return !!d && c.nomeCliente(d) === n;
    });
  };
  c.parcelasPrevistas = j => c.lancs().filter(l => l.grupo === 'Renda' && l.status === 'Previsto' && c.doTrabalho(j, l));
  /* vídeos a entregar: uma linha cada, "[x] teaser" quando está pronto */
  c.entregas = j => String(j['ENTREGAS'] || '').split('\n').map(x => x.trim()).filter(Boolean).map(x => { const m = x.match(/^\[([ xX])\]\s*(.*)$/); return m ? { feito: m[1] !== ' ', nome: m[2] } : { feito: false, nome: x }; });
  c.textoEntregas = lista => lista.map(e => `[${e.feito ? 'x' : ' '}] ${e.nome}`).join('\n');
  /* cliente recorrente (ex.: social media todo mês): fica fora do quadro, com o que rende mês a mês */
  c.recorrente = j => j['ETAPA'] === 'Recorrente';

  /* ---------- vendas (CRM): do primeiro contato até fechar ---------- */
  /* etapas antes de fechar: o cliente chamou ("Novo contato"), recebeu o orçamento ("Orçamento") ou não fechou ("Perdido") */
  c.ETAPAS_VENDA = ['Novo contato', 'Orçamento', 'Perdido'];
  /* etapa no quadro: "Novo contato" (antigo) conta como Orçamento */
  c.etapaQuadro = j => { const e = j['ETAPA'] || 'Orçamento'; return e === 'Novo contato' ? 'Orçamento' : e; };
  c.naoFechado = j => c.ETAPAS_VENDA.includes(j['ETAPA'] || 'Orçamento');
  c.crm = j => { try { const o = JSON.parse((j && j['CRM']) || '{}'); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; } catch (e) { return {}; } };
  c.semCrm = () => !!(TAB.falta.TRABALHOS && TAB.falta.TRABALHOS.has('crm')); /* falta rodar a atualização no Supabase */
  /* há quantos dias o cliente não responde (só de quem ainda está decidindo) */
  c.semResposta = j => { if (!['Novo contato', 'Orçamento'].includes(j['ETAPA'] || 'Orçamento')) return null; const k = String(c.crm(j).contato || ''); return /^\d{4}-\d{2}-\d{2}$/.test(k) ? Math.max(0, -u.ateHoje(k)) : null; };
  c.DIAS_RESPOSTA = 3;
  /* números do mês: quantos clientes chamaram, quantos orçamentos foram, quantos fecharam e quantos não */
  c.funil = m => { const js = c.trabalhos(), em = k => js.filter(j => String(c.crm(j)[k] || '').slice(0, 7) === m).length;
    return { novos: em('criado'), enviados: js.filter(j => String(c.crm(j).enviado || c.crm(j).criado || '').slice(0, 7) === m).length, fechados: em('fechado'), perdidos: em('perdido'), esperando: js.filter(j => (c.semResposta(j) || 0) >= c.DIAS_RESPOSTA).length }; };
  c.primeiroNome = j => { const n = String(j['CLIENTE'] || '').replace(/\s*\(.*?\)\s*/g, ' ').trim(); return / e /i.test(n) ? n : n.split(' ')[0]; };
  c.linkConversa = (j, texto) => { const f = c.foneWhats(j['TELEFONE']); return f ? `https://wa.me/${f}?text=${encodeURIComponent(texto)}` : null; };
  c.msgRetorno = j => j['ETAPA'] === 'Novo contato' && !c.crm(j).enviado
    ? `Oi, ${c.primeiroNome(j)}! Tudo bem? Aqui é o João, da Darzan Produções. Passando para retomar a nossa conversa${j['TIPO DE EVENTO'] ? ` sobre o seu ${String(j['TIPO DE EVENTO']).toLowerCase()}` : ''}. Posso te ajudar com mais alguma informação?`
    : `Oi, ${c.primeiroNome(j)}! Tudo bem? Passando para saber se você conseguiu ver o orçamento que te mandei. Se quiser, posso ajustar alguma coisa para caber certinho no que você imaginou.`;

  /* ---------- calendário dos dias trabalhados ---------- */
  /* cada dia marcado (JPL SOM, Darzan, outro) com o valor dele; PAGAMENTO liga o dia ao lançamento que pagou.
     Um Pix pode pagar vários dias: cada dia guarda a sua parte, então 1 pagamento de R$ 500 por 2 dias conta 2 trabalhos de R$ 250 */
  c.EMPRESAS = ['JPL SOM', 'Darzan Produções'];
  const COR_EMPRESA = Object.assign(Object.create(null), { 'JPL SOM': '#4fb3ff', 'Darzan Produções': '#f2c46d' });
  c.corEmpresa = e => COR_EMPRESA[e] || '#c39bff';
  c.dias = () => db.linhas('DIAS').filter(d => d['DATA']).map(d => ({ id: d.ID, data: String(d['DATA']).slice(0, 10), empresa: String(d['EMPRESA'] || 'Outro'), desc: String(d['O QUE FOI'] || ''),
    valor: c.num(d['VALOR']) || 0, pag: String(d['PAGAMENTO'] || ''), obs: String(d['OBS'] || ''), r: d }));
  c.empresasDias = () => [...new Set(c.EMPRESAS.concat(c.dias().map(d => d.empresa)))];
  /* o dia está pago quando o lançamento ligado existe e já entrou (previsto não conta) */
  c.pagamentoDoDia = d => d.pag ? c.lancs().find(l => l.id === d.pag && l.status !== 'Previsto') || null : null;
  c.diaPago = d => !!c.pagamentoDoDia(d);
  c.diasDoPagamento = id => c.dias().filter(d => d.pag === id);
  c.diasAReceber = () => c.dias().filter(d => !c.diaPago(d) && d.data <= u.hoje());
  /* eventos da Darzan (trabalho fechado com data) entram sozinhos no calendário */
  c.eventosDoMes = m => c.trabalhos().filter(j => j['DATA DO EVENTO'] && u.mes(String(j['DATA DO EVENTO'])) === m && !c.naoFechado(j) && !c.recorrente(j));
  /* o que vem pela frente (dias marcados e eventos da Darzan), do mais perto ao mais longe */
  c.proximosTrabalhos = (n = 5) => { const h = u.hoje();
    return c.dias().filter(d => d.data > h).map(d => ({ data: d.data, empresa: d.empresa, titulo: d.desc || d.empresa, dia: d }))
      .concat(c.trabalhos().filter(j => j['DATA DO EVENTO'] && String(j['DATA DO EVENTO']).slice(0, 10) > h && !c.naoFechado(j) && !c.recorrente(j)).map(j => ({ data: String(j['DATA DO EVENTO']).slice(0, 10), empresa: 'Darzan Produções', titulo: j['CLIENTE'], job: j })))
      .sort((a, b) => a.data < b.data ? -1 : a.data > b.data ? 1 : 0).slice(0, n); };
  /* o ano: quantos dias trabalhou em cada mês (só o que já passou) e por empresa */
  c.anoTrabalho = ano => {
    const meses = Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, '0')}`).map(m => { const k = c.calendario(m); return { m, dias: k.trabalhados, agendados: k.agendados, empresas: k.empresas }; });
    const emp = {}; meses.forEach(x => x.empresas.forEach(e => { const y = emp[e.empresa] || (emp[e.empresa] = { empresa: e.empresa, cor: e.cor, n: 0, valor: 0 }); y.n += e.n; y.valor = u.r2(y.valor + e.valor); }));
    return { ano, meses, total: u.sum(meses, x => x.dias), agendados: u.sum(meses, x => x.agendados), empresas: Object.values(emp).sort((a, b) => b.n - a.n) };
  };
  c.calendario = m => {
    const ds = c.dias().filter(d => u.mes(d.data) === m), evs = c.eventosDoMes(m), porData = {}, h = u.hoje();
    const de = k => porData[k] || (porData[k] = { dias: [], eventos: [] });
    ds.forEach(d => de(d.data).dias.push(d));
    evs.forEach(j => de(String(j['DATA DO EVENTO']).slice(0, 10)).eventos.push(j));
    const emp = {}, E = e => emp[e] || (emp[e] = { empresa: e, cor: c.corEmpresa(e), n: 0, valor: 0, aReceber: 0 });
    ds.forEach(d => { const x = E(d.empresa); x.n++; x.valor += d.valor; if (!c.diaPago(d)) x.aReceber += d.valor; });
    /* evento da Darzan conta como dia trabalhado (o valor fica no trabalho), a não ser que o dia já esteja marcado como Darzan */
    Object.entries(porData).forEach(([k, x]) => { if (x.eventos.length && !x.dias.some(d => d.empresa === 'Darzan Produções')) E('Darzan Produções').n++; });
    const datas = Object.keys(porData).sort(), comValor = ds.filter(d => d.valor > 0), valor = u.r2(u.sum(ds, d => d.valor));
    return { m, porData, datas, trabalhados: datas.filter(k => k <= h).length, agendados: datas.filter(k => k > h).length,
      empresas: Object.values(emp).map(x => Object.assign(x, { valor: u.r2(x.valor), aReceber: u.r2(x.aReceber) })).sort((a, b) => b.n - a.n),
      valor, aReceber: u.r2(u.sum(ds.filter(d => !c.diaPago(d)), d => d.valor)), media: comValor.length ? u.r2(u.sum(comValor, d => d.valor) / comValor.length) : 0 };
  };
  /* produção do cliente recorrente (ex.: Kellen): quantos vídeos e captações em cada mês, guardados no CRM do trabalho
     ({ prod: { "2026-11": { video: 3, captacao: 1 } }, precos: { video: 100, captacao: 200 } }). Falta receber = o que foi feito − o que entrou desde o primeiro mês contado */
  c.PRECOS_PROD = { video: 100, captacao: 200 };
  /* produção do recorrente vem dos pagamentos: cada Pix que cai do cliente é marcado com o que foi ("Prod v=2 c=1" na OBS = 2 vídeos e 1 captação) */
  c.prodDe = l => { const m = String(l.obs || '').match(/Prod v=(\d+) c=(\d+)/); return m ? { video: +m[1], captacao: +m[2] } : null; };
  c.producao = j => { const k = c.crm(j), pr = Object.assign({}, c.PRECOS_PROD, k.precos || {}), pags = c.recebimentos(j).slice().sort((a, b) => a.data < b.data ? 1 : -1);
    const linha = m => { const ps = pags.filter(l => u.mes(l.data) === m), mk = ps.map(c.prodDe).filter(Boolean);
      return { m, pags: ps, video: u.sum(mk, x => x.video), captacao: u.sum(mk, x => x.captacao), recebido: u.r2(u.sum(ps, l => l.valor)), semMarca: ps.filter(l => !c.prodDe(l)).length }; };
    return { precos: pr, pags, linha, meses: [...new Set(pags.map(l => u.mes(l.data)))].sort() }; };
  c.ganhosPorMes = j => { const o = {}; c.recebimentos(j).forEach(l => { const m = u.mes(l.data); o[m] = u.r2((o[m] || 0) + l.valor); }); return o; };
  /* balanço da Darzan num ano: por mês, o que faturou (trabalhos e recorrentes) e quais trabalhos aconteceram */
  c.anosDarzan = () => [...new Set(c.lancs().filter(l => l.cat === 'Darzan Produções').map(l => l.data.slice(0, 4)).concat(c.trabalhos().map(j => String(j['DATA DO EVENTO'] || '').slice(0, 4)).filter(a => a && a <= u.hoje().slice(0, 4))))].sort();
  c.balancoDarzan = ano => {
    const fim = ano === u.hoje().slice(0, 4) ? u.mes(u.hoje()) : ano + '-12', rec = {};
    c.trabalhos().filter(c.recorrente).forEach(j => Object.entries(c.ganhosPorMes(j)).forEach(([m, v]) => { rec[m] = u.r2((rec[m] || 0) + v); }));
    const out = [];
    for (let m = ano + '-01'; m <= fim; m = u.addMes(m, 1)) {
      const fat = u.r2(u.sum(c.lancs().filter(l => l.cat === 'Darzan Produções' && l.grupo === 'Renda' && l.status !== 'Previsto' && u.mes(l.data) === m)));
      const jobs = c.trabalhos().filter(j => !c.recorrente(j) && !c.naoFechado(j) && String(j['DATA DO EVENTO'] || '').slice(0, 7) === m).sort((a, b) => String(a['DATA DO EVENTO']) < String(b['DATA DO EVENTO']) ? -1 : 1);
      out.push({ m, fat, rec: rec[m] || 0, trab: u.r2(fat - (rec[m] || 0)), jobs });
    }
    return out;
  };
  /* lembrete de pagamento no WhatsApp: o número do cliente (com 55 do Brasil) e uma mensagem educada, que muda se
     a parcela ainda vai vencer, vence hoje ou já venceu. Abre o WhatsApp com o texto pronto; você confere e envia */
  c.foneWhats = t => { let d = String(t || '').replace(/\D/g, ''); if (d.length === 10 || d.length === 11) d = '55' + d; return /^55\d{10,11}$/.test(d) ? d : null; };
  c.msgCobranca = (j, valor, venc) => {
    const nome = String(j['CLIENTE'] || '').replace(/\s*\(.*?\)\s*/g, ' ').trim(), primeiro = / e /i.test(nome) ? nome : nome.split(' ')[0];
    const tipo = String(j['TIPO DE EVENTO'] || ''), ev = String(j['DATA DO EVENTO'] || '');
    const oQue = /casamento/i.test(tipo) ? 'da filmagem do casamento' : /15 anos|anivers/i.test(tipo) ? 'da filmagem da festa' : /formatura/i.test(tipo) ? 'da cobertura da formatura' : /social/i.test(tipo) ? 'dos vídeos' : `do trabalho (${tipo.toLowerCase() || 'evento'})`;
    const dd = d => `${d.slice(8, 10)}/${d.slice(5, 7)}${d.slice(0, 4) !== u.hoje().slice(0, 4) ? '/' + d.slice(0, 4) : ''}`;
    const quando = /^\d{4}-\d{2}-\d{2}$/.test(ev) ? ` (${dd(ev)})` : '';
    const q = venc ? u.ateHoje(venc) : null, dt = venc ? dd(venc) : '';
    const prazo = q === null ? '' : q > 0 ? `, que vence em ${dt}` : q === 0 ? `, que vence hoje (${dt})` : `, que venceu em ${dt}`;
    const fim = q !== null && q < 0
      ? 'Se já tiver feito o Pix, me manda o comprovante quando puder, por favor. E se precisar combinar outra data, é só me falar, sem problema nenhum.'
      : 'Se já estiver tudo certo, pode desconsiderar esta mensagem. Qualquer dúvida, estou à disposição!';
    return `Oi, ${primeiro}! Tudo bem? 😊\n\nPassando só para lembrar, com carinho, da parcela de ${u.reais(valor)} ${oQue}${quando}${prazo}.\n\n${fim}\n\nAbraço,\nJoão · Darzan Produções`;
  };
  c.linkWhats = (j, valor, venc) => { const f = c.foneWhats(j['TELEFONE']); return f ? `https://wa.me/${f}?text=${encodeURIComponent(c.msgCobranca(j, valor, venc))}` : null; };
  c.anexos = j => db.linhas('ANEXOS').filter(x => x['TRABALHO'] === j.ID).sort((a, b) => String(a['DATA']) < String(b['DATA']) ? -1 : 1);
  c.recebido = j => u.r2(u.sum(c.recebimentos(j)));
  c.faltaReceber = j => { const t = c.num(j['VALOR TOTAL']); return t ? u.r2(t - c.recebido(j)) : null; };

  /* ---------- memória de categorias: aprende com o que você já categorizou ---------- */
  /* "PIX ENVIADO Posto Shell 123" e "posto shell" viram a mesma chave: "posto shell" */
  const RUIDO = /\b(pix|enviado|enviada|recebido|recebida|transf\w*|compra|no|na|debito|credito|pagamento|pagto|pag|de|do|da|dos|das|para|em|com|cartao|parcela|ltda|me|sa)\b/g;
  c.chave = d => u.sem(d).replace(/[^a-z\s]/g, ' ').replace(RUIDO, ' ').replace(/\s+/g, ' ').trim().split(' ').slice(0, 3).join(' ');
  c.semCategoria = l => !l.cat || l.cat === 'Outros';
  c.memoria = () => {
    const m = new Map();
    c.lancs().forEach(l => {
      if (c.semCategoria(l) || l.grupo === 'Transferência' || l.grupo === 'Reembolso') return;
      const k = c.chave(l.desc); if (!k) return;
      const x = m.get(k) || { total: 0, op: {} };
      const id = [l.cat, l.sub, l.grupo].join('|');
      x.total++; x.op[id] = (x.op[id] || 0) + 1;
      m.set(k, x);
    });
    return m;
  };
  /* a categoria mais usada para essa descrição (só se for a escolha de pelo menos 60% das vezes) */
  /* acha a descrição já conhecida: igual, ou que tem todas as palavras dela ("uber trip" acha "UBER *TRIP 4521") */
  const conhecida = (desc, m) => {
    const k = c.chave(desc); if (m.has(k)) return m.get(k);
    const tem = new Set(u.sem(desc).replace(/[^a-z\s]/g, ' ').replace(RUIDO, ' ').split(/\s+/).filter(Boolean));
    let melhor = null, pts = 0;
    m.forEach((x, chave) => {
      const ps = chave.split(' ');
      if (!ps.every(w => tem.has(w))) return;
      if (ps.length < 2 && ps[0].length < 5) return; /* uma palavra só vale se for comprida, tipo "netflix" */
      const n = ps.join('').length;
      if (n > pts) { melhor = x; pts = n; }
    });
    return melhor;
  };
  c.sugerir = (desc, mem) => {
    const x = conhecida(desc, mem || c.memoria()); if (!x) return null;
    const [id, n] = Object.entries(x.op).sort((a, b) => b[1] - a[1])[0];
    if (n / x.total < .6) return null;
    const [cat, sub, grupo] = id.split('|');
    return { cat, sub, grupo, n, total: x.total };
  };
  /* o que precisa de conserto */
  c.REVISAR = {
    banco: { nome: 'Sem banco', f: l => l.tipo === 'conta' && (!l.banco || l.banco === 'Não informado') },
    categoria: { nome: 'Sem categoria', f: l => c.semCategoria(l) && l.grupo !== 'Transferência' && l.grupo !== 'Reembolso' },
    conferir: { nome: 'Para conferir', f: l => /conferir/i.test(l.obs) },
  };
  c.paraRevisar = k => c.lancs().filter(c.REVISAR[k].f);
  c.totalRevisar = () => { const ids = new Set(); Object.keys(c.REVISAR).forEach(k => c.paraRevisar(k).forEach(l => ids.add(l.id))); return ids.size; };

  /* ---------- avisos no celular: 1 dia antes e no dia ---------- */
  /* contas para pagar na mão, faturas, tarefas com data e trabalhos (evento e entrega) */
  c.avisos = () => {
    const out = [], hoje = u.hoje(), fim = u.addDias(hoje, 60);
    const add = (chave, data, oQue, corpo, tipo) => {
      if (!data) return;
      if (data < hoje) { for (let k = 0; k < 7; k++) { const quando = u.addDias(hoje, k); if (quando > u.addDias(data, 30)) break; out.push({ ID: `AV-${chave}-atr-${quando}`, 'QUANDO': quando, 'TITULO': `Atrasada: ${oQue}`, 'CORPO': corpo, 'TIPO': tipo, 'ENVIADO': '' }); } return; }
      [[-1, 'Amanhã'], [0, 'Hoje']].forEach(([n, q]) => {
        const quando = u.addDias(data, n);
        if (quando < hoje || quando > fim) return;
        out.push({ ID: `AV-${chave}-${quando}`, 'QUANDO': quando, 'TITULO': `${q}: ${oQue}`, 'CORPO': corpo, 'TIPO': tipo, 'ENVIADO': '' });
      });
    };
    c.tarefas().filter(t => !t.feita).forEach(t => {
      const [tp, a] = t.id.split(':'), valor = t.valor ? u.reais(t.valor) : '';
      if (tp === 'f') add(t.id, t.data, `vence a fatura do ${a}`, [valor, t.estimado ? 'vencimento estimado' : '', t.banco && `sai do ${t.banco}`].filter(Boolean).join(' · '), 'fatura');
      else if (tp === 'l') add(t.id, t.data, t.titulo.charAt(0).toLowerCase() + t.titulo.slice(1), [valor, t.banco && t.banco !== 'Não informado' ? (t.grupo === 'receber' ? `entra no ${t.banco}` : `sai do ${t.banco}`) : ''].filter(Boolean).join(' · '), t.grupo === 'receber' ? 'receber' : 'conta');
      else add(t.id, t.data, t.titulo.charAt(0).toLowerCase() + t.titulo.slice(1), [valor, t.nota].filter(Boolean).join(' · '), 'tarefa');
    });
    c.trabalhos().filter(j => j['ETAPA'] !== 'Entregue' && !c.naoFechado(j)).forEach(j => {
      const quem = j['CLIENTE'], ev = j['TIPO DE EVENTO'] || 'evento';
      add(`J-ev-${j.ID}`, String(j['DATA DO EVENTO'] || ''), `${ev.toLowerCase()} ${quem}`, [j['LOCAL'], j['O QUE FOI FECHADO']].filter(Boolean).join(' · ') || 'Trabalho da Darzan', 'trabalho');
      add(`J-en-${j.ID}`, String(j['ENTREGA'] || ''), `entregar o trabalho de ${quem}`, j['O QUE FOI FECHADO'] || ev, 'trabalho');
    });
    return out;
  };

  /* ---------- jogo ---------- */
  c.NIVEIS = ['Iniciante', 'Organizado', 'Poupador', 'Estrategista', 'Investidor', 'Magnata', 'Lenda'];
  c.xp = () => { const rs = c.mesesPassados().map(c.resumo); return rs.filter(r => r.sobra > 0).length * 100 + rs.filter(r => r.guardou > 0).length * 100 + u.sum(c.tarefas().filter(t => t.feita), t => t.xp); };
  c.nivel = xp => { const n = Math.floor(xp / 500); return { n: n + 1, nome: c.NIVEIS[Math.min(n, c.NIVEIS.length - 1)], atual: xp % 500, prox: 500 }; };

  /* ---------- dicas ---------- */
  c.dicas = m => {
    const r = c.resumo(m), o = [], mm = u.nomeMes(m).toLowerCase(), cat = n => r.cats.find(x => x.cat === n) || { valor: 0, n: 0 };
    /* comer fora = restaurante, lanche e delivery (mercado, padaria e almoço do trabalho não entram) */
    const FORA = ['Restaurante e lanche', 'Delivery'], fora = x => { const k = x.cats.find(k => k.cat === 'Alimentação'); return k ? u.sum(FORA.map(s => k.subs[s] || 0)) : 0; };
    const comer = { valor: u.r2(fora(r)), n: r.gastos.filter(l => l.cat === 'Alimentação' && FORA.includes(l.sub)).length };
    const mc = c.media(fora, m);
    if (comer.valor > 150) o.push({ w: comer.valor, t: `Comer fora levou ${u.k0(comer.valor)}`, s: `${comer.n} pedidos e lanches em ${mm}${mc ? ` (média de ${u.k0(mc)})` : ''}. Pela metade, sobram uns ${u.k0(comer.valor / 2)} por mês.` });
    const carro = cat('Carro e transporte');
    if (carro.valor > 300 && r.entr) o.push({ w: carro.valor * .8, t: `O carro custou ${u.k0(carro.valor)}`, s: `Gasolina, manutenção, seguro e Uber: ${u.pct(carro.valor / r.entr)} do que entrou. Inclua o deslocamento nos orçamentos.` });
    const meta = .3 * r.entr;
    if (r.entr && r.guardou < meta) o.push({ w: meta - r.guardou + 200, t: `Faltaram ${u.k0(meta - r.guardou)} para guardar 30%`, s: `Você guardou ${u.k0(r.guardou)} (${u.pct(r.guardou / r.entr)} da renda).${r.sobra > 0 ? ` Sobraram ${u.k0(r.sobra)}: dá para mandar a diferença pra reserva.` : ''}` });
    const dz = c.media(x => x.fonte['Darzan Produções'], m);
    if (dz && r.fonte['Darzan Produções'] < dz * .75) o.push({ w: dz - r.fonte['Darzan Produções'], t: `A Darzan faturou ${u.pct(1 - r.fonte['Darzan Produções'] / dz)} abaixo da média`, s: `${u.k0(r.fonte['Darzan Produções'])} em ${mm}, contra ${u.k0(dz)} por mês. Bom momento para chamar clientes.` });
    if (r.entr && r.des / r.entr > .2) o.push({ w: r.des - .2 * r.entr + 100, t: 'Gastos com vontades passaram de 20%', s: `Desejos somaram ${u.k0(r.des)}, ${u.pct(r.des / r.entr)} da renda.` });
    o.sort((a, b) => b.w - a.w);
    if (!o.length) o.push({ t: r.L.length ? 'Mês equilibrado' : 'Nada lançado neste mês ainda', s: r.L.length ? 'Nenhum gasto fora do normal. Segue assim.' : 'Use o botão Gastei ou Recebi para começar.' });
    return o;
  };
})(window.A);
