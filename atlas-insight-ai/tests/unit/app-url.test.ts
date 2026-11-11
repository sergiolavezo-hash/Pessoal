import { afterEach, describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import { appOrigin } from "@/lib/app-url";

const req = (origin: string) => ({ nextUrl: { origin } }) as unknown as NextRequest;

describe("appOrigin", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.APP_URL;
  });

  it("usa a origem da requisição quando não há endereço fixo", () => {
    expect(appOrigin(req("https://app.exemplo.com"))).toBe("https://app.exemplo.com");
  });

  it("prefere o endereço fixo ao cabeçalho Host forjado", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://app.atlas.com/qualquer/caminho";
    expect(appOrigin(req("https://atacante.example"))).toBe("https://app.atlas.com");
  });

  it("ignora valor inválido e cai na origem da requisição", () => {
    process.env.APP_URL = "isso nao e url";
    expect(appOrigin(req("https://app.exemplo.com"))).toBe("https://app.exemplo.com");
  });
});
