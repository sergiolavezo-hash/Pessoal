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

  const primary = (["google", "openai", "anthropic"] as ProviderName[])
    .map((name) => [name, factories[name]()] as const)
    .filter((entry): entry is readonly [ProviderName, LLMProvider] => entry[1] !== null);

  // Provedores compatíveis com o dialeto da OpenAI: bastam as variáveis de
  // ambiente, sem alterar código.
  const extras = OPENAI_COMPATIBLE_VENDORS.flatMap((vendor) => {
    const key = process.env[vendor.envKey];
    if (!key) return [];
    return [
      [
        vendor.id,
        new OpenAIProvider(key, process.env[vendor.envModel], {
          name: vendor.id,
          baseUrl: vendor.baseUrl,
          defaultModel: vendor.defaultModel,
          // Só a OpenAI usa tokens de raciocínio; nos demais a folga estoura
          // o limite por minuto das camadas gratuitas.
          reasoningHeadroom: false,
          maxOutputTokens: vendor.maxOutputTokens,
        }),
      ] as const,
    ];
  });

  const byId = new Map<string, LLMProvider>([...primary, ...extras]);

  // A ordem de tentativa é configuração, não código: LLM_PRIORITY aceita uma
  // lista separada por vírgulas (ex.: "groq,google,openai"). Quem não for
  // citado entra depois, na ordem em que foi construído.
  const preferred = (process.env.LLM_PRIORITY ?? env.LLM_PROVIDER)
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const ordered: LLMProvider[] = [];
  const seen = new Set<string>();
  for (const id of preferred) {
    const provider = byId.get(id);
    if (provider && !seen.has(id)) {
      ordered.push(provider);
      seen.add(id);
    }
  }
  for (const [id, provider] of byId) {
    if (!seen.has(id)) ordered.push(provider);
  }
  return ordered;
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
