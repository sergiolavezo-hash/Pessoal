# Atlas Tec — Site institucional

Site institucional da [Atlas Tec](https://atlas-partner.com) — soluções de Data
Analytics e Cloud com abordagem tecnológica agnóstica.

## Estrutura

- `index.html` — site completo em um único arquivo (HTML, CSS e JavaScript
  inline), sem dependências de build. Basta abrir no navegador ou publicar em
  qualquer hospedagem estática (GitHub Pages, Netlify, Vercel, etc.).

## Seções

1. **Hero** — chamada principal com globo de dados animado (canvas)
2. **Serviços** — Business Intelligence, Data Science, Data Management,
   Outsourcing, Software Development e Consultoria Estratégica
3. **Sobre nós** — posicionamento e diferenciais
4. **Como trabalhamos** — método em 4 etapas
5. **Para profissionais de TI** — banco de talentos
6. **Contato** — formulário e redes sociais

## Como publicar no GitHub Pages

1. Em **Settings → Pages**, selecione a branch desejada e a pasta `/ (root)`.
2. O site ficará disponível em `https://<usuario>.github.io/<repositorio>/`.
3. Para usar o domínio `atlas-partner.com`, configure o campo *Custom domain*
   e aponte o DNS do domínio para o GitHub Pages.

## Formulário de contato

O formulário ainda não envia mensagens para um backend — ele apenas exibe uma
confirmação visual. Para receber as mensagens, aponte o atributo `action` do
`<form>` em `index.html` para um serviço de formulários (ex.: Formspree,
Getform) ou para o backend da empresa, conforme o comentário no código.
