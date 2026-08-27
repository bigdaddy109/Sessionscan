#!/usr/bin/env python3
"""SessionScan daily scraper.

Adapted from franky5440-afk/poe2 scraper.py (Apache License 2.0).
Modifications (2026 SessionScan):
- Retargeted from Path of Exile 2 to GTA 5 / GTA Online / RDO / GTA 6
- Replaced build-guide scrapers with GTABase / IGN / GTA Wiki outbound cards
  (titles, links, dates only — never reprint full guides)
- Added Reddit r/gtaonline and r/GTA6 outbound cards
- SessionScan channel slot is a placeholder only (no fabricated video URLs)
- Excludes GTA 4 and older GTA titles
- Keep-yesterday: never overwrite a source file with an empty result
- Thumbnails are not stored; the frontend hotlinks i.ytimg.com
"""
from __future__ import annotations

import hashlib
import html as html_lib
import json
import logging
import os
import re
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import parse_qs, quote_plus, urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from ddgs import DDGS

try:
    import yt_dlp
except ImportError:  # pragma: no cover - video scrape only
    yt_dlp = None

BASE = Path(__file__).resolve().parent
DATA = Path(os.environ.get("SCAN_DATA_DIR", BASE / "data"))
LOGS = Path(os.environ.get("SCAN_LOG_DIR", BASE / "logs"))
DATA.mkdir(parents=True, exist_ok=True)
LOGS.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.FileHandler(LOGS / "scraper.log", encoding="utf-8"), logging.StreamHandler()],
)
log = logging.getLogger("sessionscan")

UA = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0",
    "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.5",
}
REDDIT_UA = {
    "User-Agent": "SessionScanHub/1.0 (outbound cards; +https://github.com/bigdaddy109/Sessionscan)",
    "Accept": "application/atom+xml, application/rss+xml, application/xml, text/xml, */*",
}

NEW_CUTOFF_DAYS = 21
HOT_CUTOFF_DAYS = 30
RSS_CHANNEL_CAP = 60
NEW_FLAT_LIMIT = 150
TWEET_CAP = 80
JOB_CAP = 8
FORUM_CAP = 10

X_SEARCH_QUERIES = {
    "zh": ('"GTA 6" OR "GTA線上" OR "俠盜獵車手6" site:x.com', "tw-zh"),
    "en": ('"GTA 6" OR "GTA Online" OR "Rockstar Games" site:x.com', "us-en"),
}
X_OFFICIAL_ACCOUNTS = ("RockstarGames", "GTAonline")
SYND_URL = "https://syndication.twitter.com/srv/timeline-profile/screen-name/{}?showReplies=false"
SYND_MARKER = '<script id="__NEXT_DATA__" type="application/json">'
STATUS_RE = re.compile(r"\b(?:x|twitter)\.com/([A-Za-z0-9_]{1,15})/status(?:es)?/(\d{10,})")
TIME_PREFIX_RE = re.compile(
    r"^(?:\d+\s+(?:seconds?|minutes?|hours?|days?|weeks?|months?|years?)\s+ago"
    r"|[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}"
    r"|\d{4}-\d{2}-\d{2})\s*[·\-–—]\s*"
)
JUNK_RES = (
    re.compile(r"log\s*in\s*sign\s*up"),
    re.compile(r"sensitive\s+content"),
    re.compile(r"this\s+post\s+is\s+(?:only\s+available|unavailable)"),
    re.compile(r"\(\@[A-Za-z0-9_]+\)\.\s*\d+\s+(?:replies|retweets|likes)\b"),
)

CJK_RE = re.compile(r"[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]")
KANA_RE = re.compile(r"[\u3040-\u30ff]")

GTA4_RE = re.compile(
    r"gta\s*(?:4|iv)\b|grand theft auto\s*(?:4|iv)\b|俠盜獵車手\s*4|侠盗猎车手\s*4"
    r"|/grand-theft-auto-iv\b",
    re.I,
)
OLD_GTA_RE = re.compile(
    r"gta\s*(?:3|iii|sa\b|san andreas|vice city|liberty city|chinatown|advance)"
    r"|grand theft auto\s*(?:3|iii)|俠盜獵車手\s*(?:3|聖安地列斯|罪惡城)",
    re.I,
)
SCOPE_RE = re.compile(
    r"gta\s*(?:5|v|6|vi|online|o\b)|gtao|grand theft auto\s*(?:5|v|6|vi|online)"
    r"|俠盜獵車手\s*(?:5|6|線上)|侠盗猎车手\s*(?:5|6|线上)"
    r"|red dead online|\brdo\b|碧血.*線上|red dead redemption\s*2.*online",
    re.I,
)


def now_str():
    return datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M")


def load_json(name, default):
    path = DATA / name
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            pass
    return default


def save_json(name, obj):
    (DATA / name).write_text(json.dumps(obj, ensure_ascii=False, indent=1), encoding="utf-8")


def set_meta(section):
    meta = load_json("meta.json", {})
    meta[section] = now_str()
    save_json("meta.json", meta)


def save_or_keep(name, items, label=None):
    """Write JSON only when the source returned cards. Empty = keep yesterday."""
    label = label or name
    if items:
        save_json(f"{name}.json", items)
        set_meta(name)
        log.info("%s: %d items", label, len(items))
        return True
    log.warning("%s: parsed 0 items, keeping previous data", label)
    return False


def has_cjk(s):
    return bool(CJK_RE.search(s or ""))


def detect_lang(text, url=""):
    t = text or ""
    if KANA_RE.search(t):
        return "ja"
    d = domain_of(url)
    if d.endswith(".jp"):
        return "ja"
    if has_cjk(t):
        return "zh"
    return "en"


def norm_url(u):
    return (u or "").split("#")[0].split("?")[0].rstrip("/").lower()


def domain_of(u):
    netloc = urlparse(u).netloc.lower()
    return netloc[4:] if netloc.startswith("www.") else netloc


def md5_id(text):
    return re.sub(r"[^a-f0-9]", "", hashlib.md5(text.encode()).hexdigest())


def is_gta4(text):
    return bool(GTA4_RE.search(text or ""))


def is_old_gta(text):
    return bool(OLD_GTA_RE.search(text or "")) and not SCOPE_RE.search(text or "")


def is_in_scope(text):
    blob = text or ""
    if is_gta4(blob) or is_old_gta(blob):
        return False
    return bool(SCOPE_RE.search(blob))


def detect_game(text):
    t = text or ""
    if is_gta4(t):
        return None
    if re.search(r"gta\s*(?:6|vi)\b|grand theft auto\s*(?:6|vi)|俠盜獵車手\s*6|侠盗猎车手\s*6", t, re.I):
        return "GTA 6"
    if re.search(r"red dead online|\brdo\b|碧血.*線上", t, re.I):
        return "RDO"
    if re.search(r"gta\s*online|gtao|grand theft auto online|俠盜獵車手\s*線上|线上模式", t, re.I):
        return "GTA Online"
    if re.search(r"gta\s*(?:5|v)\b|grand theft auto\s*(?:5|v)|俠盜獵車手\s*5", t, re.I):
        return "GTA 5"
    if is_in_scope(t):
        return "GTA Online"
    return None


def game_in_title(title):
    return is_in_scope(title or "")


def clean_tweet_text(text):
    t = TIME_PREFIX_RE.sub("", text or "").strip()
    if not t:
        return None
    low = t.lower()
    if any(p.search(low) for p in JUNK_RES):
        return None
    return t


def http_get(url, headers=None, timeout=25):
    r = requests.get(url, headers=headers or UA, timeout=timeout)
    r.raise_for_status()
    return r


def parse_http_date(value):
    if not value:
        return None
    value = value.strip()
    if re.match(r"^\d{4}-\d{2}-\d{2}", value):
        return value[:10]
    try:
        return parsedate_to_datetime(value).date().isoformat()
    except (TypeError, ValueError):
        return None


REL_TIME_RE = re.compile(
    r"(?:just\s+now|\d+\s*(?:seconds?|minutes?|hours?|days?|weeks?|months?|years?|[smhdwy])\s+ago)",
    re.I,
)


def clean_heading(title):
    t = html_lib.unescape(re.sub(r"\s+", " ", title or "")).strip()
    t = re.sub(r"^(?:[A-Z][a-z]{2} \d{1,2}, \d{4}\s*)+", "", t)
    t = re.sub(rf"^(?:{REL_TIME_RE.pattern}\s*)+", "", t, flags=re.I)
    t = re.split(r"\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}\b", t)[0]
    t = REL_TIME_RE.split(t, maxsplit=1)[0]
    t = re.sub(r"\s+[-–]\s+(?:Rejected|Updated|Posted).*$", "", t, flags=re.I)
    t = re.sub(
        r"\s+[-–]\s+(?:Pulling|As |Ball |Vice |Rejected|Updated|Posted).*$",
        "",
        t,
        flags=re.I,
    )
    return t.strip(" -–")[:180]


def date_from_title(title):
    m = re.search(
        r"(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})"
        r"|(?:january|february|march|april|may|june|july|august|september|october|november|december)"
        r"\s+(\d{1,2})(?:\s*[–-]\s*\d{1,2})?,?\s*(20\d{2})",
        title or "",
        re.I,
    )
    if not m:
        return None
    if m.group(1):
        return f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"
    months = {
        "january": "01", "february": "02", "march": "03", "april": "04",
        "may": "05", "june": "06", "july": "07", "august": "08",
        "september": "09", "october": "10", "november": "11", "december": "12",
    }
    mon = months.get((re.match(r"[A-Za-z]+", m.group(0)).group(0).lower()))
    if mon:
        return f"{m.group(5)}-{mon}-{int(m.group(4)):02d}"
    return None


# ---------------------------------------------------------------- Money / jobs (titles + links + dates only)

JOB_BLURB = "外連公開頁。本站只列標題與日期，不轉載全文。"


def job_item(title, url, source, game=None, updated=None, rank=1):
    game = game or detect_game(f"{title} {url}") or "GTA Online"
    return {
        "id": md5_id(norm_url(url)),
        "rank": rank,
        "title": clean_heading(title),
        "title_en": "",
        "source": source,
        "game": game,
        "author": source,
        "updated": updated or date_from_title(title),
        "tags": [game],
        "url": url,
        "blurb": JOB_BLURB,
    }


def parse_gtabase_listing(html, base="https://www.gtabase.com"):
    soup = BeautifulSoup(html, "html.parser")
    out, seen = [], set()
    for a in soup.find_all("a", href=True):
        href = a.get("href") or ""
        title = a.get_text(" ", strip=True)
        title = html_lib.unescape(re.sub(r"\s+", " ", title))
        if "/articles/" not in href or len(title) < 12:
            continue
        if any(x in title.lower() for x in ("join mygta", "create account", "show more")):
            continue
        url = urljoin(base, href)
        blob = f"{title} {url}"
        if not is_in_scope(blob):
            continue
        k = norm_url(url)
        if k in seen:
            continue
        seen.add(k)
        out.append(job_item(title, url, "GTABase", updated=date_from_title(title), rank=len(out) + 1))
        if len(out) >= JOB_CAP:
            break
    return out


def scrape_gtabase():
    pages = [
        "https://www.gtabase.com/",
        "https://www.gtabase.com/articles/",
        "https://www.gtabase.com/news/",
    ]
    merged, seen = [], set()
    for url in pages:
        try:
            html = http_get(url).text
            for it in parse_gtabase_listing(html):
                k = norm_url(it["url"])
                if k in seen:
                    continue
                seen.add(k)
                it["rank"] = len(merged) + 1
                merged.append(it)
        except Exception as exc:
            log.error("gtabase %s: %s", url, exc)
    return merged[:JOB_CAP]


def parse_ign_rss(xml_text):
    root = ET.fromstring(xml_text)
    out = []
    for item in root.findall(".//item"):
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        date = parse_http_date(item.findtext("pubDate") or "")
        if not title or not link:
            continue
        if not is_in_scope(f"{title} {link}"):
            continue
        out.append(job_item(title, link, "IGN", updated=date, rank=len(out) + 1))
        if len(out) >= JOB_CAP:
            break
    return out


def ign_link_title(anchor):
    for sel in ("h3", "h2", "h1"):
        el = anchor.select_one(sel)
        if el:
            text = el.get_text(" ", strip=True)
            if len(text) >= 12:
                return text
    return anchor.get_text(" ", strip=True)


def parse_ign_game_page(html, page_url):
    soup = BeautifulSoup(html, "html.parser")
    out, seen = [], set()
    for a in soup.select('a[href*="/articles/"]'):
        href = a.get("href") or ""
        title = clean_heading(ign_link_title(a))
        if len(title) < 12:
            continue
        url = urljoin("https://www.ign.com", href)
        blob = f"{title} {url} {page_url}"
        if not is_in_scope(blob):
            continue
        k = norm_url(url)
        if k in seen:
            continue
        seen.add(k)
        out.append(job_item(title, url, "IGN", detect_game(blob), date_from_title(title), len(out) + 1))
        if len(out) >= JOB_CAP:
            break
    return out


def scrape_ign():
    items, seen = [], set()

    def add(batch):
        for it in batch:
            k = norm_url(it["url"])
            if k in seen:
                continue
            seen.add(k)
            it["rank"] = len(items) + 1
            items.append(it)

    try:
        add(parse_ign_rss(http_get("https://www.ign.com/rss/articles/feed").text))
    except Exception as exc:
        log.error("ign rss: %s", exc)

    for url in (
        "https://www.ign.com/games/grand-theft-auto-v",
        "https://www.ign.com/games/grand-theft-auto-vi",
        "https://www.ign.com/wikis/red-dead-redemption-2",
    ):
        try:
            add(parse_ign_game_page(http_get(url).text, url))
        except Exception as exc:
            log.error("ign page %s: %s", url, exc)
        if len(items) >= JOB_CAP:
            break
    return items[:JOB_CAP]


def parse_wiki_search(payload, source, base):
    out = []
    for hit in (payload.get("query") or {}).get("search") or []:
        title = (hit.get("title") or "").strip()
        if not title:
            continue
        blob = f"{title} {base}"
        if is_gta4(blob) or is_old_gta(blob):
            continue
        if not (is_in_scope(blob) or source.startswith("GTA Wiki") or source.startswith("Red Dead")):
            continue
        if source.startswith("Red Dead") and not re.search(r"online|rdo|multiplayer", title, re.I):
            if title.lower() not in {"red dead online"}:
                continue
        slug = title.replace(" ", "_")
        url = f"{base}/wiki/{slug}" if "/wiki" in base or "fandom.com" in base else f"{base}/w/{slug}"
        if "gta.wiki" in base:
            url = f"https://gta.wiki/w/{slug}"
        ts = parse_http_date(hit.get("timestamp") or "")
        game = detect_game(blob) or ("RDO" if "red dead" in source.lower() else "GTA Online")
        out.append(job_item(title, url, source.split(" /")[0], game, ts, len(out) + 1))
        if len(out) >= JOB_CAP:
            break
    return out


def wiki_search(api, query):
    url = f"{api}?action=query&list=search&srsearch={quote_plus(query)}&srprop=timestamp&format=json"
    return http_get(url).json()


def scrape_wiki():
    items, seen = [], set()

    def add(batch):
        for it in batch:
            k = norm_url(it["url"])
            if k in seen:
                continue
            seen.add(k)
            it["rank"] = len(items) + 1
            items.append(it)

    queries = [
        ("https://gta.wiki/api.php", "https://gta.wiki", "GTA Wiki", "GTA Online weekly"),
        ("https://gta.wiki/api.php", "https://gta.wiki", "GTA Wiki", "Cayo Perico Heist"),
        ("https://gta.wiki/api.php", "https://gta.wiki", "GTA Wiki", "Grand Theft Auto VI"),
        ("https://gta.fandom.com/api.php", "https://gta.fandom.com", "GTA Wiki", "GTA Online"),
        ("https://reddead.fandom.com/api.php", "https://reddead.fandom.com", "Red Dead Wiki", "Red Dead Online"),
    ]
    for api, base, source, q in queries:
        try:
            add(parse_wiki_search(wiki_search(api, q), source, base))
        except Exception as exc:
            log.error("wiki %s %s: %s", source, q, exc)
        if len(items) >= JOB_CAP:
            break
    return items[:JOB_CAP]


def update_jobs():
    for name, fn in (
        ("jobs_gtabase", scrape_gtabase),
        ("jobs_ign", scrape_ign),
        ("jobs_wiki", scrape_wiki),
    ):
        try:
            items = fn()
        except Exception as exc:
            log.error("%s failed: %s", name, exc)
            items = []
        save_or_keep(name, items)


# ---------------------------------------------------------------- YouTube (yt-dlp, no API key)

def yt_flat_search(query, n, sort_by_date=False, flat_limit=None):
    if yt_dlp is None:
        raise RuntimeError("yt_dlp is required for YouTube scrapes")
    if sort_by_date:
        url = f"https://www.youtube.com/results?search_query={quote_plus(query)}&sp=CAI%3D"
    else:
        url = f"ytsearch{n}:{query}"
    opts = {
        "quiet": True,
        "no_warnings": True,
        "extract_flat": True,
        "skip_download": True,
        "socket_timeout": 30,
    }
    if flat_limit:
        opts["playlist_items"] = f"1:{flat_limit}"
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=False)
    out = []
    for e in info.get("entries") or []:
        if not isinstance(e, dict):
            continue
        vid = e.get("id")
        if not vid or len(vid) != 11:
            continue
        out.append({
            "video_id": vid,
            "title": e.get("title") or "",
            "channel": e.get("channel") or e.get("uploader") or "",
            "channel_id": e.get("channel_id") or "",
            "view_count": e.get("view_count"),
            "duration": e.get("duration"),
            "url": f"https://www.youtube.com/watch?v={vid}",
        })
    return out


YDL_FULL = {"quiet": True, "no_warnings": True, "skip_download": True, "socket_timeout": 30}


def yt_rss_latest(channel_id):
    out = []
    try:
        r = http_get(f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}", timeout=15)
        ns = {
            "a": "http://www.w3.org/2005/Atom",
            "yt": "http://www.youtube.com/xml/schemas/2015",
            "m": "http://search.yahoo.com/mrss/",
        }
        for e in ET.fromstring(r.content).findall("a:entry", ns):
            vid = e.findtext("yt:videoId", "", ns)
            title = (e.findtext("a:title", "", ns) or "").strip()
            pub = (e.findtext("a:published", "", ns) or "")[:10]
            views = e.find(".//m:statistics", ns)
            out.append((
                vid,
                title,
                pub,
                int(views.get("views")) if views is not None and views.get("views", "").isdigit() else None,
            ))
    except Exception as exc:
        log.warning("yt rss %s: %s", channel_id[:12], exc)
    return out


def yt_full_info(vid):
    if yt_dlp is None:
        return None, None
    try:
        with yt_dlp.YoutubeDL(YDL_FULL) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={vid}", download=False)
        ud = info.get("upload_date")
        date = f"{ud[:4]}-{ud[4:6]}-{ud[6:8]}" if ud else None
        vc = info.get("view_count")
        return date, vc if isinstance(vc, int) else None
    except Exception as exc:
        log.warning("yt full %s: %s", vid, exc)
        return None, None


def within_cutoff(date_str, cutoff):
    try:
        return bool(date_str) and datetime.strptime(date_str, "%Y-%m-%d").date() >= cutoff
    except ValueError:
        return False


def collect_videos(lang):
    if lang == "zh":
        hot_queries = ["GTA線上 攻略", "GTA Online 賺錢", "俠盜獵車手6"]
        new_queries = ["GTA線上 攻略", "GTA 6"]

        def keep(title):
            return has_cjk(title) and not KANA_RE.search(title) and game_in_title(title)
    elif lang == "ja":
        hot_queries = ["GTAオンライン 金策", "GTA6 攻略"]
        new_queries = ["GTAオンライン"]

        def keep(title):
            return bool(KANA_RE.search(title)) and game_in_title(title)
    else:
        hot_queries = ["GTA Online money guide", "GTA 6 trailer", "Red Dead Online"]
        new_queries = ["GTA Online guide", "GTA 6"]

        def keep(title):
            return (not has_cjk(title)) and game_in_title(title)

    pool_hot, seen = [], set()
    for q in hot_queries:
        try:
            for v in yt_flat_search(q, 25):
                if v["video_id"] in seen or not keep(v["title"]):
                    continue
                seen.add(v["video_id"])
                pool_hot.append(v)
        except Exception as exc:
            log.error("yt hot search [%s] %s: %s", lang, q, exc)

    def to_item(v, date, vc):
        return {
            "id": v["video_id"],
            "video_id": v["video_id"],
            "title": v["title"],
            "channel": v["channel"],
            "url": v["url"],
            "views": vc,
            "date": date,
            "lang": lang,
            "game": detect_game(v["title"]) or "GTA Online",
        }

    pool_new, seen2 = [], set()
    for q in new_queries:
        try:
            for v in yt_flat_search(q, 25, sort_by_date=True, flat_limit=NEW_FLAT_LIMIT):
                if v["video_id"] in seen2 or not keep(v["title"]):
                    continue
                seen2.add(v["video_id"])
                pool_new.append(v)
        except Exception as exc:
            log.error("yt new search [%s] %s: %s", lang, q, exc)

    chans = []
    for v in sorted(pool_hot, key=lambda x: -(x.get("view_count") or 0)):
        cid = v.get("channel_id")
        if cid and cid not in chans:
            chans.append(cid)
    for v in pool_new:
        cid = v.get("channel_id")
        if cid and cid not in chans:
            chans.append(cid)

    rss_map = {}
    for cid in chans[:RSS_CHANNEL_CAP]:
        for vid, title, pub, views in yt_rss_latest(cid):
            if pub and len(pub) == 10:
                rss_map[vid] = {"title": title, "date": pub, "views": views}
        time.sleep(0.3)
    log.info("videos [%s]: %d channels rss -> %d videos", lang, min(len(chans), RSS_CHANNEL_CAP), len(rss_map))

    def pick_hot(pool, top_n):
        cutoff = (datetime.now(timezone.utc) - timedelta(days=HOT_CUTOFF_DAYS)).date()
        chan_of = {v["video_id"]: v["channel"] for v in pool}
        cands = {v["video_id"]: dict(v) for v in pool}
        for vid, info in rss_map.items():
            if vid in cands:
                continue
            if not (within_cutoff(info["date"], cutoff) and keep(info["title"])):
                continue
            cands[vid] = {
                "video_id": vid,
                "title": info["title"],
                "channel": chan_of.get(vid, ""),
                "url": f"https://www.youtube.com/watch?v={vid}",
                "view_count": info["views"],
            }

        known = [v for v in cands.values() if isinstance(v.get("view_count"), int)]
        unknown = [v for v in cands.values() if not isinstance(v.get("view_count"), int)]
        need = max(0, top_n * 2 - len(known))
        for v in unknown[:need]:
            views = (rss_map.get(v["video_id"]) or {}).get("views")
            if not isinstance(views, int):
                _, views = yt_full_info(v["video_id"])
                time.sleep(0.5)
            if isinstance(views, int):
                v["view_count"] = views
                known.append(v)

        out = []
        for v in sorted(known, key=lambda x: -(x["view_count"] or 0)):
            date = (rss_map.get(v["video_id"]) or {}).get("date")
            if not date:
                date, _ = yt_full_info(v["video_id"])
                time.sleep(0.4)
            if not within_cutoff(date, cutoff):
                continue
            out.append(to_item(v, date, v["view_count"]))
            if len(out) >= top_n:
                break
        return out

    def pick_new(pool, top_n):
        cutoff = (datetime.now(timezone.utc) - timedelta(days=NEW_CUTOFF_DAYS)).date()
        chan_of = {v["video_id"]: v["channel"] for v in pool}
        cands = {}
        for vid, info in rss_map.items():
            if not (within_cutoff(info["date"], cutoff) and keep(info["title"])):
                continue
            cands[vid] = to_item(
                {
                    "video_id": vid,
                    "title": info["title"],
                    "channel": chan_of.get(vid, ""),
                    "url": f"https://www.youtube.com/watch?v={vid}",
                },
                info["date"],
                info["views"],
            )
        items = sorted(cands.values(), key=lambda x: x["date"] or "", reverse=True)[:top_n]
        if items:
            return items
        log.warning("videos new [%s]: rss empty, falling back to full-extract scan", lang)
        recent, scanned = [], 0
        for v in pool:
            if len(recent) >= top_n or scanned >= 40:
                break
            scanned += 1
            date, vc = yt_full_info(v["video_id"])
            time.sleep(0.4)
            if within_cutoff(date, cutoff):
                recent.append(to_item(v, date, vc))
        return sorted(recent, key=lambda x: x["date"] or "", reverse=True)

    hot = pick_hot(pool_hot, 10)
    log.info("videos hot [%s]: %d within %dd", lang, len(hot), HOT_CUTOFF_DAYS)
    new = pick_new(pool_new, 10)
    return hot, new


def update_videos():
    cache = load_json("video_dates.json", {})
    for lang in ("zh", "en", "ja"):
        try:
            hot, new = collect_videos(lang)
        except Exception as exc:
            log.exception("videos [%s] crashed: %s", lang, exc)
            continue
        for it in [*hot, *new]:
            vid = it["video_id"]
            if it["date"]:
                cache[vid] = it["date"]
            elif vid in cache:
                it["date"] = cache[vid]
        save_or_keep(f"videos_hot_{lang}", hot, f"videos hot [{lang}]")
        save_or_keep(f"videos_new_{lang}", new, f"videos new [{lang}]")
    save_json("video_dates.json", cache)


def write_sessionscan_slot():
    """Owned channel stays a placeholder. Never invent SessionScan video URLs."""
    slot = {
        "status": "offline",
        "title_zh": "SessionScan 頻道",
        "title_en": "SessionScan channel",
        "note_zh": "自有頻道目前可能離線。此格為預留位置，不會偽造 SessionScan 影片連結。",
        "note_en": "Owned channel may be offline. Placeholder only — no fabricated SessionScan video URLs.",
    }
    save_json("sessionscan_slot.json", slot)
    set_meta("sessionscan_slot")
    save_json(
        "ja_video_note.json",
        {
            "title_zh": "日本語區尚無掃描結果時的索引",
            "title_en": "Japanese index when the scan is empty",
            "body_zh": "此語言若當日沒有通過範圍檢查的影片，改連公開日文攻略索引。不偽造連結。",
            "body_en": "If the Japanese tab has no in-scope videos, link a public index instead.",
            "links": [
                {"title": "GTAオンライン 稼ぎ（atwiki）", "url": "https://w.atwiki.jp/gtav/pages/187.html"},
                {
                    "title": "YouTube 搜尋：GTAオンライン 金策",
                    "url": "https://www.youtube.com/results?search_query=GTA%E3%82%AA%E3%83%B3%E3%83%A9%E3%82%A4%E3%83%B3%20%E9%87%91%E7%AD%96",
                },
            ],
        },
    )


# ---------------------------------------------------------------- Bahamut + Reddit

BAHA_URL = "https://forum.gamer.com.tw/B.php?bsn=4737"
BAHA_BASE = "https://forum.gamer.com.tw/"


def baha_outbound_url(href):
    """Keep real C.php?bsn=&snA= threads; never emit a parameterless C.php."""
    raw = urljoin(BAHA_BASE, (href or "").strip())
    parsed = urlparse(raw)
    host = (parsed.netloc or "").lower()
    if host.startswith("www."):
        host = host[4:]
    if host and "forum.gamer.com.tw" not in host:
        return BAHA_URL
    qs = parse_qs(parsed.query)
    bsn = (qs.get("bsn") or [""])[0]
    sna = (qs.get("snA") or qs.get("sna") or [""])[0]
    path = parsed.path or ""
    if path.endswith("C.php"):
        if bsn and sna:
            return f"https://forum.gamer.com.tw/C.php?bsn={bsn}&snA={sna}"
        return BAHA_URL
    if path.endswith("B.php") and bsn:
        return f"https://forum.gamer.com.tw/B.php?bsn={bsn}"
    return BAHA_URL


def baha_dedup_key(url):
    parsed = urlparse(url or "")
    qs = parse_qs(parsed.query)
    bsn = (qs.get("bsn") or ["4737"])[0]
    sna = (qs.get("snA") or qs.get("sna") or [""])[0]
    if sna:
        return f"c:{bsn}:{sna}"
    return f"b:{bsn}"


def parse_baha_rows(html):
    soup = BeautifulSoup(html, "html.parser")
    items = []
    for row in soup.select("tr.b-list__row"):
        if row.select_one(".b-list__summary__mark"):
            continue
        main_link = row.select_one("td.b-list__main > a[href*='C.php']")
        if not main_link:
            continue
        title_el = row.select_one(".b-list__main__title")
        brief = row.select_one(".b-list__brief")
        num_el = row.select_one(".b-list__count__number span")
        author_el = row.select_one(".b-list__count__user a")
        time_el = row.select_one(".b-list__time__edittime a")
        title = title_el.get_text(" ", strip=True) if title_el else ""
        if is_gta4(title) or is_old_gta(title):
            continue
        items.append({
            "title": title,
            "url": baha_outbound_url(main_link.get("href", "")),
            "author": author_el.get_text(strip=True) if author_el else "",
            "replies": num_el.get_text(strip=True) if num_el else "",
            "time": time_el.get_text(strip=True) if time_el else "",
            "snippet": (brief.get_text(" ", strip=True)[:120] if brief else ""),
        })
    return items


def fetch_bahamut_html():
    try:
        return http_get(BAHA_URL, timeout=20).text
    except Exception as exc:
        log.warning("bahamut requests failed: %s", exc)
    try:
        import cloudscraper

        s = cloudscraper.create_scraper(browser={"browser": "firefox", "platform": "linux", "desktop": True})
        r = s.get(BAHA_URL, timeout=40)
        r.raise_for_status()
        return r.text
    except Exception as exc:
        log.error("bahamut cloudscraper failed: %s", exc)
        raise


def scrape_bahamut_ddgs():
    items, seen = [], set()
    queries = (
        "GTA Online site:forum.gamer.com.tw/C.php",
        "GTA 6 site:forum.gamer.com.tw/C.php",
    )
    with DDGS() as d:
        for q in queries:
            try:
                results = list(d.text(q, region="tw-zh", max_results=10))
            except Exception as exc:
                log.warning("bahamut ddgs %s: %s", q, exc)
                continue
            for r in results:
                href = r.get("href") or ""
                title = clean_heading(r.get("title") or "")
                if "forum.gamer.com.tw" not in href:
                    continue
                if "C.php" not in href and "B.php" not in href:
                    continue
                if is_gta4(title) or is_old_gta(title):
                    continue
                url = baha_outbound_url(href)
                k = baha_dedup_key(url)
                if k in seen or len(title) < 6:
                    continue
                seen.add(k)
                items.append({
                    "id": md5_id(k),
                    "rank": len(items) + 1,
                    "title": title,
                    "author": "巴哈姆特",
                    "time": now_str()[:10],
                    "replies": None,
                    "source": "Bahamut",
                    "game": detect_game(title) or "GTA Online",
                    "url": url,
                    "blurb": "外連巴哈討論串。不轉載全文。",
                })
                if len(items) >= FORUM_CAP:
                    return items
    return items


def scrape_bahamut():
    try:
        html = fetch_bahamut_html()
        rows = parse_baha_rows(html)
    except Exception as exc:
        log.error("bahamut html: %s", exc)
        rows = []
    items, seen = [], set()
    for it in rows:
        url = baha_outbound_url(it["url"])
        k = baha_dedup_key(url)
        if k in seen:
            continue
        seen.add(k)
        items.append({
            "id": md5_id(k),
            "rank": len(items) + 1,
            "title": it["title"],
            "author": it["author"],
            "time": it["time"],
            "replies": it["replies"] or None,
            "source": "Bahamut",
            "game": detect_game(it["title"]) or "GTA Online",
            "url": url,
            "blurb": "外連巴哈討論串。不轉載全文。",
        })
        if len(items) >= FORUM_CAP:
            break
    if items:
        return items
    log.warning("bahamut html empty, trying ddgs outbound cards")
    return scrape_bahamut_ddgs()


def parse_reddit_atom(xml_text, source_name, game):
    root = ET.fromstring(xml_text)
    ns = {"a": "http://www.w3.org/2005/Atom"}
    items = []
    for entry in root.findall("a:entry", ns):
        title = (entry.findtext("a:title", "", ns) or "").strip()
        link_el = entry.find("a:link", ns)
        url = (link_el.get("href") if link_el is not None else "") or ""
        date = parse_http_date(entry.findtext("a:updated", "", ns) or entry.findtext("a:published", "", ns) or "")
        author = (entry.findtext("a:author/a:name", "", ns) or "").replace("/u/", "")
        if not title or not url:
            continue
        if title.lower() in {"community hub"}:
            continue
        if is_gta4(title) or is_old_gta(title):
            continue
        items.append({
            "id": md5_id(norm_url(url)),
            "rank": 0,
            "title": title,
            "author": author or source_name,
            "time": date or "",
            "replies": None,
            "source": "Reddit",
            "game": game,
            "url": url,
            "blurb": "Outbound to Reddit. Title and date only.",
        })
    items.sort(key=lambda x: x.get("time") or "", reverse=True)
    for i, it in enumerate(items[:FORUM_CAP], 1):
        it["rank"] = i
    return items[:FORUM_CAP]


def scrape_reddit():
    feeds = (
        ("https://www.reddit.com/r/gtaonline.rss", "r/gtaonline", "GTA Online"),
        ("https://www.reddit.com/r/GTA6.rss", "r/GTA6", "GTA 6"),
    )
    items, seen = [], set()
    for url, name, game in feeds:
        try:
            time.sleep(1.2)
            xml = http_get(url, headers=REDDIT_UA, timeout=20).text
            for it in parse_reddit_atom(xml, name, game):
                k = norm_url(it["url"])
                if k in seen:
                    continue
                seen.add(k)
                it["rank"] = len(items) + 1
                items.append(it)
        except Exception as exc:
            log.error("reddit %s: %s", name, exc)
    if items:
        return items[:FORUM_CAP]
    log.warning("reddit rss empty, trying ddgs site:reddit.com")
    try:
        with DDGS() as d:
            for r in d.text("Weekly Bonuses site:reddit.com/r/gtaonline", region="us-en", max_results=8):
                href = r.get("href") or ""
                title = html_lib.unescape((r.get("title") or "").strip())
                if "reddit.com/r/" not in href or not title:
                    continue
                k = norm_url(href)
                if k in seen or is_gta4(title):
                    continue
                seen.add(k)
                items.append({
                    "id": md5_id(k),
                    "rank": len(items) + 1,
                    "title": title,
                    "author": "r/gtaonline",
                    "time": now_str()[:10],
                    "replies": None,
                    "source": "Reddit",
                    "game": detect_game(title) or "GTA Online",
                    "url": href,
                    "blurb": "Outbound to Reddit. Title and date only.",
                })
    except Exception as exc:
        log.error("reddit ddgs: %s", exc)
    return items[:FORUM_CAP]


def update_forum():
    try:
        save_or_keep("forum_bahamut", scrape_bahamut(), "bahamut")
    except Exception as exc:
        log.error("bahamut failed: %s", exc)
        save_or_keep("forum_bahamut", [], "bahamut")
    try:
        save_or_keep("forum_reddit", scrape_reddit(), "reddit")
    except Exception as exc:
        log.error("reddit failed: %s", exc)
        save_or_keep("forum_reddit", [], "reddit")


# ---------------------------------------------------------------- X / Twitter (ddgs + syndication, no API key)

def snowflake_date(tid):
    ts = (int(tid) >> 22) + 1288834974657
    return datetime.fromtimestamp(ts / 1000, tz=timezone.utc).strftime("%Y-%m-%d")


def x_timeline(screen_name):
    try:
        r = http_get(SYND_URL.format(screen_name), timeout=20)
        data = json.loads(r.text.split(SYND_MARKER, 1)[1].split("</script>", 1)[0])
        entries = data["props"]["pageProps"]["timeline"]["entries"]
        out = []
        for e in entries:
            tw = e.get("content", {}).get("tweet", {})
            tid = tw.get("id_str") or ""
            text = (tw.get("full_text") or "").strip()
            likes = tw.get("favorite_count")
            if not tid or not text:
                continue
            out.append({
                "tid": tid,
                "author": screen_name,
                "author_name": (tw.get("user", {}) or {}).get("name") or "",
                "text": text,
                "likes": likes if isinstance(likes, int) else None,
                "date": snowflake_date(tid),
            })
        return out
    except Exception as exc:
        log.warning("x timeline %s: %s", screen_name, exc)
        return []


def tweet_item(t):
    url = f"https://x.com/{t['author']}/status/{t['tid']}"
    text = t.get("text") or ""
    return {
        "id": md5_id(url),
        "tid": t["tid"],
        "url": url,
        "author": t["author"],
        "author_name": t.get("author_name") or "",
        "text": text,
        "date": t.get("date") or snowflake_date(t["tid"]),
        "likes": t.get("likes"),
        "lang": detect_lang(text),
        "game": detect_game(text) or "GTA 6",
    }


def update_tweets():
    pool = {}
    for lang in ("zh", "en"):
        for it in load_json(f"tweets_{lang}.json", []):
            if isinstance(it.get("tid"), str) and it["tid"].isdigit():
                pool[it["tid"]] = it

    added = 0

    def merge(t):
        nonlocal added
        blob = f"{t.get('text', '')} {t.get('author', '')}"
        if is_gta4(blob) or is_old_gta(blob):
            return
        if not (game_in_title(blob) or t.get("author", "").lower() in {"rockstargames", "gtaonline"}):
            return
        if t["tid"] not in pool:
            added += 1
        pool[t["tid"]] = tweet_item(t)

    with DDGS() as d:
        for qkey, (q, region) in X_SEARCH_QUERIES.items():
            try:
                results = list(d.text(q, region=region, max_results=20))
            except Exception as exc:
                log.warning("ddgs x %s %s: %s", qkey, q, exc)
                continue
            for r in results:
                m = STATUS_RE.search(r.get("href") or "")
                if not m:
                    continue
                title = html_lib.unescape((r.get("title") or "").strip())
                body = html_lib.unescape((r.get("body") or "").strip())
                disp, _, rest = title.partition(" on X:")
                text = rest.strip()
                if text.endswith("/ X"):
                    text = text[:-3].strip()
                if len(text) >= 2 and text.startswith('"') and text.endswith('"'):
                    text = text[1:-1].strip()
                if not text:
                    text = body
                text = clean_tweet_text(text)
                if not text:
                    continue
                merge({
                    "tid": m.group(2),
                    "author": m.group(1).lower(),
                    "author_name": disp.strip(),
                    "text": text,
                })
            time.sleep(1.5)

    for sn in X_OFFICIAL_ACCOUNTS:
        for t in x_timeline(sn):
            merge(t)

    buckets = {"zh": [], "en": []}
    for it in pool.values():
        lang = it.get("lang") if it.get("lang") in buckets else detect_lang(it.get("text") or "")
        if lang not in buckets:
            lang = "en"
        buckets[lang].append(it)

    wrote = False
    for lang, bucket in buckets.items():
        bucket.sort(key=lambda x: ((x.get("date") or ""), (x.get("likes") or 0)), reverse=True)
        bucket = bucket[:TWEET_CAP]
        if save_or_keep(f"tweets_{lang}", bucket, f"tweets [{lang}]"):
            wrote = True
    if wrote:
        set_meta("tweets")
    log.info("tweets: +%d -> zh=%d en=%d", added, len(buckets["zh"]), len(buckets["en"]))


def finalize_meta(failures):
    meta = load_json("meta.json", {})
    meta["_last_run"] = now_str()
    meta["generated_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    meta["sample"] = False
    meta["scraper_status"] = "partial" if failures else "ok"
    meta["label_zh"] = "資料快照"
    meta["label_en"] = "SNAPSHOT"
    meta["note_zh"] = "公開來源標題彙整，不是即時爬蟲。來源失敗時保留既有檔，不覆寫成空。"
    meta["note_en"] = "Public outbound titles only — not a live scrape. On source failure, keep yesterday — never overwrite with empty."
    meta["scope"] = ["GTA 5", "GTA Online", "RDO", "GTA 6"]
    meta["excluded"] = ["GTA 4"]
    for alias, keys in (
        ("jobs", ["jobs_gtabase", "jobs_ign", "jobs_wiki"]),
        ("hot", ["videos_hot_zh", "videos_hot_en", "videos_hot_ja"]),
        ("new", ["videos_new_zh", "videos_new_en", "videos_new_ja"]),
        ("forum", ["forum_bahamut", "forum_reddit"]),
        ("tweets", ["tweets_zh", "tweets_en"]),
    ):
        times = [meta[k] for k in keys if meta.get(k)]
        if times:
            meta[alias] = sorted(times)[-1]
    save_json("meta.json", meta)


def main():
    started = time.time()
    log.info("=" * 50)
    write_sessionscan_slot()
    steps = [
        ("jobs", update_jobs),
        ("videos", update_videos),
        ("forum", update_forum),
        ("tweets", update_tweets),
    ]
    failures = []
    for name, fn in steps:
        try:
            fn()
        except Exception as exc:
            log.exception("%s crashed: %s", name, exc)
            failures.append(name)
    finalize_meta(failures)
    log.info("done in %.1fs%s", time.time() - started, f" | FAILED: {failures}" if failures else "")


if __name__ == "__main__":
    main()
