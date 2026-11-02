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
          'Mudar para o tema claro', 'Mudar para o tema escuro'}

# pt: (en, es)
TRAD = {
  # ---------------- cabeçalho, mega-menu e navegação ----------------
  'Menu': ('Menu', 'Menú'),
  'Soluções': ('Solutions', 'Soluciones'),
  'Alocação': ('Staffing', 'Asignación'),
  'Sobre': ('About', 'Acerca de'),
  'Insights': ('Insights', 'Insights'),
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
  'Atlas Insight AI <small>PRODUTO ✦</small>':
    ('Atlas Insight AI <small>PRODUCT ✦</small>', 'Atlas Insight AI <small>PRODUCTO ✦</small>'),
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
  'Pergunta em linguagem de negócio, resposta com o número e a origem dele.':
    ('Ask in business language, get the number and where it came from.',
     'Pregunta en lenguaje de negocio, respuesta con el número y su origen.'),
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
  'Pergunte ao dado <span class="mega-tag">Demonstração</span>':
    ('Ask the data <span class="mega-tag">Demo</span>', 'Pregúntele al dato <span class="mega-tag">Demostración</span>'),
  'Visualização de dados': ('Data visualization', 'Visualización de datos'),
  'Perfis disponíveis': ('Available profiles', 'Perfiles disponibles'),
  'Trabalhe com a gente <span class="mega-tag">Carreiras</span>':
    ('Work with us <span class="mega-tag">Careers</span>', 'Trabaje con nosotros <span class="mega-tag">Carreras</span>'),
  'Permanência <span class="mega-tag">150.000+ horas</span>':
    ('Tenure <span class="mega-tag">150,000+ hours</span>', 'Permanencia <span class="mega-tag">150.000+ horas</span>'),
  'Valores e método': ('Values and method', 'Valores y método'),
  'Números <span class="mega-tag">500+ projetos</span>':
    ('Numbers <span class="mega-tag">500+ projects</span>', 'Números <span class="mega-tag">500+ proyectos</span>'),
  'Como funciona': ('How it works', 'Cómo funciona'),
  'Painel executivo · exemplo': ('Executive dashboard · example', 'Panel ejecutivo · ejemplo'),

  # Números do painel: só o inglês muda o separador decimal.
  'R$ 0,97 Mi': ('R$ 0.97M', 'R$ 0,97 M'),
  'R$ 1,83 Mi': ('R$ 1.83M', 'R$ 1,83 M'),
  'R$ 2,02 Mi': ('R$ 2.02M', 'R$ 2,02 M'),
  'R$ 318': ('R$ 318', 'R$ 318'),
  '15,1 mil': ('15.1k', '15,1 mil'),
  '2,4 h': ('2.4 h', '2,4 h'),
  '1,8%': ('1.8%', '1,8%'),
  '3,1%': ('3.1%', '3,1%'),
  '24,8%': ('24.8%', '24,8%'),
  '30,1%': ('30.1%', '30,1%'),
  '31,2%': ('31.2%', '31,2%'),
  '34,6%': ('34.6%', '34,6%'),
  '91,2%': ('91.2%', '91,2%'),
  '93,4%': ('93.4%', '93,4%'),
  '96,1%': ('96.1%', '96,1%'),
  'O painel que é lido e usado — padrão visual definido antes do desenvolvimento.':
    ('The dashboard that gets read and used — visual standard set before development.',
     'El panel que se lee y se usa — estándar visual definido antes del desarrollo.'),
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
  'Insight AI · produto Atlas': ('Insight AI · an Atlas product', 'Insight AI · producto Atlas'),
  'Pergunte ao dado.': ('Ask the data.', 'Pregúntele al dato.'),
  'Você pergunta em linguagem de negócio. Ele responde com o número e a origem dele.':
    ('You ask in business language. It answers with the number and where it came from.',
     'Usted pregunta en lenguaje de negocio. Él responde con el número y su origen.'),
  '<i></i> Demonstração interativa · respostas de exemplo, não conectadas a dados reais':
    ('<i></i> Interactive demo · sample answers, not connected to real data',
     '<i></i> Demostración interactiva · respuestas de ejemplo, no conectadas a datos reales'),
  'Perguntas de exemplo': ('Sample questions', 'Preguntas de ejemplo'),
  'Por que minhas vendas caíram?': ('Why did my sales drop?', '¿Por qué cayeron mis ventas?'),
  'Qual canal traz mais margem?': ('Which channel brings the most margin?', '¿Qué canal trae más margen?'),
  'Onde estou perdendo eficiência?': ('Where am I losing efficiency?', '¿Dónde estoy perdiendo eficiencia?'),
  'O que devo esperar no próximo trimestre?': ('What should I expect next quarter?', '¿Qué debo esperar el próximo trimestre?'),
}

TRAD.update({
  # ---------------- respostas da demonstração ----------------
  'A queda de <b>8,2%</b> no mês está concentrada em <b>três lojas da região Sul</b>. Nas demais regiões a receita cresceu 1,4%.':
    ('The <b>8.2%</b> drop this month is concentrated in <b>three stores in the South</b>. Revenue grew 1.4% in every other region.',
     'La caída del <b>8,2%</b> del mes se concentra en <b>tres tiendas de la región Sur</b>. En las demás regiones los ingresos crecieron 1,4%.'),
  'O recuo acompanha a ruptura de estoque na categoria de maior giro dessas unidades.':
    ('The decline tracks the stockout in those stores’ fastest-moving category.',
     'El retroceso acompaña la rotura de stock en la categoría de mayor rotación de esas unidades.'),
  '<span>Impacto</span><b>−8,2%</b>': ('<span>Impact</span><b>−8.2%</b>', '<span>Impacto</span><b>−8,2%</b>'),
  '<span>Origem</span><b>3 lojas · Sul</b>': ('<span>Source</span><b>3 stores · South</b>', '<span>Origen</span><b>3 tiendas · Sur</b>'),
  '<span>Causa provável</span><b>Ruptura de estoque</b>': ('<span>Likely cause</span><b>Stockout</b>', '<span>Causa probable</span><b>Rotura de stock</b>'),

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
  'Nossos valores orientam como escolhemos o problema, como montamos o time e onde o projeto termina. Somos parte estratégia, parte engenharia: o stack sai do problema, nunca o contrário.':
    ('Our values guide how we choose the problem, how we build the team and where the project ends. We are part strategy, part engineering: the stack follows the problem, never the other way round.',
     'Nuestros valores orientan cómo elegimos el problema, cómo armamos el equipo y dónde termina el proyecto. Somos parte estrategia, parte ingeniería: el stack sale del problema, nunca al revés.'),
  'Tecnologia com profundidade. Negócio com clareza.':
    ('Technology with depth. Business with clarity.', 'Tecnología con profundidad. Negocio con claridad.'),
  '<span>Clareza</span> <span>Resultado</span> <span>Profundidade</span> <span>Parceria</span>':
    ('<span>Clarity</span> <span>Results</span> <span>Depth</span> <span>Partnership</span>',
     '<span>Claridad</span> <span>Resultado</span> <span>Profundidad</span> <span>Alianza</span>'),
  'Como trabalhamos': ('How we work', 'Cómo trabajamos'),
  'Não entregamos tecnologia. Entregamos impacto.':
    ('We don’t deliver technology. We deliver impact.', 'No entregamos tecnología. Entregamos impacto.'),
  '<b>Visão estratégica</b>Começamos pela decisão que precisa ser tomada, não pela ferramenta que queremos vender.':
    ('<b>Strategic view</b>We start from the decision that has to be made, not from the tool we want to sell.',
     '<b>Visión estratégica</b>Empezamos por la decisión que hay que tomar, no por la herramienta que queremos vender.'),
  '<b>Profundidade técnica</b>Da engenharia à modelagem: do Oracle ao BigQuery, em stacks modernas ou legadas.':
    ('<b>Technical depth</b>From engineering to modelling: from Oracle to BigQuery, on modern or legacy stacks.',
     '<b>Profundidad técnica</b>De la ingeniería al modelado: de Oracle a BigQuery, en stacks modernos o heredados.'),
  '<b>Design antes do desenvolvimento</b>O padrão visual é definido antes do primeiro painel, para o dashboard ser lido e usado.':
    ('<b>Design before development</b>The visual standard is set before the first dashboard, so the dashboard gets read and used.',
     '<b>Diseño antes del desarrollo</b>El estándar visual se define antes del primer panel, para que el dashboard se lea y se use.'),
  '<b>Velocidade de execução</b>Soluções que chegam à produção — não provas de conceito que morrem na apresentação.':
    ('<b>Speed of execution</b>Solutions that reach production — not proofs of concept that die in the presentation.',
     '<b>Velocidad de ejecución</b>Soluciones que llegan a producción — no pruebas de concepto que mueren en la presentación.'),
  '<b>Governança e segurança</b>Padronização, fonte única da verdade e controle de acesso desde o primeiro pipeline.':
    ('<b>Governance and security</b>Standardization, a single source of truth and access control from the first pipeline on.',
     '<b>Gobernanza y seguridad</b>Estandarización, fuente única de la verdad y control de acceso desde el primer pipeline.'),
  'Resultado acima de entregável. O projeto termina quando o negócio decide melhor.':
    ('Results over deliverables. The project ends when the business decides better.',
     'Resultado por encima del entregable. El proyecto termina cuando el negocio decide mejor.'),

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
  'Nem todo projeto precisa de um projeto.': ('Not every project needs a project.', 'No todo proyecto necesita un proyecto.'),
  'Às vezes o que falta é gente de dados dentro do time. A Atlas aloca especialistas que entram na sua operação e respondem à sua gestão — em contratos de no mínimo 6 meses, muitos por tempo indeterminado.':
    ('Sometimes what is missing is data people inside the team. Atlas places specialists who join your operation and report to your management — on contracts of at least 6 months, many of them open-ended.',
     'A veces lo que falta es gente de datos dentro del equipo. Atlas asigna especialistas que entran en su operación y responden a su gestión — en contratos de 6 meses como mínimo, muchos por tiempo indefinido.'),

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
  'Nem todo projeto precisa de um projeto. Às vezes o que falta é gente de dados dentro do time — especialistas que entram na sua operação e respondem à sua gestão.':
    ('Not every project needs a project. Sometimes what is missing is data people inside the team — specialists who join your operation and report to your management.',
     'No todo proyecto necesita un proyecto. A veces lo que falta es gente de datos dentro del equipo — especialistas que entran en su operación y responden a su gestión.'),
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
  'Projetos reais entregues por especialistas da Atlas, com o antes e o depois de cada um. Nomes de clientes preservados por confidencialidade.':
    ('Real projects delivered by Atlas specialists, with the before and after of each one. Client names withheld for confidentiality.',
     'Proyectos reales entregados por especialistas de Atlas, con el antes y el después de cada uno. Nombres de clientes reservados por confidencialidad.'),
  'Cliente confidencial': ('Confidential client', 'Cliente confidencial'),
  'Antes e depois': ('Before and after', 'Antes y después'),
  'Antes': ('Before', 'Antes'),
  'Depois': ('After', 'Después'),
  'Cenário': ('Context', 'Escenario'),
  'Arquitetura': ('Architecture', 'Arquitectura'),
  'Solução': ('Solution', 'Solución'),
  'Tecnologias': ('Technologies', 'Tecnologías'),
  'O que mudou': ('What changed', 'Qué cambió'),
  'Mais projetos entregues': ('More projects delivered', 'Más proyectos entregados'),

  # case 1
  '<span>Varejo Multimarca</span><span>Data &amp; Analytics</span><span>Cloud Azure</span>':
    ('<span>Multi-brand Retail</span><span>Data &amp; Analytics</span><span>Azure Cloud</span>',
     '<span>Retail Multimarca</span><span>Data &amp; Analytics</span><span>Cloud Azure</span>'),
  'Canais separados viraram uma plataforma só': ('Separate channels became a single platform', 'Canales separados se volvieron una sola plataforma'),
  'Plataforma omnichannel de dados em Azure': ('Omnichannel data platform on Azure', 'Plataforma omnicanal de datos en Azure'),
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
  'Modernização para Google Cloud': ('Modernization to Google Cloud', 'Modernización a Google Cloud'),
  'legado caro de manter, distante da análise': ('legacy expensive to maintain, far from analysis', 'legado caro de mantener, lejos del análisis'),
  'legado aposentado, sem interromper a operação': ('legacy retired, without interrupting operations', 'legado jubilado, sin interrumpir la operación'),
  'Dados presos em um legado Oracle — caro de manter e distante das necessidades analíticas do negócio.':
    ('Data locked in an Oracle legacy — expensive to maintain and far from the analytical needs of the business.',
     'Datos atrapados en un legado Oracle — caro de mantener y lejos de las necesidades analíticas del negocio.'),
  'Data Lake em Google Cloud, com processamento em BigQuery.':
    ('A data lake on Google Cloud, with processing on BigQuery.', 'Data Lake en Google Cloud, con procesamiento en BigQuery.'),
  'Transformações em dbt, orquestração em Airflow e BI unificado em Looker.':
    ('Transformations in dbt, orchestration in Airflow and unified BI in Looker.',
     'Transformaciones en dbt, orquestación en Airflow y BI unificado en Looker.'),
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
  'painéis crescendo sem padrão nem fonte única': ('dashboards growing with no standard and no single source', 'paneles creciendo sin estándar ni fuente única'),
  'ambiente, com uma definição por métrica': ('environment, with one definition per metric', 'entorno, con una definición por métrica'),
  'Mais de 200 dashboards Power BI crescendo sem padrão, sem governança e sem fonte única da verdade.':
    ('Over 200 Power BI dashboards growing with no standard, no governance and no single source of truth.',
     'Más de 200 dashboards Power BI creciendo sin estándar, sin gobernanza y sin fuente única de la verdad.'),
  'Ambiente centralizado em Looker, com dados e definições unificados.':
    ('A centralized environment on Looker, with unified data and definitions.',
     'Entorno centralizado en Looker, con datos y definiciones unificados.'),
  'Migração, padronização e um modelo de self-service BI para as áreas de negócio.':
    ('Migration, standardization and a self-service BI model for the business areas.',
     'Migración, estandarización y un modelo de BI de autoservicio para las áreas de negocio.'),
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
  'BI que transformou os chamados do sistema de incidentes em indicadores de SLA, prazo e desempenho operacional.':
    ('BI that turned incident-system tickets into indicators of SLA, deadlines and operational performance.',
     'BI que transformó los tickets del sistema de incidencias en indicadores de SLA, plazo y desempeño operativo.'),
  '<span class="adm-a">Chamados</span><i aria-hidden="true">→</i><span class="adm-d">Indicadores de SLA</span>':
    ('<span class="adm-a">Tickets</span><i aria-hidden="true">→</i><span class="adm-d">SLA indicators</span>',
     '<span class="adm-a">Tickets</span><i aria-hidden="true">→</i><span class="adm-d">Indicadores de SLA</span>'),
  'Turismo &amp; Viagens': ('Travel &amp; Tourism', 'Turismo &amp; Viajes'),
  'Três linhas de negócio, uma visão só': ('Three business lines, a single view', 'Tres líneas de negocio, una sola visión'),
  'Arquitetura completa ETL → DW → BI consolidando viagens, hospedagens e locações em uma visão única do negócio.':
    ('A complete ETL → DW → BI architecture consolidating flights, lodging and rentals into a single view of the business.',
     'Arquitectura completa ETL → DW → BI consolidando viajes, alojamientos y alquileres en una visión única del negocio.'),
  '<span class="adm-a">3 linhas</span><i aria-hidden="true">→</i><span class="adm-d">1 visão</span>':
    ('<span class="adm-a">3 lines</span><i aria-hidden="true">→</i><span class="adm-d">1 view</span>',
     '<span class="adm-a">3 líneas</span><i aria-hidden="true">→</i><span class="adm-d">1 visión</span>'),
  'Serviços Financeiros': ('Financial Services', 'Servicios Financieros'),
  'O comercial ganhou número próprio': ('Sales got numbers of its own', 'El área comercial ganó número propio'),
  'Estrutura de dados e indicadores consolidando as informações do departamento comercial para análise e decisão.':
    ('A data and indicator structure consolidating the sales department’s information for analysis and decision.',
     'Estructura de datos e indicadores consolidando la información del departamento comercial para análisis y decisión.'),
  '<span class="adm-a">Extração pontual</span><i aria-hidden="true">→</i><span class="adm-d">Camada própria</span>':
    ('<span class="adm-a">One-off extraction</span><i aria-hidden="true">→</i><span class="adm-d">A layer of its own</span>',
     '<span class="adm-a">Extracción puntual</span><i aria-hidden="true">→</i><span class="adm-d">Capa propia</span>'),
  'Bancário': ('Banking', 'Banca'),
  'A voz do cliente virou indicador vivo': ('The customer’s voice became a live indicator', 'La voz del cliente se volvió indicador vivo'),
  'Acompanhamento de NPS transformando a voz dos clientes em indicadores de experiência e oportunidades de melhoria.':
    ('NPS tracking turning the voice of customers into experience indicators and improvement opportunities.',
     'Seguimiento de NPS transformando la voz de los clientes en indicadores de experiencia y oportunidades de mejora.'),
  '<span class="adm-a">Relatório avulso</span><i aria-hidden="true">→</i><span class="adm-d">Indicador vivo</span>':
    ('<span class="adm-a">Standalone report</span><i aria-hidden="true">→</i><span class="adm-d">Live indicator</span>',
     '<span class="adm-a">Informe suelto</span><i aria-hidden="true">→</i><span class="adm-d">Indicador vivo</span>'),
  'Ver os 13 cases →': ('See all 13 case studies →', 'Ver los 13 casos →'),
})

TRAD.update({
  # ---------------- painel de visualização ----------------
  'Dados também precisam ser compreendidos.': ('Data also has to be understood.', 'Los datos también necesitan ser comprendidos.'),
  'Dashboard não é decoração. Um número principal, um destaque por pergunta, o apoio embaixo. Hierarquia antes de enfeite.':
    ('A dashboard is not decoration. One headline number, one highlight per question, the support below. Hierarchy before ornament.',
     'Un dashboard no es decoración. Un número principal, un destaque por pregunta, el apoyo abajo. Jerarquía antes que adorno.'),
  'Páginas do painel': ('Dashboard pages', 'Páginas del panel'),
  'Visão geral': ('Overview', 'Visión general'),
  'Canais': ('Channels', 'Canales'),
  'Operação': ('Operations', 'Operación'),
  'Receita no período': ('Revenue in the period', 'Ingresos en el período'),
  'R$ 4,82 Mi': ('R$ 4.82M', 'R$ 4,82 M'),
  '↑ 6,4% vs. período anterior': ('↑ 6.4% vs. previous period', '↑ 6,4% vs. período anterior'),
  'Meta do período: R$ 4,60 Mi': ('Target for the period: R$ 4.60M', 'Meta del período: R$ 4,60 M'),
  'Margem': ('Margin', 'Margen'),
  'Ticket médio': ('Average ticket', 'Ticket promedio'),
  'Pedidos': ('Orders', 'Pedidos'),
  'Receita por mês · últimos 12 meses': ('Revenue by month · last 12 months', 'Ingresos por mes · últimos 12 meses'),
  '<b>Dezembro</b> é o maior mês do período e puxa o resultado acima da meta.':
    ('<b>December</b> is the biggest month of the period and pulls the result above target.',
     '<b>Diciembre</b> es el mayor mes del período y lleva el resultado por encima de la meta.'),
  'Canal digital': ('Digital channel', 'Canal digital'),
  '↑ 9,1 p.p. vs. período anterior': ('↑ 9.1 pp vs. previous period', '↑ 9,1 p.p. vs. período anterior'),
  'Meta do período: 38%': ('Target for the period: 38%', 'Meta del período: 38%'),
  'Loja física': ('Physical store', 'Tienda física'),
  'Margem digital': ('Digital margin', 'Margen digital'),
  'Receita por canal · últimos 12 meses': ('Revenue by channel · last 12 months', 'Ingresos por canal · últimos 12 meses'),
  'E-commerce próprio': ('Own e-commerce', 'E-commerce propio'),
  'Margem por canal': ('Margin by channel', 'Margen por canal'),
  'O <b>digital</b> passa a loja física em receita — e é o canal de maior margem.':
    ('<b>Digital</b> overtakes the physical store in revenue — and it is the highest-margin channel.',
     'El <b>digital</b> supera a la tienda física en ingresos — y es el canal de mayor margen.'),
  'Pedidos no prazo': ('On-time orders', 'Pedidos a tiempo'),
  '↑ 2,1 p.p. vs. período anterior': ('↑ 2.1 pp vs. previous period', '↑ 2,1 p.p. vs. período anterior'),
  'Meta do período: 95,0%': ('Target for the period: 95.0%', 'Meta del período: 95,0%'),
  'Separação': ('Picking', 'Preparación'),
  'Ruptura': ('Stockout', 'Rotura'),
  'Devolução': ('Returns', 'Devolución'),
  'Pedidos no prazo · últimos 12 meses <span class="dash-scale">escala 86–95%</span>':
    ('On-time orders · last 12 months <span class="dash-scale">scale 86–95%</span>',
     'Pedidos a tiempo · últimos 12 meses <span class="dash-scale">escala 86–95%</span>'),
  'No prazo por região <span class="dash-scale">escala 85–100%, traço = meta</span>':
    ('On time by region <span class="dash-scale">scale 85–100%, line = target</span>',
     'A tiempo por región <span class="dash-scale">escala 85–100%, línea = meta</span>'),
  'Sudeste': ('Southeast', 'Sudeste'),
  'Sul': ('South', 'Sur'),
  'Nordeste': ('Northeast', 'Nordeste'),
  '<b>Nordeste</b> concentra o atraso: 91,2% no prazo, contra 96,1% no Sudeste.':
    ('<b>The Northeast</b> concentrates the delay: 91.2% on time, against 96.1% in the Southeast.',
     'El <b>Nordeste</b> concentra el retraso: 91,2% a tiempo, contra 96,1% en el Sudeste.'),
  'Ilustração do método — não representa dados ou resultado de cliente.':
    ('An illustration of the method — it does not represent client data or results.',
     'Ilustración del método — no representa datos ni resultados de cliente.'),
  '<span>Jan</span> <span>Fev</span> <span>Mar</span> <span>Abr</span> <span>Mai</span> <span>Jun</span> <span>Jul</span> <span>Ago</span> <span>Set</span> <span>Out</span> <span>Nov</span> <span>Dez</span>':
    ('<span>Jan</span> <span>Feb</span> <span>Mar</span> <span>Apr</span> <span>May</span> <span>Jun</span> <span>Jul</span> <span>Aug</span> <span>Sep</span> <span>Oct</span> <span>Nov</span> <span>Dec</span>',
     '<span>Ene</span> <span>Feb</span> <span>Mar</span> <span>Abr</span> <span>May</span> <span>Jun</span> <span>Jul</span> <span>Ago</span> <span>Sep</span> <span>Oct</span> <span>Nov</span> <span>Dic</span>'),
  'Data Visualization': ('Data Visualization', 'Data Visualization'),

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
  'Nossos contatos': ('Our contacts', 'Nuestros contactos'),
  '<span class="k">E-mail</span><span class="v">contato@atlas-partner.com</span>':
    ('<span class="k">E-mail</span><span class="v">contato@atlas-partner.com</span>',
     '<span class="k">Correo</span><span class="v">contato@atlas-partner.com</span>'),
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
  'Instagram <small>@atlas_tecnologia ✦</small>': ('Instagram <small>@atlas_tecnologia ✦</small>', 'Instagram <small>@atlas_tecnologia ✦</small>'),
  'Instagram — @atlas_tecnologia': ('Instagram — @atlas_tecnologia', 'Instagram — @atlas_tecnologia'),
  'LinkedIn <small>Atlas Tecnologia ✦</small>': ('LinkedIn <small>Atlas Tecnologia ✦</small>', 'LinkedIn <small>Atlas Tecnologia ✦</small>'),

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
  '<span>Jan</span> <span>Fev</span> <span>Mar</span> <span>Abr</span> <span>Mai</span> <span>Jun</span> <span>Jul</span> <span>Ago</span> <span>Set</span> <span>Out</span> <span>Nov</span> <span class="hi">Dez</span>':
    ('<span>Jan</span> <span>Feb</span> <span>Mar</span> <span>Apr</span> <span>May</span> <span>Jun</span> <span>Jul</span> <span>Aug</span> <span>Sep</span> <span>Oct</span> <span>Nov</span> <span class="hi">Dec</span>',
     '<span>Ene</span> <span>Feb</span> <span>Mar</span> <span>Abr</span> <span>May</span> <span>Jun</span> <span>Jul</span> <span>Ago</span> <span>Sep</span> <span>Oct</span> <span>Nov</span> <span class="hi">Dic</span>'),
  '94,3%': ('94.3%', '94,3%'),
  'Projetos reais entregues por especialistas Atlas Tec. Nomes de clientes preservados por confidencialidade.':
    ('Real projects delivered by Atlas Tec specialists. Client names withheld for confidentiality.',
     'Proyectos reales entregados por especialistas de Atlas Tec. Nombres de clientes reservados por confidencialidad.'),
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
