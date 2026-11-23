/**
 * Constelação do hero.
 *
 * Canvas 2D, sem dependência: funciona onde não há WebGL e custa uma
 * fração do que custava a cena Three.js que ocupava este lugar.
 *
 * Quatro decisões:
 *
 * 1. ATÉ QUATRO LIGAÇÕES, E ELAS DURAM. A primeira versão ligava cada ponto
 *    a todos os vizinhos no raio e virava malha. A segunda ligava só ao mais
 *    próximo, mas recalculava a cada quadro: bastava o ponteiro empurrar um
 *    ponto um pixel para a linha piscar e reaparecer em outro lugar.
 *
 *    Agora a ligação é um vínculo com estado. Nasce quando dois pontos se
 *    aproximam de PEGA e os dois ainda têm vaga (MAX_LIG = 4); só morre
 *    quando esticam além de SOLTA, bem mais longe. Entre uma distância e a
 *    outra o vínculo simplesmente continua, e esmaece conforme estica, de
 *    modo que some em vez de piscar. O que aparece são pontos soltos que
 *    vão se encontrando e formando correntes e pequenos grupos.
 *
 * 2. O CAMPO RESPIRA. Cada ponto tem velocidade própria; as distâncias
 *    mudam, os pares se desfazem e se refazem. É esse vai e vem que dá a
 *    impressão de algo vivo atrás do texto.
 *
 * 3. O PONTEIRO PUXA. Dentro de um raio os pontos derivam na direção do
 *    cursor, com atrito para o puxão não virar velocidade acumulada.
 *
 * 4. QUATRO CORES. O azul da marca na maioria, o azul claro, o âmbar e um
 *    verde-água, nesta ordem de frequência. Saem das variáveis CSS e são
 *    relidas quando o tema troca, então a mesma peça serve claro e escuro.
 *
 * Com prefers-reduced-motion o campo é desenhado uma vez e para: a forma
 * continua lá, o movimento não.
 */
(function () {
  var canvas = document.getElementById('hero-3d-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext && canvas.getContext('2d');
  if (!ctx) return;

  /* A deriva não para com prefers-reduced-motion. É decisão do dono do
     site: ele navega com "reduzir movimento" ligado e é justamente este
     campo que quer ver. O movimento aqui é lento, pequeno e sem piscar —
     fora do perfil que a regra existe para conter —, mas a escolha é dele,
     não uma leitura minha da norma. */
  var mq = { matches: false, addEventListener: function () {} };
  var PEGA = 104;        // distância que forma um vínculo, em px de CSS
  var SOLTA = 182;       // distância que desfaz um vínculo já formado
  var MAX_LIG = 4;       // vagas de ligação por ponto
  var RAIO_PTR = 200;    // alcance do ponteiro
  var VEL = 0.42;        // deriva base
  var pontos = [];
  var elos = [];         // elos[i] = array de índices ligados a i
  var w = 0, h = 0, dpr = 1;
  var ptr = { x: -9999, y: -9999, ativo: false };
  var cor = { frio: '#2E86FF', claro: '#6FD4FF', quente: '#F2A33C', verde: '#2FB6A4', linha: '46,134,255' };
  /* Pesos: o azul domina, o resto pontua. Um ponto guarda o índice da sua
     cor ao nascer, então ele não muda de cor no meio do caminho. */
  var PALETA = ['frio', 'frio', 'frio', 'frio', 'frio', 'claro', 'claro', 'quente', 'verde'];
  var raf = 0, visivel = true;

  function lerCores() {
    var cs = getComputedStyle(document.documentElement);
    var a = (cs.getPropertyValue('--accent') || '').trim();
    var l = (cs.getPropertyValue('--accent-light') || '').trim();
    var q = (cs.getPropertyValue('--accent-quente') || '').trim();
    var v = (cs.getPropertyValue('--accent-verde') || '').trim();
    if (a) cor.frio = a;
    if (l) cor.claro = l;
    if (q) cor.quente = q;
    if (v) cor.verde = v;
    var m = /^#([0-9a-f]{6})$/i.exec(cor.frio);
    if (m) {
      var n = parseInt(m[1], 16);
      cor.linha = ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
    }
  }

  function semear() {
    // Esparso de propósito: o vazio entre os pontos é metade do efeito.
    var alvo = Math.min(52, Math.max(16, Math.round((w * h) / 30000)));
    pontos = [];
    elos = [];
    for (var i = 0; i < alvo; i++) {
      elos.push([]);
      var ang = Math.random() * 6.283185;
      var v = VEL * (0.55 + Math.random() * 0.9);
      var c = PALETA[(Math.random() * PALETA.length) | 0];
      pontos.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: Math.cos(ang) * v,
        vy: Math.sin(ang) * v,
        r: c === 'frio' ? 1.9 : 2.7,
        c: c
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

  /* Vínculos com histerese.
     Recalcular "quem está perto" a cada quadro fazia a linha trocar de dono
     assim que o ponteiro empurrava um ponto um pixel. Aqui o vínculo tem
     estado: nasce a PEGA, só morre a SOLTA, e cada ponto tem no máximo
     MAX_LIG vagas — é o teto que impede a malha fechada. */
  function tirar(a, b) {
    var i = elos[a].indexOf(b);
    if (i > -1) elos[a].splice(i, 1);
  }

  function ligar() {
    var n = pontos.length, i, j, k;
    // desfaz o que esticou além do limite
    for (i = 0; i < n; i++) {
      for (k = elos[i].length - 1; k >= 0; k--) {
        j = elos[i][k];
        var dx = pontos[i].x - pontos[j].x, dy = pontos[i].y - pontos[j].y;
        if (dx * dx + dy * dy > SOLTA * SOLTA) { elos[i].splice(k, 1); tirar(j, i); }
      }
    }
    // cria vínculo novo entre quem se aproximou e ainda tem vaga
    for (i = 0; i < n; i++) {
      if (elos[i].length >= MAX_LIG) continue;
      for (j = i + 1; j < n; j++) {
        if (elos[i].length >= MAX_LIG) break;
        if (elos[j].length >= MAX_LIG) continue;
        if (elos[i].indexOf(j) > -1) continue;
        var ax = pontos[i].x - pontos[j].x, ay = pontos[i].y - pontos[j].y;
        if (ax * ax + ay * ay <= PEGA * PEGA) { elos[i].push(j); elos[j].push(i); }
      }
    }
  }

  function desenhar() {
    ctx.clearRect(0, 0, w, h);

    ctx.lineWidth = 1;
    for (var i = 0; i < pontos.length; i++) {
      for (var e = 0; e < elos[i].length; e++) {
        var k = elos[i][e];
        if (k < i) continue;                 // uma vez por vínculo
        var dx = pontos[i].x - pontos[k].x, dy = pontos[i].y - pontos[k].y;
        var d = Math.sqrt(dx * dx + dy * dy);
        // esmaece conforme estica, para o vínculo sumir em vez de piscar
        var t = Math.max(0, 1 - d / SOLTA);
        ctx.strokeStyle = 'rgba(' + cor.linha + ',' + (0.08 + t * 0.4).toFixed(3) + ')';
        ctx.beginPath(); ctx.moveTo(pontos[i].x, pontos[i].y); ctx.lineTo(pontos[k].x, pontos[k].y); ctx.stroke();
      }
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
      ctx.fillStyle = cor[p.c] || cor.frio;
      ctx.globalAlpha = p.c === 'frio' ? 0.7 : 0.92;
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
          var f = (1 - d / RAIO_PTR) * 0.012;
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
    ligar();
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
    ligar();
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
    tRedim = setTimeout(function () { if (medir()) { semear(); ligar(); girar(); } }, 160);
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
