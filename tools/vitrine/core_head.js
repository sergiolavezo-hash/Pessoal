<script>
/* Vitrine interativa: cada entrega com o seu dashboard de exemplo. Só formas, sem dados reais. */
(function () {
  var raiz = document.getElementById('vit'); if (!raiz) return;
  var reduz = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function sem(s) { return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function pressiona(lista, fn) { $$(lista).forEach(function (b) { b.addEventListener('click', function () { fn(b); }); }); }
  function marca(grupo, atrib, val) { $$(grupo).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute(atrib) === String(val))); }); }
  /* Textos que o script escreve depois do carregamento. O motor de idiomas só
     alcança o que já estava na página, então a vitrine se traduz sozinha:
     cada texto dinâmico guarda o português em data-pt e é reescrito quando o
     idioma muda. */
  function idi() { return window.AtlasI18n ? AtlasI18n.idioma() : 'pt'; }
  function T(s) { var l = idi(); return l === 'pt' ? s : ((window.ATLAS_I18N && ATLAS_I18N[l] && ATLAS_I18N[l][s]) || s); }
  function put(el, pt) { el.setAttribute('data-pt', pt); el.textContent = T(pt); el.__pt = pt; }
  document.addEventListener('atlas:idioma', function () {
    $$('[data-pt]', raiz).forEach(function (e) { e.textContent = T(e.getAttribute('data-pt')); e.__pt = e.getAttribute('data-pt'); });
    var n = itens.map(function (a) { return a.getAttribute('aria-selected') === 'true'; }).indexOf(true);
    if (n > -1) $('#vit-tit').textContent = itens[n].querySelector('.t').textContent;
  });
  function caminho(v, w, h, max) { return v.map(function (y, i) { return (i ? 'L' : 'M') + (i * w / (v.length - 1)).toFixed(1) + ' ' + (h - (y / max) * (h - 1) - 0.5).toFixed(1); }).join(' '); }

  /* ---------- fios: ligam um nó a outro, de verdade, e carregam partículas ---------- */
  function fios(cv) {
    var svg = $(':scope > .wires', cv); if (!svg) return;
    var lista = (cv.getAttribute('data-fios') || '').split(';').filter(Boolean);
    var R = cv.getBoundingClientRect(); if (!R.width) return;
    svg.setAttribute('viewBox', '0 0 ' + R.width + ' ' + R.height);
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    lista.forEach(function (par, n) {
      var ab = par.split('>'), a = document.getElementById(ab[0]), b = document.getElementById(ab[1]); if (!a || !b) return;
      var A = a.getBoundingClientRect(), B = b.getBoundingClientRect(); if (!A.width || !B.width) return;
      var x1 = A.right - R.left, y1 = A.top + A.height / 2 - R.top, x2 = B.left - R.left, y2 = B.top + B.height / 2 - R.top, xm = (x1 + x2) / 2;
      var d = 'M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' C' + xm.toFixed(1) + ' ' + y1.toFixed(1) + ',' + xm.toFixed(1) + ' ' + y2.toFixed(1) + ',' + x2.toFixed(1) + ' ' + y2.toFixed(1);
      var p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); p.setAttribute('data-par', par); svg.appendChild(p);
      if (reduz) return;
      [0, 1].forEach(function (k) {
        var c = document.createElementNS(NS, 'circle'); c.setAttribute('r', '3.2'); c.setAttribute('data-par', par);
        var m = document.createElementNS(NS, 'animateMotion'); m.setAttribute('dur', (2.4 + (n % 3) * 0.35).toFixed(2) + 's'); m.setAttribute('repeatCount', 'indefinite');
        m.setAttribute('begin', '-' + (k * 1.2 + n * 0.17).toFixed(2) + 's'); m.setAttribute('path', d); c.appendChild(m); svg.appendChild(c);
      });
    });
    (cv._rehl || function () {})();
  }
  function wireMarca(cv, fn) { cv._rehl = function () { $$('.wires path', cv).forEach(function (p) { p.classList.toggle('hl', !!fn && fn(p.getAttribute('data-par'))); p.classList.toggle('bad', !!(cv._bad && cv._bad(p.getAttribute('data-par')))); }); }; cv._rehl(); }

  /* ---------- navegação: 12 itens ---------- */
  var itens = $$('.vit-it', raiz), iniciado = {}, INIT = {};
  function mostra(n, foco) {
    itens.forEach(function (a, i) {
      var on = i === n; a.setAttribute('aria-selected', String(on)); a.tabIndex = on ? 0 : -1;
      var p = document.getElementById('vp' + i), v = document.getElementById('vi' + i); p.hidden = !on; p.classList.toggle('on', on); v.classList.toggle('on', on);
    });
    put($('#vit-tit'), itens[n].querySelector('.t').__pt || itens[n].querySelector('.t').textContent);
    var p = document.getElementById('vp' + n);
    if (!iniciado[n]) { iniciado[n] = 1; if (INIT[n]) INIT[n](p); }
    requestAnimationFrame(function () { $$('.cv', p).forEach(fios); if (p._mostrou) p._mostrou(); });
    if (foco) itens[n].focus();
  }
  itens.forEach(function (a, i) {
    a.addEventListener('click', function () {
      mostra(i);
      /* No celular a lista vem antes da tela: leva a pessoa até o dashboard. */
      if (window.matchMedia('(max-width: 960px)').matches) $('.vit-stage', raiz).scrollIntoView({ behavior: reduz ? 'auto' : 'smooth', block: 'start' });
    });
    a.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0; if (!d) return; e.preventDefault(); mostra((i + d + itens.length) % itens.length, true);
    });
  });
  function refaz() { var p = $('.vit-pane.on'); if (p) $$('.cv', p).forEach(fios); }
  window.addEventListener('resize', refaz);
  if (window.ResizeObserver) new ResizeObserver(refaz).observe($('.vit-win', raiz));

