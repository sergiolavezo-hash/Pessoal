import "server-only";
import {
  LLMError,
  remainingMs,
  type LLMProvider,
  type LLMRequest,
  type LLMResponse,
} from "@/ai/llm/types";

const DEFAULT_MODEL = "gpt-4.1";

/**
 * Modelos de raciocínio (família GPT-5) descontam os tokens de raciocínio do
 * mesmo max_completion_tokens da resposta — sem folga, o JSON volta cortado.
 * Modelos sem raciocínio simplesmente não usam essa margem.
 */
const REASONING_HEADROOM_TOKENS = 8000;

/** Teto por requisição: um modelo lento não pode consumir a função inteira. */
const REQUEST_TIMEOUT_MS = 40_000;

/**
 * Fala o dialeto /chat/completions da OpenAI — que virou padrão de fato.
 * Groq, Cerebras, OpenRouter, Mistral, Together e DeepSeek expõem a MESMA
 * interface, então todos passam por aqui: muda só o endereço e a chave.
 */
export class OpenAIProvider implements LLMProvider {
  readonly name: string;
  readonly model: string;
  private readonly baseUrl: string;

  constructor(
    private readonly apiKey: string,
    model?: string,
    options: { name?: string; baseUrl?: string; defaultModel?: string } = {}
  ) {
    this.name = options.name ?? "openai";
    this.baseUrl = options.baseUrl ?? "https://api.openai.com/v1";
    this.model = model ?? options.defaultModel ?? DEFAULT_MODEL;
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const messages: Array<{ role: string; content: string }> = [];
    if (request.system) messages.push({ role: "system", content: request.system });
    for (const m of request.messages) messages.push({ role: m.role, content: m.content });

    const left = remainingMs(request.deadline);
    if (left <= 1_000) {
      throw new LLMError("Tempo esgotado antes de obter resposta da IA", this.name, true);
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      signal: AbortSignal.timeout(Math.min(REQUEST_TIMEOUT_MS, left)),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        max_completion_tokens: (request.maxTokens ?? 16000) + REASONING_HEADROOM_TOKENS,
        messages,
        ...(request.jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new LLMError(`${this.name} API error ${res.status}: ${body.slice(0, 300)}`, this.name, res.status >= 500 || res.status === 429);
    }

    const json = (await res.json()) as {
      choices: Array<{ message: { content: string | null }; finish_reason?: string }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      model: string;
    };

    const choice = json.choices[0];
    if (choice?.finish_reason === "length") {
      throw new LLMError(
        `${this.name} response was truncated (length) after ${json.usage?.completion_tokens ?? 0} tokens`,
        this.name,
        true
      );
    }

    return {
      text: choice?.message?.content ?? "",
      model: json.model,
      inputTokens: json.usage?.prompt_tokens ?? 0,
      outputTokens: json.usage?.completion_tokens ?? 0,
    };
  }
}
