/* Testa o app de ponta a ponta no navegador, como se fosse o João usando.
   Antes: python3 ferramentas/montar_local.py planilha.xlsx   (gera dist/local.html)
   Rodar: node testes/testar-app.js                            (HOJE=2026-10-27 por padrão)                */
const path = require('path');
const { chromium } = require('playwright');
const URL = 'file://' + path.resolve(__dirname, '../dist/local.html');
const HOJE = process.env.HOJE || '2026-10-27';
let falhas = 0, total = 0;

const brl = t => +String(t).replace(/[^\d,−-]/g, '').replace(',', '.').replace('−', '-');
async function abrir(b, larg = 390) {
  const ctx = await b.newContext({ viewport: { width: larg, height: 844 }, timezoneId: 'America/Sao_Paulo', locale: 'pt-BR' });
  await ctx.addInitScript(hoje => {
    window.MOCK_DEMORA = 20;
    /* relógio parado no dia do teste (o servidor de mentira e o app usam a mesma data) */
    const D = Date, fixo = new D(hoje + 'T10:00:00-03:00').getTime();
    window.Date = class extends D { constructor(...a) { super(...(a.length ? a : [fixo])); } static now() { return fixo; } };
  }, HOJE);
  const p = await ctx.newPage();
  p.erros = [];
  p.on('pageerror', e => p.erros.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) p.erros.push(m.text()); });
  await p.route('**/fonts.*/**', r => r.abort());
  await p.goto(URL);
  await p.waitForFunction(() => document.getElementById('splash').hidden);
  return p;
}
const calmo = p => p.waitForFunction(() => { const s = document.getElementById('sync'); return s.hidden || /Salvo/.test(s.textContent); }).then(() => p.waitForTimeout(80));
const clica = async (p, sel) => { await p.locator(sel).first().click(); await p.waitForTimeout(60); };
const aba = (p, nome) => p.evaluate(n => { const g = MOCK.base.abas[n], cab = g[0]; return g.slice(1).filter(r => r.some(v => v !== '' && v !== null && v !== false)).map(r => Object.fromEntries(cab.map((c, i) => [c, r[i] && r[i].toISOString ? r[i].toISOString().slice(0, 10) : r[i]]))); }, nome);
const resumo = (p, m) => p.evaluate(m => { const r = A.c.resumo(m); return { saiu: r.saiu, entr: r.entr, somaCats: r.cats.reduce((s, x) => s + x.valor, 0) }; }, m);
const ir = (p, v) => clica(p, `#tabbar [data-a=go][data-v=${v}]`);

async function teste(nome, fn) {
  total++;
  const b = teste.b;
  let p;
  try {
    p = await abrir(b);
    await fn(p);
    if (p.erros.length) throw new Error('erros no console: ' + p.erros.join(' | '));
    console.log('  ok   ' + nome);
  } catch (e) {
    falhas++;
    console.log('  FALHOU ' + nome + '\n         ' + String(e.message).split('\n')[0]);
    if (p) await p.screenshot({ path: path.resolve(__dirname, 'capturas', 'falha-' + total + '.png') }).catch(() => { });
  } finally { if (p) await p.context().close(); }
}
const igual = (a, b, msg) => { if (Math.abs(a - b) > 0.005) throw new Error(`${msg}: esperava ${b}, veio ${a}`); };
const certo = (x, msg) => { if (!x) throw new Error(msg); };

(async () => {
  teste.b = await chromium.launch();
  console.log('Testando ' + URL);

  await teste('abre sem erros e "Para onde foi" soma igual ao "Saiu"', async p => {
    const m = HOJE.slice(0, 7), r = await resumo(p, m);
    igual(r.somaCats, r.saiu, 'soma das categorias');
    const tot = await p.locator('.tot-row').first().textContent();
    igual(brl(tot), r.saiu, 'linha de total');
  });

  await teste('telas abrem sem passar da largura do celular', async p => {
    for (const v of ['inicio', 'trabalhos', 'tarefas', 'equip', 'fin']) {
      await ir(p, v);
      const sobra = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      certo(sobra <= 0, `tela ${v} passa ${sobra}px da largura`);
    }
    for (const s of ['bancos', 'cartoes', 'metas', 'relatorios']) {
      await clica(p, `[data-a=seg][data-s=fseg][data-v=${s}]`);
      const sobra = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      certo(sobra <= 0, `finanças/${s} passa ${sobra}px da largura`);
    }
  });

  await teste('lançar, editar e excluir um gasto (com desfazer)', async p => {
    const m = HOJE.slice(0, 7), antes = (await resumo(p, m)).saiu;
    await clica(p, '#view [data-a=novoL][data-t=saida]');
    await p.fill('#fV', '25,90'); await p.fill('#fD', 'Teste gasolina');
    await clica(p, '#s2 .save'); await calmo(p);
    let L = (await aba(p, 'EXTRATO')).filter(r => r['DESCRIÇÃO'] === 'Teste gasolina');
    certo(L.length === 1, 'não gravou na planilha');
    igual(L[0]['VALOR'], -25.9, 'valor na planilha'); certo(L[0]['DATA'] === HOJE, 'data errada: ' + L[0]['DATA']); certo(/^L/.test(L[0].ID), 'sem ID');
    igual((await resumo(p, m)).saiu, antes + 25.9, 'saiu do mês');
    /* continua lá depois de recarregar */
    await p.reload(); await p.waitForFunction(() => document.getElementById('splash').hidden);
    await clica(p, `[data-a=editL][data-id="${L[0].ID}"]`);
    await p.fill('#fV', '30'); await clica(p, '#s2 .save'); await calmo(p);
    L = (await aba(p, 'EXTRATO')).filter(r => r.ID === L[0].ID);
    igual(L[0]['VALOR'], -30, 'valor editado');
    await clica(p, `[data-a=editL][data-id="${L[0].ID}"]`);
    await clica(p, '#s2 [data-a=apagarL]'); await clica(p, '#s2 [data-a=apagarL]'); await calmo(p);
    certo(!(await aba(p, 'EXTRATO')).some(r => r.ID === L[0].ID), 'não excluiu');
    await clica(p, '#toast .ub'); await calmo(p);
    certo((await aba(p, 'EXTRATO')).some(r => r.ID === L[0].ID), 'desfazer não trouxe de volta');
    igual((await resumo(p, m)).saiu, antes + 30, 'saiu depois de desfazer');
  });

  await teste('compra no cartão não pesa no mês da compra (vai para as faturas)', async p => {
    const m = HOJE.slice(0, 7), antes = await resumo(p, m);
    await clica(p, '#view [data-a=novoL][data-t=saida]');
    await p.fill('#fV', '300'); await p.fill('#fD', 'Teste lente');
    await p.selectOption('#fF', 'cartão'); await p.selectOption('#fB', 'Nubank'); await p.selectOption('#fP', '3');
    const aviso = await p.textContent('#avisoCartao');
    certo(/novembro/.test(aviso) && /janeiro/.test(aviso), 'aviso da fatura: ' + aviso);
    await clica(p, '#s2 .save'); await calmo(p);
    const L = (await aba(p, 'EXTRATO')).filter(r => r['DESCRIÇÃO'] === 'Teste lente').sort((a, b) => a.DATA < b.DATA ? -1 : 1);
    certo(L.length === 3, 'esperava 3 parcelas, veio ' + L.length);
    certo(L.map(r => r.DATA.slice(0, 7)).join() === '2026-11,2026-12,2027-01', 'meses das parcelas: ' + L.map(r => r.DATA).join());
    certo(L.map(r => r.PARCELA).join() === '1/3,2/3,3/3', 'parcelas: ' + L.map(r => r.PARCELA).join());
    igual(L.reduce((s, r) => s + r.VALOR, 0), -300, 'soma das parcelas');
    const P = (await aba(p, 'PARCELADOS')).filter(r => r['DESCRIÇÃO'] === 'Teste lente');
    certo(P.length === 1 && P[0].PARCELAS === 3, 'PARCELADOS');
    igual((await resumo(p, m)).saiu, antes.saiu, 'saiu do mês da compra mudou');
    /* excluir a compra inteira apaga as 3 parcelas e o PARCELADOS */
    await p.evaluate(id => { A.ui.mes = '2026-11'; A.render(false); }, null);
    await clica(p, `[data-a=editL][data-id="${L[0].ID}"]`);
    await clica(p, '#s2 [data-a=apagarCompra]'); await clica(p, '#s2 [data-a=apagarCompra]'); await calmo(p);
    certo(!(await aba(p, 'EXTRATO')).some(r => r['DESCRIÇÃO'] === 'Teste lente'), 'sobrou parcela');
    certo(!(await aba(p, 'PARCELADOS')).some(r => r['DESCRIÇÃO'] === 'Teste lente'), 'sobrou PARCELADOS');
  });

  await teste('equipamento no cartão: cadastrar, mudar valor e excluir junto com as parcelas', async p => {
    await ir(p, 'equip');
    await clica(p, '#fabwrap .fab');
    await p.fill('#eN', 'Teste microfone'); await p.fill('#eV', '600');
    await clica(p, 'label[for=eF2]'); await p.selectOption('#eB', 'Inter'); await p.selectOption('#eP', '2');
    await clica(p, '#s2 .save'); await calmo(p);
    let E = (await aba(p, 'EQUIPAMENTOS')).find(r => r.NOME === 'Teste microfone');
    certo(E && /Compra P/.test(E.OBS), 'equipamento sem ligação com a compra');
    let L = (await aba(p, 'EXTRATO')).filter(r => r['DESCRIÇÃO'] === 'Teste microfone');
    certo(L.length === 2 && L.every(r => r.DATA.slice(0, 7) === '2026-11' || r.DATA.slice(0, 7) === '2026-12'), 'parcelas: ' + L.map(r => r.DATA).join());
    await clica(p, `[data-a=editE][data-id="${E.ID}"]`);
    await p.fill('#eV', '800'); await clica(p, '#s2 .save'); await calmo(p);
    L = (await aba(p, 'EXTRATO')).filter(r => r['DESCRIÇÃO'] === 'Teste microfone');
    igual(L.reduce((s, r) => s + r.VALOR, 0), -800, 'parcelas não acompanharam o valor');
    await clica(p, `[data-a=editE][data-id="${E.ID}"]`);
    await clica(p, '#s2 [data-a=apagarE]'); await clica(p, '#s2 [data-a=apagarE]'); await calmo(p);
    certo(!(await aba(p, 'EQUIPAMENTOS')).some(r => r.NOME === 'Teste microfone'), 'equipamento ficou');
    certo(!(await aba(p, 'EXTRATO')).some(r => r['DESCRIÇÃO'] === 'Teste microfone'), 'parcelas ficaram');
  });

  await teste('equipamento "já tinha" não mexe no dinheiro', async p => {
    const m = HOJE.slice(0, 7), antes = await resumo(p, m), n0 = (await aba(p, 'EXTRATO')).length;
    await ir(p, 'equip'); await clica(p, '#fabwrap .fab');
    await p.fill('#eN', 'Teste tripé'); await p.fill('#eV', '200');
    await clica(p, '#s2 .save'); await calmo(p);
    certo((await aba(p, 'EQUIPAMENTOS')).some(r => r.NOME === 'Teste tripé'), 'não cadastrou');
    certo((await aba(p, 'EXTRATO')).length === n0, 'criou lançamento');
    igual((await resumo(p, m)).saiu, antes.saiu, 'saiu mudou');
  });

  await teste('tarefa de conta: marcar como paga e desfazer', async p => {
    await ir(p, 'tarefas');
    const id = await p.evaluate(() => (A.c.tarefas().find(t => t.id.startsWith('l:') && !t.feita) || {}).id);
    certo(id, 'nenhuma conta prevista para testar');
    await clica(p, `[data-a=tarefa][data-id="${id}"]`); await calmo(p);
    let r = (await aba(p, 'EXTRATO')).find(x => x.ID === id.slice(2));
    certo(r.STATUS === 'Pago' && /Pago pelo app/.test(r.OBS), 'não marcou: ' + r.STATUS + ' ' + r.OBS);
    await p.waitForTimeout(400);
    await clica(p, `.tk.ok [data-a=tarefa][data-id="${id}"].undo`); await calmo(p);
    r = (await aba(p, 'EXTRATO')).find(x => x.ID === id.slice(2));
    certo(r.STATUS === 'Previsto' && !/pelo app/.test(r.OBS), 'desfazer falhou: ' + r.STATUS + ' ' + r.OBS);
  });

  await teste('pagar fatura cria a transferência do banco e desfazer apaga', async p => {
    await ir(p, 'tarefas');
    const t = await p.evaluate(() => A.c.tarefas().find(t => t.id.startsWith('f:') && !t.feita));
    certo(t, 'nenhuma fatura para testar');
    await clica(p, `[data-a=tarefa][data-id="${t.id}"]`); await calmo(p);
    const [, nome, m] = t.id.split(':');
    let r = (await aba(p, 'EXTRATO')).filter(x => String(x.OBS).indexOf(`Fatura ${nome} ${m}`) === 0);
    certo(r.length === 1 && r[0].GRUPO === 'Transferência', 'transferência não criada');
    igual(r[0].VALOR, -t.valor, 'valor pago');
    await p.waitForTimeout(400);
    await clica(p, `.tk.ok [data-a=tarefa][data-id="${t.id}"].undo`); await calmo(p);
    r = (await aba(p, 'EXTRATO')).filter(x => String(x.OBS).indexOf(`Fatura ${nome} ${m}`) === 0);
    certo(r.length === 0, 'desfazer não apagou a transferência');
  });

  await teste('trabalho: criar, registrar recebimento e ver o "recebido"', async p => {
    await ir(p, 'trabalhos'); await clica(p, '#fabwrap .fab');
    await p.fill('#jC', 'Teste Ana e Bia'); await p.fill('#jV', '3000'); await p.selectOption('#jE', 'Fechado');
    await clica(p, '#s2 .save'); await calmo(p);
    const J = (await aba(p, 'TRABALHOS')).find(r => r.CLIENTE === 'Teste Ana e Bia');
    certo(J && J.ID, 'não criou o trabalho');
    await clica(p, `[data-a=editJ][data-id="${J.ID}"]`);
    await p.fill('#rV', '1000'); await p.fill('#rD', 'sinal'); await clica(p, '#s2 [data-a=receber]'); await calmo(p);
    const R = (await aba(p, 'EXTRATO')).find(r => r['DESCRIÇÃO'] === 'Teste Ana e Bia - sinal');
    certo(R && R.GRUPO === 'Renda' && R.VALOR === 1000 && R.CATEGORIA === 'Darzan Produções', 'recebimento errado');
    const falta = await p.evaluate(id => A.c.faltaReceber(A.db.achar('TRABALHOS', id)), J.ID);
    igual(falta, 2000, 'falta receber');
  });

  await teste('conferir saldo do banco bate com o que foi digitado', async p => {
    await clica(p, '[data-a=irBancos]');
    await clica(p, '[data-a=conferir][data-v="Nubank"]');
    const campo = p.locator('#s2 input.num').first();
    await campo.fill('1234,56'); await clica(p, '#s2 .save'); await calmo(p);
    const s = await p.evaluate(() => A.c.saldoBanco('Nubank'));
    const cx = await p.evaluate(() => A.c.caixinhas().filter(x => x['BANCO'] === 'Nubank').reduce((t, x) => t + A.c.saldo(x), 0));
    igual(s - cx, 1234.56, 'saldo da conta Nubank');
  });

  await teste('se a planilha não salvar, o app desfaz e avisa', async p => {
    await p.evaluate(() => { window.MOCK_FALHAR = fn => fn === 'lote'; });
    const n0 = await p.evaluate(() => A.db.linhas('EXTRATO').length);
    await clica(p, '#view [data-a=novoL][data-t=saida]');
    await p.fill('#fV', '10'); await p.fill('#fD', 'Teste falha');
    await clica(p, '#s2 .save');
    await p.waitForFunction(() => /Não salvou/.test(document.getElementById('sync').textContent));
    await p.waitForTimeout(100);
    certo(await p.evaluate(n => A.db.linhas('EXTRATO').length === n, n0), 'mudança não foi desfeita no app');
    certo(/Não consegui salvar/.test(await p.textContent('#toast')), 'sem aviso');
    p.erros = [];
  });

  await teste('computador (1400px): menu lateral e nada passando da tela', async p => {
    await p.setViewportSize({ width: 1400, height: 900 });
    for (const v of ['inicio', 'trabalhos', 'tarefas', 'equip', 'fin']) {
      await clica(p, `#snav [data-a=go][data-v=${v}]`);
      const sobra = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      certo(sobra <= 0, `tela ${v} passa ${sobra}px`);
    }
  });

  await teste.b.close();
  console.log(`\n${total - falhas} de ${total} testes passaram`);
  process.exit(falhas ? 1 : 0);
})();
