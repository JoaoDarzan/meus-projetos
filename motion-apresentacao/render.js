/* =====================================================================
   Exporta index.html para MP4 (1920x1080), quadro a quadro.
   Requer: Node, Playwright (com Chromium) e ffmpeg.

   Uso:
     node render.js                       -> apresentacao-darzan.mp4, 30 fps
     node render.js saida.mp4 60          -> outro nome / outro fps
     node render.js saida.png 30 12.5     -> só um quadro (no tempo 12.5 s)
   ===================================================================== */
const path = require('path');
const { spawn, execFileSync } = require('child_process');
const { chromium } = require('playwright');

const out = path.resolve(__dirname, process.argv[2] || 'apresentacao-darzan.mp4');
const fps = Number(process.argv[3] || 30);
const still = process.argv[4] !== undefined ? Number(process.argv[4]) : null;

/* As fontes do Google são baixadas com o curl, que já respeita o proxy
   e os certificados do sistema, e entregues ao Chromium. */
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
const fontCache = new Map();
function fetchFont(url) {
  if (!fontCache.has(url)) fontCache.set(url, execFileSync('curl', ['-sSfL', '-A', UA, url], { maxBuffer: 64 << 20 }));
  return fontCache.get(url);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => {
    const url = route.request().url();
    const css = url.includes('googleapis');
    route.fulfill({
      status: 200,
      contentType: css ? 'text/css' : 'font/woff2',
      headers: { 'access-control-allow-origin': '*' },
      body: fetchFont(url)
    });
  });
  await page.goto('file://' + path.join(__dirname, 'index.html') + '?render');
  await page.waitForFunction('window.__ready === true');
  const fontsOk = await page.evaluate(() => document.fonts.check('600 40px "Cormorant Garamond"') && document.fonts.check('600 20px Manrope'));
  if (!fontsOk) throw new Error('As fontes não carregaram');

  if (still !== null) {
    await page.evaluate(t => window.renderAt(t), still);
    await page.screenshot({ path: out });
    await browser.close();
    console.log('Quadro salvo em', out);
    return;
  }

  const duration = await page.evaluate('window.DURATION');
  const frames = Math.round(duration * fps);
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg saiu com código ' + c)))));

  for (let i = 0; i < frames; i++) {
    await page.evaluate(t => window.renderAt(t), i / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % fps === 0) process.stdout.write(`\r${Math.round((i / frames) * 100)}%`);
  }
  ff.stdin.end();
  await done;
  await browser.close();
  console.log(`\rPronto: ${out} (${frames} quadros, ${fps} fps)`);
})().catch(err => { console.error(err); process.exit(1); });
