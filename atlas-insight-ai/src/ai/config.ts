/**
 * Configuração central do consumo de IA.
 *
 * Os tetos de token, tentativas e limites por cliente ficam todos aqui, e não
 * espalhados pelas chamadas: mudar a política de custo passa a ser editar um
 * arquivo, não caçar constantes pelo código.
 *
 * O dimensionamento parte do teto real da camada gratuita, que é da CHAVE de
 * API e não de cada cliente — na Groq, 200.000 tokens e 1.000 requisições por
 * dia para o projeto inteiro. Sem limite por cliente, um único usuário esgota
 * a cota e derruba todos os outros; por isso cada organização recebe uma fatia
 * própria, e o que sobra fica num pool comum que ninguém pode monopolizar.
 */

export type AiOperation =
  | "analyze"
  | "chat"
  | "dashboard_generate"
  | "dashboard_edit"
  | "business_rule_parse"
  | "insight"
  | "sql_generate"
  | "document_extract";

/** Prioridade sob escassez: P0 é essencial, P3 é experimental. */
export type AiPriority = 0 | 1 | 2 | 3;

export interface OperationBudget {
  /** Teto de tokens da resposta. */
  maxOutputTokens: number;
  /**
   * Teto do prompt, em caracteres (~4 caracteres por token). O contexto do
   * workspace cresce com o número de tabelas; sem teto, um cliente com um
   * banco grande sozinho estoura o limite por minuto do provedor.
   */
  maxPromptChars: number;
  /** Tentativas totais, incluindo a primeira. Nunca é ilimitado. */
  maxAttempts: number;
  priority: AiPriority;
  /** Segundos de validade da resposta em cache. 0 desliga o cache. */
  cacheTtlSeconds: number;
}

/**
 * Os tetos de saída cabem no limite por minuto da camada gratuita da Groq
 * (8.000 tokens por minuto, contando entrada e saída). Pedir mais faz o
 * servidor recusar o pedido inteiro em vez de truncar a resposta.
 */
const BUDGETS: Record<AiOperation, OperationBudget> = {
  // Gera o painel inteiro: é a operação mais cara e a mais valiosa.
  dashboard_generate: {
    maxOutputTokens: 4000,
    maxPromptChars: 24_000,
    maxAttempts: 2,
    priority: 1,
    cacheTtlSeconds: 3600,
  },
  dashboard_edit: {
    maxOutputTokens: 4000,
    maxPromptChars: 24_000,
    maxAttempts: 1,
    priority: 2,
    cacheTtlSeconds: 0,
  },
  // Pergunta em linguagem natural: precisa de SQL, não de texto longo.
  sql_generate: {
    maxOutputTokens: 1500,
    maxPromptChars: 20_000,
    maxAttempts: 3,
    priority: 1,
    cacheTtlSeconds: 900,
  },
  chat: {
    maxOutputTokens: 1500,
    maxPromptChars: 16_000,
    maxAttempts: 1,
    priority: 1,
    cacheTtlSeconds: 0,
  },
  // Só depende do esquema: cachear elimina a maior fonte de gasto repetido.
  insight: {
    maxOutputTokens: 1200,
    maxPromptChars: 12_000,
    maxAttempts: 1,
    priority: 3,
    cacheTtlSeconds: 86_400,
  },
  business_rule_parse: {
    maxOutputTokens: 1200,
    maxPromptChars: 12_000,
    maxAttempts: 1,
    priority: 2,
    cacheTtlSeconds: 3600,
  },
  analyze: {
    maxOutputTokens: 1500,
    maxPromptChars: 16_000,
    maxAttempts: 1,
    priority: 2,
    cacheTtlSeconds: 900,
  },
  document_extract: {
    maxOutputTokens: 2000,
    maxPromptChars: 20_000,
    maxAttempts: 1,
    priority: 2,
    cacheTtlSeconds: 3600,
  },
};

export function budgetFor(operation: AiOperation): OperationBudget {
  return BUDGETS[operation];
}

/**
 * Limites por organização. São a fatia que cada cliente pode consumir sem
 * prejudicar os demais — o isolamento que a cota gratuita do provedor não
 * oferece, porque lá o teto é da chave inteira.
 */
export interface TenantLimits {
  /** Requisições de IA por minuto. */
  requestsPerMinute: number;
  /** Requisições de IA simultâneas. */
  concurrentRequests: number;
  /** Tokens por dia (entrada + saída). */
  dailyTokens: number;
}

function intFromEnv(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Padrões calculados para caber na camada gratuita com 100 clientes.
 *
 * A Groq concede 200.000 tokens/dia à chave. Reservar 2.000 por cliente
 * comporta 100 clientes ativos no mesmo dia dentro da cota — e, como quase
 * nunca todos usam no mesmo dia, o consumo real fica bem abaixo do teto.
 * Quem precisar de mais recarrega créditos e passa a usar um provedor pago.
 */
export function tenantLimits(): TenantLimits {
  return {
    requestsPerMinute: intFromEnv("AI_TENANT_RPM", 6),
    concurrentRequests: intFromEnv("AI_TENANT_CONCURRENCY", 2),
    dailyTokens: intFromEnv("AI_TENANT_DAILY_TOKENS", 2000),
  };
}

/**
 * Nota de qualidade mínima da base para valer uma chamada de IA. Abaixo
 * disso, gerar um painel produz gráficos sem sentido — e cobra tokens por
 * isso. Barrar antes é mais barato e mais honesto com o usuário.
 */
export function minDatasetQualityScore(): number {
  return intFromEnv("AI_MIN_DATASET_SCORE", 50);
}
