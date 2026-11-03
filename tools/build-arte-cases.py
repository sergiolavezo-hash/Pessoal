#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gera a arte dos cards de case — SVG, uma por case.

A referência usa fotos de banco de imagem com estética de IA. Copiar as
delas está fora de questão e comprar banco de imagem para três cards não
se justifica, então cada case ganha um diagrama abstrato próprio, montado
com os tokens da Atlas: a mesma grade de fundo do site, o mesmo azul, as
mesmas formas que já aparecem nos ícones.

Cada arte desenha o que o case fez, não um enfeite genérico:
  omnichannel  — canais separados convergindo numa plataforma só
  legado       — um bloco denso virando um fluxo organizado
  governanca   — muitos quadros soltos virando uma grade alinhada

São SVG determinísticos: sem aleatoriedade, o mesmo arquivo sai igual a
cada build e o diff do git mostra só o que mudou de verdade.

Uso:  python3 tools/build-arte-cases.py
"""
import pathlib

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SAIDA = RAIZ / 'media' / 'cases'
W, H = 720, 460

AZUL, CLARO, FUNDO, GRADE = '#2E86FF', '#6FD4FF', '#0B1220', 'rgba(244,243,239,0.07)'


def moldura(corpo, titulo):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="{titulo}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{CLARO}"/><stop offset="0.55" stop-color="{AZUL}"/><stop offset="1" stop-color="#0A2EE0"/>
    </linearGradient>
    <radialGradient id="brilho" cx="78%" cy="18%" r="68%">
      <stop offset="0" stop-color="{AZUL}" stop-opacity="0.26"/><stop offset="1" stop-color="{AZUL}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grade" width="36" height="36" patternUnits="userSpaceOnUse">
      <path d="M36 0H0v36" fill="none" stroke="{GRADE}" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="{W}" height="{H}" fill="{FUNDO}"/>
  <rect width="{W}" height="{H}" fill="url(#grade)"/>
  <rect width="{W}" height="{H}" fill="url(#brilho)"/>
{corpo}
</svg>
'''


def caixa(x, y, w, h, op=1.0, preenche=False, r=10):
    f = 'url(#g)' if preenche else 'none'
    return (f'  <rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{f}" '
            f'stroke="{AZUL}" stroke-width="1.6" opacity="{op}"/>')


def ponto(x, y, r=4, cor=None, op=1.0):
    return f'  <circle cx="{x}" cy="{y}" r="{r}" fill="{cor or CLARO}" opacity="{op}"/>'


def linha(x1, y1, x2, y2, op=0.5, larg=1.6, trac=None):
    d = f' stroke-dasharray="{trac}"' if trac else ''
    return (f'  <path d="M{x1} {y1} L{x2} {y2}" stroke="{AZUL}" stroke-width="{larg}" '
            f'opacity="{op}" fill="none"{d}/>')


def curva(x1, y1, x2, y2, op=0.55):
    mx = (x1 + x2) / 2
    return (f'  <path d="M{x1} {y1} C{mx} {y1}, {mx} {y2}, {x2} {y2}" stroke="url(#g)" '
            f'stroke-width="2" fill="none" opacity="{op}"/>')


def painel(x, y, w, h, titulo_larg=70):
    """Moldura de dashboard: barra de janela, título e corpo."""
    p = [f'  <rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="#0E1826" stroke="{AZUL}" stroke-width="1.4" opacity="0.95"/>',
         f'  <path d="M{x} {y + 30} h{w}" stroke="{AZUL}" stroke-width="1" opacity="0.35"/>',
         f'  <rect x="{x + 14}" y="{y + 11}" width="{titulo_larg}" height="8" rx="4" fill="url(#g)" opacity="0.85"/>']
    for i in range(3):
        p.append(f'  <circle cx="{x + w - 16 - i * 13}" cy="{y + 15}" r="2.6" fill="{AZUL}" opacity="{0.5 - i * 0.12}"/>')
    return p


def barras(x, y, w, h, alturas, destaque=-1):
    p = []
    n = len(alturas)
    lg = w / n * 0.56
    passo = w / n
    for i, a in enumerate(alturas):
        bh = h * a
        cor = 'url(#g)' if i == destaque else AZUL
        op = 1 if i == destaque else 0.45
        p.append(f'  <rect x="{x + i * passo + (passo - lg) / 2:.1f}" y="{y + h - bh:.1f}" width="{lg:.1f}" '
                 f'height="{bh:.1f}" rx="2.5" fill="{cor}" opacity="{op}"/>')
    return p


def serie(x, y, w, h, vals, cor=None, op=0.95, larg=2.2):
    n = len(vals)
    pts = [(x + i * (w / (n - 1)), y + h - v * h) for i, v in enumerate(vals)]
    d = 'M' + ' L'.join(f'{a:.1f} {b:.1f}' for a, b in pts)
    return [f'  <path d="{d}" fill="none" stroke="{cor or CLARO}" stroke-width="{larg}" '
            f'stroke-linecap="round" stroke-linejoin="round" opacity="{op}"/>']


def donut(cx, cy, r, frac, larg=9):
    import math
    c = 2 * math.pi * r
    return [f'  <circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{AZUL}" stroke-width="{larg}" opacity="0.22"/>',
            f'  <circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="url(#g)" stroke-width="{larg}" '
            f'stroke-linecap="round" stroke-dasharray="{c * frac:.1f} {c:.1f}" transform="rotate(-90 {cx} {cy})"/>']


def omnichannel():
    """Canais separados convergindo num painel único de vendas."""
    p = []
    rot = ['Loja', 'App', 'Web', 'Mkt']
    for i, y in enumerate([94, 158, 222, 286]):
        p.append(f'  <rect x="46" y="{y - 22}" width="104" height="44" rx="9" fill="#0E1826" stroke="{AZUL}" stroke-width="1.3" opacity="0.9"/>')
        p.append(f'  <circle cx="68" cy="{y}" r="5" fill="{AZUL}" opacity="0.75"/>')
        p.append(f'  <rect x="82" y="{y - 8}" width="52" height="6" rx="3" fill="{AZUL}" opacity="0.5"/>')
        p.append(f'  <rect x="82" y="{y + 2}" width="34" height="6" rx="3" fill="{AZUL}" opacity="0.28"/>')
        p.append(curva(150, y, 212, 190))
    p += painel(212, 70, 300, 250, titulo_larg=92)
    p += barras(236, 122, 160, 92, [0.42, 0.58, 0.5, 0.72, 0.64, 0.88], destaque=5)
    p += donut(458, 168, 30, 0.72)
    p += serie(236, 234, 252, 56, [0.25, 0.42, 0.33, 0.58, 0.5, 0.72, 0.68, 0.9])
    for i, lx in enumerate([236, 322, 408]):
        p.append(f'  <rect x="{lx}" y="300" width="68" height="6" rx="3" fill="{AZUL}" opacity="{0.4 - i * 0.1}"/>')
    for y in (150, 262):
        p.append(curva(512, 190, 580, y))
        p.append(f'  <rect x="580" y="{y - 24}" width="84" height="48" rx="9" fill="#0E1826" stroke="{CLARO}" stroke-width="1.3" opacity="0.9"/>')
        p.append(f'  <rect x="596" y="{y - 9}" width="44" height="7" rx="3.5" fill="url(#g)"/>')
        p.append(f'  <rect x="596" y="{y + 3}" width="28" height="6" rx="3" fill="{CLARO}" opacity="0.4"/>')
    return '\n'.join(p)


def legado():
    """Banco legado denso dando lugar a pipelines em nuvem."""
    p = []
    for i, cy in enumerate([128, 172, 216]):
        p.append(f'  <ellipse cx="108" cy="{cy}" rx="56" ry="16" fill="none" stroke="{AZUL}" stroke-width="1.5" opacity="{0.6 - i * 0.12}"/>')
    p.append(f'  <path d="M52 128 v88" stroke="{AZUL}" stroke-width="1.5" opacity="0.45"/>')
    p.append(f'  <path d="M164 128 v88" stroke="{AZUL}" stroke-width="1.5" opacity="0.45"/>')
    p.append(f'  <ellipse cx="108" cy="248" rx="56" ry="16" fill="none" stroke="{AZUL}" stroke-width="1.5" opacity="0.4"/>')
    for k in range(7):
        p.append(f'  <rect x="{72 + (k % 4) * 20}" y="{142 + (k // 4) * 22}" width="12" height="12" rx="2" fill="{AZUL}" opacity="{0.2 + (k % 3) * 0.1}"/>')
    p.append(f'  <text x="108" y="298" fill="{AZUL}" opacity="0.6" font-family="monospace" font-size="13" text-anchor="middle">legado</text>')

    p.append(f'  <path d="M186 212 L236 212" stroke="url(#g)" stroke-width="2.4" fill="none"/>')
    p.append(f'  <path d="M228 205 L238 212 L228 219" stroke="{CLARO}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>')

    # nuvem moderna
    p.append(f'  <path d="M300 148 a34 34 0 0 1 66-9 26 26 0 0 1 33 25 24 24 0 0 1-24 24h-72a25 25 0 0 1-3-40Z" '
             f'fill="{AZUL}" opacity="0.1"/>')
    p.append(f'  <path d="M300 148 a34 34 0 0 1 66-9 26 26 0 0 1 33 25 24 24 0 0 1-24 24h-72a25 25 0 0 1-3-40Z" '
             f'fill="none" stroke="url(#g)" stroke-width="2"/>')
    for i, x in enumerate([322, 348, 374]):
        p.append(f'  <circle cx="{x}" cy="155" r="3.4" fill="{CLARO}" opacity="{0.9 - i * 0.2}"/>')
    for x in (322, 348, 374):
        p.append(f'  <path d="M{x} 190 v24" stroke="{AZUL}" stroke-width="1.5" opacity="0.5" stroke-dasharray="3 4"/>')

    # pipelines
    for i, x in enumerate([288, 384, 480]):
        p += painel(x, 214, 84, 96, titulo_larg=34)
        for k in range(3):
            p.append(f'  <rect x="{x + 14}" y="{254 + k * 18}" width="{56 - k * 12}" height="7" rx="3.5" fill="url(#g)" opacity="{0.85 - k * 0.2}"/>')
        if i < 2:
            p.append(linha(x + 84, 262, x + 96, 262, op=0.7, larg=2))
    p += serie(566, 150, 110, 96, [0.2, 0.36, 0.3, 0.52, 0.62, 0.58, 0.82, 0.95], larg=2.4)
    p += barras(566, 262, 110, 48, [0.5, 0.68, 0.58, 0.84, 0.94], destaque=4)
    return '\n'.join(p)


def governanca():
    """Painéis soltos virando uma grade governada."""
    p = []
    soltos = [(48, 110, 82, 54, -8), (144, 88, 72, 48, 6), (56, 192, 88, 56, 5),
              (156, 176, 66, 46, -7), (84, 272, 78, 50, 8)]
    for x, y, w, h, a in soltos:
        cx, cy = x + w / 2, y + h / 2
        p.append(f'  <g transform="rotate({a} {cx} {cy})">'
                 f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="#0E1826" stroke="{AZUL}" stroke-width="1.4" opacity="0.6"/>'
                 f'<rect x="{x + 10}" y="{y + 11}" width="{w - 34}" height="6" rx="3" fill="{AZUL}" opacity="0.45"/>'
                 f'<rect x="{x + 10}" y="{y + 25}" width="{w - 20}" height="5" rx="2.5" fill="{AZUL}" opacity="0.22"/>'
                 f'<rect x="{x + 10}" y="{y + 36}" width="{w - 40}" height="5" rx="2.5" fill="{AZUL}" opacity="0.18"/></g>')
    p.append(f'  <text x="112" y="350" fill="{AZUL}" opacity="0.55" font-family="monospace" font-size="12" text-anchor="middle">200+ sem padrão</text>')
    p.append(f'  <path d="M250 206 L300 206" stroke="url(#g)" stroke-width="2.4" fill="none"/>')
    p.append(f'  <path d="M292 199 L302 206 L292 213" stroke="{CLARO}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>')

    p += painel(330, 70, 332, 288, titulo_larg=96)
    p += barras(352, 122, 132, 74, [0.44, 0.62, 0.54, 0.78, 0.9], destaque=4)
    p += donut(566, 158, 32, 0.84)
    for r in range(2):
        for c in range(3):
            x, y = 352 + c * 102, 220 + r * 66
            p.append(f'  <rect x="{x}" y="{y}" width="86" height="52" rx="8" fill="{AZUL}" opacity="0.07"/>')
            p.append(f'  <rect x="{x}" y="{y}" width="86" height="52" rx="8" fill="none" stroke="{AZUL}" stroke-width="1.3" opacity="0.6"/>')
            p.append(f'  <rect x="{x + 11}" y="{y + 12}" width="38" height="7" rx="3.5" fill="url(#g)" opacity="0.9"/>')
            p.append(f'  <rect x="{x + 11}" y="{y + 27}" width="62" height="5" rx="2.5" fill="{AZUL}" opacity="0.3"/>')
            p.append(f'  <rect x="{x + 11}" y="{y + 37}" width="44" height="5" rx="2.5" fill="{AZUL}" opacity="0.2"/>')
    p.append(f'  <text x="496" y="384" fill="{CLARO}" opacity="0.7" font-family="monospace" font-size="12" text-anchor="middle">1 definição por métrica</text>')
    return '\n'.join(p)




def sla():
    """Fila de chamados virando medidor de prazo."""
    p = []
    for i in range(5):
        y = 108 + i * 42
        p.append(f'  <rect x="52" y="{y}" width="150" height="30" rx="7" fill="#0E1826" stroke="{AZUL}" stroke-width="1.3" opacity="{0.8 - i * 0.1}"/>')
        p.append(f'  <circle cx="70" cy="{y + 15}" r="4" fill="{AZUL}" opacity="0.6"/>')
        p.append(f'  <rect x="84" y="{y + 11}" width="{92 - i * 10}" height="7" rx="3.5" fill="{AZUL}" opacity="0.35"/>')
    p.append(f'  <path d="M222 230 L272 230" stroke="url(#g)" stroke-width="2.4" fill="none"/>')
    p.append(f'  <path d="M264 223 L274 230 L264 237" stroke="{CLARO}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>')
    p += painel(300, 96, 362, 268, titulo_larg=90)
    p += donut(392, 196, 48, 0.92, larg=12)
    p.append(f'  <text x="392" y="204" fill="{CLARO}" font-family="monospace" font-size="20" text-anchor="middle">92%</text>')
    p.append(f'  <text x="392" y="262" fill="{AZUL}" opacity="0.65" font-family="monospace" font-size="12" text-anchor="middle">no prazo</text>')
    p += barras(470, 150, 168, 96, [0.5, 0.64, 0.58, 0.78, 0.7, 0.9], destaque=5)
    p += serie(470, 272, 168, 60, [0.3, 0.5, 0.42, 0.66, 0.74, 0.9])
    return '\n'.join(p)


def consolidacao():
    """Três linhas de negócio entrando num painel só."""
    p = []
    for i, y in enumerate([118, 198, 278]):
        p.append(f'  <rect x="48" y="{y - 26}" width="130" height="52" rx="9" fill="#0E1826" stroke="{AZUL}" stroke-width="1.3" opacity="0.88"/>')
        p.append(f'  <rect x="66" y="{y - 10}" width="{78 - i * 12}" height="7" rx="3.5" fill="url(#g)" opacity="0.8"/>')
        p.append(f'  <rect x="66" y="{y + 2}" width="52" height="6" rx="3" fill="{AZUL}" opacity="0.3"/>')
        p.append(curva(178, y, 268, 198))
    p += painel(268, 92, 394, 276, titulo_larg=104)
    p += barras(294, 146, 200, 110, [0.4, 0.56, 0.48, 0.7, 0.62, 0.84, 0.92], destaque=6)
    p += donut(578, 198, 42, 0.68, larg=11)
    p += serie(294, 282, 342, 66, [0.22, 0.4, 0.34, 0.56, 0.5, 0.72, 0.8, 0.95])
    return '\n'.join(p)


def comercial():
    """Extração pontual virando camada própria."""
    p = []
    p.append(f'  <rect x="54" y="150" width="128" height="94" rx="10" fill="#0E1826" stroke="{AZUL}" stroke-width="1.4" stroke-dasharray="6 5" opacity="0.6"/>')
    for k in range(3):
        p.append(f'  <rect x="74" y="{174 + k * 22}" width="{88 - k * 18}" height="8" rx="4" fill="{AZUL}" opacity="{0.35 - k * 0.08}"/>')
    p.append(f'  <path d="M200 197 L252 197" stroke="url(#g)" stroke-width="2.4" fill="none"/>')
    p.append(f'  <path d="M244 190 L254 197 L244 204" stroke="{CLARO}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>')
    for i, y in enumerate([96, 170, 244]):
        p.append(f'  <rect x="280" y="{y}" width="150" height="58" rx="10" fill="{AZUL}" opacity="0.08"/>')
        p.append(f'  <rect x="280" y="{y}" width="150" height="58" rx="10" fill="none" stroke="{AZUL}" stroke-width="1.4" opacity="0.7"/>')
        p.append(f'  <rect x="298" y="{y + 16}" width="70" height="8" rx="4" fill="url(#g)" opacity="0.9"/>')
        p.append(f'  <rect x="298" y="{y + 32}" width="106" height="6" rx="3" fill="{AZUL}" opacity="0.28"/>')
    p += painel(458, 96, 206, 206, titulo_larg=70)
    p += barras(482, 150, 158, 86, [0.46, 0.62, 0.56, 0.8, 0.94], destaque=4)
    p += serie(482, 250, 158, 40, [0.3, 0.5, 0.44, 0.7, 0.86])
    return '\n'.join(p)


def nps():
    """Voz do cliente virando indicador vivo."""
    p = []
    for i, (x, y) in enumerate([(70, 120), (142, 92), (62, 206), (150, 186), (92, 290)]):
        p.append(f'  <path d="M{x} {y} h68 a9 9 0 0 1 9 9 v30 a9 9 0 0 1-9 9 h-50 l-14 12 v-12 h-4 a9 9 0 0 1-9-9 v-30 a9 9 0 0 1 9-9Z" '
                 f'fill="#0E1826" stroke="{AZUL}" stroke-width="1.3" opacity="{0.75 - i * 0.08}"/>')
        p.append(f'  <rect x="{x + 12}" y="{y + 14}" width="{48 - i * 5}" height="6" rx="3" fill="{AZUL}" opacity="0.4"/>')
    p.append(f'  <path d="M258 206 L306 206" stroke="url(#g)" stroke-width="2.4" fill="none"/>')
    p.append(f'  <path d="M298 199 L308 206 L298 213" stroke="{CLARO}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>')
    p += painel(332, 96, 330, 270, titulo_larg=84)
    p += donut(422, 198, 46, 0.78, larg=12)
    p.append(f'  <text x="422" y="206" fill="{CLARO}" font-family="monospace" font-size="19" text-anchor="middle">NPS</text>')
    p += serie(502, 150, 136, 92, [0.2, 0.35, 0.3, 0.52, 0.64, 0.6, 0.84, 0.94])
    p += barras(502, 268, 136, 62, [0.44, 0.6, 0.54, 0.78, 0.9], destaque=4)
    return '\n'.join(p)


def difusao():
    """Um painel que chega a todas as áreas."""
    p = []
    p += painel(44, 128, 252, 204, titulo_larg=82)
    p += barras(68, 180, 142, 92, [0.44, 0.62, 0.54, 0.76, 0.9], destaque=4)
    p += donut(254, 224, 28, 0.74)
    for i, y in enumerate([92, 162, 232, 302]):
        p.append(curva(296, 230, 392, y + 28))
        p.append(f'  <rect x="392" y="{y}" width="268" height="56" rx="10" fill="#0E1826" stroke="{AZUL}" stroke-width="1.3" opacity="{0.9 - i * 0.07}"/>')
        p.append(f'  <circle cx="420" cy="{y + 28}" r="9" fill="none" stroke="{CLARO}" stroke-width="1.4" opacity="0.8"/>')
        p.append(f'  <rect x="440" y="{y + 17}" width="{128 - i * 14}" height="7" rx="3.5" fill="url(#g)" opacity="0.85"/>')
        p.append(f'  <rect x="440" y="{y + 31}" width="{176 - i * 18}" height="6" rx="3" fill="{AZUL}" opacity="0.26"/>')
    return '\n'.join(p)


def unificacao():
    """Duas ferramentas de BI virando uma."""
    p = []
    for i, y in enumerate([112, 238]):
        p += painel(48, y, 170, 112, titulo_larg=56)
        p += barras(68, y + 48, 128, 48, [0.5, 0.7, 0.58, 0.86], destaque=-1)
        p.append(f'  <path d="M218 {y + 56} C262 {y + 56}, 262 198, 300 198" stroke="url(#g)" stroke-width="2" fill="none" opacity="0.6"/>')
    p.append(f'  <path d="M300 198 L330 198" stroke="url(#g)" stroke-width="2.4" fill="none"/>')
    p.append(f'  <path d="M322 191 L332 198 L322 205" stroke="{CLARO}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>')
    p += painel(354, 92, 308, 276, titulo_larg=96)
    p += barras(380, 146, 180, 104, [0.42, 0.6, 0.52, 0.74, 0.66, 0.92], destaque=5)
    p += donut(606, 198, 34, 0.86)
    p += serie(380, 274, 256, 70, [0.24, 0.42, 0.36, 0.6, 0.72, 0.68, 0.9])
    return '\n'.join(p)


def preditivo():
    """Histórico virando previsão."""
    p = []
    p += painel(52, 100, 610, 262, titulo_larg=104)
    hist = [0.3, 0.42, 0.36, 0.52, 0.46, 0.6, 0.56]
    prev = [0.56, 0.66, 0.62, 0.78, 0.88]
    p += serie(84, 156, 300, 150, hist, larg=2.4)
    n = len(prev)
    pts = [(384 + i * (240 / (n - 1)), 156 + 150 - v * 150) for i, v in enumerate(prev)]
    d = 'M' + ' L'.join(f'{a:.1f} {b:.1f}' for a, b in pts)
    p.append(f'  <path d="{d}" fill="none" stroke="{AZUL}" stroke-width="2.4" stroke-dasharray="7 6" stroke-linecap="round" opacity="0.9"/>')
    p.append(f'  <path d="M384 140 v182" stroke="{AZUL}" stroke-width="1.2" stroke-dasharray="4 5" opacity="0.5"/>')
    p.append(f'  <text x="384" y="336" fill="{AZUL}" opacity="0.6" font-family="monospace" font-size="12" text-anchor="middle">hoje</text>')
    for x, y in pts[1:]:
        p.append(f'  <circle cx="{x:.1f}" cy="{y:.1f}" r="3.6" fill="{CLARO}" opacity="0.9"/>')
    # faixa de incerteza
    p.append(f'  <path d="M384 {156 + 150 - 0.56 * 150:.0f} L624 {156 + 150 - 0.98 * 150:.0f} L624 {156 + 150 - 0.74 * 150:.0f} Z" fill="{AZUL}" opacity="0.1"/>')
    return '\n'.join(p)


def design():
    """Protótipo definindo o padrão antes do painel."""
    p = []
    p.append(f'  <rect x="48" y="104" width="232" height="206" rx="12" fill="none" stroke="{AZUL}" stroke-width="1.5" stroke-dasharray="7 6" opacity="0.65"/>')
    p.append(f'  <text x="164" y="92" fill="{AZUL}" opacity="0.6" font-family="monospace" font-size="12" text-anchor="middle">protótipo</text>')
    for i, (x, y, w, hh) in enumerate([(72, 128, 86, 44), (174, 128, 82, 44), (72, 186, 184, 50), (72, 250, 184, 40)]):
        p.append(f'  <rect x="{x}" y="{y}" width="{w}" height="{hh}" rx="7" fill="none" stroke="{AZUL}" stroke-width="1.3" stroke-dasharray="4 4" opacity="0.6"/>')
        p.append(f'  <rect x="{x + 11}" y="{y + 13}" width="{w // 2}" height="6" rx="3" fill="{AZUL}" opacity="0.3"/>')
    p.append(f'  <path d="M300 206 L348 206" stroke="url(#g)" stroke-width="2.4" fill="none"/>')
    p.append(f'  <path d="M340 199 L350 206 L340 213" stroke="{CLARO}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>')
    p += painel(372, 104, 292, 206, titulo_larg=88)
    p += barras(396, 152, 128, 70, [0.48, 0.66, 0.58, 0.82], destaque=3)
    p += donut(600, 186, 30, 0.8)
    for i in range(2):
        p.append(f'  <rect x="{396 + i * 136}" y="248" width="124" height="44" rx="8" fill="{AZUL}" opacity="0.08"/>')
        p.append(f'  <rect x="{396 + i * 136}" y="248" width="124" height="44" rx="8" fill="none" stroke="{AZUL}" stroke-width="1.3" opacity="0.6"/>')
        p.append(f'  <rect x="{408 + i * 136}" y="262" width="58" height="7" rx="3.5" fill="url(#g)" opacity="0.85"/>')
    return '\n'.join(p)


def diario():
    """Do fechamento mensal ao acompanhamento diário."""
    p = []
    p.append(f'  <rect x="48" y="128" width="176" height="156" rx="11" fill="#0E1826" stroke="{AZUL}" stroke-width="1.4" opacity="0.7"/>')
    p.append(f'  <text x="136" y="116" fill="{AZUL}" opacity="0.6" font-family="monospace" font-size="12" text-anchor="middle">mês</text>')
    for r in range(4):
        for c in range(5):
            on = (r * 5 + c) == 19
            p.append(f'  <rect x="{66 + c * 30}" y="{146 + r * 32}" width="20" height="20" rx="4" '
                     f'fill="{AZUL}" opacity="{0.85 if on else 0.16}"/>')
    p.append(f'  <path d="M244 206 L292 206" stroke="url(#g)" stroke-width="2.4" fill="none"/>')
    p.append(f'  <path d="M284 199 L294 206 L284 213" stroke="{CLARO}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>')
    p.append(f'  <text x="476" y="116" fill="{CLARO}" opacity="0.7" font-family="monospace" font-size="12" text-anchor="middle">dia</text>')
    p += painel(316, 128, 320, 212, titulo_larg=78)
    p += barras(340, 180, 272, 100, [0.4, 0.58, 0.5, 0.72, 0.64, 0.86, 0.78, 0.94], destaque=7)
    p += serie(340, 296, 272, 32, [0.3, 0.5, 0.42, 0.68, 0.6, 0.84, 0.76, 0.95], larg=2)
    return '\n'.join(p)


def operacoes():
    """Três operações numa leitura só."""
    p = []
    rot = [(62, 108), (62, 198), (62, 288)]
    for i, (x, y) in enumerate(rot):
        p.append(f'  <rect x="{x}" y="{y - 28}" width="138" height="56" rx="10" fill="#0E1826" stroke="{AZUL}" stroke-width="1.3" opacity="0.88"/>')
        p.append(f'  <circle cx="{x + 26}" cy="{y}" r="10" fill="none" stroke="{CLARO}" stroke-width="1.4" opacity="0.8"/>')
        p.append(f'  <rect x="{x + 46}" y="{y - 10}" width="{72 - i * 10}" height="7" rx="3.5" fill="url(#g)" opacity="0.85"/>')
        p.append(f'  <rect x="{x + 46}" y="{y + 2}" width="56" height="6" rx="3" fill="{AZUL}" opacity="0.28"/>')
        p.append(curva(200, y, 288, 198))
    p += painel(288, 92, 374, 276, titulo_larg=98)
    p += barras(314, 146, 184, 108, [0.44, 0.6, 0.52, 0.74, 0.68, 0.9], destaque=5)
    p += donut(586, 196, 40, 0.82, larg=11)
    p += serie(314, 280, 324, 68, [0.26, 0.44, 0.38, 0.6, 0.72, 0.66, 0.88, 0.96])
    return '\n'.join(p)



def acessos():
    """Acessos espalhados convergindo numa central, e dela para a auditoria."""
    p = []
    # usuários e sistemas soltos à esquerda
    for i, (x, y) in enumerate([(56, 108), (56, 176), (56, 244), (56, 312)]):
        p.append(f'  <rect x="{x}" y="{y - 24}" width="118" height="48" rx="9" fill="#0E1826" stroke="{AZUL}" stroke-width="1.3" opacity="{0.85 - i * 0.06}"/>')
        p.append(f'  <circle cx="{x + 24}" cy="{y - 4}" r="6" fill="none" stroke="{CLARO}" stroke-width="1.3" opacity="0.8"/>')
        p.append(f'  <path d="M{x + 16} {y + 12} a8 8 0 0 1 16 0" fill="none" stroke="{CLARO}" stroke-width="1.3" opacity="0.8"/>')
        p.append(f'  <rect x="{x + 42}" y="{y - 10}" width="{58 - i * 6}" height="6" rx="3" fill="{AZUL}" opacity="0.4"/>')
        p.append(f'  <rect x="{x + 42}" y="{y + 2}" width="40" height="5" rx="2.5" fill="{AZUL}" opacity="0.22"/>')
        p.append(curva(174, y, 252, 212))
    # a central: um escudo com chave
    p.append(f'  <path d="M310 108 l48 18 v38 c0 30-20 48-48 56-28-8-48-26-48-56v-38Z" fill="{AZUL}" opacity="0.1"/>')
    p.append(f'  <path d="M310 108 l48 18 v38 c0 30-20 48-48 56-28-8-48-26-48-56v-38Z" fill="none" stroke="url(#g)" stroke-width="2"/>')
    p.append(f'  <circle cx="310" cy="168" r="11" fill="none" stroke="{CLARO}" stroke-width="2"/>')
    p.append(f'  <path d="M310 179 v22 M310 192 h9" stroke="{CLARO}" stroke-width="2" stroke-linecap="round"/>')
    p.append(f'  <text x="310" y="252" fill="{AZUL}" opacity="0.65" font-family="monospace" font-size="12" text-anchor="middle">central de acessos</text>')
    p.append(f'  <path d="M370 212 L412 212" stroke="url(#g)" stroke-width="2.4" fill="none"/>')
    p.append(f'  <path d="M404 205 L414 212 L404 219" stroke="{CLARO}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>')
    # painel de auditoria
    p += painel(430, 92, 232, 276, titulo_larg=76)
    p += barras(452, 146, 188, 92, [0.46, 0.64, 0.56, 0.8, 0.9], destaque=4)
    for k in range(4):
        y = 262 + k * 26
        p.append(f'  <rect x="452" y="{y}" width="{150 - k * 16}" height="7" rx="3.5" fill="{AZUL}" opacity="{0.45 - k * 0.08}"/>')
        p.append(f'  <path d="M624 {y + 3.5} m-5 0 l4 4 7-8" stroke="{CLARO}" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>')
    return '\n'.join(p)


def corretora():
    """Faturamento, endossos e comissões num fluxo só."""
    p = []
    etapas = [('faturamento', 60), ('endossos', 270), ('comissões', 480)]
    for i, (rot, x) in enumerate(etapas):
        p += painel(x, 118, 172, 180, titulo_larg=62)
        for k in range(4):
            p.append(f'  <rect x="{x + 18}" y="{162 + k * 26}" width="{128 - k * 20}" height="8" rx="4" '
                     f'fill="url(#g)" opacity="{0.85 - k * 0.16}"/>')
        p.append(f'  <text x="{x + 86}" y="330" fill="{AZUL}" opacity="0.6" font-family="monospace" font-size="12" text-anchor="middle">{rot}</text>')
        if i < 2:
            p.append(f'  <path d="M{x + 180} 208 L{x + 202} 208" stroke="url(#g)" stroke-width="2.4" fill="none"/>')
            p.append(f'  <path d="M{x + 194} 201 L{x + 204} 208 L{x + 194} 215" stroke="{CLARO}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>')
    # moldura: um sistema só em volta das três etapas
    p.append(f'  <rect x="40" y="94" width="632" height="228" rx="16" fill="none" stroke="{CLARO}" stroke-width="1.6" opacity="0.45" stroke-dasharray="9 7"/>')
    p.append(f'  <text x="356" y="372" fill="{CLARO}" opacity="0.7" font-family="monospace" font-size="12" text-anchor="middle">um sistema, três rotinas</text>')
    return '\n'.join(p)


ARTES = [
    ('omnichannel.svg', omnichannel, 'Canais de venda separados convergindo em uma plataforma de dados única'),
    ('legado.svg', legado, 'Um banco de dados legado denso dando lugar a um fluxo de pipelines organizados'),
    ('nuvem.svg', legado, 'Um banco de dados legado denso dando lugar a pipelines em nuvem'),
    ('governanca.svg', governanca, 'Painéis soltos e desalinhados dando lugar a uma grade padronizada'),
    ('sla.svg', sla, 'Fila de chamados dando lugar a um medidor de prazo'),
    ('consolidacao.svg', consolidacao, 'Três linhas de negócio entrando em um painel único'),
    ('comercial.svg', comercial, 'Extração pontual dando lugar a uma camada de dados própria'),
    ('nps.svg', nps, 'Mensagens de clientes virando um indicador acompanhado'),
    ('difusao.svg', difusao, 'Um painel distribuído para todas as áreas da empresa'),
    ('unificacao.svg', unificacao, 'Duas ferramentas de BI convergindo em uma só'),
    ('preditivo.svg', preditivo, 'Histórico de dados estendido por uma projeção'),
    ('design.svg', design, 'Protótipo de interface definindo o padrão do painel final'),
    ('diario.svg', diario, 'Fechamento mensal dando lugar a acompanhamento diário'),
    ('operacoes.svg', operacoes, 'Três operações distintas integradas em um painel'),
    ('acessos.svg', acessos, 'Acessos de várias empresas convergindo para uma central e dela para a auditoria'),
    ('corretora.svg', corretora, 'Faturamento, endossos e comissões encadeados dentro de um sistema só'),
]


def main():
    SAIDA.mkdir(parents=True, exist_ok=True)
    for nome, fn, titulo in ARTES:
        destino = SAIDA / nome
        destino.write_text(moldura(fn(), titulo))
        print('%-20s %5.1f KB' % (nome, destino.stat().st_size / 1024))


if __name__ == '__main__':
    main()
