import "server-only";
import {
  LLMError,
  remainingMs,
  type LLMProvider,
  type LLMRequest,
  type LLMResponse,
} from "@/ai/llm/types";

const DEFAULT_MODEL = "gemini-flash-latest";

// Modelos com raciocínio (Gemini 2.5/3.x) descontam os tokens de "thinking"
// do mesmo maxOutputTokens da resposta. Sem folga, respostas JSON longas são
// cortadas com finishReason MAX_TOKENS. Reservamos espaço para o raciocínio
// além do que o chamador pediu; modelos sem thinking simplesmente não usam.
const THINKING_HEADROOM_TOKENS = 8000;

/**
 * A cota gratuita do Gemini é contada POR MODELO (20 requisições por dia em
 * cada um). Encadear vários modelos multiplica a capacidade diária e mantém
 * o produto de pé quando um deles se esgota ou é aposentado.
 */
const FALLBACK_MODELS = [
  "gemini-flash-latest",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-flash-lite-latest",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];

/**
 * Teto por modelo. Sem isso, um modelo lento consome todo o tempo da função
 * serverless e a requisição morre — melhor desistir dele e tentar o próximo.
 */
const REQUEST_TIMEOUT_MS = 18_000;

/** Situações em que vale tentar outro modelo: cota estourada ou aposentado. */
function shouldTryNextModel(status: number): boolean {
  return status === 429 || status === 404 || status === 403 || status >= 500;
}

export class GoogleProvider implements LLMProvider {
  readonly name = "google";
  readonly model: string;

  constructor(
    private readonly apiKey: string,
    model?: string
  ) {
    this.model = model ?? DEFAULT_MODEL;
  }

  /** Modelo configurado primeiro, depois os alternativos, sem repetir. */
  private get modelChain(): string[] {
    return [...new Set([this.model, ...FALLBACK_MODELS])];
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const contents = request.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const body = JSON.stringify({
      ...(request.system ? { systemInstruction: { parts: [{ text: request.system }] } } : {}),
      contents,
      generationConfig: {
        maxOutputTokens: (request.maxTokens ?? 16000) + THINKING_HEADROOM_TOKENS,
        ...(request.jsonMode ? { responseMimeType: "application/json" } : {}),
      },
    });

    const chain = this.modelChain;
    let lastError: LLMError | null = null;

    for (const model of chain) {
      // Prazo vencido: tentar o próximo modelo só garantiria o timeout da
      // função. Melhor falhar agora, com mensagem, do que morrer sem resposta.
      const left = remainingMs(request.deadline);
      if (left <= 1_000) {
        throw (
          lastError ??
          new LLMError("Tempo esgotado antes de obter resposta da IA", this.name, true)
        );
      }

      let res: Response;
      try {
        res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": this.apiKey },
            body,
            signal: AbortSignal.timeout(Math.min(REQUEST_TIMEOUT_MS, left)),
          }
        );
      } catch (error) {
        // Timeout ou falha de rede: o próximo modelo pode responder.
        const message = error instanceof Error ? error.message : String(error);
        lastError = new LLMError(`Google AI request to ${model} failed: ${message}`, this.name, true);
        console.warn(`[llm] ${model} did not respond (${message}); trying next model`);
        continue;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        lastError = new LLMError(
          `Google AI API error ${res.status} on ${model}: ${text.slice(0, 300)}`,
          this.name,
          res.status >= 500 || res.status === 429
        );
        if (shouldTryNextModel(res.status)) {
          console.warn(`[llm] ${model} unavailable (${res.status}); trying next model`);
          continue;
        }
        throw lastError;
      }

      const json = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
        usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
        modelVersion?: string;
      };

      const candidate = json.candidates?.[0];
      if (candidate?.finishReason === "MAX_TOKENS") {
        throw new LLMError(
          `Google AI response was truncated (MAX_TOKENS) after ${json.usageMetadata?.candidatesTokenCount ?? 0} tokens`,
          this.name,
          true
        );
      }

      return {
        text: (candidate?.content?.parts ?? []).map((p) => p.text ?? "").join(""),
        model: json.modelVersion ?? model,
        inputTokens: json.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: json.usageMetadata?.candidatesTokenCount ?? 0,
      };
    }

    throw (
      lastError ??
      new LLMError(`No Google AI model available (tried ${chain.join(", ")})`, this.name, true)
    );
  }
}
