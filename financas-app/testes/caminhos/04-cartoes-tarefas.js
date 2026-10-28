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
] };
