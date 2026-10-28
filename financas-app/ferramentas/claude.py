"""Ferramenta do Claude para ler e corrigir os dados do João direto no Supabase, com a chave do "Acesso do Claude".

A chave é criada pelo João no app (Sua conta → Acesso do Claude) e passada pela variável DF_CLAUDE_CHAVE.
Ela nunca vai para o GitHub. Sem a chave, nada funciona; o João troca ou desliga quando quiser.

  DF_CLAUDE_CHAVE=dfc_... python3 financas-app/ferramentas/claude.py ler extrato > extrato.json
  DF_CLAUDE_CHAVE=dfc_... python3 financas-app/ferramentas/claude.py resumo
  DF_CLAUDE_CHAVE=dfc_... python3 financas-app/ferramentas/claude.py gravar mudancas.json   (pede confirmação)
      mudancas.json: [{"tabela": "extrato", "op": "salvar" | "apagar", "linha": {"id": "...", colunas que mudam...}}]
      "salvar" só mexe nas colunas que vierem; id que não existe vira linha nova.
"""
import json, os, sys, urllib.request, urllib.error
from collections import defaultdict

URL = os.environ.get('DF_URL', 'https://sczpyzcozcaibyzekmau.supabase.co')
PUBLICA = os.environ.get('DF_CHAVE_PUBLICA', 'sb_publishable_PLND7koek37GWekjKK50bQ_SodtXm14')


def rpc(funcao, corpo):
    req = urllib.request.Request(f'{URL}/rest/v1/rpc/{funcao}', data=json.dumps(corpo).encode(), method='POST',
                                 headers={'apikey': PUBLICA, 'Content-Type': 'application/json'})
    try:
        return json.loads(urllib.request.urlopen(req, timeout=60).read().decode() or 'null')
    except urllib.error.HTTPError as e:
        corpo = e.read().decode()
        try:
            corpo = json.loads(corpo).get('message', corpo)
        except ValueError:
            pass
        sys.exit(f'Supabase recusou ({e.code}): {corpo}')


def chave():
    c = os.environ.get('DF_CLAUDE_CHAVE', '').strip()
    if not c:
        sys.exit('Falta a chave: DF_CLAUDE_CHAVE=dfc_... (o João cria no app em Sua conta → Acesso do Claude)')
    return c


def ler(tabela):
    return rpc('claude_ler', {'p_chave': chave(), 'p_tabela': tabela})


def gravar(ops, confirmar=True):
    resumo = defaultdict(int)
    for o in ops:
        resumo[(o['tabela'], o['op'])] += 1
    print('Vai fazer:', ', '.join(f'{n} {op} em {t}' for (t, op), n in sorted(resumo.items())))
    if confirmar and input('Confirmar? (sim/não) ').strip().lower() not in ('s', 'sim'):
        sys.exit('Nada foi feito.')
    for i in range(0, len(ops), 200):
        r = rpc('claude_gravar', {'p_chave': chave(), 'p_ops': ops[i:i + 200]})
        print('ok:', r)


def resumo_mensal():
    ext = ler('extrato')
    meses = defaultdict(lambda: defaultdict(float))
    for l in ext:
        if not l.get('data'):
            continue
        m, g, v = l['data'][:7], l.get('grupo'), float(l.get('valor') or 0)
        if g == 'Renda':
            meses[m]['entrou'] += v
        elif g in ('Necessidades', 'Desejos'):
            meses[m]['saiu'] -= v
        elif g == 'Guardado':
            meses[m]['guardou'] -= v
    print('mês      entrou      saiu   guardou')
    for m in sorted(meses):
        x = meses[m]
        print(f"{m} {x['entrou']:9.2f} {x['saiu']:9.2f} {x['guardou']:9.2f}")


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    cmd = sys.argv[1]
    if cmd == 'ler':
        json.dump(ler(sys.argv[2]), sys.stdout, ensure_ascii=False, indent=1)
    elif cmd == 'resumo':
        resumo_mensal()
    elif cmd == 'gravar':
        gravar(json.load(open(sys.argv[2])), confirmar='--sim' not in sys.argv)
    else:
        sys.exit(__doc__)
