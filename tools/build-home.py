#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Insere a vitrine de IA & Automação na seção #ia-capacidades do index.html.

O index.html continua sendo a fonte das páginas geradas. A vitrine é gerada
aqui, entre marcadores, e build-paginas.py descarta o que está entre eles ao
copiar estilo e script para as outras páginas (cada uma tem a sua própria
vitrine). Rode ANTES de build-paginas.py.

Uso:  python3 tools/build-home.py
"""
import pathlib
import re
import sys

import vitrine_ia

RAIZ = pathlib.Path(__file__).resolve().parent.parent
INDEX = RAIZ / 'index.html'

HTML_I, HTML_F = '<!-- vitrine-ia:html -->', '<!-- /vitrine-ia:html -->'
CSS_I, CSS_F = '<!-- vitrine-ia:css -->', '<!-- /vitrine-ia:css -->'
JS_I, JS_F = '<!-- vitrine-ia:js -->', '<!-- /vitrine-ia:js -->'


def trocar(html, ini, fim, novo, ancora):
    """Substitui o que está entre os marcadores; na primeira vez, cria-os na âncora."""
    bloco = ini + '\n' + novo + '\n' + fim
    if ini in html:
        a = html.index(ini)
        b = html.index(fim, a) + len(fim)
        return html[:a] + bloco + html[b:]
    return ancora(html, bloco)


def main():
    html = INDEX.read_text()

    def na_secao(h, bloco):
        # troca os quatro cartões antigos pela vitrine
        h2, n = re.subn(r'      <div class="pillars four reveal d2">.*?\n      </div>\n(?=\n    </div>\n  </section>\n\n\n  <div class="divider"></div>\n\n\n  <!-- =+ CTA FINAL)',
                        lambda m: '      ' + bloco + '\n', h, count=1, flags=re.S)
        if n != 1:
            sys.exit('não encontrei os cartões de IA para trocar pela vitrine')
        return h2

    html = trocar(html, HTML_I, HTML_F, vitrine_ia.secao(interno=True), na_secao)
    css = '<style id="vitrine-ia-css">\n' + vitrine_ia.css().split('<style>\n', 1)[1]
    html = trocar(html, CSS_I, CSS_F, css, lambda h, b: h.replace('</head>', b + '\n</head>', 1))
    html = trocar(html, JS_I, JS_F, vitrine_ia.js(), lambda h, b: h.replace('</body>', b + '\n</body>', 1))
    INDEX.write_text(html)
    print('index.html  %.1f KB' % (INDEX.stat().st_size / 1024))


if __name__ == '__main__':
    main()
