/**
 * Constelação do hero.
 *
 * Canvas 2D, sem dependência: funciona onde não há WebGL e custa uma
 * fração do que custava a cena Three.js que ocupava este lugar.
 *
 * Quatro decisões:
 *
 * 1. UMA LIGAÇÃO POR PONTO. A primeira versão ligava cada ponto a todos os
 *    vizinhos dentro do raio e o resultado era uma malha fechada, não uma
 *    constelação. Agora cada ponto traça no máximo uma linha, até o vizinho
 *    mais próximo, e só quando ele também é o mais próximo do outro lado —
 *    então o que aparece são pares soltos e uma corrente curta de vez em
 *    quando, com muito espaço vazio entre eles.
 *
 * 2. O CAMPO RESPIRA. Cada ponto tem velocidade própria; as distâncias
 *    mudam, os pares se desfazem e se refazem. É esse vai e vem que dá a
 *    impressão de algo vivo atrás do texto.
 *
 * 3. O PONTEIRO PUXA. Dentro de um raio os pontos derivam na direção do
 *    cursor, com atrito para o puxão não virar velocidade acumulada.
 *
 * 4. DUAS CORES. A maioria no azul da marca; uma minoria no âmbar, que é o
 *    contraponto quente. Ambas saem das variáveis CSS e são relidas quando
 *    o tema troca, então a mesma peça serve o claro e o escuro.
 *
 * Com prefers-reduced-motion o campo é desenhado uma vez e para: a forma
 * continua lá, o movimento não.
 */
(function () {
  var canvas = document.getElementById('hero-3d-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext && canvas.getContext('2d');
  if (!ctx) return;

  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var LIG = 210;        // alcance máximo de uma ligação, em px de CSS
  var RAIO_PTR = 200;   // alcance do ponteiro
  var VEL = 0.42;       // deriva base
  var pontos = [];
  var w = 0, h = 0, dpr = 1;
  var ptr = { x: -9999, y: -9999, ativo: false };
  var cor = { frio: '#2E86FF', quente: '#F2A33C', linha: '46,134,255' };
  var raf = 0, visivel = true;

  function lerCores() {
    var cs = getComputedStyle(document.documentElement);
    var a = (cs.getPropertyValue('--accent') || '').trim();
    var q = (cs.getPropertyValue('--accent-quente') || '').trim();
    if (a) cor.frio = a;
    if (q) cor.quente = q;
    var m = /^#([0-9a-f]{6})$/i.exec(cor.frio);
    if (m) {
      var n = parseInt(m[1], 16);
      cor.linha = ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
    }
  }

  function semear() {
    // Esparso de propósito: o vazio entre os pontos é metade do efeito.
    var alvo = Math.min(46, Math.max(14, Math.round((w * h) / 32000)));
    pontos = [];
    for (var i = 0; i < alvo; i++) {
      var ang = Math.random() * 6.283185;
      var v = VEL * (0.55 + Math.random() * 0.9);
      pontos.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: Math.cos(ang) * v,
        vy: Math.sin(ang) * v,
        r: Math.random() < 0.22 ? 2.6 : 1.7,
        q: Math.random() < 0.17        // ponto âmbar
      });
    }
  }

  function medir() {
    var r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = r.width; h = r.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }

  function desenhar() {
    ctx.clearRect(0, 0, w, h);

    // Vizinho mais próximo de cada ponto, uma só passada.
    var perto = new Array(pontos.length);
    var dist = new Array(pontos.length);
    for (var i = 0; i < pontos.length; i++) { perto[i] = -1; dist[i] = Infinity; }
    for (i = 0; i < pontos.length; i++) {
      for (var j = i + 1; j < pontos.length; j++) {
        var dx = pontos[i].x - pontos[j].x, dy = pontos[i].y - pontos[j].y;
        var d2 = dx * dx + dy * dy;
        if (d2 > LIG * LIG) continue;
        if (d2 < dist[i]) { dist[i] = d2; perto[i] = j; }
        if (d2 < dist[j]) { dist[j] = d2; perto[j] = i; }
      }
    }

    ctx.lineWidth = 1;
    for (i = 0; i < pontos.length; i++) {
      var k = perto[i];
      // só desenha quando a escolha é mútua, e uma vez por par
      if (k < 0 || k < i || perto[k] !== i) continue;
      var t = 1 - Math.sqrt(dist[i]) / LIG;
      ctx.strokeStyle = 'rgba(' + cor.linha + ',' + (0.18 + t * 0.4).toFixed(3) + ')';
      ctx.beginPath(); ctx.moveTo(pontos[i].x, pontos[i].y); ctx.lineTo(pontos[k].x, pontos[k].y); ctx.stroke();
    }

    // ligação até o ponteiro, no ponto mais próximo dele
    if (ptr.ativo) {
      var melhor = -1, md = RAIO_PTR * RAIO_PTR;
      for (i = 0; i < pontos.length; i++) {
        var px = pontos[i].x - ptr.x, py = pontos[i].y - ptr.y;
        var pd = px * px + py * py;
        if (pd < md) { md = pd; melhor = i; }
      }
      if (melhor > -1) {
        var pt = 1 - Math.sqrt(md) / RAIO_PTR;
        ctx.strokeStyle = 'rgba(' + cor.linha + ',' + (pt * 0.55).toFixed(3) + ')';
        ctx.beginPath(); ctx.moveTo(pontos[melhor].x, pontos[melhor].y); ctx.lineTo(ptr.x, ptr.y); ctx.stroke();
      }
    }

    for (var m = 0; m < pontos.length; m++) {
      var p = pontos[m];
      ctx.fillStyle = p.q ? cor.quente : cor.frio;
      ctx.globalAlpha = p.q ? 0.95 : 0.7;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283185); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function passo() {
    for (var i = 0; i < pontos.length; i++) {
      var p = pontos[i];
      if (ptr.ativo) {
        var dx = ptr.x - p.x, dy = ptr.y - p.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d > 1 && d < RAIO_PTR) {
          var f = (1 - d / RAIO_PTR) * 0.022;
          p.vx += (dx / d) * f; p.vy += (dy / d) * f;
        }
      }
      p.vx *= 0.995; p.vy *= 0.995;
      var v = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      // o atrito nunca deixa o campo parar: abaixo do piso, reacelera
      if (v > VEL * 2.2) { p.vx = (p.vx / v) * VEL * 2.2; p.vy = (p.vy / v) * VEL * 2.2; }
      else if (v < VEL * 0.5) { var e = (VEL * 0.5) / (v || 1); p.vx *= e; p.vy *= e; }
      p.x += p.vx; p.y += p.vy;
      if (p.x < -12) p.x = w + 12; else if (p.x > w + 12) p.x = -12;
      if (p.y < -12) p.y = h + 12; else if (p.y > h + 12) p.y = -12;
    }
    desenhar();
    raf = requestAnimationFrame(passo);
  }

  /* Um laço só, ligado e desligado por uma variável. A versão anterior
     parava e recomeçava o rAF a cada aviso do observer, e um aviso de
     "fora da tela" durante o layout inicial deixava o campo congelado
     até alguém rolar a página. */
  function girar() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (visivel && !mq.matches) raf = requestAnimationFrame(passo);
    else desenhar();
  }

  function iniciar() {
    if (!medir()) { requestAnimationFrame(iniciar); return; }
    lerCores();
    semear();
    girar();
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { visivel = e.isIntersecting; });
      girar();
    }, { threshold: 0 }).observe(canvas);
  }

  var tRedim;
  window.addEventListener('resize', function () {
    clearTimeout(tRedim);
    tRedim = setTimeout(function () { if (medir()) { semear(); girar(); } }, 160);
  });

  canvas.addEventListener('pointermove', function (e) {
    var r = canvas.getBoundingClientRect();
    ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; ptr.ativo = true;
    if (mq.matches) desenhar();
  });
  canvas.addEventListener('pointerleave', function () {
    ptr.ativo = false; ptr.x = ptr.y = -9999;
    if (mq.matches) desenhar();
  });

  document.addEventListener('atlas:tema', function () { lerCores(); if (mq.matches) desenhar(); });
  if (mq.addEventListener) mq.addEventListener('change', girar);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
