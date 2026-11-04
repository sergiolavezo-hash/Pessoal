/**
 * Lista os blocos de texto traduzíveis do site, lendo o DOM real.
 *
 * Não há parser de HTML em Python neste ambiente, e casar texto de volta no
 * fonte por expressão regular erra em qualquer aninhamento. O Chromium que
 * já está aqui para os testes é o parser mais confiável disponível.
 *
 * A unidade é o bloco, não o trecho: um <p> com <b> dentro conta como uma
 * string só, com a marcação inclusa. Assim a tradução carrega o negrito no
 * lugar certo em vez de quebrar a frase em pedaços sem sentido.
 *
 * Uso: node tools/extrai-textos.js [arquivo.html...] > tools/textos-pt.json
 */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');

const ARQS = process.argv.slice(2).length ? process.argv.slice(2) : ['index.html'];

(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const achados = new Map();
  for (const arq of ARQS) {
    const p = await b.newPage();
    await p.goto('file://' + path.resolve(arq), { waitUntil: 'load' });
    await p.waitForTimeout(500);
    const blocos = await p.evaluate(() => {
      const INLINE = new Set(['B','I','EM','STRONG','SMALL','BR','SPAN','A','U','SUP','SUB','CODE','ABBR','TIME','MARK']);
      const BLOCO = new Set(['P','H1','H2','H3','H4','H5','LI','DT','DD','LABEL','BUTTON','FIGCAPTION','TH','TD','OPTION','SUMMARY','A','SPAN','DIV','B','STRONG','EM','SMALL']);
      const FORA = new Set(['SCRIPT','STYLE','SVG','CANVAS','NOSCRIPT','TEMPLATE']);
      const out = [];
      const vistos = new Set();

      function soInline(el) {
        for (const c of el.children) {
          if (FORA.has(c.tagName)) return false;
          if (!INLINE.has(c.tagName)) return false;
          if (!soInline(c)) return false;
        }
        return true;
      }
      /* Link e botão são fronteira: sem isto a <div> que embrulha dois CTAs
         vira um bloco só e a tradução perde o alvo. */
      function temAcaoDentro(el) {
        for (const a of el.querySelectorAll('a, button')) {
          if (a !== el && norm(a.textContent)) return true;
        }
        return false;
      }
      function norm(s) { return s.replace(/\s+/g, ' ').trim(); }

      document.querySelectorAll('header, main, footer, nav, .mega, .chat-panel, .chat-teaser, .cbar, .skip-link, .cookies').forEach(raiz => {
        /* a própria raiz pode ser o bloco de texto — é o caso do skip-link */
        [raiz].concat([...raiz.querySelectorAll('*')]).forEach(el => {
          if (FORA.has(el.tagName) || !BLOCO.has(el.tagName)) return;
          if (el.hasAttribute && el.hasAttribute('data-i18n-itens')) return;
          if (!norm(el.textContent)) return;
          if (!soInline(el)) return;
          if (temAcaoDentro(el)) return;
          /* O h1 chega aqui já fatiado em palavras pelo script de entrada;
             ele é traduzido à parte, pelo próprio aria-label. */
          if (el.querySelector('.w') || el.closest('h1')) return;
          // o ancestral mais externo que ainda é só-inline é quem representa o bloco
          let pai = el.parentElement;
          while (pai && pai !== raiz) {
            if (pai.hasAttribute && pai.hasAttribute('data-i18n-itens')) break;
            if (BLOCO.has(pai.tagName) && soInline(pai) && !temAcaoDentro(pai) && norm(pai.textContent)) return;
            pai = pai.parentElement;
          }
          const chave = norm(el.innerHTML);
          if (vistos.has(chave)) return;
          vistos.add(chave);
          out.push({ chave, tag: el.tagName.toLowerCase(), cls: el.className.toString().slice(0, 40) });
        });
        /* Regra B: selos e rótulos carregam um <svg> decorativo ao lado do
           texto, então nunca são "só-inline". Aqui a chave é o texto direto
           do elemento e a troca mexe apenas nos nós de texto — o ícone fica
           onde está, em vez de precisar entrar na tradução. */
        raiz.querySelectorAll('*').forEach(el => {
          if (FORA.has(el.tagName)) return;
          const direto = norm([...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(' '));
          if (!direto || direto.length < 2) return;
          if (soInline(el) && !temAcaoDentro(el)) return;   // já coberto pela regra A
          if (vistos.has(direto)) return;
          vistos.add(direto);
          out.push({ chave: direto, tag: el.tagName.toLowerCase() + '#texto', cls: el.className.toString().slice(0, 40) });
        });
      });

      /* Os atributos lidos em voz alta ficam também fora do escopo de
         conteúdo — skip-link, botão de tema, botão do chat —, então esta
         varredura cobre o documento inteiro. */
      document.querySelectorAll('[placeholder],[aria-label],[title],img[alt]').forEach(el => {
        ['placeholder','aria-label','title','alt'].forEach(a => {
          const v = el.getAttribute(a); if (!v) return;
          const k = 'attr:' + norm(v);
          if (vistos.has(k)) return; vistos.add(k);
          out.push({ chave: norm(v), tag: '@' + a, cls: el.className.toString().slice(0, 40) });
        });
      });
      return out;
    });
    blocos.forEach(x => { if (!achados.has(x.chave)) achados.set(x.chave, x); });
    await p.close();
  }
  await b.close();
  const lista = [...achados.values()];
  console.log(JSON.stringify({ total: lista.length, itens: lista }, null, 1));
})();
