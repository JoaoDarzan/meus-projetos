import sys,re,json,os
pasta=sys.argv[1]; nomes=sys.argv[2].split(); out={}
ok=re.compile(r'<(path|line|circle|rect|polyline|polygon|ellipse)\b[^<>]*?/>')
for n in nomes:
    s=open(os.path.join(pasta,n+'.svg')).read()
    partes=[re.sub(r'\s+',' ',m.group(0)) for m in ok.finditer(s)]
    for p in partes: assert not re.search(r'on\w+=|javascript|href',p,re.I),n
    out[n]=''.join(partes)
open(sys.argv[3],'w').write(json.dumps(out,separators=(',',':')))
print(len(out),'ícones')
