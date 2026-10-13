# Darzan Produções — Site portfólio

Site de portfólio de videomaker (filmes cinematográficos, teasers e cerimônia na íntegra) e storymaker,
com seções de filmes, stories, fotos, feedbacks e contato. Campinas e região.

Para ver o site, abra o `index.html` no navegador.

## Como colocar seu conteúdo

Você só precisa editar **um arquivo**: `js/conteudo.js`.
Tudo o que estiver vazio aparece no site como um "espaço reservado". Quando você preenche, o conteúdo aparece no lugar.

### 1. WhatsApp
Já configurado: `whatsapp: '5519995273041'`.

### 2. Vídeo de fundo do topo
É o vídeo que roda atrás dos textos logo que a pessoa entra no site. Use um trecho horizontal do seu melhor filme (30 a 60 segundos, sem som):
```js
videoFundo: 'videos/fundo.mp4',              // arquivo seu (recomendado, até ~15 MB)
videoFundo: 'https://youtu.be/XXXXXXXXXXX',  // ou um link do YouTube
```

### 3. Filmes (vídeos horizontais)
Coloque em `VIDEOS`. O **primeiro** da lista aparece em destaque, maior.
```js
{ titulo: 'Ana & Pedro', tipo: 'filme',     evento: 'Casamento', video: 'https://youtu.be/XXXXXXXXXXX', capa: '' },
{ titulo: 'Ana & Pedro', tipo: 'teaser',    evento: 'Casamento', video: 'https://vimeo.com/123456789', capa: '' },
{ titulo: 'Ana & Pedro', tipo: 'cerimonia', evento: 'Casamento', video: 'videos/cerimonia.mp4', capa: 'img/capa.jpg' },
```
Tipos aceitos: `filme`, `teaser`, `cerimonia` (cerimônia na íntegra). Filmes longos ficam melhores no YouTube ou Vimeo.

### 4. Storymaker (vídeos verticais)
- `videoCelular`: vídeo vertical que aparece dentro do celular na seção Storymaker.
- `STORIES`: os stories que aparecem abaixo, com link do Reels, Shorts ou arquivo seu.
```js
{ titulo: 'Making of da noiva', evento: 'Casamento', video: 'https://www.instagram.com/reel/XXXXXXX/', capa: 'img/capa-story.jpg' },
```
Vídeos do Instagram não geram capa sozinhos, então coloque uma imagem em `capa`.

### 5. Sua foto
- `fotoPerfil`: sua foto na seção "Sobre".

### 6. Fotos
Coloque as fotos na pasta `fotos/` e preencha:
```js
{ arquivo: 'fotos/casamento-01.jpg', categoria: 'casamentos', legenda: 'Casamento' },
```

### 7. Feedbacks
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
