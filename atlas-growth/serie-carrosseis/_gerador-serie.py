# -*- coding: utf-8 -*-
"""Coleção editorial Atlas — 25 carrosséis de 4 páginas, 1080x1350."""
import os, subprocess, shutil, pathlib, json

OUT = pathlib.Path("/home/user/Pessoal/atlas-growth/serie-carrosseis")
TMP = pathlib.Path("/tmp/claude-0/-home-user-Pessoal/8dc2aba8-ae2e-5211-9229-c379e03f98f3/scratchpad/html_serie")
CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
W, H = 1080, 1350

CSS = """
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1350px;overflow:hidden}
body{font-family:'Inter Variable',sans-serif;background:#05070D;color:#fff;
 -webkit-font-smoothing:antialiased;font-feature-settings:'ss01','cv11'}
.c{position:relative;width:1080px;height:1350px;overflow:hidden}
.glow{position:absolute;border-radius:50%;filter:blur(150px)}
.g1{width:900px;height:900px;right:-300px;bottom:-340px;opacity:.40;
 background:radial-gradient(circle,#1B62F0 0%,#0B2E7A 48%,transparent 72%)}
.g2{width:560px;height:560px;left:-220px;top:-200px;opacity:.20;
 background:radial-gradient(circle,#2E7BFF 0%,#0A1E4A 52%,transparent 74%)}
.grid{position:absolute;inset:0;
 background-image:linear-gradient(rgba(255,255,255,.022) 1px,transparent 1px),
 linear-gradient(90deg,rgba(255,255,255,.022) 1px,transparent 1px);background-size:90px 90px}
.vg{position:absolute;inset:0;
 background:radial-gradient(ellipse at 50% 38%,transparent 34%,rgba(5,7,13,.92) 100%)}
.in{position:absolute;inset:0;padding:78px 84px 104px;display:flex;flex-direction:column}
.top{font-size:19px;letter-spacing:.26em;font-weight:600;text-transform:uppercase;
 color:rgba(255,255,255,.26)}
.mid{flex:1;display:flex;flex-direction:column;justify-content:center;padding:30px 0}
.mid.t{justify-content:flex-start;padding-top:52px}
.kick{font-size:23px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;
 color:#5AA2FF;margin-bottom:30px}
h1{font-size:86px;line-height:1.04;font-weight:800;letter-spacing:-.035em}
h1.s{font-size:70px}
h2{font-size:60px;line-height:1.1;font-weight:780;letter-spacing:-.028em}
h2.s{font-size:50px}
.sub{margin-top:28px;font-size:34px;line-height:1.4;font-weight:400;
 color:rgba(255,255,255,.58);letter-spacing:-.008em}
.bd{margin-top:24px;font-size:31px;line-height:1.46;color:rgba(255,255,255,.62)}
.ac{color:#5AA2FF}.wt{color:#fff;font-weight:650}
.note{margin-top:26px;font-size:20px;color:rgba(255,255,255,.34);line-height:1.4}
/* footer */
.ft{display:flex;justify-content:space-between;align-items:flex-end}
.lg{display:flex;align-items:center;gap:12px}
.ld{width:10px;height:10px;border-radius:50%;background:#2E7BFF;
 box-shadow:0 0 16px rgba(46,123,255,.9)}
.lt{font-size:20px;font-weight:700;letter-spacing:.22em;color:rgba(255,255,255,.75);line-height:1.6}
.lt span{font-weight:400;color:rgba(255,255,255,.42)}
.pg{font-size:20px;letter-spacing:.18em;color:rgba(255,255,255,.42);line-height:1.6}
/* fluxo vertical */
.flow{margin-top:14px;display:flex;flex-direction:column;align-items:flex-start;gap:0}
.fs{display:flex;align-items:center;gap:22px;padding:21px 30px;border-radius:14px;
 background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07);
 font-size:32px;font-weight:600;letter-spacing:-.01em;min-width:520px}
.fs.hi{background:linear-gradient(100deg,rgba(46,123,255,.20),rgba(46,123,255,.06));
 border-color:rgba(90,162,255,.38);color:#DCE9FF}
.fs .n{font-size:19px;font-weight:800;color:#5AA2FF;letter-spacing:.1em;min-width:32px}
.fa{height:34px;width:2px;background:linear-gradient(#2E7BFF,rgba(46,123,255,.15));
 margin-left:56px}
/* chips */
.chips{margin-top:34px;display:grid;grid-template-columns:1fr 1fr;gap:16px}
.chip{padding:24px 26px;border-radius:14px;background:rgba(255,255,255,.035);
 border:1px solid rgba(255,255,255,.07);font-size:30px;font-weight:600;
 letter-spacing:-.01em;color:rgba(255,255,255,.88)}
.chip.hi{background:linear-gradient(100deg,rgba(46,123,255,.18),rgba(46,123,255,.05));
 border-color:rgba(90,162,255,.34);color:#DCE9FF}
.chips.one{grid-template-columns:1fr}
/* split */
.split{margin-top:34px;display:grid;grid-template-columns:1fr 1fr;gap:20px}
.pan{padding:30px 28px;border-radius:18px;background:rgba(255,255,255,.035);
 border:1px solid rgba(255,255,255,.08)}
.pan.hi{background:linear-gradient(140deg,rgba(46,123,255,.18),rgba(46,123,255,.04));
 border-color:rgba(90,162,255,.34)}
.pan h3{font-size:31px;font-weight:800;letter-spacing:-.01em;margin-bottom:18px;color:#fff}
.pan .t{font-size:18px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;
 color:#5AA2FF;margin-bottom:12px}
.pan li{list-style:none;font-size:26px;line-height:1.42;color:rgba(255,255,255,.66);
 padding-left:20px;position:relative;margin-bottom:9px}
.pan li:before{content:'';position:absolute;left:0;top:14px;width:8px;height:2px;
 background:rgba(90,162,255,.7)}
/* camadas */
.lay{margin-top:32px;display:flex;flex-direction:column;gap:14px}
.lb{padding:26px 30px;border-radius:16px;border:1px solid rgba(255,255,255,.08);
 background:rgba(255,255,255,.035)}
.lb .h{font-size:20px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;
 color:#5AA2FF;margin-bottom:9px}
.lb .v{font-size:30px;font-weight:600;color:rgba(255,255,255,.88);line-height:1.34}
.lb.hi{background:linear-gradient(100deg,rgba(46,123,255,.20),rgba(46,123,255,.05));
 border-color:rgba(90,162,255,.38)}
/* numerada */
.nl{margin-top:32px;display:flex;flex-direction:column;gap:18px}
.ni{display:flex;align-items:baseline;gap:22px}
.ni .k{font-size:24px;font-weight:800;color:#5AA2FF;letter-spacing:.06em;min-width:52px}
.ni .v{font-size:38px;font-weight:700;letter-spacing:-.02em;color:#fff}
.ni .d{font-size:25px;color:rgba(255,255,255,.5);margin-top:5px;line-height:1.35}
/* progressão */
.pr{margin-top:34px;display:flex;flex-direction:column;gap:0}
.pi{display:flex;align-items:baseline;gap:20px;padding:18px 0;
 border-bottom:1px solid rgba(255,255,255,.07)}
.pi .u{font-size:34px;font-weight:800;color:#fff;min-width:150px;letter-spacing:-.01em}
.pi .w{font-size:27px;color:rgba(255,255,255,.55)}
.pi.hi .u{color:#5AA2FF}
.pi.hi .w{color:rgba(220,233,255,.8)}
/* cta */
.cta{margin-top:40px;padding:28px 32px;border-radius:16px;
 background:linear-gradient(115deg,rgba(46,123,255,.18),rgba(46,123,255,.05));
 border:1px solid rgba(90,162,255,.3);font-size:27px;font-weight:650;color:#DCE9FF;
 line-height:1.35;letter-spacing:-.005em}
.rule{height:1px;margin-bottom:26px;
 background:linear-gradient(90deg,rgba(90,162,255,.55),transparent)}
"""

def page(topic, n, inner):
    return f"""<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
<style>{CSS}</style></head><body><div class="c">
<div class="glow g1"></div><div class="glow g2"></div><div class="grid"></div><div class="vg"></div>
<div class="in"><div class="top">{topic}</div>{inner}
<div class="ft"><div class="lg"><span class="ld"></span>
<span class="lt">ATLAS <span>TECNOLOGIA</span></span></div>
<div class="pg">{n} / 04</div></div></div></div></body></html>"""

# ---------------- layouts ----------------
def hook(topic, n, title, kick=None, sub=None, small=False):
    m = '<div class="mid">'
    if kick: m += f'<div class="kick">{kick}</div>'
    m += f'<h1 class="{"s" if small else ""}">{title}</h1>'
    if sub: m += f'<div class="sub">{sub}</div>'
    return page(topic, n, m + '</div>')

def flow(topic, n, title, steps, note=None, kick=None):
    m = '<div class="mid t">'
    if kick: m += f'<div class="kick">{kick}</div>'
    m += f'<h2 class="s">{title}</h2><div class="flow">'
    for i, s in enumerate(steps):
        hi = ' hi' if i == len(steps) - 1 else ''
        m += f'<div class="fs{hi}"><span class="n">{i+1:02d}</span>{s}</div>'
        if i < len(steps) - 1: m += '<div class="fa"></div>'
    m += '</div>'
    if note: m += f'<div class="note">{note}</div>'
    return page(topic, n, m + '</div>')

def chips(topic, n, title, items, sub=None, one=False, kick=None):
    m = '<div class="mid t">'
    if kick: m += f'<div class="kick">{kick}</div>'
    m += f'<h2 class="s">{title}</h2>'
    if sub: m += f'<div class="bd">{sub}</div>'
    m += f'<div class="chips{" one" if one else ""}">'
    m += ''.join(f'<div class="chip">{i}</div>' for i in items)
    return page(topic, n, m + '</div></div>')

def split(topic, n, title, a, b, sub=None):
    m = f'<div class="mid t"><h2 class="s">{title}</h2>'
    if sub: m += f'<div class="bd">{sub}</div>'
    def pan(p, hi):
        s = f'<div class="pan{" hi" if hi else ""}"><div class="t">{p["t"]}</div>'
        s += f'<h3>{p["h"]}</h3><ul>'
        s += ''.join(f'<li>{x}</li>' for x in p["i"]) + '</ul></div>'
        return s
    m += '<div class="split">' + pan(a, False) + pan(b, True) + '</div>'
    return page(topic, n, m + '</div>')

def layers(topic, n, title, rows, kick=None, note=None):
    m = '<div class="mid t">'
    if kick: m += f'<div class="kick">{kick}</div>'
    m += f'<h2 class="s">{title}</h2><div class="lay">'
    for i, (h, v) in enumerate(rows):
        hi = ' hi' if i == len(rows) - 1 else ''
        m += f'<div class="lb{hi}"><div class="h">{h}</div><div class="v">{v}</div></div>'
    m += '</div>'
    if note: m += f'<div class="note">{note}</div>'
    return page(topic, n, m + '</div>')

def numlist(topic, n, title, items, kick=None):
    m = '<div class="mid t">'
    if kick: m += f'<div class="kick">{kick}</div>'
    m += f'<h2 class="s">{title}</h2><div class="nl">'
    for k, v, d in items:
        m += f'<div class="ni"><div class="k">{k}</div><div><div class="v">{v}</div>'
        m += (f'<div class="d">{d}</div>' if d else '') + '</div></div>'
    return page(topic, n, m + '</div></div>')

def progression(topic, n, title, rows, note=None, kick=None):
    m = '<div class="mid t">'
    if kick: m += f'<div class="kick">{kick}</div>'
    m += f'<h2 class="s">{title}</h2><div class="pr">'
    for i, (u, w) in enumerate(rows):
        hi = ' hi' if i == len(rows) - 1 else ''
        m += f'<div class="pi{hi}"><div class="u">{u}</div><div class="w">{w}</div></div>'
    m += '</div>'
    if note: m += f'<div class="note">{note}</div>'
    return page(topic, n, m + '</div>')

def close(topic, n, title, sub=None, cta=None, note=None):
    m = '<div class="mid"><div class="rule"></div>'
    m += f'<h2>{title}</h2>'
    if sub: m += f'<div class="bd">{sub}</div>'
    if cta: m += f'<div class="cta">{cta}</div>'
    if note: m += f'<div class="note">{note}</div>'
    return page(topic, n, m + '</div>')

SIGA = "SIGA A ATLAS PARA ENTENDER TECNOLOGIA DE UM JEITO SIMPLES."

DECKS = []
def deck(slug, topic, pages): DECKS.append((slug, topic, pages))

deck("01-uber", "Infraestrutura invisível", [
 (hook, dict(kick="engenharia de dados", title="O que acontece<br>por trás de<br>um <span class='ac'>Uber</span>?",
   sub="Um botão. E uma infraestrutura inteira que você nunca vê.")),
 (chips, dict(kick="um clique", title="Um toque na tela<br>gera muitos dados",
   items=["Localização","Horário","Destino","Distância","Trânsito","Preço","Motorista","Passageiro"])),
 (flow, dict(kick="o caminho", title="E esses dados<br>precisam ser processados",
   steps=["Aplicativo","Cloud","Plataforma de dados","Algoritmos","Resultado na sua tela"])),
 (close, dict(title="Você vê<br>uma corrida.<br><span class='ac'>A empresa vê<br>milhões de dados.</span>",
   sub="Dado → Informação → Decisão.", cta=SIGA)),
])

deck("02-ia-dados", "IA e dados", [
 (hook, dict(kick="inteligência artificial", title="IA sem dados<br>é só uma <span class='ac'>promessa</span>.",
   sub="O modelo é a parte visível. O que sustenta ele é outra coisa.")),
 (chips, dict(kick="o combustível", title="Dados são o<br>combustível da IA",
   items=["Textos","Imagens","Transações","Documentos","Logs","Sensores"])),
 (split, dict(title="Mas dado bagunçado<br>continua sendo problema",
   a=dict(t="entra assim", h="Disperso", i=["Formatos diferentes","Regras não escritas","Duplicado","Sem dono"]),
   b=dict(t="precisa sair assim", h="Organizado", i=["Padronizado","Regra definida","Deduplicado","Governado"]))),
 (flow, dict(title="IA + dados organizados<br>= mais valor",
   steps=["Dados","Plataforma","IA","Insight","Decisão"])),
])

deck("03-chatbot-agent", "Chatbot x AI Agent", [
 (hook, dict(kick="qual é a diferença", title="Chatbot<br>ou <span class='ac'>AI Agent</span>?",
   sub="Os dois conversam. Só um age.")),
 (flow, dict(kick="chatbot", title="Chatbot:<br>pergunta e resposta",
   steps=["Pergunta","Resposta"], note="Ele devolve informação. E para por aí.")),
 (flow, dict(kick="ai agent", title="AI Agent:<br>executa uma tarefa",
   steps=["Entender","Planejar","Consultar","Executar","Verificar"])),
 (close, dict(title="Responder<br>é uma coisa.<br><span class='ac'>Executar é outra.</span>",
   sub="Um agente precisa de acesso a sistemas reais — e de permissão, log e limite bem definidos.",
   cta=SIGA)),
])

deck("04-lake-warehouse", "Arquitetura de dados", [
 (hook, dict(kick="arquitetura", title="Data Lake,<br>Data Warehouse<br>ou <span class='ac'>Lakehouse</span>?",
   sub="Os três guardam dados. Nenhum serve para a mesma coisa.")),
 (chips, dict(kick="data lake", title="O reservatório<br>de dado cru",
   sub="Guarda tudo, do jeito que chegou. A estrutura só aparece na leitura.",
   items=["CSV","JSON","Logs","Imagens","Vídeos","Dados brutos"])),
 (chips, dict(kick="data warehouse", title="O ambiente<br>organizado",
   sub="Dado limpo e modelado antes de entrar. Consulta rápida e previsível.",
   items=["Tabelas estruturadas","SQL","BI","Relatórios","Indicadores","Métricas certificadas"])),
 (close, dict(title="Lakehouse:<br><span class='ac'>um modelo que une<br>os dois mundos.</span>",
   sub="Camada transacional sobre o lake — governança e versionamento sobre o dado cru. Resolve um problema específico; se você não tem esse problema, é complexidade a mais.",
   cta=SIGA)),
])

deck("05-fraude", "Detecção de fraude", [
 (hook, dict(kick="tempo real", title="Como uma empresa<br>detecta uma fraude<br>em <span class='ac'>segundos</span>?",
   sub="Uma transação chega. A decisão precisa sair antes dela terminar.")),
 (chips, dict(kick="os sinais", title="Nenhum sinal<br>decide sozinho",
   items=["Localização","Valor","Horário","Dispositivo","Histórico","Comportamento"])),
 (flow, dict(kick="em tempo real", title="Padrões + regras + IA",
   steps=["Transação chega","Sinais são cruzados","Comparação com o histórico","Score de risco","Aprova, bloqueia ou revisa"])),
 (close, dict(title="Uma transação<br>pode ser só<br>um número.<br><span class='ac'>Milhões revelam<br>padrões.</span>", cta=SIGA)),
])

deck("06-arquitetura-ia", "Arquitetura de IA", [
 (hook, dict(kick="por trás do modelo", title="Você usa IA.<br>Mas o que existe<br><span class='ac'>por trás dela</span>?",
   sub="O modelo é a ponta. A base é infraestrutura.")),
 (layers, dict(kick="a base", title="A pilha, de baixo<br>para cima", rows=[
   ("dados","Fontes, ingestão e histórico"),
   ("storage","Onde o dado vive, versionado"),
   ("compute","Processamento e treinamento"),
   ("modelos","O que todo mundo vê")])),
 (chips, dict(kick="o que sustenta", title="Os componentes<br>que ninguém mostra",
   items=["Cloud","Data Lake","GPU","Modelos","APIs","Vector Database"])),
 (close, dict(title="IA não é<br>só o modelo.<br><span class='ac'>É toda a arquitetura<br>ao redor dele.</span>", cta=SIGA)),
])

deck("07-netflix", "Sistemas de recomendação", [
 (hook, dict(kick="recomendação", title="Como a Netflix<br>sabe o que você<br><span class='ac'>pode gostar</span>?",
   sub="Não é adivinhação. É comportamento medido.")),
 (chips, dict(kick="o que é observado", title="Cada gesto<br>vira um sinal",
   items=["O que você assistiu","Quanto tempo assistiu","O que pesquisou","O que pulou","Horário","Dispositivo"])),
 (flow, dict(kick="o que o algoritmo faz", title="Encontrar padrões<br>entre milhões de pessoas",
   steps=["Sinais de uso","Agrupamento por semelhança","Comparação entre perfis","Previsão de interesse","Sugestão na tela"])),
 (close, dict(title="Você vê<br>um filme.<br><span class='ac'>Os algoritmos<br>veem padrões.</span>", cta=SIGA)),
])

deck("08-preparar-dados", "Dados para IA", [
 (hook, dict(kick="antes de começar", title="Quer usar IA<br>na sua empresa?<br><span class='ac'>Comece pelos dados.</span>")),
 (chips, dict(kick="o ponto de partida", title="O dado costuma<br>estar espalhado",
   items=["Excel","PDF","ERP","CRM","Banco SQL","APIs"])),
 (flow, dict(kick="o caminho", title="O que precisa<br>acontecer antes",
   steps=["Ingestão","Limpeza","Transformação","Governança","Modelo"])),
 (close, dict(title="Antes da IA,<br><span class='ac'>organize os dados.</span>",
   sub="Modelo treinado em dado inconsistente aprende a inconsistência.", cta=SIGA)),
])

deck("09-pergunta-ia", "Como a IA responde", [
 (hook, dict(kick="em poucos segundos", title="Você digita<br>uma <span class='ac'>pergunta</span>.",
   sub="E a resposta aparece quase na hora. Mas nada disso é instantâneo.")),
 (flow, dict(kick="processamento", title="A IA precisa<br>processar isso",
   steps=["Texto","Tokens","Modelo","Computação"])),
 (layers, dict(kick="gerando a resposta", title="O que o modelo<br>faz enquanto isso", rows=[
   ("contexto","Lê a pergunta inteira e o que veio antes"),
   ("probabilidade","Calcula qual continuação faz mais sentido"),
   ("geração","Monta a resposta, pedaço por pedaço")])),
 (close, dict(title="Parece<br>instantâneo.<br><span class='ac'>Mas existe muita<br>tecnologia por trás.</span>", cta=SIGA)),
])

deck("10-dados-nao-sao-numeros", "O que é dado", [
 (hook, dict(kick="conceito", title="Dados não são<br>apenas <span class='ac'>números</span>.")),
 (chips, dict(kick="tudo isso é dado", title="Se registra algo,<br>é dado",
   items=["Foto","Mensagem","Áudio","Vídeo","Localização","Compra","Sensor","Clique"])),
 (flow, dict(kick="o destino", title="Tudo isso entra<br>na mesma plataforma",
   steps=["Origem","Ingestão","Armazenamento","Organização","Consumo"])),
 (close, dict(title="Se pode ser<br>registrado,<br><span class='ac'>pode gerar dados.</span>", cta=SIGA)),
])

deck("11-arquitetura-moderna", "Arquitetura moderna", [
 (hook, dict(kick="organização", title="Como uma empresa<br>organiza milhões<br>de <span class='ac'>dados</span>?",
   sub="Em três camadas. Sempre.")),
 (chips, dict(kick="camada 1 · fontes", title="De onde<br>o dado vem",
   items=["ERP","CRM","APIs","Aplicativos","Sensores","Planilhas"])),
 (chips, dict(kick="camada 2 · plataforma", title="Onde ele<br>é tratado",
   items=["Data Lake","Lakehouse","Data Warehouse","Cloud"])),
 (close, dict(title="Camada 3:<br><span class='ac'>consumo.</span>",
   sub="BI · IA · Aplicações · Decisões.<br>A arquitetura só existe para essa última palavra.", cta=SIGA)),
])

deck("12-etl-elt", "Integração de dados", [
 (hook, dict(kick="integração", title="ETL, ELT,<br>streaming<br>ou <span class='ac'>batch</span>?",
   sub="Quatro nomes para duas decisões: onde transformar e com que frequência.")),
 (flow, dict(kick="etl", title="Transformar<br>antes de carregar",
   steps=["Extrair","Transformar","Carregar"],
   note="Chega no destino já tratado. Exige saber a regra antes.")),
 (flow, dict(kick="elt", title="Carregar<br>e transformar depois",
   steps=["Extrair","Carregar","Transformar"],
   note="Guarda o cru e trata sob demanda. Mais flexível, exige mais governança.")),
 (split, dict(title="Streaming ou batch?",
   a=dict(t="batch", h="Em lotes", i=["Roda em janelas","Mais barato","Bom para fechamento e relatório"]),
   b=dict(t="streaming", h="Contínuo", i=["Dado chega e é tratado","Mais caro","Bom para fraude e operação"]))),
])

deck("13-ia-banco", "IA e banco de dados", [
 (hook, dict(kick="pergunta frequente", title="Posso perguntar<br>para a IA sobre<br>os dados da<br><span class='ac'>minha empresa</span>?")),
 (flow, dict(kick="o fluxo básico", title="O caminho da pergunta",
   steps=["Usuário","IA","Banco de dados"])),
 (flow, dict(kick="na prática", title="O que acontece<br>de verdade",
   steps=["Pergunta em português","A IA monta a consulta","SQL é executado","Banco devolve o resultado","Resposta com a origem do número"])),
 (close, dict(title="Sim.<br><span class='ac'>Com segurança,<br>permissão<br>e governança.</span>",
   sub="Acesso somente leitura, escopo definido e cada número rastreável até a consulta que o gerou.",
   cta=SIGA)),
])

deck("14-cloud", "Cloud", [
 (hook, dict(kick="infraestrutura", title="Cloud não é<br>só guardar<br><span class='ac'>arquivos</span>.")),
 (chips, dict(kick="o que ela é", title="Seis camadas<br>que costumam vir juntas",
   items=["Storage","Compute","Database","Networking","AI","Analytics"])),
 (flow, dict(kick="na prática", title="Uma empresa inteira<br>apoiada nela",
   steps=["Sistemas internos","Dados","Processamento","Aplicações","Usuários"])),
 (close, dict(title="Cloud é<br>infraestrutura.<br><span class='ac'>E infraestrutura<br>precisa ser<br>arquitetada.</span>",
   sub="Migrar sem desenho é trocar o servidor de lugar — e levar o problema junto.", cta=SIGA)),
])

deck("15-custo-ia", "Custo de IA", [
 (hook, dict(kick="planejamento", title="Quanto custa<br>manter uma IA<br><span class='ac'>funcionando</span>?",
   sub="O modelo é a parte que aparece na proposta. O resto aparece na fatura.")),
 (chips, dict(kick="as linhas de custo", title="Onde o dinheiro<br>realmente vai",
   items=["GPU","Cloud","Storage","Banco de dados","Chamadas de API","Rede"])),
 (layers, dict(kick="o que muda com a escala", title="O custo cresce<br>junto com o uso", rows=[
   ("volume","Mais dados, mais armazenamento e mais processamento"),
   ("frequência","Mais chamadas por dia, mais custo por dia"),
   ("disponibilidade","Responder rápido e sempre custa mais que responder às vezes")])),
 (close, dict(title="IA tem custo<br>de modelo.<br><span class='ac'>Mas também tem<br>custo de<br>infraestrutura.</span>", cta=SIGA)),
])

deck("16-sql-python-databricks", "Ferramentas", [
 (hook, dict(kick="quem faz o quê", title="SQL, Python<br>e <span class='ac'>Databricks</span>.",
   sub="Três ferramentas, três funções diferentes. Não competem entre si.")),
 (chips, dict(kick="sql", title="A linguagem<br>do dado estruturado",
   items=["Consultar","Filtrar","Agregar","Modelar"])),
 (chips, dict(kick="python", title="A linguagem<br>do que o SQL não faz",
   items=["Automação","Análise","Processamento","Machine Learning"])),
 (close, dict(title="Databricks:<br><span class='ac'>a plataforma<br>onde os dois rodam.</span>",
   sub="Processamento · Engenharia · Lakehouse · IA", cta=SIGA)),
])

deck("17-futuro-bi", "O futuro do BI", [
 (hook, dict(kick="o próximo passo", title="E se você pudesse<br>conversar com<br>seu <span class='ac'>dashboard</span>?")),
 (chips, dict(kick="a pergunta", title="“Por que as vendas<br>caíram?”", one=True,
   sub="Hoje isso vira um chamado. Amanhã vira uma frase.",
   items=["Uma pergunta em português, sem filtro e sem clique"])),
 (chips, dict(kick="o que é analisado", title="O painel cruza<br>tudo sozinho",
   items=["Vendas","Região","Produto","Período","Clientes","Sazonalidade"])),
 (close, dict(title="O BI está<br>saindo do clique.<br><span class='ac'>E indo para<br>a conversa.</span>",
   sub="Com uma condição: cada número precisa continuar rastreável até a consulta que o gerou.",
   cta=SIGA)),
])

deck("18-dado-ate-decisao", "Do dado à decisão", [
 (hook, dict(kick="conceito", title="Um dado<br>não é uma<br><span class='ac'>decisão</span>.")),
 (chips, dict(kick="dado", title="R$ 850.000", one=True,
   sub="Sozinho, não diz nada. É bom? É ruim? Comparado com o quê?",
   items=["Um número sem contexto é só um número"])),
 (chips, dict(kick="informação", title="“Vendas caíram 12%<br>na região Sul.”", one=True,
   sub="Agora tem comparação, recorte e direção.",
   items=["O mesmo número, com contexto, vira informação"])),
 (close, dict(title="Decisão:<br><span class='ac'>“Agora sabemos<br>onde investigar.”</span>",
   sub="Dado → Informação → Insight → Decisão.<br>Pular etapa é o que faz dashboard bonito não gerar ação.",
   cta=SIGA)),
])

deck("19-queda-vendas", "Detecção de anomalia", [
 (hook, dict(kick="monitoramento", title="E se o sistema<br>avisasse <span class='ac'>antes</span><br>de você perceber?")),
 (layers, dict(kick="o sintoma", title="A queda raramente<br>começa grande", rows=[
   ("semana 1","Uma variação pequena, dentro do normal"),
   ("semana 3","O padrão já mudou, mas ninguém olhou"),
   ("semana 6","Agora aparece no relatório — e virou problema")])),
 (chips, dict(kick="o que é comparado", title="O sistema cruza<br>automaticamente",
   items=["Meta","Histórico","Sazonalidade","Região","Produto","Canal"])),
 (close, dict(title="Dados podem<br>identificar<br>o problema.<br><span class='ac'>Antes que ele<br>vire uma crise.</span>", cta=SIGA)),
])

deck("20-7-tecnologias", "Tendências", [
 (hook, dict(kick="panorama", title="7 tecnologias<br>transformando<br>o mundo dos<br><span class='ac'>dados</span>.")),
 (numlist, dict(kick="01 a 04", title="O que está<br>mudando agora", items=[
   ("01","IA","Deixou de ser projeto isolado e virou camada"),
   ("02","AI Agents","Não só respondem: executam tarefas"),
   ("03","Lakehouse","Governança sobre dado cru"),
   ("04","Real-time data","Decisão no momento do evento")])),
 (numlist, dict(kick="05 a 07", title="E o que vem<br>logo atrás", items=[
   ("05","Vector Database","Busca por significado, não por palavra"),
   ("06","Semantic Layer","A regra de negócio escrita uma vez só"),
   ("07","Data Cloud","Dado compartilhado sem ser copiado")])),
 (close, dict(title="A tecnologia<br>muda.<br><span class='ac'>O objetivo<br>continua o mesmo:</span>",
   sub="transformar dados em decisões.", cta=SIGA)),
])

deck("21-quantos-dados", "Escala de dados", [
 (hook, dict(kick="escala", title="Quantos dados<br>o mundo gera<br>enquanto você<br><span class='ac'>lê isso</span>?")),
 (chips, dict(kick="cada clique conta", title="Uma história digital,<br>o dia inteiro",
   items=["Mensagens","Fotos","Vídeos","Pesquisas","Compras","Localização","Transações","Streaming"])),
 (progression, dict(kick="como a escala cresceu", title="Do disquete<br>ao petabyte", rows=[
   ("1,44 MB","Disquete 3,5 polegadas"),
   ("≈ 700 MB","CD-ROM"),
   ("GB","Pen drive e disco pessoal"),
   ("TB","Servidor de empresa"),
   ("PB","Plataforma de dados corporativa"),
   ("EB","Escala global")],
   note="Capacidades de disquete e CD-ROM são especificações padrão do formato.")),
 (close, dict(title="Hoje a escala<br>é de <span class='ac'>petabytes</span>.",
   sub="Cada degrau dessa escada multiplica por mil o anterior — e é isso que separa uma planilha de uma plataforma de dados.",
   note="Para publicar um volume global por segundo, confira e cite a fonte e o ano no próprio slide.",
   cta=SIGA)),
])

deck("22-redes-sociais", "Modelos de negócio", [
 (hook, dict(kick="modelo de negócio", title="Se você não paga<br>pelo app…<br><span class='ac'>como ele ganha<br>dinheiro?</span>")),
 (flow, dict(kick="o ciclo", title="Uso vira sinal,<br>sinal vira padrão",
   steps=["Você usa","Interage","Gera sinais de comportamento","A plataforma aprende padrões"],
   note="Curtidas · visualizações · pesquisas · tempo assistindo · quem você segue")),
 (chips, dict(kick="publicidade digital", title="Do outro lado,<br>um anunciante",
   items=["Define o público","Escolhe o objetivo","Publica a campanha","Mede o resultado","Ajusta","Repete"])),
 (close, dict(title="Dados<br>+ atenção<br>+ publicidade.<br><span class='ac'>É assim que uso<br>vira receita.</span>",
   note="Modelos de negócio e práticas de dados variam entre plataformas.", cta=SIGA)),
])

deck("23-valor-dos-dados", "O valor do dado", [
 (hook, dict(kick="conceito", title="Um único dado<br>pode parecer<br><span class='ac'>inútil</span>.",
   sub="Um registro isolado não prova nada.")),
 (chips, dict(kick="em volume", title="Milhões de dados<br>revelam padrões", one=True,
   sub="O que era ruído vira comportamento observável.",
   items=["A repetição é o que transforma registro em evidência"])),
 (flow, dict(kick="a transformação", title="O caminho<br>até o significado",
   steps=["Dados","Padrões","Insights","Decisões"])),
 (close, dict(title="Dado tem valor<br>quando conseguimos<br><span class='ac'>extrair significado<br>dele.</span>", cta=SIGA)),
])

deck("24-bi-no-dia-a-dia", "BI no cotidiano", [
 (hook, dict(kick="onde você não repara", title="Você usa BI<br>sem <span class='ac'>perceber</span>.")),
 (chips, dict(kick="exemplos", title="Análise rodando<br>o tempo todo",
   items=["Trânsito","Aviação","Agricultura","Esportes","Energia","Logística"])),
 (chips, dict(kick="de onde vem o dado", title="Alguém está<br>medindo isso",
   items=["Sensores","GPS","Satélites","Sistemas","Aplicativos","Câmeras"])),
 (close, dict(title="Onde existem<br>dados…<br><span class='ac'>pode existir<br>análise.</span>", cta=SIGA)),
])

deck("25-dados-ia", "Da base ao modelo", [
 (hook, dict(kick="ordem das coisas", title="Antes da IA,<br>existe o <span class='ac'>dado</span>.")),
 (flow, dict(kick="a base", title="Onde tudo começa",
   steps=["Fontes","Dados brutos","Data Engineering"])),
 (flow, dict(kick="o topo", title="E onde tudo<br>chega",
   steps=["Dados organizados","Modelos","IA"])),
 (close, dict(title="Uma IA inteligente<br>também precisa de<br><span class='ac'>uma base bem<br>estruturada.</span>",
   sub="Nenhum modelo compensa uma fundação ruim.", cta=SIGA)),
])

# ---------------- render ----------------
if OUT.exists(): shutil.rmtree(OUT)
OUT.mkdir(parents=True); TMP.mkdir(parents=True, exist_ok=True)
jobs = []
for slug, topic, pages in DECKS:
    assert len(pages) == 4, f"{slug} tem {len(pages)} paginas"
    d = OUT / slug; d.mkdir()
    for i, (fn, kw) in enumerate(pages, 1):
        html = fn(topic, f"{i:02d}", **kw)
        hp = TMP / f"{slug}-{i}.html"; hp.write_text(html, encoding="utf-8")
        jobs.append((hp, d / f"pagina-{i:02d}.png"))

for hp, png in jobs:
    subprocess.run([CHROME,"--headless","--disable-gpu","--no-sandbox","--hide-scrollbars",
        "--force-device-scale-factor=1",f"--window-size={W},{H}",
        f"--screenshot={png}",f"file://{hp}"],capture_output=True,timeout=90)

ok = sum(1 for _, p in jobs if p.exists())
print(f"{len(DECKS)} carrosseis · {ok}/{len(jobs)} paginas renderizadas")
