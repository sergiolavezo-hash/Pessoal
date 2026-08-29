import { describe, expect, it } from "vitest";
import { resolveFromMemory, type MemoryCandidate } from "@/ai/memory-resolver";

/**
 * A regra que orienta todos os limiares: responder ERRADO é muito pior do que
 * gastar um token. Todo caso duvidoso aqui deve devolver null e deixar a IA
 * assumir — um número errado num painel destrói a confiança no produto
 * inteiro, enquanto uma chamada de IA custa centavos.
 */
const widgets: MemoryCandidate[] = [
  {
    id: "w1",
    title: "Faturamento mensal",
    explanation: "Soma do faturamento agrupada por mês",
    metrics: ["faturamento"],
  },
  {
    id: "w2",
    title: "Clientes ativos por região",
    explanation: "Contagem de clientes ativos agrupada por região",
    metrics: ["clientes_ativos"],
  },
  {
    id: "w3",
    title: "Ticket médio",
    explanation: "Faturamento dividido pelo número de pedidos",
    metrics: ["ticket_medio"],
  },
];

describe("resolveFromMemory", () => {
  it("answers from an existing widget without any AI call", () => {
    const match = resolveFromMemory("qual o faturamento mensal?", widgets);
    expect(match?.id).toBe("w1");
    expect(match?.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it("ignores accents and casing", () => {
    expect(resolveFromMemory("CLIENTES ATIVOS POR REGIAO", widgets)?.id).toBe("w2");
  });

  // Uma pergunta genuinamente nova precisa de interpretação de linguagem.
  // Nenhuma memória substitui isso, e fingir que substitui entrega lixo.
  it("gives up on a question the dashboard does not cover", () => {
    expect(
      resolveFromMemory("cruze forma de pagamento com inadimplencia", widgets)
    ).toBeNull();
  });

  // "qual o total?" não identifica widget nenhum: sem termos concretos,
  // qualquer escolha seria chute.
  it("gives up when the question has no concrete terms", () => {
    expect(resolveFromMemory("qual o total?", widgets)).toBeNull();
    expect(resolveFromMemory("me mostre isso", widgets)).toBeNull();
  });

  /**
   * O caso mais perigoso: dois widgets igualmente plausíveis. Escolher um no
   * par ou ímpar acerta metade das vezes — e a metade errada é um número
   * falso apresentado com toda a confiança.
   */
  it("gives up when two widgets match equally well", () => {
    const ambiguous: MemoryCandidate[] = [
      { id: "a", title: "Faturamento por região", explanation: "barras" },
      { id: "b", title: "Faturamento por região", explanation: "tabela" },
    ];
    expect(resolveFromMemory("faturamento por região", ambiguous)).toBeNull();
  });

  it("resolves when one candidate is clearly better than the rest", () => {
    const match = resolveFromMemory("ticket médio", widgets);
    expect(match?.id).toBe("w3");
  });

  it("handles an empty dashboard", () => {
    expect(resolveFromMemory("faturamento mensal", [])).toBeNull();
  });

  // Uma pergunta que só toca parte do widget ainda deixa o assunto restante
  // sem resposta — é a IA que deve tratar o pedaço novo.
  it("gives up when the question adds a subject the widget lacks", () => {
    expect(
      resolveFromMemory("faturamento mensal comparado com a meta anual", widgets)
    ).toBeNull();
  });

  it("never returns a confidence outside 0..1", () => {
    for (const q of ["faturamento mensal", "clientes ativos por região", "ticket médio"]) {
      const match = resolveFromMemory(q, widgets);
      if (match) {
        expect(match.confidence).toBeGreaterThan(0);
        expect(match.confidence).toBeLessThanOrEqual(1);
      }
    }
  });
});
