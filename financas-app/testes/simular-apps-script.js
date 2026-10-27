/* Roda um script do Apps Script aqui no computador, com um Google Planilhas "de mentira".
   Serve para testar o MontarBase.gs antes de rodar na planilha de verdade.

   Uso: node testes/simular-apps-script.js apps-script/MontarBase.gs entrada.json saida.json
   entrada.json: { antiga: {aba: [[...]]}, nova: {aba: [[...]]} }  (datas como {"$d":"AAAA-MM-DD"})
   saida.json:   as abas da planilha nova depois do script, mais validações e fórmulas.        */
const fs = require('fs');
const vm = require('vm');
const [arqScript, arqEntrada, arqSaida] = process.argv.slice(2);
const entrada = JSON.parse(fs.readFileSync(arqEntrada, 'utf8'));

const revive = v => (v && typeof v === 'object' && v.$d) ? (([y, m, d]) => new Date(y, m - 1, d))(v.$d.split('-').map(Number)) : v;
const encadeia = alvo => new Proxy(alvo, { get: (o, k) => k in o ? o[k] : () => encadeia(o) });

class Aba {
  constructor(nome, grade) { this.nome = nome; this.g = (grade || []).map(r => r.map(revive)); this.formulas = {}; this.validacoes = []; this.congelada = 0; }
  getName() { return this.nome; }
  getLastRow() { for (let r = this.g.length; r > 0; r--) if (this.g[r - 1].some(v => v !== '' && v != null)) return r; return 0; }
  getLastColumn() { return Math.max(0, ...this.g.map(r => { for (let c = r.length; c > 0; c--) if (r[c - 1] !== '' && r[c - 1] != null) return c; return 0; })); }
  getMaxRows() { return Math.max(1000, this.g.length); }
  clear() { this.g = []; this.formulas = {}; this.validacoes = []; return this; }
  setFrozenRows(n) { this.congelada = n; }
  getFilter() { return null; }
  autoResizeColumns() { } setColumnWidth() { } setTabColor() { }
  getRange(r, c, nr = 1, nc = 1) { return encadeia(new Intervalo(this, r, c, nr, nc)); }
}
class Intervalo {
  constructor(aba, r, c, nr, nc) { Object.assign(this, { aba, r, c, nr, nc }); }
  getValues() { const out = []; for (let i = 0; i < this.nr; i++) { const row = this.aba.g[this.r - 1 + i] || []; const l = []; for (let j = 0; j < this.nc; j++) l.push(row[this.c - 1 + j] === undefined ? '' : row[this.c - 1 + j]); out.push(l); } return out; }
  getValue() { return this.getValues()[0][0]; }
  setValues(v) {
    if (v.length !== this.nr || v.some(l => l.length !== this.nc)) throw new Error(`setValues: tamanho errado em ${this.aba.nome} (${v.length}x${v[0] && v[0].length} em ${this.nr}x${this.nc})`);
    v.forEach((l, i) => { const ri = this.r - 1 + i; while (this.aba.g.length <= ri) this.aba.g.push([]); l.forEach((x, j) => { const row = this.aba.g[ri]; while (row.length < this.c - 1 + j) row.push(''); row[this.c - 1 + j] = x; }); });
    return encadeia(this);
  }
  setValue(x) { return this.setValues([[x]]); }
  setFormula(f) { this.aba.formulas[`${this.r},${this.c}`] = f; return encadeia(this); }
  setDataValidation(v) { this.aba.validacoes.push({ r: this.r, c: this.c, nr: this.nr, regra: v }); return encadeia(this); }
  insertCheckboxes() { this.aba.validacoes.push({ r: this.r, c: this.c, nr: this.nr, regra: 'checkbox' }); return encadeia(this); }
  createFilter() { return encadeia(this); }
}
class Planilha {
  constructor(nome, abas) { this.nome = nome; this.abas = Object.entries(abas || {}).map(([n, g]) => new Aba(n, g)); }
  getName() { return this.nome; } getId() { return this.nome; }
  getSheetByName(n) { return this.abas.find(a => a.nome === n) || null; }
  insertSheet(n, i) { const a = new Aba(n, []); if (i === 0) this.abas.unshift(a); else this.abas.push(a); return a; }
  setActiveSheet() { }
}
const nova = new Planilha('Planilha financeira 2.0', entrada.nova), antiga = new Planilha('antiga', entrada.antiga);
const regra = () => { const r = {}; const b = { requireValueInList: (l) => (r.lista = l, b), requireValueInRange: (g) => (r.intervalo = `${g.aba.nome}!${g.c}`, b), setAllowInvalid: () => b, build: () => r }; return b; };
const ctx = {
  SpreadsheetApp: { getActiveSpreadsheet: () => nova, openById: () => antiga, newDataValidation: regra, flush() { } },
  DriveApp: { getFileById: () => ({ makeCopy: (n) => { ctx.copias.push(n); } }) },
  Utilities: { formatDate: (d) => d.toISOString().slice(0, 16).replace('T', ' ') },
  console, copias: [], Date, /* mesma classe Date dos dois lados */
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(arqScript, 'utf8'), ctx, { filename: arqScript });
const resumo = vm.runInContext('montarBaseDeDados()', ctx);
const iso = v => v instanceof Date ? `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}` : v;
fs.writeFileSync(arqSaida, JSON.stringify({ resumo, copias: ctx.copias, abas: nova.abas.map(a => ({ nome: a.nome, linhas: a.g.map(r => r.map(iso)), formulas: a.formulas, validacoes: a.validacoes, congelada: a.congelada })) }, null, 1));
console.log('ok', JSON.stringify(resumo), 'abas:', nova.abas.map(a => `${a.nome}(${a.getLastRow()})`).join(' '));
