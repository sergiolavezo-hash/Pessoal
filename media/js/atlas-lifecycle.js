import * as THREE from '../vendor/three.module.min.js';

/**
 * ATLAS — DATA, MAPPED.
 * Um único universo 3D percorrido pelo scroll. Cada partícula é um dado:
 * nasce (ORIGIN), é capturada por uma fonte (CAPTURE) e percorre um
 * caminho (PIPELINE). O scroll move a câmera e a fase da narrativa.
 *
 * Nada aqui é decorativo: posição, agrupamento e fluxo representam
 * estados do ciclo de vida do dado.
 */
const canvas = document.getElementById('atlas-canvas');
const root = document.documentElement;

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = window.matchMedia('(pointer: coarse)').matches;

let gl = null;
try { gl = canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl')); } catch (e) { gl = null; }

if (!gl) {
  // Sem WebGL a narrativa continua: o HTML editorial assume sozinho.
  document.body.classList.add('no-webgl');
} else {
  document.body.classList.add('has-webgl');
  boot();
}

function boot() {
  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: false, alpha: true, powerPreference: 'high-performance' });
  // Orçamento de GPU: em telas densas o custo cresce ao quadrado.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05070a, 0.055);
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);

  /* ================= SISTEMA DE PARTÍCULAS =================
     Cada partícula carrega as três posições do seu ciclo. O shader
     interpola entre elas conforme a fase, então a mesma partícula
     atravessa toda a narrativa — não são cenas diferentes.        */
  const COUNT = coarse ? 520 : 1400;

  const posOrigin = new Float32Array(COUNT * 3);   // 01 — evento nasce, disperso
  const posCapture = new Float32Array(COUNT * 3);  // 02 — puxado para uma fonte
  const posPipe = new Float32Array(COUNT * 3);     // 03 — alinhado no corredor
  const seed = new Float32Array(COUNT);
  const srcIndex = new Float32Array(COUNT);

  // 8 fontes de dados, em anel — ERP, CRM, DB, API, APP, SENSOR, FILE, STREAM
  const SOURCES = 8;
  const srcPos = [];
  for (let s = 0; s < SOURCES; s++) {
    const a = (s / SOURCES) * Math.PI * 2;
    srcPos.push(new THREE.Vector3(Math.cos(a) * 4.6, Math.sin(a) * 2.5, Math.sin(a * 1.7) * 1.8));
  }

  for (let i = 0; i < COUNT; i++) {
    const r = Math.random();
    seed[i] = r;

    // ORIGIN: eventos surgem espalhados pelo território
    const a = Math.random() * Math.PI * 2;
    const rad = 3.2 + Math.random() * 5.4;
    posOrigin[i * 3] = Math.cos(a) * rad;
    posOrigin[i * 3 + 1] = (Math.random() - 0.5) * 6.4;
    posOrigin[i * 3 + 2] = Math.sin(a) * rad * 0.7 - 1.5;

    // CAPTURE: cada evento pertence a uma fonte e se agrupa nela
    const s = Math.floor(Math.random() * SOURCES);
    srcIndex[i] = s;
    posCapture[i * 3] = srcPos[s].x + (Math.random() - 0.5) * 1.15;
    posCapture[i * 3 + 1] = srcPos[s].y + (Math.random() - 0.5) * 1.15;
    posCapture[i * 3 + 2] = srcPos[s].z + (Math.random() - 0.5) * 1.15;

    // PIPELINE: o corredor por onde o dado corre (y/z; x vem do fluxo)
    posPipe[i * 3] = 0;
    posPipe[i * 3 + 1] = (Math.random() - 0.5) * 1.5;
    posPipe[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(posOrigin.slice(), 3));
  geo.setAttribute('aOrigin', new THREE.BufferAttribute(posOrigin, 3));
  geo.setAttribute('aCapture', new THREE.BufferAttribute(posCapture, 3));
  geo.setAttribute('aPipe', new THREE.BufferAttribute(posPipe, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 30);

  const uniforms = {
    uPhase: { value: 0 },
    uTime: { value: 0 },
    uScale: { value: 1 },
    uAccent: { value: new THREE.Color(0x2e86ff) },
    uLight: { value: new THREE.Color(0x9fd4ff) },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute vec3 aOrigin;
      attribute vec3 aCapture;
      attribute vec3 aPipe;
      attribute float aSeed;
      uniform float uPhase;
      uniform float uTime;
      uniform float uScale;
      varying float vAlpha;
      varying float vMix;

      void main() {
        // fases: 0 sinal · 1 origem · 2 captura · 3 pipeline
        float t1 = smoothstep(0.0, 1.0, uPhase);
        float t2 = smoothstep(1.05, 2.0, uPhase);
        float t3 = smoothstep(2.05, 3.0, uPhase);

        // tudo começa como um único sinal no centro
        vec3 p = mix(vec3(0.0, 0.0, 0.0), aOrigin, t1);
        p = mix(p, aCapture, t2);

        // no pipeline o dado deixa de ter lugar fixo: ele corre
        float flow = fract(aSeed * 7.31 + uTime * 0.075);
        vec3 pipe = vec3(mix(-7.5, 7.5, flow), aPipe.y, aPipe.z);
        // o corredor estreita no meio: processamento
        float squeeze = 1.0 - 0.55 * exp(-pow(pipe.x * 0.55, 2.0));
        pipe.y *= squeeze;
        pipe.z *= squeeze;
        p = mix(p, pipe, t3);

        // respiração sutil — o dado nunca está parado
        p.x += sin(uTime * 0.5 + aSeed * 41.0) * 0.05;
        p.y += cos(uTime * 0.42 + aSeed * 27.0) * 0.05;

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;

        // pontos pequenos: um mapa de dados, não uma nuvem de brilho
        float size = (1.0 + aSeed * 2.0) * uScale;
        gl_PointSize = clamp(size * (20.0 / max(-mv.z, 0.1)), 1.2, 7.0);

        // no sinal inicial só uma fração é visível
        float born = smoothstep(0.0, 0.55, uPhase * (0.25 + aSeed));
        vAlpha = (0.34 + aSeed * 0.54) * born;
        vMix = t3;
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uAccent;
      uniform vec3 uLight;
      varying float vAlpha;
      varying float vMix;

      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        if (d > 0.5) discard;
        float core = smoothstep(0.5, 0.0, d);
        vec3 col = mix(uAccent, uLight, vMix * 0.65 + 0.25);
        gl_FragColor = vec4(col, core * core * vAlpha);
      }
    `,
  });

  const points = new THREE.Points(geo, material);
  scene.add(points);

  /* ---------- Anel de fontes (02 CAPTURE) e corredor (03 PIPELINE) ---------- */
  const ringPts = [];
  srcPos.forEach((v) => { ringPts.push(v.clone(), new THREE.Vector3(0, 0, 0)); });
  const ring = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(ringPts),
    new THREE.LineBasicMaterial({ color: 0x2e86ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  scene.add(ring);

  const corridorPts = [];
  for (let i = 0; i <= 40; i++) {
    const x = -7.5 + (i / 40) * 15;
    const squeeze = 1 - 0.55 * Math.exp(-Math.pow(x * 0.55, 2));
    corridorPts.push(new THREE.Vector3(x, 0.95 * squeeze, 0), new THREE.Vector3(x, -0.95 * squeeze, 0));
  }
  const corridor = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(corridorPts),
    new THREE.LineBasicMaterial({ color: 0x2e86ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  scene.add(corridor);

  /* ================= SCROLL → FASE ================= */
  const marks = [...document.querySelectorAll('[data-phase]')];
  let phaseTarget = 0;
  let phase = 0;

  function computePhase() {
    const vh = window.innerHeight;
    const y = window.scrollY + vh * 0.45;
    let p = 0;
    for (let i = 0; i < marks.length; i++) {
      const top = marks[i].offsetTop;
      const next = marks[i + 1] ? marks[i + 1].offsetTop : top + vh;
      if (y >= top && y < next) { p = i + (y - top) / Math.max(1, next - top); break; }
      if (y >= next) p = i + 1;
    }
    phaseTarget = Math.max(0, Math.min(marks.length - 1, p));
    root.style.setProperty('--phase', phaseTarget.toFixed(3));
    marks.forEach((m, i) => m.classList.toggle('is-active', Math.round(phaseTarget) === i));
    const label = document.getElementById('chapter-index');
    if (label) { const i = Math.round(phaseTarget); label.textContent = i === 0 ? '—' : String(i).padStart(2, '0'); }
  }

  window.addEventListener('scroll', computePhase, { passive: true });
  window.addEventListener('resize', computePhase, { passive: true });
  computePhase();
  phase = phaseTarget;

  /* ---------- Enquadramento ---------- */
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    uniforms.uScale.value = w < 720 ? 0.78 : 1;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  let mx = 0, my = 0;
  if (!reduced && !coarse) {
    window.addEventListener('pointermove', (e) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  /* ---------- Coreografia de câmera por capítulo ---------- */
  const SHOTS = [
    { z: 7.0, y: 0.0 },   // 00 sinal — perto, quase nada visível
    { z: 12.5, y: 0.4 },  // 01 origem — afasta, revela o território
    { z: 10.0, y: 0.0 },  // 02 captura — aproxima do anel de fontes
    { z: 7.6, y: 0.0 },   // 03 pipeline — entra no corredor
  ];

  function shotAt(p) {
    const i = Math.max(0, Math.min(SHOTS.length - 1, Math.floor(p)));
    const j = Math.min(SHOTS.length - 1, i + 1);
    const f = p - i;
    return { z: SHOTS[i].z + (SHOTS[j].z - SHOTS[i].z) * f, y: SHOTS[i].y + (SHOTS[j].y - SHOTS[i].y) * f };
  }

  let visible = true;
  new IntersectionObserver((es) => es.forEach((e) => { visible = e.isIntersecting; }),
    { threshold: 0 }).observe(canvas);

  const clock = new THREE.Clock();

  function render() {
    if (!visible) return;

    // amortecimento: a câmera segue o scroll, não salta com ele
    phase += (phaseTarget - phase) * (reduced ? 1 : 0.075);
    uniforms.uPhase.value = phase;
    uniforms.uTime.value = reduced ? 8 : clock.getElapsedTime();

    const shot = shotAt(phase);
    camera.position.set(mx * 0.7, shot.y - my * 0.4, shot.z);
    camera.lookAt(0, 0, 0);

    // as estruturas só aparecem no capítulo que elas explicam
    ring.material.opacity = Math.max(0, 0.42 * (1 - Math.abs(phase - 2)));
    corridor.material.opacity = Math.max(0, 0.34 * (1 - Math.abs(phase - 3)));

    renderer.render(scene, camera);
  }

  if (reduced) {
    // Sem movimento contínuo: redesenha só quando o scroll muda a fase.
    render();
    window.addEventListener('scroll', () => { computePhase(); render(); }, { passive: true });
    window.addEventListener('resize', () => { resize(); render(); }, { passive: true });
  } else {
    renderer.setAnimationLoop(render);
  }
}
