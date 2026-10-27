/**
 * Darzan Finanças: monta a "Planilha financeira 2.0" como base de dados.
 *
 * Como usar (uma vez só):
 *   1. Abra a Planilha financeira 2.0 → Extensões → Apps Script.
 *   2. Cole este arquivo, salve e rode a função montarBaseDeDados.
 *   3. Autorize (é o seu próprio script, lendo as suas planilhas).
 *
 * O que ele faz:
 *   - Faz uma cópia de segurança da 2.0 antes de mexer.
 *   - Lê a planilha antiga SÓ PARA LER (não altera nada nela).
 *   - Monta as abas no formato de base de dados: cabeçalho na linha 1 e um registro por linha.
 *   - Mantém tudo que você já lançou no EXTRATO da 2.0 e acrescenta o histórico da antiga.
 *
 * Não há valores pessoais neste arquivo: tudo é lido das suas planilhas.
 */

const PLANILHA_ANTIGA_ID = '1TkGBbmfi97ExPImeBBU1CeZrt1H197wf30XmPb-0umE';
const ANO = 2026;
const MESES_ABAS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const PRIMEIRO_MES = 3;      // março: jan e fev da antiga só tinham as contas fixas
const MESES_SO_CARTAO = [9]; // setembro: vale o que você lançou na 2.0; da antiga vêm só os cartões
const CARTOES_ANTIGA = { 'Cartão 01': 'Nubank', 'Cartão 02': 'Mercado Pago', 'Cartão 03': 'Inter' };
const SEM_BANCO = 'Não informado';
const EQUIP = /gimbal|bast[aã]o|ssd|mem[oó]ria|bateria|case hd|iphone 17|hd \d+ ?tb/i;

const COLUNAS = {
  EXTRATO: ['DATA', 'BANCO', 'DESCRIÇÃO', 'GRUPO', 'TIPO', 'VALOR', 'CATEGORIA', 'SUB-CATEGORIA', 'STATUS', 'PARCELA', 'OBS', 'ID'],
  CATEGORIAS: ['CATEGORIA', 'SUB-CATEGORIA', 'GRUPO'],
  CONTAS: ['BANCO', 'CONTA', 'SALDO CONFERIDO', 'DATA DA CONFERÊNCIA', 'PARA QUÊ', 'OBS'],
  CARTOES: ['CARTÃO', 'LIMITE', 'FECHA DIA', 'VENCE DIA', 'PAGA PELA CONTA', 'OBS'],
  PARCELADOS: ['DATA DA COMPRA', 'DESCRIÇÃO', 'CARTÃO', 'VALOR TOTAL', 'PARCELAS', 'VALOR DA PARCELA', '1ª PARCELA', 'CATEGORIA', 'SUB-CATEGORIA', 'ID'],
  FIXAS: ['DESCRIÇÃO', 'VALOR', 'DIA', 'BANCO', 'TIPO', 'GRUPO', 'CATEGORIA', 'SUB-CATEGORIA', 'ATIVA', 'OBS'],
  EQUIPAMENTOS: ['NOME', 'TIPO', 'VALOR', 'DATA DA COMPRA', 'COMO PAGOU', 'ESTADO', 'Nº DE SÉRIE', 'OBS', 'ID'],
  TRABALHOS: ['CLIENTE', 'TIPO DE EVENTO', 'DATA DO EVENTO', 'LOCAL', 'O QUE FOI FECHADO', 'VALOR TOTAL', 'JÁ RECEBIDO', 'FALTA RECEBER', 'ENTREGA', 'ETAPA', 'CONTRATO', 'OBS'],
  TAREFAS: ['TAREFA', 'DATA', 'VALOR', 'TIPO', 'FEITA', 'OBS'],
  METAS: ['META', 'VALOR ALVO', 'JÁ GUARDADO', 'ONDE ESTÁ', 'PRAZO', 'OBS'],
};

/* categoria → sub-categorias (a "cascata") e o grupo padrão */
const CATEGORIAS = [
  ['Salário CLT', ['Salário', 'Comissão', 'Benefícios'], 'Renda'],
  ['Darzan Produções', ['Storymaker', 'Casamento', 'Social media', 'Evento', 'Palestra', 'HUB Darzan', 'Outros'], 'Renda'],
  ['JPL SOM', ['Serviço'], 'Renda'],
  ['Outras rendas', ['Venda', 'Play One', 'Latinha', 'Outros'], 'Renda'],
  ['Alimentação', ['Mercado', 'Padaria'], 'Necessidades'],
  ['Alimentação fora', ['iFood', 'Comida fora'], 'Desejos'],
  ['Transporte', ['Gasolina', 'Uber/99', 'Manutenção', 'Seguro', 'Estacionamento', 'IPVA e multas'], 'Necessidades'],
  ['Casa', ['Moradia', 'Contas', 'Casa e higiene', 'Pet'], 'Necessidades'],
  ['Saúde e beleza', ['Farmácia', 'Saúde', 'Corte de cabelo', 'Beleza'], 'Necessidades'],
  ['Trabalho', ['Equipamentos', 'Cursos', 'Software', 'Negócio'], 'Necessidades'],
  ['Assinaturas', ['Streaming', 'Apps'], 'Desejos'],
  ['Lazer', ['Lazer', 'Presente', 'Futebol', 'Brinquedo', 'Viagem'], 'Desejos'],
  ['Compras', ['Eletrônicos', 'Roupas', 'Compras online', 'Compras parceladas'], 'Desejos'],
  ['Doações', ['Igreja', 'Família', 'Outras'], 'Desejos'],
  ['Dívidas', ['Pagamento de dívida'], 'Necessidades'],
  ['Guardado', ['Reserva', 'Caixinha', 'Investimento'], 'Guardado'],
  ['Transferência', ['Entre minhas contas'], 'Transferência'],
  ['Outros', ['Outros'], 'Desejos'],
];

/* categoria da planilha antiga → [CATEGORIA, SUB-CATEGORIA] */
const DE_ANTIGA = {
  'Mercado': ['Alimentação', 'Mercado'], 'Necessidades': ['Casa', 'Casa e higiene'], 'Eletrônicos': ['Compras', 'Eletrônicos'],
  'Pet': ['Casa', 'Pet'], 'Roupas': ['Compras', 'Roupas'], 'Beleza': ['Saúde e beleza', 'Beleza'], 'Presente': ['Lazer', 'Presente'],
  'Saúde': ['Saúde e beleza', 'Saúde'], 'Outros': ['Outros', 'Outros'], 'Desenvolvimento': ['Trabalho', 'Cursos'],
  'Transporte': ['Transporte', 'Manutenção'], 'Comida fora': ['Alimentação fora', 'Comida fora'], 'Lazer': ['Lazer', 'Lazer'],
  'Moradia': ['Casa', 'Moradia'], 'Contas': ['Casa', 'Contas'], 'Investimento': ['Guardado', 'Reserva'], 'Educação': ['Trabalho', 'Cursos'],
  'Divida': ['Dívidas', 'Pagamento de dívida'], 'Negócio': ['Trabalho', 'Negócio'], 'Uber/99': ['Transporte', 'Uber/99'],
  'iFood': ['Alimentação fora', 'iFood'], 'Assinaturas': ['Assinaturas', 'Streaming'], 'Dízimo/Doações': ['Doações', 'Igreja'],
  'Gasolina': ['Transporte', 'Gasolina'], 'Futebol': ['Lazer', 'Futebol'], 'Brinquedo': ['Lazer', 'Brinquedo'], 'Casa/Mobília': ['Casa', 'Moradia'],
  'Fatura do Cartão': ['Transferência', 'Entre minhas contas'], 'Transferência': ['Transferência', 'Entre minhas contas'],
};
const RENDA_ANTIGA = {
  'Storymaker': ['Darzan Produções', 'Storymaker'], 'HUB Darzan': ['Darzan Produções', 'HUB Darzan'], 'Negócio': ['Darzan Produções', 'Outros'],
  'Jpl som': ['JPL SOM', 'Serviço'], 'Play One': ['Outras rendas', 'Play One'], 'Latinha': ['Outras rendas', 'Latinha'],
  'Transferência': ['Salário CLT', 'Salário'], 'Receita': ['Salário CLT', 'Salário'],
};

/* palavras da descrição → [CATEGORIA, SUB-CATEGORIA] para o que ficou sem categoria */
const PALAVRAS = [
  [/ifood|marmita|a[cç]a[ií]/i, 'Alimentação fora', 'iFood'],
  [/subway|lanche|pastel|almo[cç]o|burguer|burger|snack|energ[eé]tico|cacau show|doce|gratinadog|biscoito|sorvete/i, 'Alimentação fora', 'Comida fora'],
  [/padaria/i, 'Alimentação', 'Padaria'],
  [/covabra|mercado|atacad|supermerc/i, 'Alimentação', 'Mercado'],
  [/gasolina|combust|posto/i, 'Transporte', 'Gasolina'],
  [/uber|99 ?pop|taxi/i, 'Transporte', 'Uber/99'],
  [/estacionamento/i, 'Transporte', 'Estacionamento'],
  [/seguro do carro/i, 'Transporte', 'Seguro'],
  [/mec[aâ]nico|pneu|borracharia|seta|oficina/i, 'Transporte', 'Manutenção'],
  [/farm[aá]cia|drogaria/i, 'Saúde e beleza', 'Farmácia'],
  [/corte|cabelo|barbear/i, 'Saúde e beleza', 'Corte de cabelo'],
  [/curso|aula|mentoria/i, 'Trabalho', 'Cursos'],
  [/hd \d|ssd|gimbal|bateria|lente|microfone|trip[eé]|bast[aã]o/i, 'Trabalho', 'Equipamentos'],
  [/usb|adaptador|adpatador|cabo/i, 'Compras', 'Eletrônicos'],
  [/ali ?express|shopee|amazon|shein|mercado livre/i, 'Compras', 'Compras online'],
  [/igreja|d[ií]zimo|oferta/i, 'Doações', 'Igreja'],
  [/netflix|spotify|prime|disney|youtube/i, 'Assinaturas', 'Streaming'],
  [/icloud|canva|adobe|capcut|claude|chatgpt/i, 'Assinaturas', 'Apps'],
  [/presente/i, 'Lazer', 'Presente'],
  [/cinema|bar |show|festa/i, 'Lazer', 'Lazer'],
];
const SUB_RENDA = [[/casamento/i, 'Casamento'], [/storymaker/i, 'Storymaker'], [/palestra/i, 'Palestra'], [/kellen|v[ií]deos?|capta[cç]/i, 'Social media'], [/hub/i, 'HUB Darzan']];

function montarBaseDeDados() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ext = ss.getSheetByName('EXTRATO');
  if (!ext) throw new Error('Não achei a aba EXTRATO nesta planilha.');
  const jaTemId = ext.getLastColumn() > 0 && ext.getRange(1, 1, 1, ext.getLastColumn()).getValues()[0].indexOf('ID') >= 0;
  let origem = ext;
  /* a base só está pronta se as linhas têm ID; uma tentativa que parou no meio deixa linhas sem ID */
  const comId = jaTemId && ext.getLastRow() > 1 ? ext.getRange(2, 12, ext.getLastRow() - 1, 1).getValues().filter(r => r[0] !== '').length : 0;
  if (comId > 0) {
    throw new Error('A base já foi montada (o EXTRATO já tem ' + comId + ' linhas com ID). Nada foi alterado.');
  }
  if (jaTemId) {
    /* uma tentativa anterior parou no meio e deixou o EXTRATO vazio: as suas linhas estão na cópia de segurança */
    origem = extratoDaCopia_();
  } else {
    copiaDeSeguranca_(ss);
  }
  const antiga = SpreadsheetApp.openById(PLANILHA_ANTIGA_ID);
  const hoje = new Date();
  const mesAtual = hoje.getFullYear() === ANO ? hoje.getMonth() + 1 : 12;

  /* 1. o que você já lançou na 2.0 */
  const meus = lerExtratoAtual_(origem);
  /* 2. histórico da antiga */
  const hist = lerAntiga_(antiga, mesAtual);
  const linhas = meus.concat(hist.linhas).sort((a, b) => a[0] - b[0]);
  linhas.forEach((l, i) => { l[11] = 'L' + String(i + 1).padStart(5, '0'); });

  /* 3. escrever as abas */
  escrever_(ss, 'EXTRATO', COLUNAS.EXTRATO, linhas, { dinheiro: [6], data: [1], cor: '#1f3a8a' }, ext);
  const cats = [];
  CATEGORIAS.forEach(([c, subs, g]) => subs.forEach(s => cats.push([c, s, g])));
  escrever_(ss, 'CATEGORIAS', COLUNAS.CATEGORIAS, cats, { cor: '#5b21b6' });
  escrever_(ss, 'CONTAS', COLUNAS.CONTAS, lerContas_(antiga), { dinheiro: [3], data: [4], cor: '#065f46' });
  escrever_(ss, 'CARTOES', COLUNAS.CARTOES, lerCartoes_(antiga), { dinheiro: [2], cor: '#9a3412' });
  escrever_(ss, 'PARCELADOS', COLUNAS.PARCELADOS, hist.compras, { dinheiro: [4, 6], data: [1], cor: '#9a3412' });
  escrever_(ss, 'FIXAS', COLUNAS.FIXAS, lerFixas_(antiga), { dinheiro: [2], cor: '#1f3a8a' });
  escrever_(ss, 'EQUIPAMENTOS', COLUNAS.EQUIPAMENTOS, lerEquipamentos_(antiga, hist), { dinheiro: [3], data: [4], cor: '#1e40af' });
  escrever_(ss, 'TRABALHOS', COLUNAS.TRABALHOS, trabalhos_(), { dinheiro: [6, 7, 8], data: [3, 9], cor: '#a16207' });
  escrever_(ss, 'TAREFAS', COLUNAS.TAREFAS, tarefas_(antiga), { dinheiro: [3], data: [2], cor: '#334155' });
  escrever_(ss, 'METAS', COLUNAS.METAS, lerMetas_(antiga), { dinheiro: [2, 3], data: [5], cor: '#065f46' });
  formulas_(ss);
  listas_(ss);
  leiaMe_(ss, linhas.length, meus.length, hist);
  ss.setActiveSheet(ss.getSheetByName('EXTRATO'));
  SpreadsheetApp.flush();
  return { extrato: linhas.length, seus: meus.length, antiga: hist.linhas.length, compras: hist.compras.length };
}

/* ---------- leitura ---------- */
function lerExtratoAtual_(sh) {
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  const cab = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(x => String(x).trim().toUpperCase());
  const col = nome => cab.findIndex(c => c === nome);
  const iG = cab.findIndex(c => c === 'GRUPO' || c === 'TEMPORÁRIO');
  return sh.getRange(2, 1, n, cab.length).getValues().filter(r => r[col('DATA')] && r[col('VALOR')] !== '').map(r => {
    const grupo = normGrupo_(r[iG]);
    const desc = String(r[col('DESCRIÇÃO')]).trim();
    let valor = numero_(r[col('VALOR')]);
    valor = grupo === 'Renda' ? Math.abs(valor) : -Math.abs(valor);
    let cat = String(r[col('CATEGORIA')] || '').trim(), sub = String(r[col('SUB-CATEGORIA')] || '').trim(), obs = '';
    if (grupo === 'Renda') {
      if (/jpl/i.test(cat)) cat = 'JPL SOM';
      if (!cat) cat = /jpl/i.test(desc) ? 'JPL SOM' : 'Darzan Produções';
      if (!sub) sub = cat === 'JPL SOM' ? 'Serviço' : (SUB_RENDA.find(([re]) => re.test(desc)) || [0, 'Outros'])[1];
      if (cat === 'JPL SOM' && /kellen/i.test(desc)) obs = 'Conferir: Kellen costuma ser Darzan';
      if (cat === 'Darzan Produções' && /jpl/i.test(desc)) obs = 'Conferir: parece JPL SOM';
    } else if (!sub) {
      const pelaCat = PALAVRAS.find(([re]) => re.test(cat));
      const pelaDesc = PALAVRAS.find(([re]) => re.test(desc));
      const achou = (cat && pelaCat) || pelaDesc;
      if (achou) { cat = achou[1]; sub = achou[2]; } else if (!cat) { cat = 'Outros'; sub = 'Outros'; }
    }
    const tipo = /cart/i.test(String(r[col('TIPO')] || '')) ? 'cartão' : 'conta';
    return [data_(r[col('DATA')]), String(r[col('BANCO')] || SEM_BANCO).trim(), desc, grupo, tipo, valor, cat, sub, 'Pago', '', obs, ''];
  });
}

function lerAntiga_(antiga, mesAtual) {
  const linhas = [], compras = {};
  for (let mi = PRIMEIRO_MES; mi <= Math.min(mesAtual, 12); mi++) {
    const sh = antiga.getSheetByName(MESES_ABAS[mi - 1]);
    if (!sh) continue;
    const ultima = sh.getLastRow();
    if (ultima < 37) continue;
    const vals = sh.getRange(37, 3, ultima - 36, 16).getValues(); // C..R
    const soCartao = MESES_SO_CARTAO.indexOf(mi) >= 0;
    vals.forEach((r, k) => {
      const [desc, dia, tipo, valor, cat0, pg, pago] = r;
      if (desc && typeof valor === 'number' && ['Renda', 'Necessidades', 'Desejos', 'Poupança'].indexOf(tipo) >= 0) {
        const cartao = CARTOES_ANTIGA[pg];
        if (soCartao && !cartao) return;
        const d = dia instanceof Date ? dia.getDate() : (parseInt(String(dia).replace(/\D/g, ''), 10) || 1);
        const cat = String(cat0 || '').trim().replace(/^\S+\s+/, '').trim();
        const grupo = tipo === 'Poupança' ? 'Guardado' : tipo;
        let cs;
        if (grupo === 'Renda') cs = /facebook/i.test(desc) ? ['Darzan Produções', 'Outros'] : (RENDA_ANTIGA[cat] || ['Outras rendas', 'Outros']);
        else if (grupo === 'Guardado') cs = ['Guardado', 'Reserva'];
        else {
          const p = PALAVRAS.find(([re]) => re.test(desc));
          cs = (cat === 'Transporte' || cat === 'Assinaturas' || cat === 'Lazer') && p ? [p[1], p[2]] : (DE_ANTIGA[cat] || (p ? [p[1], p[2]] : ['Outros', 'Outros']));
        }
        if (grupo === 'Renda' && /comiss/i.test(desc)) cs = ['Salário CLT', 'Comissão'];
        const status = mi === mesAtual && pago === false && !cartao ? 'Previsto' : 'Pago';
        linhas.push([new Date(ANO, mi - 1, Math.min(d, diasNoMes_(ANO, mi))), cartao || SEM_BANCO, String(desc).trim(), grupo, cartao ? 'cartão' : 'conta',
          grupo === 'Renda' ? valor : -valor, cs[0], cs[1], status, '', 'planilha antiga', '']);
      }
      /* compras parceladas: ficam nas colunas L..R da parte de cima */
      const [cDesc, cDia, cCartao, cTotal, cN, cI, cV] = r.slice(9, 16);
      if (k < 33 && cDesc && typeof cTotal === 'number' && CARTOES_ANTIGA[cCartao]) {
        const chave = String(cDesc).toLowerCase().slice(0, 14) + '|' + cCartao + '|' + cTotal.toFixed(2);
        compras[chave] = { desc: String(cDesc).trim(), cartao: CARTOES_ANTIGA[cCartao], total: cTotal, n: parseInt(cN, 10), parcela: Math.round(cV * 100) / 100, inicio: mi - (parseInt(cI, 10) - 1), dia: parseInt(cDia, 10) || 1 };
      }
    });
  }
  const lista = [];
  Object.keys(compras).forEach((k, i) => {
    const c = compras[k], id = 'P' + String(i + 1).padStart(4, '0');
    const equip = EQUIP.test(c.desc);
    const cs = equip ? ['Trabalho', 'Equipamentos'] : ['Compras', 'Compras parceladas'];
    lista.push([new Date(ANO, c.inicio - 1, Math.min(c.dia, diasNoMes_(ANO, c.inicio))), c.desc, c.cartao, c.total, c.n, c.parcela, MESES_ABAS[(c.inicio - 1 + 12) % 12] + '/' + String(ANO).slice(2), cs[0], cs[1], id]);
    for (let p = 1; p <= c.n; p++) {
      const m = c.inicio + p - 1, y = ANO + Math.floor((m - 1) / 12), mm = ((m - 1) % 12) + 1;
      if (y === ANO && mm < PRIMEIRO_MES) continue;
      const futuro = y > ANO || mm > mesAtual;
      linhas.push([new Date(y, mm - 1, Math.min(c.dia, diasNoMes_(y, mm))), c.cartao, c.desc, equip ? 'Necessidades' : 'Desejos', 'cartão', -c.parcela, cs[0], cs[1], futuro ? 'Previsto' : 'Pago', `${p}/${c.n}`, 'Compra ' + id, '']);
    }
  });
  return { linhas, compras: lista };
}

function lerContas_(antiga) {
  const sh = antiga.getSheetByName('💰 Patrimônio'), out = [];
  const guard = sh ? sh.getRange(26, 2, 10, 7).getValues().filter(r => r[0] && typeof r[3] === 'number') : [];
  ['Nubank', 'PicPay', 'Mercado Pago', 'Inter'].forEach(b => {
    out.push([b, 'Conta', '', '', 'Dia a dia', 'Digite o saldo que aparece no app do banco']);
    guard.filter(r => String(r[2]).toLowerCase().replace(/\s/g, '') === b.toLowerCase().replace(/\s/g, ''))
      .forEach(r => out.push([b, 'Caixinha ' + cap_(r[0]), r[3], r[4] instanceof Date ? r[4] : '', r[1] === 'Ap' ? 'Apê' : String(r[1] || ''), 'Da planilha antiga']));
  });
  return out;
}
function lerCartoes_(antiga) {
  const sh = antiga.getSheetByName('💳 Cartões');
  const pos = [[9, 5], [9, 9], [16, 5], [16, 9]]; // nome na linha 9/16, limite +2, fechamento +4
  const contaDe = { nubank: 'Nubank · Conta', 'mercado pago': 'Mercado Pago · Conta', inter: 'Inter · Conta', picpay: 'PicPay · Conta' };
  return pos.map(([r, c]) => [sh.getRange(r, c).getValue(), sh.getRange(r + 2, c).getValue(), sh.getRange(r + 4, c).getValue()])
    .filter(x => x[0]).map(([n, lim, fecha]) => { const nome = cap_(n).replace('Mercado pago', 'Mercado Pago'); return [nome, lim, fecha, '', contaDe[String(n).toLowerCase()] || '', 'Preencha o dia do vencimento']; });
}
function lerFixas_(antiga) {
  const sh = antiga.getSheetByName('💰 Despesas Fixas');
  return sh.getRange(10, 2, 20, 7).getValues().filter(r => r[0] && typeof r[3] === 'number').map(([d, dia, g, v, cat, pg, obs]) => {
    const cartao = CARTOES_ANTIGA[pg], c0 = String(cat).trim().replace(/^\S+\s+/, '').trim(), p = PALAVRAS.find(([re]) => re.test(d));
    const cs = p ? [p[1], p[2]] : (DE_ANTIGA[c0] || ['Outros', 'Outros']);
    return [cap_(d), v, parseInt(String(dia).replace(/\D/g, ''), 10) || 1, cartao || (/picpay/i.test(obs) ? 'PicPay' : SEM_BANCO), cartao ? 'cartão' : (pg === 'Débito' ? 'débito automático' : 'conta'), g, cs[0], cs[1], 'Sim', String(obs || '')];
  });
}
function lerEquipamentos_(antiga, hist) {
  const sh = antiga.getSheetByName('💰 Patrimônio'), out = [];
  sh.getRange(56, 2, 10, 7).getValues().filter(r => r[0] && typeof r[3] === 'number')
    .forEach(r => out.push([cap_(r[0]), tipoEquip_(r[0] + ' ' + r[2]), r[3], r[4] instanceof Date ? r[4] : '', 'Já tinha', String(r[5] || ''), '', 'Valor atual (planilha antiga)', 'E' + String(out.length + 1).padStart(3, '0')]));
  hist.compras.filter(c => EQUIP.test(c[1])).forEach(c => out.push([cap_(c[1]), tipoEquip_(c[1]), c[3], c[0], `${c[4]}x no ${c[2]}`, 'Novo', '', 'Compra ' + c[9], 'E' + String(out.length + 1).padStart(3, '0')]));
  return out;
}
function lerMetas_(antiga) {
  const sh = antiga.getSheetByName('🏆 Metas ');
  if (!sh) return [];
  return [[6, 11, 8, 10], [6, 16, 8, 10], [13, 11, 15, 17], [13, 16, 15, 17]].map(([rn, c, rv, rp]) => [sh.getRange(rn, c).getValue(), sh.getRange(rv, c).getValue(), sh.getRange(rp, c).getValue() || 0, '', '', ''])
    .filter(m => m[0]);
}
function trabalhos_() {
  /* "JÁ RECEBIDO" soma sozinho tudo do EXTRATO cuja descrição tem o nome do cliente */
  return [['Kellen', 'Social media', '', '', 'Vídeos e captações', '', '', '', '', 'Em andamento', '', 'Cliente recorrente'],
    ['Grazi', 'Casamento', '', '', '', '', '', '', '', 'Fechado', '', 'Preencha o valor total e a data'],
    ['Patricia', 'Palestra', '', '', '', '', '', '', '', 'Entregue', '', ''],
    ['Casamento 22/08/27', 'Casamento', new Date(2027, 7, 22), '', '', '', '', '', '', 'Fechado', '', 'Sinal recebido em 26/09. Troque pelo nome do casal']];
}
function tarefas_() {
  return [['Pagar seguro do carro', new Date(ANO, 9, 27), 115, 'Conta', false, 'Vem das contas fixas'],
    ['Conferir o saldo dos bancos', new Date(ANO, 9, 28), '', 'Pessoal', false, 'Aba CONTAS'],
    ['Preencher o dia de vencimento dos cartões', new Date(ANO, 9, 28), '', 'Pessoal', false, 'Aba CARTOES'],
    ['Pagar IPVA 2027', new Date(ANO + 1, 0, 20), '', 'Conta', false, 'Dia depende do final da placa']];
}

/* ---------- escrita ---------- */
function escrever_(ss, nome, cab, linhas, o, existente) {
  let sh = existente || ss.getSheetByName(nome);
  if (!sh) sh = ss.insertSheet(nome);
  sh.clear();
  /* clear() não apaga listas suspensas antigas; sem isso o Google recusa valores novos */
  if (sh.getMaxColumns() < cab.length) sh.insertColumnsAfter(sh.getMaxColumns(), cab.length - sh.getMaxColumns());
  sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).clearDataValidations();
  sh.getRange(1, 1, 1, cab.length).setValues([cab]).setFontWeight('bold').setFontColor('#ffffff').setBackground(o.cor || '#1f3a8a');
  if (linhas.length) sh.getRange(2, 1, linhas.length, cab.length).setValues(linhas.map(l => cab.map((_, i) => l[i] === undefined ? '' : l[i])));
  const n = Math.max(linhas.length, 1) + 200;
  (o.dinheiro || []).forEach(c => sh.getRange(2, c, n, 1).setNumberFormat('"R$" #,##0.00;[Red]-"R$" #,##0.00'));
  (o.data || []).forEach(c => sh.getRange(2, c, n, 1).setNumberFormat('dd/mm/yyyy'));
  sh.setFrozenRows(1);
  if (sh.getFilter()) sh.getFilter().remove();
  sh.getRange(1, 1, Math.max(linhas.length, 1) + 1, cab.length).createFilter();
  sh.autoResizeColumns(1, cab.length);
  return sh;
}
function formulas_(ss) {
  const t = ss.getSheetByName('TRABALHOS'), n = t.getLastRow();
  const sep = separador_(t.getRange(2, 7));
  const f = s => s.replace(/,/g, sep);
  for (let r = 2; r <= n + 30; r++) {
    t.getRange(r, 7).setFormula(f(`=IF(A${r}="","",SUMIFS(EXTRATO!F:F,EXTRATO!C:C,"*"&A${r}&"*",EXTRATO!D:D,"Renda"))`));
    t.getRange(r, 8).setFormula(f(`=IF(OR(A${r}="",F${r}=""),"",F${r}-G${r})`));
  }
}
/* planilha em português pode pedir ";" no lugar de "," nas fórmulas: testa e usa o que funcionar */
function separador_(celula) {
  celula.setFormula('=IF(1=1,1,0)');
  SpreadsheetApp.flush();
  const ok = String(celula.getDisplayValue()) === '1';
  celula.clearContent();
  return ok ? ',' : ';';
}
/* conserta só as fórmulas da aba TRABALHOS (para quem já montou a base com a versão anterior) */
function ajustarFormulasTrabalhos() {
  formulas_(SpreadsheetApp.getActiveSpreadsheet());
  SpreadsheetApp.flush();
}
function listas_(ss) {
  const ext = ss.getSheetByName('EXTRATO'), n = ext.getMaxRows() - 1;
  const lista = (vals) => SpreadsheetApp.newDataValidation().requireValueInList(vals, true).setAllowInvalid(true).build();
  const intervalo = (sh, col) => SpreadsheetApp.newDataValidation().requireValueInRange(sh.getRange(2, col, 500, 1), true).setAllowInvalid(true).build();
  const cats = ss.getSheetByName('CATEGORIAS');
  ext.getRange(2, 2, n, 1).setDataValidation(lista(['Nubank', 'PicPay', 'Mercado Pago', 'Inter', SEM_BANCO]));
  ext.getRange(2, 4, n, 1).setDataValidation(lista(['Renda', 'Necessidades', 'Desejos', 'Guardado', 'Transferência']));
  ext.getRange(2, 5, n, 1).setDataValidation(lista(['conta', 'cartão']));
  ext.getRange(2, 7, n, 1).setDataValidation(lista(CATEGORIAS.map(c => c[0])));
  ext.getRange(2, 8, n, 1).setDataValidation(intervalo(cats, 2));
  ext.getRange(2, 9, n, 1).setDataValidation(lista(['Pago', 'Previsto']));
  const tar = ss.getSheetByName('TAREFAS');
  tar.getRange(2, 5, 300, 1).insertCheckboxes();
  tar.getRange(2, 4, 300, 1).setDataValidation(lista(['Conta', 'Darzan', 'Pessoal']));
  ss.getSheetByName('TRABALHOS').getRange(2, 10, 300, 1).setDataValidation(lista(['Orçamento', 'Fechado', 'Em andamento', 'Entregue']));
  ss.getSheetByName('FIXAS').getRange(2, 9, 100, 1).setDataValidation(lista(['Sim', 'Não']));
}
function leiaMe_(ss, total, seus, hist) {
  let sh = ss.getSheetByName('LEIA-ME');
  if (!sh) sh = ss.insertSheet('LEIA-ME', 0);
  sh.clear();
  const txt = [
    ['Planilha financeira 2.0: base de dados do app Darzan Finanças'],
    [''],
    ['Cada aba é uma tabela: o cabeçalho fica na linha 1 e cada registro numa linha embaixo. Não mude os nomes dos cabeçalhos.'],
    ['EXTRATO: todas as entradas e saídas. VALOR negativo = saiu, positivo = entrou. STATUS: Pago ou Previsto.'],
    ['CATEGORIAS: a lista de categorias e sub-categorias usada no EXTRATO.'],
    ['CONTAS: bancos e caixinhas. Digite o saldo que aparece no app do banco e a data.'],
    ['CARTOES: limite, fechamento e vencimento de cada cartão.'],
    ['PARCELADOS: compras no cartão em várias vezes. As parcelas já estão no EXTRATO, mês a mês.'],
    ['FIXAS: contas que se repetem todo mês.'],
    ['EQUIPAMENTOS, TRABALHOS, TAREFAS, METAS: os cadastros do app.'],
    [''],
    [`Montada em ${Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm')}: ${total} linhas no EXTRATO (${seus} suas da 2.0 + ${hist.linhas.length} da planilha antiga).`],
    ['A planilha antiga não foi alterada. Há uma cópia de segurança da 2.0 de antes da mudança no seu Drive.'],
    [`Na planilha antiga não dava para saber o banco dos Pix: essas linhas estão com BANCO = "${SEM_BANCO}".`],
  ];
  sh.getRange(1, 1, txt.length, 1).setValues(txt);
  sh.getRange(1, 1).setFontSize(14).setFontWeight('bold');
  sh.setColumnWidth(1, 900);
}

/* ---------- utilidades ---------- */
function copiaDeSeguranca_(ss) {
  const nome = ss.getName() + ' (cópia de segurança ' + Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd-MM-yyyy HH.mm') + ')';
  DriveApp.getFileById(ss.getId()).makeCopy(nome);
}
function extratoDaCopia_() {
  const busca = DriveApp.searchFiles("title contains 'Planilha financeira 2.0 (cópia de segurança' and trashed = false");
  let melhor = null;
  while (busca.hasNext()) { const f = busca.next(); if (!melhor || f.getDateCreated() > melhor.getDateCreated()) melhor = f; }
  if (!melhor) throw new Error('O EXTRATO está vazio e não achei a cópia de segurança no Drive. Copie as suas linhas de volta para o EXTRATO e rode de novo.');
  const sh = SpreadsheetApp.open(melhor).getSheetByName('EXTRATO');
  if (!sh || sh.getLastRow() < 2) throw new Error('A cópia de segurança "' + melhor.getName() + '" não tem linhas no EXTRATO.');
  return sh;
}
function numero_(v) {
  if (typeof v === 'number') return v;
  let s = String(v).replace(/[^\d,.-]/g, '');
  if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
  return parseFloat(s) || 0;
}
function data_(v) {
  if (v instanceof Date) return v;
  const m = String(v).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? new Date(+m[3], +m[2] - 1, +m[1]) : new Date(v);
}
function normGrupo_(g) {
  g = String(g || '').trim().toLowerCase();
  if (g.startsWith('renda')) return 'Renda';
  if (g.startsWith('nec')) return 'Necessidades';
  if (g.startsWith('guard') || g.startsWith('poup')) return 'Guardado';
  if (g.startsWith('transf')) return 'Transferência';
  return 'Desejos';
}
function tipoEquip_(d) {
  const t = [[/gimbal/i, 'Estabilizador'], [/ssd|hd|case|mem[oó]ria|cart[aã]o/i, 'Armazenamento'], [/bateria/i, 'Acessório'], [/bast[aã]o|luz|led/i, 'Iluminação'], [/iphone|celular/i, 'Celular'], [/lente/i, 'Lente'], [/c[aâ]mera|zv/i, 'Câmera']];
  return (t.find(([re]) => re.test(d)) || [0, 'Acessório'])[1];
}
function diasNoMes_(y, m) { return new Date(y, m, 0).getDate(); }
function cap_(s) { s = String(s || '').trim(); return s.charAt(0).toUpperCase() + s.slice(1); }
