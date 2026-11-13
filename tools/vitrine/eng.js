  /* 0. conectores gerenciados */
  INIT[0] = function (p) {
    var cv = $('.cn', p), cap = $('#cn-cap', p), svg = $('.wires', cv);
    wireMarca(cv, null);
    function est(s) {
      cv.setAttribute('data-s', s); svg.classList.toggle('off', !s); cv._bad = s ? null : function () { return true; }; cv._rehl();
      put(cap, s ? 'Cada fonte tem agenda, monitoramento e alerta: se algo falha, alguém vê antes do usuário.' : 'Cada fonte com o seu script: funciona até quebrar, e ninguém sabe de onde veio o número.');
      marca('#vp0 [data-cn]', 'data-cn', s);
    }
    pressiona('#vp0 [data-cn]', function (b) { est(+b.getAttribute('data-cn')); });
    $$('.src', p).forEach(function (b) { b.addEventListener('click', function () {
      [b, $('#hub', p)].forEach(function (e) { e.classList.remove('sync'); void e.offsetWidth; e.classList.add('sync'); });
    }); });
    est(0);
  };

  /* 1. streaming */
  INIT[1] = function (p) {
    var sm = $('#sm', p), cap = $('#sm-cap', p);
    function m(x) {
      sm.setAttribute('data-m', x); marca('#vp1 [data-sm]', 'data-sm', x);
      put(cap, x === 'lote' ? 'No lote, o dado espera a próxima janela: quem decide enxerga o que aconteceu horas atrás.' : 'No streaming, cada evento chega ao destino assim que acontece.');
    }
    pressiona('#vp1 [data-sm]', function (b) { m(b.getAttribute('data-sm')); }); m('lote');
  };

  /* 2. integração de sistemas legados */
  INIT[2] = function (p) {
    var cv = $('#lg', p), cap = $('#lg-cap', p), svg = $('.wires', cv);
    wireMarca(cv, null);
    function m(x) {
      cv.setAttribute('data-m', x); svg.classList.toggle('off', !x);
      cv.setAttribute('data-fios', x ? 'l0>lh;l1>lh;lh>pa0;lh>pa1' : 'l0>pa0;l0>pa1;l1>pa0;l1>pa1');
      cv._bad = x ? null : function () { return true; }; fios(cv);
      put(cap, x ? 'Uma camada de integração concentra a conversa: cada sistema fala só com ela, e o legado deixa de ser o gargalo.' : 'Cada sistema fala com todos os outros: qualquer mudança em um quebra os demais.');
      marca('#vp2 [data-lg]', 'data-lg', x);
    }
    pressiona('#vp2 [data-lg]', function (b) { m(+b.getAttribute('data-lg')); }); m(0);
  };

  /* 3. APIs e arquivos */
  INIT[3] = function (p) {
    var modo = 'api', body = $('#ap-body', p), rows = $('#ap-rows', p), cap = $('#ap-cap', p), t = [];
    rows.innerHTML = Array.apply(null, Array(6)).map(function () { return '<span><s></s><s></s><s></s><s></s></span>'; }).join('');
    function pinta() {
      if (modo === 'api') {
        body.innerHTML = '<span class="br">{</span>' + [60, 44, 70, 38].map(function (w, i) { return '<span class="ind"><s style="width:' + (18 + i * 4) + '%"></s><s style="width:' + w + '%"></s></span>'; }).join('') + '<span class="br">}</span>';
        put($('#ap-k', p), 'Resposta da API');
        put(cap, 'A resposta da API vira linhas de uma tabela, com a estrutura mantida a cada chamada.');
      } else {
        body.innerHTML = ['CSV', 'JSON', 'XLSX'].map(function (f, i) { return '<span><span class="tag ac">' + f + '</span><s style="width:' + (60 - i * 12) + '%"></s></span>'; }).join('');
        put($('#ap-k', p), 'Arquivos recebidos');
        put(cap, 'Cada arquivo recebido é lido, validado e gravado na mesma tabela, sem abrir planilha na mão.');
      }
      marca('#vp3 [data-ap]', 'data-ap', modo); ingere();
    }
    function ingere() {
      t.forEach(clearTimeout); t = []; $$('span', rows).forEach(function (r) { r.classList.remove('on'); });
      $$('span', rows).forEach(function (r, i) { t.push(setTimeout(function () { r.classList.add('on'); }, reduz ? 0 : 140 * (i + 1))); });
    }
    pressiona('#vp3 [data-ap]', function (b) { modo = b.getAttribute('data-ap'); pinta(); });
    $('#ap-go', p).addEventListener('click', ingere); pinta();
  };

  /* 4. data lake */
  INIT[4] = function (p) {
    var lk = $('#lk', p), r = sem(9), tipos = ['t', 's', 'f'];
    lk.innerHTML = Array.apply(null, Array(64)).map(function (_, i) { return '<i class="' + tipos[Math.floor(r() * 3)] + '" style="--n:' + i + '"></i>'; }).join('');
    pressiona('#vp4 [data-lk]', function (b) { var v = b.getAttribute('data-lk'); lk.className = 'lk' + (v ? ' f-' + v : ''); marca('#vp4 [data-lk]', 'data-lk', v); });
  };

  /* 5. data warehouse */
  INIT[5] = function (p) {
    var g = $('#wh', p), cap = $('#wh-cap', p), COLS = 6, ROWS = 7, h = '';
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) h += '<i class="' + (r === 0 ? 'h' : '') + '" data-r="' + r + '" data-c="' + c + '"></i>';
    g.innerHTML = h;
    var Q = [{ c: [0, 2], r: [1, 2, 3, 4] }, { c: [1, 3, 4], r: [2, 5, 6] }, { c: [0, 5], r: [1, 3, 5, 6] }];
    function q(n) {
      $$('i', g).forEach(function (e) { var rr = +e.getAttribute('data-r'), cc = +e.getAttribute('data-c'); e.classList.toggle('on', Q[n].c.indexOf(cc) > -1 && (rr === 0 || Q[n].r.indexOf(rr) > -1)); });
      g.classList.add('q'); marca('#vp5 [data-wq]', 'data-wq', n);
      put(cap, 'A consulta lê só as colunas de que precisa, e o warehouse responde rápido porque o dado já está organizado.');
    }
    pressiona('#vp5 [data-wq]', function (b) { q(+b.getAttribute('data-wq')); }); q(0);
  };

  /* 6. lakehouse */
  INIT[6] = function (p) {
    var cv = $('#lhv', p), cap = $('#lh-cap', p), svg = $('.wires', cv);
    wireMarca(cv, null);
    function m(x) {
      cv.setAttribute('data-m', x); svg.classList.remove('off');
      cv.setAttribute('data-fios', x ? 'hl>hb;hl>hm' : 'hl>hw;hw>hb;hl>hm'); fios(cv);
      put($('#hl-k', p), x ? 'Lakehouse' : 'Data Lake');
      put(cap, x ? 'Uma só cópia do dado, lida tanto pelo BI quanto pela ciência de dados: sem duplicar, sem divergir.' : 'O dado vive em dois lugares: duplicado, mais caro de manter e sujeito a divergir entre as cópias.');
      marca('#vp6 [data-lh]', 'data-lh', x);
    }
    pressiona('#vp6 [data-lh]', function (b) { m(+b.getAttribute('data-lh')); }); m(0);
  };

  /* 7. modelagem de dados */
  INIT[7] = function (p) {
    var cv = $('#md', p), cap = $('#md-cap', p), svg = $('.wires', cv), modo = 'o', tm = 0;
    var PO = [[40, 36], [4, 10], [66, 2], [14, 52], [76, 40], [36, 70], [2, 80], [70, 74], [34, 4]];
    var PA = [[40, 38], [6, 6], [74, 6], [6, 70], [74, 70], [40, 4], [40, 78], [4, 38], [78, 38]];
    var LO = [[1, 8], [8, 2], [2, 4], [1, 3], [3, 0], [0, 4], [3, 6], [0, 5], [5, 7], [6, 5], [4, 7]], LA = [[1, 0], [2, 0], [3, 0], [4, 0]];
    cv.insertAdjacentHTML('beforeend', PO.map(function (_, i) { return '<div class="nd mdn' + (i === 0 ? ' fact' : i > 4 ? ' aux' : '') + '" id="mn' + i + '"><s class="sk"></s><s class="sk a"></s></div>'; }).join(''));
    function centro(i) { var R = cv.getBoundingClientRect(), r = document.getElementById('mn' + i).getBoundingClientRect(); return [r.left + r.width / 2 - R.left, r.top + r.height / 2 - R.top]; }
    function linhas() {
      var R = cv.getBoundingClientRect(); if (!R.width) return; while (svg.firstChild) svg.removeChild(svg.firstChild); svg.setAttribute('viewBox', '0 0 ' + R.width + ' ' + R.height);
      (modo === 'o' ? LO : LA).forEach(function (l) {
        var a = centro(l[0]), b = centro(l[1]), e = document.createElementNS(NS, 'path'); e.setAttribute('d', 'M' + a[0] + ' ' + a[1] + ' L' + b[0] + ' ' + b[1]);
        if (modo === 'o') e.setAttribute('class', 'bad'); else e.setAttribute('class', 'hl'); svg.appendChild(e);
      });
    }
    function pos() { (modo === 'o' ? PO : PA).forEach(function (q, i) { var n = document.getElementById('mn' + i); n.style.left = 'calc((100% - 5.4rem) * ' + (q[0] / 100).toFixed(3) + ')'; n.style.top = 'calc((100% - 2.6rem) * ' + (q[1] / 100).toFixed(3) + ')'; }); }
    function m(x) {
      modo = x; cv.setAttribute('data-m', x); while (svg.firstChild) svg.removeChild(svg.firstChild); svg.classList.remove('off'); pos(); clearTimeout(tm); tm = setTimeout(linhas, reduz ? 50 : 900);
      put(cap, x === 'o' ? 'A origem é desenhada para o sistema que grava: muitas tabelas pequenas, ligadas em todas as direções.' : 'O modelo analítico é desenhado para quem pergunta: uma tabela de fatos no centro e as dimensões em volta.');
      marca('#vp7 [data-md]', 'data-md', x);
    }
    pressiona('#vp7 [data-md]', function (b) { m(b.getAttribute('data-md')); });
    p._mostrou = function () { pos(); clearTimeout(tm); tm = setTimeout(linhas, 60); }; m('o');
  };

  /* 8. ETL e ELT */
  INIT[8] = function (p) {
    var cap = $('#el-cap', p), t0 = $('#el0', p), t1 = $('#el1', p), t2 = $('#el2', p);
    function m(x) {
      [t1, t2].forEach(function (e) { e.classList.add('sw'); });
      setTimeout(function () {
        put(t1, x === 'etl' ? 'Transformar' : 'Carregar'); put(t2, x === 'etl' ? 'Carregar' : 'Transformar'); [t1, t2].forEach(function (e) { e.classList.remove('sw'); });
      }, reduz ? 0 : 220);
      put(t0, 'Extrair');
      put(cap, x === 'etl' ? 'Transforma no meio do caminho e grava o resultado já pronto.' : 'Grava primeiro e transforma no próprio destino, aproveitando a força do warehouse ou do lakehouse.');
      marca('#vp8 [data-el]', 'data-el', x);
    }
    pressiona('#vp8 [data-el]', function (b) { m(b.getAttribute('data-el')); }); m('etl');
  };

  /* 9. transformação versionada e testada */
  INIT[9] = function (p) {
    var cv = $('#tv', p), cap = $('#tv-cap', p), E = [['r0', 's0'], ['r1', 's0'], ['r1', 's1'], ['s0', 'm0'], ['s1', 'm0'], ['s1', 'm1']], sel = null, quebrado = false;
    wireMarca(cv, null);
    function rel(id) {
      var s = {}; s[id] = 1; var mudou = true;
      while (mudou) { mudou = false; E.forEach(function (e) { if (s[e[0]] && !s[e[1]]) { s[e[1]] = 1; mudou = true; } if (s[e[1]] && !s[e[0]]) { s[e[0]] = 1; mudou = true; } }); }
      return s;
    }
    function pinta() {
      var r = sel ? rel(sel) : {};
      $$('.tvn', p).forEach(function (n) { n.classList.toggle('sel', n.id === sel); n.classList.toggle('rel', !!r[n.id] && n.id !== sel); });
      wireMarca(cv, sel ? function (q) { var a = q.split('>'); return r[a[0]] && r[a[1]]; } : null);
      $('#s0', p).classList.toggle('fail', quebrado); $('#m0', p).classList.toggle('blocked', quebrado);
      put(cap, quebrado ? 'Um teste falhou em um modelo preparado: o que depende dele fica bloqueado e o restante segue.' : 'Cada modelo é código versionado e passa por teste antes de seguir adiante.');
      cap.classList.toggle('alerta', quebrado); $('#tv-bad', p).setAttribute('aria-pressed', String(quebrado));
    }
    $$('.tvn', p).forEach(function (n) { n.addEventListener('click', function () { sel = sel === n.id ? null : n.id; pinta(); }); });
    $('#tv-bad', p).addEventListener('click', function () { quebrado = !quebrado; pinta(); }); pinta();
  };

  /* 10. orquestração */
  INIT[10] = function (p) {
    var cap = $('#or-cap', p), falha = false, t = [];
    function est(id, s) { var e = document.getElementById(id); ['run', 'ok', 'fail', 'wait'].forEach(function (c) { e.classList.remove(c); }); if (s) e.classList.add(s); }
    function zera() { t.forEach(clearTimeout); t = []; ['o0', 'o1', 'o2', 'o3', 'o4'].forEach(function (i) { est(i, ''); }); }
    function ag(ms, fn) { t.push(setTimeout(fn, reduz ? 0 : ms)); }
    function roda() {
      zera(); var D = 750, k = 0;
      est('o0', 'run'); k += D; ag(k, function () { est('o0', 'ok'); est('o1', 'run'); est('o2', 'run'); });
      if (!falha) {
        k += D; ag(k, function () { est('o1', 'ok'); est('o2', 'ok'); est('o3', 'run'); }); k += D; ag(k, function () { est('o3', 'ok'); est('o4', 'run'); }); k += D; ag(k, function () { est('o4', 'ok'); });
        put(cap, 'Cada tarefa roda quando a anterior termina, e tudo fica registrado.');
      } else {
        k += D; ag(k, function () { est('o1', 'ok'); est('o2', 'fail'); est('o3', 'wait'); }); k += D; ag(k, function () { est('o2', 'run'); });
        k += D; ag(k, function () { est('o2', 'ok'); est('o3', 'run'); }); k += D; ag(k, function () { est('o3', 'ok'); est('o4', 'run'); }); k += D; ag(k, function () { est('o4', 'ok'); });
        put(cap, 'A tarefa falhou, as seguintes esperaram e a nova tentativa passou, com o alerta registrado.');
      }
    }
    $('#or-go', p).addEventListener('click', roda);
    $('#or-fail', p).addEventListener('click', function () { falha = !falha; this.setAttribute('aria-pressed', String(falha)); roda(); });
    put(cap, 'Execute o fluxo para ver cada tarefa rodar na ordem.'); p._mostrou = function () { if (!p._ja) { p._ja = 1; roda(); } };
  };

  /* 11. testes de qualidade */
  INIT[11] = function (p) {
    var g = $('#qt-grid', p), tl = $('#qt-tests', p), cap = $('#qt-cap', p), h = '', ruim = false;
    for (var r = 0; r < 7; r++) for (var c = 0; c < 5; c++) h += '<i class="' + (r === 0 ? 'h' : '') + '" data-r="' + r + '" data-c="' + c + '"></i>';
    g.innerHTML = h;
    var TESTES = ['Sem valores nulos', 'Valores únicos', 'Valores válidos', 'Dado atualizado'];
    tl.innerHTML = TESTES.map(function (t, i) { return '<div class="nd qtt" id="qtt' + i + '"><i class="st"></i><span data-pt="' + t + '">' + T(t) + '</span></div>'; }).join('');
    function pinta() {
      $$('i', g).forEach(function (e) { e.classList.toggle('bad', ruim && e.getAttribute('data-r') === '3' && e.getAttribute('data-c') === '2'); });
      $('#qtt2', p).classList.toggle('fail', ruim);
      put(cap, ruim ? 'Falha detectada antes de chegar ao usuário: o time de dados vê primeiro.' : 'Todos os testes passaram: o dado segue para o usuário.');
      cap.classList.toggle('alerta', ruim); $('#qt-bad', p).setAttribute('aria-pressed', String(ruim));
    }
    $('#qt-bad', p).addEventListener('click', function () { ruim = true; pinta(); });
    $('#qt-ok', p).addEventListener('click', function () { ruim = false; pinta(); }); pinta();
  };
