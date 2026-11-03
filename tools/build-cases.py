#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gera cases-de-sucesso.html a partir do index.html.

A home mostra uma seleção; os treze cases inteiros ficam aqui. Os cartões
não são reescritos: saem do próprio index, então melhorar um case lá
atualiza esta página no build seguinte e não existe versão divergente.

Uso:  python3 tools/build-cases.py
"""
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from importlib import import_module

bp = import_module('build-paginas')

RAIZ = bp.RAIZ
SITE = bp.SITE
ARQUIVO = 'cases-de-sucesso.html'
TITULO = 'Cases de sucesso'
META = ('Treze projetos de dados, BI e inteligência entregues pela Atlas Tec, '
        'com o antes e o depois de cada um. Nomes de clientes preservados por '
        'confidencialidade.')

# O index mostra parte dos cases; os que ficaram de fora estão guardados aqui
# para a página completa poder repor todos os treze.
RESERVA = RAIZ / 'tools' / 'cases-reserva.html'


def main():
    html = (RAIZ / 'index.html').read_text()
    comum = bp.extrair(html)
    for chave in ('header', 'menu', 'rodape'):
        comum[chave] = re.sub(r'href="#([a-z0-9-]+)"', r'href="index.html#\1"', comum[chave])

    # A classe muda quando o cartão entra no carrossel; casar por 'case-card'
    # com a borda de palavra pega as duas formas e não vai quebrar de novo
    # na próxima vez que alguém trocar as classes utilitárias.
    grandes = re.findall(r'      <article class="case-card[^"]*">.*?\n      </article>\n', html, re.S)
    minis = re.findall(r'        <article class="case-mini">.*?</article>\n', html)
    if not RESERVA.exists():
        sys.exit('falta %s — gere-o com os mini cases que saíram da home' % RESERVA)
    reserva = re.findall(r'        <article class="case-mini">.*?</article>\n', RESERVA.read_text())

    # a reserva completa os que a home deixou de fora, sem repetir nenhum
    vistos = set(minis)
    todos_minis = minis + [m for m in reserva if m not in vistos]
    total = len(grandes) + len(todos_minis)
    # Trava: um seletor que para de casar devolve uma página silenciosamente
    # incompleta. Melhor o build quebrar do que publicar cases faltando.
    if len(grandes) < 3:
        sys.exit('esperava 3 cases detalhados no index.html, achei %d — o seletor parou de casar' % len(grandes))

    corpo = '''<main id="inicio">

  <section class="sec pag-hero">
    <div class="wrap">
      <div class="sec-lead">
        <span class="eyebrow reveal in">Cases</span>
        <h1 class="h-xl reveal d1 in">Resultados que falam por si.</h1>
        <p class="sub reveal d2 in">
          %(total)d projetos entregues por especialistas da Atlas, com o antes e o
          depois de cada um. Nomes de clientes preservados por confidencialidade.
        </p>
        <div class="hero-ctas reveal d3 in">
          <a class="btn btn-accent" href="index.html#contato" data-magnetic>Falar com um especialista <span class="arr">&rarr;</span></a>
          <a class="btn btn-line" href="index.html#solucoes" data-magnetic>Ver todas as soluções <span class="arr">&rarr;</span></a>
        </div>
      </div>
    </div>
  </section>

  <div class="divider"></div>

  <section class="sec" id="cases">
    <div class="wrap">
      <div class="head2 reveal">
        <div>
          <span class="pill">
            <svg viewBox="0 0 24 24" aria-hidden="true" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l5-5 4 3 8-8"/><path d="M16 7h5v5"/></svg>
            Projetos detalhados
          </span>
          <h2 class="h-xl d1" style="margin-bottom:0">Arquitetura, solução e o que mudou.</h2>
        </div>
        <div class="head2-side">
          <p class="sub">
            Os três projetos abaixo estão abertos por inteiro: cenário, arquitetura,
            stack e o resultado medido no antes e depois.
          </p>
        </div>
      </div>

%(grandes)s
      <h3 class="cases-more-head reveal">Mais projetos entregues</h3>
      <div class="case-mini-grid reveal d1">
%(minis)s      </div>

      <div class="hero-ctas reveal d3" style="margin-top:2.6rem">
        <a class="btn btn-accent" href="index.html#contato" data-magnetic>Falar com um especialista <span class="arr">&rarr;</span></a>
      </div>
    </div>
  </section>
</main>''' % dict(total=total, grandes=''.join(grandes), minis=''.join(todos_minis))

    pagina = '''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%(titulo)s &mdash; Atlas Tec</title>
<meta name="description" content="%(meta)s">
<link rel="canonical" href="%(url)s">
<meta property="og:type" content="website">
<meta property="og:title" content="%(titulo)s &mdash; Atlas Tec">
<meta property="og:description" content="%(meta)s">
<meta property="og:url" content="%(url)s">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<meta name="theme-color" content="#F2F1ED">
%(boot)s
%(estilo)s
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
''' % dict(titulo=TITULO, meta=META, url='%s/%s' % (SITE, ARQUIVO),
           estilo=comum['estilo'], header=comum['header'], topo=comum['topo'],
           menu=comum['menu'], corpo=corpo, rodape=comum['rodape'],
           chat=comum['chat'], script=comum['script'], boot=comum['boot'],
           tema_btn=comum['tema_btn'], tema_js=comum['tema_js'],
           idioma=comum['idioma'])

    destino = RAIZ / ARQUIVO
    destino.write_text(pagina)
    print('%-24s %6.1f KB  (%d cases)' % (ARQUIVO, destino.stat().st_size / 1024, total))


if __name__ == '__main__':
    main()
