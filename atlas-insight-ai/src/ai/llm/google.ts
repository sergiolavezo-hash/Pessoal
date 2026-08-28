import "server-only";
import { LLMError, type LLMProvider, type LLMRequest, type LLMResponse } from "@/ai/llm/types";

const DEFAULT_MODEL = "gemini-2.0-flash";

// Modelos com raciocínio (Gemini 2.5/3.x) descontam os tokens de "thinking"
// do mesmo maxOutputTokens da resposta. Sem folga, respostas JSON longas são
// cortadas com finishReason MAX_TOKENS. Reservamos espaço para o raciocínio
// além do que o chamador pediu; modelos sem thinking simplesmente não usam.
const THINKING_HEADROOM_TOKENS = 8000;

export class GoogleProvider implements LLMProvider {
  readonly name = "google";
  readonly model: string;

  constructor(
    private readonly apiKey: string,
    model?: string
  ) {
    this.model = model ?? DEFAULT_MODEL;
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const contents = request.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify({
          ...(request.system ? { systemInstruction: { parts: [{ text: request.system }] } } : {}),
          contents,
          generationConfig: {
            maxOutputTokens: (request.maxTokens ?? 16000) + THINKING_HEADROOM_TOKENS,
            ...(request.jsonMode ? { responseMimeType: "application/json" } : {}),
          },
        }),
      }
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new LLMError(`Google AI API error ${res.status}: ${body.slice(0, 300)}`, this.name, res.status >= 500 || res.status === 429);
    }

    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
      modelVersion?: string;
    };

    const candidate = json.candidates?.[0];
    const text = (candidate?.content?.parts ?? []).map((p) => p.text ?? "").join("");
    if (candidate?.finishReason === "MAX_TOKENS") {
      throw new LLMError(
        `Google AI response was truncated (MAX_TOKENS) after ${json.usageMetadata?.candidatesTokenCount ?? 0} tokens`,
        this.name,
        true
      );
    }
    return {
      text,
      model: json.modelVersion ?? this.model,
      inputTokens: json.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: json.usageMetadata?.candidatesTokenCount ?? 0,
    };
  }
}
