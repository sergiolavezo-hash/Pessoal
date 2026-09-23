/**
 * ATLAS — cartografia de dados · campo de partículas
 *
 * Uma partícula = um dado. A MESMA partícula atravessa a página inteira:
 * o shader interpola entre as posições que ela ocupa em cada território.
 * Não são cenas diferentes — é um território só, visto de pontos
 * diferentes do ciclo.
 *
 * O ciclo fecha: depois de DECIDE o campo volta à sua forma de repouso,
 * porque a decisão gera dado novo e a captura recomeça.
 *
 * Por que THREE.Points e não InstancedMesh: cada dado é um ponto de
 * alguns pixels, sem geometria própria. Points resolve com um vértice por
 * partícula; instancing exigiria um quad para o mesmo resultado.
 */
import * as THREE from 'three';
import { color3d } from '../lib/tokens';

export interface ParticleField {
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
  dispose(): void;
}

/** Abaixo desta largura a composição muda — não só encolhe. */
export const PORTRAIT_BREAKPOINT = 900;

const SOURCE_COUNT = 8;

/** As oito fontes de onde o dado entra. O texto diz quais são. */
export function sourcePositions(portrait: boolean): THREE.Vector3[] {
  const rx = portrait ? 2.5 : 5.2;
  const ry = portrait ? 3.4 : 2.3;
  return Array.from({ length: SOURCE_COUNT }, (_, s) => {
    const a = (s / SOURCE_COUNT) * Math.PI * 2 - Math.PI / 2;
    return new THREE.Vector3(Math.cos(a) * rx, Math.sin(a) * ry, Math.sin(a * 1.7) * 0.9);
  });
}

/** Série determinística: o mesmo perfil executivo em todo carregamento. */
function series(i: number): number {
  return 0.42 + 0.3 * Math.sin(i * 0.9) + 0.18 * Math.sin(i * 2.3 + 1.1) + 0.1 * Math.sin(i * 5.1);
}

export function createParticleField(count: number): ParticleField {
  const field = new Float32Array(count * 3);
  const capture = new Float32Array(count * 3);
  const organize = new Float32Array(count * 3);
  const understand = new Float32Array(count * 3);
  const intelligence = new Float32Array(count * 3);
  const decide = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  const role = new Float32Array(count);

  const sources = sourcePositions(false);
  const COLS = 18;
  const LAYERS = [1.15, 0, -1.15];

  for (let i = 0; i < count; i++) {
    seed[i] = Math.random();
    role[i] = Math.random();

    // REPOUSO — o território da Atlas: uma carta larga, rasa e medida.
    // É o que o visitante vê no hero e depois que o ciclo fecha.
    const gx = (i % 46) / 45 - 0.5;
    const gz = (Math.floor(i / 46) % 26) / 25 - 0.5;
    field[i * 3] = gx * 15 + (Math.random() - 0.5) * 0.22;
    field[i * 3 + 1] = (Math.random() - 0.5) * 0.5 + Math.sin(gx * 5.2) * 0.35;
    field[i * 3 + 2] = gz * 9 + (Math.random() - 0.5) * 0.22;

    // CAPTURE — cada dado pertence à fonte que o registra.
    const s = sources[i % SOURCE_COUNT];
    capture[i * 3] = s.x + (Math.random() - 0.5) * 1.05;
    capture[i * 3 + 1] = s.y + (Math.random() - 0.5) * 1.05;
    capture[i * 3 + 2] = s.z + (Math.random() - 0.5) * 1.05;

    // ORGANIZE — o dado bruto assenta em camadas com padrão e endereço.
    const layer = i % LAYERS.length;
    const k = Math.floor(i / LAYERS.length);
    organize[i * 3] = ((k % 30) / 29 - 0.5) * 9.6 + (Math.random() - 0.5) * 0.08;
    organize[i * 3 + 1] = LAYERS[layer] + (Math.random() - 0.5) * 0.07;
    organize[i * 3 + 2] = ((Math.floor(k / 30) % 16) / 15 - 0.5) * 5.2 + (Math.random() - 0.5) * 0.08;

    // UNDERSTAND — o dado organizado vira indicador: um perfil executivo
    // desenhado pelas próprias partículas, não um widget de gráfico.
    const col = i % COLS;
    const h = series(col);
    const up = Math.floor(i / COLS) / Math.ceil(count / COLS);
    understand[i * 3] = (col / (COLS - 1) - 0.5) * 9.2;
    understand[i * 3 + 1] = -2.1 + up * h * 4.6;
    understand[i * 3 + 2] = (Math.random() - 0.5) * 0.3;

    // INTELLIGENCE — a mesma leitura, com uma camada que projeta adiante
    // e destaca o que foge do padrão. Nada de cérebro: é o mesmo dado.
    const proj = col / (COLS - 1);
    const proj_h = h * (1 + 0.42 * proj);
    intelligence[i * 3] = (proj - 0.5) * 9.2;
    intelligence[i * 3 + 1] = -2.1 + up * proj_h * 4.6 + (role[i] > 0.93 ? 1.5 : 0);
    intelligence[i * 3 + 2] = (Math.random() - 0.5) * 0.3 + (role[i] > 0.93 ? 0.6 : 0);

    // DECIDE — tudo converge para um ponto: a decisão. As partículas
    // caminham por raios, então a convergência se lê como caminho.
    const a = (i % 96) / 96 * Math.PI * 2;
    const r = 0.25 + Math.pow(Math.random(), 1.7) * 6.4;
    decide[i * 3] = Math.cos(a) * r;
    decide[i * 3 + 1] = Math.sin(a) * r * 0.5;
    decide[i * 3 + 2] = Math.sin(a * 3.1) * r * 0.16;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(field.slice(), 3));
  geometry.setAttribute('aField', new THREE.BufferAttribute(field, 3));
  geometry.setAttribute('aCapture', new THREE.BufferAttribute(capture, 3));
  geometry.setAttribute('aOrganize', new THREE.BufferAttribute(organize, 3));
  geometry.setAttribute('aUnderstand', new THREE.BufferAttribute(understand, 3));
  geometry.setAttribute('aIntel', new THREE.BufferAttribute(intelligence, 3));
  geometry.setAttribute('aDecide', new THREE.BufferAttribute(decide, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geometry.setAttribute('aRole', new THREE.BufferAttribute(role, 1));
  // A geometria se move no shader: o bounding automático ficaria errado.
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 40);

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uPhase: { value: 0 },
      uTime: { value: 0 },
      uScale: { value: 1 },
      uPortrait: { value: 0 },
      uAccent: { value: new THREE.Color(color3d.atlasBlue) },
      uLight: { value: new THREE.Color(color3d.atlasBlueLight) },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aField;
      attribute vec3 aCapture;
      attribute vec3 aOrganize;
      attribute vec3 aUnderstand;
      attribute vec3 aIntel;
      attribute vec3 aDecide;
      attribute float aSeed;
      attribute float aRole;
      uniform float uPhase;
      uniform float uTime;
      uniform float uScale;
      uniform float uPortrait;
      varying float vAlpha;
      varying float vMark;

      // No retrato o território é estreito e alto: a mesma leitura, girada
      // para o eixo que a tela tem.
      vec3 fit(vec3 p) {
        return mix(p, vec3(p.x * 0.5, p.y * 1.25, p.z * 0.72), uPortrait);
      }

      void main() {
        // 0 hero · 1 serviços · 2 capture · 3 organize
        // 4 understand · 5 intelligence · 6 decide · 7 o ciclo fecha
        float tc = smoothstep(1.15, 2.0, uPhase);
        float to = smoothstep(2.15, 3.0, uPhase);
        float tu = smoothstep(3.15, 4.0, uPhase);
        float ti = smoothstep(4.15, 5.0, uPhase);
        float td = smoothstep(5.15, 6.0, uPhase);
        float tb = smoothstep(6.30, 7.10, uPhase);

        vec3 p = aField;
        p = mix(p, aCapture, tc);
        p = mix(p, aOrganize, to);
        p = mix(p, aUnderstand, tu);
        p = mix(p, aIntel, ti);
        p = mix(p, aDecide, td);
        // a decisão gera dado novo: o campo volta ao repouso e recomeça
        p = mix(p, aField, tb);
        p = fit(p);

        // respiração: o dado nunca está totalmente parado
        p.x += sin(uTime * 0.5 + aSeed * 41.0) * 0.04;
        p.y += cos(uTime * 0.42 + aSeed * 27.0) * 0.04;

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;

        // o que foge do padrão só é destacado onde isso significa algo
        float anomaly = step(0.93, aRole) * ti * (1.0 - td);
        vMark = anomaly;

        float size = (1.0 + aSeed * 1.7 + anomaly * 2.2) * uScale;
        gl_PointSize = clamp(size * (22.0 / max(-mv.z, 0.1)), 2.2, 7.5);

        // organizar é também deixar de variar: o brilho fecha quando o
        // dado entra em padrão, e a malha passa a ser legível.
        float ordered = max(to * (1.0 - tb), 0.0);
        vAlpha = (0.72 + 0.28 * ordered + aSeed * 0.4 * (1.0 - ordered * 0.8)) + anomaly * 0.4;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uAccent;
      uniform vec3 uLight;
      varying float vAlpha;
      varying float vMark;

      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        if (d > 0.5) discard;
        float core = smoothstep(0.5, 0.0, d);
        vec3 col = mix(uAccent, uLight, 0.22 + vMark * 0.7);
        gl_FragColor = vec4(col, pow(core, 1.5) * vAlpha);
      }
    `,
  });

  return {
    geometry,
    material,
    dispose() { geometry.dispose(); material.dispose(); },
  };
}
