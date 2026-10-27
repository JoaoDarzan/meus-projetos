/* Funções pequenas usadas no app todo: dinheiro, datas, ícones e HTML. */
(function (A) {
  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  const u = A.u = {};
  u.MESES = MESES;
  u.CURTO = CURTO;

  /* ---------- dinheiro ---------- */
  u.brl = (v, cents = true) => {
    v = +v || 0;
    if (A.ui && A.ui.oculto) return 'R$ ••••';
    return (v < 0 ? '−' : '') + 'R$ ' + Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });
  };
  u.k0 = v => u.brl(v, false);
  u.big = v => {
    if (A.ui && A.ui.oculto) return 'R$ ••••••';
    const [a, b] = Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).split(',');
    return `${v < 0 ? '−' : ''}R$ ${a}<span class="cents">,${b}</span>`;
  };
  u.pct = v => Math.round((v || 0) * 100) + '%';
  u.r2 = v => Math.round((+v || 0) * 100) / 100;
  /* "1.234,56", "1234.56", "R$ 30" -> número */
  u.num = s => {
    s = String(s == null ? '' : s).replace(/[^\d,.-]/g, '');
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, '');
    const n = parseFloat(s);
    return isFinite(n) ? n : 0;
  };
  u.sum = (a, f = x => x.valor) => a.reduce((s, x) => s + (+f(x) || 0), 0);

  /* ---------- datas (sempre texto AAAA-MM-DD, sem fuso) ---------- */
  u.hoje = () => {
    if (A.config && A.config.hoje) return A.config.hoje;
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  u.mes = data => data.slice(0, 7);
  u.addMes = (m, n) => {
    let [y, mm] = m.split('-').map(Number);
    mm += n;
    y += Math.floor((mm - 1) / 12);
    mm = ((mm - 1) % 12 + 12) % 12 + 1;
    return `${y}-${String(mm).padStart(2, '0')}`;
  };
  u.difMes = (a, b) => { const [y1, m1] = a.split('-').map(Number), [y2, m2] = b.split('-').map(Number); return (y2 - y1) * 12 + (m2 - m1); };
  u.diaMax = m => { const [y, mm] = m.split('-').map(Number); return new Date(y, mm, 0).getDate(); };
  u.dataNoMes = (m, dia) => `${m}-${String(Math.min(dia, u.diaMax(m))).padStart(2, '0')}`;
  u.dias = (a, b) => { const p = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); }; return Math.round((p(b) - p(a)) / 864e5); };
  u.ateHoje = data => u.dias(u.hoje(), data);
  u.nomeMes = m => MESES[+m.slice(5, 7) - 1];
  u.nomeMesAno = m => `${u.nomeMes(m)} ${m.slice(0, 4)}`;
  u.dm = data => `${data.slice(8, 10)}/${CURTO[+data.slice(5, 7) - 1]}${data.slice(0, 4) !== u.hoje().slice(0, 4) ? '/' + data.slice(2, 4) : ''}`;
  u.ddmm = data => `${data.slice(8, 10)}/${data.slice(5, 7)}`;
  u.quando = data => {
    const n = u.ateHoje(data);
    if (n === 0) return 'Hoje';
    if (n === 1) return 'Amanhã';
    if (n === -1) return 'Ontem';
    if (n > 1 && n <= 6) return new Date(data + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'long' }).replace(/^./, c => c.toUpperCase());
    return u.dm(data);
  };

  /* ---------- texto e HTML ---------- */
  u.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  u.cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  u.id = p => (p || 'x') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  u.svg = (n, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${(window.ICONES || {})[n] || (window.ICONES || {})['circle-help'] || ''}</svg>`;
  /* ícone de app: [nome, cor clara, cor escura] */
  u.ti = (spec, tam = '') => `<span class="ti ${tam}" style="--a:${spec[1]};--b:${spec[2]}">${u.svg(spec[0])}</span>`;
  u.clone = o => JSON.parse(JSON.stringify(o));
})(window.A = window.A || {});
