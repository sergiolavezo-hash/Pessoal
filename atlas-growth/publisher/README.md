# Publicador automático de Instagram — Atlas

Publica o conteúdo agendado todos os dias, sozinho, via Instagram Graph API.
Roda no GitHub Actions (grátis) ou em qualquer cron.

```
publisher/
  publish.py        o publicador
  calendar.json     o que publicar em cada dia
  config.json       data de início e URL dos assets
  state/            registro do que já foi publicado (evita post duplicado)
```

---

## ⚠️ LEIA ANTES: o que a API NÃO faz

Descobrir isso depois custa caro. A Graph API **não permite**:

| Não dá | Consequência prática |
|---|---|
| **Editar bio, nome, link ou destaques** | Esses ajustes são manuais, sempre. Veja `04-ajustes-perfil-passo-a-passo.md` |
| **Sticker de enquete ou caixinha em Stories** | O card da enquete é publicado como imagem estática. Para a enquete funcionar de verdade, publique esse story à mão |
| **Texto alternativo (alt text)** | Some do fluxo automático. Perde-se um sinal de SEO |
| **Publicar PNG** | Só JPEG — por isso existe a pasta `artes-jpg/` |
| **Mais de 50 posts por 24h** | Irrelevante aqui (1/dia), mas existe |

O que **dá**: feed (imagem única), carrossel de 2 a 10 slides, Reels, Stories
(mídia estática) e o primeiro comentário. Ou seja: o grosso do trabalho repetitivo.

---

## Instalação (uma vez, ~40 minutos)

### 1. Pré-requisitos da conta
- A conta `@atlas_tecnologia` precisa ser **Business** (não Criador, não pessoal)
- Precisa estar **vinculada a uma Página do Facebook** — sem isso a API não enxerga a conta
- Instagram → Configurações → Conta → Compartilhamento com outros apps → Facebook

### 2. Criar o app na Meta
1. [developers.facebook.com](https://developers.facebook.com) → Meus apps → Criar app
2. Tipo: **Empresa**
3. Adicionar produto: **Instagram Graph API** (ou "Instagram" → API com login do Facebook)
4. Em Funções → Adicionar você mesmo como **Administrador**

> Enquanto o app estiver em modo de desenvolvimento e você for admin, funciona sem
> revisão da Meta. Revisão só é necessária para publicar em contas de terceiros.

### 3. Pegar o ID da conta e o token

No [Graph API Explorer](https://developers.facebook.com/tools/explorer/), selecione seu app e peça estas permissões:

```
instagram_basic
instagram_content_publish
pages_show_list
pages_read_engagement
business_management
```

Depois, com o token gerado:

```
GET /me/accounts
→ pega o id da Página do Facebook

GET /{page-id}?fields=instagram_business_account
→ devolve o IG_USER_ID (é esse que você usa)
```

**Token de longa duração** — o token do Explorer expira em ~1 hora. Troque por um longo:

```
GET /oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id={APP_ID}
  &client_secret={APP_SECRET}
  &fb_exchange_token={TOKEN_CURTO}
```

Com esse token longo de usuário, chame `GET /me/accounts` de novo: o token da
Página que vier **não expira** enquanto as permissões forem mantidas. **É esse que
você guarda.**

> Se o app for para produção de verdade, ative 2FA na conta admin. Um token de
> Página sem expiração é uma credencial séria.

### 4. Hospedar as artes

A Graph API **baixa** a mídia de uma URL pública — ela precisa abrir sem login.

Suba a pasta `atlas-growth/artes-jpg/` para o seu site:

```
https://atlas-partner.com/ig-assets/
  01-powerbi/slide-01.jpg …
  02-perguntas/slide-01.jpg …
  03-glossario/slide-01.jpg …
  capas-reels/reel-01-capa.jpg …
  stories/story-enquete.jpg …
  reels/                          ← os vídeos entram aqui
```

Os Reels em `.mp4` você adiciona conforme for gerando. O calendário já aponta
para os nomes esperados (`reels/reel-01-custo-fechamento.mp4` etc.).

**Requisitos de vídeo para Reels:** MP4 (H.264 + AAC), 9:16, até 90s,
até 1 GB. Vídeo fora disso a API rejeita no processamento.

### 5. Configurar

Em `config.json`:
```json
{
  "start_date": "2026-10-01",
  "asset_base_url": "https://atlas-partner.com/ig-assets/",
  "ig_user_id": ""
}
```

`start_date` é o dia 1 do calendário. Para adiar tudo em uma semana, mude só essa data.

### 6. Ligar o agendamento

No repositório: **Settings → Secrets and variables → Actions**

| Tipo | Nome | Valor |
|---|---|---|
| Secret | `IG_USER_ID` | o ID da conta Instagram Business |
| Secret | `IG_ACCESS_TOKEN` | o token de Página de longa duração |
| Variable | `IG_ASSET_BASE_URL` | `https://atlas-partner.com/ig-assets/` |

O workflow `.github/workflows/instagram-daily.yml` dispara às **19h17 de Brasília**
todo dia. Para mudar o horário, edite o cron (ele é em UTC — Brasília é UTC−3).

---

## Testar antes de soltar

```bash
cd atlas-growth/publisher
pip install -r requirements.txt
export IG_USER_ID=...  IG_ACCESS_TOKEN=...

python publish.py --check          # valida token, conta e TODOS os assets
python publish.py --day 2 --dry-run   # simula sem publicar
python publish.py --day 2          # publica de verdade
```

`--check` é o mais útil: confirma que o token funciona, mostra o nome da conta e
lista **cada arte que não está acessível na URL**. Rode antes de ligar o cron.

No GitHub, a aba **Actions → Instagram — publicação diária → Run workflow**
permite disparar à mão, com dia específico e opção de dry-run.

---

## Como ele se comporta

- **Não duplica.** Cada publicação fica registrada em `state/published.json`.
  Se rodar duas vezes no mesmo dia, a segunda pula. Para forçar, use `--force`.
- **Dia vazio não é erro.** O calendário tem dias sem post; ele só avisa e sai.
- **Falha alto.** Asset inacessível, token expirado ou vídeo rejeitado param
  aquela publicação com a mensagem real da API — o Actions fica vermelho e você
  recebe e-mail. Nada de falha silenciosa.
- **Primeiro comentário é best-effort.** Se falhar, o post continua no ar e ele
  só avisa: não vale derrubar uma publicação boa por causa de um comentário.
- **Reels processam de forma assíncrona.** Ele espera até 5 minutos o Instagram
  terminar de processar antes de publicar.

---

## Manutenção

**Adicionar conteúdo:** edite `calendar.json`. Cada entrada:
```json
{
  "day": 22,
  "type": "carousel",
  "slug": "identificador-unico",
  "title": "Nome interno",
  "assets": ["pasta/slide-01.jpg", "..."],
  "caption": "Legenda completa com \n para quebra de linha",
  "first_comment": "opcional"
}
```
Tipos: `carousel` · `reel` · `image` · `story`.

**Quando o calendário acabar:** avance `start_date` para reiniciar o ciclo, ou
adicione novas entradas com dias maiores.

**Se o token parar de funcionar:** `python publish.py --check` diz na hora.
Token de Página não expira sozinho, mas é invalidado se você trocar a senha do
Facebook, revogar o app ou mudar permissões. Nesse caso, refaça o passo 3.

---

## O que ainda depende de você

1. **Os vídeos dos Reels** — os prompts de IA estão em `03-producao-reels-e-artes.md`.
   Sem os `.mp4` em `ig-assets/reels/`, os dias de Reel falham no `--check`.
2. **Hospedar a pasta `artes-jpg/`** no site.
3. **Os ajustes de perfil** (nome, bio, link, destaques) — manuais, sem exceção.
4. **Stories com enquete** — publique à mão nos dias 5 e 12 se quiser o sticker
   funcionando. O automático publica só a imagem.
