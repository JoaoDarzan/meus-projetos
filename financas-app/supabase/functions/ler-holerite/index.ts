/* Função do Supabase "ler-holerite": recebe a foto do holerite (só do João, logado no app), pede para o Claude ler
   e devolve os números organizados. Não guarda a foto em lugar nenhum.

   Como ligar (uma vez, no painel do Supabase): Edge Functions → Deploy a new function → Via Editor →
   nome "ler-holerite" → apagar o exemplo e colar este arquivo inteiro → Deploy.
   Depois: Edge Functions → Secrets → ANTHROPIC_API_KEY = a chave criada em console.anthropic.com.
   Passo a passo completo: financas-app/README.md ("Ler holerite pela foto").

   O mesmo arquivo roda nos testes (Node), com um Claude de mentira: a parte de baixo só liga no Supabase (Deno). */

const MODELO = 'claude-opus-5-5';
const ORIGENS = ['https://joaodarzan.github.io', 'https://darzanproducoes.joaodarzan10.workers.dev'];
const TIPOS = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FOTO = 7_000_000; /* caracteres em base64 (uns 5 MB de foto; o app manda bem menos) */

const dinheiro = { type: ['number', 'null'] };
/* o formato da resposta (o Claude é obrigado a seguir); nada de nome ou CPF do funcionário */
export const ESQUEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['legivel', 'motivo', 'empresa', 'competencia_mes', 'competencia_ano', 'itens', 'total_vencimentos', 'total_descontos', 'liquido', 'salario_base', 'fgts_mes', 'base_inss'],
  properties: {
    legivel: { type: 'boolean', description: 'false se a foto não é um holerite ou não dá para ler os valores com segurança' },
    motivo: { type: 'string', description: 'se não deu para ler, o motivo em português simples; senão, vazio' },
    empresa: { type: 'string', description: 'nome da empresa (empregador), sem CNPJ' },
    competencia_mes: { type: 'integer', description: 'mês de referência do holerite, 1 a 12' },
    competencia_ano: { type: 'integer' },
    itens: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['codigo', 'descricao', 'referencia', 'vencimento', 'desconto'],
        properties: {
          codigo: { type: 'string' },
          descricao: { type: 'string', description: 'como está escrito no holerite' },
          referencia: { type: 'string', description: 'coluna Referência (horas, dias, %), como está escrito; vazio se não tiver' },
          vencimento: dinheiro,
          desconto: dinheiro,
        },
      },
    },
    total_vencimentos: dinheiro,
    total_descontos: dinheiro,
    liquido: dinheiro,
    salario_base: dinheiro,
    fgts_mes: dinheiro,
    base_inss: dinheiro,
  },
};

const PEDIDO = `Esta é a foto de um holerite (recibo de pagamento de salário) brasileiro. Leia todos os itens da tabela, linha por linha, com o valor exato em reais (use ponto para os centavos: 1074.00).
Cada item tem valor em Vencimentos ou em Descontos (o outro fica null). Pode haver marcas de lápis ou caneta por cima: ignore os riscos e leia os números impressos.
Confira a sua leitura: a soma dos vencimentos tem de dar o Total de Vencimentos, a dos descontos o Total de Descontos, e Total de Vencimentos menos Total de Descontos tem de dar o Valor Líquido. Se não bater, leia de novo os números com atenção.
Não escreva o nome, CPF ou outros dados pessoais do funcionário em nenhum campo.
Se a imagem não for um holerite ou estiver ilegível, responda legivel=false e explique o motivo em uma frase.`;

const cabecalhos = (origem: string | null) => ({
  'Access-Control-Allow-Origin': origem && ORIGENS.includes(origem) ? origem : ORIGENS[0],
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  Vary: 'Origin',
  'Content-Type': 'application/json; charset=utf-8',
});
const responder = (origem: string | null, status: number, corpo: unknown) => new Response(JSON.stringify(corpo), { status, headers: cabecalhos(origem) });

/* o trabalho: quem pediu, a foto, o Claude, a resposta. "usuario" confere o login; "claude" faz o pedido ao Claude. */
export async function tratar(req: Request, op: { claude: (p: any) => Promise<any>; usuario: (token: string, apikey: string | null) => Promise<{ id: string } | null>; origens?: string[] }) {
  const origem = req.headers.get('origin');
  const permitidas = op.origens || ORIGENS;
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cabecalhos(origem) });
  if (req.method !== 'POST') return responder(origem, 405, { erro: 'Só POST' });
  if (origem && !permitidas.includes(origem)) return responder(origem, 403, { erro: 'Endereço não permitido' });
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const quem = token ? await op.usuario(token, req.headers.get('apikey')).catch(() => null) : null;
  if (!quem) return responder(origem, 401, { erro: 'Entre de novo no app' });

  let corpo: any;
  try { corpo = await req.json(); } catch { return responder(origem, 400, { erro: 'Pedido inválido' }); }
  const tipo = String(corpo && corpo.tipo || ''), foto = String(corpo && corpo.imagem || '');
  if (!TIPOS.includes(tipo)) return responder(origem, 400, { erro: 'Mande uma foto (JPG, PNG ou WEBP)' });
  if (!foto || foto.length > MAX_FOTO || !/^[A-Za-z0-9+/]+=*$/.test(foto)) return responder(origem, 400, { erro: 'Foto grande demais ou com defeito' });

  let r: any;
  try {
    r = await op.claude({
      model: MODELO,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default', /* se o modelo recusar, o próprio Claude tenta com outro */
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: ESQUEMA } },
      messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: tipo, data: foto } }, { type: 'text', text: PEDIDO }] }],
    });
  } catch (e: any) {
    const status = e && typeof e.status === 'number' ? e.status : 0;
    if (status === 401 || status === 403) return responder(origem, 500, { erro: 'A chave do Claude (ANTHROPIC_API_KEY) está errada ou sem crédito', motivo: 'chave' });
    if (status === 429 || status === 529) return responder(origem, 503, { erro: 'O Claude está ocupado agora. Tente de novo em 1 minuto' });
    return responder(origem, 502, { erro: 'Não consegui falar com o Claude. Tente de novo' });
  }
  if (r.stop_reason === 'refusal') return responder(origem, 422, { erro: 'O Claude não quis ler esta imagem' });
  if (r.stop_reason === 'max_tokens') return responder(origem, 422, { erro: 'O holerite veio comprido demais. Tente uma foto só da tabela' });
  const texto = (r.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
  let holerite: any;
  try { holerite = JSON.parse(texto); } catch { return responder(origem, 502, { erro: 'A leitura veio com defeito. Tente de novo' }); }
  if (!holerite.legivel) return responder(origem, 422, { erro: holerite.motivo || 'Não deu para ler. Tire outra foto, com boa luz e reta' });
  return responder(origem, 200, { holerite });
}

/* no Supabase (Deno): liga a função com a chave do Claude e o login do próprio projeto */
const Deno = (globalThis as any).Deno;
if (Deno) {
  const { default: Anthropic } = await import('npm:@anthropic-ai/sdk@1.1.0');
  const chave = Deno.env.get('ANTHROPIC_API_KEY');
  const cliente = chave ? new Anthropic({ apiKey: chave }) : null;
  const url = Deno.env.get('SUPABASE_URL'), anon = Deno.env.get('SUPABASE_ANON_KEY');
  Deno.serve((req: Request) => {
    if (!cliente && req.method === 'POST') return responder(req.headers.get('origin'), 500, { erro: 'Falta a chave do Claude (ANTHROPIC_API_KEY) nos Secrets da função', motivo: 'chave' });
    return tratar(req, {
      claude: p => cliente!.beta.messages.create(p),
      /* o login é conferido pelo próprio Supabase (a chave pública vem do app; a do projeto fica de reserva) */
      usuario: async (token, apikey) => { const r = await fetch(url + '/auth/v1/user', { headers: { apikey: apikey || anon, Authorization: 'Bearer ' + token } }); return r.ok ? await r.json() : null; },
    });
  });
}
