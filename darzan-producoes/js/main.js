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
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) {
    return {
      tipo: 'youtube',
      id: yt[1],
      embed: `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&rel=0&playsinline=1`,
      fundo: `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&mute=1&loop=1&playlist=${yt[1]}&controls=0&showinfo=0&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3&disablekb=1&fs=0`,
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
  return { tipo: 'arquivo', src: url };
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
function setupMedia() {
  const media = $('#heroMedia');
  const info = parseVideo(SITE.videoFundo);
  if (info) {
    $('#heroHint').remove();
    if (info.tipo === 'arquivo') {
      media.innerHTML = `<video src="${esc(info.src)}" muted loop playsinline autoplay preload="auto"></video>`;
      const v = $('video', media);
      v.play().catch(() => {});
    } else if (info.fundo) {
      media.innerHTML = `<iframe src="${esc(info.fundo)}" title="Vídeo de fundo" allow="autoplay; encrypted-media" tabindex="-1"></iframe>`;
      // aparece suavemente depois de carregar, para não mostrar a tela preta do YouTube
      const frame = $('iframe', media);
      frame.addEventListener('load', () => setTimeout(() => frame.classList.add('is-on'), 900));
    }
  } else {
    media.classList.add('is-empty');
  }

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
  let html;
  if (info.tipo === 'arquivo') {
    html = `<video src="${esc(info.src)}" controls autoplay playsinline></video>`;
  } else {
    html = `<iframe src="${esc(info.embed)}" title="${esc(v.titulo)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
  }
  const formato = vertical || info.tipo === 'instagram' ? 'vertical' : 'horizontal';
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

/* ---------- Filtros por categoria ---------- */
function applyFilter(group, value) {
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
function setupReveal() {
  const items = $$('.reveal');
  if (!('IntersectionObserver' in window)) {
    items.forEach(el => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.intersectionRatio >= 0.12) entry.target.classList.add('is-visible');
      else if (!entry.isIntersecting) entry.target.classList.remove('is-visible');
    });
  }, { threshold: [0, 0.12] });
  items.forEach(el => io.observe(el));
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
});
