import * as THREE from '../vendor/three.module.min.js';

/**
 * Visual do hero: um tubo 3D com partículas fluindo, representando o
 * pipeline de dados (Data sources -> ... -> Business) que já está descrito
 * em texto ao lado. O texto nunca depende deste script: se WebGL não
 * estiver disponível, o canvas simplesmente fica vazio e a lista de
 * estágios continua legível normalmente.
 */
(function () {
  const canvas = document.getElementById('hero-3d-canvas');
  const container = document.querySelector('.arch');
  if (!canvas || !container) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let gl = null;
  try { gl = canvas.getContext('webgl2') || canvas.getContext('webgl'); } catch (e) { gl = null; }
  if (!gl) return;

  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  const ACCENT = 0x2e86ff;
  const ACCENT_LIGHT = 0x6fd4ff;

  const group = new THREE.Group();
  scene.add(group);

  const STAGES = 6;
  const points = [];
  for (let i = 0; i < STAGES; i++) {
    const t = i / (STAGES - 1);
    points.push(new THREE.Vector3(Math.sin(t * Math.PI * 1.4) * 0.5, 3.4 - t * 6.8, 0));
  }
  const curve = new THREE.CatmullRomCurve3(points);

  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 128, 0.04, 8, false),
    new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.32 })
  );
  group.add(tube);

  const nodeMeshes = points.map((p, i) => {
    const isLast = i === points.length - 1;
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(isLast ? 0.15 : 0.1, 1),
      new THREE.MeshBasicMaterial({ color: isLast ? ACCENT_LIGHT : ACCENT, wireframe: true, transparent: true, opacity: 0.85 })
    );
    mesh.position.copy(p);
    group.add(mesh);
    return mesh;
  });

  const PARTICLES = 50;
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PARTICLES * 3), 3));
  const particles = new THREE.Points(particleGeo, new THREE.PointsMaterial({
    color: ACCENT_LIGHT, size: 0.045, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  group.add(particles);

  function placeParticles(shift) {
    const pos = particleGeo.attributes.position.array;
    for (let i = 0; i < PARTICLES; i++) {
      const off = ((i / PARTICLES) + shift) % 1;
      const p = curve.getPointAt(off);
      pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
    }
    particleGeo.attributes.position.needsUpdate = true;
  }
  placeParticles(0);

  function layout() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  layout();
  window.addEventListener('resize', layout, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(layout).observe(container);

  let mx = 0, my = 0;
  if (!reduced) {
    window.addEventListener('pointermove', (e) => {
      const r = container.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      my = ((e.clientY - r.top) / r.height - 0.5) * 2;
    }, { passive: true });
  }

  if (reduced) {
    renderer.render(scene, camera);
    return;
  }

  let running = false;
  function frame(t) {
    if (!running) return;
    group.rotation.y = mx * 0.16;
    group.rotation.x = -my * 0.07;
    placeParticles((t * 0.00005) % 1);
    nodeMeshes.forEach((m, i) => { m.rotation.y += 0.004 + i * 0.0005; m.rotation.x += 0.002; });
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting && !running) { running = true; requestAnimationFrame(frame); }
      else if (!en.isIntersecting) { running = false; }
    });
  }, { threshold: 0.05 }).observe(container);
})();
