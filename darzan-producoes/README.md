# Darzan Produções — Site portfólio

Site de portfólio para storymaker e videomaker, com seções de vídeos, fotos, feedbacks e contato.
Atende casamentos, empresas, aniversários e chá revelação.

Para ver o site, abra o `index.html` no navegador.

## Como colocar seu conteúdo

Você só precisa editar **um arquivo**: `js/conteudo.js`.
Tudo o que estiver vazio aparece no site como um "espaço reservado". Quando você preenche, o conteúdo aparece no lugar.

### 1. WhatsApp
Coloque seu número com DDI e DDD, só números:
```js
whatsapp: '5511987654321',
```
Enquanto o número estiver vazio, os botões de WhatsApp abrem o Instagram [@darzanproducoes](https://www.instagram.com/darzanproducoes/).

### 2. Vídeos
Para usar arquivos seus, coloque-os na pasta `videos/`. Você também pode usar links do YouTube/Shorts ou de Reels do Instagram:
```js
{ titulo: 'Casamento Ana & Pedro', categoria: 'casamentos', video: 'videos/casamento-ana.mp4', capa: '' },
{ titulo: 'Chá revelação',         categoria: 'cha-revelacao', video: 'https://youtube.com/shorts/XXXXXXXXXXX', capa: '' },
{ titulo: 'Evento da empresa X',   categoria: 'empresas', video: 'https://www.instagram.com/reel/XXXXXXX/', capa: 'img/capa-empresa.jpg' },
```
Categorias aceitas: `casamentos`, `empresas`, `aniversarios`, `cha-revelacao`.
Para criar mais espaços, copie uma linha; para tirar um espaço, apague a linha.

> Dica: comprima os vídeos antes de subir (até ~10 MB cada) para o site carregar rápido no celular.
> Vídeos do Instagram não geram capa sozinhos, então coloque uma imagem em `capa`.

### 3. Vídeos do topo
- `showreel`: vídeo que roda no fundo do topo do site (curto, sem som, de preferência horizontal).
- `videoDestaque`: vídeo vertical que aparece dentro do celular no topo.
- `fotoPerfil`: sua foto na seção "Sobre".

### 4. Fotos
Coloque as fotos na pasta `fotos/` e preencha:
```js
{ arquivo: 'fotos/casamento-01.jpg', categoria: 'casamentos', legenda: 'Casamento' },
```

### 5. Feedbacks
```js
{ texto: 'O Darzan foi incrível, recebemos os stories na hora!', nome: 'Maria e João', evento: 'Casamento', foto: '' },
```
Se tiver **prints** de elogios do WhatsApp ou Instagram, coloque-os em `feedbacks/` e liste-os em `PRINTS`:
```js
const PRINTS = ['feedbacks/print-1.jpg', 'feedbacks/print-2.jpg'];
```

## Como colocar o site no ar (grátis)
- **Netlify Drop**: entre em https://app.netlify.com/drop e arraste a pasta `darzan-producoes`.
- **GitHub Pages**: no repositório, vá em *Settings → Pages* e publique a branch. O site fica em `.../darzan-producoes/`.
- **Vercel**: importe o repositório e defina `darzan-producoes` como pasta raiz.

## Estrutura
```
darzan-producoes/
├── index.html        → página do site
├── css/style.css     → visual (cores nas variáveis do :root)
├── js/conteudo.js    → SEU CONTEÚDO (vídeos, fotos, feedbacks, contatos)
├── js/main.js        → funcionamento do site
├── videos/           → seus vídeos
├── fotos/            → suas fotos
├── feedbacks/        → fotos de clientes e prints
└── img/              → capas, sua foto de perfil etc.
```
