/* Dados de EXEMPLO (inventados) para os testes automáticos. Nada aqui é do João.
   Uso: node financas-app/ferramentas/gerar_exemplo.js  → financas-app/testes/dados-exemplo.json */
const fs = require('fs'), path = require('path');
const CATS = [
  ['Salário CLT', ['Salário', 'Comissão', 'Benefícios'], 'Renda'],
  ['Darzan Produções', ['Storymaker', 'Casamento', 'Social media', 'Evento', 'Palestra', 'Outros'], 'Renda'],
  ['JPL SOM', ['Serviço'], 'Renda'],
  ['Outras rendas', ['Venda', 'Outros'], 'Renda'],
  ['Alimentação', ['Mercado', 'Padaria'], 'Necessidades'],
  ['Alimentação fora', ['iFood', 'Comida fora'], 'Desejos'],
  ['Transporte', ['Gasolina', 'Uber/99', 'Manutenção', 'Seguro', 'Estacionamento'], 'Necessidades'],
  ['Casa', ['Moradia', 'Contas'], 'Necessidades'],
  ['Saúde e beleza', ['Farmácia', 'Corte de cabelo'], 'Necessidades'],
  ['Trabalho', ['Equipamentos', 'Cursos', 'Software'], 'Necessidades'],
  ['Assinaturas', ['Streaming', 'Apps'], 'Desejos'],
  ['Lazer', ['Lazer', 'Presente', 'Viagem'], 'Desejos'],
  ['Compras', ['Eletrônicos', 'Roupas'], 'Desejos'],
  ['Guardado', ['Reserva', 'Caixinha', 'Investimento'], 'Guardado'],
  ['Transferência', ['Entre minhas contas', 'Pagamento de fatura'], 'Transferência'],
  ['Outros', ['Outros'], 'Desejos'],
];
let n = 0;
const id = p => p + String(++n).padStart(4, '0');
const L = (data, banco, desc, grupo, tipo, valor, cat, sub, extra = {}) => Object.assign({ ID: id('L'), DATA: data, BANCO: banco, 'DESCRIÇÃO': desc, GRUPO: grupo, TIPO: tipo, VALOR: valor, CATEGORIA: cat, 'SUB-CATEGORIA': sub, STATUS: 'Pago', PARCELA: '', OBS: '' }, extra);
const ext = [];
for (let m = 3; m <= 10; m++) {
  const mm = `2026-${String(m).padStart(2, '0')}`;
  ext.push(L(`${mm}-05`, 'Nubank', 'Salário', 'Renda', 'conta', 3200, 'Salário CLT', 'Salário'));
  ext.push(L(`${mm}-12`, 'PicPay', 'Cliente Exemplo - casamento', 'Renda', 'conta', 1500 + m * 50, 'Darzan Produções', 'Casamento'));
  ext.push(L(`${mm}-18`, 'PicPay', 'JPL SOM evento', 'Renda', 'conta', 400, 'JPL SOM', 'Serviço'));
  ext.push(L(`${mm}-07`, 'Nubank', 'Gasolina', 'Necessidades', 'conta', -180 - m, 'Transporte', 'Gasolina'));
  ext.push(L(`${mm}-09`, 'Nubank', 'Mercado', 'Necessidades', 'conta', -320, 'Alimentação', 'Mercado'));
  ext.push(L(`${mm}-14`, 'Mercado Pago', 'iFood', 'Desejos', 'cartão', -64.9, 'Alimentação fora', 'iFood'));
  ext.push(L(`${mm}-15`, 'PicPay', 'Netflix', 'Desejos', 'conta', -22.45, 'Assinaturas', 'Streaming', { OBS: 'Fixa · débito automático' }));
  ext.push(L(`${mm}-20`, 'Nubank', 'Guardar reserva', 'Guardado', 'conta', -500, 'Guardado', 'Caixinha', { OBS: 'Para Caixinha Reserva' }));
}
ext.push(L('2026-10-27', 'Nubank', 'Seguro do carro', 'Necessidades', 'conta', -115, 'Transporte', 'Seguro', { STATUS: 'Previsto', OBS: 'Fixa' }));
ext.push(L('2026-10-29', 'Inter', 'Conta de luz', 'Necessidades', 'conta', -140, 'Casa', 'Contas', { STATUS: 'Previsto' }));
/* compra parcelada no cartão: 3x */
const P = 'P0900';
['2026-09-20', '2026-10-20', '2026-11-20'].forEach((d, i) => ext.push(L(d, 'Mercado Pago', 'Microfone exemplo', 'Necessidades', 'cartão', -150, 'Trabalho', 'Equipamentos', { PARCELA: `${i + 1}/3`, STATUS: i < 2 ? 'Pago' : 'Previsto', OBS: `Compra ${P} · feita em 18/09/2026` })));
const dados = {
  app: 'Darzan Finanças', versao: 1, exemplo: true,
  abas: {
    EXTRATO: ext,
    CONTAS: [
      { ID: 'C1', BANCO: 'Nubank', CONTA: 'Conta', 'SALDO CONFERIDO': 1200, 'DATA DA CONFERÊNCIA': '2026-10-01', 'PARA QUÊ': 'Dia a dia', OBS: '' },
      { ID: 'C2', BANCO: 'Nubank', CONTA: 'Caixinha Reserva', 'SALDO CONFERIDO': 5000, 'DATA DA CONFERÊNCIA': '2026-10-01', 'PARA QUÊ': 'Reserva', OBS: '' },
      { ID: 'C3', BANCO: 'PicPay', CONTA: 'Conta', 'SALDO CONFERIDO': '', 'DATA DA CONFERÊNCIA': '', 'PARA QUÊ': '', OBS: '' },
      { ID: 'C4', BANCO: 'Inter', CONTA: 'Conta', 'SALDO CONFERIDO': 300, 'DATA DA CONFERÊNCIA': '2026-10-01', 'PARA QUÊ': '', OBS: '' },
    ],
    CARTOES: [
      { ID: 'K1', 'CARTÃO': 'Nubank', LIMITE: 5000, 'FECHA DIA': 7, 'VENCE DIA': 14, 'PAGA PELA CONTA': 'Nubank · Conta', OBS: '' },
      { ID: 'K2', 'CARTÃO': 'Mercado Pago', LIMITE: 3000, 'FECHA DIA': 16, 'VENCE DIA': '', 'PAGA PELA CONTA': 'Mercado Pago · Conta', OBS: '' },
      { ID: 'K3', 'CARTÃO': 'Inter', LIMITE: 2000, 'FECHA DIA': 25, 'VENCE DIA': 2, 'PAGA PELA CONTA': 'Inter · Conta', OBS: '' },
    ],
    PARCELADOS: [{ ID: P, 'DATA DA COMPRA': '2026-09-18', 'DESCRIÇÃO': 'Microfone exemplo', 'CARTÃO': 'Mercado Pago', 'VALOR TOTAL': 450, PARCELAS: 3, 'VALOR DA PARCELA': 150, '1ª PARCELA': 'Set/26', CATEGORIA: 'Trabalho', 'SUB-CATEGORIA': 'Equipamentos' }],
    FIXAS: [
      { ID: 'F1', 'DESCRIÇÃO': 'Netflix', VALOR: 22.45, DIA: 15, BANCO: 'PicPay', TIPO: 'débito automático', GRUPO: 'Desejos', CATEGORIA: 'Assinaturas', 'SUB-CATEGORIA': 'Streaming', ATIVA: 'Sim', OBS: '' },
      { ID: 'F2', 'DESCRIÇÃO': 'Seguro do carro', VALOR: 115, DIA: 27, BANCO: 'Nubank', TIPO: 'conta', GRUPO: 'Necessidades', CATEGORIA: 'Transporte', 'SUB-CATEGORIA': 'Seguro', ATIVA: 'Sim', OBS: '' },
    ],
    EQUIPAMENTOS: [
      { ID: 'E1', NOME: 'Câmera exemplo', TIPO: 'Câmera', VALOR: 4000, 'DATA DA COMPRA': '2026-03-10', 'COMO PAGOU': 'Já tinha', ESTADO: 'Semi-novo', 'Nº DE SÉRIE': '', OBS: '', FOTO: '' },
      { ID: 'E2', NOME: 'Microfone exemplo', TIPO: 'Áudio', VALOR: 450, 'DATA DA COMPRA': '2026-09-18', 'COMO PAGOU': '3x no Mercado Pago', ESTADO: 'Novo', 'Nº DE SÉRIE': '', OBS: `Compra ${P}`, FOTO: '' },
    ],
    TRABALHOS: [
      { ID: 'J1', CLIENTE: 'Cliente Exemplo', 'TIPO DE EVENTO': 'Casamento', 'DATA DO EVENTO': '2026-12-12', LOCAL: 'Campinas', 'O QUE FOI FECHADO': 'Filme + teaser', 'VALOR TOTAL': 20000, ENTREGA: '', ETAPA: 'Fechado', TELEFONE: '', CONTRATO: '', OBS: '' },
    ],
    TAREFAS: [
      { ID: 'T1', TAREFA: 'Mandar orçamento', DATA: '2026-10-28', VALOR: '', TIPO: 'Darzan', FEITA: false, OBS: '' },
    ],
    METAS: [{ ID: 'M1', META: 'Viagem', 'VALOR ALVO': 7000, 'JÁ GUARDADO': 1000, 'ONDE ESTÁ': 'Nubank', PRAZO: '2027-06-30', OBS: '' }],
    CATEGORIAS: CATS.flatMap(([c, subs, g]) => subs.map(s => ({ ID: id('G'), CATEGORIA: c, 'SUB-CATEGORIA': s, GRUPO: g }))),
  },
};
fs.writeFileSync(path.resolve(__dirname, '../testes/dados-exemplo.json'), JSON.stringify(dados, null, 1));
console.log('ok', Object.entries(dados.abas).map(([k, v]) => `${k}:${v.length}`).join(' '));
