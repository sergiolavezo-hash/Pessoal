import { describe, expect, it } from "vitest";
import { auditLabel, sourceStatusLabel } from "@/lib/labels";

describe("auditLabel", () => {
  it("não repete o recurso que a ação já cita", () => {
    // Antes saía "generated dashboard · dashboard" — a segunda palavra não
    // informava nada.
    expect(auditLabel("generated_dashboard", "dashboard")).toBe("Painel gerado");
  });

  it("acrescenta o recurso quando ele não está na ação", () => {
    expect(auditLabel("ran_query", "dashboard")).toBe("Consulta executada · painel");
  });

  it("degrada para o texto cru numa ação nova, sem quebrar a tela", () => {
    expect(auditLabel("fez_algo_novo")).toBe("fez algo novo");
  });
});

describe("sourceStatusLabel", () => {
  it("traduz o enum do banco", () => {
    expect(sourceStatusLabel("CONNECTED")).toBe("Conectada");
  });

  it("devolve o valor original quando não conhece o estado", () => {
    expect(sourceStatusLabel("QUALQUER")).toBe("QUALQUER");
  });
});
