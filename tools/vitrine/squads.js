  /* perfis: 0 a 3 */
  function perfil(n, build, caps) {
    var p = document.getElementById('vp' + n), v = $('#prv' + n, p), cap = $('#prp' + n, p), chips = $$('#prc' + n + ' .vit-chip', p);
    build(v);
    function s(i) {
      chips.forEach(function (c, k) { c.setAttribute('aria-pressed', String(k === i)); });
      $$('[data-z]', v).forEach(function (e) { e.classList.toggle('on', e.getAttribute('data-z').split(' ').indexOf(String(i)) > -1); });
      put(cap, caps[i]);
    }
    chips.forEach(function (c, i) { c.addEventListener('click', function () { s(i); }); }); s(0);
  }
  function blk(z, rot, corpo) { return '<div class="pz" data-z="' + z + '"><small data-pt="' + rot + '">' + T(rot) + '</small>' + corpo + '</div>'; }
  var SKL = '<s class="sk"></s><s class="sk a"></s>', BARS = '<div class="pz-bars"><i style="height:45%"></i><i style="height:70%"></i><i style="height:55%"></i><i style="height:90%"></i><i style="height:65%"></i></div>';
  INIT[0] = function () { perfil(0, function (v) {
    v.innerHTML = '<div class="pz-row">' + blk('0', 'Fontes', SKL) + '<em>&rarr;</em>' + blk('0 1', 'Pipeline', SKL) + '<em>&rarr;</em>' + blk('2 3', 'Base', SKL) + '<em>&rarr;</em>' + blk('3', 'Consumo', SKL) + '</div>';
  }, ['Constrói os pipelines que levam o dado das fontes até a base.', 'Orquestra as etapas para rodar na ordem e na hora certas.', 'Modela a base para que o negócio consiga perguntar.', 'Cria os testes que protegem a qualidade do dado.']); };
  INIT[1] = function () { perfil(1, function (v) {
    v.innerHTML = blk('0', 'Indicadores', '<div class="pz-g"><i></i><i></i><i></i><i></i></div>') + '<div class="pz-row">' + blk('0 2', 'Gráficos', BARS) + blk('1', 'Modelo semântico', '<div class="pz-g"><i></i><i></i><i></i></div>' + SKL) + blk('3', 'Acesso por perfil', SKL) + '</div>';
  }, ['Constrói os dashboards que as áreas usam no dia a dia.', 'Organiza o modelo semântico para existir uma definição por métrica.', 'Otimiza as medidas para o painel responder rápido.', 'Aplica o padrão de layout e o controle de acesso por perfil.']); };
  INIT[2] = function () { perfil(2, function (v) {
    var pts = '<div class="pz-dots">' + Array.apply(null, Array(26)).map(function (_, i) { return '<i' + (i === 17 ? ' class="x"' : '') + '></i>'; }).join('') + '</div>';
    v.innerHTML = '<div class="pz-row">' + blk('1 2', 'Dados históricos', pts) + '<em>&rarr;</em>' + blk('0 2', 'Modelo', '<svg class="pz-curve" viewBox="0 0 60 20" preserveAspectRatio="none"><path d="M1 17 C 14 16, 20 4, 32 8 S 52 3, 59 2"/></svg>') + '<em>&rarr;</em>' + blk('3', 'Em produção', SKL) + '</div>';
  }, ['Treina modelos preditivos para antecipar o que vem.', 'Detecta o que foge do padrão antes que vire problema.', 'Testa hipóteses e compara abordagens antes de escolher uma.', 'Leva o modelo para produção, onde ele gera decisão.']); };
  INIT[3] = function () { perfil(3, function (v) {
    v.innerHTML = '<div class="pz-stack">' + blk('0 2', 'Fontes', SKL) + blk('0 1', 'Armazenamento', SKL) + blk('0 1 3', 'Transformação', SKL) + blk('0 2 3', 'Consumo', SKL) + '</div>';
  }, ['Desenha a base inteira: o que guarda o quê e como tudo se conecta.', 'Escolhe a nuvem e os serviços que servem ao problema.', 'Define quem acessa o quê, da fonte ao consumo.', 'Estabelece os padrões que o time segue ao construir.']); };

  /* 4. contratos com o prazo de cada cliente */
  INIT[4] = function (p) {
    var tr = $('#sqc-track', p), cap = $('#sqc-cap', p), N = [4, 8, 12];
    tr.innerHTML = Array.apply(null, Array(12)).map(function () { return '<i class="ct-s"></i>'; }).join('');
    var S = $$('.ct-s', tr);
    var C = ['Alocação mais curta, para uma necessidade pontual do projeto. O prazo é combinado com cada cliente.', 'Prazo intermediário, acompanhando uma etapa do roadmap. O prazo é combinado com cada cliente.', 'Alocação mais longa, para quem precisa de continuidade no time. O prazo é combinado com cada cliente.'];
    function f(i) { S.forEach(function (s, k) { s.classList.toggle('on', k < N[i]); }); marca('#vp4 [data-ct]', 'data-ct', i); put(cap, C[i]); }
    pressiona('#vp4 [data-ct]', function (b) { f(+b.getAttribute('data-ct')); }); f(1);
  };

  /* 5. tempo indeterminado */
  INIT[5] = function (p) {
    var ti = $('#sqti', p), cap = $('#sqti-cap', p);
    function m(x) {
      ti.setAttribute('data-m', x); marca('#vp5 [data-ti]', 'data-ti', x);
      put(cap, x ? 'Sem data final: a alocação segue enquanto o time precisar, com o mesmo especialista conhecendo o contexto.' : 'Com prazo fechado, o contrato termina numa data e o conhecimento acumulado vai embora junto.');
    }
    pressiona('#vp5 [data-ti]', function (b) { m(+b.getAttribute('data-ti')); }); m(0);
  };

  /* 6. gestão do cliente, respaldo da Atlas */
  INIT[6] = function (p) {
    var cv = $('#sqgs', p), cap = $('#sqgs-cap', p), sel = null;
    cv._bad = function (q) { return q === 'ge>ga'; }; wireMarca(cv, null);
    var ALVO = { gestao: 'gc>ge', respaldo: 'ge>ga' };
    function pinta() {
      wireMarca(cv, sel ? function (q) { return q === ALVO[sel]; } : null); cv._bad = function (q) { return q === 'ge>ga'; }; cv._rehl();
      $$('#vp6 [data-g]', p).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-g') === sel)); });
      $('#gc', p).classList.toggle('hl', sel === 'gestao'); $('#ga', p).classList.toggle('hl', sel === 'respaldo'); $('#ge', p).classList.toggle('hl', !!sel);
      put(cap, sel === 'gestao' ? 'O especialista responde à sua gestão e trabalha como parte do seu time.' : sel === 'respaldo' ? 'A Atlas segue por trás, como respaldo técnico, sem entrar na gestão do dia a dia.' : 'O especialista trabalha dentro do seu time e responde à sua gestão. A Atlas segue por trás, como respaldo técnico.');
    }
    pressiona('#vp6 [data-g]', function (b) { var g = b.getAttribute('data-g'); sel = sel === g ? null : g; pinta(); }); pinta();
  };

  /* 7. substituição sem quebra de ritmo */
  INIT[7] = function (p) {
    var modo = 0, team = $('#sqs-team', p), lane = $('#sqs-lane', p), cap = $('#sqs-cap', p), t = [], COR = ['', 'c2', 'c3', 'c4'];
    lane.innerHTML = Array.apply(null, Array(14)).map(function () { return '<i></i>'; }).join('');
    function monta() { team.innerHTML = COR.map(function (c, i) { return '<div class="nd sb-p" id="sqsp' + i + '">' + '<svg class="av ' + c + '" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="15" r="7"/><path d="M6 36c1-8 7-12 14-12s13 4 14 12z"/></svg><s class="sk"></s><s class="sk a"></s></div>'; }).join(''); }
    function zera() { t.forEach(clearTimeout); t = []; $$('i', lane).forEach(function (i) { i.className = ''; }); monta(); }
    function ag(ms, fn) { t.push(setTimeout(fn, reduz ? 0 : ms)); }
    function roda() {
      zera(); var B = $$('i', lane), D = 330;
      B.forEach(function (b, i) {
        var parado = modo === 0 && i >= 5 && i <= 8;
        ag(D * (i + 1), function () { b.className = parado ? 'stall' : 'ok'; });
      });
      ag(D * 4, function () { $('#sqsp2', p).classList.add('sai'); });
      if (modo === 1) { ag(D * 4.4, function () { var n = $('#sqsp2', p); n.classList.remove('sai'); n.classList.add('novo'); n.insertAdjacentHTML('beforeend', '<span class="tag ok" data-pt="substituto em passagem">' + T('substituto em passagem') + '</span>'); }); }
      else { ag(D * 9, function () { var n = $('#sqsp2', p); n.classList.remove('sai'); n.classList.add('novo'); }); }
    }
    function m(x) {
      modo = x; marca('#vp7 [data-sb]', 'data-sb', x);
      put(cap, x ? 'A Atlas indica o substituto e faz a passagem enquanto a entrega continua: o ritmo não para.' : 'Sem reposição estruturada, a saída de uma pessoa abre um buraco: a entrega para até alguém novo entender o contexto.'); zera();
    }
    pressiona('#vp7 [data-sb]', function (b) { m(+b.getAttribute('data-sb')); }); $('#sqs-go', p).addEventListener('click', roda); m(0);
  };

  /* 8. time por perfil e senioridade */
  INIT[8] = function (p) {
    var ROLES = ['Engenheiro de dados', 'Analista de BI', 'Cientista de dados', 'Arquiteto de dados'], SEN = ['Júnior', 'Pleno', 'Sênior'], COR = ['', 'c2', 'c3', 'c4'], on = [1, 1, 0, 0], sen = [1, 1, 1, 2];
    var rows = $('#sqm-rows', p), sq = $('#sqm-squad', p), cap = $('#sqm-cap', p);
    function pinta() {
      rows.innerHTML = ROLES.map(function (r, i) {
        return '<div class="nd mt-r"><button type="button" class="vit-chip role" data-r="' + i + '" aria-pressed="' + !!on[i] + '" data-pt="' + r + '">' + T(r) + '</button>' +
          SEN.map(function (s, k) { return '<button type="button" class="vit-chip" data-r="' + i + '" data-k="' + k + '" aria-pressed="' + (sen[i] === k) + '" data-pt="' + s + '">' + T(s) + '</button>'; }).join('') + '</div>';
      }).join('');
      sq.innerHTML = ROLES.map(function (r, i) { return on[i] ? '<div class="mt-m s' + sen[i] + '"><svg class="av ' + COR[i] + '" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="15" r="7"/><path d="M6 36c1-8 7-12 14-12s13 4 14 12z"/></svg><small data-pt="' + r + '">' + T(r) + '</small></div>' : ''; }).join('');
      $$('.vit-chip', rows).forEach(function (b) { b.addEventListener('click', function () {
        var i = +b.getAttribute('data-r'); if (b.hasAttribute('data-k')) sen[i] = +b.getAttribute('data-k'); else on[i] = on[i] ? 0 : 1; pinta();
      }); });
    }
    put(cap, 'O squad é montado pelos perfis e pelas senioridades que o projeto pede, não por um pacote fechado.'); pinta();
  };

  /* 9. liderança técnica */
  INIT[9] = function (p) {
    var cv = $('#sqld', p), cap = $('#sqld-cap', p), svg = $('.wires', cv);
    wireMarca(cv, null);
    function m(x) {
      cv.setAttribute('data-m', x); svg.classList.toggle('off', !x); cv.setAttribute('data-fios', x ? 'ldl>ldm0;ldl>ldm1;ldl>ldm2;ldl>ldm3' : ''); fios(cv); marca('#vp9 [data-ld]', 'data-ld', x);
      put(cap, x ? 'Um líder técnico da Atlas acompanha o squad: orienta as decisões técnicas e cuida da qualidade da entrega.' : 'Sem liderança técnica, cada pessoa decide por conta própria e o squad perde direção.');
    }
    pressiona('#vp9 [data-ld]', function (b) { m(+b.getAttribute('data-ld')); }); m(0);
  };

  /* 10. ritmo de entrega */
  INIT[10] = function (p) {
    var ST = ['Planejar', 'Executar', 'Revisar', 'Entregar'], steps = $('#sqrt-steps', p), done = $('#sqrt-done', p), cap = $('#sqrt-cap', p), rt = $('#sqrt', p), modo = 'curto', k = 0, timer = 0;
    steps.innerHTML = ST.map(function (s) { return '<div class="nd rt-st" data-pt="' + s + '">' + T(s) + '</div>'; }).join('');
    function para() { clearInterval(timer); timer = 0; }
    function tick() {
      if (p.hidden) { para(); return; }
      $$('.rt-st', steps).forEach(function (e, i) { e.classList.toggle('on', i === k); });
      if (k === 3) { if (done.children.length >= 10) done.innerHTML = ''; done.insertAdjacentHTML('beforeend', '<i></i>'); }
      k = (k + 1) % 4;
    }
    function inicia() { para(); if (reduz) { $$('.rt-st', steps)[3].classList.add('on'); done.innerHTML = '<i></i><i></i><i></i><i></i>'; return; } tick(); timer = setInterval(tick, modo === 'curto' ? 650 : 1400); }
    function m(x) { modo = x; rt.setAttribute('data-m', x); marca('#vp10 [data-rt]', 'data-rt', x); done.innerHTML = ''; k = 0;
      put(cap, x === 'curto' ? 'Ciclos curtos: entregas frequentes, e o negócio vê resultado cedo.' : 'Ciclos longos: menos entregas, cada uma maior. O ritmo é combinado no início.'); inicia(); }
    pressiona('#vp10 [data-rt]', function (b) { m(b.getAttribute('data-rt')); });
    p._mostrou = function () { if (!timer) inicia(); }; m('curto');
  };

  /* 11. transferência de conhecimento */
  INIT[11] = function (p) {
    var tk = $('#sqtk', p), cap = $('#sqtk-cap', p), A = $('#sqtk-a', p), C = $('#sqtk-c', p);
    function av(cls) { return '<svg class="av ' + cls + '" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="15" r="7"/><path d="M6 36c1-8 7-12 14-12s13 4 14 12z"/></svg>'; }
    A.innerHTML = av('') + av('') + av(''); C.innerHTML = av('c2') + av('c2') + av('c2');
    var CAP = ['No início, o time da Atlas conduz e o time do cliente acompanha.', 'No meio, o conhecimento passa a ser compartilhado: o time do cliente já executa, com acompanhamento.', 'No fim, o time do cliente conduz e o que foi construído está documentado e entendido.'];
    function f(i) {
      tk.setAttribute('data-f', i); marca('#vp11 [data-tk]', 'data-tk', i);
      $$('.av', A).forEach(function (e, k) { e.classList.toggle('off', k >= 3 - i); }); $$('.av', C).forEach(function (e, k) { e.classList.toggle('off', k >= i + 1); }); put(cap, CAP[i]);
    }
    pressiona('#vp11 [data-tk]', function (b) { f(+b.getAttribute('data-tk')); }); f(0);
  };
