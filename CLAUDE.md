# Projeto Darzan Produções (João Darzan)

Videomaker e storymaker em Campinas e região. Fale com o usuário **em português do Brasil**, de forma simples (leiga).

- **Logo oficial e identidade visual: veja `marca/README.md`.** Use sempre os arquivos de `marca/logo/`
  (versão principal: `marca/logo/darzan-logo-dourado.svg`). Não redesenhe a logo.
- Site: `darzan-producoes/` (conteúdo em `darzan-producoes/js/conteudo.js`). **Endereço principal: https://darzanproducoes.joaodarzan10.workers.dev** (Cloudflare; provisório até comprar o domínio). O GitHub Pages (https://joaodarzan.github.io/meus-projetos/, `.github/workflows/publicar-github-pages.yml`) ainda publica, mas a página inicial redireciona para a Cloudflare. Cada push na `main` atualiza o site sozinho. O Netlify foi desligado (créditos do plano grátis acabavam a cada publicação). **Também na Cloudflare:** https://darzanproducoes.joaodarzan10.workers.dev (Workers, publica a `main`; `wrangler.jsonc` limita à pasta `darzan-producoes/` e liga o robô `cloudflare/worker.js`, que lista o bucket em `/api/videos`). **Vídeos são automáticos:** o que entra no bucket aparece sozinho no site (regras de nome em `carregarVideosDaNuvem`, `js/main.js`). Plano: vídeos no Cloudflare R2 (bucket `darzan-videos`, endereço público https://pub-130031e922ee48738efb8b8f3926986b.r2.dev) + domínio darzanproducoes.com.br.
- Financeiro: `financeiro/` (planilha + painel Google Apps Script; passo a passo em `financeiro/LEIA-ME.md`).
- **App de finanças:** `darzan-producoes/financas/`, dados no Supabase. Endereço: https://joaodarzan.github.io/meus-projetos/financas/ (GitHub Pages, publica a cada push na `main`). Como funciona e como testar: `financas-app/README.md`. Rode os testes antes de publicar. Nunca coloque dados pessoais no repositório (é público).
- YouTube: `marca/youtube-capa.html` e `marca/youtube-perfil.html` geram as imagens do canal.
- WhatsApp: (19) 99527-3041 · Instagram: @darzanproducoes
