/* Etapa 1 · Entrar: login, ficar logado, Face ID, sair, ninguém mais vê os dados */
const { entrar, clica, certo } = require('../ajuda');
module.exports = { etapa: 'Entrar e segurança', testes: [
  ['senha errada avisa, senha certa entra e continua logado depois', async (st, abrir) => {
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
  }],
  ['Face ID como tela de bloqueio: só pede depois de 15 minutos fora, um toque abre, e se falhar entra com a senha', async (st, abrir) => {
    const p = await abrir({ host: 'localhost' }); /* biometria exige um nome de site, não número */
    const cdp = await p.context().newCDPSession(p);
    await cdp.send('WebAuthn.enable');
    const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } });
    await clica(p, '#view [data-a=conta]');
    await p.waitForSelector('#btFace:not([hidden])');
    await clica(p, '#btFace');
    await p.waitForFunction(() => /15 minutos fora/.test(document.getElementById('toast').textContent));
    /* acabou de usar: abre direto, sem pedir o rosto */
    await p.reload();
    await p.waitForFunction(() => document.getElementById('splash').hidden && document.querySelector('#view .hero'));
    certo(await p.evaluate(() => document.getElementById('trava').hidden), 'pediu o rosto logo depois de usar');
    /* ficou 20 minutos fora: aparece a tela de bloqueio, sem abrir nada sozinho */
    /* "ficar 20 minutos fora": ao abrir de novo, a última vez que usou foi há 20 minutos */
    await p.context().addInitScript(() => { if (sessionStorage.getItem('fora')) { sessionStorage.removeItem('fora'); localStorage.setItem('df-ultimo-uso', String(Date.now() - 20 * 60 * 1000)); } });
    const fora = async () => { await p.evaluate(() => sessionStorage.setItem('fora', '1')); await p.reload(); await p.waitForSelector('#trava:not([hidden])'); };
    await fora();
    await p.waitForTimeout(500);
    certo(await p.evaluate(() => !document.getElementById('trava').hidden), 'abriu sem o rosto');
    /* um toque em qualquer lugar da tela já abre (e os dados já estavam carregados por trás) */
    await p.mouse.click(30, 200);
    await p.waitForFunction(() => document.getElementById('trava').hidden && document.querySelector('#view .hero'), null, { timeout: 8000 });
    /* tocar várias vezes seguidas não trava */
    await fora();
    await p.mouse.click(30, 200); await p.mouse.click(40, 220); await p.mouse.click(50, 240);
    await p.waitForFunction(() => document.getElementById('trava').hidden, null, { timeout: 8000 });
    /* rosto não reconhecido: avisa e oferece a senha */
    await cdp.send('WebAuthn.setUserVerified', { authenticatorId, isUserVerified: false });
    await fora();
    await clica(p, '#trBtn');
    await p.waitForSelector('#trErro:not([hidden])');
    certo(await p.evaluate(() => !document.getElementById('trava').hidden), 'abriu sem reconhecer o rosto');
    await clica(p, '#trSenha');
    await p.waitForSelector('#login:not([hidden])');
    await entrar(p);
    certo(await p.evaluate(() => !A.face.ligado()), 'Face ID continuou ligado depois de entrar com a senha');
    p.erros = [];
  }],
  ['outra pessoa não vê os dados do João', async (st, abrir) => {
    const p = await abrir({ logar: false });
    await p.waitForSelector('#login:not([hidden])');
    await p.fill('#lgEmail', 'outro@teste.com'); await p.fill('#lgSenha', 'outra'); await p.click('#lgBtn');
    await p.waitForSelector('#impArq', { state: 'attached' });
    certo(await p.evaluate(() => A.db.linhas('EXTRATO').length === 0), 'viu dados de outro');
  }],
  ['sair do aparelho volta para o login e não deixa a sessão salva', async (st, abrir) => {
    const p = await abrir();
    await clica(p, '#view [data-a=conta]');
    await clica(p, '#s2 [data-a=sair]');
    await p.waitForSelector('#login:not([hidden])');
    certo(await p.evaluate(() => !localStorage.getItem('df-sessao')), 'sessão ficou salva');
  }],
] };
