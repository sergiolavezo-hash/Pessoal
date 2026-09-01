import { describe, expect, it } from "vitest";
import {
  ORDER_STATUSES,
  canTransition,
  grantsAccess,
  isTerminal,
  type OrderActor,
  type OrderStatus,
} from "@/store/orders";

const ACTORS: OrderActor[] = ["customer", "gateway", "admin"];

describe("quem pode marcar um pedido como pago", () => {
  /**
   * A regra que sustenta a loja inteira. Um caminho que chegue a PAID sem
   * confirmação do gateway entrega o produto de graça — e em silêncio,
   * porque ninguém abre chamado dizendo "recebi sem pagar".
   */
  it("never lets the browser mark an order as paid", () => {
    for (const from of ORDER_STATUSES) {
      expect(canTransition(from, "PAID", "customer").ok).toBe(false);
    }
  });

  // Nem o administrador: pagamento é fato do provedor, não decisão nossa.
  // Cortesia se dá pelo DIREITO (source='grant'), sem forjar um pagamento.
  it("does not let an admin fake a payment either", () => {
    for (const from of ORDER_STATUSES) {
      expect(canTransition(from, "PAID", "admin").ok).toBe(false);
    }
  });

  it("lets the gateway confirm from the two states that can still be paid", () => {
    expect(canTransition("PENDING", "PAID", "gateway").ok).toBe(true);
    expect(canTransition("PROCESSING", "PAID", "gateway").ok).toBe(true);
  });

  it("refuses to resurrect an order that already ended", () => {
    for (const from of ["FAILED", "EXPIRED", "CANCELLED", "REFUNDED"] as OrderStatus[]) {
      const r = canTransition(from, "PAID", "gateway");
      expect(r.ok).toBe(false);
      expect(r.reason).toContain("não muda mais");
    }
  });
});

describe("liberação do produto", () => {
  // Escrito uma vez para não ser reinterpretado por engano em outro arquivo.
  it("is granted by PAID and by nothing else", () => {
    for (const s of ORDER_STATUSES) {
      expect(grantsAccess(s)).toBe(s === "PAID");
    }
  });
});

describe("reenvio de webhook", () => {
  /**
   * Gateway reenvia o mesmo evento — é o comportamento normal deles. Tratar
   * reenvio como erro enche o log de alarme falso e esconde o problema real.
   */
  it("treats a repeated state as a no-op, not a failure", () => {
    const r = canTransition("PAID", "PAID", "gateway");
    expect(r.ok).toBe(false);
    expect(r.noop).toBe(true);
    expect(r.reason).toBeUndefined();
  });
});

describe("desistência e estorno", () => {
  it("lets the customer give up before paying, but not after", () => {
    expect(canTransition("PENDING", "CANCELLED", "customer").ok).toBe(true);
    expect(canTransition("PROCESSING", "CANCELLED", "customer").ok).toBe(false);
    expect(canTransition("PAID", "CANCELLED", "customer").ok).toBe(false);
  });

  it("allows a refund only from PAID", () => {
    expect(canTransition("PAID", "REFUNDED", "admin").ok).toBe(true);
    expect(canTransition("PENDING", "REFUNDED", "admin").ok).toBe(false);
    expect(canTransition("FAILED", "REFUNDED", "admin").ok).toBe(false);
  });

  // PAID não é terminal justamente por causa do estorno.
  it("keeps PAID open so a refund is still possible", () => {
    expect(isTerminal("PAID")).toBe(false);
    expect(isTerminal("PENDING")).toBe(false);
    for (const s of ["FAILED", "EXPIRED", "CANCELLED", "REFUNDED"] as OrderStatus[]) {
      expect(isTerminal(s)).toBe(true);
    }
  });
});

describe("nenhuma transição inventada", () => {
  /**
   * Varre TODAS as combinações e confirma que só as previstas passam. É o
   * teste que pega a transição que alguém acrescenta sem pensar no efeito
   * sobre o download.
   */
  it("allows exactly the transitions the state machine declares", () => {
    const permitidas: string[] = [];
    for (const from of ORDER_STATUSES) {
      for (const to of ORDER_STATUSES) {
        for (const by of ACTORS) {
          if (canTransition(from, to, by).ok) permitidas.push(`${from}>${to}:${by}`);
        }
      }
    }
    expect(permitidas.sort()).toEqual(
      [
        "PENDING>PROCESSING:gateway",
        "PENDING>CANCELLED:customer",
        "PENDING>CANCELLED:admin",
        "PROCESSING>CANCELLED:admin",
        "PENDING>EXPIRED:gateway",
        "PENDING>EXPIRED:admin",
        "PROCESSING>EXPIRED:gateway",
        "PROCESSING>EXPIRED:admin",
        "PROCESSING>PAID:gateway",
        "PENDING>PAID:gateway",
        "PROCESSING>FAILED:gateway",
        "PENDING>FAILED:gateway",
        "PAID>REFUNDED:gateway",
        "PAID>REFUNDED:admin",
      ].sort()
    );
  });
});
