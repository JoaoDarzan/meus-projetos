/* Conversa com a API da Pluggy (Open Finance) só para LER: itens (bancos), contas, lançamentos e faturas.
   As credenciais vêm dos segredos do GitHub (nunca do código). Base: SDK oficial pluggyai/pluggy-node. */
export function criarPluggy({ clientId, clientSecret, base = 'https://api.pluggy.ai', fetch: f = fetch }) {
  let apiKey = null;
  const pedir = async (caminho, params = {}) => {
    if (!apiKey) {
      const r = await f(`${base}/auth`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId, clientSecret, nonExpiring: false }) });
      if (!r.ok) throw new Error(`a Pluggy recusou as credenciais (${r.status}): confira PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET`);
      apiKey = (await r.json()).apiKey;
    }
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '')).toString();
    const r = await f(`${base}/${caminho}${q ? '?' + q : ''}`, { headers: { 'X-API-KEY': apiKey } });
    if (!r.ok) throw new Error(`Pluggy ${caminho.split('/')[0]}: ${r.status}`);
    return r.json();
  };
  return {
    /* entra na Pluggy antes de tudo: credencial errada para o robô na hora */
    entrar: async () => { await pedir('items/teste-de-entrada').catch(e => { if (/recusou as credenciais/.test(e.message)) throw e; }); },
    item: id => pedir(`items/${id}`),
    contas: itemId => pedir('accounts', { itemId }).then(r => r.results || []),
    faturas: accountId => pedir('bills', { accountId }).then(r => r.results || []).catch(() => []),
    /* todos os lançamentos de uma conta desde uma data (paginação por cursor, GET /v2/transactions) */
    async lancamentos(accountId, dateFrom) {
      const todos = []; let after = null;
      for (let i = 0; i < 200; i++) {
        const r = await pedir('v2/transactions', { accountId, dateFrom, after });
        todos.push(...(r.results || []));
        const prox = r.next ? new URL(r.next, base).searchParams.get('after') : null;
        if (!prox) break; after = prox;
      }
      return todos;
    },
  };
}
