"""Vigia de segredos: procura em todos os arquivos do repositório (que é PÚBLICO) coisas que nunca podem estar aqui:
chaves e senhas (Supabase secret/service_role, chave do Claude dfc_, tokens do GitHub/Trello/Google, chaves privadas)
e dados pessoais (CPF, RG). Roda no GitHub a cada mudança; se achar algo, falha e não deixa passar.
Uso: python3 financas-app/ferramentas/vigia_segredos.py"""
import re, subprocess, sys

PADROES = {
    'chave secreta do Supabase': r'sb_secret_[A-Za-z0-9_-]{10,}',
    'token JWT (service_role?)': r'eyJhbGciOiJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}',
    'chave do Claude (Acesso do Claude)': r'dfc_[A-Za-z0-9_-]{30,}',
    'token do GitHub': r'gh[pousr]_[A-Za-z0-9]{30,}',
    'token do Trello': r'ATTA[0-9a-fA-F]{40,}',
    'chave do Google': r'AIza[0-9A-Za-z_-]{35}',
    'chave privada': r'-----BEGIN [A-Z ]*PRIVATE KEY-----',
    'CPF': r'(?<![\d.])\d{3}\.\d{3}\.\d{3}-\d{2}(?![\d])',
    'RG': r'\b\d{2}\.\d{3}\.\d{3}-[\dxX]\b',
    'segredo escrito no código': r'(?i)(avisos_segredo|vapid_private|service_role_key|senha|password)\s*[:=]\s*[\'"][^\'"\s]{12,}[\'"]',
}
# exemplos inventados que podem aparecer (testes, demonstração)
PERMITIDO = [r'dfc_chave-de-teste', r'000\.000\.000-00', r'123\.456\.789-0\d']

arquivos = subprocess.run(['git', 'ls-files'], capture_output=True, text=True, check=True).stdout.split('\n')
achados = []
for arq in filter(None, arquivos):
    if re.search(r'\.(png|jpe?g|pdf|xlsx|ico|woff2?|ttf|heic)$', arq, re.I) or arq.startswith('darzan-producoes/financas/vendor/'):
        continue
    try:
        texto = open(arq, encoding='utf-8', errors='ignore').read()
    except (IsADirectoryError, FileNotFoundError):
        continue
    for nome, pad in PADROES.items():
        for m in re.finditer(pad, texto):
            if any(re.fullmatch(p, m.group(0)) or re.search(p, m.group(0)) for p in PERMITIDO):
                continue
            linha = texto.count('\n', 0, m.start()) + 1
            achados.append(f'{arq}:{linha}: {nome}: {m.group(0)[:12]}…')
if achados:
    print('O vigia achou coisas que não podem ficar num repositório público:')
    print('\n'.join(achados))
    sys.exit(1)
print(f'Vigia de segredos: {len([a for a in arquivos if a])} arquivos conferidos, nada de chave, senha ou CPF.')
