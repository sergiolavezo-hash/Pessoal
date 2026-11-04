# Segurança — site Atlas Tecnologia

Estado dos controles de segurança de `atlas-partner.com`, o que já está
aplicado no código e o que depende de configuração fora dele.

Última auditoria: 2026-11-04. Referências: OWASP Top 10, OWASP ASVS, LGPD.

## O que este site é

Site estático: HTML, CSS e JavaScript servidos pelo GitHub Pages a partir
da branch `gh-pages`. **Não há** servidor de aplicação, banco de dados,
API própria, autenticação, sessão, painel administrativo nem dependência
de runtime em produção. Isso elimina por construção várias classes de
risco — injeção de SQL, quebra de controle de acesso, falha de sessão —
porque não existe a superfície correspondente.

Terceiros em uso: Google Analytics 4 (gtag.js), Google Fonts (apenas IBM
Plex Mono) e FormSubmit, que recebe os envios dos formulários.

## Pendências que dependem de configuração externa

### 1. Forçar HTTPS — CRÍTICO, um clique

`http://atlas-partner.com` responde **200 e serve a página em texto
claro**, sem redirecionar. Verificado em 2026-11-04:

    $ curl -sI http://atlas-partner.com/ | head -1
    HTTP/1.1 200 OK          # nenhum 301 para https

Em rede hostil — Wi-Fi de aeroporto, hotel, café — a página inteira pode
ser alterada em trânsito, inclusive a própria política de segurança que
vai no HTML. O certificado já existe e o HTTPS já funciona; falta só o
redirecionamento.

**Como resolver:** repositório no GitHub → *Settings* → *Pages* → marcar
**Enforce HTTPS**. Sem risco: o certificado já está emitido e válido.

Ligado isso, o GitHub Pages passa a mandar `Strict-Transport-Security`
sozinho.

### 2. Cabeçalhos de segurança HTTP — ALTO

O site hoje devolve **nenhum** cabeçalho de segurança:

    $ curl -sI https://atlas-partner.com/ | grep -iE "strict-transport|x-content-type|x-frame|content-security|permissions-policy"
    (vazio)

Consequência demonstrada: **o site pode ser embutido em iframe por
qualquer página**. Reproduzido carregando `atlas-partner.com` dentro de um
iframe numa página de terceiro — renderiza inteiro. Um atacante pode
sobrepor elementos invisíveis e induzir cliques no formulário de contato.

A CSP existe, mas vai numa `<meta>` dentro do HTML, e `frame-ancestors`
— a diretiva que impede o enquadramento — **é ignorada quando declarada em
meta**. Só funciona como cabeçalho HTTP.

**O GitHub Pages não permite cabeçalhos personalizados.** Não há como
resolver isto no código deste repositório. O caminho é pôr a Cloudflare
(plano gratuito) na frente do domínio e adicionar os cabeçalhos por
*Transform Rule → Modify Response Header*:

    Strict-Transport-Security: max-age=31536000; includeSubDomains
    X-Content-Type-Options: nosniff
    Referrer-Policy: strict-origin-when-cross-origin
    Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
    Content-Security-Policy: frame-ancestors 'self'

Sobre `preload` no HSTS: **não habilitar** sem avaliação à parte. Entrar na
lista de preload é de difícil reversão e trava todos os subdomínios em
HTTPS, inclusive os que ainda não existem.

### 3. E-mail exposto no código-fonte — MÉDIO

O endpoint do formulário carrega o endereço em texto puro, em 21 páginas
publicadas, 3 a 4 vezes em cada:

    https://formsubmit.co/ajax/<endereço>@atlas-partner.com

Qualquer coletor de spam que leia o HTML colhe o endereço. O FormSubmit
emite um token aleatório que substitui o endereço no endpoint; com ele, o
e-mail some do fonte sem mudar nada no funcionamento.

**Como resolver:** pegar o token na conta do FormSubmit e trocar a
constante em `index.html` (`ENDPOINT` e `FORM_ENDPOINT`); as 19 páginas
geradas herdam na regeração. Não é possível fazer sem acesso à conta.

### 4. Política de privacidade e LGPD — MÉDIO

Não existe política de privacidade no site, e o Google Analytics grava os
cookies `_ga` e `_ga_B0QFW3ZH7K` **no primeiro carregamento**, antes de
qualquer aviso ao visitante.

O formulário coleta nome, empresa, cargo, e-mail, telefone e a descrição do
desafio, e envia para o FormSubmit, que é serviço de terceiro fora do
Brasil — transferência internacional sob a LGPD.

Para publicar a política faltam dados que só a Atlas tem: razão social,
CNPJ, contato do encarregado e prazo de retenção do que chega pelo
formulário.

**Nada aqui declara conformidade com a LGPD.** Isso depende de avaliação
jurídica, não de configuração técnica.

## O que já está aplicado no código

| Controle | Estado |
|---|---|
| CSP restritiva em `<meta>` | aplicado; cobre as 5 origens externas realmente usadas, sem violação no console |
| `referrer-policy` em meta | aplicado (`strict-origin-when-cross-origin`) |
| `upgrade-insecure-requests` | aplicado na CSP |
| `rel="noopener"` em link externo | aplicado nos 2 que existem |
| Armadilha para robô no formulário | aplicado (campo `_honey`, fora da tela e do teclado) |
| Limite de tamanho nos campos | aplicado (80 a 2000 conforme o campo) |
| `security.txt` (RFC 9116) | aplicado em `/.well-known/security.txt` |
| Action fixada por commit SHA | aplicado (`actions/checkout` em SHA, não em tag) |
| Permissão do workflow | `contents: write`, o mínimo para publicar na `gh-pages` |

## O que foi verificado e está correto

- **XSS:** o texto que o visitante digita nunca vai para `innerHTML`. O
  chat usa `textContent` e `createTextNode`; os usos de `innerHTML` recebem
  só conteúdo estático ou o dicionário de tradução gerado no build.
- **Tema vindo do `localStorage`:** validado por lista branca
  (`'claro'` ou `'escuro'`), sem injeção em atributo.
- **Arquivos expostos:** `.git`, `.env`, backup, arquivo de configuração,
  painel administrativo — nenhum acessível. Sem listagem de diretório.
- **Segredos no repositório:** nenhum. O ID do Google Analytics é público
  por natureza.
- **Deploy:** publica por lista branca de arquivos, não por cópia da pasta
  inteira. `assinatura-email-atlas.html` e `modelo-arquitetura.html` não
  vão para o ar.
- **TLS:** negocia TLS 1.3. *A validade do certificado não pôde ser
  conferida do ambiente desta auditoria, que sai por proxy — conferir em
  ssllabs.com/ssltest.*

## Não aplicável a este site

Autenticação, MFA, hash de senha, sessão e cookie de aplicação, controle de
acesso por perfil, consulta parametrizada, CORS, rate limiting próprio,
rotação de credencial de banco. Nada disso existe porque não há servidor
nem banco. **Não criar nenhum deles só para marcar item de checklist.**

Rate limiting e antispam dos formulários são do FormSubmit, não deste
repositório. A armadilha para robô é a camada que cabe ao site.

## Rollback

A branch de publicação é `claude/atlas-partner-site-upgrade-gqecba`: todo
push nela republica o site. Para desfazer uma mudança de segurança:

    git revert <sha>        # desfaz um commit específico
    git push origin claude/atlas-partner-site-upgrade-gqecba

O histórico do Git é o backup do site. O conteúdo é gerado a partir de
`index.html` pelos scripts em `tools/`, então reverter o fonte e rodar os
geradores reconstrói as 19 páginas derivadas.

## Resposta a incidente

1. **Conter.** Se o site estiver servindo conteúdo adulterado, reverter
   para o último commit bom e republicar.
2. **Preservar.** Não apagar nada antes de registrar: horário, URL,
   captura de tela, cabeçalhos da resposta.
3. **Avaliar o alcance.** Site estático não guarda dado de visitante; o que
   existe de dado pessoal está nos e-mails recebidos pelo FormSubmit.
4. **Girar o que vazou.** Se o endpoint do FormSubmit for abusado, trocar o
   token na conta deles.
5. **Comunicar.** Havendo dado pessoal envolvido, a LGPD exige avaliação de
   comunicação à ANPD e aos titulares. Decisão jurídica, não técnica.

Relato de falha por terceiros: `/.well-known/security.txt`.
