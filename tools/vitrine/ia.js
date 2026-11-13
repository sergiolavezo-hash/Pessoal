  /* 0. modelos preditivos */
  INIT[0] = function (p) {
    var r = sem(21), cap = $('#iapv-cap', p), H = $('#iapv-h', p), F = $('#iapv-f', p), B = $('#iapv-b', p), W = $('#iapv-w', p);
    var SER = [0, 1, 2, 3].map(function (k) {
      var h = Array.apply(null, Array(12)).map(function (_, i) { return 14 + i * (k === 1 ? -0.5 : 0.9) + Math.sin(i + k) * 3 + r() * 3; });
      var last = h[11], dir = k === 1 ? -1 : k === 2 ? 1.4 : k === 3 ? -0.9 : 1.1;
      var f = Array.apply(null, Array(8)).map(function (_, i) { return last + (i + 1) * dir * 0.9 + Math.sin(i * 1.3) * 1.5; });
      return { h: h, f: f };
    });
    var CAPS = ['Aprende com o histórico da operação e estima a demanda enquanto ainda dá tempo de agir.', 'Antecipa a ruptura antes de ela acontecer, com a janela para repor.', 'Estima o risco enquanto ainda dá para agir sobre ele.', 'Aponta quem tende a sair antes de sair.'];
    function xy(v, i, off) { return (off + i * (100 - off) / (v.length - 1 || 1)).toFixed(1); }
    function pinta(n) {
      var d = SER[n], all = d.h.concat(d.f), mn = Math.min.apply(null, all) - 3, mx = Math.max.apply(null, all) + 3, Y = function (v) { return (38 - (v - mn) / (mx - mn) * 36).toFixed(1); };
      var hp = d.h.map(function (v, i) { return (i ? 'L' : 'M') + (i * 62 / 11).toFixed(1) + ' ' + Y(v); }).join(' ');
      var fp = 'M62 ' + Y(d.h[11]) + ' ' + d.f.map(function (v, i) { return 'L' + (62 + (i + 1) * 38 / 8).toFixed(1) + ' ' + Y(v); }).join(' ');
      var up = d.f.map(function (v, i) { return 'L' + (62 + (i + 1) * 38 / 8).toFixed(1) + ' ' + Y(v + 1 + i * 0.7); }).join(' '), dn = d.f.map(function (v, i) { return [62 + (i + 1) * 38 / 8, Y(v - 1 - i * 0.7)]; }).reverse().map(function (q) { return 'L' + q[0].toFixed(1) + ' ' + q[1]; }).join(' ');
      H.setAttribute('d', hp); F.setAttribute('d', fp); B.setAttribute('d', 'M62 ' + Y(d.h[11]) + ' ' + up + ' ' + dn + ' Z');
      W.style.left = '62%'; W.style.width = (n === 1 || n === 2 ? 22 : 30) + '%';
      marca('#vp0 [data-pv]', 'data-pv', n); put(cap, CAPS[n]);
      F.style.transition = 'none'; F.style.strokeDashoffset = '0';
    }
    pressiona('#vp0 [data-pv]', function (b) { pinta(+b.getAttribute('data-pv')); }); pinta(0);
  };

  /* 1. machine learning */
  INIT[1] = function (p) {
    var pl = $('#iaml', p), cap = $('#iaml-cap', p), rr = sem(5), PT = [], n = 34;
    var html = '<i class="ml-line"></i>';
    for (var i = 0; i < n; i++) { var g = i % 2 ? 'a' : 'b'; PT.push({ g: g, x0: rr() * 100, y0: rr() * 100, x1: (g === 'a' ? 12 + rr() * 34 : 54 + rr() * 34), y1: (g === 'a' ? 55 + rr() * 35 : 8 + rr() * 38) }); html += '<i class="ml-p ' + g + '"></i>'; }
    pl.insertAdjacentHTML('beforeend', html);
    var E = $$('.ml-p', pl);
    function m(x) {
      pl.setAttribute('data-m', x); marca('#vp1 [data-ml]', 'data-ml', x);
      E.forEach(function (e, i) { e.style.left = (x ? PT[i].x1 : PT[i].x0).toFixed(1) + '%'; e.style.top = (x ? PT[i].y1 : PT[i].y0).toFixed(1) + '%'; });
      put(cap, x ? 'Depois de aprender com o histórico, o modelo separa o que importa: padrões que ninguém escreveu como regra.' : 'Antes de aprender, os dados da operação são só pontos soltos, sem padrão visível.');
    }
    pressiona('#vp1 [data-ml]', function (b) { m(+b.getAttribute('data-ml')); });
    $('#iaml-go', p).addEventListener('click', function () { m(0); setTimeout(function () { m(1); }, reduz ? 0 : 700); }); m(0);
  };

  /* 2. detecção de anomalias */
  INIT[2] = function (p) {
    var modo = 'fech', cap = $('#iaan-cap', p), L = $('#iaan-l', p), R = $('#iaan-r', p), spk = $('#iaan-s', p), fch = $('#iaan-e', p), a1 = $('#iaan-a1', p), a2 = $('#iaan-a2', p), t = [], rr = sem(33);
    var V = Array.apply(null, Array(40)).map(function (_, i) { return 22 + Math.sin(i / 3) * 3 + rr() * 3 + (i === 24 ? 14 : 0); });
    var Y = function (v) { return (38 - (v - 15) / 26 * 36); }, X = function (i) { return i * 100 / 39; };
    var pathAte = function (n) { return V.slice(0, n + 1).map(function (v, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); }).join(' '); };
    L.setAttribute('d', pathAte(39));
    var plot = $('#iaan', p);
    function pos(el, i) { el.style.left = X(i) + '%'; el.style.top = (Y(V[i]) / 40 * 100) + '%'; }
    pos(spk, 24); pos(a1, 24); pos(fch, 39); pos(a2, 39);
    function zera() { t.forEach(clearTimeout); t = []; [spk, fch, a1, a2].forEach(function (e) { e.classList.remove('on'); }); R.setAttribute('d', ''); }
    function roda() {
      zera();
      for (var i = 0; i < 40; i++) (function (i) { t.push(setTimeout(function () {
        R.setAttribute('d', pathAte(i));
        if (i === 24) { spk.classList.add('on'); if (modo === 'agora') a1.classList.add('on'); }
        if (i === 39 && modo === 'fech') { fch.classList.add('on'); a2.classList.add('on'); }
      }, reduz ? 0 : 70 * i)); })(i);
    }
    function m(x) { modo = x; marca('#vp2 [data-an]', 'data-an', x); put(cap, x === 'agora' ? 'O desvio é apontado no instante em que acontece: dá para agir enquanto ainda importa.' : 'O desvio só aparece no fechamento do mês, quando o estrago já foi feito.'); roda(); }
    pressiona('#vp2 [data-an]', function (b) { m(b.getAttribute('data-an')); }); $('#iaan-go', p).addEventListener('click', roda);
    p._mostrou = function () { if (!p._ja) { p._ja = 1; m('fech'); } }; put(cap, 'O desvio só aparece no fechamento do mês, quando o estrago já foi feito.');
  };

  /* 3. GenAI e agentes */
  INIT[3] = function (p) {
    var cv = $('#iaga', p), cap = $('#iaga-cap', p), B = $('#iaga-b', p), tm = 0, rr = sem(8);
    B.innerHTML = '<i></i><i></i><i></i><i></i><i></i><i></i>'; wireMarca(cv, null);
    var A = [0, 1, 2].map(function () { return Array.apply(null, Array(6)).map(function () { return 25 + rr() * 70; }); });
    function ask(n) {
      marca('#vp3 [data-ga]', 'data-ga', n); clearTimeout(tm); cv.setAttribute('data-s', 't');
      tm = setTimeout(function () { cv.setAttribute('data-s', ''); $$('i', B).forEach(function (b, i) { b.style.setProperty('--h', A[n][i] + '%'); }); }, reduz ? 0 : 900);
    }
    $('#gr', p).addEventListener('mouseenter', function () { wireMarca(cv, function () { return true; }); put(cap, 'A resposta vem com o contexto: de qual fonte e de qual modelo o número saiu.'); });
    $('#gr', p).addEventListener('mouseleave', function () { wireMarca(cv, null); put(cap, 'A pergunta em linguagem natural volta como número, com o contexto de onde ele veio.'); });
    pressiona('#vp3 [data-ga]', function (b) { ask(+b.getAttribute('data-ga')); }); put(cap, 'A pergunta em linguagem natural volta como número, com o contexto de onde ele veio.'); ask(0);
  };

  /* 4. Document AI */
  INIT[4] = function (p) {
    var pg = $('#iadc-p', p), rows = $('#iadc-r', p), cap = $('#iadc-cap', p), tipo = 0, t = [];
    var DOC = [[0, 60, 90, 40, 80, 55, 70, 35, 85, 50], [0, 45, 70, 90, 30, 80, 60, 40, 75, 25], [0, 90, 50, 70, 85, 35, 65, 80, 45, 55]];
    var CAPS = ['O contrato é lido e as informações que importam viram campos.', 'A nota é lida e os campos saem prontos para consulta.', 'O relatório é lido e o que estava no texto vira dado.'];
    rows.innerHTML = Array.apply(null, Array(5)).map(function () { return '<span><s></s><s></s></span>'; }).join('');
    function desenha() { pg.innerHTML = '<i class="beam"></i>' + DOC[tipo].map(function (w, i) { return '<s' + (i === 0 ? ' class="h"' : '') + ' style="width:' + (i === 0 ? 45 : w) + '%"></s>'; }).join(''); }
    function le() {
      t.forEach(clearTimeout); t = []; $$('span', rows).forEach(function (s) { s.classList.remove('on'); }); desenha(); pg.classList.remove('scan'); void pg.offsetWidth; if (!reduz) pg.classList.add('scan');
      $$('span', rows).forEach(function (s, i) { t.push(setTimeout(function () { s.classList.add('on'); }, reduz ? 0 : 300 + 260 * i)); });
      put(cap, CAPS[tipo]);
    }
    pressiona('#vp4 [data-dc]', function (b) { tipo = +b.getAttribute('data-dc'); marca('#vp4 [data-dc]', 'data-dc', tipo); le(); });
    $('#iadc-go', p).addEventListener('click', le); p._mostrou = function () { if (!p._ja) { p._ja = 1; le(); } };
  };

  /* 5. automação de processos */
  INIT[5] = function (p) {
    var cv = $('#iaau', p), cap = $('#iaau-cap', p), bar = $('#iaau-f', p), svg = $('.wires', cv), modo = 0, t = [], N = $$('.au-n', cv);
    var BOLT = '<svg class="ico-s" viewBox="0 0 24 24"><path d="M13 3 5 14h6l-1 7 8-11h-6z"/></svg>', PES = '<svg class="ico-s" viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>';
    wireMarca(cv, null);
    function icones() { $$('.au-i', cv).forEach(function (e) { e.innerHTML = modo ? BOLT : PES; }); }
    function zera() { t.forEach(clearTimeout); t = []; N.forEach(function (n) { n.classList.remove('run', 'ok', 'wait'); }); bar.style.transition = 'none'; bar.style.width = '0'; }
    function roda() {
      zera(); void bar.offsetWidth; var D = modo ? 380 : 1100, total = D * 5 + (modo ? 0 : 2600);
      bar.style.transition = 'width ' + (reduz ? 0 : total) + 'ms linear'; bar.style.width = '100%'; var at = 0;
      N.forEach(function (n, i) {
        if (!modo && i > 0) { t.push(setTimeout(function () { N[i - 1].classList.add('ok'); n.classList.add('wait'); }, reduz ? 0 : at)); at += 520; }
        t.push(setTimeout(function () { n.classList.remove('wait'); n.classList.add('run'); }, reduz ? 0 : at)); at += D;
        t.push(setTimeout(function () { n.classList.remove('run'); n.classList.add('ok'); }, reduz ? 0 : at));
      });
    }
    function m(x) {
      modo = x; cv.setAttribute('data-m', x); svg.classList.toggle('off', !x); cv._bad = x ? null : function () { return true; }; cv._rehl(); icones(); marca('#vp5 [data-au]', 'data-au', x);
      put(cap, x ? 'Automatizado, cada etapa dispara a seguinte na hora: sem espera, sem fila e sem retrabalho.' : 'Passando de mão em mão, cada etapa espera alguém ver, abrir e fazer: o processo anda no ritmo da fila.'); zera();
    }
    pressiona('#vp5 [data-au]', function (b) { m(+b.getAttribute('data-au')); }); $('#iaau-go', p).addEventListener('click', roda); m(0);
  };
