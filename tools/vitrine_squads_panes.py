# -*- coding: utf-8 -*-
"""Painéis da vitrine de Especialistas & Squads. Só formas, sem dados reais."""
SK = '<s class="sk"></s>'
SKA = SK + '<s class="sk a"></s>'
def AV(cls=''):
    return ('<svg class="av %s" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="15" r="7"/><path d="M6 36c1-8 7-12 14-12s13 4 14 12z"/></svg>' % cls)

def perfil(n, papel, chips, rotulo):
    return '''
<div class="pr">
  <div class="nd pr-card"><div class="pr-av">%s</div><b class="pr-role">%s</b><span class="tag ac">Perfil alocado</span>
    <span class="vit-k">Atuação</span><div class="pr-chips" id="prc%d">%s</div></div>
  <div class="nd pr-vis"><span class="vit-k">%s</span><div class="pr-canvas" id="prv%d"></div></div>
</div>
<p class="vit-cap" id="prp%d" aria-live="polite"></p>
''' % (AV(), papel, n, ''.join('<button class="vit-chip" type="button" data-s="%d" aria-pressed="%s">%s</button>' % (i, 'true' if i == 0 else 'false', c) for i, c in enumerate(chips)), rotulo, n, n)

P = {}
P[0] = perfil(0, 'Engenheiro de dados', ['Pipelines', 'Orquestração', 'Modelagem', 'Qualidade'], 'Onde ele atua')
P[1] = perfil(1, 'Analista e desenvolvedor de BI', ['Dashboards', 'Modelo semântico', 'Performance', 'Governança'], 'Onde ele atua')
P[2] = perfil(2, 'Cientista de dados', ['Modelos preditivos', 'Anomalias', 'Experimentos', 'Produção'], 'Onde ele atua')
P[3] = perfil(3, 'Arquiteto de dados', ['Desenho da base', 'Nuvem', 'Segurança', 'Padrões'], 'Onde ele atua')

# 4 contratos de no minimo 6 meses
P[4] = '''
<div class="vit-ctl"><div class="vit-seg" role="group" aria-label="Prazo da alocação"><button type="button" data-ct="0" aria-pressed="true">Prazo mais curto</button><button type="button" data-ct="1" aria-pressed="false">Prazo médio</button><button type="button" data-ct="2" aria-pressed="false">Prazo mais longo</button></div></div>
<div class="ct"><div class="ct-track" id="sqc-track"></div><div class="ct-leg"><span class="ct-a">Início da alocação</span><span class="ct-b">Prazo combinado com cada cliente</span></div></div>
<p class="vit-cap" id="sqc-cap" aria-live="polite"></p>
'''

# 5 tempo indeterminado
P[5] = '''
<div class="vit-ctl"><div class="vit-seg" role="group" aria-label="Duração da alocação"><button type="button" data-ti="0" aria-pressed="true">Prazo fechado</button><button type="button" data-ti="1" aria-pressed="false">Tempo indeterminado</button></div></div>
<div class="ti" id="sqti" data-m="0"><div class="ti-line"><i class="ti-fill"></i><b class="ti-end"></b><svg class="ti-inf" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8a4 4 0 1 0 0 8c4 0 6-8 10-8a4 4 0 1 1 0 8c-4 0-6-8-10-8z"/></svg></div>
  <div class="ti-people"><div class="nd">%(av)s%(sk)s</div><div class="nd">%(av)s%(sk)s</div><div class="nd">%(av)s%(sk)s</div></div></div>
<p class="vit-cap" id="sqti-cap" aria-live="polite"></p>
''' % dict(av=AV(), sk=SKA)

# 6 gestão do cliente
P[6] = '''
<div class="vit-ctl"><span class="vit-k">Destacar</span><button class="vit-chip" type="button" data-g="gestao" aria-pressed="false">Gestão</button><button class="vit-chip" type="button" data-g="respaldo" aria-pressed="false">Respaldo técnico</button></div>
<div class="cv gs" id="sqgs" data-fios="gc>ge;ge>ga"><svg class="wires" aria-hidden="true"></svg>
  <div class="nd" id="gc"><span class="vit-k">Seu time</span>%(av)s<b class="gs-t">Gestão do cliente</b>%(sk)s</div>
  <div class="nd core" id="ge"><span class="vit-k">No seu time</span>%(av)s<b class="gs-t">Especialista alocado</b>%(sk)s</div>
  <div class="nd gs-atlas" id="ga"><span class="vit-k">Por trás</span>%(av)s<b class="gs-t">Respaldo técnico da Atlas</b>%(sk)s</div>
</div>
<p class="vit-cap" id="sqgs-cap" aria-live="polite"></p>
''' % dict(av=AV(), sk=SKA)

# 7 substituição
P[7] = '''
<div class="vit-ctl"><div class="vit-seg" role="group" aria-label="Como a troca acontece"><button type="button" data-sb="0" aria-pressed="true">Sem reposição estruturada</button><button type="button" data-sb="1" aria-pressed="false">Substituição Atlas</button></div><button class="vit-chip push" type="button" id="sqs-go">&#9654; Simular uma saída</button></div>
<div class="sb"><div class="sb-team" id="sqs-team"></div><span class="vit-k">Ritmo de entrega</span><div class="sb-lane" id="sqs-lane"></div></div>
<p class="vit-cap" id="sqs-cap" aria-live="polite"></p>
'''

# 8 time por perfil e senioridade
P[8] = '''
<div class="mt"><div class="mt-rows" id="sqm-rows"></div><div class="nd mt-prev"><span class="vit-k">Seu squad</span><div class="mt-squad" id="sqm-squad"></div></div></div>
<p class="vit-cap" id="sqm-cap" aria-live="polite"></p>
'''

# 9 liderança técnica
P[9] = '''
<div class="vit-ctl"><div class="vit-seg" role="group" aria-label="Liderança"><button type="button" data-ld="0" aria-pressed="true">Sem liderança técnica</button><button type="button" data-ld="1" aria-pressed="false">Com liderança técnica</button></div></div>
<div class="cv ld" id="sqld" data-m="0" data-fios=""><svg class="wires off" aria-hidden="true"></svg>
  <div class="nd core" id="ldl"><span class="vit-k">Liderança técnica Atlas</span>%(av)s%(sk)s</div>
  <div class="ld-col"><div class="nd" id="ldm0">%(av)s%(sk)s</div><div class="nd" id="ldm1">%(av)s%(sk)s</div><div class="nd" id="ldm2">%(av)s%(sk)s</div><div class="nd" id="ldm3">%(av)s%(sk)s</div></div>
</div>
<p class="vit-cap" id="sqld-cap" aria-live="polite"></p>
''' % dict(av=AV(), sk=SKA)

# 10 ritmo de entrega
P[10] = '''
<div class="vit-ctl"><div class="vit-seg" role="group" aria-label="Ritmo"><button type="button" data-rt="curto" aria-pressed="true">Ciclo curto</button><button type="button" data-rt="longo" aria-pressed="false">Ciclo longo</button></div></div>
<div class="rt" id="sqrt" data-m="curto"><div class="rt-steps" id="sqrt-steps"></div><span class="vit-k">Entregas acumuladas</span><div class="rt-done" id="sqrt-done"></div></div>
<p class="vit-cap" id="sqrt-cap" aria-live="polite"></p>
'''

# 11 transferência de conhecimento
P[11] = '''
<div class="vit-ctl"><div class="vit-seg" role="group" aria-label="Fase do projeto"><button type="button" data-tk="0" aria-pressed="true">Início</button><button type="button" data-tk="1" aria-pressed="false">Meio</button><button type="button" data-tk="2" aria-pressed="false">Fim</button></div></div>
<div class="tk" id="sqtk" data-f="0"><div class="tk-side"><span class="vit-k">Time Atlas</span><div class="tk-av" id="sqtk-a"></div></div>
  <div class="tk-mid"><span class="vit-k">Quem conduz</span><div class="tk-bar"><i class="tk-a"></i><i class="tk-c"></i></div><div class="tk-docs" aria-hidden="true"><i></i><i></i><i></i></div></div>
  <div class="tk-side"><span class="vit-k">Time do cliente</span><div class="tk-av" id="sqtk-c"></div></div></div>
<p class="vit-cap" id="sqtk-cap" aria-live="polite"></p>
'''
