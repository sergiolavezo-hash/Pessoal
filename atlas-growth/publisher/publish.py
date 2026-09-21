#!/usr/bin/env python3
"""
Publicador automático de Instagram para a Atlas Tecnologia.

Publica o conteúdo agendado do dia via Instagram Graph API.
Roda uma vez por dia (GitHub Actions, cron, ou qualquer scheduler).

Uso:
    python publish.py                 # publica o conteúdo de hoje
    python publish.py --dry-run       # mostra o que faria, sem publicar
    python publish.py --day 3         # força um dia específico do calendário
    python publish.py --check         # valida token, conta e assets

Variáveis de ambiente obrigatórias:
    IG_USER_ID         ID da conta Instagram Business
    IG_ACCESS_TOKEN    Token de acesso de longa duração
Opcionais:
    IG_GRAPH_VERSION   Versão da Graph API (padrão: v21.0)
    IG_ASSET_BASE_URL  Sobrescreve o asset_base_url do config.json
"""

import argparse
import datetime as dt
import json
import os
import pathlib
import sys
import time
import urllib.parse

import requests

ROOT = pathlib.Path(__file__).parent
CONFIG_PATH = ROOT / "config.json"
CALENDAR_PATH = ROOT / "calendar.json"
STATE_PATH = ROOT / "state" / "published.json"

GRAPH_VERSION = os.environ.get("IG_GRAPH_VERSION", "v21.0")
GRAPH = f"https://graph.facebook.com/{GRAPH_VERSION}"

# A API rejeita mídia que demore demais para processar. Reels são assíncronos.
REEL_POLL_INTERVAL = 5
REEL_POLL_TIMEOUT = 300
CONTAINER_RETRY = 3


class PublishError(RuntimeError):
    pass


# ---------------------------------------------------------------- utilidades

def log(msg):
    print(f"[{dt.datetime.now():%H:%M:%S}] {msg}", flush=True)


def load_json(path, default=None):
    if not path.exists():
        if default is not None:
            return default
        raise PublishError(f"Arquivo não encontrado: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def save_state(state):
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(
        json.dumps(state, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )


def graph_post(path, params, token):
    """POST na Graph API. Erros da API viram PublishError com a mensagem real."""
    params = {**params, "access_token": token}
    resp = requests.post(f"{GRAPH}/{path}", data=params, timeout=60)
    body = resp.json() if resp.content else {}
    if resp.status_code >= 400 or "error" in body:
        err = body.get("error", {})
        raise PublishError(
            f"{resp.status_code} {err.get('type', 'HTTPError')}: "
            f"{err.get('message', resp.text[:300])}"
            + (f" (code {err['code']})" if "code" in err else "")
        )
    return body


def graph_get(path, params, token):
    params = {**params, "access_token": token}
    resp = requests.get(f"{GRAPH}/{path}", params=params, timeout=60)
    body = resp.json() if resp.content else {}
    if resp.status_code >= 400 or "error" in body:
        err = body.get("error", {})
        raise PublishError(
            f"{resp.status_code}: {err.get('message', resp.text[:300])}"
        )
    return body


def asset_url(base, rel):
    """Monta a URL pública do asset. A Graph API só aceita URL acessível."""
    return urllib.parse.urljoin(base.rstrip("/") + "/", rel.lstrip("/"))


def assert_reachable(url):
    """A API falha de forma obscura se a URL não responder. Checa antes."""
    try:
        r = requests.head(url, timeout=20, allow_redirects=True)
        if r.status_code == 405:  # alguns servidores não aceitam HEAD
            r = requests.get(url, timeout=20, stream=True)
        if r.status_code >= 400:
            raise PublishError(f"Asset inacessível ({r.status_code}): {url}")
    except requests.RequestException as e:
        raise PublishError(f"Asset inacessível: {url} — {e}")


# ------------------------------------------------------------- publicação

def create_container(ig_user_id, token, **params):
    last = None
    for attempt in range(1, CONTAINER_RETRY + 1):
        try:
            return graph_post(f"{ig_user_id}/media", params, token)["id"]
        except PublishError as e:
            last = e
            if attempt < CONTAINER_RETRY:
                log(f"  container falhou (tentativa {attempt}), repetindo: {e}")
                time.sleep(5 * attempt)
    raise last


def wait_for_container(container_id, token):
    """Reels e vídeos processam de forma assíncrona."""
    deadline = time.time() + REEL_POLL_TIMEOUT
    while time.time() < deadline:
        info = graph_get(container_id, {"fields": "status_code,status"}, token)
        status = info.get("status_code")
        if status == "FINISHED":
            return
        if status == "ERROR":
            raise PublishError(f"Processamento falhou: {info.get('status')}")
        log(f"  processando… ({status})")
        time.sleep(REEL_POLL_INTERVAL)
    raise PublishError(f"Timeout de {REEL_POLL_TIMEOUT}s processando a mídia")


def publish_container(ig_user_id, container_id, token):
    res = graph_post(
        f"{ig_user_id}/media_publish", {"creation_id": container_id}, token
    )
    return res["id"]


def post_first_comment(media_id, message, token):
    """Primeiro comentário puxa engajamento. Falha aqui não derruba o post."""
    try:
        graph_post(f"{media_id}/comments", {"message": message}, token)
        log("  primeiro comentário publicado")
    except PublishError as e:
        log(f"  AVISO: primeiro comentário falhou (post já está no ar): {e}")


def publish_entry(entry, cfg, token, dry_run=False):
    ig_user_id = cfg["ig_user_id"]
    base = os.environ.get("IG_ASSET_BASE_URL") or cfg["asset_base_url"]
    kind = entry["type"]
    caption = entry.get("caption", "")

    if kind == "carousel":
        urls = [asset_url(base, p) for p in entry["assets"]]
    elif kind in ("reel", "image", "story"):
        urls = [asset_url(base, entry["asset"])]
    else:
        raise PublishError(f"Tipo desconhecido: {kind}")

    if dry_run:
        log(f"  [dry-run] {kind} · {len(urls)} asset(s)")
        for u in urls:
            log(f"    {u}")
        log(f"  [dry-run] legenda: {caption[:80]}…")
        return None

    for u in urls:
        assert_reachable(u)

    if kind == "carousel":
        log(f"  criando {len(urls)} containers de slide…")
        children = [
            create_container(ig_user_id, token, image_url=u, is_carousel_item="true")
            for u in urls
        ]
        log("  criando container do carrossel…")
        container = create_container(
            ig_user_id,
            token,
            media_type="CAROUSEL",
            children=",".join(children),
            caption=caption,
        )

    elif kind == "reel":
        params = {
            "media_type": "REELS",
            "video_url": urls[0],
            "caption": caption,
            "share_to_feed": "true",
        }
        if entry.get("cover"):
            params["cover_url"] = asset_url(base, entry["cover"])
        container = create_container(ig_user_id, token, **params)
        wait_for_container(container, token)

    elif kind == "story":
        container = create_container(
            ig_user_id, token, media_type="STORIES", image_url=urls[0]
        )

    else:  # image
        container = create_container(
            ig_user_id, token, image_url=urls[0], caption=caption
        )

    log("  publicando…")
    media_id = publish_container(ig_user_id, container, token)
    log(f"  ✅ publicado: media_id={media_id}")

    if entry.get("first_comment"):
        time.sleep(3)
        post_first_comment(media_id, entry["first_comment"], token)

    return media_id


# ------------------------------------------------------------------ fluxo

def resolve_day(cfg, override=None):
    """Dia do calendário correspondente a hoje, contando a partir de start_date."""
    if override is not None:
        return override
    start = dt.date.fromisoformat(cfg["start_date"])
    return (dt.date.today() - start).days + 1


def check(cfg, token):
    log(f"Graph API {GRAPH_VERSION}")
    info = graph_get(
        cfg["ig_user_id"],
        {"fields": "username,name,followers_count,media_count"},
        token,
    )
    log(f"Conta: @{info.get('username')} — {info.get('followers_count')} seguidores, "
        f"{info.get('media_count')} publicações")

    base = os.environ.get("IG_ASSET_BASE_URL") or cfg["asset_base_url"]
    calendar = load_json(CALENDAR_PATH)
    missing, total = [], 0
    for entry in calendar:
        paths = entry.get("assets") or ([entry["asset"]] if entry.get("asset") else [])
        for p in paths:
            total += 1
            try:
                assert_reachable(asset_url(base, p))
            except PublishError:
                missing.append(f"dia {entry['day']}: {p}")
    log(f"Assets: {total - len(missing)}/{total} acessíveis")
    for m in missing:
        log(f"  FALTANDO  {m}")
    return 0 if not missing else 1


def main():
    ap = argparse.ArgumentParser(description="Publicador Instagram — Atlas")
    ap.add_argument("--dry-run", action="store_true", help="não publica nada")
    ap.add_argument("--day", type=int, help="força um dia do calendário")
    ap.add_argument("--check", action="store_true", help="valida token e assets")
    ap.add_argument("--force", action="store_true",
                    help="republica mesmo se o dia já foi publicado")
    args = ap.parse_args()

    cfg = load_json(CONFIG_PATH)
    token = os.environ.get("IG_ACCESS_TOKEN")
    if not token:
        log("ERRO: variável IG_ACCESS_TOKEN não definida.")
        return 2
    cfg["ig_user_id"] = os.environ.get("IG_USER_ID") or cfg.get("ig_user_id")
    if not cfg["ig_user_id"]:
        log("ERRO: IG_USER_ID não definido (env ou config.json).")
        return 2

    if args.check:
        return check(cfg, token)

    calendar = load_json(CALENDAR_PATH)
    state = load_json(STATE_PATH, default={})
    day = resolve_day(cfg, args.day)

    todays = [e for e in calendar if e["day"] == day]
    if not todays:
        log(f"Dia {day}: nada agendado. Calendário tem "
            f"{len(calendar)} entradas (dias {min(e['day'] for e in calendar)}"
            f"–{max(e['day'] for e in calendar)}).")
        return 0

    failures = 0
    for entry in todays:
        key = f"{day}:{entry.get('slug', entry['type'])}"
        if key in state and not args.force:
            log(f"Dia {day} · {entry.get('title', entry['type'])} — já publicado "
                f"em {state[key]['at']}, pulando.")
            continue

        log(f"Dia {day} · {entry['type'].upper()} · {entry.get('title', '')}")
        try:
            media_id = publish_entry(entry, cfg, token, dry_run=args.dry_run)
        except PublishError as e:
            log(f"  ❌ FALHOU: {e}")
            failures += 1
            continue

        if media_id and not args.dry_run:
            state[key] = {
                "media_id": media_id,
                "at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
                "title": entry.get("title", ""),
            }
            save_state(state)

    return 1 if failures else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except PublishError as e:
        log(f"ERRO FATAL: {e}")
        sys.exit(2)
