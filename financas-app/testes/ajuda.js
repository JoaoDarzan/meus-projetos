/* Peças usadas por todos os caminhos de teste. */
const path = require('path'), fs = require('fs');
const HOJE = process.env.HOJE || '2026-10-27';
const CAPTURAS = path.join(__dirname, 'capturas');
fs.mkdirSync(CAPTURAS, { recursive: true });

/* aparelhos: largura, altura e o espaço que o sistema ocupa em cima e embaixo (relógio, barrinha) */
const APARELHOS = {
  'iphone-se': { w: 375, h: 667, topo: 20, base: 0, toque: true },
  'iphone-15': { w: 393, h: 852, topo: 59, base: 34, toque: true },
  'iphone-pro-max': { w: 430, h: 932, topo: 59, base: 34, toque: true },
  'android': { w: 360, h: 800, topo: 24, base: 0, toque: true },
  'ipad': { w: 820, h: 1180, topo: 24, base: 20, toque: true },
  'notebook': { w: 1366, h: 768, topo: 0, base: 0 },
  'monitor': { w: 1920, h: 1080, topo: 0, base: 0 },
};

async function abrir(b, st, { larg = 390, alt = 844, logar = true, host = '127.0.0.1', aparelho, push } = {}) {
  const ap = aparelho ? APARELHOS[aparelho] : null;
  const ctx = await b.newContext({ viewport: { width: ap ? ap.w : larg, height: ap ? ap.h : alt }, hasTouch: !!(ap && ap.toque), isMobile: !!(ap && ap.toque && ap.w < 700), timezoneId: 'America/Sao_Paulo', locale: 'pt-BR' });
  await ctx.addInitScript(([hoje, porta, push, host]) => {
    window.DF_CONFIG = { url: `http://${host}:${porta}`, /* mesmo endereço da página: a política de segurança (CSP) só deixa falar com ele */ chave: 'chave-de-teste', vapid: 'BAnX0hPDbPdvv3yWufNnEvrbzfOK1aXIZ5BSyXL9qSCuxF548EjP9iDG5NsCz-IimHc_xTqJjJod-cOakGoK82o' };
    if (push) window.DF_PUSH_FALSO = push; /* o "celular" que recebe avisos, nos testes */
    /* relógio parado no dia do teste */
    const D = Date, fixo = new D(hoje + 'T10:00:00-03:00').getTime(), ini = D.now();
    window.Date = class extends D { constructor(...a) { super(...(a.length ? a : [fixo + (D.now() - ini)])); } static now() { return fixo + (D.now() - ini); } };
  }, [HOJE, st.porta, push || null, host]);
  const p = await ctx.newPage();
  p.erros = []; p.aparelho = ap;
  p.on('pageerror', e => p.erros.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) p.erros.push(m.text()); });
  await p.route('**/fonts.*/**', r => r.abort());
  await p.goto(`http://${host}:${st.porta}/financas/`);
  if (ap) await p.addStyleTag({ content: `:root{--sa-t:${ap.topo}px!important;--sa-b:${ap.base}px!important}` });
  if (logar) await entrar(p);
  return p;
}
async function entrar(p, email = 'joao@teste.com', senha = 'senha-certa') {
  await p.waitForSelector('#login:not([hidden])');
  await p.fill('#lgEmail', email); await p.fill('#lgSenha', senha); await p.click('#lgBtn');
  await p.waitForFunction(() => document.getElementById('login').hidden && document.getElementById('splash').hidden && document.querySelector('#view').children.length);
  await calmo(p);
}
const calmo = p => p.waitForFunction(() => A.db.pendentes() === 0, null, { timeout: 15000 }).then(() => p.waitForTimeout(60));
const clica = async (p, sel) => { await p.locator(sel).first().click(); await p.waitForTimeout(60); };
const resumo = (p, m) => p.evaluate(m => { const r = A.c.resumo(m); return { saiu: r.saiu, entr: r.entr, guardou: r.guardou, somaCats: r.cats.reduce((s, x) => s + x.valor, 0) }; }, m);
const ir = async (p, v) => { await p.evaluate(v => { const b = document.querySelector(`#tabbar [data-a=go][data-v=${v}]`); const s = document.querySelector(`#snav [data-a=go][data-v=${v}]`); (b && b.offsetParent ? b : s).click(); }, v); await p.waitForTimeout(80); };
const brl = t => +String(t).replace(/[^\d,−-]/g, '').replace(',', '.').replace('−', '-');
const igual = (a, b, msg) => { if (Math.abs(a - b) > 0.005) throw new Error(`${msg}: esperava ${b}, veio ${a}`); };
const certo = (x, msg) => { if (!x) throw new Error(msg); };
/* coloca lançamentos prontos pelo próprio app (para o teste não depender dos dados de quem roda) */
const preparar = (p, regs) => p.evaluate(regs => A.db.lote(regs.map(r => ({ op: 'salvar', aba: 'EXTRATO', registro: Object.assign({ 'DATA': A.u.hoje(), 'BANCO': 'Nubank', 'GRUPO': 'Desejos', 'TIPO': 'conta', 'VALOR': -10, 'CATEGORIA': 'Outros', 'SUB-CATEGORIA': 'Outros', 'STATUS': 'Pago', 'PARCELA': '', 'OBS': '' }, r) }))), regs).then(() => calmo(p)).then(() => p.evaluate(() => A.render(false)));

/* ---------- conferência de layout: o que deixa a tela "zuada" ---------- */
/* olha a tela inteira (ou o formulário aberto) e devolve a lista de problemas */
async function problemasDeLayout(p) {
  const ap = p.aparelho || { topo: 0 };
  return p.evaluate(({ topo }) => {
    const ruins = [], vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !e.closest('[hidden]'); };
    const nome = e => (e.id ? '#' + e.id : e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : '')) + (e.textContent ? ` "${e.textContent.trim().slice(0, 18)}"` : '');
    if (document.documentElement.scrollWidth > innerWidth + 1) ruins.push(`a página passa ${document.documentElement.scrollWidth - innerWidth}px para o lado`);
    const folha = document.getElementById('scrim2').hidden ? null : document.getElementById('s2');
    const raiz = folha || document.getElementById('view');
    /* nada sai da caixa onde está (cartão, folha) */
    const caixa = folha || null;
    raiz.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=file]),select,textarea,button,.campo,.kpi,.panel,.gcard').forEach(e => {
      if (!vis(e)) return;
      const r = e.getBoundingClientRect(), pai = caixa ? caixa.getBoundingClientRect() : { left: 0, right: innerWidth };
      if (e.closest('.rail,.seg,.chips,.rv-topo,.bankpills,.tabs,.kanban,.board,.scrollbox')) return; /* faixas que rolam de lado de propósito */
      if (r.right > pai.right + 1 || r.left < pai.left - 1) ruins.push(`${nome(e)} sai da tela/folha (${Math.round(r.left)}–${Math.round(r.right)} de ${Math.round(pai.left)}–${Math.round(pai.right)})`);
    });
    if (folha) {
      /* caixas de digitar com letra menor que 16px fazem o iPhone dar zoom e bagunçar a tela */
      folha.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=file]),select,textarea').forEach(e => { if (vis(e) && parseFloat(getComputedStyle(e).fontSize) < 16) ruins.push(`${nome(e)} com letra ${getComputedStyle(e).fontSize} (o iPhone dá zoom)`); });
      /* cada nome de campo tem a sua caixa logo abaixo (olha a tela, não o código) */
      const caixas = [...folha.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=file]),select,textarea,.rchips')].filter(vis).map(e => e.getBoundingClientRect());
      folha.querySelectorAll('label.fl').forEach(l => {
        if (!vis(l)) return;
        const r = l.getBoundingClientRect();
        const abaixo = caixas.filter(c => c.top >= r.bottom - 2 && c.top - r.bottom < 24 && Math.min(c.right, r.right) - Math.max(c.left, r.left) > Math.min(r.width, c.width) * 0.5);
        if (!abaixo.length) ruins.push(`campo "${l.textContent.trim()}" com o nome fora do lugar (a caixa não está logo abaixo)`);
      });
      /* campos não ficam um por cima do outro */
      const cs = [...folha.querySelectorAll('.campo,.checkline,.rchips,.amount,.save,.acoes')].filter(vis).map(e => [e, e.getBoundingClientRect()]);
      for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
        const [a, ra] = cs[i], [b, rb] = cs[j];
        if (a.contains(b) || b.contains(a)) continue;
        const x = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), y = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        if (x > 2 && y > 2) ruins.push(`${nome(a)} em cima de ${nome(b)}`);
      }
      if (folha.getBoundingClientRect().top < topo - 1) ruins.push(`formulário começa embaixo do relógio (${Math.round(folha.getBoundingClientRect().top)}px)`);
    } else if (topo && scrollY < 5) {
      /* nenhum texto embaixo do relógio */
      const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
      for (let n; (n = w.nextNode());) {
        if (!n.textContent.trim() || !vis(n.parentElement)) continue;
        const r = document.createRange(); r.selectNodeContents(n); const q = r.getBoundingClientRect();
        if (q.height && q.bottom > 0 && q.top < topo - 1) { ruins.push(`"${n.textContent.trim().slice(0, 20)}" embaixo do relógio`); break; }
      }
    }
    /* botões grandes o bastante para o dedo */
    if (matchMedia('(pointer: coarse)').matches) raiz.querySelectorAll('button,[data-a]').forEach(e => { if (!vis(e) || e.closest('.rail,.seg') || e.classList.contains('more')) return; const r = e.getBoundingClientRect(); if (r.height < 28 && r.width < 28) ruins.push(`${nome(e)} pequeno demais para o dedo (${Math.round(r.width)}x${Math.round(r.height)})`); });
    return [...new Set(ruins)];
  }, { topo: ap.topo });
}
async function conferirLayout(p, onde) {
  const r = await problemasDeLayout(p);
  if (r.length) throw new Error(`${onde}: ${r.slice(0, 4).join(' | ')}${r.length > 4 ? ` (+${r.length - 4})` : ''}`);
}

module.exports = { HOJE, CAPTURAS, APARELHOS, abrir, entrar, calmo, clica, resumo, ir, brl, igual, certo, preparar, problemasDeLayout, conferirLayout, path, fs };
