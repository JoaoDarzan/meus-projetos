/* Etapa 7 · Bancos: conferir saldo, criar caixinha */
const { HOJE, calmo, clica, igual, certo } = require('../ajuda');
module.exports = { etapa: 'Bancos', testes: [
  ['conferir saldo do banco bate com o que foi digitado', async (st, abrir) => {
    const p = await abrir();
    await clica(p, '#view [data-a=irBancos]');
    await clica(p, '[data-a=conferir][data-v="Nubank"]');
    await p.locator('#s2 input.num').first().fill('1234,56'); await clica(p, '#s2 .save'); await calmo(p);
    const conta = st.linhas('contas').find(x => x.banco === 'Nubank' && x.conta === 'Conta');
    igual(conta.saldo_conferido, 1234.56, 'saldo no Supabase'); certo(conta.data_da_conferencia === HOJE, 'data da conferência');
    igual(await p.evaluate(() => A.c.saldo(A.c.contas().find(x => x['BANCO'] === 'Nubank' && x['CONTA'] === 'Conta'))), 1234.56, 'saldo no app');
  }],
  ['criar uma caixinha nova com saldo', async (st, abrir) => {
    const p = await abrir();
    await clica(p, '#view [data-a=irBancos]');
    await clica(p, '[data-a=novaCx][data-v="Inter"]');
    await p.fill('#xN', 'Viagem teste'); await p.fill('#xV', '500'); await clica(p, '#s2 .save'); await calmo(p);
    const cx = st.linhas('contas').find(x => x.conta === 'Caixinha Viagem teste');
    certo(cx && cx.banco === 'Inter' && cx.saldo_conferido === 500, 'caixinha: ' + JSON.stringify(cx));
  }],
] };
