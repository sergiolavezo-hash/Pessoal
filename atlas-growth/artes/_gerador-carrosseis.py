# -*- coding: utf-8 -*-
import os, subprocess, json, html, shutil

OUT = "/home/user/Pessoal/atlas-growth/artes"
TMP = "/tmp/claude-0/-home-user-Pessoal/8dc2aba8-ae2e-5211-9229-c379e03f98f3/scratchpad/html"
CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
W, H = 1080, 1350

CSS = """
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1350px;overflow:hidden}
body{
  font-family:'Inter Variable',sans-serif;
  background:#080B14; color:#fff;
  -webkit-font-smoothing:antialiased;
  font-feature-settings:'ss01','cv11';
}
.canvas{position:relative;width:1080px;height:1350px;overflow:hidden}
.glow{position:absolute;border-radius:50%;filter:blur(120px);opacity:.55}
.g1{width:820px;height:820px;right:-260px;bottom:-300px;
    background:radial-gradient(circle,#4F46E5 0%,#2563EB 45%,transparent 70%)}
.g2{width:640px;height:640px;left:-240px;top:-220px;
    background:radial-gradient(circle,#7C3AED 0%,#4C1D95 50%,transparent 72%);opacity:.38}
.grid{position:absolute;inset:0;
  background-image:linear-gradient(rgba(255,255,255,.028) 1px,transparent 1px),
                   linear-gradient(90deg,rgba(255,255,255,.028) 1px,transparent 1px);
  background-size:72px 72px}
.vign{position:absolute;inset:0;
  background:radial-gradient(ellipse at 50% 40%,transparent 35%,rgba(8,11,20,.85) 100%)}
.inner{position:absolute;inset:0;padding:88px 84px;display:flex;flex-direction:column}

/* header */
.hdr{display:flex;justify-content:space-between;align-items:center;
     font-size:21px;letter-spacing:.24em;font-weight:600;
     color:rgba(255,255,255,.34);text-transform:uppercase}
.hdr .mark{display:flex;align-items:center;gap:13px}
.dot{width:11px;height:11px;border-radius:50%;
     background:linear-gradient(135deg,#60A5FA,#A78BFA);
     box-shadow:0 0 18px rgba(96,165,250,.9)}

/* body */
.main{flex:1;display:flex;flex-direction:column;justify-content:center;padding:36px 0}
.main.top{justify-content:flex-start;padding-top:74px}

.eyebrow{display:inline-flex;align-items:center;gap:15px;
  font-size:24px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;
  color:#7DA8FF;margin-bottom:34px}
.num{display:inline-flex;align-items:center;justify-content:center;
  width:58px;height:58px;border-radius:15px;font-size:27px;font-weight:800;
  letter-spacing:0;color:#0B1020;
  background:linear-gradient(135deg,#93C5FD,#A78BFA);
  box-shadow:0 8px 30px rgba(96,165,250,.34)}

h1{font-size:82px;line-height:1.04;font-weight:800;letter-spacing:-.033em}
h2{font-size:57px;line-height:1.13;font-weight:750;letter-spacing:-.024em}
.sub{margin-top:30px;font-size:35px;line-height:1.42;font-weight:400;
     color:rgba(255,255,255,.62);letter-spacing:-.008em}
.body{margin-top:28px;font-size:32px;line-height:1.5;font-weight:400;
      color:rgba(255,255,255,.66);letter-spacing:-.006em}
.accent{color:#8AB4FF}
.white{color:#fff;font-weight:600}
em{font-style:normal;color:rgba(255,255,255,.46)}

/* action box */
.act{margin-top:44px;padding:30px 34px;border-radius:18px;
  background:linear-gradient(100deg,rgba(96,165,250,.13),rgba(167,139,250,.06));
  border-left:5px solid #60A5FA;
  font-size:31px;line-height:1.42;font-weight:550;color:#DDE8FF;letter-spacing:-.006em}

/* bad/good rows */
.row{margin-top:26px;padding-left:26px;border-left:3px solid rgba(255,255,255,.1);
     font-size:30px;line-height:1.42;color:rgba(255,255,255,.66)}
.row.bad{border-left-color:rgba(248,113,113,.55)}
.row.good{border-left-color:rgba(52,211,153,.6)}
.row b{font-weight:700;color:#fff}
.tag{font-size:23px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;
     display:block;margin-bottom:8px}
.bad .tag{color:#F87171}.good .tag{color:#34D399}
.conseq{margin-top:34px;font-size:29px;line-height:1.45;font-style:italic;
        color:rgba(255,255,255,.5)}

/* cta */
.cta{margin-top:46px;padding:36px 38px;border-radius:20px;
  background:linear-gradient(115deg,rgba(96,165,250,.19),rgba(167,139,250,.1));
  border:1px solid rgba(147,197,253,.3)}
.cta .lead{font-size:33px;font-weight:700;color:#fff;line-height:1.3}
.cta .det{margin-top:14px;font-size:29px;color:rgba(255,255,255,.66);line-height:1.4}

/* footer */
.ftr{display:flex;justify-content:space-between;align-items:flex-end}
.swipe{display:flex;align-items:center;gap:15px;font-size:25px;font-weight:650;
       color:#93C5FD;letter-spacing:.02em}
.arrow{width:54px;height:54px;border-radius:50%;
  border:1.5px solid rgba(147,197,253,.42);display:flex;align-items:center;
  justify-content:center;font-size:27px;color:#93C5FD}
.site{font-size:23px;color:rgba(255,255,255,.3);letter-spacing:.06em}
.rule{height:1px;background:linear-gradient(90deg,rgba(147,197,253,.5),transparent);
      margin:0 0 30px 0}
"""

def page(inner):
    return f"""<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
<style>{CSS}</style></head><body><div class="canvas">
<div class="glow g1"></div><div class="glow g2"></div>
<div class="grid"></div><div class="vign"></div>
<div class="inner">{inner}</div></div></body></html>"""

def hdr(kicker, counter):
    return f"""<div class="hdr"><div class="mark"><span class="dot"></span>ATLAS</div>
<div>{html.escape(kicker)} &nbsp;·&nbsp; {counter}</div></div>"""

def ftr(swipe=True, site="atlas-partner.com"):
    s = ('<div class="swipe">arrasta<div class="arrow">&rsaquo;</div></div>'
         if swipe else '<div></div>')
    return f'<div class="ftr">{s}<div class="site">{site}</div></div>'

def slide(kind, kicker, counter, **k):
    if kind == "cover":
        m = f'<div class="main">'
        if k.get("eyebrow"): m += f'<div class="eyebrow">{k["eyebrow"]}</div>'
        m += f'<h1>{k["title"]}</h1>'
        if k.get("sub"): m += f'<div class="sub">{k["sub"]}</div>'
        m += '</div>'
        return page(hdr(kicker, counter) + m + ftr(True))
    if kind == "point":
        m = '<div class="main">'
        m += f'<div class="eyebrow"><span class="num">{k["n"]}</span>{k.get("label","")}</div>'
        m += f'<h2>{k["title"]}</h2>'
        if k.get("body"): m += f'<div class="body">{k["body"]}</div>'
        if k.get("act"): m += f'<div class="act">{k["act"]}</div>'
        m += '</div>'
        return page(hdr(kicker, counter) + m + ftr(True))
    if kind == "qa":
        m = '<div class="main">'
        m += f'<div class="eyebrow"><span class="num">{k["n"]}</span>pergunta</div>'
        m += f'<h2>{k["title"]}</h2>'
        m += f'<div class="row bad"><span class="tag">resposta ruim</span>{k["bad"]}</div>'
        m += f'<div class="row good"><span class="tag">resposta boa</span>{k["good"]}</div>'
        m += f'<div class="conseq">{k["conseq"]}</div>'
        m += '</div>'
        return page(hdr(kicker, counter) + m + ftr(True))
    if kind == "term":
        m = '<div class="main">'
        m += f'<div class="eyebrow">{k.get("label","termo")}</div>'
        m += f'<h2>{k["title"]}</h2>'
        m += f'<div class="body">{k["body"]}</div>'
        m += f'<div class="act">{k["act"]}</div>'
        m += '</div>'
        return page(hdr(kicker, counter) + m + ftr(True))
    if kind == "close":
        m = '<div class="main"><div class="rule"></div>'
        m += f'<h2>{k["title"]}</h2>'
        if k.get("body"): m += f'<div class="body">{k["body"]}</div>'
        m += f'<div class="cta"><div class="lead">{k["cta"]}</div>'
        m += f'<div class="det">{k["det"]}</div></div></div>'
        return page(hdr(kicker, counter) + m + ftr(False))
    raise ValueError(kind)

# ============ CARROSSEL 1 — POWER BI ============
C1 = [
 ("cover", dict(eyebrow="performance", title='Seu Power BI demora<br>40 segundos pra abrir.',
   sub='O problema não é o computador.<br><span class="white">7 erros que matam a performance.</span>')),
 ("point", dict(n="1", label="erro", title="Você importou<br>a tabela inteira",
   body="Trouxe 40 colunas e usa 6. Cada coluna a mais é memória a mais, em cada atualização.",
   act="Selecione colunas no Power Query — não no relatório.")),
 ("point", dict(n="2", label="erro", title="Seu modelo<br>é uma tabela só",
   body="Tudo achatado num flat file gigante. O Power BI foi feito para modelo estrela: fatos no centro, dimensões em volta.",
   act="Separe fato e dimensão. A performance muda de patamar.")),
 ("point", dict(n="3", label="erro", title="Coluna calculada<br>onde cabia medida",
   body="Coluna calculada ocupa memória e é recalculada a cada atualização. Medida é calculada só quando alguém olha.",
   act="Na dúvida, medida.")),
 ("point", dict(n="4", label="erro", title="Relacionamento<br>bidirecional em tudo",
   body="Parece que resolve. Cria ambiguidade, filtro imprevisível e lentidão.",
   act="Unidirecional por padrão. Bidirecional só quando souber explicar por quê.")),
 ("point", dict(n="5", label="erro", title="Sua tabela de datas<br>é a data das vendas",
   body="Sem tabela calendário dedicada, toda análise temporal vira gambiarra.",
   act="Crie uma tabela calendário. É o primeiro passo, não o último.")),
 ("point", dict(n="6", label="erro", title="Transformação<br>dentro do relatório",
   body="Limpeza, junção e regra de negócio no Power Query de cada arquivo. Aí existem 12 versões da mesma regra, em 12 relatórios.",
   act="Transformação pertence à camada de dados, não ao relatório.")),
 ("point", dict(n="7", label="erro", title="Ninguém é dono<br>do arquivo",
   body="O .pbix está no computador de alguém. Se essa pessoa sair, o relatório morre com ela.",
   act="Versionamento, workspace e um dono nomeado.")),
 ("close", dict(title='Se 4 ou mais<br>são o seu caso,<br><span class="accent">o problema não é<br>o relatório.</span>',
   body="É o modelo de dados por trás dele.",
   cta="Diagnóstico do seu modelo — 30 minutos, sem custo.",
   det="Salva esse post pra usar na próxima revisão.<br>Link na bio.")),
]

# ============ CARROSSEL 2 — 8 PERGUNTAS ============
C2 = [
 ("cover", dict(eyebrow="antes de contratar", title='8 perguntas para fazer<br>antes de contratar uma<br>consultoria de dados.',
   sub='Metade dos fornecedores não passa da terceira.<br><em>(Inclusive a gente. Pode usar.)</em>')),
 ("qa", dict(n="1", title="“O que vocês entregam<br>na primeira semana?”",
   bad="<b>“Na primeira semana a gente faz o levantamento.”</b>",
   good="<b>Um artefato concreto</b> — mapa de fontes, diagnóstico escrito, priorização.",
   conseq="Se a primeira entrega tangível é no mês 3, você vai passar 3 meses no escuro.")),
 ("qa", dict(n="2", title="“Quem vai trabalhar<br>no meu projeto?”",
   bad="<b>“Nosso time de especialistas.”</b>",
   good="<b>Nomes, senioridade</b> e quanto tempo cada um dedica.",
   conseq="Muita consultoria vende com sênior e entrega com júnior.")),
 ("qa", dict(n="3", title="“E se eu quiser trocar<br>de fornecedor depois?”",
   bad="<b>Desconversa.</b>",
   good="<b>Código no seu repositório</b>, documentação entregue, nada roda em conta nossa.",
   conseq="Se a resposta cria dependência, a dependência é o produto.")),
 ("qa", dict(n="4", title="“Como vocês vão medir<br>se deu certo?”",
   bad="<b>“Entregando o dashboard.”</b>",
   good="<b>Métrica de negócio</b> definida antes de começar.",
   conseq="Entregar dashboard é escopo. Sucesso é outra coisa.")),
 ("qa", dict(n="5", title="“O que vocês<br>NÃO fazem?”",
   bad="<b>“A gente faz de tudo.”</b>",
   good="<b>Uma lista honesta.</b>",
   conseq="Fornecedor que faz tudo não é especialista em nada.")),
 ("qa", dict(n="6", title="“Me mostra um projeto<br>que deu errado.”",
   bad="<b>“Nunca tivemos.”</b>",
   good="<b>Um case real</b>, com o que foi mal dimensionado e o que mudou depois.",
   conseq="Quem nunca errou nunca entregou o suficiente.")),
 ("qa", dict(n="7", title="“Quem é o dono dos dados<br>durante o projeto?”",
   bad="<b>Resposta vaga sobre acesso.</b>",
   good="<b>Acesso somente leitura</b>, escopo definido, LGPD por escrito, dado nunca sai do seu ambiente.",
   conseq="Isso precisa estar em contrato, não em reunião.")),
 ("qa", dict(n="8", title="“O que você precisa de mim<br>pra isso dar certo?”",
   bad="<b>“Nada, a gente resolve tudo.”</b>",
   good="<b>Sponsor nomeado</b>, tempo do seu time, quem decide regra de negócio.",
   conseq="Projeto de dados não falha por tecnologia. Falha por adoção.")),
 ("close", dict(title='Guarda essas 8.<br><span class="accent">Servem pra qualquer<br>fornecedor.</span>',
   body="Inclusive pra nós — e a gente prefere assim.",
   cta="Quer fazer essas perguntas pra gente ao vivo?",
   det="Diagnóstico de 30 minutos, sem custo.<br>Link na bio.")),
]

# ============ CARROSSEL 3 — GLOSSÁRIO ============
C3 = [
 ("cover", dict(eyebrow="glossário atlas", title='Os termos que todo gestor<br>ouve na reunião<br>e finge que entende.',
   sub='Sem jargão. Sem vergonha.')),
 ("term", dict(label="termo 01", title="ETL / Pipeline",
   body="O caminho que o dado faz do sistema até o relatório: extrair, limpar, organizar, entregar.",
   act="<b>Na prática:</b> se ele quebra, seu dashboard abre — mas com número errado.")),
 ("term", dict(label="termo 02", title="Data Warehouse",
   body="O armazém organizado. Dado já limpo, estruturado e pronto para análise.",
   act="<b>Na prática:</b> é o que permite que todo mundo veja o mesmo número.")),
 ("term", dict(label="termo 03", title="Data Lake",
   body="O depósito. Guarda tudo, cru, do jeito que chegou.",
   act="<b>Na prática:</b> barato de guardar, caro de usar sem organização.")),
 ("term", dict(label="termo 04", title="Camada semântica",
   body="Onde a regra de negócio fica escrita uma vez só. “Faturamento é isso. Cliente ativo é aquilo.”",
   act="<b>Na prática:</b> é o que impede duas áreas de darem dois números.")),
 ("term", dict(label="termo 05", title="Dashboard<br>&ne; Relatório",
   body="Relatório conta o que aconteceu. Dashboard existe para uma decisão ser tomada.",
   act="<b>Na prática:</b> se ninguém decidiu nada olhando pra ele, é relatório bonito.")),
 ("term", dict(label="termo 06", title="Governança<br>de dados",
   body="Quem pode ver o quê, quem define a regra, quem responde pelo número.",
   act="<b>Na prática:</b> é o que te protege de LGPD e de decisão baseada em dado errado.")),
 ("term", dict(label="termo 07", title="Modelo preditivo",
   body="Usa o histórico para estimar o que vem. Não adivinha — calcula probabilidade.",
   act="<b>Na prática:</b> serve pra antecipar evasão, churn e demanda. Não pra ter certeza.")),
 ("close", dict(title='Você não precisa<br>virar técnico.',
   body='Precisa saber o suficiente para fazer a pergunta certa <span class="white">e avaliar a resposta.</span>',
   cta="Qual termo você quer no próximo glossário?",
   det="Comenta aí. E salva pra próxima reunião com a TI.")),
]

DECKS = [("01-powerbi", "7 erros no Power BI", C1),
         ("02-perguntas", "8 perguntas", C2),
         ("03-glossario", "Glossário Atlas", C3)]

os.makedirs(TMP, exist_ok=True)
if os.path.isdir(OUT): shutil.rmtree(OUT)
os.makedirs(OUT, exist_ok=True)

jobs = []
for slug, kicker, deck in DECKS:
    d = os.path.join(OUT, slug); os.makedirs(d, exist_ok=True)
    total = len(deck)
    for i, (kind, kw) in enumerate(deck, 1):
        h = slide(kind, kicker, f"{i:02d}/{total:02d}", **kw)
        hp = os.path.join(TMP, f"{slug}-{i:02d}.html")
        open(hp, "w", encoding="utf-8").write(h)
        jobs.append((hp, os.path.join(d, f"slide-{i:02d}.png")))

for hp, png in jobs:
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--no-sandbox",
        "--hide-scrollbars", "--force-device-scale-factor=1",
        f"--window-size={W},{H}", f"--screenshot={png}", f"file://{hp}"],
        capture_output=True, timeout=90)

ok = sum(1 for _, p in jobs if os.path.exists(p))
print(f"{ok}/{len(jobs)} slides renderizados")
