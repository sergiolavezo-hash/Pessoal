import * as THREE from '../vendor/three.module.min.js';

/**
 * Hero: rede de dados em 3D — nós conectados por arestas, com pulsos
 * percorrendo as conexões (o dado se movendo pela arquitetura).
 *
 * O texto do hero e a lista de estágios nunca dependem disto: sem WebGL,
 * o canvas fica vazio e todo o conteúdo continua legível.
 */
(function () {
  const canvas = document.getElementById('hero-3d-canvas');
  const hero = document.querySelector('.hero');
  if (!canvas || !hero) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let gl = null;
  try { gl = canvas.getContext('webgl2') || canvas.getContext('webgl'); } catch (e) { gl = null; }
  if (!gl) return;

  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  const group = new THREE.Group();
  scene.add(group);

  /* ---------- Nós distribuídos na esfera (espiral de Fibonacci) ---------- */
  const NODE_COUNT = 38;
  const RADIUS = 2.75;
  const nodes = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < NODE_COUNT; i++) {
    const y = 1 - (i / (NODE_COUNT - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    nodes.push(new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r).multiplyScalar(RADIUS));
  }

  /* ---------- Arestas: cada nó liga nos 3 vizinhos mais próximos ---------- */
  const edges = [];
  const seen = new Set();
  nodes.forEach((a, i) => {
    const near = nodes
      .map((b, j) => ({ j, d: a.distanceTo(b) }))
      .filter((o) => o.j !== i)
      .sort((p, q) => p.d - q.d)
      .slice(0, 3);
    near.forEach(({ j }) => {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(key)) return;
      seen.add(key);
      edges.push([i, j]);
    });
  });

  const edgePositions = new Float32Array(edges.length * 6);
  edges.forEach(([i, j], e) => {
    edgePositions.set([nodes[i].x, nodes[i].y, nodes[i].z, nodes[j].x, nodes[j].y, nodes[j].z], e * 6);
  });
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute('position', new THREE.BufferAttribute(edgePositions, 3));
  group.add(new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({
    color: 0x2e86ff, transparent: true, opacity: 0.3,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })));

  /* ---------- Nós ---------- */
  const nodeGeo = new THREE.BufferGeometry().setFromPoints(nodes);
  group.add(new THREE.Points(nodeGeo, new THREE.PointsMaterial({
    color: 0x6fd4ff, size: 0.1, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  })));

  /* ---------- Pulsos percorrendo as arestas ---------- */
  const PULSES = 18;
  const pulses = Array.from({ length: PULSES }, () => ({
    edge: Math.floor(Math.random() * edges.length),
    t: Math.random(),
    speed: 0.0022 + Math.random() * 0.0035,
  }));
  const pulseGeo = new THREE.BufferGeometry();
  pulseGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PULSES * 3), 3));
  group.add(new THREE.Points(pulseGeo, new THREE.PointsMaterial({
    color: 0xbfe2ff, size: 0.17, transparent: true, opacity: 1,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  })));

  const tmp = new THREE.Vector3();
  function placePulses(step) {
    const pos = pulseGeo.attributes.position.array;
    pulses.forEach((p, k) => {
      if (step) {
        p.t += p.speed;
        if (p.t > 1) { p.t = 0; p.edge = Math.floor(Math.random() * edges.length); }
      }
      const [i, j] = edges[p.edge];
      tmp.copy(nodes[i]).lerp(nodes[j], p.t);
      pos[k * 3] = tmp.x; pos[k * 3 + 1] = tmp.y; pos[k * 3 + 2] = tmp.z;
    });
    pulseGeo.attributes.position.needsUpdate = true;
  }
  placePulses(false);

  /* ---------- Enquadramento ---------- */
  function layout() {
    const w = hero.clientWidth, h = hero.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // No desktop a rede vive à direita, atrás da coluna de estágios.
    // Em tela estreita ela desce para baixo do texto — nunca cruza o título.
    const wide = w >= 1080;
    group.position.x = wide ? 2.5 : 0;
    group.position.y = wide ? 0.1 : -3.4;
    group.scale.setScalar(wide ? 1 : 0.8);
  }
  layout();
  window.addEventListener('resize', layout, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(layout).observe(hero);

  let mx = 0, my = 0;
  if (!reduced) {
    window.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      my = ((e.clientY - r.top) / r.height - 0.5) * 2;
    }, { passive: true });
  }

  if (reduced) {
    group.rotation.set(-0.18, 0.5, 0);
    renderer.render(scene, camera);
    return;
  }

  let running = false;
  let spin = 0.4;
  function frame() {
    if (!running) return;
    spin += 0.0016;
    group.rotation.y = spin + mx * 0.25;
    group.rotation.x = -0.18 + Math.sin(spin * 0.6) * 0.06 - my * 0.12;
    placePulses(true);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting && !running) { running = true; requestAnimationFrame(frame); }
      else if (!en.isIntersecting) { running = false; }
    });
  }, { threshold: 0.02 }).observe(hero);
})();
