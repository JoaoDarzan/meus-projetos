# Caminhos de teste do Darzan Finanças

Cada caminho é o que o João faria no app, do começo ao fim. Os testes fazem isso sozinhos num navegador,
contra um Supabase de mentira (os dados de verdade não são tocados), e conferem o resultado na tela **e** no banco de dados.

Rodam a cada mudança no GitHub (aba **Actions → Testar o app de finanças**) e antes de cada publicação.

```sh
node financas-app/testes/testar-app.js            # todas as etapas
ETAPA=03 node financas-app/testes/testar-app.js   # só uma etapa (número ou nome: ETAPA=revisar)
```
Fotos de cada tela e o relatório ficam em `financas-app/testes/capturas/` (no GitHub: o anexo "capturas" de cada rodada).

| Etapa | Arquivo | O que é testado |
|---|---|---|
| 01 · Entrar e segurança | `caminhos/01-entrar.js` | senha errada avisa; senha certa entra e continua logado; Face ID liga, abre e, se o rosto falhar, entra com a senha; outra pessoa não vê nada do João; sair apaga a sessão do aparelho |
| 02 · Lançamentos | `caminhos/02-lancamentos.js` | Gastei (lançar, editar, excluir, desfazer); Recebi (renda no banco certo); Guardei (saldo da caixinha sobe); compra parcelada no cartão vai para as faturas certas e excluir apaga todas as parcelas; gasto reembolsado e dinheiro devolvido ficam no extrato mas não contam como gasto nem renda (editar mantém, e transferência que entrou continua positiva); ao escrever "o que foi", a categoria vem do histórico e não troca a que você escolheu |
| 03 · Revisar | `caminhos/03-revisar.js` | trocar o banco de vários de uma vez e desfazer; filtrar e marcar o mês inteiro; usar as sugestões do histórico em "sem categoria"; marcar como conferido; mudou a categoria de um, o app oferece mudar os parecidos |
| 04 · Cartões e tarefas | `caminhos/04-cartoes-tarefas.js` | pagar conta pela tarefa e desfazer; pagar fatura cria a transferência do banco e desfazer apaga; preencher o dia de vencimento tira o "estimado" |
| 05 · Equipamentos | `caminhos/05-equipamentos.js` | no cartão (parcelas, mudar valor, excluir junto); à vista (sai do banco no dia, excluir leva o lançamento); "já tinha" não mexe no dinheiro |
| 06 · Trabalhos | `caminhos/06-trabalhos.js` | criar trabalho, abrir o cliente, registrar recebimento, ver quanto falta, mudar de etapa |
| 07 · Bancos | `caminhos/07-bancos.js` | conferir saldo bate com o digitado; criar caixinha |
| 08 · Sem internet e erros | `caminhos/08-internet-e-erros.js` | abre sem internet com a cópia do celular; o que foi lançado sem internet vai sozinho quando ela volta (uma vez só); Supabase recusou: avisa e mostra o que está lá; login vencido renova sozinho; celular e computador iguais; contas fixas não duplicam |
| 09 · Dados | `caminhos/09-dados.js` | trazer os dados pelo arquivo; "Para onde foi" soma igual ao "Saiu"; baixar a cópia de segurança traz tudo |
| 10 · Telas em vários aparelhos | `caminhos/10-telas.js` | todas as telas e todos os formulários em iPhone SE, iPhone 15, iPhone Pro Max, Android, iPad, notebook e monitor |
| 11 · Avisos no celular | `caminhos/11-avisos.js` | sem as tabelas de avisos o app funciona normal; a agenda tem faturas, contas para pagar na mão (débito automático não) e trabalhos, 1 dia antes e no dia; pagou, o aviso sai; ligar os avisos; o botão de teste mostra um aviso **na hora** e outro chega pelo servidor **trancado** (só o aparelho abre); no envio diário cada aviso vira uma notificação separada (etiqueta própria, uma não substitui a outra), não repete, tira aparelho que sumiu e recusa segredo errado |
| 12 · Transferências e correções | `caminhos/12-transferencias-correcoes.js` | transferir entre as minhas contas não mexe em entrou/saiu/guardou e muda o saldo dos dois bancos; editar muda as duas pontas; excluir e desfazer levam as duas; trazer correções mostra antes, adiciona, corrige só os campos do arquivo e não repete |
| 13 · Acesso do Claude | `caminhos/13-acesso-claude.js` | criar a chave no app (o Supabase só guarda a "impressão digital" dela); com a chave, o Claude lê só os dados do João e corrige só os campos pedidos, sem tocar nos de outra pessoa; o app mostra a correção ao voltar para ele; trocar a chave corta a antiga e desligar corta tudo |
| 14 · Planilha de backup | `caminhos/14-planilha-backup.js` | o `backup/Backup.gs` roda num Google Planilhas de mentira (`planilha-de-mentira.js`): recusa chave errada, liga de hora em hora (um horário só), copia todas as tabelas com datas e reais certinhos; o Resumo (entrou/saiu/guardou) e os saldos dos bancos batem com os do app (compra no cartão não mexe no saldo da conta); se o Supabase recusar, o último backup bom fica como está |
| 15 · Demonstração | `caminhos/15-demonstracao.js` | login `teste` / `123456` abre o app cheio de dados inventados (`js/demo.js`, montados em volta do dia de hoje) com o selo DEMO; todas as telas sem nada fora do lugar; lançar funciona e continua depois de abrir de novo; sair volta tudo ao começo; nenhum pedido vai para o Supabase; senha errada não entra; depois o João entra e vê só os dados dele; os dados inventados ficam certos em qualquer dia do ano |

## O que a etapa 10 confere em cada tela e formulário
- nada passa da largura da tela (sem rolar para o lado);
- cada nome de campo tem a sua caixa logo abaixo, e nenhum campo fica em cima de outro;
- caixas de digitar com letra de 16px ou mais (menor que isso o iPhone dá zoom e "bagunça" a tela);
- nada embaixo do relógio e da bateria (o espaço do iPhone salvo na tela de início);
- o fim da tela não fica escondido atrás do menu de baixo;
- botões grandes o bastante para o dedo.

## Como um caminho novo entra
1. Toda funcionalidade nova ganha um caminho na etapa certa (ou uma etapa nova `11-...js`).
2. Todo erro achado vira um caminho que falhava antes da correção e passa depois.
3. Os testes usam dados **inventados** (`dados-exemplo.json`, gerado por `ferramentas/gerar_exemplo.js`), parecidos com os de verdade:
   tem lançamento sem banco, sem categoria e para conferir. No computador também dá para rodar com os dados do João
   (`DADOS=.../darzan-dados.json`), que nunca vão para o GitHub.
4. Antes de confiar num teste novo, ele é "sabotado" de propósito (o erro volta) para ver se ele pega.
