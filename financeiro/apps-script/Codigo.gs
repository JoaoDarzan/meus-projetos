/**
 * Painel Darzan Produções
 * ------------------------------------------------------------
 * Este código fica DENTRO da planilha (Extensões → Apps Script).
 * Ele lê as abas da planilha e entrega os dados para o painel
 * (arquivo Painel.html). Toda vez que o painel abre ou atualiza,
 * ele lê a planilha de novo: mexeu na planilha, o painel acompanha.
 */

const ABAS_DO_PAINEL = ['Trabalhos', 'Orçamentos', 'Clientes', 'Despesas', 'Equipamentos'];

/** Cria o menu "Darzan" quando a planilha abre. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Darzan')
    .addItem('Abrir painel', 'abrirPainel')
    .addItem('Link do painel para o celular', 'mostrarLink')
    .addToUi();
}

/** Abre o painel numa janela grande, aqui mesmo na planilha. */
function abrirPainel() {
  const pagina = HtmlService.createHtmlOutputFromFile('Painel').setWidth(1280).setHeight(860);
  SpreadsheetApp.getUi().showModalDialog(pagina, 'Painel Darzan Produções');
}

/** Mostra o link do painel (depois de implantar como App da Web). */
function mostrarLink() {
  const ui = SpreadsheetApp.getUi();
  const url = ScriptApp.getService().getUrl();
  if (!url) {
    ui.alert('O painel ainda não tem link',
      'Para abrir no celular, faça uma vez: Implantar → Nova implantação → App da Web ' +
      '(Executar como: Eu · Quem pode acessar: Somente eu). Depois volte aqui.',
      ui.ButtonSet.OK);
    return;
  }
  const html = HtmlService.createHtmlOutput(
    '<div style="font-family:Arial;font-size:14px;line-height:1.5">' +
    '<p>Abra este link no celular e salve nos favoritos. Ele só abre com o seu login do Google.</p>' +
    '<p><a href="' + url + '" target="_blank">' + url + '</a></p></div>'
  ).setWidth(560).setHeight(170);
  ui.showModalDialog(html, 'Link do painel');
}

/** Página do painel quando aberta pelo link (App da Web). */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Painel')
    .setTitle('Painel Darzan Produções')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Lê as abas da planilha e devolve tudo como texto JSON.
 * Cada linha vira um objeto com os títulos da linha 1 como nomes.
 */
function getDados() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const fuso = ss.getSpreadsheetTimeZone();
  const agora = new Date();
  const saida = {
    planilha: ss.getName(),
    atualizado: Utilities.formatDate(agora, fuso, "dd/MM/yyyy 'às' HH:mm"),
    hoje: Utilities.formatDate(agora, fuso, 'yyyy-MM-dd'),
    abas: {}
  };

  ABAS_DO_PAINEL.forEach(function (nome) {
    const aba = ss.getSheetByName(nome);
    if (!aba) { saida.abas[nome] = []; return; }
    const faixa = aba.getDataRange();
    const valores = faixa.getValues();
    const textos = faixa.getDisplayValues();
    if (valores.length < 2) { saida.abas[nome] = []; return; }

    const cabecalho = valores[0].map(function (h) { return String(h).trim(); });
    const linhas = [];
    for (let i = 1; i < valores.length; i++) {
      const linha = valores[i];
      const vazia = linha.every(function (v) { return v === '' || v === null; });
      if (vazia) continue;
      const obj = {};
      cabecalho.forEach(function (titulo, j) {
        if (!titulo) return;
        let v = linha[j];
        if (v instanceof Date) {
          // Horas (ex.: 16:00) chegam como datas de 1899: usa o texto que aparece na célula.
          v = v.getFullYear() < 1901 ? textos[i][j] : Utilities.formatDate(v, fuso, 'yyyy-MM-dd');
        }
        obj[titulo] = v;
      });
      linhas.push(obj);
    }
    saida.abas[nome] = linhas;
  });

  return JSON.stringify(saida);
}
