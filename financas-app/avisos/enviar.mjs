/* Chamado pelo GitHub a cada 30 minutos (.github/workflows/avisos.yml).
   Antes das 9h (horário de Brasília) só manda os avisos de teste; das 9h em diante, todos os do dia que faltam. */
import { enviarAvisos, horaEmSP } from './avisos.mjs';

export function oQueMandar(agora = new Date()) { return { soTeste: horaEmSP(agora) < 9 }; }

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!process.env.AVISOS_SEGREDO) {
    console.log('Avisos desligados: falta o segredo AVISOS_SEGREDO (GitHub → Settings → Secrets and variables → Actions).');
    process.exit(0);
  }
  const r = await enviarAvisos(oQueMandar()).catch(e => ({ erro: e.message }));
  console.log(JSON.stringify(r));
  if (r.erro) process.exit(1);
}
