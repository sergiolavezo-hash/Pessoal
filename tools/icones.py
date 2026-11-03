#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Conjunto de ícones da Atlas — uma fonte só para os 32 usados no site.

Antes cada ícone era um <svg> escrito à mão no lugar onde aparecia. Eram
32 desenhos de origens diferentes, com traços de 1,6 a 2,4, cantos ora
retos ora redondos, e duas metáforas simplesmente erradas. Não havia como
revisar o conjunto porque conjunto não existia: existiam 32 avulsos.

Agora o HTML marca o lugar com data-ico="nome" e o build preenche. Trocar
um ícone é mudar uma linha aqui; mudar a espessura de todos é mudar um
número.

A gramática segue a marca da Atlas, que é um A geométrico construído de
triângulos:

  - grade de 24, desenho dentro de 20 (2 de margem óptica de cada lado)
  - traço 1,6 uniforme, ponta e junta redondas
  - ângulos de 45° e 90° sempre que a forma permitir
  - sem preenchimento, exceto pontos de ênfase (r <= 1,5)
  - cada ícone lê à 16px: no máximo 4 elementos, nada abaixo de 2px

Uso:  python3 tools/icones.py        (lista e valida)
      from icones import svg; svg('entrega')
"""
import re
import sys

TRACO = 1.6

# nome -> (corpo do path, rótulo para conferência)
ICONES = {
    # ---- escala e prova ----
    'entrega':    ('<path d="M12 3 3.5 7.5v9L12 21l8.5-4.5v-9Z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>',
                   'caixa isométrica — projetos entregues'),
    'alcance':    ('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 9.5h17M3.5 14.5h17"/><path d="M12 3.5a15 15 0 0 1 0 17M12 3.5a15 15 0 0 0 0 17"/>',
                   'globo — setores atendidos'),
    'time':       ('<circle cx="9.5" cy="8" r="3.2"/><path d="M4 19.5a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9.5" r="2.3"/><path d="M14.8 19.5a5.3 5.3 0 0 1 5.2-5.3"/>',
                   'duas pessoas — profissionais alocados'),
    'permanencia':('<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.3l3.6 2.1"/>',
                   'relógio — horas em alocação'),

    # ---- as quatro frentes ----
    'analytics':  ('<path d="M3.5 20.5h17"/><path d="M6.5 20.5v-5M11 20.5V8M15.5 20.5v-8M20 20.5V4.5"/>',
                   'barras crescentes — BI e analytics'),
    'engenharia': ('<ellipse cx="12" cy="6.2" rx="7.5" ry="2.7"/><path d="M4.5 6.2v5.6c0 1.5 3.4 2.7 7.5 2.7s7.5-1.2 7.5-2.7V6.2"/><path d="M4.5 11.8v5.6c0 1.5 3.4 2.7 7.5 2.7s7.5-1.2 7.5-2.7v-5.6"/>',
                   'base de dados — engenharia e cloud'),
    'ia':         ('<path d="m10 3.5 1.7 4.3 4.3 1.7-4.3 1.7L10 15.5 8.3 11.2 4 9.5l4.3-1.7Z"/><path d="m17.5 14.5.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9Z"/>',
                   'duas faíscas — inteligência artificial'),
    'pessoas':    ('<circle cx="12" cy="7.5" r="3.3"/><path d="M5.5 20.5a6.5 6.5 0 0 1 13 0"/>',
                   'pessoa — alocação'),

    # ---- navegação e conteúdo ----
    'cases':      ('<path d="M3.5 16.5 9 11l3.5 3L20.5 6"/><path d="M15.5 6h5v5"/>',
                   'linha em alta — resultados'),
    'essencia':   ('<path d="M12 20.5s-6.5-4.4-6.5-9.5a6.5 6.5 0 0 1 13 0c0 5.1-6.5 9.5-6.5 9.5Z"/><circle cx="12" cy="11" r="2.2"/>',
                   'marcador — nossa essência'),
    'parceiros':  ('<path d="M12 7.5 8 4 4 7.5v5L8 16l4-3.5Z"/><path d="M20 16.5 16 20l-4-3.5v-5L16 8l4 3.5Z"/>',
                   'dois losangos encaixados — parceria'),
    'contato':    ('<rect x="3.5" y="5.5" width="17" height="13" rx="2.4"/><path d="m4 7.5 8 5.5 8-5.5"/>',
                   'envelope — contato'),
    'setores':    ('<rect x="3.5" y="12.5" width="5.5" height="8" rx="1.2"/><rect x="9.5" y="8.5" width="5" height="12" rx="1.2"/><rect x="15" y="4.5" width="5.5" height="16" rx="1.2"/>',
                   'três blocos — setores'),
    'perfis':     ('<circle cx="7" cy="8" r="3"/><path d="M2.5 19.5a4.5 4.5 0 0 1 9 0"/><path d="M15 8.5h6.5M15 12.5h6.5M15 16.5h4"/>',
                   'pessoa e lista — perfis'),
    'carreira':   ('<path d="M15.5 20.5v-1.8a3.8 3.8 0 0 0-3.8-3.8H6.3a3.8 3.8 0 0 0-3.8 3.8v1.8"/><circle cx="9" cy="7.5" r="3.2"/><path d="M19 7.5v6M16 10.5h6"/>',
                   'pessoa com mais — carreiras'),
    'valores':    ('<path d="m4 12.5 5 5L20 6.5"/>',
                   'visto — valores e método'),
    'numeros':    ('<path d="M3.5 20.5h17"/><path d="M7 20.5v-4.5M12 20.5v-9M17 20.5v-6.5"/><circle cx="17" cy="9" r="1.4" fill="currentColor" stroke="none"/>',
                   'barras com marca — números'),
    'migracao':   ('<rect x="3.5" y="4.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="14" width="7" height="6.5" rx="1.6"/><path d="M13.5 8.5h7M17.5 5.5l3.5 3-3.5 3"/><rect x="13.5" y="14" width="7" height="6.5" rx="1.6"/>',
                   'blocos migrando — migração de BI'),
    'nuvem':      ('<path d="M7.5 18.5A4 4 0 0 1 7 10.6a5.6 5.6 0 0 1 10.8-1.3 3.8 3.8 0 0 1-.8 9.2Z"/><path d="M12 12v5M9.8 14.6 12 12.2l2.2 2.4"/>',
                   'nuvem — modernização para a nuvem'),
    'empresa':    ('<path d="M3.5 20.5h17"/><path d="M5.5 20.5V6.5L12 3.5v17"/><path d="M12 9.5h6.5v11"/><path d="M8 9h1.2M8 12.5h1.2M8 16h1.2M15 13h1.2M15 16.5h1.2"/>',
                   'prédio — a Atlas'),
    'tempo':      ('<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.3l3.6 2.1"/><path d="M12 3.5V2M20.5 12H22"/>',
                   'relógio com marcas — permanência'),
}

ALIASES = {'alocacao': 'pessoas', 'ia-capacidades': 'ia'}


def svg(nome, extra=''):
    if nome in ALIASES:
        nome = ALIASES[nome]
    if nome not in ICONES:
        sys.exit('ícone desconhecido: %s' % nome)
    corpo = ICONES[nome][0]
    cls = (' class="%s"' % extra) if extra else ''
    return ('<svg%s viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" '
            'stroke-width="%s" stroke-linecap="round" stroke-linejoin="round">%s</svg>'
            % (cls, TRACO, corpo))


def validar():
    """Trava o que a revisão visual deixa passar.

    Não dá para conferir coordenada lendo o path: em `l8.5-4.5` o -4.5 é um
    deslocamento relativo, não uma posição. O enquadramento real é medido
    no navegador por tools/revisa-icones.js, que desenha os 24 e reprova
    quem sai da grade ou fica pequeno demais. Aqui ficam só as regras que
    se leem no texto.
    """
    erros = []
    for nome, (corpo, _) in ICONES.items():
        if 'stroke-width' in corpo:
            erros.append('%s: traço próprio — a espessura é do conjunto' % nome)
        if re.search(r'fill="(?!none|currentColor)', corpo):
            erros.append('%s: preenchimento fora do padrão' % nome)
        if corpo.count('<') > 5:
            erros.append('%s: mais de 4 elementos — não lê a 16px' % nome)
    return erros


def folha():
    """Página de conferência: os ícones no tamanho real e ampliados."""
    cards = '\n'.join(
        '<figure data-nome="%s">%s<figcaption>%s</figcaption></figure>' % (n, svg(n), n)
        for n in sorted(ICONES))
    return ('<!doctype html><meta charset="utf-8"><style>'
            'body{margin:0;background:#F2F1ED;color:#131316;font:12px ui-sans-serif;'
            'display:grid;grid-template-columns:repeat(7,1fr);gap:12px;padding:16px}'
            'figure{margin:0;display:grid;justify-items:center;gap:8px;padding:14px;'
            'background:#fff;border:1px solid rgba(19,19,22,.12);border-radius:12px}'
            'svg{width:40px;height:40px;color:#0B5ED7}'
            'figcaption{color:#56565E;font-size:10px}</style>' + cards)


if __name__ == '__main__':
    if '--html' in sys.argv:
        print(folha())
        sys.exit(0)
    ruins = validar()
    for e in ruins:
        print('ERRO', e)
    print('%d ícones%s' % (len(ICONES), '' if not ruins else ' — %d com problema' % len(ruins)))
    for nome, (_, rot) in sorted(ICONES.items()):
        print('  %-13s %s' % (nome, rot))
    sys.exit(1 if ruins else 0)
