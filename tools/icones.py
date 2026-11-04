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

Dezoito dos vinte e um vêm do pacote de ícones fornecido pela Atlas
(família de contorno em grade 24, traço 1,7, pontas redondas). Três foram
mantidos do conjunto anterior porque o pacote não traz equivalente
distinto: 'pessoas' viraria o mesmo 'users' de 'time', 'empresa' viraria a
mesma maleta de 'carreira', e 'perfis' perderia a pessoa, que é o que o
nome quer dizer.

Uso:  python3 tools/icones.py        (lista e valida)
      from icones import svg; svg('entrega')
"""
import re
import sys

TRACO = 1.7

# nome -> (corpo do path, rótulo para conferência)
ICONES = {
    # ---- escala e prova ----
    'entrega':    ('<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M8 12l2 2 5-5M8 17h8"/>',
                   'prancheta com visto — projetos entregues'),
    'alcance':    ('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18M5 6h14M5 18h14"/>',
                   'globo — setores atendidos'),
    'time':       ('<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
                   'grupo de pessoas — profissionais alocados'),
    'permanencia':('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
                   'relógio — horas em alocação'),

    # ---- as quatro frentes ----
    'analytics':  ('<path d="M3 3v18h18"/><path d="M8 15v3M13 10v8M18 5v13"/>',
                   'barras em eixo — BI e analytics'),
    'engenharia': ('<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
                   'base de dados — engenharia e cloud'),
    'ia':         ('<path d="M12 4a3 3 0 0 0-5.7 1.2A3.5 3.5 0 0 0 5 12a3.5 3.5 0 0 0 2 6.2A3 3 0 0 0 12 20Z"/><path d="M12 4a3 3 0 0 1 5.7 1.2A3.5 3.5 0 0 1 19 12a3.5 3.5 0 0 1-2 6.2A3 3 0 0 1 12 20ZM8 8h1m-2 5h2m-1 3h1m6-8h1m-1 5h2m-2 3h1M12 4v16"/>',
                   'cérebro em circuito — inteligência artificial'),
    'pessoas':    ('<circle cx="12" cy="7.5" r="3.3"/><path d="M5.5 20.5a6.5 6.5 0 0 1 13 0"/>',
                   'pessoa — alocação'),

    # ---- navegação e conteúdo ----
    'cases':      ('<path d="M3 3v18h18"/><path d="m6 14 4-4 3 2 6-7"/><path d="M15 5h4v4"/>',
                   'linha em alta no eixo — resultados'),
    'essencia':   ('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/><path d="m16 8 5-5m-4 0h4v4"/>',
                   'alvo — nossa essência'),
    'parceiros':  ('<path d="m3 11 4-4 4 1 2-1 4 1 4 4-3 3-3-2-3 2-3-2-3 1-3-3Z"/><path d="m7 7 3-3 4 1 3 3M9 14l3 2 3-2M5 13l-2 2 3 3 2-2M19 13l2 2-3 3-2-2"/>',
                   'aperto de mãos — parceria'),
    'contato':    ('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
                   'envelope — contato'),
    'setores':    ('<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
                   'camadas — setores'),
    'perfis':     ('<circle cx="7" cy="8" r="3"/><path d="M2.5 19.5a4.5 4.5 0 0 1 9 0"/><path d="M15 8.5h6.5M15 12.5h6.5M15 16.5h4"/>',
                   'pessoa e lista — perfis'),
    'carreira':   ('<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/>',
                   'maleta — carreiras'),
    'valores':    ('<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
                   'escudo com visto — valores e método'),
    'numeros':    ('<path d="M4.9 19a9 9 0 1 1 14.2 0"/><path d="m12 13 4-5M7 19h10"/><circle cx="12" cy="13" r="1"/>',
                   'ponteiro — números'),
    'migracao':   ('<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><path d="M9 6h6M18 9v6M6 9v9h9"/>',
                   'fluxo entre blocos — migração de BI'),
    'nuvem':      ('<path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9.5 4.3 4.3 0 0 0 7 18Z"/>',
                   'nuvem — modernização para a nuvem'),
    'empresa':    ('<path d="M3.5 20.5h17"/><path d="M5.5 20.5V6.5L12 3.5v17"/><path d="M12 9.5h6.5v11"/><path d="M8 9h1.2M8 12.5h1.2M8 16h1.2M15 13h1.2M15 16.5h1.2"/>',
                   'prédio — a Atlas'),
    'tempo':      ('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
                   'relógio — permanência'),
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
