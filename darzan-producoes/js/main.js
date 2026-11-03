/* =====================================================================
   DARZAN PRODUÇÕES — comportamento do site
   (para trocar vídeos, fotos e feedbacks edite js/conteudo.js)
   ===================================================================== */

const TIPOS = {
  'filme': 'Filme',
  'teaser': 'Teaser',
  'cerimonia': 'Cerimônia na íntegra',
  'motion': 'Vídeo com motion',
  'empresa': 'Vídeo para empresa'
};

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const esc = (str = '') => String(str).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

/* ---------- Identifica o tipo de vídeo pelo link ---------- */
function parseVideo(url) {
  if (!url) return null;
  if (typeof url === 'object' && url.fontes && url.fontes.length) {
    const f = url.fontes;
    return { tipo: 'arquivo', src: f[0].src, leve: f.length > 1 ? f[f.length - 1].src : null, fontes: f, thumb: url.capa || '' };
  }
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) {
    return {
      tipo: 'youtube',
      id: yt[1],
      embed: `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&rel=0&playsinline=1`,
      fundo: `https://www.youtube.com/embed/${yt[1]}?autoplay=1&mute=1&controls=0&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3&cc_load_policy=0&disablekb=1&fs=0&enablejsapi=1${/^https?:/.test(location.origin) ? `&origin=${encodeURIComponent(location.origin)}` : ''}`,
      thumb: `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg`
    };
  }
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) {
    return {
      tipo: 'vimeo',
      embed: `https://player.vimeo.com/video/${vm[1]}?autoplay=1`,
      fundo: `https://player.vimeo.com/video/${vm[1]}?background=1&autoplay=1&loop=1&muted=1`
    };
  }
  const ig = url.match(/instagram\.com\/(?:reel|reels|p|tv)\/([\w-]+)/);
  if (ig) {
    return { tipo: 'instagram', embed: `https://www.instagram.com/reel/${ig[1]}/embed` };
  }
  /* só o nome (ex: 'casamento-ana'): vídeo guardado na Cloudflare R2,
     em duas qualidades (nome-1080.mp4 e nome-720.mp4) e com capa (nome.jpg) */
  if (/^[a-z0-9][\w-]*$/i.test(url) && SITE.videosBase) {
    const base = `${SITE.videosBase.replace(/\/+$/, '')}/${url}`;
    const fontes = [
      { rotulo: '1080p', src: `${base}-1080.mp4` },
      { rotulo: '720p', src: `${base}-720.mp4` }
    ];
    return { tipo: 'arquivo', src: fontes[0].src, leve: fontes[1].src, fontes, thumb: `${base}.jpg` };
  }
  return { tipo: 'arquivo', src: url, fontes: [{ rotulo: 'Original', src: url }] };
}

/* ---------- Links de WhatsApp ---------- */
function setupWhatsApp() {
  const fallback = `https://www.instagram.com/${SITE.instagram}/`;
  $$('.js-whatsapp').forEach(a => {
    const msg = encodeURIComponent(a.dataset.msg || 'Olá!');
    a.href = SITE.whatsapp ? `https://wa.me/${SITE.whatsapp}?text=${msg}` : fallback;
    a.target = '_blank';
    a.rel = 'noopener';
  });

  const extra = [];
  if (SITE.email) extra.push(`<a href="mailto:${esc(SITE.email)}">${esc(SITE.email)}</a>`);
  if (SITE.cidade) extra.push(esc(SITE.cidade));
  $('#contactExtra').innerHTML = extra.join(' · ');
}

/* ---------- Topo (vídeo de fundo), celular e foto ---------- */
/* Vídeo de fundo do topo.
   - Computador (ou celular deitado): vídeo cobre o topo inteiro.
   - Celular em pé: se houver SITE.videoFundoCelular (vídeo vertical), ele cobre a tela;
     senão o vídeo horizontal aparece INTEIRO numa faixa de cinema no topo, sem cortes.
   - YouTube escolhe a qualidade pelo tamanho do player: o player tem sempre 1920x1080
     e é ampliado/reduzido com zoom, para o YouTube mandar a qualidade alta. */
const telaEmPe = window.matchMedia('(max-width: 760px) and (orientation: portrait)');
let modoVideo = null;
function montarVideoFundo() {
  const media = $('#heroMedia');
  const hero = $('#inicio');
  const celular = telaEmPe.matches;
  const fonteCel = parseVideo(SITE.videoFundoCelular);
  const fonte = celular && fonteCel ? fonteCel : parseVideo(SITE.videoFundo);
  const faixa = !!fonte && celular && !fonteCel;
  const modo = `${celular}|${faixa}`;
  if (modo === modoVideo) { ajustarVideoFundo(); return; }
  modoVideo = modo;
  hero.classList.toggle('hero--faixa', faixa);
  if (!fonte) {
    media.classList.add('is-empty');
    media.replaceChildren();
    return;
  }
  const aviso = $('#heroHint');
  if (aviso) aviso.remove();
  media.classList.remove('is-empty');
  if (fonte.tipo === 'arquivo') {
    /* celular: versão 720p (carrega mais rápido); computador: 1080p */
    const src = celular && fonte.leve ? fonte.leve : fonte.src;
    media.innerHTML = `<video src="${esc(src)}" muted loop playsinline autoplay preload="auto"></video>`;
    const v = $('video', media);
    v.addEventListener('playing', () => v.classList.add('is-on'), { once: true });
    v.play().catch(() => v.classList.add('is-on'));
  } else if (fonte.fundo) {
    media.innerHTML = `<iframe id="videoFundoYT" src="${esc(fonte.fundo)}" title="Vídeo de fundo" allow="autoplay; encrypted-media" tabindex="-1"></iframe>`;
    ajustarVideoFundo();
    if (fonte.tipo === 'youtube') controlarYouTube($('iframe', media));
    else $('iframe', media).addEventListener('load', () => setTimeout(() => $('iframe', media) && $('iframe', media).classList.add('is-on'), 2600));
  }
}
/* Controle do YouTube: o vídeo só aparece quando já está tocando (sem botão de play, título
   ou legendas), e a repetição é feita pelo site, antes da tela final de sugestões do YouTube.
   Se o celular bloquear o vídeo, o YouTube nunca aparece: fica só o fundo dourado. */
function carregarApiYouTube() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (!window.__ytApi) {
    window.__ytApi = new Promise((resolve) => {
      const anterior = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (anterior) anterior(); resolve(window.YT); };
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.append(tag);
    });
  }
  return window.__ytApi;
}
function controlarYouTube(frame) {
  let mostrado = false;
  let relogio = null;
  const semLegenda = (p) => {
    try { p.unloadModule('captions'); } catch (e) { /* sem legenda carregada */ }
    try { p.unloadModule('cc'); } catch (e) { /* idem */ }
  };
  carregarApiYouTube().then((YT) => {
    if (!frame.isConnected) return;
    new YT.Player(frame, {
      events: {
        onReady: (ev) => {
          const p = ev.target;
          p.mute();
          semLegenda(p);
          p.playVideo();
          clearInterval(relogio);
          relogio = setInterval(() => {
            if (!frame.isConnected) { clearInterval(relogio); return; }
            const dur = p.getDuration ? p.getDuration() : 0;
            const t = p.getCurrentTime ? p.getCurrentTime() : 0;
            // volta ao começo um pouco antes do fim: a tela final do YouTube nunca aparece
            if (dur > 1 && t > dur - 0.6) p.seekTo(0, true);
          }, 200);
        },
        onApiChange: (ev) => semLegenda(ev.target),
        onStateChange: (ev) => {
          const p = ev.target;
          if (ev.data === YT.PlayerState.PLAYING) {
            semLegenda(p);
            if (!mostrado) {
              mostrado = true;
              // o título do YouTube some sozinho nos primeiros segundos: só mostra depois disso
              setTimeout(() => frame.classList.add('is-on'), 3200);
            }
          } else if (ev.data === YT.PlayerState.ENDED) {
            p.seekTo(0, true);
            p.playVideo();
          } else if (ev.data === YT.PlayerState.PAUSED && document.visibilityState === 'visible') {
            p.playVideo();
          }
        },
      },
    });
  });
}

function ajustarVideoFundo() {
  const media = $('#heroMedia');
  const frame = $('iframe', media);
  if (!frame) return;
  const W = media.clientWidth, H = media.clientHeight;
  const faixa = $('#inicio').classList.contains('hero--faixa');
  const escala = faixa ? W / 1920 : Math.max(W / 1920, H / 1080) * 1.08;
  frame.style.transform = `translate(-50%, -50%) scale(${escala})`;
}
telaEmPe.addEventListener('change', montarVideoFundo);
addEventListener('resize', ajustarVideoFundo);

function setupMedia() {
  montarVideoFundo();

  const phone = $('#storyPhone');
  if (SITE.videoCelular) {
    phone.innerHTML = `<video src="${esc(SITE.videoCelular)}" muted loop playsinline autoplay></video>`;
  } else {
    phone.innerHTML = `
      <div class="placeholder placeholder--phone">
        <svg viewBox="0 0 24 24"><use href="#i-play"/></svg>
        <span>Seu vídeo de stories aqui</span>
      </div>`;
  }

  const about = $('#aboutPhoto');
  about.innerHTML = SITE.fotoPerfil
    ? `<img src="${esc(SITE.fotoPerfil)}" alt="João Darzan" loading="lazy">`
    : `<div class="placeholder"><svg viewBox="0 0 24 24"><use href="#i-camera"/></svg><span>Sua foto aqui</span></div>`;
}

/* ---------- Cartão de vídeo (filmes e stories) ---------- */
function videoCard(v, i, { lista, classe, tag, vazio }) {
  const info = parseVideo(v.video);
  let media;

  if (!info) {
    media = `
      <div class="placeholder">
        <svg viewBox="0 0 24 24"><use href="#i-play"/></svg>
        <span>${vazio}</span>
      </div>`;
  } else if (v.capa || info.thumb) {
    media = `<img src="${esc(v.capa || info.thumb)}" alt="${esc(v.titulo)}" loading="lazy">`;
  } else if (info.tipo === 'arquivo') {
    media = `<video src="${esc(info.src)}#t=0.5" muted loop playsinline preload="metadata"></video>`;
  } else {
    media = `<div class="placeholder placeholder--filled"><svg viewBox="0 0 24 24"><use href="#i-play"/></svg></div>`;
  }

  const el = info ? 'button' : 'div';
  const attrs = info ? `type="button" data-lista="${lista}" data-index="${i}" aria-label="Assistir: ${esc(v.titulo)}"` : '';
  const cat = v.tipo ? `data-cat="${esc(v.tipo)}"` : '';

  return `
    <${el} class="${classe} reveal${info ? '' : ' is-empty'}" ${cat} ${attrs}>
      <div class="media-card__media">${media}</div>
      ${info ? '<span class="media-card__play"><svg viewBox="0 0 24 24"><use href="#i-play"/></svg></span>' : ''}
      ${info && v.duracao ? `<span class="media-card__tempo">${esc(v.duracao)}</span>` : ''}
      <div class="media-card__info">
        <span class="media-card__cat">${esc(tag)}</span>
        <strong>${esc(v.titulo)}</strong>
      </div>
    </${el}>`;
}

function bindCards(grid) {
  // prévia ao passar o mouse (vídeos próprios)
  $$('.media-card__media video', grid).forEach(video => {
    const card = video.closest('[data-index]') || video.parentElement;
    card.addEventListener('mouseenter', () => video.play().catch(() => {}));
    card.addEventListener('mouseleave', () => video.pause());
  });
  // prévia ao passar o mouse (vídeos da Cloudflare R2): carrega a versão leve só nessa hora
  const temMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  $$('[data-index]', grid).forEach(card => {
    const lista = card.dataset.lista === 'stories' ? STORIES : VIDEOS;
    const info = parseVideo(lista[card.dataset.index].video);
    if (!temMouse || !info || !info.leve) return;
    const media = $('.media-card__media', card);
    let previa = null;
    card.addEventListener('mouseenter', () => {
      if (previa) return;
      previa = document.createElement('video');
      Object.assign(previa, { muted: true, loop: true, playsInline: true, preload: 'auto', src: info.leve });
      previa.className = 'media-card__previa';
      previa.addEventListener('loadedmetadata', () => { previa && (previa.currentTime = Math.min(8, previa.duration * 0.2)); }, { once: true });
      previa.addEventListener('playing', () => previa && previa.classList.add('is-on'), { once: true });
      media.append(previa);
      previa.play().catch(() => { });
    });
    card.addEventListener('mouseleave', () => {
      if (!previa) return;
      previa.pause();
      previa.removeAttribute('src');
      previa.load();
      previa.remove();
      previa = null;
    });
  });
  $$('[data-index]', grid).forEach(card => {
    card.addEventListener('click', () => {
      const vertical = card.dataset.lista === 'stories';
      const item = (vertical ? STORIES : VIDEOS)[card.dataset.index];
      openVideo(item, vertical);
    });
  });
}

function renderVideos() {
  const grid = $('#videoGrid');
  grid.innerHTML = VIDEOS.map((v, i) => videoCard(v, i, {
    lista: 'filmes',
    classe: `media-card film-card${i === 0 ? ' film-card--featured' : ''}`,
    tag: [TIPOS[v.tipo], v.evento].filter(Boolean).join(' · '),
    vazio: `Espaço para ${v.tipo === 'filme' || v.tipo === 'teaser' ? (TIPOS[v.tipo] || 'vídeo').toLowerCase() : 'vídeo'}`
  })).join('');
  bindCards(grid);
}

function renderStories() {
  const grid = $('#storyGrid');
  grid.innerHTML = STORIES.map((v, i) => videoCard(v, i, {
    lista: 'stories',
    classe: 'media-card story-card',
    tag: v.evento || 'Stories',
    vazio: 'Espaço para story'
  })).join('');
  bindCards(grid);
}

function openVideo(v, vertical) {
  const info = parseVideo(v.video);
  if (!info) return;
  const formato = vertical || info.tipo === 'instagram' ? 'vertical' : 'horizontal';
  if (info.tipo === 'arquivo') {
    openModal(`<div class="modal__video modal__video--${formato} modal__video--arquivo"></div>`);
    const msg = `Olá! Vi o vídeo "${v.titulo}" no seu site e quero um orçamento.`;
    Player.criar($('#modalContent .modal__video'), {
      fontes: info.fontes,
      capa: v.capa || info.thumb || '',
      titulo: v.titulo,
      whatsapp: SITE.whatsapp ? `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(msg)}` : ''
    });
    return;
  }
  const html = `<iframe src="${esc(info.embed)}" title="${esc(v.titulo)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
  openModal(`<div class="modal__video modal__video--${formato} modal__video--${info.tipo}">${html}</div>`);
}

/* ---------- Fotos ---------- */
function renderFotos() {
  const grid = $('#photoGrid');
  grid.innerHTML = FOTOS.map((f, i) => {
    if (!f.arquivo) {
      return `
        <div class="photo reveal is-empty" data-cat="${esc(f.categoria)}">
          <div class="placeholder">
            <svg viewBox="0 0 24 24"><use href="#i-camera"/></svg>
            <span>Espaço para foto</span>
          </div>
        </div>`;
    }
    return `
      <button type="button" class="photo reveal" data-cat="${esc(f.categoria)}" data-photo="${i}" aria-label="Ampliar foto: ${esc(f.legenda)}">
        <img src="${esc(f.arquivo)}" alt="${esc(f.legenda)}" loading="lazy">
        ${f.legenda ? `<span class="photo__caption">${esc(f.legenda)}</span>` : ''}
      </button>`;
  }).join('');

  $$('[data-photo]', grid).forEach(el => {
    el.addEventListener('click', () => openPhoto(+el.dataset.photo));
  });
}

let currentPhoto = 0;
function visiblePhotos() {
  return $$('#photoGrid [data-photo]').filter(el => !el.hidden).map(el => +el.dataset.photo);
}
function openPhoto(index) {
  currentPhoto = index;
  const f = FOTOS[index];
  const multiple = visiblePhotos().length > 1;
  openModal(`
    <figure class="modal__photo">
      <img src="${esc(f.arquivo)}" alt="${esc(f.legenda)}">
      ${f.legenda ? `<figcaption>${esc(f.legenda)}</figcaption>` : ''}
    </figure>
    ${multiple ? `
      <button class="modal__arrow modal__arrow--prev" data-step="-1" aria-label="Foto anterior">←</button>
      <button class="modal__arrow modal__arrow--next" data-step="1" aria-label="Próxima foto">→</button>` : ''}
  `);
  $$('[data-step]', $('#modalContent')).forEach(b => {
    b.addEventListener('click', () => stepPhoto(+b.dataset.step));
  });
}
function stepPhoto(step) {
  const list = visiblePhotos();
  if (list.length < 2) return;
  const pos = list.indexOf(currentPhoto);
  openPhoto(list[(pos + step + list.length) % list.length]);
}

/* ---------- Feedbacks ---------- */
function renderFeedbacks() {
  const track = $('#feedbackTrack');
  track.innerHTML = FEEDBACKS.map(f => {
    const vazio = !f.texto;
    const inicial = (f.nome || '?').trim().charAt(0).toUpperCase();
    const avatar = f.foto
      ? `<img src="${esc(f.foto)}" alt="${esc(f.nome)}" loading="lazy">`
      : `<span>${esc(inicial)}</span>`;
    return `
      <article class="feedback reveal${vazio ? ' is-empty' : ''}">
        <svg class="feedback__quote" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-quote"/></svg>
        <div class="feedback__stars" aria-label="5 estrelas">★★★★★</div>
        <p>${vazio ? 'Espaço reservado para o depoimento de um cliente.' : esc(f.texto)}</p>
        <footer>
          <div class="feedback__avatar">${avatar}</div>
          <div>
            <strong>${esc(f.nome || 'Nome do cliente')}</strong>
            <span>${esc(f.evento || '')}</span>
          </div>
        </footer>
      </article>`;
  }).join('');

  const scrollBy = dir => {
    const card = $('.feedback', track);
    if (!card) return;
    track.scrollBy({ left: dir * (card.offsetWidth + 24), behavior: 'smooth' });
  };
  $('#fbPrev').addEventListener('click', () => scrollBy(-1));
  $('#fbNext').addEventListener('click', () => scrollBy(1));

  if (PRINTS.length) {
    $('#printsWrap').hidden = false;
    $('#printsGrid').innerHTML = PRINTS.map((src, i) => `
      <button type="button" class="print" data-print="${i}" aria-label="Ampliar print ${i + 1}">
        <img src="${esc(src)}" alt="Feedback de cliente ${i + 1}" loading="lazy">
      </button>`).join('');
    $$('[data-print]').forEach(b => b.addEventListener('click', () => {
      openModal(`<figure class="modal__photo"><img src="${esc(PRINTS[b.dataset.print])}" alt="Feedback de cliente"></figure>`);
    }));
  }
}

/* ---------- Vídeos automáticos da Cloudflare R2 ----------
   O robô da Cloudflare (cloudflare/worker.js) devolve em /api/videos a lista do bucket.
   Cada vídeo vira um cartão sozinho:
   - nome-1080.mp4 + nome-720.mp4 (ou só nome.mp4) + nome.jpg (capa, opcional)
   - o tipo sai do nome: teaser, cerimonia, motion, empresa/institucional; senão é "filme"
   - nome com "story"/"stories"/"vertical"/"reels" vai para os stories
   - nome com "fundo" ou "topo" vira o vídeo de fundo do topo ("fundo-celular"/"topo-vertical": versão em pé)
   - os mais novos aparecem primeiro. Títulos à mão: lista.json no bucket (opcional). */
const TIPO_PELO_NOME = [
  ['cerimonia', /cerim[oô]nia|[ií]ntegra/i],
  ['teaser', /teaser|trailer/i],
  ['motion', /motion|vinheta|anima[cç]/i],
  ['empresa', /empresa|institucional|corporativ|comercial/i]
];
const EVENTO_PELO_NOME = [
  ['Casamento', /casamento|wedding|noiv/i],
  ['Aniversário', /anivers|15[-_ ]?anos|debutante/i],
  ['Chá revelação', /ch[aá][-_ ]?(de[-_ ])?revela/i],
  ['Empresa', /empresa|institucional|corporativ|comercial/i]
];
const PALAVRA_DE_TECNICA = /^(teaser|trailer|filme|film|cerim[oô]nia|[ií]ntegra|na|motion|vinheta|empresa|institucional|v[ií]deo|final|v\d+|\d{3,4}p?|4k|hd|sd|story|stories|reels?|completo|editado|export|render|topo|fundo|casamento|wedding|anivers[aá]rio|aniver|ch[aá]|revela[cç][aã]o|revelacao)$/i;

function tituloDoNome(stem) {
  const palavras = stem.split('/').pop().split(/[-_\s.]+/).filter(p => p && !PALAVRA_DE_TECNICA.test(p));
  return palavras.map((p, i) => (i > 0 && /^(e|de|da|do|das|dos)$/i.test(p))
    ? p.toLowerCase()
    : p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}
const urlR2 = nome => `${SITE.videosBase.replace(/\/+$/, '')}/${nome.split('/').map(encodeURIComponent).join('/')}`;
const rotuloQualidade = q => q >= 2160 ? '4K' : q ? `${q}p` : 'Original';

async function carregarVideosDaNuvem() {
  if (!SITE.videosBase || !/^https?:$/.test(location.protocol)) return;
  let dados;
  try {
    const r = await fetch('api/videos');
    if (!r.ok) return;
    dados = await r.json();
  } catch (e) { return; }
  const info = dados.info || {};

  /* junta as versões de cada vídeo (1080, 720, capa) pelo nome */
  const grupos = new Map();
  for (const a of dados.arquivos || []) {
    if (!a || !a.nome || a.nome === 'lista.json') continue;
    const ext = a.nome.match(/\.[^./]+$/);
    if (!ext) continue;
    let stem = a.nome.slice(0, -ext[0].length);
    let q = 0;
    const mq = stem.match(/[-_ ](2160p?|4k|1080p?|720p?|480p?)$/i);
    if (mq) { stem = stem.slice(0, -mq[0].length); q = parseInt(mq[1], 10) || 2160; }
    const g = grupos.get(stem) || { stem, videos: [], capa: '', enviado: '' };
    if (/\.(mp4|m4v|mov|webm)$/i.test(a.nome)) {
      g.videos.push({ q, nome: a.nome });
      if (String(a.enviado) > g.enviado) g.enviado = String(a.enviado);
    } else if (/\.(jpe?g|png|webp)$/i.test(a.nome)) {
      g.capa = urlR2(a.nome);
    }
    grupos.set(stem, g);
  }

  const jaNoSite = new Set([...VIDEOS, ...STORIES].map(v => (typeof v.video === 'string' ? v.video : '')).filter(Boolean));
  const filmes = [];
  const stories = [];
  let mudouFundo = false;
  [...grupos.values()]
    .filter(g => g.videos.length && !jaNoSite.has(g.stem))
    .sort((a, b) => (a.enviado < b.enviado ? 1 : a.enviado > b.enviado ? -1 : 0))
    .forEach(g => {
      /* melhor qualidade até 1080p primeiro (4K pesa demais para o site); a mais leve por último */
      const peso = v => (v.q === 0 ? 1500 : v.q);
      let vs = g.videos.slice().sort((a, b) => peso(b) - peso(a));
      const semPesado = vs.filter(v => !(v.q > 1080));
      if (semPesado.length) vs = semPesado;
      const escolhidos = vs.length > 1 ? [vs[0], vs[vs.length - 1]] : [vs[0]];
      const video = { fontes: escolhidos.map(v => ({ rotulo: rotuloQualidade(v.q), src: urlR2(v.nome) })), capa: g.capa };

      const nome = g.stem.split('/').pop();
      const extra = info[g.stem] || info[nome] || {};
      if (/(^|[-_ ])(fundo|topo|background|hero)([-_ ]|$)/i.test(nome)) {
        if (/celular|vertical|story|em[-_ ]?p[eé]/i.test(nome)) { if (!SITE.videoFundoCelular) { SITE.videoFundoCelular = video; mudouFundo = true; } }
        else if (!SITE.videoFundo) { SITE.videoFundo = video; mudouFundo = true; }
        return;
      }
      const tipo = TIPOS[extra.tipo] ? extra.tipo : (TIPO_PELO_NOME.find(([, re]) => re.test(nome)) || ['filme'])[0];
      const evento = extra.evento || (EVENTO_PELO_NOME.find(([, re]) => re.test(nome)) || [''])[0];
      const item = {
        titulo: extra.titulo || tituloDoNome(g.stem) || TIPOS[tipo],
        tipo, evento, video,
        capa: extra.capa || '',
        duracao: extra.duracao || ''
      };
      if (extra.lista === 'stories' || /story|stories|vertical|reels?/i.test(nome)) stories.push(item);
      else filmes.push(item);
    });

  if (filmes.length) {
    VIDEOS.splice(0, VIDEOS.length, ...VIDEOS.filter(v => v.video), ...filmes);
    renderVideos();
    arrumarFiltros();
    observarReveal($('#videoGrid'));
  }
  if (stories.length) {
    STORIES.splice(0, STORIES.length, ...STORIES.filter(v => v.video), ...stories);
    renderStories();
    observarReveal($('#storyGrid'));
    if (!SITE.videoCelular) {
      const p = parseVideo(stories[0].video);
      SITE.videoCelular = p.leve || p.src;
      setupMedia();
    }
  }
  if (mudouFundo) { modoVideo = null; montarVideoFundo(); }
}

/* com vídeos de verdade, os filtros sem nenhum vídeo somem */
function arrumarFiltros() {
  const grupo = $('.filters[data-target="videoGrid"]');
  if (!grupo) return;
  const tipos = new Set(VIDEOS.filter(v => v.video).map(v => v.tipo));
  $$('.filter', grupo).forEach(b => { if (b.dataset.filter !== 'todos') b.hidden = !tipos.has(b.dataset.filter); });
  grupo.hidden = tipos.size < 2;
  const ativo = $('.filter.is-active', grupo);
  applyFilter(grupo, ativo ? ativo.dataset.filter : 'todos');
}

/* ---------- Filtros por categoria ---------- */
function applyFilter(group, value) {
  const pedido = $(`.filter[data-filter="${value}"]`, group);
  if (!pedido || pedido.hidden) value = 'todos';
  $$('.filter', group).forEach(b => {
    const on = b.dataset.filter === value;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-selected', on);
  });
  const grid = document.getElementById(group.dataset.target);
  $$('[data-cat]', grid).forEach(item => {
    item.hidden = value !== 'todos' && item.dataset.cat !== value;
  });
}

function setupFilters() {
  $$('.filters').forEach(group => {
    group.addEventListener('click', e => {
      const btn = e.target.closest('.filter');
      if (btn) applyFilter(group, btn.dataset.filter);
    });
  });
  // links "Ver filmes →" dos serviços já filtram o tipo
  $$('[data-filter-link]').forEach(link => {
    link.addEventListener('click', () => {
      applyFilter($('.filters[data-target="videoGrid"]'), link.dataset.filterLink);
    });
  });
}

/* ---------- Modal ---------- */
let lastFocus = null;
function openModal(html) {
  const modal = $('#modal');
  if (modal.hidden) lastFocus = document.activeElement;
  $('#modalContent').innerHTML = html;
  modal.hidden = false;
  document.body.classList.add('no-scroll');
  $('.modal__close', modal).focus();
}
function closeModal() {
  const modal = $('#modal');
  if (modal.hidden) return;
  modal.hidden = true;
  $('#modalContent').innerHTML = ''; // para o vídeo
  document.body.classList.remove('no-scroll');
  if (lastFocus) lastFocus.focus();
}
function setupModal() {
  $$('#modal [data-close]').forEach(el => el.addEventListener('click', closeModal));
  document.addEventListener('keydown', e => {
    if ($('#modal').hidden) return;
    if (e.key === 'Escape') closeModal();
    if ($('.modal__photo', $('#modal'))) {
      if (e.key === 'ArrowRight') stepPhoto(1);
      if (e.key === 'ArrowLeft') stepPhoto(-1);
    }
  });
}

/* ---------- Menu ---------- */
function setupMenu() {
  const header = $('#header');
  const toggle = $('#menuToggle');
  const setOpen = open => {
    header.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open);
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  };
  toggle.addEventListener('click', () => setOpen(!header.classList.contains('is-open')));
  $$('#nav a').forEach(a => a.addEventListener('click', () => setOpen(false)));

  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ---------- Animação ao rolar ----------
   Os elementos aparecem ao entrar na tela e "resetam" ao sair,
   então a animação se repete sempre que você rola para cima ou para baixo. */
let revelador = null;
function observarReveal(raiz = document) {
  const items = $$('.reveal', raiz);
  if (!revelador) { items.forEach(el => el.classList.add('is-visible')); return; }
  items.forEach(el => revelador.observe(el));
}
function setupReveal() {
  if ('IntersectionObserver' in window) {
    revelador = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.intersectionRatio >= 0.12) entry.target.classList.add('is-visible');
        else if (!entry.isIntersecting) entry.target.classList.remove('is-visible');
      });
    }, { threshold: [0, 0.12] });
  }
  observarReveal();
}

/* ---------- Início ---------- */
document.addEventListener('DOMContentLoaded', () => {
  $('#year').textContent = new Date().getFullYear();
  setupWhatsApp();
  setupMedia();
  renderVideos();
  renderStories();
  renderFotos();
  renderFeedbacks();
  setupFilters();
  setupModal();
  setupMenu();
  setupReveal();
  carregarVideosDaNuvem();
});
