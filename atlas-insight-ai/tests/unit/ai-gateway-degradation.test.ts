import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * A portaria recusa quando não consegue julgar — mas "a função não existe"
 * não é uma dúvida, é a migração 0016 ainda não aplicada. Tratar os dois
 * casos igual derrubaria toda a IA no intervalo entre o deploy do código e a
 * aplicação da migração: uma parada causada pelo próprio controle de custo.
 */

const rpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc }),
}));

const { admit } = await import("@/services/ai-gateway");
const { getCreditStatus } = await import("@/services/ai-credits");

beforeEach(() => rpc.mockReset());

describe("admit", () => {
  it("lets the request through when the gateway function is not deployed yet", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "PGRST202", message: "not found" } });
    await expect(admit("org1", "chat", 100)).resolves.toMatchObject({ lease: null });

    rpc.mockResolvedValue({ data: null, error: { code: "42883", message: "undefined function" } });
    await expect(admit("org1", "chat", 100)).resolves.toMatchObject({ lease: null });
  });

  // Um timeout não diz nada sobre a fatia do cliente: liberar "na dúvida" é
  // como uma conta gratuita vira uma fatura.
  it("refuses when the gateway fails for any other reason", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "57014", message: "statement timeout" } });
    await expect(admit("org1", "chat", 100)).rejects.toMatchObject({ status: 503 });
  });

  it("refuses with 429 when the tenant is over its limit", async () => {
    rpc.mockResolvedValue({
      data: { allowed: false, reason: "rate_limited", retry_after_seconds: 30 },
      error: null,
    });
    await expect(admit("org1", "chat", 100)).rejects.toMatchObject({ status: 429 });

    rpc.mockResolvedValue({
      data: { allowed: false, reason: "too_many_concurrent", running: 2 },
      error: null,
    });
    await expect(admit("org1", "chat", 100)).rejects.toMatchObject({ status: 429 });

    rpc.mockResolvedValue({
      data: { allowed: false, reason: "daily_tokens_exhausted" },
      error: null,
    });
    await expect(admit("org1", "chat", 100)).rejects.toMatchObject({ status: 429 });
  });

  it("returns the lease when admitted", async () => {
    rpc.mockResolvedValue({ data: { allowed: true, lease: "abc" }, error: null });
    await expect(admit("org1", "chat", 100)).resolves.toEqual({
      lease: "abc",
      organizationId: "org1",
    });
  });
});

describe("getCreditStatus", () => {
  it("blocks when the wallet cannot be read", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "57014", message: "timeout" } });
    await expect(getCreditStatus("org1")).resolves.toMatchObject({ allowed: false });
  });

  it("does not block when the wallet is simply not provisioned yet", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "PGRST202", message: "not found" } });
    await expect(getCreditStatus("org1")).resolves.toMatchObject({ allowed: true });
  });
});
