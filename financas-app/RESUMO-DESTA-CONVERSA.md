# Resumo para a outra conversa (app de finanças, 09/11/2026)

O que outra conversa do Claude fez no app (`darzan-producoes/financas/`). Leia antes de mexer nas mesmas telas.

## 1. Já publicado na `main` (app v47, commit a638718; os 117 testes passaram)
- **Sininho no Início** (`formNovidades` em `telas.js`; `c.doRobo`, `c.novidades`, `c.marcarVisto` em `base.js`): lista o que o robô
  do Open Finance trouxe (linhas `LOF-…` e as conferidas com "OF <id>" na OBS; as escondidas LOFP/LOFS/LOFI/LOFD ficam de fora),
  com quanto entrou e saiu. O que já foi visto fica no aparelho (`localStorage` `df-visto`); na primeira vez, só os últimos 3 dias contam como novos.
  No computador, aparece também no menu do lado ("Novidades do banco").
- **Trabalhos: "Novo contato" e "Orçamento" viraram uma etapa só** ("Orçamento"). Cliente novo já entra em Orçamento, com
  `crm.enviado` = dia em que entrou. Os antigos com etapa "Novo contato" não foram alterados no banco: `c.etapaQuadro(j)`
  mostra os dois como Orçamento. O botão "Mandei o orçamento" saiu. Nas vendas do mês: Orçamentos, Fecharam, Não fecharam, Esperando resposta.
- **Recorrentes: produção do mês** (`blocoProd`, `mudarProd`, `formPrecos` em `telas.js`; `c.producao` em `base.js`): + e − de
  vídeos (R$ 100) e captações (R$ 200) por mês, guardados no CRM do trabalho:
  `{"prod": {"2026-11": {"video": 3, "captacao": 1}}, "precos": {"video": 100, "captacao": 200}}`.
  Falta receber = tudo que foi feito − tudo que entrou (pagamentos ligados ao cliente) desde o primeiro mês contado.
- **Calendário** (Trabalhos › Calendário): setas do mês e botão "Hoje" dentro do calendário, hoje em dourado, fim de semana
  com fundo diferente, valor do dia e uma barrinha colorida por trabalho (no computador, com o nome).
- **Equipamentos**: cada item mostra "Paguei" (coluna VALOR) e "Vale hoje". O valor de hoje fica na OBS no formato
  `Vale hoje 900 em 2026-11-09` (campo "Quanto vale hoje" no formulário). Sem esse dado, o app estima: perde 20% por ano,
  nunca menos de 25% do que pagou (`c.valeHoje`). Em cima: Quanto paguei, Vale hoje, Desvalorizou, Falta pagar.
- Testes: nova etapa `testes/caminhos/27-novidades-producao.js`; etapas 19, 22 e 24 atualizadas.

## 2. Feito depois, ainda NÃO publicado (app v48, só no branch `claude/compassionate-brown-57tuf3`)
O João pediu duas mudanças depois de ver a v47:
- **Notificação no iPhone de tudo que entra e sai** (a mesma automação dos avisos): o robô (`openfinance/robo.mjs`, modo importar)
  grava na tabela `avisos` (tipo `banco`, id `VOF-…`) cada movimento novo ou conferido dos últimos 3 dias
  (`avisosDoBanco` em `openfinance/regras.mjs`). Até 4 movimentos: um aviso por movimento ("Saiu R$ 45,00 · Nubank" + descrição).
  Mais que isso: um aviso só com o resumo. O GitHub (`avisos.yml`, a cada 30 min) manda para o iPhone. Como os outros avisos,
  só sai a partir das 9h. O app não apaga avisos do tipo `banco` (`sincronizarAvisos`). Não precisa rodar SQL.
- **"Para onde foi" voltou a ser pizza, mais elegante** (o João não gostou das barras da v47): pizza inteira com as 6 maiores
  categorias + "Outras", porcentagem dentro das fatias grandes, brilho suave, fatia aberta sai um pouco do círculo, lista ao lado
  com valor e %, total do mês comparado com o mês anterior.
- Testes já rodados: etapas 19 e 22 (4 de 4 cada) e o teste do robô (`openfinance.test.mjs`, 16 de 16).

**Para publicar a v48:**
```bash
git fetch origin claude/compassionate-brown-57tuf3 && git merge origin/claude/compassionate-brown-57tuf3
```
```bash
node financas-app/testes/testar-app.js
```
Se passar tudo, fazer o push para a `main`.

## 3. Ainda em aberto
- Perguntar ao João: as captações do recorrente devem aparecer também no calendário como dias trabalhados?
- Os avisos do banco chegam com atraso de até ~4h30 (o robô roda a cada 4h e os avisos a cada 30 min).
