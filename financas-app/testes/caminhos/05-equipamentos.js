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
  ['compra junta (câmera + lente): cada peça com o valor de mercado, o que paguei dividido na proporção e somado no total', async (st, abrir) => {
    const p = await abrir({ aparelho: 'iphone-15' });
    await ir(p, 'equip'); await clica(p, '#view [data-a=novoE]');
    await p.fill('#eN', 'Kit teste câmera e lente'); await p.fill('#eV', '5000');
    await clica(p, '#eAddPeca'); await p.fill('#ePecas .peca:nth-child(1) .pn', 'Câmera teste'); await p.fill('#ePecas .peca:nth-child(1) .pv', '4500');
    await clica(p, '#eAddPeca'); await p.fill('#ePecas .peca:nth-child(2) .pn', 'Lente teste'); await p.fill('#ePecas .peca:nth-child(2) .pv', '1500');
    const t = await p.textContent('#ePecasT');
    certo(/Câmera teste: paguei ≈ R\$\s3\.750,00 · vale R\$\s4\.500,00/.test(t) && /Lente teste: paguei ≈ R\$\s1\.250,00/.test(t) && /Vale hoje \(soma\): R\$\s6\.000,00/.test(t), 'divide o que pagou na proporção: ' + t);
    certo(await p.isDisabled('#eVh'), 'com peças, o "vale hoje" vem da soma');
    await clica(p, '#s2 .save'); await calmo(p);
    const E = st.linhas('equipamentos').find(r => r.nome === 'Kit teste câmera e lente');
    certo(E && /Peças: Câmera teste = 4500; Lente teste = 1500/.test(E.obs) && !/Vale hoje/.test(E.obs), 'gravou as peças: ' + (E && E.obs));
    const card = (await p.textContent(`#view .eq[data-id="${E.id}"]`)).replace(/\s+/g, ' ');
    certo(/Câmera teste\s*paguei R\$\s3\.750 · vale R\$\s4\.500/.test(card) && /valorizou 20%/.test(card), 'o card mostra cada peça e que valorizou: ' + card);
    const kp = await p.evaluate(() => A.c.valeHoje(A.db.achar('EQUIPAMENTOS', [...A.db.linhas('EQUIPAMENTOS')].find(e => e['NOME'] === 'Kit teste câmera e lente').ID)).v);
    igual(kp, 6000, 'o total "vale hoje" soma as peças');
    await clica(p, `#view .eq[data-id="${E.id}"]`);
    certo(await p.inputValue('#ePecas .peca:nth-child(2) .pn') === 'Lente teste' && !/Peças/.test(await p.inputValue('#eO')), 'ao editar, as peças voltam nos campos (e não aparecem nas anotações)');
    await clica(p, '#ePecas .peca:nth-child(2) .pdel'); await clica(p, '#s2 .save'); await calmo(p);
    certo(/Peças: Câmera teste = 4500(?!;)/.test(st.linhas('equipamentos').find(r => r.id === E.id).obs), 'tirar uma peça');
  }],
] };
