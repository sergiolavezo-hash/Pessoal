/**
 * Constelação do hero — pontos que se ligam quando chegam perto.
 *
 * Canvas 2D, sem dependência: funciona onde não há WebGL e custa uma
 * fração do que custava a cena Three.js que ocupava este lugar.
 *
 * Três decisões:
 *
 * 1. O CAMPO RESPIRA. Cada ponto tem uma velocidade própria e lenta, e a
 *    malha de linhas se refaz a cada quadro conforme as distâncias mudam.
 *    É o movimento que dá a impressão de algo vivo atrás do texto.
 *
 * 2. O PONTEIRO PUXA. Dentro de um raio, os pontos derivam na direção do
 *    cursor e as linhas até ele ficam mais fortes. O campo responde a
 *    quem está lendo, em vez de só rodar sozinho.
 *
 * 3. CORES DO TEMA. Os tons saem das próprias variáveis CSS, relidas
 *    quando o tema troca, então a mesma peça serve o claro e o escuro.
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
  var LIG = 148;        // distância máxima de ligação, em px de CSS
  var RAIO_PTR = 190;   // alcance do ponteiro
  var pontos = [];
  var w = 0, h = 0, dpr = 1;
  var ptr = { x: -9999, y: -9999, ativo: false };
  var cor = { ponto: '#2E86FF', destaque: '#6FD4FF', linha: '46,134,255' };
  var rodando = false, raf = 0;

  function lerCores() {
    var cs = getComputedStyle(document.documentElement);
    var a = (cs.getPropertyValue('--accent') || '').trim();
    var l = (cs.getPropertyValue('--accent-light') || '').trim();
    if (a) cor.ponto = a;
    if (l) cor.destaque = l;
    // linha em rgb() para poder variar o alfa por distância
    var m = /^#([0-9a-f]{6})$/i.exec(cor.ponto);
    if (m) {
      var n = parseInt(m[1], 16);
      cor.linha = ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
    }
  }

  function semear() {
    // densidade constante por área, com teto para não castigar telas grandes
    var alvo = Math.min(110, Math.max(28, Math.round((w * h) / 16000)));
    pontos = [];
    for (var i = 0; i < alvo; i++) {
      pontos.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() < 0.18 ? 2.1 : 1.3,
        q: Math.random() < 0.18   // ponto de destaque
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

    // ligações entre vizinhos
    for (var i = 0; i < pontos.length; i++) {
      var a = pontos[i];
      for (var j = i + 1; j < pontos.length; j++) {
        var b = pontos[j];
        var dx = a.x - b.x, dy = a.y - b.y;
        var d2 = dx * dx + dy * dy;
        if (d2 > LIG * LIG) continue;
        var t = 1 - Math.sqrt(d2) / LIG;
        ctx.strokeStyle = 'rgba(' + cor.linha + ',' + (t * 0.3).toFixed(3) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      // ligação até o ponteiro
      if (ptr.ativo) {
        var px = a.x - ptr.x, py = a.y - ptr.y;
        var pd2 = px * px + py * py;
        if (pd2 < RAIO_PTR * RAIO_PTR) {
          var pt = 1 - Math.sqrt(pd2) / RAIO_PTR;
          ctx.strokeStyle = 'rgba(' + cor.linha + ',' + (pt * 0.5).toFixed(3) + ')';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(ptr.x, ptr.y); ctx.stroke();
        }
      }
    }

    // pontos por cima das linhas
    for (var k = 0; k < pontos.length; k++) {
      var p = pontos[k];
      ctx.fillStyle = p.q ? cor.destaque : cor.ponto;
      ctx.globalAlpha = p.q ? 0.9 : 0.55;
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
          var f = (1 - d / RAIO_PTR) * 0.016;
          p.vx += (dx / d) * f; p.vy += (dy / d) * f;
        }
      }
      // atrito, para o puxão do ponteiro não acumular velocidade
      p.vx *= 0.992; p.vy *= 0.992;
      var v = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (v > 0.6) { p.vx = (p.vx / v) * 0.6; p.vy = (p.vy / v) * 0.6; }
      p.x += p.vx; p.y += p.vy;
      // volta pela borda oposta
      if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
      if (p.y < -10) p.y = h + 10; else if (p.y > h + 10) p.y = -10;
    }
    desenhar();
    raf = requestAnimationFrame(passo);
  }

  function parar() { if (raf) { cancelAnimationFrame(raf); raf = 0; } rodando = false; }
  function tocar() {
    if (rodando || mq.matches) return;
    rodando = true; raf = requestAnimationFrame(passo);
  }

  function iniciar() {
    if (!medir()) return;
    lerCores();
    semear();
    desenhar();
    if (!mq.matches) tocar();
  }

  // só anima enquanto o hero está na tela
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.isIntersecting ? tocar() : parar(); });
    }, { threshold: 0 }).observe(canvas);
  }

  var tRedim;
  window.addEventListener('resize', function () {
    clearTimeout(tRedim);
    tRedim = setTimeout(function () { if (medir()) { semear(); desenhar(); } }, 160);
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

  // o tema troca as cores do campo
  document.addEventListener('atlas:tema', function () { lerCores(); desenhar(); });
  if (mq.addEventListener) mq.addEventListener('change', function () { mq.matches ? (parar(), desenhar()) : tocar(); });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
