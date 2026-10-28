/* Um Google Planilhas de mentira para rodar financas-app/backup/Backup.gs no computador (sem Google).
   rodar({ ler, props }) devolve o "Apps Script" carregado; ss.abas guarda o que foi escrito em cada aba. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const CODIGO = fs.readFileSync(path.join(__dirname, '../backup/Backup.gs'), 'utf8');

function planilha() {
  const abas = {};
  const aba = nome => {
    const sh = { nome, valores: [], formatos: {}, congeladas: 0 };
    const range = (r, c, nr, nc) => {
      const rg = {
        setValues(v) {
          if (v.length !== nr || v.some(l => l.length !== nc)) throw new Error(`setValues: tamanho errado em ${nome}`);
          v.forEach((l, i) => { sh.valores[r - 1 + i] = sh.valores[r - 1 + i] || []; l.forEach((x, k) => { sh.valores[r - 1 + i][c - 1 + k] = x; }); });
          return rg;
        },
        setNumberFormat(f) { for (let k = 0; k < nc; k++) sh.formatos[c + k] = f; return rg; },
        setFontWeight: () => rg, setBackground: () => rg, setFontColor: () => rg,
      };
      return rg;
    };
    Object.assign(sh, { getRange: range, clear() { sh.valores = []; sh.formatos = {}; }, setFrozenRows(n) { sh.congeladas = n; }, getLastRow: () => sh.valores.length });
    return sh;
  };
  abas['Página1'] = aba('Página1'); // a planilha nova do Google já vem com uma aba vazia
  return { abas, getSheetByName: n => abas[n] || null, insertSheet: n => (abas[n] = aba(n)), deleteSheet: sh => { delete abas[sh.nome]; } };
}

function rodar({ ler, props = {}, resposta = {} } = {}) {
  const ss = planilha(), chamadas = [], horarios = [], avisos = [];
  const ctx = {
    console,
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ss,
      getUi: () => ({
        ButtonSet: { OK_CANCEL: 'ok_cancel' }, Button: { OK: 'ok', CANCEL: 'cancel' },
        prompt: () => ({ getSelectedButton: () => resposta.botao || 'ok', getResponseText: () => resposta.texto || '' }),
        alert: m => avisos.push(m),
        createMenu: () => { const m = { addItem: () => m, addToUi: () => m }; return m; },
      }),
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; }, deleteProperty: k => { delete props[k]; } }) },
    ScriptApp: {
      getProjectTriggers: () => horarios.slice(),
      deleteTrigger: t => horarios.splice(horarios.indexOf(t), 1),
      newTrigger: f => ({ timeBased: () => ({ everyHours: h => ({ create: () => { const t = { getHandlerFunction: () => f, horas: h }; horarios.push(t); return t; } }) }) }),
    },
    UrlFetchApp: {
      fetch(url, o) {
        const corpo = JSON.parse(o.payload); chamadas.push({ url, corpo, apikey: o.headers.apikey });
        try { const r = ler(corpo.p_tabela, corpo.p_chave); return { getResponseCode: () => 200, getContentText: () => JSON.stringify(r) }; }
        catch (e) { return { getResponseCode: () => 400, getContentText: () => JSON.stringify({ message: e.message }) }; }
      },
    },
    Utilities: {
      formatDate(d, tz, f) {
        const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
          .formatToParts(d).map(x => [x.type, x.value]));
        return f.replace('yyyy', p.year).replace('MM', p.month).replace('dd', p.day).replace('HH', p.hour).replace('mm', p.minute);
      },
    },
  };
  vm.createContext(ctx);
  vm.runInContext(CODIGO, ctx);
  return { gs: ctx, ss, chamadas, horarios, avisos, props };
}

module.exports = { rodar };
