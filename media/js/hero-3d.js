import * as THREE from '../vendor/three.module.min.js';

/**
 * Hero: a arquitetura de dados como objeto — camadas empilhadas (fonte,
 * ingestão, transformação, BI, decisão) com o dado subindo pela pilha.
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
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  const group = new THREE.Group();
  scene.add(group);

  const ACCENT = 0x2e86ff;
  const ACCENT_LIGHT = 0x6fd4ff;

  /* ---------- Camadas da arquitetura ---------- */
  const LAYERS = 4;
  const SIZE = 2.5;
  const GAP = 0.95;
  const baseY = -((LAYERS - 1) * GAP) / 2;
  const layerY = [];
  const plane = new THREE.PlaneGeometry(SIZE, SIZE);
  const edgeGeo = new THREE.EdgesGeometry(plane);

  for (let i = 0; i < LAYERS; i++) {
    const y = baseY + i * GAP;
    layerY.push(y);
    const top = i === LAYERS - 1;
    const k = i / (LAYERS - 1);

    // face da laje: presença sem desenho, para não virar ruído de arame
    const face = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({
      color: ACCENT, transparent: true, opacity: 0.035 + k * 0.04,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    }));
    face.rotation.x = -Math.PI / 2;
    face.position.y = y;
    group.add(face);

    // borda: a linha que define a camada
    const edge = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({
      color: top ? ACCENT_LIGHT : ACCENT,
      transparent: true, opacity: 0.35 + k * 0.45,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    edge.rotation.x = -Math.PI / 2;
    edge.position.y = y;
    group.add(edge);
  }

  /* ---------- Trilhos verticais: o caminho do dado entre camadas ---------- */
  const RAILS = [
    [-SIZE / 3, -SIZE / 3], [SIZE / 3, -SIZE / 3],
    [-SIZE / 3, SIZE / 3], [SIZE / 3, SIZE / 3],
    [0, 0],
  ];
  const railPts = [];
  RAILS.forEach(([x, z]) => {
    railPts.push(new THREE.Vector3(x, layerY[0], z), new THREE.Vector3(x, layerY[LAYERS - 1], z));
  });
  const railGeo = new THREE.BufferGeometry().setFromPoints(railPts);
  group.add(new THREE.LineSegments(railGeo, new THREE.LineBasicMaterial({
    color: ACCENT, transparent: true, opacity: 0.16,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })));

  /* ---------- Pulsos subindo pelos trilhos ---------- */
  const PULSES = 14;
  const yBottom = layerY[0];
  const ySpan = layerY[LAYERS - 1] - layerY[0];
  const pulses = Array.from({ length: PULSES }, () => ({
    rail: Math.floor(Math.random() * RAILS.length),
    t: Math.random(),
    speed: 0.0028 + Math.random() * 0.004,
  }));
  const pulseGeo = new THREE.BufferGeometry();
  pulseGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PULSES * 3), 3));
  group.add(new THREE.Points(pulseGeo, new THREE.PointsMaterial({
    color: ACCENT_LIGHT, size: 0.13, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  })));

  function placePulses(step) {
    const pos = pulseGeo.attributes.position.array;
    pulses.forEach((p, k) => {
      if (step) {
        p.t += p.speed;
        if (p.t > 1) { p.t = 0; p.rail = Math.floor(Math.random() * RAILS.length); }
      }
      const [x, z] = RAILS[p.rail];
      pos[k * 3] = x;
      pos[k * 3 + 1] = yBottom + ySpan * p.t;
      pos[k * 3 + 2] = z;
    });
    pulseGeo.attributes.position.needsUpdate = true;
  }
  placePulses(false);

  /* ---------- Enquadramento ---------- */
  let redraw = null;

  function layout() {
    const w = hero.clientWidth, h = hero.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // No desktop a pilha vive à direita, ATRÁS da coluna de estágios e
    // dentro da largura dela: antes o objeto era mais largo que os
    // cartões e as pontas encostavam no título. Em tela estreita ele
    // desce para baixo do texto — nunca cruza a manchete.
    const wide = w >= 1080;
    group.position.x = wide ? 3.05 : 0;
    group.position.y = wide ? 0 : -3.2;
    group.scale.setScalar(0.82);
    if (redraw) redraw();
  }
  layout();
  window.addEventListener('resize', layout, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(layout).observe(hero);

  let mx = 0, my = 0;
  window.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    my = ((e.clientY - r.top) / r.height - 0.5) * 2;
  }, { passive: true });

  const TILT = 0.5;

  /**
   * Menos movimento não é movimento nenhum.
   *
   * Quem pede reduced-motion está pedindo para nada se mexer sozinho: a
   * pilha não gira e os pulsos não sobem. Mas a peça continua respondendo
   * ao ponteiro, porque aí o movimento é pedido pela pessoa, e o quadro
   * só é redesenhado enquanto a rotação ainda persegue o cursor — sem
   * loop contínuo gastando bateria.
   *
   * Antes este caminho desenhava um quadro e saía, e o hero ficava morto
   * em toda máquina com "efeitos de animação" desligados no sistema.
   */
  if (reduced) {
    let rx = TILT, ry = 0.62, queued = false;
    const settle = () => {
      const tx = TILT - my * 0.07;
      const ty = 0.62 + mx * 0.18;
      rx += (tx - rx) * 0.12;
      ry += (ty - ry) * 0.12;
      group.rotation.set(rx, ry, 0);
      renderer.render(scene, camera);
      if (Math.abs(tx - rx) > 0.0004 || Math.abs(ty - ry) > 0.0004) requestAnimationFrame(settle);
      else queued = false;
    };
    group.rotation.set(rx, ry, 0);
    renderer.render(scene, camera);
    redraw = () => renderer.render(scene, camera);
    window.addEventListener('pointermove', () => {
      if (!queued) { queued = true; requestAnimationFrame(settle); }
    }, { passive: true });
    return;
  }

  let running = false;
  let spin = 0.5;
  function frame() {
    if (!running) return;
    spin += 0.0013;
    group.rotation.y = spin + mx * 0.18;
    group.rotation.x = TILT - my * 0.07;
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
