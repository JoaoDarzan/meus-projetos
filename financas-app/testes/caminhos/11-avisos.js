/* Etapa 11 · Avisos no celular: a agenda acompanha os dados, ligar no aparelho, aviso de teste chega trancado
   e só o aparelho abre, o envio diário junta os avisos do dia e não repete, aparelho que sumiu sai da lista */
const crypto = require('crypto');
const { HOJE, calmo, clica, ir, certo, preparar } = require('../ajuda');
const amanha = d => new Date(Date.parse(d + 'T12:00:00Z') + 864e5).toISOString().slice(0, 10);
/* um "celular" de mentira: chaves dele e o endereço no serviço de avisos falso */
function celular(st, nome = 'cel1') {
  const ua = crypto.createECDH('prime256v1'); ua.generateKeys();
  const auth = crypto.randomBytes(16).toString('base64url');
  return { privada: ua.getPrivateKey().toString('base64url'), sub: { endpoint: `http://127.0.0.1:${st.porta}/__push/${nome}`, keys: { p256dh: ua.getPublicKey().toString('base64url'), auth } } };
}
const lerAviso = async (push, cel) => { const { destrancar } = await import('../../avisos/push.mjs'); return JSON.parse(destrancar(push.corpo, cel.privada, cel.sub.keys.auth)); };
const avisosDe = (st, txt) => st.linhas('avisos').filter(a => (a.titulo + ' ' + a.corpo).toLowerCase().includes(txt));

module.exports = { etapa: 'Avisos no celular', testes: [
  ['Supabase ainda sem as tabelas de avisos: o app abre e salva normal, sem mensagem de erro', async (st, abrir) => {
    delete st.tabelas.avisos; delete st.tabelas.aparelhos;
    const p = await abrir();
    await clica(p, '#view [data-a=novoL][data-t=saida]');
    await p.fill('#fV', '19'); await p.fill('#fD', 'Teste sem avisos'); await clica(p, '#s2 .save'); await calmo(p);
    await p.waitForTimeout(1800); await calmo(p);
    certo(st.linhas('extrato').some(r => r.descricao === 'Teste sem avisos'), 'não salvou o gasto');
    certo(!/não aceitou/.test(await p.textContent('#toast')), 'mostrou erro: ' + await p.textContent('#toast'));
    p.erros = p.erros.filter(e => !/404|avisos/.test(e));
  }],
  ['a agenda tem faturas, contas para pagar na mão e trabalhos, 1 dia antes e no dia', async (st, abrir) => {
    const p = await abrir();
    await preparar(p, [{ 'DESCRIÇÃO': 'Teste boleto internet', 'DATA': amanha(HOJE), 'STATUS': 'Previsto', 'VALOR': -99.9 },
      { 'DESCRIÇÃO': 'Teste débito automático', 'DATA': amanha(HOJE), 'STATUS': 'Previsto', 'OBS': 'Fixa · débito automático' }]);
    await p.evaluate(() => A.db.lote([{ op: 'salvar', aba: 'TRABALHOS', registro: { ID: 'JTESTE', 'CLIENTE': 'Teste Lia e Davi', 'TIPO DE EVENTO': 'Casamento', 'DATA DO EVENTO': '2026-11-20', 'ENTREGA': '2026-12-15', 'ETAPA': 'Fechado' } }]));
    await p.evaluate(() => A.sincronizarAvisos()); await calmo(p);
    const bol = avisosDe(st, 'boleto internet');
    certo(bol.map(a => a.quando).sort().join() === [HOJE, amanha(HOJE)].join(), 'boleto: ' + JSON.stringify(bol.map(a => [a.quando, a.titulo])));
    certo(bol.find(a => a.quando === HOJE).titulo.startsWith('Amanhã') && bol.find(a => a.quando === amanha(HOJE)).titulo.startsWith('Hoje'), 'textos do boleto');
    certo(/R\$ 99,90/.test(bol[0].corpo), 'valor no aviso: ' + bol[0].corpo);
    certo(!avisosDe(st, 'débito automático').length, 'débito automático não precisa de aviso');
    certo(st.linhas('avisos').some(a => a.tipo === 'fatura' && /fatura/.test(a.titulo)), 'nenhum aviso de fatura');
    const ev = avisosDe(st, 'lia e davi');
    certo(['2026-11-19', '2026-11-20', '2026-12-14', '2026-12-15'].every(d => ev.some(a => a.quando === d)), 'trabalho: ' + ev.map(a => a.quando).join());
  }],
  ['pagou a conta: o aviso sai da agenda', async (st, abrir) => {
    const p = await abrir();
    await preparar(p, [{ 'DESCRIÇÃO': 'Teste conta de água', 'DATA': amanha(HOJE), 'STATUS': 'Previsto', 'VALOR': -80 }]);
    await p.evaluate(() => A.sincronizarAvisos()); await calmo(p);
    certo(avisosDe(st, 'conta de água').length === 2, 'não criou os avisos');
    await ir(p, 'tarefas');
    const id = await p.evaluate(() => A.c.tarefas().find(t => /conta de água/.test(t.titulo)).id);
    await clica(p, `[data-a=tarefa][data-id="${id}"]`);
    await p.waitForTimeout(1600); await calmo(p);
    certo(!avisosDe(st, 'conta de água').length, 'o aviso continuou depois de pagar');
  }],
  ['ligar os avisos, mandar um aviso de teste e ele chegar trancado só para o aparelho', async (st, abrir) => {
    const cel = celular(st);
    const p = await abrir({ push: cel.sub });
    await clica(p, '#view [data-a=conta]');
    await clica(p, '#s2 [data-a=avisoLigar]'); await calmo(p);
    const ap = st.linhas('aparelhos');
    certo(ap.length === 1 && ap[0].endpoint === cel.sub.endpoint && ap[0].p256dh === cel.sub.keys.p256dh, 'aparelho não ficou salvo');
    await p.waitForSelector('#s2 [data-a=avisoTeste]');
    await clica(p, '#s2 [data-a=avisoTeste]');
    await p.waitForFunction(() => /até 30 minutos/.test(document.getElementById('toast').textContent), null, { timeout: 15000 });
    /* o GitHub roda o envio (antes das 9h, só os de teste) */
    const { enviarAvisos } = await import('../../avisos/avisos.mjs'), { oQueMandar } = await import('../../avisos/enviar.mjs');
    certo(oQueMandar(new Date('2026-10-27T10:00:00Z')).soTeste && !oQueMandar(new Date('2026-10-27T12:30:00Z')).soTeste, 'regra das 9h');
    const r = await enviarAvisos({ soTeste: true, segredo: 'segredo-de-teste', publica: null, hoje: HOJE, supabase: { url: `http://127.0.0.1:${st.porta}`, chave: 'chave-de-teste' } });
    certo(r.enviados === 1, 'envio do teste: ' + JSON.stringify(r));
    certo(st.pushes.length === 1, `chegaram ${st.pushes.length} avisos`);
    const pu = st.pushes[0];
    certo(pu.headers['content-encoding'] === 'aes128gcm' && /^vapid t=.+, k=/.test(pu.headers.authorization) && pu.headers.ttl, 'cabeçalhos do aviso: ' + JSON.stringify(pu.headers));
    certo(!pu.corpo.toString('latin1').includes('Teste do Darzan'), 'o aviso foi aberto, sem trancar');
    const msg = await lerAviso(pu, cel);
    certo(msg.titulo === 'Teste do Darzan Finanças' && /funcionando/.test(msg.corpo), 'aviso: ' + JSON.stringify(msg));
    certo(st.linhas('avisos').filter(a => a.tipo === 'teste').every(a => a.enviado), 'o teste não ficou marcado como enviado');
    /* desligar tira o aparelho */
    await clica(p, '#s2 [data-a=avisoDesligar]'); await calmo(p);
    certo(!st.linhas('aparelhos').length, 'aparelho continuou depois de desligar');
  }],
  ['envio diário: junta os avisos do dia numa mensagem, não manda de novo e tira aparelho que sumiu', async (st, abrir) => {
    const cel = celular(st, 'cel1'), velho = celular(st, 'velho');
    const p = await abrir({ push: cel.sub });
    await clica(p, '#view [data-a=conta]'); await clica(p, '#s2 [data-a=avisoLigar]'); await calmo(p);
    await p.evaluate(v => A.db.lote([{ op: 'salvar', aba: 'APARELHOS', registro: { ID: 'DVELHO', 'NOME': 'iPhone antigo', 'ENDPOINT': v.endpoint, 'P256DH': v.keys.p256dh, 'AUTH': v.keys.auth } }]), velho.sub);
    await preparar(p, [{ 'DESCRIÇÃO': 'Teste aluguel', 'DATA': HOJE, 'STATUS': 'Previsto', 'VALOR': -1200 }, { 'DESCRIÇÃO': 'Teste academia', 'DATA': HOJE, 'STATUS': 'Previsto', 'VALOR': -110 }]);
    await p.evaluate(() => A.sincronizarAvisos()); await calmo(p);
    const deHoje = st.linhas('avisos').filter(a => a.quando === HOJE && !a.enviado).length;
    certo(deHoje >= 2, 'poucos avisos para hoje: ' + deHoje);
    st.pushStatus.velho = 410; /* esse celular não existe mais */
    const { enviarAvisos } = await import('../../avisos/avisos.mjs');
    const conf = { segredo: 'segredo-de-teste', publica: null, hoje: HOJE, supabase: { url: `http://127.0.0.1:${st.porta}`, chave: 'chave-de-teste' } };
    const r = await enviarAvisos(conf);
    certo(r.enviados === deHoje, 'resultado: ' + JSON.stringify(r));
    const meus = st.pushes.filter(x => x.id === 'cel1');
    certo(meus.length === 1, `o celular recebeu ${meus.length} mensagens (devia ser 1 com tudo junto)`);
    const msg = await lerAviso(meus[0], cel);
    certo(new RegExp(`Você tem ${deHoje} avisos`).test(msg.titulo) && /aluguel/.test(msg.corpo) && /academia/.test(msg.corpo), 'mensagem: ' + JSON.stringify(msg));
    certo(!st.linhas('aparelhos').some(a => a.id === 'DVELHO'), 'o aparelho que sumiu continuou na lista');
    const de2 = await enviarAvisos(conf);
    certo(de2.enviados === 0 && st.pushes.filter(x => x.id === 'cel1').length === 1, 'mandou de novo: ' + JSON.stringify(de2));
    const errado = await enviarAvisos(Object.assign({}, conf, { segredo: 'chute' })).catch(e => ({ erro: e.message }));
    certo(errado.erro, 'segredo errado conseguiu ler os avisos');
  }],
] };
