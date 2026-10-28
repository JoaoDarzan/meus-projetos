/* Etapa 4 · Cartões e tarefas: pagar conta, pagar fatura, desfazer, dia de vencimento do cartão */
const { calmo, clica, ir, igual, certo } = require('../ajuda');
module.exports = { etapa: 'Cartões e tarefas', testes: [
  ['tarefa de conta: marcar como paga e desfazer', async (st, abrir) => {
    const p = await abrir();
    await ir(p, 'tarefas');
    const id = await p.evaluate(() => (A.c.tarefas().find(t => t.id.startsWith('l:') && !t.feita) || {}).id);
    certo(id, 'nenhuma conta prevista');
    await clica(p, `[data-a=tarefa][data-id="${id}"]`); await calmo(p);
    let r = st.linhas('extrato').find(x => x.id === id.slice(2));
    certo(r.status === 'Pago' && /Pago pelo app/.test(r.obs), 'não marcou: ' + r.status);
    await p.waitForTimeout(400);
    await clica(p, `.tk.ok [data-a=tarefa][data-id="${id}"].undo`); await calmo(p);
    r = st.linhas('extrato').find(x => x.id === id.slice(2));
    certo(r.status === 'Previsto' && !/pelo app/.test(r.obs || ''), 'desfazer: ' + r.status + ' ' + r.obs);
  }],
  ['pagar fatura cria a transferência do banco e desfazer apaga', async (st, abrir) => {
    const p = await abrir();
    await ir(p, 'tarefas');
    const t = await p.evaluate(() => A.c.tarefas().find(t => t.id.startsWith('f:') && !t.feita));
    certo(t, 'nenhuma fatura');
    const [, nome, m] = t.id.split(':');
    await clica(p, `[data-a=tarefa][data-id="${t.id}"]`); await calmo(p);
    const r = st.linhas('extrato').filter(x => String(x.obs).indexOf(`Fatura ${nome} ${m}`) === 0);
    certo(r.length === 1 && r[0].grupo === 'Transferência', 'transferência');
    igual(r[0].valor, -t.valor, 'valor');
    await p.waitForTimeout(400);
    await clica(p, `.tk.ok [data-a=tarefa][data-id="${t.id}"].undo`); await calmo(p);
    certo(!st.linhas('extrato').some(x => String(x.obs).indexOf(`Fatura ${nome} ${m}`) === 0), 'não apagou');
  }],
  ['preencher o dia de vencimento do cartão tira o "estimado" da fatura', async (st, abrir) => {
    const p = await abrir();
    const k = await p.evaluate(() => A.c.cartoes().find(k => !k['VENCE DIA']) || A.c.cartoes()[0]);
    await p.evaluate(n => { A.ui.view = 'fin'; A.ui.fseg = 'cartoes'; A.ui.cartao = n; A.render(false); }, k['CARTÃO']);
    await clica(p, `[data-a=editK][data-v="${k['CARTÃO']}"]`);
    await p.fill('#kV', '10'); await clica(p, '#s2 .save'); await calmo(p);
    certo(st.linhas('cartoes').find(x => x.cartao === k['CARTÃO']).vence_dia === 10, 'vencimento não salvou');
    const v = await p.evaluate(n => A.c.vence(n, A.u.mes(A.u.hoje())), k['CARTÃO']);
    certo(!v.estimado && v.data.endsWith('-10'), 'vencimento: ' + JSON.stringify(v));
  }],
  ['contas fixas: total por mês (anual dividido por 12), criar, desligar; anual e parcelado não viram lançamento', async (st, abrir) => {
    const p = await abrir();
    await p.evaluate(() => { A.ui.view = 'fin'; A.ui.fseg = 'fixas'; A.render(false); });
    const antes = await p.evaluate(() => A.c.totalFixas());
    const nova = async (d, v, dia, tipo) => {
      await clica(p, '#view [data-a=novoF]');
      await p.fill('#xD', d); await p.fill('#xV', v); await p.fill('#xDia', dia); await p.selectOption('#xT', tipo);
      await clica(p, '#s2 .save'); await calmo(p);
    };
    await nova('Teste Claude', '110', '13', 'cartão');
    await nova('Teste CapCut', '120', '19', 'anual');
    await nova('Teste Canva', '24,16', '22', 'parcelado');
    igual(await p.evaluate(() => A.c.totalFixas()), antes + 110 + 10 + 24.16, 'total por mês (anual / 12)');
    const lancs = d => st.linhas('extrato').filter(l => l.descricao === d).length;
    certo(lancs('Teste Claude') === 2, 'cartão vira lançamento no mês e no próximo: ' + lancs('Teste Claude'));
    certo(lancs('Teste CapCut') === 0 && lancs('Teste Canva') === 0, 'anual e parcelado não viram lançamento');
    certo(/Teste Claude/.test(await p.textContent('#view')) && /R\$\s?10,00/.test(await p.textContent('#view')), 'a aba mostra as contas e o anual por mês');
    const f = st.linhas('fixas').find(x => x.descricao === 'Teste Claude');
    await clica(p, `[data-a=editF][data-id="${f.id}"]`);
    await p.uncheck('#xA'); await clica(p, '#s2 .save'); await calmo(p);
    igual(await p.evaluate(() => A.c.totalFixas()), antes + 10 + 24.16, 'desligada sai do total');
    certo(st.linhas('fixas').find(x => x.id === f.id).ativa === 'Não', 'desligar salvou');
  }],
  ['a fatura tem o nome do mês em que vence (Nubank fecha 31 e vence 7, Inter fecha 18 e vence 25, Mercado Pago fecha 11 e vence 16)', async (st, abrir) => {
    const p = await abrir();
    const r = await p.evaluate(() => {
      A.db.abas.CARTOES = [{ ID: 'KN', 'CARTÃO': 'NuT', 'FECHA DIA': 31, 'VENCE DIA': 7 }, { ID: 'KI', 'CARTÃO': 'InT', 'FECHA DIA': 18, 'VENCE DIA': 25 }, { ID: 'KM', 'CARTÃO': 'MpT', 'FECHA DIA': 11, 'VENCE DIA': 16 }];
      const f = (d, n) => { const m = A.c.faturaDe(d, n); return m + ' ' + A.c.vence(n, m).data; };
      return [f('2026-10-28', 'NuT'), f('2026-10-02', 'NuT'), f('2026-10-10', 'InT'), f('2026-10-20', 'InT'), f('2026-07-13', 'MpT'), f('2026-08-11', 'MpT')];
    });
    const certoR = ['2026-11 2026-11-07', '2026-11 2026-11-07', '2026-10 2026-10-25', '2026-11 2026-11-25', '2026-08 2026-08-16', '2026-08 2026-08-16'];
    certo(JSON.stringify(r) === JSON.stringify(certoR), 'faturas: ' + JSON.stringify(r));
  }],
] };
