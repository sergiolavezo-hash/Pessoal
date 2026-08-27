import "server-only";
import { serverEnv } from "@/lib/env";
import { LLMError, type LLMProvider } from "@/ai/llm/types";
import { AnthropicProvider } from "@/ai/llm/anthropic";
import { OpenAIProvider } from "@/ai/llm/openai";
import { GoogleProvider } from "@/ai/llm/google";

/**
 * Provider factory. Selection is environment-driven (LLM_PROVIDER); the rest
 * of the application only ever sees the LLMProvider interface.
 */
export function getLLMProvider(): LLMProvider {
  const env = serverEnv();
  switch (env.LLM_PROVIDER) {
    case "anthropic":
      if (!env.ANTHROPIC_API_KEY) {
        throw new LLMError("ANTHROPIC_API_KEY is not configured", "anthropic");
      }
      return new AnthropicProvider(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL);
    case "openai":
      if (!env.OPENAI_API_KEY) {
        throw new LLMError("OPENAI_API_KEY is not configured", "openai");
      }
      return new OpenAIProvider(env.OPENAI_API_KEY, env.OPENAI_MODEL);
    case "google":
      if (!env.GOOGLE_AI_API_KEY) {
        throw new LLMError("GOOGLE_AI_API_KEY is not configured", "google");
      }
      return new GoogleProvider(env.GOOGLE_AI_API_KEY, env.GOOGLE_AI_MODEL);
  }
}

export function isLLMConfigured(): boolean {
  try {
    getLLMProvider();
    return true;
  } catch {
    return false;
  }
}
