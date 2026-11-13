# -*- coding: utf-8 -*-
SK = '<s class="sk"></s>'
def sp(d): return '<svg class="spark" viewBox="0 0 60 16" preserveAspectRatio="none"><path d="%s"/></svg>' % d
ICO_DB = '<svg class="ico-s" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>'
ICO_XL = '<svg class="ico-s" viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M4 15h16M10 3v18"/></svg>'
ICO_API = '<svg class="ico-s" viewBox="0 0 24 24"><path d="M8 8 3 12l5 4M16 8l5 4-5 4M14 5l-4 14"/></svg>'
ICO_FILE = '<svg class="ico-s" viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>'
LOCK = '<svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg>'

P = {}
P[0] = '''
<div class="cv flow" data-fios="s0>core;s1>core;s2>core;s3>core;core>i0;core>i1;core>i2;core>i3">
  <svg class="wires" aria-hidden="true"></svg>
  <div class="flow-col"><span class="vit-k">Fontes</span>
    <div class="nd src" id="s0" tabindex="0" data-liga="s0">%(a)s%(sk)s</div>
    <div class="nd src" id="s1" tabindex="0" data-liga="s1">%(b)s%(sk)s</div>
    <div class="nd src" id="s2" tabindex="0" data-liga="s2">%(c)s%(sk)s</div>
    <div class="nd src" id="s3" tabindex="0" data-liga="s3">%(d)s%(sk)s</div></div>
  <div class="flow-col"><span class="vit-k">Modelo dimensional</span>
    <div class="nd core" id="core" tabindex="0"><b>Fatos e dimensões</b>
      <div class="star"><i></i><i></i><i></i><i></i><i class="f"></i><i></i><i></i><i></i><i></i></div></div></div>
  <div class="flow-col"><span class="vit-k">Catálogo de indicadores</span>
    <div class="nd" id="i0" tabindex="0" data-tip="Cada área lê a mesma definição: a reunião discute a decisão, não o número.">%(sk)s%(s1)s</div>
    <div class="nd" id="i1" tabindex="0" data-tip="A regra mora no modelo, não em cada painel.">%(sk)s%(s2)s</div>
    <div class="nd" id="i2" tabindex="0" data-tip="O catálogo diz o que cada indicador significa e de onde ele vem.">%(sk)s%(s3)s</div>
    <div class="nd" id="i3" tabindex="0" data-tip="Dado de várias fontes chega ao indicador pelo mesmo caminho.">%(sk)s%(s4)s</div></div>
</div>
<p class="vit-cap" data-pad="Passe o mouse numa fonte ou num indicador e acompanhe o caminho do dado." aria-live="polite">Passe o mouse numa fonte ou num indicador e acompanhe o caminho do dado.</p>
''' % dict(a=ICO_DB,b=ICO_XL,c=ICO_API,d=ICO_FILE,sk=SK+'<s class="sk a"></s>',s1=sp('M1 13 L10 9 L20 11 L30 5 L42 7 L59 2'),s2=sp('M1 8 L12 12 L22 6 L33 9 L45 4 L59 6'),s3=sp('M1 10 L11 11 L24 7 L36 8 L47 3 L59 5'),s4=sp('M1 12 L14 8 L25 10 L38 4 L49 6 L59 3'))

P[1] = '''
<div class="vit-ctl"><div class="vit-seg" role="group" aria-label="Como cada painel calcula"><button type="button" data-def="0" aria-pressed="true">Cada painel por conta própria</button><button type="button" data-def="1" aria-pressed="false">Definição única</button></div></div>
<div class="cv def" data-fios="dn>p0;dn>p1;dn>p2">
  <svg class="wires off" aria-hidden="true"></svg>
  <div class="nd core" id="dn"><span class="vit-k">Definição da métrica</span>%(sk)s<s class="sk b"></s><span class="tag ac">escrita uma vez</span></div>
  <div class="def-pan">
    <div class="nd" id="p0" data-erro="0">%(sk)s<div class="def-bars"><i></i><i></i><i></i><i></i><i></i></div></div>
    <div class="nd" id="p1" data-erro="1">%(sk)s<div class="def-bars"><i></i><i></i><i></i><i></i><i></i></div></div>
    <div class="nd" id="p2" data-erro="0">%(sk)s<div class="def-bars"><i></i><i></i><i></i><i></i><i></i></div></div>
  </div>
</div>
<p class="vit-cap" id="def-cap" aria-live="polite"></p>
''' % dict(sk=SK+'<s class="sk a"></s>')

P[2] = '''
<div class="ver">
  <div>
    <span class="vit-k">Histórico da regra</span>
    <div class="ver-line" id="ver-line">
      <div class="ver-v"><button type="button" data-v="0" aria-pressed="false">v1</button><small>Criada</small></div>
      <div class="ver-v"><button type="button" data-v="1" aria-pressed="false">v2</button><small>Ajustada</small></div>
      <div class="ver-v"><button type="button" data-v="2" aria-pressed="false">v3</button><small>Revisada</small></div>
      <div class="ver-v"><button type="button" data-v="3" aria-pressed="true">v4</button><small>Atual</small></div>
    </div>
    <div class="nd"><span class="vit-k">Resultado da métrica</span><div class="bars" id="ver-bars" style="height:5.5rem"><i></i><i></i><i></i><i></i><i></i><i></i></div></div>
  </div>
  <div class="nd code" id="ver-code" aria-live="polite"></div>
</div>
<p class="vit-cap">Cada mudança de regra fica registrada: dá para ver o que mudou e voltar atrás.</p>
'''

P[3] = '''
<div class="vit-ctl"><span class="vit-k">Filtrar por área</span>
  <button class="vit-chip" type="button" data-cat="" aria-pressed="true">Todas</button><button class="vit-chip" type="button" data-cat="0" aria-pressed="false">Comercial</button><button class="vit-chip" type="button" data-cat="1" aria-pressed="false">Financeiro</button><button class="vit-chip" type="button" data-cat="2" aria-pressed="false">Operações</button></div>
<div class="cat">
  <div class="cat-list" id="cat-list"></div>
  <div class="cv"><svg class="wires" aria-hidden="true"></svg>
    <div class="nd cat-d" id="cat-d"><span class="vit-k">Indicador selecionado</span>%(sk)s<s class="sk b"></s><s class="sk a"></s>
      <div class="chain" id="cat-chain"><div class="tag">Fonte</div><em aria-hidden="true">&rarr;</em><div class="tag">Modelo</div><em aria-hidden="true">&rarr;</em><div class="tag ac">Indicador</div></div>
      <div class="cat-tags"><div class="tag ok">Certificado</div><div class="tag" id="cat-area">Área</div></div></div></div>
</div>
''' % dict(sk=SK)

P[4] = '''
<div class="vit-ctl"><div class="vit-seg" role="group" aria-label="Tipo de visão"><button type="button" data-vis="exec" aria-pressed="true">Visão executiva</button><button type="button" data-vis="oper" aria-pressed="false">Visão operacional</button></div>
  <span class="vit-k push">Filtre por área</span><button class="vit-chip" type="button" data-area="0" aria-pressed="true">Comercial</button><button class="vit-chip" type="button" data-area="1" aria-pressed="false">Financeiro</button><button class="vit-chip" type="button" data-area="2" aria-pressed="false">Operações</button></div>
<div class="db" id="db" data-vis="exec">
  <div class="db-kpis">%(k)s</div>
  <div class="db-main">
    <div class="nd db-card"><span class="vit-k">Evolução</span><svg class="line" viewBox="0 0 100 30" preserveAspectRatio="none"><path class="a" id="db-a"/><path class="l" id="db-l"/></svg><div class="bars" id="db-bars"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div>
    <div class="nd db-card"><span class="vit-k">Composição</span><div class="don"><svg viewBox="0 0 42 42" aria-hidden="true"><circle cx="21" cy="21" r="15.9155" stroke="var(--line)"/><circle id="dn0" cx="21" cy="21" r="15.9155" stroke="var(--accent)"/><circle id="dn1" cx="21" cy="21" r="15.9155" stroke="var(--accent-verde)"/><circle id="dn2" cx="21" cy="21" r="15.9155" stroke="var(--accent-quente)"/></svg></div>
      <div class="leg"><div style="--c:var(--accent)">Grupo A</div><div style="--c:var(--accent-verde)">Grupo B</div><div style="--c:var(--accent-quente)">Grupo C</div></div></div>
  </div>
  <div class="db-oper" id="db-oper">%(r)s</div>
</div>
''' % dict(k=''.join('<div class="nd db-kpi">%s<svg viewBox="0 0 60 16" preserveAspectRatio="none"><path data-k="%d"/></svg></div>'%(SK,i) for i in range(4)),
           r=''.join('<div class="nd row" style="--c:%s"><b></b>%s<u><i></i></u></div>'%(c,SK) for c in ['var(--accent-verde)','var(--accent-quente)','var(--accent-verde)','#E5575B','var(--accent-verde)']))

P[5] = '''
<div class="ss">
  <div class="nd ss-f" role="group" aria-label="Monte sua pergunta">
    <span class="vit-k">Medida</span>
    <button class="vit-chip" type="button" data-m="0" aria-pressed="true">Medida 1</button><button class="vit-chip" type="button" data-m="1" aria-pressed="false">Medida 2</button><button class="vit-chip" type="button" data-m="2" aria-pressed="false">Medida 3</button>
    <span class="vit-k">Cortar por</span>
    <button class="vit-chip" type="button" data-c="0" aria-pressed="true">Categoria</button><button class="vit-chip" type="button" data-c="1" aria-pressed="false">Período</button>
    <span class="vit-k">Gráfico</span>
    <div class="vit-seg"><button type="button" data-g="b" aria-pressed="true">Barras</button><button type="button" data-g="l" aria-pressed="false">Linha</button></div>
  </div>
  <div class="nd ss-o"><span class="vit-k" id="ss-t">Sua pergunta</span>
    <div class="bars" id="ss-bars"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
    <svg class="big" id="ss-line" viewBox="0 0 100 30" preserveAspectRatio="none" style="display:none"><path class="a" id="ss-a" fill="var(--accent)" opacity=".14"/><path id="ss-l" fill="none" stroke="var(--accent-light)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg></div>
</div>
<p class="vit-cap">A área monta a própria pergunta sobre o modelo governado, sem abrir chamado para o time de dados.</p>
'''

P[6] = '''
<div class="vit-ctl"><button class="vit-chip" type="button" id="pv-g" aria-pressed="false">Grade</button><button class="vit-chip" type="button" id="pv-m" aria-pressed="false">Margens</button><span class="vit-k push">Paleta</span></div>
<div class="pv">
  <div class="nd pv-mock" id="pv-mock"><i class="guia g1"></i><i class="guia g2"></i>
    <div class="tile"></div><div class="tile"></div><div class="tile"></div>
    <div class="wide"><i style="--h:40%"></i><i style="--h:68%"></i><i style="--h:52%"></i><i style="--h:84%"></i><i style="--h:60%"></i><i style="--h:92%"></i><i style="--h:46%"></i><i style="--h:72%"></i></div></div>
  <div class="pv-pal" id="pv-pal"></div>
</div>
<p class="vit-cap">Grade, paleta e tipografia definidas antes do primeiro painel: todo dashboard nasce com a cara do mesmo produto.</p>
'''

P[7] = '''
<div class="vit-ctl"><button class="vit-chip" type="button" id="pf-go">&#8635; Carregar de novo</button></div>
<div class="pf">
  <div class="nd pf-box"><h4>Sem otimização</h4><div class="pf-grid" id="pf-slow"><div class="pf-t"></div><div class="pf-t"></div><div class="pf-t"></div><div class="pf-t"></div></div><div class="pf-prog"><i id="pf-ps"></i></div></div>
  <div class="nd pf-box fast"><h4>Medidas DAX e modelo otimizados</h4><div class="pf-grid" id="pf-fast"><div class="pf-t"></div><div class="pf-t"></div><div class="pf-t"></div><div class="pf-t"></div></div><div class="pf-prog"><i id="pf-pf" style="background:var(--accent-verde)"></i></div></div>
</div>
<p class="vit-cap">Medida bem escrita e modelo enxuto: o painel responde na hora em que a pessoa filtra.</p>
'''

P[8] = '''
<div class="gv" id="gv" data-estado="antes"><div class="vit-ctl"><div class="vit-seg" role="group" aria-label="Antes e depois do padrão"><button type="button" data-est="antes" aria-pressed="true">Antes</button><button type="button" data-est="depois" aria-pressed="false">Depois</button></div></div>
<div class="gv-grid" id="gv-grid"></div>
<p class="vit-cap" id="gv-cap" aria-live="polite"></p></div>
'''

P[9] = '''
<div class="ac">
  <div class="nd ac-m" id="ac-m"></div>
  <div class="nd ac-v"><span class="vit-k" id="ac-t">Visto por</span><div class="ac-vg" id="ac-vg"><i></i><i></i><i></i><i></i><i></i></div></div>
</div>
<p class="vit-cap">Cada perfil enxerga só o que precisa. Clique na matriz para dar ou retirar acesso.</p>
'''

P[10] = '''
<div class="vit-ctl"><div class="vit-seg" role="group" aria-label="Migração"><button type="button" data-mg="antes" aria-pressed="true">Painéis dispersos</button><button type="button" data-mg="depois" aria-pressed="false">Consolidado</button></div></div>
<div class="mg" id="mg" data-e="antes"></div>
<p class="vit-cap" id="mg-cap" aria-live="polite"></p>
'''

P[11] = '''
<div class="dc" data-fios="t0>d;t1>d;t2>d;t3>d">
  <div class="cv" style="display:contents"></div>
  <div class="dc-t" id="dc-t">
    <button class="nd" type="button" aria-pressed="true" data-t="0" id="t0"><span class="tag ac">F</span>%(sk)s</button>
    <button class="nd" type="button" aria-pressed="false" data-t="1" id="t1"><span class="tag">D</span>%(sk)s</button>
    <button class="nd" type="button" aria-pressed="false" data-t="2" id="t2"><span class="tag">D</span>%(sk)s</button>
    <button class="nd" type="button" aria-pressed="false" data-t="3" id="t3"><span class="tag">D</span>%(sk)s</button></div>
  <div class="nd dc-d" id="d"><span class="vit-k" id="dc-n">Tabela</span>%(sk)s<s class="sk b"></s>
    <div class="dc-f" id="dc-f"></div></div>
</div>
<p class="vit-cap">Tabelas, campos e regras descritos para que o time novo entenda o modelo sem depender de quem o criou.</p>
''' % dict(sk=SK+'<s class="sk a"></s>')
