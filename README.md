# Atlas Tec — Site institucional premium

Site institucional da [Atlas Tec](https://atlas-partner.com) — consultoria de
tecnologia, dados, BI, IA e transformação digital.

## Arquitetura

Site estático de alta performance, **zero dependências e sem build**:

- `index.html` — todo o site (HTML + CSS + JavaScript vanilla inline).
  Pronto para qualquer hospedagem estática (GitHub Pages, Netlify, Vercel, Cloudflare Pages).
- `robots.txt` e `sitemap.xml` — SEO técnico.

Não usa frameworks nem bibliotecas externas: todas as animações (partículas,
canvas, scroll storytelling, contadores, cursor customizado) são implementadas
em JavaScript puro, o que garante carregamento rápido e nota alta em
performance.

## Narrativa do site

Complexidade → Dados → Tecnologia → Inteligência → Decisão → Resultado

1. **Hero** — headline gigante + universo de dados reativo ao mouse
2. **O problema** — animação caos → inteligência → decisão dirigida pelo scroll
3. **Soluções** — 8 frentes em lista explorável (acordeão)
4. **Tecnologia** — Technology Universe interativo com tecnologias orbitando
5. **Cases** — estudos de caso com contadores animados
6. **Case interativo** — storytelling por scroll (problema → arquitetura → fluxo → dashboards → resultado)
7. **Data Visualization** — dashboard mockup interativo (filtros, tooltips)
8. **IA** — rede neural animada (dados → processamento → inteligência → ação)
9. **Metodologia** — Discovery → Strategy → Architecture → Build → Deploy → Optimize
10. **Diferencial, Clientes (marquee), Insights, Sobre, CTA final, Contato**

## Design system

- **Cores**: preto `#0A0A0C`, grafite `#16161A`, off-white `#F2F1ED`,
  acento elétrico `#00E7C4`; séries de gráfico `#00A78F` / `#7B84DB`
  (validadas para daltonismo e contraste)
- **Tipografia**: Manrope (display), Inter (texto), IBM Plex Mono (labels)
- **Acessibilidade**: navegação por teclado, foco visível, `aria-labels`,
  `prefers-reduced-motion` desativa todas as animações
- **Mobile**: layouts próprios, partículas reduzidas, cursor customizado desativado

## Configurações pendentes

- **Formulário**: aponte o `action` do `<form>` para um endpoint (Formspree,
  Getform ou backend próprio) e troque o handler no script — hoje ele só exibe
  a confirmação visual (comentário no código indica o local).
- **Google Analytics**: descomente o bloco no `<head>` e insira seu ID `G-XXXXXXX`.
- **Clientes**: troque os setores do marquee pelos logos monocromáticos dos
  seus clientes (comentário no código).
- **Cases**: os indicadores atuais são representativos — substitua pelos
  números reais dos seus projetos.

## Publicação (GitHub Pages)

1. **Settings → Pages** → selecione a branch e a pasta `/ (root)`.
2. Para o domínio próprio, preencha *Custom domain* com `atlas-partner.com` e
   aponte o DNS para o GitHub Pages.
