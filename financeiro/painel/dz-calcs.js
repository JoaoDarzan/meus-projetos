// Contas do painel: cada uma parte das abas da planilha (datasets) e devolve linhas prontas.

dash.calc('anos', {
  title: 'Anos com lançamentos',
  description: 'Os anos que aparecem nas datas da planilha, mais "Desde o início", para o filtro de ano.',
  inputs: ['trabalhos', 'orcamentos', 'gastos', 'freelancers'],
  fn: (trabalhos, orcamentos, gastos, freelancers) => {
    const anos = new Set();
    trabalhos.forEach((r) => r.data && anos.add(String(r.data).slice(0, 4)));
    orcamentos.forEach((r) => r.data_envio && anos.add(String(r.data_envio).slice(0, 4)));
    gastos.forEach((r) => r.data && anos.add(String(r.data).slice(0, 4)));
    freelancers.forEach((r) => r.data && anos.add(String(r.data).slice(0, 4)));
    return [{ ano: 'todos', nome: 'Desde o início' }, ...[...anos].sort().reverse().map((a) => ({ ano: a, nome: a }))];
  },
});

dash.calc('trabalhos_detalhe', {
  title: 'Trabalhos com custos e lucro',
  description: 'Cada trabalho com o que foi pago a freelancers e os outros gastos ligados pelo código, e o lucro.',
  inputs: ['trabalhos', 'freelancers', 'gastos'],
  fn: (trabalhos, freelancers, gastos) => trabalhos.map((t) => {
    const freelas = freelancers.filter((f) => f.codigo === t.codigo).reduce((s, f) => s + (+f.valor || 0), 0);
    const outros = gastos.filter((g) => g.codigo === t.codigo).reduce((s, g) => s + (+g.valor || 0), 0);
    const cobrado = +t.valor_cobrado || 0;
    const recebido = +t.valor_recebido || 0;
    return {
      codigo: t.codigo, ano: String(t.data).slice(0, 4), data: t.data, horario: t.horario,
      cliente: t.cliente, evento: t.evento, servico: t.servico, local: t.local,
      cobrado, recebido, a_receber: cobrado - recebido, freelas, outros,
      lucro: cobrado - freelas - outros,
      pagamento: recebido >= cobrado ? 'Pago' : recebido > 0 ? 'Parcial' : 'Pendente',
    };
  }),
});

dash.calc('kpis', {
  title: 'Indicadores por ano',
  description: 'Ganho bruto, recebido, custos, lucro, ticket médio e orçamentos de cada ano (e desde o início). Lucro = bruto − freelancers − outros gastos.',
  inputs: ['trabalhos', 'freelancers', 'gastos', 'orcamentos', 'equipamentos', 'anos'],
  fn: (trabalhos, freelancers, gastos, orcamentos, equipamentos, anos) => anos.map(({ ano }) => {
    const noAno = (d) => ano === 'todos' || String(d || '').slice(0, 4) === ano;
    const soma = (rows, campo) => rows.reduce((s, r) => s + (+r[campo] || 0), 0);
    const t = trabalhos.filter((r) => noAno(r.data));
    const o = orcamentos.filter((r) => noAno(r.data_envio));
    const bruto = soma(t, 'valor_cobrado');
    const recebido = soma(t, 'valor_recebido');
    const freelas = soma(freelancers.filter((r) => noAno(r.data)), 'valor');
    const outros = soma(gastos.filter((r) => noAno(r.data)), 'valor');
    const lucro = bruto - freelas - outros;
    const fechados = o.filter((r) => r.status === 'Fechado').length;
    const investido = soma(equipamentos.filter((r) => noAno(r.data_compra)), 'valor');
    return {
      ano, bruto, recebido, a_receber: bruto - recebido, freelas, outros, custos: freelas + outros, lucro,
      margem: bruto ? lucro / bruto : 0,
      peso_custos: bruto ? (freelas + outros) / bruto : 0,
      trabalhos: t.length, ticket: t.length ? bruto / t.length : 0,
      orc_enviados: o.length, orc_fechados: fechados,
      orc_recusados: o.filter((r) => r.status === 'Recusado').length,
      orc_aguardando: o.filter((r) => r.status === 'Aguardando').length,
      taxa: o.length ? fechados / o.length : 0,
      valor_orcado: soma(o, 'valor'),
      investido,
      retorno_equip: ano === 'todos' && investido ? Math.max(0, lucro) / investido : null,
    };
  }),
});

dash.calc('mensal', {
  title: 'Mês a mês',
  description: 'Para cada ano: ganho bruto, freelancers, outros gastos, lucro, trabalhos e orçamentos de cada mês.',
  inputs: ['trabalhos', 'freelancers', 'gastos', 'orcamentos', 'anos'],
  fn: (trabalhos, freelancers, gastos, orcamentos, anos) => {
    const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const linhas = [];
    anos.filter((a) => a.ano !== 'todos').forEach(({ ano }) => {
      nomes.forEach((nome, i) => {
        const mes = `${ano}-${String(i + 1).padStart(2, '0')}`;
        const doMes = (d) => String(d || '').slice(0, 7) === mes;
        const soma = (rows, campo) => rows.reduce((s, r) => s + (+r[campo] || 0), 0);
        const t = trabalhos.filter((r) => doMes(r.data));
        const o = orcamentos.filter((r) => doMes(r.data_envio));
        const bruto = soma(t, 'valor_cobrado');
        const freelas = soma(freelancers.filter((r) => doMes(r.data)), 'valor');
        const outros = soma(gastos.filter((r) => doMes(r.data)), 'valor');
        linhas.push({
          ano, mes, nome, bruto, freelas, outros, lucro: bruto - freelas - outros, trabalhos: t.length,
          orc_enviados: o.length, orc_fechados: o.filter((r) => r.status === 'Fechado').length,
        });
      });
    });
    return linhas;
  },
});

dash.calc('por_servico', {
  title: 'Resultado por serviço',
  description: 'Para cada ano e serviço principal: trabalhos, ganho bruto, lucro, valor médio e taxa de fechamento dos orçamentos.',
  inputs: ['trabalhos_detalhe', 'orcamentos', 'anos'],
  fn: (trabalhos_detalhe, orcamentos, anos) => {
    const servicos = [...new Set([...trabalhos_detalhe.map((t) => t.servico), ...orcamentos.map((o) => o.servico)].filter(Boolean))];
    return anos.flatMap(({ ano }) => servicos.map((servico) => {
      const t = trabalhos_detalhe.filter((r) => r.servico === servico && (ano === 'todos' || r.ano === ano));
      const o = orcamentos.filter((r) => r.servico === servico && (ano === 'todos' || String(r.data_envio).slice(0, 4) === ano));
      const bruto = t.reduce((s, r) => s + r.cobrado, 0);
      const fechados = o.filter((r) => r.status === 'Fechado').length;
      return {
        ano, servico, trabalhos: t.length, bruto, lucro: t.reduce((s, r) => s + r.lucro, 0),
        medio: t.length ? bruto / t.length : 0, orcamentos: o.length, taxa: o.length ? fechados / o.length : 0,
      };
    }));
  },
});

dash.calc('por_evento', {
  title: 'Resultado por tipo de evento',
  description: 'Para cada ano e tipo de evento: trabalhos, ganho bruto, freelancers, lucro, valor médio e taxa de fechamento.',
  inputs: ['trabalhos_detalhe', 'orcamentos', 'anos'],
  fn: (trabalhos_detalhe, orcamentos, anos) => {
    const eventos = [...new Set([...trabalhos_detalhe.map((t) => t.evento), ...orcamentos.map((o) => o.evento)].filter(Boolean))];
    return anos.flatMap(({ ano }) => eventos.map((evento) => {
      const t = trabalhos_detalhe.filter((r) => r.evento === evento && (ano === 'todos' || r.ano === ano));
      const o = orcamentos.filter((r) => r.evento === evento && (ano === 'todos' || String(r.data_envio).slice(0, 4) === ano));
      const bruto = t.reduce((s, r) => s + r.cobrado, 0);
      const fechados = o.filter((r) => r.status === 'Fechado').length;
      return {
        ano, evento, trabalhos: t.length, bruto, freelas: t.reduce((s, r) => s + r.freelas, 0),
        lucro: t.reduce((s, r) => s + r.lucro, 0), medio: t.length ? bruto / t.length : 0,
        orcamentos: o.length, taxa: o.length ? fechados / o.length : 0,
      };
    }));
  },
});

dash.calc('agenda', {
  title: 'Próximos eventos',
  description: 'Trabalhos com data de hoje em diante, em ordem de data, com quantos dias faltam e quanto falta receber.',
  inputs: ['trabalhos_detalhe'],
  fn: (trabalhos_detalhe) => {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    return trabalhos_detalhe
      .map((t) => ({ ...t, dias: Math.round((new Date(t.data + 'T00:00:00') - hoje) / 86400000) }))
      .filter((t) => t.dias >= 0)
      .sort((a, b) => a.dias - b.dias || String(a.horario).localeCompare(String(b.horario)))
      .map((t) => ({ codigo: t.codigo, data: t.data, horario: t.horario, dias: t.dias, cliente: t.cliente, evento: t.evento, servico: t.servico, local: t.local, a_receber: t.a_receber }));
  },
});

dash.calc('clientes_resumo', {
  title: 'Clientes e quanto já fecharam',
  description: 'Cada cliente com o número de trabalhos e o total cobrado, pelo nome igual nas abas Clientes e Trabalhos.',
  inputs: ['clientes', 'trabalhos_detalhe'],
  fn: (clientes, trabalhos_detalhe) => clientes.map((c) => {
    const t = trabalhos_detalhe.filter((r) => r.cliente === c.nome);
    return { nome: c.nome, cidade: c.cidade, origem: c.origem, trabalhos: t.length, total: t.reduce((s, r) => s + r.cobrado, 0) };
  }),
});

dash.calc('origem', {
  title: 'De onde vêm os clientes',
  description: 'Clientes e total cobrado por forma como conheceram o seu trabalho.',
  inputs: ['clientes_resumo'],
  fn: (clientes_resumo) => {
    const origens = [...new Set(clientes_resumo.map((c) => c.origem || 'Não informado'))];
    return origens.map((origem) => {
      const c = clientes_resumo.filter((r) => (r.origem || 'Não informado') === origem);
      return { origem, clientes: c.length, total: c.reduce((s, r) => s + r.total, 0) };
    }).sort((a, b) => b.total - a.total || b.clientes - a.clientes);
  },
});

dash.calc('gastos_categoria', {
  title: 'Gastos por categoria',
  description: 'Soma dos outros gastos por categoria, em cada ano e desde o início.',
  inputs: ['gastos', 'anos'],
  fn: (gastos, anos) => {
    const categorias = [...new Set(gastos.map((g) => g.categoria || 'Outro'))];
    return anos.flatMap(({ ano }) => categorias.map((categoria) => ({
      ano, categoria,
      valor: gastos.filter((g) => (g.categoria || 'Outro') === categoria && (ano === 'todos' || String(g.data).slice(0, 4) === ano))
        .reduce((s, g) => s + (+g.valor || 0), 0),
    })));
  },
});

dash.calc('freelas_pessoa', {
  title: 'Freelancers por pessoa',
  description: 'Quanto foi pago a cada freelancer e em quantos trabalhos, em cada ano e desde o início.',
  inputs: ['freelancers', 'anos'],
  fn: (freelancers, anos) => {
    const pessoas = [...new Set(freelancers.map((f) => f.freelancer))];
    return anos.flatMap(({ ano }) => pessoas.map((freelancer) => {
      const f = freelancers.filter((r) => r.freelancer === freelancer && (ano === 'todos' || String(r.data).slice(0, 4) === ano));
      return { ano, freelancer, valor: f.reduce((s, r) => s + (+r.valor || 0), 0), trabalhos: new Set(f.map((r) => r.codigo)).size };
    }));
  },
});

dash.calc('equip_categoria', {
  title: 'Equipamentos por categoria',
  description: 'Valor investido em equipamentos por categoria, desde o início.',
  inputs: ['equipamentos'],
  fn: (equipamentos) => {
    const categorias = [...new Set(equipamentos.map((e) => e.categoria || 'Outro'))];
    return categorias.map((categoria) => {
      const e = equipamentos.filter((r) => (r.categoria || 'Outro') === categoria);
      return { categoria, valor: e.reduce((s, r) => s + (+r.valor || 0), 0), itens: e.length };
    }).sort((a, b) => b.valor - a.valor);
  },
});
