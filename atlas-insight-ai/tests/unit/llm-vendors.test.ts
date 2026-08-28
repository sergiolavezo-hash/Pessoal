import { describe, expect, it } from "vitest";
import { OPENAI_COMPATIBLE_VENDORS } from "@/ai/llm/vendors";

describe("provedores compatíveis com o dialeto da OpenAI", () => {
  it("todos apontam para HTTPS e têm variáveis próprias", () => {
    for (const v of OPENAI_COMPATIBLE_VENDORS) {
      expect(v.baseUrl.startsWith("https://"), v.id).toBe(true);
      // Sem barra final: o provider concatena "/chat/completions".
      expect(v.baseUrl.endsWith("/"), v.id).toBe(false);
      expect(v.envKey).toMatch(/^[A-Z0-9_]+_API_KEY$/);
      expect(v.envModel).toMatch(/^[A-Z0-9_]+_MODEL$/);
      expect(v.defaultModel.length).toBeGreaterThan(0);
    }
  });

  it("não repete identificadores nem variáveis entre provedores", () => {
    const ids = OPENAI_COMPATIBLE_VENDORS.map((v) => v.id);
    const keys = OPENAI_COMPATIBLE_VENDORS.map((v) => v.envKey);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("não colide com as variáveis dos provedores principais", () => {
    const reserved = new Set(["OPENAI_API_KEY", "GOOGLE_AI_API_KEY", "ANTHROPIC_API_KEY"]);
    for (const v of OPENAI_COMPATIBLE_VENDORS) {
      expect(reserved.has(v.envKey), v.id).toBe(false);
    }
  });
});
