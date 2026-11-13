# -*- coding: utf-8 -*-
"""Núcleo da vitrine interativa das páginas de serviço.

Cada página (Analytics & BI, Engenharia de Dados) fornece seus grupos de
entregas, os painéis de cada uma e o JavaScript de cada painel. Aqui ficam a
estrutura (lista de entregas, janela de dashboard, explicação), o CSS comum e
o JavaScript comum: abas, fios que ligam os blocos, e tradução dos textos que
o script escreve depois do carregamento.
"""
import importlib.util
import io
import os

AQUI = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(AQUI, 'vitrine')


def _ler(nome):
    return io.open(os.path.join(ASSETS, nome), encoding='utf-8').read()


def _icones():
    sp = importlib.util.spec_from_file_location('icones', os.path.join(AQUI, 'icones.py'))
    m = importlib.util.module_from_spec(sp)
    sp.loader.exec_module(m)
    return m.ICONES


def _svg(ic, n):
    d = ic[n][0] if isinstance(ic[n], tuple) else ic[n]
    return ('<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" '
            'stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>')


def secao(grupos, paineis, sub, aria, aba_id='perfis', interno=False):
    ic = _icones()
    nav = info = panes = ''
    i = 0
    for gn, its in grupos:
        nav += '<div class="vit-grp"><span class="vit-k">%s</span><ul>' % gn
        for ico, t, txt, hint in its:
            nav += ('<li><button class="vit-it" role="tab" id="vt%d" aria-controls="vp%d" aria-selected="%s" type="button">'
                    '<span class="tile-ico" data-ico="%s">%s</span><span class="t">%s</span></button></li>'
                    % (i, i, 'true' if i == 0 else 'false', ico, _svg(ic, ico), t))
            info += ('<div class="vit-info%s" id="vi%d"><span class="vit-k">%s</span><h3>%s</h3><p>%s</p><p class="hint">%s</p></div>'
                     % (' on' if i == 0 else '', i, gn, t, txt, hint))
            panes += ('<div class="vit-pane%s" id="vp%d" role="tabpanel" aria-labelledby="vt%d"%s>%s</div>'
                      % (' on' if i == 0 else '', i, i, '' if i == 0 else ' hidden', paineis[i]))
            i += 1
        nav += '</ul></div>'
    if interno:
        # só a vitrine, para entrar dentro de uma seção que já tem título (a home)
        return '''<div class="vit reveal d2" id="vit">
        <div class="vit-nav" role="tablist" aria-label="%s" style="--vit-g:%d">%s</div>
        <div class="vit-stage">
          <div class="vit-win"><div class="vit-bar"><div class="vit-dots" aria-hidden="true"><i></i><i></i><i></i></div><span class="vt" id="vit-tit"></span><span class="vs">Exemplo ilustrativo &middot; sem dados reais</span></div>%s</div>
          %s
        </div>
      </div>''' % (aria, len(grupos), nav, panes, info)
    return '''  <section class="sec" id="%s">
    <div class="wrap">
      <div class="sec-lead">
        <span class="eyebrow reveal">O que fazemos</span>
        <h2 class="h-xl reveal d1">As frentes que entregamos.</h2>
        <p class="sub reveal d2">%s</p>
      </div>
      <div class="vit reveal d2" id="vit">
        <div class="vit-nav" role="tablist" aria-label="%s" style="--vit-g:%d">%s</div>
        <div class="vit-stage">
          <div class="vit-win"><div class="vit-bar"><div class="vit-dots" aria-hidden="true"><i></i><i></i><i></i></div><span class="vt" id="vit-tit"></span><span class="vs">Exemplo ilustrativo &middot; sem dados reais</span></div>%s</div>
          %s
        </div>
      </div>
    </div>
  </section>''' % (aba_id, sub, aria, len(grupos), nav, panes, info)


def css(arquivo_css):
    return '<style>\n' + _ler('core.css') + '\n' + _ler(arquivo_css) + '</style>'


def js(arquivo_js):
    return _ler('core_head.js') + _ler(arquivo_js) + _ler('core_tail.js')
