/**
 * ATLAS — conteúdo real do site.
 *
 * Tudo aqui saiu do site em produção: cinco serviços, treze cases,
 * quatorze tecnologias, dez setores. Nenhum cliente, número, métrica ou
 * resultado foi inventado — os nomes de cliente continuam preservados
 * por confidencialidade, como no original.
 *
 * Os dois valores ilustrativos da narrativa (o R$ 1.200 do capítulo de
 * leitura e a decisão de estoque) estão marcados como exemplo no próprio
 * texto, para nunca serem lidos como resultado de um cliente.
 */

/** Destino comercial de todo CTA: o formulário que já existe e converte. */
export const CONTACT_URL = 'https://atlas-partner.com/#contato';

export interface Service {
  n: string;
  name: string;
  promise: string;
  delivers: string[];
}

export const SERVICES: Service[] = [
  {
    n: '01',
    name: 'Data Engineering',
    promise: 'Construímos a infraestrutura que faz seus dados funcionarem.',
    delivers: ['ETL / ELT', 'Data Lake', 'Data Warehouse', 'Lakehouse', 'Pipelines', 'Modelagem', 'APIs', 'Governança'],
  },
  {
    n: '02',
    name: 'Business Intelligence',
    promise: 'Transformamos dados em indicadores que ajudam o negócio a decidir.',
    delivers: ['Power BI', 'Tableau', 'Looker', 'Dashboards executivos', 'KPIs', 'Self-service BI', 'Modelagem semântica'],
  },
  {
    n: '03',
    name: 'Data & Cloud',
    promise: 'Modernizamos arquiteturas de dados e levamos workloads para a nuvem.',
    delivers: ['GCP', 'Azure', 'AWS', 'BigQuery', 'Databricks', 'Snowflake', 'Migração de legado', 'Modern Data Stack'],
  },
  {
    n: '04',
    name: 'Artificial Intelligence',
    promise: 'Aplicamos IA onde ela realmente gera valor para a operação.',
    delivers: ['IA generativa', 'Agentes', 'Copilotos', 'Machine Learning', 'Modelos preditivos', 'RAG', 'Document AI'],
  },
  {
    n: '05',
    name: 'Automation',
    promise: 'Automatizamos processos para reduzir trabalho manual e aumentar eficiência.',
    delivers: ['APIs', 'Integrações', 'RPA', 'Workflows', 'Orquestração', 'Automação de processos'],
  },
];

/**
 * Os cinco territórios do ciclo. Cada um entra pela porta do problema do
 * cliente e sai pelo serviço que o resolve — é a mesma tela contando as
 * duas coisas, em vez de uma seção de problemas e outra de processo
 * repetindo o mesmo assunto.
 */
export interface Territory {
  id: 'capture' | 'organize' | 'understand' | 'intelligence' | 'decide';
  code: string;
  /** O que acontece com o dado aqui — o nome do território no ciclo. */
  stage: string;
  /** A pergunta que faz o visitante se reconhecer. */
  problem: string;
  /** O que a Atlas faz a respeito, em uma frase. */
  answer: string;
  /** Os sintomas ou entidades concretas desta etapa. */
  items: string[];
  services: string[];
  cta: string;
}

export const TERRITORIES: Territory[] = [
  {
    id: 'capture',
    code: '01',
    stage: 'Capture',
    problem: 'Seus dados estão espalhados?',
    answer: 'A Atlas conecta suas fontes e constrói o caminho por onde os dados passam a andar juntos.',
    items: ['ERP', 'CRM', 'API', 'Banco de dados', 'Aplicação', 'Sensor', 'Arquivo', 'Streaming'],
    services: ['Data Engineering', 'Data Integration', 'Data Pipelines'],
    cta: 'Resolver meu problema',
  },
  {
    id: 'organize',
    code: '02',
    stage: 'Organize',
    problem: 'Seus dados não são confiáveis?',
    answer: 'A Atlas transforma dado bruto em base confiável — com padrão, histórico e governança.',
    items: ['Duplicados', 'Inconsistentes', 'Atrasados', 'Sem governança'],
    services: ['Data Engineering', 'Data & Cloud', 'Governança de dados'],
    cta: 'Organizar meus dados',
  },
  {
    id: 'understand',
    code: '03',
    stage: 'Understand',
    problem: 'Você tem dados, mas não enxerga o negócio?',
    answer: 'Um número sozinho não decide nada. A Atlas dá contexto a ele e transforma isso em indicador executivo.',
    items: ['Cliente', 'Produto', 'Loja', 'Data', 'Região', 'Canal', 'Margem', 'Comportamento'],
    services: ['Business Intelligence', 'Data Visualization', 'Analytics'],
    cta: 'Transformar dados em visão',
  },
  {
    id: 'intelligence',
    code: '04',
    stage: 'Intelligence',
    problem: 'Quer usar IA de verdade nos seus dados?',
    answer: 'IA aplicada sobre a sua própria base — uma camada que lê o que já existe e antecipa o que vem.',
    items: ['Padrão', 'Anomalia', 'Previsão', 'Recomendação'],
    services: ['Artificial Intelligence'],
    cta: 'Aplicar IA ao meu negócio',
  },
  {
    id: 'decide',
    code: '05',
    stage: 'Decide',
    problem: 'Precisa transformar informação em decisão?',
    answer: 'O ciclo só fecha quando o indicador vira ação — e a ação vira dado novo.',
    items: ['Dashboards executivos', 'Decision Intelligence', 'Automation'],
    services: ['Data Visualization', 'Decision Intelligence', 'Automation'],
    cta: 'Falar com a Atlas',
  },
];

export interface Case {
  sector: string;
  title: string;
  problem: string;
  solution: string;
  stack: string[];
  /** Só os cases principais têm resultados destacados. */
  results?: { value: string; detail: string }[];
  confidential?: boolean;
}

/** Os três cases principais. Cliente sob confidencialidade, como no site. */
export const FLAGSHIP_CASES: Case[] = [
  {
    sector: 'Varejo Multimarca',
    title: 'Plataforma omnichannel de dados',
    problem: 'Dados de lojas físicas e canais digitais espalhados em sistemas diferentes, sem visão única de performance.',
    solution: 'Plataforma de dados em Azure integrando todos os canais, com dashboards Power BI de vendas, operação e performance por canal.',
    stack: ['Azure Synapse', 'Data Factory', 'Databricks', 'Power BI'],
    results: [
      { value: 'Físico + digital', detail: 'todos os canais de venda integrados em uma única plataforma' },
      { value: 'Pipelines em Azure', detail: 'Synapse, Data Factory e Databricks em produção' },
      { value: 'Visão por canal', detail: 'indicadores comerciais e operacionais lado a lado' },
    ],
    confidential: true,
  },
  {
    sector: 'Serviços Financeiros',
    title: 'Modernização de legado para a nuvem',
    problem: 'Dados presos em um legado Oracle — caro de manter e distante das necessidades analíticas do negócio.',
    solution: 'Data Lake em Google Cloud com transformações em dbt, processamento em BigQuery, orquestração em Airflow e BI unificado em Looker.',
    stack: ['GCP', 'BigQuery', 'dbt', 'Airflow', 'Looker'],
    results: [
      { value: 'Oracle → GCP', detail: 'legado aposentado sem interromper a operação' },
      { value: 'dbt + Airflow', detail: 'transformações testadas e pipelines orquestrados' },
      { value: 'Looker', detail: 'camada única de visualização para o negócio' },
    ],
    confidential: true,
  },
  {
    sector: 'BI Governance',
    title: 'Migração e governança de BI em escala',
    problem: 'Mais de 200 dashboards Power BI crescendo sem padrão, sem governança e sem fonte única da verdade.',
    solution: 'Ambiente migrado para Looker com dados centralizados, padronização e um modelo de self-service BI para as áreas de negócio.',
    stack: ['Power BI', 'Looker', 'Governança de dados'],
    results: [
      { value: '+200 dashboards', detail: 'migrados para Looker em um único projeto' },
      { value: 'Governança', detail: 'centralização, padronização e organização do ambiente analítico' },
      { value: 'Self-service', detail: 'áreas de negócio autônomas para explorar dados' },
    ],
    confidential: true,
  },
];

/** Os dez projetos restantes do inventário. */
export const MORE_CASES: Case[] = [
  { sector: 'Software & Tecnologia', title: 'Gestão de incidentes e SLA', problem: '', solution: 'BI que transformou os chamados do sistema de incidentes em indicadores de SLA, prazo e desempenho operacional.', stack: ['Pentaho', 'SQL Server', 'Data Warehouse'] },
  { sector: 'Turismo & Viagens', title: 'BI de ponta a ponta', problem: '', solution: 'Arquitetura completa ETL → DW → BI consolidando viagens, hospedagens e locações em uma visão única do negócio.', stack: ['Pentaho', 'SQL Server', 'MicroStrategy'] },
  { sector: 'Serviços Financeiros', title: 'Camada de dados comercial', problem: '', solution: 'Estrutura de dados e indicadores consolidando as informações do departamento comercial para análise e decisão.', stack: ['SSIS', 'Data Warehouse', 'MicroStrategy'] },
  { sector: 'Bancário', title: 'NPS & Customer Experience', problem: '', solution: 'Acompanhamento de NPS transformando a voz dos clientes em indicadores de experiência e oportunidades de melhoria.', stack: ['NPS', 'Analytics', 'CX'] },
  { sector: 'Varejo de Moda', title: 'BI corporativo multiárea', problem: '', solution: 'Dashboards de vendas, logística e operações dando acesso a indicadores para todas as áreas da organização.', stack: ['Pentaho', 'MicroStrategy', 'DW'] },
  { sector: 'Saúde & Diagnóstico', title: 'Engenharia de dados em GCP', problem: '', solution: 'Pipelines em BigQuery e Airflow para uma rede de diagnóstico, com migração da visualização de Tableau para Power BI.', stack: ['GCP', 'BigQuery', 'Airflow', 'Power BI'] },
  { sector: 'Educação', title: 'Predição de evasão de alunos', problem: '', solution: 'Centenas de dashboards educacionais e modelos preditivos que anteciparam a evasão para apoiar ações preventivas.', stack: ['Analytics', 'Machine Learning', 'BI'] },
  { sector: 'Saúde Hospitalar', title: 'Design de dados com Figma', problem: '', solution: 'Protótipos em Figma definindo o padrão visual antes do desenvolvimento — centenas de dashboards Power BI padronizados.', stack: ['Figma', 'Power BI', 'Data Design'] },
  { sector: 'Food Service', title: 'Performance diária da rede', problem: '', solution: 'Painéis de acompanhamento diário das unidades de um grande grupo de restaurantes — desvios visíveis em tempo hábil.', stack: ['Dashboards', 'Operações'] },
  { sector: 'Infraestrutura & Mobilidade', title: 'Rodovias, pedágios e aeroportos', problem: '', solution: 'Painéis integrando gestão de acidentes, arrecadação de pedágios e operação aeroportuária em uma visão única.', stack: ['Data & BI', 'Operações'] },
];

/** Stack real citada no site, agrupada por função. */
export const TECHNOLOGY: { group: string; items: string[] }[] = [
  { group: 'Cloud', items: ['GCP', 'Azure', 'AWS'] },
  { group: 'Data', items: ['BigQuery', 'Databricks', 'Snowflake', 'dbt', 'Airflow'] },
  { group: 'BI', items: ['Power BI', 'Tableau', 'Looker'] },
  { group: 'Engenharia', items: ['Python', 'SQL'] },
  { group: 'Design', items: ['Figma'] },
];

export const SECTORS = [
  'Software & Tecnologia', 'Serviços Financeiros', 'Bancário', 'Varejo & Moda',
  'Varejo Omnichannel', 'Saúde & Diagnóstico', 'Educação', 'Turismo',
  'Food Service', 'Infraestrutura & Mobilidade',
];
