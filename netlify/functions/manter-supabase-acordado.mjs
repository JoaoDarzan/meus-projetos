/* Reserva do lembrete do GitHub: todo dia avisa o Supabase que o app está em uso (o projeto grátis "dorme" após 7 dias parado). */
const URL = 'https://sczpyzcozcaibyzekmau.supabase.co';
const CHAVE = 'sb_publishable_PLND7koek37GWekjKK50bQ_SodtXm14';

export default async () => {
  const r = await fetch(`${URL}/rest/v1/rpc/manter_ativo`, { method: 'POST', headers: { apikey: CHAVE, 'Content-Type': 'application/json' }, body: '{}' });
  console.log('Supabase:', r.status, await r.text());
  return new Response(null, { status: r.ok ? 200 : 502 });
};

export const config = { schedule: '43 11 * * *' };
