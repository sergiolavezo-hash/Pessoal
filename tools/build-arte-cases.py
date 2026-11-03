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


def omnichannel():
    """Canais separados convergindo numa plataforma só."""
    p = []
    ys = [92, 168, 244, 320]
    for i, y in enumerate(ys):
        p.append(caixa(58, y - 26, 132, 52, op=0.9))
        p.append(ponto(92, y, 3.4, AZUL, 0.9))
        p.append(curva(190, y, 330, 230))
    p.append(caixa(330, 168, 150, 124, preenche=False, r=14))
    p.append(f'  <rect x="330" y="168" width="150" height="124" rx="14" fill="{AZUL}" opacity="0.1"/>')
    for i in range(3):
        p.append(f'  <rect x="352" y="{192 + i * 30}" width="{106 - i * 22}" height="10" rx="5" fill="url(#g)" opacity="{0.85 - i * 0.2}"/>')
    p.append(curva(480, 230, 606, 150))
    p.append(curva(480, 230, 606, 310))
    for y in (150, 310):
        p.append(caixa(606, y - 34, 60, 68, op=0.85))
        p.append(ponto(636, y, 5, CLARO, 0.95))
    return '\n'.join(p)


def legado():
    """Um bloco denso virando um fluxo organizado."""
    p = []
    for c in range(5):
        for r in range(5):
            op = 0.22 + ((c + r) % 3) * 0.12
            p.append(f'  <rect x="{62 + c * 26}" y="{124 + r * 26}" width="18" height="18" rx="3" '
                     f'fill="{AZUL}" opacity="{op}"/>')
    p.append(f'  <rect x="52" y="114" width="150" height="150" rx="12" fill="none" stroke="{AZUL}" '
             f'stroke-width="1.6" stroke-dasharray="5 5" opacity="0.55"/>')
    p.append(f'  <path d="M222 190 L288 190" stroke="url(#g)" stroke-width="2.4" fill="none"/>')
    p.append(f'  <path d="M280 183 L290 190 L280 197" stroke="{CLARO}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>')
    etapas = [(316, 'Ingestão'), (316, None)]
    xs = [316, 436, 556]
    for i, x in enumerate(xs):
        p.append(caixa(x, 120, 92, 140, op=0.9, r=12))
        for k in range(4):
            p.append(f'  <rect x="{x + 16}" y="{146 + k * 26}" width="{60 - k * 8}" height="8" rx="4" '
                     f'fill="url(#g)" opacity="{0.8 - k * 0.15}"/>')
        if i < len(xs) - 1:
            p.append(linha(x + 92, 190, x + 120, 190, op=0.7, larg=2))
    p.append(ponto(362, 300, 4, CLARO, 0.8))
    p.append(ponto(482, 318, 3, AZUL, 0.7))
    p.append(ponto(602, 296, 4, CLARO, 0.75))
    p.append(linha(362, 300, 482, 318, op=0.3))
    p.append(linha(482, 318, 602, 296, op=0.3))
    return '\n'.join(p)


def governanca():
    """Muitos quadros soltos virando uma grade alinhada."""
    p = []
    soltos = [(62, 108, 74, 48, -7), (150, 86, 66, 44, 5), (70, 186, 80, 50, 4),
              (158, 172, 60, 42, -6), (96, 262, 72, 46, 7), (178, 250, 58, 40, -4)]
    for x, y, w, h, a in soltos:
        cx, cy = x + w / 2, y + h / 2
        p.append(f'  <g transform="rotate({a} {cx} {cy})"><rect x="{x}" y="{y}" width="{w}" height="{h}" '
                 f'rx="7" fill="none" stroke="{AZUL}" stroke-width="1.5" opacity="0.5"/>'
                 f'<rect x="{x + 9}" y="{y + 12}" width="{w - 30}" height="6" rx="3" fill="{AZUL}" opacity="0.4"/>'
                 f'<rect x="{x + 9}" y="{y + 26}" width="{w - 18}" height="6" rx="3" fill="{AZUL}" opacity="0.25"/></g>')
    p.append(f'  <path d="M268 200 L330 200" stroke="url(#g)" stroke-width="2.4" fill="none"/>')
    p.append(f'  <path d="M322 193 L332 200 L322 207" stroke="{CLARO}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>')
    for c in range(3):
        for r in range(3):
            x, y = 364 + c * 102, 104 + r * 66
            p.append(f'  <rect x="{x}" y="{y}" width="86" height="50" rx="8" fill="{AZUL}" opacity="0.08"/>')
            p.append(f'  <rect x="{x}" y="{y}" width="86" height="50" rx="8" fill="none" stroke="{AZUL}" stroke-width="1.5" opacity="0.75"/>')
            p.append(f'  <rect x="{x + 11}" y="{y + 13}" width="40" height="6" rx="3" fill="url(#g)" opacity="0.9"/>')
            p.append(f'  <rect x="{x + 11}" y="{y + 28}" width="64" height="6" rx="3" fill="{AZUL}" opacity="0.35"/>')
    p.append(f'  <rect x="352" y="92" width="314" height="206" rx="14" fill="none" stroke="{CLARO}" '
             f'stroke-width="1.6" opacity="0.5"/>')
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
