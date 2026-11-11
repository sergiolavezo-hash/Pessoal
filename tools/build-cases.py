#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gera tudo que fala de case a partir de tools/cases.json.

Três saídas de uma fonte só:
  - o carrossel da home, escrito entre os marcadores do index.html
  - cases-de-sucesso.html, o índice dos treze
  - cases/<slug>.html, uma página por case

Antes os treze viviam escritos à mão dentro do index e a página de índice
os pescava de lá por expressão regular. Bastou o carrossel trocar uma
classe para o pescador voltar com dez. Agora o HTML é saída, não fonte.

Uso:  python3 tools/build-cases.py
"""
import html as H
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from importlib import import_module
bp = import_module('build-paginas')

RAIZ = bp.RAIZ
SITE = bp.SITE
DADOS = RAIZ / 'tools' / 'cases.json'
PASTA = RAIZ / 'cases'
INDICE = 'cases-de-sucesso.html'

TITULO_SEC = 'Investindo no sucesso dos nossos clientes'
LEAD_SEC = ('Nosso portfólio reflete foco e excelência em arquitetura de dados, nuvem e '
            'inteligência artificial, transformando visão estratégica em valor de longo prazo.')


def e(s):
    return H.escape(s, quote=True)


def arte(c, classe='case-art'):
    return ('<figure class="%s">\n          <img src="%smedia/cases/%s.svg" alt="%s" loading="lazy" decoding="async">\n        </figure>'
            % (classe, c.get('base', ''), c['arte'], e(c['capa'])))


# ------------------------------------------------------------ carrossel
def cartao(c):
    """Cartão de capa: arte, setor, título, chamada e o link para o case."""
    setor = c.get('setor') or (c['meta'][0] if c.get('meta') else 'Projeto entregue')
    etiquetas = c.get('meta', [])[1:] if c.get('meta') else c.get('stack', [])[:2]
    chips = ''.join('<span>%s</span>' % e(t) for t in etiquetas[:2])
    ad = ''
    if c.get('antes') and c.get('depois'):
        a = c['antes'][1] if isinstance(c['antes'], (list, tuple)) else c['antes']
        d = c['depois'][1] if isinstance(c['depois'], (list, tuple)) else c['depois']
        ad = ('\n          <p class="cc-ad"><span class="cc-a">%s</span><i aria-hidden="true">&rarr;</i>'
              '<span class="cc-d">%s</span></p>' % (e(a), e(d)))
    return '''      <article class="cc">
        <figure class="cc-art"><img src="media/cases/%(arte)s.svg" alt="%(alt)s" loading="lazy" decoding="async"></figure>
        <div class="cc-corpo">
          <p class="cc-setor">%(setor)s</p>
          <h3 class="cc-t">%(titulo)s</h3>
          <p class="cc-cap">%(capa)s</p>%(ad)s
          <div class="cc-chips">%(chips)s</div>
          <a class="cc-link" href="cases/%(slug)s.html">Ver case <span class="arr">&rarr;</span></a>
        </div>
      </article>''' % dict(arte=c['arte'], alt=e(c['capa']), setor=e(setor), titulo=e(c['titulo']),
                           capa=e(c['capa']), ad=ad, chips=chips, slug=c['slug'])


def carrossel(cases):
    cartoes = '\n'.join(cartao(c) for c in cases)
    return '''  <!-- cases:inicio — gerado por tools/build-cases.py, não editar à mão -->
  <div class="carr" id="carr-cases">
    <div class="carr-trilho" id="carr-trilho" tabindex="0" role="group" aria-label="Projetos entregues">
%s
    </div>
    <div class="carr-progresso" id="carr-progresso" aria-hidden="true"><i></i></div>
    <div class="carr-barra">
      <div class="carr-pontos" id="carr-pontos"></div>
      <button class="carr-seta" id="carr-ant" type="button" aria-label="Case anterior">
        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      <button class="carr-seta" id="carr-prox" type="button" aria-label="Próximo case">
        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </button>
    </div>
  </div>
  <!-- cases:fim -->''' % cartoes


def destaque(c):
    """Slide do carrossel de destaque: texto à esquerda, arte à direita."""
    chips = ''.join('<span>%s</span>' % e(t) for t in c['categorias'])
    return (
        '      <article class="dest">\n'
        '        <div class="dest-txt">\n'
        '          <p class="dest-setor">%s</p>\n'
        '          <h3 class="dest-t">%s</h3>\n'
        '          <p class="dest-cap">%s</p>\n'
        '          <div class="dest-chips">%s</div>\n'
        '          <a class="dest-link" href="cases/%s.html">Continuar lendo <span class="arr">&rarr;</span></a>\n'
        '        </div>\n'
        '        <figure class="dest-art"><img src="media/cases/%s.svg" alt="%s" loading="lazy" decoding="async"></figure>\n'
        '      </article>' % (e(c.get('setor') or (c['meta'][0] if c.get('meta') else '')),
                             e(c['titulo']), e(c['capa']), chips, c['slug'], c['arte'], e(c['capa'])))


def cartao_grade(c):
    chips = ''.join('<span>%s</span>' % e(t) for t in c['categorias'][:2])
    return (
        '        <a class="gc" href="cases/%s.html" data-cats="%s">\n'
        '          <img src="media/cases/%s.svg" alt="" loading="lazy" decoding="async">\n'
        '          <div class="gc-corpo">\n'
        '            <p class="gc-setor">%s</p>\n'
        '            <h3 class="gc-t">%s</h3>\n'
        '            <p class="gc-cap">%s</p>\n'
        '            <div class="gc-chips">%s</div>\n'
        '            <span class="gc-link">Ver estudo de caso completo <span class="arr">&rarr;</span></span>\n'
        '          </div>\n'
        '        </a>' % (c['slug'], e(' '.join(c['categorias'])), c['arte'],
                         e(c.get('setor') or (c['meta'][0] if c.get('meta') else '')),
                         e(c['titulo']), e(c['capa']), chips))


def corpo_indice(cases):
    destaques = [c for c in cases if c.get('destaque')] or cases[:3]
    cats = []
    for c in cases:
        for k in c['categorias']:
            if k not in cats:
                cats.append(k)
    botoes = ''.join(
        '        <button class="filtro" type="button" data-cat="%s"%s>%s</button>\n'
        % (e(k), ' aria-pressed="true"' if i == 0 else ' aria-pressed="false"', e(k))
        for i, k in enumerate(['Todos'] + sorted(cats)))
    return (
        '<main id="inicio">\n\n'
        '  <section class="sec caso-hero">\n'
        '    <div class="wrap">\n'
        '      <span class="pill" data-ico="cases">Histórias de sucesso</span>\n'
        '      <h1 class="h-xl">%(titulo)s</h1>\n'
        '      <p class="sub">%(lead)s</p>\n'
        '    </div>\n'
        '  </section>\n\n'
        '  <section class="sec" style="padding-top:0">\n'
        '    <div class="wrap">\n'
        '      <div class="dest-carr" id="dest-carr">\n'
        '        <div class="dest-trilho" id="dest-trilho" role="group" aria-label="Projetos em destaque">\n'
        '%(destaques)s\n'
        '        </div>\n'
        '        <div class="carr-progresso" id="dest-progresso" aria-hidden="true"><i></i></div>\n'
        '        <div class="carr-barra">\n'
        '          <div class="carr-pontos" id="dest-pontos"></div>\n'
        '          <button class="carr-seta" id="dest-ant" type="button" aria-label="Case anterior">\n'
        '            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>\n'
        '          </button>\n'
        '          <button class="carr-seta" id="dest-prox" type="button" aria-label="Próximo case">\n'
        '            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>\n'
        '          </button>\n'
        '        </div>\n'
        '      </div>\n'
        '    </div>\n'
        '  </section>\n\n'
        '  <div class="divider"></div>\n\n'
        '  <section class="sec" id="cases">\n'
        '    <div class="wrap">\n'
        '      <h2 class="h-xl" style="max-width:none">Todos os cases de sucesso</h2>\n'
        '      <p class="filtro-k">Categorias</p>\n'
        '      <div class="filtros" id="filtros" role="group" aria-label="Filtrar por categoria">\n'
        '%(botoes)s      </div>\n'
        '      <p class="filtro-conta" id="filtro-conta" aria-live="polite"></p>\n'
        '      <div class="grade" id="grade">\n'
        '%(grade)s\n'
        '      </div>\n'
        '      <div class="hero-ctas" style="margin-top:2.8rem">\n'
        '        <a class="btn btn-accent" href="index.html#contato" data-magnetic>Falar com um especialista <span class="arr">&rarr;</span></a>\n'
        '      </div>\n'
        '    </div>\n'
        '  </section>\n'
        '</main>' % dict(titulo=TITULO_SEC, lead=LEAD_SEC,
                         destaques='\n'.join(destaque(c) for c in destaques),
                         botoes=botoes,
                         grade='\n'.join(cartao_grade(c) for c in cases)))


# ------------------------------------------------- página de um case
def lista(itens):
    return '\n'.join('            <li>%s</li>' % e(i) for i in itens)


def campo(rotulo, itens):
    """Uma linha da ficha do projeto: rótulo e as etiquetas do valor."""
    if not itens:
        return ''
    chips = ''.join('<span>%s</span>' % e(i) for i in itens)
    return ('          <div class="inf-campo">\n'
            '            <dt>%s</dt>\n'
            '            <dd>%s</dd>\n'
            '          </div>\n' % (e(rotulo), chips))


def corpo_case(c, cases):
    """Segue o modelo da referência: desafios, solução e resultados na coluna
    principal; parceiros, tecnologias e áreas de atuação na ficha lateral."""
    outros = [o for o in cases if o['slug'] != c['slug']][:3]
    setor = c.get('setor') or (c['meta'][0] if c.get('meta') else 'Projeto entregue')

    def bloco(titulo, miolo):
        return ('      <section class="caso-bloco reveal">\n        <h2>%s</h2>\n%s\n      </section>\n'
                % (titulo, miolo))

    partes = []

    if c.get('antes') and c.get('depois'):
        if isinstance(c['antes'], (list, tuple)):
            an, atx = c['antes'][1], c['antes'][2]
            dn, dtx = c['depois'][1], c['depois'][2]
        else:
            an, atx, dn, dtx = c['antes'], '', c['depois'], ''
        partes.append(
            '      <div class="ad reveal" aria-label="Antes e depois">\n'
            '        <div class="ad-lado"><p class="ad-k">Antes</p><p class="ad-n">%s</p><p class="ad-d">%s</p></div>\n'
            '        <span class="ad-seta" aria-hidden="true">&rarr;</span>\n'
            '        <div class="ad-lado ad-pos"><p class="ad-k">Depois</p><p class="ad-n">%s</p><p class="ad-d">%s</p></div>\n'
            '      </div>\n' % (e(an), e(atx), e(dn), e(dtx)))

    if c.get('desafios'):
        partes.append(bloco('Desafios', '        <ul class="caso-lista">\n%s\n        </ul>' % lista(c['desafios'])))
    if c.get('solucao'):
        partes.append(bloco('Solução', '        <p>%s</p>' % e(c['solucao'])))
    # A arquitetura só vira bloco quando diz algo além da solução: em vários
    # cases os dois campos foram escritos com a mesma frase, e repetir o
    # parágrafo com outro título não informa nada.
    arq = c.get('campos', {}).get('Arquitetura', '')
    if arq and arq.rstrip('.').lower() not in c.get('solucao', '').lower():
        partes.append(bloco('Arquitetura', '        <p>%s</p>' % e(arq)))

    if c.get('mudou'):
        itens = '\n'.join('            <li><b>%s</b> %s</li>' % (e(a), e(b)) for a, b in c['mudou'])
    else:
        itens = lista(c.get('resultados', []))
    if itens.strip():
        partes.append(bloco('Resultados', '        <ul class="caso-lista caso-res">\n%s\n        </ul>' % itens))

    info = (campo('Parceiros', c.get('parceiros'))
            + campo('Tecnologias', c.get('tecnologias'))
            + campo('Áreas de atuação', c.get('areas'))
            + campo('Setor', [setor]))

    relacionados = '\n'.join(
        '        <a class="rel" href="%s.html">\n'
        '          <img src="../media/cases/%s.svg" alt="" loading="lazy" decoding="async">\n'
        '          <span><b>%s</b><small>%s</small></span>\n'
        '        </a>' % (o['slug'], o['arte'], e(o['titulo']),
                          e(o.get('setor') or (o['meta'][0] if o.get('meta') else '')))
        for o in outros)

    return (
        '<main id="inicio">\n\n'
        '  <section class="caso-topo">\n'
        '    <div class="wrap">\n'
        '      <a class="voltar" href="../%(indice)s"><span aria-hidden="true">&larr;</span> Voltar para cases</a>\n'
        '    </div>\n'
        '    <figure class="caso-capa">\n'
        '      <img src="../media/cases/%(arte)s.svg" alt="%(alt)s">\n'
        '    </figure>\n'
        '    <div class="wrap">\n'
        '      <p class="caso-eyebrow">Case de sucesso &mdash; cliente confidencial</p>\n'
        '      <h1 class="h-xl">%(titulo)s</h1>\n'
        '      <p class="sub caso-lead">%(capa)s</p>\n'
        '    </div>\n'
        '  </section>\n\n'
        '  <section class="sec caso-corpo">\n'
        '    <div class="wrap caso-grid">\n'
        '      <div class="caso-main">\n%(partes)s      </div>\n\n'
        '      <aside class="caso-info reveal d1">\n'
        '        <h2>Informações do projeto</h2>\n'
        '        <dl>\n%(info)s        </dl>\n'
        '        <p class="inf-nota">Nome do cliente preservado por confidencialidade.</p>\n'
        '      </aside>\n'
        '    </div>\n'
        '  </section>\n\n'
        '  <div class="divider"></div>\n\n'
        '  <section class="sec final">\n'
        '    <div class="wrap">\n'
        '      <h2>Entre em contato</h2>\n'
        '      <p class="sub">Conte o seu cenário para quem vai executar. Em 30 minutos mapeamos o caminho &mdash; mesmo que ele não passe pela gente.</p>\n'
        '      <div class="hero-ctas">\n'
        '        <a class="btn btn-accent" href="../index.html#contato" data-magnetic>Falar com um especialista <span class="arr">&rarr;</span></a>\n'
        '        <a class="btn btn-line" href="../%(indice)s" data-magnetic>Ver todos os cases <span class="arr">&rarr;</span></a>\n'
        '      </div>\n'
        '    </div>\n'
        '  </section>\n\n'
        '  <div class="divider"></div>\n\n'
        '  <section class="sec">\n'
        '    <div class="wrap">\n'
        '      <h2 class="cases-more-head">Outros projetos</h2>\n'
        '      <div class="rels">\n%(rel)s\n      </div>\n'
        '    </div>\n'
        '  </section>\n'
        '</main>'
        % dict(indice=INDICE, titulo=e(c['titulo']), capa=e(c['capa']), arte=c['arte'],
               alt=e(c['capa']), partes=''.join(partes), info=info, rel=relacionados))


CSS_CASO = '''<style>
  /* Página de case no modelo da referência: capa larga, corpo em duas
     colunas e a ficha do projeto na lateral, grudada no scroll. */
  .caso-topo { padding-top: 6.5rem; }
  .voltar { display: inline-flex; align-items: center; gap: 0.5rem; text-decoration: none; color: var(--dim); font-family: var(--mono); font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 1.6rem; transition: color 0.25s var(--ease); }
  .voltar:hover { color: var(--accent); }
  /* Sem fio em cima e embaixo: eram duas reguas de tela cheia na familia
     de cor da grade do fundo, em fase 12,6 e 22,6, e cortavam a celula do
     lado de fora da imagem. A propria foto ja e a fronteira visual. */
  .caso-capa { margin: 0 0 2.4rem; line-height: 0; }
  .caso-capa img { width: 100%; height: clamp(220px, 32vw, 400px); object-fit: cover; display: block; }
  .caso-eyebrow { font-family: var(--mono); font-size: 0.68rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--accent); }
  .caso-topo .h-xl { max-width: 24ch; }
  .caso-lead { max-width: 54ch; }
  .caso-corpo { padding-top: 3rem; }
  .caso-grid { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(0, 0.9fr); gap: clamp(2rem, 5vw, 4rem); align-items: start; }
  .caso-bloco + .caso-bloco { margin-top: 2.6rem; }
  .caso-bloco h2 { font-size: clamp(1.4rem, 2.4vw, 1.8rem); font-weight: 500; margin-bottom: 1rem; }
  .caso-bloco p { color: var(--muted); font-size: 1.02rem; }
  .caso-lista { list-style: none; display: grid; gap: 0.9rem; }
  .caso-lista li { position: relative; padding-left: 1.6rem; color: var(--muted); font-size: 1rem; line-height: 1.6; }
  .caso-lista li::before { content: ''; position: absolute; left: 0; top: 0.62em; width: 7px; height: 7px; border-radius: 2px; background: var(--accent); }
  .caso-lista b { color: var(--ink); font-weight: 600; }
  .caso-main .ad { margin-bottom: 2.6rem; }
  /* O CTA de rodapé não pode gritar mais que o h1 da própria página. */
  .caso-topo ~ .final h2 { font-size: clamp(1.7rem, 3.4vw, 2.4rem); }

  /* Ficha do projeto */
  .caso-info { position: sticky; top: 6rem; background: var(--panel); border: 1px solid var(--line); border-radius: 18px; padding: clamp(1.4rem, 3vw, 1.9rem); }
  .caso-info > h2 { font-family: var(--mono); font-size: 0.68rem; font-weight: 500; letter-spacing: 0.2em; text-transform: uppercase; color: var(--dim); margin-bottom: 1.4rem; }
  .caso-info dl { display: grid; gap: 1.3rem; }
  .inf-campo dt { font-family: var(--display); font-size: 0.95rem; font-weight: 600; color: var(--ink); margin-bottom: 0.6rem; }
  .inf-campo dd { display: flex; flex-wrap: wrap; gap: 0.35rem; margin: 0; }
  .inf-campo dd span { font-size: 0.78rem; color: var(--muted); background: var(--panel-2); border: 1px solid var(--line); border-radius: 999px; padding: 0.28rem 0.7rem; }
  .inf-nota { border-top: 1px solid var(--line-soft); margin-top: 1.5rem; padding-top: 1rem; color: var(--dim); font-size: 0.8rem; }

  .rels { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; margin-top: 1.4rem; }
  .rel { display: grid; gap: 0.9rem; text-decoration: none; background: var(--panel); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; align-content: start; transition: border-color 0.3s var(--ease), transform 0.3s var(--ease); }
  .rel:hover { border-color: rgba(46,134,255,0.45); transform: translateY(-3px); }
  .rel img { width: 100%; height: 118px; object-fit: cover; display: block; }
  .rel span { display: block; padding: 0 1.1rem 1.2rem; }
  .rel b { display: block; font-family: var(--display); font-size: 0.98rem; font-weight: 600; line-height: 1.3; }
  .rel small { display: block; color: var(--dim); font-family: var(--mono); font-size: 0.64rem; letter-spacing: 0.14em; text-transform: uppercase; margin-top: 0.4rem; }

  @media (max-width: 1000px) {
    .caso-grid { grid-template-columns: 1fr; gap: 2.4rem; }
    .caso-info { position: static; }
    .rels { grid-template-columns: 1fr; }
  }

  /* ---- vida nas paginas de case: so CSS, em cima do .reveal/.in que o script ja aplica ---- */
  .caso-capa { overflow: hidden; }
  .caso-capa img { animation: capa-in 1.8s var(--ease) both; transform-origin: 50% 40%; }
  @keyframes capa-in { from { transform: scale(1.09); opacity: 0; } to { transform: scale(1); opacity: 1; } }

  /* Antes -> Depois: o "antes" aparece, esmaece, a seta cresce e o "depois" entra em azul */
  .caso-main .ad { position: relative; padding: 1.5rem 1.7rem; gap: 1.4rem; overflow: hidden; }
  .caso-main .ad-n { font-size: clamp(1.9rem, 3.4vw, 2.6rem); }
  .caso-main .ad-lado:not(.ad-pos) { transition: opacity 0.8s var(--ease) 0.5s; }
  .caso-main .ad.in .ad-lado:not(.ad-pos) { opacity: 0.55; }
  .caso-main .ad-pos { position: relative; opacity: 0; transform: translateX(-16px);
    transition: opacity 0.8s var(--ease) 0.55s, transform 0.8s var(--ease) 0.55s; }
  .caso-main .ad.in .ad-pos { opacity: 1; transform: none; }
  .caso-main .ad-pos::before { content: ''; position: absolute; inset: -1rem -1.4rem; border-radius: 14px; pointer-events: none;
    background: radial-gradient(ellipse at 20% 50%, rgba(46,134,255,0.14), transparent 70%); opacity: 0; transition: opacity 1s var(--ease) 0.9s; }
  .caso-main .ad.in .ad-pos::before { opacity: 1; }
  .caso-main .ad-seta { display: inline-block; font-size: 1.6rem; transform: scaleX(0); transform-origin: left; transition: transform 0.6s var(--ease) 0.25s; }
  .caso-main .ad.in .ad-seta { transform: none; animation: ad-nudge 2.6s ease-in-out 1.6s infinite; }
  @keyframes ad-nudge { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(6px); } }

  /* Desafios e Resultados: itens entram em sequencia */
  .caso-lista li { --t: 0s; opacity: 0; transform: translateX(-10px);
    transition: opacity 0.6s var(--ease), transform 0.6s var(--ease), border-color 0.35s var(--ease); }
  .caso-lista li::before { transform: scale(0); transition: transform 0.4s var(--ease); }
  .caso-bloco.in .caso-lista li { opacity: 1; transform: none; transition-delay: var(--t); }
  .caso-bloco.in .caso-lista li::before { transform: scale(1); transition-delay: calc(var(--t) + 0.2s); }
  .caso-lista li:nth-child(1) { --t: 0.15s; } .caso-lista li:nth-child(2) { --t: 0.27s; }
  .caso-lista li:nth-child(3) { --t: 0.39s; } .caso-lista li:nth-child(4) { --t: 0.51s; }
  .caso-lista li:nth-child(n+5) { --t: 0.63s; }

  /* Resultados viram cartoes, como os numeros da home */
  .caso-res { gap: 0.85rem; }
  .caso-res li { position: relative; overflow: hidden; padding: 1.1rem 1.3rem 1.1rem 3.5rem; background: var(--panel-2);
    border: 1px solid var(--line-soft); border-radius: 14px; }
  .caso-res li::before { left: 1.2rem; top: 1.15rem; width: 1.4rem; height: 1.4rem; border-radius: 50%;
    background: rgba(46,134,255,0.12) url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%232E86FF' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'><path d='m5 12.5 4.5 4.5L19 7.5'/></svg>") center / 0.8rem no-repeat; }
  .caso-res li::after { content: ''; position: absolute; inset: 0; background: var(--degrade-hover); opacity: 0; pointer-events: none; transition: opacity 0.3s var(--ease); }
  .caso-res li:hover { border-color: rgba(46,134,255,0.32); }
  .caso-res li:hover::after { opacity: 1; }
  .caso-res b { display: block; font-family: var(--display); font-size: 1.08rem; margin-bottom: 0.15rem; }

  /* Ficha lateral: os grupos entram um a um e as etiquetas reagem ao mouse */
  .caso-info .inf-campo { opacity: 0; transform: translateY(10px); transition: opacity 0.6s var(--ease), transform 0.6s var(--ease); }
  .caso-info.in .inf-campo { opacity: 1; transform: none; }
  .caso-info.in .inf-campo:nth-child(1) { transition-delay: 0.2s; } .caso-info.in .inf-campo:nth-child(2) { transition-delay: 0.32s; }
  .caso-info.in .inf-campo:nth-child(3) { transition-delay: 0.44s; } .caso-info.in .inf-campo:nth-child(4) { transition-delay: 0.56s; }
  .inf-campo dd span { transition: border-color 0.3s var(--ease), color 0.3s var(--ease); }
  .inf-campo dd span:hover { border-color: rgba(46,134,255,0.45); color: var(--ink); }

  /* Outros projetos */
  .rel img { transition: transform 0.8s var(--ease); }
  .rel:hover img { transform: scale(1.06); }

  @media (prefers-reduced-motion: reduce) {
    .caso-capa img { animation: none; }
    .caso-main .ad-lado, .caso-main .ad-pos, .caso-main .ad-seta, .caso-lista li, .caso-lista li::before, .caso-info .inf-campo {
      opacity: 1 !important; transform: none !important; transition: none !important; animation: none !important; }
    .rel img, .rel:hover img { transition: none; transform: none; }
  }
</style>'''


CSS_INDICE = '''<style>
  /* ---------- Destaque que gira ---------- */
  .dest-carr { position: relative; }
  .dest-trilho { display: flex; gap: 1.2rem; overflow-x: auto; scroll-snap-type: x mandatory; scroll-behavior: smooth; scrollbar-width: none; }
  .dest-trilho::-webkit-scrollbar { display: none; }
  .dest {
    flex: 0 0 100%; scroll-snap-align: start;
    display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr); gap: 0;
    background: var(--panel); border: 1px solid var(--line); border-radius: 20px; overflow: hidden;
  }
  .dest-txt { padding: clamp(1.6rem, 3.4vw, 2.8rem); display: flex; flex-direction: column; justify-content: center; gap: 0.9rem; }
  .dest-setor { font-family: var(--mono); font-size: 0.66rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--accent); }
  .dest-t { font-size: clamp(1.5rem, 2.8vw, 2.1rem); font-weight: 500; line-height: 1.18; }
  .dest-cap { color: var(--muted); font-size: 1rem; line-height: 1.6; max-width: 46ch; }
  .dest-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; }
  .dest-chips span { font-size: 0.72rem; color: var(--dim); border: 1px solid var(--line); border-radius: 999px; padding: 0.24rem 0.68rem; }
  .dest-link { display: inline-flex; align-items: center; gap: 0.45rem; margin-top: 0.4rem; text-decoration: none; font-family: var(--display); font-weight: 600; font-size: 0.96rem; color: var(--accent); }
  .dest-link .arr { transition: transform 0.25s var(--ease); }
  .dest-link:hover .arr { transform: translateX(3px); }
  .dest-art { margin: 0; line-height: 0; }
  .dest-art img { width: 100%; height: 100%; min-height: 260px; object-fit: cover; display: block; }

  /* ---------- Filtro e grade ---------- */
  .filtro-k { font-family: var(--mono); font-size: 0.66rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--dim); margin: 1.6rem 0 0.8rem; }
  .filtros { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .filtro {
    cursor: pointer; background: var(--panel); border: 1px solid var(--line); border-radius: 999px;
    padding: 0.5rem 1rem; color: var(--muted); font-family: var(--display); font-weight: 600; font-size: 0.86rem;
    transition: border-color 0.25s var(--ease), color 0.25s var(--ease), background 0.25s var(--ease);
  }
  .filtro:hover { border-color: rgba(46,134,255,0.45); color: var(--ink); }
  .filtro[aria-pressed="true"] { background: var(--btn-fill); border-color: var(--btn-fill); color: #fff; }
  .filtro-conta { color: var(--dim); font-size: 0.84rem; margin-top: 1rem; }
  .grade { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1.1rem; margin-top: 1.4rem; }
  .gc {
    display: grid; grid-template-rows: auto 1fr; text-decoration: none; overflow: hidden;
    background: var(--panel); border: 1px solid var(--line); border-radius: 16px;
    transition: border-color 0.3s var(--ease), transform 0.3s var(--ease);
  }
  .gc:hover { border-color: rgba(46,134,255,0.45); transform: translateY(-3px); }
  .gc > img { width: 100%; height: 160px; object-fit: cover; display: block; }
  .gc-corpo { padding: 1.3rem 1.3rem 1.2rem; display: grid; grid-template-rows: auto auto 1fr auto auto; gap: 0.55rem; }
  .gc-setor { font-family: var(--mono); font-size: 0.62rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--accent); }
  .gc-t { font-size: 1.08rem; font-weight: 550; line-height: 1.28; }
  .gc-cap { color: var(--muted); font-size: 0.88rem; line-height: 1.55; }
  .gc-chips { display: flex; flex-wrap: wrap; gap: 0.3rem; }
  .gc-chips span { font-size: 0.68rem; color: var(--dim); border: 1px solid var(--line); border-radius: 999px; padding: 0.18rem 0.55rem; }
  .gc-link { display: inline-flex; align-items: center; gap: 0.4rem; margin-top: 0.3rem; font-family: var(--display); font-weight: 600; font-size: 0.85rem; color: var(--accent); }
  .gc .arr { transition: transform 0.25s var(--ease); }
  .gc:hover .arr { transform: translateX(3px); }

  @media (max-width: 1000px) {
    .dest { grid-template-columns: 1fr; }
    .dest-art { order: -1; }
    .dest-art img { min-height: 180px; height: 180px; }
    .grade { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (max-width: 640px) { .grade { grid-template-columns: 1fr; } }
</style>'''

JS_INDICE = '''<script>
/* Carrossel de destaque e filtro de categorias da página de cases.
   O mesmo desenho do carrossel da home: avança sozinho com barra de
   progresso e para de vez quando alguém usa os controles.

   Este bloco vai no <head> junto com o CSS da página, então ele espera o
   DOM: sem a guarda, getElementById devolve null e nada se liga. */
document.addEventListener('DOMContentLoaded', function () {
  var trilho = document.getElementById('dest-trilho');
  if (trilho) (function () {
    var cards = [].slice.call(trilho.children);
    var pontos = document.getElementById('dest-pontos');
    var prog = document.getElementById('dest-progresso');
    var barra = prog ? prog.querySelector('i') : null;
    var ant = document.getElementById('dest-ant');
    var prox = document.getElementById('dest-prox');
    var i = 0, timer = 0, praf = 0, t0 = 0, parado = false;
    var INTERVALO = 7000;
    if (cards.length < 2) { if (prog) prog.style.display = 'none'; return; }

    cards.forEach(function (c, k) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'carr-ponto';
      b.setAttribute('aria-label', 'Ver o destaque ' + (k + 1) + ' de ' + cards.length);
      b.addEventListener('click', function () { parar(); ir(k); });
      pontos.appendChild(b);
    });
    var bolas = [].slice.call(pontos.children);

    function pintar() {
      bolas.forEach(function (b, k) { b.setAttribute('aria-current', k === i ? 'true' : 'false'); });
      ant.disabled = i === 0;
      prox.disabled = i === cards.length - 1;
    }
    function ir(k) {
      i = Math.max(0, Math.min(cards.length - 1, k));
      trilho.scrollLeft = cards[i].offsetLeft - cards[0].offsetLeft;
      pintar();
    }
    function pintarBarra() {
      if (!barra) return;
      barra.style.width = (Math.min(1, (Date.now() - t0) / INTERVALO) * 100).toFixed(2) + '%';
      praf = requestAnimationFrame(pintarBarra);
    }
    function pararBarra() { if (praf) { cancelAnimationFrame(praf); praf = 0; } }
    function tique() { ir(i === cards.length - 1 ? 0 : i + 1); t0 = Date.now(); }
    function tocar() { if (parado || timer) return; t0 = Date.now(); timer = setInterval(tique, INTERVALO); pararBarra(); pintarBarra(); }
    function pausar() { if (timer) { clearInterval(timer); timer = 0; } pararBarra(); }
    function parar() { parado = true; pausar(); if (prog) prog.classList.add('parado'); }

    ant.addEventListener('click', function () { parar(); ir(i - 1); });
    prox.addEventListener('click', function () { parar(); ir(i + 1); });
    /* Mesmo motivo do carrossel da home: no celular o dedo encosta aqui
       toda vez que alguém rola a página, e tratar isso como comando matava
       o giro automático. Só arrasto horizontal de verdade para o carrossel.
       A distância vem do pointermove porque o pointercancel costuma trazer
       a coordenada de onde o dedo começou. */
    var ARRASTO = 30, tx = 0, ty = 0, dedoNoTrilho = false, dx = 0, dy = 0;
    trilho.addEventListener('pointerdown', function (e) {
      tx = e.clientX; ty = e.clientY; dx = dy = 0; dedoNoTrilho = true; pausar();
    });
    trilho.addEventListener('pointermove', function (e) {
      if (!dedoNoTrilho) return;
      dx = Math.max(dx, Math.abs(e.clientX - tx));
      dy = Math.max(dy, Math.abs(e.clientY - ty));
    }, { passive: true });
    ['pointerup', 'pointercancel'].forEach(function (ev) {
      trilho.addEventListener(ev, function () {
        if (!dedoNoTrilho) return;
        dedoNoTrilho = false;
        if (dx > ARRASTO && dx > dy) parar(); else tocar();
      });
    });
    ['pointerenter', 'focusin'].forEach(function (ev) { trilho.parentNode.addEventListener(ev, pausar); });
    ['pointerleave', 'focusout'].forEach(function (ev) { trilho.parentNode.addEventListener(ev, tocar); });
    document.addEventListener('visibilitychange', function () { document.hidden ? pausar() : tocar(); });
    window.addEventListener('resize', function () { ir(i); });

    var tRolar;
    trilho.addEventListener('scroll', function () {
      clearTimeout(tRolar);
      tRolar = setTimeout(function () {
        var base = cards[0].offsetLeft, perto = 0, melhor = Infinity;
        cards.forEach(function (c, k) {
          var d = Math.abs((c.offsetLeft - base) - trilho.scrollLeft);
          if (d < melhor) { melhor = d; perto = k; }
        });
        if (perto !== i) { i = perto; pintar(); }
      }, 120);
    }, { passive: true });

    pintar();
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { e.isIntersecting ? tocar() : pausar(); });
      }, { threshold: 0.25 }).observe(trilho);
    } else { tocar(); }
  })();

  /* Filtro por categoria. Esconde em vez de remover: o cartão volta sem
     reconstruir nada, e o estado continua no HTML para quem lê sem script. */
  var filtros = document.getElementById('filtros');
  var grade = document.getElementById('grade');
  var conta = document.getElementById('filtro-conta');
  if (!filtros || !grade) return;
  var cartoes = [].slice.call(grade.children);

  function aplicar(cat) {
    var n = 0;
    cartoes.forEach(function (c) {
      var ok = cat === 'Todos' || (' ' + c.dataset.cats + ' ').indexOf(' ' + cat + ' ') > -1;
      c.hidden = !ok;
      if (ok) n++;
    });
    [].slice.call(filtros.children).forEach(function (b) {
      b.setAttribute('aria-pressed', b.dataset.cat === cat ? 'true' : 'false');
    });
    if (conta) conta.textContent = n === cartoes.length
      ? (n + ' cases')
      : (n + ' de ' + cartoes.length + ' cases');
  }

  filtros.addEventListener('click', function (e) {
    var b = e.target.closest('[data-cat]');
    if (b) aplicar(b.dataset.cat);
  });
  aplicar('Todos');
});
</script>'''

def pagina(titulo, meta, url, corpo, comum, prefixo='', extra=''):
    c = dict(comum)
    for k in ('header', 'menu', 'rodape', 'chat', 'topo'):
        c[k] = re.sub(r'(href|src)="(?!https?:|#|mailto:|//)', r'\1="' + prefixo, c[k])
        c[k] = c[k].replace('href="#', 'href="' + prefixo + 'index.html#')
    estilo = re.sub(r'url\((media/)', r'url(' + prefixo + r'\1', c['estilo'])
    boot = c['boot']
    # os scripts inline referenciam media/ por src e por url(): nas páginas
    # dentro de cases/ os dois precisam do ../
    c['script'] = re.sub(r'(src|href)="(media/)', r'\1="' + prefixo + r'\2', c['script'])
    return '''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%(titulo)s &mdash; Atlas Tec</title>
<meta name="description" content="%(meta)s">
<link rel="canonical" href="%(url)s">
<meta property="og:type" content="article">
<meta property="og:title" content="%(titulo)s &mdash; Atlas Tec">
<meta property="og:description" content="%(meta)s">
<meta property="og:url" content="%(url)s">
<link rel="icon" href="%(pre)sfavicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="preload" href="%(pre)smedia/fonts/mona-sans-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<meta name="theme-color" content="#F2F1ED">
%(boot)s
%(estilo)s
%(extra)s
</head>
<body>
%(topo)s

%(header)s

%(menu)s

%(corpo)s

%(rodape)s
%(chat)s
%(script)s
</body>
</html>
''' % dict(titulo=titulo, meta=meta, url=url, pre=prefixo, boot=boot, estilo=estilo, extra=extra,
           topo=c['topo'], header=c['header'], menu=c['menu'], corpo=corpo, rodape=c['rodape'],
           chat=c['chat'], script=c['script'])


def main():
    cases = json.loads(DADOS.read_text())
    html = (RAIZ / 'index.html').read_text()

    # 1) carrossel na home, entre marcadores
    novo = carrossel(cases)
    if '<!-- cases:inicio' in html:
        html = re.sub(r'  <!-- cases:inicio.*?<!-- cases:fim -->', novo, html, flags=re.S)
        (RAIZ / 'index.html').write_text(html)
        print('carrossel da home: %d cartões' % len(cases))
    else:
        sys.exit('marcadores <!-- cases:inicio --> ... <!-- cases:fim --> não estão no index.html')

    comum = bp.extrair(html)

    # 2) índice: destaque que gira no topo, filtro e a grade embaixo

    comum_raiz = dict(comum)
    for k in ('header', 'menu', 'rodape'):
        comum_raiz[k] = re.sub(r'href="#([a-z0-9-]+)"', r'href="index.html#\1"', comum_raiz[k])
    (RAIZ / INDICE).write_text(pagina(
        'Cases de sucesso', LEAD_SEC, '%s/%s' % (SITE, INDICE),
        corpo_indice(cases), comum_raiz, prefixo='', extra=CSS_CASO + CSS_INDICE + JS_INDICE))
    print('%-26s %6.1f KB' % (INDICE, (RAIZ / INDICE).stat().st_size / 1024))

    # 3) uma página por case
    PASTA.mkdir(exist_ok=True)
    for c in cases:
        destino = PASTA / ('%s.html' % c['slug'])
        destino.write_text(pagina(
            c['titulo'], c['capa'], '%s/cases/%s.html' % (SITE, c['slug']),
            corpo_case(c, cases), comum, prefixo='../', extra=CSS_CASO))
    print('cases/: %d páginas' % len(cases))


if __name__ == '__main__':
    main()
