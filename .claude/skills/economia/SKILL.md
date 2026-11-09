---
name: economia
description: Modo econômico de tokens para este projeto. Use SEMPRE, em toda tarefa, e principalmente quando o João falar em limite, tokens, "gastar menos" ou "semanal". Regras para ler, testar e responder gastando o mínimo sem perder qualidade.
---

# Economia de tokens (o limite semanal do João é curto)

O que mais gasta: conversa longa (todo o histórico é relido a cada mensagem), arquivo inteiro lido sem precisar, saída grande de comando, print de tela, subagente e teste completo rodado várias vezes.

## Ler
- Nunca leia arquivo inteiro de `telas.js`, `base.js`, `estilo.css` ou JSON de dados. Use `grep -n` para achar a linha e `sed -n 'A,Bp'` só no trecho, com `cut -c1-300` em linhas longas.
- Dados do Supabase: filtre no próprio script (data, id, banco) e imprima só os campos necessários.
- Não releia o que já está na conversa. Não releia arquivo depois de editar.

## Fazer
- Edite com script curto (python/sed) quando forem vários trechos; um comando por vez, sem tentativa e erro.
- Junte comandos independentes numa chamada só.
- Sem subagentes, sem pesquisa na web e sem prints de tela, a não ser que o João peça ou seja indispensável.
- Monitor/espera: um só, curto, que imprime uma linha no fim (nunca loop imprimindo a cada 15 s).

## Testar
- Rode só a etapa que mudou (`ETAPA=26 node financas-app/testes/testar-app.js`) e a sabotagem dela.
- A suíte completa (~7 min) só uma vez, antes de publicar. Mostre só o `tail -3` da saída.
- Robô: `node --test financas-app/testes/openfinance.test.mjs 2>&1 | tail -8`.

## Responder
- Curto: o que foi feito, o que falta, uma recomendação e uma pergunta. Tabela só quando ajuda.
- Sem repetir o pedido do João, sem explicar o óbvio, sem listar o que não vai fazer.
- Avisos de progresso numa frase.

## Dicas para o João (diga quando fizer sentido)
- Um assunto por conversa: ao terminar um tema, comece uma conversa nova (o histórico longo é o que mais gasta).
- `/compact` quando a conversa ficar longa.
- Tarefas simples (lançar um Pix, mudar um valor) gastam pouco; telas novas e testes completos gastam muito: junte pedidos de tela numa vez só.
