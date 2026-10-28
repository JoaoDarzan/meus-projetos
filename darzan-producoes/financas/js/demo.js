/* Modo demonstração: login "teste" / senha "123456". Tudo aqui é INVENTADO, montado em volta do dia de hoje,
   e fica só no aparelho (nuvem.js nunca chama o Supabase nesse modo). Testado em testes/caminhos/15-demonstracao.js. */
window.A = window.A || {};
(function (A) {
  A.demo = { usuario: 'teste', senha: '123456' };

  A.demo.dados = hoje => {
    const u = A.u, m0 = u.mes(hoje), dHoje = +hoje.slice(8, 10);
    const abas = { EXTRATO: [], CONTAS: [], CARTOES: [], PARCELADOS: [], FIXAS: [], EQUIPAMENTOS: [], TRABALHOS: [], TAREFAS: [], METAS: [], CATEGORIAS: [] };
    let n = 0;
    const id = p => p + 'D' + String(++n).padStart(4, '0');
    const dia = (k, d) => u.dataNoMes(u.addMes(m0, k), d);
    const mais = dias => { const x = new Date(hoje + 'T12:00:00'); x.setDate(x.getDate() + dias); return x.toISOString().slice(0, 10); };
    const st = data => data <= hoje ? 'Pago' : 'Previsto';
    const L = (data, banco, desc, grupo, valor, cat, sub, extra = {}) => {
      const r = Object.assign({ ID: id('L'), 'DATA': data, 'BANCO': banco, 'DESCRIÇÃO': desc, 'GRUPO': grupo, 'TIPO': 'conta', 'VALOR': u.r2(valor), 'CATEGORIA': cat, 'SUB-CATEGORIA': sub, 'STATUS': st(data), 'PARCELA': '', 'OBS': '' }, extra);
      abas.EXTRATO.push(r); return r;
    };
    const gasto = (data, banco, desc, valor, cat, sub, grupo = 'Desejos') => L(data, banco, desc, grupo, -valor, cat, sub);
    const renda = (data, banco, desc, valor, cat, sub) => L(data, banco, desc, 'Renda', valor, cat, sub);
    let t = 0;
    const transf = (data, de, para, valor) => {
      const tid = 'TDEMO' + (++t), base = { 'GRUPO': 'Transferência', 'CATEGORIA': 'Transferência', 'SUB-CATEGORIA': 'Entre minhas contas', 'OBS': `Transferência ${tid}` };
      L(data, de, `Transferência para ${para}`, 'Transferência', -valor, 'Transferência', 'Entre minhas contas', base);
      L(data, para, `Transferência do ${de}`, 'Transferência', valor, 'Transferência', 'Entre minhas contas', base);
    };

    /* cartões: compra entra na fatura do mês (até o fechamento) ou na do mês seguinte */
    const CART = { 'Nubank': [7, 14, 'PicPay'], 'Mercado Pago': [16, 23, 'PicPay'], 'Inter': [25, 5, 'Inter'] };
    Object.entries(CART).forEach(([nome, [fecha, vence, paga]], i) => abas.CARTOES.push({ ID: 'KD' + (i + 1), 'CARTÃO': nome, 'LIMITE': [6000, 4000, 5000][i], 'FECHA DIA': fecha, 'VENCE DIA': vence, 'PAGA PELA CONTA': `${paga} · Conta`, 'OBS': '' }));
    const faturaDe = (data, nome) => +data.slice(8, 10) <= CART[nome][0] ? u.mes(data) : u.addMes(u.mes(data), 1);
    let p = 0;
    const compra = (data, cartao, valor, parcelas, desc, cat, sub, grupo = 'Desejos', equip) => {
      const fm = faturaDe(data, cartao), d = +data.slice(8, 10), pid = 'PD' + String(++p).padStart(3, '0'), parc = u.r2(valor / parcelas);
      for (let k = 1; k <= parcelas; k++) {
        const mm = u.addMes(fm, k - 1), v = k === parcelas ? u.r2(valor - parc * (parcelas - 1)) : parc;
        L(u.dataNoMes(mm, d), cartao, desc, grupo, -v, cat, sub, { 'TIPO': 'cartão', 'STATUS': mm <= m0 ? 'Pago' : 'Previsto', 'PARCELA': parcelas > 1 ? `${k}/${parcelas}` : '', 'OBS': `Compra ${pid} · feita em ${u.ddmmaa(data)}` });
      }
      abas.PARCELADOS.push({ ID: pid, 'DATA DA COMPRA': data, 'DESCRIÇÃO': desc, 'CARTÃO': cartao, 'VALOR TOTAL': valor, 'PARCELAS': parcelas, 'VALOR DA PARCELA': parc, '1ª PARCELA': `${u.cap(u.CURTO[+fm.slice(5) - 1])}/${fm.slice(2, 4)}`, 'CATEGORIA': cat, 'SUB-CATEGORIA': sub });
      if (equip) abas.EQUIPAMENTOS.push(Object.assign({ ID: id('E'), 'NOME': desc, 'VALOR': valor, 'DATA DA COMPRA': data, 'COMO PAGOU': `${parcelas}x no ${cartao}`, 'ESTADO': 'Novo', 'Nº DE SÉRIE': '', 'OBS': `Compra ${pid}`, 'FOTO': '' }, equip));
    };

    /* seis meses para trás e o mês atual */
    for (let k = -6; k <= 0; k++) {
      const D = d => dia(k, d), ok = d => k < 0 || d <= dHoje;
      renda(D(5), 'Inter', 'Salário', 3200, 'Salário CLT', 'Salário');
      renda(D(5), 'Inter', 'Vale-refeição e transporte', 650, 'Salário CLT', 'Benefícios');
      transf(D(6), 'Inter', 'PicPay', 2600);
      transf(D(6), 'Inter', 'Nubank', 700);
      L(D(6), 'Nubank', 'Guardado', 'Guardado', -500, 'Guardado', 'Caixinha', { 'OBS': 'Para Caixinha Reserva' });
      L(D(8), 'PicPay', 'Guardado', 'Guardado', -800, 'Guardado', 'Caixinha', { 'OBS': 'Para Cofrinho Viagem' });
      renda(D(9), 'PicPay', ['Mercado Sol - storymaker', 'Clínica Sorriso - 3 vídeos', 'Pizzaria Forno - storymaker'][(k + 6) % 3], 450 + ((k + 6) % 3) * 120, 'Darzan Produções', 'Storymaker');
      renda(D(18), 'PicPay', 'JPL SOM evento', 400, 'JPL SOM', 'Serviço');
      renda(D(21), 'PicPay', ['Academia Fit - storymaker', 'Café Central - vídeos', 'Barbearia Navalha - storymaker'][(k + 6) % 3], 380 + ((k + 6) % 2) * 150, 'Darzan Produções', 'Storymaker');
      if (k < 0) renda(D(28), 'PicPay', 'Rendimento da conta', 22 + (k + 6) * 6.35, 'Outras rendas', 'Rendimentos');
      [[3, 182.4], [11, 96.3], [19, 241.75], [26, 128.9]].forEach(([d, v], i) => { if (ok(d)) gasto(D(d), 'PicPay', i === 1 ? 'Padaria' : 'Mercado', v + k * 3, 'Alimentação', i === 1 ? 'Padaria' : 'Mercado', 'Necessidades'); });
      [2, 9, 16, 23].forEach(d => { if (ok(d)) gasto(D(d), 'PicPay', 'Gasolina', 100, 'Transporte', 'Gasolina', 'Necessidades'); });
      [[7, 42.9], [14, 61.5], [22, 37.8]].forEach(([d, v]) => { if (ok(d)) gasto(D(d), 'PicPay', 'iFood', v, 'Alimentação fora', 'iFood'); });
      [[12, 68.0], [25, 54.9]].forEach(([d, v]) => { if (ok(d)) gasto(D(d), 'PicPay', d === 12 ? 'Restaurante' : 'Lanchonete', v, 'Alimentação fora', 'Comida fora'); });
      if (ok(15)) gasto(D(15), 'PicPay', 'Uber', 23.4, 'Transporte', 'Uber/99', 'Necessidades');
      if (ok(17)) gasto(D(17), 'PicPay', 'Farmácia', 38.9, 'Saúde e beleza', 'Farmácia', 'Necessidades');
      if (ok(20)) gasto(D(20), 'PicPay', 'Corte de cabelo', 35, 'Saúde e beleza', 'Corte de cabelo', 'Necessidades');
      if (ok(10)) gasto(D(10), 'PicPay', 'Internet', 99.9, 'Casa', 'Contas', 'Necessidades').OBS = 'Fixa · débito automático';
      if (ok(15)) gasto(D(15), 'PicPay', 'Netflix', 22.45, 'Assinaturas', 'Streaming').OBS = 'Fixa · débito automático';
      if (ok(27)) gasto(D(27), 'PicPay', 'Seguro do carro', 115, 'Transporte', 'Seguro', 'Necessidades').OBS = 'Fixa';
      if (ok(27)) compra(D(27), 'Mercado Pago', 21.9, 1, 'Spotify', 'Assinaturas', 'Streaming');
      if (ok(13)) compra(D(13), 'Nubank', 89.9 + (k + 6) * 12, 1, ['Roupa', 'Tênis', 'Presente'][(k + 6) % 3], (k + 6) % 3 === 2 ? 'Lazer' : 'Compras', (k + 6) % 3 === 2 ? 'Presente' : 'Roupas');
      if (ok(24)) compra(D(24), 'Inter', 64.5, 1, 'Cinema', 'Lazer', 'Lazer');
    }
    /* trabalhos da Darzan e o que já entrou de cada um */
    const J = (cliente, tipo, data, local, fechado, valor, entrega, etapa, obs) => abas.TRABALHOS.push({ ID: id('J'), 'CLIENTE': cliente, 'TIPO DE EVENTO': tipo, 'DATA DO EVENTO': data, 'LOCAL': local, 'O QUE FOI FECHADO': fechado, 'VALOR TOTAL': valor, 'ENTREGA': entrega, 'ETAPA': etapa, 'TELEFONE': '(19) 90000-0000', 'CONTRATO': '', 'OBS': obs });
    J('Ana e Pedro', 'Casamento', mais(25), 'Espaço Jardim, Campinas', 'Filme do casamento + teaser + making of', 4500, mais(55), 'Fechado', 'Sinal de 30% pago');
    renda(dia(-1, 4), 'PicPay', 'Ana e Pedro - sinal', 1350, 'Darzan Produções', 'Casamento');
    J('Júlia 15 anos', '15 anos', mais(-20), 'Salão Estrela, Valinhos', 'Vídeo da festa + reels', 2200, mais(3), 'Em andamento', 'Falta entregar o vídeo da festa');
    renda(dia(-2, 15), 'PicPay', 'Júlia 15 anos - sinal', 1100, 'Darzan Produções', 'Evento');
    J('Loja Bella Moda', 'Social media', '', '', '8 vídeos por mês', 2700, '', 'Em andamento', 'Contrato de 3 meses');
    [-2, -1, 0].forEach(k => { if (k < 0 || dHoje >= 10) renda(dia(k, 10), 'PicPay', 'Loja Bella Moda - social media', 900, 'Darzan Produções', 'Social media'); });
    J('Empresa Alfa', 'Corporativo', mais(40), 'Campinas', 'Vídeo institucional', 1800, mais(60), 'Orçamento', 'Esperando resposta do orçamento');
    J('Carla e Diego', 'Casamento', dia(-3, 14), 'Fazenda Recanto, Jaguariúna', 'Filme do casamento', 3800, dia(-2, 14), 'Entregue', '');
    renda(dia(-4, 14), 'PicPay', 'Carla e Diego - sinal', 1140, 'Darzan Produções', 'Casamento');
    renda(dia(-2, 14), 'PicPay', 'Carla e Diego - restante', 2660, 'Darzan Produções', 'Casamento');
    J('Escola Horizonte', 'Palestra', dia(-1, 22), 'Escola Horizonte', 'Cobertura da palestra', 600, dia(-1, 28), 'Entregue', '');
    renda(dia(-1, 28), 'PicPay', 'Escola Horizonte - palestra', 600, 'Darzan Produções', 'Palestra');
    /* equipamentos comprados no cartão (parcelas nas faturas) e os que já tinha */
    compra(dia(-4, 20), 'Inter', 2400, 10, 'Lente 50mm f/1.8', 'Trabalho', 'Equipamentos', 'Necessidades', { 'TIPO': 'Lente' });
    compra(dia(-2, 10), 'Mercado Pago', 1200, 6, 'Microfone sem fio', 'Trabalho', 'Equipamentos', 'Necessidades', { 'TIPO': 'Áudio' });
    compra(dia(-1, 3), 'Nubank', 540, 3, 'Bastão de LED', 'Trabalho', 'Equipamentos', 'Necessidades', { 'TIPO': 'Iluminação' });
    [['Câmera ZV-E10 + 16-50mm', 'Câmera', 4800, 'Semi-novo'], ['Gimbal', 'Estabilizador', 2300, 'Novo'], ['SSD externo 1TB', 'Armazenamento', 620, 'Novo'], ['Cartão de memória 256GB', 'Armazenamento', 250, 'Novo'], ['Bateria extra', 'Acessório', 180, 'Novo']]
      .forEach(([nome, tipo, valor, estado], i) => abas.EQUIPAMENTOS.push({ ID: id('E'), 'NOME': nome, 'TIPO': tipo, 'VALOR': valor, 'DATA DA COMPRA': dia(-14 + i, 10), 'COMO PAGOU': 'Já tinha', 'ESTADO': estado, 'Nº DE SÉRIE': '', 'OBS': '', 'FOTO': '' }));
    /* reembolso: a produtora pagou a viagem de volta */
    gasto(dia(-1, 16), 'PicPay', 'Hotel da viagem do evento', 220, 'Trabalho', 'Negócio').GRUPO = 'Reembolso';
    L(dia(-1, 19), 'PicPay', 'Reembolso da viagem (produtora)', 'Reembolso', 220, 'Reembolso', 'JPL SOM');
    /* faturas que já venceram: pagas pela conta do cartão */
    Object.entries(CART).forEach(([nome, [fecha, vence, paga]]) => {
      const meses = [...new Set(abas.EXTRATO.filter(l => l['TIPO'] === 'cartão' && l['BANCO'] === nome).map(l => u.mes(l['DATA'])))].sort();
      meses.forEach(fm => {
        const venc = u.dataNoMes(vence > fecha ? fm : u.addMes(fm, 1), vence);
        if (venc >= hoje) return;
        const v = -u.sum(abas.EXTRATO.filter(l => l['TIPO'] === 'cartão' && l['BANCO'] === nome && u.mes(l['DATA']) === fm && l['GRUPO'] !== 'Reembolso'), l => l['VALOR']);
        L(venc, paga, `Pagamento fatura ${nome} (${u.nomeMes(fm).toLowerCase()})`, 'Transferência', -v, 'Transferência', 'Pagamento de fatura', { 'OBS': `Fatura ${nome} ${fm}` });
      });
    });
    /* para mostrar a aba Revisar */
    if (dHoje >= 2) {
      gasto(dia(0, 1), 'PicPay', 'Pix para Carlos Souza', 45, '', '');
      gasto(dia(0, 2), 'PicPay', 'Mercado Livre', 89.9, '', '');
      renda(dia(0, 2), 'PicPay', 'Pix de Marina Lima', 150, '', '').OBS = 'conferir: foi pagamento de trabalho?';
    }
    /* bancos conferidos no dia 1º do mês */
    const conf = dia(0, 1);
    [['Nubank', 'Conta', 640], ['Nubank', 'Caixinha Reserva', 9500, 'Reserva de emergência'], ['PicPay', 'Conta', 3850], ['PicPay', 'Cofrinho Viagem', 3200, 'Viagem'], ['Inter', 'Conta', 1200, 'Salário CLT'], ['Mercado Pago', 'Conta', 0, 'Cartão de crédito']]
      .forEach(([banco, conta, saldo, para], i) => abas.CONTAS.push({ ID: 'CD' + (i + 1), 'BANCO': banco, 'CONTA': conta, 'SALDO CONFERIDO': saldo, 'DATA DA CONFERÊNCIA': conf, 'PARA QUÊ': para || 'Dia a dia', 'OBS': '' }));
    [['Netflix', 22.45, 15, 'PicPay', 'débito automático', 'Desejos', 'Assinaturas', 'Streaming'], ['Internet', 99.9, 10, 'PicPay', 'débito automático', 'Necessidades', 'Casa', 'Contas'],
      ['Spotify', 21.9, 27, 'Mercado Pago', 'cartão', 'Desejos', 'Assinaturas', 'Streaming'], ['Seguro do carro', 115, 27, 'PicPay', 'conta', 'Necessidades', 'Transporte', 'Seguro']]
      .forEach(([desc, valor, d, banco, tipo, grupo, cat, sub], i) => abas.FIXAS.push({ ID: 'FD' + (i + 1), 'DESCRIÇÃO': desc, 'VALOR': valor, 'DIA': d, 'BANCO': banco, 'TIPO': tipo, 'GRUPO': grupo, 'CATEGORIA': cat, 'SUB-CATEGORIA': sub, 'ATIVA': 'Sim', 'OBS': '' }));
    [['Backup dos cartões de memória', mais(1), '', 'Darzan'], ['Mandar orçamento para a Empresa Alfa', hoje, '', 'Darzan'], ['Renovar a CNH', mais(12), '', 'Pessoal'], ['Pagar IPVA', mais(70), 1200, 'Conta']]
      .forEach(([tarefa, data, valor, tipo], i) => abas.TAREFAS.push({ ID: 'TD' + (i + 1), 'TAREFA': tarefa, 'DATA': data, 'VALOR': valor, 'TIPO': tipo, 'FEITA': false, 'OBS': '' }));
    [['Viagem para o Chile', 8000, 3200, 'PicPay · Cofrinho Viagem', mais(240)], ['Reserva de emergência', 15000, 9500, 'Nubank · Caixinha Reserva', ''], ['Lente 24-70mm', 6000, 1200, '', mais(180)]]
      .forEach(([meta, alvo, ja, onde, prazo], i) => abas.METAS.push({ ID: 'MD' + (i + 1), 'META': meta, 'VALOR ALVO': alvo, 'JÁ GUARDADO': ja, 'ONDE ESTÁ': onde, 'PRAZO': prazo, 'OBS': '' }));
    [['Salário CLT', ['Salário', 'Comissão', 'Benefícios'], 'Renda'], ['Darzan Produções', ['Storymaker', 'Casamento', 'Social media', 'Evento', 'Palestra', 'Outros'], 'Renda'],
      ['JPL SOM', ['Serviço'], 'Renda'], ['Outras rendas', ['Venda', 'Rendimentos', 'Outros'], 'Renda'], ['Alimentação', ['Mercado', 'Padaria'], 'Necessidades'],
      ['Alimentação fora', ['iFood', 'Comida fora'], 'Desejos'], ['Transporte', ['Gasolina', 'Uber/99', 'Manutenção', 'Seguro', 'Estacionamento'], 'Necessidades'],
      ['Casa', ['Moradia', 'Contas'], 'Necessidades'], ['Saúde e beleza', ['Farmácia', 'Corte de cabelo'], 'Necessidades'], ['Trabalho', ['Equipamentos', 'Cursos', 'Software', 'Negócio'], 'Necessidades'],
      ['Assinaturas', ['Streaming', 'Apps'], 'Desejos'], ['Lazer', ['Lazer', 'Presente', 'Viagem'], 'Desejos'], ['Compras', ['Eletrônicos', 'Roupas'], 'Desejos'],
      ['Guardado', ['Reserva', 'Caixinha', 'Investimento'], 'Guardado'], ['Transferência', ['Entre minhas contas', 'Pagamento de fatura'], 'Transferência'],
      ['Reembolso', ['JPL SOM', 'Família', 'Outros'], 'Reembolso'], ['Outros', ['Outros'], 'Desejos']]
      .forEach(([cat, subs, grupo]) => subs.forEach(sub => abas.CATEGORIAS.push({ ID: id('G'), 'CATEGORIA': cat, 'SUB-CATEGORIA': sub, 'GRUPO': grupo })));
    return { app: 'Darzan Finanças', demo: true, abas };
  };
})(window.A);
