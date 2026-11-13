# -*- coding: utf-8 -*-
"""Painéis da vitrine de IA & Automação. Só formas, sem dados reais."""
SK = '<s class="sk"></s>'
SKA = SK + '<s class="sk a"></s>'
def ic(d): return '<svg class="ico-s" viewBox="0 0 24 24">%s</svg>' % d
PERSON = ic('<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>')
BOLT = ic('<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>')

P = {}

# 0 modelos preditivos
P[0] = '''
<div class="vit-ctl"><span class="vit-k">Prever</span><button class="vit-chip" type="button" data-pv="0" aria-pressed="true">Demanda</button><button class="vit-chip" type="button" data-pv="1" aria-pressed="false">Ruptura</button><button class="vit-chip" type="button" data-pv="2" aria-pressed="false">Risco</button><button class="vit-chip" type="button" data-pv="3" aria-pressed="false">Churn</button></div>
<div class="nd pv"><div class="pv-plot" id="iapv"><svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
  <path class="band" id="iapv-b"/><path class="hist" id="iapv-h"/><path class="fc" id="iapv-f"/><line class="now" x1="62" y1="0" x2="62" y2="40"/></svg>
  <span class="pv-act" id="iapv-w"><b>Ainda dá tempo de agir</b></span></div>
  <div class="pv-leg"><span class="l1">Histórico da operação</span><span class="l2">Previsão</span></div></div>
<p class="vit-cap" id="iapv-cap" aria-live="polite"></p>
'''

# 1 machine learning
P[1] = '''
<div class="vit-ctl"><div class="vit-seg" role="group" aria-label="Estado do modelo"><button type="button" data-ml="0" aria-pressed="true">Antes de aprender</button><button type="button" data-ml="1" aria-pressed="false">Depois de aprender</button></div><button class="vit-chip push" type="button" id="iaml-go">&#8635; Treinar de novo</button></div>
<div class="nd ml"><div class="ml-plot" id="iaml"></div></div>
<p class="vit-cap" id="iaml-cap" aria-live="polite"></p>
'''

# 2 anomalias
P[2] = '''
<div class="vit-ctl"><div class="vit-seg" role="group" aria-label="Quando o desvio aparece"><button type="button" data-an="fech" aria-pressed="true">Só no fechamento do mês</button><button type="button" data-an="agora" aria-pressed="false">No momento em que acontece</button></div><button class="vit-chip push" type="button" id="iaan-go">&#9654; Reproduzir</button></div>
<div class="nd an"><div class="an-plot" id="iaan"><svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><path class="base" id="iaan-l"/><path class="run" id="iaan-r"/></svg>
  <i class="an-spk" id="iaan-s"></i><i class="an-fch" id="iaan-e"></i><span class="an-al" id="iaan-a1">Alerta</span><span class="an-al late" id="iaan-a2">Alerta</span></div>
  <div class="an-axis"><span>Início do mês</span><span>Fechamento do mês</span></div></div>
<p class="vit-cap" id="iaan-cap" aria-live="polite"></p>
'''

# 3 genai e agentes
P[3] = '''
<div class="vit-ctl"><span class="vit-k">Pergunte sobre</span><button class="vit-chip" type="button" data-ga="0" aria-pressed="true">Comercial</button><button class="vit-chip" type="button" data-ga="1" aria-pressed="false">Financeiro</button><button class="vit-chip" type="button" data-ga="2" aria-pressed="false">Operações</button></div>
<div class="cv ga" id="iaga" data-fios="gf>gm;gm>gr"><svg class="wires" aria-hidden="true"></svg>
  <div class="ga-chat nd"><div class="ga-q"><svg class="av" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="15" r="7"/><path d="M6 36c1-8 7-12 14-12s13 4 14 12z"/></svg>%(ska)s</div>
    <div class="ga-a" id="gr"><span class="vit-k">Resposta</span><div class="ga-typing" id="iaga-t"><i></i><i></i><i></i></div><div class="ga-ans" id="iaga-a"><div class="ga-num"></div><div class="pz-bars" id="iaga-b"></div></div></div></div>
  <div class="ga-src"><span class="vit-k">De onde veio</span><div class="nd" id="gf"><span class="tag">Fonte</span>%(sk)s</div><div class="nd core" id="gm"><span class="tag ac">Modelo</span>%(sk)s</div></div>
</div>
<p class="vit-cap" id="iaga-cap" aria-live="polite"></p>
''' % dict(ska=SKA, sk=SKA)

# 4 document ai
P[4] = '''
<div class="vit-ctl"><span class="vit-k">Documento</span><button class="vit-chip" type="button" data-dc="0" aria-pressed="true">Contrato</button><button class="vit-chip" type="button" data-dc="1" aria-pressed="false">Nota</button><button class="vit-chip" type="button" data-dc="2" aria-pressed="false">Relatório</button><button class="vit-chip push" type="button" id="iadc-go">&#8635; Ler de novo</button></div>
<div class="cv dc2" data-fios="dcd>dct"><svg class="wires" aria-hidden="true"></svg>
  <div class="nd dc2-doc" id="dcd"><span class="vit-k">Documento em PDF</span><div class="dc2-page" id="iadc-p"><i class="beam"></i></div></div>
  <div class="nd dc2-tab" id="dct"><span class="vit-k">Dado consultável</span><div class="dc2-rows" id="iadc-r"></div></div>
</div>
<p class="vit-cap" id="iadc-cap" aria-live="polite"></p>
'''

# 5 automacao de processos
P[5] = '''
<div class="vit-ctl"><div class="vit-seg" role="group" aria-label="Como o processo roda"><button type="button" data-au="0" aria-pressed="true">Passando de mão em mão</button><button type="button" data-au="1" aria-pressed="false">Automatizado</button></div><button class="vit-chip push" type="button" id="iaau-go">&#9654; Executar</button></div>
<div class="cv au" id="iaau" data-m="0" data-fios="u0>u1;u1>u2;u2>u3;u3>u4"><svg class="wires off" aria-hidden="true"></svg>
  %(n)s</div>
<div class="au-time"><span class="vit-k">Tempo até concluir</span><div class="au-bar"><i id="iaau-f"></i></div></div>
<p class="vit-cap" id="iaau-cap" aria-live="polite"></p>
''' % dict(n=''.join('<div class="nd au-n" id="u%d"><span class="au-i">%s</span>%s<i class="au-s"></i></div>' % (i, PERSON, SK) for i in range(5)))
