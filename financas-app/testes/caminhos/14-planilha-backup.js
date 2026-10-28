/* Etapa 14 · Planilha de backup: o Backup.gs (Google Planilhas) copia tudo do app e as contas batem com as do app */
const { HOJE, igual, certo } = require('../ajuda');
const { rodar } = require('../planilha-de-mentira');
const CHAVE = 'dfc_chave-de-teste';
const quando = new Date(HOJE + 'T12:00:00-03:00');
const lerDo = st => (tabela, chave) => { if (chave !== CHAVE) throw new Error('chave do Claude errada ou desligada'); return st.linhas(tabela); };
const coluna = (aba, nome) => aba.valores[0].indexOf(nome);

module.exports = { etapa: 'Planilha de backup', testes: [
  ['ligar o backup: recusa chave errada, guarda a certa, atualiza de hora em hora e copia tudo', async (st) => {
    let r = rodar({ ler: lerDo(st), resposta: { texto: 'senha-qualquer' } });
    r.gs.ligar();
    certo(!r.props.CHAVE && !r.horarios.length && /dfc_/.test(r.avisos[0]), 'chave errada não liga: ' + r.avisos);
    r = rodar({ ler: lerDo(st), resposta: { texto: '  ' + CHAVE + ' ' } });
    r.gs.ligar(); r.gs.ligar();
    certo(r.props.CHAVE === CHAVE, 'chave guardada (sem espaços) nas propriedades do script');
    igual(r.horarios.length, 1, 'um horário só, mesmo ligando 2 vezes');
    igual(r.horarios[0].horas, 1, 'de hora em hora');
    certo(r.chamadas.every(c => /\/rest\/v1\/rpc\/claude_ler$/.test(c.url) && c.apikey.startsWith('sb_publishable_')), 'só lê pelo claude_ler');
    for (const [aba, tabela] of [['Extrato', 'extrato'], ['Contas', 'contas'], ['Cartões', 'cartoes'], ['Parcelados', 'parcelados'], ['Trabalhos', 'trabalhos'], ['Categorias', 'categorias']]) {
      const sh = r.ss.abas[aba];
      certo(sh, 'aba ' + aba);
      igual(sh.valores.length - 1, st.linhas(tabela).length, 'linhas em ' + aba);
      igual(sh.congeladas, 1, 'cabeçalho fixo em ' + aba);
    }
    const ex = r.ss.abas.Extrato, iD = coluna(ex, 'DATA'), iV = coluna(ex, 'VALOR');
    certo(ex.valores.slice(1).every(l => l[iD] === '' || Object.prototype.toString.call(l[iD]) === '[object Date]'), 'datas viram datas de verdade');
    certo(ex.valores.slice(2).every((l, i) => !(l[iD] > ex.valores[i + 1][iD])), 'extrato do mais novo para o mais antigo');
    certo(/R\$/.test(ex.formatos[iV + 1]), 'valor em reais');
    certo(ex.valores[0].includes('ID') && ex.valores[0].includes('DESCRIÇÃO'), 'cabeçalho igual ao do app');
    certo(!r.ss.abas['Página1'], 'a aba vazia da planilha nova sai');
    certo(/\d\d\/\d\d\/\d{4} \d\d:\d\d/.test(r.ss.abas.Sobre.valores[1][1]), 'data da última atualização');
  }],
  ['as contas da planilha (Resumo e Bancos) batem com as do app', async (st, abrir) => {
    // compra no cartão depois da conferência: não pode mexer no saldo da conta do mesmo banco
    const cx = st.linhas('contas').find(x => x.conta === 'Conta' && x.data_da_conferencia && x.data_da_conferencia < HOJE);
    certo(cx, 'dados de exemplo com conta conferida');
    st.tabelas.extrato.push({ id: 'LTESTE-CARTAO', user_id: 'u-joao', data: HOJE, banco: cx.banco, descricao: 'compra no cartão', grupo: 'Desejos', tipo: 'cartão', valor: -50, categoria: 'Compras', subcategoria: 'Roupas', status: 'Pago' });
    const p = await abrir();
    const app = await p.evaluate(() => ({
      meses: A.c.meses().map(m => { const r = A.c.resumo(m); return [m, r.entr, r.saiu, r.guardou]; }).filter(x => x[1] || x[2] || x[3]),
      contas: A.c.contas().map(x => [x['BANCO'], x['CONTA'], A.c.saldo(x)]), total: A.c.totalBancos(),
    }));
    const r = rodar({ ler: lerDo(st), props: { CHAVE } });
    r.gs.atualizar();
    const res = r.ss.abas.Resumo.valores.slice(1);
    for (const [m, e, s, g] of app.meses) {
      const l = res.find(x => x[0] === m.slice(5) + '/' + m.slice(0, 4));
      certo(l, 'mês ' + m + ' no resumo');
      igual(l[1], e, 'entrou em ' + m); igual(l[2], s, 'saiu em ' + m); igual(l[3], g, 'guardou em ' + m);
    }
    const bs = r.ss.abas.Bancos.valores.slice(1);
    for (const [b, cx, saldo] of app.contas) {
      const l = bs.find(x => x[0] === b && x[1] === cx);
      certo(l, `${b} ${cx} na aba Bancos`);
      certo(saldo === null ? l[2] === '' : Math.abs(l[2] - saldo) < 0.005, `saldo de ${b} ${cx}: app ${saldo}, planilha ${l[2]}`);
    }
    igual(bs[bs.length - 1][2], app.total, 'total dos bancos');
  }],
  ['Supabase recusou: o último backup bom continua lá', async (st) => {
    const r = rodar({ ler: lerDo(st), props: { CHAVE } });
    r.gs.atualizar();
    const antes = JSON.stringify(r.ss.abas);
    r.props.CHAVE = 'dfc_desligada';
    let erro = '';
    try { r.gs.atualizar(); } catch (e) { erro = e.message; }
    certo(/recusou/.test(erro), 'avisa o erro: ' + erro);
    certo(JSON.stringify(r.ss.abas) === antes, 'planilha igual ao último backup');
    r.gs.desligar();
    certo(!r.props.CHAVE, 'desligar apaga a chave do script');
  }],
] };
