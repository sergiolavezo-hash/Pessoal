import { describe, expect, it } from "vitest";
import { readJson } from "@/lib/api-client";

function response(body: string, status = 200): Response {
  return new Response(body, { status });
}

describe("readJson", () => {
  it("parses normal JSON", async () => {
    await expect(readJson(response('{"ok":true}'))).resolves.toEqual({ ok: true });
  });

  // Foi exatamente isto que produziu, no navegador do usuário,
  // "Unexpected token 'A', \"An error o\"... is not valid JSON".
  it("explains a Vercel timeout page instead of leaking a parser error", async () => {
    const page = "An error occurred with your deployment\n\nFUNCTION_INVOCATION_TIMEOUT";
    await expect(readJson(response(page, 500))).rejects.toThrow(/demorou mais que o tempo permitido/i);
  });

  it("explains a gateway timeout", async () => {
    await expect(readJson(response("<html>timeout</html>", 504))).rejects.toThrow(
      /demorou mais que o tempo permitido/i
    );
  });

  it("reports other server failures with the status", async () => {
    await expect(readJson(response("<html>oops</html>", 502))).rejects.toThrow(/erro 502/i);
  });

  it("never leaks the raw browser parser message", async () => {
    for (const [body, status] of [
      ["An error occurred", 500],
      ["<html/>", 504],
      ["not json", 400],
    ] as const) {
      await expect(readJson(response(body, status))).rejects.toThrow(
        /^(?!.*Unexpected token)(?!.*did not match the expected pattern).+/
      );
    }
  });
});
