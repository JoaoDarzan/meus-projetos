/* Etapa 25 · Salário pela foto do holerite: a foto vai para a função do Supabase (o código de verdade, com um Claude de mentira),
   o João confere as linhas e lança. Valores e empresa inventados. */
const { HOJE, calmo, clica, certo, igual, conferirLayout } = require('../ajuda');
const mesmo = (a, b, msg) => certo(a === b, `${msg}: esperava ${b}, veio ${a}`);
const addDias = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const m0 = HOJE.slice(0, 7);
/* foto de 2x2 pixels (PNG) só para o app ter o que mandar */
const FOTO = { name: 'holerite.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDgx3YqgAAAABJRU5ErkJggg==', 'base64') };
const I = (descricao, vencimento, desconto = null, referencia = '') => ({ codigo: '1', descricao, referencia, vencimento, desconto });
const HOLERITE = (extra = {}) => Object.assign({
  legivel: true, motivo: '', empresa: 'Empresa Exemplo Ltda', competencia_mes: 9, competencia_ano: 2026,
  itens: [I('Salario', 2000, null, '30,00'), I('D.S.R. Sobre Horas Extras', 10), I('Horas Extras 60%', 40, null, '2,50'), I('Vale Refeicao', 400), I('Passe', 150),
    I('Bonificacao', 500), I('Adicional Noturno', 5, null, '0,50'), I('INSS Sobre Salario', null, 160, '9,00'), I('IRRF Sobre Salario', null, 20), I('Arredondamento Anterior', null, 0.5)],
  total_vencimentos: 3105, total_descontos: 180.5, liquido: 2924.5, salario_base: 2000, fgts_mes: 160, base_inss: 2555,
}, extra);
const claudeLe = h => async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(h) }] });
const irMeuTrabalho = async p => { await p.evaluate(() => { Object.assign(A.ui, { view: 'fin', fseg: 'relatorios', rseg: 'clt' }); A.render(false); }); await p.waitForSelector('#view [data-a=holeriteFoto]'); };
const mandarFoto = async p => { const [esc] = await Promise.all([p.waitForEvent('filechooser'), clica(p, '#view [data-a=holeriteFoto]')]); await esc.setFiles(FOTO); };
const linha = (st, k) => st.linhas('extrato').find(l => l.id === `LCLT-${m0}-${k}`);

module.exports = { etapa: 'Holerite pela foto', testes: [
  ['a foto vira as linhas do salário (salário, vales, bônus, horas extras) que fecham no líquido; o João confere, escolhe dia e banco e lança', async (st, abrir) => {
    st.holerite = claudeLe(HOLERITE());
    st.tabelas.extrato = st.tabelas.extrato.filter(l => !(l.categoria === 'Salário CLT' && String(l.data).startsWith(m0))); /* o salário de exemplo deste mês sai, para conferir só o da foto */
    const p = await abrir({ aparelho: 'iphone-15' });
    await irMeuTrabalho(p);
    await mandarFoto(p);
    await p.waitForSelector('#s2 #hLinhas');
    const pedido = st.pedidosClaude[0], img = pedido.messages[0].content[0];
    certo(pedido.model === 'claude-opus-5-5' && img.type === 'image' && img.source.media_type === 'image/jpeg' && img.source.data.length > 50 && !img.source.data.startsWith('data:'), 'a foto foi para o Claude como imagem: ' + JSON.stringify({ model: pedido.model, tipo: img.source.media_type }));
    certo(pedido.output_config.format.type === 'json_schema' && pedido.fallbacks === 'default' && !/cpf|nome do funcion/i.test(JSON.stringify(pedido.output_config.format.schema)), 'resposta em formato fixo, sem dado pessoal, e com plano B se o modelo recusar');
    certo(/Conferi a leitura/.test(await p.textContent('#s2')), 'avisa que conferiu as somas');
    const vistas = await p.$$eval('#s2 #hLinhas .hl', ls => ls.map(l => l.textContent.replace(/\s+/g, ' ').trim()));
    certo(vistas.length === 5 && /Salário \(setembro\)R\$ 1\.824,50/.test(vistas[0]) && /Horas extras \(setembro\) · 2,5 hR\$ 50,00/.test(vistas[4]), 'as 5 linhas: ' + vistas);
    await conferirLayout(p, 'holerite lido');
    mesmo(await p.inputValue('#s2 #hB'), 'Inter', 'o banco já vem no Inter (onde o salário cai)');
    await p.fill('#s2 #hDt', addDias(HOJE, -1)); await p.selectOption('#s2 #hB', 'Nubank');
    await clica(p, '#s2 .save'); await calmo(p);
    const v = k => linha(st, k) && linha(st, k).valor;
    certo(v('SAL') === 1824.5 && v('VR') === 400 && v('VT') === 150 && v('BON') === 500 && v('HE') === 50, 'valores gravados: ' + ['SAL', 'VR', 'VT', 'BON', 'HE'].map(v));
    igual(['SAL', 'VR', 'VT', 'BON', 'HE'].reduce((s, k) => s + v(k), 0), 2924.5, 'a soma é o líquido');
    const sal = linha(st, 'SAL');
    certo(sal.status === 'Pago' && sal.banco === 'Nubank' && sal.data === addDias(HOJE, -1) && sal.categoria === 'Salário CLT' && sal.grupo === 'Renda', 'caiu ontem no Nubank: ' + JSON.stringify(sal));
    certo(/^Holerite de setembro\/2026 · /.test(sal.obs) && /bruto R\$ 3\.105,00/.test(sal.obs) && /INSS R\$ 160,00/.test(sal.obs) && /IRRF R\$ 20,00/.test(sal.obs) && /salário base R\$ 2\.000,00/.test(sal.obs) && /líquido R\$ 2\.924,50/.test(sal.obs), 'anotação com os números do holerite: ' + sal.obs);
    const mt = await p.evaluate(m => A.c.clt().find(x => x.m === m), m0);
    certo(mt && mt.liq === 2924.5 && mt.horas === 2.5 && mt.irrf === 20 && mt.inss === 160 && mt.base === 2000 && mt.comp === 'setembro/2026', 'Meu trabalho lê o holerite: ' + JSON.stringify(mt));
    const hs = st.linhas('holerites');
    certo(hs.length === 1 && hs[0].id === 'H2026-09' && hs[0].competencia === '2026-09' && hs[0].liquido === 2924.5 && JSON.parse(hs[0].dados).itens.length === 10, 'guardou o holerite inteiro: ' + JSON.stringify(hs[0]));
    certo(/IR R\$ 20/.test(await p.textContent('#view')) && /2,5 h extras/.test(await p.textContent('#view')), 'a lista mostra o imposto de renda e as horas com vírgula');
  }],
  ['salário que ainda não caiu fica previsto; lançar de novo no mês troca o anterior sem perder a marca do robô dos bancos; leitura que não fecha avisa antes', async (st, abrir) => {
    const L = (k, valor, obs = '') => ({ id: `LCLT-${m0}-${k}`, user_id: 'u-joao', data: HOJE, banco: 'Inter', descricao: 'antigo ' + k, grupo: 'Renda', tipo: 'conta', valor, categoria: 'Salário CLT', subcategoria: 'Salário', status: 'Pago', parcela: '', obs });
    st.tabelas.extrato.push(L('SAL', 999, 'Holerite antigo · OF 0b5f6c1e-1111-2222-3333-444455556666'), L('COM', 77));
    st.holerite = claudeLe(HOLERITE({ liquido: 2924 }));
    const p = await abrir({ aparelho: 'iphone-15' });
    await irMeuTrabalho(p); await mandarFoto(p);
    await p.waitForSelector('#s2 #hProb');
    certo(/líquido é R\$ 2\.924,00/.test(await p.textContent('#s2 #hProb')) && /vai ser trocado/.test(await p.textContent('#s2')), 'avisa que a leitura não fecha e que vai trocar o do mês');
    await p.fill('#s2 #hDt', addDias(HOJE, 2));
    await clica(p, '#s2 .save'); await calmo(p);
    const sal = linha(st, 'SAL');
    certo(sal.valor === 1824 && /OF 0b5f6c1e-1111-2222-3333-444455556666/.test(sal.obs) && sal.status === 'Pago' && sal.data === HOJE, 'trocou o valor e manteve a marca do robô (já conferido com o banco): ' + JSON.stringify(sal));
    mesmo(linha(st, 'VR').status, 'Previsto', 'o que ainda vai cair fica previsto');
    certo(!linha(st, 'COM'), 'a linha antiga que sobrou saiu');
  }],
  ['sem a função ligada no Supabase: explica o passo a passo; foto ilegível ou chave do Claude errada: diz o que fazer', async (st, abrir) => {
    const p = await abrir({ aparelho: 'iphone-15' });
    await irMeuTrabalho(p); await mandarFoto(p);
    await p.waitForSelector('#s2 :text("Falta 1 passo para ler holerite pela foto")');
    certo(/ANTHROPIC_API_KEY/.test(await p.textContent('#s2')) && /ler-holerite/.test(await p.textContent('#s2')), 'mostra o que ligar');
    await clica(p, '#s2 [data-a=fechar]');
    st.holerite = claudeLe(HOLERITE({ legivel: false, motivo: 'A foto está tremida' }));
    await mandarFoto(p); await p.waitForSelector('#s2 :text("Não deu para ler")');
    certo(/A foto está tremida/.test(await p.textContent('#s2')), 'diz por que não leu');
    await clica(p, '#s2 [data-a=fechar]');
    st.holerite = async () => { const e = new Error('invalid x-api-key'); e.status = 401; throw e; };
    await mandarFoto(p); await p.waitForSelector('#s2 :text("A chave do Claude não funcionou")');
    certo(!(await p.evaluate(() => A.c.lancs().some(l => /^LCLT-/.test(l.id) && /lido pela foto/.test(l.obs)))), 'nada foi lançado');
  }],
  ['a função só atende quem está logado no app, só foto, e não mostra a chave', async (st, abrir) => {
    st.holerite = claudeLe(HOLERITE());
    const p = await abrir({ aparelho: 'iphone-15' });
    const r = await p.evaluate(async () => {
      const cfg = A.nuvem.config, ir = (cab, corpo) => fetch(cfg.url + '/functions/v1/ler-holerite', { method: 'POST', headers: Object.assign({ apikey: cfg.chave, 'Content-Type': 'application/json' }, cab), body: JSON.stringify(corpo) }).then(async r => [r.status, await r.text()]);
      const tk = A.nuvem.sessao.access_token;
      return { semLogin: await ir({}, { imagem: 'AAAA', tipo: 'image/jpeg' }), tokenFalso: await ir({ Authorization: 'Bearer inventado' }, { imagem: 'AAAA', tipo: 'image/jpeg' }),
        pdf: await ir({ Authorization: 'Bearer ' + tk }, { imagem: 'AAAA', tipo: 'application/pdf' }), lixo: await ir({ Authorization: 'Bearer ' + tk }, { imagem: '<script>', tipo: 'image/jpeg' }) };
    });
    certo(r.semLogin[0] === 401 && r.tokenFalso[0] === 401 && r.pdf[0] === 400 && r.lixo[0] === 400, 'recusa: ' + JSON.stringify(r));
    igual(st.pedidosClaude.length, 0, 'nada disso chegou ao Claude');
    const partes = await p.evaluate(() => ['D.S.R. Sobre Horas Extras', 'DSR Adicional Noturno', 'Vale Refeicao', 'Passe', 'Bonificacao', 'Horas Extras 80%', 'Diferenca de Salario', 'Adicional Noturno Horas 30%'].map(A.c.parteHolerite));
    mesmo(partes.join(','), 'HE,SAL,VR,VT,BON,HE,SAL,SAL', 'cada item do holerite vai para a parte certa');
  }],
  ['tocar num holerite abre tudo detalhado: como entrou na conta, cada vencimento e desconto com a referência, horas, bases e FGTS; salário que ainda vai cair aparece como "a receber"', async (st, abrir) => {
    st.tabelas.extrato = st.tabelas.extrato.filter(l => l.categoria !== 'Salário CLT');
    const L = (m, k, valor, sub, desc, status = 'Pago', data = m + '-06') => ({ id: `LCLT-${m}-${k}`, user_id: 'u-joao', data, banco: 'Inter', descricao: desc, grupo: 'Renda', tipo: 'conta', valor, categoria: 'Salário CLT', subcategoria: sub, status, parcela: '', obs: 'holerite' });
    const ant = addDias(HOJE, -40).slice(0, 7), prox = HOJE; /* cai hoje, ainda não confirmado */
    st.tabelas.extrato.push(L(ant, 'SAL', 1800, 'Salário', 'Salário (anterior)'), L(ant, 'VR', 400, 'Vale-refeição', 'Vale-refeição (anterior)'),
      L(m0, 'SAL', 1824.5, 'Salário', 'Salário (setembro)', 'Previsto', prox), L(m0, 'VR', 400, 'Vale-refeição', 'Vale-refeição (setembro)', 'Previsto', prox), L(m0, 'VT', 150, 'Vale-transporte', 'Vale-transporte (setembro)', 'Previsto', prox),
      L(m0, 'BON', 500, 'Bonificação', 'Bonificação (setembro)', 'Previsto', prox), L(m0, 'HE', 50, 'Horas extras', 'Horas extras (setembro) · 2,5 h', 'Previsto', prox));
    const h = HOLERITE();
    st.tabelas.holerites.push({ id: 'H2026-09', user_id: 'u-joao', competencia: '2026-09', empresa: 'Empresa Exemplo Ltda', pagamento: prox, banco: 'Inter', liquido: 2924.5,
      dados: JSON.stringify(Object.assign({}, h, { base_fgts: 2555, base_irrf: 2555, faixa_irrf: 7.5 })) });
    const p = await abrir({ aparelho: 'iphone-15' });
    await irMeuTrabalho(p);
    certo(/a receber/.test(await p.textContent('#view .sub')) && /2\.924/.test(await p.textContent('#view .bignum')), 'o último salário é o que vai cair, marcado "a receber"');
    certo(/Recebido no ano\s*R\$ 2\.200,00/.test((await p.textContent('#view .kpis')).replace(/\s+/g, ' ')), 'recebido no ano só conta o que já caiu: ' + await p.textContent('#view .kpis'));
    await clica(p, `#view [data-a=verHolerite][data-v="${m0}"]`); await p.waitForSelector('#s2 #hVenc');
    const txt = sel => p.textContent(sel).then(t => t.replace(/\s+/g, ' '));
    const venc = await txt('#s2 #hVenc'), desc = await txt('#s2 #hDesc'), horas = await txt('#s2 #hHoras'), bases = await txt('#s2 #hBases'), partes = await txt('#s2 #hPartes');
    certo(/Holerite de setembro\/2026/.test(await txt('#s2 h3')) && /Empresa Exemplo/.test(await txt('#s2')) && /cai em/.test(await txt('#s2')), 'título, empresa e quando cai');
    certo(/Salário.*30 dias.*R\$ 2\.000,00/.test(venc) && /Horas extras 60%.*2,5 h.*R\$ 40,00/.test(venc) && /DSR sobre horas extras.*descanso semanal.*R\$ 10,00/.test(venc) && /Passe.*vale-transporte.*R\$ 150,00/.test(venc) && /Total de vencimentos\s*R\$ 3\.105,00/.test(venc), 'cada vencimento com referência e explicação: ' + venc);
    certo(/INSS sobre salário.*9%.*R\$ 160,00/.test(desc) && /IRRF sobre salário.*imposto de renda.*R\$ 20,00/.test(desc) && /Total de descontos\s*R\$ 180,50/.test(desc), 'descontos: ' + desc);
    certo(/Dias de salário\s*30 dias/.test(horas) && /Horas extras 60%.*2,5 h/.test(horas) && /Horas à noite.*0,5 h/.test(horas), 'horas e dias: ' + horas);
    certo(/Salário base \(contrato\)\s*R\$ 2\.000,00/.test(bases) && /FGTS do mês.*R\$ 160,00/.test(bases) && /Faixa do imposto de renda\s*7,5%/.test(bases), 'bases e FGTS: ' + bases);
    certo(/Salário \(setembro\).*R\$ 1\.824,50/.test(partes) && /Bonificação \(setembro\).*R\$ 500,00/.test(partes) && /a receber/.test(partes), 'como entra na conta: ' + partes);
    certo(/\+ R\$ 724,50 que no mês anterior/.test(await txt('#s2')), 'compara com o mês anterior');
    await conferirLayout(p, 'holerite detalhado');
    await clica(p, '#s2 [data-a=fechar]');
    await clica(p, `#view [data-a=verHolerite][data-v="${ant}"]`); await p.waitForSelector('#s2 :text("Mandar a foto deste holerite")');
    certo(/não tem o holerite guardado item por item/.test(await txt('#s2')) && /Salário \(anterior\)/.test(await txt('#s2 #hPartes')), 'mês sem holerite guardado: mostra o que entrou e pede a foto');
  }],
  ['sem a tabela dos holerites no Supabase: avisa o passo e lançar pela foto continua funcionando (só não guarda o detalhe)', async (st, abrir) => {
    st.semTabela('holerites'); st.holerite = claudeLe(HOLERITE());
    const p = await abrir({ aparelho: 'iphone-15' });
    await irMeuTrabalho(p);
    certo(/atualizacao-holerites\.sql/.test(await p.textContent('#view')), 'mostra o arquivo para rodar');
    await mandarFoto(p); await p.waitForSelector('#s2 #hLinhas');
    await clica(p, '#s2 .save'); await calmo(p);
    certo(linha(st, 'SAL') && linha(st, 'VR'), 'o salário foi lançado');
    certo(!(await p.evaluate(() => A.db.fila.length)), 'nada ficou preso na fila de envio');
  }],
] };
