#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gera parceiros/<slug>.html, uma pagina por fornecedor.

Os cards de parceiro da home deixam de ser enfeite e viram porta de
entrada: cada logo leva para a pagina do fornecedor, com os produtos que
a Atlas usa e, quando existem, os cases entregues com ele.

Nada aqui e escrito a mao sobre produto ou entrega. As duas fontes sao:

  tools/ferramentas.py  — catalogo ja usado pelo painel de Tecnologia da
                          home. O campo 'caso' so e preenchido quando ha
                          projeto realmente entregue pela Atlas, e e ele
                          que acende a marca de entrega nesta pagina.
  tools/cases.json      — o campo 'parceiros' de cada case diz com qual
                          fornecedor aquele projeto foi tocado.

Por isso a pagina de um fornecedor sem projeto entregue sai sem marca de
entrega e sem bloco de cases, em vez de ganhar texto de enchimento. Hoje
e o caso de AWS e Snowflake (produto no catalogo, nenhuma entrega) e da
IBM, que nao tem produto no catalogo — a pagina dela sai so com o
programa de parceria ate alguem preencher a fonte.

Uso:  python3 tools/build-parceiros.py
"""
import html as H
import json
import pathlib
import sys
from importlib import import_module

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
bp = import_module('build-paginas')
bc = import_module('build-cases')
import ferramentas as fer

RAIZ = bp.RAIZ
SITE = bp.SITE
PASTA = RAIZ / 'parceiros'


def e(t):
    return H.escape(str(t), quote=False)


# Quais ferramentas do catalogo pertencem a cada fornecedor. A lista e
# explicita de proposito: casar por nome daria falso positivo (Spark e
# MLflow nasceram na Databricks mas sao projetos abertos, nao produto
# dela) e um erro desses passaria despercebido.
FORNECEDORES = [
    dict(slug='microsoft', nome='Microsoft', logo='microsoft.svg',
         programa='Microsoft AI Cloud Partner Program', chave_case='Microsoft',
         produtos=['Power BI', 'Microsoft Fabric', 'Azure', 'SQL Server', 'Purview']),
    dict(slug='google-cloud', nome='Google Cloud', logo='google.svg',
         programa='Google Cloud Partner Advantage', chave_case='Google Cloud',
         produtos=['Google Cloud', 'BigQuery', 'Looker', 'Gemini'], revenda=True),
    dict(slug='aws', nome='Amazon Web Services', logo='aws.svg',
         programa='Amazon Web Services Partner Network', chave_case='AWS',
         produtos=['AWS', 'Redshift']),
    dict(slug='ibm', nome='IBM', logo='ibm.svg',
         programa='IBM Partner Plus', chave_case='IBM', produtos=['watsonx', 'Db2']),
    dict(slug='databricks', nome='Databricks', logo='databricks.png',
         programa='Databricks Partner Program', chave_case='Databricks',
         produtos=['Databricks', 'Unity Catalog']),
    dict(slug='tableau', nome='Tableau', logo='tableau.png',
         programa='Tableau Partner Program &middot; Salesforce', chave_case='Tableau',
         produtos=['Tableau']),
    dict(slug='snowflake', nome='Snowflake', logo='snowflake.svg',
         programa='Snowflake Partner Network', chave_case='Snowflake',
         produtos=['Snowflake']),
    dict(slug='oracle', nome='Oracle', logo='oracle.svg',
         programa='Oracle PartnerNetwork', chave_case='Oracle',
         produtos=['Oracle']),
]

# O parametro 'extra' de pagina() e colado cru no HTML: tem de trazer as
# proprias tags <style>. Sem elas o navegador imprime a folha como texto no
# topo da pagina — foi o que aconteceu no ar.
CSS = '''<style>
  .pf-topo { padding: 7rem 0 0; }
  .voltar { display: inline-flex; align-items: center; gap: 0.5rem; font-family: var(--mono);
    font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--dim);
    text-decoration: none; transition: color 0.25s var(--ease); }
  .voltar:hover { color: var(--accent); }
  .pf-cabeca { display: flex; align-items: center; gap: 1.4rem; flex-wrap: wrap; margin: 1.8rem 0 1.2rem; }
  .pf-marca { display: grid; place-items: center; width: 92px; height: 92px; flex: none;
    background: var(--panel); border: 1px solid var(--line); border-radius: 18px; padding: 1.1rem; }
  .pf-marca img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .pf-prod { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; margin-top: 2.2rem; }
  .pf-card { background: var(--panel); border: 1px solid var(--line); border-radius: 16px; padding: 1.4rem 1.5rem; }
  .pf-card h3 { font-size: 1.12rem; font-weight: 550; margin-bottom: 0.5rem; }
  .pf-card p { color: var(--muted); font-size: 0.93rem; margin-bottom: 0.7rem; }
  .pf-meta { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .pf-meta span { font-family: var(--mono); font-size: 0.64rem; letter-spacing: 0.1em;
    text-transform: uppercase; color: var(--dim); border: 1px solid var(--line);
    border-radius: 999px; padding: 0.3rem 0.6rem; }
  .pf-entrega { display: flex; gap: 0.55rem; margin-top: 0.9rem; padding-top: 0.9rem;
    border-top: 1px solid var(--line); color: var(--accent-light); font-size: 0.86rem; }
  .pf-entrega svg { width: 1rem; height: 1rem; flex: none; margin-top: 0.15rem;
    stroke: currentColor; fill: none; stroke-width: 2.2; }
  .pf-entrega-caso { color: var(--muted); font-size: 0.86rem; margin-top: 0.3rem; }
  .pf-vazio { background: var(--panel); border: 1px solid var(--line); border-radius: 16px;
    padding: 1.6rem 1.7rem; margin-top: 2rem; color: var(--muted); font-size: 0.95rem; }
  .pf-revenda { background: var(--panel); border: 1px solid rgba(46,134,255,0.3); border-radius: 18px;
    padding: 1.8rem 1.9rem; margin-top: 2.2rem; }
  .pf-revenda h2 { font-size: 1.4rem; font-weight: 550; margin-bottom: 0.7rem; }
  .pf-revenda p { color: var(--muted); max-width: 54ch; }
  .pf-cases { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; margin-top: 2.2rem; }
  @media (max-width: 1000px) { .pf-prod, .pf-cases { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 620px)  { .pf-prod, .pf-cases { grid-template-columns: 1fr; } }
</style>'''

CHECK = ('<svg viewBox="0 0 24 24" aria-hidden="true" stroke-linecap="round" '
         'stroke-linejoin="round"><path d="m4 12 5 5L20 7"/></svg>')


def card_produto(t):
    """Um produto. A marca de entrega so acende com o campo 'caso' do catalogo."""
    partes = ['        <article class="pf-card">\n',
              '          <h3>%s</h3>\n' % e(t['nome']),
              '          <p>%s</p>\n' % e(t.get('oque', '')),
              '          <div class="pf-meta"><span>%s</span><span>%s</span></div>\n'
              % (e(t.get('licenca', '')), e(t.get('modelo', '')))]
    if t.get('caso'):
        # Rotulo e texto do caso ficam em elementos separados de proposito: o
        # rotulo e frase minha e traduz; o texto vem do catalogo, que e so em
        # portugues desde sempre (na home ele entra por JS e nunca traduziu).
        # Juntos num bloco so, a frase inteira ficaria fora do dicionario.
        partes.append('          <p class="pf-entrega">%s <span>Projeto entregue pela Atlas</span></p>\n' % CHECK)
        partes.append('          <p class="pf-entrega-caso">%s</p>\n' % e(t['caso']))
    partes.append('        </article>\n')
    return ''.join(partes)


def card_case(c):
    """Mesmo cartao do carrossel da home: arte, setor, titulo, resumo e
    etiquetas. Reaproveita as classes .cc da folha principal em vez de um
    estilo proprio, entao os dois lugares nao podem divergir com o tempo."""
    setor = c.get('setor') or (c['meta'][0] if c.get('meta') else 'Projeto entregue')
    etiquetas = (c.get('meta') or [])[1:3]
    chips = ''.join('<span>%s</span>' % e(t) for t in etiquetas)
    return ('        <article class="cc">\n'
            '          <figure class="cc-art"><img src="../media/cases/%s.svg" alt="%s" loading="lazy" decoding="async"></figure>\n'
            '          <div class="cc-corpo">\n'
            '            <p class="cc-setor">%s</p>\n'
            '            <h3 class="cc-t">%s</h3>\n'
            '            <p class="cc-cap">%s</p>\n'
            '            <div class="cc-chips">%s</div>\n'
            '            <a class="cc-link" href="../cases/%s.html">Ver case <span class="arr">&rarr;</span></a>\n'
            '          </div>\n'
            '        </article>\n'
            % (c['arte'], e(c.get('capa', '')), e(setor), e(c['titulo']),
               e(c.get('capa', '')), chips, c['slug']))


def corpo(f, cases):
    tabela = {t['nome']: t for t in fer.F}
    produtos = [tabela[n] for n in f['produtos'] if n in tabela]
    faltando = [n for n in f['produtos'] if n not in tabela]
    if faltando:
        sys.exit('produto fora do catalogo em %s: %s' % (f['slug'], ', '.join(faltando)))
    meus = [c for c in cases if f['chave_case'] in (c.get('parceiros') or [])]

    # O <main id="inicio"> nao e enfeite: o motor de idiomas varre uma
    # lista fixa de raizes (header, main, footer, nav...), entao conteudo
    # fora dele fica em portugues para quem le em EN ou ES, sem aviso.
    p = ['<main id="inicio">\n\n',
         '  <section class="sec pf-topo">\n    <div class="wrap">\n',
         '      <a class="voltar" href="../index.html#parceiros"><span aria-hidden="true">&larr;</span> Voltar para parceiros</a>\n',
         '      <div class="pf-cabeca">\n',
         '        <div class="pf-marca"><img src="../media/logos/parceiros/%s" alt="%s"></div>\n'
         % (f['logo'], e(f['nome'])),
         '        <div>\n          <h1 class="h-xl" style="margin:0">%s</h1>\n' % e(f['nome']),
         '          <p class="sub" style="margin:0.6rem 0 0">%s</p>\n' % f['programa'],
         '        </div>\n      </div>\n']

    if f.get('revenda'):
        p.append('      <div class="pf-revenda">\n'
                 '        <h2>Licen&ccedil;a e implanta&ccedil;&atilde;o na mesma empresa</h2>\n'
                 '        <p>A Atlas faz parte do Google Cloud Partner Advantage e comercializa produtos\n'
                 '        Google Cloud. Em vez de comprar a licen&ccedil;a com um fornecedor e a implanta&ccedil;&atilde;o\n'
                 '        com outro, os dois v&ecirc;m da mesma empresa: um contrato, um interlocutor, e quem\n'
                 '        vende &eacute; quem coloca em produ&ccedil;&atilde;o.</p>\n'
                 '      </div>\n')

    if produtos:
        p.append('      <h2 class="h-xl" style="font-size:1.6rem;margin-top:2.8rem">Produtos com que a Atlas trabalha</h2>\n')
        p.append('      <div class="pf-prod">\n')
        p.extend(card_produto(t) for t in produtos)
        p.append('      </div>\n')
        if any(t.get('caso') for t in produtos):
            p.append('      <p class="parc-nota">&#10022; marca os produtos com projeto entregue pela Atlas</p>\n')
    else:
        p.append('      <p class="pf-vazio">Esta p&aacute;gina lista o programa de parceria. Os produtos\n'
                 '      %s ainda n&atilde;o est&atilde;o no cat&aacute;logo de tecnologia da Atlas, e nada aqui\n'
                 '      &eacute; escrito sem essa fonte.</p>\n' % e(f['nome']))

    if meus:
        p.append('      <h2 class="h-xl" style="font-size:1.6rem;margin-top:2.8rem">Cases entregues com %s</h2>\n' % e(f['nome']))
        p.append('      <div class="pf-cases">\n')
        for c in meus:
            p.append(card_case(c))
        p.append('      </div>\n')

    p.append('      <div class="sol-foot" style="margin-top:2.6rem">\n'
             '        <a class="btn btn-accent" href="../index.html#contato" data-magnetic>Falar com um especialista <span class="arr">&rarr;</span></a>\n'
             '      </div>\n')
    p.append('    </div>\n  </section>\n\n</main>')
    return ''.join(p)


def main():
    html = (RAIZ / 'index.html').read_text()
    comum = bp.extrair(html)
    cases = json.loads((RAIZ / 'tools' / 'cases.json').read_text())
    PASTA.mkdir(exist_ok=True)
    for f in FORNECEDORES:
        destino = PASTA / ('%s.html' % f['slug'])
        meta = ('%s e a Atlas Tecnologia: produtos, programa de parceria e projetos entregues.'
                % f['nome'])
        destino.write_text(bc.pagina(
            '%s' % f['nome'], meta, '%s/parceiros/%s.html' % (SITE, f['slug']),
            corpo(f, cases), comum, prefixo='../', extra=CSS))
        print('%-34s %6.1f KB' % ('parceiros/%s.html' % f['slug'], destino.stat().st_size / 1024))


if __name__ == '__main__':
    main()
