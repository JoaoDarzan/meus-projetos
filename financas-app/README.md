# Darzan Finanças (app)

App pessoal de finanças do João Darzan: contas, cartões, trabalhos da Darzan Produções e da JPL SOM,
equipamentos, tarefas e metas. Funciona no celular (iPhone, salvo na tela de início) e no computador.

**No ar em:** https://joaodarzan.github.io/meus-projetos/financas/ (GitHub Pages).

## Como funciona
- **App** (`darzan-producoes/financas/`): páginas simples (HTML, CSS e JS, sem biblioteca de fora; só o leitor de PDF,
  pdf.js do cdnjs, é baixado na primeira vez que abre um PDF), publicadas pelo
  GitHub Pages junto com o site. Guarda uma cópia dos dados no aparelho: abre na hora e funciona sem internet.
  Cada mudança entra numa fila e vai para o Supabase assim que der.
- **Dados** (Supabase): uma tabela por assunto (extrato, contas, cartões, parcelados, fixas, equipamentos, trabalhos,
  anexos, tarefas, metas, categorias). Cada linha tem dono e só o dono vê e mexe (Row Level Security).
- **Trabalhos**: cada trabalho tem briefing, a lista de vídeos a entregar (marca quando fica pronto), os recebimentos
  (lançamentos com "Trabalho J…" na anotação, ou com o nome do cliente) e os anexos: comprovantes, contrato e orçamento
  (tabela `anexos`; foto vira JPEG de até 1600px, PDF vai como está até 8 MB). O arquivo fica na coluna `conteudo`, que o
  app só baixa quando você abre o anexo (não entra na cópia do aparelho nem no backup). Cliente que paga por mês
  (ex.: R$ 200 todo dia 26) vira um "a receber" previsto no mês atual e no próximo, com aviso, até completar o valor.
  A atualização do Supabase para isso está em `supabase/atualizacao-trabalhos.sql`; antes dela o app funciona e avisa.
  No quadro, segurar e arrastar o cartão muda a etapa (ou pelos botões de etapa dentro do trabalho). Cliente recorrente
  (etapa "Recorrente", ex.: social media) sai do quadro e ganha a aba Recorrentes, com quanto rendeu em cada mês; a aba
  Balanço mostra os trabalhos e o faturamento da Darzan por mês e no ano. Anexo aceita qualquer arquivo (foto vira JPEG
  leve; PDF e outros vão como estão, até 8 MB); abre em tela cheia com zoom e dá para compartilhar ou salvar.
- **Lembrete** para o Supabase grátis não "dormir": GitHub (`.github/workflows/manter-supabase-acordado.yml`,
  a cada 3 dias).

- **Avisos no celular** (Web Push): o app monta a agenda (tabela `avisos`: faturas, contas para pagar na mão, tarefas e
  trabalhos, 1 dia antes e no dia). A cada 30 minutos o GitHub (`.github/workflows/avisos.yml` → `avisos/enviar.mjs`) manda os
  que chegaram a hora (a partir das 9h; o de teste a qualquer hora) para os aparelhos (tabela `aparelhos`), uma notificação
  por aviso. O botão "Testar os avisos agora" mostra um aviso na hora no próprio aparelho e marca outro para o servidor.
  Ele só tem o segredo dos avisos (segredo `AVISOS_SEGREDO` do GitHub), que abre apenas a agenda e os
  aparelhos (funções `avisos_pendentes`, `avisos_enviados`, `aparelho_sumiu` do `esquema.sql`), nada das finanças.
  A mensagem vai trancada para o aparelho (RFC 8291) e assinada (VAPID), em `avisos/push.mjs`.
- **Acesso do Claude**: o João cria uma chave no app (Sua conta → Acesso do Claude) e passa para o Claude, que lê e
  corrige os dados direto (`ferramentas/claude.py`, funções `claude_ler` e `claude_gravar` do `esquema.sql`).
  O Supabase guarda só o sha256 da chave (tabela `acesso_claude`); a chave abre apenas os dados do João, nunca vai
  para o GitHub, e trocar ou desligar no app corta o acesso na hora.
- **Demonstração** (login `teste`, senha `123456`): para mostrar o app a alguém. Os dados são inventados por
  `darzan-producoes/financas/js/demo.js` em volta do dia de hoje e ficam só no aparelho; nesse modo o `nuvem.js` nunca
  chama o Supabase. Sair apaga a demonstração; avisos e Acesso do Claude ficam escondidos.
- **Planilha de backup** (Google Planilhas "Darzan Finanças — Backup", no Drive do João): o `backup/Backup.gs` (Apps Script
  da própria planilha) lê tudo pelo `claude_ler` a cada hora e reescreve as abas Resumo, Bancos e uma aba por tabela.
  Só lê; mudar a planilha não muda o app. A chave fica nas Propriedades do script, nunca na planilha.

- **Segurança e LGPD**: o que protege os dados, os vigias (a cada mudança e todo dia) e o que cabe ao João fazer estão em
  `SEGURANCA-E-LGPD.md`.

## Pastas
| Onde | O que tem |
|---|---|
| `darzan-producoes/financas/js/tabelas.js` | as tabelas e colunas (daqui sai o SQL) |
| `darzan-producoes/financas/js/nuvem.js` | login e conversa com o Supabase |
| `darzan-producoes/financas/js/base.js` | cópia no aparelho, fila de envio e as contas (faturas, saldos, tarefas, dicas) |
| `darzan-producoes/financas/js/telas.js` | as telas e formulários |
| `supabase/esquema.sql` | cria as tabelas e as regras de segurança (gerado por `ferramentas/gerar_sql.js`) |
| `testes/` | testes automáticos (rodam no GitHub a cada mudança) |
| `backup/Backup.gs` | planilha de backup que se atualiza sozinha (as abas saem de `ferramentas/gerar_backup.js`) |
| `ferramentas/claude.py` | o Claude lê e corrige os dados com a chave do Acesso do Claude |
| `ferramentas/gerar_importacao.py` | transforma a Planilha 2.0 no arquivo que o app importa |
| `apps-script/` | scripts que montaram a Planilha 2.0 (histórico; a planilha virou backup) |

## Testar
```sh
node financas-app/testes/testar-app.js          # todos os caminhos de teste (etapas em testes/caminhos/, explicadas em testes/CAMINHOS.md)
ETAPA=03 node financas-app/testes/testar-app.js # uma etapa só
financas-app/testes/testar-sql.sh               # regras de segurança num Postgres (PGHOST/PGUSER apontando para ele)
node financas-app/testes/supabase-de-mentira.js # abre o app na mão: http://127.0.0.1:8787/financas/
```

## Privacidade
Este repositório é público. Valores, extratos, nomes de clientes e fotos ficam só no Supabase e no aparelho
do João, nunca aqui. Os testes usam dados inventados (`testes/dados-exemplo.json`).
A chave `sb_publishable_...` no código é pública de propósito: sem login ela não lê nem grava nada.
