/**
 * Palco WebGL da landing do Atlas Insight AI.
 *
 * A promessa do produto é "dado bruto vira entendimento vira painel". Em vez
 * de ilustrar isso com um vídeo, a página faz a coisa acontecer: um campo de
 * partículas se reorganiza conforme o leitor rola — nuvem dispersa, depois
 * malha estruturada, depois gráfico. A rolagem não dispara uma animação; ela
 * É a animação, e por isso o leitor controla o ritmo.
 *
 * Sem biblioteca: WebGL2 e GLSL escritos à mão. Numa página de vendas o peso
 * é conversão — 300 KB de engine 3D para desenhar pontos seria pagar caro por
 * abstração que não se usa. E sem CDN não existe o modo de falha "a página
 * abriu quebrada porque um terceiro caiu".
 */

const VERTEX_SHADER = `#version 300 es
precision highp float;

in vec3 aCloud;
in vec3 aGrid;
in vec3 aGraph;
in vec3 aChart;
// x: aleatório por partícula · y: atraso no morph · z: matiz · w: tamanho
in vec4 aSeed;

uniform mat4 uProjection;
uniform mat4 uView;
uniform float uMorph;       // 0 nuvem · 1 malha · 2 relacionamentos · 3 painel
uniform float uTime;
uniform float uPixelScale;

out float vTone;
out float vFade;

/**
 * Cada partícula parte no seu tempo. Movendo-se todas juntas, o enxame vira
 * um bloco rígido deslizando; o atraso é o que dá a leitura de matéria viva.
 */
float staggered(float progress, float delay) {
  const float SPREAD = 0.42;
  return clamp((progress - delay * SPREAD) / (1.0 - SPREAD), 0.0, 1.0);
}

void main() {
  vec3 position;
  float local;

  if (uMorph < 1.0) {
    local = staggered(uMorph, aSeed.y);
    position = mix(aCloud, aGrid, smoothstep(0.0, 1.0, local));
  } else if (uMorph < 2.0) {
    local = staggered(uMorph - 1.0, aSeed.y);
    position = mix(aGrid, aGraph, smoothstep(0.0, 1.0, local));
  } else {
    local = staggered(uMorph - 2.0, aSeed.y);
    position = mix(aGraph, aChart, smoothstep(0.0, 1.0, local));
  }

  // Inquietação máxima no meio da transição e zero quando a forma assenta:
  // a passagem vira um sopro em vez de um teleporte, e a forma final fica
  // nítida o bastante para ser lida como malha ou como gráfico.
  float unrest = sin(local * 3.14159265);
  float t = uTime * 0.55 + aSeed.x * 31.4;
  vec3 drift = vec3(sin(t), cos(t * 1.27), sin(t * 0.73));
  position += drift * (0.022 + unrest * 1.05) * (0.35 + aSeed.x * 0.65);

  vec4 viewPosition = uView * vec4(position, 1.0);
  gl_Position = uProjection * viewPosition;

  float depth = max(-viewPosition.z, 0.001);
  gl_PointSize = (aSeed.w * uPixelScale) / depth;

  vTone = aSeed.z;
  // Sem queda por profundidade o volume vira uma parede opaca de luz.
  float depthFade = clamp(1.0 - (depth - 14.0) / 34.0, 0.18, 1.0);
  vFade = depthFade * (0.46 + unrest * 0.34);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in float vTone;
in float vFade;

uniform vec3 uCool;
uniform vec3 uWarm;
uniform float uOpacity;

out vec4 fragColor;

void main() {
  // Ponto redondo com borda suave. Quadrado nítido denuncia o gl_POINT e
  // destrói a leitura de partícula.
  vec2 offset = gl_PointCoord - 0.5;
  float radial = dot(offset, offset);
  if (radial > 0.25) discard;

  float core = smoothstep(0.25, 0.0, radial);
  vec3 color = mix(uCool, uWarm, vTone);
  // Blend aditivo: o alfa é o peso da contribuição, não uma opacidade.
  fragColor = vec4(color * vFade, core * uOpacity * vFade);
}`;

/* ---------------------------------------------------------------- matrizes */

function perspective(fovRadians, aspect, near, far) {
  const f = 1 / Math.tan(fovRadians / 2);
  const range = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (near + far) * range, -1,
    0, 0, near * far * range * 2, 0,
  ]);
}

/**
 * view = translação(offset, -distância) · rotaçãoX(pitch) · rotaçãoY(yaw).
 * O deslocamento tira o campo de trás do texto: no desktop ele vai para o
 * lado da coluna de leitura; no celular, onde a coluna ocupa a largura toda,
 * ele desce para baixo da cópia. Em nenhum dos dois o brilho disputa atenção
 * com o argumento de venda.
 */
function orbitView(yaw, pitch, distance, offsetX, offsetY) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cx = Math.cos(pitch), sx = Math.sin(pitch);
  return new Float32Array([
    cy, sx * sy, -cx * sy, 0,
    0, cx, sx, 0,
    sy, -sx * cy, cx * cy, 0,
    offsetX, offsetY, -distance, 1,
  ]);
}

/* ------------------------------------------------------------------ formas */

/** Nuvem: dados brutos, sem ordem. Raio com expoente para não ficar oco. */
function buildCloud(count, random) {
  const data = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const radius = 8.4 * (0.42 + 0.58 * Math.pow(random(), 0.5));
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    const sinPhi = Math.sin(phi);
    data[i * 3] = radius * sinPhi * Math.cos(theta) * 1.15;
    data[i * 3 + 1] = radius * Math.cos(phi) * 0.82;
    data[i * 3 + 2] = radius * sinPhi * Math.sin(theta) * 0.85;
  }
  return data;
}

/**
 * Malha: a mesma matéria, agora com linhas e colunas.
 *
 * Distribuir uma partícula por sítio da grade não funciona — a nuvem precisa
 * de dezenas de milhares de pontos, e uma grade com dezenas de milhares de
 * sítios fica fina demais para o olho separar: vira ruído. Aqui as partículas
 * se agrupam em CÉLULAS, várias por célula, e cada célula lê como um dado.
 * As calhas a cada bloco são o que faz o olho reconhecer "tabela".
 */
function buildGrid(count, random) {
  const data = new Float32Array(count * 3);
  const columns = 38;
  const rows = 21;
  const cells = columns * rows;
  const perCell = Math.max(1, Math.floor(count / cells));

  const columnBlock = 6;
  const rowBlock = 4;
  const GUTTER = 1.6;
  const spanUnits = (n, block) => n + (Math.ceil(n / block) - 1) * GUTTER;
  const totalX = spanUnits(columns, columnBlock);
  const totalY = spanUnits(rows, rowBlock);

  // Célula compacta: o raio tem de ficar bem abaixo do passo da grade, senão
  // as células se tocam e a estrutura some.
  const stepX = 19.8 / totalX;
  const jitter = stepX * 0.34;

  for (let i = 0; i < count; i++) {
    const cell = Math.floor(i / perCell) % cells;
    const column = cell % columns;
    const row = Math.floor(cell / columns);

    const unitX = column + Math.floor(column / columnBlock) * GUTTER;
    const unitY = row + Math.floor(row / rowBlock) * GUTTER;

    data[i * 3] = (unitX / totalX - 0.5) * 19.8 + (random() - 0.5) * jitter;
    data[i * 3 + 1] = (unitY / totalY - 0.5) * 10.4 + (random() - 0.5) * jitter;
    // Quase plana: profundidade empilha células na mesma linha de visão e
    // devolve o borrão que a estrutura veio resolver.
    data[i * 3 + 2] = (random() - 0.5) * 0.5;
  }
  return data;
}

/**
 * Relacionamentos: nós ligados por arestas.
 *
 * É a forma mais literal das quatro — o produto realmente detecta chaves e
 * liga tabelas, e é isso que o leitor vê enquanto lê sobre o modelo. As
 * arestas são feitas de PONTOS ao longo do segmento, não de linhas: mantém
 * um único shader e uma única chamada de desenho, e de longe uma fileira
 * densa de pontos lê como linha do mesmo jeito.
 *
 * O conjunto de destaque (o mesmo que vira a curva de tendência no gráfico)
 * assume aqui o papel de NÓ. Reaproveitar o papel entre as formas evita ter
 * de carregar cor e tamanho por estado — o brilho já vem certo de graça.
 */
function buildGraph(count, random, highlightStart) {
  const data = new Float32Array(count * 3);
  const NODE_COUNT = 150;

  const nodes = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    nodes.push([
      (random() - 0.5) * 17.4,
      (random() - 0.5) * 10.2,
      (random() - 0.5) * 4.2,
    ]);
  }

  // Cada nó se liga aos três mais próximos. Ligar por proximidade — e não ao
  // acaso — é o que produz o desenho de constelação; arestas aleatórias
  // cruzam a cena inteira e viram emaranhado.
  const edges = [];
  const seen = new Set();
  for (let i = 0; i < NODE_COUNT; i++) {
    const distances = [];
    for (let j = 0; j < NODE_COUNT; j++) {
      if (i === j) continue;
      const dx = nodes[i][0] - nodes[j][0];
      const dy = nodes[i][1] - nodes[j][1];
      const dz = nodes[i][2] - nodes[j][2];
      distances.push([dx * dx + dy * dy + dz * dz, j]);
    }
    distances.sort((a, b) => a[0] - b[0]);
    for (const [, j] of distances.slice(0, 3)) {
      const key = i < j ? `${i}:${j}` : `${j}:${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([i, j, Math.sqrt(distances.find((d) => d[1] === j)[0])]);
    }
  }

  // Partículas por aresta em proporção ao comprimento: sem isso as arestas
  // curtas ficam saturadas e as longas, pontilhadas.
  const totalLength = edges.reduce((sum, e) => sum + e[2], 0) || 1;
  const cumulative = [];
  let running = 0;
  for (const edge of edges) {
    running += edge[2] / totalLength;
    cumulative.push(running);
  }

  // Nem toda partícula vai para uma aresta. Com todas nas linhas, as ligações
  // viram tubos sólidos e ofuscam os nós — que são o assunto. Um terço fica
  // como poeira no volume, dando profundidade e afinando o traço.
  const dustEnd = Math.floor(highlightStart * 0.34);
  for (let i = 0; i < dustEnd; i++) {
    data[i * 3] = (random() - 0.5) * 19.5;
    data[i * 3 + 1] = (random() - 0.5) * 11.4;
    data[i * 3 + 2] = (random() - 0.5) * 6.5;
  }

  const onEdges = highlightStart - dustEnd;
  for (let i = dustEnd; i < highlightStart; i++) {
    const pick = (i - dustEnd + 0.5) / onEdges;
    let index = 0;
    while (index < edges.length - 1 && pick > cumulative[index]) index++;
    const [from, to] = edges[index];
    const t = random();
    data[i * 3] = nodes[from][0] + (nodes[to][0] - nodes[from][0]) * t + (random() - 0.5) * 0.05;
    data[i * 3 + 1] = nodes[from][1] + (nodes[to][1] - nodes[from][1]) * t + (random() - 0.5) * 0.05;
    data[i * 3 + 2] = nodes[from][2] + (nodes[to][2] - nodes[from][2]) * t + (random() - 0.5) * 0.05;
  }

  const perNode = Math.max(1, Math.floor((count - highlightStart) / NODE_COUNT));
  for (let i = highlightStart; i < count; i++) {
    const node = nodes[Math.floor((i - highlightStart) / perNode) % NODE_COUNT];
    data[i * 3] = node[0] + (random() - 0.5) * 0.28;
    data[i * 3 + 1] = node[1] + (random() - 0.5) * 0.28;
    data[i * 3 + 2] = node[2] + (random() - 0.5) * 0.28;
  }
  return data;
}

/** Perfil das barras: uma tendência de alta com variação, não um degrau. */
function barHeights(bars) {
  const heights = new Float32Array(bars);
  for (let i = 0; i < bars; i++) {
    const t = i / (bars - 1);
    const h = 0.26 + 0.6 * t + 0.14 * Math.sin(i * 1.9) + 0.07 * Math.sin(i * 0.7 + 1.2);
    heights[i] = Math.min(1, Math.max(0.14, h));
  }
  return heights;
}

/**
 * Gráfico: barras mais uma curva de tendência acima delas. As partículas são
 * distribuídas em proporção à altura de cada barra, senão as barras baixas
 * ficam densas e as altas, ralas — e a leitura do valor se perde.
 */
function buildChart(count, random) {
  const data = new Float32Array(count * 3);
  const BARS = 26;
  const heights = barHeights(BARS);
  const SPAN = 16.6;
  const BASE = -5.1;
  const SCALE = 7.6;
  const barWidth = (SPAN / BARS) * 0.62;

  const barCount = highlightStart(count);
  const lineCount = count - barCount;

  const total = heights.reduce((sum, h) => sum + h, 0);
  const cumulative = new Float32Array(BARS);
  let running = 0;
  for (let i = 0; i < BARS; i++) {
    running += heights[i] / total;
    cumulative[i] = running;
  }

  for (let i = 0; i < barCount; i++) {
    const pick = (i + 0.5) / barCount;
    let bar = 0;
    while (bar < BARS - 1 && pick > cumulative[bar]) bar++;
    const centerX = (bar / (BARS - 1) - 0.5) * SPAN;
    data[i * 3] = centerX + (random() - 0.5) * barWidth;
    data[i * 3 + 1] = BASE + random() * heights[bar] * SCALE;
    data[i * 3 + 2] = (random() - 0.5) * 2.2;
  }

  for (let i = barCount; i < count; i++) {
    const t = (i - barCount) / Math.max(1, lineCount - 1);
    const position = t * (BARS - 1);
    const index = Math.min(BARS - 2, Math.floor(position));
    const fraction = position - index;
    const height = heights[index] * (1 - fraction) + heights[index + 1] * fraction;
    data[i * 3] = (t - 0.5) * SPAN;
    data[i * 3 + 1] = BASE + height * SCALE + 0.95 + (random() - 0.5) * 0.16;
    data[i * 3 + 2] = (random() - 0.5) * 0.5;
  }
  return data;
}

/** Fatia de partículas que carrega o destaque em todas as formas. */
const HIGHLIGHT_SHARE = 0.11;

function highlightStart(count) {
  return count - Math.floor(count * HIGHLIGHT_SHARE);
}

/** Semente por partícula: aleatoriedade, atraso, matiz e tamanho. */
function buildSeeds(count, random, chart) {
  const data = new Float32Array(count * 4);
  const lineStart = highlightStart(count);
  for (let i = 0; i < count; i++) {
    const isTrendLine = i >= lineStart;
    data[i * 4] = random();
    data[i * 4 + 1] = random();
    // A curva de tendência puxa para o tom quente: é o destaque do gráfico.
    data[i * 4 + 2] = isTrendLine ? 1 : Math.min(1, Math.max(0, (chart[i * 3 + 1] + 5.1) / 9)) * 0.55;
    data[i * 4 + 3] = isTrendLine ? 5.0 : 2.2 + random() * 2.6;
  }
  return data;
}

/* --------------------------------------------------------------- utilidades */

/** Aleatório com semente: a mesma composição em toda visita e todo teste. */
function seededRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) || "falha ao compilar shader");
  }
  return shader;
}

function attribute(gl, program, name, data, size) {
  const location = gl.getAttribLocation(program, name);
  if (location < 0) return;
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
}

function readColor(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  const hex = value.replace("#", "");
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  const int = parseInt(full, 16);
  return [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255];
}

/* ------------------------------------------------------------------- palco */

export function mountStage(canvas) {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    depth: false,
    powerPreference: "high-performance",
  });
  // Sem WebGL2 a página não fica quebrada: o CSS de reserva assume e o
  // conteúdo — que é o que vende — continua inteiro.
  if (!gl) return null;

  const coarse = matchMedia("(pointer: coarse)").matches;
  const small = innerWidth < 900;
  const count = small || coarse ? 18000 : 60000;
  const maxDpr = small || coarse ? 1.5 : 2;

  const random = seededRandom(20260901);
  const chart = buildChart(count, random);
  const cloud = buildCloud(count, random);
  const grid = buildGrid(count, random);
  const graph = buildGraph(count, random, highlightStart(count));
  const seeds = buildSeeds(count, random, chart);

  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) || "falha ao ligar o programa");
  }
  gl.useProgram(program);

  attribute(gl, program, "aCloud", cloud, 3);
  attribute(gl, program, "aGrid", grid, 3);
  attribute(gl, program, "aGraph", graph, 3);
  attribute(gl, program, "aChart", chart, 3);
  attribute(gl, program, "aSeed", seeds, 4);

  const uniform = (name) => gl.getUniformLocation(program, name);
  const uProjection = uniform("uProjection");
  const uView = uniform("uView");
  const uMorph = uniform("uMorph");
  const uTime = uniform("uTime");
  const uPixelScale = uniform("uPixelScale");
  const uOpacity = uniform("uOpacity");

  gl.uniform3fv(uniform("uCool"), readColor("--accent", "#00E7C4"));
  gl.uniform3fv(uniform("uWarm"), readColor("--accent-warm", "#FFE9A8"));

  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

  let width = 0;
  let height = 0;
  let dpr = 1;

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, maxDpr);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniformMatrix4fv(uProjection, false, perspective(Math.PI / 4, width / height, 0.1, 120));
    // Ponto medido em pixels do dispositivo: sem isso a partícula encolhe em
    // tela retina e some no celular.
    gl.uniform1f(uPixelScale, 38 * dpr * Math.min(1.35, Math.max(0.75, height / 900)));
  }

  const state = { morph: 0, targetMorph: 0, opacity: 0, targetOpacity: 0, pointerX: 0, pointerY: 0 };
  // Numa tela estreita não há coluna livre para empurrar o campo: ele fica
  // centrado e o véu vertical é que garante o contraste do texto.
  // A nuvem é um orbe compacto e cabe bem à direita; o gráfico é largo e no
  // mesmo lugar sairia pela borda. O deslocamento acompanha a forma.
  const narrow = small || coarse;
  const baseOffsetX = narrow ? 0 : 6.6;
  const baseOffsetY = narrow ? -7.4 : 0;

  function draw(time) {
    const reach = state.morph / 3;
    // A nuvem é vista de viés; o gráfico se apruma de frente para o leitor,
    // que é como se lê um painel.
    const yaw = (0.52 - reach * 0.52) + state.pointerX * 0.16 + Math.sin(time * 0.00008) * 0.05;
    const pitch = 0.06 + state.pointerY * 0.12 - reach * 0.03;
    gl.uniformMatrix4fv(
      uView,
      false,
      orbitView(yaw, pitch, 25.5 - reach * 1.8, baseOffsetX * (1 - reach * 0.62), baseOffsetY)
    );
    gl.uniform1f(uMorph, state.morph);
    gl.uniform1f(uTime, time * 0.001);
    gl.uniform1f(uOpacity, state.opacity);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, count);
  }

  // Estado legível de fora, como PROPRIEDADE e não como atributo: o teste
  // automatizado confere que a forma na tela é a que a rolagem pediu, sem
  // pagar uma escrita no DOM a cada quadro.
  canvas.stageState = state;

  return {
    resize,
    draw,
    state,
    count,
    dispose() {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}

/* ------------------------------------------------------- rolagem e ciclo */

/**
 * A rolagem escolhe a forma. As âncoras são as próprias seções do texto, para
 * que a imagem e o argumento cheguem juntos: a malha se forma quando se fala
 * em entender a estrutura, o gráfico quando se fala em painel.
 */
function morphFromScroll(anchors) {
  const focus = scrollY + innerHeight * 0.55;
  const points = anchors.map((el, index) => {
    const box = el.getBoundingClientRect();
    let position = box.top + scrollY + box.height * 0.35;
    // A primeira forma tem de estar completa quando a página abre. Sem esta
    // âncora presa ao topo, o ponto de leitura já nasce depois dela e o
    // visitante encontra a nuvem no meio da transformação — perdendo
    // justamente o antes/depois que o efeito existe para contar.
    if (index === 0) position = Math.max(position, innerHeight * 0.55);
    return { value: Number(el.dataset.stage), position };
  });

  if (focus <= points[0].position) return points[0].value;
  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i];
    const to = points[i + 1];
    if (focus <= to.position) {
      const span = Math.max(1, to.position - from.position);
      return from.value + ((focus - from.position) / span) * (to.value - from.value);
    }
  }
  return points[points.length - 1].value;
}

export function runStage() {
  const canvas = document.getElementById("stage");
  const anchors = [...document.querySelectorAll("[data-stage]")].sort(
    (a, b) => Number(a.dataset.stage) - Number(b.dataset.stage)
  );
  if (!canvas || anchors.length < 2) return;

  let stage;
  try {
    stage = mountStage(canvas);
  } catch (error) {
    console.warn("[stage] WebGL indisponível:", error);
  }
  if (!stage) return;

  document.documentElement.classList.add("has-stage");

  const stillPreferred = matchMedia("(prefers-reduced-motion: reduce)");
  const last = anchors[anchors.length - 1];

  function syncTargets() {
    stage.state.targetMorph = Math.max(0, Math.min(3, morphFromScroll(anchors)));
    // O palco se apaga quando o texto de preço começa: ali o leitor decide,
    // e movimento atrás de uma tabela de preços atrapalha em vez de encantar.
    const box = last.getBoundingClientRect();
    const end = box.top + scrollY + box.height;
    const fade = innerHeight * 0.45;
    stage.state.targetOpacity = Math.max(0, Math.min(1, (end - scrollY) / fade));
  }

  let frame = 0;
  let visible = true;
  let running = false;
  let previousTime = 0;

  function tick(time) {
    frame = 0;
    // Perseguir o alvo em vez de saltar até ele dá peso ao movimento e
    // absorve a rolagem picotada do trackpad. O decaimento é por TEMPO, não
    // por quadro: a 30 fps o campo chegaria atrasado à forma e a 120 fps,
    // cedo demais — o mesmo movimento tem de valer em qualquer máquina.
    const delta = previousTime ? Math.min(0.1, (time - previousTime) / 1000) : 0.016;
    previousTime = time;
    const ease = stillPreferred.matches ? 1 : 1 - Math.exp(-delta * 4.6);
    stage.state.morph += (stage.state.targetMorph - stage.state.morph) * ease;
    stage.state.opacity += (stage.state.targetOpacity - stage.state.opacity) * Math.min(1, ease * 2.5);

    stage.draw(stillPreferred.matches ? 0 : time);

    const settled =
      Math.abs(stage.state.targetMorph - stage.state.morph) < 0.0004 &&
      Math.abs(stage.state.targetOpacity - stage.state.opacity) < 0.0015;
    // Parado e sem movimento pedido, o laço para: numa aba aberta a tarde
    // inteira, gastar GPU para redesenhar o mesmo quadro é só queimar bateria.
    if (visible && stage.state.opacity > 0.002 && !(settled && stillPreferred.matches)) {
      running = true;
      frame = requestAnimationFrame(tick);
    } else {
      running = false;
    }
  }

  function wake() {
    if (!running && visible) {
      running = true;
      frame = requestAnimationFrame(tick);
    }
  }

  function onScroll() {
    syncTargets();
    wake();
  }

  function onResize() {
    stage.resize();
    syncTargets();
    wake();
  }

  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onResize);
  addEventListener("orientationchange", onResize);

  if (!stillPreferred.matches) {
    addEventListener(
      "pointermove",
      (event) => {
        stage.state.pointerX = (event.clientX / innerWidth - 0.5) * 2;
        stage.state.pointerY = (event.clientY / innerHeight - 0.5) * 2;
        wake();
      },
      { passive: true }
    );
  }

  document.addEventListener("visibilitychange", () => {
    visible = !document.hidden;
    if (visible) wake();
    else if (frame) cancelAnimationFrame(frame);
  });

  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    running = false;
    document.documentElement.classList.remove("has-stage");
  });

  stage.resize();
  syncTargets();
  stage.state.morph = stage.state.targetMorph;
  wake();
}

/* ------------------------------------------------------------- revelações */

/**
 * Texto que se materializa. O corte é por PALAVRA, não por letra: letra a
 * letra vira decoração e atrapalha leitores de tela e seleção de texto.
 */
export function runReveals() {
  const stillPreferred = matchMedia("(prefers-reduced-motion: reduce)");
  const targets = document.querySelectorAll("[data-reveal]");
  // Avisa o HTML que a revelação assumiu, para o plano B dele não disparar.
  document.documentElement.classList.add("reveals-ready");
  if (targets.length === 0) return;

  if (stillPreferred.matches || !("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("is-revealed"));
    return;
  }

  for (const element of targets) {
    if (element.dataset.reveal !== "words") continue;
    // Índices das palavras que levam a cor de destaque. Vive no HTML e não em
    // <em> dentro do texto porque o corte por palavra reescreve o conteúdo —
    // marcação interna seria destruída na primeira execução.
    const accent = new Set((element.dataset.accent || "").split(",").filter(Boolean).map(Number));
    const words = element.textContent.trim().split(/\s+/);
    element.textContent = "";
    words.forEach((word, index) => {
      const span = document.createElement("span");
      span.className = accent.has(index) ? "word accent" : "word";
      span.style.setProperty("--i", String(index));
      span.textContent = word;
      element.append(span, document.createTextNode(" "));
    });
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.15 }
  );
  targets.forEach((el) => observer.observe(el));
}

runReveals();
runStage();
