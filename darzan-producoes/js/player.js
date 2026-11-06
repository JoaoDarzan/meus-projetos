/* =====================================================================
   PLAYER PRÓPRIO — DARZAN PRODUÇÕES
   Toca os filmes guardados na Cloudflare R2 (ou qualquer arquivo .mp4),
   sem marca do YouTube: controles dourados, qualidade 1080p/720p,
   tela cheia e, no fim do filme, o convite para o WhatsApp.
   ===================================================================== */
const Player = (() => {
  const ICONES = {
    play: '<path fill="currentColor" d="M8 5.5v13a1 1 0 0 0 1.5.9l10-6.5a1 1 0 0 0 0-1.8l-10-6.5A1 1 0 0 0 8 5.5Z"/>',
    pausa: '<path fill="currentColor" d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/>',
    som: '<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></g>',
    mudo: '<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" fill="currentColor"/><path d="m16 9.5 5 5m0-5-5 5"/></g>',
    cheia: '<path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    sair: '<path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
    voltar: '<path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4 4v4h4"/>'
  };
  const icone = nome => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONES[nome]}</svg>`;
  const escapar = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const tempo = s => {
    if (!isFinite(s) || s < 0) s = 0;
    s = Math.floor(s);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = String(s % 60).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}`;
  };

  /* internet fraca ou "economia de dados" ligada: começa no 720p */
  const internetFraca = () => {
    const c = navigator.connection;
    return !!c && (c.saveData || /(^|-)2g|3g/.test(c.effectiveType || ''));
  };

  /* fontes: [{ rotulo: '1080p', src }, { rotulo: '720p', src }] (a primeira é a melhor) */
  function criar(alvo, { fontes, capa = '', titulo = '', whatsapp = '' }) {
    let q = fontes.length > 1 && internetFraca() ? 1 : 0;
    const temQualidade = fontes.length > 1;

    alvo.innerHTML = `
      <div class="player is-paused is-loading" tabindex="-1">
        <video playsinline preload="auto"${capa ? ` poster="${escapar(capa)}"` : ''}></video>
        <div class="player__topo"><span>${escapar(titulo)}</span></div>
        <button type="button" class="player__grande" data-acao="play" aria-label="Assistir">${icone('play')}</button>
        <div class="player__carregando" aria-hidden="true"></div>
        <div class="player__fim" hidden>
          <p>Gostou? Vamos contar a <em>sua</em> história.</p>
          <div class="player__fim-botoes">
            <button type="button" class="btn btn--ghost" data-acao="denovo">${icone('voltar')} Assistir de novo</button>
            ${whatsapp ? `<a class="btn btn--gold" href="${escapar(whatsapp)}" target="_blank" rel="noopener">Quero um filme assim</a>` : ''}
          </div>
        </div>
        <div class="player__barra">
          <input class="player__linha" type="range" min="0" max="1000" step="1" value="0" aria-label="Posição do vídeo">
          <div class="player__botoes">
            <button type="button" data-acao="play" class="player__btn-play" aria-label="Assistir">${icone('play')}</button>
            <button type="button" data-acao="mudo" aria-label="Tirar o som">${icone('som')}</button>
            <span class="player__tempo"><span data-agora>0:00</span> / <span data-total>0:00</span></span>
            <span class="player__espaco"></span>
            ${temQualidade ? `<button type="button" data-acao="qualidade" class="player__q" aria-label="Trocar a qualidade"></button>` : ''}
            <button type="button" data-acao="cheia" aria-label="Tela cheia">${icone('cheia')}</button>
          </div>
        </div>
      </div>`;

    const raiz = alvo.querySelector('.player');
    const video = raiz.querySelector('video');
    const linha = raiz.querySelector('.player__linha');
    const agora = raiz.querySelector('[data-agora]');
    const total = raiz.querySelector('[data-total]');
    const fim = raiz.querySelector('.player__fim');
    const btnQ = raiz.querySelector('.player__q');
    let arrastando = false;
    let relogio = null;

    const trocarFonte = (indice, continuar) => {
      const t = video.currentTime;
      const tocando = continuar ?? !video.paused;
      q = indice;
      if (btnQ) {
        btnQ.textContent = fontes[q].rotulo.replace('1080p', 'HD').replace('720p', 'SD');
        btnQ.title = `Qualidade: ${fontes[q].rotulo}`;
      }
      raiz.classList.add('is-loading');
      video.src = fontes[q].src;
      if (t > 0) video.addEventListener('loadedmetadata', () => { video.currentTime = t; }, { once: true });
      if (tocando) video.play().catch(() => raiz.classList.add('is-paused'));
    };

    const tocarPausar = () => {
      if (!fim.hidden) return recomecar();
      if (video.paused) video.play().catch(() => { });
      else video.pause();
    };
    const recomecar = () => {
      fim.hidden = true;
      raiz.classList.remove('is-fim');
      video.currentTime = 0;
      video.play().catch(() => { });
    };
    const telaCheia = () => {
      const doc = document;
      if (doc.fullscreenElement || doc.webkitFullscreenElement) {
        (doc.exitFullscreen || doc.webkitExitFullscreen).call(doc);
      } else if (raiz.requestFullscreen) {
        raiz.requestFullscreen().catch(() => { });
      } else if (raiz.webkitRequestFullscreen) {
        raiz.webkitRequestFullscreen();
      } else if (video.webkitEnterFullscreen) {
        video.webkitEnterFullscreen(); /* iPhone: tela cheia do próprio aparelho */
      }
    };

    /* controles somem sozinhos enquanto o filme toca */
    const mostrarControles = () => {
      raiz.classList.remove('is-quieto');
      clearTimeout(relogio);
      if (!video.paused) relogio = setTimeout(() => raiz.classList.add('is-quieto'), 2600);
    };

    const pintarLinha = () => {
      const d = video.duration || 0;
      const pos = d ? (video.currentTime / d) * 100 : 0;
      let buf = 0;
      for (let i = 0; i < video.buffered.length; i++) {
        if (video.buffered.start(i) <= video.currentTime) buf = Math.max(buf, video.buffered.end(i));
      }
      linha.style.setProperty('--pos', `${pos}%`);
      linha.style.setProperty('--buf', `${d ? (buf / d) * 100 : 0}%`);
      if (!arrastando) linha.value = Math.round(pos * 10);
      agora.textContent = tempo(video.currentTime);
    };

    /* eventos do vídeo */
    video.addEventListener('play', () => { raiz.classList.remove('is-paused'); mostrarControles(); atualizarBotoes(); });
    video.addEventListener('pause', () => { raiz.classList.add('is-paused'); mostrarControles(); atualizarBotoes(); });
    video.addEventListener('waiting', () => raiz.classList.add('is-loading'));
    ['playing', 'canplay', 'loadeddata'].forEach(ev => video.addEventListener(ev, () => raiz.classList.remove('is-loading')));
    video.addEventListener('loadedmetadata', () => { total.textContent = tempo(video.duration); pintarLinha(); });
    video.addEventListener('timeupdate', pintarLinha);
    video.addEventListener('progress', pintarLinha);
    video.addEventListener('volumechange', atualizarBotoes);
    video.addEventListener('ended', () => {
      fim.hidden = false;
      raiz.classList.add('is-fim');
      raiz.classList.remove('is-quieto');
    });
    video.addEventListener('error', () => {
      /* se o 1080p falhar, tenta o 720p antes de desistir */
      if (q === 0 && fontes.length > 1) trocarFonte(1, true);
      else { raiz.classList.add('is-erro'); raiz.classList.remove('is-loading'); }
    });

    function atualizarBotoes() {
      const pausado = video.paused;
      raiz.querySelectorAll('[data-acao="play"]').forEach(b => {
        b.setAttribute('aria-label', pausado ? 'Assistir' : 'Pausar');
        if (b.classList.contains('player__btn-play')) b.innerHTML = icone(pausado ? 'play' : 'pausa');
      });
      const mudo = video.muted || video.volume === 0;
      const bSom = raiz.querySelector('[data-acao="mudo"]');
      bSom.innerHTML = icone(mudo ? 'mudo' : 'som');
      bSom.setAttribute('aria-label', mudo ? 'Ligar o som' : 'Tirar o som');
      const cheio = !!(document.fullscreenElement || document.webkitFullscreenElement);
      const bCheia = raiz.querySelector('[data-acao="cheia"]');
      bCheia.innerHTML = icone(cheio ? 'sair' : 'cheia');
      bCheia.setAttribute('aria-label', cheio ? 'Sair da tela cheia' : 'Tela cheia');
    }

    /* barra de tempo: arrastar mostra o ponto na hora */
    linha.addEventListener('input', () => {
      arrastando = true;
      if (video.duration) video.currentTime = (linha.value / 1000) * video.duration;
      linha.style.setProperty('--pos', `${linha.value / 10}%`);
      mostrarControles();
    });
    linha.addEventListener('change', () => { arrastando = false; });

    /* botões */
    raiz.addEventListener('click', e => {
      const b = e.target.closest('[data-acao]');
      if (!b) return;
      e.stopPropagation();
      const acao = b.dataset.acao;
      if (acao === 'play') tocarPausar();
      else if (acao === 'denovo') recomecar();
      else if (acao === 'mudo') video.muted = !video.muted;
      else if (acao === 'cheia') telaCheia();
      else if (acao === 'qualidade') trocarFonte((q + 1) % fontes.length);
      mostrarControles();
    });

    /* clique na imagem: no computador pausa/toca; no celular, o toque mostra/esconde os controles */
    video.addEventListener('pointerup', e => {
      if (e.pointerType === 'mouse') { tocarPausar(); return; }
      if (raiz.classList.contains('is-quieto') || video.paused) mostrarControles();
      else { clearTimeout(relogio); raiz.classList.add('is-quieto'); }
    });
    video.addEventListener('dblclick', telaCheia);
    raiz.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') mostrarControles(); });
    raiz.addEventListener('mouseleave', () => { if (!video.paused) raiz.classList.add('is-quieto'); });
    const aoMudarTela = () => {
      if (!raiz.isConnected) {
        document.removeEventListener('fullscreenchange', aoMudarTela);
        document.removeEventListener('webkitfullscreenchange', aoMudarTela);
        return;
      }
      atualizarBotoes();
    };
    document.addEventListener('fullscreenchange', aoMudarTela);
    document.addEventListener('webkitfullscreenchange', aoMudarTela);

    /* teclado: espaço pausa, setas andam 5s, M tira o som, F tela cheia */
    const teclas = e => {
      if (!raiz.isConnected) { document.removeEventListener('keydown', teclas); return; }
      if (e.target.closest && e.target.closest('input, textarea, select')) {
        if (e.target !== linha) return;
      }
      const k = e.key.toLowerCase();
      if (k === ' ' || k === 'k') { e.preventDefault(); tocarPausar(); }
      else if (k === 'arrowright') { e.preventDefault(); video.currentTime = Math.min(video.duration || 0, video.currentTime + 5); }
      else if (k === 'arrowleft') { e.preventDefault(); video.currentTime = Math.max(0, video.currentTime - 5); }
      else if (k === 'm') video.muted = !video.muted;
      else if (k === 'f') telaCheia();
      else return;
      mostrarControles();
    };
    document.addEventListener('keydown', teclas);

    trocarFonte(q, true);
    atualizarBotoes();
    return { raiz, video };
  }

  return { criar };
})();
