/* Etapa 16 · Meu trabalho (CLT): o salário separado em partes vira o relatório de desempenho (valores inventados) */
const { calmo, certo, igual, conferirLayout } = require('../ajuda');
const L = (id, data, desc, valor, sub, obs = '') => ({ id, user_id: 'u-joao', data, banco: 'Inter', descricao: desc, grupo: 'Renda', tipo: 'conta', valor, categoria: 'Salário CLT', subcategoria: sub, status: 'Pago', parcela: '', obs });
const HOLERITES = [
  L('LT-0C', '2026-07-14', 'Comissão', 900, 'Comissão'), // pagamento fora do holerite: não entra na comparação dos bônus
  L('LT-1S', '2026-08-05', 'Salário (julho)', 1800, 'Salário', 'Holerite de julho/2026 · bruto R$ 2.400,00 · INSS R$ 200,00 · líquido R$ 2.200,00 · FGTS R$ 160,00 · salário base R$ 2.000,00'),
  L('LT-1T', '2026-08-05', 'Vale-transporte (julho)', 150, 'Vale-transporte', 'holerite da empresa'),
  L('LT-1R', '2026-08-05', 'Vale-refeição (julho)', 250, 'Vale-refeição'),
  L('LT-2S', '2026-09-05', 'Salário (agosto)', 2000, 'Salário', 'Holerite de agosto/2026 · bruto R$ 3.145,00 · INSS R$ 220,00 · líquido R$ 2.925,00 · FGTS R$ 176,00 · salário base R$ 2.200,00'),
  L('LT-2H', '2026-09-05', 'Horas extras (agosto) · 5 h', 75, 'Horas extras'),
  L('LT-2T', '2026-09-05', 'Vale-transporte (agosto)', 150, 'Vale-transporte'),
  L('LT-2R', '2026-09-05', 'Vale-refeição (agosto)', 250, 'Vale-refeição'),
  L('LT-2B', '2026-09-05', 'Bonificação (agosto)', 450, 'Bonificação', 'holerite da empresa'),
];

module.exports = { etapa: 'Meu trabalho', testes: [
  ['cada holerite separado em salário, horas extras, vales e bônus vira o relatório Meu trabalho', async (st, abrir) => {
    st.tabelas.extrato = st.tabelas.extrato.filter(l => l.categoria !== 'Salário CLT').concat(HOLERITES);
    const p = await abrir({ aparelho: 'iphone-15' });
    const ps = await p.evaluate(() => A.c.clt());
    igual(ps.length, 3, 'três pagamentos');
    const [, a, b] = ps;
    certo(a.liq === 2200 && a.fgts === 160 && a.base === 2000 && a.comp === 'julho/2026', 'julho: ' + JSON.stringify(a));
    certo(b.liq === 2925 && b.sal === 2000 && b.he === 75 && b.horas === 5 && b.ben === 400 && b.bon === 450 && b.inss === 220, 'agosto: ' + JSON.stringify(b));
    await p.evaluate(() => { A.ui.view = 'fin'; A.ui.fseg = 'relatorios'; A.ui.rseg = 'clt'; A.render(false); scrollTo(0, 0); });
    await p.waitForTimeout(500);
    const txt = (await p.textContent('#view')).replace(/\s+/g, ' ');
    certo(/Último salário \(agosto de 2026\)/i.test(txt), 'mostra o último salário');
    certo(/Aumento de salário em agosto de 2026: de R\$\s?2\.000 para R\$\s?2\.200 \(\+10%\)/i.test(txt), 'destaque do aumento: ' + txt.slice(0, 400));
    certo(/Bonificação em 2 meses: R\$\s?1\.350 no total\./.test(txt), 'destaque da bonificação, sem comparar com a comissão fora do holerite');
    certo(/Horas extras: 5 h em 1 mês/.test(txt) && /FGTS: a empresa já guardou R\$\s?336/.test(txt), 'horas extras e FGTS');
    certo(await p.$$eval('#chClt svg .col', g => g.length) === 3, 'gráfico com uma coluna por salário');
    await conferirLayout(p, 'Meu trabalho');
    await calmo(p);
  }],
] };
