/* Conversa com o Supabase (login e tabelas). Sem biblioteca de fora: só fetch.
   A chave "publishable" pode ficar no site: quem protege os dados é o login + as regras das tabelas (RLS). */
window.A = window.A || {};
(function (A) {
  const CONFIG = window.DF_CONFIG || {
    url: 'https://sczpyzcozcaibyzekmau.supabase.co',
    chave: 'sb_publishable_PLND7koek37GWekjKK50bQ_SodtXm14',
  };
  const CHAVE_SESSAO = 'df-sessao';
  const ler = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const gravar = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };

  const n = A.nuvem = { config: CONFIG, sessao: ler(CHAVE_SESSAO), aoSair: null };
  class ErroNuvem extends Error { constructor(msg, status, semInternet) { super(msg); this.status = status; this.semInternet = !!semInternet; } }
  n.Erro = ErroNuvem;

  /* fetch que entende "sem internet" */
  async function chamar(caminho, op) {
    let r;
    try { r = await fetch(CONFIG.url + caminho, op); } catch (e) { throw new ErroNuvem('Sem internet', 0, true); }
    const txt = await r.text();
    let corpo = null; try { corpo = txt ? JSON.parse(txt) : null; } catch (e) { corpo = txt; }
    if (!r.ok) {
      const msg = (corpo && (corpo.error_description || corpo.msg || corpo.message || corpo.error)) || ('Erro ' + r.status);
      throw new ErroNuvem(String(msg), r.status);
    }
    return { corpo, r };
  }
  const guardarSessao = s => {
    n.sessao = s ? { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: Math.floor(Date.now() / 1000) + (s.expires_in || 3600) /* pelo relógio do aparelho */, user: { id: s.user.id, email: s.user.email } } : null;
    gravar(CHAVE_SESSAO, n.sessao);
  };

  /* ---------- login ---------- */
  n.entrar = async (email, senha) => {
    try {
      const { corpo } = await chamar('/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: CONFIG.chave, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), password: senha }) });
      guardarSessao(corpo);
      return n.sessao;
    } catch (e) {
      if (e.semInternet) throw new ErroNuvem('Sem internet. Confira o Wi-Fi ou os dados móveis.', 0, true);
      if (/invalid login|invalid_grant|credentials/i.test(e.message)) throw new ErroNuvem('E-mail ou senha errados.', e.status);
      if (/not confirmed/i.test(e.message)) throw new ErroNuvem('Este e-mail ainda não foi confirmado no Supabase.', e.status);
      throw e;
    }
  };
  let renovando = null;
  n.renovar = () => renovando || (renovando = (async () => {
    try {
      const { corpo } = await chamar('/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: CONFIG.chave, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: n.sessao.refresh_token }) });
      guardarSessao(corpo);
    } catch (e) {
      if (!e.semInternet) { guardarSessao(null); if (n.aoSair) n.aoSair(); }
      throw e;
    } finally { renovando = null; }
  })());
  n.sair = async () => {
    const s = n.sessao; guardarSessao(null);
    if (s) chamar('/auth/v1/logout', { method: 'POST', headers: { apikey: CONFIG.chave, Authorization: 'Bearer ' + s.access_token } }).catch(() => { });
  };
  async function token() {
    if (!n.sessao) throw new ErroNuvem('Entre de novo', 401);
    if (n.sessao.expires_at - 60 < Date.now() / 1000) await n.renovar();
    return n.sessao.access_token;
  }

  /* ---------- tabelas ---------- */
  async function rest(metodo, caminho, corpo, prefer) {
    const faz = async () => chamar('/rest/v1/' + caminho, { method: metodo, headers: Object.assign({ apikey: CONFIG.chave, Authorization: 'Bearer ' + await token(), 'Content-Type': 'application/json' }, prefer ? { Prefer: prefer } : {}), body: corpo === undefined ? undefined : JSON.stringify(corpo) });
    try { return (await faz()).corpo; } catch (e) {
      if (e.status !== 401) throw e;
      await n.renovar(); /* token venceu no meio do caminho: renova e tenta uma vez de novo */
      return (await faz()).corpo;
    }
  }
  const POR_VEZ = 1000;
  n.ler = async tabela => {
    const out = [];
    for (let de = 0; ; de += POR_VEZ) {
      const parte = await rest('GET', `${tabela}?select=*&order=id&limit=${POR_VEZ}&offset=${de}`);
      out.push(...parte);
      if (parte.length < POR_VEZ) return out;
    }
  };
  /* grava (cria ou atualiza) várias linhas; cada linha manda só as colunas que mudaram */
  n.gravar = async (tabela, linhas) => {
    const grupos = {};
    linhas.forEach(l => { const k = Object.keys(l).sort().join(','); (grupos[k] = grupos[k] || []).push(l); });
    for (const g of Object.values(grupos)) for (let i = 0; i < g.length; i += 500) await rest('POST', `${tabela}?on_conflict=id`, g.slice(i, i + 500), 'resolution=merge-duplicates,return=minimal');
  };
  n.apagar = async (tabela, ids) => {
    for (let i = 0; i < ids.length; i += 100) await rest('DELETE', `${tabela}?id=in.(${ids.slice(i, i + 100).map(x => '"' + encodeURIComponent(String(x).replace(/"/g, '')) + '"').join(',')})`, undefined, 'return=minimal');
  };
})(window.A);
