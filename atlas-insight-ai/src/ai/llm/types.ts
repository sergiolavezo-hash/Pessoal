// Provider-neutral LLM abstraction. The application depends only on this
// interface; concrete providers (Anthropic, OpenAI, Google) are adapters.

export interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LLMRequest {
  system?: string;
  messages: LLMMessage[];
  maxTokens?: number;
  /** Hint that the response must be a single JSON object. */
  jsonMode?: boolean;
  /**
   * Instante (epoch ms) em que a operação inteira precisa ter terminado.
   * A função serverless tem tempo limitado: sem isto, a cadeia de fallback
   * pode tentar modelo após modelo até a plataforma matar o pedido — e o
   * usuário recebe uma página de erro em vez de uma resposta.
   */
  deadline?: number;
}

/** Quanto ainda resta do prazo; Infinity quando não há prazo. */
export function remainingMs(deadline?: number): number {
  return deadline == null ? Number.POSITIVE_INFINITY : deadline - Date.now();
}

export interface LLMResponse {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface LLMProvider {
  readonly name: string;
  readonly model: string;
  complete(request: LLMRequest): Promise<LLMResponse>;
}

export class LLMError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly retryable = false
  ) {
    super(message);
    this.name = "LLMError";
  }
}

/**
 * Extracts the first JSON object/array from an LLM response, tolerating
 * markdown fences and prose around it.
 */
export function extractJson<T = unknown>(text: string): T {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(candidate) as T;
  } catch {
    // Fall through to bracket scanning.
  }
  const start = candidate.search(/[[{]/);
  if (start === -1) throw new LLMError("Response contains no JSON", "parser");
  const open = candidate[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  for (let i = start; i < candidate.length; i++) {
    const ch = candidate[i];
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) {
        return JSON.parse(candidate.slice(start, i + 1)) as T;
      }
    }
  }
  throw new LLMError("Response contains malformed JSON", "parser");
}
