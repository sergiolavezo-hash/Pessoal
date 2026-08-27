import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { LLMError, type LLMProvider, type LLMRequest, type LLMResponse } from "@/ai/llm/types";

const DEFAULT_MODEL = "claude-opus-5";

export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic";
  readonly model: string;
  private client: Anthropic;

  constructor(apiKey: string, model?: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model ?? DEFAULT_MODEL;
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: request.maxTokens ?? 16000,
        system: request.system,
        messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
      });

      if (response.stop_reason === "refusal") {
        throw new LLMError("The model declined to answer this request", this.name);
      }

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("");

      return {
        text,
        model: response.model,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      };
    } catch (error) {
      if (error instanceof LLMError) throw error;
      if (error instanceof Anthropic.RateLimitError) {
        throw new LLMError("Anthropic rate limit reached", this.name, true);
      }
      if (error instanceof Anthropic.APIConnectionError) {
        throw new LLMError("Could not reach the Anthropic API", this.name, true);
      }
      if (error instanceof Anthropic.APIError) {
        throw new LLMError(`Anthropic API error: ${error.message}`, this.name, error.status >= 500);
      }
      throw new LLMError(error instanceof Error ? error.message : "Unknown LLM error", this.name);
    }
  }
}
