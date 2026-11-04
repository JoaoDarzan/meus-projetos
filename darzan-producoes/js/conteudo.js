/* =====================================================================
   CONTEÚDO DO SITE — DARZAN PRODUÇÕES
   ---------------------------------------------------------------------
   Este é o ÚNICO arquivo que você precisa editar para colocar
   seus vídeos, fotos, feedbacks e contatos no site.

   Enquanto um item estiver vazio, o site mostra um "espaço reservado"
   no lugar dele. É só preencher que ele aparece automaticamente.
   ===================================================================== */

/* ---------- CONTATOS E INFORMAÇÕES GERAIS ---------- */
const SITE = {
  // Seu WhatsApp com DDI + DDD + número, só números.
  whatsapp: '5519995273041',

  instagram: 'darzanproducoes',

  // Opcional: aparece na seção de contato
  email: '',
  cidade: 'Campinas e região · Atendo também outras cidades',

  // Onde os vídeos ficam guardados (Cloudflare R2). Não precisa mexer.
  videosBase: 'https://pub-130031e922ee48738efb8b8f3926986b.r2.dev',

  // Vídeo que roda no FUNDO do topo do site, atrás dos textos.
  // Vídeo guardado na Cloudflare: escreva só o nome. Ex: 'fundo' (usa fundo-1080.mp4 e fundo-720.mp4).
  // Use um trecho horizontal do seu melhor filme (30 a 60 segundos, sem som).
  // Melhor qualidade: um arquivo seu ('videos/fundo.mp4', 1920x1080, até ~15 MB).
  // Também aceita link do YouTube ou Vimeo (o YouTube começa com qualidade baixa).
  videoFundo: {
    fontes: [
      { rotulo: '1080p', src: 'videos/topo-1080.mp4' },
      { rotulo: '720p', src: 'videos/topo-720.mp4' }
    ],
    capa: 'videos/topo.jpg'   // 1ª imagem do vídeo: aparece na hora, sem tela preta
  },

  // OPCIONAL: versão VERTICAL (em pé) do vídeo de fundo, para celular.
  // Com ela, o celular mostra o vídeo em tela cheia. Sem ela, mostra o vídeo
  // horizontal inteiro numa faixa no topo. Ex: 'videos/fundo-celular.mp4'
  videoFundoCelular: {
    fontes: [{ rotulo: 'Vertical', src: 'videos/topo-vertical.mp4' }],
    capa: 'videos/topo-vertical.jpg'
  },

  // Vídeo vertical que aparece DENTRO DO CELULAR na seção Storymaker.
  // Ex: 'videos/story-destaque.mp4'
  videoCelular: '',

  // Sua foto (João Darzan) para a seção "Sobre". Ex: 'img/perfil.jpg'
  fotoPerfil: 'img/perfil-joao-darzan.jpg'
};

/* ---------- FILMES (vídeos horizontais) ----------
   tipo:   'filme' | 'teaser' | 'cerimonia' | 'motion' | 'empresa'
   evento: texto livre. Ex: 'Casamento', 'Empresa', 'Aniversário', 'Chá revelação'

   video: pode ser
     - SÓ O NOME de um vídeo guardado na Cloudflare: 'casamento-ana-pedro'
       (o site usa casamento-ana-pedro-1080.mp4, -720.mp4 e a capa casamento-ana-pedro.jpg
       e abre no player próprio, em alta qualidade, sem marca do YouTube)
     - um arquivo seu:            'videos/filme-ana-pedro.mp4'
     - um link do YouTube:        'https://youtu.be/XXXXXXXXXXX'
     - um link do Vimeo:          'https://vimeo.com/123456789'

   capa (opcional): imagem de capa. Ex: 'img/capa-filme-1.jpg'
   duracao (opcional): aparece no canto do cartão. Ex: '4:32'
   O PRIMEIRO filme da lista aparece em destaque (maior).
   Deixe video: '' para manter o espaço reservado.
*/
const VIDEOS = [
  // Os vídeos da Cloudflare entram aqui sozinhos (os mais novos primeiro).
  // Para fixar um vídeo à mão: { titulo: 'Ana & Pedro', tipo: 'filme', evento: 'Casamento', video: 'nome-no-bucket' },
];

/* ---------- STORIES (vídeos verticais do storymaker) ----------
   video: arquivo seu ('videos/story-1.mp4'), link do YouTube Shorts
          ou link de Reels do Instagram.
   Deixe video: '' para manter o espaço reservado.
*/
const STORIES = [
  // Os stories da Cloudflare entram aqui sozinhos (nome com "story" ou "reels").
  // Enquanto não houver, o site mostra 4 espaços vazios.
];

/* ---------- FOTOS ----------
   Galeria simples, sem categorias. As fotos da pasta "fotos/" do bucket da Cloudflare
   entram sozinhas. Para colocar à mão: { arquivo: 'fotos/foto-01.jpg', legenda: '' }
*/
const FOTOS = [];

/* ---------- FEEDBACKS ----------
   texto:  o depoimento do cliente
   nome:   nome do cliente
   evento: tipo de evento (ex: 'Casamento', 'Chá revelação')
   foto:   (opcional) foto do cliente. Ex: 'feedbacks/maria.jpg'
   Deixe texto: '' para manter o espaço reservado.
*/
const FEEDBACKS = [
  { texto: '', nome: '', evento: 'Casamento',     foto: '' },
  { texto: '', nome: '', evento: 'Empresa',       foto: '' },
  { texto: '', nome: '', evento: 'Aniversário',   foto: '' },
  { texto: '', nome: '', evento: 'Chá revelação', foto: '' }
];

/* ---------- PRINTS DE FEEDBACK (opcional) ----------
   Prints de conversas do WhatsApp/Instagram com elogios de clientes.
   Ex: ['feedbacks/print-1.jpg', 'feedbacks/print-2.jpg']
   Se a lista ficar vazia, essa parte não aparece no site.
*/
const PRINTS = [];
