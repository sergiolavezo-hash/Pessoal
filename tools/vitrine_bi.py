# -*- coding: utf-8 -*-
"""Vitrine interativa de BI da página Analytics & BI.

Doze entregas em três frentes, cada uma com o seu dashboard de exemplo
(só formas, sem dados reais). O HTML sai daqui, o CSS e o JS ficam em
tools/vitrine_bi/. build-paginas.py troca a seção "As frentes que entregamos"
da página bi-analytics.html por esta.
"""
import io
import os
import re
import importlib.util
from vitrine_bi_panes import P as _P

AQUI = os.path.dirname(os.path.abspath(__file__))

GRUPOS=[('Camada semântica',[
  ('modelagem','Modelagem dimensional','Organizamos o dado em fatos (o que aconteceu) e dimensões (como você quer cortar), no desenho que o BI lê melhor. Os dados de várias fontes passam pelo modelo antes de virarem indicador.','Passe o mouse numa fonte ou num indicador para ver o caminho do dado.'),
  ('qualidade','Definição única por métrica','Cada indicador tem uma única conta, escrita uma vez no modelo. Todos os painéis leem a mesma definição, e a reunião deixa de discutir qual número está certo.','Alterne entre "por conta própria" e "definição única".'),
  ('modernizacao','Regra de negócio versionada','A regra de cada métrica vive no modelo, com histórico. Dá para saber o que mudou e quando, e voltar atrás sem refazer painéis.','Clique numa versão para ver a regra e o resultado.'),
  ('semantica','Catálogo de indicadores','Um lugar para consultar o que cada indicador significa, de onde ele vem e quem responde por ele.','Filtre por área e selecione um indicador.')]),
 ('Dashboards que se usam',[
  ('analytics','Visão executiva e operacional','O mesmo modelo alimenta a leitura de quem decide e o acompanhamento de quem opera, cada um com a visão que precisa.','Alterne a visão e filtre por área.'),
  ('autoatendimento','Self-service para as áreas','As áreas montam a própria pergunta sobre o modelo governado, sem abrir chamado para o time de dados.','Escolha a medida, o corte e o tipo de gráfico.'),
  ('design','Padrão visual definido antes do desenvolvimento','Grade, paleta e tipografia definidas antes do primeiro painel, para todo dashboard nascer com a cara do mesmo produto.','Ligue as guias e troque a paleta.'),
  ('anomalia','Performance e otimização de DAX','Medidas DAX bem escritas e modelo enxuto: o painel responde na hora em que a pessoa filtra, mesmo com o volume crescendo.','Compare o carregamento e rode de novo.')]),
 ('Governança de BI',[
  ('arquitetura','Padrão de nomenclatura e layout','Nomes e posições padronizados: quem abre qualquer painel sabe onde está cada coisa, e painel novo nasce dentro do padrão.','Alterne entre antes e depois.'),
  ('governanca','Controle de acesso por perfil','Cada perfil enxerga só o que precisa, definido por regra e não por exceção.','Clique na matriz para dar ou retirar acesso.'),
  ('migracao','Migração e consolidação de painéis','Painéis dispersos são migrados e consolidados num conjunto padronizado, sobre o mesmo modelo.','Alterne para ver a consolidação.'),
  ('documento','Documentação do modelo','Tabelas, campos e regras descritos para que o time novo entenda o modelo sem depender de quem o criou.','Navegue pelas tabelas do modelo.')])]

def _icones():
    sp = importlib.util.spec_from_file_location('icones', os.path.join(AQUI, 'icones.py'))
    m = importlib.util.module_from_spec(sp)
    sp.loader.exec_module(m)
    return m.ICONES


def _svg(ic, n):
    d = ic[n][0] if isinstance(ic[n], tuple) else ic[n]
    return ('<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" '
            'stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>')


def secao():
    P = dict(_P)
    P[3] = P[3].replace('<div class="cat">', '<div class="cat cv" data-fios=""><svg class="wires" aria-hidden="true"></svg>', 1).replace('  <div class="cv"><svg class="wires" aria-hidden="true"></svg>\n', '  <div>\n', 1)
    P[11] = P[11].replace('<div class="dc" data-fios="t0>d;t1>d;t2>d;t3>d">\n  <div class="cv" style="display:contents"></div>', '<div class="dc cv" data-fios="t0>d;t1>d;t2>d;t3>d"><svg class="wires" aria-hidden="true"></svg>', 1)
    ic = _icones()
    nav = info = panes = ''
    i = 0
    for gn, its in GRUPOS:
        nav += '<div class="vit-grp"><span class="vit-k">%s</span><ul>' % gn
        for ico, t, txt, hint in its:
            nav += ('<li><button class="vit-it" role="tab" id="vt%d" aria-controls="vp%d" aria-selected="%s" type="button">'
                    '<span class="tile-ico" data-ico="%s">%s</span><span class="t">%s</span></button></li>'
                    % (i, i, 'true' if i == 0 else 'false', ico, _svg(ic, ico), t))
            info += ('<div class="vit-info%s" id="vi%d"><span class="vit-k">%s</span><h3>%s</h3><p>%s</p><p class="hint">%s</p></div>'
                     % (' on' if i == 0 else '', i, gn, t, txt, hint))
            panes += ('<div class="vit-pane%s" id="vp%d" role="tabpanel" aria-labelledby="vt%d"%s>%s</div>'
                      % (' on' if i == 0 else '', i, i, '' if i == 0 else ' hidden', P[i]))
            i += 1
        nav += '</ul></div>'
    return '''  <section class="sec" id="perfis">
    <div class="wrap">
      <div class="sec-lead">
        <span class="eyebrow reveal">O que fazemos</span>
        <h2 class="h-xl reveal d1">As frentes que entregamos.</h2>
        <p class="sub reveal d2">Doze entregas, três frentes. Escolha uma e veja como ela aparece num dashboard de verdade: clique, filtre e compare.</p>
      </div>
      <div class="vit reveal d2" id="vit">
        <div class="vit-nav" role="tablist" aria-label="Entregas de Analytics e BI">%s</div>
        <div class="vit-stage">
          <div class="vit-win"><div class="vit-bar"><div class="vit-dots" aria-hidden="true"><i></i><i></i><i></i></div><span class="vt" id="vit-tit"></span><span class="vs">Exemplo ilustrativo &middot; sem dados reais</span></div>%s</div>
          %s
        </div>
      </div>
    </div>
  </section>''' % (nav, panes, info)


def css():
    return '<style>\n' + io.open(os.path.join(AQUI, 'vitrine_bi', 'vit.css'), encoding='utf-8').read() + '</style>'


def js():
    return io.open(os.path.join(AQUI, 'vitrine_bi', 'vit.js'), encoding='utf-8').read()
