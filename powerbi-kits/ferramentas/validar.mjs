#!/usr/bin/env node
/**
 * Confere as armadilhas do HANDOFF §5 em qualquer .dax do kit.
 *
 * Existe porque as principais falham EM SILÊNCIO: sem erro, sem aviso, só
 * a célula vazia no Power BI. Descobrir na tela custa uma tarde por
 * medida; descobrir aqui custa um segundo.
 *
 * A parte que importa é NÃO gritar à toa. A primeira versão acusou 34
 * erros no kit original — todos falsos, porque ela olhava só a linha da
 * concatenação e ignorava que a variável já fora protegida na definição.
 * Um linter ruidoso é pior que nenhum: vira ruído e param de ler.
 *
 * Uso:  node validar.mjs <arquivo.dax | pasta>...
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

/**
 * Atributos cujo valor é geometria e que NÃO aceitam vírgula decimal.
 *
 * `points`, `d`, `transform` e `viewBox` ficam de fora: a vírgula ali é
 * estrutural (separa x de y, ou argumentos), então proibi-la seria
 * proibir SVG correto. Nesses, o risco só existe se um decimal cru for
 * concatenado — e isso é pego pela regra da variável não protegida.
 */
const GEOMETRIA_SEM_VIRGULA = [
  "x", "y", "cx", "cy", "r", "rx", "ry", "x1", "y1", "x2", "y2",
  "width", "height", "offset", "stroke-width", "font-size",
];

/** Atributos que aceitam vírgula estrutural mas não decimal cru. */
const GEOMETRIA_COM_VIRGULA = ["points", "d", "transform", "viewBox", "stroke-dasharray"];

// FORMAT com locale, ou qualquer arredondamento.
//
// A janela [\s\S]{0,300}? entre FORMAT( e "en-US" é deliberada: a versão
// anterior usava [^)]*, que exigia nenhum parêntese no meio — e quebrava no
// caso mais comum de todos, FORMAT( DIVIDE( ... ), "0.0", "en-US" ).
const PROTETORES = /FORMAT\s*\([\s\S]{0,300}?"en-US"|ROUND\s*\(|INT\s*\(|CEILING\s*\(|FLOOR\s*\(|TRUNC\s*\(/;

/**
 * A variável já está segura para entrar em geometria?
 *
 * Segura quando: passou por FORMAT com locale, por arredondamento, é um
 * literal de texto (o autor escreveu à mão) ou é um inteiro literal.
 */
function definicoesSeguras(texto) {
  const seguras = new Set();
  const inseguras = new Set();
  const corpos = new Map();

  // Colunas criadas por ADDCOLUMNS/SELECTCOLUMNS já formatadas com locale.
  // O sparkline calcula "@X" e "@Y" com FORMAT(...,"en-US") e depois lê essas
  // colunas — quem consome uma coluna assim herda a proteção dela.
  const colunasSeguras = new Set();
  const reCol = /"(@\w+)"\s*,\s*([\s\S]{0,240}?)(?=\n\s*"@|\n\s*\)|$)/g;
  let c;
  while ((c = reCol.exec(texto)) !== null) {
    if (PROTETORES.test(c[2])) colunasSeguras.add(c[1]);
  }

  const re = /VAR\s+(_\w+)\s*=\s*([\s\S]*?)(?=\n\s*(?:VAR\s+_|RETURN\b)|$)/g;
  let m;
  while ((m = re.exec(texto)) !== null) {
    const [, nome, corpo] = m;
    const limpo = corpo.replace(/--.*$/gm, "").trim();

    const literalTexto = /^"[^"]*"$/.test(limpo);
    const literalInteiro = /^-?\d+$/.test(limpo);
    const somaDeInteiros = /^[\s\d+\-*()]+$/.test(limpo);

    // IF/SWITCH cujas saídas são TODAS literais de texto: o autor escreveu
    // a geometria à mão, então a vírgula ali é estrutural e proposital.
    const semLiterais = limpo.replace(/"[^"]*"/g, "");
    const soLiterais =
      /^(IF|SWITCH)\s*\(/i.test(limpo) && /"/.test(limpo) && !/[\d]/.test(semLiterais);

    // Lê apenas colunas já formatadas com locale.
    const colunasLidas = [...limpo.matchAll(/\[(@\w+)\]/g)].map((x) => x[1]);
    const soColunasSeguras =
      colunasLidas.length > 0 && colunasLidas.every((col) => colunasSeguras.has(col));

    if (PROTETORES.test(limpo) || literalTexto || literalInteiro || somaDeInteiros
        || soLiterais || soColunasSeguras) {
      seguras.add(nome);
    } else {
      inseguras.add(nome);
      corpos.set(nome, limpo);
    }
  }

  // Propagação transitiva até o ponto fixo.
  //
  // Uma variável que só COMBINA outras já seguras também é segura: o
  // sparkline monta _Area juntando _H, _W e _Pontos, e os três já passaram
  // por FORMAT ou são inteiros. Sem este passo o validador acusaria a
  // concatenação final de um código correto — e um linter que grita à toa
  // vira ruído.
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const nome of [...inseguras]) {
      const corpo = corpos.get(nome) ?? "";
      const refs = [...corpo.matchAll(/(_\w+)/g)].map((x) => x[1]).filter((r) => r !== nome);
      const semRefs = corpo.replace(/_\w+/g, "").replace(/"[^"]*"/g, "");
      // Só combina variáveis seguras, texto literal e pontuação de concatenação.
      const soCombina = refs.length > 0
        && refs.every((r) => seguras.has(r))
        && !/[A-Za-z]{2,}\s*\(/.test(semRefs);
      if (soCombina) {
        seguras.add(nome);
        inseguras.delete(nome);
        mudou = true;
      }
    }
  }

  return { seguras, inseguras };
}

const problemas = [];
const avisos = [];

function checar(arquivo) {
  const texto = readFileSync(arquivo, "utf8");
  const { inseguras } = definicoesSeguras(texto);
  const dataUri = /data:image\/svg\+xml/.test(texto);
  const linhas = texto.split("\n");

  linhas.forEach((linha, i) => {
    const n = i + 1;
    const codigo = linha.replace(/--.*$/, "").replace(/\/\/.*$/, "");
    const erro = (msg) => problemas.push({ arquivo, n, msg, linha: linha.trim() });

    // §5.2 — "#" dentro do data URI pode truncar a string inteira.
    if (dataUri && /#[0-9A-Fa-f]{3,8}\b/.test(codigo) && !/%23/.test(codigo)) {
      erro('cor em "#" dentro de SVG data URI — use rgb(...) ou %23 (§5.2)');
    }

    // §5.1 — a que mais mata: decimal cru vira vírgula em pt-BR e o parser
    // descarta o elemento sem avisar.
    for (const attr of [...GEOMETRIA_SEM_VIRGULA, ...GEOMETRIA_COM_VIRGULA]) {
      const re = new RegExp(`\\b${attr}='"\\s*&\\s*(_\\w+)`, "g");
      let m;
      while ((m = re.exec(codigo)) !== null) {
        if (inseguras.has(m[1])) {
          erro(`"${attr}" recebe ${m[1]}, que não passou por FORMAT(...,"en-US") nem por arredondamento (§5.1)`);
        }
      }
    }
  });

  // §5.4 — sem a categoria de dados o Power BI mostra o texto cru do SVG.
  // É o erro nº 1 de quem compra o kit, então o lembrete é obrigatório.
  if (dataUri && !/URL da Imagem/i.test(texto)) {
    avisos.push({ arquivo, msg: 'falta "Categoria de dados: URL da Imagem" no cabeçalho (§5.4)' });
  }

  // §5.6 — string longa demais é truncada em alguns contextos.
  const maior = Math.max(...linhas.map((l) => l.length));
  if (maior > 2000) avisos.push({ arquivo, msg: `linha de ${maior} caracteres (§5.6)` });
}

function coletar(alvo) {
  if (statSync(alvo).isDirectory()) readdirSync(alvo).forEach((f) => coletar(join(alvo, f)));
  else if (extname(alvo) === ".dax") checar(alvo);
}

const alvos = process.argv.slice(2);
if (alvos.length === 0) {
  console.error("uso: node validar.mjs <arquivo.dax | pasta>...");
  process.exit(2);
}
alvos.forEach(coletar);

for (const p of problemas) console.log(`ERRO   ${p.arquivo}:${p.n}  ${p.msg}\n       ${p.linha}`);
for (const a of avisos) console.log(`aviso  ${a.arquivo}  ${a.msg}`);
console.log(`\n${problemas.length} erro(s), ${avisos.length} aviso(s).`);
process.exit(problemas.length > 0 ? 1 : 0);
