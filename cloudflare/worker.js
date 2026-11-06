/* =====================================================================
   DARZAN PRODUÇÕES — robô do site na Cloudflare
   - /api/videos: lista os vídeos guardados no R2 (bucket darzan-videos).
     O site lê essa lista e mostra os vídeos sozinho: subiu no bucket,
     aparece no site em até 1 minuto. Ninguém precisa escrever nada.
   - /videos/*: vídeos que ficam junto do site (ex: o do topo). São entregues
     EM PEDAÇOS (o que o iPhone exige para tocar liso). Na primeira vez o robô
     copia o arquivo para o R2 (pasta site/) e depois entrega de lá; se o arquivo
     do site mudar, ele copia de novo sozinho.
   - Todo o resto: as páginas do site (pasta darzan-producoes/).
   ===================================================================== */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/videos') return listarVideos(env);
    if (url.pathname.startsWith('/videos/') && /\.(mp4|m4v|webm|mov)$/i.test(url.pathname)) {
      try {
        return await servirVideo(request, env, url);
      } catch (e) {
        console.error('servirVideo:', e && e.stack || e);
        return env.ASSETS.fetch(request); /* se algo der errado, entrega do jeito antigo */
      }
    }
    return env.ASSETS.fetch(request);
  }
};

const SEGURANCA = { 'X-Content-Type-Options': 'nosniff' };

/* ---------- lista do bucket ---------- */
async function listarVideos(env) {
  const cab = { ...SEGURANCA, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=60', 'Access-Control-Allow-Origin': '*' };
  try {
    const arquivos = [];
    let cursor;
    do {
      const r = await env.VIDEOS.list({ cursor, limit: 1000 });
      for (const o of r.objects) {
        if (o.key.startsWith('site/')) continue; /* cópias internas do robô */
        arquivos.push({ nome: o.key, tamanho: o.size, enviado: o.uploaded });
      }
      cursor = r.truncated ? r.cursor : undefined;
    } while (cursor);

    /* opcional: lista.json no bucket com títulos e tipos escolhidos à mão
       { "casamento-ana-pedro": { "titulo": "Ana & Pedro", "tipo": "filme", "evento": "Casamento" } } */
    let info = {};
    const lista = await env.VIDEOS.get('lista.json');
    if (lista) {
      try { info = JSON.parse(await lista.text()); } catch (e) { info = {}; }
    }
    return new Response(JSON.stringify({ arquivos, info }), { headers: cab });
  } catch (e) {
    return new Response(JSON.stringify({ arquivos: [], info: {}, erro: 'Não consegui ler o bucket' }), { status: 500, headers: cab });
  }
}

/* ---------- vídeo do site, entregue em pedaços ---------- */
async function servirVideo(request, env, url) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response(null, { status: 405 });
  const caminho = new URL(url.pathname, url.origin);
  const chave = 'site' + decodeURIComponent(url.pathname);

  /* versão do arquivo que está no site */
  const info = await env.ASSETS.fetch(new Request(caminho, { method: 'HEAD' }));
  if (!info.ok) return env.ASSETS.fetch(request);
  const tamanhoSite = Number(info.headers.get('content-length') || 0);
  const versao = `${info.headers.get('etag') || info.headers.get('last-modified') || ''}|${tamanhoSite}`;

  /* cópia no R2: cria ou atualiza quando o arquivo do site muda */
  let obj = await env.VIDEOS.head(chave);
  if (!obj || (obj.customMetadata || {}).versao !== versao) {
    const inteiro = await env.ASSETS.fetch(new Request(caminho));
    if (!inteiro.ok) return env.ASSETS.fetch(request);
    const tam = Number(inteiro.headers.get('content-length') || 0);
    let corpo;
    let copiando = Promise.resolve();
    if (tam) {
      const { readable, writable } = new FixedLengthStream(tam);
      copiando = inteiro.body.pipeTo(writable);
      corpo = readable;
    } else {
      corpo = await inteiro.arrayBuffer();
    }
    await env.VIDEOS.put(chave, corpo, {
      httpMetadata: { contentType: inteiro.headers.get('content-type') || 'video/mp4' },
      customMetadata: { versao }
    });
    await copiando;
    obj = await env.VIDEOS.head(chave);
  }

  const total = obj.size;
  const cab = new Headers({
    ...SEGURANCA,
    'Content-Type': (obj.httpMetadata && obj.httpMetadata.contentType) || 'video/mp4',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=3600',
    'ETag': obj.httpEtag
  });

  /* pedido de um pedaço: "bytes=início-fim", "bytes=início-" ou "bytes=-últimos" */
  const pedido = /^bytes=(\d*)-(\d*)$/.exec((request.headers.get('range') || '').trim());
  if (pedido && (pedido[1] !== '' || pedido[2] !== '')) {
    let inicio, fim;
    if (pedido[1] === '') { inicio = Math.max(0, total - Number(pedido[2])); fim = total - 1; }
    else { inicio = Number(pedido[1]); fim = pedido[2] === '' ? total - 1 : Math.min(Number(pedido[2]), total - 1); }
    if (inicio >= total || inicio > fim) {
      cab.set('Content-Range', `bytes */${total}`);
      return new Response(null, { status: 416, headers: cab });
    }
    cab.set('Content-Range', `bytes ${inicio}-${fim}/${total}`);
    cab.set('Content-Length', String(fim - inicio + 1));
    if (request.method === 'HEAD') return new Response(null, { status: 206, headers: cab });
    const parte = await env.VIDEOS.get(chave, { range: { offset: inicio, length: fim - inicio + 1 } });
    return new Response(parte.body, { status: 206, headers: cab });
  }

  cab.set('Content-Length', String(total));
  if (request.method === 'HEAD') return new Response(null, { status: 200, headers: cab });
  const tudo = await env.VIDEOS.get(chave);
  return new Response(tudo.body, { status: 200, headers: cab });
}
