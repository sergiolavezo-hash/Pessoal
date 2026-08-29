import { describe, expect, it } from "vitest";
import {
  dashboardThemeStyle,
  isValidColor,
  sanitizeTheme,
} from "@/dashboards/dashboard-theme";

describe("isValidColor", () => {
  it("accepts three and six digit hex", () => {
    expect(isValidColor("#fff")).toBe(true);
    expect(isValidColor("#1B4ED8")).toBe(true);
  });

  it("rejects anything that is not hex", () => {
    for (const bad of ["azul", "#GGG", "rgb(0,0,0)", "", null, 42, "#12345"]) {
      expect(isValidColor(bad)).toBe(false);
    }
  });
});

describe("sanitizeTheme", () => {
  /**
   * Uma cor inválida não pode derrubar o painel. Pintar sete das oito séries
   * e deixar a última no padrão é melhor que uma tela de erro por "#GGG".
   */
  it("keeps the usable colours and drops the rest", () => {
    const theme = sanitizeTheme({ colors: ["#1b4ed8", "nao-e-cor", "#0f9d58"] });
    expect(theme?.colors).toEqual(["#1b4ed8", "#0f9d58"]);
  });

  it("normalises case so the same colour is one colour", () => {
    expect(sanitizeTheme({ colors: ["#1B4ED8"] })?.colors).toEqual(["#1b4ed8"]);
  });

  it("caps the palette at eight", () => {
    const many = Array.from({ length: 20 }, () => "#123456");
    expect(sanitizeTheme({ colors: many })?.colors).toHaveLength(8);
  });

  it("returns null when nothing is usable", () => {
    expect(sanitizeTheme({ colors: ["azul", "verde"] })).toBeNull();
    expect(sanitizeTheme({ colors: [] })).toBeNull();
    expect(sanitizeTheme(null)).toBeNull();
    expect(sanitizeTheme("azul")).toBeNull();
  });

  it("only accepts a surface that is a real colour", () => {
    expect(sanitizeTheme({ colors: ["#111111"], surface: "#fafafa" })?.surface).toBe("#fafafa");
    expect(sanitizeTheme({ colors: ["#111111"], surface: "claro" })?.surface).toBeUndefined();
  });
});

describe("dashboardThemeStyle", () => {
  const style = dashboardThemeStyle(sanitizeTheme({ colors: ["#1b4ed8", "#0f9d58"] })) as Record<
    string,
    string
  >;

  it("maps colours onto the chart variables in order", () => {
    expect(style["--chart-1"]).toBe("#1b4ed8");
    expect(style["--chart-2"]).toBe("#0f9d58");
  });

  /**
   * Séries não informadas ficam com o padrão do produto. Repetir as cores do
   * tema faria duas categorias diferentes saírem idênticas, e o gráfico
   * passaria a mentir sobre quantas existem.
   */
  it("does not recycle theme colours onto the remaining series", () => {
    expect(style["--chart-3"]).toBeUndefined();
    expect(style["--chart-8"]).toBeUndefined();
  });

  /** Escala de magnitude é uma matiz só, derivada da cor principal. */
  it("derives the sequential ramp from the main colour", () => {
    for (const step of ["100", "250", "400", "550", "700"]) {
      expect(style[`--chart-seq-${step}`]).toBeTruthy();
    }
    expect(style["--chart-seq-400"]).toBe("#1b4ed8");
    expect(style["--chart-seq-100"]).toContain("white");
    expect(style["--chart-seq-700"]).toContain("black");
  });

  it("returns nothing when there is no theme, keeping the product default", () => {
    expect(dashboardThemeStyle(null)).toEqual({});
  });
});
