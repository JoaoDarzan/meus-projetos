/* Testa o app de ponta a ponta no navegador, como se fosse o João usando, contra um Supabase de mentira.
   Rodar: node financas-app/testes/testar-app.js     (usa os dados de EXEMPLO; HOJE=2026-10-27 por padrão)
   Com os dados de verdade (só no computador): DADOS=caminho/darzan-dados.json node financas-app/testes/testar-app.js */
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const { criar } = require('./supabase-de-mentira');
const HOJE = process.env.HOJE || '2026-10-27';
const DADOS = JSON.parse(fs.readFileSync(process.env.DADOS || path.join(__dirname, 'dados-exemplo.json'), 'utf8'));
const CAPTURAS = path.join(__dirname, 'capturas');
fs.mkdirSync(CAPTURAS, { recursive: true });
let falhas = 0, total = 0;

const brl = t => +String(t).replace(/[^\d,−-]/g, '').replace(',', '.').replace('−', '-');
async function abrir(b, st, { larg = 390, logar = true, host = '127.0.0.1' } = {}) {
  const ctx = await b.newContext({ viewport: { width: larg, height: 844 }, timezoneId: 'America/Sao_Paulo', locale: 'pt-BR' });
  await ctx.addInitScript(([hoje, porta]) => {
    window.DF_CONFIG = { url: 'http://127.0.0.1:' + porta, chave: 'chave-de-teste' };
    /* relógio parado no dia do teste */
    const D = Date, fixo = new D(hoje + 'T10:00:00-03:00').getTime(), ini = D.now();
    window.Date = class extends D { constructor(...a) { super(...(a.length ? a : [fixo + (D.now() - ini)])); } static now() { return fixo + (D.now() - ini); } };
  }, [HOJE, st.porta]);
  const p = await ctx.newPage();
  p.erros = [];
  p.on('pageerror', e => p.erros.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) p.erros.push(m.text()); });
  await p.route('**/fonts.*/**', r => r.abort());
  await p.goto(`http://${host}:${st.porta}/financas/`);
  if (logar) await entrar(p);
  return p;
}
async function entrar(p, email = 'joao@teste.com', senha = 'senha-certa') {
  await p.waitForSelector('#login:not([hidden])');
  await p.fill('#lgEmail', email); await p.fill('#lgSenha', senha); await p.click('#lgBtn');
  await p.waitForFunction(() => document.getElementById('login').hidden && document.getElementById('splash').hidden && document.querySelector('#view').children.length);
  await calmo(p);
}
const calmo = p => p.waitForFunction(() => A.db.pendentes() === 0, null, { timeout: 15000 }).then(() => p.waitForTimeout(60));
const clica = async (p, sel) => { await p.locator(sel).first().click(); await p.waitForTimeout(60); };
const resumo = (p, m) => p.evaluate(m => { const r = A.c.resumo(m); return { saiu: r.saiu, entr: r.entr, somaCats: r.cats.reduce((s, x) => s + x.valor, 0) }; }, m);
const ir = (p, v) => clica(p, `#tabbar [data-a=go][data-v=${v}]`);
const igual = (a, b, msg) => { if (Math.abs(a - b) > 0.005) throw new Error(`${msg}: esperava ${b}, veio ${a}`); };
const certo = (x, msg) => { if (!x) throw new Error(msg); };

async function teste(nome, fn, { semear = true, duracaoToken } = {}) {
  total++;
  const st = criar({ duracaoToken });
  if (semear) st.semear(DADOS);
  st.porta = await st.ligar();
  const paginas = [];
  try {
    await fn(st, async (op) => { const p = await abrir(teste.b, st, op); paginas.push(p); return p; });
    const erros = paginas.flatMap(p => p.erros);
    if (erros.length) throw new Error('erros no console: ' + erros.join(' | '));
    console.log('  ok     ' + nome);
  } catch (e) {
    falhas++;
    console.log('  FALHOU ' + nome + '\n         ' + String(e.message).split('\n')[0]);
    if (paginas[0]) await paginas[0].screenshot({ path: path.join(CAPTURAS, 'falha-' + total + '.png') }).catch(() => { });
  } finally {
    for (const p of paginas) await p.context().close().catch(() => { });
    await st.desligar();
  }
}

(async () => {
  teste.b = await chromium.launch();
  const m0 = HOJE.slice(0, 7);
  console.log(`Testando com ${process.env.DADOS ? 'os dados de ' + process.env.DADOS : 'dados de exemplo'} (hoje = ${HOJE})`);

  await teste('login: senha errada avisa, senha certa entra e continua logado depois', async (st, abrir) => {
    const p = await abrir({ logar: false });
    await p.waitForSelector('#login:not([hidden])');
    await p.fill('#lgEmail', 'joao@teste.com'); await p.fill('#lgSenha', 'errada'); await p.click('#lgBtn');
    await p.waitForSelector('#lgErro:not([hidden])');
    certo(/senha errados/.test(await p.textContent('#lgErro')), 'mensagem de senha errada');
    p.erros = [];
    await entrar(p);
    await p.reload();
    await p.waitForFunction(() => document.getElementById('splash').hidden && document.querySelector('#view').children.length);
    certo(await p.evaluate(() => document.getElementById('login').hidden), 'pediu login de novo');
  });

  await teste('abre na hora com a cópia do celular, mesmo sem internet', async (st, abrir) => {
    const p = await abrir();
    st.fora = true;
    await p.reload();
    await p.waitForFunction(() => document.getElementById('splash').hidden && document.querySelector('#view .hero'));
    const saiu = await p.evaluate(m => A.c.resumo(m).saiu, m0);
    certo(saiu > 0, 'não mostrou os dados guardados');
    p.erros = [];
  });

  await teste('"Para onde foi" soma igual ao "Saiu"', async (st, abrir) => {
    const p = await abrir();
    const r = await resumo(p, m0);
    igual(r.somaCats, r.saiu, 'soma das categorias');
    igual(brl(await p.locator('.tot-row').first().textContent()), r.saiu, 'linha de total');
  });

  await teste('telas no celular não passam da largura', async (st, abrir) => {
    const p = await abrir();
    for (const v of ['inicio', 'trabalhos', 'tarefas', 'equip', 'fin']) {
      await ir(p, v);
      const sobra = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      certo(sobra <= 0, `tela ${v} passa ${sobra}px`);
      await p.screenshot({ path: path.join(CAPTURAS, `390-${v}.png`), fullPage: true });
    }
    for (const s of ['bancos', 'cartoes', 'metas', 'relatorios']) {
      await clica(p, `[data-a=seg][data-s=fseg][data-v=${s}]`);
      const sobra = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      certo(sobra <= 0, `finanças/${s} passa ${sobra}px`);
    }
  });

  await teste('lançar, editar e excluir um gasto (com desfazer) e tudo chega no Supabase', async (st, abrir) => {
    const p = await abrir();
    const antes = (await resumo(p, m0)).saiu;
    await clica(p, '#view [data-a=novoL][data-t=saida]');
    await p.fill('#fV', '25,90'); await p.fill('#fD', 'Teste gasolina');
    await clica(p, '#s2 .save'); await calmo(p);
    let L = st.linhas('extrato').filter(r => r.descricao === 'Teste gasolina');
    certo(L.length === 1, 'não chegou no Supabase');
    igual(L[0].valor, -25.9, 'valor'); certo(L[0].data === HOJE, 'data: ' + L[0].data); certo(/^L/.test(L[0].id), 'ID');
    igual((await resumo(p, m0)).saiu, antes + 25.9, 'saiu do mês');
    await clica(p, `[data-a=editL][data-id="${L[0].id}"]`);
    await p.fill('#fV', '30'); await clica(p, '#s2 .save'); await calmo(p);
    igual(st.linhas('extrato').find(r => r.id === L[0].id).valor, -30, 'valor editado');
    certo(st.linhas('extrato').find(r => r.id === L[0].id).descricao === 'Teste gasolina', 'editar apagou a descrição');
    await clica(p, `[data-a=editL][data-id="${L[0].id}"]`);
    await clica(p, '#s2 [data-a=apagarL]'); await clica(p, '#s2 [data-a=apagarL]'); await calmo(p);
    certo(!st.linhas('extrato').some(r => r.id === L[0].id), 'não excluiu');
    await clica(p, '#toast .ub'); await calmo(p);
    certo(st.linhas('extrato').some(r => r.id === L[0].id && r.valor === -30), 'desfazer não trouxe de volta');
  });

  await teste('compra no cartão vai para as faturas, não pesa no mês da compra', async (st, abrir) => {
    const p = await abrir();
    const antes = await resumo(p, m0);
    await clica(p, '#view [data-a=novoL][data-t=saida]');
    await p.fill('#fV', '300'); await p.fill('#fD', 'Teste lente');
    await p.selectOption('#fF', 'cartão'); await p.selectOption('#fB', 'Nubank'); await p.selectOption('#fP', '3');
    const aviso = await p.textContent('#avisoCartao');
    certo(/novembro/.test(aviso) && /janeiro/.test(aviso), 'aviso: ' + aviso);
    await clica(p, '#s2 .save'); await calmo(p);
    const L = st.linhas('extrato').filter(r => r.descricao === 'Teste lente').sort((a, b) => a.data < b.data ? -1 : 1);
    certo(L.map(r => r.data.slice(0, 7)).join() === '2026-11,2026-12,2027-01', 'meses: ' + L.map(r => r.data).join());
    certo(L.map(r => r.parcela).join() === '1/3,2/3,3/3', 'parcelas: ' + L.map(r => r.parcela).join());
    igual(L.reduce((s, r) => s + r.valor, 0), -300, 'soma');
    certo(st.linhas('parcelados').some(r => r.descricao === 'Teste lente' && r.parcelas === 3), 'PARCELADOS');
    igual((await resumo(p, m0)).saiu, antes.saiu, 'mês da compra mudou');
    await p.evaluate(() => { A.ui.mes = '2026-11'; A.render(false); });
    await clica(p, `[data-a=editL][data-id="${L[0].id}"]`);
    await clica(p, '#s2 [data-a=apagarCompra]'); await clica(p, '#s2 [data-a=apagarCompra]'); await calmo(p);
    certo(!st.linhas('extrato').some(r => r.descricao === 'Teste lente'), 'sobrou parcela');
    certo(!st.linhas('parcelados').some(r => r.descricao === 'Teste lente'), 'sobrou PARCELADOS');
  });

  await teste('equipamento no cartão: cadastrar, mudar valor e excluir junto com as parcelas', async (st, abrir) => {
    const p = await abrir();
    await ir(p, 'equip'); await clica(p, '#fabwrap .fab');
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
  });

  await teste('equipamento "já tinha" não mexe no dinheiro', async (st, abrir) => {
    const p = await abrir();
    const n0 = st.linhas('extrato').length, antes = (await resumo(p, m0)).saiu;
    await ir(p, 'equip'); await clica(p, '#fabwrap .fab');
    await p.fill('#eN', 'Teste tripé'); await p.fill('#eV', '200');
    await clica(p, '#s2 .save'); await calmo(p);
    certo(st.linhas('equipamentos').some(r => r.nome === 'Teste tripé' && r.valor === 200), 'não cadastrou');
    certo(st.linhas('extrato').length === n0, 'criou lançamento');
    igual((await resumo(p, m0)).saiu, antes, 'saiu mudou');
  });

  await teste('tarefa de conta: marcar como paga e desfazer', async (st, abrir) => {
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
  });

  await teste('pagar fatura cria a transferência e desfazer apaga', async (st, abrir) => {
    const p = await abrir();
    await ir(p, 'tarefas');
    const t = await p.evaluate(() => A.c.tarefas().find(t => t.id.startsWith('f:') && !t.feita));
    certo(t, 'nenhuma fatura');
    const [, nome, m] = t.id.split(':');
    await clica(p, `[data-a=tarefa][data-id="${t.id}"]`); await calmo(p);
    let r = st.linhas('extrato').filter(x => String(x.obs).indexOf(`Fatura ${nome} ${m}`) === 0);
    certo(r.length === 1 && r[0].grupo === 'Transferência', 'transferência');
    igual(r[0].valor, -t.valor, 'valor');
    await p.waitForTimeout(400);
    await clica(p, `.tk.ok [data-a=tarefa][data-id="${t.id}"].undo`); await calmo(p);
    certo(!st.linhas('extrato').some(x => String(x.obs).indexOf(`Fatura ${nome} ${m}`) === 0), 'não apagou');
  });

  await teste('trabalho: criar, registrar recebimento e ver quanto falta', async (st, abrir) => {
    const p = await abrir();
    await ir(p, 'trabalhos'); await clica(p, '#fabwrap .fab');
    await p.fill('#jC', 'Teste Ana e Bia'); await p.fill('#jV', '3000'); await p.selectOption('#jE', 'Fechado');
    await clica(p, '#s2 .save'); await calmo(p);
    const J = st.linhas('trabalhos').find(r => r.cliente === 'Teste Ana e Bia');
    certo(J && J.valor_total === 3000, 'não criou');
    await clica(p, `[data-a=editJ][data-id="${J.id}"]`);
    await p.fill('#rV', '1000'); await p.fill('#rD', 'sinal'); await clica(p, '#s2 [data-a=receber]'); await calmo(p);
    const R = st.linhas('extrato').find(r => r.descricao === 'Teste Ana e Bia - sinal');
    certo(R && R.grupo === 'Renda' && R.valor === 1000, 'recebimento');
    igual(await p.evaluate(id => A.c.faltaReceber(A.db.achar('TRABALHOS', id)), J.id), 2000, 'falta receber');
  });

  await teste('conferir saldo do banco bate com o que foi digitado', async (st, abrir) => {
    const p = await abrir();
    await clica(p, '#view [data-a=irBancos]');
    await clica(p, '[data-a=conferir][data-v="Nubank"]');
    await p.locator('#s2 input.num').first().fill('1234,56'); await clica(p, '#s2 .save'); await calmo(p);
    const conta = st.linhas('contas').find(x => x.banco === 'Nubank' && x.conta === 'Conta');
    igual(conta.saldo_conferido, 1234.56, 'saldo no Supabase'); certo(conta.data_da_conferencia === HOJE, 'data da conferência');
    igual(await p.evaluate(() => A.c.saldo(A.c.contas().find(x => x['BANCO'] === 'Nubank' && x['CONTA'] === 'Conta'))), 1234.56, 'saldo no app');
  });

  await teste('sem internet: guarda no celular e manda sozinho quando a internet volta', async (st, abrir) => {
    const p = await abrir();
    st.fora = true;
    await clica(p, '#view [data-a=novoL][data-t=saida]');
    await p.fill('#fV', '12'); await p.fill('#fD', 'Teste sem internet'); await clica(p, '#s2 .save');
    await p.waitForFunction(() => /Sem internet/.test(document.getElementById('sync').textContent));
    certo(!st.linhas('extrato').some(r => r.descricao === 'Teste sem internet'), 'chegou sem internet?');
    await p.reload(); /* fechou e abriu o app sem internet */
    await p.waitForFunction(() => document.getElementById('splash').hidden && document.querySelector('#view .hero'));
    certo(await p.evaluate(() => A.db.linhas('EXTRATO').some(r => r['DESCRIÇÃO'] === 'Teste sem internet')), 'sumiu do celular');
    st.fora = false;
    await p.evaluate(() => dispatchEvent(new Event('online')));
    await calmo(p);
    certo(st.linhas('extrato').filter(r => r.descricao === 'Teste sem internet').length === 1, 'não mandou quando voltou (ou mandou 2x)');
    p.erros = [];
  });

  await teste('se o Supabase recusar, avisa e volta a mostrar o que está lá', async (st, abrir) => {
    const p = await abrir();
    st.falharProximo = 1;
    await clica(p, '#view [data-a=novoL][data-t=saida]');
    await p.fill('#fV', '10'); await p.fill('#fD', 'Teste recusado'); await clica(p, '#s2 .save');
    await p.waitForFunction(() => /não aceitou/.test(document.getElementById('toast').textContent));
    await p.waitForFunction(() => !A.db.linhas('EXTRATO').some(r => r['DESCRIÇÃO'] === 'Teste recusado'));
    certo(!st.linhas('extrato').some(r => r.descricao === 'Teste recusado'), 'gravou mesmo assim');
    p.erros = [];
  });

  await teste('login vencido renova sozinho sem perder nada', async (st, abrir) => {
    const p = await abrir();
    await p.waitForTimeout(2500); /* token dura 2s neste teste */
    await clica(p, '#view [data-a=novoL][data-t=saida]');
    await p.fill('#fV', '7'); await p.fill('#fD', 'Teste token'); await clica(p, '#s2 .save'); await calmo(p);
    certo(st.linhas('extrato').some(r => r.descricao === 'Teste token'), 'não salvou depois de vencer');
    certo(await p.evaluate(() => document.getElementById('login').hidden), 'pediu login');
    certo(st.pedidos.some(x => /grant_type=refresh_token/.test(x.caminho)), 'não renovou o login (teste não testou nada)');
  }, { duracaoToken: 62 });

  await teste('login que o Supabase recusa (401) renova e tenta de novo', async (st, abrir) => {
    const p = await abrir();
    st.vencerLogins();
    await clica(p, '#view [data-a=novoL][data-t=saida]');
    await p.fill('#fV', '8'); await p.fill('#fD', 'Teste 401'); await clica(p, '#s2 .save'); await calmo(p);
    certo(st.linhas('extrato').some(r => r.descricao === 'Teste 401'), 'não salvou depois do 401');
    certo(st.pedidos.some(x => /grant_type=refresh_token/.test(x.caminho)), 'não renovou');
    p.erros = [];
  });

  await teste('celular e computador mostram a mesma coisa', async (st, abrir) => {
    const cel = await abrir();
    const pc = await abrir({ larg: 1400 });
    await clica(cel, '#view [data-a=novoL][data-t=saida]');
    await cel.fill('#fV', '45'); await cel.fill('#fD', 'Teste dois aparelhos'); await clica(cel, '#s2 .save'); await calmo(cel);
    await pc.reload();
    await pc.waitForFunction(() => A.db.linhas('EXTRATO').some(r => r['DESCRIÇÃO'] === 'Teste dois aparelhos'));
    const fx = r => r.filter(x => /^LFX-/.test(x.id)).length;
    const n = fx(st.linhas('extrato'));
    await cel.reload(); await cel.waitForFunction(() => document.getElementById('splash').hidden); await calmo(cel);
    certo(fx(st.linhas('extrato')) === n, 'contas fixas duplicaram');
  });

  await teste('conta nova: trazer os dados pelo arquivo', async (st, abrir) => {
    const p = await abrir({ logar: false });
    await p.waitForSelector('#login:not([hidden])');
    await p.fill('#lgEmail', 'joao@teste.com'); await p.fill('#lgSenha', 'senha-certa'); await p.click('#lgBtn');
    await p.waitForSelector('#impArq', { state: 'attached' });
    const arq = path.join(CAPTURAS, 'importar.json');
    fs.writeFileSync(arq, JSON.stringify(DADOS));
    await p.setInputFiles('#impArq', arq);
    await p.waitForFunction(() => document.querySelector('#view .hero'), null, { timeout: 30000 });
    await calmo(p);
    certo(st.linhas('extrato').length >= DADOS.abas.EXTRATO.length, `extrato: ${st.linhas('extrato').length} de ${DADOS.abas.EXTRATO.length}`);
    certo(st.linhas('categorias').length === DADOS.abas.CATEGORIAS.length + (DADOS.abas.CATEGORIAS.some(c => c['SUB-CATEGORIA'] === 'Pagamento de fatura') ? 0 : 1), 'categorias');
    fs.unlinkSync(arq);
  }, { semear: false });

  await teste('outra pessoa não vê os dados do João', async (st, abrir) => {
    const p = await abrir({ logar: false });
    await p.waitForSelector('#login:not([hidden])');
    await p.fill('#lgEmail', 'outro@teste.com'); await p.fill('#lgSenha', 'outra'); await p.click('#lgBtn');
    await p.waitForSelector('#impArq', { state: 'attached' });
    certo(await p.evaluate(() => A.db.linhas('EXTRATO').length === 0), 'viu dados de outro');
  });

  await teste('Face ID: liga, abre o app com o rosto e, se falhar, entra com a senha', async (st, abrir) => {
    const p = await abrir({ host: 'localhost' }); /* biometria exige um nome de site, não número */
    const cdp = await p.context().newCDPSession(p);
    await cdp.send('WebAuthn.enable');
    const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } });
    await clica(p, '#view [data-a=conta]');
    await p.waitForSelector('#btFace:not([hidden])');
    await clica(p, '#btFace');
    await p.waitForFunction(() => /abre com/.test(document.getElementById('toast').textContent));
    await p.reload();
    await p.waitForFunction(() => document.getElementById('trava').hidden && document.querySelector('#view .hero'), null, { timeout: 15000 });
    /* rosto não reconhecido: fica travado e oferece a senha */
    await cdp.send('WebAuthn.setUserVerified', { authenticatorId, isUserVerified: false });
    await p.reload();
    await p.waitForSelector('#trava:not([hidden])');
    await clica(p, '#trBtn');
    await p.waitForSelector('#trErro:not([hidden])');
    certo(await p.evaluate(() => !document.getElementById('trava').hidden), 'abriu sem reconhecer o rosto');
    await clica(p, '#trSenha');
    await p.waitForSelector('#login:not([hidden])');
    await entrar(p);
    certo(await p.evaluate(() => !A.face.ligado()), 'Face ID continuou ligado depois de entrar com a senha');
    p.erros = [];
  });

  await teste('sair do aparelho volta para o login e não deixa a sessão salva', async (st, abrir) => {
    const p = await abrir();
    await clica(p, '#view [data-a=conta]');
    await clica(p, '#s2 [data-a=sair]');
    await p.waitForSelector('#login:not([hidden])');
    certo(await p.evaluate(() => !localStorage.getItem('df-sessao')), 'sessão ficou salva');
  });

  await teste('iPhone na tela de início: nada fica embaixo do relógio e da bateria', async (st, abrir) => {
    const p = await abrir({ larg: 393 });
    /* o iPhone com Dynamic Island deixa 59px em cima e 34px embaixo para o sistema */
    await p.addStyleTag({ content: ':root{--sa-t:59px!important;--sa-b:34px!important}' });
    const debaixo = () => p.evaluate(() => {
      const ruins = [];
      const w = document.createTreeWalker(document.querySelector('#view'), NodeFilter.SHOW_TEXT);
      for (let n; (n = w.nextNode());) {
        if (!n.textContent.trim()) continue;
        const r = document.createRange(); r.selectNodeContents(n);
        const q = r.getBoundingClientRect();
        if (q.height && q.bottom > 0 && q.top < 59) ruins.push(n.textContent.trim().slice(0, 30) + ' @' + Math.round(q.top));
      }
      return ruins;
    });
    for (const v of ['inicio', 'trabalhos', 'tarefas', 'equip', 'fin']) {
      await ir(p, v); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(150);
      const r = await debaixo();
      certo(!r.length, `tela ${v}: texto embaixo do relógio: ${r.slice(0, 3).join(' | ')}`);
      await p.screenshot({ path: path.join(CAPTURAS, `iphone-${v}.png`) });
    }
    /* rolando a lista, o título fica parado e cobre a área do relógio */
    await p.evaluate(() => scrollTo(0, 800)); await p.waitForTimeout(150);
    const barra = await p.evaluate(() => { const b = document.querySelector('#view .bar'); const r = b.getBoundingClientRect(); return { top: r.top, fundo: getComputedStyle(b).backgroundImage }; });
    certo(barra.top <= 0 && barra.fundo !== 'none', 'título não cobre o relógio ao rolar: ' + JSON.stringify(barra));
    /* formulário aberto também respeita o topo */
    await ir(p, 'inicio');
    await clica(p, '#view [data-a=novoL][data-t=saida]');
    const topo = await p.evaluate(() => document.getElementById('s2').getBoundingClientRect().top);
    certo(topo >= 59, 'formulário embaixo do relógio: ' + topo);
    const tab = await p.evaluate(() => innerHeight - document.getElementById('tabbar').getBoundingClientRect().bottom);
    certo(tab >= 34, 'menu de baixo em cima da barrinha do iPhone: ' + tab);
  });

  await teste('computador (1400px): menu lateral e nada passando da tela', async (st, abrir) => {
    const p = await abrir({ larg: 1400 });
    for (const v of ['inicio', 'trabalhos', 'tarefas', 'equip', 'fin']) {
      await clica(p, `#snav [data-a=go][data-v=${v}]`);
      const sobra = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      certo(sobra <= 0, `tela ${v} passa ${sobra}px`);
      await p.screenshot({ path: path.join(CAPTURAS, `1400-${v}.png`) });
    }
  });

  await teste.b.close();
  console.log(`\n${total - falhas} de ${total} testes passaram`);
  process.exit(falhas ? 1 : 0);
})();
