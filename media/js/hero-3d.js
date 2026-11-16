import * as THREE from '../vendor/three.module.min.js';

/**
 * Hero: o território de dados da Atlas.
 *
 * Seis camadas — uma para cada etapa listada ao lado, da fonte do dado
 * até o resultado de negócio. Cada camada é uma folha de carta com seus
 * pontos; juntas formam a arquitetura por onde o dado desce.
 *
 * Três decisões que definem a peça:
 *
 * 1. ORIENTAÇÃO FIXA. O objeto anterior girava sozinho, e a silhueta
 *    mudava por completo a cada segundo: não havia forma para reconhecer,
 *    só ruído atrás do texto. Aqui a projeção é axonométrica e estável,
 *    como um desenho técnico.
 *
 * 2. UMA CAMADA POR RÓTULO. Eram quatro planos para seis rótulos, então
 *    o objeto não podia ser lido como a pilha que acompanha. Agora a
 *    contagem bate e cada cartão é a legenda da sua camada.
 *
 * 3. MOVIMENTO SÓ DO SCROLL. A descida do dado é função do progresso da
 *    página, não do relógio. Não há autoplay: quem não rola não vê nada
 *    se mexer, e o quadro só é redesenhado quando há o que mudar.
 *
 * Sem WebGL o canvas fica vazio e a lista de etapas ao lado continua
 * explicando a arquitetura inteira.
 */
(function () {
  const canvas = document.getElementById('hero-3d-canvas');
  const hero = document.querySelector('.hero');
  if (!canvas || !hero) return;

  let gl = null;
  try { gl = canvas.getContext('webgl2') || canvas.getContext('webgl'); } catch (e) { gl = null; }
  if (!gl) return;

  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);

  const group = new THREE.Group();
  scene.add(group);

  const ACCENT = 0x2e86ff;
  const ACCENT_LIGHT = 0x6fd4ff;

  /* ---------- As seis camadas ---------- */
  const LAYERS = 6;
  const GAP = 0.74;
  // A folha é larga e rasa: território, não caixa. Ela começa atrás da
  // coluna de cartões e sai pela direita da tela — o mapa continua fora
  // do quadro, que é o que dá escala sem ocupar espaço do texto.
  const X0 = -0.9, X1 = 7.2;
  const Z0 = -1.55, Z1 = 1.55;
  const topY = ((LAYERS - 1) * GAP) / 2;

  const layers = [];

  for (let i = 0; i < LAYERS; i++) {
    const y = topY - i * GAP;

    // contorno da folha + duas linhas de referência: o mínimo para ela
    // ler como carta medida em vez de retângulo
    const v = [];
    v.push(X0, y, Z0, X1, y, Z0);
    v.push(X1, y, Z0, X1, y, Z1);
    v.push(X1, y, Z1, X0, y, Z1);
    v.push(X0, y, Z1, X0, y, Z0);
    v.push(X0, y, 0, X1, y, 0);
    for (let t = 1; t < 5; t++) {
      const x = X0 + (X1 - X0) * (t / 5);
      v.push(x, y, Z0, x, y, Z0 + 0.22);
      v.push(x, y, Z1 - 0.22, x, y, Z1);
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: ACCENT, transparent: true, opacity: 0.16, depthWrite: false,
    });
    group.add(new THREE.LineSegments(lineGeo, lineMat));

    // os dados que moram nesta camada
    const N = 26;
    const pts = new Float32Array(N * 3);
    for (let k = 0; k < N; k++) {
      pts[k * 3] = X0 + 0.4 + Math.random() * (X1 - X0 - 0.8);
      pts[k * 3 + 1] = y;
      pts[k * 3 + 2] = Z0 + 0.3 + Math.random() * (Z1 - Z0 - 0.6);
    }
    const ptGeo = new THREE.BufferGeometry();
    ptGeo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const ptMat = new THREE.PointsMaterial({
      color: ACCENT, size: 0.055, transparent: true, opacity: 0.3,
      depthWrite: false, sizeAttenuation: true,
    });
    group.add(new THREE.Points(ptGeo, ptMat));

    layers.push({ y, lineMat, ptMat });
  }

  /* ---------- O dado que desce pela pilha ---------- */
  // Um punhado de marcadores entre a camada atual e a seguinte. A posição
  // vem do scroll: é o progresso da pessoa que move o dado, não um timer.
  const FLOW = 7;
  const flowGeo = new THREE.BufferGeometry();
  flowGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(FLOW * 3), 3));
  const flowMat = new THREE.PointsMaterial({
    color: ACCENT_LIGHT, size: 0.1, transparent: true, opacity: 0.9,
    depthWrite: false, sizeAttenuation: true,
  });
  group.add(new THREE.Points(flowGeo, flowMat));
  const flowX = Array.from({ length: FLOW }, () => X0 + 0.8 + Math.random() * (X1 - X0 - 1.6));
  const flowZ = Array.from({ length: FLOW }, () => Z0 + 0.4 + Math.random() * (Z1 - Z0 - 0.8));

  /* ---------- Enquadramento ---------- */
  // Projeção fixa: levemente de cima e de lado, como um desenho técnico.
  group.rotation.set(0, -0.36, 0);
  let wide = true;

  function layout() {
    const w = hero.clientWidth, h = hero.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    wide = w >= 1080;
    if (wide) {
      // Desktop: a pilha nasce atrás da coluna de cartões e recua para a
      // direita. O texto fica com a esquerda inteira, sem disputa.
      camera.position.set(0.4, 4.8, 9.0);
      camera.lookAt(3.2, -0.3, 0);
      group.position.set(4.4, -0.25, 0);
      group.scale.setScalar(0.84);
    } else {
      // Retrato: a caixa é alta e estreita. A pilha desce para baixo do
      // texto e é vista mais de frente, para as camadas não se achatarem.
      camera.position.set(-0.6, 2.6, 9.4);
      camera.lookAt(0.6, -0.2, 0);
      group.position.set(-1.6, -2.6, 0);
      group.scale.setScalar(0.72);
    }
    camera.updateProjectionMatrix();
    draw();
  }

  /* ---------- Estado: quem está aceso e onde o dado está ---------- */
  let mx = 0, my = 0, progress = 0;

  function apply() {
    // A mesma conta dos rótulos: a primeira camada já nasce acesa e a
    // frente desce conforme a página rola.
    const head = Math.min(LAYERS - 1, Math.round(progress * (LAYERS - 1)));
    for (let i = 0; i < LAYERS; i++) {
      const done = i < head;
      const on = i === head;
      layers[i].lineMat.opacity = on ? 0.5 : done ? 0.22 : 0.15;
      layers[i].ptMat.opacity = on ? 0.9 : done ? 0.38 : 0.22;
      layers[i].ptMat.color.setHex(on ? ACCENT_LIGHT : ACCENT);
    }

    // o dado ocupa o vão entre a camada acesa e a próxima
    const from = layers[head].y;
    const to = layers[Math.min(LAYERS - 1, head + 1)].y;
    const span = progress * (LAYERS - 1) - head;
    const pos = flowGeo.attributes.position.array;
    for (let k = 0; k < FLOW; k++) {
      const t = Math.min(1, Math.max(0, span + (k / FLOW) * 0.55));
      pos[k * 3] = flowX[k];
      pos[k * 3 + 1] = from + (to - from) * t;
      pos[k * 3 + 2] = flowZ[k];
    }
    flowGeo.attributes.position.needsUpdate = true;
    flowMat.opacity = head >= LAYERS - 1 ? 0.25 : 0.9;

    // paralaxe discreta: informa profundidade, não chama atenção
    group.rotation.y = -0.36 + mx * 0.07;
    group.rotation.x = my * 0.035;
  }

  let queued = 0;
  function draw() {
    queued = 0;
    apply();
    renderer.render(scene, camera);
  }
  function schedule() { if (!queued) queued = requestAnimationFrame(draw); }

  function readScroll() {
    const r = hero.getBoundingClientRect();
    const span = Math.max(1, r.height * 0.72);
    progress = Math.min(1, Math.max(0, -r.top / span));
    schedule();
  }

  window.addEventListener('scroll', readScroll, { passive: true });
  window.addEventListener('resize', layout, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(layout).observe(hero);

  // O ponteiro só inclina a peça no desktop, onde existe ponteiro.
  window.addEventListener('pointermove', (e) => {
    if (!wide) return;
    const r = hero.getBoundingClientRect();
    mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    my = ((e.clientY - r.top) / r.height - 0.5) * 2;
    schedule();
  }, { passive: true });

  layout();
  readScroll();
})();
