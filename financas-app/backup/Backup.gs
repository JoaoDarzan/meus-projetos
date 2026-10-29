/* Darzan Finanças · Planilha de backup (Google Planilhas → Extensões → Apps Script → cole tudo isto).
   Copia todos os dados do app (Supabase) para esta planilha a cada hora. Só LÊ: nunca muda nada no app.
   Ligar: recarregue a planilha → menu "Darzan" → "Ligar o backup" → cole a chave do Acesso do Claude (dfc_...).
   A chave fica guardada só neste script (Propriedades do script), nunca na planilha.
   Testado em financas-app/testes/caminhos/14-planilha-backup.js. As abas e colunas saem de tabelas.js
   (node financas-app/ferramentas/gerar_backup.js atualiza o bloco ABAS). */

var SUPABASE = 'https://sczpyzcozcaibyzekmau.supabase.co';
var PUBLICA = 'sb_publishable_PLND7koek37GWekjKK50bQ_SodtXm14';
var REAIS = '"R$" #,##0.00;[Red]-"R$" #,##0.00';

// ABAS-INICIO (gerado por gerar_backup.js, não edite à mão)
var ABAS = [
  { aba: 'EXTRATO', nome: 'Extrato', tabela: 'extrato', colunas: [['DATA','data','date'],['BANCO','banco','text'],['DESCRIÇÃO','descricao','text'],['GRUPO','grupo','text'],['TIPO','tipo','text'],['VALOR','valor','numeric'],['CATEGORIA','categoria','text'],['SUB-CATEGORIA','subcategoria','text'],['STATUS','status','text'],['PARCELA','parcela','text'],['OBS','obs','text']] },
  { aba: 'CONTAS', nome: 'Contas', tabela: 'contas', colunas: [['BANCO','banco','text'],['CONTA','conta','text'],['SALDO CONFERIDO','saldo_conferido','numeric'],['DATA DA CONFERÊNCIA','data_da_conferencia','date'],['PARA QUÊ','para_que','text'],['OBS','obs','text']] },
  { aba: 'CARTOES', nome: 'Cartões', tabela: 'cartoes', colunas: [['CARTÃO','cartao','text'],['LIMITE','limite','numeric'],['FECHA DIA','fecha_dia','numeric'],['VENCE DIA','vence_dia','numeric'],['PAGA PELA CONTA','paga_pela_conta','text'],['OBS','obs','text']] },
  { aba: 'PARCELADOS', nome: 'Parcelados', tabela: 'parcelados', colunas: [['DATA DA COMPRA','data_da_compra','date'],['DESCRIÇÃO','descricao','text'],['CARTÃO','cartao','text'],['VALOR TOTAL','valor_total','numeric'],['PARCELAS','parcelas','numeric'],['VALOR DA PARCELA','valor_da_parcela','numeric'],['1ª PARCELA','primeira_parcela','text'],['CATEGORIA','categoria','text'],['SUB-CATEGORIA','subcategoria','text']] },
  { aba: 'FIXAS', nome: 'Fixas', tabela: 'fixas', colunas: [['DESCRIÇÃO','descricao','text'],['VALOR','valor','numeric'],['DIA','dia','numeric'],['BANCO','banco','text'],['TIPO','tipo','text'],['GRUPO','grupo','text'],['CATEGORIA','categoria','text'],['SUB-CATEGORIA','subcategoria','text'],['ATIVA','ativa','text'],['OBS','obs','text']] },
  { aba: 'EQUIPAMENTOS', nome: 'Equipamentos', tabela: 'equipamentos', colunas: [['NOME','nome','text'],['TIPO','tipo','text'],['VALOR','valor','numeric'],['DATA DA COMPRA','data_da_compra','date'],['COMO PAGOU','como_pagou','text'],['ESTADO','estado','text'],['Nº DE SÉRIE','numero_de_serie','text'],['OBS','obs','text'],['FOTO','foto','text']] },
  { aba: 'TRABALHOS', nome: 'Trabalhos', tabela: 'trabalhos', colunas: [['CLIENTE','cliente','text'],['TIPO DE EVENTO','tipo_de_evento','text'],['DATA DO EVENTO','data_do_evento','date'],['LOCAL','local','text'],['O QUE FOI FECHADO','o_que_foi_fechado','text'],['VALOR TOTAL','valor_total','numeric'],['ENTREGA','entrega','date'],['ETAPA','etapa','text'],['TELEFONE','telefone','text'],['CONTRATO','contrato','text'],['OBS','obs','text'],['BRIEFING','briefing','text'],['ENTREGAS','entregas','text'],['PARCELA MENSAL','parcela_mensal','numeric'],['DIA DA PARCELA','dia_da_parcela','numeric']] },
  { aba: 'ANEXOS', nome: 'Anexos', tabela: 'anexos', opcional: true, colunas: [['TRABALHO','trabalho','text'],['LANÇAMENTO','lancamento','text'],['NOME','nome','text'],['TIPO','tipo','text'],['DATA','data','date'],['VALOR','valor','numeric'],['ARQUIVO','arquivo','text'],['TAMANHO','tamanho','numeric']] },
  { aba: 'TAREFAS', nome: 'Tarefas', tabela: 'tarefas', colunas: [['TAREFA','tarefa','text'],['DATA','data','date'],['VALOR','valor','numeric'],['TIPO','tipo','text'],['FEITA','feita','boolean'],['OBS','obs','text']] },
  { aba: 'METAS', nome: 'Metas', tabela: 'metas', colunas: [['META','meta','text'],['VALOR ALVO','valor_alvo','numeric'],['JÁ GUARDADO','ja_guardado','numeric'],['ONDE ESTÁ','onde_esta','text'],['PRAZO','prazo','date'],['OBS','obs','text']] },
  { aba: 'CATEGORIAS', nome: 'Categorias', tabela: 'categorias', colunas: [['CATEGORIA','categoria','text'],['SUB-CATEGORIA','subcategoria','text'],['GRUPO','grupo','text']] },
];
// ABAS-FIM

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Darzan')
    .addItem('Atualizar agora', 'atualizar')
    .addItem('Ligar o backup (colar a chave)', 'ligar')
    .addItem('Desligar o backup', 'desligar')
    .addToUi();
}

function ligar() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt('Ligar o backup', 'Cole a chave do Acesso do Claude (começa com dfc_).\nNo app: sua foto → Acesso do Claude → Copiar.', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var chave = r.getResponseText().trim();
  if (chave.indexOf('dfc_') !== 0) { ui.alert('Essa chave não parece certa: ela começa com dfc_'); return; }
  PropertiesService.getScriptProperties().setProperty('CHAVE', chave);
  tirarHorarios();
  ScriptApp.newTrigger('atualizar').timeBased().everyHours(1).create();
  atualizar();
  ui.alert('Pronto! A planilha agora se atualiza sozinha a cada hora.');
}

function desligar() {
  tirarHorarios();
  PropertiesService.getScriptProperties().deleteProperty('CHAVE');
  SpreadsheetApp.getUi().alert('Backup desligado. Os dados que já estão aqui continuam.');
}

function tirarHorarios() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'atualizar') ScriptApp.deleteTrigger(t); });
}

/* lê uma tabela inteira do app */
function ler(tabela, chave) {
  var resp = UrlFetchApp.fetch(SUPABASE + '/rest/v1/rpc/claude_ler', {
    method: 'post', contentType: 'application/json', headers: { apikey: PUBLICA },
    payload: JSON.stringify({ p_chave: chave, p_tabela: tabela }), muteHttpExceptions: true,
  });
  if (resp.getResponseCode() !== 200) throw new Error('O Supabase recusou (' + resp.getResponseCode() + '): ' + resp.getContentText());
  return JSON.parse(resp.getContentText());
}

function atualizar() {
  var chave = PropertiesService.getScriptProperties().getProperty('CHAVE');
  if (!chave) throw new Error('Backup desligado: use o menu Darzan → Ligar o backup');
  // lê tudo antes de mexer na planilha: se der erro no meio, o último backup bom fica como está
  var dados = {};
  ABAS.forEach(function (a) {
    /* tabela nova (anexos) que o Supabase ainda não tem: o backup segue sem ela */
    try { dados[a.aba] = ler(a.tabela, chave); } catch (e) { if (!a.opcional || /chave/i.test(e.message)) throw e; dados[a.aba] = []; }
  });
  escreverTudo(SpreadsheetApp.getActiveSpreadsheet(), dados, new Date());
}

/* ---------- montar as abas ---------- */
function escreverTudo(ss, dados, quando) {
  var hoje = Utilities.formatDate(quando, 'America/Sao_Paulo', 'yyyy-MM-dd');
  var res = resumo(dados.EXTRATO || []);
  escrever(ss, 'Resumo', ['MÊS', 'ENTROU', 'SAIU', 'GUARDOU', 'SOBROU'], res, [null, REAIS, REAIS, REAIS, REAIS]);
  var bs = bancos(dados.CONTAS || [], dados.EXTRATO || [], hoje);
  escrever(ss, 'Bancos', ['BANCO', 'CONTA', 'SALDO HOJE', 'SALDO CONFERIDO', 'CONFERIDO EM', 'PARA QUÊ', 'OBS'], bs,
    [null, null, REAIS, REAIS, 'dd/mm/yyyy', null, null]);
  ABAS.forEach(function (a) {
    var linhas = (dados[a.aba] || []).slice();
    var chaveOrdem = a.colunas.filter(function (c) { return c[2] === 'date'; })[0];
    linhas.sort(function (x, y) {
      var dx = chaveOrdem ? x[chaveOrdem[1]] || '' : '', dy = chaveOrdem ? y[chaveOrdem[1]] || '' : '';
      return dx < dy ? 1 : dx > dy ? -1 : String(x.id) < String(y.id) ? -1 : 1;
    });
    var corpo = linhas.map(function (l) {
      return a.colunas.map(function (c) { return valor(l[c[1]], c[2]); }).concat([l.id]);
    });
    escrever(ss, a.nome, a.colunas.map(function (c) { return c[0]; }).concat(['ID']), corpo,
      a.colunas.map(function (c) { return formato(c); }).concat([null]));
  });
  var sobre = [['Última atualização', Utilities.formatDate(quando, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm')]];
  ABAS.forEach(function (a) { sobre.push(['Linhas em ' + a.nome, (dados[a.aba] || []).length]); });
  sobre.push(['De onde vem', 'Cópia do app Darzan Finanças (Supabase). Atualiza sozinha a cada hora. Mudar aqui não muda o app.']);
  escrever(ss, 'Sobre', ['O QUÊ', 'VALOR'], sobre, [null, null]);
  // a aba vazia que vem com a planilha nova sai
  ['Página1', 'Planilha1', 'Sheet1'].forEach(function (n) { var sh = ss.getSheetByName(n); if (sh && sh.getLastRow() === 0) ss.deleteSheet(sh); });
}

function valor(v, tipo) {
  if (v === null || v === undefined) return '';
  if (tipo === 'date') { var p = String(v).slice(0, 10).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  if (tipo === 'numeric') return Number(v);
  if (tipo === 'boolean') return v ? 'sim' : 'não';
  var t = String(v);
  /* texto que começa com = + - @ viraria fórmula na planilha (dá para vazar dados com =IMAGE("site?"&B2)): vai como texto */
  return /^[=+\-@]/.test(t) ? "'" + t : t;
}

function formato(c) {
  if (c[2] === 'date') return 'dd/mm/yyyy';
  if (c[2] === 'numeric') return /DIA|PARCELAS/.test(c[0]) ? '0' : REAIS;
  return null;
}

function escrever(ss, nome, cab, linhas, formatos) {
  var sh = ss.getSheetByName(nome) || ss.insertSheet(nome);
  sh.clear();
  sh.getRange(1, 1, 1, cab.length).setValues([cab]).setFontWeight('bold').setBackground('#1d2b57').setFontColor('#ffffff');
  if (linhas.length) sh.getRange(2, 1, linhas.length, cab.length).setValues(linhas);
  formatos.forEach(function (f, i) { if (f && linhas.length) sh.getRange(2, i + 1, linhas.length, 1).setNumberFormat(f); });
  sh.setFrozenRows(1);
}

/* mesmas contas do app (base.js: c.resumo e c.saldo) */
function resumo(extrato) {
  var meses = {};
  extrato.forEach(function (l) {
    if (!l.data || l.status === 'Cancelado') return;
    var m = String(l.data).slice(0, 7), v = Number(l.valor) || 0;
    var x = meses[m] || (meses[m] = { e: 0, s: 0, g: 0 });
    if (l.grupo === 'Renda') { if (l.status !== 'Previsto') x.e += v; } /* previsto ainda não entrou */
    else if (l.grupo === 'Necessidades' || l.grupo === 'Desejos') x.s -= v;
    else if (l.grupo === 'Guardado') x.g -= v;
  });
  return Object.keys(meses).sort().map(function (m) {
    var x = meses[m], r2 = function (n) { return Math.round(n * 100) / 100; };
    return [m.slice(5) + '/' + m.slice(0, 4), r2(x.e), r2(x.s), r2(x.g), r2(x.e - x.s - x.g)];
  });
}

function sem(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }

function bancos(contas, extrato, hoje) {
  var linhas = contas.filter(function (c) { return c.banco; }).map(function (c) {
    var conferido = c.saldo_conferido === null || c.saldo_conferido === undefined ? null : Number(c.saldo_conferido);
    var ehConta = sem(c.conta) === 'conta', nomeCx = sem(c.conta), saldo = conferido;
    if (conferido !== null && c.data_da_conferencia) {
      extrato.forEach(function (l) {
        if (l.status === 'Cancelado') return;
        var paga = (l.status || 'Pago') === 'Pago' || (/d[eé]bito autom/i.test(l.obs || '') && l.data <= hoje); /* sem status = pago, como no app */
        if (!l.data || l.data <= c.data_da_conferencia || !paga) return;
        if (ehConta && !/cart/i.test(l.tipo || '') && l.banco === c.banco) saldo += Number(l.valor) || 0;
        if (!ehConta && l.grupo === 'Guardado' && sem(l.obs).split(' · ').some(function (p) { return p.trim() === 'para ' + nomeCx; })) saldo -= Number(l.valor) || 0;
      });
      saldo = Math.round(saldo * 100) / 100;
    }
    return [c.banco, c.conta, saldo === null ? '' : saldo, conferido === null ? '' : conferido, valor(c.data_da_conferencia, 'date'), c.para_que || '', c.obs || ''];
  });
  linhas.sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : (sem(a[1]) === 'conta' ? -1 : sem(b[1]) === 'conta' ? 1 : a[1] < b[1] ? -1 : 1); });
  var total = linhas.reduce(function (s, l) { return s + (Number(l[2]) || 0); }, 0);
  linhas.push(['TOTAL', '', Math.round(total * 100) / 100, '', '', '', '']);
  return linhas;
}
