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
          'Essa página não existe.',
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
  'Ver todos os cases <span class="arr">→</span>':
    ('See all case studies <span class="arr">→</span>', 'Ver todos los casos <span class="arr">→</span>'),

  # Página 404
  '<i></i> Erro 404': ('<i></i> Error 404', '<i></i> Error 404'),
  'Essa página não existe.': ('This page does not exist.', 'Esta página no existe.'),
  'O endereço pode ter mudado de lugar ou vindo com algum caractere a mais. Os caminhos abaixo continuam valendo.':
    ('The address may have moved or picked up an extra character along the way. The links below still work.',
     'La dirección puede haber cambiado de lugar o traer algún carácter de más. Los caminos de abajo siguen valiendo.'),
  'Voltar para a home <span class="arr">→</span>':
    ('Back to the homepage <span class="arr">→</span>', 'Volver al inicio <span class="arr">→</span>'),
  'Ver os cases <span class="arr">→</span>':
    ('See the case studies <span class="arr">→</span>', 'Ver los casos <span class="arr">→</span>'),
  'Conhecer alocação <span class="arr">→</span>':
    ('Explore staffing <span class="arr">→</span>', 'Conocer la asignación <span class="arr">→</span>'),
  'Conhecer Analytics &amp; BI <span class="arr">→</span>':
    ('Explore Analytics &amp; BI <span class="arr">→</span>', 'Conocer Analytics &amp; BI <span class="arr">→</span>'),
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
  'Especialistas &amp; Squads <span class="mega-tag">150+ alocados</span>':
    ('Specialists &amp; Squads <span class="mega-tag">150+ placed</span>',
     'Especialistas &amp; Squads <span class="mega-tag">150+ asignados</span>'),
  'Todos os cases <span class="mega-tag">15 projetos</span>':
    ('All case studies <span class="mega-tag">15 projects</span>',
     'Todos los casos <span class="mega-tag">15 proyectos</span>'),
  'De 200+ painéis a um ambiente': ('From 200+ dashboards to one environment', 'De 200+ paneles a un solo entorno'),
  'Legado Oracle aposentado': ('Oracle legacy retired', 'Legado Oracle jubilado'),
  'Setores atendidos <span class="mega-tag">10+</span>':
    ('Industries served <span class="mega-tag">10+</span>', 'Sectores atendidos <span class="mega-tag">10+</span>'),
  'Perfis disponíveis': ('Available profiles', 'Perfiles disponibles'),
  'Trabalhe com a gente <span class="mega-tag">Carreiras</span>':
    ('Work with us <span class="mega-tag">Careers</span>', 'Trabaje con nosotros <span class="mega-tag">Carreras</span>'),
  'Permanência <span class="mega-tag">150 mil+ horas</span>':
    ('Tenure <span class="mega-tag">150k+ hours</span>', 'Permanencia <span class="mega-tag">150 mil+ horas</span>'),
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
  '<b>500+</b> projetos <i>·</i> <b>150+</b> alocados <i>·</i> <b>10+</b> setores <i>·</i> <b>150 mil+</b> horas':
    ('<b>500+</b> projects <i>·</i> <b>150+</b> placed <i>·</i> <b>10+</b> industries <i>·</i> <b>150k+</b> hours',
     '<b>500+</b> proyectos <i>·</i> <b>150+</b> asignados <i>·</i> <b>10+</b> sectores <i>·</i> <b>150 mil+</b> horas'),

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

  # ---------------- essência e valores ----------------
  'Atlas em números': ('Atlas by the numbers', 'Atlas en números'),
  'A Atlas é uma consultoria de tecnologia em dados e alocação de especialistas. Da engenharia à decisão, em produção.':
    ('Atlas is a technology consultancy in data and specialist staffing. From engineering to decision, in production.',
     'Atlas es una consultoría de tecnología en datos y asignación de especialistas. De la ingeniería a la decisión, en producción.'),

  # ---------------- ladrilhos de números ----------------
  'Entrega': ('Delivery', 'Entrega'),
  'Alcance': ('Reach', 'Alcance'),
  'Time': ('Team', 'Equipo'),
  'Permanência': ('Tenure', 'Permanencia'),

  # ---------------- faixa de alocação ----------------

  # ---------------- soluções ----------------
  'Da informação à ação.': ('From information to action.', 'De la información a la acción.'),
  'Seis frentes. E, quando o que falta é time, os especialistas para tocá-las. Não vendemos ferramenta: resolvemos o problema por trás dela.':
    ('Six fronts. And, when what is missing is the team, the specialists to run them. We don’t sell tools: we solve the problem behind them.',
     'Seis frentes. Y, cuando lo que falta es equipo, los especialistas para llevarlos. No vendemos herramienta: resolvemos el problema detrás de ella.'),
  # ---------------- numeros da Atlas ----------------
  # O unico indicador que precisa de traducao: "mil" e portugues e
  # aparecia cru na versao em ingles. Os demais (500+, 10+, 150+) sao
  # numeros puros e saem iguais nos tres idiomas.
  '150 mil+': ('150k+', '150 mil+'),

  'Experiência comprovada. Resultados construídos na prática.':
    ('Proven experience. Results built in practice.',
     'Experiencia comprobada. Resultados construidos en la práctica.'),
  'Projetos entregues': ('Projects delivered', 'Proyectos entregados'),
  'Iniciativas em dados, BI, engenharia e inteligência.':
    ('Initiatives in data, BI, engineering and intelligence.',
     'Iniciativas en datos, BI, ingeniería e inteligencia.'),
  'Setores atendidos': ('Industries served', 'Sectores atendidos'),
  'Experiência em diferentes segmentos da economia.':
    ('Experience across different segments of the economy.',
     'Experiencia en diferentes segmentos de la economía.'),
  'Profissionais alocados': ('Professionals placed', 'Profesionales asignados'),
  'Especialistas atuando em projetos e operações de clientes.':
    ('Specialists working inside client projects and operations.',
     'Especialistas actuando en proyectos y operaciones de clientes.'),
  'Horas de alocação': ('Hours of placement', 'Horas de asignación'),
  'Experiência acumulada em operações e projetos.':
    ('Experience accumulated across operations and projects.',
     'Experiencia acumulada en operaciones y proyectos.'),
  'Tirar o peso do legado sem parar a operação, e deixar a base pronta para crescer. Migração e modernização em etapas, com o que roda hoje de pé durante o caminho.':
    ('Taking the weight off the legacy without stopping the operation, and leaving the foundation ready to grow. Migration and modernisation in stages, with what runs today kept on its feet along the way.',
     'Quitar el peso del legado sin parar la operación, y dejar la base lista para crecer. Migración y modernización por etapas, con lo que funciona hoy en pie durante el camino.'),
  'Legado aposentado sem parar a operação':
    ('Legacy retired without stopping the operation', 'Legado retirado sin parar la operación'),
  'Falar sobre modernização <span class="arr">→</span>':
    ('Talk about modernisation <span class="arr">→</span>', 'Hablar sobre modernización <span class="arr">→</span>'),
  '<span class="sol-k">Estratégia &amp; Inovação</span><span class="sol-t">Da visão à transformação</span>':
    ('<span class="sol-k">Strategy &amp; Innovation</span><span class="sol-t">From vision to transformation</span>',
     '<span class="sol-k">Estrategia &amp; Innovación</span><span class="sol-t">De la visión a la transformación</span>'),
  'Estratégia &amp; Inovação': ('Strategy &amp; Innovation', 'Estrategia &amp; Innovación'),
  'Antes de construir, decidir o que construir. Diagnóstico do que já existe, desenho do destino e a ordem em que cada passo paga o próximo — para o investimento virar entrega e não estudo.':
    ('Before building, deciding what to build. A read of what is already there, a design for where it should go, and the order in which each step pays for the next — so the investment turns into delivery, not a study.',
     'Antes de construir, decidir qué construir. Diagnóstico de lo que ya existe, diseño del destino y el orden en que cada paso paga el siguiente — para que la inversión se convierta en entrega y no en estudio.'),
  'Começa pelo que a empresa já tem, não por um projeto novo de coleta':
    ('Starts from what the company already has, not from a new collection project',
     'Empieza por lo que la empresa ya tiene, no por un proyecto nuevo de recolección'),
  'Falar sobre estratégia <span class="arr">→</span>':
    ('Talk about strategy <span class="arr">→</span>', 'Hablar sobre estrategia <span class="arr">→</span>'),
  # ---------------- seis frentes de atuacao ----------------
  '<span class="sol-k">Engenharia de Dados</span><span class="sol-t">A base que conecta seus dados</span>':
    ('<span class="sol-k">Data Engineering</span><span class="sol-t">The foundation that connects your data</span>',
     '<span class="sol-k">Ingeniería de Datos</span><span class="sol-t">La base que conecta sus datos</span>'),
  '<span class="sol-k">Cloud &amp; Modernização</span><span class="sol-t">Infraestrutura preparada para evoluir</span>':
    ('<span class="sol-k">Cloud &amp; Modernization</span><span class="sol-t">Infrastructure ready to evolve</span>',
     '<span class="sol-k">Cloud &amp; Modernización</span><span class="sol-t">Infraestructura preparada para evolucionar</span>'),
  '<span class="sol-k">Analytics &amp; BI</span><span class="sol-t">Do dado à decisão</span>':
    ('<span class="sol-k">Analytics &amp; BI</span><span class="sol-t">From data to decision</span>',
     '<span class="sol-k">Analytics &amp; BI</span><span class="sol-t">Del dato a la decisión</span>'),
  '<span class="sol-k">IA &amp; Automação</span><span class="sol-t">Inteligência que gera ação</span>':
    ('<span class="sol-k">AI &amp; Automation</span><span class="sol-t">Intelligence that drives action</span>',
     '<span class="sol-k">IA &amp; Automatización</span><span class="sol-t">Inteligencia que genera acción</span>'),
  '<span class="sol-k">Especialistas &amp; Squads</span><span class="sol-t">As pessoas certas no seu time</span>':
    ('<span class="sol-k">Specialists &amp; Squads</span><span class="sol-t">The right people on your team</span>',
     '<span class="sol-k">Especialistas &amp; Squads</span><span class="sol-t">Las personas correctas en su equipo</span>'),
  'Cloud &amp; Modernização': ('Cloud &amp; Modernization', 'Cloud &amp; Modernización'),
  'Analytics &amp; BI': ('Analytics &amp; BI', 'Analytics &amp; BI'),
  'IA &amp; Automação': ('AI &amp; Automation', 'IA &amp; Automatización'),
  'Especialistas &amp; Squads': ('Specialists &amp; Squads', 'Especialistas &amp; Squads'),
  'Engenharia de Dados': ('Data Engineering', 'Ingeniería de Datos'),
  'A camada que lê o que já existe, antecipa o que vem e tira trabalho repetitivo do caminho. Começa pelo dado que você já tem — não por um projeto novo de coleta.':
    ('The layer that reads what is already there, anticipates what is coming and takes repetitive work out of the way. It starts from the data you already have — not from a new collection project.',
     'La capa que lee lo que ya existe, anticipa lo que viene y quita trabajo repetitivo del camino. Empieza por el dato que usted ya tiene — no por un proyecto nuevo de recolección.'),
  # ---------------- licenciamento e parceiros ----------------
  'A Atlas faz parte do Google Cloud Partner Advantage e comercializa produtos Google Cloud. Em vez de comprar a licença com um fornecedor e a implantação com outro, os dois vêm da mesma empresa: um contrato, um interlocutor, e quem vende é quem coloca em produção.':
    ('Atlas is part of Google Cloud Partner Advantage and sells Google Cloud products. Instead of buying the licence from one supplier and the deployment from another, both come from the same company: one contract, one point of contact, and whoever sells is who puts it in production.',
     'Atlas forma parte de Google Cloud Partner Advantage y comercializa productos Google Cloud. En lugar de comprar la licencia a un proveedor y la implementación a otro, ambos vienen de la misma empresa: un contrato, un interlocutor, y quien vende es quien lo pone en producción.'),
  'Implantação': ('Deployment', 'Implementación'),
  'Contrato único': ('Single contract', 'Contrato único'),
  '<span aria-hidden="true">←</span> Voltar para parceiros':
    ('<span aria-hidden="true">←</span> Back to partners',
     '<span aria-hidden="true">←</span> Volver a socios'),
  'Produtos com que a Atlas trabalha':
    ('Products Atlas works with', 'Productos con los que Atlas trabaja'),
  'Projeto entregue pela Atlas': ('Project delivered by Atlas', 'Proyecto entregado por Atlas'),
  '✦ marca os produtos com projeto entregue pela Atlas':
    ('✦ marks the products with a project delivered by Atlas',
     '✦ marca los productos con proyecto entregado por Atlas'),
  'Cases entregues com Databricks': ('Projects delivered with Databricks', 'Casos entregados con Databricks'),
  'Cases entregues com Microsoft': ('Projects delivered with Microsoft', 'Casos entregados con Microsoft'),
  'Cases entregues com Google Cloud': ('Projects delivered with Google Cloud', 'Casos entregados con Google Cloud'),
  'Cases entregues com Tableau': ('Projects delivered with Tableau', 'Casos entregados con Tableau'),
  'Cases entregues com Oracle': ('Projects delivered with Oracle', 'Casos entregados con Oracle'),
  'Licença e implantação na mesma empresa':
    ('Licence and deployment from the same company', 'Licencia e implementación en la misma empresa'),
  'Frentes de atuação': ('Areas of work', 'Frentes de actuación'),
  'Transformar o dado organizado em leitura do negócio — e a leitura em decisão. O painel não é o fim: ele existe para alguém escolher melhor com ele na frente.':
    ('Turning organized data into business insight — and insight into a decision. The dashboard is not the end: it exists so somebody chooses better with it in front of them.',
     'Transformar el dato organizado en lectura del negocio — y la lectura en decisión. El panel no es el fin: existe para que alguien elija mejor con él delante.'),
  'Padrão visual antes do desenvolvimento': ('Visual standard before development', 'Estándar visual antes del desarrollo'),
  'A infraestrutura por onde o dado anda: ingestão, armazenamento, transformação e governança. Feita para aguentar a próxima pergunta, não só a de hoje.':
    ('The infrastructure the data travels on: ingestion, storage, transformation and governance. Built to hold the next question, not just today’s.',
     'La infraestructura por donde circula el dato: ingesta, almacenamiento, transformación y gobernanza. Hecha para aguantar la próxima pregunta, no solo la de hoy.'),
  'Regra de negócio em código, testada e versionada': ('Business rules as code, tested and versioned', 'Regla de negocio en código, probada y versionada'),
  'A camada que lê o que já existe, antecipa o que vem e muda como a empresa opera. Começa pelo dado que você já tem — não por um projeto novo de coleta.':
    ('The layer that reads what already exists, anticipates what is coming and changes how the company operates. It starts from the data you already have — not from a new collection project.',
     'La capa que lee lo que ya existe, anticipa lo que viene y cambia cómo opera la empresa. Empieza por el dato que usted ya tiene — no por un nuevo proyecto de recolección.'),
  'Em produção, não em prova de conceito': ('In production, not in proof of concept', 'En producción, no en prueba de concepto'),
  'Pessoas &amp; Alocação': ('People &amp; Staffing', 'Personas &amp; Asignación'),
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
})

TRAD.update({
  # ---------------- cases ----------------
  'Resultados que falam por si.': ('Results that speak for themselves.', 'Resultados que hablan por sí solos.'),
  'Cliente confidencial': ('Confidential client', 'Cliente confidencial'),
  'Antes e depois': ('Before and after', 'Antes y después'),
  'Antes': ('Before', 'Antes'),
  'Depois': ('After', 'Después'),
  'Cenário': ('Context', 'Escenario'),
  'Arquitetura': ('Architecture', 'Arquitectura'),
  'Solução': ('Solution', 'Solución'),
  'O que mudou': ('What changed', 'Qué cambió'),

  # case 1
  'Canais separados viraram uma plataforma só': ('Separate channels became a single platform', 'Canales separados se volvieron una sola plataforma'),

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
  'Seguradoras': ('Insurance carriers', 'Aseguradoras'),
  'Holding': ('Holding companies', 'Holdings'),
  'Privacidade': ('Privacy', 'Privacidad'),
  'Política de privacidade': ('Privacy policy', 'Política de privacidad'),
  'Food Service': ('Food Service', 'Food Service'),
  'Infraestrutura &amp; Mobilidade': ('Infrastructure &amp; Mobility', 'Infraestructura &amp; Movilidad'),

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
  'Falar sobre Engenharia de Dados <span class="arr">→</span>':
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
  '<span>Clareza</span> <span>Resultado</span> <span>Parceria</span> <span>Pessoas</span>':
    ('<span>Clarity</span> <span>Results</span> <span>Partnership</span> <span>People</span>',
     '<span>Claridad</span> <span>Resultado</span> <span>Alianza</span> <span>Personas</span>'),
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
  '<span aria-hidden="true">←</span> Voltar para cases':
    ('<span aria-hidden="true">←</span> Back to case studies', '<span aria-hidden="true">←</span> Volver a los casos'),
  'Case de sucesso — cliente confidencial':
    ('Success story — confidential client', 'Historia de éxito — cliente confidencial'),
  'Informações do projeto': ('Project information', 'Información del proyecto'),
  'Parceiros': ('Partners', 'Socios'),
  'Tecnologias': ('Technologies', 'Tecnologías'),
  'Áreas de atuação': ('Areas of work', 'Áreas de actuación'),
  'Setor': ('Industry', 'Sector'),
  'Nome do cliente preservado por confidencialidade.':
    ('Client name withheld for confidentiality.', 'Nombre del cliente reservado por confidencialidad.'),
  'Desafios': ('Challenges', 'Desafíos'),
  'Resultados': ('Results', 'Resultados'),
  'Entre em contato': ('Get in touch', 'Póngase en contacto'),
  'Conte o seu cenário para quem vai executar. Em 30 minutos mapeamos o caminho — mesmo que ele não passe pela gente.':
    ('Tell your situation to the people who will do the work. In 30 minutes we map the path — even if it does not run through us.',
     'Cuente su escenario a quien va a ejecutar. En 30 minutos mapeamos el camino — incluso si no pasa por nosotros.'),
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
TRAD.update({
  # ---------------- desafios dos cases ----------------
  'Dados de lojas físicas e de canais digitais espalhados em sistemas diferentes, sem visão única de performance.':
    ('Data from physical stores and digital channels scattered across different systems, with no single view of performance.',
     'Datos de tiendas físicas y canales digitales dispersos en sistemas distintos, sin visión única de desempeño.'),
  'Cada canal media a própria venda com sua própria régua, o que impedia comparar um com o outro.':
    ('Each channel measured its own sales by its own yardstick, which made comparing them impossible.',
     'Cada canal medía su propia venta con su propia vara, lo que impedía compararlos entre sí.'),
  'A consolidação para qualquer leitura conjunta era manual e refeita a cada pergunta.':
    ('Consolidating anything into a joint view was manual and redone for every question.',
     'La consolidación para cualquier lectura conjunta era manual y se rehacía con cada pregunta.'),
  'Dados presos em um legado Oracle, caro de manter e distante das necessidades analíticas do negócio.':
    ('Data locked in an Oracle legacy, expensive to maintain and far from the analytical needs of the business.',
     'Datos atrapados en un legado Oracle, caro de mantener y lejos de las necesidades analíticas del negocio.'),
  'As transformações viviam em scripts avulsos, sem teste nem versionamento.':
    ('Transformations lived in loose scripts, with no tests and no versioning.',
     'Las transformaciones vivían en scripts sueltos, sin pruebas ni versionado.'),
  'A migração precisava acontecer sem nenhuma parada da operação.':
    ('The migration had to happen without a single stop in operations.',
     'La migración tenía que ocurrir sin ninguna parada de la operación.'),
  'A mesma métrica tinha contas diferentes dependendo de qual painel se abrisse.':
    ('The same metric had different calculations depending on which dashboard you opened.',
     'La misma métrica tenía cálculos distintos según el panel que se abriera.'),
  'Toda pergunta nova das áreas entrava numa fila e dependia do time de dados.':
    ('Every new question from the business joined a queue and depended on the data team.',
     'Cada pregunta nueva de las áreas entraba en una fila y dependía del equipo de datos.'),
  'O sistema de incidentes acumulava chamados, mas nenhum indicador saía deles.':
    ('The incident system piled up tickets, but no indicator came out of them.',
     'El sistema de incidencias acumulaba tickets, pero ningún indicador salía de ellos.'),
  'Sem SLA medido, prazo e desempenho operacional eram discutidos por impressão.':
    ('With no SLA measured, deadlines and operational performance were argued by impression.',
     'Sin SLA medido, plazo y desempeño operativo se discutían por impresión.'),
  'Viagens, hospedagens e locações eram medidas em três linhas separadas.':
    ('Flights, lodging and rentals were measured in three separate lines.',
     'Viajes, alojamientos y alquileres se medían en tres líneas separadas.'),
  'Não existia leitura conjunta do negócio: cada linha tinha seu próprio número.':
    ('There was no joint reading of the business: each line had its own number.',
     'No existía lectura conjunta del negocio: cada línea tenía su propio número.'),
  'Toda análise comercial dependia de uma extração pontual, refeita a cada pedido.':
    ('Every sales analysis depended on a one-off extraction, redone for each request.',
     'Cada análisis comercial dependía de una extracción puntual, rehecha con cada pedido.'),
  'O departamento não tinha camada de dados própria: dependia do que outras áreas haviam modelado.':
    ('The department had no data layer of its own: it depended on what other areas had modelled.',
     'El departamento no tenía capa de datos propia: dependía de lo que otras áreas habían modelado.'),
  'O NPS saía como relatório avulso, lido uma vez e arquivado.':
    ('NPS came out as a standalone report, read once and filed away.',
     'El NPS salía como informe suelto, leído una vez y archivado.'),
  'A voz do cliente não chegava às áreas que podiam agir sobre ela.':
    ('The voice of the customer never reached the teams that could act on it.',
     'La voz del cliente no llegaba a las áreas que podían actuar sobre ella.'),
  'Cada área enxergava apenas o próprio recorte de vendas, logística ou operação.':
    ('Each team saw only its own slice of sales, logistics or operations.',
     'Cada área veía solo su propio recorte de ventas, logística u operación.'),
  'Sem acesso comum aos indicadores, decisões de uma área ignoravam o efeito nas outras.':
    ('With no shared access to the indicators, one team\\u2019s decisions ignored the effect on the others.',
     'Sin acceso común a los indicadores, las decisiones de un área ignoraban el efecto en las demás.'),
  'A rede de diagnóstico mantinha duas ferramentas de BI em paralelo, com custo e treinamento dobrados.':
    ('The diagnostics network kept two BI tools running in parallel, with doubled cost and training.',
     'La red de diagnóstico mantenía dos herramientas de BI en paralelo, con costo y capacitación duplicados.'),
  'A mesma leitura podia divergir dependendo de qual das duas se abrisse.':
    ('The same reading could diverge depending on which of the two you opened.',
     'La misma lectura podía diverger según cuál de las dos se abriera.'),
  'A evasão só era constatada depois de acontecer, quando já não havia ação possível.':
    ('Dropout was only observed after the fact, when no action was possible any more.',
     'La deserción solo se constataba después de ocurrir, cuando ya no había acción posible.'),
  'Os dados educacionais existiam, mas descreviam o passado em vez de apontar risco.':
    ('The education data existed, but it described the past instead of pointing at risk.',
     'Los datos educativos existían, pero describían el pasado en vez de señalar riesgo.'),
  'O padrão visual era definido depois, painel a painel, quando já havia centenas deles.':
    ('The visual standard was set afterwards, dashboard by dashboard, once there were already hundreds.',
     'El estándar visual se definía después, panel a panel, cuando ya había cientos de ellos.'),
  'Cada dashboard novo nascia com uma leitura diferente da anterior.':
    ('Every new dashboard was born reading differently from the last.',
     'Cada dashboard nuevo nacía con una lectura distinta del anterior.'),
  'O desempenho das unidades só aparecia no fechamento do mês.':
    ('The sites\\u2019 performance only showed up at month-end close.',
     'El desempeño de las unidades solo aparecía en el cierre del mes.'),
  'Quando o desvio era visto, o mês já tinha acabado e não dava para corrigir.':
    ('By the time the deviation was seen, the month was over and there was no fixing it.',
     'Cuando se veía la desviación, el mes ya había terminado y no se podía corregir.'),
  'Gestão de acidentes, arrecadação de pedágios e operação aeroportuária eram acompanhadas em três lugares.':
    ('Accident management, toll collection and airport operations were tracked in three different places.',
     'Gestión de accidentes, recaudación de peajes y operación aeroportuaria se seguían en tres lugares.'),
  'Não havia leitura integrada das três operações, que dividem a mesma estrutura.':
    ('There was no integrated reading of the three operations, which share the same structure.',
     'No había lectura integrada de las tres operaciones, que comparten la misma estructura.'),
})

TRAD.update({
  # ---------------- soluções dos cases ----------------
  'Plataforma de dados em Azure integrando todos os canais de venda, com pipelines em Synapse, Data Factory e Databricks. Sobre ela, dashboards Power BI de vendas, operação e performance por canal, lendo as mesmas definições.':
    ('A data platform on Azure integrating every sales channel, with pipelines on Synapse, Data Factory and Databricks. On top of it, Power BI dashboards for sales, operations and performance by channel, all reading the same definitions.',
     'Plataforma de datos en Azure integrando todos los canales de venta, con pipelines en Synapse, Data Factory y Databricks. Sobre ella, dashboards Power BI de ventas, operación y desempeño por canal, leyendo las mismas definiciones.'),
  'Data Lake em Google Cloud com processamento em BigQuery, transformações em dbt, orquestração em Airflow e BI unificado em Looker. A virada foi feita em paralelo ao legado, que só foi desligado depois de a nova base responder igual.':
    ('A data lake on Google Cloud with processing on BigQuery, transformations in dbt, orchestration in Airflow and unified BI in Looker. The switch ran in parallel with the legacy, which was only shut down once the new base answered identically.',
     'Data Lake en Google Cloud con procesamiento en BigQuery, transformaciones en dbt, orquestación en Airflow y BI unificado en Looker. El cambio se hizo en paralelo al legado, que solo se apagó cuando la nueva base respondió igual.'),
  'Ambiente centralizado em Looker, com dados e definições unificados. A migração veio junto com padronização de nomenclatura e layout e com um modelo de self-service BI para as áreas de negócio.':
    ('A centralized environment on Looker, with unified data and definitions. The migration came together with naming and layout standards and a self-service BI model for the business teams.',
     'Entorno centralizado en Looker, con datos y definiciones unificados. La migración vino junto con estandarización de nomenclatura y layout y un modelo de BI de autoservicio para las áreas de negocio.'),
  'BI sobre a base de incidentes, transformando cada chamado em indicador de SLA, prazo e desempenho operacional, com histórico em Data Warehouse.':
    ('BI over the incident base, turning every ticket into an indicator of SLA, deadline and operational performance, with history in a data warehouse.',
     'BI sobre la base de incidencias, transformando cada ticket en indicador de SLA, plazo y desempeño operativo, con histórico en Data Warehouse.'),
  'Arquitetura completa ETL → DW → BI consolidando as três linhas em um modelo único, com a visão do negócio inteiro em MicroStrategy.':
    ('A complete ETL → DW → BI architecture consolidating the three lines into a single model, with the whole business in view on MicroStrategy.',
     'Arquitectura completa ETL → DW → BI consolidando las tres líneas en un modelo único, con la visión del negocio entero en MicroStrategy.'),
  'Estrutura de dados e indicadores própria do comercial, consolidando as informações do departamento para análise e decisão.':
    ('A data and indicator structure belonging to sales, consolidating the department\\u2019s information for analysis and decision.',
     'Estructura de datos e indicadores propia del área comercial, consolidando la información del departamento para análisis y decisión.'),
  'Acompanhamento contínuo de NPS, transformando as respostas em indicadores de experiência e em oportunidades de melhoria distribuídas às áreas.':
    ('Continuous NPS tracking, turning the responses into experience indicators and into improvement opportunities distributed to the teams.',
     'Seguimiento continuo de NPS, transformando las respuestas en indicadores de experiencia y en oportunidades de mejora distribuidas a las áreas.'),
  'Dashboards de vendas, logística e operações com acesso aberto a todas as áreas da organização, sobre o mesmo Data Warehouse.':
    ('Sales, logistics and operations dashboards open to every area of the organization, over the same data warehouse.',
     'Dashboards de ventas, logística y operaciones con acceso abierto a todas las áreas de la organización, sobre el mismo Data Warehouse.'),
  'Pipelines em BigQuery e Airflow alimentando uma camada única, com a visualização migrada de Tableau para Power BI.':
    ('BigQuery and Airflow pipelines feeding a single layer, with visualization migrated from Tableau to Power BI.',
     'Pipelines en BigQuery y Airflow alimentando una capa única, con la visualización migrada de Tableau a Power BI.'),
  'Centenas de dashboards educacionais somados a modelos preditivos que estimam risco de evasão a tempo de apoiar ações preventivas.':
    ('Hundreds of education dashboards plus predictive models that estimate dropout risk in time to support preventive action.',
     'Cientos de dashboards educativos sumados a modelos predictivos que estiman riesgo de deserción a tiempo de apoyar acciones preventivas.'),
  'Protótipos em Figma fixando o padrão visual antes do desenvolvimento, e centenas de dashboards Power BI construídos já dentro dele.':
    ('Figma prototypes fixing the visual standard before development, and hundreds of Power BI dashboards built inside it from the start.',
     'Prototipos en Figma fijando el estándar visual antes del desarrollo, y cientos de dashboards Power BI construidos ya dentro de él.'),
  'Painéis de acompanhamento diário das unidades do grupo, com os desvios visíveis em tempo de agir sobre eles.':
    ('Daily tracking dashboards for the group\\u2019s sites, with deviations visible in time to act on them.',
     'Paneles de seguimiento diario de las unidades del grupo, con los desvíos visibles a tiempo de actuar sobre ellos.'),
  'Painéis integrando as três operações em uma visão única, sobre a mesma base de dados e indicadores.':
    ('Dashboards integrating the three operations into a single view, over the same data and indicators.',
     'Paneles integrando las tres operaciones en una visión única, sobre la misma base de datos e indicadores.'),
  'Data Lake em Google Cloud, com processamento em BigQuery.':
    ('A data lake on Google Cloud, with processing on BigQuery.',
     'Data Lake en Google Cloud, con procesamiento en BigQuery.'),

  # ---------------- resultados ----------------
  '<b>Canais comparáveis</b> loja física e digital deixaram de ser medidos em sistemas separados':
    ('<b>Comparable channels</b> physical and digital stores stopped being measured in separate systems',
     '<b>Canales comparables</b> tienda física y digital dejaron de medirse en sistemas separados'),
  '<b>Fim da consolidação manual</b> venda e operação passaram a ser lidas no mesmo painel':
    ('<b>No more manual consolidation</b> sales and operations came to be read on the same dashboard',
     '<b>Fin de la consolidación manual</b> venta y operación pasaron a leerse en el mismo panel'),
  '<b>Base reaproveitável</b> nova análise parte da plataforma existente, não de uma nova extração':
    ('<b>Reusable foundation</b> a new analysis starts from the existing platform, not from a new extraction',
     '<b>Base reutilizable</b> un nuevo análisis parte de la plataforma existente, no de una nueva extracción'),
  '<b>Legado fora da conta</b> o custo de manter o ambiente Oracle deixou de existir':
    ('<b>Legacy off the bill</b> the cost of keeping the Oracle environment stopped existing',
     '<b>Legado fuera de la cuenta</b> el costo de mantener el entorno Oracle dejó de existir'),
  '<b>Regra em código</b> as transformações saíram de scripts avulsos para dbt, testado e versionado':
    ('<b>Rules as code</b> transformations moved from loose scripts to dbt, tested and versioned',
     '<b>Regla en código</b> las transformaciones salieron de scripts sueltos a dbt, probado y versionado'),
  '<b>Uma camada só</b> Looker passou a ser o único caminho entre o dado e o negócio':
    ('<b>A single layer</b> Looker became the only path between the data and the business',
     '<b>Una sola capa</b> Looker pasó a ser el único camino entre el dato y el negocio'),
  '<b>Uma definição por métrica</b> a mesma conta deixou de ter versões diferentes em mais de 200 painéis':
    ('<b>One definition per metric</b> the same calculation stopped having different versions across 200+ dashboards',
     '<b>Una definición por métrica</b> el mismo cálculo dejó de tener versiones distintas en más de 200 paneles'),
  '<b>Pergunta sem fila</b> o self-service tirou o intervalo entre a dúvida da área e a resposta':
    ('<b>Questions without a queue</b> self-service removed the gap between the team\\u2019s question and the answer',
     '<b>Preguntas sin fila</b> el autoservicio quitó el intervalo entre la duda del área y la respuesta'),
  '<b>Crescimento com padrão</b> painel novo passa a nascer dentro de um modelo, não ao lado dele':
    ('<b>Growth with a standard</b> a new dashboard now starts inside a model, not alongside it',
     '<b>Crecimiento con estándar</b> un panel nuevo pasa a nacer dentro de un modelo, no al lado de él'),

  # ---------------- eixos antes/depois dos cases abertos ----------------
  'sistemas medindo os canais em separado': ('systems measuring the channels separately', 'sistemas midiendo los canales por separado'),
  'plataforma com venda e operação lado a lado': ('platform with sales and operations side by side', 'plataforma con venta y operación lado a lado'),
  'legado caro de manter, distante da análise': ('legacy expensive to maintain, far from analysis', 'legado caro de mantener, lejos del análisis'),
  'legado aposentado, sem interromper a operação': ('legacy retired, without interrupting operations', 'legado jubilado, sin interrumpir la operación'),
  'painéis crescendo sem padrão nem fonte única': ('dashboards growing with no standard and no single source', 'paneles creciendo sin estándar ni fuente única'),
  'ambiente, com uma definição por métrica': ('environment, with one definition per metric', 'entorno, con una definición por métrica'),
  'GCP, BigQuery, dbt, Airflow, Looker': ('GCP, BigQuery, dbt, Airflow, Looker', 'GCP, BigQuery, dbt, Airflow, Looker'),
})

TRAD.update({
  # ---------------- os dois cases novos ----------------
  'Os acessos da holding inteira sob auditoria':
    ('The whole holding’s access under audit', 'Los accesos de todo el holding bajo auditoría'),
  'Central de gerenciamento de acessos em Java e auditoria de acessos de toda a holding.':
    ('A Java access management hub and access auditing across the entire holding.',
     'Central de gestión de accesos en Java y auditoría de accesos de todo el holding.'),
  'Os acessos a sistemas eram concedidos e revistos empresa a empresa, sem uma central que respondesse pela holding inteira.':
    ('System access was granted and reviewed company by company, with no hub answering for the holding as a whole.',
     'Los accesos a sistemas se concedían y revisaban empresa por empresa, sin una central que respondiera por todo el holding.'),
  'A segurança da informação não tinha relatório de auditoria que cruzasse os acessos de todas as empresas do grupo.':
    ('Information security had no audit report crossing the access records of every company in the group.',
     'La seguridad de la información no tenía informe de auditoría que cruzara los accesos de todas las empresas del grupo.'),
  'Sistema IDM de gerenciamento de acessos desenvolvido em Java, servindo de central para a concessão e a revisão de acessos. Sobre ele, integração em Informatica PowerCenter e relatórios de auditoria em MicroStrategy e Power BI para a área de segurança da informação.':
    ('An IDM access management system built in Java, serving as the hub for granting and reviewing access. On top of it, integration on Informatica PowerCenter and audit reports in MicroStrategy and Power BI for the information security team.',
     'Sistema IDM de gestión de accesos desarrollado en Java, que sirve de central para la concesión y la revisión de accesos. Sobre él, integración en Informatica PowerCenter e informes de auditoría en MicroStrategy y Power BI para el área de seguridad de la información.'),
  'A concessão e a revisão de acessos passaram a sair de uma central única, não de cada empresa em separado.':
    ('Granting and reviewing access came to run from a single hub, not from each company separately.',
     'La concesión y la revisión de accesos pasaron a salir de una central única, no de cada empresa por separado.'),
  'A segurança da informação passou a ter relatório de auditoria cobrindo os acessos de toda a holding.':
    ('Information security came to have an audit report covering access across the entire holding.',
     'La seguridad de la información pasó a tener un informe de auditoría que cubre los accesos de todo el holding.'),
  'Instituição Financeira': ('Financial Institution', 'Institución Financiera'),

  'Faturamento, endossos e comissões num sistema só':
    ('Billing, endorsements and commissions in a single system',
     'Facturación, endosos y comisiones en un solo sistema'),
  'Faturamento, lançamento de endossos e pagamento de comissões num sistema único.':
    ('Billing, endorsement entry and commission payments in one single system.',
     'Facturación, registro de endosos y pago de comisiones en un sistema único.'),
  'Faturamento, endossos e comissões eram controlados em rotinas separadas, cada uma com a sua própria planilha.':
    ('Billing, endorsements and commissions were handled in separate routines, each with its own spreadsheet.',
     'Facturación, endosos y comisiones se controlaban en rutinas separadas, cada una con su propia planilla.'),
  'O pagamento de comissão dependia de conferência manual contra o que havia sido faturado.':
    ('Commission payment depended on a manual check against what had been billed.',
     'El pago de comisión dependía de una verificación manual contra lo facturado.'),
  'Sistema próprio da corretora reunindo o faturamento, o lançamento de endossos e o pagamento de comissões no mesmo fluxo, com cada etapa alimentando a seguinte.':
    ('A system of the brokerage’s own bringing billing, endorsement entry and commission payment into the same flow, with each step feeding the next.',
     'Sistema propio de la correduría que reúne la facturación, el registro de endosos y el pago de comisiones en el mismo flujo, con cada etapa alimentando la siguiente.'),
  'As três rotinas passaram a viver no mesmo sistema, em vez de em planilhas separadas.':
    ('The three routines came to live in the same system, instead of in separate spreadsheets.',
     'Las tres rutinas pasaron a vivir en el mismo sistema, en vez de en planillas separadas.'),
  'O pagamento de comissão passa a derivar do que foi faturado, sem conferência manual entre os dois.':
    ('Commission payment now derives from what was billed, with no manual check between the two.',
     'El pago de comisión pasa a derivar de lo facturado, sin verificación manual entre ambos.'),
  'Corretagem de Seguros': ('Insurance Brokerage', 'Correduría de Seguros'),
})

TRAD.update({
  # ---------------- índice de cases: filtro e grade ----------------
  'Todos os cases de sucesso': ('All success stories', 'Todos los casos de éxito'),
  'Projetos em destaque': ('Featured projects', 'Proyectos destacados'),
  'Continuar lendo <span class="arr">→</span>':
    ('Keep reading <span class="arr">→</span>', 'Seguir leyendo <span class="arr">→</span>'),
  'Ver estudo de caso completo <span class="arr">→</span>':
    ('See the full case study <span class="arr">→</span>', 'Ver el estudio de caso completo <span class="arr">→</span>'),
  'Categorias': ('Categories', 'Categorías'),
  'Todos': ('All', 'Todos'),
})


# ============================================================
# Glossário de termos curtos.
#
# Existe para não ter que escrever à mão cada combinação de etiquetas.
# Uma linha de chips como <span>A</span><span>B</span> aparece em dezenas
# de variações pelos treze cases; compor a tradução a partir dos termos
# cobre todas, inclusive as que ainda não existem.
#
# Nome de produto não entra aqui: Power BI, BigQuery e Airflow são os
# mesmos nas três línguas e o composto resolve sozinho quando o termo
# não está no glossário.
# ============================================================
TRAD.update({
  'Microsoft — ver produtos e cases': ('Microsoft — see products and cases', 'Microsoft — ver productos y casos'),
  'Google Cloud — ver produtos e cases': ('Google Cloud — see products and cases', 'Google Cloud — ver productos y casos'),
  'Amazon Web Services — ver produtos e cases': ('Amazon Web Services — see products and cases', 'Amazon Web Services — ver productos y casos'),
  'IBM — ver produtos e cases': ('IBM — see products and cases', 'IBM — ver productos y casos'),
  'Databricks — ver produtos e cases': ('Databricks — see products and cases', 'Databricks — ver productos y casos'),
  'Tableau — ver produtos e cases': ('Tableau — see products and cases', 'Tableau — ver productos y casos'),
  'Snowflake — ver produtos e cases': ('Snowflake — see products and cases', 'Snowflake — ver productos y casos'),
  'Oracle — ver produtos e cases': ('Oracle — see products and cases', 'Oracle — ver productos y casos'),
})

# Solucoes: titulos com enfase e legendas dos cartoes-icone (um bloco por legenda)
TRAD.update({
  'Da visão à <em class="ac">transformação</em>': ('From vision to <em class="ac">transformation</em>', 'De la visión a la <em class="ac">transformación</em>'),
  'A base que <em class="ac">conecta seus dados</em>': ('The foundation that <em class="ac">connects your data</em>', 'La base que <em class="ac">conecta sus datos</em>'),
  'Infraestrutura <em class="ac">preparada para evoluir</em>': ('Infrastructure <em class="ac">ready to evolve</em>', 'Infraestructura <em class="ac">preparada para evolucionar</em>'),
  'Do dado <em class="ac">à decisão</em>': ('From data <em class="ac">to decision</em>', 'Del dato <em class="ac">a la decisión</em>'),
  'Inteligência <em class="ac">que gera ação</em>': ('Intelligence <em class="ac">that drives action</em>', 'Inteligencia <em class="ac">que genera acción</em>'),
  'As pessoas certas <em class="ac">no seu time</em>': ('The right people <em class="ac">on your team</em>', 'Las personas correctas <em class="ac">en su equipo</em>'),
  'Diagnóstico de maturidade': ('Maturity assessment', 'Diagnóstico de madurez'),
  'Roadmap de dados': ('Data roadmap', 'Hoja de ruta de datos'),
  'Arquitetura alvo': ('Target architecture', 'Arquitectura objetivo'),
  'Governança': ('Governance', 'Gobernanza'),
  'Priorização de casos de uso': ('Use-case prioritisation', 'Priorización de casos de uso'),
  'Data Engineering': ('Data Engineering', 'Data Engineering'),
  'Pipelines': ('Pipelines', 'Pipelines'),
  'Qualidade de dados': ('Data quality', 'Calidad de datos'),
  'Migração para nuvem': ('Cloud migration', 'Migración a la nube'),
  'Modernização de legado': ('Legacy modernisation', 'Modernización de sistemas heredados'),
  'Modern Data Stack': ('Modern Data Stack', 'Modern Data Stack'),
  'Business Intelligence': ('Business Intelligence', 'Business Intelligence'),
  'Data Visualization': ('Data Visualization', 'Data Visualization'),
  'Self-service BI': ('Self-service BI', 'Self-service BI'),
  'Governança de métricas': ('Metrics governance', 'Gobernanza de métricas'),
  'Data Design': ('Data Design', 'Data Design'),
  'Automação de processos': ('Process automation', 'Automatización de procesos'),
  'Alocação de especialistas': ('Specialist staffing', 'Asignación de especialistas'),
  'Squads de dados': ('Data squads', 'Squads de datos'),
  'Engenheiros e analistas': ('Engineers and analysts', 'Ingenieros y analistas'),
})

# ---------------- Vitrine de BI (bi-analytics.html) ----------------
# Os textos marcados "JS" são escritos pelo script da vitrine depois do
# carregamento; o motor os alcança pelo MutationObserver. Não saem da
# extração estática, então entram também em EXTRAS (abaixo).
TRAD.update({
  'Doze entregas, três frentes. Escolha uma e veja como ela aparece num dashboard de verdade: clique, filtre e compare.':
    ('Twelve deliverables, three fronts. Pick one and see how it shows up in a real dashboard: click, filter and compare.',
     'Doce entregas, tres frentes. Elija una y vea cómo aparece en un dashboard de verdad: haga clic, filtre y compare.'),
  'Entregas de Analytics e BI': ('Analytics & BI deliverables', 'Entregas de Analytics y BI'),
  'Exemplo ilustrativo · sem dados reais': ('Illustrative example · no real data', 'Ejemplo ilustrativo · sin datos reales'),
  # painel 1
  'Fontes': ('Sources', 'Fuentes'), 'Fonte': ('Source', 'Fuente'), 'Modelo': ('Model', 'Modelo'), 'Indicador': ('Indicator', 'Indicador'),
  'Modelo dimensional': ('Dimensional model', 'Modelo dimensional'),
  'Fatos e dimensões': ('Facts and dimensions', 'Hechos y dimensiones'),
  'Passe o mouse numa fonte ou num indicador e acompanhe o caminho do dado.':
    ('Hover a source or an indicator and follow the data path.', 'Pase el mouse por una fuente o un indicador y siga el camino del dato.'),
  'Passe o mouse numa fonte ou num indicador para ver o caminho do dado.':
    ('Hover a source or an indicator to see the data path.', 'Pase el mouse por una fuente o un indicador para ver el camino del dato.'),
  'Organizamos o dado em fatos (o que aconteceu) e dimensões (como você quer cortar), no desenho que o BI lê melhor. Os dados de várias fontes passam pelo modelo antes de virarem indicador.':
    ('We organize data into facts (what happened) and dimensions (how you want to slice it), in the design BI reads best. Data from several sources goes through the model before becoming an indicator.',
     'Organizamos el dato en hechos (lo que ocurrió) y dimensiones (cómo quiere cortarlo), en el diseño que mejor lee el BI. Los datos de varias fuentes pasan por el modelo antes de convertirse en indicador.'),
  # JS: dicas dos indicadores
  'Cada área lê a mesma definição: a reunião discute a decisão, não o número.':
    ('Every area reads the same definition: the meeting discusses the decision, not the number.', 'Cada área lee la misma definición: la reunión discute la decisión, no el número.'),
  'A regra mora no modelo, não em cada painel.': ('The rule lives in the model, not in each dashboard.', 'La regla vive en el modelo, no en cada panel.'),
  'O catálogo diz o que cada indicador significa e de onde ele vem.':
    ('The catalog says what each indicator means and where it comes from.', 'El catálogo dice qué significa cada indicador y de dónde viene.'),
  'Dado de várias fontes chega ao indicador pelo mesmo caminho.':
    ('Data from several sources reaches the indicator the same way.', 'El dato de varias fuentes llega al indicador por el mismo camino.'),
  'O dado entra uma vez no modelo e ganha a regra de negócio antes de chegar a qualquer painel.':
    ('Data enters the model once and gets the business rule before reaching any dashboard.', 'El dato entra una vez al modelo y recibe la regla de negocio antes de llegar a cualquier panel.'),
  # painel 2
  'Como cada painel calcula': ('How each dashboard calculates', 'Cómo calcula cada panel'),
  'Cada painel por conta própria': ('Each dashboard on its own', 'Cada panel por su cuenta'),
  'Definição única': ('Single definition', 'Definición única'),
  'Definição da métrica': ('Metric definition', 'Definición de la métrica'),
  'escrita uma vez': ('written once', 'escrita una vez'),
  'Alterne entre "por conta própria" e "definição única".': ('Switch between "on its own" and "single definition".', 'Alterne entre "por su cuenta" y "definición única".'),
  'Cada indicador tem uma única conta, escrita uma vez no modelo. Todos os painéis leem a mesma definição, e a reunião deixa de discutir qual número está certo.':
    ('Each indicator has a single calculation, written once in the model. Every dashboard reads the same definition, and the meeting stops arguing about which number is right.',
     'Cada indicador tiene una única cuenta, escrita una vez en el modelo. Todos los paneles leen la misma definición, y la reunión deja de discutir cuál número es el correcto.'),
  'Uma conta, escrita uma vez no modelo: todos os painéis leem o mesmo número.':
    ('One calculation, written once in the model: every dashboard reads the same number.', 'Una cuenta, escrita una vez en el modelo: todos los paneles leen el mismo número.'),
  'Cada painel faz a conta do seu jeito: números diferentes para a mesma métrica, e a reunião discute o dado.':
    ('Each dashboard does the math its own way: different numbers for the same metric, and the meeting debates the data.', 'Cada panel hace la cuenta a su manera: números distintos para la misma métrica, y la reunión discute el dato.'),
  # painel 3
  'Histórico da regra': ('Rule history', 'Historial de la regla'), 'Criada': ('Created', 'Creada'), 'Ajustada': ('Adjusted', 'Ajustada'),
  'Revisada': ('Reviewed', 'Revisada'), 'Atual': ('Current', 'Actual'), 'Resultado da métrica': ('Metric result', 'Resultado de la métrica'),
  'Cada mudança de regra fica registrada: dá para ver o que mudou e voltar atrás.':
    ('Every rule change is recorded: you can see what changed and roll back.', 'Cada cambio de regla queda registrado: se ve qué cambió y se puede volver atrás.'),
  'A regra de cada métrica vive no modelo, com histórico. Dá para saber o que mudou e quando, e voltar atrás sem refazer painéis.':
    ('Each metric rule lives in the model, with history. You can tell what changed and when, and roll back without rebuilding dashboards.',
     'La regla de cada métrica vive en el modelo, con historial. Se sabe qué cambió y cuándo, y se vuelve atrás sin rehacer paneles.'),
  'Clique numa versão para ver a regra e o resultado.': ('Click a version to see the rule and the result.', 'Haga clic en una versión para ver la regla y el resultado.'),
  'Regra · v1': ('Rule · v1', 'Regla · v1'), 'Regra · v2': ('Rule · v2', 'Regla · v2'), 'Regra · v3': ('Rule · v3', 'Regla · v3'), 'Regra · v4': ('Rule · v4', 'Regla · v4'),
  # painel 4
  'Filtrar por área': ('Filter by area', 'Filtrar por área'), 'Todas': ('All', 'Todas'), 'Comercial': ('Sales', 'Comercial'), 'Financeiro': ('Finance', 'Finanzas'),
  'Operações': ('Operations', 'Operaciones'), 'Indicador selecionado': ('Selected indicator', 'Indicador seleccionado'), 'Certificado': ('Certified', 'Certificado'),
  'Área': ('Area', 'Área'),
  'Um lugar para consultar o que cada indicador significa, de onde ele vem e quem responde por ele.':
    ('One place to check what each indicator means, where it comes from and who is accountable for it.', 'Un lugar para consultar qué significa cada indicador, de dónde viene y quién responde por él.'),
  'Filtre por área e selecione um indicador.': ('Filter by area and select an indicator.', 'Filtre por área y seleccione un indicador.'),
  # painel 5
  'Tipo de visão': ('View type', 'Tipo de vista'), 'Visão executiva': ('Executive view', 'Vista ejecutiva'), 'Visão operacional': ('Operational view', 'Vista operativa'),
  'Filtre por área': ('Filter by area', 'Filtre por área'), 'Evolução': ('Trend', 'Evolución'), 'Composição': ('Composition', 'Composición'),
  'Grupo A': ('Group A', 'Grupo A'), 'Grupo B': ('Group B', 'Grupo B'), 'Grupo C': ('Group C', 'Grupo C'),
  'O mesmo modelo alimenta a leitura de quem decide e o acompanhamento de quem opera, cada um com a visão que precisa.':
    ('The same model feeds the reading of those who decide and the follow-up of those who operate, each with the view they need.',
     'El mismo modelo alimenta la lectura de quien decide y el seguimiento de quien opera, cada uno con la vista que necesita.'),
  'Alterne a visão e filtre por área.': ('Switch the view and filter by area.', 'Alterne la vista y filtre por área.'),
  # painel 6
  'Monte sua pergunta': ('Build your question', 'Arme su pregunta'), 'Medida': ('Measure', 'Medida'), 'Medida 1': ('Measure 1', 'Medida 1'), 'Medida 2': ('Measure 2', 'Medida 2'),
  'Medida 3': ('Measure 3', 'Medida 3'), 'Cortar por': ('Slice by', 'Cortar por'), 'Categoria': ('Category', 'Categoría'), 'Período': ('Period', 'Período'),
  'Gráfico': ('Chart', 'Gráfico'), 'Barras': ('Bars', 'Barras'), 'Linha': ('Line', 'Línea'), 'Sua pergunta': ('Your question', 'Su pregunta'),
  'A área monta a própria pergunta sobre o modelo governado, sem abrir chamado para o time de dados.':
    ('The area builds its own question on the governed model, without opening a ticket for the data team.', 'El área arma su propia pregunta sobre el modelo gobernado, sin abrir un ticket al equipo de datos.'),
  'As áreas montam a própria pergunta sobre o modelo governado, sem abrir chamado para o time de dados.':
    ('Areas build their own questions on the governed model, without opening a ticket for the data team.', 'Las áreas arman su propia pregunta sobre el modelo gobernado, sin abrir un ticket al equipo de datos.'),
  'Escolha a medida, o corte e o tipo de gráfico.': ('Choose the measure, the slice and the chart type.', 'Elija la medida, el corte y el tipo de gráfico.'),
  'Medida 1 por categoria': ('Measure 1 by category', 'Medida 1 por categoría'), 'Medida 2 por categoria': ('Measure 2 by category', 'Medida 2 por categoría'),
  'Medida 3 por categoria': ('Measure 3 by category', 'Medida 3 por categoría'), 'Medida 1 por período': ('Measure 1 by period', 'Medida 1 por período'),
  'Medida 2 por período': ('Measure 2 by period', 'Medida 2 por período'), 'Medida 3 por período': ('Measure 3 by period', 'Medida 3 por período'),
  # painel 7
  'Grade': ('Grid', 'Cuadrícula'), 'Margens': ('Margins', 'Márgenes'), 'Paleta': ('Palette', 'Paleta'),
  'Grade, paleta e tipografia definidas antes do primeiro painel: todo dashboard nasce com a cara do mesmo produto.':
    ('Grid, palette and typography defined before the first dashboard: every dashboard is born looking like the same product.', 'Cuadrícula, paleta y tipografía definidas antes del primer panel: todo dashboard nace con la cara del mismo producto.'),
  'Grade, paleta e tipografia definidas antes do primeiro painel, para todo dashboard nascer com a cara do mesmo produto.':
    ('Grid, palette and typography defined before the first dashboard, so every dashboard is born looking like the same product.', 'Cuadrícula, paleta y tipografía definidas antes del primer panel, para que todo dashboard nazca con la cara del mismo producto.'),
  'Ligue as guias e troque a paleta.': ('Turn the guides on and switch the palette.', 'Active las guías y cambie la paleta.'),
  # painel 8
  '↻ Carregar de novo': ('↻ Reload', '↻ Cargar de nuevo'), 'Sem otimização': ('Not optimized', 'Sin optimización'),
  'Medidas DAX e modelo otimizados': ('Optimized DAX measures and model', 'Medidas DAX y modelo optimizados'),
  'Medida bem escrita e modelo enxuto: o painel responde na hora em que a pessoa filtra.':
    ('Well-written measures and a lean model: the dashboard answers the moment someone filters.', 'Medida bien escrita y modelo ágil: el panel responde en el momento en que la persona filtra.'),
  'Medidas DAX bem escritas e modelo enxuto: o painel responde na hora em que a pessoa filtra, mesmo com o volume crescendo.':
    ('Well-written DAX measures and a lean model: the dashboard answers the moment someone filters, even as volume grows.', 'Medidas DAX bien escritas y modelo ágil: el panel responde en el momento en que la persona filtra, incluso con el volumen creciendo.'),
  'Compare o carregamento e rode de novo.': ('Compare the loading and run it again.', 'Compare la carga y ejecútela de nuevo.'),
  # painel 9
  'Antes e depois do padrão': ('Before and after the standard', 'Antes y después del estándar'),
  'Cada painel com um nome, um layout e uma cor: ninguém sabe onde achar o quê.':
    ('Each dashboard with its own name, layout and color: nobody knows where to find what.', 'Cada panel con su nombre, su layout y su color: nadie sabe dónde encontrar qué.'),
  'Nomenclatura e layout padronizados: quem abre qualquer painel sabe onde está cada coisa.':
    ('Standardized naming and layout: whoever opens any dashboard knows where everything is.', 'Nomenclatura y layout estandarizados: quien abre cualquier panel sabe dónde está cada cosa.'),
  'Nomes e posições padronizados: quem abre qualquer painel sabe onde está cada coisa, e painel novo nasce dentro do padrão.':
    ('Standardized names and positions: whoever opens any dashboard knows where everything is, and new dashboards are born inside the standard.',
     'Nombres y posiciones estandarizados: quien abre cualquier panel sabe dónde está cada cosa, y el panel nuevo nace dentro del estándar.'),
  'Alterne entre antes e depois.': ('Switch between before and after.', 'Alterne entre antes y después.'),
  'Área · Tema · Visão': ('Area · Topic · View', 'Área · Tema · Vista'),
  # painel 10
  'Executivo': ('Executive', 'Ejecutivo'), 'Analista': ('Analyst', 'Analista'),
  'Visto por': ('Seen by', 'Visto por'), 'Visto por: Executivo': ('Seen by: Executive', 'Visto por: Ejecutivo'), 'Visto por: Analista': ('Seen by: Analyst', 'Visto por: Analista'), 'Visto por: Área': ('Seen by: Area', 'Visto por: Área'),
  'Cada perfil enxerga só o que precisa. Clique na matriz para dar ou retirar acesso.':
    ('Each profile sees only what it needs. Click the matrix to grant or remove access.', 'Cada perfil ve solo lo que necesita. Haga clic en la matriz para dar o quitar acceso.'),
  'Cada perfil enxerga só o que precisa, definido por regra e não por exceção.':
    ('Each profile sees only what it needs, defined by rule and not by exception.', 'Cada perfil ve solo lo que necesita, definido por regla y no por excepción.'),
  'Clique na matriz para dar ou retirar acesso.': ('Click the matrix to grant or remove access.', 'Haga clic en la matriz para dar o quitar acceso.'),
  # painel 11
  'Migração': ('Migration', 'Migración'), 'Painéis dispersos': ('Scattered dashboards', 'Paneles dispersos'), 'Consolidado': ('Consolidated', 'Consolidado'), 'Conjunto': ('Set', 'Conjunto'),
  'Mais de 200 painéis crescendo sem padrão, sem governança e sem fonte única da verdade.':
    ('Over 200 dashboards growing with no standard, no governance and no single source of truth.', 'Más de 200 paneles creciendo sin estándar, sin gobernanza y sin fuente única de la verdad.'),
  'Painéis migrados e consolidados num conjunto padronizado, todos sobre o mesmo modelo.':
    ('Dashboards migrated and consolidated into a standardized set, all on the same model.', 'Paneles migrados y consolidados en un conjunto estandarizado, todos sobre el mismo modelo.'),
  'Painéis dispersos são migrados e consolidados num conjunto padronizado, sobre o mesmo modelo.':
    ('Scattered dashboards are migrated and consolidated into a standardized set, on the same model.', 'Los paneles dispersos se migran y consolidan en un conjunto estandarizado, sobre el mismo modelo.'),
  'Alterne para ver a consolidação.': ('Switch to see the consolidation.', 'Alterne para ver la consolidación.'),
  # painel 12
  'Tabela': ('Table', 'Tabla'), 'Tabela fato': ('Fact table', 'Tabla de hechos'), 'Dimensão 1': ('Dimension 1', 'Dimensión 1'), 'Dimensão 2': ('Dimension 2', 'Dimensión 2'), 'Dimensão 3': ('Dimension 3', 'Dimensión 3'),
  'chave': ('key', 'clave'), 'medida': ('measure', 'medida'), 'atributo': ('attribute', 'atributo'),
  'Tabelas, campos e regras descritos para que o time novo entenda o modelo sem depender de quem o criou.':
    ('Tables, fields and rules described so a new team understands the model without depending on whoever built it.', 'Tablas, campos y reglas descritos para que el equipo nuevo entienda el modelo sin depender de quien lo creó.'),
  'Navegue pelas tabelas do modelo.': ('Browse the model tables.', 'Navegue por las tablas del modelo.'),
})
EXTRAS_VITRINE = {
  'Cada área lê a mesma definição: a reunião discute a decisão, não o número.', 'A regra mora no modelo, não em cada painel.',
  'O catálogo diz o que cada indicador significa e de onde ele vem.', 'Dado de várias fontes chega ao indicador pelo mesmo caminho.',
  'O dado entra uma vez no modelo e ganha a regra de negócio antes de chegar a qualquer painel.',
  'Uma conta, escrita uma vez no modelo: todos os painéis leem o mesmo número.',
  'Cada painel faz a conta do seu jeito: números diferentes para a mesma métrica, e a reunião discute o dado.',
  'Regra · v1', 'Regra · v2', 'Regra · v3', 'Regra · v4', 'Medida 1 por categoria', 'Medida 2 por categoria', 'Medida 3 por categoria',
  'Medida 1 por período', 'Medida 2 por período', 'Medida 3 por período', 'Área · Tema · Visão', 'Executivo', 'Analista',
  'Visto por: Executivo', 'Visto por: Analista', 'Visto por: Área', 'Conjunto', 'Tabela fato', 'Dimensão 1', 'Dimensão 2', 'Dimensão 3',
  'chave', 'medida', 'atributo', 'Cada painel com um nome, um layout e uma cor: ninguém sabe onde achar o quê.',
  'Nomenclatura e layout padronizados: quem abre qualquer painel sabe onde está cada coisa.',
  'Painéis migrados e consolidados num conjunto padronizado, todos sobre o mesmo modelo.', 'Mais de 200 painéis crescendo sem padrão, sem governança e sem fonte única da verdade.',
  'Comercial', 'Financeiro', 'Operações', 'Área', 'Certificado', 'Todas',
}

# ---------------- Vitrine de Engenharia de Dados (data-engineering.html) ----------------
# Textos marcados como dinâmicos são escritos pelo script da vitrine; entram
# também em EXTRAS_VITRINE (não saem da extração estática).
TRAD.update({
  'Doze entregas, três frentes. Escolha uma e veja como ela funciona na prática: clique, alterne e compare.':
    ('Twelve deliverables, three fronts. Pick one and see how it works in practice: click, switch and compare.',
     'Doce entregas, tres frentes. Elija una y vea cómo funciona en la práctica: haga clic, alterne y compare.'),
  'Entregas de Engenharia de Dados': ('Data Engineering deliverables', 'Entregas de Ingeniería de Datos'),
  # explicações
  'Cada fonte entra por um conector com agenda e monitoramento, em vez de um script avulso que quebra sem ninguém ver.':
    ('Each source comes in through a connector with scheduling and monitoring, instead of a standalone script that breaks unnoticed.',
     'Cada fuente entra por un conector con agenda y monitoreo, en lugar de un script suelto que se rompe sin que nadie lo vea.'),
  'Alterne entre scripts avulsos e conectores gerenciados.': ('Switch between standalone scripts and managed connectors.', 'Alterne entre scripts sueltos y conectores gestionados.'),
  'Quando a decisão não pode esperar o lote da noite, o evento chega ao destino no momento em que acontece.':
    ('When the decision cannot wait for the nightly batch, the event reaches its destination the moment it happens.',
     'Cuando la decisión no puede esperar el lote de la noche, el evento llega al destino en el momento en que ocurre.'),
  'Alterne entre lote e streaming.': ('Switch between batch and streaming.', 'Alterne entre lote y streaming.'),
  'Em vez de cada sistema falar com todos os outros, uma camada de integração concentra a conversa entre o legado e a plataforma atual.':
    ('Instead of every system talking to all the others, an integration layer centralizes the conversation between the legacy and the current platform.',
     'En lugar de que cada sistema hable con todos los demás, una capa de integración concentra la conversación entre el legado y la plataforma actual.'),
  'Alterne entre ponto a ponto e camada de integração.': ('Switch between point-to-point and an integration layer.', 'Alterne entre punto a punto y capa de integración.'),
  'Dado que chega por API ou por arquivo vira tabela, sem retrabalho manual a cada envio.':
    ('Data arriving by API or file becomes a table, without manual rework on every delivery.', 'El dato que llega por API o por archivo se convierte en tabla, sin retrabajo manual en cada envío.'),
  'Escolha a origem e ingira de novo.': ('Pick the source and ingest again.', 'Elija el origen e ingiera de nuevo.'),
  'Guarda o dado como ele chega, em qualquer formato, para quando alguém precisar dele.':
    ('Stores data as it arrives, in any format, for when someone needs it.', 'Guarda el dato como llega, en cualquier formato, para cuando alguien lo necesite.'),
  'Filtre por tipo de dado.': ('Filter by data type.', 'Filtre por tipo de dato.'),
  'Dado estruturado e organizado para responder consultas analíticas com rapidez.':
    ('Structured, organized data to answer analytical queries quickly.', 'Dato estructurado y organizado para responder consultas analíticas con rapidez.'),
  'Escolha uma consulta e veja as colunas que ela usa.': ('Pick a query and see the columns it uses.', 'Elija una consulta y vea las columnas que usa.'),
  'Junta a flexibilidade do lake com a organização do warehouse: uma só cópia do dado, lida por BI e por ciência de dados.':
    ('Combines the flexibility of a lake with the organization of a warehouse: a single copy of the data, read by BI and by data science.',
     'Une la flexibilidad del lake con la organización del warehouse: una sola copia del dato, leída por BI y por ciencia de datos.'),
  'Alterne entre lake + warehouse e lakehouse.': ('Switch between lake + warehouse and lakehouse.', 'Alterne entre lake + warehouse y lakehouse.'),
  'Do desenho da origem, pensado para o sistema que grava, ao modelo analítico, pensado para quem pergunta.':
    ('From the source design, built for the system that writes, to the analytical model, built for those who ask.',
     'Del diseño del origen, pensado para el sistema que graba, al modelo analítico, pensado para quien pregunta.'),
  'Alterne entre a origem e o modelo analítico.': ('Switch between the source and the analytical model.', 'Alterne entre el origen y el modelo analítico.'),
  'A diferença está na ordem: transformar antes de gravar (ETL) ou gravar primeiro e transformar no próprio destino (ELT).':
    ('The difference is the order: transform before writing (ETL) or write first and transform at the destination (ELT).',
     'La diferencia está en el orden: transformar antes de grabar (ETL) o grabar primero y transformar en el propio destino (ELT).'),
  'Alterne entre ETL e ELT.': ('Switch between ETL and ELT.', 'Alterne entre ETL y ELT.'),
  'A regra de negócio sai de scripts avulsos e vira código versionado, com teste em cada etapa.':
    ('Business rules move out of standalone scripts and become versioned code, with a test at every step.',
     'La regla de negocio sale de scripts sueltos y se vuelve código versionado, con prueba en cada etapa.'),
  'Clique num modelo e quebre um teste.': ('Click a model and break a test.', 'Haga clic en un modelo y rompa una prueba.'),
  'Cada etapa roda na ordem certa, na hora certa, e a falha de uma não passa despercebida pelas seguintes.':
    ('Each step runs in the right order at the right time, and one failure does not go unnoticed by the next steps.',
     'Cada etapa corre en el orden correcto, a la hora correcta, y la falla de una no pasa inadvertida para las siguientes.'),
  'Execute o fluxo, com e sem falha.': ('Run the flow, with and without a failure.', 'Ejecute el flujo, con y sin falla.'),
  'O dado é verificado antes de chegar ao usuário: a falha fica visível primeiro para o time de dados.':
    ('Data is checked before it reaches the user: the failure is visible to the data team first.', 'El dato se verifica antes de llegar al usuario: la falla es visible primero para el equipo de datos.'),
  'Injete um dado ruim e veja o teste falhar.': ('Inject bad data and watch the test fail.', 'Inyecte un dato malo y vea fallar la prueba.'),
  # rótulos
  'Como a fonte chega ao destino': ('How the source reaches the destination', 'Cómo llega la fuente al destino'),
  'Scripts avulsos': ('Standalone scripts', 'Scripts sueltos'), 'Conector gerenciado': ('Managed connector', 'Conector gestionado'),
  'agenda e monitora': ('schedules and monitors', 'agenda y monitorea'), 'Destino': ('Destination', 'Destino'),
  'Como o evento chega': ('How the event arrives', 'Cómo llega el evento'), 'Lote': ('Batch', 'Lote'), 'Streaming': ('Streaming', 'Streaming'),
  'Eventos': ('Events', 'Eventos'), 'Quando o dado chega': ('When the data arrives', 'Cuando llega el dato'),
  'Como os sistemas conversam': ('How the systems talk', 'Cómo conversan los sistemas'), 'Ponto a ponto': ('Point-to-point', 'Punto a punto'),
  'Camada de integração': ('Integration layer', 'Capa de integración'), 'Legado': ('Legacy', 'Legado'), 'legado': ('legacy', 'legado'),
  'Integração': ('Integration', 'Integración'), 'Plataforma atual': ('Current platform', 'Plataforma actual'),
  'Tipo de origem': ('Source type', 'Tipo de origen'), 'Arquivos': ('Files', 'Archivos'), '↻ Ingerir de novo': ('↻ Ingest again', '↻ Ingerir de nuevo'),
  'Resposta da API': ('API response', 'Respuesta de la API'), 'Arquivos recebidos': ('Files received', 'Archivos recibidos'),
  'Tabela de destino': ('Destination table', 'Tabla de destino'), 'Mostrar': ('Show', 'Mostrar'), 'Tudo': ('All', 'Todo'), 'Tabelas': ('Tables', 'Tablas'),
  'Semiestruturado': ('Semi-structured', 'Semiestructurado'), 'Arquivos livres': ('Free-form files', 'Archivos libres'),
  'Consulta': ('Query', 'Consulta'), 'Consulta 1': ('Query 1', 'Consulta 1'), 'Consulta 2': ('Query 2', 'Consulta 2'), 'Consulta 3': ('Query 3', 'Consulta 3'),
  'Lake + Warehouse': ('Lake + Warehouse', 'Lake + Warehouse'), 'Data Lake': ('Data Lake', 'Data Lake'), 'Data Warehouse': ('Data Warehouse', 'Data Warehouse'),
  'Lakehouse': ('Lakehouse', 'Lakehouse'), 'Consumo': ('Consumption', 'Consumo'), 'Ciência de dados': ('Data science', 'Ciencia de datos'),
  'Origem normalizada': ('Normalized source', 'Origen normalizado'), 'Modelo analítico': ('Analytical model', 'Modelo analítico'), 'Modelo': ('Model', 'Modelo'),
  'Ordem das etapas': ('Order of steps', 'Orden de las etapas'), 'Extrair': ('Extract', 'Extraer'), 'Transformar': ('Transform', 'Transformar'), 'Carregar': ('Load', 'Cargar'),
  'Quebrar um teste': ('Break a test', 'Romper una prueba'), 'Clique num modelo para ver a linhagem': ('Click a model to see its lineage', 'Haga clic en un modelo para ver su linaje'),
  'Brutos': ('Raw', 'Crudos'), 'Preparados': ('Prepared', 'Preparados'), 'Entregues': ('Delivered', 'Entregados'), 'Versões': ('Versions', 'Versiones'),
  '▶ Executar': ('▶ Run', '▶ Ejecutar'), 'Simular falha': ('Simulate failure', 'Simular falla'), 'agenda diária': ('daily schedule', 'agenda diaria'),
  'Injetar dado ruim': ('Inject bad data', 'Inyectar dato malo'), 'Corrigir': ('Fix', 'Corregir'), 'Sincronizar fonte': ('Sync source', 'Sincronizar fuente'), 'Ver linhagem do modelo': ('See model lineage', 'Ver linaje del modelo'), 'Orquestração': ('Orchestration', 'Orquestación'),
  # dinâmicos
  'Cada fonte tem agenda, monitoramento e alerta: se algo falha, alguém vê antes do usuário.':
    ('Each source has scheduling, monitoring and alerts: if something fails, someone sees it before the user does.', 'Cada fuente tiene agenda, monitoreo y alerta: si algo falla, alguien lo ve antes que el usuario.'),
  'Cada fonte com o seu script: funciona até quebrar, e ninguém sabe de onde veio o número.':
    ('Each source with its own script: it works until it breaks, and nobody knows where the number came from.', 'Cada fuente con su script: funciona hasta que se rompe, y nadie sabe de dónde vino el número.'),
  'No lote, o dado espera a próxima janela: quem decide enxerga o que aconteceu horas atrás.':
    ('In batch, data waits for the next window: whoever decides sees what happened hours ago.', 'En el lote, el dato espera la próxima ventana: quien decide ve lo que pasó horas atrás.'),
  'No streaming, cada evento chega ao destino assim que acontece.': ('In streaming, each event reaches its destination as soon as it happens.', 'En el streaming, cada evento llega al destino apenas ocurre.'),
  'Uma camada de integração concentra a conversa: cada sistema fala só com ela, e o legado deixa de ser o gargalo.':
    ('An integration layer centralizes the conversation: each system talks only to it, and the legacy stops being the bottleneck.', 'Una capa de integración concentra la conversación: cada sistema habla solo con ella, y el legado deja de ser el cuello de botella.'),
  'Cada sistema fala com todos os outros: qualquer mudança em um quebra os demais.':
    ('Every system talks to all the others: a change in one breaks the rest.', 'Cada sistema habla con todos los demás: cualquier cambio en uno rompe los otros.'),
  'A resposta da API vira linhas de uma tabela, com a estrutura mantida a cada chamada.':
    ('The API response becomes table rows, with the structure preserved on every call.', 'La respuesta de la API se vuelve filas de una tabla, con la estructura preservada en cada llamada.'),
  'Cada arquivo recebido é lido, validado e gravado na mesma tabela, sem abrir planilha na mão.':
    ('Each file received is read, validated and written to the same table, without opening a spreadsheet by hand.', 'Cada archivo recibido se lee, valida y graba en la misma tabla, sin abrir una planilla a mano.'),
  'O dado entra do jeito que chega, em qualquer formato, e fica disponível para quem precisar.':
    ('Data comes in as it arrives, in any format, and stays available for whoever needs it.', 'El dato entra como llega, en cualquier formato, y queda disponible para quien lo necesite.'),
  'A consulta lê só as colunas de que precisa, e o warehouse responde rápido porque o dado já está organizado.':
    ('The query reads only the columns it needs, and the warehouse answers fast because the data is already organized.', 'La consulta lee solo las columnas que necesita, y el warehouse responde rápido porque el dato ya está organizado.'),
  'Uma só cópia do dado, lida tanto pelo BI quanto pela ciência de dados: sem duplicar, sem divergir.':
    ('A single copy of the data, read by both BI and data science: no duplication, no divergence.', 'Una sola copia del dato, leída tanto por el BI como por la ciencia de datos: sin duplicar, sin divergir.'),
  'O dado vive em dois lugares: duplicado, mais caro de manter e sujeito a divergir entre as cópias.':
    ('Data lives in two places: duplicated, costlier to maintain and liable to diverge between copies.', 'El dato vive en dos lugares: duplicado, más caro de mantener y sujeto a divergir entre las copias.'),
  'A origem é desenhada para o sistema que grava: muitas tabelas pequenas, ligadas em todas as direções.':
    ('The source is designed for the system that writes: many small tables, linked in every direction.', 'El origen se diseña para el sistema que graba: muchas tablas pequeñas, ligadas en todas las direcciones.'),
  'O modelo analítico é desenhado para quem pergunta: uma tabela de fatos no centro e as dimensões em volta.':
    ('The analytical model is designed for those who ask: a fact table in the center and dimensions around it.', 'El modelo analítico se diseña para quien pregunta: una tabla de hechos al centro y las dimensiones alrededor.'),
  'Transforma no meio do caminho e grava o resultado já pronto.': ('Transforms along the way and writes the finished result.', 'Transforma en el camino y graba el resultado ya listo.'),
  'Grava primeiro e transforma no próprio destino, aproveitando a força do warehouse ou do lakehouse.':
    ('Writes first and transforms at the destination, taking advantage of the warehouse or lakehouse.', 'Graba primero y transforma en el propio destino, aprovechando la potencia del warehouse o del lakehouse.'),
  'Um teste falhou em um modelo preparado: o que depende dele fica bloqueado e o restante segue.':
    ('A test failed on a prepared model: whatever depends on it is blocked and the rest carries on.', 'Una prueba falló en un modelo preparado: lo que depende de él queda bloqueado y el resto sigue.'),
  'Cada modelo é código versionado e passa por teste antes de seguir adiante.':
    ('Each model is versioned code and passes a test before moving on.', 'Cada modelo es código versionado y pasa por una prueba antes de seguir.'),
  'Execute o fluxo para ver cada tarefa rodar na ordem.': ('Run the flow to see each task run in order.', 'Ejecute el flujo para ver cada tarea correr en orden.'),
  'Cada tarefa roda quando a anterior termina, e tudo fica registrado.': ('Each task runs when the previous one finishes, and everything is logged.', 'Cada tarea corre cuando termina la anterior, y todo queda registrado.'),
  'A tarefa falhou, as seguintes esperaram e a nova tentativa passou, com o alerta registrado.':
    ('The task failed, the next ones waited and the retry passed, with the alert logged.', 'La tarea falló, las siguientes esperaron y el nuevo intento pasó, con la alerta registrada.'),
  'Sem valores nulos': ('No null values', 'Sin valores nulos'), 'Valores únicos': ('Unique values', 'Valores únicos'),
  'Valores válidos': ('Valid values', 'Valores válidos'), 'Dado atualizado': ('Up-to-date data', 'Dato actualizado'),
  'Falha detectada antes de chegar ao usuário: o time de dados vê primeiro.': ('Failure detected before reaching the user: the data team sees it first.', 'Falla detectada antes de llegar al usuario: el equipo de datos la ve primero.'),
  'Todos os testes passaram: o dado segue para o usuário.': ('All tests passed: the data goes on to the user.', 'Todas las pruebas pasaron: el dato sigue hacia el usuario.'),
})
EXTRAS_VITRINE |= {
  'Cada fonte tem agenda, monitoramento e alerta: se algo falha, alguém vê antes do usuário.', 'Cada fonte com o seu script: funciona até quebrar, e ninguém sabe de onde veio o número.',
  'No lote, o dado espera a próxima janela: quem decide enxerga o que aconteceu horas atrás.', 'No streaming, cada evento chega ao destino assim que acontece.',
  'Uma camada de integração concentra a conversa: cada sistema fala só com ela, e o legado deixa de ser o gargalo.', 'Cada sistema fala com todos os outros: qualquer mudança em um quebra os demais.',
  'Arquivos recebidos', 'A resposta da API vira linhas de uma tabela, com a estrutura mantida a cada chamada.', 'Cada arquivo recebido é lido, validado e gravado na mesma tabela, sem abrir planilha na mão.',
  'A consulta lê só as colunas de que precisa, e o warehouse responde rápido porque o dado já está organizado.', 'Uma só cópia do dado, lida tanto pelo BI quanto pela ciência de dados: sem duplicar, sem divergir.',
  'O dado vive em dois lugares: duplicado, mais caro de manter e sujeito a divergir entre as cópias.', 'A origem é desenhada para o sistema que grava: muitas tabelas pequenas, ligadas em todas as direções.',
  'O modelo analítico é desenhado para quem pergunta: uma tabela de fatos no centro e as dimensões em volta.', 'Transforma no meio do caminho e grava o resultado já pronto.',
  'Grava primeiro e transforma no próprio destino, aproveitando a força do warehouse ou do lakehouse.', 'Um teste falhou em um modelo preparado: o que depende dele fica bloqueado e o restante segue.',
  'Cada modelo é código versionado e passa por teste antes de seguir adiante.', 'Execute o fluxo para ver cada tarefa rodar na ordem.', 'Cada tarefa roda quando a anterior termina, e tudo fica registrado.',
  'A tarefa falhou, as seguintes esperaram e a nova tentativa passou, com o alerta registrado.', 'Sem valores nulos', 'Valores únicos', 'Valores válidos', 'Dado atualizado',
  'Falha detectada antes de chegar ao usuário: o time de dados vê primeiro.', 'Todos os testes passaram: o dado segue para o usuário.',
  'Extrair', 'Transformar', 'Carregar', 'Data Lake', 'Lakehouse',
}

TERMOS = {
  # setores
  'Bancário': ('Banking', 'Banca'),
  'Educação': ('Education', 'Educación'),
  'Food Service': ('Food Service', 'Food Service'),
  'Infraestrutura &amp; Mobilidade': ('Infrastructure &amp; Mobility', 'Infraestructura &amp; Movilidad'),
  'Saúde &amp; Diagnóstico': ('Healthcare &amp; Diagnostics', 'Salud &amp; Diagnóstico'),
  'Saúde Hospitalar': ('Hospital Healthcare', 'Salud Hospitalaria'),
  'Serviços Financeiros': ('Financial Services', 'Servicios Financieros'),
  'Software &amp; Tecnologia': ('Software &amp; Technology', 'Software &amp; Tecnología'),
  'Turismo &amp; Viagens': ('Travel &amp; Tourism', 'Turismo &amp; Viajes'),
  'Varejo Multimarca': ('Multi-brand Retail', 'Retail Multimarca'),
  'Varejo de Moda': ('Fashion Retail', 'Retail de Moda'),
  'Varejo &amp; Moda': ('Fashion Retail', 'Retail &amp; Moda'),
  'Varejo Omnichannel': ('Omnichannel Retail', 'Retail Omnicanal'),
  'BI Governance': ('BI Governance', 'BI Governance'),

  # áreas e disciplinas
  'Governança de Dados': ('Data Governance', 'Gobernanza de Datos'),
  'Governança de dados': ('Data governance', 'Gobernanza de datos'),
  'Indicadores operacionais': ('Operational indicators', 'Indicadores operativos'),
  'Indicadores comerciais': ('Sales indicators', 'Indicadores comerciales'),
  'Indicadores de experiência': ('Experience indicators', 'Indicadores de experiencia'),
  'Indicadores de SLA': ('SLA indicators', 'Indicadores de SLA'),
  'Modelos preditivos': ('Predictive models', 'Modelos predictivos'),
  'Modernização de legado': ('Legacy modernization', 'Modernización de legado'),
  'Design de dados': ('Data design', 'Diseño de datos'),
  'Migração': ('Migration', 'Migración'),
  'Automação': ('Automation', 'Automatización'),
  'Cloud Data Platform': ('Cloud Data Platform', 'Cloud Data Platform'),
  'Sequência de entregas': ('Delivery sequencing', 'Secuencia de entregas'),
  'Orquestração': ('Orchestration', 'Orquestación'),
  'Data Lake': ('Data Lake', 'Data Lake'),
  'Machine Learning': ('Machine Learning', 'Machine Learning'),
  'Banco de talentos': ('Talent bank', 'Banco de talentos'),
  'Customer Experience': ('Customer Experience', 'Customer Experience'),
  'Self-service BI': ('Self-service BI', 'BI de autoservicio'),
  'Dashboards': ('Dashboards', 'Dashboards'),
  'Operações': ('Operations', 'Operaciones'),
  'Cloud Azure': ('Azure Cloud', 'Cloud Azure'),
  'Cloud GCP': ('GCP Cloud', 'Cloud GCP'),

  # antes e depois
  'Vários': ('Several', 'Varios'),
  'Uma': ('One', 'Una'),
  'Chamados': ('Tickets', 'Tickets'),
  '3 linhas': ('3 lines', '3 líneas'),
  '1 visão': ('1 view', '1 visión'),
  'Extração pontual': ('One-off extraction', 'Extracción puntual'),
  'Camada própria': ('A layer of its own', 'Capa propia'),
  'Relatório avulso': ('Standalone report', 'Informe suelto'),
  'Indicador vivo': ('Live indicator', 'Indicador vivo'),
  'Por área': ('Per team', 'Por área'),
  'Toda a empresa': ('The whole company', 'Toda la empresa'),
  '2 ferramentas': ('2 tools', '2 herramientas'),
  '1 ferramenta': ('1 tool', '1 herramienta'),
  'Constatada': ('Observed', 'Constatada'),
  'Antecipada': ('Anticipated', 'Anticipada'),
  'Padrão depois': ('Standard after', 'Estándar después'),
  'Padrão antes': ('Standard first', 'Estándar antes'),
  'Mês': ('Month', 'Mes'),
  'Dia': ('Day', 'Día'),
  '3 operações': ('3 operations', '3 operaciones'),
  '1 leitura': ('1 read', '1 lectura'),
  '200+': ('200+', '200+'),
  'Oracle': ('Oracle', 'Oracle'),
  'GCP': ('GCP', 'GCP'),

  # rótulos dos resultados
  'Canais comparáveis': ('Comparable channels', 'Canales comparables'),
  'Fim da consolidação manual': ('No more manual consolidation', 'Fin de la consolidación manual'),
  'Base reaproveitável': ('Reusable foundation', 'Base reutilizable'),
  'Legado fora da conta': ('Legacy off the bill', 'Legado fuera de la cuenta'),
  'Regra em código': ('Rules as code', 'Regla en código'),
  'Uma camada só': ('A single layer', 'Una sola capa'),
  'Uma definição por métrica': ('One definition per metric', 'Una definición por métrica'),
  'Pergunta sem fila': ('Questions without a queue', 'Preguntas sin fila'),
  'Crescimento com padrão': ('Growth with a standard', 'Crecimiento con estándar'),

  # categorias do filtro de cases
  'Analytics &amp; BI': ('Analytics &amp; BI', 'Analytics &amp; BI'),
  'BI &amp; Analytics': ('BI &amp; Analytics', 'BI &amp; Analytics'),
  'Engenharia de Dados': ('Data Engineering', 'Ingeniería de Datos'),
  'Cloud': ('Cloud', 'Cloud'),
  'Governança': ('Governance', 'Gobernanza'),
  'IA &amp; Preditivo': ('AI &amp; Predictive', 'IA &amp; Predictivo'),
  'Desenvolvimento': ('Development', 'Desarrollo'),
  'Todos': ('All', 'Todos'),

  # navegação do carrossel
  'Case anterior': ('Previous case', 'Caso anterior'),
  'Próximo case': ('Next case', 'Próximo caso'),
  'Projetos entregues': ('Delivered projects', 'Proyectos entregados'),
}

def compor(extraidas):
    """Monta a tradução das chaves compostas a partir de TERMOS.

    Uma linha de etiquetas é só uma sequência de termos curtos dentro de
    tags. Traduzindo termo a termo e recolando, as dezenas de combinações
    que aparecem pelos treze cases saem de graça — e a próxima também.

    Só entra no dicionário a chave em que ao menos um pedaço realmente
    mudou: se todos os pedaços são nome de produto, a tradução seria
    idêntica ao português e ocuparia espaço à toa.
    """
    import re
    feitas = {}
    pedaco = re.compile(r'(>)([^<>]+)(<)')

    for chave in extraidas:
        if chave in TRAD:
            continue
        # "Ver o case 7 de 13" — o rótulo que o script do carrossel monta
        m = re.fullmatch(r'Ver o case (\d+) de (\d+)', chave)
        if m:
            feitas[chave] = ('View case %s of %s' % m.groups(), 'Ver el caso %s de %s' % m.groups())
            continue
        # "Antes → Depois", com os dois lados no glossário
        m = re.fullmatch(r'(.+?)\s*→\s*(.+)', chave)
        if m and m.group(1).strip() in TERMOS and m.group(2).strip() in TERMOS:
            a_, b_ = TERMOS[m.group(1).strip()], TERMOS[m.group(2).strip()]
            feitas[chave] = ('%s → %s' % (a_[0], b_[0]), '%s → %s' % (a_[1], b_[1]))
            continue
        if '<' not in chave:
            # termo solto que o glossário conhece
            if chave in TERMOS:
                feitas[chave] = TERMOS[chave]
            continue
        # só composições de etiquetas: nada de frase com marcação no meio
        if not re.fullmatch(r'(?:<(?:span|small|b|i)(?: [^>]*)?>[^<>]*</(?:span|small|b|i)>\s*)+', chave):
            continue
        saidas = {}
        for lang, idx in (('en', 0), ('es', 1)):
            mudou = [False]

            def troca(m):
                t = m.group(2).strip()
                if t in TERMOS:
                    novo = TERMOS[t][idx]
                elif t in TRAD:
                    novo = TRAD[t][idx]
                else:
                    return m.group(0)
                if novo != t:
                    mudou[0] = True
                return m.group(1) + m.group(2).replace(t, novo) + m.group(3)

            saida = pedaco.sub(troca, chave)
            if mudou[0]:
                saidas[lang] = saida
        if saidas:
            feitas[chave] = (saidas.get('en', chave), saidas.get('es', chave))
    return feitas



def main():
    if not FONTE.exists():
        sys.exit('rode antes: node tools/extrai-textos.js index.html > tools/textos-pt.json')
    extraidas = {i['chave'] for i in json.load(FONTE.open())['itens']}

    orfas = [k for k in TRAD if k not in extraidas and k not in EXTRAS and k not in EXTRAS_VITRINE]
    # termos do glossário não são chaves por si: só alimentam as compostas
    if orfas:
        print('AVISO: %d chave(s) não batem com a extração — não vão traduzir nada:' % len(orfas))
        for k in orfas:
            print('   ', k[:110])

    compostas = compor(extraidas)
    TRAD.update(compostas)
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
    print('%d chaves traduzidas (%d compostas de %d termos) · %d dos %d blocos cobertos (%.0f%%)'
          % (len(TRAD), len(compostas), len(TERMOS), cobertas, len(traduziveis),
             100.0 * cobertas / max(1, len(traduziveis))))
    return 1 if orfas else 0


if __name__ == '__main__':
    sys.exit(main())
