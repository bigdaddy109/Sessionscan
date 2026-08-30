#!/usr/bin/env python3
"""Local search aliases and live-data honesty checks (no network)."""
import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

SEARCH_ALIAS_GROUPS = [
    [
        "cayo perico",
        "cayo",
        "perico",
        "佩里克島",
        "佩里克",
        "佩裏科島",
        "佩裏科",
        "佩裡科島",
        "佩裡科",
    ],
    ["gta 6", "gta6", "gta vi", "gta vi.", "俠盜獵車手6", "俠盜獵車手 vi"],
    ["weekly", "本週獎勵", "每週"],
    ["ceo", "總裁", "辦公室"],
    ["autoshop", "改車廠"],
    ["diamond", "賭場", "賭場豪劫"],
]


def query_words(raw: str) -> list[str]:
    q = str(raw or "").strip().lower()
    if not q:
        return []
    for group in SEARCH_ALIAS_GROUPS:
        if any(t.lower() == q for t in group):
            return [q]
    return [w for w in q.split() if w]


def alias_terms_for(word: str) -> list[str]:
    w = str(word or "").lower()
    if not w:
        return []
    tiny = len(w) < 3 or bool(re.fullmatch(r"vi\.?", w))
    for group in SEARCH_ALIAS_GROUPS:
        lower = [t.lower() for t in group]
        hit = any(t == w or (not tiny and (t in w or w in t)) for t in lower)
        if hit:
            return lower
    return [w]


def term_in_hay(term: str, hay: str) -> bool:
    if len(term) < 3:
        return bool(re.search(rf"(?<![a-z0-9]){re.escape(term)}(?![a-z0-9])", hay))
    return term in hay


def matches(item: dict, keys: list[str], words: list[str]) -> bool:
    parts = []
    for k in keys:
        v = item.get(k)
        if isinstance(v, list):
            parts.append(" ".join(str(x) for x in v))
        else:
            parts.append("" if v is None else str(v))
    hay = " ".join(parts).lower()
    return all(any(term_in_hay(term, hay) for term in alias_terms_for(w)) for w in words)


class SearchAliasTests(unittest.TestCase):
    def test_cayo_spellings_match_live_card(self):
        site = json.loads((ROOT / "public" / "data" / "site.json").read_text(encoding="utf-8"))
        videos = (site.get("videos_hot_zh") or []) + (site.get("videos_new_zh") or [])
        jobs = (site.get("jobs_wiki") or []) + (site.get("jobs_gtabase") or [])
        pool = videos + jobs
        keys = ["title", "channel", "game", "lang", "title_en", "url"]
        cayo = [v for v in pool if "Cayo" in str(v.get("title", "")) or "佩裏科" in str(v.get("title", ""))]
        self.assertTrue(cayo, "live site.json must keep a Cayo money card")
        for query in ("佩里克島", "佩里克", "佩裏科", "佩裡科", "Cayo", "Cayo Perico"):
            words = query.lower().split()
            self.assertTrue(
                any(matches(v, keys, words) for v in pool),
                f"{query!r} should hit the Cayo card",
            )

    def test_live_jobs_are_not_the_old_three_card_sample(self):
        site = json.loads((ROOT / "public" / "data" / "site.json").read_text(encoding="utf-8"))
        jobs = site.get("jobs_gtabase") or []
        self.assertGreaterEqual(len(jobs), 1)
        ja = site.get("videos_hot_ja") or []
        self.assertGreater(len(ja), 0)
        for key in ("jobs_gtabase", "jobs_ign", "jobs_wiki"):
            for it in site.get(key) or []:
                blob = f"{it.get('title', '')} {it.get('url', '')}"
                self.assertNotRegex(blob, r"extended look|internet reacts|pc version", msg=blob)

    def test_zh_tweet_empty_state_copy(self):
        chrome = (ROOT / "src" / "main.js").read_text(encoding="utf-8")
        self.assertIn("今日無中文訊號", chrome)

    def test_snapshot_copy_is_not_last_scan(self):
        site = json.loads((ROOT / "public" / "data" / "site.json").read_text(encoding="utf-8"))
        meta = site["meta"]
        self.assertEqual(meta["label_zh"], "資料快照")
        self.assertEqual(meta["label_en"], "SNAPSHOT")
        self.assertIn("不是即時爬蟲", meta["note_zh"])
        chrome = (ROOT / "src" / "main.js").read_text(encoding="utf-8")
        self.assertNotIn("上次掃描", chrome)
        self.assertNotIn("LAST SCAN", chrome)

    def test_notice_and_license_ship_in_public(self):
        self.assertTrue((ROOT / "public" / "LICENSE").is_file())
        self.assertTrue((ROOT / "public" / "NOTICE").is_file())
        self.assertGreater((ROOT / "public" / "LICENSE").stat().st_size, 100)

    def test_basic_seo_meta_and_public_files(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn('lang="zh-Hant"', html)
        self.assertIn("SessionScan｜GTA 5／Online／GTA 6 情報站", html)
        self.assertIn("彙整本週賺錢、攻略影片、論壇與 X 訊號", html)
        self.assertNotIn("範例資料，非即時掃描", html)
        self.assertNotIn("domain TBD", html)
        self.assertNotIn("working title", html)
        self.assertNotIn("EXAMPLE DATA", html)
        self.assertNotIn("爬蟲狀態：未啟用", html)
        self.assertNotIn("第一版靜態殼", html)
        self.assertNotIn("範例快照：2026-08-27", html)
        self.assertIn("載入中 / LOADING", html)
        self.assertIn("快照載入中", html)
        self.assertIn("https://www.youtube.com/@sessionscan", html.split("<main", 1)[0])
        self.assertIn(
            '<meta name="google-site-verification" content="1vNfyIHQDXh7CFm1hJ4vwXn8XhPCf_FTmqVBcM579vo" />',
            html,
        )
        self.assertIn('rel="canonical" href="https://bigdaddy109.github.io/Sessionscan/"', html)
        self.assertIn('property="og:url" content="https://bigdaddy109.github.io/Sessionscan/"', html)
        self.assertIn('property="og:image" content="https://bigdaddy109.github.io/Sessionscan/og.png"', html)
        self.assertIn('name="twitter:image" content="https://bigdaddy109.github.io/Sessionscan/og.png"', html)
        self.assertIn('name="twitter:card" content="summary_large_image"', html)
        self.assertTrue((ROOT / "public" / "og.png").is_file())
        self.assertGreater((ROOT / "public" / "og.png").stat().st_size, 10000)
        robots = (ROOT / "public" / "robots.txt").read_text(encoding="utf-8")
        self.assertIn("Allow: /", robots)
        self.assertIn("https://bigdaddy109.github.io/Sessionscan/sitemap.xml", robots)
        sitemap = (ROOT / "public" / "sitemap.xml").read_text(encoding="utf-8")
        self.assertIn("<loc>https://bigdaddy109.github.io/Sessionscan/</loc>", sitemap)
        self.assertGreater((ROOT / "public" / "NOTICE").stat().st_size, 50)

    def test_live_ign_titles_have_no_recency_crumbs(self):
        site = json.loads((ROOT / "public" / "data" / "site.json").read_text(encoding="utf-8"))
        titles = [it.get("title", "") for it in (site.get("jobs_ign") or [])]
        for title in titles:
            self.assertNotRegex(title, r"\b\d+\s*[smhdwy]\s+ago\b", msg=title)
            self.assertNotIn("Cade Onder", title)
            self.assertRegex(title, r"Online|weekly|bonus|money|獎勵|賺錢|每週", msg=title)

    def test_live_scope_has_no_rdo(self):
        site = json.loads((ROOT / "public" / "data" / "site.json").read_text(encoding="utf-8"))
        self.assertNotIn("RDO", site["meta"].get("scope") or [])
        self.assertIn("RDO", site["meta"].get("excluded") or [])
        for key, rows in site.items():
            if not isinstance(rows, list):
                continue
            for it in rows:
                if not isinstance(it, dict):
                    continue
                self.assertNotEqual(it.get("game"), "RDO", key)
                tags = [str(t).upper() for t in (it.get("tags") or [])]
                self.assertNotIn("RDO", tags, key)

    def test_owned_short_is_searchable_and_not_offline(self):
        site = json.loads((ROOT / "public" / "data" / "site.json").read_text(encoding="utf-8"))
        slot = site["sessionscan_slot"]
        self.assertEqual(slot.get("status"), "online")
        self.assertNotEqual(slot.get("status"), "offline")
        short = slot.get("short") or {}
        vid = short.get("video_id") or ""
        self.assertEqual(len(vid), 11)
        self.assertTrue(str(short.get("url", "")).startswith("https://www.youtube.com/shorts/"))
        others = site.get("videos_shorts") or []
        self.assertGreaterEqual(len(others), 1)
        self.assertNotIn(vid, [v.get("video_id") for v in others])
        hay = f"{short.get('channel','')} {short.get('title','')}".lower()
        self.assertIn("sessionscan", hay)

    def test_new_search_alias_groups(self):
        pairs = (
            ("gta6", "俠盜獵車手6"),
            ("gta vi", "gta6"),
            ("gta vi.", "gta 6"),
            ("俠盜獵車手 vi", "gta6"),
            ("weekly", "本週獎勵"),
            ("每週", "weekly"),
            ("ceo", "總裁"),
            ("辦公室", "ceo"),
            ("autoshop", "改車廠"),
            ("diamond", "賭場豪劫"),
            ("賭場", "diamond"),
        )
        for a, b in pairs:
            self.assertEqual(
                set(alias_terms_for(a)),
                set(alias_terms_for(b)),
                f"{a!r} and {b!r} should share an alias group",
            )
        self.assertEqual(alias_terms_for("vi"), ["vi"])
        self.assertNotEqual(set(alias_terms_for("vi")), set(alias_terms_for("gta 6")))
        video_card = {"title": "Weekly GTA 6 trailer video"}
        self.assertTrue(matches(video_card, ["title"], query_words("gta6")))
        self.assertTrue(matches(video_card, ["title"], query_words("gta vi")))
        self.assertTrue(matches(video_card, ["title"], query_words("俠盜獵車手6")))
        self.assertFalse(matches(video_card, ["title"], query_words("vi")))
        site = json.loads((ROOT / "public" / "data" / "site.json").read_text(encoding="utf-8"))
        jobs = (site.get("jobs_gtabase") or []) + (site.get("jobs_wiki") or [])
        videos = (site.get("videos_hot_zh") or []) + (site.get("videos_hot_en") or [])
        tweets = (site.get("tweets_zh") or []) + (site.get("tweets_en") or [])
        self.assertTrue(any(matches(it, ["title", "title_en"], ["weekly"]) for it in jobs))
        self.assertTrue(any(matches(it, ["title", "channel"], ["gta6"]) for it in videos + tweets + jobs))
        self.assertTrue(any(matches(it, ["title", "title_en", "text"], query_words("俠盜獵車手6")) for it in videos + tweets + jobs))

    def test_placeholder_handle_forbidden_in_shipped_data(self):
        needle = "userHandle"
        shipped = [
            ROOT / "data" / "tweets_zh.json",
            ROOT / "data" / "tweets_en.json",
            ROOT / "public" / "data" / "site.json",
            ROOT / "scraper.py",
            ROOT / "src" / "main.js",
        ]
        for path in shipped:
            self.assertNotIn(needle, path.read_text(encoding="utf-8"), str(path))
        js = (ROOT / "src" / "main.js").read_text(encoding="utf-8")
        self.assertIn("帳號未解析", js)
        self.assertIn("usableZhTweet", js)

    def test_p0p1_chrome_and_no_magic_short_id(self):
        js = (ROOT / "src" / "main.js").read_text(encoding="utf-8")
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        magic = "EACO" + "WE6cHCI"
        self.assertNotIn(magic, js)
        self.assertNotIn(magic, html)
        self.assertIn("TAB_TO_HASH", js)
        self.assertIn('shorts: "new"', js)
        self.assertIn("location.hash", js)
        self.assertIn("此來源暫停", js)
        self.assertNotIn(magic, (ROOT / "scraper.py").read_text(encoding="utf-8"))

    def test_p2_official_banner_owned_embed_and_og(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        js = (ROOT / "src" / "main.js").read_text(encoding="utf-8")
        self.assertIn('id="officialBanner"', html)
        self.assertIn("本週官方訊號待下次掃描", html)
        self.assertIn("快照、非即時", html)
        self.assertIn("pickOfficialWeekly", js)
        self.assertIn("renderOfficialBanner", js)
        self.assertIn("youtube-nocookie.com/embed/", js)
        self.assertIn("本週尚無 Short", js)
        self.assertIn("i.ytimg.com/vi/", js)
        owned = js.split("function sessionScanSlot", 1)[1].split("function jaNote", 1)[0]
        others = js.split("function videoCard", 1)[1].split("function sessionScanSlot", 1)[0]
        self.assertIn("youtube-nocookie.com/embed/", owned)
        self.assertNotIn("youtube-nocookie.com/embed/", others)
        self.assertIn("i.ytimg.com/vi/", others)
        self.assertIn('content="https://bigdaddy109.github.io/Sessionscan/og.png"', html)
        self.assertTrue((ROOT / "public" / "og.png").is_file())

    def test_live_bahamut_never_uses_bare_cphp(self):
        site = json.loads((ROOT / "public" / "data" / "site.json").read_text(encoding="utf-8"))
        for it in site.get("forum_bahamut") or []:
            url = it.get("url") or ""
            self.assertNotEqual(url.rstrip("/"), "https://forum.gamer.com.tw/C.php")
            self.assertTrue("bsn=" in url, url)


if __name__ == "__main__":
    unittest.main()
