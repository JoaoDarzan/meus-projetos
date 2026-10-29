# Segurança e LGPD do Darzan Finanças

Este app guarda as finanças do João e dados de clientes da Darzan Produções (nome, evento, valores e, nos contratos
anexados, CPF e endereço). Aqui está o que protege esses dados, como isso é testado e o que cabe ao João fazer.

## Onde ficam os dados

| O quê | Onde | Quem acessa |
|---|---|---|
| Finanças, trabalhos, tarefas, equipamentos | Supabase (banco Postgres), tabelas com dono | só o João, com e-mail e senha |
| Comprovantes e contratos (arquivos) | Supabase, tabela `anexos` (coluna `conteudo`) | só o João; o arquivo só é baixado quando ele abre |
| Cópia para abrir sem internet | o próprio aparelho (navegador) | quem estiver com o aparelho desbloqueado; "Sair deste aparelho" apaga |
| Planilha de backup | Google Drive do João (sem os arquivos dos anexos) | o João (e quem ele compartilhar a planilha) |
| Avisos no celular | Supabase (`avisos`) e o serviço de notificação do aparelho, cifrado | o aparelho cadastrado |

O código fica num repositório **público** no GitHub. Por isso, nunca vão para lá: senhas, chaves, CPF ou dados de clientes.
O vigia de segredos (`ferramentas/vigia_segredos.py`) confere isso a cada mudança e barra a publicação se achar algo.

## Proteções que existem

- **Cada um só vê o que é seu** (Row Level Security em todas as tabelas). Sem login, nada abre nem grava.
  Cadastro de contas novas desligado no Supabase.
- **Senha e sessão**: login pelo Supabase Auth; "Sair deste aparelho" apaga a cópia dos dados, os avisos e o Face ID daquele aparelho.
- **Injeção de código (XSS)**: tudo que vem do banco é limpo antes de aparecer na tela; o banco recusa ids com `< > " ' \` & \`;
  imagens e arquivos só entram como `data:tipo;base64,` de verdade; a política de segurança (CSP) só deixa rodar script
  do próprio app e só deixa os dados irem para o próprio app e para o Supabase.
- **O app não abre escondido dentro de outro site** (clickjacking): `js/protecao.js` + cabeçalho `X-Frame-Options` no Netlify.
- **Leitor de PDF** (pdf.js) guardado no próprio app, conferido com a impressão digital oficial, com `isEvalSupported: false`
  (bloqueia a falha conhecida CVE-2024-4367 de PDF malicioso).
- **Acesso do Claude**: chave de 256 bits; o banco guarda só a impressão digital (sha256); a chave aparece uma vez e não fica
  guardada no aparelho; não grava avisos; no máximo 1000 mudanças por vez; trocar ou desligar no app corta na hora.
- **Arquivos de importação** ("Trazer correções"): só as abas de dados, só colunas conhecidas, só ids válidos.
  Aparelhos, avisos e anexos nunca vêm de arquivo.
- **Avisos**: só abrem endereços do próprio app (um aviso falso não leva para site de golpe).
- **Planilha de backup**: texto que parece fórmula (`=`, `+`, `-`, `@`) vai como texto, para não vazar dados.
- **LGPD**: excluir um trabalho apaga junto os comprovantes e contratos dele (no app e no banco).

## Como é testado (os "vigias")

1. **A cada mudança no código** (GitHub, `testar-financas.yml`):
   - vigia de segredos (nada de chave, senha ou CPF no repositório);
   - regras do banco (`testes/sql/testar-rls.sql`): outra pessoa não vê nada, a chave errada não abre, e ids com código,
     arquivos falsos, gravação de avisos pela chave e lotes gigantes são recusados;
   - etapa 20 dos testes do app (`testes/caminhos/20-ataques.js`): põe texto de ataque em todos os campos de todas as tabelas,
     abre todas as telas e fichas e confere que nada vira código; testa a CSP, o app dentro de outro site, arquivo de
     correções malicioso, o "Sair" e a chave do Claude.
   - Cada defesa foi desligada de propósito uma vez para provar que o teste percebe.
2. **Todo dia** (`vigia-seguranca.yml`): ataca o app no ar como um estranho (só com a chave pública): cadastro, tabelas,
   gravação, chaves inventadas e as proteções do site. Se algo abrir, o GitHub manda e-mail.

## LGPD: o que o João precisa saber

- **Quem é quem**: o João (Darzan Produções) é o *controlador* dos dados dos clientes. Supabase, Google e a Anthropic
  (Claude) são *operadores* (processam os dados a pedido dele).
- **Base legal**: os dados dos clientes servem para cumprir o contrato (LGPD art. 7º, V) e para a contabilidade da empresa.
- **Guardar só o necessário**: no app, o mínimo para o trabalho (nome, evento, valores). O CPF fica só dentro do contrato anexado.
- **Por quanto tempo**: sugestão de guardar contratos e comprovantes por **5 anos** depois do trabalho (prazo para cobranças e
  impostos) e depois excluir o trabalho (os anexos vão junto).
- **Direitos do cliente** (art. 18): se um cliente pedir, dá para mostrar o que existe dele (a ficha do trabalho) e
  excluir (excluir o trabalho). "Baixar uma cópia" em *Sua conta* exporta todos os dados do app.
- **Avisar os clientes**: vale pôr no contrato uma frase como "Os dados deste contrato são usados só para a prestação do
  serviço e guardados com segurança por até 5 anos." (o modelo de contrato fica com o João).
- **Se algo vazar** (art. 48): trocar a senha, desligar o Acesso do Claude no app, conferir no Supabase quem entrou e,
  se houver dado de cliente envolvido, avisar os clientes e a ANPD.

## O que só o João pode fazer (painel do Supabase e contas)

1. Rodar `supabase/atualizacao-seguranca.sql` uma vez (SQL Editor → New query → colar → Run).
2. Supabase → Authentication → **Sign In / Providers** (ou "Policies"): ligar *Secure password change* e *Secure email change*.
3. Supabase → Authentication → **Multi-Factor**: o app ainda não pede o segundo fator; próximo passo sugerido.
4. Usar uma senha longa (12 ou mais caracteres) e única para o app, e bloqueio de tela no celular.
5. Supabase → Project Settings → **General**: conferir a região do projeto (o ideal para dados de brasileiros é `sa-east-1`, São Paulo).
6. O segredo dos avisos (`AVISOS_SEGREDO`, nos segredos do GitHub) deve ser longo e aleatório (32+ caracteres).
7. Trocar a chave do Acesso do Claude de vez em quando (ela já passou por conversas) e atualizar a planilha de backup com a nova.
