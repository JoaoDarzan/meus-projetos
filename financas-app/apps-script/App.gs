/**
 * Darzan Finanças: o "servidor" do app. Roda dentro da Planilha financeira 2.0.
 * O app (Index.html) chama estas funções para ler e gravar nas abas.
 *
 * Publicar: Implantar → Nova implantação → App da Web → Executar como: Eu · Quem pode acessar: Somente eu.
 */

const ABAS_APP = ['EXTRATO', 'CONTAS', 'CARTOES', 'PARCELADOS', 'FIXAS', 'EQUIPAMENTOS', 'TRABALHOS', 'TAREFAS', 'METAS', 'CATEGORIAS'];
const PREFIXO_ID = { EXTRATO: 'L', CONTAS: 'C', CARTOES: 'K', PARCELADOS: 'P', FIXAS: 'F', EQUIPAMENTOS: 'E', TRABALHOS: 'J', TAREFAS: 'T', METAS: 'M' };
const COLUNAS_EXTRAS = { EQUIPAMENTOS: ['FOTO'], TRABALHOS: ['TELEFONE'] };
const FUSO = 'America/Sao_Paulo';

function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('Darzan Finanças')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}
function include(nome) {
  try { return HtmlService.createHtmlOutputFromFile(nome).getContent(); } catch (e) { return ''; }
}
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Darzan Finanças')
    .addItem('Ordenar o EXTRATO por data', 'ordenarExtrato')
    .addItem('Mostrar o link do app', 'mostrarLink')
    .addToUi();
}
function mostrarLink() {
  const url = ScriptApp.getService().getUrl();
  SpreadsheetApp.getUi().alert(url ? 'Link do app (abra no celular e salve na tela de início):\n\n' + url : 'O app ainda não foi publicado. No Apps Script: Implantar → Nova implantação → App da Web.');
}
function ordenarExtrato() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('EXTRATO');
  if (sh.getLastRow() > 2) sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).sort({ column: 1, ascending: true });
}

/* ---------- chamadas do app ---------- */
function carregar() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  prepararBase_(ss);
  garantirFixas_(ss);
  const abas = {};
  ABAS_APP.forEach(nome => { abas[nome] = lerAba_(ss.getSheetByName(nome)); });
  return { abas, hoje: Utilities.formatDate(new Date(), FUSO, 'yyyy-MM-dd'), planilha: ss.getUrl() };
}

/* várias alterações de uma vez: [{op:'salvar'|'apagar', aba, registro|id}] → [{id}] */
function lote(ops) {
  const trava = LockService.getScriptLock();
  trava.waitLock(20000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet(), out = [];
    ops.forEach(o => {
      if (ABAS_APP.indexOf(o.aba) < 0) throw new Error('Aba desconhecida: ' + o.aba);
      const sh = ss.getSheetByName(o.aba);
      if (o.op === 'salvar') out.push({ id: salvar_(sh, o.aba, o.registro) });
      else if (o.op === 'apagar') out.push({ id: apagar_(sh, o.id) });
      else throw new Error('Operação desconhecida: ' + o.op);
    });
    SpreadsheetApp.flush();
    return out;
  } finally {
    trava.releaseLock();
  }
}

/* ---------- leitura e escrita ---------- */
function lerAba_(sh) {
  if (!sh || sh.getLastRow() < 1) return { cab: [], linhas: [] };
  const vals = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
  const cab = vals[0].map(c => String(c).trim());
  const linhas = vals.slice(1).filter(r => r.some(v => v !== '' && v !== null && v !== false)).map(r => {
    const o = {};
    cab.forEach((c, i) => { if (c) o[c] = r[i] instanceof Date ? Utilities.formatDate(r[i], FUSO, c === 'PARCELA' ? 'd/M' : 'yyyy-MM-dd') : r[i]; });
    return o;
  });
  return { cab, linhas };
}
function salvar_(sh, aba, reg) {
  const cab = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(c => String(c).trim());
  const iId = cab.indexOf('ID');
  if (iId < 0) throw new Error('A aba ' + aba + ' não tem a coluna ID.');
  /* o app já manda o ID dos registros novos; se o ID não existe ainda, é uma linha nova */
  let linha = reg.ID ? acharLinha_(sh, iId, reg.ID) : -1;
  const atual = linha > 0 ? sh.getRange(linha, 1, 1, cab.length).getValues()[0] : cab.map(() => '');
  const id = reg.ID || novoId_(aba);
  const nova = cab.map((c, i) => {
    if (c === 'ID') return id;
    if (!(c in reg)) return atual[i];
    return paraPlanilha_(c, reg[c]);
  });
  /* linhas "vazias" podem já ter fórmulas (ex.: JÁ RECEBIDO na aba TRABALHOS): grava logo depois da última linha com dado */
  if (linha < 0) linha = ultimaComDado_(sh) + 1;
  /* fórmulas da linha (ou da linha de cima, numa linha nova) continuam lá se o app não mandou aquela coluna */
  const fonte = linha > 2 && linha > sh.getLastRow() ? linha - 1 : linha;
  const formulas = linha >= 2 && fonte <= sh.getLastRow() ? sh.getRange(fonte, 1, 1, cab.length).getFormulasR1C1()[0] : [];
  if (cab.indexOf('PARCELA') >= 0) sh.getRange(linha, cab.indexOf('PARCELA') + 1).setNumberFormat('@'); /* senão "1/3" vira data */
  sh.getRange(linha, 1, 1, cab.length).setValues([nova]);
  formulas.forEach((f, i) => { if (f && !(cab[i] in reg)) sh.getRange(linha, i + 1).setFormulaR1C1(f); });
  return id;
}
function ultimaComDado_(sh) {
  const n = sh.getLastRow();
  if (n < 2) return 1;
  const vals = sh.getRange(2, 1, n - 1, sh.getLastColumn()).getValues();
  for (let i = vals.length - 1; i >= 0; i--) if (vals[i].some(v => v !== '' && v !== null && v !== false)) return i + 2;
  return 1;
}
function apagar_(sh, id) {
  const cab = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(c => String(c).trim());
  const linha = acharLinha_(sh, cab.indexOf('ID'), id);
  if (linha > 0) sh.deleteRow(linha);
  return id;
}
function acharLinha_(sh, iId, id) {
  if (iId < 0 || sh.getLastRow() < 2) return -1;
  const ids = sh.getRange(2, iId + 1, sh.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}
const COL_DATA = /^DATA|^PRAZO$|^ENTREGA$/;
function paraPlanilha_(col, v) {
  if (v === null || v === undefined) return '';
  if (COL_DATA.test(col) && typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) { const [y, m, d] = v.split('-').map(Number); return new Date(y, m - 1, d); }
  return v;
}
function novoId_(aba) { return (PREFIXO_ID[aba] || 'X') + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1296).toString(36).toUpperCase(); }

/* ---------- arrumação automática ---------- */
/* garante a coluna ID (e colunas novas do app) em todas as abas e dá ID às linhas que você digitou à mão */
function prepararBase_(ss) {
  ABAS_APP.forEach(nome => {
    const sh = ss.getSheetByName(nome);
    if (!sh || !PREFIXO_ID[nome]) return;
    let cab = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].map(c => String(c).trim());
    const faltam = (COLUNAS_EXTRAS[nome] || []).concat(['ID']).filter(c => cab.indexOf(c) < 0);
    faltam.forEach(c => {
      const col = sh.getLastColumn() + 1;
      if (sh.getMaxColumns() < col) sh.insertColumnsAfter(sh.getMaxColumns(), 1);
      sh.getRange(1, col).setValue(c).setFontWeight('bold').setFontColor('#ffffff').setBackground('#334155');
      cab.push(c);
    });
    const iId = cab.indexOf('ID'), n = sh.getLastRow() - 1;
    if (n < 1) return;
    const vals = sh.getRange(2, 1, n, cab.length).getValues();
    /* "2/9" digitado vira data (2 de setembro) no Planilhas: a coluna PARCELA fica como texto */
    const iP = cab.indexOf('PARCELA');
    if (iP >= 0 && vals.some(r => r[iP] instanceof Date)) {
      const col = sh.getRange(2, iP + 1, n, 1);
      col.setNumberFormat('@');
      col.setValues(vals.map(r => [r[iP] instanceof Date ? Utilities.formatDate(r[iP], FUSO, 'd/M') : r[iP]]));
    }
    vals.forEach((r, i) => {
      const temDado = r.some((v, j) => j !== iId && v !== '' && v !== false);
      if (temDado && !r[iId]) sh.getRange(i + 2, iId + 1).setValue(novoId_(nome) + i);
    });
  });
  /* sub-categoria usada pelo app para pagamento de fatura */
  const cats = ss.getSheetByName('CATEGORIAS');
  if (cats && !cats.getRange(1, 1, Math.max(cats.getLastRow(), 1), 2).getValues().some(r => r[1] === 'Pagamento de fatura')) {
    cats.getRange(ultimaComDado_(cats) + 1, 1, 1, 3).setValues([['Transferência', 'Pagamento de fatura', 'Transferência']]);
  }
}
/* contas fixas ativas viram linhas "Previsto" no mês atual e no próximo (se ainda não existirem) */
function garantirFixas_(ss) {
  const fixas = lerAba_(ss.getSheetByName('FIXAS')).linhas.filter(f => String(f['ATIVA']).toLowerCase() !== 'não' && f['DESCRIÇÃO'] && f['VALOR']);
  if (!fixas.length) return;
  const ext = ss.getSheetByName('EXTRATO');
  const linhas = lerAba_(ext).linhas;
  const hoje = new Date();
  [0, 1].forEach(k => {
    const ref = new Date(hoje.getFullYear(), hoje.getMonth() + k, 1);
    const mes = Utilities.formatDate(ref, FUSO, 'yyyy-MM');
    fixas.forEach(f => {
      const nome = String(f['DESCRIÇÃO']).trim().toLowerCase();
      const existe = linhas.some(l => String(l['DATA']).slice(0, 7) === mes && String(l['DESCRIÇÃO']).trim().toLowerCase() === nome);
      if (existe) return;
      const dia = Math.min(parseInt(f['DIA'], 10) || 1, new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate());
      const tipo = /cart/i.test(f['TIPO']) ? 'cartão' : 'conta';
      salvar_(ext, 'EXTRATO', {
        'DATA': Utilities.formatDate(new Date(ref.getFullYear(), ref.getMonth(), dia), FUSO, 'yyyy-MM-dd'), 'BANCO': f['BANCO'], 'DESCRIÇÃO': f['DESCRIÇÃO'],
        'GRUPO': f['GRUPO'] || 'Necessidades', 'TIPO': tipo, 'VALOR': -Math.abs(Number(f['VALOR'])), 'CATEGORIA': f['CATEGORIA'], 'SUB-CATEGORIA': f['SUB-CATEGORIA'],
        'STATUS': tipo === 'cartão' ? 'Pago' : 'Previsto', 'PARCELA': '', 'OBS': /d[eé]bito/i.test(f['TIPO']) ? 'Fixa · débito automático' : 'Fixa',
      });
    });
  });
}
