#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gera media/js/i18n-dic.js a partir da tabela abaixo.

A chave é o português normalizado, igual ao que o motor lê em tempo de
execução. Por isso toda chave daqui é conferida contra tools/textos-pt.json
antes de gravar: uma chave com um espaço a mais não traduz nada e nada
avisa — o site só aparece em português e ninguém descobre o porquê.

Uso:  node tools/extrai-textos.js index.html > tools/textos-pt.json
      python3 tools/build-i18n.py

A extração cobre todas as páginas porque o dicionário é um só: uma chave que
existe apenas na página de cases precisa validar aqui também.
"""
import json
import pathlib
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
FONTE = RAIZ / 'tools' / 'textos-pt.json'
SAIDA = RAIZ / 'media' / 'js' / 'i18n-dic.js'

# Chaves que existem só no runtime do motor (não saem da extração de blocos).
# O aria-label do botão de tema é reescrito pelo próprio alternador no
# carregamento, então nunca aparece na extração — é declarado aqui.
EXTRAS = {'@h1-destaque', 'Alternar entre tema claro e escuro',
          'Mudar para o tema claro', 'Mudar para o tema escuro',
          'decisões extraordinárias', 'dados e analytics', 'engenharia de dados',
          'inteligência artificial', 'times de especialistas',
          'inteligência estratégica e decisões mais assertivas',
          'oportunidades de negócio e resultados mensuráveis',
          'conhecimento que impulsiona o crescimento',
          'vantagem competitiva por meio de analytics e inovação',
          'clareza para decidir, eficiência para operar',
          'valor, conectando informação à estratégia do negócio',
          'soluções que simplificam operações e potencializam resultados'}

# pt: (en, es)
TRAD = {
  # ---------------- cabeçalho, mega-menu e navegação ----------------
  'Menu': ('Menu', 'Menú'),
  'Soluções': ('Solutions', 'Soluciones'),
  'Alocação': ('Staffing', 'Asignación'),
  'Sobre': ('About', 'Acerca de'),
  'Carreiras': ('Careers', 'Carreras'),
  'Contato': ('Contact', 'Contacto'),
  'Falar com um especialista <span class="arr">→</span>':
    ('Talk to a specialist <span class="arr">→</span>', 'Hablar con un especialista <span class="arr">→</span>'),
  'Conhecer nossas soluções <span class="arr">→</span>':
    ('Explore our solutions <span class="arr">→</span>', 'Conocer nuestras soluciones <span class="arr">→</span>'),
  'Ver todos os cases <span class="arr">→</span>':
    ('See all case studies <span class="arr">→</span>', 'Ver todos los casos <span class="arr">→</span>'),
  'Conhecer alocação <span class="arr">→</span>':
    ('Explore staffing <span class="arr">→</span>', 'Conocer la asignación <span class="arr">→</span>'),
  'Conhecer BI &amp; Analytics <span class="arr">→</span>':
    ('Explore BI &amp; Analytics <span class="arr">→</span>', 'Conocer BI &amp; Analytics <span class="arr">→</span>'),
  'Conhecer Data Engineering <span class="arr">→</span>':
    ('Explore Data Engineering <span class="arr">→</span>', 'Conocer Data Engineering <span class="arr">→</span>'),
  'Conhecer IA <span class="arr">→</span>': ('Explore AI <span class="arr">→</span>', 'Conocer IA <span class="arr">→</span>'),
  'Escolher idioma': ('Choose language', 'Elegir idioma'),
  'Seções do site': ('Site sections', 'Secciones del sitio'),
  'Fechar o menu': ('Close menu', 'Cerrar el menú'),
  'Dispensar': ('Dismiss', 'Descartar'),
  'Tem um desafio de dados?': ('Got a data challenge?', '¿Tiene un desafío de datos?'),
  'Trabalhe com a gente': ('Work with us', 'Trabaje con nosotros'),

  # ---------------- cartões do mega-menu ----------------
  'Do dado organizado à leitura do negócio: dashboards, self-service e governança de métricas.':
    ('From organized data to business insight: dashboards, self-service and metric governance.',
     'Del dato organizado a la lectura del negocio: dashboards, autoservicio y gobernanza de métricas.'),
  'Ingestão, armazenamento, transformação e governança — a base por onde o dado anda.':
    ('Ingestion, storage, transformation and governance — the foundation the data travels on.',
     'Ingesta, almacenamiento, transformación y gobernanza — la base por donde circula el dato.'),
  'Modelos preditivos, detecção de anomalias, GenAI e Document AI sobre a sua própria base.':
    ('Predictive models, anomaly detection, GenAI and Document AI on your own data.',
     'Modelos predictivos, detección de anomalías, GenAI y Document AI sobre su propia base.'),
  'Gente de dados dentro do seu time, em contratos de no mínimo 6 meses.':
    ('Data people inside your team, on contracts of at least 6 months.',
     'Gente de datos dentro de su equipo, en contratos de 6 meses como mínimo.'),
  'Cenário, arquitetura, stack e o antes e depois de cada entrega.':
    ('Context, architecture, stack and the before and after of every delivery.',
     'Escenario, arquitectura, stack y el antes y el después de cada entrega.'),
  'Migração e governança de BI em escala, com uma definição por métrica.':
    ('BI migration and governance at scale, with one definition per metric.',
     'Migración y gobernanza de BI a escala, con una definición por métrica.'),
  'Modernização para Google Cloud sem interromper a operação.':
    ('Modernization to Google Cloud without interrupting operations.',
     'Modernización a Google Cloud sin interrumpir la operación.'),
  'Do bancário ao food service, passando por saúde, educação e varejo.':
    ('From banking to food service, by way of healthcare, education and retail.',
     'De la banca al food service, pasando por salud, educación y retail.'),
  'Modelos preditivos, detecção de anomalias, GenAI e Document AI.':
    ('Predictive models, anomaly detection, GenAI and Document AI.',
     'Modelos predictivos, detección de anomalías, GenAI y Document AI.'),
  'O que a IA resolve': ('What AI solves', 'Lo que resuelve la IA'),
  'Alocação de especialistas <span class="mega-tag">150+ alocados</span>':
    ('Specialist staffing <span class="mega-tag">150+ placed</span>',
     'Asignación de especialistas <span class="mega-tag">150+ asignados</span>'),
  'Todos os cases <span class="mega-tag">13 projetos</span>':
    ('All case studies <span class="mega-tag">13 projects</span>',
     'Todos los casos <span class="mega-tag">13 proyectos</span>'),
  'De 200+ painéis a um ambiente': ('From 200+ dashboards to one environment', 'De 200+ paneles a un solo entorno'),
  'Legado Oracle aposentado': ('Oracle legacy retired', 'Legado Oracle jubilado'),
  'Setores atendidos <span class="mega-tag">10+</span>':
    ('Industries served <span class="mega-tag">10+</span>', 'Sectores atendidos <span class="mega-tag">10+</span>'),
  'Perfis disponíveis': ('Available profiles', 'Perfiles disponibles'),
  'Trabalhe com a gente <span class="mega-tag">Carreiras</span>':
    ('Work with us <span class="mega-tag">Careers</span>', 'Trabaje con nosotros <span class="mega-tag">Carreras</span>'),
  'Permanência <span class="mega-tag">150.000+ horas</span>':
    ('Tenure <span class="mega-tag">150,000+ hours</span>', 'Permanencia <span class="mega-tag">150.000+ horas</span>'),
  'Valores e método': ('Values and method', 'Valores y método'),
  'Números <span class="mega-tag">500+ projetos</span>':
    ('Numbers <span class="mega-tag">500+ projects</span>', 'Números <span class="mega-tag">500+ proyectos</span>'),
  'Como funciona': ('How it works', 'Cómo funciona'),

  # Números do painel: só o inglês muda o separador decimal.
  'Especialistas que entram na sua operação e respondem à sua gestão.':
    ('Specialists who join your operation and report to your management.',
     'Especialistas que entran en su operación y responden a su gestión.'),
  'Engenheiros, analistas, cientistas de dados e squads completos.':
    ('Engineers, analysts, data scientists and complete squads.',
     'Ingenieros, analistas, científicos de datos y squads completos.'),
  'Banco de talentos da Atlas: envie seu perfil e seu currículo.':
    ('Atlas talent pool: send your profile and your CV.',
     'Banco de talentos de Atlas: envíe su perfil y su currículum.'),
  'Contratos de no mínimo 6 meses, muitos por tempo indeterminado.':
    ('Contracts of at least 6 months, many of them open-ended.',
     'Contratos de 6 meses como mínimo, muchos por tiempo indefinido.'),
  'Consultoria de tecnologia em dados e alocação de especialistas.':
    ('Technology consultancy in data and specialist staffing.',
     'Consultoría de tecnología en datos y asignación de especialistas.'),
  'Clareza, resultado, profundidade e parceria — e como isso vira projeto.':
    ('Clarity, results, depth and partnership — and how that becomes a project.',
     'Claridad, resultado, profundidad y alianza — y cómo eso se vuelve proyecto.'),
  'Entregas, setores, profissionais alocados e horas em alocação.':
    ('Deliveries, industries, professionals placed and hours on assignment.',
     'Entregas, sectores, profesionales asignados y horas en asignación.'),
  'Conversa de 30 minutos, com quem vai executar. Resposta em 1 dia útil.':
    ('A 30-minute conversation, with the people who will do the work. Reply within 1 business day.',
     'Conversación de 30 minutos, con quien va a ejecutar. Respuesta en 1 día hábil.'),
  'Por onde começar?': ('Where to start?', '¿Por dónde empezar?'),
  'Escolha o caminho mais perto do seu cenário e fale com quem vai executar.':
    ('Pick the path closest to your situation and talk to the people who will do the work.',
     'Elija el camino más cercano a su escenario y hable con quien va a ejecutar.'),
  '<b>Decidir mais rápido com dados</b><span>Transformar o dado que já existe em leitura do negócio.</span>':
    ('<b>Decide faster with data</b><span>Turn the data you already have into business insight.</span>',
     '<b>Decidir más rápido con datos</b><span>Transformar el dato que ya existe en lectura del negocio.</span>'),
  '<b>Reforçar o time com especialistas</b><span>Quando o que falta não é projeto, é gente de dados.</span>':
    ('<b>Strengthen the team with specialists</b><span>When what is missing is not a project, but data people.</span>',
     '<b>Reforzar el equipo con especialistas</b><span>Cuando lo que falta no es proyecto, es gente de datos.</span>'),
  '<b>500+</b> projetos <i>·</i> <b>150+</b> alocados <i>·</i> <b>10+</b> setores <i>·</i> <b>150.000+</b> horas':
    ('<b>500+</b> projects <i>·</i> <b>150+</b> placed <i>·</i> <b>10+</b> industries <i>·</i> <b>150,000+</b> hours',
     '<b>500+</b> proyectos <i>·</i> <b>150+</b> asignados <i>·</i> <b>10+</b> sectores <i>·</i> <b>150.000+</b> horas'),

  # ---------------- hero ----------------
  'A Atlas transforma dados complexos em decisões extraordinárias.':
    ('Atlas turns complex data into extraordinary decisions.',
     'Atlas transforma datos complejos en decisiones extraordinarias.'),
  '@h1-destaque': ('extraordinary decisions', 'decisiones extraordinarias'),
  'Dados, BI, engenharia e IA. Da arquitetura à decisão, em produção — com os especialistas para tocar o projeto dentro do seu time.':
    ('Data, BI, engineering and AI. From architecture to decision, in production — with the specialists to run the project inside your team.',
     'Datos, BI, ingeniería e IA. De la arquitectura a la decisión, en producción — con los especialistas para llevar el proyecto dentro de su equipo.'),
  'Descubra mais da Atlas': ('Discover more about Atlas', 'Descubra más de Atlas'),

  # ---------------- Insight AI ----------------
}

TRAD.update({
  # ---------------- respostas da demonstração ----------------

  # ---------------- trilho de setores ----------------
  'Setores onde já transformamos dados em decisão':
    ('Industries where we have already turned data into decisions',
     'Sectores donde ya transformamos datos en decisión'),
  'Setores atendidos': ('Industries served', 'Sectores atendidos'),

  # ---------------- essência e valores ----------------
  'Nossa essência': ('Our essence', 'Nuestra esencia'),
  'Nossos valores': ('Our values', 'Nuestros valores'),
  'A Atlas é uma consultoria de tecnologia em dados e alocação de especialistas. Da engenharia à decisão, em produção.':
    ('Atlas is a technology consultancy in data and specialist staffing. From engineering to decision, in production.',
     'Atlas es una consultoría de tecnología en datos y asignación de especialistas. De la ingeniería a la decisión, en producción.'),

  # ---------------- ladrilhos de números ----------------
  'Entrega': ('Delivery', 'Entrega'),
  'projetos entregues em dados, BI e inteligência':
    ('projects delivered in data, BI and intelligence', 'proyectos entregados en datos, BI e inteligencia'),
  'Alcance': ('Reach', 'Alcance'),
  'setores atendidos — do bancário ao food service':
    ('industries served — from banking to food service', 'sectores atendidos — de la banca al food service'),
  'Time': ('Team', 'Equipo'),
  'profissionais alocados dentro do time do cliente':
    ('professionals placed inside the client’s team', 'profesionales asignados dentro del equipo del cliente'),
  'Permanência': ('Tenure', 'Permanencia'),
  'horas em alocação — contratos de no mínimo 6 meses, muitos por tempo indeterminado':
    ('hours on assignment — contracts of at least 6 months, many of them open-ended',
     'horas en asignación — contratos de 6 meses como mínimo, muchos por tiempo indefinido'),

  # ---------------- faixa de alocação ----------------
  'Alocação de especialistas': ('Specialist staffing', 'Asignación de especialistas'),

  # ---------------- soluções ----------------
  'Da informação à ação.': ('From information to action.', 'De la información a la acción.'),
  'Quatro frentes. E, quando o que falta é time, os especialistas para tocá-las. Não vendemos ferramenta: resolvemos o problema por trás dela.':
    ('Four fronts. And, when what is missing is the team, the specialists to run them. We don’t sell tools: we solve the problem behind them.',
     'Cuatro frentes. Y, cuando lo que falta es equipo, los especialistas para llevarlos. No vendemos herramienta: resolvemos el problema detrás de ella.'),
  'Frentes de atuação': ('Areas of work', 'Frentes de actuación'),
  '<span class="sol-k">01 · Data &amp; Analytics</span><span class="sol-t">Do dado à decisão</span>':
    ('<span class="sol-k">01 · Data &amp; Analytics</span><span class="sol-t">From data to decision</span>',
     '<span class="sol-k">01 · Data &amp; Analytics</span><span class="sol-t">Del dato a la decisión</span>'),
  '<span class="sol-k">02 · Engenharia &amp; Cloud</span><span class="sol-t">A base por onde o dado anda</span>':
    ('<span class="sol-k">02 · Engineering &amp; Cloud</span><span class="sol-t">The foundation data travels on</span>',
     '<span class="sol-k">02 · Ingeniería &amp; Cloud</span><span class="sol-t">La base por donde circula el dato</span>'),
  '<span class="sol-k">03 · Inteligência &amp; IA</span><span class="sol-t">O que os dados antecipam</span>':
    ('<span class="sol-k">03 · Intelligence &amp; AI</span><span class="sol-t">What the data sees coming</span>',
     '<span class="sol-k">03 · Inteligencia &amp; IA</span><span class="sol-t">Lo que los datos anticipan</span>'),
  '<span class="sol-k">04 · Pessoas &amp; Alocação</span><span class="sol-t">Especialistas no seu time</span>':
    ('<span class="sol-k">04 · People &amp; Staffing</span><span class="sol-t">Specialists in your team</span>',
     '<span class="sol-k">04 · Personas &amp; Asignación</span><span class="sol-t">Especialistas en su equipo</span>'),
  'Do dado à decisão': ('From data to decision', 'Del dato a la decisión'),
  'Transformar o dado organizado em leitura do negócio — e a leitura em decisão. O painel não é o fim: ele existe para alguém escolher melhor com ele na frente.':
    ('Turning organized data into business insight — and insight into a decision. The dashboard is not the end: it exists so somebody chooses better with it in front of them.',
     'Transformar el dato organizado en lectura del negocio — y la lectura en decisión. El panel no es el fin: existe para que alguien elija mejor con él delante.'),
  'Padrão visual antes do desenvolvimento': ('Visual standard before development', 'Estándar visual antes del desarrollo'),
  'Engenharia de Dados &amp; Cloud': ('Data Engineering &amp; Cloud', 'Ingeniería de Datos &amp; Cloud'),
  'A base por onde o dado anda': ('The foundation data travels on', 'La base por donde circula el dato'),
  'A infraestrutura por onde o dado anda: ingestão, armazenamento, transformação e governança. Feita para aguentar a próxima pergunta, não só a de hoje.':
    ('The infrastructure the data travels on: ingestion, storage, transformation and governance. Built to hold the next question, not just today’s.',
     'La infraestructura por donde circula el dato: ingesta, almacenamiento, transformación y gobernanza. Hecha para aguantar la próxima pregunta, no solo la de hoy.'),
  'Regra de negócio em código, testada e versionada': ('Business rules as code, tested and versioned', 'Regla de negocio en código, probada y versionada'),
  'Inteligência &amp; Transformação': ('Intelligence &amp; Transformation', 'Inteligencia &amp; Transformación'),
  'O que os dados antecipam': ('What the data sees coming', 'Lo que los datos anticipan'),
  'A camada que lê o que já existe, antecipa o que vem e muda como a empresa opera. Começa pelo dado que você já tem — não por um projeto novo de coleta.':
    ('The layer that reads what already exists, anticipates what is coming and changes how the company operates. It starts from the data you already have — not from a new collection project.',
     'La capa que lee lo que ya existe, anticipa lo que viene y cambia cómo opera la empresa. Empieza por el dato que usted ya tiene — no por un nuevo proyecto de recolección.'),
  'Em produção, não em prova de conceito': ('In production, not in proof of concept', 'En producción, no en prueba de concepto'),
  'Pessoas &amp; Alocação': ('People &amp; Staffing', 'Personas &amp; Asignación'),
  'Especialistas no seu time': ('Specialists in your team', 'Especialistas en su equipo'),
  '150+ profissionais alocados, muitos por tempo indeterminado':
    ('150+ professionals placed, many of them open-ended', '150+ profesionales asignados, muchos por tiempo indefinido'),
  '<span>Data &amp; Analytics</span><span>Business Intelligence</span><span>Data Visualization</span><span>Self-service BI</span><span>Governança de métricas</span>':
    ('<span>Data &amp; Analytics</span><span>Business Intelligence</span><span>Data Visualization</span><span>Self-service BI</span><span>Metric governance</span>',
     '<span>Data &amp; Analytics</span><span>Business Intelligence</span><span>Data Visualization</span><span>BI de autoservicio</span><span>Gobernanza de métricas</span>'),
  '<span>Data Engineering</span><span>Cloud &amp; Modern Data Stack</span><span>Pipelines</span><span>Automação</span><span>Migração de legado</span>':
    ('<span>Data Engineering</span><span>Cloud &amp; Modern Data Stack</span><span>Pipelines</span><span>Automation</span><span>Legacy migration</span>',
     '<span>Data Engineering</span><span>Cloud &amp; Modern Data Stack</span><span>Pipelines</span><span>Automatización</span><span>Migración de legado</span>'),
  '<span>Modelos preditivos</span><span>Detecção de anomalias</span><span>GenAI e agentes</span><span>Document AI</span><span>Modernização de sistemas</span>':
    ('<span>Predictive models</span><span>Anomaly detection</span><span>GenAI and agents</span><span>Document AI</span><span>Systems modernization</span>',
     '<span>Modelos predictivos</span><span>Detección de anomalías</span><span>GenAI y agentes</span><span>Document AI</span><span>Modernización de sistemas</span>'),
  '<span>Alocação de especialistas</span><span>Squads de dados</span><span>Engenheiros e analistas</span><span>Contratos de no mínimo 6 meses</span>':
    ('<span>Specialist staffing</span><span>Data squads</span><span>Engineers and analysts</span><span>Contracts of at least 6 months</span>',
     '<span>Asignación de especialistas</span><span>Squads de datos</span><span>Ingenieros y analistas</span><span>Contratos de 6 meses como mínimo</span>'),
})

TRAD.update({
  # ---------------- cases ----------------
  'Histórias de sucesso': ('Success stories', 'Historias de éxito'),
  'Resultados que falam por si.': ('Results that speak for themselves.', 'Resultados que hablan por sí solos.'),
  'Cliente confidencial': ('Confidential client', 'Cliente confidencial'),
  'Antes e depois': ('Before and after', 'Antes y después'),
  'Antes': ('Before', 'Antes'),
  'Depois': ('After', 'Después'),
  'Cenário': ('Context', 'Escenario'),
  'Arquitetura': ('Architecture', 'Arquitectura'),
  'Solução': ('Solution', 'Solución'),
  'Tecnologias': ('Technologies', 'Tecnologías'),
  'O que mudou': ('What changed', 'Qué cambió'),

  # case 1
  '<span>Varejo Multimarca</span><span>Data &amp; Analytics</span><span>Cloud Azure</span>':
    ('<span>Multi-brand Retail</span><span>Data &amp; Analytics</span><span>Azure Cloud</span>',
     '<span>Retail Multimarca</span><span>Data &amp; Analytics</span><span>Cloud Azure</span>'),
  'Canais separados viraram uma plataforma só': ('Separate channels became a single platform', 'Canales separados se volvieron una sola plataforma'),
  'Vários': ('Several', 'Varios'),
  'sistemas medindo os canais em separado': ('systems measuring the channels separately', 'sistemas midiendo los canales por separado'),
  'Uma': ('One', 'Una'),
  'plataforma com venda e operação lado a lado': ('platform with sales and operations side by side', 'plataforma con venta y operación lado a lado'),
  'Dados de lojas físicas e canais digitais espalhados em sistemas diferentes, sem visão única de performance.':
    ('Data from physical stores and digital channels scattered across different systems, with no single view of performance.',
     'Datos de tiendas físicas y canales digitales dispersos en sistemas distintos, sin visión única de desempeño.'),
  'Plataforma de dados em Azure integrando todos os canais de venda.':
    ('A data platform on Azure integrating every sales channel.',
     'Plataforma de datos en Azure integrando todos los canales de venta.'),
  'Pipelines em Synapse, Data Factory e Databricks, com dashboards Power BI de vendas, operação e performance por canal.':
    ('Pipelines on Synapse, Data Factory and Databricks, with Power BI dashboards for sales, operations and performance by channel.',
     'Pipelines en Synapse, Data Factory y Databricks, con dashboards Power BI de ventas, operación y desempeño por canal.'),
  '<b>Canais comparáveis</b><span>loja física e digital deixaram de ser medidos em sistemas separados</span>':
    ('<b>Comparable channels</b><span>physical and digital stores stopped being measured in separate systems</span>',
     '<b>Canales comparables</b><span>tienda física y digital dejaron de medirse en sistemas separados</span>'),
  '<b>Fim da consolidação manual</b><span>venda e operação passaram a ser lidas no mesmo painel</span>':
    ('<b>No more manual consolidation</b><span>sales and operations came to be read on the same dashboard</span>',
     '<b>Fin de la consolidación manual</b><span>venta y operación pasaron a leerse en el mismo panel</span>'),
  '<b>Base reaproveitável</b><span>nova análise parte da plataforma existente, não de uma nova extração</span>':
    ('<b>Reusable foundation</b><span>a new analysis starts from the existing platform, not from a new extraction</span>',
     '<b>Base reutilizable</b><span>un nuevo análisis parte de la plataforma existente, no de una nueva extracción</span>'),

  # case 2
  '<span>Serviços Financeiros</span><span>Data Engineering</span><span>Cloud GCP</span>':
    ('<span>Financial Services</span><span>Data Engineering</span><span>GCP Cloud</span>',
     '<span>Servicios Financieros</span><span>Data Engineering</span><span>Cloud GCP</span>'),
  'Legado Oracle aposentado sem parar a operação': ('Oracle legacy retired without stopping operations', 'Legado Oracle jubilado sin parar la operación'),
  'Dados presos em um legado Oracle — caro de manter e distante das necessidades analíticas do negócio.':
    ('Data locked in an Oracle legacy — expensive to maintain and far from the analytical needs of the business.',
     'Datos atrapados en un legado Oracle — caro de mantener y lejos de las necesidades analíticas del negocio.'),
  '<b>Legado fora da conta</b><span>o custo de manter o ambiente Oracle deixou de existir</span>':
    ('<b>Legacy off the bill</b><span>the cost of keeping the Oracle environment stopped existing</span>',
     '<b>Legado fuera de la cuenta</b><span>el costo de mantener el entorno Oracle dejó de existir</span>'),
  '<b>Regra em código</b><span>as transformações saíram de scripts avulsos para dbt, testado e versionado</span>':
    ('<b>Rules as code</b><span>transformations moved from loose scripts to dbt, tested and versioned</span>',
     '<b>Regla en código</b><span>las transformaciones salieron de scripts sueltos a dbt, probado y versionado</span>'),
  '<b>Uma camada só</b><span>Looker passou a ser o único caminho entre o dado e o negócio</span>':
    ('<b>A single layer</b><span>Looker became the only path between the data and the business</span>',
     '<b>Una sola capa</b><span>Looker pasó a ser el único camino entre el dato y el negocio</span>'),

  # case 3
  '<span>BI Governance</span><span>Migração</span><span>Self-Service BI</span>':
    ('<span>BI Governance</span><span>Migration</span><span>Self-Service BI</span>',
     '<span>BI Governance</span><span>Migración</span><span>Self-Service BI</span>'),
  'De 200+ painéis sem padrão a um ambiente só': ('From 200+ unstandardized dashboards to a single environment', 'De 200+ paneles sin estándar a un solo entorno'),
  'Migração e governança de BI em escala': ('BI migration and governance at scale', 'Migración y gobernanza de BI a escala'),
  'Mais de 200 dashboards Power BI crescendo sem padrão, sem governança e sem fonte única da verdade.':
    ('Over 200 Power BI dashboards growing with no standard, no governance and no single source of truth.',
     'Más de 200 dashboards Power BI creciendo sin estándar, sin gobernanza y sin fuente única de la verdad.'),
  'Power BI, Looker, Governança de dados': ('Power BI, Looker, Data governance', 'Power BI, Looker, Gobernanza de datos'),
  '<b>Uma definição por métrica</b><span>a mesma conta deixou de ter versões diferentes em mais de 200 painéis</span>':
    ('<b>One definition per metric</b><span>the same calculation stopped having different versions across 200+ dashboards</span>',
     '<b>Una definición por métrica</b><span>el mismo cálculo dejó de tener versiones distintas en más de 200 paneles</span>'),
  '<b>Pergunta sem fila</b><span>o self-service tirou o intervalo entre a dúvida da área e a resposta</span>':
    ('<b>Questions without a queue</b><span>self-service removed the gap between the team’s question and the answer</span>',
     '<b>Pregunta sin fila</b><span>el autoservicio quitó el intervalo entre la duda del área y la respuesta</span>'),
  '<b>Crescimento com padrão</b><span>painel novo passa a nascer dentro de um modelo, não ao lado dele</span>':
    ('<b>Growth with a standard</b><span>a new dashboard now starts inside a model, not alongside it</span>',
     '<b>Crecimiento con estándar</b><span>un panel nuevo pasa a nacer dentro de un modelo, no al lado de él</span>'),

  # mini cases
  'Software &amp; Tecnologia': ('Software &amp; Technology', 'Software &amp; Tecnología'),
  'Chamados viraram indicador de SLA': ('Tickets became an SLA indicator', 'Los tickets se volvieron indicador de SLA'),
  'Turismo &amp; Viagens': ('Travel &amp; Tourism', 'Turismo &amp; Viajes'),
  'Três linhas de negócio, uma visão só': ('Three business lines, a single view', 'Tres líneas de negocio, una sola visión'),
  'Serviços Financeiros': ('Financial Services', 'Servicios Financieros'),
  'O comercial ganhou número próprio': ('Sales got numbers of its own', 'El área comercial ganó número propio'),
  'Bancário': ('Banking', 'Banca'),
  'A voz do cliente virou indicador vivo': ('The customer’s voice became a live indicator', 'La voz del cliente se volvió indicador vivo'),
})

TRAD.update({
  # ---------------- painel de visualização ----------------
  'Operação': ('Operations', 'Operación'),

  # ---------------- capacidades de IA ----------------
  'Inteligência Artificial': ('Artificial Intelligence', 'Inteligencia Artificial'),
  'A próxima vantagem competitiva já está nos seus dados.':
    ('Your next competitive advantage is already in your data.',
     'La próxima ventaja competitiva ya está en sus datos.'),
  'IA sobre a sua própria base. Lê o que existe, aponta o desvio e antecipa o que vem.':
    ('AI on your own data. It reads what exists, points out the deviation and anticipates what is coming.',
     'IA sobre su propia base. Lee lo que existe, señala la desviación y anticipa lo que viene.'),
  'Modelos preditivos': ('Predictive models', 'Modelos predictivos'),
  'Aprendem com o histórico da operação para estimar o que tende a acontecer — demanda, ruptura, risco, churn — enquanto ainda dá tempo de agir.':
    ('They learn from the history of the operation to estimate what tends to happen — demand, stockouts, risk, churn — while there is still time to act.',
     'Aprenden del histórico de la operación para estimar lo que tiende a ocurrir — demanda, rotura, riesgo, churn — mientras todavía hay tiempo de actuar.'),
  'Detecção de anomalias': ('Anomaly detection', 'Detección de anomalías'),
  'Apontam o que foge do padrão no momento em que acontece, em vez de o desvio aparecer só no fechamento do mês.':
    ('They flag what breaks the pattern as it happens, instead of the deviation only showing up at month-end close.',
     'Señalan lo que se sale del patrón en el momento en que ocurre, en vez de que la desviación aparezca solo en el cierre del mes.'),
  'GenAI e agentes': ('GenAI and agents', 'GenAI y agentes'),
  'Uma camada de conversa sobre a sua própria base: a pergunta em linguagem natural volta como número, com o contexto de onde ele veio.':
    ('A conversational layer over your own data: the question in natural language comes back as a number, with the context of where it came from.',
     'Una capa de conversación sobre su propia base: la pregunta en lenguaje natural vuelve como número, con el contexto de dónde salió.'),
  'Document AI': ('Document AI', 'Document AI'),
  'Leitura automática de contratos, notas e relatórios — o que estava preso em PDF passa a ser dado consultável.':
    ('Automatic reading of contracts, invoices and reports — what was locked in a PDF becomes queryable data.',
     'Lectura automática de contratos, facturas e informes — lo que estaba atrapado en PDF pasa a ser dato consultable.'),

  # ---------------- CTA final e contato ----------------
  'Existe um problema complexo no seu negócio?': ('Is there a complex problem in your business?', '¿Hay un problema complejo en su negocio?'),
  'Vamos transformar tecnologia, dados e inteligência em resultado.':
    ('Let us turn technology, data and intelligence into results.',
     'Vamos a transformar tecnología, datos e inteligencia en resultado.'),
  'Solicite um diagnóstico.': ('Request an assessment.', 'Solicite un diagnóstico.'),
  'Conversa de 30 minutos. Mapeamos seu cenário e indicamos o caminho, mesmo que não passe pela gente.':
    ('A 30-minute conversation. We map your situation and point out the path, even if it does not run through us.',
     'Conversación de 30 minutos. Mapeamos su escenario e indicamos el camino, incluso si no pasa por nosotros.'),
  '<b>Você conta o desafio</b><span>Conversa de 30 minutos, com quem vai executar.</span>':
    ('<b>You describe the challenge</b><span>A 30-minute conversation, with the people who will do the work.</span>',
     '<b>Usted cuenta el desafío</b><span>Conversación de 30 minutos, con quien va a ejecutar.</span>'),
  '<b>Entendemos o cenário</b><span>Que dado existe, onde ele está e quem precisa dele.</span>':
    ('<b>We understand the situation</b><span>What data exists, where it lives and who needs it.</span>',
     '<b>Entendemos el escenario</b><span>Qué dato existe, dónde está y quién lo necesita.</span>'),
  '<b>Indicamos o caminho</b><span>O que resolve rápido e o que exige arquitetura, em ordem.</span>':
    ('<b>We point out the path</b><span>What solves things quickly and what needs architecture, in order.</span>',
     '<b>Indicamos el camino</b><span>Lo que resuelve rápido y lo que exige arquitectura, en orden.</span>'),
  '<b>Você decide</b><span>Com escopo, stack e prazo na mão. Sem contrato até aqui.</span>':
    ('<b>You decide</b><span>With scope, stack and timeline in hand. No contract up to this point.</span>',
     '<b>Usted decide</b><span>Con alcance, stack y plazo en la mano. Sin contrato hasta aquí.</span>'),
  'Sem compromisso <i>·</i> Sem apresentação institucional <i>·</i> Resposta em 1 dia útil':
    ('No commitment <i>·</i> No corporate deck <i>·</i> Reply within 1 business day',
     'Sin compromiso <i>·</i> Sin presentación institucional <i>·</i> Respuesta en 1 día hábil'),
  'Nome': ('Name', 'Nombre'),
  'Empresa': ('Company', 'Empresa'),
  'Cargo <em>(opcional)</em>': ('Role <em>(optional)</em>', 'Cargo <em>(opcional)</em>'),
  'E-mail corporativo': ('Work e-mail', 'Correo corporativo'),
  'Telefone / WhatsApp <em>(opcional)</em>': ('Phone / WhatsApp <em>(optional)</em>', 'Teléfono / WhatsApp <em>(opcional)</em>'),
  'Dados &amp; BI': ('Data &amp; BI', 'Datos &amp; BI'),
  'Cloud': ('Cloud', 'Cloud'),
  'Automação': ('Automation', 'Automatización'),
  'Desenvolvimento': ('Development', 'Desarrollo'),
  'Outro': ('Other', 'Otro'),
  'Conte brevemente o que gostaria de resolver': ('Briefly, what would you like to solve', 'Cuente brevemente qué le gustaría resolver'),
  'Em duas linhas: o que você precisa que passe a funcionar.':
    ('In two lines: what you need to start working.', 'En dos líneas: qué necesita que pase a funcionar.'),
  'Quero conversar com a Atlas →': ('I want to talk to Atlas →', 'Quiero hablar con Atlas →'),
  'Respondemos em até 1 dia útil. Sem cadastro em lista e sem disparo automático.':
    ('We reply within 1 business day. No mailing list and no automated blast.',
     'Respondemos en hasta 1 día hábil. Sin alta en lista y sin envío automático.'),
  'Não foi possível enviar agora. Tente novamente em instantes ou fale com a gente pelo LinkedIn ou Instagram.':
    ('We could not send it right now. Try again in a moment, or reach us on LinkedIn or Instagram.',
     'No fue posible enviar ahora. Inténtelo de nuevo en un momento o escríbanos por LinkedIn o Instagram.'),
  'Mensagem recebida.': ('Message received.', 'Mensaje recibido.'),
  'Nosso time vai ler seu cenário antes de responder — e entra em contato em até 1 dia útil para entender o desafio.':
    ('Our team will read your situation before replying — and will be in touch within 1 business day to understand the challenge.',
     'Nuestro equipo va a leer su escenario antes de responder — y se pone en contacto en hasta 1 día hábil para entender el desafío.'),

  # ---------------- rodapé ----------------
  'A Atlas': ('Atlas', 'Atlas'),
  'Setores': ('Industries', 'Sectores'),
  'Cases de sucesso': ('Success stories', 'Historias de éxito'),
  'Fale conosco': ('Contact us', 'Contáctenos'),
  'Solicitar um diagnóstico': ('Request an assessment', 'Solicitar un diagnóstico'),
  'Sobre a Atlas': ('About Atlas', 'Acerca de Atlas'),
  '<span>© 2026 Atlas Tec. Todos os direitos reservados.</span> <span>atlas-partner.com</span>':
    ('<span>© 2026 Atlas Tec. All rights reserved.</span> <span>atlas-partner.com</span>',
     '<span>© 2026 Atlas Tec. Todos los derechos reservados.</span> <span>atlas-partner.com</span>'),

  # ---------------- chat ----------------
  '<b>Olá! Eu sou o Átis.</b><br>Como posso ajudar? 👋':
    ('<b>Hi! I am Átis.</b><br>How can I help? 👋', '<b>¡Hola! Soy Átis.</b><br>¿Cómo puedo ayudar? 👋'),
  'Fechar aviso': ('Close notice', 'Cerrar aviso'),
  '<b>Átis — Assistente Atlas</b> <span>Online agora</span>':
    ('<b>Átis — Atlas Assistant</b> <span>Online now</span>', '<b>Átis — Asistente Atlas</b> <span>En línea ahora</span>'),
  'Olá! 👋 Eu sou o <b>Átis</b>, o assistente da Atlas. Me conta: como posso ajudar você hoje?':
    ('Hi! 👋 I am <b>Átis</b>, the Atlas assistant. Tell me: how can I help you today?',
     '¡Hola! 👋 Soy <b>Átis</b>, el asistente de Atlas. Cuénteme: ¿cómo puedo ayudarle hoy?'),
  '💼 Quero um orçamento': ('💼 I want a quote', '💼 Quiero un presupuesto'),
  '👥 Preciso de especialistas': ('👥 I need specialists', '👥 Necesito especialistas'),
  '💬 Outro assunto': ('💬 Another topic', '💬 Otro asunto'),
  'Fechar chat': ('Close chat', 'Cerrar chat'),
  'Chat com o assistente da Atlas': ('Chat with the Atlas assistant', 'Chat con el asistente de Atlas'),
  'Escreva sua mensagem…': ('Write your message…', 'Escriba su mensaje…'),
  'Enviar mensagem': ('Send message', 'Enviar mensaje'),
  'Abrir chat': ('Open chat', 'Abrir chat'),
  'Abrir chat com o assistente da Atlas': ('Open chat with the Atlas assistant', 'Abrir chat con el asistente de Atlas'),
  'Alternar entre tema claro e escuro': ('Switch between light and dark theme', 'Alternar entre tema claro y oscuro'),
  'Mudar para o tema escuro': ('Switch to dark theme', 'Cambiar al tema oscuro'),
  'Mudar para o tema claro': ('Switch to light theme', 'Cambiar al tema claro'),
  'Pular para o conteúdo': ('Skip to content', 'Saltar al contenido'),
  'Navegação mobile': ('Mobile navigation', 'Navegación móvil'),
  'Instagram — @atlas_tecnologia': ('Instagram — @atlas_tecnologia', 'Instagram — @atlas_tecnologia'),

  # ---------------- setores do trilho (item a item) ----------------
  'Varejo &amp; Moda': ('Fashion Retail', 'Retail &amp; Moda'),
  'Varejo Omnichannel': ('Omnichannel Retail', 'Retail Omnicanal'),
  'Saúde &amp; Diagnóstico': ('Healthcare &amp; Diagnostics', 'Salud &amp; Diagnóstico'),
  'Educação': ('Education', 'Educación'),
  'Turismo': ('Tourism', 'Turismo'),
  'Food Service': ('Food Service', 'Food Service'),
  'Infraestrutura &amp; Mobilidade': ('Infrastructure &amp; Mobility', 'Infraestructura &amp; Movilidad'),
  'Saúde Hospitalar': ('Hospital Healthcare', 'Salud Hospitalaria'),
  'Varejo de Moda': ('Fashion Retail', 'Retail de Moda'),

  # ---------------- restos medidos na varredura ----------------
})


# ============================================================
# Páginas internas: cases, alocação, BI & Analytics e Data Engineering.
# ============================================================
TRAD.update({
  # ---------------- página de cases ----------------
  'Ver todas as soluções <span class="arr">→</span>':
    ('See all solutions <span class="arr">→</span>', 'Ver todas las soluciones <span class="arr">→</span>'),
  'Ver os projetos entregues <span class="arr">→</span>':
    ('See the delivered projects <span class="arr">→</span>', 'Ver los proyectos entregados <span class="arr">→</span>'),

  # mini cases que vivem só na página completa
  'Varejo de Moda': ('Fashion Retail', 'Retail de Moda'),
  'Saúde Hospitalar': ('Hospital Healthcare', 'Salud Hospitalaria'),
  'Todas as áreas lendo os mesmos números': ('Every team reading the same numbers', 'Todas las áreas leyendo los mismos números'),
  'Duas ferramentas de BI viraram uma': ('Two BI tools became one', 'Dos herramientas de BI se volvieron una'),
  'A evasão passou a ser antecipada': ('Dropout came to be anticipated', 'La deserción pasó a anticiparse'),
  'O padrão visual antes do primeiro painel': ('The visual standard before the first dashboard', 'El estándar visual antes del primer panel'),
  'Do fechamento do mês para o mesmo dia': ('From month-end close to the same day', 'Del cierre del mes al mismo día'),
  'Três operações numa leitura só': ('Three operations in a single read', 'Tres operaciones en una sola lectura'),

  # ---------------- comum às páginas de serviço ----------------
  'O que fazemos': ('What we do', 'Qué hacemos'),
  'As frentes que entregamos.': ('The fronts we deliver.', 'Los frentes que entregamos.'),
  'Como entregamos': ('How we deliver', 'Cómo entregamos'),
  'Do entendimento à produção.': ('From understanding to production.', 'Del entendimiento a la producción.'),
  'O stack sai do problema, não do contrato.': ('The stack follows the problem, not the contract.', 'El stack sale del problema, no del contrato.'),
  '✦ marca as tecnologias com projeto entregue pela Atlas':
    ('✦ marks the technologies with a project delivered by Atlas',
     '✦ marca las tecnologías con proyecto entregado por Atlas'),
  'A prova está nos projetos': ('The proof is in the projects', 'La prueba está en los proyectos'),
  'Um projeto entregue': ('One delivered project', 'Un proyecto entregado'),
  'Vamos transformar seu próximo desafio em resultado?':
    ('Shall we turn your next challenge into a result?', '¿Vamos a transformar su próximo desafío en resultado?'),
  'Converse com quem vai executar. Em 30 minutos mapeamos seu cenário e indicamos o caminho — mesmo que ele não passe pela gente.':
    ('Talk to the people who will do the work. In 30 minutes we map your situation and point out the path — even if it does not run through us.',
     'Hable con quien va a ejecutar. En 30 minutos mapeamos su escenario e indicamos el camino — incluso si no pasa por nosotros.'),
  'Discovery': ('Discovery', 'Discovery'),
  'Diagnóstico': ('Assessment', 'Diagnóstico'),
  'Produção': ('Production', 'Producción'),
  'Construção': ('Build', 'Construcción'),
  'Modelagem': ('Modelling', 'Modelado'),

  # ---------------- alocação ----------------
  'Roadmap definido, orçamento aprovado. A vaga de engenheiro de dados segue aberta, e o projeto não anda.':
    ('Roadmap set, budget approved. The data engineer role is still open, and the project is not moving.',
     'Roadmap definido, presupuesto aprobado. La vacante de ingeniero de datos sigue abierta, y el proyecto no avanza.'),
  'Falar sobre alocação <span class="arr">→</span>': ('Talk about staffing <span class="arr">→</span>', 'Hablar sobre asignación <span class="arr">→</span>'),
  'Perfis que alocamos': ('Profiles we place', 'Perfiles que asignamos'),
  'Engenheiro de dados': ('Data engineer', 'Ingeniero de datos'),
  'Analista e desenvolvedor de BI': ('BI analyst and developer', 'Analista y desarrollador de BI'),
  'Cientista de dados': ('Data scientist', 'Científico de datos'),
  'Arquiteto de dados': ('Data architect', 'Arquitecto de datos'),
  'Contratos de no mínimo 6 meses': ('Contracts of at least 6 months', 'Contratos de 6 meses como mínimo'),
  'Alocações por tempo indeterminado': ('Open-ended assignments', 'Asignaciones por tiempo indefinido'),
  'Sob a gestão do cliente, com respaldo técnico da Atlas':
    ('Under the client\u2019s management, with technical backing from Atlas',
     'Bajo la gestión del cliente, con respaldo técnico de Atlas'),
  'Substituição sem quebra de ritmo': ('Replacement without breaking stride', 'Sustitución sin quebrar el ritmo'),
  'Squads completos': ('Complete squads', 'Squads completos'),
  'Time montado por perfil e senioridade': ('A team built by profile and seniority', 'Equipo armado por perfil y seniority'),
  'Liderança técnica da Atlas': ('Technical leadership from Atlas', 'Liderazgo técnico de Atlas'),
  'Ritmo de entrega acordado': ('An agreed delivery pace', 'Ritmo de entrega acordado'),
  'Transferência de conhecimento': ('Knowledge transfer', 'Transferencia de conocimiento'),
  'Entendimento': ('Understanding', 'Entendimiento'),
  'Que perfil, que senioridade e para qual etapa do roadmap.':
    ('Which profile, which seniority and for which stage of the roadmap.',
     'Qué perfil, qué seniority y para qué etapa del roadmap.'),
  'Seleção': ('Selection', 'Selección'),
  'Indicação de profissionais com o histórico técnico compatível.':
    ('Professionals put forward with a matching technical background.',
     'Propuesta de profesionales con el historial técnico compatible.'),
  'Entrada': ('Onboarding', 'Entrada'),
  'O especialista entra no seu time e na sua gestão.':
    ('The specialist joins your team and your management.', 'El especialista entra en su equipo y en su gestión.'),
  'Acompanhamento': ('Follow-up', 'Seguimiento'),
  'A Atlas segue por trás, como respaldo técnico.': ('Atlas stays behind, as technical backing.', 'Atlas sigue detrás, como respaldo técnico.'),
  'Mais de 150 profissionais alocados. Contratos de no mínimo seis meses, boa parte por tempo indeterminado: o cliente renova para manter a pessoa.':
    ('Over 150 professionals placed. Contracts of at least six months, a good share of them open-ended: the client renews to keep the person.',
     'Más de 150 profesionales asignados. Contratos de seis meses como mínimo, buena parte por tiempo indefinido: el cliente renueva para mantener a la persona.'),
  'Para profissionais de TI': ('For IT professionals', 'Para profesionales de TI'),
  'Trabalhe com a gente.': ('Work with us.', 'Trabaje con nosotros.'),
  'Você atua dentro do time do cliente, com o respaldo técnico da Atlas por trás. Deixe seu perfil e a gente chama quando houver encaixe.':
    ('You work inside the client\u2019s team, with Atlas\u2019s technical backing behind you. Leave your profile and we will call when there is a fit.',
     'Usted trabaja dentro del equipo del cliente, con el respaldo técnico de Atlas detrás. Deje su perfil y lo llamamos cuando haya encaje.'),
  '<b>Contratos longos</b><span>No mínimo seis meses, boa parte por tempo indeterminado.</span>':
    ('<b>Long contracts</b><span>At least six months, a good share of them open-ended.</span>',
     '<b>Contratos largos</b><span>Seis meses como mínimo, buena parte por tiempo indefinido.</span>'),
  '<b>Projeto de verdade</b><span>Dados, BI, engenharia e IA em mais de 10 setores.</span>':
    ('<b>Real projects</b><span>Data, BI, engineering and AI across more than 10 industries.</span>',
     '<b>Proyecto de verdad</b><span>Datos, BI, ingeniería e IA en más de 10 sectores.</span>'),
  '<b>Respaldo técnico</b><span>Você não fica sozinho no cliente: a Atlas está atrás.</span>':
    ('<b>Technical backing</b><span>You are not alone at the client: Atlas is behind you.</span>',
     '<b>Respaldo técnico</b><span>Usted no queda solo en el cliente: Atlas está detrás.</span>'),
  'E-mail': ('E-mail', 'Correo'),
  'Perfil': ('Profile', 'Perfil'),
  'Selecione': ('Select', 'Seleccione'),
  'Analista / desenvolvedor de BI': ('BI analyst / developer', 'Analista / desarrollador de BI'),
  'Analista de dados': ('Data analyst', 'Analista de datos'),
  'Senioridade': ('Seniority', 'Seniority'),
  'Júnior': ('Junior', 'Junior'),
  'Pleno': ('Mid-level', 'Semi-senior'),
  'Sênior': ('Senior', 'Senior'),
  'Especialista / Lead': ('Specialist / Lead', 'Especialista / Lead'),
  'LinkedIn <em>(opcional)</em>': ('LinkedIn <em>(optional)</em>', 'LinkedIn <em>(opcional)</em>'),
  'Currículo <em>(PDF ou Word, até 5 MB)</em>': ('CV <em>(PDF or Word, up to 5 MB)</em>', 'Currículum <em>(PDF o Word, hasta 5 MB)</em>'),
  'Enviar meu perfil →': ('Send my profile →', 'Enviar mi perfil →'),
  'Seu currículo é usado só para avaliar encaixe em projetos da Atlas.':
    ('Your CV is used only to assess fit for Atlas projects.',
     'Su currículum se usa solo para evaluar encaje en proyectos de Atlas.'),
  '<b>Perfil recebido.</b> <span>Guardamos seu currículo no banco de talentos e chamamos quando houver encaixe em um projeto.</span>':
    ('<b>Profile received.</b> <span>We have saved your CV in the talent pool and will call when there is a fit on a project.</span>',
     '<b>Perfil recibido.</b> <span>Guardamos su currículum en el banco de talentos y lo llamamos cuando haya encaje en un proyecto.</span>'),

  # ---------------- BI & Analytics ----------------
  'O indicador existe. Mas cada área chega a um número diferente. A reunião discute o dado, não a decisão.':
    ('The indicator exists. But each team arrives at a different number. The meeting argues about the data, not the decision.',
     'El indicador existe. Pero cada área llega a un número distinto. La reunión discute el dato, no la decisión.'),
  'Falar sobre BI &amp; Analytics <span class="arr">→</span>':
    ('Talk about BI &amp; Analytics <span class="arr">→</span>', 'Hablar sobre BI &amp; Analytics <span class="arr">→</span>'),
  'Camada semântica': ('Semantic layer', 'Capa semántica'),
  'Modelagem dimensional': ('Dimensional modelling', 'Modelado dimensional'),
  'Definição única por métrica': ('A single definition per metric', 'Definición única por métrica'),
  'Regra de negócio versionada': ('Versioned business rules', 'Regla de negocio versionada'),
  'Catálogo de indicadores': ('Indicator catalogue', 'Catálogo de indicadores'),
  'Dashboards que se usam': ('Dashboards people actually use', 'Dashboards que se usan'),
  'Visão executiva e operacional': ('Executive and operational view', 'Visión ejecutiva y operativa'),
  'Self-service para as áreas': ('Self-service for the business teams', 'Autoservicio para las áreas'),
  'Padrão visual definido antes do desenvolvimento':
    ('Visual standard set before development', 'Estándar visual definido antes del desarrollo'),
  'Performance e otimização de DAX': ('Performance and DAX optimization', 'Rendimiento y optimización de DAX'),
  'Governança de BI': ('BI governance', 'Gobernanza de BI'),
  'Padrão de nomenclatura e layout': ('Naming and layout standards', 'Estándar de nomenclatura y layout'),
  'Controle de acesso por perfil': ('Role-based access control', 'Control de acceso por perfil'),
  'Migração e consolidação de painéis': ('Dashboard migration and consolidation', 'Migración y consolidación de paneles'),
  'Documentação do modelo': ('Model documentation', 'Documentación del modelo'),
  'Que decisão precisa melhorar, por quem e com que frequência.':
    ('Which decision needs to improve, by whom and how often.',
     'Qué decisión necesita mejorar, por quién y con qué frecuencia.'),
  'A definição de cada métrica acordada antes do primeiro painel.':
    ('The definition of every metric agreed before the first dashboard.',
     'La definición de cada métrica acordada antes del primer panel.'),
  'Dashboards com padrão visual e de performance definidos na largada.':
    ('Dashboards with visual and performance standards set at the start.',
     'Dashboards con estándar visual y de rendimiento definidos de salida.'),
  'Entrega com documentação e as áreas autônomas para usar.':
    ('Delivered with documentation and the teams able to use it on their own.',
     'Entrega con documentación y las áreas autónomas para usarlo.'),
  'Migração e padronização em Looker, com dados e definições unificados e um modelo de self-service para as áreas de negócio.':
    ('Migration and standardization on Looker, with unified data and definitions and a self-service model for the business teams.',
     'Migración y estandarización en Looker, con datos y definiciones unificados y un modelo de autoservicio para las áreas de negocio.'),
  'Quero avaliar meu BI <span class="arr">→</span>': ('I want my BI assessed <span class="arr">→</span>', 'Quiero evaluar mi BI <span class="arr">→</span>'),

  # ---------------- Data Engineering ----------------
  'Cada pergunta nova vira uma extração nova. A resposta chega tarde, e ninguém sabe de onde veio o número.':
    ('Every new question turns into a new extraction. The answer arrives late, and nobody knows where the number came from.',
     'Cada pregunta nueva se vuelve una extracción nueva. La respuesta llega tarde, y nadie sabe de dónde salió el número.'),
  'Falar sobre Data Engineering <span class="arr">→</span>':
    ('Talk about Data Engineering <span class="arr">→</span>', 'Hablar sobre Data Engineering <span class="arr">→</span>'),
  'Ingestão e integração': ('Ingestion and integration', 'Ingesta e integración'),
  'Conectores gerenciados': ('Managed connectors', 'Conectores gestionados'),
  'Streaming de eventos': ('Event streaming', 'Streaming de eventos'),
  'Integração de sistemas legados': ('Legacy system integration', 'Integración de sistemas heredados'),
  'APIs e arquivos': ('APIs and files', 'APIs y archivos'),
  'Armazenamento': ('Storage', 'Almacenamiento'),
  'Modelagem de dados': ('Data modelling', 'Modelado de datos'),
  'Transformação e orquestração': ('Transformation and orchestration', 'Transformación y orquestación'),
  'ETL e ELT': ('ETL and ELT', 'ETL y ELT'),
  'Transformação versionada e testada': ('Versioned and tested transformation', 'Transformación versionada y probada'),
  'Orquestração de pipelines': ('Pipeline orchestration', 'Orquestación de pipelines'),
  'Testes de qualidade': ('Quality tests', 'Pruebas de calidad'),
  'Que fontes existem, em que estado, e o que o negócio precisa ler.':
    ('Which sources exist, in what shape, and what the business needs to read.',
     'Qué fuentes existen, en qué estado, y qué necesita leer el negocio.'),
  'O desenho da base sobre a nuvem que serve ao problema.':
    ('The design of the foundation on the cloud that fits the problem.',
     'El diseño de la base sobre la nube que sirve al problema.'),
  'Pipelines com teste e orquestração desde o primeiro dia.':
    ('Pipelines with tests and orchestration from day one.',
     'Pipelines con pruebas y orquestación desde el primer día.'),
  'Em produção, com falha visível antes de chegar ao usuário.':
    ('In production, with failures visible before they reach the user.',
     'En producción, con fallos visibles antes de llegar al usuario.'),
  'Modernização de legado para a nuvem': ('Legacy modernization to the cloud', 'Modernización de legado a la nube'),
  'Data Lake em Google Cloud com processamento em BigQuery, transformações em dbt, orquestração em Airflow e BI unificado em Looker.':
    ('A data lake on Google Cloud with processing on BigQuery, transformations in dbt, orchestration in Airflow and unified BI in Looker.',
     'Data Lake en Google Cloud con procesamiento en BigQuery, transformaciones en dbt, orquestación en Airflow y BI unificado en Looker.'),
  'Quero avaliar minha arquitetura <span class="arr">→</span>':
    ('I want my architecture assessed <span class="arr">→</span>', 'Quiero evaluar mi arquitectura <span class="arr">→</span>'),
})


TRAD.update({
  # ---------------- parceiros ----------------
  # Os nomes dos programas são nomes próprios dos fabricantes: ficam iguais
  # nas três línguas. Só a moldura em volta deles muda.
  'Parceiros': ('Partners', 'Socios'),
  'Parceiros <span class="mega-tag">8 programas</span>':
    ('Partners <span class="mega-tag">8 programs</span>', 'Socios <span class="mega-tag">8 programas</span>'),
  'Microsoft, Google, AWS, IBM, Databricks, Tableau, Snowflake e Oracle.':
    ('Microsoft, Google, AWS, IBM, Databricks, Tableau, Snowflake and Oracle.',
     'Microsoft, Google, AWS, IBM, Databricks, Tableau, Snowflake y Oracle.'),
  'Programas de parceria.': ('Partner programs.', 'Programas de alianza.'),
  'A Atlas participa dos programas de parceria dos fabricantes com que trabalha — o que mantém o time perto da documentação, do roadmap e do suporte de cada plataforma.':
    ('Atlas takes part in the partner programs of the vendors it works with — which keeps the team close to each platform\u2019s documentation, roadmap and support.',
     'Atlas participa en los programas de alianza de los fabricantes con los que trabaja — lo que mantiene al equipo cerca de la documentación, el roadmap y el soporte de cada plataforma.'),
  'Marcas e nomes de programa pertencem aos respectivos fabricantes.':
    ('Trademarks and program names belong to their respective vendors.',
     'Marcas y nombres de programa pertenecen a sus respectivos fabricantes.'),
})


TRAD.update({
  # ---------------- ajustes desta rodada ----------------
  '<span>Clareza</span> <span>Resultado</span> <span>Parceria</span>':
    ('<span>Clarity</span> <span>Results</span> <span>Partnership</span>',
     '<span>Claridad</span> <span>Resultado</span> <span>Alianza</span>'),
  'Especialistas de dados dentro do seu time.':
    ('Data specialists inside your team.', 'Especialistas de datos dentro de su equipo.'),
  'Quando o gargalo não é o projeto e sim quem vai tocá-lo, a Atlas aloca especialistas que entram na sua operação e respondem à sua gestão — em contratos de no mínimo 6 meses, muitos por tempo indeterminado.':
    ('When the bottleneck is not the project but who will run it, Atlas places specialists who join your operation and report to your management — on contracts of at least 6 months, many of them open-ended.',
     'Cuando el cuello de botella no es el proyecto sino quién va a llevarlo, Atlas asigna especialistas que entran en su operación y responden a su gestión — en contratos de 6 meses como mínimo, muchos por tiempo indefinido.'),
  'Quando o gargalo não é o projeto e sim quem vai tocá-lo: especialistas de dados que entram na sua operação, respondem à sua gestão e ficam.':
    ('When the bottleneck is not the project but who will run it: data specialists who join your operation, report to your management and stay.',
     'Cuando el cuello de botella no es el proyecto sino quién va a llevarlo: especialistas de datos que entran en su operación, responden a su gestión y se quedan.'),
  'O que a IA resolve': ('What AI solves', 'Lo que resuelve la IA'),
  # Frases que giram na segunda linha do hero. Não saem da extração de
  # blocos — só uma delas está no HTML a cada momento —, por isso ficam
  # declaradas em EXTRAS.
  'decisões extraordinárias': ('extraordinary decisions', 'decisiones extraordinarias'),
  'dados e analytics': ('data and analytics', 'datos y analytics'),
  'engenharia de dados': ('data engineering', 'ingeniería de datos'),
  'inteligência artificial': ('artificial intelligence', 'inteligencia artificial'),
  'times de especialistas': ('teams of specialists', 'equipos de especialistas'),
  # alt das artes dos cases — texto que o leitor de tela lê
})


TRAD.update({
  # ---------------- capas e títulos dos treze cases ----------------
  'Histórias de sucesso': ('Success stories', 'Historias de éxito'),
  'Investindo no sucesso dos nossos clientes':
    ('Investing in our clients\u2019 success', 'Invirtiendo en el éxito de nuestros clientes'),
  'Nosso portfólio reflete foco e excelência em arquitetura de dados, nuvem e inteligência artificial, transformando visão estratégica em valor de longo prazo.':
    ('Our portfolio reflects focus and excellence in data architecture, cloud and artificial intelligence, turning strategic vision into long-term value.',
     'Nuestro portafolio refleja foco y excelencia en arquitectura de datos, nube e inteligencia artificial, transformando la visión estratégica en valor de largo plazo.'),
  'Ver case <span class="arr">→</span>': ('View case <span class="arr">→</span>', 'Ver caso <span class="arr">→</span>'),
  '<span aria-hidden="true">←</span> Todos os cases':
    ('<span aria-hidden="true">←</span> All case studies', '<span aria-hidden="true">←</span> Todos los casos'),
  'Outros projetos': ('Other projects', 'Otros proyectos'),

  'Loja física e canais digitais passaram a ser medidos na mesma plataforma, em Azure.':
    ('Physical stores and digital channels came to be measured on the same platform, on Azure.',
     'Tiendas físicas y canales digitales pasaron a medirse en la misma plataforma, en Azure.'),
  'Data Lake em Google Cloud com BigQuery, dbt e Airflow — e o legado fora da conta.':
    ('A data lake on Google Cloud with BigQuery, dbt and Airflow — and the legacy off the bill.',
     'Data Lake en Google Cloud con BigQuery, dbt y Airflow — y el legado fuera de la cuenta.'),
  'Mais de 200 dashboards com definições divergentes viraram um ambiente governado.':
    ('Over 200 dashboards with diverging definitions became one governed environment.',
     'Más de 200 dashboards con definiciones divergentes se volvieron un entorno gobernado.'),
  'Os chamados do sistema de incidentes viraram indicadores de SLA, prazo e desempenho.':
    ('Tickets from the incident system became indicators of SLA, deadlines and performance.',
     'Los tickets del sistema de incidencias se volvieron indicadores de SLA, plazo y desempeño.'),
  'Viagens, hospedagens e locações consolidadas numa arquitetura ETL → DW → BI.':
    ('Flights, lodging and rentals consolidated in an ETL → DW → BI architecture.',
     'Viajes, alojamientos y alquileres consolidados en una arquitectura ETL → DW → BI.'),
  'O departamento comercial saiu da extração pontual para uma camada de dados própria.':
    ('The sales department moved from one-off extractions to a data layer of its own.',
     'El área comercial pasó de la extracción puntual a una capa de datos propia.'),
  'O NPS deixou de ser relatório avulso e virou indicador de experiência acompanhado.':
    ('NPS stopped being a standalone report and became a tracked experience indicator.',
     'El NPS dejó de ser un informe suelto y se volvió un indicador de experiencia seguido.'),
  'Vendas, logística e operações com acesso aos mesmos indicadores, em toda a empresa.':
    ('Sales, logistics and operations with access to the same indicators, company-wide.',
     'Ventas, logística y operaciones con acceso a los mismos indicadores, en toda la empresa.'),
  'Pipelines em BigQuery e Airflow, com a visualização migrada de Tableau para Power BI.':
    ('BigQuery and Airflow pipelines, with visualization migrated from Tableau to Power BI.',
     'Pipelines en BigQuery y Airflow, con la visualización migrada de Tableau a Power BI.'),
  'Modelos preditivos anteciparam a evasão escolar para apoiar ações preventivas.':
    ('Predictive models anticipated student dropout to support preventive action.',
     'Modelos predictivos anticiparon la deserción escolar para apoyar acciones preventivas.'),
  'Protótipos em Figma fixaram o padrão antes do desenvolvimento dos painéis.':
    ('Figma prototypes set the standard before the dashboards were developed.',
     'Prototipos en Figma fijaron el estándar antes del desarrollo de los paneles.'),
  'Acompanhamento diário das unidades de um grande grupo de restaurantes.':
    ('Daily tracking of the sites of a large restaurant group.',
     'Seguimiento diario de las unidades de un gran grupo de restaurantes.'),
  'Acidentes, pedágios e operação aeroportuária integrados numa visão única.':
    ('Accidents, tolls and airport operations integrated into a single view.',
     'Accidentes, peajes y operación aeroportuaria integrados en una visión única.'),

  # frases novas do hero
  'inteligência estratégica e decisões mais assertivas':
    ('strategic intelligence and sharper decisions', 'inteligencia estratégica y decisiones más acertadas'),
  'oportunidades de negócio e resultados mensuráveis':
    ('business opportunities and measurable results', 'oportunidades de negocio y resultados medibles'),
  'conhecimento que impulsiona o crescimento':
    ('knowledge that drives growth', 'conocimiento que impulsa el crecimiento'),
  'vantagem competitiva por meio de analytics e inovação':
    ('competitive advantage through analytics and innovation', 'ventaja competitiva a través de analytics e innovación'),
  'clareza para decidir, eficiência para operar':
    ('clarity to decide, efficiency to operate', 'claridad para decidir, eficiencia para operar'),
  'valor, conectando informação à estratégia do negócio':
    ('value, connecting information to business strategy', 'valor, conectando la información a la estrategia del negocio'),
  'soluções que simplificam operações e potencializam resultados':
    ('solutions that simplify operations and amplify results', 'soluciones que simplifican operaciones y potencian resultados'),
})


def main():
    if not FONTE.exists():
        sys.exit('rode antes: node tools/extrai-textos.js index.html > tools/textos-pt.json')
    extraidas = {i['chave'] for i in json.load(FONTE.open())['itens']}

    orfas = [k for k in TRAD if k not in extraidas and k not in EXTRAS]
    if orfas:
        print('AVISO: %d chave(s) não batem com a extração — não vão traduzir nada:' % len(orfas))
        for k in orfas:
            print('   ', k[:110])

    en = {k: v[0] for k, v in TRAD.items()}
    es = {k: v[1] for k, v in TRAD.items()}
    corpo = ('/* Gerado por tools/build-i18n.py — não editar à mão.\n'
             '   A chave é o português normalizado; veja media/js/i18n.js. */\n'
             'window.ATLAS_I18N = ' +
             json.dumps({'en': en, 'es': es}, ensure_ascii=False, indent=1, sort_keys=True) + ';\n')
    SAIDA.write_text(corpo)

    traduziveis = {k for k in extraidas if k.strip()}
    cobertas = len([k for k in traduziveis if k in TRAD])
    print('%s  %.1f KB' % (SAIDA.relative_to(RAIZ), SAIDA.stat().st_size / 1024))
    print('%d chaves traduzidas · %d dos %d blocos extraídos cobertos (%.0f%%)'
          % (len(TRAD), cobertas, len(traduziveis), 100.0 * cobertas / max(1, len(traduziveis))))
    return 1 if orfas else 0


if __name__ == '__main__':
    sys.exit(main())
