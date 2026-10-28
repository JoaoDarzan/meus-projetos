/* Pega no Supabase os avisos de hoje e manda para os aparelhos do João.
   Roda no GitHub a cada 30 minutos (.github/workflows/avisos.yml, script enviar.mjs).
   Só precisa do segredo dos avisos (segredo AVISOS_SEGREDO do GitHub): com ele dá para ler só a agenda
   de avisos e os aparelhos (funções do esquema.sql), nada das finanças. */
import { chavesDoSegredo, mandar } from './push.mjs';

export const SUPABASE = { url: 'https://sczpyzcozcaibyzekmau.supabase.co', chave: 'sb_publishable_PLND7koek37GWekjKK50bQ_SodtXm14' };
export const PUBLICA = 'BAnX0hPDbPdvv3yWufNnEvrbzfOK1aXIZ5BSyXL9qSCuxF548EjP9iDG5NsCz-IimHc_xTqJjJod-cOakGoK82o';
export const APP = 'https://joaodarzan.github.io/meus-projetos/financas/';
export const hojeEmSP = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d);
export const horaEmSP = (d = new Date()) => +new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hourCycle: 'h23' }).format(d);

/* junta os avisos do dia numa mensagem só (se for mais de um) */
export function mensagem(lista) {
  if (lista.length === 1) return { titulo: lista[0].titulo, corpo: lista[0].corpo || '', url: APP, tag: lista[0].id };
  return { titulo: `Você tem ${lista.length} avisos`, corpo: lista.map(a => `• ${a.titulo}${a.corpo ? ' · ' + a.corpo : ''}`).join('\n'), url: APP, tag: 'avisos-' + lista[0].quando };
}

export async function enviarAvisos({ soTeste = false, segredo = process.env.AVISOS_SEGREDO, supabase = SUPABASE, publica = PUBLICA, hoje = hojeEmSP(), enviar = mandar } = {}) {
  if (!segredo) return { erro: 'falta o segredo AVISOS_SEGREDO no GitHub' };
  const chaves = chavesDoSegredo(segredo);
  if (publica && chaves.publica !== publica) return { erro: 'o AVISOS_SEGREDO não combina com o app' };
  const rpc = async (fn, corpo) => {
    const r = await fetch(`${supabase.url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: supabase.chave, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
    const t = await r.text();
    if (!r.ok) throw new Error(`${fn}: ${t}`);
    return t ? JSON.parse(t) : null;
  };
  const { avisos, aparelhos } = await rpc('avisos_pendentes', { p_segredo: segredo, p_hoje: hoje });
  /* só os do próprio dia (um "Amanhã: ..." que ficou para trás já não vale); o de teste vale sempre */
  const lista = avisos.filter(a => a.tipo === 'teste' || (!soTeste && a.quando === hoje));
  const res = { hoje, avisos: lista.length, enviados: 0, aparelhos: 0, sumiram: 0, falhas: [] };
  if (!lista.length) { res.motivo = 'nenhum aviso para hoje'; return res; }
  const porDono = {};
  lista.forEach(a => (porDono[a.user_id] = porDono[a.user_id] || []).push(a));
  for (const [dono, avs] of Object.entries(porDono)) {
    const meus = aparelhos.filter(x => x.user_id === dono);
    if (!meus.length) { res.motivo = 'nenhum aparelho com avisos ligados'; continue; }
    let chegou = false;
    for (const ap of meus) {
      res.aparelhos++;
      try {
        const st = await enviar(ap, mensagem(avs), chaves, APP);
        if (st >= 200 && st < 300) chegou = true;
        else if (st === 404 || st === 410) { res.sumiram++; await rpc('aparelho_sumiu', { p_segredo: segredo, p_id: ap.id }); }
        else res.falhas.push(`aparelho ${ap.id}: resposta ${st}`);
      } catch (e) { res.falhas.push(`aparelho ${ap.id}: ${e.message}`); }
    }
    if (chegou) { await rpc('avisos_enviados', { p_segredo: segredo, p_ids: avs.map(a => a.id) }); res.enviados += avs.length; }
  }
  if (!res.enviados && !res.motivo) res.motivo = res.falhas[0] || 'nenhum aparelho recebeu';
  return res;
}
