# Arquitetura comercial — Atlas Tecnologia

Documento de estratégia. Cobre os 29 itens do briefing.
Referência de estrutura: leega.com.br (mapeada em 24/09/2026). Nada de texto,
código, imagem ou identidade da Leega foi copiado.

---

## 0. Antes de tudo: cinco pontos em que eu discordo do briefing

O briefing é bom, mas foi escrito sem olhar o que a Leega faz de fato. Mapeei o
site delas antes de responder. Em cinco pontos, seguir o briefing ao pé da letra
pioraria o site da Atlas. Digo quais são, e o que proponho no lugar.

### 0.1. A Leega **não** usa cards de problema do cliente

O item 7 pede cards do tipo *"Meus dados estão espalhados"*. A home da Leega não
tem nada parecido — ela vai direto para logos de clientes e depoimentos.

E mais importante: **você já mandou tirar isso do site da Atlas.** Suas palavras:
*"não é legal explanar sobre os problemas dos clientes e apenas como podemos
ajudá-lo"*. Removi a seção por isso.

Um diretor de TI lendo *"Meus dados estão espalhados"* na home de um fornecedor
não pensa "eles me entendem". Pensa "estão me chamando de bagunçado".

**No lugar:** roteamento por **objetivo**, não por falha. Mesma função de
navegação, sem o dedo na ferida. Detalhe na seção 5.

### 0.2. Muro de números é armadilha para a Atlas

Os números da Leega: 600+ colaboradores, 1000+ projetos, 150+ clientes, 15+ anos.
Os números reais da Atlas: 13+ projetos, 10+ setores, 200+ dashboards, 3 nuvens.

Copiar o padrão "parede de métricas grandes" convida exatamente a comparação que
a Atlas perde. A assimetria é de duas ordens de grandeza.

**No lugar:** autoridade por **evidência específica**, não por volume. "Mais de
200 dashboards migrados em um projeto de governança de BI" é verificável,
concreto e não compete em tamanho. O marcador ✦ que já existe no site — separando
ferramenta com projeto entregue de ferramenta que a Atlas domina — é o ativo de
credibilidade mais forte que a Atlas tem hoje. Ele deve crescer, não o contador.

### 0.3. As páginas de serviço da Leega são bem mais simples do que o briefing supõe

O briefing (item 18) pede 13 blocos por página: hero, problema, solução, como
funciona, capabilities, arquitetura, tecnologias, aplicações, cases, benefícios,
FAQ, CTA, CTA final.

A página real de Data Analytics da Leega tem: hero → 3 blocos de capability com
entregáveis em lista → bloco de valor → CTA final. **Três CTAs na página inteira.**
Sem FAQ, sem diagrama, sem case embutido.

**No lugar:** 7 blocos, não 13. Página que o visitante termina. Detalhe na seção 18.

### 0.4. CTA flutuante vai brigar com o Átis

O item 17 pede CTA persistente. O canto inferior direito já é do chat Átis, que
captura lead. Empilhar dois elementos fixos no mesmo canto é ruído, e no mobile
cobre conteúdo.

**No lugar:** o CTA persistente vira uma **barra fina no topo que aparece depois
do hero**, e o Átis continua sozinho no canto. Detalhe na seção 16.

### 0.5. Três itens do briefing estão bloqueados por falta de material real

Não vou inventar. Estes ficam pendentes de você:

| Item | O que falta | Sem isso |
|---|---|---|
| Depoimentos | Nenhum cliente citável | Seção não existe |
| Logos de clientes | Todos confidenciais | Fica "Cliente confidencial" |
| Certificações / parcerias | Não sei se a Atlas tem selo de parceiro Microsoft, Databricks, GCP | Seção não existe |

Se a Atlas tiver qualquer selo de parceria oficial, isso vale mais que qualquer
seção nova deste documento. É o único tipo de prova que um comprador corporativo
aceita sem checar.

---

## 1. O que a Leega faz (mapeamento real)

### Home, na ordem

1. Hero — "Human Powered. AI Amplified." + subheadline + 2 CTAs
2. **Logos de clientes** (15 marcas de peso: Bradesco, Santander, B3, Cielo, Casas Bahia…)
3. **Depoimentos** — 2, com foto e logo
4. "Desenvolvimento end-to-end de soluções tecnológicas" — 3 pilares
5. "Mais de 15 anos de experiência" — 2 números
6. Parcerias premium — Google Cloud, AWS, Microsoft, Databricks, Snowflake, Veezoo
7. Carreira
8. 5 métricas
9. Programa trainee
10. **Produtos** — 4 soluções nomeadas, cada uma com "Saiba mais"
11. CTA final — "Vamos construir algo juntos?" → "Fale com nossa equipe"

### O que eles acertam, e que a Atlas pode usar

**A) Expertise** — agrupada em 4 famílias no menu (Data & Analytics, Digital
Analytics, Desenvolvimento, AI Product), nunca como lista plana de serviços.

**B) Técnico vira comercial** — cada capability aparece com entregáveis em lista
curta. Não é "fazemos BI"; é "integração de múltiplas fontes, dashboards
interativos, indicadores em tempo real, data warehouse otimizado". O entregável é
o que transforma competência em oferta.

**C) Produtos nomeados** — Code Bridge, AI Factory, Forge, Data Governance. Cada
um tem nome próprio e página. Isso é o que separa consultoria de fábrica de
horas: **serviço repetível com nome vira produto.**

**D) Resultados** — fracos. Genéricos. A Atlas pode superar aqui.

**E) Números** — como muro de autoridade. Funciona para eles pelo tamanho.

**F) Clientes** — logos de bancos logo abaixo do hero. É a jogada mais forte da
página. A Atlas não pode reproduzir.

**G) Condução ao time** — um CTA dominante repetido ("Fale Conosco"), não dez
variações.

**H) Distribuição de CTA** — ~12 na home inteira. Menos do que se imagina.

**I) Página técnica vira comercial** — pelo entregável e pelo CTA no fim, não por
volume de seção.

**J) Fricção** — baixa: um formulário só, sem etapas.

---

## 2. Arquitetura do site Atlas

### 2.1. Home — 14 blocos

```
01  HERO                    headline + sub + 2 CTAs + microprova
02  ROTA POR OBJETIVO       "O que você quer resolver?" — 6 rotas
03  EXPERTISE               4 áreas, capabilities + CTA por área
04  OFERTAS                 as 10 frentes atuais, em formato problema→resultado
05  ARQUITETURA             o desenho Origem → Engenharia → Data Viz
06  TECNOLOGIA              a órbita por grupo, com o marcador ✦
07  PRODUTO                 Atlas Insight AI
08  CASES                   3 em destaque + grade dos demais
09  NÚMEROS REAIS           4 indicadores, discretos
10  POR QUE ATLAS           8 diferenciais concretos
11  COMO FUNCIONA A CONVERSA  5 etapas, do contato ao resultado
12  SOBRE                   quem é a Atlas
13  CTA FINAL               fechamento forte
14  CONTATO                 formulário
```

Mudanças em relação ao site atual: entram 02 (rota), 05 (arquitetura, já
prototipada em `modelo-arquitetura.html`), 07 (produto com peso próprio) e 11
(jornada da conversa). Sai nada — as seções atuais são remanejadas.

### 2.2. Páginas internas

```
/                         home
/insight-ai               produto (já existe como insight.html)
/data-engineering         serviço
/bi-analytics             serviço
/inteligencia-artificial  serviço
/cloud                    serviço
/data-governance          serviço
/alocacao                 serviço  ← diferencial da Atlas, e ninguém na
                                     referência tem isso com página própria
/cases                    índice de cases
/contato                  formulário dedicado
```

**Status:** as três primeiras já estão no ar.
**Recomendação de ordem:** comece por **três** páginas de serviço — BI &
Analytics, Data Engineering e Alocação. As duas primeiras são as que têm case
real; a terceira é o que diferencia a Atlas da referência. As demais entram
depois, com o mesmo molde.

> Nota técnica: o site hoje é um `index.html` único. Nove páginas novas exigem
> decidir entre duplicar o cabeçalho/rodapé em cada arquivo (simples, mas toda
> alteração de menu vira nove edições) ou introduzir um gerador estático. Para
> três páginas, duplicar é aceitável. A partir de cinco, não é.

---

## 3. Menu — mantido como está

Conforme sua instrução. O menu atual já funciona e não deve virar o da Leega.

```
Soluções · Tecnologia · Cases · Sobre · Insights · IA · Contato
[ig] [in]   [ Vamos conversar → ]
```

Uma única mudança recomendada, quando as páginas de serviço existirem:
**"Soluções" passa a abrir um submenu simples** com as 4 áreas — não um mega-menu
(você já rejeitou um, e com razão). Quatro links em coluna, nada mais.

---

## 4. Hero

```
EYEBROW      Data · AI · Cloud · Analytics

HEADLINE     Transformamos dados complexos
             em decisões extraordinárias.

SUB          Estratégia, engenharia de dados, Business Intelligence e
             Inteligência Artificial — a Atlas conecta tecnologia e negócio
             para transformar complexidade em vantagem competitiva.

CTA 1        Falar com um especialista →
CTA 2        Conhecer nossas soluções

MICROPROVA   13+ projetos entregues · 10+ setores · 3 nuvens
```

A headline atual já é boa e está posicionada. **Mantenha.** A mudança é no CTA
primário: `Vamos conversar →` vira `Falar com um especialista →`.

Motivo: "vamos conversar" é convite social; "falar com um especialista" promete
*quem* está do outro lado. Em venda consultiva B2B, a segunda converte melhor
porque responde a objeção implícita — "vou perder tempo com um vendedor?".

A microprova usa só os quatro números reais. Nada além disso.

---

## 5. Rota por objetivo (substitui "Qual é o seu desafio?")

**Título:** "Por onde você quer começar?"
**Sub:** "Cada caminho leva ao mesmo lugar: uma conversa com quem vai executar."

Seis rotas. Cada card: objetivo em primeira pessoa (**o que a pessoa quer**, não
o que lhe falta) → o que a Atlas faz → CTA.

| Objetivo | O que a Atlas faz | CTA |
|---|---|---|
| **Quero uma base única de dados** | Conectamos as fontes e construímos a arquitetura que sustenta Analytics e IA. | Ver Data Engineering → |
| **Quero decidir com número confiável** | Uma métrica, uma definição, e o indicador na mão de quem decide. | Ver BI & Analytics → |
| **Quero aplicar IA no meu negócio** | IA sobre a sua própria base — previsão, anomalia e resposta em linguagem natural. | Ver Inteligência Artificial → |
| **Quero modernizar minha infraestrutura** | Migração e arquitetura em Azure, AWS ou Google Cloud, sem parar a operação. | Ver Cloud → |
| **Quero automatizar processos** | O repetitivo vira pipeline; o manual vira fluxo com rastreabilidade. | Ver Automação → |
| **Quero reforçar meu time** | Especialistas de dados alocados no seu time, sob a sua gestão. | Ver Alocação → |

Compare a diferença de tom:

> ❌ "Meus dados estão espalhados" — diagnostica o visitante.
> ✅ "Quero uma base única de dados" — devolve a ele o protagonismo.

Mesma função de roteamento. Sem custo de relacionamento.

---

## 6. Expertise — 4 áreas

**Título:** "Expertise que transforma tecnologia em resultado."

Cada área: nome, frase de posicionamento, capabilities, tecnologias, CTA próprio.

### DATA & ANALYTICS
*Da engenharia do dado à inteligência para decidir.*
Data Strategy · Data Engineering · Data Warehouse · Data Lake e Lakehouse ·
BI · Data Visualization · Advanced Analytics · Data Governance
→ **Explorar Data & Analytics**

### INTELIGÊNCIA ARTIFICIAL
*IA aplicada sobre a sua base — não sobre uma promessa.*
AI Strategy · IA generativa e RAG · Agentes e copilotos · Modelos preditivos ·
Document AI · Automação inteligente
→ **Explorar Inteligência Artificial**

### CLOUD & ARQUITETURA
*A arquitetura que sustenta o dado, na nuvem que a empresa já usa.*
Cloud Strategy · Migração · Modernização · Data Platforms · FinOps ·
Arquitetura de dados
→ **Explorar Cloud & Arquitetura**

### TECNOLOGIA & PESSOAS
*Quando falta solução, construímos. Quando falta time, alocamos.*
Desenvolvimento de soluções · APIs e integrações · Automação ·
Modernização de sistemas · Alocação de especialistas · Squads de dados
→ **Explorar Tecnologia & Pessoas**

> As 10 frentes que já estão no site se encaixam nessas 4 áreas sem sobra. A
> quarta área é onde a alocação ganha lugar de oferta, e não de rodapé.

---

## 7. O molde de oferta

Toda expertise vira oferta com a mesma estrutura de cinco partes. O molde,
aplicado a BI & Analytics:

```
BI & DATA VISUALIZATION

CONTEXTO
"O indicador existe, mas cada área chega a um número diferente — e a reunião
vira discussão sobre o dado, não sobre a decisão."

O QUE FAZEMOS
"Construímos a camada analítica que dá uma definição só para cada métrica, e
entregamos o indicador pronto a quem decide."

ENTREGÁVEIS
· Modelagem dimensional          · Camada semântica
· ETL / ELT                      · Dashboards executivos e self-service
· Data Warehouse                 · Governança de indicadores
· DAX e performance              · Automação de atualização

RESULTADO
"A área deixa de pedir relatório e passa a responder a própria pergunta."

TECNOLOGIAS   Power BI ✦ · Tableau ✦ · Looker ✦ · Qlik · MicroStrategy ✦

CTA           Falar sobre BI & Analytics →
CTA 2         Conhecer a solução
```

**Nota sobre o "CONTEXTO":** note que ele descreve uma *situação*, não um defeito
do visitante. "Cada área chega a um número diferente" é um fato do mercado. "Seus
dados estão uma bagunça" é uma acusação. A diferença é toda.

Esse molde se aplica às 10 frentes. As oito atuais já têm entregáveis escritos no
site — falta o CONTEXTO e o RESULTADO em cada uma.

---

## 8. Tecnologia

A seção atual já resolve isto e está acima do que a referência faz. Mantida:

- 45 ferramentas em 8 grupos filtráveis, com ícone
- Painel lateral com "O que é" e "Para o negócio"
- **✦ marca as que têm projeto entregue pela Atlas**
- Frase de enquadramento: *"Tecnologia não é o fim. É o meio."*

Uma adição: abaixo da órbita, o **desenho de arquitetura** (`modelo-arquitetura.html`)
mostrando onde cada ferramenta entra — Origem → Engenharia → Data Viz, com
Governança e IA como faixas atravessando. Órbita responde *o que dominamos*; o
desenho responde *onde isso entra na minha casa*. São perguntas diferentes.

---

## 9. Produto

**Título:** "Produto Atlas"
**Sub:** "Serviço é projeto sob medida. Produto é solução pronta para repetir."

Hoje a Atlas tem **um** produto real: **Atlas Insight AI**. Não invente uma linha
de produtos para preencher grade — três caixas com dois produtos falsos destroem
a credibilidade do verdadeiro.

```
ATLAS INSIGHT AI

O QUE É        Camada de IA que responde perguntas sobre a base da empresa
               em linguagem natural, com o número e a origem dele.

PARA QUEM      Quem precisa do indicador e não quer depender da fila do BI.

COMO FUNCIONA  Conecta → aprende as regras do negócio → responde com a fonte.

BENEFÍCIOS     · Resposta em segundos, não em dias
               · A regra de negócio escrita uma vez, aplicada em toda análise
               · Transparência: cada resposta abre o modelo e a query

CTA            Conhecer o Atlas Insight AI →
CTA 2          Solicitar demonstração
```

> A demonstração na home **precisa continuar marcada como demonstração**. A regra
> que você mesmo definiu — *"não fingir que existe conexão real com dados da
> empresa"* — vale mais ainda numa seção rotulada "Produto".

**Candidato a segundo produto:** se a Atlas já entregou o mesmo pacote de
governança de BI mais de uma vez (o projeto de 200+ dashboards sugere que sim),
isso é um produto esperando nome. Serviço repetível com nome próprio é o que
separa consultoria de fábrica de horas. Vale a conversa.

---

## 10. Cases

**Título:** "Resultados que começam com dados."

Estrutura por case — a mesma que já existe no site, completada com o eixo antes/depois:

```
SEGMENTO      Varejo · plataforma omnichannel
DESAFIO       [o cenário, sem expor o cliente]
SOLUÇÃO       Pipelines em Azure com Databricks, Synapse e Data Factory;
              indicadores de venda e operação por canal em Power BI
TECNOLOGIAS   Azure · Databricks · Synapse · Data Factory · Power BI
RESULTADO     [o que mudou — ver nota abaixo]
CTA           Ver case completo →
```

Três em destaque (os com mais substância): varejo omnichannel, saúde/diagnóstico
em GCP, governança de BI com 200+ dashboards migrados. Os demais em grade menor.

> **Nota sobre RESULTADO — o gargalo real deste documento.** Hoje os cases dizem o
> que foi construído, não o que mudou. "Pipelines em Azure" é entregável;
> "fechamento que levava 5 dias passou a levar 1" é resultado. **Todo case forte
> precisa de um número de antes e depois**, e esse número eu não tenho.
>
> Peça a cada cliente uma frase autorizada. Se não puder citar o nome, o número
> ainda vale: *"Rede de diagnóstico — tempo de apuração caiu de X para Y."*
> Isto é o investimento de maior retorno de toda a lista. Uma seção de cases com
> resultado medido vale mais que as outras treze seções somadas.

---

## 11. Prova social — só o que é real

| Elemento | Situação | Ação |
|---|---|---|
| Projetos entregues | 500+ | Usar |
| Setores atendidos | 10+ | Usar |
| Anos de alocação | 6+ | Usar |
| Ferramentas com projeto real | 13 marcadas com ✦ | **Destacar mais** |
| Logos de clientes | Confidenciais | "Cliente confidencial" |
| Depoimentos | Nenhum | Bloqueado — pedir |
| Certificações / parcerias | **Ainda não existem** (confirmado) | Reavaliar quando houver |

> Atualizado em 24/09/2026: os números vieram da Atlas. "200+ dashboards" e
> "3 nuvens" saíram da faixa de destaque — o dashboard segue no case de
> governança, onde é evidência, e não indicador solto.

Formato recomendado para os números: **linha discreta**, não muro. Quatro
números pequenos em uma faixa, sem animação de contador. Números modestos ficam
maiores quando apresentados com contenção; ficam menores quando apresentados com
fanfarra.

---

## 12. Por que Atlas — 8 diferenciais

Cada um com uma frase que prova, não que adjetiva.

```
01 SENIORIDADE TÉCNICA
   Quem conversa na reunião comercial é quem executa o projeto.

02 VISÃO DE NEGÓCIO
   A pergunta não é qual ferramenta usar, é qual decisão precisa melhorar.

03 DATA + IA + CLOUD NA MESMA CASA
   A arquitetura, o modelo e a nuvem desenhados juntos, não remendados depois.

04 AGNÓSTICOS DE TECNOLOGIA
   45 ferramentas mapeadas, 3 nuvens. O stack sai do problema, não do contrato.

05 ARQUITETURA QUE ESCALA
   O que entra em produção continua de pé quando o volume triplica.

06 ENTREGA EM PRODUÇÃO
   Projeto termina quando alguém usa todo dia, não quando o relatório é aceito.

07 TIME OU PROJETO
   Se falta solução, construímos. Se falta gente, alocamos. Às vezes os dois.

08 PROXIMIDADE
   Estrutura enxuta: o cliente fala com o time, não com a camada de atendimento.
```

O 04 e o 07 são os mais fortes porque são verificáveis no próprio site — o
catálogo de 45 ferramentas e a família de alocação provam o que a frase diz.

---

## 13. Como funciona a conversa

**Título:** "Do primeiro contato ao resultado."
**Sub:** "Sem proposta genérica e sem apresentação de 40 slides."

```
01  VOCÊ CONTA O DESAFIO
    Uma conversa de 30 minutos. Sem compromisso e sem apresentação institucional.

02  ENTENDEMOS O CENÁRIO
    Que dado existe, onde ele está e quem precisa dele para decidir.

03  MAPEAMOS AS OPORTUNIDADES
    O que dá resultado rápido e o que exige arquitetura. Em ordem de prioridade.

04  DEFINIMOS A ABORDAGEM
    Escopo, stack, prazo e time — antes de qualquer contrato.

05  CONSTRUÍMOS E MEDIMOS
    Entrega em produção, com o indicador de sucesso combinado desde o início.
```

Isto reduz mais fricção que qualquer mudança de botão. O medo de quem preenche um
formulário B2B é virar lead num funil de vendas. Dizer o que acontece nos
próximos cinco passos desarma isso.

A frase que já está no site — *"mesmo que o caminho não passe pela gente"* — é o
melhor redutor de fricção da página. **Suba-a para perto do CTA principal.**

---

## 14. CTA final

```
HEADLINE   Vamos transformar seu próximo desafio em resultado?

SUB        Converse com quem vai executar. Em 30 minutos mapeamos seu cenário
           e indicamos o caminho — mesmo que ele não passe pela gente.

CTA 1      Falar com um especialista →
CTA 2      Conhecer nossas soluções
```

---

## 15. Formulário

Sete campos. Cada campo a mais derruba a conversão, então cada um precisa se
justificar.

```
Nome*                     texto
E-mail corporativo*       e-mail
Empresa*                  texto
Cargo                     texto            (opcional — qualifica, não bloqueia)
Telefone / WhatsApp       telefone         (opcional)

Sobre o que você quer falar?*   (seleção múltipla, chips clicáveis)
[ Dados & BI ] [ Data Engineering ] [ IA ] [ Cloud ]
[ Automação ] [ Desenvolvimento ] [ Arquitetura ] [ Alocação ] [ Outro ]

Conte brevemente o que gostaria de resolver*    texto livre, 3 linhas

[ Quero conversar com a Atlas → ]

Abaixo do botão, texto pequeno:
"Respondemos em até 1 dia útil. Sem cadastro em lista e sem disparo automático."
```

**Confirmação após envio:**
> **Recebemos sua solicitação.**
> Nosso time vai ler seu cenário antes de responder — e entra em contato em até
> 1 dia útil para entender o desafio.

Detalhes que importam:
- Os chips de assunto **entram no corpo do e-mail** e já pré-qualificam o lead.
- Cargo e telefone opcionais: pedir telefone como obrigatório é o campo que mais
  espanta visitante em topo de funil.
- A promessa de prazo só vale se for cumprida. Se 1 dia útil for irreal, escreva
  o prazo real.

---

## 16. CTA persistente

O canto inferior direito é do Átis. Não empilhe.

**Desktop:** barra fina que desce do topo depois que o hero sai da tela.
Altura ~48px, fundo escuro translúcido, uma linha:

```
Tem um desafio de dados?          [ Falar com um especialista → ]
```

**Mobile:** não usar barra no topo (compete com o menu). Usar **um botão largo ao
final de cada seção de oferta** — o polegar já está ali. O Átis continua no canto.

Regras: aparece só depois do hero, some quando a seção de contato entra na tela,
e é dispensável com um X que grava a preferência na sessão.

---

## 17. CTA por seção

Um CTA dominante por seção. Nunca todos os verbos ao mesmo tempo.

| # | Seção | CTA primário | CTA secundário |
|---|---|---|---|
| 01 | Hero | Falar com um especialista → | Conhecer nossas soluções |
| 02 | Rota por objetivo | *(o CTA é o próprio card)* | — |
| 03 | Expertise | Explorar [área] → | — |
| 04 | Ofertas | Falar sobre [oferta] → | Conhecer a solução |
| 05 | Arquitetura | Quero avaliar minha arquitetura | — |
| 06 | Tecnologia | *(sem CTA — é seção de prova)* | — |
| 07 | Produto | Conhecer o Atlas Insight AI → | Solicitar demonstração |
| 08 | Cases | Ver case completo → | — |
| 09 | Números | *(sem CTA)* | — |
| 10 | Por que Atlas | *(sem CTA)* | — |
| 11 | Como funciona | Começar pela conversa → | — |
| 12 | Sobre | *(sem CTA)* | — |
| 13 | CTA final | Falar com um especialista → | Conhecer nossas soluções |
| 14 | Contato | Quero conversar com a Atlas → | — |

**Total: ~14 CTAs de ação na home** — comparável à Leega (12). Quatro seções
deliberadamente sem CTA: são as que constroem confiança, e pedir algo nelas
quebra o efeito.

Um só verbo dominante na página: **falar**. "Explorar" e "conhecer" são o
caminho secundário, para quem ainda não está pronto.

---

## 18. Páginas de serviço — 7 blocos

Não 13. A referência usa menos e funciona.

```
01  HERO            Nome da expertise + frase de posicionamento + CTA
02  CONTEXTO        A situação de mercado (não o defeito do visitante)
03  O QUE FAZEMOS   3 blocos de capability, cada um com 4 entregáveis
04  COMO ENTREGAMOS 4 etapas + o desenho de arquitetura quando fizer sentido
05  TECNOLOGIAS     Os ícones do grupo, com ✦ onde há projeto real
06  CASE            Um case relacionado, com link para o completo
07  CTA FINAL       Falar com um especialista + CTA de diagnóstico
```

**FAQ:** só em `/insight-ai`, onde o visitante de fato tem dúvidas de produto
(a página já tem). Em página de serviço, FAQ vira enchimento.

**Ordem de construção:** `/bi-analytics` → `/data-engineering` → `/alocacao`.
As duas primeiras têm case real. A terceira é o diferencial que a referência não
tem.

---

## 19. Página de produto — `/insight-ai`

A página já existe e está boa. Ajustes:

```
01  HERO              O que é + para quem + CTA duplo
02  POR QUE IMPORTA   O custo de esperar pela fila do BI
03  COMO FUNCIONA     Conecta → aprende → responde
04  DEMONSTRAÇÃO      ⚠ rotulada como demonstração, sempre
05  FUNCIONALIDADES   6 blocos
06  ARQUITETURA       Onde o Insight entra no desenho
07  CASOS DE USO      Por perfil: diretor, controller, analista
08  INTEGRAÇÕES       Com quais bases conecta
09  SEGURANÇA         Onde o dado fica, quem acessa  ← falta hoje
10  FAQ               (já existe)
11  CTA FINAL         Solicitar demonstração + Falar com especialista
```

O bloco **Segurança** é o que falta e é o que trava venda de IA em empresa média
e grande. Toda objeção de IA corporativa é a mesma: *"meu dado vai para onde?"*.
Responder isso na página vale mais que qualquer funcionalidade a mais.

---

## 20. Microcopy

| Gatilho | Resposta |
|---|---|
| Tem um desafio de dados? | Vamos conversar. |
| Não sabe por onde começar? | Comece pela conversa — 30 minutos, sem compromisso. |
| Quer entender o potencial da IA? | Veja o que ela faz sobre a sua própria base. |
| Já tem uma arquitetura? | Podemos avaliar e evoluir o que já existe. |
| Precisa construir do zero? | Desenhamos a arquitetura antes da primeira linha. |
| Tem uma solução em mente? | Vamos transformar em produto. |
| Falta gente, não projeto? | Alocamos especialistas no seu time. |
| Vai me empurrar uma ferramenta? | O stack sai do problema. Somos agnósticos. |

Microcopy de apoio:
- Sob o formulário: *"Respondemos em até 1 dia útil. Sem lista e sem disparo automático."*
- Sob o CTA do hero: *"Conversa de 30 minutos — mesmo que o caminho não passe pela gente."*
- Sob a demonstração de IA: *"Demonstração com dados de exemplo. Sem conexão com base real."*
- Na grade de tecnologias: *"✦ marca as ferramentas com projeto entregue pela Atlas."*

---

## 21. Headlines

**Home (manter):** Transformamos dados complexos em decisões extraordinárias.

Alternativas, se um dia quiser testar:
- Seu dado já responde. Falta alguém perguntar direito.
- Da arquitetura à decisão, em produção.
- Tecnologia não é o fim. É o meio.  *(hoje é subtítulo de seção — daria headline)*

**Subheadlines por página:**
- `/bi-analytics` — Uma métrica, uma definição, e o indicador na mão de quem decide.
- `/data-engineering` — A base confiável que sustenta todo o resto.
- `/inteligencia-artificial` — IA sobre a sua própria base, não sobre uma promessa.
- `/cloud` — A arquitetura na nuvem que a empresa já usa.
- `/alocacao` — Quando o que falta não é projeto, é time.

---

## 22. Conversão

### Desktop
- CTA do hero acima da dobra, sempre.
- Barra persistente depois do hero (seção 16).
- Rota por objetivo logo após o hero: quem sabe o que quer pula direto.
- Cases e tecnologia são as seções de maior permanência — o CTA vem **depois** delas.
- Formulário na mesma página, não em página separada. Cada clique a mais custa.

### Mobile
- Hero: headline + sub + **um** CTA. O secundário vira link de texto.
- Rota por objetivo: carrossel horizontal, não pilha de 6 cards.
- Tabelas de entregáveis viram listas.
- Botão largo ao fim de cada oferta (polegar já está ali).
- Formulário: chips de assunto grandes o suficiente para o dedo (mín. 44px).
- Átis sozinho no canto. Nenhum outro elemento fixo.

---

## 23. UX/UI

1. **Hierarquia antes de enfeite** — um número principal, um destaque por pergunta.
2. **Nada se move sozinho.** A regra já está valendo e deve continuar: animação em
   laço cansa e atrapalha a leitura. Movimento só como resposta ao ponteiro.
3. **Estado em tudo que é clicável** — hover, foco visível, pressionado.
4. **Um assunto por seção.** Se precisa de duas explicações, são duas seções.
5. **Consistência de ícone** — todo ícone de ferramenta usa a mesma máscara e o
   mesmo anel, na home e nas internas.
6. **Espaço negativo é hierarquia**, não desperdício.
7. **Zero overflow horizontal** em qualquer largura — já é padrão validado.
8. **Rodapé como mapa**, agrupado pelas 4 áreas de expertise.

## 24. CRO

1. **Um CTA dominante por seção.** Dois CTAs iguais competindo reduzem os dois.
2. **CTA nomeia o que acontece.** "Falar com um especialista" > "Enviar".
3. **Reduza campos obrigatórios a 5.** Cargo e telefone opcionais.
4. **Diga o prazo de resposta** e cumpra.
5. **Antecipe a objeção onde ela nasce** — "meu dado vai para onde?" na página de IA.
6. **Prova perto do pedido** — o case entra antes do CTA final, não depois.
7. **Meça**: clique por CTA, rolagem por seção, abandono por campo do formulário.
   Sem isso, toda mudança daqui em diante é chute.
8. **Teste uma coisa por vez.** Primeiro o CTA do hero; só depois o formulário.

## 25. SEO

- Uma página por termo de busca: "consultoria power bi", "consultoria data
  engineering", "alocação de profissionais de dados". Uma home não ranqueia para
  nove termos.
- `title` e `meta description` próprios por página, com o termo e a cidade se a
  Atlas atende região definida.
- `Service` no schema.org em cada página de serviço; `Organization` já existe.
- `sitemap.xml` atualizado a cada página nova (o site já tem).
- Cases são o melhor conteúdo de cauda longa: "bi para rede de diagnóstico"
  quase não tem concorrência.
- Um H1 por página. Hoje a home está correta nisso.
- `llms.txt` já existe — mantenha atualizado; buscadores de IA leem.

## 26. Acessibilidade

- Contraste mínimo 4.5:1 em texto corrente. **Verificar `--dim` (#5B6270) sobre
  `--bg0`** — está no limite e é usado em legendas.
- Foco visível em tudo que recebe teclado. Nunca `outline: none` sem substituto.
- Alvo de toque mínimo 44×44px no mobile.
- `aria-live` nos painéis que mudam por interação (já implementado na órbita).
- Formulário com `label` real, não só `placeholder`.
- Erro de formulário descrito em texto, não só em cor.
- `prefers-reduced-motion` respeitado — já está.
- Ícone de ferramenta é decorativo: `aria-hidden` no ícone, nome no `aria-label`
  do botão. Já está assim.

---

## 27. Wireframes

### 27.1. Home

```
┌──────────────────────────────────────────────────────────────┐
│ [A] ATLAS      Soluções Tecnologia Cases Sobre Insights IA   │
│                Contato  [ig][in]  [ Falar com especialista → ]│
├──────────────────────────────────────────────────────────────┤
│  DATA · AI · CLOUD · ANALYTICS                               │
│  Transformamos dados complexos                    ╱╲         │
│  em decisões extraordinárias.                    ╱  ╲  3D    │
│  Estratégia, engenharia, BI e IA…               ╱____╲       │
│  [ Falar com um especialista → ] [ Conhecer soluções ]       │
│  13+ projetos · 10+ setores · 3 nuvens                       │
├──────────────────────────────────────────────────────────────┤
│  02  POR ONDE VOCÊ QUER COMEÇAR?                             │
│  ┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐┌───────┐│
│  │base    ││decidir ││IA      ││cloud   ││automa- ││time   ││
│  │única   ││c/ nº   ││        ││        ││tizar   ││       ││
│  │  CTA → ││  CTA → ││  CTA → ││  CTA → ││  CTA → ││ CTA → ││
│  └────────┘└────────┘└────────┘└────────┘└────────┘└───────┘│
├──────────────────────────────────────────────────────────────┤
│  03  EXPERTISE QUE TRANSFORMA TECNOLOGIA EM RESULTADO        │
│  ┌──────────────┐┌──────────────┐                            │
│  │DATA &        ││INTELIGÊNCIA  │   capabilities em lista    │
│  │ANALYTICS     ││ARTIFICIAL    │   + CTA por área           │
│  └──────────────┘└──────────────┘                            │
│  ┌──────────────┐┌──────────────┐                            │
│  │CLOUD &       ││TECNOLOGIA &  │                            │
│  │ARQUITETURA   ││PESSOAS       │                            │
│  └──────────────┘└──────────────┘                            │
├──────────────────────────────────────────────────────────────┤
│  04  OFERTAS — 4 famílias, 10 cards                          │
│      contexto → o que fazemos → entregáveis → resultado → CTA│
├──────────────────────────────────────────────────────────────┤
│  05  ONDE CADA FERRAMENTA ENTRA                              │
│      ┌─── nuvem ────────────────────────────────┐            │
│      │ [origem] → [ banco ] → [ painel ]        │            │
│      │ ── governança ───────────────────────    │            │
│      │ ── IA ───────────────────────────────    │            │
│      └──────────────────────────────────────────┘            │
│      [ Quero avaliar minha arquitetura ]                     │
├──────────────────────────────────────────────────────────────┤
│  06  TECNOLOGIA NÃO É O FIM. É O MEIO.                       │
│      [8 grupos] · órbita de ícones · painel lateral          │
│      45 ferramentas · ✦ com projeto entregue                 │
├──────────────────────────────────────────────────────────────┤
│  07  PRODUTO ATLAS — Insight AI                              │
│      demonstração (rotulada) + 2 CTAs                        │
├──────────────────────────────────────────────────────────────┤
│  08  RESULTADOS QUE COMEÇAM COM DADOS                        │
│      3 cases em destaque + grade dos demais                  │
├──────────────────────────────────────────────────────────────┤
│  09  13+ projetos · 10+ setores · 200+ dashboards · 3 nuvens │
├──────────────────────────────────────────────────────────────┤
│  10  POR QUE ATLAS — 8 diferenciais                          │
├──────────────────────────────────────────────────────────────┤
│  11  DO PRIMEIRO CONTATO AO RESULTADO — 5 etapas             │
├──────────────────────────────────────────────────────────────┤
│  12  SOBRE                                                   │
├──────────────────────────────────────────────────────────────┤
│  13  VAMOS TRANSFORMAR SEU PRÓXIMO DESAFIO EM RESULTADO?     │
│      [ Falar com um especialista → ] [ Conhecer soluções ]   │
├──────────────────────────────────────────────────────────────┤
│  14  CONTATO — formulário 7 campos + chips de assunto        │
├──────────────────────────────────────────────────────────────┤
│  RODAPÉ — 4 colunas pelas áreas de expertise + social        │
└──────────────────────────────────────────────────────────────┘
```

### 27.2. Página de serviço — `/bi-analytics`

```
┌──────────────────────────────────────────────────────────────┐
│ menu (idêntico à home)                                       │
├──────────────────────────────────────────────────────────────┤
│  BI & DATA VISUALIZATION                                     │
│  Uma métrica, uma definição, e o indicador                   │
│  na mão de quem decide.                                      │
│  [ Falar sobre BI & Analytics → ]                            │
├──────────────────────────────────────────────────────────────┤
│  CONTEXTO                                                    │
│  "O indicador existe, mas cada área chega a um número        │
│   diferente — e a reunião vira discussão sobre o dado."      │
├──────────────────────────────────────────────────────────────┤
│  O QUE FAZEMOS                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                      │
│  │Camada    │ │Dashboards│ │Governança│  4 entregáveis cada  │
│  │semântica │ │executivos│ │de métrica│                      │
│  └──────────┘ └──────────┘ └──────────┘                      │
├──────────────────────────────────────────────────────────────┤
│  COMO ENTREGAMOS — 4 etapas + painel de exemplo (3 abas)     │
├──────────────────────────────────────────────────────────────┤
│  TECNOLOGIAS  Power BI ✦ Tableau ✦ Looker ✦ Qlik MicroStr. ✦ │
├──────────────────────────────────────────────────────────────┤
│  CASE  Governança de BI · 200+ dashboards   [ Ver completo → ]│
├──────────────────────────────────────────────────────────────┤
│  [ Falar com um especialista → ]  [ Quero avaliar meu BI ]   │
├──────────────────────────────────────────────────────────────┤
│  rodapé                                                      │
└──────────────────────────────────────────────────────────────┘
```

### 27.3. Página de produto — `/insight-ai`

```
┌──────────────────────────────────────────────────────────────┐
│ menu                                                         │
├──────────────────────────────────────────────────────────────┤
│  PRODUTO ATLAS                                               │
│  Pergunte ao dado.                                           │
│  [ Solicitar demonstração ] [ Falar com um especialista ]    │
├──────────────────────────────────────────────────────────────┤
│  POR QUE ISSO IMPORTA — o custo da fila do BI                │
├──────────────────────────────────────────────────────────────┤
│  COMO FUNCIONA — conecta → aprende → responde                │
├──────────────────────────────────────────────────────────────┤
│  ⚠ DEMONSTRAÇÃO — dados de exemplo, sem conexão real         │
│  ┌────────────────────────────────────────────┐              │
│  │ [pergunta]                                 │              │
│  │ resposta + números + origem                │              │
│  └────────────────────────────────────────────┘              │
├──────────────────────────────────────────────────────────────┤
│  FUNCIONALIDADES — 6 blocos                                  │
├──────────────────────────────────────────────────────────────┤
│  ARQUITETURA — onde o Insight entra no desenho               │
├──────────────────────────────────────────────────────────────┤
│  CASOS DE USO — diretor · controller · analista              │
├──────────────────────────────────────────────────────────────┤
│  INTEGRAÇÕES — com quais bases conecta                       │
├──────────────────────────────────────────────────────────────┤
│  SEGURANÇA — onde o dado fica, quem acessa       ← FALTA HOJE│
├──────────────────────────────────────────────────────────────┤
│  FAQ                                                         │
├──────────────────────────────────────────────────────────────┤
│  [ Solicitar demonstração ]  [ Falar com um especialista ]   │
└──────────────────────────────────────────────────────────────┘
```

### 27.4. Página de contato — `/contato`

```
┌──────────────────────────────────────────────────────────────┐
│ menu                                                         │
├──────────────────────────────────────────────────────────────┤
│  VAMOS CONVERSAR SOBRE O SEU DESAFIO                         │
│                                                              │
│  ┌── o que acontece depois ──┐  ┌── formulário ────────────┐ │
│  │ 01 Você conta o desafio   │  │ Nome*                    │ │
│  │ 02 Entendemos o cenário   │  │ E-mail corporativo*      │ │
│  │ 03 Mapeamos oportunidades │  │ Empresa*                 │ │
│  │ 04 Definimos a abordagem  │  │ Cargo                    │ │
│  │ 05 Construímos e medimos  │  │ Telefone / WhatsApp      │ │
│  │                           │  │                          │ │
│  │ Conversa de 30 min.       │  │ Sobre o que quer falar?* │ │
│  │ Mesmo que o caminho não   │  │ [Dados&BI][Eng][IA]      │ │
│  │ passe pela gente.         │  │ [Cloud][Automação][...]  │ │
│  │                           │  │                          │ │
│  │ ── outros canais ──       │  │ O que gostaria de        │ │
│  │ e-mail · LinkedIn · Insta │  │ resolver?*   [        ]  │ │
│  │                           │  │                          │ │
│  │                           │  │ [ Quero conversar → ]    │ │
│  │                           │  │ Resposta em 1 dia útil.  │ │
│  └───────────────────────────┘  └──────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│  rodapé                                                      │
└──────────────────────────────────────────────────────────────┘
```

---

## 28. Funil completo

```
VISITANTE
   │  chega por busca, indicação ou LinkedIn
   ▼
HERO ......................... entende em 5 segundos o que a Atlas faz
   │
   ▼
ROTA POR OBJETIVO ............ se identifica com um caminho (sem ser diagnosticado)
   │
   ▼
EXPERTISE .................... vê que a competência existe e é organizada
   │
   ▼
OFERTA ....................... vê o entregável concreto, não a promessa
   │
   ▼
PROVA ........................ tecnologia com ✦, números reais, arquitetura
   │
   ▼
CASE ......................... vê alguém do setor dele com resultado medido
   │
   ▼
CTA .......................... "Falar com um especialista"
   │
   ▼
CONVERSA ..................... 30 min, sem compromisso, sem slide
   │
   ▼
DIAGNÓSTICO .................. mapeamento do cenário e das oportunidades
   │
   ▼
PROPOSTA ..................... escopo, stack, prazo, time
   │
   ▼
PROJETO ...................... entrega em produção, com indicador combinado
```

**Onde o funil vaza hoje:**

1. **Entre OFERTA e PROVA** — os cases dizem o que foi construído, não o que
   mudou. Sem resultado medido, o visitante não consegue projetar o próprio ganho.
2. **No CTA** — "Vamos conversar" não diz com quem nem sobre o quê.
3. **Na entrada** — sem páginas de serviço, quem busca "consultoria data
   engineering" não encontra a Atlas.

Essas três são as de maior retorno. Tudo o mais neste documento é refinamento.

---

## 29. Ordem de implementação

### Fase 1 — o que dá resultado sem depender de ninguém  *(posso começar já)*
1. CTA do hero: `Vamos conversar` → `Falar com um especialista`
2. Microprova no hero com os 4 números reais
3. Rota por objetivo (seção 02)
4. Seção "Do primeiro contato ao resultado" (seção 11)
5. Formulário reestruturado com chips de assunto
6. CTA persistente conforme a seção 16
7. Diagrama de arquitetura na home *(modelo já pronto e aprovado por você)*
8. Auditoria de contraste em `--dim`

### Fase 2 — depende de decisão sua
9. Reorganizar a oferta em 4 áreas de expertise
10. Três páginas de serviço: `/bi-analytics`, `/data-engineering`, `/alocacao`
11. Bloco de Segurança em `/insight-ai`
12. Decidir: duplicar cabeçalho/rodapé ou adotar gerador estático

### Fase 3 — depende de material que só a Atlas tem
13. **Resultado medido em cada case** ← maior retorno de toda a lista
14. Depoimentos autorizados
15. Selos de parceria, se existirem
16. Segundo produto, se o pacote de governança de BI for repetível

---

## O que eu preciso de você

1. **Um número de antes/depois em pelo menos um case.** É o item de maior impacto
   deste documento inteiro.
2. **A Atlas tem selo de parceria** Microsoft, Databricks, Google Cloud ou AWS?
3. **O prazo real de resposta** ao formulário — 1 dia útil ou outro?
4. **A Fase 1 pode começar?** São oito itens que não dependem de nada externo.
