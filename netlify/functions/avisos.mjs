/* Todo dia às 9h (horário de Brasília) manda os avisos do dia para o celular. */
import { enviarAvisos } from '../lib/avisos.mjs';

export default async () => {
  const r = await enviarAvisos().catch(e => ({ erro: e.message }));
  console.log('avisos:', JSON.stringify(r));
  return new Response(JSON.stringify(r), { headers: { 'Content-Type': 'application/json' } });
};

export const config = { schedule: '7 12 * * *' };
