/* Roda os caminhos de teste do app, etapa por etapa, como se fosse o João usando (contra um Supabase de mentira).
   Os caminhos ficam em testes/caminhos/ (um arquivo por etapa) e estão explicados em testes/CAMINHOS.md.

   Tudo:            node financas-app/testes/testar-app.js
   Uma etapa:       ETAPA=03 node financas-app/testes/testar-app.js        (ou ETAPA=revisar)
   Dados de verdade (só no computador): DADOS=caminho/darzan-dados.json node financas-app/testes/testar-app.js */
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const { criar } = require('./supabase-de-mentira');
const { HOJE, CAPTURAS, abrir } = require('./ajuda');
const DADOS = JSON.parse(fs.readFileSync(process.env.DADOS || path.join(__dirname, 'dados-exemplo.json'), 'utf8'));
const PASTA = path.join(__dirname, 'caminhos');
const filtro = (process.env.ETAPA || '').toLowerCase();
const etapas = fs.readdirSync(PASTA).filter(f => f.endsWith('.js')).sort()
  .map(f => Object.assign({ arquivo: f }, require(path.join(PASTA, f))))
  .filter(e => !filtro || e.arquivo.startsWith(filtro.padStart(2, '0')) || e.arquivo.toLowerCase().includes(filtro) || e.etapa.toLowerCase().includes(filtro));

(async () => {
  const b = await chromium.launch();
  const relatorio = [], inicio = Date.now();
  let total = 0, falhas = 0;
  console.log(`Caminhos de teste · ${process.env.DADOS ? 'dados de ' + path.basename(process.env.DADOS) : 'dados de exemplo'} · hoje = ${HOJE}\n`);
  for (const e of etapas) {
    console.log(`${e.arquivo.slice(0, 2)} · ${e.etapa}`);
    let ok = 0;
    for (const [nome, fn, op = {}] of e.testes) {
      total++;
      const st = criar({ duracaoToken: op.duracaoToken });
      if (op.semear !== false) st.semear(DADOS);
      st.porta = await st.ligar();
      const paginas = [];
      try {
        await fn(st, async o => { const p = await abrir(b, st, o); paginas.push(p); return p; }, DADOS);
        const erros = paginas.flatMap(p => p.erros);
        if (erros.length) throw new Error('erros no console: ' + erros.join(' | '));
        ok++; console.log('   ok     ' + nome);
      } catch (x) {
        falhas++;
        const msg = String(x.message).split('\n').slice(0, 15).join('\n');
        console.log('   FALHOU ' + nome + '\n          ' + msg);
        relatorio.push(`${e.arquivo} · ${nome}\n  ${msg}`);
        if (paginas[0]) await paginas[0].screenshot({ path: path.join(CAPTURAS, `falha-${e.arquivo.slice(0, 2)}-${total}.png`) }).catch(() => { });
      } finally {
        for (const p of paginas) await p.context().close().catch(() => { });
        await st.desligar();
      }
    }
    console.log(`   ${ok} de ${e.testes.length}\n`);
  }
  await b.close();
  const res = `${total - falhas} de ${total} testes passaram em ${Math.round((Date.now() - inicio) / 1000)}s`;
  fs.writeFileSync(path.join(CAPTURAS, 'relatorio.txt'), res + '\n\n' + (relatorio.join('\n\n') || 'Nenhuma falha.') + '\n');
  console.log(res);
  process.exit(falhas ? 1 : 0);
})();
