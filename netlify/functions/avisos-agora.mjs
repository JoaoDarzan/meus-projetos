/* Botão "Mandar um aviso de teste" do app: manda na hora os avisos de teste de hoje.
   Não precisa de login: só manda o que já está na agenda (e só os de teste), nada sai daqui. */
import { enviarAvisos } from '../lib/avisos.mjs';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Content-Type': 'application/json' };

export default async req => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return new Response(JSON.stringify({ erro: 'use POST' }), { status: 405, headers: CORS });
  const r = await enviarAvisos({ soTeste: true }).catch(e => ({ erro: e.message }));
  return new Response(JSON.stringify(r), { status: r.erro ? 500 : 200, headers: CORS });
};
