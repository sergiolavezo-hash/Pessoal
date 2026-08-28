import "server-only";
import { serverEnv } from "@/lib/env";
import { LLMError, type LLMProvider } from "@/ai/llm/types";
import { AnthropicProvider } from "@/ai/llm/anthropic";
import { OpenAIProvider } from "@/ai/llm/openai";
import { GoogleProvider } from "@/ai/llm/google";
import { FallbackLLMProvider } from "@/ai/llm/fallback";
import { OPENAI_COMPATIBLE_VENDORS } from "@/ai/llm/vendors";

type ProviderName = "anthropic" | "openai" | "google";

/**
 * Constrói TODOS os provedores com chave configurada, começando pelo
 * preferido (LLM_PROVIDER). Encadeá-los evita que uma cota esgotada num
 * provedor derrube a geração de painéis.
 */
function buildProviders(): LLMProvider[] {
  const env = serverEnv();
  const factories: Record<ProviderName, () => LLMProvider | null> = {
    google: () =>
      env.GOOGLE_AI_API_KEY ? new GoogleProvider(env.GOOGLE_AI_API_KEY, env.GOOGLE_AI_MODEL) : null,
    openai: () =>
      env.OPENAI_API_KEY ? new OpenAIProvider(env.OPENAI_API_KEY, env.OPENAI_MODEL) : null,
    anthropic: () =>
      env.ANTHROPIC_API_KEY
        ? new AnthropicProvider(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL)
        : null,
  };

  const order: ProviderName[] = [
    env.LLM_PROVIDER,
    ...(["google", "openai", "anthropic"] as ProviderName[]).filter((p) => p !== env.LLM_PROVIDER),
  ];

  const primary = order.map((name) => factories[name]()).filter((p): p is LLMProvider => p !== null);

  // Provedores compatíveis com o dialeto da OpenAI entram depois dos
  // principais: bastam as variáveis de ambiente, sem alterar código.
  const extras = OPENAI_COMPATIBLE_VENDORS.flatMap((vendor) => {
    const key = process.env[vendor.envKey];
    if (!key) return [];
    return [
      new OpenAIProvider(key, process.env[vendor.envModel], {
        name: vendor.id,
        baseUrl: vendor.baseUrl,
        defaultModel: vendor.defaultModel,
        // Só a OpenAI usa tokens de raciocínio; nos demais a folga estoura
        // o limite por minuto das camadas gratuitas.
        reasoningHeadroom: false,
        maxOutputTokens: vendor.maxOutputTokens,
      }),
    ];
  });

  return [...primary, ...extras];
}

/**
 * Provider factory. The rest of the application only ever sees the
 * LLMProvider interface — it never knows which vendor answered.
 */
export function getLLMProvider(): LLMProvider {
  const providers = buildProviders();
  if (providers.length === 0) {
    throw new LLMError(
      "Nenhuma chave de IA configurada (GOOGLE_AI_API_KEY, OPENAI_API_KEY ou ANTHROPIC_API_KEY)",
      "fallback"
    );
  }
  return providers.length === 1 ? providers[0] : new FallbackLLMProvider(providers);
}

export function isLLMConfigured(): boolean {
  try {
    getLLMProvider();
    return true;
  } catch {
    return false;
  }
}
