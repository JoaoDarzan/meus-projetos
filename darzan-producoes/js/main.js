/* =====================================================================
   DARZAN PRODUÇÕES — comportamento do site
   (para trocar vídeos, fotos e feedbacks edite js/conteudo.js)
   ===================================================================== */

const CATEGORIAS = {
  'casamentos': 'Casamento',
  'empresas': 'Empresa',
  'aniversarios': 'Aniversário',
  'cha-revelacao': 'Chá revelação'
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
      embed: `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&rel=0&playsinline=1`,
      thumb: `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg`
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

/* ---------- Topo (vídeo de fundo + celular) ---------- */
function setupHero() {
  const bg = $('#heroBg');
  if (SITE.showreel) {
    bg.src = SITE.showreel;
    bg.play().catch(() => {});
  } else {
    bg.remove();
  }

  const phone = $('#heroPhone');
  if (SITE.videoDestaque) {
    phone.innerHTML = `<video src="${esc(SITE.videoDestaque)}" muted loop playsinline autoplay></video>`;
  } else {
    phone.innerHTML = `
      <div class="placeholder placeholder--phone">
        <svg viewBox="0 0 24 24"><use href="#i-play"/></svg>
        <span>Seu vídeo em destaque aqui</span>
      </div>`;
  }

  const about = $('#aboutPhoto');
  about.innerHTML = SITE.fotoPerfil
    ? `<img src="${esc(SITE.fotoPerfil)}" alt="Darzan Produções" loading="lazy">`
    : `<div class="placeholder"><svg viewBox="0 0 24 24"><use href="#i-camera"/></svg><span>Sua foto aqui</span></div>`;
}

/* ---------- Vídeos ---------- */
function renderVideos() {
  const grid = $('#videoGrid');
  grid.innerHTML = VIDEOS.map((v, i) => {
    const info = parseVideo(v.video);
    const cat = CATEGORIAS[v.categoria] || '';
    let media;

    if (!info) {
      media = `
        <div class="placeholder">
          <svg viewBox="0 0 24 24"><use href="#i-play"/></svg>
          <span>Espaço para vídeo</span>
        </div>`;
    } else if (v.capa || info.thumb) {
      media = `<img src="${esc(v.capa || info.thumb)}" alt="${esc(v.titulo)}" loading="lazy">`;
    } else if (info.tipo === 'arquivo') {
      media = `<video src="${esc(info.src)}#t=0.5" muted loop playsinline preload="metadata"></video>`;
    } else {
      media = `<div class="placeholder placeholder--filled"><svg viewBox="0 0 24 24"><use href="#i-instagram"/></svg></div>`;
    }

    const tag = info ? 'button' : 'div';
    const attrs = info ? `type="button" data-video="${i}" aria-label="Assistir: ${esc(v.titulo)}"` : '';

    return `
      <${tag} class="video-card reveal${info ? '' : ' is-empty'}" data-cat="${esc(v.categoria)}" ${attrs}>
        <div class="video-card__media">${media}</div>
        ${info ? '<span class="video-card__play"><svg viewBox="0 0 24 24"><use href="#i-play"/></svg></span>' : ''}
        <div class="video-card__info">
          <span class="video-card__cat">${esc(cat)}</span>
          <strong>${esc(v.titulo)}</strong>
        </div>
      </${tag}>`;
  }).join('');

  // prévia ao passar o mouse (vídeos próprios)
  $$('.video-card video', grid).forEach(video => {
    const card = video.closest('.video-card');
    card.addEventListener('mouseenter', () => video.play().catch(() => {}));
    card.addEventListener('mouseleave', () => { video.pause(); });
  });

  $$('[data-video]', grid).forEach(card => {
    card.addEventListener('click', () => openVideo(VIDEOS[card.dataset.video]));
  });
}

function openVideo(v) {
  const info = parseVideo(v.video);
  if (!info) return;
  let html;
  if (info.tipo === 'arquivo') {
    html = `<video src="${esc(info.src)}" controls autoplay playsinline></video>`;
  } else {
    html = `<iframe src="${esc(info.embed)}" title="${esc(v.titulo)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
  }
  openModal(`<div class="modal__video modal__video--${info.tipo}">${html}</div>`);
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
  // links "Ver vídeos →" dos serviços já filtram a categoria
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

/* ---------- Animação ao rolar ---------- */
function setupReveal() {
  const items = $$('.reveal');
  if (!('IntersectionObserver' in window)) {
    items.forEach(el => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  items.forEach(el => io.observe(el));
}

/* ---------- Início ---------- */
document.addEventListener('DOMContentLoaded', () => {
  $('#year').textContent = new Date().getFullYear();
  setupWhatsApp();
  setupHero();
  renderVideos();
  renderFotos();
  renderFeedbacks();
  setupFilters();
  setupModal();
  setupMenu();
  setupReveal();
});
