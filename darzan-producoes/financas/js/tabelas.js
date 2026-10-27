/* As tabelas do app no Supabase. Cada uma é uma "aba" com cabeçalho e uma linha por registro.
   [nome que o app usa, coluna no Supabase, tipo]. Daqui sai também o SQL (financas-app/ferramentas/gerar_sql.js). */
(function (raiz) {
  const T = {
    EXTRATO: { tabela: 'extrato', prefixo: 'L', colunas: [
      ['DATA', 'data', 'date'], ['BANCO', 'banco', 'text'], ['DESCRIÇÃO', 'descricao', 'text'], ['GRUPO', 'grupo', 'text'], ['TIPO', 'tipo', 'text'],
      ['VALOR', 'valor', 'numeric'], ['CATEGORIA', 'categoria', 'text'], ['SUB-CATEGORIA', 'subcategoria', 'text'], ['STATUS', 'status', 'text'],
      ['PARCELA', 'parcela', 'text'], ['OBS', 'obs', 'text']] },
    CONTAS: { tabela: 'contas', prefixo: 'C', colunas: [
      ['BANCO', 'banco', 'text'], ['CONTA', 'conta', 'text'], ['SALDO CONFERIDO', 'saldo_conferido', 'numeric'], ['DATA DA CONFERÊNCIA', 'data_da_conferencia', 'date'],
      ['PARA QUÊ', 'para_que', 'text'], ['OBS', 'obs', 'text']] },
    CARTOES: { tabela: 'cartoes', prefixo: 'K', colunas: [
      ['CARTÃO', 'cartao', 'text'], ['LIMITE', 'limite', 'numeric'], ['FECHA DIA', 'fecha_dia', 'numeric'], ['VENCE DIA', 'vence_dia', 'numeric'],
      ['PAGA PELA CONTA', 'paga_pela_conta', 'text'], ['OBS', 'obs', 'text']] },
    PARCELADOS: { tabela: 'parcelados', prefixo: 'P', colunas: [
      ['DATA DA COMPRA', 'data_da_compra', 'date'], ['DESCRIÇÃO', 'descricao', 'text'], ['CARTÃO', 'cartao', 'text'], ['VALOR TOTAL', 'valor_total', 'numeric'],
      ['PARCELAS', 'parcelas', 'numeric'], ['VALOR DA PARCELA', 'valor_da_parcela', 'numeric'], ['1ª PARCELA', 'primeira_parcela', 'text'],
      ['CATEGORIA', 'categoria', 'text'], ['SUB-CATEGORIA', 'subcategoria', 'text']] },
    FIXAS: { tabela: 'fixas', prefixo: 'F', colunas: [
      ['DESCRIÇÃO', 'descricao', 'text'], ['VALOR', 'valor', 'numeric'], ['DIA', 'dia', 'numeric'], ['BANCO', 'banco', 'text'], ['TIPO', 'tipo', 'text'],
      ['GRUPO', 'grupo', 'text'], ['CATEGORIA', 'categoria', 'text'], ['SUB-CATEGORIA', 'subcategoria', 'text'], ['ATIVA', 'ativa', 'text'], ['OBS', 'obs', 'text']] },
    EQUIPAMENTOS: { tabela: 'equipamentos', prefixo: 'E', colunas: [
      ['NOME', 'nome', 'text'], ['TIPO', 'tipo', 'text'], ['VALOR', 'valor', 'numeric'], ['DATA DA COMPRA', 'data_da_compra', 'date'], ['COMO PAGOU', 'como_pagou', 'text'],
      ['ESTADO', 'estado', 'text'], ['Nº DE SÉRIE', 'numero_de_serie', 'text'], ['OBS', 'obs', 'text'], ['FOTO', 'foto', 'text']] },
    TRABALHOS: { tabela: 'trabalhos', prefixo: 'J', colunas: [
      ['CLIENTE', 'cliente', 'text'], ['TIPO DE EVENTO', 'tipo_de_evento', 'text'], ['DATA DO EVENTO', 'data_do_evento', 'date'], ['LOCAL', 'local', 'text'],
      ['O QUE FOI FECHADO', 'o_que_foi_fechado', 'text'], ['VALOR TOTAL', 'valor_total', 'numeric'], ['ENTREGA', 'entrega', 'date'], ['ETAPA', 'etapa', 'text'],
      ['TELEFONE', 'telefone', 'text'], ['CONTRATO', 'contrato', 'text'], ['OBS', 'obs', 'text']] },
    TAREFAS: { tabela: 'tarefas', prefixo: 'T', colunas: [
      ['TAREFA', 'tarefa', 'text'], ['DATA', 'data', 'date'], ['VALOR', 'valor', 'numeric'], ['TIPO', 'tipo', 'text'], ['FEITA', 'feita', 'boolean'], ['OBS', 'obs', 'text']] },
    METAS: { tabela: 'metas', prefixo: 'M', colunas: [
      ['META', 'meta', 'text'], ['VALOR ALVO', 'valor_alvo', 'numeric'], ['JÁ GUARDADO', 'ja_guardado', 'numeric'], ['ONDE ESTÁ', 'onde_esta', 'text'],
      ['PRAZO', 'prazo', 'date'], ['OBS', 'obs', 'text']] },
    CATEGORIAS: { tabela: 'categorias', prefixo: 'G', colunas: [
      ['CATEGORIA', 'categoria', 'text'], ['SUB-CATEGORIA', 'subcategoria', 'text'], ['GRUPO', 'grupo', 'text']] },
  };
  /* registro do app ({'DESCRIÇÃO': ...}) ⇄ linha do Supabase ({descricao: ...}) */
  const vazio = v => v === '' || v === null || v === undefined;
  function paraNuvem(aba, reg) {
    const out = { id: reg.ID };
    T[aba].colunas.forEach(([nome, col, tipo]) => {
      if (!(nome in reg)) return;
      let v = reg[nome];
      if (tipo === 'numeric') v = vazio(v) ? null : (typeof v === 'number' ? v : (isFinite(+String(v).replace(',', '.')) ? +String(v).replace(',', '.') : null));
      else if (tipo === 'date') v = vazio(v) ? null : String(v).slice(0, 10);
      else if (tipo === 'boolean') v = v === true || String(v).toUpperCase() === 'TRUE';
      else v = vazio(v) ? null : String(v);
      out[col] = v;
    });
    return out;
  }
  function doNuvem(aba, linha) {
    const reg = { ID: linha.id };
    T[aba].colunas.forEach(([nome, col, tipo]) => { const v = linha[col]; reg[nome] = v === null || v === undefined ? (tipo === 'boolean' ? false : '') : v; });
    return reg;
  }
  raiz.TABELAS = T;
  raiz.TAB = { paraNuvem, doNuvem };
})(typeof window !== 'undefined' ? window : globalThis);
