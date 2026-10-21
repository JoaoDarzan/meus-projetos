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

  // Vídeo que roda no FUNDO do topo do site, atrás dos textos.
  // Use um trecho horizontal do seu melhor filme (30 a 60 segundos, sem som).
  // Melhor qualidade: um arquivo seu ('videos/fundo.mp4', 1920x1080, até ~15 MB).
  // Também aceita link do YouTube ou Vimeo (o YouTube começa com qualidade baixa).
  videoFundo: '',

  // OPCIONAL: versão VERTICAL (em pé) do vídeo de fundo, para celular.
  // Com ela, o celular mostra o vídeo em tela cheia. Sem ela, mostra o vídeo
  // horizontal inteiro numa faixa no topo. Ex: 'videos/fundo-celular.mp4'
  videoFundoCelular: '',

  // Vídeo vertical que aparece DENTRO DO CELULAR na seção Storymaker.
  // Ex: 'videos/story-destaque.mp4'
  videoCelular: '',

  // Sua foto (João Darzan) para a seção "Sobre". Ex: 'img/perfil.jpg'
  fotoPerfil: ''
};

/* ---------- FILMES (vídeos horizontais) ----------
   tipo:   'filme' | 'teaser' | 'cerimonia' | 'motion' | 'empresa'
   evento: texto livre. Ex: 'Casamento', 'Empresa', 'Aniversário', 'Chá revelação'

   video: pode ser
     - um arquivo seu:            'videos/filme-ana-pedro.mp4'
     - um link do YouTube:        'https://youtu.be/XXXXXXXXXXX'
     - um link do Vimeo:          'https://vimeo.com/123456789'

   capa (opcional): imagem de capa. Ex: 'img/capa-filme-1.jpg'
   O PRIMEIRO filme da lista aparece em destaque (maior).
   Deixe video: '' para manter o espaço reservado.
*/
const VIDEOS = [
  { titulo: 'Filme de casamento',       tipo: 'filme',     evento: 'Casamento',     video: '', capa: '' },
  { titulo: 'Teaser de casamento',      tipo: 'teaser',    evento: 'Casamento',     video: '', capa: '' },
  { titulo: 'Cerimônia na íntegra',     tipo: 'cerimonia', evento: 'Casamento',     video: '', capa: '' },
  { titulo: 'Vídeo institucional',      tipo: 'empresa',   evento: 'Empresa',       video: '', capa: '' },
  { titulo: 'Vinheta animada',          tipo: 'motion',    evento: 'Empresa',       video: '', capa: '' },
  { titulo: 'Teaser de aniversário',    tipo: 'teaser',    evento: 'Aniversário',   video: '', capa: '' },
  { titulo: 'Filme do chá revelação',   tipo: 'filme',     evento: 'Chá revelação', video: '', capa: '' },
  { titulo: 'Conteúdo para redes',      tipo: 'empresa',   evento: 'Empresa',       video: '', capa: '' },
  { titulo: 'Convite animado',          tipo: 'motion',    evento: 'Casamento',     video: '', capa: '' }
];

/* ---------- STORIES (vídeos verticais do storymaker) ----------
   video: arquivo seu ('videos/story-1.mp4'), link do YouTube Shorts
          ou link de Reels do Instagram.
   Deixe video: '' para manter o espaço reservado.
*/
const STORIES = [
  { titulo: 'Making of da noiva',  evento: 'Casamento',     video: '', capa: '' },
  { titulo: 'Entrada dos noivos',  evento: 'Casamento',     video: '', capa: '' },
  { titulo: 'Bastidores',          evento: 'Empresa',       video: '', capa: '' },
  { titulo: 'A revelação',         evento: 'Chá revelação', video: '', capa: '' }
];

/* ---------- FOTOS ----------
   arquivo: caminho da foto. Ex: 'fotos/casamento-01.jpg'
   categoria: 'casamentos' | 'empresas' | 'aniversarios' | 'cha-revelacao'
   Deixe arquivo: '' para manter o espaço reservado.
*/
const FOTOS = [
  { arquivo: '', categoria: 'casamentos',    legenda: 'Casamento' },
  { arquivo: '', categoria: 'casamentos',    legenda: 'Casamento' },
  { arquivo: '', categoria: 'empresas',      legenda: 'Evento corporativo' },
  { arquivo: '', categoria: 'aniversarios',  legenda: 'Aniversário' },
  { arquivo: '', categoria: 'cha-revelacao', legenda: 'Chá revelação' },
  { arquivo: '', categoria: 'casamentos',    legenda: 'Casamento' },
  { arquivo: '', categoria: 'aniversarios',  legenda: 'Aniversário' },
  { arquivo: '', categoria: 'empresas',      legenda: 'Evento corporativo' },
  { arquivo: '', categoria: 'cha-revelacao', legenda: 'Chá revelação' }
];

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
