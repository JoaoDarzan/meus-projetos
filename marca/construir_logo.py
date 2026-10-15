"""Recria a logo da Darzan Produções em vetor (SVG só com preenchimentos).

Gera, nesta pasta:
  logo.svg            logo completa, dourada, fundo transparente
  logo-fundo.svg      logo completa sobre o fundo grafite
  logo-emblema.svg    só o emblema (rolo de filme + obturador + seta)
  logo-branca.svg     versão de uma cor (branca), para marca d'água
  logo-partes.svg     mesma logo, uma <path> por parte (id), usada no 3D do vídeo

As medidas foram tiradas da imagem original (logo-original.png, 1024 px),
então o SVG usa o mesmo sistema de coordenadas: dá para sobrepor e comparar.

Uso: python3 construir_logo.py
"""
import math
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from shapely import affinity
from shapely.geometry import LineString, Point, Polygon
from shapely.ops import unary_union

AQUI = Path(__file__).parent
FONTES = AQUI.parent / "video-vertical" / "fonts"

# ---------------------------------------------------------------- medidas
C = (522.5, 512.5)            # centro dos anéis
ANEL_EXT = (309, 321)         # raio interno/externo do anel grosso
ANEL_INT = (296, 300)         # anel fino
VAO = (126, 176)              # ângulos (graus, y para baixo) onde o anel abre para o ramo

OBT_C, OBT_R = (551, 425), 117   # obturador (íris)
OBT_ABERTURA, OBT_LAMINAS, OBT_FENDA = 56, 8, 5.5
ROLO_C, ROLO_R = (447, 424), 102
ROLO_FUROS = [((408, 371), 23), ((382, 430), 23), ((412, 488), 23)]
VAO_ROLO = 5.5                # espaço escuro entre rolo e obturador


def circulo(c, r, n=256):
    return Point(c).buffer(r, quad_segs=n // 4)


def anel(c, r0, r1):
    return circulo(c, r1).difference(circulo(c, r0))


def setor(c, r, a0, a1, n=96):
    pts = [c] + [(c[0] + r * math.cos(math.radians(a)), c[1] + r * math.sin(math.radians(a)))
                 for a in [a0 + (a1 - a0) * i / n for i in range(n + 1)]]
    return Polygon(pts)


def bezier(p, t):
    u = 1 - t
    return tuple(u**3 * p[0][k] + 3 * u * u * t * p[1][k] + 3 * u * t * t * p[2][k] + t**3 * p[3][k] for k in (0, 1))


def faixa(curva, larg, n=120):
    """Polígono em volta de uma curva com largura variável larg(t)."""
    pts = [bezier(curva, i / n) for i in range(n + 1)]
    esq, dir_ = [], []
    for i, (x, y) in enumerate(pts):
        a, b = pts[max(i - 1, 0)], pts[min(i + 1, n)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy) or 1
        nx, ny = -dy / L, dx / L
        w = larg(i / n) / 2
        esq.append((x + nx * w, y + ny * w))
        dir_.append((x - nx * w, y - ny * w))
    return Polygon(esq + dir_[::-1]).buffer(0)


def folha(base, ang, comp, larg):
    """Folha pontuda (vesica) presa em base, apontando para ang (graus)."""
    n = 40
    pts = []
    for i in range(n + 1):
        t = i / n
        pts.append((comp * t, larg / 2 * math.sin(math.pi * t) ** 0.85))
    for i in range(n, -1, -1):
        t = i / n
        pts.append((comp * t, -larg / 2 * math.sin(math.pi * t) ** 0.85))
    f = Polygon(pts)
    f = affinity.rotate(f, ang, origin=(0, 0))
    return affinity.translate(f, base[0], base[1])


# ---------------------------------------------------------------- partes
def partes():
    p = {}

    # anéis, abertos à esquerda embaixo onde entra o ramo
    corte = setor(C, 400, VAO[0], VAO[1])
    p["anel-externo"] = anel(C, *ANEL_EXT).difference(corte)
    p["anel-interno"] = anel(C, *ANEL_INT).difference(setor(C, 400, VAO[0] - 3, VAO[1] + 3))

    # ramo de louro
    rr = ANEL_EXT[1] + 8
    a_base, a_ponta = VAO[0] - 2, VAO[1] - 5
    def no_ramo(t):
        a = math.radians(a_base + (a_ponta - a_base) * t)
        return (C[0] + rr * math.cos(a), C[1] + rr * math.sin(a)), math.degrees(a)
    caule = LineString([no_ramo(i / 60)[0] for i in range(61)]).buffer(1.6, cap_style="round")
    folhas = []
    N = 6
    for i in range(N):
        t = 0.03 + 0.8 * i / (N - 1)
        (x, y), a = no_ramo(t)
        tang = a + 90              # direção da ponta do ramo
        escala = 1.0 - 0.3 * t
        comp, larg = 72 * escala, 34 * escala
        folhas.append(folha((x, y), tang + 44, comp, larg))   # para fora
        folhas.append(folha((x, y), tang - 34, comp * 0.88, larg * 0.88))  # para dentro
    (xp, yp), ap = no_ramo(1.0)
    folhas.append(folha((xp, yp), ap + 90, 52, 22))
    p["louro"] = unary_union([caule] + folhas)

    # obturador: disco com abertura octogonal e lâminas separadas por fendas
    disco = circulo(OBT_C, OBT_R)
    rot = math.radians(-8)
    oct_ = [(OBT_C[0] + OBT_ABERTURA * math.cos(rot + 2 * math.pi * i / OBT_LAMINAS),
             OBT_C[1] + OBT_ABERTURA * math.sin(rot + 2 * math.pi * i / OBT_LAMINAS)) for i in range(OBT_LAMINAS)]
    fendas = []
    for i in range(OBT_LAMINAS):
        a, b = oct_[i], oct_[(i + 1) % OBT_LAMINAS]
        dx, dy = a[0] - b[0], a[1] - b[1]
        L = math.hypot(dx, dy)
        fim = (b[0] + dx / L * 400, b[1] + dy / L * 400)
        fendas.append(LineString([b, fim]).buffer(OBT_FENDA / 2, cap_style="flat"))
    p["obturador"] = disco.difference(Polygon(oct_)).difference(unary_union(fendas))

    # play
    cx, cy = OBT_C[0] + 6, OBT_C[1] + 3
    tri = Polygon([(cx - 22, cy - 36), (cx - 22, cy + 36), (cx + 38, cy)])
    p["play"] = tri.buffer(4, join_style="round").buffer(-4, join_style="round")

    # rolo de filme atrás do obturador
    rolo = circulo(ROLO_C, ROLO_R)
    for c, r in ROLO_FUROS:
        rolo = rolo.difference(circulo(c, r))
    p["rolo"] = rolo.difference(circulo(OBT_C, OBT_R + VAO_ROLO))

    # seta em curva (crescente) passando por baixo
    curva = [(380, 528), (470, 600), (650, 575), (693, 392)]
    p["seta"] = unary_union([
        faixa(curva, lambda t: 0.6 + 12.5 * math.sin(math.pi * 0.5 * t) ** 1.3),
        Polygon([(671, 394), (716, 392), (698, 352)]),
    ])
    return p


# ---------------------------------------------------------------- texto
def texto_path(fonte, texto, alt_caps, esq, dir_, base):
    """Contornos do texto, com altura de maiúscula alt_caps e espaçamento
    ajustado para ir de esq até dir_ (px), na linha de base `base`."""
    f = TTFont(fonte)
    gs, cmap = f.getGlyphSet(), f.getBestCmap()
    cap = f["OS/2"].sCapHeight
    k = alt_caps / cap
    nomes = [cmap[ord(ch)] for ch in texto]
    avancos = [gs[n].width for n in nomes]
    # largura do desenho sem espaçamento extra: do primeiro ao último contorno
    larg_bruta = sum(avancos[:-1]) * k + avancos[-1] * k
    extra = ((dir_ - esq) - larg_bruta) / (len(texto) - 1)
    pen = SVGPathPen(gs)
    x = esq
    for n, adv in zip(nomes, avancos):
        tp = TransformPen(pen, (k, 0, 0, -k, x, base))
        gs[n].draw(tp)
        x += adv * k + extra
    return pen.getCommands()


# ---------------------------------------------------------------- svg
def para_d(geom):
    polys = getattr(geom, "geoms", [geom])
    out = []
    for pg in polys:
        for anel_ in [pg.exterior, *pg.interiors]:
            cs = list(anel_.coords)
            out.append("M" + " L".join(f"{x:.2f} {y:.2f}" for x, y in cs[:-1]) + "Z")
    return "".join(out)


OURO = """<linearGradient id="ouro" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#F7E08A"/><stop offset=".28" stop-color="#E2B850"/>
      <stop offset=".52" stop-color="#FBE9A6"/><stop offset=".74" stop-color="#C8952F"/>
      <stop offset="1" stop-color="#EDCB6A"/></linearGradient>"""


def svg(conteudo, viewbox="0 0 1024 1024", fundo=None, extra_defs=""):
    bg = f'<rect width="1024" height="1024" fill="{fundo}"/>' if fundo else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}">\n'
            f'  <title>Darzan Produções</title>\n  <defs>{OURO}{extra_defs}</defs>\n  {bg}\n{conteudo}\n</svg>\n')


def main():
    p = partes()
    darzan = texto_path(FONTES / "Cinzel-600.ttf", "DARZAN", 64, 330, 746, 664)
    prod = texto_path(FONTES / "Montserrat-400.ttf", "PRODUÇÕES", 24, 394, 682, 715)

    pedacos = [(k, para_d(v)) for k, v in p.items()] + [("texto-darzan", darzan), ("texto-producoes", prod)]
    tudo = "".join(d for _, d in pedacos)
    emblema = "".join(para_d(p[k]) for k in ("rolo", "obturador", "play", "seta"))

    (AQUI / "logo.svg").write_text(svg(f'  <path fill="url(#ouro)" d="{tudo}"/>'))
    (AQUI / "logo-fundo.svg").write_text(svg(f'  <path fill="url(#ouro)" d="{tudo}"/>', fundo="#1E2023"))
    (AQUI / "logo-branca.svg").write_text(svg(f'  <path fill="#FFFFFF" d="{tudo}"/>'))
    (AQUI / "logo-emblema.svg").write_text(svg(f'  <path fill="url(#ouro)" d="{emblema}"/>', viewbox="370 345 360 260"))
    partes_svg = "\n".join(f'  <path id="{k}" fill="url(#ouro)" d="{d}"/>' for k, d in pedacos)
    (AQUI / "logo-partes.svg").write_text(svg(partes_svg))
    print("SVGs gerados em", AQUI)


if __name__ == "__main__":
    main()
