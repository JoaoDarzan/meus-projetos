/* Etapa 8 · Sem internet e erros: guarda no celular, Supabase recusa, login vence, dois aparelhos */
const { calmo, clica, certo } = require('../ajuda');
module.exports = { etapa: 'Sem internet e erros', testes: [
  ['abre na hora com a cópia do celular, mesmo sem internet', async (st, abrir) => {
    const p = await abrir();
    st.fora = true;
    await p.reload();
    await p.waitForFunction(() => document.getElementById('splash').hidden && document.querySelector('#view .hero'));
    certo(await p.evaluate(() => A.db.linhas('EXTRATO').length > 0), 'não mostrou os dados guardados');
    p.erros = [];
  }],
  ['sem internet: guarda no celular e manda sozinho quando a internet volta', async (st, abrir) => {
    const p = await abrir();
    st.fora = true;
    await clica(p, '#view [data-a=novoL][data-t=saida]');
    await p.fill('#fV', '12'); await p.fill('#fD', 'Teste sem internet'); await clica(p, '#s2 .save');
    await p.waitForFunction(() => /Sem internet/.test(document.getElementById('sync').textContent));
    certo(!st.linhas('extrato').some(r => r.descricao === 'Teste sem internet'), 'chegou sem internet?');
    await p.reload();
    await p.waitForFunction(() => document.getElementById('splash').hidden && document.querySelector('#view .hero'));
    certo(await p.evaluate(() => A.db.linhas('EXTRATO').some(r => r['DESCRIÇÃO'] === 'Teste sem internet')), 'sumiu do celular');
    st.fora = false;
    await p.evaluate(() => dispatchEvent(new Event('online')));
    await calmo(p);
    certo(st.linhas('extrato').filter(r => r.descricao === 'Teste sem internet').length === 1, 'não mandou quando voltou (ou mandou 2x)');
    p.erros = [];
  }],
  ['se o Supabase recusar, avisa e volta a mostrar o que está lá', async (st, abrir) => {
    const p = await abrir();
    st.falharProximo = 1;
    await clica(p, '#view [data-a=novoL][data-t=saida]');
    await p.fill('#fV', '10'); await p.fill('#fD', 'Teste recusado'); await clica(p, '#s2 .save');
    await p.waitForFunction(() => /não aceitou/.test(document.getElementById('toast').textContent));
    await p.waitForFunction(() => !A.db.linhas('EXTRATO').some(r => r['DESCRIÇÃO'] === 'Teste recusado'));
    certo(!st.linhas('extrato').some(r => r.descricao === 'Teste recusado'), 'gravou mesmo assim');
    p.erros = [];
  }],
  ['login vencido renova sozinho sem perder nada', async (st, abrir) => {
    const p = await abrir();
    await p.waitForTimeout(2500);
    await clica(p, '#view [data-a=novoL][data-t=saida]');
    await p.fill('#fV', '7'); await p.fill('#fD', 'Teste token'); await clica(p, '#s2 .save'); await calmo(p);
    certo(st.linhas('extrato').some(r => r.descricao === 'Teste token'), 'não salvou depois de vencer');
    certo(await p.evaluate(() => document.getElementById('login').hidden), 'pediu login');
    certo(st.pedidos.some(x => /grant_type=refresh_token/.test(x.caminho)), 'não renovou o login');
  }, { duracaoToken: 62 }],
  ['login que o Supabase recusa (401) renova e tenta de novo', async (st, abrir) => {
    const p = await abrir();
    st.vencerLogins();
    await clica(p, '#view [data-a=novoL][data-t=saida]');
    await p.fill('#fV', '8'); await p.fill('#fD', 'Teste 401'); await clica(p, '#s2 .save'); await calmo(p);
    certo(st.linhas('extrato').some(r => r.descricao === 'Teste 401'), 'não salvou depois do 401');
    certo(st.pedidos.some(x => /grant_type=refresh_token/.test(x.caminho)), 'não renovou');
    p.erros = [];
  }],
  ['celular e computador mostram a mesma coisa (e contas fixas não duplicam)', async (st, abrir) => {
    const cel = await abrir();
    const pc = await abrir({ larg: 1400 });
    await clica(cel, '#view [data-a=novoL][data-t=saida]');
    await cel.fill('#fV', '45'); await cel.fill('#fD', 'Teste dois aparelhos'); await clica(cel, '#s2 .save'); await calmo(cel);
    await pc.reload();
    await pc.waitForFunction(() => A.db.linhas('EXTRATO').some(r => r['DESCRIÇÃO'] === 'Teste dois aparelhos'));
    const fx = () => st.linhas('extrato').filter(x => /^LFX-/.test(x.id)).length, n = fx();
    await cel.reload(); await cel.waitForFunction(() => document.getElementById('splash').hidden); await calmo(cel);
    certo(fx() === n, 'contas fixas duplicaram');
  }],
] };
