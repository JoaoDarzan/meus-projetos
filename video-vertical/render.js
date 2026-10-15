/* =====================================================================
   Renderiza o index.html quadro a quadro (Playwright + Chromium + ffmpeg).

   node render.js probe 1.2 4.5 9      -> quadros soltos em out/probe/ + folha de contato
   node render.js parte K N            -> renderiza a parte K de N (0..N-1) em out/quadros/
   node render.js video                -> junta os quadros + audio/mix.wav em out/
   node render.js tempos               -> salva tempos.json (usado por audio/mixar.py)
   Variáveis: ESCALA=2 (4K, padrão) ou 1 (1080x1920, rápido) · FPS=30
   ===================================================================== */
const http = require('http'), fs = require('fs'), path = require('path');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');

const RAIZ = path.resolve(__dirname, '..');            // serve o repositório (usa ../marca)
const OUT = path.join(__dirname, 'out');
const ESCALA = Number(process.env.ESCALA || 2), FPS = Number(process.env.FPS || 30);
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ttf': 'font/ttf', '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };

function servidor() {
  return new Promise(res => {
    const s = http.createServer((req, rsp) => {
      const f = path.join(RAIZ, decodeURIComponent(req.url.split('?')[0]));
      if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(rsp);
    });
    s.listen(0, () => res(s));
  });
}

async function abre(porta) {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--font-render-hinting=none', '--force-color-profile=srgb'] });
  const pg = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: ESCALA });
  const erros = [];
  pg.on('pageerror', e => erros.push(String(e)));
  pg.on('console', m => { if (m.type() === 'error') erros.push(m.text()); });
  await pg.goto(`http://localhost:${porta}/video-vertical/index.html?render`);
  await pg.waitForFunction('window.__ready === true', null, { timeout: 120000 });
  return { b, pg, erros };
}

async function quadro(pg, t, arq, tipo = 'jpeg') {
  await pg.evaluate(t => window.seek(t), t);
  await pg.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await pg.locator('#stage').screenshot({ path: arq, type: tipo, ...(tipo === 'jpeg' ? { quality: 94 } : {}) });
}

(async () => {
  const [cmd, ...args] = process.argv.slice(2);
  fs.mkdirSync(OUT, { recursive: true });
  if (cmd === 'video') return video();
  const srv = await servidor();
  const { b, pg, erros } = await abre(srv.address().port);
  const DUR = await pg.evaluate('window.DURATION');
  if (cmd === 'tempos') {   // exporta os tempos das cenas para a mixagem de áudio
    fs.writeFileSync(path.join(__dirname, 'tempos.json'), JSON.stringify(await pg.evaluate('window.T'), null, 1));
    console.log('tempos.json salvo');
  } else if (cmd === 'probe') {
    const dir = path.join(OUT, 'probe'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    const ts = args.map(Number);
    for (let i = 0; i < ts.length; i++) await quadro(pg, ts[i], path.join(dir, `p_${String(i).padStart(2, '0')}.png`), 'png');
    const cols = Math.min(ts.length, 5), rows = Math.ceil(ts.length / cols);
    spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(dir, 'p_%02d.png'), '-vf', `scale=360:-1,tile=${cols}x${rows}:padding=8:color=white`, '-frames:v', '1', path.join(dir, 'folha.png')], { stdio: 'inherit' });
    console.log('folha:', path.join(dir, 'folha.png'));
  } else if (cmd === 'parte') {
    const [k, n] = args.map(Number);
    const total = Math.round(DUR * FPS), ini = Math.floor(total * k / n), fim = Math.floor(total * (k + 1) / n);
    const dir = path.join(OUT, 'quadros'); fs.mkdirSync(dir, { recursive: true });
    const t0 = Date.now();
    for (let i = ini; i < fim; i++) {
      const arq = path.join(dir, `f_${String(i).padStart(5, '0')}.jpg`);
      if (fs.existsSync(arq) && !process.env.REFAZER) continue;
      await quadro(pg, i / FPS, arq);
      if ((i - ini) % 30 === 0) console.log(`parte ${k}: ${i - ini}/${fim - ini} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    }
    console.log(`parte ${k} pronta`);
  }
  if (erros.length) console.log('ERROS NA PÁGINA:', erros.slice(0, 10));
  await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });

function video() {
  const q = path.join(OUT, 'quadros', 'f_%05d.jpg');
  const mix = path.join(__dirname, 'audio', 'mix.wav');
  const sai = path.join(OUT, `darzan-vertical-${ESCALA === 2 ? '4k' : '1080p'}.mp4`);
  const a = ['-v', 'error', '-y', '-framerate', String(FPS), '-i', q];
  if (fs.existsSync(mix)) a.push('-i', mix);
  a.push('-vf', 'scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p', '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-maxrate', '16M', '-bufsize', '32M', '-profile:v', 'high', '-level', '5.2');
  if (fs.existsSync(mix)) a.push('-c:a', 'aac', '-b:a', '256k');
  a.push('-movflags', '+faststart', sai);
  const r = spawnSync('ffmpeg', a, { stdio: 'inherit' });
  if (r.status === 0) console.log('vídeo:', sai);
}
