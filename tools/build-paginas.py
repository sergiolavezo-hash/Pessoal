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
    chat = um(r'<button class="chat-fab".*?<!-- /chat -->', 'chat')
    # O tema é decidido antes da primeira pintura. Sem este bloco a página
    # interna abre no escuro enquanto a home abre no claro.
    boot = um(r'  <script>\n  /\* Antes da primeira pintura.*?</script>', 'script de tema do head')

    # TODOS os blocos de script que vêm depois do widget de chat, na ordem.
    #
    # Antes isto pegava só o maior deles, e o resultado é que o mega-menu, o
    # carrossel e a frase do hero ficavam de fora de toda página gerada: o
    # botão "Menu" existia no HTML e não fazia nada em dezenove páginas.
    # Cada bloco já se protege sozinho — some quando o elemento dele não
    # está na página —, então levar todos é mais seguro do que escolher.
    fim = html.rindex('</body>')
    ini = html.index('<script', html.index('<!-- /chat -->'))
    script = html[ini:fim].strip()
    if 'Mega-menu' not in script:
        sys.exit('o bloco de scripts não inclui o mega-menu — a fatia saiu errada')
    return dict(estilo=estilo, header=header, menu=menu, rodape=rodape,
                topo=topo, chat=chat.rstrip(), script=script,
                boot=boot)


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
        titulo='Analytics & BI',
        h1='Uma métrica, uma definição, e o indicador na mão de quem decide.',
        meta='Consultoria de Business Intelligence e Data Visualization: camada '
             'semântica, dashboards executivos e governança de indicadores em '
             'Power BI, Looker, Tableau e MicroStrategy.',
        eyebrow='Analytics &amp; BI',
        contexto=('O indicador existe. Mas cada área chega a um número diferente. '
                  'A reunião discute o dado, não a decisão.'),
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
        titulo='Engenharia de Dados',
        h1='A base confiável que sustenta todo o resto.',
        meta='Consultoria de Data Engineering: ingestão, Data Lake, Lakehouse, Data '
             'Warehouse, transformação em dbt e orquestração em Airflow, em Azure, '
             'AWS e Google Cloud.',
        eyebrow='Engenharia de Dados',
        contexto=('Cada pergunta nova vira uma extração nova. A resposta chega tarde, '
                  'e ninguém sabe de onde veio o número.'),
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
        cta='Falar sobre Engenharia de Dados',
        cta2='Quero avaliar minha arquitetura',
    ),
    dict(
        arquivo='alocacao.html',
        slug='alocacao',
        titulo='Especialistas & Squads',
        h1='Quando o que falta não é projeto, é time.',
        meta='Alocação de especialistas de dados e squads: engenheiros de dados, '
             'analistas de BI, cientistas de dados e arquitetos alocados no time do '
             'cliente, com respaldo técnico da Atlas.',
        eyebrow='Pessoas &amp; Alocação',
        contexto=('Roadmap definido, orçamento aprovado. A vaga de engenheiro de dados '
                  'segue aberta, e o projeto não anda.'),
        capacidades=[
            ('Perfis que alocamos', ['Engenheiro de dados', 'Analista e desenvolvedor de BI',
                                     'Cientista de dados', 'Arquiteto de dados']),
            ('Como funciona', ['Contratos de no mínimo 6 meses', 'Alocações por tempo indeterminado',
                               'Sob a gestão do cliente, com respaldo técnico da Atlas',
                               'Substituição sem quebra de ritmo']),
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
        prova=('Mais de 150 profissionais alocados. Contratos de no mínimo seis meses, '
               'boa parte por tempo indeterminado: o cliente renova para manter a pessoa.'),
        cta='Falar sobre alocação',
        cta2='Ver os projetos entregues',
        # O site falava só com quem contrata. Quem vende alocação precisa
        # dos dois lados: sem profissional não há o que alocar.
        talento=True,
    ),
]


# ------------------------------------------------------------------ montagem
TALENTO = '''
  <div class="divider"></div>

  <section class="sec" id="talento">
    <div class="wrap">
      <div class="sec-lead">
        <span class="eyebrow reveal">Para profissionais de TI</span>
        <h2 class="h-xl reveal d1">Trabalhe com a gente.</h2>
        <p class="sub reveal d2">
          Você atua dentro do time do cliente, com o respaldo técnico da Atlas
          por trás. Deixe seu perfil e a gente chama quando houver encaixe.
        </p>
      </div>

      <div class="tal-grid">
        <ul class="tal-pontos reveal d2">
          <li><b>Contratos longos</b><span>No mínimo seis meses, boa parte por tempo indeterminado.</span></li>
          <li><b>Projeto de verdade</b><span>Dados, BI, engenharia e IA em mais de 10 setores.</span></li>
          <li><b>Respaldo técnico</b><span>Você não fica sozinho no cliente: a Atlas está atrás.</span></li>
        </ul>

        <form class="form tal-form reveal d2" id="form-talento"
              action="https://formsubmit.co/sergio.lavezo@atlas-partner.com"
              method="POST" enctype="multipart/form-data">
          <input type="hidden" name="_subject" value="Banco de talentos — novo perfil">
          <input type="hidden" name="_captcha" value="false">
          <input type="hidden" name="_template" value="table">
          <input type="hidden" name="_next" value="https://atlas-partner.com/alocacao.html?enviado=1">
          <div class="form-row">
            <div class="field"><label for="t-nome">Nome</label><input id="t-nome" name="nome" type="text" autocomplete="name" required></div>
            <div class="field"><label for="t-email">E-mail</label><input id="t-email" name="email" type="email" autocomplete="email" required></div>
          </div>
          <div class="form-row">
            <div class="field">
              <label for="t-perfil">Perfil</label>
              <select id="t-perfil" name="perfil" required>
                <option value="">Selecione</option>
                <option>Engenheiro de dados</option>
                <option>Analista / desenvolvedor de BI</option>
                <option>Cientista de dados</option>
                <option>Arquiteto de dados</option>
                <option>Analista de dados</option>
                <option>Outro</option>
              </select>
            </div>
            <div class="field">
              <label for="t-senior">Senioridade</label>
              <select id="t-senior" name="senioridade" required>
                <option value="">Selecione</option>
                <option>Júnior</option><option>Pleno</option>
                <option>Sênior</option><option>Especialista / Lead</option>
              </select>
            </div>
          </div>
          <div class="field"><label for="t-linkedin">LinkedIn <em>(opcional)</em></label><input id="t-linkedin" name="linkedin" type="url" placeholder="https://linkedin.com/in/..."></div>
          <div class="field">
            <label for="t-cv">Currículo <em>(PDF ou Word, até 5 MB)</em></label>
            <input id="t-cv" name="curriculo" type="file" accept=".pdf,.doc,.docx" required>
          </div>
          <button class="btn btn-accent" type="submit" style="justify-content:center;">Enviar meu perfil &rarr;</button>
          <p class="form-note">Seu currículo é usado só para avaliar encaixe em projetos da Atlas.</p>
        </form>
      </div>

      <div class="tal-ok" id="tal-ok" role="status">
        <b>Perfil recebido.</b>
        <span>Guardamos seu currículo no banco de talentos e chamamos quando houver encaixe em um projeto.</span>
      </div>
    </div>
  </section>

  <script>
    // O envio com anexo passa pelo FormSubmit e volta com ?enviado=1: o
    // endpoint AJAX não aceita arquivo, então o formulário é POST de verdade.
    (function () {
      if (new URLSearchParams(location.search).get('enviado') !== '1') return;
      var ok = document.getElementById('tal-ok');
      var fm = document.getElementById('form-talento');
      if (ok) { ok.classList.add('on'); ok.scrollIntoView({ block: 'center' }); }
      if (fm) fm.style.display = 'none';
      history.replaceState(null, '', location.pathname + location.hash);
    })();
  </script>
'''


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

@TALENTO@
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
    corpo = corpo.replace('@TALENTO@', TALENTO if pag.get('talento') else '')

    extra = '''<style>
  /* Ajustes próprios das páginas de serviço. O resto vem do index.html. */
  .pag-hero { padding-top: 3.5rem; }
  .pag-hero h1 { font-family: var(--display); font-weight: 400; letter-spacing: -0.042em;
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

  /* ---- bloco de talento ---- */
  .tal-grid { display: grid; grid-template-columns: 0.85fr 1.15fr; gap: 2.5rem; align-items: start; margin-top: 2.6rem; }
  .tal-pontos { list-style: none; padding: 0; margin: 0; display: grid; gap: 1.2rem; }
  .tal-pontos li { display: flex; flex-direction: column; gap: 0.2rem; border-left: 2px solid var(--accent); padding-left: 1rem; }
  .tal-pontos b { font-size: 1rem; font-weight: 600; }
  .tal-pontos span { color: var(--muted); font-size: 0.9rem; }
  .tal-form select {
    width: 100%%; background: var(--bg0); border: 1px solid var(--line); border-radius: 10px;
    padding: 0.8rem 0.9rem; color: var(--ink); font-family: var(--body); font-size: 0.95rem;
  }
  .tal-form select:focus-visible { outline: 2px solid var(--accent-light); outline-offset: 2px; }
  .tal-form input[type="file"] { width: 100%%; color: var(--muted); font-size: 0.88rem; }
  .tal-form input[type="file"]::file-selector-button {
    margin-right: 0.8rem; border: 1px solid var(--line); border-radius: 999px;
    padding: 0.45rem 0.9rem; background: var(--panel); color: var(--ink);
    font-family: var(--body); font-size: 0.85rem; cursor: pointer;
  }
  .tal-ok {
    display: none; border: 1px solid rgba(46,134,255,0.4); border-radius: 14px;
    padding: 1.4rem 1.5rem; background: rgba(46,134,255,0.08); margin-top: 2.6rem;
  }
  .tal-ok.on { display: block; }
  .tal-ok b { display: block; font-family: var(--display); font-size: 1.15rem; font-weight: 600; }
  .tal-ok span { display: block; color: var(--muted); margin-top: 0.3rem; }

  @media (max-width: 1000px) {
    .fam-grid { grid-template-columns: 1fr; }
    .tal-grid { grid-template-columns: 1fr; gap: 1.8rem; }
  }
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
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="preload" href="media/fonts/mona-sans-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<meta name="theme-color" content="#F2F1ED">
%(boot)s
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
           chat=comum['chat'], script=comum['script'], boot=comum['boot'])


CASCA_404 = '''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Página não encontrada &mdash; Atlas Tec</title>
<meta name="description" content="A página pedida não existe neste endereço.">
<meta name="robots" content="noindex, follow">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="preload" href="/media/fonts/mona-sans-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
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
%(chat)s
%(script)s
</body>
</html>
'''


def montar_404(comum):
    """A página que o GitHub Pages devolve em qualquer caminho inexistente.

    Como ela responde tanto em /nao-existe quanto em /cases/nao-existe, todo
    link e todo arquivo precisam sair da raiz: caminho relativo quebraria na
    subpasta. Não leva canonical nem JSON-LD, e pede noindex — página de erro
    não entra em índice de busca.
    """
    c = dict(comum)
    for k in ('header', 'menu', 'rodape', 'chat', 'topo', 'script'):
        c[k] = re.sub(r'(href|src)="(?!https?:|#|mailto:|//|/)', r'\1="/', c[k])
        c[k] = c[k].replace('href="#', 'href="/index.html#')
    c['estilo'] = re.sub(r'url\((?!https?:|data:|/)', 'url(/', comum['estilo'])

    corpo = (
        '<main id="conteudo">\n'
        '  <section class="sec">\n'
        '    <div class="wrap" style="min-height:52vh;display:flex;flex-direction:column;justify-content:center">\n'
        '      <p class="eyebrow"><i></i> Erro 404</p>\n'
        '      <h1 class="h-xl" style="max-width:20ch" aria-label="Essa página não existe.">'
        'Essa página não existe.</h1>\n'
        '      <p class="lead" style="max-width:54ch">O endereço pode ter mudado de lugar ou vindo com '
        'algum caractere a mais. Os caminhos abaixo continuam valendo.</p>\n'
        '      <div class="hero-ctas" style="margin-top:2rem">\n'
        '        <a class="btn btn-accent" href="/index.html">Voltar para a home <span class="arr">&rarr;</span></a>\n'
        '        <a class="btn btn-ghost" href="/cases-de-sucesso.html">Ver os cases <span class="arr">&rarr;</span></a>\n'
        '      </div>\n'
        '    </div>\n'
        '  </section>\n'
        '</main>'
    )

    return CASCA_404 % dict(boot=comum['boot'], estilo=c['estilo'], topo=c['topo'],
                            header=c['header'], menu=c['menu'], corpo=corpo,
                            rodape=c['rodape'], chat=c['chat'], script=c['script'])


CASCA_PRIVACIDADE = '''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Privacidade &mdash; Atlas Tec</title>
<meta name="description" content="Quais dados o site da Atlas coleta, por que coleta, com quem compartilha e o que você pode pedir sobre eles.">
<link rel="canonical" href="https://atlas-partner.com/privacidade.html">
<meta property="og:type" content="website">
<meta property="og:title" content="Privacidade &mdash; Atlas Tec">
<meta property="og:url" content="https://atlas-partner.com/privacidade.html">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="preload" href="media/fonts/mona-sans-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
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
'''


CSS_PRIVACIDADE = '''<style>
  /* Página de texto corrido: a única do site que é leitura longa. Usa os
     mesmos tokens, só define a medida de linha e o ritmo vertical. */
  .doc { max-width: 68ch; }
  .doc h2 { font-size: clamp(1.25rem, 2.2vw, 1.6rem); font-weight: 500; margin: 2.6rem 0 0.9rem; letter-spacing: -0.018em; }
  .doc h3 { font-size: 1.02rem; font-weight: 550; margin: 1.6rem 0 0.5rem; }
  .doc p { color: var(--muted); margin-bottom: 1rem; }
  .doc ul { color: var(--muted); margin: 0 0 1.1rem 1.1rem; }
  .doc li { margin-bottom: 0.45rem; }
  .doc strong { color: var(--ink); font-weight: 600; }
  .doc table { width: 100%; border-collapse: collapse; margin: 1rem 0 1.4rem; font-size: 0.92rem; }
  .doc th, .doc td { text-align: left; padding: 0.7rem 0.8rem; border-bottom: 1px solid var(--line-soft); color: var(--muted); vertical-align: top; }
  .doc th { color: var(--ink); font-weight: 600; font-size: 0.86rem; }
  .doc code { font-family: var(--mono); font-size: 0.86em; color: var(--accent); }
  .doc-pendente { border: 1px dashed var(--line-strong); border-radius: 12px; padding: 1.1rem 1.2rem; margin: 1.2rem 0; }
  .doc-pendente p { margin: 0; color: var(--dim); font-size: 0.92rem; }
  .doc-data { color: var(--dim); font-size: 0.88rem; margin-top: 2.6rem; padding-top: 1.2rem; }
</style>'''


def montar_privacidade(comum):
    """Política de privacidade.

    Só afirma o que o site de fato faz: os campos que o formulário coleta,
    os cookies que o Analytics grava, o que o FormSubmit recebe e o que é
    guardado no navegador. Nada de declaração genérica de conformidade —
    isso depende de avaliação jurídica, não de configuração técnica.
    """
    corpo = '''<main id="conteudo">
  <section class="sec">
    <div class="wrap">
      <span class="eyebrow">Privacidade</span>
      <h1 class="h-xl">Como a Atlas trata os seus dados.</h1>
      <div class="doc">
        <p>Esta página descreve quais dados o site <strong>atlas-partner.com</strong>
          coleta, por que coleta, com quem compartilha e o que você pode pedir
          sobre eles. Ela cobre apenas este site.</p>

        <h2>Quem é a controladora</h2>
        <p>Os dados coletados neste site são tratados pela empresa inscrita no
          CNPJ sob o nº <strong>36.047.604/0001-30</strong>, com sede em São Paulo/SP,
          que atua sob a marca <strong>Atlas Tecnologia</strong>.</p>


        <h2>O que o site coleta</h2>

        <h3>Formulário de contato</h3>
        <p>Quando você preenche o formulário, a Atlas recebe:</p>
        <ul>
          <li><strong>Nome</strong> e <strong>empresa</strong> — obrigatórios.</li>
          <li><strong>E-mail corporativo</strong> — obrigatório, é por onde respondemos.</li>
          <li><strong>Cargo</strong> e <strong>telefone/WhatsApp</strong> — opcionais.</li>
          <li><strong>Assunto</strong> e <strong>a descrição do seu desafio</strong> — o que você escrever.</li>
        </ul>
        <p>O envio vai para o <strong>FormSubmit</strong>, serviço de terceiro que
          encaminha o conteúdo por e-mail para a Atlas. Como ele opera fora do
          Brasil, isso configura <strong>transferência internacional de dados</strong>.
          O site não guarda nada do que você escreve: não há banco de dados aqui.</p>
        <p><strong>Por quanto tempo:</strong> o conteúdo recebido é apagado em até
          <strong>2 meses</strong> contados do envio, salvo se nesse período a
          conversa evoluir para uma relação contratual — caso em que passa a valer
          o prazo do contrato e as obrigações legais de guarda.</p>

        <h3>Envio de currículo</h3>
        <p>Na página de alocação, quem quiser se candidatar envia:</p>
        <ul>
          <li><strong>Nome</strong> e <strong>e-mail</strong> — obrigatórios.</li>
          <li><strong>Perfil</strong> e <strong>senioridade</strong> — para saber onde você se encaixa.</li>
          <li><strong>LinkedIn</strong> — opcional.</li>
          <li><strong>O arquivo do currículo</strong>, em PDF, DOC ou DOCX.</li>
        </ul>
        <p>O currículo segue pelo mesmo caminho do formulário de contato: vai
          para o <strong>FormSubmit</strong>, que encaminha por e-mail para a
          Atlas. Vale aqui a mesma observação sobre
          <strong>transferência internacional de dados</strong>, e o site também
          não guarda o arquivo: não há banco de dados nesta página.</p>
        <p><strong>Para que serve:</strong> recrutamento e seleção. O perfil fica
          no banco de talentos da Atlas e pode ser consultado em vagas futuras,
          não só na oportunidade do momento.</p>
        <p><strong>Por quanto tempo:</strong> o currículo e os dados enviados com
          ele são apagados em até <strong>6 meses</strong> contados do envio, salvo
          se você for contratado — caso em que passam a valer os prazos
          trabalhistas e as obrigações legais de guarda.</p>
        <p>Você pode pedir a exclusão antes desse prazo a qualquer momento, pelos
          mesmos canais descritos em <em>Seus direitos</em>, abaixo.</p>

        <h3>Chat do site</h3>
        <p>O assistente do site envia o que você digita e o contato que você
          deixar pelo mesmo caminho do formulário, para o FormSubmit. A conversa
          não fica salva no navegador nem em servidor da Atlas.</p>

        <h3>Medição de audiência</h3>
        <p>O site usa <strong>Google Analytics 4</strong> para entender quantas
          pessoas o visitam e por quais páginas passam — <strong>e só com a sua
          permissão</strong>. Enquanto você não aceitar, nada é baixado do Google e
          nenhum cookie de medição é gravado. Aceitando, entram dois cookies:</p>
        <table>
          <tr><th>Cookie</th><th>Para quê</th></tr>
          <tr><td><code>_ga</code></td><td>Distingue visitantes entre si, sem identificar quem são.</td></tr>
          <tr><td><code>_ga_B0QFW3ZH7K</code></td><td>Mantém o estado da sessão de medição.</td></tr>
        </table>
        <p>O Google também recebe o seu endereço de IP ao carregar a fonte
          <code>IBM Plex Mono</code> usada no site.</p>

        <h3>O que fica no seu navegador e não sai dele</h3>
        <p>Três preferências ficam guardadas só no seu aparelho, não são enviadas
          a lugar nenhum e não servem para rastrear:</p>
        <ul>
          <li><code>atlas-tema</code> — se você escolheu o tema claro ou escuro.</li>
          <li><code>atlas-chat-seen</code> — se o chat já te cumprimentou nesta visita.</li>
          <li><code>cbar-off</code> — se você fechou a barra de conversa.</li>
        </ul>

        <h2>Para que a Atlas usa esses dados</h2>
        <ul>
          <li><strong>Responder ao seu contato.</strong> É a única finalidade do que
            chega pelo formulário comercial e pelo chat.</li>
          <li><strong>Recrutamento e seleção.</strong> É a finalidade do currículo e
            dos dados enviados com ele, inclusive para vagas futuras.</li>
          <li><strong>Entender o uso do site</strong> de forma agregada, para
            melhorá-lo.</li>
        </ul>
        <p>A Atlas <strong>não vende</strong> os seus dados, <strong>não os usa para
          publicidade</strong> e <strong>não os repassa</strong> a terceiros além dos
          serviços descritos acima.</p>

        <h2>Seus direitos</h2>
        <p>A Lei Geral de Proteção de Dados (Lei 13.709/2018) garante que você
          peça, a qualquer momento:</p>
        <ul>
          <li>confirmação de que existe tratamento dos seus dados;</li>
          <li>acesso aos dados que a Atlas tem sobre você;</li>
          <li>correção de dado incompleto ou desatualizado;</li>
          <li>anonimização, bloqueio ou eliminação de dado desnecessário;</li>
          <li>portabilidade;</li>
          <li>informação sobre com quem a Atlas compartilhou os seus dados;</li>
          <li>revogação do consentimento.</li>
        </ul>

        <p>Para exercer qualquer um deles, use o
          <a href="index.html#contato">formulário de contato</a> marcando a opção
          <strong>Privacidade</strong>. É o canal de comunicação com o encarregado
          pelo tratamento de dados da Atlas, e o pedido é respondido no mesmo
          e-mail que você informar.</p>

        <h2>Como mudar sua escolha sobre cookies</h2>
        <p>A escolha fica guardada no seu próprio navegador e vale só para ele.
          Para rever, use o botão abaixo: o aviso reaparece e você decide de novo.
          Recusar também apaga os cookies de medição que já existirem.</p>
        <p><button class="btn btn-line" type="button" id="cookies-rever">Rever escolha de cookies</button></p>

        <h2>Segurança</h2>
        <p>O site é servido por HTTPS e não armazena dados de visitantes. As
          medidas técnicas aplicadas e as pendências conhecidas estão registradas
          no repositório do projeto, em <code>SECURITY.md</code>.</p>

        <h2>Mudanças nesta página</h2>
        <p>Alterações relevantes passam a valer na data indicada abaixo.</p>

        <p class="doc-data">Última atualização: <strong>4 de novembro de 2026</strong>.</p>
      </div>
    </div>
  </section>
</main>'''

    return CASCA_PRIVACIDADE % dict(
        boot=comum['boot'], estilo=comum['estilo'], extra=CSS_PRIVACIDADE,
        topo=comum['topo'], header=comum['header'], menu=comum['menu'],
        corpo=corpo, rodape=comum['rodape'], chat=comum['chat'], script=comum['script'])


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

    erro = RAIZ / '404.html'
    erro.write_text(montar_404(comum))
    print('%-24s %6.1f KB' % ('404.html', erro.stat().st_size / 1024))

    priv = RAIZ / 'privacidade.html'
    priv.write_text(montar_privacidade(comum))
    print('%-24s %6.1f KB' % ('privacidade.html', priv.stat().st_size / 1024))


if __name__ == '__main__':
    main()
