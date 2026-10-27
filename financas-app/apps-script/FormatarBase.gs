/**
 * Deixa a Planilha financeira 2.0 fácil de ler: cores, larguras, explicações nos cabeçalhos,
 * aba RESUMO (um mês por linha) e LEIA-ME simples. Não apaga nem muda nenhum dado.
 *
 * Rode a função deixarFacilDeEntender (pode rodar quantas vezes quiser).
 * Usa separador_() do arquivo MontarBase.gs (os dois ficam no mesmo projeto).
 */

const CORES = {
  azul: '#1f3a8a', roxo: '#5b21b6', verde: '#065f46', laranja: '#9a3412', dourado: '#a16207', cinza: '#334155',
  verdeClaro: '#dcfce7', azulClaro: '#dbeafe', rosaClaro: '#fce7f3', roxoClaro: '#ede9fe', cinzaClaro: '#f1f5f9', amareloClaro: '#fef9c3',
};

const NOTAS = {
  EXTRATO: {
    DATA: 'Dia em que o dinheiro entrou ou saiu (dd/mm/aaaa).',
    BANCO: 'De qual banco ou cartão. Escolha na lista.',
    'DESCRIÇÃO': 'O que foi. Ex.: gasolina, kellen 5 videos, Grazi - casamento.',
    GRUPO: 'Renda (entrou), Necessidades, Desejos, Guardado (foi pra caixinha) ou Transferência (entre suas contas, não conta como gasto).',
    TIPO: 'conta = Pix, débito ou dinheiro. cartão = cartão de crédito.',
    VALOR: 'Negativo quando saiu (-30), positivo quando entrou (500).',
    CATEGORIA: 'Grupo maior. Ex.: Transporte, Alimentação fora, Darzan Produções.',
    'SUB-CATEGORIA': 'Detalhe da categoria. Ex.: Gasolina, iFood, Casamento. A lista está na aba CATEGORIAS.',
    STATUS: 'Pago = já aconteceu. Previsto = ainda vai cair (parcelas futuras, contas do mês).',
    PARCELA: 'Só para compra parcelada no cartão. Ex.: 3/10.',
    OBS: 'Anotações. "Compra P0015" liga a parcela à compra da aba PARCELADOS.',
    ID: 'Código da linha, usado pelo app. Não precisa mexer.',
  },
  CONTAS: { 'SALDO CONFERIDO': 'Abra o app do banco e digite o saldo que aparece lá.', 'DATA DA CONFERÊNCIA': 'O dia em que você conferiu esse saldo.' },
  CARTOES: { 'FECHA DIA': 'Dia em que a fatura fecha.', 'VENCE DIA': 'Dia em que a fatura vence. Preencha para o app avisar você.', 'PAGA PELA CONTA': 'De qual conta sai o pagamento da fatura.' },
  PARCELADOS: { '1ª PARCELA': 'Mês da fatura em que caiu a primeira parcela.' },
  FIXAS: { ATIVA: 'Sim = o app lança essa conta todo mês sozinho.' },
  TRABALHOS: { 'JÁ RECEBIDO': 'Calculado sozinho: soma as rendas do EXTRATO que têm o nome do cliente na descrição.', 'FALTA RECEBER': 'Valor total menos o já recebido.', ETAPA: 'Orçamento, Fechado, Em andamento ou Entregue.' },
  METAS: { 'JÁ GUARDADO': 'Quanto já tem guardado para essa meta.' },
};

function deixarFacilDeEntender() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ext = ss.getSheetByName('EXTRATO');
  if (!ext) throw new Error('Rode primeiro a função montarBaseDeDados.');

  /* ---------- EXTRATO ---------- */
  larguras_(ext, [95, 115, 260, 120, 80, 115, 160, 150, 90, 75, 220, 70]);
  ext.hideColumns(12);
  zebra_(ext);
  const n = ext.getMaxRows() - 1;
  const col = c => ext.getRange(2, c, n, 1);
  const regras = [
    regraTexto_(col(4), 'Renda', CORES.verdeClaro), regraTexto_(col(4), 'Necessidades', CORES.azulClaro), regraTexto_(col(4), 'Desejos', CORES.rosaClaro),
    regraTexto_(col(4), 'Guardado', CORES.roxoClaro), regraTexto_(col(4), 'Transferência', CORES.cinzaClaro),
    regraTexto_(col(9), 'Previsto', CORES.amareloClaro),
    SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(0).setFontColor('#b91c1c').setRanges([col(6)]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(0).setFontColor('#15803d').setBold(true).setRanges([col(6)]).build(),
  ];
  ext.setConditionalFormatRules(regras);
  notas_(ext, NOTAS.EXTRATO);
  ext.setRowHeight(1, 30);

  /* ---------- demais abas ---------- */
  ['CATEGORIAS', 'CONTAS', 'CARTOES', 'PARCELADOS', 'FIXAS', 'EQUIPAMENTOS', 'TRABALHOS', 'TAREFAS', 'METAS'].forEach(nome => {
    const sh = ss.getSheetByName(nome);
    if (!sh) return;
    zebra_(sh);
    sh.setRowHeight(1, 30);
    if (NOTAS[nome]) notas_(sh, NOTAS[nome]);
    const ultima = sh.getLastColumn();
    sh.autoResizeColumns(1, ultima);
    for (let c = 1; c <= ultima; c++) sh.setColumnWidth(c, Math.max(110, Math.min(320, sh.getColumnWidth(c) + 16)));
  });
  ['PARCELADOS', 'EQUIPAMENTOS'].forEach(nome => { const sh = ss.getSheetByName(nome); if (sh) sh.hideColumns(sh.getLastColumn()); });

  /* ---------- RESUMO ---------- */
  resumo_(ss);

  /* ---------- LEIA-ME ---------- */
  leiaMeSimples_(ss);

  /* ---------- ordem e cor das abas ---------- */
  const ordem = [['LEIA-ME', CORES.cinza], ['RESUMO', CORES.dourado], ['EXTRATO', CORES.azul], ['CONTAS', CORES.verde], ['CARTOES', CORES.laranja], ['PARCELADOS', CORES.laranja],
    ['FIXAS', CORES.azul], ['TRABALHOS', CORES.dourado], ['EQUIPAMENTOS', CORES.azul], ['TAREFAS', CORES.cinza], ['METAS', CORES.verde], ['CATEGORIAS', CORES.roxo]];
  ordem.forEach(([nome, cor], i) => {
    const sh = ss.getSheetByName(nome);
    if (!sh) return;
    sh.setTabColor(cor);
    ss.setActiveSheet(sh);
    ss.moveActiveSheet(i + 1);
  });
  ss.setActiveSheet(ss.getSheetByName('RESUMO'));
  SpreadsheetApp.flush();
}

function resumo_(ss) {
  let sh = ss.getSheetByName('RESUMO');
  if (!sh) sh = ss.insertSheet('RESUMO');
  sh.clear();
  sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).clearDataValidations();
  const cab = ['MÊS', 'ENTROU', 'SAIU', 'GUARDOU', 'SOBROU', 'DARZAN', 'JPL SOM', 'SALÁRIO CLT', 'NO CARTÃO'];
  sh.getRange(1, 1, 1, cab.length).setValues([cab]).setFontWeight('bold').setFontColor('#ffffff').setBackground(CORES.dourado);
  const sep = separador_(sh.getRange(1, 20));
  const f = s => s.replace(/,/g, sep);
  const meses = [];
  for (let m = 2; m <= 13; m++) meses.push(new Date(ANO, m, 1)); /* março/26 a fevereiro/27 */
  meses.forEach((d, i) => {
    const r = i + 2, per = `EXTRATO!A:A,">="&$A${r},EXTRATO!A:A,"<"&EDATE($A${r},1)`;
    sh.getRange(r, 1).setValue(d);
    sh.getRange(r, 2).setFormula(f(`=SUMIFS(EXTRATO!F:F,EXTRATO!D:D,"Renda",${per})`));
    sh.getRange(r, 3).setFormula(f(`=-SUMIFS(EXTRATO!F:F,EXTRATO!D:D,"Necessidades",${per})-SUMIFS(EXTRATO!F:F,EXTRATO!D:D,"Desejos",${per})`));
    sh.getRange(r, 4).setFormula(f(`=-SUMIFS(EXTRATO!F:F,EXTRATO!D:D,"Guardado",${per})`));
    sh.getRange(r, 5).setFormula(f(`=B${r}-C${r}-D${r}`));
    sh.getRange(r, 6).setFormula(f(`=SUMIFS(EXTRATO!F:F,EXTRATO!G:G,"Darzan Produções",${per})`));
    sh.getRange(r, 7).setFormula(f(`=SUMIFS(EXTRATO!F:F,EXTRATO!G:G,"JPL SOM",${per})`));
    sh.getRange(r, 8).setFormula(f(`=SUMIFS(EXTRATO!F:F,EXTRATO!G:G,"Salário CLT",${per})`));
    sh.getRange(r, 9).setFormula(f(`=-SUMIFS(EXTRATO!F:F,EXTRATO!E:E,"cartão",${per})`));
  });
  const fim = meses.length + 1, tot = fim + 1;
  sh.getRange(tot, 1).setValue('TOTAL');
  for (let c = 2; c <= 9; c++) sh.getRange(tot, c).setFormula(f(`=SUM(${String.fromCharCode(64 + c)}2:${String.fromCharCode(64 + c)}${fim})`));
  sh.getRange(tot, 1, 1, 9).setFontWeight('bold').setBackground(CORES.amareloClaro);
  sh.getRange(2, 1, meses.length, 1).setNumberFormat('mmm/yy').setFontWeight('bold');
  sh.getRange(2, 2, tot - 1, 8).setNumberFormat('"R$" #,##0.00;[Red]-"R$" #,##0.00');
  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(0).setFontColor('#b91c1c').setBold(true).setRanges([sh.getRange(2, 5, tot - 1, 1)]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(0).setFontColor('#15803d').setBold(true).setRanges([sh.getRange(2, 5, tot - 1, 1)]).build(),
  ]);
  notas_(sh, {
    'MÊS': 'Cada linha é um mês. Os valores são calculados sozinhos a partir do EXTRATO.',
    SAIU: 'Necessidades + Desejos. Inclui as parcelas do cartão daquele mês.',
    GUARDOU: 'O que foi para caixinha ou reserva.',
    SOBROU: 'Entrou − saiu − guardou. Verde = sobrou, vermelho = faltou.',
    'NO CARTÃO': 'Quanto do que saiu foi no cartão de crédito.',
  });
  sh.setFrozenRows(1);
  sh.setRowHeight(1, 30);
  larguras_(sh, [90, 120, 120, 120, 120, 120, 120, 120, 120]);
  zebra_(sh);
  sh.getRange(tot + 2, 1).setValue('Meses futuros mostram o que já está previsto (parcelas e contas fixas). Os números atualizam sozinhos quando o EXTRATO muda.').setFontColor('#64748b');
}

function leiaMeSimples_(ss) {
  let sh = ss.getSheetByName('LEIA-ME');
  if (!sh) sh = ss.insertSheet('LEIA-ME', 0);
  sh.clear();
  const linhas = [
    ['Planilha financeira 2.0'],
    ['Aqui fica guardado tudo do app Darzan Finanças. O app lê e grava nesta planilha.'],
    [''],
    ['COMO LER'],
    ['• RESUMO: um mês por linha. Quanto entrou, saiu, guardou e sobrou. Atualiza sozinho.'],
    ['• EXTRATO: cada entrada e saída, uma por linha. Verde = entrou. Vermelho = saiu. Amarelo = ainda vai cair.'],
    ['• CONTAS: seus bancos e caixinhas. CARTOES: limite, fechamento e vencimento.'],
    ['• PARCELADOS: compras no cartão em várias vezes. FIXAS: contas de todo mês.'],
    ['• TRABALHOS, EQUIPAMENTOS, TAREFAS e METAS: os cadastros do app.'],
    ['• CATEGORIAS: a lista de categorias e sub-categorias.'],
    [''],
    ['COMO ANOTAR À MÃO (se não for pelo app)'],
    ['1. Vá na primeira linha vazia do EXTRATO.'],
    ['2. Preencha DATA, BANCO, DESCRIÇÃO, GRUPO, TIPO e VALOR (negativo se saiu).'],
    ['3. Escolha CATEGORIA e SUB-CATEGORIA na lista. STATUS = Pago.'],
    ['Passe o mouse em cima de qualquer cabeçalho para ver uma explicação.'],
    [''],
    ['REGRAS'],
    ['• Não mude os nomes dos cabeçalhos (linha 1): o app encontra os dados por eles.'],
    ['• Não apague a coluna ID (está escondida no EXTRATO).'],
    ['• A planilha antiga ficou intacta como backup. Há também uma cópia de segurança desta planilha no Drive.'],
  ];
  sh.getRange(1, 1, linhas.length, 1).setValues(linhas).setWrap(true).setFontSize(11);
  sh.getRange(1, 1).setFontSize(18).setFontWeight('bold').setFontColor(CORES.azul);
  sh.getRange(2, 1).setFontColor('#475569');
  [4, 12, 18].forEach(r => sh.getRange(r, 1).setFontWeight('bold').setFontColor(CORES.dourado).setFontSize(12));
  sh.setColumnWidth(1, 820);
  sh.setHiddenGridlines(true);
}

/* ---------- ajudantes ---------- */
function larguras_(sh, ls) { ls.forEach((w, i) => sh.setColumnWidth(i + 1, w)); }
function zebra_(sh) {
  sh.getBandings().forEach(b => b.remove());
  /* da linha 2 até o fim da aba, para as linhas novas também ficarem zebradas; o cabeçalho mantém a cor própria */
  sh.getRange(2, 1, sh.getMaxRows() - 1, Math.max(sh.getLastColumn(), 1)).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false);
}
function regraTexto_(range, texto, cor) { return SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(texto).setBackground(cor).setRanges([range]).build(); }
function notas_(sh, mapa) {
  const cab = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  cab.forEach((nome, i) => { if (mapa[nome]) sh.getRange(1, i + 1).setNote(mapa[nome]); });
}
