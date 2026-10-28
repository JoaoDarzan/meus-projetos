/* Etapa 9 · Dados: trazer da planilha, contas batem, cópia de segurança */
const { HOJE, CAPTURAS, calmo, clica, resumo, brl, igual, certo, path, fs } = require('../ajuda');
module.exports = { etapa: 'Dados', testes: [
  ['conta nova: trazer os dados pelo arquivo', async (st, abrir, DADOS) => {
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
    fs.unlinkSync(arq);
  }, { semear: false }],
  ['"Para onde foi" soma igual ao "Saiu"', async (st, abrir) => {
    const p = await abrir();
    const r = await resumo(p, HOJE.slice(0, 7));
    igual(r.somaCats, r.saiu, 'soma das categorias');
    igual(brl(await p.locator('.tot-row').first().textContent()), r.saiu, 'linha de total');
  }],
  ['baixar uma cópia dos dados traz tudo', async (st, abrir) => {
    const p = await abrir();
    await clica(p, '#view [data-a=conta]');
    const [down] = await Promise.all([p.waitForEvent('download'), clica(p, '#s2 [data-a=baixarCopia]')]);
    const arq = path.join(CAPTURAS, 'copia.json'); await down.saveAs(arq);
    const c = JSON.parse(fs.readFileSync(arq, 'utf8'));
    certo(c.abas.EXTRATO.length === st.linhas('extrato').length, 'cópia sem todos os lançamentos');
    fs.unlinkSync(arq);
  }],
] };
