# Planilha + Painel automático — Darzan Produções

A planilha é onde você anota. O painel é a tela bonita que lê a planilha sozinho.
Os dois ficam **ligados para sempre**: mexeu na planilha, o painel mostra na hora
(ele relê a planilha a cada minuto e toda vez que você abre).

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `Planilha-Darzan.xlsx` | A planilha modelo (com linhas de EXEMPLO) |
| `apps-script/Codigo.gs` | O código que liga a planilha ao painel |
| `apps-script/Painel.html` | O painel |

## Instalação (uma vez só, uns 10 minutos, pelo computador)

### 1. Colocar a planilha no Google Planilhas
1. Entre em **drive.google.com** → **+ Novo** → **Upload de arquivo** → escolha `Planilha-Darzan.xlsx`.
2. Dê dois cliques no arquivo → **Arquivo → Salvar como Planilhas Google**. Use sempre essa versão nova.
3. **Arquivo → Configurações** → Localidade **Brasil** e fuso **(GMT-03:00) São Paulo** → Salvar.

### 2. Colar o painel dentro da planilha
1. Na planilha, clique em **Extensões → Apps Script**. Abre uma página nova.
2. Vai aparecer um arquivo chamado `Código.gs` com um texto pequeno. **Apague tudo** e cole o conteúdo do arquivo `Codigo.gs`.
3. Ao lado de "Arquivos", clique no **+** → **HTML**. Dê o nome **Painel** (exatamente assim, com P maiúsculo).
4. Apague o que vier escrito e cole o conteúdo do arquivo `Painel.html`.
5. Clique no ícone de **disquete (Salvar)**.

### 3. Liberar e abrir
1. Volte para a planilha e **recarregue a página** (F5). Vai aparecer um menu novo chamado **Darzan** no topo.
2. Clique em **Darzan → Abrir painel**.
3. Na primeira vez o Google pede permissão: **Continuar** → escolha sua conta → **Avançado** →
   **Acessar (não seguro)** → **Permitir**. Isso aparece porque o código é seu e não passou por análise do Google.
   Ele só lê a sua própria planilha.
4. Pronto: o painel abre por cima da planilha.

### 4. Ter o painel no celular (opcional, recomendado)
1. No Apps Script, clique em **Implantar → Nova implantação**.
2. Na engrenagem ao lado de "Selecione o tipo", escolha **App da Web**.
3. **Executar como: Eu** · **Quem pode acessar: Somente eu** → **Implantar**.
4. Copie o **URL do app da Web** (ou, na planilha, **Darzan → Link do painel para o celular**).
5. Abra esse link no celular e salve nos favoritos (ou "Adicionar à tela inicial").
   Ele só abre logado na sua conta do Google: ninguém mais vê os seus números.

> Se um dia eu mandar uma versão nova do `Painel.html`, é só colar por cima no Apps Script e salvar.
> Para o link do celular pegar a versão nova: **Implantar → Gerenciar implantações → lápis → Versão: Nova versão → Implantar**.

## Uso no dia a dia
- **Fechou um trabalho?** Uma linha em **Trabalhos** (com "O que foi fechado": ex. *Teaser + filme completo + 10 reels*).
- **Passou um orçamento?** Uma linha em **Orçamentos**. Quando o cliente responder, troque o Status.
- **Cliente novo?** Aba **Clientes**.
- **Pagou freela?** Na própria linha do trabalho (colunas Freelancers e Custo com freelancers).
- **Gasto do negócio?** Aba **Despesas**. Equipamento novo: aba **Equipamentos**.
- Não renomeie os títulos das colunas: o painel encontra os dados por eles.
- Apague as linhas marcadas com **EXEMPLO** antes de começar.

## Para quem for mexer no código
- `gerar_planilha.py` gera a planilha; `apps-script/montar_painel.py` monta o `Painel.html` a partir de `painel-modelo.html`
  colocando os exemplos da planilha (usados só no modo demonstração, fora do Google).
