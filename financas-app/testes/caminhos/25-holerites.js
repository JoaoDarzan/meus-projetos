/* Etapa 25 · Holerites detalhados: o Claude lança o salário e guarda o holerite inteiro (tabela holerites; o João manda a foto
   na conversa, não há botão de foto no app); no Meu trabalho, tocar num holerite abre tudo detalhado. Valores e empresa inventados. */
const { HOJE, clica, certo, conferirLayout } = require('../ajuda');
const addDias = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const m0 = HOJE.slice(0, 7);
const I = (descricao, vencimento, desconto = null, referencia = '') => ({ codigo: '1', descricao, referencia, vencimento, desconto });
const HOLERITE = (extra = {}) => Object.assign({
  empresa: 'Empresa Exemplo Ltda', competencia_mes: 9, competencia_ano: 2026,
  itens: [I('Salario', 2000, null, '30,00'), I('D.S.R. Sobre Horas Extras', 10), I('Horas Extras 60%', 40, null, '2,50'), I('Vale Refeicao', 400), I('Passe', 150),
    I('Bonificacao', 500), I('Adicional Noturno', 5, null, '0,50'), I('INSS Sobre Salario', null, 160, '9,00'), I('IRRF Sobre Salario', null, 20), I('Arredondamento Anterior', null, 0.5)],
  total_vencimentos: 3105, total_descontos: 180.5, liquido: 2924.5, salario_base: 2000, fgts_mes: 160, base_inss: 2555,
}, extra);
const irMeuTrabalho = async p => { await p.evaluate(() => { Object.assign(A.ui, { view: 'fin', fseg: 'relatorios', rseg: 'clt' }); A.render(false); }); await p.waitForSelector('#view .kpis'); };

module.exports = { etapa: 'Holerites detalhados', testes: [
  ['tocar num holerite abre tudo detalhado: como entrou na conta, cada vencimento e desconto com a referência, horas, bases e FGTS; salário que ainda vai cair aparece como "a receber"', async (st, abrir) => {
    st.tabelas.extrato = st.tabelas.extrato.filter(l => l.categoria !== 'Salário CLT');
    const L = (m, k, valor, sub, desc, status = 'Pago', data = m + '-06') => ({ id: `LCLT-${m}-${k}`, user_id: 'u-joao', data, banco: 'Inter', descricao: desc, grupo: 'Renda', tipo: 'conta', valor, categoria: 'Salário CLT', subcategoria: sub, status, parcela: '', obs: 'holerite' });
    const ant = addDias(HOJE, -40).slice(0, 7), prox = HOJE; /* cai hoje, ainda não confirmado */
    st.tabelas.extrato.push(L(ant, 'SAL', 1800, 'Salário', 'Salário (anterior)'), L(ant, 'VR', 400, 'Vale-refeição', 'Vale-refeição (anterior)'),
      L(m0, 'SAL', 1824.5, 'Salário', 'Salário (setembro)', 'Previsto', prox), L(m0, 'VR', 400, 'Vale-refeição', 'Vale-refeição (setembro)', 'Previsto', prox), L(m0, 'VT', 150, 'Vale-transporte', 'Vale-transporte (setembro)', 'Previsto', prox),
      L(m0, 'BON', 500, 'Bonificação', 'Bonificação (setembro)', 'Previsto', prox), L(m0, 'HE', 50, 'Horas extras', 'Horas extras (setembro) · 2,5 h', 'Previsto', prox));
    const h = HOLERITE();
    st.tabelas.holerites.push({ id: 'H2026-09', user_id: 'u-joao', competencia: '2026-09', empresa: 'Empresa Exemplo Ltda', pagamento: prox, banco: 'Inter', liquido: 2924.5,
      dados: JSON.stringify(Object.assign({}, h, { base_fgts: 2555, base_irrf: 2555, faixa_irrf: 7.5 })) });
    const p = await abrir({ aparelho: 'iphone-15' });
    await irMeuTrabalho(p);
    certo(/a receber/.test(await p.textContent('#view .sub')) && /2\.924/.test(await p.textContent('#view .bignum')), 'o último salário é o que vai cair, marcado "a receber"');
    certo(/Recebido no ano\s*R\$ 2\.200,00/.test((await p.textContent('#view .kpis')).replace(/\s+/g, ' ')), 'recebido no ano só conta o que já caiu: ' + await p.textContent('#view .kpis'));
    await clica(p, `#view [data-a=verHolerite][data-v="${m0}"]`); await p.waitForSelector('#s2 #hVenc');
    const txt = sel => p.textContent(sel).then(t => t.replace(/\s+/g, ' '));
    const venc = await txt('#s2 #hVenc'), desc = await txt('#s2 #hDesc'), horas = await txt('#s2 #hHoras'), bases = await txt('#s2 #hBases'), partes = await txt('#s2 #hPartes');
    certo(/Holerite de setembro\/2026/.test(await txt('#s2 h3')) && /Empresa Exemplo/.test(await txt('#s2')) && /cai em/.test(await txt('#s2')), 'título, empresa e quando cai');
    certo(/Salário.*30 dias.*R\$ 2\.000,00/.test(venc) && /Horas extras 60%.*2,5 h.*R\$ 40,00/.test(venc) && /DSR sobre horas extras.*descanso semanal.*R\$ 10,00/.test(venc) && /Passe.*vale-transporte.*R\$ 150,00/.test(venc) && /Total de vencimentos\s*R\$ 3\.105,00/.test(venc), 'cada vencimento com referência e explicação: ' + venc);
    certo(/INSS sobre salário.*9%.*R\$ 160,00/.test(desc) && /IRRF sobre salário.*imposto de renda.*R\$ 20,00/.test(desc) && /Total de descontos\s*R\$ 180,50/.test(desc), 'descontos: ' + desc);
    certo(/Dias de salário\s*30 dias/.test(horas) && /Horas extras 60%.*2,5 h/.test(horas) && /Horas à noite.*0,5 h/.test(horas), 'horas e dias: ' + horas);
    certo(/Salário base \(contrato\)\s*R\$ 2\.000,00/.test(bases) && /FGTS do mês.*R\$ 160,00/.test(bases) && /Faixa do imposto de renda\s*7,5%/.test(bases), 'bases e FGTS: ' + bases);
    certo(/Salário \(setembro\).*R\$ 1\.824,50/.test(partes) && /Bonificação \(setembro\).*R\$ 500,00/.test(partes) && /a receber/.test(partes), 'como entra na conta: ' + partes);
    certo(/\+ R\$ 724,50 que no mês anterior/.test(await txt('#s2')), 'compara com o mês anterior');
    await conferirLayout(p, 'holerite detalhado');
    await clica(p, '#s2 [data-a=fechar]');
    await clica(p, `#view [data-a=verHolerite][data-v="${ant}"]`); await p.waitForSelector('#s2 #hPartes');
    certo(/não tem o holerite guardado item por item/.test(await txt('#s2')) && /Salário \(anterior\)/.test(await txt('#s2 #hPartes')), 'mês sem holerite guardado: mostra o que entrou e pede a foto');
  }],
  ['sem a tabela dos holerites no Supabase: avisa o passo e o Meu trabalho continua funcionando; não existe botão de foto do holerite', async (st, abrir) => {
    st.semTabela('holerites');
    const p = await abrir({ aparelho: 'iphone-15' });
    await irMeuTrabalho(p);
    certo(/atualizacao-holerites\.sql/.test(await p.textContent('#view')), 'mostra o arquivo para rodar');
    certo(!(await p.$('[data-a=holeriteFoto]')) && !/foto do holerite/i.test(await p.textContent('#view')), 'o botão da foto saiu (o João manda a foto na conversa)');
    await clica(p, '#view [data-a=verHolerite]'); await p.waitForSelector('#s2 #hPartes');
    certo(/Mande a foto dele para o Claude na conversa/.test(await p.textContent('#s2')) && !(await p.$('#s2 [data-a=holeriteFoto]')), 'sem holerite guardado: explica como mandar, sem botão');
  }],
] };
