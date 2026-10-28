/* Etapa 13 · Acesso do Claude: o João cria a chave no app; com ela o Claude lê e corrige direto (só os dados do João);
   o app mostra a correção quando o João volta para ele; trocar ou desligar a chave corta o acesso na hora */
const crypto = require('crypto'), { spawn } = require('child_process');
const { calmo, clica, certo, path, fs, CAPTURAS } = require('../ajuda');
const FERRAMENTA = path.resolve(__dirname, '../../ferramentas/claude.py');
/* roda a ferramenta do Claude sem travar o teste (o Supabase de mentira roda neste mesmo processo) */
const claude = (st, chave, ...args) => new Promise(ok => {
  const pr = spawn('python3', ['-I', FERRAMENTA, ...args], { env: Object.assign({}, process.env, { DF_URL: `http://127.0.0.1:${st.porta}`, DF_CHAVE_PUBLICA: 'chave-de-teste', DF_CLAUDE_CHAVE: chave, NO_PROXY: '127.0.0.1,localhost', no_proxy: '127.0.0.1,localhost' }) });
  let stdout = '', stderr = '';
  pr.stdout.on('data', d => stdout += d); pr.stderr.on('data', d => stderr += d);
  pr.on('close', status => ok({ status, stdout, stderr }));
});
module.exports = { etapa: 'Acesso do Claude', testes: [
  ['criar a chave, o Claude ler e corrigir direto, o app mostrar, e trocar/desligar cortar o acesso', async (st, abrir) => {
    st.tabelas.extrato.push({ id: 'L-DO-OUTRO', user_id: 'u-outro', descricao: 'segredo do outro', valor: -1 });
    const p = await abrir();
    await clica(p, '#view [data-a=conta]');
    await p.waitForSelector('#s2 [data-a=claudeCriar]');
    await clica(p, '#s2 [data-a=claudeCriar]');
    await p.waitForSelector('#clChave');
    const chave = await p.inputValue('#clChave');
    certo(/^dfc_[\w-]{40,}$/.test(chave), 'chave estranha: ' + chave);
    const ac = st.tabelas.acesso_claude;
    certo(ac.length === 1 && ac[0].hash === crypto.createHash('sha256').update(chave).digest('hex') && !ac.some(x => x.hash === chave), 'no Supabase tem que ficar só a impressão digital da chave');
    /* o Claude lê: só o que é do João */
    let r = await claude(st, chave, 'ler', 'extrato');
    certo(r.status === 0, 'ler: ' + r.stderr);
    const lido = JSON.parse(r.stdout);
    certo(lido.length === st.linhas('extrato').length && !lido.some(l => l.id === 'L-DO-OUTRO'), `leu ${lido.length} (devia ${st.linhas('extrato').length}, sem os do outro)`);
    /* o Claude corrige (só a categoria de um lançamento) */
    const alvo = lido.find(l => l.grupo === 'Renda');
    const arq = path.join(CAPTURAS, 'mudancas.json');
    fs.writeFileSync(arq, JSON.stringify([{ tabela: 'extrato', op: 'salvar', linha: { id: alvo.id, categoria: 'Outras rendas', subcategoria: 'Venda' } }, { tabela: 'extrato', op: 'salvar', linha: { id: 'L-DO-OUTRO', valor: 0 } }]));
    r = await claude(st, chave, 'gravar', arq, '--sim');
    certo(r.status === 0, 'gravar: ' + r.stderr);
    const depois = st.linhas('extrato').find(l => l.id === alvo.id);
    certo(depois.categoria === 'Outras rendas' && depois.valor === alvo.valor && depois.descricao === alvo.descricao, 'a correção mexeu no que não devia');
    certo(st.tabelas.extrato.find(l => l.id === 'L-DO-OUTRO').valor === -1, 'mexeu nos dados de outra pessoa');
    /* o João volta para o app: aparece a correção */
    await p.keyboard.press('Escape');
    await p.evaluate(() => { A.db.quando = 0; document.dispatchEvent(new Event('visibilitychange')); });
    await p.waitForFunction(id => A.db.achar('EXTRATO', id)['CATEGORIA'] === 'Outras rendas', alvo.id, { timeout: 8000 });
    /* trocar a chave: a antiga para de funcionar */
    await clica(p, '#view [data-a=conta]'); await p.waitForSelector('#clChave');
    await clica(p, '#s2 [data-a=claudeCriar]');
    await p.waitForFunction(c => document.getElementById('clChave') && document.getElementById('clChave').value !== c, chave);
    const nova = await p.inputValue('#clChave');
    r = await claude(st, chave, 'ler', 'extrato');
    certo(r.status !== 0 && /chave do Claude errada/.test(r.stderr), 'a chave antiga continuou funcionando');
    certo((await claude(st, nova, 'ler', 'metas')).status === 0, 'a chave nova não funciona');
    /* desligar: nenhuma chave funciona */
    await clica(p, '#s2 [data-a=claudeDesligar]'); await clica(p, '#s2 [data-a=claudeDesligar]');
    await p.waitForSelector('#s2 [data-a=claudeCriar]');
    certo((await claude(st, nova, 'ler', 'metas')).status !== 0, 'desligou e a chave continuou funcionando');
    certo(!st.tabelas.acesso_claude.length, 'a impressão digital ficou no Supabase');
    fs.unlinkSync(arq);
  }],
] };
