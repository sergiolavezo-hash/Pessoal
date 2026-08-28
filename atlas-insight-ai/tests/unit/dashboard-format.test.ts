import { describe, expect, it } from "vitest";
import {
  formatCompact,
  formatDelta,
  formatValue,
  humanizeField,
  niceScale,
  shortenLabel,
} from "@/dashboards/format";

// O separador de milhar do pt-BR é um ponto, mas o Intl usa espaços
// inquebráveis em alguns contextos — normalizar evita teste frágil.
const norm = (s: string) => s.replace(/ /g, " ");

describe("formatValue", () => {
  it("mostra dinheiro em real, não em dólar", () => {
    expect(norm(formatValue(1234.5, "currency"))).toBe("R$ 1.234,50");
  });

  it("usa vírgula decimal e ponto de milhar", () => {
    expect(formatValue(1234.56, "decimal")).toBe("1.234,56");
  });

  it("trata percentual como fração", () => {
    expect(formatValue(0.4237, "percent")).toBe("42,4%");
  });

  it("não inventa número para valor inválido", () => {
    expect(formatValue(Number.NaN)).toBe("—");
  });
});

describe("formatCompact", () => {
  it("encurta só a partir de mil — abaixo disso o compacto perderia precisão", () => {
    expect(formatCompact(842, "decimal")).toBe("842,00");
    expect(norm(formatCompact(1_250_000, "currency"))).toContain("mi");
  });

  it("mantém a ordem de grandeza legível no eixo", () => {
    expect(norm(formatCompact(12_900))).toBe("12,9 mil");
  });
});

describe("formatDelta", () => {
  it("assina a variação e diz a direção", () => {
    expect(formatDelta(120, 100)).toEqual({ text: "+20%", direction: 1 });
    expect(formatDelta(80, 100)).toEqual({ text: "-20%", direction: -1 });
  });

  it("recusa base zero em vez de devolver infinito", () => {
    expect(formatDelta(10, 0)).toBeNull();
  });
});

describe("shortenLabel", () => {
  it("corta na palavra quando a palavra já ocupa quase todo o espaço", () => {
    expect(shortenLabel("São Paulo Capital", 14)).toBe("São Paulo…");
  });

  it("prefere aproveitar o espaço a cortar cedo demais", () => {
    // Cortar em "Região" jogaria fora metade da largura disponível; o corte
    // no meio da palavra informa mais do que um rótulo curto e ambíguo.
    expect(shortenLabel("Região Metropolitana", 14)).toBe("Região Metrop…");
  });

  it("deixa em paz o que já cabe", () => {
    expect(shortenLabel("Sudeste", 14)).toBe("Sudeste");
  });
});

describe("niceScale", () => {
  it("usa passos redondos em vez de dividir o máximo em quatro", () => {
    // 3.600,50 dividido por 4 daria 900,125 — o eixo antigo mostrava isso.
    const { ticks } = niceScale([3600.5, 3260.65]);
    expect(ticks).toEqual([0, 1000, 2000, 3000, 4000]);
  });

  it("cobre o maior valor: nenhuma barra pode sair do domínio", () => {
    const { domain } = niceScale([987]);
    expect(domain[1]).toBeGreaterThanOrEqual(987);
  });

  it("abre espaço abaixo de zero quando há valores negativos", () => {
    const { domain, ticks } = niceScale([-40, 120]);
    expect(domain[0]).toBeLessThanOrEqual(-40);
    expect(ticks).toContain(0);
  });

  it("não devolve escala degenerada quando tudo é zero", () => {
    expect(niceScale([0, 0]).ticks.length).toBeGreaterThan(1);
  });

  it("não acumula erro de ponto flutuante nas marcas", () => {
    expect(niceScale([0.5]).ticks.every((t) => String(t).length <= 6)).toBe(true);
  });
});

describe("humanizeField", () => {
  it("transforma alias de SQL em rótulo legível", () => {
    expect(humanizeField("categoria_sales")).toBe("Categoria sales");
    expect(humanizeField("total_january")).toBe("Total january");
  });

  it("separa camelCase sem quebrar sigla", () => {
    expect(humanizeField("totalVendas")).toBe("Total Vendas");
    expect(humanizeField("CNPJ")).toBe("CNPJ");
  });

  it("devolve o original quando não há o que melhorar", () => {
    expect(humanizeField("_")).toBe("_");
  });
});
