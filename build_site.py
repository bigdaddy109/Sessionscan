#!/usr/bin/env python3
"""Merge scraper JSON into public/data/site.json for the Vite static hub.

Adapted from franky5440-afk/poe2 build_site.py (Apache License 2.0).
Modifications: emit SessionScan's existing site.json schema under public/data/
so the vice-dusk UI can keep fetching one file. Does not copy a PoE skin.
"""
import json
import logging
import re
from pathlib import Path
from urllib.parse import parse_qs, urljoin, urlparse

BASE = Path(__file__).resolve().parent
DATA = BASE / "data"
PUBLIC_DATA = BASE / "public" / "data"

log = logging.getLogger("sessionscan-build")

LIST_SECTIONS = [
    "jobs_gtabase",
    "jobs_ign",
    "jobs_wiki",
    "videos_hot_zh",
    "videos_hot_en",
    "videos_hot_ja",
    "videos_new_zh",
    "videos_new_en",
    "videos_new_ja",
    "videos_shorts",
    "forum_bahamut",
    "forum_reddit",
    "tweets_zh",
    "tweets_en",
]

OBJECT_SECTIONS = ["meta", "sessionscan_slot", "ja_video_note"]

BAHA_BOARD = "https://forum.gamer.com.tw/B.php?bsn=4737"
REL_TIME_RE = re.compile(
    r"(?:just\s+now|\d+\s*(?:seconds?|minutes?|hours?|days?|weeks?|months?|years?|[smhdwy])\s+ago)",
    re.I,
)


def clean_job_title(title):
    t = re.sub(r"\s+", " ", title or "").strip()
    t = re.sub(r"^(?:[A-Z][a-z]{2} \d{1,2}, \d{4}\s*)+", "", t)
    t = re.sub(rf"^(?:{REL_TIME_RE.pattern}\s*)+", "", t, flags=re.I)
    t = re.split(r"\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}\b", t)[0]
    t = REL_TIME_RE.split(t, maxsplit=1)[0]
    return t.strip(" -–")[:180]


def baha_outbound_url(href):
    raw = urljoin("https://forum.gamer.com.tw/", (href or "").strip())
    parsed = urlparse(raw)
    qs = parse_qs(parsed.query)
    bsn = (qs.get("bsn") or [""])[0]
    sna = (qs.get("snA") or qs.get("sna") or [""])[0]
    path = parsed.path or ""
    if path.endswith("C.php"):
        if bsn and sna:
            return f"https://forum.gamer.com.tw/C.php?bsn={bsn}&snA={sna}"
        return BAHA_BOARD
    return raw if raw else BAHA_BOARD


RDO_ITEM_RE = re.compile(
    r"red\s*dead\s*online|\brdo\b|rdr2|red\s*dead\s*redemption"
    r"|碧血|reddead\.fandom|/wikis/red-dead|/r/reddead|red\s*dead\s*wiki",
    re.I,
)


def is_rdo_item(item):
    if not isinstance(item, dict):
        return False
    if item.get("game") == "RDO":
        return True
    blob = " ".join(
        str(item.get(k) or "")
        for k in ("title", "title_en", "source", "url", "text", "blurb", "channel")
    )
    tags = item.get("tags") or []
    if any(str(t).upper() == "RDO" for t in tags):
        return True
    return bool(RDO_ITEM_RE.search(blob))


def sanitize_merged(merged):
    for key in LIST_SECTIONS:
        rows = merged.get(key) or []
        if not isinstance(rows, list):
            continue
        kept = []
        for item in rows:
            if is_rdo_item(item):
                continue
            if isinstance(item, dict) and item.get("title") and key.startswith("jobs_"):
                item["title"] = clean_job_title(item["title"])
            kept.append(item)
        merged[key] = kept
    for item in merged.get("forum_bahamut") or []:
        if isinstance(item, dict):
            item["url"] = baha_outbound_url(item.get("url") or "")
    meta = merged.get("meta")
    if isinstance(meta, dict):
        meta["scope"] = ["GTA 5", "GTA Online", "GTA 6"]
        excl = [x for x in (meta.get("excluded") or []) if x != "RDO"]
        if "GTA 4" not in excl:
            excl.append("GTA 4")
        if "RDO" not in excl:
            excl.append("RDO")
        meta["excluded"] = excl
    return merged


def load_json(name, default):
    path = DATA / f"{name}.json"
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        log.warning("skip broken %s: %s", name, exc)
        return default


def has_real_payload(merged):
    meta = merged.get("meta") or {}
    if not meta.get("_last_run"):
        return False
    lists = [merged.get(k) or [] for k in LIST_SECTIONS]
    return any(isinstance(x, list) and x for x in lists)


def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    PUBLIC_DATA.mkdir(parents=True, exist_ok=True)

    merged = {}
    for name in LIST_SECTIONS:
        merged[name] = load_json(name, [])
    for name in OBJECT_SECTIONS:
        merged[name] = load_json(name, {})

    out = PUBLIC_DATA / "site.json"
    if not has_real_payload(merged):
        log.warning("no usable scrape payload; keeping previous site.json if present")
        if out.exists():
            return
        log.warning("site.json absent; frontend will keep using sample.json")
        return

    sanitize_merged(merged)
    out.write_text(json.dumps(merged, ensure_ascii=False, indent=1), encoding="utf-8")
    counts = {k: len(merged[k]) for k in LIST_SECTIONS if merged[k]}
    log.info("wrote %s %s", out, counts)


if __name__ == "__main__":
    main()
