/**
 * ATLAS — DATA, MAPPED · Campo de partículas do ciclo
 *
 * Uma partícula = um dado. A MESMA partícula atravessa toda a narrativa:
 * o shader interpola entre as posições que ela ocupa em cada etapa do
 * ciclo. Não são cenas diferentes — é um universo só, visto de fases
 * diferentes.
 *
 * Por que THREE.Points e não InstancedMesh: cada dado é um ponto
 * billboard de alguns pixels, sem geometria própria. Points resolve isso
 * com um vértice por partícula; InstancedMesh exigiria no mínimo um quad
 * (4 vértices + 2 triângulos) para o mesmo resultado visual. Instancing
 * entra quando houver geometria real — os marcadores de fonte e os
 * portais do pipeline.
 */
import * as THREE from 'three';
import { color3d } from '../lib/tokens';

export interface ParticleField {
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
  /** Posições das fontes de dados, para posicionar marcadores. */
  sources: THREE.Vector3[];
  dispose(): void;
}

const SOURCE_COUNT = 8;

/**
 * Abaixo desta largura a tela é mais alta do que larga, e o corredor do
 * pipeline passa a correr no eixo vertical — o único que sobra no retrato.
 * Câmera, portais e partículas leem daqui para concordarem entre si.
 */
export const PORTRAIT_BREAKPOINT = 900;

/**
 * No retrato o corredor é mais curto: os três portais precisam caber
 * juntos na faixa livre abaixo do texto, senão o do meio — justamente o
 * que mostra o estreitamento — fica escondido atrás da manchete.
 */
export const PORTRAIT_SPAN = 0.45;

/**
 * E são mais estreitos: empilhados na vertical, portais do tamanho do
 * desktop se sobreporiam — que foi exatamente o defeito que o plano em
 * 3/4 corrigiu na tela larga.
 */
export const PORTRAIT_RING = 0.6;

/** Anel de fontes: ERP · CRM · Database · API · App · Sensor · Arquivo · Stream */
export function sourcePositions(): THREE.Vector3[] {
  return Array.from({ length: SOURCE_COUNT }, (_, s) => {
    const a = (s / SOURCE_COUNT) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a) * 4.4, Math.sin(a) * 2.4, Math.sin(a * 1.7) * 1.6);
  });
}

export function createParticleField(count: number): ParticleField {
  const origin = new Float32Array(count * 3);
  const capture = new Float32Array(count * 3);
  const pipe = new Float32Array(count * 3);
  const seed = new Float32Array(count);

  const sources = sourcePositions();

  for (let i = 0; i < count; i++) {
    seed[i] = Math.random();

    // ORIGIN — o evento nasce disperso pelo território
    const a = Math.random() * Math.PI * 2;
    const rad = 3.0 + Math.random() * 5.2;
    origin[i * 3] = Math.cos(a) * rad;
    origin[i * 3 + 1] = (Math.random() - 0.5) * 6.2;
    origin[i * 3 + 2] = Math.sin(a) * rad * 0.7 - 1.4;

    // CAPTURE — cada evento pertence à fonte que o registra
    const s = sources[Math.floor(Math.random() * SOURCE_COUNT)];
    capture[i * 3] = s.x + (Math.random() - 0.5) * 0.95;
    capture[i * 3 + 1] = s.y + (Math.random() - 0.5) * 0.95;
    capture[i * 3 + 2] = s.z + (Math.random() - 0.5) * 0.95;

    // PIPELINE — só a seção do corredor; o X vem do fluxo, no shader
    pipe[i * 3] = 0;
    pipe[i * 3 + 1] = (Math.random() - 0.5) * 1.35;
    pipe[i * 3 + 2] = (Math.random() - 0.5) * 1.35;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(origin.slice(), 3));
  geometry.setAttribute('aOrigin', new THREE.BufferAttribute(origin, 3));
  geometry.setAttribute('aCapture', new THREE.BufferAttribute(capture, 3));
  geometry.setAttribute('aPipe', new THREE.BufferAttribute(pipe, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
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
      attribute vec3 aOrigin;
      attribute vec3 aCapture;
      attribute vec3 aPipe;
      attribute float aSeed;
      uniform float uPhase;
      uniform float uTime;
      uniform float uScale;
      uniform float uPortrait;
      varying float vAlpha;
      varying float vFlow;

      void main() {
        // 0 sinal · 1 origem · 2 captura · 3 pipeline
        float t1 = smoothstep(0.08, 1.0, uPhase);
        float t2 = smoothstep(1.10, 2.0, uPhase);
        float t3 = smoothstep(2.10, 3.0, uPhase);

        // tudo começa como um único sinal no centro
        vec3 p = mix(vec3(0.0), aOrigin, t1);
        p = mix(p, aCapture, t2);

        // no pipeline o dado deixa de ter lugar fixo: ele corre
        float flow = fract(aSeed * 7.31 + uTime * 0.07);
        // Na paisagem o dado corre da esquerda para a direita. No retrato
        // corre de cima para baixo — mesma viagem, no eixo que a tela tem.
        float span = mix(1.0, ${PORTRAIT_SPAN.toFixed(2)}, uPortrait);
        float along = mix(mix(-8.0, 8.0, flow), mix(8.0, -8.0, flow), uPortrait) * span;
        // o corredor estreita no processamento — é ali que o dado é tratado
        float squeeze = 1.0 - 0.58 * exp(-pow(along / span * 0.5, 2.0));
        vec2 sect = vec2(aPipe.y, aPipe.z) * squeeze * mix(1.0, ${PORTRAIT_RING.toFixed(2)}, uPortrait);
        vec3 corridor = mix(vec3(along, sect.x, sect.y), vec3(sect.x, along, sect.y), uPortrait);
        p = mix(p, corridor, t3);

        // respiração: o dado nunca está totalmente parado
        p.x += sin(uTime * 0.5 + aSeed * 41.0) * 0.045;
        p.y += cos(uTime * 0.42 + aSeed * 27.0) * 0.045;

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;

        // pontos pequenos: um mapa de dados, não uma nuvem de brilho
        float size = (1.0 + aSeed * 1.9) * uScale;
        gl_PointSize = clamp(size * (20.0 / max(-mv.z, 0.1)), 1.7, 7.0);

        // no sinal inicial quase nada existe — um dado aparece por vez
        float born = smoothstep(0.0, 0.62, uPhase * (0.22 + aSeed));
        vAlpha = (0.46 + aSeed * 0.54) * born;
        vFlow = t3;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uAccent;
      uniform vec3 uLight;
      varying float vAlpha;
      varying float vFlow;

      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        if (d > 0.5) discard;
        float core = smoothstep(0.5, 0.0, d);
        vec3 col = mix(uAccent, uLight, vFlow * 0.6 + 0.22);
        gl_FragColor = vec4(col, pow(core, 1.5) * vAlpha);
      }
    `,
  });

  return {
    geometry,
    material,
    sources,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
