import { BRAZIL_STATE_RINGS } from "@/dashboards/geo/brazil-states-geometry";

/**
 * Mapa por estado brasileiro.
 *
 * O dado real vem escrito de mil formas: "SP", "São Paulo", "sao paulo",
 * "S. Paulo". Se a normalização falhar, o estado sai cinza e o usuário conclui
 * que não vendeu nada lá — um mapa que engana é pior que um gráfico de barras
 * que apenas informa. Por isso o reconhecimento é tolerante, e quando a taxa
 * de acerto é baixa o painel troca o mapa por barras (ver repairWidgetVisual).
 */

export { BRAZIL_STATE_RINGS };

/** Nome oficial de cada unidade da federação. */
export const UF_NAMES: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};

function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const BY_NAME = new Map<string, string>();
for (const [uf, name] of Object.entries(UF_NAMES)) {
  BY_NAME.set(fold(name), uf);
  BY_NAME.set(fold(uf), uf);
}
// Formas abreviadas que aparecem em planilhas reais.
BY_NAME.set("s paulo", "SP");
BY_NAME.set("sao paulo sp", "SP");
BY_NAME.set("rio janeiro", "RJ");
BY_NAME.set("rio grande sul", "RS");
BY_NAME.set("rio grande norte", "RN");
BY_NAME.set("mato grosso sul", "MS");
BY_NAME.set("espirito santo es", "ES");

/** Converte o valor da coluna na sigla da UF, ou null se não reconhecer. */
export function toUf(value: unknown): string | null {
  if (value == null) return null;
  const key = fold(String(value));
  if (!key) return null;
  return BY_NAME.get(key) ?? null;
}

/**
 * Quanto dos valores da coluna são estados reconhecidos.
 *
 * É o que decide se vale desenhar o mapa: uma coluna de cidades ou de países
 * não vira mapa do Brasil, e um mapa quase todo cinza comunica errado.
 */
export function ufCoverage(values: unknown[]): number {
  if (values.length === 0) return 0;
  let hits = 0;
  for (const v of values) if (toUf(v)) hits += 1;
  return hits / values.length;
}

/** Cobertura mínima para o mapa valer a pena. */
export const MIN_UF_COVERAGE = 0.6;

export interface Projected {
  /** Caminho SVG já projetado. */
  path: string;
  uf: string;
}

/**
 * Projeta os contornos na caixa dada.
 *
 * Equirretangular com correção de latitude: o Brasil cruza o equador e uma
 * projeção sem correção o deixa achatado no norte e esticado no sul.
 */
export function projectStates(width: number, height: number): Projected[] {
  const entries = Object.entries(BRAZIL_STATE_RINGS);
  if (entries.length === 0) return [];

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  // Latitude média do país, para a correção do cosseno.
  const latRad = (-15 * Math.PI) / 180;
  const kx = Math.cos(latRad);

  for (const [, rings] of entries) {
    for (const ring of rings) {
      for (const [lon, lat] of ring) {
        const x = lon * kx;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (lat < minY) minY = lat;
        if (lat > maxY) maxY = lat;
      }
    }
  }

  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const scale = Math.min(width / spanX, height / spanY);
  const offsetX = (width - spanX * scale) / 2;
  const offsetY = (height - spanY * scale) / 2;

  return entries.map(([uf, rings]) => ({
    uf,
    path: rings
      .map((ring) =>
        ring
          .map(([lon, lat], i) => {
            const x = offsetX + (lon * kx - minX) * scale;
            // Y do SVG cresce para baixo; latitude cresce para cima.
            const y = offsetY + (maxY - lat) * scale;
            return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join("") + "Z"
      )
      .join(""),
  }));
}
