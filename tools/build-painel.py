#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Monta o painel de Tecnologia da home a partir de tools/ferramentas.py.

O painel substitui a órbita e absorve o diagrama de arquitetura: o fluxo
ORIGEM > BASE DE DADOS > DASHBOARDS é o próprio gráfico, e a ferramenta
selecionada acende a etapa em que atua e escreve ali o que faz.

Uso: python3 tools/build-painel.py
"""
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from ferramentas import F, GRUPOS, ETAPAS  # noqa: E402

RAIZ = pathlib.Path(__file__).resolve().parent.parent


def js(t):
    return "'" + str(t).replace('\\', '\\\\').replace("'", "\\'") + "'"


# ------------------------------------------------------------------ CSS
CSS = '''  /* ---------- Painel de tecnologia ---------- */
  /* O seletor é o filtro do painel; o fluxo ORIGEM > BASE > DASHBOARDS é o
     gráfico. Escolher uma ferramenta acende a etapa em que ela atua e escreve
     ali o que ela faz — a pergunta "onde isso entra no meu projeto" e a
     pergunta "o que essa ferramenta faz" passam a ter a mesma resposta. */
  .tp {
    margin-top: 2.4rem; border: 1px solid var(--line); border-radius: 18px; overflow: hidden;
    background: linear-gradient(180deg, rgba(18,26,36,0.82), rgba(13,17,23,0.82));
  }
  .tp-bar {
    display: flex; align-items: center; justify-content: space-between; gap: 1rem;
    flex-wrap: wrap; padding: 0.95rem 1.3rem; border-bottom: 1px solid var(--line);
    font-family: var(--mono); font-size: 0.66rem; letter-spacing: 0.18em; text-transform: uppercase;
  }
  .tp-bar b { color: var(--ink); font-weight: 500; display: inline-flex; align-items: center; gap: 0.6rem; }
  .tp-bar b::before {
    content: ''; width: 7px; height: 7px; border-radius: 50%;
    background: var(--accent); box-shadow: 0 0 10px rgba(46,134,255,0.8);
  }

  /* números reais: quantas ferramentas, e em quantas há projeto entregue */
  .tp-stats { display: flex; gap: 1.6rem; flex-wrap: wrap; align-items: center; }
  .tp-stat { display: flex; flex-direction: column; gap: 0.2rem; }
  .tp-stat b { font-family: var(--display); font-size: 1.05rem; font-weight: 800; letter-spacing: -0.02em; }
  .tp-stat span { font-family: var(--mono); font-size: 0.56rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--dim); }
  .tp-meter { width: 5.5rem; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.08); margin-top: 0.15rem; }
  .tp-meter i { display: block; height: 100%; border-radius: 2px; background: var(--accent); }

  .tp-filtros { display: flex; flex-wrap: wrap; gap: 0.4rem; padding: 1.1rem 1.3rem 0; }
  .tp-filtro {
    font-family: var(--mono); font-size: 0.64rem; letter-spacing: 0.08em;
    color: var(--muted); background: transparent; border: 1px solid var(--line);
    border-radius: 999px; padding: 0.42rem 0.8rem; cursor: pointer;
    transition: border-color 0.3s var(--ease), color 0.3s var(--ease), background 0.3s var(--ease);
  }
  .tp-filtro:hover { border-color: rgba(46,134,255,0.45); color: var(--ink); }
  .tp-filtro[aria-pressed="true"] { border-color: var(--accent); color: var(--ink); background: rgba(46,134,255,0.12); }
  .tp-filtro small { color: var(--dim); margin-left: 0.35rem; }
  .tp-filtro[aria-pressed="true"] small { color: var(--accent-light); }

  .tp-grade { display: flex; flex-wrap: wrap; gap: 0.45rem; padding: 1rem 1.3rem 1.2rem; }
  .tp-item {
    position: relative; display: inline-flex; align-items: center; gap: 0.5rem;
    border: 1px solid var(--line); border-radius: 999px; padding: 0.3rem 0.8rem 0.3rem 0.3rem;
    background: var(--panel); color: var(--muted); cursor: pointer;
    font-size: 0.78rem; transition: color 0.25s var(--ease), border-color 0.25s var(--ease),
                background 0.25s var(--ease), box-shadow 0.25s var(--ease);
  }
  .tp-ring { position: relative; width: 1.85rem; height: 1.85rem; border-radius: 50%; flex: none;
    display: grid; place-items: center; background: var(--bg0); border: 1px solid var(--line-soft); }
  .tp-ico { width: 0.95rem; height: 0.95rem; background: currentColor;
    -webkit-mask: var(--i) center / contain no-repeat; mask: var(--i) center / contain no-repeat; }
  .tp-mn { font-family: var(--mono); font-size: 0.4rem; }
  .tp-item .tp-star { position: absolute; top: -0.1rem; right: -0.1rem; font-size: 0.45rem; color: var(--accent-light); }
  .tp-item:hover, .tp-item:focus-visible { color: var(--ink); border-color: rgba(46,134,255,0.5); outline: none; }
  .tp-item[aria-pressed="true"] {
    color: var(--accent-light); border-color: var(--accent);
    background: rgba(46,134,255,0.14); box-shadow: 0 0 18px rgba(46,134,255,0.3);
  }

  /* ---- cabeçalho do detalhe ---- */
  .tp-head { display: grid; grid-template-columns: auto 1fr; gap: 1rem; align-items: start;
    padding: 1.4rem 1.3rem; border-top: 1px solid var(--line); }
  .tp-head-ico { width: 3.2rem; height: 3.2rem; border-radius: 50%; flex: none; display: grid; place-items: center;
    border: 1px solid rgba(46,134,255,0.4); background: rgba(46,134,255,0.1); color: var(--accent-light); }
  .tp-head-ico span { width: 1.5rem; height: 1.5rem; background: currentColor;
    -webkit-mask: var(--i) center / contain no-repeat; mask: var(--i) center / contain no-repeat; }
  .tp-head-ico b { font-family: var(--mono); font-size: 0.56rem; font-weight: 500; }
  .tp-nome { font-family: var(--display); font-size: 1.55rem; font-weight: 800; letter-spacing: -0.03em; line-height: 1.1; }
  .tp-oque { color: var(--muted); font-size: 0.98rem; margin-top: 0.35rem; }
  .tp-negocio { color: var(--ink); font-size: 0.92rem; margin-top: 0.55rem;
    display: flex; gap: 0.5rem; align-items: baseline; }
  .tp-negocio::before { content: '\\2192'; color: var(--accent); font-family: var(--mono); flex: none; }
  .tp-selo { display: inline-block; margin-top: 0.7rem; font-family: var(--mono); font-size: 0.58rem;
    letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent-light);
    border: 1px solid rgba(46,134,255,0.35); border-radius: 999px; padding: 0.24rem 0.6rem; }
  .tp-selo[hidden] { display: none; }

  /* ---- o fluxo: é o gráfico do painel ---- */
  .tp-fluxo { display: grid; grid-template-columns: 1fr auto 1fr auto 1fr;
    gap: 0; padding: 0 1.3rem 1.3rem; align-items: stretch; }
  .tp-seta { display: grid; place-items: center; padding: 0 0.7rem; color: var(--dim);
    font-family: var(--mono); font-size: 1.05rem; }
  .tp-etapa { border: 1px solid var(--line); border-radius: 14px; padding: 1rem 1rem 1.1rem;
    background: rgba(5,7,10,0.5); display: flex; flex-direction: column; gap: 0.4rem;
    transition: border-color 0.4s var(--ease), background 0.4s var(--ease), box-shadow 0.4s var(--ease); }
  .tp-etapa-k { font-family: var(--mono); font-size: 0.6rem; letter-spacing: 0.2em;
    text-transform: uppercase; color: var(--dim); transition: color 0.4s var(--ease); }
  .tp-etapa-d { color: var(--dim); font-size: 0.8rem; line-height: 1.45; }
  .tp-slot { margin-top: auto; padding-top: 0.7rem; font-size: 0.87rem; color: var(--ink);
    border-top: 1px solid var(--line-soft); display: none; }
  .tp-etapa.on { border-color: rgba(46,134,255,0.45); background: rgba(18,26,36,0.7);
    box-shadow: 0 0 40px rgba(46,134,255,0.10); }
  .tp-etapa.on .tp-etapa-k { color: var(--accent-light); }
  .tp-etapa.on .tp-slot { display: block; }
  .tp-todas { margin: 0 1.3rem 1.3rem; border: 1px solid rgba(46,134,255,0.35); border-radius: 12px;
    padding: 0.85rem 1rem; background: rgba(46,134,255,0.06); font-size: 0.88rem; color: var(--ink); }
  .tp-todas[hidden] { display: none; }
  .tp-todas b { font-family: var(--mono); font-size: 0.58rem; letter-spacing: 0.16em;
    text-transform: uppercase; color: var(--accent-light); display: block; margin-bottom: 0.25rem; }

  /* ---- KPIs: só fato verificável ---- */
  .tp-kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1px;
    background: var(--line); border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
  .tp-kpi { background: var(--panel); padding: 0.95rem 1rem; }
  .tp-kpi p { font-family: var(--mono); font-size: 0.56rem; letter-spacing: 0.16em;
    text-transform: uppercase; color: var(--dim); }
  .tp-kpi b { display: block; font-size: 0.92rem; font-weight: 600; margin-top: 0.3rem; }
  .tp-kpi.sim b { color: var(--accent-light); }

  /* ---- cards de leitura ---- */
  .tp-cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1px; background: var(--line); }
  .tp-card { background: var(--panel); padding: 1.2rem 1.3rem; }
  .tp-card p { font-family: var(--mono); font-size: 0.58rem; letter-spacing: 0.16em;
    text-transform: uppercase; color: var(--accent-light); }
  .tp-card span { display: block; color: var(--muted); font-size: 0.92rem; margin-top: 0.45rem; }

  @media (max-width: 980px) {
    .tp-fluxo { grid-template-columns: 1fr; gap: 0.7rem; }
    .tp-seta { padding: 0.1rem 0; }
    .tp-seta i { display: inline-block; transform: rotate(90deg); font-style: normal; }
    .tp-kpis { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 640px) {
    .tp-bar, .tp-filtros, .tp-grade, .tp-head { padding-left: 1rem; padding-right: 1rem; }
    .tp-fluxo { padding-left: 1rem; padding-right: 1rem; }
    .tp-todas { margin-left: 1rem; margin-right: 1rem; }
    .tp-kpis { grid-template-columns: 1fr; }
    .tp-cards { grid-template-columns: 1fr; }
    .tp-stats { gap: 1rem; }
    .tp-head { grid-template-columns: 1fr; }
  }

'''

# ------------------------------------------------------------------ HTML
etapas_html = []
for i, (k, rot, desc) in enumerate(ETAPAS):
    if i:
        etapas_html.append('          <span class="tp-seta" aria-hidden="true"><i>&rarr;</i></span>')
    etapas_html.append(
        '          <div class="tp-etapa" data-etapa="%s">\n'
        '            <p class="tp-etapa-k">%s</p>\n'
        '            <p class="tp-etapa-d">%s</p>\n'
        '            <p class="tp-slot"></p>\n'
        '          </div>' % (k, rot, desc))

total = len(F)
com_caso = sum(1 for f in F if f['caso'])

HTML = '''  <!-- ================= TECNOLOGIA ================= -->
  <section class="sec" id="tecnologia">
    <div class="wrap">
      <div class="sec-lead">
        <span class="eyebrow reveal">Tecnologia</span>
        <h2 class="h-xl reveal d1">Tecnologia não é o fim. É o meio.</h2>
        <p class="sub reveal d2">
          Somos agnósticos de tecnologia: o stack sai do problema, não do contrato.
          Filtre por grupo e escolha uma ferramenta — o painel mostra o que ela faz
          e acende a etapa do projeto em que ela entra.
        </p>
      </div>

      <div class="tp reveal d2">
        <div class="tp-bar">
          <b>Painel de ferramentas</b>
          <div class="tp-stats">
            <div class="tp-stat"><b>%(total)d</b><span>ferramentas mapeadas</span></div>
            <div class="tp-stat"><b>%(grupos)d</b><span>grupos</span></div>
            <div class="tp-stat">
              <b>%(caso)d</b><span>com projeto entregue</span>
              <span class="tp-meter" aria-hidden="true"><i style="width:%(pct).0f%%"></i></span>
            </div>
          </div>
        </div>

        <div class="tp-filtros" id="tp-filtros" role="group" aria-label="Filtrar por grupo"></div>
        <div class="tp-grade" id="tp-grade" role="group" aria-label="Ferramentas"></div>

        <div class="tp-head">
          <span class="tp-head-ico" id="tp-ico" aria-hidden="true"></span>
          <div>
            <p class="tp-nome" id="tp-nome"></p>
            <p class="tp-oque" id="tp-oque"></p>
            <p class="tp-negocio" id="tp-negocio"></p>
            <p class="tp-selo" id="tp-selo" hidden></p>
          </div>
        </div>

        <div class="tp-fluxo" id="tp-fluxo">
%(etapas)s
        </div>

        <p class="tp-todas" id="tp-todas" hidden></p>

        <div class="tp-kpis">
          <div class="tp-kpi"><p>Grupo</p><b id="tp-k-grupo"></b></div>
          <div class="tp-kpi"><p>Etapa no fluxo</p><b id="tp-k-etapa"></b></div>
          <div class="tp-kpi"><p>Licença</p><b id="tp-k-lic"></b></div>
          <div class="tp-kpi"><p>Modelo</p><b id="tp-k-mod"></b></div>
          <div class="tp-kpi" id="tp-k-atlas-box"><p>Projeto Atlas</p><b id="tp-k-atlas"></b></div>
        </div>

        <div class="tp-cards">
          <div class="tp-card"><p>O que faz de melhor</p><span id="tp-melhor"></span></div>
          <div class="tp-card"><p>Melhor para</p><span id="tp-para"></span></div>
          <div class="tp-card"><p>Como se usa</p><span id="tp-como"></span></div>
          <div class="tp-card"><p>Onde se vê no mercado</p><span id="tp-mercado"></span></div>
        </div>
      </div>

      <p class="illus-note">&#10022; marca as ferramentas com projeto entregue pela Atlas &middot;
        &ldquo;onde se vê no mercado&rdquo; é leitura da Atlas, não participação de mercado medida</p>

      <div class="hero-ctas reveal d3" style="margin-top:1.8rem">
        <a class="btn btn-accent" href="#contato" data-magnetic>Falar com um especialista <span class="arr">&rarr;</span></a>
        <a class="btn btn-line" href="#contato" data-magnetic>Quero avaliar minha arquitetura <span class="arr">&rarr;</span></a>
      </div>
    </div>
  </section>
''' % dict(total=total, grupos=len(GRUPOS), caso=com_caso,
           pct=com_caso * 100.0 / total, etapas='\n'.join(etapas_html))

# ------------------------------------------------------------------ JS
campos = ('nome', 'grupo', 'icone', 'etapa', 'licenca', 'modelo',
          'oque', 'negocio', 'melhor', 'para', 'como', 'mercado', 'caso')
linhas = ',\n'.join('    [' + ','.join(js(f[c]) for c in campos) + ']' for f in F)
grupos_js = ',\n'.join('    [%s, %s]' % (js(k), js(r.replace('&amp;', '&'))) for k, r in GRUPOS)

JS = '''  /* ---------- Painel de tecnologia ---------- */
  // [nome, grupo, ícone, etapa, licença, modelo, o que é, para o negócio,
  //  faz de melhor, melhor para, como se usa, mercado, caso real da Atlas]
  //
  // Licença e modelo são fatos verificáveis. "Mercado" é leitura editorial:
  // não há fonte de participação de mercado aqui, e número inventado
  // derrubaria a credibilidade de todo o resto do painel.
  var TPG = [
%(grupos)s
  ];
  var TPF = [
%(linhas)s
  ];

  var tpGrade = document.getElementById('tp-grade');
  if (tpGrade) {
    var tpFil = document.getElementById('tp-filtros');
    var el = function (id) { return document.getElementById(id); };
    var tpEtapas = [].slice.call(document.querySelectorAll('.tp-etapa'));
    var tpTodas = el('tp-todas');
    var ROT = { origem: 'Origem', base: 'Base de dados', dash: 'Dashboards', todas: 'Atravessa as três' };
    var grupoDe = {};
    TPG.forEach(function (g) { grupoDe[g[0]] = g[1]; });

    var lista = [], itens = [], grupoAtual = TPG[0][0];

    TPG.forEach(function (g, gi) {
      var n = TPF.filter(function (f) { return f[1] === g[0]; }).length;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tp-filtro';
      b.innerHTML = g[1].replace(/&/g, '&amp;') + ' <small>' + n + '</small>';
      b.setAttribute('aria-pressed', gi === 0 ? 'true' : 'false');
      b.addEventListener('click', function () {
        [].forEach.call(tpFil.children, function (o, k) {
          o.setAttribute('aria-pressed', k === gi ? 'true' : 'false');
        });
        grupoAtual = g[0];
        montar();
      });
      tpFil.appendChild(b);
    });

    function montar() {
      tpGrade.innerHTML = '';
      itens = [];
      lista = TPF.filter(function (f) { return f[1] === grupoAtual; });
      lista.forEach(function (f, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'tp-item';
        b.setAttribute('aria-pressed', 'false');
        var ring = document.createElement('span');
        ring.className = 'tp-ring';
        ring.setAttribute('aria-hidden', 'true');
        var ico = document.createElement('span');
        if (f[2].charAt(0) === '#') { ico.className = 'tp-mn'; ico.textContent = f[2].slice(1); }
        else { ico.className = 'tp-ico'; ico.style.setProperty('--i', 'url(media/logos/' + f[2] + '.svg)'); }
        ring.appendChild(ico);
        b.appendChild(ring);
        if (f[12]) {
          var st = document.createElement('span');
          st.className = 'tp-star';
          st.setAttribute('aria-hidden', 'true');
          st.textContent = '\\u2726';
          b.appendChild(st);
        }
        b.appendChild(document.createTextNode(f[0]));
        b.addEventListener('mouseenter', function () { mostrar(i); });
        b.addEventListener('focus', function () { mostrar(i); });
        b.addEventListener('click', function () { mostrar(i); });
        tpGrade.appendChild(b);
        itens.push(b);
      });
      mostrar(0);
    }

    function mostrar(i) {
      var f = lista[i];
      if (!f) return;
      itens.forEach(function (b, k) { b.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });

      var ico = el('tp-ico');
      ico.innerHTML = '';
      if (f[2].charAt(0) === '#') {
        var m = document.createElement('b'); m.textContent = f[2].slice(1); ico.appendChild(m);
      } else {
        var s = document.createElement('span');
        s.style.setProperty('--i', 'url(media/logos/' + f[2] + '.svg)');
        ico.appendChild(s);
      }
      el('tp-nome').textContent = f[0];
      el('tp-oque').textContent = f[6];
      el('tp-negocio').textContent = f[7];
      var selo = el('tp-selo');
      selo.textContent = '\\u2726 Projeto entregue pela Atlas';
      selo.hidden = !f[12];

      // A etapa em que a ferramenta atua acende e recebe o descritivo.
      tpEtapas.forEach(function (e) {
        var k = e.getAttribute('data-etapa');
        var ativa = (f[3] === k) || (f[3] === 'todas');
        e.classList.toggle('on', ativa);
        var slot = e.querySelector('.tp-slot');
        slot.textContent = (f[3] === k) ? f[8] : '';
      });
      if (f[3] === 'todas') {
        tpTodas.innerHTML = '<b>Atravessa as três etapas</b>' + f[8];
        tpTodas.hidden = false;
      } else {
        tpTodas.hidden = true;
      }

      el('tp-k-grupo').textContent = grupoDe[f[1]] || '';
      el('tp-k-etapa').textContent = ROT[f[3]] || '';
      el('tp-k-lic').textContent = f[4];
      el('tp-k-mod').textContent = f[5];
      el('tp-k-atlas').textContent = f[12] ? 'Sim' : 'Não';
      el('tp-k-atlas-box').classList.toggle('sim', !!f[12]);

      el('tp-melhor').textContent = f[8];
      el('tp-para').textContent = f[9];
      el('tp-como').textContent = f[10];
      el('tp-mercado').textContent = f[11];
    }

    montar();
  }

''' % dict(grupos=grupos_js, linhas=linhas)


def main():
    p = RAIZ / 'index.html'
    s = p.read_text()

    # 1. fora a órbita antiga (CSS, HTML, JS)
    m = re.search(r'  /\* ---------- Tecnologia em órbita ---------- \*/\n.*?(?=  \.illus-note \{)', s, re.S)
    if not m:
        sys.exit('CSS da órbita não encontrado')
    s = s[:m.start()] + CSS + s[m.end():]

    m = re.search(r'  <!-- ================= TECNOLOGIA ================= -->\n  <section class="sec" id="tecnologia">.*?\n  </section>\n', s, re.S)
    if not m:
        sys.exit('seção de tecnologia não encontrada')
    s = s[:m.start()] + HTML + s[m.end():]

    m = re.search(r'  /\* ---------- Órbita de tecnologias ---------- \*/\n.*?\n    build\(CATS\[0\]\[0\]\);\n  \}\n', s, re.S)
    if not m:
        sys.exit('JS da órbita não encontrado')
    s = s[:m.start()] + JS + s[m.end():]

    # 2. fora a seção de arquitetura: o painel absorveu o fluxo
    m = re.search(r'\n  <div class="divider"></div>\n\n  <!-- ================= ARQUITETURA ================= -->\n  <section class="sec" id="arquitetura">.*?\n  </section>\n', s, re.S)
    if m:
        s = s[:m.start()] + s[m.end():]
    m = re.search(r'  /\* ---------- Arquitetura: onde cada ferramenta entra ---------- \*/\n.*?(?=  /\* ---------- Metodologia ---------- \*/)', s, re.S)
    if m:
        s = s[:m.start()] + s[m.end():]
    m = re.search(r'  /\* ---------- Arquitetura: onde cada ferramenta entra ---------- \*/\n  // nome.*?\n  \}\n\n(?=  /\* ---------- Barra de conversa ---------- \*/)', s, re.S)
    if m:
        s = s[:m.start()] + s[m.end():]

    p.write_text(s)
    print('painel montado: %d ferramentas, %d grupos, %d com projeto' % (total, len(GRUPOS), com_caso))


if __name__ == '__main__':
    main()
