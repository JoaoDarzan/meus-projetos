/* Etapa 15 · Demonstração: login "teste" / "123456" mostra o app com dados inventados, que ficam só no aparelho */
const { HOJE, entrar, calmo, clica, certo, conferirLayout } = require('../ajuda');
const m0 = HOJE.slice(0, 7);
const noSupabase = st => st.pedidos.filter(x => /^\/(auth|rest)\//.test(x.caminho));
const TELAS = [['inicio'], ['trabalhos'], ['tarefas'], ['equip'], ['fin', 'extrato'], ['fin', 'revisar'], ['fin', 'bancos'], ['fin', 'cartoes'], ['fin', 'metas'], ['fin', 'relatorios']];

module.exports = { etapa: 'Demonstração', testes: [
  ['entrar com teste/123456: app cheio de dados inventados, tudo funciona e nada vai para o Supabase', async (st, abrir) => {
    const p = await abrir({ logar: false, aparelho: 'iphone-15' });
    await entrar(p, 'teste', '123456');
    const d = await p.evaluate(m => ({
      trabalhos: A.db.linhas('TRABALHOS').length, equip: A.db.linhas('EQUIPAMENTOS').length, doMes: A.c.doMes(m).length,
      total: A.c.totalBancos(), revisar: A.c.paraRevisar('categoria').length, demo: document.body.classList.contains('demo'),
      selo: getComputedStyle(document.querySelector('.hello .hi b'), '::after').content,
      passado: A.c.resumo(A.u.addMes(m, -1)),
    }), m0);
    certo(d.demo && /DEMO/.test(d.selo), 'aparece o selo DEMO: ' + d.selo);
    certo(d.trabalhos >= 5 && d.equip >= 8 && d.doMes >= 10 && d.total > 0 && d.revisar >= 2, 'dados de demonstração: ' + JSON.stringify(d));
    certo(d.passado.entr > 0 && d.passado.saiu > 0 && d.passado.guardou === 1300, 'mês passado completo: ' + JSON.stringify([d.passado.entr, d.passado.saiu, d.passado.guardou]));
    for (const [v, s] of TELAS) {
      await p.evaluate(([v, s]) => { A.ui.view = v; if (s) A.ui.fseg = s; A.render(false); scrollTo(0, 0); }, [v, s]);
      await p.waitForTimeout(450); /* o "pulo" do ✓ das tarefas feitas termina em 0,4s */
      await conferirLayout(p, 'demonstração ' + v + (s ? '-' + s : ''));
    }
    await p.evaluate(() => { A.ui.view = 'inicio'; A.render(false); });
    await clica(p, '#view [data-a=novoL][data-t=saida]');
    await p.fill('#fV', '50'); await p.fill('#fD', 'Teste demonstração');
    await clica(p, '#s2 .save'); await calmo(p);
    await p.reload(); await p.waitForFunction(() => document.getElementById('splash').hidden && document.querySelector('#view').children.length);
    certo(await p.evaluate(() => A.db.linhas('EXTRATO').some(r => r['DESCRIÇÃO'] === 'Teste demonstração')), 'o que foi lançado continua depois de abrir de novo');
    await clica(p, '#view [data-a=conta]');
    certo(await p.isVisible('#avisoDemo'), 'Sua conta avisa que é demonstração');
    certo(!(await p.$('#blClaude')) && !(await p.$('[data-a=avisoLigar]')) && !(await p.$('a[href*="supabase.com"]')), 'sem Acesso do Claude, avisos e link do Supabase na demonstração');
    await clica(p, '#s2 [data-a=sair]');
    await entrar(p, 'teste', '123456');
    certo(!(await p.evaluate(() => A.db.linhas('EXTRATO').some(r => r['DESCRIÇÃO'] === 'Teste demonstração'))), 'sair e entrar de novo começa a demonstração do zero');
    certo(noSupabase(st).length === 0, 'a demonstração chamou o Supabase: ' + JSON.stringify(noSupabase(st).slice(0, 3)));
    certo(!Object.values(st.tabelas).some(t => t.some(l => l.user_id === 'demo')), 'nada da demonstração no Supabase');
  }],
  ['senha errada no teste não entra; depois da demonstração o João entra e vê só os dados dele', async (st, abrir) => {
    const p = await abrir({ logar: false });
    await p.waitForSelector('#login:not([hidden])');
    await p.fill('#lgEmail', 'teste'); await p.fill('#lgSenha', '12345'); await p.click('#lgBtn');
    await p.waitForSelector('#lgErro:not([hidden])');
    certo(/senha errad/i.test(await p.textContent('#lgErro')) && !(await p.evaluate(() => A.nuvem.sessao)), 'senha errada não entra');
    await p.fill('#lgSenha', '123456'); await p.click('#lgBtn');
    await p.waitForFunction(() => document.getElementById('login').hidden && document.querySelector('#view').children.length);
    await calmo(p);
    await clica(p, '#view [data-a=conta]'); await clica(p, '#s2 [data-a=sair]');
    await entrar(p);
    const joao = await p.evaluate(() => ({ demo: document.body.classList.contains('demo'), ids: A.db.linhas('TRABALHOS').map(j => j.ID), n: A.db.linhas('EXTRATO').length }));
    certo(!joao.demo && joao.ids.length === st.linhas('trabalhos').length && joao.n >= st.linhas('extrato').length, 'João vê os dados dele: ' + JSON.stringify(joao));
    certo(!(await p.evaluate(() => A.db.linhas('TRABALHOS').some(j => /^JD/.test(j.ID)))), 'nada da demonstração nos dados do João');
  }],
  ['os dados inventados ficam certos em qualquer dia do ano', async (st, abrir) => {
    const p = await abrir({ logar: false });
    const ruins = await p.evaluate(() => {
      const r = [];
      ['2026-01-01', '2026-02-28', '2026-03-31', '2026-07-15', '2026-12-31', '2027-02-01'].forEach(h => {
        const d = A.demo.dados(h), L = d.abas.EXTRATO;
        L.forEach(l => {
          if (l['STATUS'] === 'Pago' && l['DATA'] > h && l['TIPO'] !== 'cartão') r.push(`${h}: "${l['DESCRIÇÃO']}" pago no futuro (${l['DATA']})`);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(l['DATA'])) r.push(`${h}: data errada ${l['DATA']}`);
        });
        if (new Set(L.map(l => l.ID)).size !== L.length) r.push(h + ': ID repetido');
        const tr = L.filter(l => /^Transferência T/.test(l['OBS']));
        if (Math.abs(tr.reduce((s, l) => s + l['VALOR'], 0)) > 0.001) r.push(h + ': transferências não fecham');
        if (d.abas.TRABALHOS.length < 5) r.push(h + ': poucos trabalhos');
      });
      return r;
    });
    certo(!ruins.length, ruins.slice(0, 5).join(' | '));
  }],
] };
