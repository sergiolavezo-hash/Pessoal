  /* cada produto: ao passar o mouse num nó do fluxo, o fio que chega a ele acende */
  $$('.vit-pane', raiz).forEach(function (p, i) {
    INIT[i] = function () {
      var cv = $('.cv', p); wireMarca(cv, null);
      $$('.pf-no', p).forEach(function (n) {
        n.addEventListener('mouseenter', function () { wireMarca(cv, function (q) { return q.indexOf(n.id) > -1; }); });
        n.addEventListener('mouseleave', function () { wireMarca(cv, null); });
      });
    };
  });
