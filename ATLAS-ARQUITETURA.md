# ATLAS — DATA, MAPPED · Fase 00 (auditoria + arquitetura)

Documento de trabalho. Define o que existe, o que será construído e em que ordem.
Nada das fases 01–07 está implementado aqui.

---

## 1. O que existe hoje (auditado, não presumido)

### Repositório

| Item | Situação |
|---|---|
| `package.json` na raiz | **não existe** — o site de marketing é HTML estático puro |
| Framework do site | nenhum. `index.html` é um arquivo único de 87 KB (HTML + CSS + JS inline) |
| App com build | apenas `atlas-insight-ai/` — Next.js 15.5.24, React 19.1.0, TypeScript 5, Tailwind 4, Zustand 5 |
| Three.js | **não está no npm de ninguém**. Vendorizado à mão em `media/vendor/three.module.min.js` (r169, MIT) |
| React Three Fiber / Drei | não instalados |
| GSAP / Framer Motion | não instalados |
| Deploy | GitHub Actions copia arquivos estáticos para a branch `gh-pages` → domínio `atlas-partner.com` |
| Fontes | Manrope (display), Inter (texto), IBM Plex Mono (labels) — Google Fonts |
| Logo | 9 variantes em `media/logo/` (marca, lockup h/v, mono, avatares) + `icon-email.png` |

**Conclusão:** não há stack a substituir no site de marketing — há ausência de stack.
A decisão não é "trocar", é "adotar ou não". Ver §7.

### Site atual (conteúdo real — nada inventado)

- **5 serviços:** Data Engineering · Business Intelligence · Data & Cloud · Artificial Intelligence · Automation
- **13 cases:** 3 principais + 10 mini-cases. 4 marcados "Cliente sob confidencialidade"
- **Setores reais:** Software & Tecnologia · Turismo · Serviços Financeiros · Bancário · Varejo de Moda · Saúde & Diagnóstico · Educação · Saúde Hospitalar · Food Service · Infraestrutura & Mobilidade
- **Stack real citada:** GCP · Azure · AWS · BigQuery · Databricks · Snowflake · dbt · Airflow · Power BI · Tableau · Looker · Python · SQL · Figma
- **Widget de chat "Átis"** — captura de lead funcional, integrado ao FormSubmit
- **Formulário:** Nome · Empresa · Cargo · E-mail · Telefone · Problema

**Reaproveitar:** todo o conteúdo acima, o sistema de logo, as três famílias tipográficas,
o widget Átis, o endpoint do formulário, GA4.

**Descartar:** o arquivo único de 87 KB como forma de organizar código; a metáfora de
"seções empilhadas" (vira narrativa contínua); o hero atual.

**Não inventar:** clientes, números, métricas, resultados, depoimentos, tecnologias.
Todo case novo sai do inventário acima ou não existe.

---

## 2. Arquitetura da experiência

Uma narrativa contínua. A câmera nunca "corta" — ela atravessa um mesmo universo.

```
SIGNAL → ORIGIN → CAPTURE → PIPELINE → MEMORY → TRANSFORMATION
       → CONTEXT → INFORMATION → INTELLIGENCE → DECISION → ACTION ↺
```

Depois do ciclo, o registro muda de narrativo para comercial:

```
ATLAS REVEAL → SERVICES → CASES → TECHNOLOGY MAP → SEARCH → CONTACT
```

### Modelo de estado (`media/js/atlas/lifecycle.js` — implementado)

Um único eixo numérico `phase` (0…10) descreve onde o dado está.
Câmera, partículas, estruturas visíveis e texto ativo são todos **função desse número**.

Por que número contínuo e não máquina de estados: o scroll para no meio do caminho,
e estados discretos não interpolam.

`weightOf(id)` devolve 1 no centro do capítulo e 0 a um capítulo de distância — é assim
que cada cena decide quanto de si mostrar, sem conhecer as outras.

---

## 3. Arquitetura 3D (`media/js/atlas/scenes/` — contrato implementado, cenas não)

Uma cena **não é uma tela** — é uma região do espaço. Por isso nenhuma cena cria
renderer, câmera ou loop próprios: ela recebe o palco e contribui objetos.

```js
createScene(ctx) -> { objects, update(state, dt), setQuality(level), dispose() }
ctx = { THREE, stage, tokens, budget, chapter }
```

`update` só roda quando `weightOf(capítulo) > 0`. Fora disso a cena não custa nada.

| Módulo | Capítulo |
|---|---|
| `DataField` | 01 origin |
| `DataSource` + `DataFlow` | 02 capture |
| `DataPipeline` | 03 pipeline |
| `DataRepository` | 04 memory |
| `TransformField` | 05 transformation |
| `SemanticGraph` | 06 context |
| `AnalyticsScene` | 07 information |
| `PatternScene` | 08 intelligence |
| `DecisionScene` | 09 decision |
| `CycleScene` | 10 action |

O `createSceneManager` carrega por **import dinâmico** apenas os capítulos vizinhos da
fase atual e descarta os distantes. É isto que impede o custo de crescer com o tamanho
da narrativa. Uma cena que falha ao carregar não derruba nada — o capítulo continua
existindo em HTML.

---

## 4. Design tokens (`media/js/atlas/tokens.js` — implementado)

Fonte única para cor, tipografia, ritmo e tempo. Consumido pelo CSS (custom properties)
e pelas cenas 3D (valores numéricos para uniforms).

**Regra: nenhuma cor literal em código de cena.** Se não está no token, não existe.

| Token | Valor |
|---|---|
| `background` | `#05070A` |
| `surface` | `#080B12` |
| `surfaceRaised` | `#0D1118` |
| `text` / `muted` / `dim` | `#F2F5F9` / `#8A94A6` / `#565F70` |
| `atlasBlue` | `#2E86FF` |
| `atlasBlueLight` / `Deep` | `#9FD4FF` / `#0A2EE0` |
| `border` | `rgba(242,245,249,0.09)` |
| `glow` | `rgba(46,134,255,0.45)` |

Azul sinaliza **fluxo, seleção, estado ativo e conexão** — nunca preenchimento decorativo.

---

## 5. Performance (`media/js/atlas/quality.js` — implementado)

Quatro níveis. A narrativa **não depende do nível** — muda a densidade, não o que é contado.

| Nível | Partículas | DPR | Instancing | Pós-processo |
|---|---|---|---|---|
| high | 1400 | 2 | sim | sim |
| medium | 900 | 1.75 | sim | não |
| low | 480 | 1.25 | não | não |
| static | 0 (narrativa editorial) | 1 | — | — |

- Nível resolvido **antes** da cena existir (WebGL, reduced-motion, ponteiro, núcleos, memória)
- `createFrameWatch` mede a mediana em janela de 90 quadros e rebaixa um nível se estourar
  o orçamento — pico isolado durante scroll não degrada a experiência
- WebGPU: disponibilidade já detectada e registrada; **não será adotado** até trazer ganho
  real medido. WebGL2 é o alvo

---

## 6. Acessibilidade (regra estrutural, não etapa final)

Nenhuma informação crítica existe apenas no canvas. Todo capítulo tem headline, texto e
metadados em HTML semântico. O canvas é `aria-hidden`. Sem WebGL, o nível `static`
entrega a mesma narrativa em forma editorial.

---

## 7. Decisão pendente: plataforma do build final

| | HTML estático (atual) | Next.js + R3F |
|---|---|---|
| Deploy | já funciona, GH Pages | `output: 'export'` → mesmo GH Pages |
| Modularidade | módulos ES puros (o que está aqui) | componentes + hooks |
| 10 cenas + search + cases | vira muito JS manual | onde a stack paga |
| Time já conhece? | — | sim, `atlas-insight-ai` já é Next 15 |
| Risco ao site no ar | zero | precisa migração planejada |

**Recomendação:** adotar Next.js + React Three Fiber para o produto final, com `output: 'export'`
para continuar publicando na mesma branch `gh-pages`. A arquitetura desta fase (tokens, modelo
de fase, contrato de cena, níveis de qualidade) foi escrita para portar sem reescrita — são
módulos ES sem dependência de DOM na lógica.

**Enquanto não houver decisão**, as fases seguem em HTML estático + Three.js vendorizado,
que já está validado em `/atlas.html`.

---

## 8. Roadmap

| Fase | Escopo | Situação |
|---|---|---|
| **00** | Auditoria · arquitetura · tokens · contrato de cena · roadmap | **concluída** |
| 01 | Hero · Origin · Capture · Pipeline | protótipo em `/atlas.html` (a portar para esta arquitetura) |
| 02 | Memory · Transformation · Context | — |
| 03 | Information · Intelligence | — |
| 04 | Decision · Action · fechamento do ciclo | — |
| 05 | Atlas Reveal · Services | — |
| 06 | Cases · Technology Map | — |
| 07 | Search · Contact · SEO · QA final | — |

---

## 9. Correção aplicada nesta fase (fora de escopo, mas urgente)

**O GA4 não registrava nada.** A CSP permitia `https://*.analytics.google.com`, mas o
curinga exige subdomínio — e o GA4 envia para `analytics.google.com` (raiz) e
`www.google.com`. Todo `page_view` era recusado no console. Ambos os domínios foram
adicionados ao `connect-src`. Verificado em produção.
