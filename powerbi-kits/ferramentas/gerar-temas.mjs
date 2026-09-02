#!/usr/bin/env node
/**
 * Gera o arquivo de tema do Power BI (.json) de cada estilo, a partir da
 * MESMA paleta que colore as medidas.
 *
 * Existe para que o relatório e os visuais em DAX não briguem. Tema e
 * medidas mantidos à mão divergem no primeiro ajuste — e a divergência
 * aparece como um card fora de tom no meio de um dashboard, que é
 * exatamente o que faz um template parecer amador.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const PALETAS = JSON.parse(readFileSync(join(AQUI, "..", "tokens", "paletas.json"), "utf8"));
const DESTINO = join(AQUI, "..", "temas");

const hex = (rgb) =>
  "#" + rgb.split(",").map((n) => Number(n.trim()).toString(16).padStart(2, "0")).join("").toUpperCase();

mkdirSync(DESTINO, { recursive: true });

for (const [estilo, p] of Object.entries(PALETAS)) {
  if (estilo.startsWith("_")) continue;

  const tema = {
    name: `Atlas ${estilo}`,
    // A ordem importa: o Power BI usa dataColors[0] como cor padrão de
    // série. A marca vem primeiro para que um gráfico sem configuração já
    // saia na identidade do template.
    dataColors: [
      hex(p.CorMarca), hex(p.CorMarca2), hex(p.CorPos), hex(p.CorAtencao),
      hex(p.CorNeg), hex(p.CorNeutro), hex(p.CorPosForte), hex(p.CorNegForte),
    ],
    background: hex(p.CorFundo),
    foreground: hex(p.CorTexto),
    tableAccent: hex(p.CorMarca),
    good: hex(p.CorPos),
    neutral: hex(p.CorAtencao),
    bad: hex(p.CorNeg),
    maximum: hex(p.RampaFim),
    minimum: hex(p.RampaIni),
    textClasses: {
      title:      { fontFace: "Segoe UI Semibold", fontSize: 16, color: hex(p.CorTexto) },
      header:     { fontFace: "Segoe UI Semibold", fontSize: 13, color: hex(p.CorTexto) },
      label:      { fontFace: "Segoe UI",          fontSize: 11, color: hex(p.CorTextoSuave) },
      callout:    { fontFace: "Segoe UI Semibold", fontSize: 34, color: hex(p.CorTexto) },
      largeTitle: { fontFace: "Segoe UI Semibold", fontSize: 22, color: hex(p.CorTexto) },
    },
    visualStyles: {
      "*": {
        "*": {
          background: [{ color: { solid: { color: hex(p.CorFundo) } }, transparency: 0 }],
          border:     [{ color: { solid: { color: hex(p.CorBorda) } }, radius: 8, show: true }],
          title:      [{ fontColor: { solid: { color: hex(p.CorTexto) } }, fontSize: 13, fontFamily: "Segoe UI Semibold" }],
          // A grade some de propósito: linha de grade compete com o dado.
          // Quem precisa do valor exato lê o rótulo, não conta pixels.
          grid:       [{ show: false }],
        },
      },
      page: { "*": { background: [{ color: { solid: { color: hex(p.CorFundo) } }, transparency: 0 }] } },
      tableEx: {
        "*": {
          grid: [{ gridVertical: false, gridHorizontal: true, gridHorizontalColor: { solid: { color: hex(p.CorBorda) } }, rowPadding: 6 }],
          columnHeaders: [{ fontColor: { solid: { color: hex(p.CorTextoSuave) } }, backColor: { solid: { color: hex(p.CorFundo) } }, fontSize: 10 }],
        },
      },
    },
  };

  const arquivo = join(DESTINO, `atlas-${estilo.toLowerCase()}.json`);
  writeFileSync(arquivo, JSON.stringify(tema, null, 2) + "\n");
  console.log(`${arquivo}  (${tema.dataColors.length} cores de série)`);
}
