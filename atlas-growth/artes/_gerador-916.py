# -*- coding: utf-8 -*-
import os, subprocess, shutil
OUT="/home/user/Pessoal/atlas-growth/artes"
TMP="/tmp/claude-0/-home-user-Pessoal/8dc2aba8-ae2e-5211-9229-c379e03f98f3/scratchpad/html916"
CHROME="/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
W,H=1080,1920

CSS="""
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden}
body{font-family:'Inter Variable',sans-serif;background:#080B14;color:#fff;
 -webkit-font-smoothing:antialiased;font-feature-settings:'ss01','cv11'}
.c{position:relative;width:1080px;height:1920px;overflow:hidden}
.glow{position:absolute;border-radius:50%;filter:blur(140px)}
.g1{width:900px;height:900px;right:-280px;bottom:-240px;opacity:.55;
 background:radial-gradient(circle,#4F46E5 0%,#2563EB 45%,transparent 70%)}
.g2{width:700px;height:700px;left:-260px;top:-200px;opacity:.36;
 background:radial-gradient(circle,#7C3AED 0%,#4C1D95 50%,transparent 72%)}
.grid{position:absolute;inset:0;
 background-image:linear-gradient(rgba(255,255,255,.028) 1px,transparent 1px),
 linear-gradient(90deg,rgba(255,255,255,.028) 1px,transparent 1px);background-size:80px 80px}
.vign{position:absolute;inset:0;
 background:radial-gradient(ellipse at 50% 42%,transparent 32%,rgba(8,11,20,.88) 100%)}
.in{position:absolute;inset:0;padding:120px 86px 150px;display:flex;flex-direction:column}
.hdr{display:flex;align-items:center;gap:14px;font-size:24px;letter-spacing:.26em;
 font-weight:600;color:rgba(255,255,255,.36);text-transform:uppercase}
.dot{width:12px;height:12px;border-radius:50%;background:linear-gradient(135deg,#60A5FA,#A78BFA);
 box-shadow:0 0 20px rgba(96,165,250,.9)}
.mid{flex:1;display:flex;flex-direction:column;justify-content:center}
.eyebrow{font-size:27px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;
 color:#7DA8FF;margin-bottom:38px}
h1{font-size:96px;line-height:1.03;font-weight:800;letter-spacing:-.035em}
h1.sm{font-size:80px}
.sub{margin-top:36px;font-size:40px;line-height:1.38;color:rgba(255,255,255,.62);
 font-weight:400;letter-spacing:-.01em}
.accent{color:#8AB4FF}
.badge{display:inline-block;margin-top:52px;padding:22px 38px;border-radius:999px;
 background:linear-gradient(115deg,rgba(96,165,250,.2),rgba(167,139,250,.11));
 border:1px solid rgba(147,197,253,.34);font-size:31px;font-weight:650;color:#DDE8FF}
.ft{display:flex;justify-content:space-between;align-items:flex-end;
 font-size:25px;color:rgba(255,255,255,.32);letter-spacing:.05em}
.poll{margin-top:44px;display:flex;flex-direction:column;gap:22px}
.opt{padding:30px 36px;border-radius:20px;border:1px solid rgba(147,197,253,.26);
 background:rgba(255,255,255,.04);font-size:36px;font-weight:600;color:#E8EFFF}
"""
def page(inner):
    return f"""<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><style>{CSS}</style>
</head><body><div class="c"><div class="glow g1"></div><div class="glow g2"></div>
<div class="grid"></div><div class="vign"></div><div class="in">{inner}</div></div></body></html>"""

def cover(eyebrow,title,sub=None,badge=None,small=False,foot="atlas-partner.com"):
    m='<div class="hdr"><span class="dot"></span>ATLAS</div><div class="mid">'
    m+=f'<div class="eyebrow">{eyebrow}</div>'
    m+=f'<h1 class="{"sm" if small else ""}">{title}</h1>'
    if sub: m+=f'<div class="sub">{sub}</div>'
    if badge: m+=f'<div><span class="badge">{badge}</span></div>'
    m+='</div>'
    m+=f'<div class="ft"><div>REELS</div><div>{foot}</div></div>'
    return page(m)

def storycard(eyebrow,title,sub=None,badge=None,opts=None):
    m='<div class="hdr"><span class="dot"></span>ATLAS</div><div class="mid">'
    m+=f'<div class="eyebrow">{eyebrow}</div><h1 class="sm">{title}</h1>'
    if sub: m+=f'<div class="sub">{sub}</div>'
    if opts:
        m+='<div class="poll">'+''.join(f'<div class="opt">{o}</div>' for o in opts)+'</div>'
    if badge: m+=f'<div><span class="badge">{badge}</span></div>'
    m+='</div><div class="ft"><div>STORIES</div><div>atlas-partner.com</div></div>'
    return page(m)

ASSETS=[
 ("capas-reels/reel-01-capa.png", cover("reel 01",
   'Quanto custa<br>fechar o mês<br><span class="accent">na mão?</span>',
   '864 horas por ano.<br>Cinco meses de um funcionário.')),
 ("capas-reels/reel-02-capa.png", cover("reel 02",
   'Dois números<br>pra mesma<br><span class="accent">pergunta.</span>',
   'O problema nunca foi a planilha.')),
 ("capas-reels/reel-03-capa.png", cover("reel 03",
   'Eu não escrevi<br>uma linha<br>de <span class="accent">SQL.</span>',
   'Pergunta em português. Dashboard em 8 segundos.',
   badge='14 dias grátis · sem cartão')),
 ("capas-reels/reel-04-capa.png", cover("reel 04",
   'Seu pipeline<br>quebrou<br><span class="accent">às 3h.</span>',
   'Você vai descobrir ao meio-dia.')),
 ("capas-reels/reel-05-capa.png", cover("reel 05",
   'O teste<br>de <span class="accent">1 minuto.</span>',
   '3 perguntas. Se você não responde,<br>sua empresa decide no escuro.')),
 ("capas-reels/reel-06-capa.png", cover("reel 06",
   '2 horas<br>por semana<br>em <span class="accent">40 segundos.</span>',
   '104 horas por ano de volta pro time.')),
 ("capas-reels/reel-07-capa.png", cover("reel 07",
   'Power BI lento<br>quase nunca<br>é a <span class="accent">máquina.</span>',
   'É o modelo de dados.', small=True)),
 ("stories/story-enquete.png", storycard("pergunta séria",
   'Sua empresa<br>fecha o mês<br>na mão?', None, None,
   opts=["Sim, todo mês","Não, é automático"])),
 ("stories/story-oferta-diagnostico.png", storycard("sem custo",
   'Diagnóstico<br>de 30 minutos.',
   'A gente olha o seu processo e te diz<br>o que dá pra automatizar.<br>Sem proposta no final se não fizer sentido.',
   badge='arrasta pra cima ↑')),
 ("stories/story-oferta-trial.png", storycard("atlas insight ai",
   'Converse com<br>seus dados<br>em português.',
   'Sem SQL. Auditável.<br>Conecta em BigQuery, PostgreSQL,<br>SQL Server, CSV e XLSX.',
   badge='14 dias grátis · sem cartão')),
 ("stories/story-caixinha.png", storycard("me conta",
   'Qual processo<br>você automatizaria<br>primeiro?',
   'Responde na caixinha que eu comento cada um.')),
 ("stories/story-bastidor.png", storycard("bastidor",
   '6h da manhã.<br>Ninguém acordado.',
   'Quando você abrir o dashboard às 9h,<br>tudo isso já aconteceu.')),
]

os.makedirs(TMP,exist_ok=True)
jobs=[]
for rel,htmlstr in ASSETS:
    p=os.path.join(OUT,rel); os.makedirs(os.path.dirname(p),exist_ok=True)
    hp=os.path.join(TMP,rel.replace("/","_")+".html")
    open(hp,"w",encoding="utf-8").write(htmlstr)
    jobs.append((hp,p))
for hp,png in jobs:
    subprocess.run([CHROME,"--headless","--disable-gpu","--no-sandbox","--hide-scrollbars",
      "--force-device-scale-factor=1",f"--window-size={W},{H}",f"--screenshot={png}",
      f"file://{hp}"],capture_output=True,timeout=90)
print(f"{sum(1 for _,p in jobs if os.path.exists(p))}/{len(jobs)} artes 9:16")
