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
  // Seu WhatsApp com DDI + DDD + número, só números. Ex: '5511987654321'
  // Enquanto estiver vazio, os botões de WhatsApp levam para o Instagram.
  whatsapp: '5519995273041',

  instagram: 'darzanproducoes',

  // Opcional: aparece na seção de contato
  email: '',
  cidade: 'Campinas e região · Atendo também outras cidades',

  // Vídeo que roda no FUNDO do topo do site (de preferência horizontal, curto e leve).
  // Ex: 'videos/showreel.mp4'
  showreel: '',

  // Vídeo vertical que aparece DENTRO DO CELULAR no topo do site.
  // Ex: 'videos/destaque.mp4'
  videoDestaque: '',

  // Sua foto para a seção "Sobre". Ex: 'img/perfil.jpg'
  fotoPerfil: ''
};

/* ---------- VÍDEOS ----------
   categoria: 'casamentos' | 'empresas' | 'aniversarios' | 'cha-revelacao'

   video: pode ser
     - um arquivo seu:            'videos/casamento-1.mp4'
     - um link do YouTube/Shorts: 'https://youtube.com/shorts/XXXXXXXX'
     - um link de Reels:          'https://www.instagram.com/reel/XXXXXXXX/'

   capa (opcional): imagem de capa. Ex: 'img/capa-casamento-1.jpg'
   Deixe video: '' para manter o espaço reservado.
*/
const VIDEOS = [
  { titulo: 'Casamento',              categoria: 'casamentos',    video: '', capa: '' },
  { titulo: 'Making of da noiva',     categoria: 'casamentos',    video: '', capa: '' },
  { titulo: 'Evento corporativo',     categoria: 'empresas',      video: '', capa: '' },
  { titulo: 'Conteúdo para marca',    categoria: 'empresas',      video: '', capa: '' },
  { titulo: 'Aniversário',            categoria: 'aniversarios',  video: '', capa: '' },
  { titulo: 'Festa de 15 anos',       categoria: 'aniversarios',  video: '', capa: '' },
  { titulo: 'Chá revelação',          categoria: 'cha-revelacao', video: '', capa: '' },
  { titulo: 'Reações da família',     categoria: 'cha-revelacao', video: '', capa: '' }
];

/* ---------- FOTOS ----------
   arquivo: caminho da foto. Ex: 'fotos/casamento-01.jpg'
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
