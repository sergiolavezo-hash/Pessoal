import { describe, expect, it } from "vitest";
import {
  MIN_UF_COVERAGE,
  projectStates,
  toUf,
  ufCoverage,
  UF_NAMES,
} from "@/dashboards/geo/brazil-states";

/**
 * O dado real vem escrito de mil formas. Se a normalização falhar, o estado
 * sai cinza e o usuário lê "não vendi nada lá" — um mapa que engana é pior
 * que uma barra que apenas informa.
 */
describe("toUf", () => {
  it("accepts the code, the name, and the name without accents", () => {
    expect(toUf("SP")).toBe("SP");
    expect(toUf("sp")).toBe("SP");
    expect(toUf("São Paulo")).toBe("SP");
    expect(toUf("SAO PAULO")).toBe("SP");
    expect(toUf("sao paulo")).toBe("SP");
  });

  it("handles the compound names people abbreviate", () => {
    expect(toUf("Rio Grande do Sul")).toBe("RS");
    expect(toUf("rio grande sul")).toBe("RS");
    expect(toUf("Mato Grosso do Sul")).toBe("MS");
    expect(toUf("Espírito Santo")).toBe("ES");
  });

  // Reconhecer o que não é estado seria pior que não reconhecer nada: o mapa
  // pintaria a UF errada e ninguém teria como perceber.
  it("refuses anything that is not a state", () => {
    expect(toUf("Campinas")).toBeNull();
    expect(toUf("Brasil")).toBeNull();
    expect(toUf("Argentina")).toBeNull();
    expect(toUf("")).toBeNull();
    expect(toUf(null)).toBeNull();
    expect(toUf(42)).toBeNull();
  });

  it("covers all 27 units", () => {
    expect(Object.keys(UF_NAMES)).toHaveLength(27);
    for (const [uf, name] of Object.entries(UF_NAMES)) {
      expect(toUf(name)).toBe(uf);
      expect(toUf(uf)).toBe(uf);
    }
  });
});

describe("ufCoverage", () => {
  it("is 1 when every value is a state", () => {
    expect(ufCoverage(["SP", "RJ", "Minas Gerais"])).toBe(1);
  });

  it("falls below the threshold for a column of cities", () => {
    expect(ufCoverage(["Campinas", "Santos", "Osasco", "SP"])).toBeLessThan(MIN_UF_COVERAGE);
  });

  it("is 0 for an empty column", () => {
    expect(ufCoverage([])).toBe(0);
  });
});

describe("projectStates", () => {
  const shapes = projectStates(400, 400);

  it("produces a drawable path for every state", () => {
    expect(shapes).toHaveLength(27);
    for (const s of shapes) {
      expect(s.path).toMatch(/^M[\d.,\-LMZ]+Z$/);
      expect(s.uf in UF_NAMES).toBe(true);
    }
  });

  // Sem isso o mapa sai fora da moldura ou espremido num canto.
  it("keeps every point inside the box", () => {
    for (const s of shapes) {
      for (const m of s.path.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)) {
        expect(Number(m[1])).toBeGreaterThanOrEqual(-1);
        expect(Number(m[1])).toBeLessThanOrEqual(401);
        expect(Number(m[2])).toBeGreaterThanOrEqual(-1);
        expect(Number(m[2])).toBeLessThanOrEqual(401);
      }
    }
  });

  /**
   * Roraima fica ao norte e o Rio Grande do Sul ao sul. Se a projeção
   * invertesse o eixo, o mapa sairia de cabeça para baixo — e isso é o tipo de
   * erro que passa despercebido por quem não conhece o desenho do país.
   */
  it("puts the north above the south", () => {
    const y = (uf: string) => {
      const path = shapes.find((s) => s.uf === uf)!.path;
      const ys = [...path.matchAll(/[ML]-?[\d.]+,(-?[\d.]+)/g)].map((m) => Number(m[1]));
      return ys.reduce((a, b) => a + b, 0) / ys.length;
    };
    expect(y("RR")).toBeLessThan(y("RS"));
    expect(y("AM")).toBeLessThan(y("SC"));
  });
});
