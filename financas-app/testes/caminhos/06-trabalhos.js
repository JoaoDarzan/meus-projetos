/* Etapa 6 · Trabalhos: criar, abrir o cliente, registrar recebimento, quanto falta, mudar de etapa */
const { calmo, clica, ir, igual, certo } = require('../ajuda');
module.exports = { etapa: 'Trabalhos', testes: [
  ['criar, registrar recebimento, ver quanto falta e mudar de etapa', async (st, abrir) => {
    const p = await abrir();
    await ir(p, 'trabalhos'); await clica(p, '#view [data-a=novoJ]');
    await p.fill('#jC', 'Teste Ana e Bia'); await p.fill('#jV', '3000'); await clica(p, '#s2 [data-a=etapaJ][data-v="Fechado"]');
    await p.fill('#jD', '2026-12-12');
    await clica(p, '#s2 .save'); await calmo(p);
    const J = st.linhas('trabalhos').find(r => r.cliente === 'Teste Ana e Bia');
    certo(J && J.valor_total === 3000 && J.data_do_evento === '2026-12-12', 'não criou certo: ' + JSON.stringify(J));
    await clica(p, `[data-a=editJ][data-id="${J.id}"]`);
    await p.fill('#rV', '1000'); await p.fill('#rD', 'sinal'); await clica(p, '#s2 [data-a=receber]'); await calmo(p);
    const R = st.linhas('extrato').find(r => r.descricao === 'Teste Ana e Bia - sinal');
    certo(R && R.grupo === 'Renda' && R.valor === 1000 && R.categoria === 'Darzan Produções', 'recebimento');
    igual(await p.evaluate(id => A.c.faltaReceber(A.db.achar('TRABALHOS', id)), J.id), 2000, 'falta receber');
    await clica(p, '#s2 [data-a=etapaJ][data-v="Entregue"]'); await clica(p, '#s2 .save'); await calmo(p);
    certo(st.linhas('trabalhos').find(r => r.id === J.id).etapa === 'Entregue', 'etapa não mudou');
  }],
] };
