#!/usr/bin/env node
/**
 * Gera as 5 variações de estilo de cada medida, trocando só o bloco de
 * tokens do topo.
 *
 * Sem isto, produzir 10 kits × 5 estilos seria editar centenas de linhas à
 * mão — e uma cor esquecida quebra o estilo em silêncio, porque o SVG não
 * avisa. Aqui a troca é mecânica e conferida: se um token do bloco não
 * existir na paleta, o gerador PARA em vez de emitir um arquivo com a cor
 * antiga misturada.
 *
 * Uso:  node gerar-estilos.mjs <pasta-do-kit>
 *       (lê kits/<nome>/fonte/*.dax  e escreve  kits/<nome>/<ESTILO>/*.dax)
 */
import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const PALETAS = JSON.parse(readFileSync(join(AQUI, "..", "tokens", "paletas.json"), "utf8"));
const ESTILOS = Object.keys(PALETAS).filter((k) => !k.startsWith("_"));

/**
 * Token de cor:  VAR _CorFundo = "rgb(255,255,255)"
 * Componente:    VAR _RampaIniR = 241
 *
 * Ambos GLOBAIS de propósito. A versão anterior ancorava em ^...$ e trocava
 * só a primeira ocorrência da linha — com três VAR na mesma linha, R virava
 * a cor nova e G e B ficavam a antiga. Cor pela metade é o pior resultado:
 * parece pronto e sai errado na tela.
 */
const TOKEN = /(VAR\s+_(\w+)\s*=\s*)"rgb\([\d, ]+\)"/g;
const COMPONENTE = /(VAR\s+_(\w+)([RGB])\s*=\s*)(\d+)/g;

function aplicar(texto, estilo, paleta, arquivo) {
  const faltando = new Set();
  const saida = texto
    .replace(COMPONENTE, (inteiro, prefixo, token, canal) => {
      if (!(token in paleta)) { faltando.add(token); return inteiro; }
      const idx = { R: 0, G: 1, B: 2 }[canal];
      return `${prefixo}${paleta[token].split(",")[idx].trim()}`;
    })
    .replace(TOKEN, (inteiro, prefixo, token) => {
      if (!(token in paleta)) { faltando.add(token); return inteiro; }
      return `${prefixo}"rgb(${paleta[token]})"`;
    });

  if (faltando.size > 0) {
    // Parar em vez de emitir: um arquivo com metade das cores trocadas é o
    // pior resultado possível — parece pronto e sai errado na tela.
    throw new Error(
      `${arquivo} · estilo ${estilo}: a paleta não define ${[...faltando].join(", ")}.`
    );
  }
  return saida;
}

const kit = process.argv[2];
if (!kit) { console.error("uso: node gerar-estilos.mjs <pasta-do-kit>"); process.exit(2); }

const fonte = join(kit, "fonte");
if (!existsSync(fonte)) { console.error(`sem pasta "fonte" em ${kit}`); process.exit(2); }

const arquivos = readdirSync(fonte).filter((f) => f.endsWith(".dax")).sort();
let escritos = 0;

for (const estilo of ESTILOS) {
  const destino = join(kit, estilo);
  mkdirSync(destino, { recursive: true });
  for (const arquivo of arquivos) {
    const texto = readFileSync(join(fonte, arquivo), "utf8");
    const gerado = aplicar(texto, estilo, PALETAS[estilo], arquivo);
    writeFileSync(join(destino, arquivo), gerado);
    escritos++;
  }
}

console.log(`${escritos} arquivo(s): ${arquivos.length} medida(s) × ${ESTILOS.length} estilo(s).`);
console.log(`estilos: ${ESTILOS.join(", ")}`);
