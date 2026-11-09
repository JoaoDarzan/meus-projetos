# Extras do Claude neste projeto

Instalados a pedido do João (11/2026). São de terceiros, de uso livre, e foram lidos antes de entrar aqui
(nenhum manda dados para fora; os scripts só leem arquivos locais).

| O quê | Para que serve | De onde veio | Licença |
|---|---|---|---|
| `skills/humanizer` | deixar texto escrito por IA com cara de gente (legendas, posts, propostas) | github.com/blader/humanizer | MIT |
| `skills/unslop` | tirar a "cara de IA" de telas e sites (cores, espaços, ícones, textos) | github.com/heydamir/unslop | CC BY 4.0 (Damir Sokolovsky) |
| `skills/ui-ux-pro-max` | guia de design de telas: estilos, paletas, fontes, acessibilidade (busca local em `data/`) | github.com/nextlevelbuilder/ui-ux-pro-max-skill | MIT |
| `agents/` (37) | especialistas: design, marketing e redes sociais, vendas, finanças, testes e anúncios | github.com/msitarzewski/agency-agents | MIT |

Não instalados: `graftcp` (desvia o tráfego de rede de programas por um proxy, não serve para o projeto e
contornaria as regras de rede deste ambiente) e `shadcn-ui-mcp-server` (componentes React; o app não usa
React, e servidor MCP se liga no app do Claude, não no projeto).

- `skills/economia/`: criada para este projeto (sem origem externa): regras para gastar menos tokens.
