/* Etapa 29 · Foto do equipamento: tirar a foto, enquadrar na proporção do cartão (4:3) e nenhum item pegar a foto de outro. Valores inventados. */
const { calmo, certo, conferirLayout } = require('../ajuda');
const ir = (p, view) => p.evaluate(v => { A.ui.view = v; A.render(false); }, view);
const eq = (id, nome, foto = null) => ({ id, user_id: 'u-joao', nome, tipo: 'Acessório', valor: 100, estado: 'Usado', como_pagou: 'Já tinha', data_da_compra: null, numero_de_serie: null, foto, obs: null });
/* foto larga (800×200) feita na hora, para ver o enquadramento */
const fotoLarga = p => p.evaluate(() => { const c = document.createElement('canvas'); c.width = 800; c.height = 200; const g = c.getContext('2d'); g.fillStyle = '#c33'; g.fillRect(0, 0, 400, 200); g.fillStyle = '#33c'; g.fillRect(400, 0, 400, 200); return c.toDataURL('image/png'); });
const tamanho = (p, src) => p.evaluate(s => new Promise(ok => { const i = new Image(); i.onload = () => ok([i.naturalWidth, i.naturalHeight]); i.src = s; }), src);
const fotoSalva = (st, id) => (st.tabelas.equipamentos.find(e => e.id === id) || {}).foto;
module.exports = { etapa: 'Foto do equipamento', testes: [
  ['item sem foto mostra o desenho do tipo; foto do cartão em 4:3', async (st, abrir) => {
    st.tabelas.equipamentos.push(eq('EQB1', 'Bastão de LED teste'), eq('EQB2', 'HD externo 1 TB teste'));
    const p = await abrir({ aparelho: 'iphone-15' });
    await ir(p, 'equip'); await calmo(p);
    for (const id of ['EQB1', 'EQB2']) certo(!(await p.$(`#view .eq[data-id="${id}"] .ph img`)), id + ' sem foto de outro item');
    const r = await p.$eval('#view .eq .ph', e => e.clientWidth / e.clientHeight);
    certo(Math.abs(r - 4 / 3) < 0.03, 'foto do cartão em 4:3: ' + r.toFixed(3));
  }],
  ['tirar a foto de um item: some do cartão e não volta (nem a foto padrão)', async (st, abrir) => {
    st.tabelas.equipamentos.push(eq('EQF1', 'Bateria zve10 teste'));
    const p = await abrir({ aparelho: 'iphone-15' });
    st.tabelas.equipamentos.find(e => e.id === 'EQF1').foto = await fotoLarga(p);
    await p.reload(); await p.waitForFunction(() => window.A && A.render); await ir(p, 'equip'); await calmo(p);
    certo(await p.$('#view .eq[data-id="EQF1"] .ph img'), 'começa com foto');
    await p.click('#view .eq[data-id="EQF1"]'); await p.waitForSelector('#fCrop:not([hidden])');
    await p.click('#fTirar');
    certo(await p.isHidden('#fCrop') && await p.isVisible('#fVazio'), 'o formulário mostra "Sem foto"');
    await p.click('#s2 button.save'); await calmo(p);
    const salva = st.tabelas.equipamentos.find(e => e.id === 'EQF1');
    certo(!salva.foto, 'apagou a foto');
    await p.reload(); await p.waitForFunction(() => window.A && A.render); await ir(p, 'equip'); await calmo(p);
    certo(!(await p.$('#view .eq[data-id="EQF1"] .ph img')), 'abrindo de novo, continua sem foto');
    await p.click('#view .eq[data-id="EQF1"]'); await p.waitForSelector('#fVazio:not([hidden])');
    certo(!(await p.$('#view .eq[data-id="EQF1"] .ph img')), 'o cartão ficou sem foto');
  }],
  ['pôr foto nova: aparece na moldura do cartão, dá para preencher, arrastar e aproximar, e sai salva em 480×360', async (st, abrir) => {
    st.tabelas.equipamentos.push(eq('EQF2', 'Lente teste'));
    const p = await abrir({ aparelho: 'iphone-15' });
    await ir(p, 'equip'); await calmo(p);
    await p.click('#view .eq[data-id="EQF2"]'); await p.waitForSelector('#fVazio:not([hidden])');
    const png = Buffer.from((await fotoLarga(p)).split(',')[1], 'base64');
    await p.setInputFiles('#fFoto', { name: 'lente.png', mimeType: 'image/png', buffer: png });
    await p.waitForSelector('#fCrop:not([hidden])');
    const r = await p.$eval('#fCrop', e => e.clientWidth / e.clientHeight);
    certo(Math.abs(r - 4 / 3) < 0.03, 'moldura na proporção do cartão: ' + r.toFixed(3));
    certo(await p.$eval('[data-fm="cover"]', b => b.classList.contains('on')), 'foto nova começa preenchendo o cartão');
    await p.waitForFunction(() => document.getElementById('fCropImg').style.width);
    const antes = await p.$eval('#fCropImg', i => i.style.transform);
    await p.locator('#fCrop').scrollIntoViewIfNeeded(); await p.waitForTimeout(500); /* espera a janela terminar de subir */
    const b = await p.$eval('#fCrop', e => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
    await p.mouse.move(b[0], b[1]); await p.mouse.down(); await p.mouse.move(b[0] - 80, b[1], { steps: 5 }); await p.mouse.up();
    certo(antes !== await p.$eval('#fCropImg', i => i.style.transform), 'arrastar muda a posição');
    await p.$eval('#fZoom', z => { z.value = 2; z.dispatchEvent(new Event('input')); z.dispatchEvent(new Event('change')); });
    await conferirLayout(p, 'editor de foto do equipamento');
    await p.click('#s2 button.save'); await calmo(p);
    const f = fotoSalva(st, 'EQF2');
    certo(/^data:image\/jpeg/.test(f) && f.length < 75000, 'foto em JPEG leve: ' + (f || '').length);
    const tam = (await tamanho(p, f)).join('x'); certo(tam === '480x360', 'foto já enquadrada no tamanho do cartão: ' + tam);
  }],
  ['abrir e salvar sem mexer na foto não estraga a foto antiga', async (st, abrir) => {
    st.tabelas.equipamentos.push(eq('EQF3', 'Gravador teste'));
    const p = await abrir({ aparelho: 'iphone-15' });
    const velha = await fotoLarga(p); st.tabelas.equipamentos.find(e => e.id === 'EQF3').foto = velha;
    await p.reload(); await p.waitForFunction(() => window.A && A.render); await ir(p, 'equip'); await calmo(p);
    await p.click('#view .eq[data-id="EQF3"]'); await p.waitForSelector('#fCrop:not([hidden])'); await p.waitForFunction(() => document.getElementById('fCropImg').style.width);
    certo(await p.$eval('[data-fm="contain"]', b => b.classList.contains('on')), 'foto antiga aparece inteira, como no cartão');
    await p.click('#s2 button.save'); await calmo(p);
    certo(fotoSalva(st, 'EQF3') === velha, 'foto antiga igual');
  }],
] };
