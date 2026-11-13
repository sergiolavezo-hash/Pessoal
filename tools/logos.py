# -*- coding: utf-8 -*-
"""Logos das ferramentas nos cases, nas páginas de parceiros e nas de serviço.

Cada ferramenta aponta para um arquivo em media/logos/ (marca em SVG de um
só traço, pintada com a cor da própria marca por máscara CSS). Ferramenta sem
logo no repositório aparece com um monograma neutro: inventar uma marca é pior
que não ter. Conceitos que não são ferramenta (Analytics, BI, Machine Learning,
Dashboards...) não ganham logo.

Uso (nos geradores):  import logos
    logos.chip('Power BI', prefixo='../')       # chip com logo
    logos.eh_ferramenta('Analytics')            # False
    logos.css()                                  # estilo do componente
"""
import html
import pathlib

RAIZ = pathlib.Path(__file__).resolve().parent.parent

# arquivo (sem .svg) -> cor da marca
COR = {
    'airbyte': '615EFF', 'airflow': '017CEE', 'alteryx': '0078C0', 'anthropic': 'D97757', 'aws': 'FF9900',
    'azure': '0078D4', 'bigquery': '669DF6', 'claude': 'D97757', 'databricks': 'FF3621', 'dataiku': '2AB1AC',
    'dbt': 'FF694B', 'elasticsearch': '005571', 'figma': 'F24E1E', 'gemini': '8E75B2', 'googlecloud': '4285F4',
    'huggingface': 'E6B800', 'informatica': 'FF4D00', 'java': 'E76F00', 'jupyter': 'F37626', 'kafka': '231F20',
    'ibm': '0F62FE', 'looker': '4285F4', 'metabase': '509EE3', 'microstrategy': 'D9232E', 'microsoft': '5E5E5E', 'mlflow': '0194E2', 'mongodb': '47A248',
    'openai': '412991', 'oracle': 'C74634', 'pandas': '150458', 'polars': '0075FF', 'postgresql': '4169E1',
    'powerbi': 'E8B80A', 'python': '3776AB', 'qlik': '009848', 'r': '276DC3', 'redis': 'FF4438', 'redshift': '8C4FFF',
    'snowflake': '29B5E8', 'spark': 'E25A1C', 'sqlserver': 'CC2927', 'superset': '20A6C9', 'tableau': 'E97627',
}

# nome como aparece nos cases e no catálogo -> arquivo
ALIAS = {
    'Power BI': 'powerbi', 'GCP': 'googlecloud', 'Google Cloud': 'googlecloud', 'Cloud Composer': 'googlecloud',
    'BigQuery': 'bigquery', 'Airflow': 'airflow', 'Looker': 'looker', 'MicroStrategy': 'microstrategy',
    'SQL Server': 'sqlserver', 'SSIS': 'sqlserver', 'Azure': 'azure', 'Azure Synapse': 'azure', 'Data Factory': 'azure',
    'Databricks': 'databricks', 'dbt': 'dbt', 'dbt tests': 'dbt', 'Java': 'java', 'Informatica PowerCenter': 'informatica',
    'Oracle': 'oracle', 'Claude': 'claude', 'Anthropic': 'anthropic', 'Tableau': 'tableau', 'Figma': 'figma',
    'Snowflake': 'snowflake', 'AWS': 'aws', 'Redshift': 'redshift', 'Spark': 'spark', 'Kafka': 'kafka', 'Qlik': 'qlik',
    'Metabase': 'metabase', 'Superset': 'superset', 'Airbyte': 'airbyte', 'Python': 'python', 'R': 'r',
    'OpenAI': 'openai', 'Gemini': 'gemini', 'Hugging Face': 'huggingface', 'MLflow': 'mlflow', 'PostgreSQL': 'postgresql',
    'MongoDB': 'mongodb', 'Redis': 'redis', 'Elasticsearch': 'elasticsearch', 'Jupyter': 'jupyter', 'pandas': 'pandas',
    'Polars': 'polars', 'Dataiku': 'dataiku', 'Alteryx': 'alteryx',
    # produtos de um fornecedor que não têm marca própria no repositório usam a do fornecedor
    'Microsoft Fabric': 'microsoft', 'Purview': 'microsoft', 'Microsoft': 'microsoft',
    'watsonx': 'ibm', 'Db2': 'ibm', 'IBM': 'ibm', 'Unity Catalog': 'databricks',
}

# Ferramentas reais que ainda não têm marca no repositório: ganham monograma.
SEM_LOGO = {'Pentaho', 'Fivetran', 'Collibra', 'Alation', 'Atlan', 'SQL'}


def e(s):
    return html.escape(s, quote=True)


def eh_ferramenta(nome):
    return nome in ALIAS or nome in SEM_LOGO


def _anel(nome, prefixo, tam):
    arq = ALIAS.get(nome)
    if arq and (RAIZ / 'media' / 'logos' / (arq + '.svg')).exists():
        return ('<span class="lg-ring %s"><span class="lg-ico" style="--i:url(%smedia/logos/%s.svg);--bc:#%s"></span></span>'
                % (tam, prefixo, arq, COR.get(arq, '131316')))
    mn = ''.join(c for c in nome if c.isalnum())[:3].upper()
    return '<span class="lg-ring %s"><span class="lg-mn">%s</span></span>' % (tam, e(mn))


def chip(nome, prefixo='', tam='lg-sm', estrela=False):
    """Chip com logo e nome. 'prefixo' é '../' nas páginas dentro de subpasta."""
    star = '<span class="lg-star">&#10022;</span>' if estrela else ''
    return '<span class="lg-tec" title="%s">%s%s%s</span>' % (e(nome), _anel(nome, prefixo, tam), star, e(nome))


def so_logo(nome, prefixo=''):
    """Só o logo (com o nome no title e no aria-label), para linhas compactas."""
    return '<span class="lg-solo" title="%s" aria-label="%s" role="img">%s</span>' % (e(nome), e(nome), _anel(nome, prefixo, 'lg-sm'))


def unicas(tecs, maximo=6):
    """Ferramentas de uma lista, sem repetir a mesma marca (GCP e Cloud Composer
    dividem o logo do Google Cloud) e sem conceitos."""
    vistos, out = set(), []
    for n in tecs or []:
        if not eh_ferramenta(n):
            continue
        k = ALIAS.get(n, n)
        if k in vistos:
            continue
        vistos.add(k)
        out.append(n)
    return out[:maximo]


def unicas(tecs, maximo=6):
    """Ferramentas de uma lista, sem repetir a mesma marca (GCP e Cloud Composer
    dividem o logo do Google Cloud) e sem conceitos."""
    vistos, out = set(), []
    for n in tecs or []:
        if not eh_ferramenta(n):
            continue
        k = ALIAS.get(n, n)
        if k in vistos:
            continue
        vistos.add(k)
        out.append(n)
    return out[:maximo]


def css():
    return '''
  /* ---- logos das ferramentas ---- */
  .lg-ring { position: relative; flex: none; display: grid; place-items: center; border-radius: 50%; background: #fff; border: 1px solid var(--line); }
  .lg-ring.lg-sm { width: 1.7rem; height: 1.7rem; } .lg-ring.lg-md { width: 2.1rem; height: 2.1rem; } .lg-ring.lg-xl { width: 2.7rem; height: 2.7rem; }
  .lg-ico { display: block; width: 56%; height: 56%; background: var(--bc, #131316); -webkit-mask: var(--i) center / contain no-repeat; mask: var(--i) center / contain no-repeat; }
  .lg-mn { font-family: var(--mono); font-size: .46rem; font-weight: 600; letter-spacing: .02em; color: #131316; }
  .lg-xl .lg-mn { font-size: .62rem; } .lg-md .lg-mn { font-size: .52rem; }
  .lg-star { position: absolute; margin: -1.5rem 0 0 1.25rem; font-size: .7rem; color: var(--accent); line-height: 1; }
  .lg-tec { display: inline-flex; align-items: center; gap: .5rem; border: 1px solid var(--line); border-radius: 999px; padding: .22rem .75rem .22rem .22rem;
    font-size: .8rem; color: var(--muted); background: var(--panel-2); transition: border-color .3s, color .3s; }
  .lg-tec:hover { border-color: rgba(46,134,255,.45); color: var(--ink); }
  .lg-solo { display: inline-flex; }
  .cc-logos { display: flex; flex-wrap: wrap; gap: .4rem; margin-top: .8rem; }
  .cc-logos { display: flex; flex-wrap: wrap; gap: .4rem; margin-top: .8rem; }
  .lg-txt { font-size: .78rem; color: var(--muted); background: var(--panel-2); border: 1px solid var(--line); border-radius: 999px; padding: .28rem .7rem; }
'''
