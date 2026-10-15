# Premiere Pro + Claude (MCP)

Este repositório já vem configurado com o MCP do Adobe Premiere Pro
([hetpatel-11/Adobe_Premiere_Pro_MCP](https://github.com/hetpatel-11/Adobe_Premiere_Pro_MCP), versão 1.2.9),
no arquivo `.mcp.json`, com a telemetria desligada.

Ele só funciona **no seu computador**, porque o Premiere, o servidor MCP e o Claude precisam
estar na mesma máquina. Na sessão na nuvem ele não tem Premiere para conectar.

## Instalar (uma vez só)

Precisa de Premiere Pro 2020 ou mais novo e de Node.js 20+ (nodejs.org).

```bash
npm install -g adobe-premiere-pro-mcp@1.2.9
premiere-pro-mcp --install-cep    # instala o painel no Premiere e liga o modo CEP debug
premiere-pro-mcp --doctor         # confere se está tudo certo
```

1. Reinicie o Premiere e abra **Janela → Extensões → MCP Bridge (CEP)**.
2. Coloque a pasta que o instalador mostrou e clique para iniciar a ponte.

## Usar

- **Claude Code no PC**: abra este repositório (`claude` dentro da pasta `meus-projetos`) e aprove o
  servidor `premiere-pro` quando ele perguntar. Ele vem do `.mcp.json`.
- **Claude Desktop**: o `--install-cep` já configura o Claude Desktop no macOS e no Windows.

Primeiro teste, sem mexer em nada:

> Rode verify_premiere_connection. Não altere nada.

Se responder com os dados do Premiere, está conectado. Depois dá para pedir cortes, montar a
timeline, legendas, trilha e exportar direto no Premiere.

## Avisos

- O pacote não é assinado pela Adobe. Instale só pelo npm ou pelos Releases oficiais do repositório.
- O `--install-cep` liga o modo de depuração de extensões (CEP debug) do Premiere, que é necessário
  para extensões fora da loja da Adobe.
- O suporte validado pelo autor é no macOS; no Windows o instalador funciona, mas é menos testado.
