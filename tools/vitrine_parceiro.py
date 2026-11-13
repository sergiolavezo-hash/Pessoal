# -*- coding: utf-8 -*-
"""Vitrine de produtos da página de cada parceiro.

Uma lista com os produtos do fornecedor (com o logo real de cada um) e, ao
lado, onde o produto atua no fluxo do dado (origem, base, dashboards), vindo
do campo 'etapa' do catálogo. Abaixo, a ficha do produto: o que é, o que muda
para o negócio, quando é a melhor escolha, para quem e como a Atlas coloca em
produção, tudo do catálogo (tools/ferramentas.py). Nada é escrito aqui.
"""
import html as H

import logos
import vitrine_core
import ferramentas as fer


def e(t):
    return H.escape(str(t), quote=False)


ETAPA_NOME = {k: (n, d) for k, n, d in fer.ETAPAS}


def _fluxo(i, t):
    etapa = t.get('etapa', 'todas')
    ativos = {'origem': ['origem'], 'base': ['base'], 'dash': ['dash'], 'todas': ['origem', 'base', 'dash']}[etapa]
    nos = []
    for k, nome, _ in fer.ETAPAS:
        on = k in ativos
        miolo = ('<span class="pf-no-l">%s</span>' % logos._anel(t['nome'], '../', 'lg-md')) if on else ''
        nos.append('<div class="nd pf-no%s" id="pf%s%d"><span class="vit-k">%s</span>%s<s class="sk"></s><s class="sk a"></s></div>'
                   % (' core' if on else '', k[0], i, nome, miolo))
    pares = 'pfo%d>pfb%d;pfb%d>pfd%d' % (i, i, i, i)
    if etapa == 'todas':
        legenda = 'Atravessa as três etapas: da origem do dado ao dashboard.'
    else:
        legenda = ETAPA_NOME[etapa][1]
    return ('<div class="cv pf-fluxo" data-fios="%s"><svg class="wires" aria-hidden="true"></svg>%s</div>'
            '<p class="vit-cap">%s</p>' % (pares, ''.join(nos), legenda))


def _ficha(t):
    campos = [('O que muda para o negócio', t.get('negocio')), ('Quando é a melhor escolha', t.get('melhor')),
              ('Para quem', t.get('para')), ('Como a Atlas coloca em produção', t.get('como'))]
    blocos = ''.join('<div class="pf-f"><b>%s</b><p>%s</p></div>' % (r, e(v)) for r, v in campos if v)
    caso = ''
    if t.get('caso'):
        caso = ('<div class="pf-caso"><span class="pf-caso-k">%s <span>Projeto entregue pela Atlas</span></span><p>%s</p></div>'
                % ('<svg viewBox="0 0 24 24" aria-hidden="true" stroke-linecap="round" stroke-linejoin="round"><path d="m4 12 5 5L20 7"/></svg>', e(t['caso'])))
    return '<div class="pf-fichagrid">%s</div>%s' % (blocos, caso)


def secao(produtos):
    nav = ''.join(
        '<li><button class="vit-it" role="tab" id="vt%d" aria-controls="vp%d" aria-selected="%s" type="button">%s<span class="t">%s</span></button></li>'
        % (i, i, 'true' if i == 0 else 'false', logos._anel(t['nome'], '../', 'lg-sm'), e(t['nome']))
        for i, t in enumerate(produtos))
    panes = ''.join('<div class="vit-pane%s" id="vp%d" role="tabpanel" aria-labelledby="vt%d"%s>%s</div>'
                    % (' on' if i == 0 else '', i, i, '' if i == 0 else ' hidden', _fluxo(i, t)) for i, t in enumerate(produtos))
    info = ''.join('<div class="vit-info%s" id="vi%d"><div class="pf-meta"><span>%s</span><span>%s</span></div><h3>%s</h3><p>%s</p>%s</div>'
                   % (' on' if i == 0 else '', i, e(t.get('licenca', '')), e(t.get('modelo', '')), e(t['nome']), e(t.get('oque', '')), _ficha(t))
                   for i, t in enumerate(produtos))
    return '''      <div class="vit reveal d2" id="vit">
        <div class="vit-nav" role="tablist" aria-label="Produtos do parceiro" style="--vit-g:1"><div class="vit-grp"><ul>%s</ul></div></div>
        <div class="vit-stage">
          <div class="vit-win"><div class="vit-bar"><div class="vit-dots" aria-hidden="true"><i></i><i></i><i></i></div><span class="vt" id="vit-tit"></span><span class="vs">Onde atua no fluxo do dado</span></div>%s</div>
          %s
        </div>
      </div>
''' % (nav, panes, info)


def css():
    return '<style>\n' + vitrine_core._ler('core.css') + '\n' + vitrine_core._ler('parceiro.css') + '</style>'


def js():
    return vitrine_core.js('parceiro.js')
