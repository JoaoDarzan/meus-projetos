/* =====================================================================
   DARZAN PRODUÇÕES — robô do site na Cloudflare
   - /api/videos: lista os vídeos guardados no R2 (bucket darzan-videos).
     O site lê essa lista e mostra os vídeos sozinho: subiu no bucket,
     aparece no site em até 1 minuto. Ninguém precisa escrever nada.
   - Todo o resto: as páginas do site (pasta darzan-producoes/).
   ===================================================================== */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/videos') return listarVideos(env);
    return env.ASSETS.fetch(request);
  }
};

const CABECALHOS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=60',
  'X-Content-Type-Options': 'nosniff',
  'Access-Control-Allow-Origin': '*'
};

async function listarVideos(env) {
  try {
    const arquivos = [];
    let cursor;
    do {
      const r = await env.VIDEOS.list({ cursor, limit: 1000 });
      for (const o of r.objects) arquivos.push({ nome: o.key, tamanho: o.size, enviado: o.uploaded });
      cursor = r.truncated ? r.cursor : undefined;
    } while (cursor);

    /* opcional: lista.json no bucket com títulos e tipos escolhidos à mão
       { "casamento-ana-pedro": { "titulo": "Ana & Pedro", "tipo": "filme", "evento": "Casamento" } } */
    let info = {};
    const lista = await env.VIDEOS.get('lista.json');
    if (lista) {
      try { info = JSON.parse(await lista.text()); } catch (e) { info = {}; }
    }
    return new Response(JSON.stringify({ arquivos, info }), { headers: CABECALHOS });
  } catch (e) {
    return new Response(JSON.stringify({ arquivos: [], info: {}, erro: 'Não consegui ler o bucket' }), { status: 500, headers: CABECALHOS });
  }
}
