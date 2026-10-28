/* Atualiza o bloco ABAS de financas-app/backup/Backup.gs a partir de darzan-producoes/financas/js/tabelas.js.
   Uso: node financas-app/ferramentas/gerar_backup.js                                                   */
const fs = require('fs'), path = require('path');
const raiz = path.resolve(__dirname, '../..');
require(path.join(raiz, 'darzan-producoes/financas/js/tabelas.js'));
const NOMES = { EXTRATO: 'Extrato', CONTAS: 'Contas', CARTOES: 'Cartões', PARCELADOS: 'Parcelados', FIXAS: 'Fixas', EQUIPAMENTOS: 'Equipamentos',
  TRABALHOS: 'Trabalhos', ANEXOS: 'Anexos', TAREFAS: 'Tarefas', METAS: 'Metas', CATEGORIAS: 'Categorias' };
const abas = Object.entries(globalThis.TABELAS).filter(([aba]) => NOMES[aba])
  .map(([aba, t]) => `  { aba: '${aba}', nome: '${NOMES[aba]}', tabela: '${t.tabela}', ${t.opcional ? 'opcional: true, ' : ''}colunas: ${JSON.stringify(t.colunas).replace(/"/g, "'")} },`);
const arq = path.join(raiz, 'financas-app/backup/Backup.gs');
const gs = fs.readFileSync(arq, 'utf8').replace(/(\/\/ ABAS-INICIO[^\n]*\n)[\s\S]*?(\/\/ ABAS-FIM)/, `$1var ABAS = [\n${abas.join('\n')}\n];\n$2`);
fs.writeFileSync(arq, gs);
console.log('Backup.gs: ' + abas.length + ' abas');
