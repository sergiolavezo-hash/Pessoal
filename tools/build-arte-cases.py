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




ARTES = [
    ('omnichannel.svg', omnichannel, 'Canais de venda separados convergindo em uma plataforma de dados única'),
    ('legado.svg', legado, 'Um banco de dados legado denso dando lugar a um fluxo de pipelines organizados'),
    ('governanca.svg', governanca, 'Painéis soltos e desalinhados dando lugar a uma grade padronizada'),
]


def main():
    SAIDA.mkdir(parents=True, exist_ok=True)
    for nome, fn, titulo in ARTES:
        destino = SAIDA / nome
        destino.write_text(moldura(fn(), titulo))
        print('%-20s %5.1f KB' % (nome, destino.stat().st_size / 1024))


if __name__ == '__main__':
    main()
