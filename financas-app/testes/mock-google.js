/* Google "de mentira" para abrir o app no navegador do computador, sem a planilha de verdade.
   Roda o App.gs de verdade em cima de uma cópia da planilha (window.DADOS_PLANILHA) e guarda as mudanças no navegador.
   Usado pelo dist/local.html (montado por ferramentas/montar_local.py) e pelos testes.                                  */
(function () {
  const CHAVE = 'mock-planilha-v1';
  const reviver = (k, v) => (v && typeof v === 'object' && v.$d) ? (([y, m, d]) => new Date(y, m - 1, d))(v.$d.split('-').map(Number)) : v;
  const replacer = function (k, v) { const o = this[k]; return o instanceof Date ? { $d: iso(o) } : v; };
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  let base = JSON.parse(JSON.stringify(window.DADOS_PLANILHA || { abas: {}, formulas: {} }), reviver);
  try { const s = localStorage.getItem(CHAVE); if (s && !window.MOCK_SEM_MEMORIA) base = JSON.parse(s, reviver); } catch (e) { /* sem armazenamento */ }
  const guardar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(base, replacer)); } catch (e) { /* sem armazenamento */ } };
  window.MOCK = { base, limpar: () => { try { localStorage.removeItem(CHAVE); } catch (e) { /* nada */ } }, chamadas: [] };

  function Aba(nome) {
    const g = () => base.abas[nome], F = () => (base.formulas[nome] = base.formulas[nome] || {});
    const vazio = v => v === '' || v === null || v === undefined;
    const aba = {
      getName: () => nome,
      getLastRow: () => { let n = 0; g().forEach((r, i) => { if (r.some(v => !vazio(v))) n = i + 1; }); Object.keys(F()).forEach(k => { n = Math.max(n, +k.split(',')[0]); }); return n; },
      getLastColumn: () => Math.max(0, ...g().map(r => { for (let c = r.length; c > 0; c--) if (!vazio(r[c - 1])) return c; return 0; })),
      getMaxColumns: () => Math.max(26, aba.getLastColumn()),
      insertColumnsAfter: () => aba,
      deleteRow: r => {
        g().splice(r - 1, 1);
        const novo = {};
        Object.entries(F()).forEach(([k, f]) => { const [rr, cc] = k.split(',').map(Number); if (rr < r) novo[k] = f; else if (rr > r) novo[`${rr - 1},${cc}`] = f; });
        base.formulas[nome] = novo;
      },
      getRange: (r, c, nr = 1, nc = 1) => intervalo(r, c, nr, nc),
    };
    function intervalo(r, c, nr, nc) {
      const it = {
        getValues: () => { const out = []; for (let i = 0; i < nr; i++) { const row = g()[r - 1 + i] || []; const l = []; for (let j = 0; j < nc; j++) { const v = row[c - 1 + j]; l.push(vazio(v) ? '' : v); } out.push(l); } return out; },
        getFormulasR1C1: () => { const out = []; for (let i = 0; i < nr; i++) { const l = []; for (let j = 0; j < nc; j++) l.push(F()[`${r + i},${c + j}`] || ''); out.push(l); } return out; },
        setValues: v => {
          if (v.length !== nr || v.some(l => l.length !== nc)) throw new Error('O número de colunas nos dados não corresponde ao número de colunas no intervalo.');
          v.forEach((l, i) => { const ri = r - 1 + i; while (g().length <= ri) g().push([]); const row = g()[ri]; l.forEach((x, j) => { while (row.length < c - 1 + j) row.push(''); row[c - 1 + j] = x; delete F()[`${r + i},${c + j}`]; }); });
          return p;
        },
        setValue: x => p.setValues([[x]]),
        setFormulaR1C1: f => { F()[`${r},${c}`] = f; return p; },
        sort: o => {
          const col = (o.column || o) - c, rows = g().slice(r - 1, r - 1 + nr);
          rows.sort((a, b) => { const x = a[c - 1 + col], y = b[c - 1 + col]; return (x instanceof Date ? +x : x) > (y instanceof Date ? +y : y) ? 1 : -1; });
          g().splice(r - 1, nr, ...rows); return p;
        },
      };
      const p = new Proxy(it, { get: (o, k) => k in o ? o[k] : () => p }); /* formatação: não faz nada */
      return p;
    }
    return aba;
  }
  const planilha = { getSheetByName: n => base.abas[n] ? Aba(n) : null, getUrl: () => '#planilha-de-teste' };

  window.SpreadsheetApp = { getActiveSpreadsheet: () => planilha, flush: () => { }, getUi: () => ({}) };
  window.LockService = { getScriptLock: () => ({ waitLock: () => { }, releaseLock: () => { } }) };
  window.HtmlService = {};
  window.ScriptApp = { getService: () => ({ getUrl: () => location.href }) };
  window.Utilities = {
    formatDate: (d, fuso, f) => f.replace(/yyyy|MM|M|dd|d/g, t => ({ yyyy: d.getFullYear(), MM: String(d.getMonth() + 1).padStart(2, '0'), M: d.getMonth() + 1, dd: String(d.getDate()).padStart(2, '0'), d: d.getDate() })[t]),
  };

  /* google.script.run: igual ao de verdade, assíncrono e só passa dados simples (JSON) */
  const run = (ok, erro) => new Proxy({}, {
    get: (o, fn) => {
      if (fn === 'withSuccessHandler') return h => run(h, erro);
      if (fn === 'withFailureHandler') return h => run(ok, h);
      return (...args) => {
        const copia = JSON.parse(JSON.stringify(args));
        window.MOCK.chamadas.push({ fn, args: copia });
        setTimeout(() => {
          try {
            if (window.MOCK_FALHAR && window.MOCK_FALHAR(fn, copia)) throw new Error('Falha de teste');
            const r = window.SERVIDOR[fn](...copia);
            guardar();
            ok && ok(r === undefined ? null : JSON.parse(JSON.stringify(r)));
          } catch (e) { erro && erro(e); }
        }, window.MOCK_DEMORA === undefined ? 120 : window.MOCK_DEMORA);
      };
    },
  });
  window.google = { script: { get run() { return run(null, null); } } };
})();
