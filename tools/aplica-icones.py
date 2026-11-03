#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Preenche os slots data-ico do index.html com o conjunto de tools/icones.py.

O SVG fica no HTML, renderizado: não custa nada em tempo de execução e
funciona sem script. Este programa é idempotente — rodar duas vezes dá o
mesmo arquivo —, então é seguro chamar depois de qualquer edição.

Uso:  python3 tools/aplica-icones.py
"""
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from icones import svg, ICONES, ALIASES   # noqa: E402

RAIZ = pathlib.Path(__file__).resolve().parent.parent
ALVO = RAIZ / 'index.html'


def main():
    h = ALVO.read_text()
    slots = re.findall(r'data-ico="([a-z-]+)"', h)
    if not slots:
        sys.exit('nenhum slot data-ico no index.html — marque os lugares primeiro')
    desconhecidos = sorted({s for s in slots if s not in ICONES and s not in ALIASES})
    if desconhecidos:
        sys.exit('slots pedem ícone que não existe: %s' % ', '.join(desconhecidos))

    # <span data-ico="x">…</span>  ->  o miolo vira o svg do conjunto
    def troca(m):
        return m.group('abre') + svg(m.group('nome')) + m.group('fecha')

    novo, n = re.subn(
        r'(?P<abre><span[^>]*data-ico="(?P<nome>[a-z-]+)"[^>]*>)'
        r'(?:\s*<svg.*?</svg>\s*)?'
        r'(?P<fecha></span>)',
        troca, h, flags=re.S)
    ALVO.write_text(novo)
    print('%d slots preenchidos (%d ícones no conjunto)' % (n, len(ICONES)))
    if n != len(slots):
        sys.exit('marquei %d slots mas preenchi %d — algum não casou o padrão' % (len(slots), n))


if __name__ == '__main__':
    main()
