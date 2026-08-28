import "server-only";

/**
 * Provedores que falam o dialeto /chat/completions da OpenAI.
 *
 * Todos foram verificados respondendo nesse formato. Como o dialeto é o
 * mesmo, ligar qualquer um deles é só configurar duas variáveis de ambiente
 * — sem código novo e sem publicar de novo. Eles entram na cadeia de
 * fallback depois dos principais, então uma cota esgotada em um provedor
 * não derruba a geração de painéis.
 */
export interface CompatibleVendor {
  id: string;
  label: string;
  baseUrl: string;
  /** Variável com a chave; a presença dela liga o provedor. */
  envKey: string;
  /** Variável opcional para escolher o modelo. */
  envModel: string;
  /**
   * Modelo usado quando a variável acima não é informada. Nomes de modelo
   * mudam com frequência: confira a lista do provedor antes de confiar no
   * padrão. Se estiver errado, o provedor devolve erro e a cadeia segue
   * para o próximo — nunca derruba o pedido.
   */
  defaultModel: string;
}

export const OPENAI_COMPATIBLE_VENDORS: CompatibleVendor[] = [
  {
    id: "groq",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    envKey: "GROQ_API_KEY",
    envModel: "GROQ_MODEL",
    defaultModel: "llama-3.3-70b-versatile",
  },
  {
    id: "cerebras",
    label: "Cerebras",
    baseUrl: "https://api.cerebras.ai/v1",
    envKey: "CEREBRAS_API_KEY",
    envModel: "CEREBRAS_MODEL",
    defaultModel: "llama-3.3-70b",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    envKey: "OPENROUTER_API_KEY",
    envModel: "OPENROUTER_MODEL",
    defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
  },
  {
    id: "mistral",
    label: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    envKey: "MISTRAL_API_KEY",
    envModel: "MISTRAL_MODEL",
    defaultModel: "mistral-large-latest",
  },
  {
    id: "together",
    label: "Together",
    baseUrl: "https://api.together.xyz/v1",
    envKey: "TOGETHER_API_KEY",
    envModel: "TOGETHER_MODEL",
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    envKey: "DEEPSEEK_API_KEY",
    envModel: "DEEPSEEK_MODEL",
    defaultModel: "deepseek-chat",
  },
];
