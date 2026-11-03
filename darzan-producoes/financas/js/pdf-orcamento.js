/* Orçamento em PDF, feito no próprio aparelho (nada sai do celular até você mandar).
   Um gerador de PDF pequeno, só com o que o orçamento precisa: texto em Helvetica (com acentos), retângulos,
   linhas e a logo em JPEG. As larguras das letras são as da Helvetica padrão (para alinhar e quebrar linhas). */
(function (A) {
  'use strict';
  const LARG = { n: [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,761,556,0,222,556,333,1000,556,556,333,1000,667,333,1000,0,611,0,0,222,222,333,333,350,556,1000,333,1000,500,333,944,0,500,667,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500], b: [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,761,556,0,278,556,500,1000,556,556,333,1000,667,333,1000,0,611,0,0,278,278,500,500,350,556,1000,333,1000,556,333,944,0,500,667,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556] };
  /* texto → bytes do Windows-1252 (o "WinAnsi" do PDF): é o que tem os acentos do português */
  const MAPA = (() => { const m = new Map(), d = new TextDecoder('windows-1252'); for (let b = 32; b < 256; b++) { const ch = d.decode(new Uint8Array([b])); if (ch !== '�' && !m.has(ch)) m.set(ch, b); } return m; })();
  const bytesDe = s => Array.from(String(s).normalize('NFC').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/\s+/g, ' ')).map(ch => MAPA.has(ch) ? MAPA.get(ch) : 63);
  const largura = (s, neg, tam) => bytesDe(s).reduce((t, b) => t + (LARG[neg ? 'b' : 'n'][b - 32] || 556), 0) * tam / 1000;
  const txtPdf = s => bytesDe(s).map(b => b === 40 || b === 41 || b === 92 ? '\\' + String.fromCharCode(b) : String.fromCharCode(b)).join('');
  /* quebra o texto em linhas que cabem na largura (palavra grande demais é cortada) */
  function quebrar(s, larg, neg, tam) {
    const out = [];
    String(s || '').split(/\n/).forEach(par => {
      let lin = '';
      par.split(/\s+/).filter(Boolean).forEach(p => {
        const t = lin ? lin + ' ' + p : p;
        if (largura(t, neg, tam) <= larg) { lin = t; return; }
        if (lin) out.push(lin);
        while (largura(p, neg, tam) > larg) { let k = p.length; while (k > 1 && largura(p.slice(0, k), neg, tam) > larg) k--; out.push(p.slice(0, k)); p = p.slice(k); }
        lin = p;
      });
      out.push(lin);
    });
    return out;
  }
  const cor = h => { const v = String(h).replace('#', ''); return [0, 2, 4].map(i => (parseInt(v.slice(i, i + 2), 16) / 255).toFixed(3)).join(' '); };
  /* tamanho do JPEG (marcador SOF) */
  function tamJpeg(b) {
    for (let i = 2; i < b.length - 9;) {
      if (b[i] !== 0xFF) { i++; continue; }
      const m = b[i + 1], n = (b[i + 2] << 8) + b[i + 3];
      if (m >= 0xC0 && m <= 0xCF && ![0xC4, 0xC8, 0xCC].includes(m)) return { h: (b[i + 5] << 8) + b[i + 6], w: (b[i + 7] << 8) + b[i + 8] };
      i += 2 + n;
    }
    return null;
  }

  /* monta o arquivo PDF: páginas (texto do conteúdo) + a imagem da logo */
  function montar(paginas, jpeg) {
    const objs = [], add = o => (objs.push(o), objs.length);
    const cat = add(null), pags = add(null), f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'), f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const tj = jpeg && tamJpeg(jpeg), img = tj ? add({ dict: `<< /Type /XObject /Subtype /Image /Width ${tj.w} /Height ${tj.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>`, bin: jpeg }) : 0;
    const kids = paginas.map(cont => { const c = add({ dict: `<< /Length ${cont.length} >>`, txt: cont }); return add(`<< /Type /Page /Parent ${pags} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >>${img ? ` /XObject << /Im1 ${img} 0 R >>` : ''} >> /Contents ${c} 0 R >>`); });
    objs[cat - 1] = `<< /Type /Catalog /Pages ${pags} 0 R >>`;
    objs[pags - 1] = `<< /Type /Pages /Kids [${kids.map(k => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`;
    const partes = [], off = []; let tam = 0;
    const put = x => { const b = typeof x === 'string' ? Uint8Array.from(x, ch => ch.charCodeAt(0) & 255) : x; partes.push(b); tam += b.length; };
    put('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    objs.forEach((o, i) => {
      off.push(tam); put(`${i + 1} 0 obj\n`);
      if (typeof o === 'string') put(o + '\n');
      else { put(o.dict + '\nstream\n'); put(o.bin || o.txt); put('\nendstream\n'); }
      put('endobj\n');
    });
    const xref = tam;
    put(`xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + off.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join(''));
    put(`trailer\n<< /Size ${objs.length + 1} /Root ${cat} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    const out = new Uint8Array(tam); let p = 0; partes.forEach(b => { out.set(b, p); p += b.length; });
    return out;
  }

  const OURO = '#D6A85F', BRONZE = '#8A6634', ESCURO = '#0D0B0A', CREME = '#F4EDE4', TINTA = '#1A1714', CINZA = '#5A534D', LINHA = '#E4DCCF';
  const brl = v => 'R$ ' + (+v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dataBR = d => /^\d{4}-\d{2}-\d{2}/.test(String(d || '')) ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '';
  const addDias = (d, n) => { const t = new Date(d + 'T12:00:00'); t.setDate(t.getDate() + n); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };

  /* d = { cliente, tipo, data, local, itens: [{d, v}], cond, validade, obs, emitido } ; logo = bytes do JPEG */
  function orcamento(d, logo) {
    const pags = []; let s = '', y = 0;
    const T = (x, yy, txt, tam, neg, c) => { s += `BT /${neg ? 'F2' : 'F1'} ${tam} Tf ${cor(c || TINTA)} rg ${x.toFixed(1)} ${yy.toFixed(1)} Td (${txtPdf(txt)}) Tj ET\n`; };
    const D = (x, yy, txt, tam, neg, c) => T(x - largura(txt, neg, tam), yy, txt, tam, neg, c); /* alinhado à direita */
    const R = (x, yy, w, h, c) => { s += `${cor(c)} rg ${x} ${yy} ${w} ${h} re f\n`; };
    const L = (x1, yy, x2, c, e = .8) => { s += `${cor(c)} RG ${e} w ${x1} ${yy} m ${x2} ${yy} l S\n`; };
    const emitido = d.emitido || new Date().toISOString().slice(0, 10), validade = +d.validade || 15;
    const rodape = () => { L(48, 74, 547, LINHA); const r = 'Darzan Produções · Videomaker e Storymaker · Campinas e região · WhatsApp (19) 99527-3041 · @darzanproducoes'; T((595 - largura(r, false, 8.5)) / 2, 58, r, 8.5, false, CINZA); };
    const novaPagina = primeira => {
      if (s) { rodape(); pags.push(s); }
      s = '';
      if (primeira) {
        R(0, 842 - 168, 595, 168, ESCURO);
        if (logo) s += `q 116 0 0 116 44 ${842 - 144} cm /Im1 Do Q\n`;
        T(184, 842 - 74, 'ORÇAMENTO', 28, true, OURO);
        T(184, 842 - 98, 'Darzan Produções · Seu dia contado como cinema', 11, false, CREME);
        T(184, 842 - 120, `Emitido em ${dataBR(emitido)} · válido até ${dataBR(addDias(emitido, validade))}`, 9.5, false, '#BFB5A8');
        y = 842 - 210;
      } else { R(0, 842 - 46, 595, 46, ESCURO); T(48, 842 - 29, `Orçamento · ${d.cliente || ''} (continuação)`, 11, true, OURO); y = 842 - 84; }
    };
    const cabe = h => { if (y - h < 104) novaPagina(false); };
    novaPagina(true);
    T(48, y, 'PARA', 8.5, true, BRONZE); y -= 20;
    quebrar(d.cliente || 'Cliente', 499, true, 17).forEach(l => { T(48, y, l, 17, true); y -= 21; });
    const ev = [d.tipo, dataBR(d.data), d.local].filter(Boolean).join(' · ');
    if (ev) quebrar(ev, 499, false, 11).forEach(l => { T(48, y, l, 11, false, CINZA); y -= 15; });
    y -= 18;
    T(48, y, 'O QUE ESTÁ INCLUSO', 8.5, true, BRONZE); D(547, y, 'VALOR', 8.5, true, BRONZE); y -= 9; L(48, y, 547, BRONZE, 1); y -= 18;
    const itens = (d.itens || []).filter(i => String(i.d || '').trim() || +i.v);
    itens.forEach(i => {
      const ls = quebrar(i.d || '', 380, false, 11);
      cabe(ls.length * 15 + 14);
      ls.forEach((l, k) => { T(48, y, l, 11); if (!k) { if (+i.v) D(547, y, brl(i.v), 11, true); else D(547, y, 'incluso', 10, false, CINZA); } y -= 15; });
      y -= 5; L(48, y, 547, LINHA); y -= 16;
    });
    const total = itens.reduce((t, i) => t + (+i.v || 0), 0);
    cabe(48);
    R(48, y - 14, 499, 34, CREME); T(62, y, 'TOTAL', 11, true, BRONZE); D(533, y - 2, brl(total), 16, true); y -= 52;
    [['CONDIÇÕES DE PAGAMENTO', d.cond], ['OBSERVAÇÕES', d.obs]].forEach(([tit, txt]) => {
      if (!String(txt || '').trim()) return;
      const ls = quebrar(txt, 499, false, 10.5); cabe(24 + Math.min(ls.length, 3) * 15);
      T(48, y, tit, 8.5, true, BRONZE); y -= 17;
      ls.forEach(l => { cabe(15); T(48, y, l, 10.5, false, '#3A3530'); y -= 15; }); y -= 14;
    });
    cabe(40);
    T(48, y, 'Para confirmar, é só responder ACEITO no WhatsApp.', 11.5, true, TINTA); y -= 16;
    T(48, y, 'A data fica reservada com o pagamento da entrada.', 10, false, CINZA);
    rodape(); pags.push(s);
    return montar(pags, logo);
  }
  A.orcamentoPdf = orcamento;
  A.pdfLargura = largura;
})(typeof window !== 'undefined' ? (window.A = window.A || {}) : globalThis);
