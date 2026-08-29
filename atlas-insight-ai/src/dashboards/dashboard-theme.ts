import type { CSSProperties } from "react";

/**
 * Tema do painel.
 *
 * O produto não tem modelos de cor fechados: quem pede "um painel azul" ou
 * "com a identidade da minha empresa" recebe isso. Só é possível porque os
 * gráficos consomem variáveis CSS (--chart-1..8, a rampa sequencial, o
 * cromo) em vez de cores fixas — trocar as variáveis no contêiner repinta o
 * painel inteiro sem tocar em nenhum componente de gráfico.
 *
 * O que NÃO muda com o tema: a ordem em que as cores são atribuídas às
 * séries. Essa ordem é o mecanismo de separação para daltonismo, e embaralhá-la
 * por estética quebraria a leitura de quem depende dela.
 */

export interface DashboardTheme {
  /** 1 a 8 cores em hexadecimal. A primeira é a cor principal. */
  colors: string[];
  /** Fundo do painel; ausente usa o do produto. */
  surface?: string;
}

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function isValidColor(value: unknown): value is string {
  return typeof value === "string" && HEX.test(value.trim());
}

/**
 * Aceita o que der para usar e descarta o resto.
 *
 * Um tema com uma cor inválida não deve derrubar o painel: pintar sete das
 * oito séries e deixar a última no padrão é melhor do que uma tela de erro
 * por causa de um "#GGG".
 */
export function sanitizeTheme(input: unknown): DashboardTheme | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as { colors?: unknown; surface?: unknown };

  const colors = Array.isArray(raw.colors)
    ? raw.colors.filter(isValidColor).map((c) => c.trim().toLowerCase()).slice(0, 8)
    : [];
  if (colors.length === 0) return null;

  const surface = isValidColor(raw.surface) ? raw.surface.trim().toLowerCase() : undefined;
  return { colors, surface };
}

/**
 * Rampa sequencial derivada da cor principal.
 *
 * Uma rampa é uma matiz só, do claro ao escuro — misturar matizes numa escala
 * de magnitude faz o leitor procurar significado onde só existe intensidade.
 * `color-mix` resolve isso no próprio CSS, sem converter cor em JavaScript.
 */
function ramp(color: string): Record<string, string> {
  const mix = (withColor: string, pct: number) =>
    `color-mix(in oklab, ${color} ${100 - pct}%, ${withColor} ${pct}%)`;
  return {
    "--chart-seq-100": mix("white", 78),
    "--chart-seq-250": mix("white", 52),
    "--chart-seq-400": color,
    "--chart-seq-550": mix("black", 24),
    "--chart-seq-700": mix("black", 48),
  };
}

/**
 * Converte o tema em variáveis CSS para aplicar no contêiner do painel.
 *
 * Séries não informadas ficam com a cor padrão do produto em vez de repetir
 * as do tema: cor repetida em séries diferentes é indistinguível, e o gráfico
 * passaria a mentir sobre quantas categorias existem.
 */
export function dashboardThemeStyle(theme: DashboardTheme | null): CSSProperties {
  if (!theme || theme.colors.length === 0) return {};

  const vars: Record<string, string> = { ...ramp(theme.colors[0]) };
  theme.colors.forEach((color, i) => {
    vars[`--chart-${i + 1}`] = color;
  });
  if (theme.surface) vars["--chart-surface"] = theme.surface;

  return vars as CSSProperties;
}
