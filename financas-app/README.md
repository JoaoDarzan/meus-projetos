# Darzan Finanças (app)

App pessoal de finanças do João Darzan: contas, cartões, trabalhos da Darzan Produções e da JPL SOM,
equipamentos, tarefas e metas. Funciona no celular (iPhone, salvo na tela de início) e no computador.

**No ar em:** https://darzanproducoes.netlify.app/financas/ (com login; só o João entra)

## Como funciona
- **App** (`darzan-producoes/financas/`): páginas simples (HTML, CSS e JS, sem biblioteca de fora), publicadas pelo
  Netlify junto com o site. Guarda uma cópia dos dados no aparelho: abre na hora e funciona sem internet.
  Cada mudança entra numa fila e vai para o Supabase assim que der.
- **Dados** (Supabase): uma tabela por assunto (extrato, contas, cartões, parcelados, fixas, equipamentos, trabalhos,
  tarefas, metas, categorias). Cada linha tem dono e só o dono vê e mexe (Row Level Security).
- **Lembrete** para o Supabase grátis não "dormir": GitHub (`.github/workflows/manter-supabase-acordado.yml`,
  a cada 3 dias) e, de reserva, Netlify (`netlify/functions/manter-supabase-acordado.mjs`, todo dia).

## Pastas
| Onde | O que tem |
|---|---|
| `darzan-producoes/financas/js/tabelas.js` | as tabelas e colunas (daqui sai o SQL) |
| `darzan-producoes/financas/js/nuvem.js` | login e conversa com o Supabase |
| `darzan-producoes/financas/js/base.js` | cópia no aparelho, fila de envio e as contas (faturas, saldos, tarefas, dicas) |
| `darzan-producoes/financas/js/telas.js` | as telas e formulários |
| `supabase/esquema.sql` | cria as tabelas e as regras de segurança (gerado por `ferramentas/gerar_sql.js`) |
| `testes/` | testes automáticos (rodam no GitHub a cada mudança) |
| `ferramentas/gerar_importacao.py` | transforma a Planilha 2.0 no arquivo que o app importa |
| `apps-script/` | scripts que montaram a Planilha 2.0 (histórico; a planilha virou backup) |

## Testar
```sh
node financas-app/testes/testar-app.js          # app no navegador contra um Supabase de mentira (dados de exemplo)
financas-app/testes/testar-sql.sh               # regras de segurança num Postgres (PGHOST/PGUSER apontando para ele)
node financas-app/testes/supabase-de-mentira.js # abre o app na mão: http://127.0.0.1:8787/financas/
```

## Privacidade
Este repositório é público. Valores, extratos, nomes de clientes e fotos ficam só no Supabase e no aparelho
do João, nunca aqui. Os testes usam dados inventados (`testes/dados-exemplo.json`).
A chave `sb_publishable_...` no código é pública de propósito: sem login ela não lê nem grava nada.
