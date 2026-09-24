#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gera as páginas de serviço a partir do index.html.

O site é um arquivo único. Duplicar cabeçalho, rodapé e folha de estilo em
cada página nova significaria que toda alteração de menu vira N edições — e
uma delas vai ficar para trás. Aqui o index.html é a fonte: o gerador extrai
dele o <style>, o <header>, o <rodapé>, o widget de chat e o <script>, e
monta cada página de serviço em volta disso.

Uso:  python3 tools/build-paginas.py
Saída: bi-analytics.html, data-engineering.html, alocacao.html
"""
import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
BASE = RAIZ / 'index.html'
SITE = 'https://atlas-partner.com'


# ---------------------------------------------------------------- extração
def extrair(html):
    """Pega do index.html tudo que é comum a todas as páginas."""
    def um(padrao, nome):
        m = re.search(padrao, html, re.S)
        if not m:
            sys.exit('não encontrei %s no index.html' % nome)
        return m.group(0)

    estilo = um(r'<style>.*?</style>', '<style>')
    header = um(r'<header class="nav" id="nav">.*?</header>', '<header>')
    menu = um(r'<nav class="mobile-menu" id="mobile-menu".*?</nav>', 'menu mobile')
    rodape = um(r'<footer class="footer">.*?</footer>', '<footer>')
    # Os elementos entre <body> e o cabeçalho (cursor, barra de progresso)
    # também saem do index: escritos à mão aqui, um id errado passa
    # despercebido e derruba o script da página inteira.
    topo = um(r'<a class="skip-link".*?(?=\n\n<header)', 'elementos de topo')
    # widget de chat: do botão flutuante até o fim do painel
    chat = um(r'<button class="chat-fab".*?<!-- /chat -->|<button class="chat-fab".*?(?=<script>)', 'chat')
    # O script principal é o último bloco inline sem type — ancorar num nome de
    # variável quebra sempre que uma seção sai do ar.
    blocos = re.findall(r'<script>(?:(?!</script>).)*</script>', html, re.S)
    if not blocos:
        sys.exit('não encontrei o <script> principal no index.html')
    script = max(blocos, key=len)
    return dict(estilo=estilo, header=header, menu=menu, rodape=rodape,
                topo=topo, chat=chat.rstrip(), script=script)


# ---------------------------------------------------------------- conteúdo
def bloco_capacidade(titulo, itens):
    lis = '\n'.join('              <li>%s</li>' % i for i in itens)
    return ('          <article class="svc">\n'
            '            <h3 class="svc-t">%s</h3>\n'
            '            <ul class="svc-list">\n%s\n            </ul>\n'
            '          </article>' % (titulo, lis))


def bloco_etapas(etapas):
    out = []
    for i, (t, d) in enumerate(etapas, 1):
        out.append('        <div class="tl-step on"><p class="tl-n">%02d</p>'
                   '<h3 class="tl-t">%s</h3><p class="tl-d">%s</p></div>' % (i, t, d))
    return '\n'.join(out)


def bloco_tec(itens):
    out = []
    for nome, arq, real in itens:
        icone = ('<span class="arq-mn">%s</span>' % arq[1:]) if arq.startswith('#') else \
                ('<span class="arq-ico" style="--i:url(media/logos/%s.svg)"></span>' % arq)
        estrela = '<span class="arq-star">&#10022;</span>' if real else ''
        out.append('          <span class="pag-tec" title="%s">'
                   '<span class="arq-ring">%s%s</span>%s</span>' % (nome, icone, estrela, nome))
    return '\n'.join(out)


PAGINAS = [
    dict(
        arquivo='bi-analytics.html',
        slug='bi-analytics',
        titulo='BI & Data Visualization',
        h1='Uma métrica, uma definição, e o indicador na mão de quem decide.',
        meta='Consultoria de Business Intelligence e Data Visualization: camada '
             'semântica, dashboards executivos e governança de indicadores em '
             'Power BI, Looker, Tableau e MicroStrategy.',
        eyebrow='BI &amp; Analytics',
        contexto=('O indicador existe. O problema é que cada área chega a um número '
                  'diferente — e a reunião vira discussão sobre o dado, em vez de '
                  'discussão sobre a decisão.'),
        capacidades=[
            ('Camada semântica', ['Modelagem dimensional', 'Definição única por métrica',
                                  'Regra de negócio versionada', 'Catálogo de indicadores']),
            ('Dashboards que se usam', ['Visão executiva e operacional', 'Self-service para as áreas',
                                        'Padrão visual definido antes do desenvolvimento',
                                        'Performance e otimização de DAX']),
            ('Governança de BI', ['Padrão de nomenclatura e layout', 'Controle de acesso por perfil',
                                  'Migração e consolidação de painéis', 'Documentação do modelo']),
        ],
        etapas=[('Discovery', 'Que decisão precisa melhorar, por quem e com que frequência.'),
                ('Modelagem', 'A definição de cada métrica acordada antes do primeiro painel.'),
                ('Construção', 'Dashboards com padrão visual e de performance definidos na largada.'),
                ('Produção', 'Entrega com documentação e as áreas autônomas para usar.')],
        tecnologias=[('Power BI', '#PBI', 1), ('Tableau', 'tableau', 1), ('Looker', 'looker', 1),
                     ('MicroStrategy', 'microstrategy', 1), ('Qlik', 'qlik', 0),
                     ('Metabase', 'metabase', 0), ('Superset', 'superset', 0)],
        case=dict(
            setor='BI Governance', tipo='Migração', nuvem='Self-Service BI',
            titulo='Migração e governança de BI em escala',
            cenario='Mais de 200 dashboards Power BI crescendo sem padrão, sem governança '
                    'e sem fonte única da verdade.',
            solucao='Migração e padronização em Looker, com dados e definições unificados '
                    'e um modelo de self-service para as áreas de negócio.',
            tec='Power BI, Looker, Governança de dados',
            mudou=[('Uma definição por métrica', 'a mesma conta deixou de ter versões diferentes em mais de 200 painéis'),
                   ('Pergunta sem fila', 'o self-service tirou o intervalo entre a dúvida da área e a resposta'),
                   ('Crescimento com padrão', 'painel novo passa a nascer dentro de um modelo, não ao lado dele')]),
        cta='Falar sobre BI & Analytics',
        cta2='Quero avaliar meu BI',
    ),
    dict(
        arquivo='data-engineering.html',
        slug='data-engineering',
        titulo='Data Engineering',
        h1='A base confiável que sustenta todo o resto.',
        meta='Consultoria de Data Engineering: ingestão, Data Lake, Lakehouse, Data '
             'Warehouse, transformação em dbt e orquestração em Airflow, em Azure, '
             'AWS e Google Cloud.',
        eyebrow='Data Engineering',
        contexto=('Cada pergunta nova vira uma extração nova. A resposta chega depois '
                  'que a decisão já foi tomada — e ninguém consegue dizer de onde veio '
                  'o número.'),
        capacidades=[
            ('Ingestão e integração', ['Conectores gerenciados', 'Streaming de eventos',
                                       'Integração de sistemas legados', 'APIs e arquivos']),
            ('Armazenamento', ['Data Lake', 'Data Warehouse', 'Lakehouse', 'Modelagem de dados']),
            ('Transformação e orquestração', ['ETL e ELT', 'Transformação versionada e testada',
                                              'Orquestração de pipelines', 'Testes de qualidade']),
        ],
        etapas=[('Diagnóstico', 'Que fontes existem, em que estado, e o que o negócio precisa ler.'),
                ('Arquitetura', 'O desenho da base sobre a nuvem que serve ao problema.'),
                ('Construção', 'Pipelines com teste e orquestração desde o primeiro dia.'),
                ('Operação', 'Em produção, com falha visível antes de chegar ao usuário.')],
        tecnologias=[('Databricks', 'databricks', 1), ('BigQuery', 'bigquery', 1),
                     ('dbt', 'dbt', 1), ('Airflow', 'airflow', 1), ('Snowflake', 'snowflake', 0),
                     ('Redshift', 'redshift', 0), ('Spark', 'spark', 0), ('Kafka', 'kafka', 0),
                     ('Fivetran', '#FVT', 0), ('Airbyte', 'airbyte', 0)],
        case=dict(
            setor='Serviços Financeiros', tipo='Data Engineering', nuvem='Cloud GCP',
            titulo='Modernização de legado para a nuvem',
            cenario='Dados presos em um legado Oracle — caro de manter e distante das '
                    'necessidades analíticas do negócio.',
            solucao='Data Lake em Google Cloud com processamento em BigQuery, '
                    'transformações em dbt, orquestração em Airflow e BI unificado em Looker.',
            tec='GCP, BigQuery, dbt, Airflow, Looker',
            mudou=[('Legado fora da conta', 'o custo de manter o ambiente Oracle deixou de existir'),
                   ('Regra em código', 'as transformações saíram de scripts avulsos para dbt, testado e versionado'),
                   ('Uma camada só', 'Looker passou a ser o único caminho entre o dado e o negócio')]),
        cta='Falar sobre Data Engineering',
        cta2='Quero avaliar minha arquitetura',
    ),
    dict(
        arquivo='alocacao.html',
        slug='alocacao',
        titulo='Alocação de especialistas',
        h1='Quando o que falta não é projeto, é time.',
        meta='Alocação de especialistas de dados e squads: engenheiros de dados, '
             'analistas de BI, cientistas de dados e arquitetos alocados no time do '
             'cliente, com respaldo técnico da Atlas.',
        eyebrow='Pessoas &amp; Alocação',
        contexto=('O roadmap está definido e o orçamento aprovado, mas a vaga de '
                  'engenheiro de dados segue aberta — e o projeto não anda enquanto '
                  'a contratação não fecha.'),
        capacidades=[
            ('Perfis que alocamos', ['Engenheiro de dados', 'Analista e desenvolvedor de BI',
                                     'Cientista de dados', 'Arquiteto de dados']),
            ('Como funciona', ['Alocação sob a gestão do cliente', 'Respaldo técnico da Atlas por trás',
                               'Substituição sem quebra de ritmo', 'Acompanhamento periódico']),
            ('Squads completos', ['Time montado por perfil e senioridade', 'Liderança técnica da Atlas',
                                  'Ritmo de entrega acordado', 'Transferência de conhecimento']),
        ],
        etapas=[('Entendimento', 'Que perfil, que senioridade e para qual etapa do roadmap.'),
                ('Seleção', 'Indicação de profissionais com o histórico técnico compatível.'),
                ('Entrada', 'O especialista entra no seu time e na sua gestão.'),
                ('Acompanhamento', 'A Atlas segue por trás, como respaldo técnico.')],
        tecnologias=[('Python', 'python', 1), ('SQL', '#SQL', 1), ('Power BI', '#PBI', 1),
                     ('dbt', 'dbt', 1), ('Airflow', 'airflow', 1), ('Databricks', 'databricks', 1),
                     ('BigQuery', 'bigquery', 1), ('Spark', 'spark', 0)],
        case=None,
        prova=('Os mesmos especialistas que entregam os projetos da Atlas são os que '
               'atuam alocados. O histórico técnico está nos cases — mais de 13 projetos '
               'documentados, em mais de 10 setores.'),
        cta='Falar sobre alocação',
        cta2='Ver os projetos entregues',
    ),
]


# ------------------------------------------------------------------ montagem
def montar(pag, comum):
    # com .html: é o caminho que o GitHub Pages serve de fato, e o mesmo
    # que está no sitemap. Canonical apontando para 404 é pior que nenhum.
    url = '%s/%s' % (SITE, pag['arquivo'])
    caps = '\n\n'.join(bloco_capacidade(t, i) for t, i in pag['capacidades'])

    if pag['case']:
        c = pag['case']
        mudou = '\n'.join('          <p><b>%s</b><span>%s</span></p>' % (b, d) for b, d in c['mudou'])
        prova = '''      <article class="case-card reveal d2">
        <div>
          <span class="case-conf">Cliente confidencial</span>
          <div class="case-meta"><span>%s</span><span>%s</span><span>%s</span></div>
          <h3>%s</h3>
          <dl class="case-fields">
            <div><dt>Cenário</dt><dd>%s</dd></div>
            <div><dt>Solução</dt><dd>%s</dd></div>
            <div><dt>Tecnologias</dt><dd>%s</dd></div>
          </dl>
        </div>
        <div class="case-metrics">
          <p class="cm-k">O que mudou</p>
%s
        </div>
      </article>''' % (c['setor'], c['tipo'], c['nuvem'], c['titulo'],
                       c['cenario'], c['solucao'], c['tec'], mudou)
        titulo_prova = 'Um projeto entregue'
    else:
        prova = '      <p class="sub reveal d2">%s</p>' % pag['prova']
        titulo_prova = 'A prova está nos projetos'

    corpo = '''<main id="inicio">

  <section class="sec pag-hero">
    <div class="wrap">
      <div class="sec-lead">
        <span class="eyebrow reveal in">%(eyebrow)s</span>
        <h1 class="h-xl reveal d1 in">%(h1)s</h1>
        <p class="sub reveal d2 in">%(contexto)s</p>
        <div class="hero-ctas reveal d3 in">
          <a class="btn btn-accent" href="index.html#contato" data-magnetic>%(cta)s <span class="arr">&rarr;</span></a>
          <a class="btn btn-line" href="index.html#solucoes" data-magnetic>Ver todas as soluções <span class="arr">&rarr;</span></a>
        </div>
      </div>
    </div>
  </section>

  <div class="divider"></div>

  <section class="sec">
    <div class="wrap">
      <div class="sec-lead">
        <span class="eyebrow reveal">O que fazemos</span>
        <h2 class="h-xl reveal d1">As frentes que entregamos.</h2>
      </div>
      <div class="fam-grid reveal d2">
%(caps)s
      </div>
    </div>
  </section>

  <div class="divider"></div>

  <section class="sec">
    <div class="wrap">
      <div class="sec-lead">
        <span class="eyebrow reveal">Como entregamos</span>
        <h2 class="h-xl reveal d1">Do entendimento à produção.</h2>
      </div>
      <div class="tl reveal d2">
%(etapas)s
      </div>
    </div>
  </section>

  <div class="divider"></div>

  <section class="sec">
    <div class="wrap">
      <div class="sec-lead">
        <span class="eyebrow reveal">Tecnologias</span>
        <h2 class="h-xl reveal d1">O stack sai do problema, não do contrato.</h2>
      </div>
      <div class="pag-tecs reveal d2">
%(tecs)s
      </div>
      <p class="illus-note">&#10022; marca as tecnologias com projeto entregue pela Atlas</p>
    </div>
  </section>

  <div class="divider"></div>

  <section class="sec">
    <div class="wrap">
      <div class="sec-lead">
        <span class="eyebrow reveal">%(titulo_prova)s</span>
        <h2 class="h-xl reveal d1">Resultados que falam por si.</h2>
      </div>
%(prova)s
    </div>
  </section>

  <section class="sec final">
    <div class="wrap">
      <h2 class="h-xl reveal">Vamos transformar seu próximo desafio em resultado?</h2>
      <p class="sub reveal d1">Converse com quem vai executar. Em 30 minutos mapeamos seu
        cenário e indicamos o caminho &mdash; mesmo que ele n&atilde;o passe pela gente.</p>
      <div class="hero-ctas reveal d2">
        <a class="btn btn-accent" href="index.html#contato" data-magnetic>Falar com um especialista <span class="arr">&rarr;</span></a>
        <a class="btn btn-line" href="index.html#cases" data-magnetic>%(cta2)s <span class="arr">&rarr;</span></a>
      </div>
    </div>
  </section>

</main>''' % dict(eyebrow=pag['eyebrow'], h1=pag['h1'], contexto=pag['contexto'],
                  cta=pag['cta'], caps=caps, etapas=bloco_etapas(pag['etapas']),
                  tecs=bloco_tec(pag['tecnologias']), prova=prova,
                  titulo_prova=titulo_prova, cta2=pag['cta2'])

    extra = '''<style>
  /* Ajustes próprios das páginas de serviço. O resto vem do index.html. */
  .pag-hero { padding-top: 3.5rem; }
  .pag-hero h1 { font-family: var(--display); font-weight: 800; letter-spacing: -0.042em;
    font-size: clamp(2rem, 4.6vw, 3.1rem); line-height: 1.04; margin-top: 1.1rem; }
  .pag-tecs { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-top: 2.4rem; }
  .pag-tec { display: inline-flex; align-items: center; gap: 0.6rem;
    border: 1px solid var(--line); border-radius: 999px; padding: 0.4rem 0.9rem 0.4rem 0.4rem;
    font-size: 0.86rem; color: var(--muted); background: var(--panel);
    transition: border-color 0.3s var(--ease), color 0.3s var(--ease); }
  .pag-tec:hover { border-color: rgba(46,134,255,0.45); color: var(--ink); }
  .pag-tec .arq-ring { width: 2rem; height: 2rem; border-radius: 50%%; flex: none;
    border: 1px solid var(--line-soft); background: var(--bg0); position: relative; }
  .pag-tec .arq-ico { width: 1rem; height: 1rem; }
  .pag-tec .arq-mn { font-size: 0.42rem; }
  .fam-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-top: 2.6rem; }
  @media (max-width: 1000px) { .fam-grid { grid-template-columns: 1fr; } }
</style>'''

    return '''<!doctype html>
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
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "%(titulo)s",
  "serviceType": "%(titulo)s",
  "url": "%(url)s",
  "provider": { "@type": "Organization", "name": "Atlas Tec", "url": "%(site)s" },
  "areaServed": "BR",
  "description": "%(meta)s"
}
</script>
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
''' % dict(titulo=pag['titulo'], meta=pag['meta'], url=url, site=SITE,
           estilo=comum['estilo'], extra=extra, header=comum['header'],
           topo=comum['topo'],
           menu=comum['menu'], corpo=corpo, rodape=comum['rodape'],
           chat=comum['chat'], script=comum['script'])


def main():
    html = BASE.read_text()
    comum = extrair(html)
    # Nas páginas internas os links do menu precisam voltar para a home.
    for chave in ('header', 'menu', 'rodape'):
        comum[chave] = re.sub(r'href="#([a-z0-9-]+)"', r'href="index.html#\1"', comum[chave])
    for pag in PAGINAS:
        destino = RAIZ / pag['arquivo']
        destino.write_text(montar(pag, comum))
        print('%-24s %6.1f KB' % (pag['arquivo'], destino.stat().st_size / 1024))


if __name__ == '__main__':
    main()
