  /* 0. fontes > modelo > indicadores */
  INIT[0] = function (p) {
    var cv = $('.cv', p), cap = $('.vit-cap', p), pad = cap.getAttribute('data-pad');
    function liga(el) {
      var id = el.id, ehSrc = /^s\d/.test(id), par = ehSrc ? function (q) { return q === id + '>core' || /^core>/.test(q); } : function (q) { return q === 'core>' + id || /^s\d>core$/.test(q); };
      wireMarca(cv, par); el.classList.add('hl'); $('#core', p).classList.add('hl');
      $$('.nd[id^=s],.nd[id^=i]', p).forEach(function (n) { n.classList.toggle('dim', ehSrc ? (/^s/.test(n.id) && n !== el) : (/^i/.test(n.id) && n !== el)); });
      put(cap, el.getAttribute('data-tip') || 'O dado entra uma vez no modelo e ganha a regra de negócio antes de chegar a qualquer painel.');
    }
    function solta() { wireMarca(cv, null); $$('.nd', p).forEach(function (n) { n.classList.remove('hl', 'dim'); }); put(cap, pad); }
    $$('.nd[id^=s],.nd[id^=i]', p).forEach(function (el) { ['mouseenter', 'focus'].forEach(function (e) { el.addEventListener(e, function () { liga(el); }); }); ['mouseleave', 'blur'].forEach(function (e) { el.addEventListener(e, solta); }); });
  };

  /* 1. definição única */
  INIT[1] = function (p) {
    var cv = $('.cv', p), cap = $('#def-cap', p), A = [[70, 45, 82, 38, 60], [52, 80, 36, 70, 44], [88, 58, 64, 30, 74]], U = [76, 56, 68, 44, 80];
    function estado(u) {
      $$('.def-bars', p).forEach(function (g, k) { $$('i', g).forEach(function (b, j) { b.style.setProperty('--h', (u ? U[j] : A[k][j]) + '%'); }); });
      cv._bad = u ? null : function () { return true; }; $('.wires', cv).classList.toggle('off', !u); (cv._rehl || function () {})();
      put(cap, u ? 'Uma conta, escrita uma vez no modelo: todos os painéis leem o mesmo número.' : 'Cada painel faz a conta do seu jeito: números diferentes para a mesma métrica, e a reunião discute o dado.');
      marca('#vp1 [data-def]', 'data-def', u ? 1 : 0);
    }
    wireMarca(cv, null); pressiona('#vp1 [data-def]', function (b) { estado(+b.getAttribute('data-def')); }); estado(0);
  };

  /* 2. regra versionada */
  INIT[2] = function (p) {
    var V = [{ b: [40, 55, 38, 62, 50, 58], c: [['add', 70], ['add', 52], ['add', 40]] },
             { b: [46, 60, 44, 66, 54, 64], c: [['', 60], ['del', 48], ['add', 62], ['', 36]] },
             { b: [52, 66, 50, 72, 60, 70], c: [['', 66], ['', 44], ['del', 58], ['add', 72]] },
             { b: [60, 74, 58, 82, 68, 78], c: [['', 66], ['add', 54], ['', 72], ['', 40]] }];
    function v(n) {
      marca('#vp2 [data-v]', 'data-v', n); $$('#ver-bars i', p).forEach(function (b, i) { b.style.setProperty('--h', V[n].b[i] + '%'); });
      $('#ver-code', p).innerHTML = '<span class="vit-k" data-pt="Regra · v' + (n + 1) + '">' + T('Regra · v' + (n + 1)) + '</span>' + V[n].c.map(function (l) { return '<span class="' + l[0] + '">' + (l[0] === 'add' ? '+' : l[0] === 'del' ? '&minus;' : '&nbsp;') + '<s style="width:' + l[1] + '%"></s></span>'; }).join('');
    }
    pressiona('#vp2 [data-v]', function (b) { v(+b.getAttribute('data-v')); }); v(3);
  };

  /* 3. catálogo */
  INIT[3] = function (p) {
    var AREAS = ['Comercial', 'Financeiro', 'Operações'], N = 6, cv = $('.cat', p), sel = 0, filtro = '';
    $('#cat-list', p).innerHTML = Array.apply(null, Array(N)).map(function (_, i) { return '<button type="button" class="nd cat-i" id="ci' + i + '" data-a="' + (i % 3) + '" aria-pressed="false"><span style="display:grid;gap:.35rem"><s class="sk"></s><s class="sk a"></s></span><span class="tag" data-pt="' + AREAS[i % 3] + '">' + T(AREAS[i % 3]) + '</span></button>'; }).join('');
    function pinta() {
      $$('.cat-i', p).forEach(function (b, i) { b.classList.toggle('off', filtro !== '' && b.getAttribute('data-a') !== filtro); b.setAttribute('aria-pressed', String(i === sel)); });
      put($('#cat-area', p), AREAS[sel % 3]);
      cv.setAttribute('data-fios', 'ci' + sel + '>cat-d'); fios(cv); wireMarca(cv, function () { return true; });
    }
    $$('.cat-i', p).forEach(function (b, i) { b.addEventListener('click', function () { sel = i; pinta(); }); });
    pressiona('#vp3 [data-cat]', function (b) { filtro = b.getAttribute('data-cat'); marca('#vp3 [data-cat]', 'data-cat', filtro);
      var vis = $$('.cat-i', p).filter(function (x) { return filtro === '' || x.getAttribute('data-a') === filtro; }); if (vis.length && vis.indexOf($('#ci' + sel, p)) < 0) sel = +vis[0].id.slice(2); pinta(); });
    pinta();
  };

  /* 4. dashboard executivo/operacional */
  INIT[4] = function (p) {
    var db = $('#db', p), D = [0, 1, 2].map(function (a) { var r = sem(7 + a * 31);
      return { barras: Array.apply(null, Array(8)).map(function () { return 25 + r() * 70; }), linha: Array.apply(null, Array(14)).map(function (_, i) { return 8 + i * 0.9 + r() * 9; }),
        kpi: Array.apply(null, Array(4)).map(function () { return Array.apply(null, Array(7)).map(function () { return 2 + r() * 12; }); }),
        rosca: (function () { var x = [0.2 + r() * .3, 0.15 + r() * .25]; return [x[0], x[1], 1 - x[0] - x[1]]; })(), oper: Array.apply(null, Array(5)).map(function () { return 20 + r() * 75; }) }; });
    var bars = $$('#db-bars i', p), L = $('#db-l', p), A = $('#db-a', p), kp = $$('[data-k]', db), rows = $$('#db-oper .row u i', p), dn = [0, 1, 2].map(function (i) { return $('#dn' + i, p); }), atual = null, raf = 0;
    function linha(v) { var l = caminho(v, 100, 30, 26); L.setAttribute('d', l); A.setAttribute('d', l + ' L100 30 L0 30 Z'); }
    function aplica(d) { bars.forEach(function (b, i) { b.style.setProperty('--h', d.barras[i].toFixed(1) + '%'); }); rows.forEach(function (r, i) { r.style.setProperty('--w', d.oper[i].toFixed(0) + '%'); });
      d.kpi.forEach(function (k, i) { kp[i].setAttribute('d', caminho(k, 60, 16, 14)); }); var acc = 0;
      dn.forEach(function (c, i) { var q = d.rosca[i] * 100, w = Math.max(q - 1, 0.5); c.style.strokeDasharray = w.toFixed(1) + ' ' + (100 - w).toFixed(1); c.style.strokeDashoffset = (-acc).toFixed(1); acc += q; }); }
    function area(n) { var d = D[n]; marca('#vp4 [data-area]', 'data-area', n); aplica(d);
      if (!atual || reduz) { atual = d.linha.slice(); linha(atual); return; } var de = atual.slice(), t0 = null; cancelAnimationFrame(raf);
      (function passo(t) { if (t0 === null) t0 = t; var k = Math.min((t - t0) / 600, 1), e = 1 - Math.pow(1 - k, 3); atual = d.linha.map(function (y, i) { return de[i] + (y - de[i]) * e; }); linha(atual); if (k < 1) raf = requestAnimationFrame(passo); })(performance.now()); }
    pressiona('#vp4 [data-area]', function (b) { area(+b.getAttribute('data-area')); });
    pressiona('#vp4 [data-vis]', function (b) { db.setAttribute('data-vis', b.getAttribute('data-vis')); marca('#vp4 [data-vis]', 'data-vis', b.getAttribute('data-vis')); });
    area(0);
  };

  /* 5. self-service */
  INIT[5] = function (p) {
    var r = sem(11), S = []; for (var m = 0; m < 3; m++) { S[m] = []; for (var c = 0; c < 2; c++) S[m][c] = Array.apply(null, Array(7)).map(function (_, i) { return c ? 20 + i * 7 + r() * 22 : 22 + r() * 70; }); }
    var s = { m: 0, c: 0, g: 'b' }, bars = $$('#ss-bars i', p);
    function pinta() { var v = S[s.m][s.c]; bars.forEach(function (b, i) { b.style.setProperty('--h', v[i].toFixed(1) + '%'); });
      var l = caminho(v, 100, 30, 100); $('#ss-l', p).setAttribute('d', l); $('#ss-a', p).setAttribute('d', l + ' L100 30 L0 30 Z');
      $('#ss-bars', p).style.display = s.g === 'b' ? '' : 'none'; $('#ss-line', p).style.display = s.g === 'l' ? '' : 'none';
      put($('#ss-t', p), 'Medida ' + (s.m + 1) + ' por ' + (s.c ? 'período' : 'categoria')); marca('#vp5 [data-m]', 'data-m', s.m); marca('#vp5 [data-c]', 'data-c', s.c); marca('#vp5 [data-g]', 'data-g', s.g); }
    pressiona('#vp5 [data-m]', function (b) { s.m = +b.getAttribute('data-m'); pinta(); }); pressiona('#vp5 [data-c]', function (b) { s.c = +b.getAttribute('data-c'); pinta(); });
    pressiona('#vp5 [data-g]', function (b) { s.g = b.getAttribute('data-g'); pinta(); }); pinta();
  };

  /* 6. padrão visual */
  INIT[6] = function (p) {
    var PAL = [['#2E86FF', '#6FD4FF', '#2FB6A4'], ['#2FB6A4', '#6FD4FF', '#F2A33C'], ['#B26AF0', '#2E86FF', '#F2A33C'], ['#F2A33C', '#E5575B', '#2E86FF']], mock = $('#pv-mock', p);
    $('#pv-pal', p).innerHTML = PAL.map(function (c, i) { return '<button type="button" data-p="' + i + '" aria-pressed="' + (i === 0) + '" aria-label="Paleta ' + (i + 1) + '">' + c.map(function (x) { return '<i style="--c:' + x + '"></i>'; }).join('') + '</button>'; }).join('');
    function pal(i) { mock.style.setProperty('--p1', PAL[i][0]); mock.style.setProperty('--p2', PAL[i][1]); mock.style.setProperty('--p3', PAL[i][2]); marca('#pv-pal [data-p]', 'data-p', i); }
    pressiona('#pv-pal [data-p]', function (b) { pal(+b.getAttribute('data-p')); }); pal(0);
    $('#pv-g', p).addEventListener('click', function () { var on = mock.classList.toggle('g'); this.setAttribute('aria-pressed', String(on)); });
    $('#pv-m', p).addEventListener('click', function () { var on = mock.classList.toggle('m'); this.setAttribute('aria-pressed', String(on)); });
  };

  /* 7. performance */
  INIT[7] = function (p) {
    var t = [], sl = $$('#pf-slow .pf-t', p), fa = $$('#pf-fast .pf-t', p), ps = $('#pf-ps', p), pf = $('#pf-pf', p);
    function roda() { t.forEach(clearTimeout); t = []; sl.concat(fa).forEach(function (x) { x.classList.remove('ok'); }); ps.style.transition = pf.style.transition = 'none'; ps.style.width = pf.style.width = '0';
      void ps.offsetWidth; var lento = reduz ? 0 : 3800, rapido = reduz ? 0 : 700; ps.style.transition = 'width ' + lento + 'ms linear'; pf.style.transition = 'width ' + rapido + 'ms linear'; ps.style.width = pf.style.width = '100%';
      sl.forEach(function (x, i) { t.push(setTimeout(function () { x.classList.add('ok'); }, lento * (i + 1) / 4)); }); fa.forEach(function (x, i) { t.push(setTimeout(function () { x.classList.add('ok'); }, rapido * (i + 1) / 4)); }); }
    $('#pf-go', p).addEventListener('click', roda); p._mostrou = function () { if (!p._ja) { p._ja = 1; roda(); } };
  };

  /* 8. nomenclatura e layout / 10. migração */
  INIT[8] = function (p) {
    var g = $('#gv', p), grade = $('#gv-grid', p), cap = $('#gv-cap', p), h = '';
    for (var i = 0; i < 12; i++) h += '<div class="nd gv-t"><s class="sk a"></s><span class="nome" data-pt="Área · Tema · Visão">' + T('Área · Tema · Visão') + '</span><em></em><s class="sk b"></s></div>'; grade.innerHTML = h;
    var C = { antes: 'Cada painel com um nome, um layout e uma cor: ninguém sabe onde achar o quê.', depois: 'Nomenclatura e layout padronizados: quem abre qualquer painel sabe onde está cada coisa.' };
    function e(x) { g.setAttribute('data-estado', x); put(cap, C[x]); marca('#vp8 [data-est]', 'data-est', x); }
    pressiona('#vp8 [data-est]', function (b) { e(b.getAttribute('data-est')); }); e('antes');
  };

  /* 9. acesso por perfil */
  INIT[9] = function (p) {
    var PERF = ['Executivo', 'Analista', 'Área'], ACC = [[1, 1, 0, 1, 0], [1, 1, 1, 1, 1], [0, 1, 1, 0, 1]], vis = 0, m = $('#ac-m', p), CK = '<svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg>';
    function desenha() { var h = '<span></span>' + [1, 2, 3, 4, 5].map(function (n) { return '<span class="vit-k">P' + n + '</span>'; }).join('');
      PERF.forEach(function (nome, r) { h += '<button type="button" class="vit-chip rt" data-r="' + r + '" aria-pressed="' + (r === vis) + '" data-pt="' + nome + '">' + T(nome) + '</button>' + ACC[r].map(function (a, c) { return '<button type="button" class="ac-c" data-r="' + r + '" data-c="' + c + '" aria-pressed="' + !!a + '" aria-label="' + nome + ', painel ' + (c + 1) + '">' + CK + '</button>'; }).join(''); });
      m.innerHTML = h; put($('#ac-t', p), 'Visto por: ' + PERF[vis]); $$('#ac-vg i', p).forEach(function (i, c) { i.classList.toggle('off', !ACC[vis][c]); });
      $$('.rt', m).forEach(function (b) { b.addEventListener('click', function () { vis = +b.getAttribute('data-r'); desenha(); }); });
      $$('.ac-c', m).forEach(function (b) { b.addEventListener('click', function () { var r = +b.getAttribute('data-r'), c = +b.getAttribute('data-c'); ACC[r][c] = ACC[r][c] ? 0 : 1; vis = r; desenha(); }); }); }
    desenha();
  };
  INIT[10] = function (p) {
    var mg = $('#mg', p), cap = $('#mg-cap', p), N = 24, r = sem(5), TP = [], G = 4, rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16, h = '';
    for (var g = 0; g < G; g++) h += '<div class="mg-g" data-g="' + g + '" data-pt="Conjunto">' + T('Conjunto') + '</div>'; for (var i = 0; i < N; i++) { TP.push([r(), r()]); h += '<i class="mg-t"></i>'; } mg.innerHTML = h;
    function pos(e) { var W = mg.clientWidth, H = mg.clientHeight, ts = $$('.mg-t', mg), gs = $$('.mg-g', mg);
      gs.forEach(function (x, g) { x.style.left = ((g + 0.5) / G * W - 3.3 * rem) + 'px'; });
      ts.forEach(function (t, i) { var x, y; if (e === 'antes') { x = 8 + TP[i][0] * (W - 60); y = 8 + TP[i][1] * (H - 40); t.style.transform = 'rotate(' + (TP[i][0] * 40 - 20).toFixed(0) + 'deg)'; }
        else { var g = i % G, k = (i / G) | 0, cx = (g + 0.5) / G * W - 3.3 * rem; x = cx + 0.5 * rem + (k % 3) * 2 * rem; y = H / 2 - 3.3 * rem + 0.8 * rem + ((k / 3) | 0) * 1.7 * rem + 0.6 * rem; t.style.transform = 'none'; }
        t.style.left = x + 'px'; t.style.top = y + 'px'; }); }
    var C = { antes: 'Mais de 200 painéis crescendo sem padrão, sem governança e sem fonte única da verdade.', depois: 'Painéis migrados e consolidados num conjunto padronizado, todos sobre o mesmo modelo.' };
    function e(x) { mg.setAttribute('data-e', x); put(cap, C[x]); marca('#vp10 [data-mg]', 'data-mg', x); pos(x); }
    pressiona('#vp10 [data-mg]', function (b) { e(b.getAttribute('data-mg')); }); p._mostrou = function () { pos(mg.getAttribute('data-e')); }; e('antes');
  };

  /* 11. documentação */
  INIT[11] = function (p) {
    var TB = [{ n: 'Tabela fato', f: [['chave', 70], ['chave', 55], ['medida', 62], ['medida', 48]] }, { n: 'Dimensão 1', f: [['chave', 60], ['atributo', 72], ['atributo', 50]] },
             { n: 'Dimensão 2', f: [['chave', 58], ['atributo', 66], ['atributo', 44], ['atributo', 70]] }, { n: 'Dimensão 3', f: [['chave', 64], ['atributo', 52]] }], cv = $('.dc', p);
    function t(i) { marca('#vp11 [data-t]', 'data-t', i); put($('#dc-n', p), TB[i].n);
      $('#dc-f', p).innerHTML = TB[i].f.map(function (f) { return '<span><s class="sk" style="width:' + f[1] + '%"></s><span class="tag ' + (f[0] === 'medida' ? 'ac' : '') + '" data-pt="' + f[0] + '">' + T(f[0]) + '</span></span>'; }).join('');
      requestAnimationFrame(function () { fios(cv); wireMarca(cv, function (q) { return q === 't' + i + '>d'; }); }); }
    pressiona('#vp11 [data-t]', function (b) { t(+b.getAttribute('data-t')); }); t(0);
  };

