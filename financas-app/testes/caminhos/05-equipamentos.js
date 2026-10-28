/* Etapa 5 · Equipamentos: no cartão, à vista, "já tinha", mudar valor, excluir junto */
const { HOJE, calmo, clica, ir, resumo, igual, certo } = require('../ajuda');
const m0 = HOJE.slice(0, 7);
module.exports = { etapa: 'Equipamentos', testes: [
  ['no cartão: cadastrar, mudar valor e excluir junto com as parcelas', async (st, abrir) => {
    const p = await abrir();
    await ir(p, 'equip'); await clica(p, '#view [data-a=novoE]');
    await p.fill('#eN', 'Teste microfone'); await p.fill('#eV', '600');
    await clica(p, 'label[for=eF2]'); await p.selectOption('#eB', 'Inter'); await p.selectOption('#eP', '2');
    await clica(p, '#s2 .save'); await calmo(p);
    const E = st.linhas('equipamentos').find(r => r.nome === 'Teste microfone');
    certo(E && /Compra P/.test(E.obs), 'sem ligação com a compra');
    certo(st.linhas('extrato').filter(r => r.descricao === 'Teste microfone').length === 2, 'parcelas');
    await clica(p, `[data-a=editE][data-id="${E.id}"]`);
    await p.fill('#eV', '800'); await clica(p, '#s2 .save'); await calmo(p);
    igual(st.linhas('extrato').filter(r => r.descricao === 'Teste microfone').reduce((s, r) => s + r.valor, 0), -800, 'parcelas não acompanharam');
    await clica(p, `[data-a=editE][data-id="${E.id}"]`);
    await clica(p, '#s2 [data-a=apagarE]'); await clica(p, '#s2 [data-a=apagarE]'); await calmo(p);
    certo(!st.linhas('equipamentos').some(r => r.nome === 'Teste microfone'), 'equipamento ficou');
    certo(!st.linhas('extrato').some(r => r.descricao === 'Teste microfone'), 'parcelas ficaram');
  }],
  ['à vista: sai do banco no dia e excluir leva o lançamento junto', async (st, abrir) => {
    const p = await abrir();
    const antes = (await resumo(p, m0)).saiu;
    await ir(p, 'equip'); await clica(p, '#view [data-a=novoE]');
    await p.fill('#eN', 'Teste luz led'); await p.fill('#eV', '250');
    await clica(p, 'label[for=eF1]'); await p.selectOption('#eB', 'Nubank');
    await clica(p, '#s2 .save'); await calmo(p);
    const L = st.linhas('extrato').find(r => r.descricao === 'Teste luz led');
    certo(L && L.valor === -250 && L.banco === 'Nubank' && L.tipo === 'conta' && L.data === HOJE, 'lançamento à vista: ' + JSON.stringify(L));
    igual((await resumo(p, m0)).saiu, antes + 250, 'saiu do mês');
    const E = st.linhas('equipamentos').find(r => r.nome === 'Teste luz led');
    await clica(p, `[data-a=editE][data-id="${E.id}"]`);
    await clica(p, '#s2 [data-a=apagarE]'); await clica(p, '#s2 [data-a=apagarE]'); await calmo(p);
    certo(!st.linhas('extrato').some(r => r.descricao === 'Teste luz led'), 'lançamento ficou');
  }],
  ['"já tinha" só cataloga: não mexe no dinheiro', async (st, abrir) => {
    const p = await abrir();
    const n0 = st.linhas('extrato').length, antes = (await resumo(p, m0)).saiu;
    await ir(p, 'equip'); await clica(p, '#view [data-a=novoE]');
    await p.fill('#eN', 'Teste tripé'); await p.fill('#eV', '200');
    await clica(p, '#s2 .save'); await calmo(p);
    certo(st.linhas('equipamentos').some(r => r.nome === 'Teste tripé' && r.valor === 200), 'não cadastrou');
    certo(st.linhas('extrato').length === n0, 'criou lançamento');
    igual((await resumo(p, m0)).saiu, antes, 'saiu mudou');
  }],
] };
