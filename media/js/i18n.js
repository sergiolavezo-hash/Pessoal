/**
 * Troca de idioma — português, inglês e espanhol.
 *
 * A chave de cada texto é o próprio português, normalizado (espaços
 * colapsados). Não há data-i18n espalhado pelo HTML, e por três razões:
 *
 * 1. NADA A SINCRONIZAR. Com chaves inventadas, todo texto novo precisa de
 *    uma chave nova em dois lugares, e um dia uma delas fica para trás —
 *    some um parágrafo e ninguém percebe até alguém abrir em inglês.
 *
 * 2. O PORTUGUÊS É O ORIGINAL. Se uma frase não está no dicionário, ela
 *    aparece em português em vez de aparecer como "home.hero.title". Falta
 *    de tradução vira texto legível, não defeito visível.
 *
 * 3. A MARCAÇÃO VIAJA JUNTO. A unidade é o bloco inteiro com o <b> dentro,
 *    então a tradução põe o negrito onde a outra língua pede, em vez de
 *    herdar a quebra do português.
 *
 * O preço é que duas frases iguais em português recebem a mesma tradução.
 * Para este site isso é o comportamento desejado.
 *
 * Conteúdo que o script monta depois (as respostas da demonstração, as
 * mensagens do chat) é alcançado por MutationObserver, então entra
 * traduzido sem que cada trecho precise se registrar.
 */
(function () {
  var DIC = (window.ATLAS_I18N || {});
  var IDIOMAS = { pt: 'pt-BR', en: 'en', es: 'es' };
  var raiz = document.documentElement;
  var atual = 'pt';

  var INLINE = { B:1, I:1, EM:1, STRONG:1, SMALL:1, BR:1, SPAN:1, A:1, U:1, SUP:1, SUB:1, CODE:1, ABBR:1, TIME:1, MARK:1 };
  /* B/STRONG/EM/SMALL entram aqui porque um <b> solto — o título de um
     cartão do mega-menu, por exemplo — é o único portador do texto. Um
     <b> dentro de um parágrafo traduzível continua perdendo para ele,
     porque a subida pelos pais encontra o parágrafo primeiro. */
  var BLOCO  = { P:1, H1:1, H2:1, H3:1, H4:1, H5:1, LI:1, DT:1, DD:1, LABEL:1, BUTTON:1, FIGCAPTION:1, TH:1, TD:1, OPTION:1, SUMMARY:1, A:1, SPAN:1, DIV:1, B:1, STRONG:1, EM:1, SMALL:1 };
  var FORA   = { SCRIPT:1, STYLE:1, SVG:1, CANVAS:1, NOSCRIPT:1, TEMPLATE:1 };
  var ATRIBS = ['placeholder', 'aria-label', 'title'];
  var ESCOPO = 'header, main, footer, nav, .mega, .chat-panel, .chat-teaser, .cbar, .skip-link';

  function norm(s) { return (s || '').replace(/\s+/g, ' ').trim(); }

  function soInline(el) {
    for (var i = 0; i < el.children.length; i++) {
      var c = el.children[i];
      if (FORA[c.tagName] || !INLINE[c.tagName] || !soInline(c)) return false;
    }
    return true;
  }

  /* Link e botão são fronteira: sem isto a div que embrulha dois CTAs vira
     um bloco só e a troca perde o alvo. */
  function temAcaoDentro(el) {
    var as = el.querySelectorAll('a, button');
    for (var i = 0; i < as.length; i++) if (as[i] !== el && norm(as[i].textContent)) return true;
    return false;
  }

  function ehBloco(el) {
    if (FORA[el.tagName] || !BLOCO[el.tagName]) return false;
    /* Marcado assim, o elemento não é o bloco — cada filho é. Serve para
       listas que o script duplica (o trilho de setores é clonado para
       emendar a rolagem, e a chave viraria a lista inteira em dobro). */
    if (el.hasAttribute && el.hasAttribute('data-i18n-itens')) return false;
    if (!norm(el.textContent)) return false;
    if (!soInline(el) || temAcaoDentro(el)) return false;
    if (el.querySelector('.w')) return false;
    var pai = el.parentElement;
    while (pai && pai !== document.body) {
      if (pai.hasAttribute && pai.hasAttribute('data-i18n-itens')) break;
      if (BLOCO[pai.tagName] && soInline(pai) && !temAcaoDentro(pai) && norm(pai.textContent)) return false;
      pai = pai.parentElement;
    }
    return true;
  }

  function blocos(raizEl) {
    var out = [];
    var todos = raizEl.querySelectorAll('*');
    for (var i = 0; i < todos.length; i++) if (ehBloco(todos[i])) out.push(todos[i]);
    if (ehBloco(raizEl)) out.push(raizEl);
    return out;
  }

  function trocar(el, lang) {
    if (el.__pt === undefined) el.__pt = norm(el.innerHTML);
    var pt = el.__pt;
    if (lang === 'pt') { if (norm(el.innerHTML) !== pt) el.innerHTML = pt; return pt ? 1 : 0; }
    var t = DIC[lang] && DIC[lang][pt];
    if (t) { el.innerHTML = t; return 1; }
    /* sem tradução: volta ao português em vez de manter a língua anterior */
    if (norm(el.innerHTML) !== pt) el.innerHTML = pt;
    return 0;
  }

  function trocarAtribs(el, lang) {
    for (var i = 0; i < ATRIBS.length; i++) {
      var a = ATRIBS[i], v = el.getAttribute(a);
      if (v === null) continue;
      var chave = '__pt_' + a;
      if (el[chave] === undefined) el[chave] = norm(v);
      var pt = el[chave];
      if (!pt) continue;
      var t = lang === 'pt' ? pt : ((DIC[lang] && DIC[lang][pt]) || pt);
      if (v !== t) el.setAttribute(a, t);
    }
  }

  /* O h1 chega fatiado em palavras pelo script de entrada; a chave dele é o
     aria-label, e a troca devolve texto simples — a animação de entrada é
     coisa da primeira pintura, não de cada troca de idioma. */
  function trocarH1(lang) {
    var h1 = document.querySelector('h1[aria-label]');
    if (!h1) return;
    if (h1.__ptLabel === undefined) h1.__ptLabel = norm(h1.getAttribute('aria-label'));
    var pt = h1.__ptLabel;
    var t = lang === 'pt' ? pt : ((DIC[lang] && DIC[lang][pt]) || pt);
    if (lang !== 'pt' || norm(h1.textContent) !== pt) {
      var destaque = DIC[lang] && DIC[lang]['@h1-destaque'];
      if (destaque && t.indexOf(destaque) > -1) {
        var i = t.indexOf(destaque);
        h1.textContent = '';
        h1.appendChild(document.createTextNode(t.slice(0, i)));
        var sp = document.createElement('span'); sp.className = 'ac'; sp.textContent = destaque;
        h1.appendChild(sp);
        h1.appendChild(document.createTextNode(t.slice(i + destaque.length)));
      } else {
        h1.textContent = t;
      }
    }
    h1.setAttribute('aria-label', t);
  }

  /* Regra B: selos e rótulos levam um <svg> decorativo ao lado do texto,
     então nunca são "só-inline". Nesses a chave é o texto direto do elemento
     e a troca mexe apenas nos nós de texto — o ícone fica onde está, em vez
     de precisar entrar na string traduzida. */
  function textoDireto(el) {
    var s = '';
    for (var i = 0; i < el.childNodes.length; i++) {
      var n = el.childNodes[i];
      if (n.nodeType === 3) s += n.textContent + ' ';
    }
    return norm(s);
  }

  function trocarTexto(el, lang) {
    if (FORA[el.tagName]) return;
    if (el.__ptTexto === undefined) {
      var d = textoDireto(el);
      if (!d || d.length < 2) { el.__ptTexto = null; return; }
      if (soInline(el) && !temAcaoDentro(el)) { el.__ptTexto = null; return; }  // regra A cuida
      el.__ptTexto = d;
    }
    var pt = el.__ptTexto;
    if (!pt) return;
    var t = lang === 'pt' ? pt : ((DIC[lang] && DIC[lang][pt]) || pt);
    if (textoDireto(el) === t) return;
    /* o primeiro nó de texto com conteúdo recebe a frase inteira; os demais
       esvaziam, senão o texto antigo sobra ao lado do novo */
    var primeiro = true;
    for (var i = 0; i < el.childNodes.length; i++) {
      var n = el.childNodes[i];
      if (n.nodeType !== 3 || !norm(n.textContent)) continue;
      n.textContent = primeiro ? t : '';
      primeiro = false;
    }
  }

  var observando = false;
  function aplicar(lang, raizEl) {
    var escopo = raizEl ? [raizEl] : [].slice.call(document.querySelectorAll(ESCOPO));
    var tot = 0, feitos = 0;
    escopo.forEach(function (r) {
      blocos(r).forEach(function (el) { tot++; feitos += trocar(el, lang); });
      [r].concat([].slice.call(r.querySelectorAll('*'))).forEach(function (el) { trocarTexto(el, lang); });
      [].slice.call(r.querySelectorAll('[placeholder],[aria-label],[title]')).forEach(function (el) { trocarAtribs(el, lang); });
      trocarAtribs(r, lang);
    });
    if (!raizEl) {
      /* skip-link, botão de tema e botão do chat ficam fora do escopo de
         conteúdo, mas os rótulos deles são lidos em voz alta. */
      [].slice.call(document.querySelectorAll('[placeholder],[aria-label],[title]')).forEach(function (el) { trocarAtribs(el, lang); });
      trocarH1(lang);
      raiz.setAttribute('lang', IDIOMAS[lang] || 'pt-BR');
      atual = lang;
    }
    return { total: tot, traduzidos: feitos };
  }

  /* Regiões que o script preenche depois precisam ser traduzidas quando
     chegam, não só no carregamento. */
  function observar() {
    if (observando || !('MutationObserver' in window)) return;
    observando = true;
    var mo = new MutationObserver(function (muts) {
      if (atual === 'pt') return;
      muts.forEach(function (m) {
        [].slice.call(m.addedNodes).forEach(function (n) {
          if (n.nodeType === 1) aplicar(atual, n);
        });
      });
    });
    ['#demo-a', '#demo-qs', '#chat-msgs', '#chat-chips'].forEach(function (s) {
      var el = document.querySelector(s);
      if (el) mo.observe(el, { childList: true, subtree: true });
    });
  }

  function definir(lang, guardar) {
    if (!IDIOMAS[lang]) lang = 'pt';
    aplicar(lang);
    if (guardar) { try { localStorage.setItem('atlas-idioma', lang); } catch (e) {} }
    var bt = document.getElementById('lang-atual');
    if (bt) bt.textContent = lang.toUpperCase();
    [].slice.call(document.querySelectorAll('.lang-menu [data-lang]')).forEach(function (b) {
      b.setAttribute('aria-current', b.getAttribute('data-lang') === lang ? 'true' : 'false');
    });
    document.dispatchEvent(new CustomEvent('atlas:idioma', { detail: { idioma: lang } }));
  }

  function iniciar() {
    observar();
    var g = null;
    try { g = localStorage.getItem('atlas-idioma'); } catch (e) {}
    definir(IDIOMAS[g] ? g : 'pt', false);

    /* menu do seletor */
    var bt = document.getElementById('lang-btn');
    var menu = document.getElementById('lang-menu');
    if (bt && menu) {
      var abrir = function (v) { bt.setAttribute('aria-expanded', v ? 'true' : 'false'); menu.hidden = !v; };
      bt.addEventListener('click', function (e) { e.stopPropagation(); abrir(menu.hidden); });
      menu.addEventListener('click', function (e) {
        var b = e.target.closest('[data-lang]');
        if (!b) return;
        definir(b.getAttribute('data-lang'), true);
        abrir(false); bt.focus();
      });
      document.addEventListener('click', function (e) {
        if (!menu.hidden && !menu.contains(e.target) && !bt.contains(e.target)) abrir(false);
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !menu.hidden) { abrir(false); bt.focus(); }
      });
    }

    window.AtlasI18n = { aplicar: aplicar, definir: definir, idioma: function () { return atual; } };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
