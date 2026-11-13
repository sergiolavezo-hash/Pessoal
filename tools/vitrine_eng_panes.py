# -*- coding: utf-8 -*-
"""Painéis da vitrine de Engenharia de Dados. Só formas, sem dados reais."""
SK = '<s class="sk"></s>'
SKA = SK + '<s class="sk a"></s>'
def ic(d): return '<svg class="ico-s" viewBox="0 0 24 24">%s</svg>' % d
DB = ic('<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>')
XL = ic('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M4 15h16M10 3v18"/>')
API = ic('<path d="M8 8 3 12l5 4M16 8l5 4-5 4M14 5l-4 14"/>')
FILE = ic('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>')
CLOUD = ic('<path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 11a3.5 3.5 0 0 0 1 7Z"/>')
BOLT = ic('<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>')
OK = '<svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg>'

P = {}

# 0 conectores gerenciados
P[0] = '''
<div class="vit-ctl"><div class="vit-seg" role="group" aria-label="Como a fonte chega ao destino"><button type="button" data-cn="0" aria-pressed="true">Scripts avulsos</button><button type="button" data-cn="1" aria-pressed="false">Conectores gerenciados</button></div></div>
<div class="cv cn" data-fios="c0>hub;c1>hub;c2>hub;c3>hub;hub>dst"><svg class="wires off" aria-hidden="true"></svg>
  <div class="cn-col"><span class="vit-k">Fontes</span>
    <button type="button" class="nd src" aria-label="Sincronizar fonte" id="c0">%(a)s%(sk)s<i class="st"></i></button>
    <button type="button" class="nd src" aria-label="Sincronizar fonte" id="c1">%(b)s%(sk)s<i class="st"></i></button>
    <button type="button" class="nd src" aria-label="Sincronizar fonte" id="c2">%(c)s%(sk)s<i class="st"></i></button>
    <button type="button" class="nd src" aria-label="Sincronizar fonte" id="c3">%(d)s%(sk)s<i class="st"></i></button></div>
  <div class="nd core cn-hub" id="hub"><span class="vit-k">Conector gerenciado</span>%(sk)s<span class="tag ac" id="cn-tag">agenda e monitora</span></div>
  <div class="nd cn-dst" id="dst"><span class="vit-k">Destino</span>%(db)s%(sk)s</div>
</div>
<p class="vit-cap" id="cn-cap" aria-live="polite"></p>
''' % dict(a=DB, b=XL, c=API, d=FILE, db=CLOUD, sk=SKA)

# 1 streaming
P[1] = '''
<div class="vit-ctl"><div class="vit-seg" role="group" aria-label="Como o evento chega"><button type="button" data-sm="lote" aria-pressed="true">Lote</button><button type="button" data-sm="stream" aria-pressed="false">Streaming</button></div></div>
<div class="sm" id="sm" data-m="lote">
  <div class="sm-col"><span class="vit-k">Eventos</span><div class="nd">%(b)s%(sk)s</div><div class="nd">%(b)s%(sk)s</div><div class="nd">%(b)s%(sk)s</div></div>
  <div class="sm-lanes">%(lanes)s</div>
  <div class="sm-col"><span class="vit-k">Destino</span><div class="nd core sm-dst"><b class="sm-b">Quando o dado chega</b><div class="sm-pulse"></div></div></div>
</div>
<p class="vit-cap" id="sm-cap" aria-live="polite"></p>
''' % dict(b=BOLT, sk=SKA, lanes=''.join('<div class="sm-lane">%s</div>' % ''.join('<i style="--d:%.1fs;--b:%d"></i>' % (k * 0.55 + n * 0.18, 3 + k * 4) for k in range(5)) for n in range(3)))

# 2 legado
P[2] = '''
<div class="vit-ctl"><div class="vit-seg" role="group" aria-label="Como os sistemas conversam"><button type="button" data-lg="0" aria-pressed="true">Ponto a ponto</button><button type="button" data-lg="1" aria-pressed="false">Camada de integração</button></div></div>
<div class="cv lg" id="lg" data-fios=""><svg class="wires off" aria-hidden="true"></svg>
  <div class="lg-col"><span class="vit-k">Legado</span><div class="nd lg-old" id="l0">%(sk)s<span class="tag">legado</span></div><div class="nd lg-old" id="l1">%(sk)s<span class="tag">legado</span></div></div>
  <div class="lg-mid"><div class="nd core" id="lh"><span class="vit-k">Integração</span>%(sk)s</div></div>
  <div class="lg-col"><span class="vit-k">Plataforma atual</span><div class="nd" id="pa0">%(sk)s</div><div class="nd" id="pa1">%(sk)s</div></div>
</div>
<p class="vit-cap" id="lg-cap" aria-live="polite"></p>
''' % dict(sk=SKA)

# 3 APIs e arquivos
P[3] = '''
<div class="vit-ctl"><div class="vit-seg" role="group" aria-label="Tipo de origem"><button type="button" data-ap="api" aria-pressed="true">API</button><button type="button" data-ap="arq" aria-pressed="false">Arquivos</button></div><button class="vit-chip push" type="button" id="ap-go">&#8635; Ingerir de novo</button></div>
<div class="cv ap" data-fios="apsrc>aptab"><svg class="wires" aria-hidden="true"></svg>
  <div class="nd ap-src" id="apsrc"><span class="vit-k" id="ap-k">Resposta da API</span><div class="ap-body" id="ap-body"></div></div>
  <div class="nd ap-tab" id="aptab"><span class="vit-k">Tabela de destino</span><div class="ap-rows" id="ap-rows"></div></div>
</div>
<p class="vit-cap" id="ap-cap" aria-live="polite"></p>
'''

# 4 data lake
P[4] = '''
<div class="vit-ctl"><span class="vit-k">Mostrar</span><button class="vit-chip" type="button" data-lk="" aria-pressed="true">Tudo</button><button class="vit-chip" type="button" data-lk="t" aria-pressed="false">Tabelas</button><button class="vit-chip" type="button" data-lk="s" aria-pressed="false">Semiestruturado</button><button class="vit-chip" type="button" data-lk="f" aria-pressed="false">Arquivos livres</button></div>
<div class="lk" id="lk"></div>
<p class="vit-cap">O dado entra do jeito que chega, em qualquer formato, e fica disponível para quem precisar.</p>
'''

# 5 data warehouse
P[5] = '''
<div class="vit-ctl"><span class="vit-k">Consulta</span><button class="vit-chip" type="button" data-wq="0" aria-pressed="true">Consulta 1</button><button class="vit-chip" type="button" data-wq="1" aria-pressed="false">Consulta 2</button><button class="vit-chip" type="button" data-wq="2" aria-pressed="false">Consulta 3</button></div>
<div class="nd wh"><div class="wh-grid" id="wh"></div></div>
<p class="vit-cap" id="wh-cap" aria-live="polite"></p>
'''

# 6 lakehouse
P[6] = '''
<div class="vit-ctl"><div class="vit-seg" role="group" aria-label="Arquitetura"><button type="button" data-lh="0" aria-pressed="true">Lake + Warehouse</button><button type="button" data-lh="1" aria-pressed="false">Lakehouse</button></div></div>
<div class="cv lh" id="lhv" data-fios=""><svg class="wires off" aria-hidden="true"></svg>
  <div class="lh-col"><div class="nd core" id="hl"><span class="vit-k" id="hl-k">Data Lake</span>%(sk)s<div class="lh-copy"><i></i><i></i><i></i></div></div></div>
  <div class="lh-col" id="hw-col"><div class="nd" id="hw"><span class="vit-k">Data Warehouse</span>%(sk)s<div class="lh-copy"><i></i><i></i><i></i></div></div></div>
  <div class="lh-col"><span class="vit-k">Consumo</span><div class="nd" id="hb"><span class="tag ac">BI</span>%(sk)s</div><div class="nd" id="hm"><span class="tag ac">Ciência de dados</span>%(sk)s</div></div>
</div>
<p class="vit-cap" id="lh-cap" aria-live="polite"></p>
''' % dict(sk=SKA)

# 7 modelagem
P[7] = '''
<div class="vit-ctl"><div class="vit-seg" role="group" aria-label="Modelo"><button type="button" data-md="o" aria-pressed="true">Origem normalizada</button><button type="button" data-md="a" aria-pressed="false">Modelo analítico</button></div></div>
<div class="cv md" id="md"><svg class="wires off" aria-hidden="true"></svg></div>
<p class="vit-cap" id="md-cap" aria-live="polite"></p>
'''

# 8 etl / elt
P[8] = '''
<div class="vit-ctl"><div class="vit-seg" role="group" aria-label="Ordem das etapas"><button type="button" data-el="etl" aria-pressed="true">ETL</button><button type="button" data-el="elt" aria-pressed="false">ELT</button></div></div>
<div class="cv el" data-fios="e0>e1;e1>e2;e2>e3"><svg class="wires" aria-hidden="true"></svg>
  <div class="nd" id="e0"><b class="el-t" id="el0">Extrair</b>%(sk)s</div>
  <div class="nd" id="e1"><b class="el-t" id="el1">Transformar</b>%(sk)s</div>
  <div class="nd" id="e2"><b class="el-t" id="el2">Carregar</b>%(sk)s</div>
  <div class="nd core" id="e3"><span class="vit-k">Destino</span>%(db)s%(sk)s</div>
</div>
<p class="vit-cap" id="el-cap" aria-live="polite"></p>
''' % dict(sk=SKA, db=DB)

# 9 transformação versionada e testada
P[9] = '''
<div class="vit-ctl"><button class="vit-chip" type="button" id="tv-bad" aria-pressed="false">Quebrar um teste</button><span class="vit-k push">Clique num modelo para ver a linhagem</span></div>
<div class="cv tv" id="tv" data-fios="r0>s0;r1>s0;r1>s1;s0>m0;s1>m0;s1>m1"><svg class="wires" aria-hidden="true"></svg>
  <div class="tv-col"><span class="vit-k">Brutos</span><button class="nd tvn" aria-label="Ver linhagem do modelo" id="r0" type="button">%(sk)s</button><button class="nd tvn" aria-label="Ver linhagem do modelo" id="r1" type="button">%(sk)s</button></div>
  <div class="tv-col"><span class="vit-k">Preparados</span><button class="nd tvn" aria-label="Ver linhagem do modelo" id="s0" type="button">%(sk)s<i class="tt"></i></button><button class="nd tvn" aria-label="Ver linhagem do modelo" id="s1" type="button">%(sk)s<i class="tt"></i></button></div>
  <div class="tv-col"><span class="vit-k">Entregues</span><button class="nd tvn" aria-label="Ver linhagem do modelo" id="m0" type="button">%(sk)s<i class="tt"></i></button><button class="nd tvn" aria-label="Ver linhagem do modelo" id="m1" type="button">%(sk)s<i class="tt"></i></button></div>
  <div class="nd code tv-log"><span class="vit-k">Versões</span><span class="add">+<s style="width:70%%"></s></span><span class="">&nbsp;<s style="width:55%%"></s></span><span class="add">+<s style="width:62%%"></s></span></div>
</div>
<p class="vit-cap" id="tv-cap" aria-live="polite"></p>
''' % dict(sk=SKA)

# 10 orquestração
P[10] = '''
<div class="vit-ctl"><button class="vit-chip" type="button" id="or-go">&#9654; Executar</button><button class="vit-chip" type="button" id="or-fail" aria-pressed="false">Simular falha</button><span class="tag push">agenda diária</span></div>
<div class="cv or" id="or" data-fios="o0>o1;o0>o2;o1>o3;o2>o3;o3>o4"><svg class="wires" aria-hidden="true"></svg>
  <div class="or-c"><div class="nd ot" id="o0">%(sk)s<i class="os"></i></div></div>
  <div class="or-c"><div class="nd ot" id="o1">%(sk)s<i class="os"></i></div><div class="nd ot" id="o2">%(sk)s<i class="os"></i></div></div>
  <div class="or-c"><div class="nd ot" id="o3">%(sk)s<i class="os"></i></div></div>
  <div class="or-c"><div class="nd ot" id="o4">%(sk)s<i class="os"></i></div></div>
</div>
<p class="vit-cap" id="or-cap" aria-live="polite"></p>
''' % dict(sk=SKA)

# 11 testes de qualidade
P[11] = '''
<div class="vit-ctl"><button class="vit-chip" type="button" id="qt-bad" aria-pressed="false">Injetar dado ruim</button><button class="vit-chip" type="button" id="qt-ok">Corrigir</button></div>
<div class="qt">
  <div class="nd qt-tab"><span class="vit-k">Tabela</span><div class="qt-grid" id="qt-grid"></div></div>
  <div class="qt-tests" id="qt-tests"></div>
</div>
<p class="vit-cap" id="qt-cap" aria-live="polite"></p>
'''
