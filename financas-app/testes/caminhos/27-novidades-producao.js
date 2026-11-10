/* Etapa 27 · Pedidos de novembro: sininho com o que o robô do banco trouxe, produção do recorrente (vídeos e captações),
   equipamentos com quanto paguei e quanto vale hoje, e o calendário com o mês dentro dele. Valores inventados. */
const { HOJE, calmo, clica, certo, igual, conferirLayout } = require('../ajuda');
const m0 = HOJE.slice(0, 7);
const addDias = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const mesmo = (a, b, msg) => certo(a === b, `${msg}: esperava ${b}, veio ${a}`);
const L = (id, extra) => Object.assign({ id, user_id: 'u-joao', data: HOJE, banco: 'Nubank', descricao: id, grupo: 'Desejos', tipo: 'conta', valor: -10, categoria: 'Lazer', subcategoria: 'Passeios e cinema', status: 'Pago', parcela: null, obs: null }, extra);
const of = n => `a1b2c3d4-0000-4000-8000-00000000000${n}`;
const ir = (p, view, extra) => p.evaluate(([v, x]) => { A.ui.view = v; Object.assign(A.ui, x || {}); A.render(false); }, [view, extra]);
module.exports = { etapa: 'Novidades, produção e equipamentos', testes: [
  ['sininho: conta o que o robô trouxe de novo (entrou e saiu), abre a lista e, depois de ver, zera; o que chegar depois aparece de novo', async (st, abrir) => {
    st.tabelas.extrato.push(L('LOF-' + of(1), { descricao: 'Padaria Teste', valor: -45, obs: `Open Finance · OF ${of(1)} · conferir` }),
      L('LPIX-TESTE', { descricao: 'Pix Teste Recebido', valor: 500, grupo: 'Renda', categoria: 'Renda', subcategoria: 'Pix', obs: `Cliente · OF ${of(2)}` }),
      L('LOFP-' + of(3), { descricao: 'Prévia escondida', valor: -99, status: 'Cancelado', obs: `OF ${of(3)}` }),
      L('LOF-' + of(4), { descricao: 'Mercado Antigo', valor: -80, data: addDias(HOJE, -20), obs: `Open Finance · OF ${of(4)}` }));
    const p = await abrir({ aparelho: 'iphone-15' });
    mesmo(await p.textContent('#view .bell .cnt'), '2', 'sininho com 2 novidades (a escondida e a antiga não contam)');
    await clica(p, '#view .bell');
    await p.waitForSelector('#s2 .novas');
    const t = await p.textContent('#s2 .novas');
    certo(/Padaria Teste/.test(t) && /Pix Teste Recebido/.test(t) && !/Prévia escondida/.test(t) && !/Mercado Antigo/.test(t), 'lista as 2 novas: ' + t.slice(0, 200));
    certo(/R\$ 500,00/.test(await p.textContent('#s2 .nvk')) && /R\$ 45,00/.test(await p.textContent('#s2 .nvk')), 'mostra quanto entrou e saiu');
    certo(/Mercado Antigo/.test(await p.textContent('#s2 details')), 'a antiga fica em "Já vistas"');
    await conferirLayout(p, 'novidades do banco');
    await clica(p, '#s2 [data-a=fechar]');
    certo(!(await p.$('#view .bell .cnt')), 'depois de ver, o sininho zera');
    st.tabelas.extrato.push(L('LOF-' + of(5), { descricao: 'Posto Teste', valor: -120, obs: `Open Finance · OF ${of(5)} · conferir` }));
    await p.reload(); await p.waitForSelector('#view .bell'); await calmo(p);
    mesmo(await p.textContent('#view .bell .cnt'), '1', 'chegou mais uma: o sininho mostra só ela');
  }],
  ['recorrente: cada pagamento que caiu aparece na produção; tocar nele marca quantos vídeos e captações foram e os dias trabalhados', async (st, abrir) => {
    st.tabelas.trabalhos.push({ id: 'JREC', user_id: 'u-joao', cliente: 'Cliente Rec Teste', tipo_de_evento: 'Social media', data_do_evento: null, local: null, o_que_foi_fechado: 'Vídeos do mês', valor_total: null, entrega: null, etapa: 'Recorrente',
      telefone: null, contrato: null, obs: null, briefing: null, entregas: null, parcela_mensal: null, dia_da_parcela: null, crm: '{}' });
    st.tabelas.extrato.push(L('LREC-1', { descricao: 'Pix Cliente Rec Teste', valor: 400, grupo: 'Renda', categoria: 'Darzan Produções', subcategoria: 'Social media', obs: 'Trabalho JREC' }));
    const d1 = addDias(HOJE, -3), d2 = addDias(HOJE, -2);
    st.tabelas.dias.push({ id: 'WTESTE1', user_id: 'u-joao', data: d1, empresa: 'Darzan Produções', o_que_foi: 'Captação teste', valor: 200, pagamento: null, obs: null },
      { id: 'WTESTE2', user_id: 'u-joao', data: d2, empresa: 'Darzan Produções', o_que_foi: 'Vídeos teste', valor: 0, pagamento: null, obs: null });
    const p = await abrir({ aparelho: 'iphone-15' });
    await ir(p, 'trabalhos', { jseg: 'recorrentes' }); await p.waitForSelector('#view .prod');
    certo(!(await p.$('#view [data-a=prodMais]')), 'não tem mais o + e − de vídeo e captação');
    certo(/Toque para dizer o que foi/.test(await p.textContent('#view .ppag')) && /R\$ 400,00/.test(await p.textContent('#view .ppag')), 'o Pix que caiu aparece para marcar');
    await clica(p, '#view [data-a=prodPag][data-id=LREC-1]');
    await p.fill('#s2 #ppV', '2'); await p.fill('#s2 #ppC', '1');
    certo(/R\$ 400,00 · bate com o Pix/.test(await p.textContent('#s2 #ppT')), '2 × 100 + 1 × 200 bate com o Pix: ' + await p.textContent('#s2 #ppT'));
    await p.check('#s2 .ppdias input[value=WTESTE1]'); await p.check('#s2 .ppdias input[value=WTESTE2]');
    await clica(p, '#s2 .save'); await calmo(p);
    certo(/Prod v=2 c=1/.test(st.linhas('extrato').find(l => l.id === 'LREC-1').obs) && /Trabalho JREC/.test(st.linhas('extrato').find(l => l.id === 'LREC-1').obs), 'gravou no pagamento (e manteve o que já tinha)');
    certo(st.linhas('dias').filter(d => d.pagamento === 'LREC-1').length === 2, 'os 2 dias ficaram ligados ao pagamento');
    const k = (await p.textContent('#view .prod .kpis')).replace(/\s+/g, ' ');
    certo(/Vídeos\s*2/.test(k) && /Captações\s*1/.test(k) && /R\$ 400(?!,\d)/.test(k), 'o mês mostra 2 vídeos, 1 captação e o que entrou: ' + k);
    certo(new RegExp('2 vídeos · 1 captação.*dias ' + d1.slice(8) + '/').test(await p.textContent('#view .ppag')), 'o pagamento mostra o que foi e os dias');
    await conferirLayout(p, 'produção do recorrente');
  }],
  ['equipamentos: quanto paguei e quanto vale hoje (estimado ou anotado); anotar o valor de hoje guarda sem perder as anotações', async (st, abrir) => {
    const E = (id, x) => Object.assign({ id, user_id: 'u-joao', nome: id, tipo: 'Câmera', valor: 1000, data_da_compra: addDias(HOJE, -365), como_pagou: 'Já tinha', estado: 'Usado', numero_de_serie: null, obs: null, foto: null }, x);
    st.tabelas.equipamentos.push(E('ETESTE1', { nome: 'Camera Teste Um', obs: 'guardada na case' }), E('ETESTE2', { nome: 'Lente Teste Dois', obs: `Vale hoje 700 em ${HOJE}` }));
    const p = await abrir({ aparelho: 'iphone-15' });
    await ir(p, 'equip'); await p.waitForSelector('#view .eq');
    const um = await p.textContent('#view .eq[data-id=ETESTE1]'), dois = await p.textContent('#view .eq[data-id=ETESTE2]');
    certo(/Paguei/.test(um) && /R\$ 1\.000,00/.test(um) && /estimado/.test(um) && /R\$ 80\d,\d\d/.test(um), 'estimado: perde uns 20% em 1 ano: ' + um);
    certo(/R\$ 700,00/.test(dois) && !/estimado/.test(dois) && /perdeu 30%/.test(dois), 'anotado: R$ 700 (perdeu 30%): ' + dois);
    certo(/Vale hoje/.test(await p.textContent('#view .kpis')), 'o total do que vale hoje aparece em cima');
    await conferirLayout(p, 'equipamentos com valor de hoje');
    await clica(p, '#view .eq[data-id=ETESTE1]'); await p.waitForSelector('#s2 #eVh');
    certo(/estimado/.test(await p.getAttribute('#s2 #eVh', 'placeholder')), 'o campo mostra a estimativa');
    await p.fill('#s2 #eVh', '900'); await clica(p, '#s2 .save'); await calmo(p);
    const obs = st.linhas('equipamentos').find(e => e.id === 'ETESTE1').obs;
    certo(obs.includes(`Vale hoje 900 em ${HOJE}`) && obs.includes('guardada na case'), 'guardou o valor e as anotações: ' + obs);
    certo(/R\$ 900,00/.test(await p.textContent('#view .eq[data-id=ETESTE1]')) && !/estimado/.test(await p.textContent('#view .eq[data-id=ETESTE1]')), 'o cartão mostra R$ 900');
  }],
  ['calendário: o mês fica dentro do calendário (trocar e voltar para hoje), com fim de semana e o valor do dia', async (st, abrir) => {
    const p = await abrir({ aparelho: 'iphone-15' });
    await ir(p, 'trabalhos', { jseg: 'calendario' }); await p.waitForSelector('#view .calh');
    const ms = await p.evaluate(() => A.c.meses()), i = ms.indexOf(m0);
    certo(await p.$$eval('#view .cal .cd.fds', x => x.length) >= 8, 'sábados e domingos marcados');
    if (i > 0) {
      await clica(p, '#view .calh [data-d="-1"]'); await calmo(p);
      mesmo(await p.evaluate(() => A.ui.mes), ms[i - 1], 'a seta volta um mês');
      await clica(p, '#view .calh [data-a=irMes]'); await calmo(p);
      mesmo(await p.evaluate(() => A.ui.mes), m0, '"Hoje" volta para o mês atual');
    }
    await conferirLayout(p, 'calendário novo');
  }],
] };
