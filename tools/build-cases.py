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


# ------------------------------------------------- página de um case
def corpo_case(c, cases):
    outros = [o for o in cases if o['slug'] != c['slug']][:3]
    setor = c.get('setor') or (c['meta'][0] if c.get('meta') else 'Projeto entregue')
    chips = ''.join('<span>%s</span>' % e(t) for t in (c.get('meta') or c.get('stack') or []))

    blocos = ''
    if c.get('campos'):
        blocos = '\n'.join(
            '          <div><dt>%s</dt><dd>%s</dd></div>' % (e(k), e(v))
            for k, v in c['campos'].items())
        blocos = '        <dl class="case-fields">\n%s\n        </dl>' % blocos
    elif c.get('resumo'):
        blocos = '        <p class="caso-texto">%s</p>' % e(c['resumo'])

    mudou = ''
    if c.get('mudou'):
        mudou = '\n'.join('          <p><b>%s</b><span>%s</span></p>' % (e(a), e(b)) for a, b in c['mudou'])
        mudou = '      <div class="case-metrics">\n        <p class="cm-k">O que mudou</p>\n%s\n      </div>' % mudou

    ad = ''
    if c.get('antes') and c.get('depois'):
        if isinstance(c['antes'], (list, tuple)):
            _, an, ad_txt = c['antes']
            _, dn, dd_txt = c['depois']
        else:
            an, ad_txt, dn, dd_txt = c['antes'], '', c['depois'], ''
        ad = ('''      <div class="ad" aria-label="Antes e depois">
        <div class="ad-lado"><p class="ad-k">Antes</p><p class="ad-n">%s</p><p class="ad-d">%s</p></div>
        <span class="ad-seta" aria-hidden="true">&rarr;</span>
        <div class="ad-lado ad-pos"><p class="ad-k">Depois</p><p class="ad-n">%s</p><p class="ad-d">%s</p></div>
      </div>''' % (e(an), e(ad_txt), e(dn), e(dd_txt)))

    relacionados = '\n'.join('''        <a class="rel" href="%s.html">
          <img src="../media/cases/%s.svg" alt="" loading="lazy" decoding="async">
          <span><b>%s</b><small>%s</small></span>
        </a>''' % (o['slug'], o['arte'], e(o['titulo']), e(o.get('setor') or (o['meta'][0] if o.get('meta') else '')))
        for o in outros)

    return '''<main id="inicio">

  <section class="sec caso-hero">
    <div class="wrap">
      <a class="voltar" href="../%(indice)s"><span aria-hidden="true">&larr;</span> Todos os cases</a>
      <span class="case-conf">Cliente confidencial</span>
      <h1 class="h-xl">%(titulo)s</h1>
      <p class="sub">%(capa)s</p>
      <div class="caso-chips">%(chips)s</div>
    </div>
  </section>

  <section class="sec caso-arte">
    <div class="wrap">
      <figure class="caso-capa"><img src="../media/cases/%(arte)s.svg" alt="%(alt)s"></figure>
    </div>
  </section>

  <section class="sec">
    <div class="wrap caso-grid">
      <div>
%(ad)s
%(blocos)s
      </div>
%(mudou)s
    </div>
  </section>

  <div class="divider"></div>

  <section class="sec">
    <div class="wrap">
      <h2 class="cases-more-head">Outros projetos</h2>
      <div class="rels">
%(rel)s
      </div>
      <div class="hero-ctas" style="margin-top:2.4rem">
        <a class="btn btn-accent" href="../index.html#contato" data-magnetic>Falar com um especialista <span class="arr">&rarr;</span></a>
        <a class="btn btn-line" href="../%(indice)s" data-magnetic>Ver todos os cases <span class="arr">&rarr;</span></a>
      </div>
    </div>
  </section>
</main>''' % dict(indice=INDICE, titulo=e(c['titulo']), capa=e(c['capa']), chips=chips,
                  arte=c['arte'], alt=e(c['capa']), ad=ad, blocos=blocos, mudou=mudou,
                  rel=relacionados, setor=e(setor))


CSS_CASO = '''<style>
  .caso-hero { padding-top: 7rem; padding-bottom: 2rem; }
  .voltar { display: inline-flex; align-items: center; gap: 0.5rem; text-decoration: none; color: var(--dim); font-family: var(--mono); font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 1.6rem; transition: color 0.25s var(--ease); }
  .voltar:hover { color: var(--accent); }
  .caso-chips { display: flex; flex-wrap: wrap; gap: 0.45rem; margin-top: 1.4rem; }
  .caso-chips span { font-size: 0.76rem; color: var(--muted); border: 1px solid var(--line); border-radius: 999px; padding: 0.34rem 0.8rem; }
  .caso-arte { padding-top: 0; padding-bottom: 2rem; }
  .caso-capa { margin: 0; border-radius: 18px; overflow: hidden; border: 1px solid var(--line); line-height: 0; }
  .caso-capa img { width: 100%; display: block; }
  .caso-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 3rem; align-items: start; }
  .caso-texto { color: var(--muted); font-size: 1.02rem; }
  .rels { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; margin-top: 1.4rem; }
  .rel { display: grid; gap: 0.9rem; text-decoration: none; background: var(--panel); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; transition: border-color 0.3s var(--ease), transform 0.3s var(--ease); }
  .rel:hover { border-color: rgba(46,134,255,0.45); transform: translateY(-3px); }
  .rel img { width: 100%; height: 118px; object-fit: cover; display: block; }
  .rel span { display: block; padding: 0 1.1rem 1.2rem; }
  .rel b { display: block; font-family: var(--display); font-size: 0.98rem; font-weight: 600; }
  .rel small { display: block; color: var(--dim); font-family: var(--mono); font-size: 0.64rem; letter-spacing: 0.14em; text-transform: uppercase; margin-top: 0.4rem; }
  @media (max-width: 1000px) { .caso-grid { grid-template-columns: 1fr; gap: 2rem; } .rels { grid-template-columns: 1fr; } }
</style>'''


def pagina(titulo, meta, url, corpo, comum, prefixo='', extra=''):
    c = dict(comum)
    for k in ('header', 'menu', 'rodape', 'chat', 'topo', 'tema_btn'):
        c[k] = re.sub(r'(href|src)="(?!https?:|#|mailto:|//)', r'\1="' + prefixo, c[k])
        c[k] = c[k].replace('href="#', 'href="' + prefixo + 'index.html#')
    estilo = re.sub(r'url\((media/)', r'url(' + prefixo + r'\1', c['estilo'])
    boot = c['boot']
    idioma = re.sub(r'src="(media/)', r'src="' + prefixo + r'\1', c['idioma'])
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
%(tema_btn)s
%(chat)s
%(script)s
%(tema_js)s
%(idioma)s
</body>
</html>
''' % dict(titulo=titulo, meta=meta, url=url, pre=prefixo, boot=boot, estilo=estilo, extra=extra,
           topo=c['topo'], header=c['header'], menu=c['menu'], corpo=corpo, rodape=c['rodape'],
           tema_btn=c['tema_btn'], chat=c['chat'], script=c['script'], tema_js=c['tema_js'],
           idioma=idioma)


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

    # 2) índice
    cartoes = '\n'.join('''        <a class="rel" href="cases/%s.html">
          <img src="media/cases/%s.svg" alt="" loading="lazy" decoding="async">
          <span><b>%s</b><small>%s</small></span>
        </a>''' % (c['slug'], c['arte'], e(c['titulo']),
                   e(c.get('setor') or (c['meta'][0] if c.get('meta') else '')))
        for c in cases)
    corpo_indice = '''<main id="inicio">
  <section class="sec caso-hero">
    <div class="wrap">
      <span class="pill" data-ico="cases">Histórias de sucesso</span>
      <h1 class="h-xl">%s</h1>
      <p class="sub">%s</p>
    </div>
  </section>
  <section class="sec" style="padding-top:1rem">
    <div class="wrap">
      <div class="rels" style="grid-template-columns:repeat(3,minmax(0,1fr))">
%s
      </div>
      <div class="hero-ctas" style="margin-top:2.6rem">
        <a class="btn btn-accent" href="index.html#contato" data-magnetic>Falar com um especialista <span class="arr">&rarr;</span></a>
      </div>
    </div>
  </section>
</main>''' % (TITULO_SEC, LEAD_SEC, cartoes)

    comum_raiz = dict(comum)
    for k in ('header', 'menu', 'rodape'):
        comum_raiz[k] = re.sub(r'href="#([a-z0-9-]+)"', r'href="index.html#\1"', comum_raiz[k])
    (RAIZ / INDICE).write_text(pagina(
        'Cases de sucesso', LEAD_SEC, '%s/%s' % (SITE, INDICE),
        corpo_indice, comum_raiz, prefixo='', extra=CSS_CASO))
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
