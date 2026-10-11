#!/usr/bin/env python3
"""Local search aliases and live-data honesty checks (no network)."""
import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
# Live scrape JSON lives on the `data` branch. Tests use this fixture (or sample.json).
HUB_JSON = ROOT / "tests" / "fixtures" / "hub.json"
SAMPLE_JSON = ROOT / "public" / "data" / "sample.json"


def load_hub() -> dict:
    path = HUB_JSON if HUB_JSON.is_file() else SAMPLE_JSON
    return json.loads(path.read_text(encoding="utf-8"))

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
    ["chinese", "中文", "zh", "繁體", "繁体"],
    ["english", "英文", "en", "英語"],
    ["japanese", "日本語", "日文", "ja", "日語"],
    ["korean", "韓文", "ko", "韓語", "한국어"],
    ["bahamut", "巴哈", "巴哈姆特"],
    ["shorts", "短片", "當紅"],
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


LANG_SEARCH_ALIASES = {
    "zh": ["zh", "中文", "chinese", "繁體", "繁体", "國語"],
    "en": ["en", "english", "英文", "英語"],
    "ja": ["ja", "日本語", "japanese", "日文", "日語"],
    "ko": ["ko", "韓文", "korean", "한국어", "韓語"],
}


def matches(item: dict, keys: list[str], words: list[str]) -> bool:
    parts = []
    for k in keys:
        v = item.get(k)
        if isinstance(v, list):
            parts.append(" ".join(str(x) for x in v))
        else:
            parts.append("" if v is None else str(v))
    lang = item.get("lang")
    if lang in LANG_SEARCH_ALIASES:
        parts.append(" ".join(LANG_SEARCH_ALIASES[lang]))
    hay = " ".join(parts).lower()
    return all(any(term_in_hay(term, hay) for term in alias_terms_for(w)) for w in words)


class SearchAliasTests(unittest.TestCase):
    def test_cayo_spellings_match_live_card(self):
        site = load_hub()
        videos = (site.get("videos_hot_zh") or []) + (site.get("videos_new_zh") or [])
        jobs = (site.get("jobs_wiki") or []) + (site.get("jobs_gtabase") or [])
        pool = videos + jobs
        keys = ["title", "channel", "game", "lang", "title_en", "url"]
        cayo = [v for v in pool if "Cayo" in str(v.get("title", "")) or "佩里" in str(v.get("title", ""))]
        self.assertTrue(cayo, "hub fixture must keep a Cayo money card")
        for query in ("佩里克島", "佩里克", "佩裏科", "佩裡科", "Cayo", "Cayo Perico"):
            words = query.lower().split()
            self.assertTrue(
                any(matches(v, keys, words) for v in pool),
                f"{query!r} should hit the Cayo card",
            )

    def test_hub_jobs_have_outbound_schema(self):
        site = load_hub()
        jobs = site.get("jobs_gtabase") or []
        self.assertGreaterEqual(len(jobs), 1)
        for key in ("jobs_gtabase", "jobs_ign", "jobs_wiki"):
            for it in site.get(key) or []:
                self.assertTrue(it.get("title"))
                self.assertTrue(str(it.get("url") or "").startswith("http"))
                self.assertIn(it.get("game"), {"GTA 5", "GTA Online", "GTA 6"})
                blob = f"{it.get('title', '')} {it.get('url', '')}"
                self.assertNotRegex(blob, r"extended look|internet reacts|pc version", msg=blob)

    def test_zh_tweet_empty_state_copy(self):
        chrome = (ROOT / "src" / "i18n.js").read_text(encoding="utf-8")
        self.assertIn("今日無中文訊號", chrome)
        self.assertIn("No Chinese signals today", chrome)

    def test_snapshot_copy_is_not_last_scan(self):
        site = load_hub()
        meta = site["meta"]
        self.assertEqual(meta["label_zh"], "資料快照")
        self.assertEqual(meta["label_en"], "SNAPSHOT")
        self.assertIn("不是即時爬蟲", meta["note_zh"])
        chrome = (ROOT / "src" / "main.js").read_text(encoding="utf-8") + (ROOT / "src" / "i18n.js").read_text(encoding="utf-8")
        self.assertNotIn("上次掃描", chrome)
        self.assertNotIn("LAST SCAN", chrome)

    def test_notice_and_license_ship_in_public(self):
        self.assertTrue((ROOT / "public" / "LICENSE").is_file())
        self.assertTrue((ROOT / "public" / "NOTICE").is_file())
        self.assertGreater((ROOT / "public" / "LICENSE").stat().st_size, 100)

    def test_basic_seo_meta_and_public_files(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        i18n = (ROOT / "src" / "i18n.js").read_text(encoding="utf-8")
        self.assertIn('lang="en"', html)
        self.assertIn('data-ui-lang="en"', html)
        self.assertIn("<title data-i18n=\"metaTitle\">SessionScan GTA</title>", html)
        self.assertIn('property="og:title" data-i18n-content="metaTitle" content="SessionScan GTA"', html)
        self.assertIn('name="twitter:title" data-i18n-content="metaTitle" content="SessionScan GTA"', html)
        self.assertIn("GTA HUB", html)
        self.assertNotIn("GTA HUB · 夜掃描", html)
        self.assertIn("GTA 5 / Online / GTA 6 hub, unrelated to other apps of the same name", html)
        self.assertIn("This week's signals, outbound titles only", html)
        self.assertIn('hreflang="zh-Hant"', html)
        self.assertIn('hreflang="x-default"', html)
        self.assertIn("https://sessionscan.net/zh/", html)
        self.assertIn("SessionScan GTA｜夜掃描", i18n)
        self.assertIn("本週訊號、只掛標題外連，不轉載", i18n)
        self.assertNotIn("範例資料，非即時掃描", html)
        self.assertNotIn("domain TBD", html)
        self.assertNotIn("working title", html)
        self.assertNotIn("EXAMPLE DATA", html)
        self.assertNotIn("爬蟲狀態：未啟用", html)
        self.assertNotIn("第一版靜態殼", html)
        self.assertNotIn("範例快照：2026-08-27", html)
        self.assertIn("LOADING", html)
        self.assertIn("Loading snapshot", html)
        self.assertNotIn("載入中 / LOADING", html)
        self.assertNotIn("掃描 SCAN", html)
        self.assertIn("https://www.youtube.com/@sessionscan", html.split("<main", 1)[0])
        self.assertIn(
            '<meta name="google-site-verification" content="1vNfyIHQDXh7CFm1hJ4vwXn8XhPCf_FTmqVBcM579vo" />',
            html,
        )
        self.assertIn('rel="canonical" href="https://sessionscan.net/"', html)
        self.assertIn('property="og:url" content="https://sessionscan.net/"', html)
        self.assertIn('property="og:image" content="https://sessionscan.net/og.jpg"', html)
        self.assertIn('name="twitter:image" content="https://sessionscan.net/og.jpg"', html)
        self.assertIn('name="twitter:card" content="summary_large_image"', html)
        og = ROOT / "public" / "og.jpg"
        self.assertTrue(og.is_file())
        self.assertGreater(og.stat().st_size, 10000)
        self.assertLessEqual(og.stat().st_size, 300 * 1024)
        robots = (ROOT / "public" / "robots.txt").read_text(encoding="utf-8")
        self.assertIn("Allow: /", robots)
        self.assertIn("https://sessionscan.net/sitemap.xml", robots)
        sitemap = (ROOT / "public" / "sitemap.xml").read_text(encoding="utf-8")
        self.assertIn("<loc>https://sessionscan.net/</loc>", sitemap)
        self.assertIn("<loc>https://sessionscan.net/zh/</loc>", sitemap)
        self.assertIn('hreflang="zh-Hant"', sitemap)
        self.assertIn('xmlns:xhtml="http://www.w3.org/1999/xhtml"', sitemap)
        cname = (ROOT / "public" / "CNAME").read_text(encoding="utf-8").strip()
        self.assertEqual(cname, "sessionscan.net")
        self.assertEqual((ROOT / "CNAME").read_text(encoding="utf-8").strip(), "sessionscan.net")
        self.assertGreater((ROOT / "public" / "NOTICE").stat().st_size, 50)

    def test_live_ign_titles_have_no_recency_crumbs(self):
        site = load_hub()
        titles = [it.get("title", "") for it in (site.get("jobs_ign") or [])]
        for title in titles:
            self.assertNotRegex(title, r"\b\d+\s*[smhdwy]\s+ago\b", msg=title)
            self.assertNotIn("Cade Onder", title)
            self.assertRegex(title, r"Online|weekly|bonus|money|獎勵|賺錢|每週", msg=title)

    def test_live_scope_has_no_rdo(self):
        site = load_hub()
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
        site = load_hub()
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
        site = load_hub()
        jobs = (site.get("jobs_gtabase") or []) + (site.get("jobs_wiki") or [])
        videos = (site.get("videos_hot_zh") or []) + (site.get("videos_hot_en") or [])
        tweets = (site.get("tweets_zh") or []) + (site.get("tweets_en") or [])
        self.assertTrue(any(matches(it, ["title", "title_en"], ["weekly"]) for it in jobs))
        self.assertTrue(any(matches(it, ["title", "channel"], ["gta6"]) for it in videos + tweets + jobs))
        self.assertTrue(any(matches(it, ["title", "title_en", "text"], query_words("俠盜獵車手6")) for it in videos + tweets + jobs))
        self.assertEqual(set(alias_terms_for("中文")), set(alias_terms_for("chinese")))
        self.assertEqual(set(alias_terms_for("bahamut")), set(alias_terms_for("巴哈")))
        zh_video = {"title": "Cayo guide", "lang": "zh"}
        self.assertTrue(matches(zh_video, ["title", "lang"], query_words("中文")))
        self.assertTrue(matches(zh_video, ["title", "lang"], query_words("Chinese")))
        self.assertTrue(matches({"title": "Guide", "lang": "en"}, ["title", "lang"], query_words("英文")))

    def test_placeholder_handle_forbidden_in_shipped_data(self):
        needle = "userHandle"
        shipped = [
            HUB_JSON,
            SAMPLE_JSON,
            ROOT / "scraper.py",
            ROOT / "src" / "main.js",
        ]
        for path in shipped:
            self.assertNotIn(needle, path.read_text(encoding="utf-8"), str(path))
        js = (ROOT / "src" / "main.js").read_text(encoding="utf-8")
        i18n = (ROOT / "src" / "i18n.js").read_text(encoding="utf-8")
        self.assertIn("帳號未解析", i18n)
        self.assertIn("Account not resolved", i18n)
        self.assertIn("usableZhTweet", js)

    def test_header_search_form_exists(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn('id="searchForm"', html)
        self.assertIn('role="search"', html)
        self.assertIn('id="searchInput"', html)
        self.assertIn('name="q"', html)
        self.assertIn('type="search"', html)
        self.assertIn('for="searchInput"', html)
        js = (ROOT / "src" / "main.js").read_text(encoding="utf-8")
        self.assertIn("setSearchExpanded", js)
        self.assertIn('q=', js)

    def test_collapsed_scan_pill_and_channel_mini(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        css = (ROOT / "src" / "style.css").read_text(encoding="utf-8")
        js = (ROOT / "src" / "main.js").read_text(encoding="utf-8")
        self.assertIn('class="search-scan-label"', html)
        self.assertIn("SCAN", html)
        self.assertNotIn("掃描 SCAN", html)
        self.assertIn('id="channelMini"', html)
        self.assertIn('id="channelMiniName"', html)
        self.assertIn('id="channelMiniPills"', html)
        self.assertIn(".search-scan-label", css)
        self.assertIn(".search-box:not(.is-open):not(:focus-within) .search-scan-label", css)
        self.assertNotRegex(
            css,
            r"\.search-box:not\(\.is-open\):not\(:focus-within\)\s*\{[^}]*min-width:\s*40px",
        )
        self.assertIn(".channel-mini", css)
        self.assertIn("min-height: 40px", css.split(".channel-mini", 1)[1].split("}", 1)[0])
        view_head_block = css.split(".view-head {", 1)[1].split("}", 1)[0]
        self.assertNotIn("position: sticky", view_head_block)
        self.assertIn("syncChannelMini", js)
        self.assertIn("viewHeadIsPast", js)
        self.assertIn("CHANNEL_SHORT", js)
        self.assertIn('setSearchExpanded(true)', js)
        self.assertIn("applyHash", js)
        self.assertIn("syncWikiPill", js)
        self.assertIn("wikiVisibleCount", js)
        self.assertIn('.pill[data-source="wiki"]', js)
        self.assertIn(".channel-link-short", css)
        self.assertIn(".channel-link-full { display: none; }", css)
        self.assertIn("safe-area-inset-left", css)
        self.assertIn("safe-area-inset-right", css)
        self.assertIn("max-height: 520px", css)
        self.assertIn("overflow-x: clip", css)
        self.assertIn("contain: paint", css)
        self.assertNotIn("100vw", css)
        self.assertNotIn("maximum-scale", (ROOT / "index.html").read_text(encoding="utf-8"))
        self.assertIn("channel-link-play", (ROOT / "index.html").read_text(encoding="utf-8"))
        self.assertIn("viewport-fit=cover", (ROOT / "index.html").read_text(encoding="utf-8"))

    def test_p0p1_chrome_and_no_magic_short_id(self):
        js = (ROOT / "src" / "main.js").read_text(encoding="utf-8")
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        magic = "EACO" + "WE6cHCI"
        self.assertNotIn(magic, js)
        self.assertNotIn(magic, html)
        share = (ROOT / "src" / "cardShare.js").read_text(encoding="utf-8")
        self.assertIn("TAB_TO_HASH", js + share)
        self.assertIn('shorts: "new"', js + share)
        self.assertIn("location.hash", js)
        self.assertIn("parseHash", js)
        self.assertIn("v=", share)
        i18n = (ROOT / "src" / "i18n.js").read_text(encoding="utf-8")
        self.assertIn("此來源暫停", i18n)
        self.assertIn("This source is paused", i18n)
        self.assertNotIn(magic, (ROOT / "scraper.py").read_text(encoding="utf-8"))

    def test_p2_official_banner_owned_embed_and_og(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        js = (ROOT / "src" / "main.js").read_text(encoding="utf-8")
        self.assertIn('id="officialBanner"', html)
        i18n = (ROOT / "src" / "i18n.js").read_text(encoding="utf-8")
        self.assertIn("Official weekly signal pending next snapshot", html)
        self.assertIn("No ads · Unofficial · Snapshot, not live", html)
        self.assertIn("本週官方訊號待下次掃描", i18n)
        self.assertIn("無廣告 · 非官方 · 快照非即時", i18n)
        self.assertIn("pickOfficialWeekly", js)
        self.assertIn("renderOfficialBanner", js)
        self.assertIn("youtube-nocookie.com/embed/", js)
        self.assertIn("本週尚無新 Short", i18n)
        self.assertIn("No new Short this week", i18n)
        self.assertIn("i.ytimg.com/vi/", js)
        owned = js.split("function sessionScanSlot", 1)[1].split("function jaNote", 1)[0]
        others = js.split("function videoCard", 1)[1].split("function sessionScanSlot", 1)[0]
        self.assertIn("youtube-nocookie.com/embed/", owned)
        self.assertNotIn("youtube-nocookie.com/embed/", others)
        self.assertIn("i.ytimg.com/vi/", others)
        self.assertIn('content="https://sessionscan.net/og.jpg"', html)
        self.assertTrue((ROOT / "public" / "og.jpg").is_file())
        self.assertLessEqual((ROOT / "public" / "og.jpg").stat().st_size, 300 * 1024)

    def test_data_branch_workflows_do_not_commit_json_to_main(self):
        daily = (ROOT / ".github" / "workflows" / "daily.yml").read_text(encoding="utf-8")
        pages = (ROOT / ".github" / "workflows" / "pages.yml").read_text(encoding="utf-8")
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        self.assertIn('cron: "0 0,7,13 * * *"', daily)
        self.assertIn("ref: main", daily)
        self.assertIn("ref: data", daily)
        self.assertIn("git push origin HEAD:data", daily)
        self.assertEqual(daily.count("git push"), 1)
        self.assertNotIn("upload-pages-artifact", daily)
        self.assertIn("branches: [main, data]", pages)
        self.assertIn("github.sha", pages)
        self.assertIn("ref: data", pages)
        self.assertIn("path: app/dist", pages)
        self.assertIn("不要手動在 `main` 塞 scrape JSON", readme)
        self.assertIn("public/data/site.json", readme)

    def test_built_html_has_static_job_and_new_title(self):
        import subprocess
        subprocess.check_call(["npm", "run", "build"], cwd=ROOT, stdout=subprocess.DEVNULL)
        built = (ROOT / "dist" / "index.html").read_text(encoding="utf-8")
        self.assertEqual((ROOT / "dist" / "CNAME").read_text(encoding="utf-8").strip(), "sessionscan.net")
        self.assertIn("<title data-i18n=\"metaTitle\">SessionScan GTA</title>", built)
        self.assertIn("LOADING", built)
        self.assertNotIn("EXAMPLE DATA", built)
        zh_built = (ROOT / "dist" / "zh" / "index.html").read_text(encoding="utf-8")
        self.assertIn('lang="zh-Hant"', zh_built)
        self.assertIn("SessionScan GTA｜夜掃描", zh_built)
        self.assertIn("本週賺錢與工作", zh_built)
        self.assertIn("訂閱 YouTube", zh_built)
        self.assertIn('"inLanguage":"zh-Hant"', zh_built)
        self.assertIn("Subscribe on YouTube", built)
        self.assertIn("viewport-fit=cover", built)
        self.assertIn("viewport-fit=cover", zh_built)
        self.assertIn("channel-link-play", built)
        self.assertIn('"@type":"WebSite"', built)
        self.assertIn('"@type":"Organization"', built)
        self.assertNotIn("SearchAction", built)
        self.assertIn('hreflang="en"', zh_built)
        self.assertNotIn("This week's money", zh_built)
        self.assertIn('id="jobList"', built)
        self.assertIn('id="crawlJobs"', built)
        self.assertIn("gtabase.com", built)
        self.assertIn("GTA Online Weekly Update", built)
        self.assertIn("youtube.com/shorts/", built)
        banner = built.split('id="officialBannerBody"', 1)[1].split("</p>", 1)[0]
        self.assertIn("gtabase.com", banner)
        self.assertIn("GTA Online Weekly Update", banner)
        this_week_n = int(
            subprocess.check_output(
                [
                    "node",
                    "--input-type=module",
                    "-e",
                    "import { readFileSync } from 'node:fs';"
                    "import { isThisWeekJob } from './src/thisWeek.js';"
                    "const site = JSON.parse(readFileSync('public/data/site.json','utf8'));"
                    "const jobs = [...(site.jobs_gtabase||[]), ...(site.jobs_ign||[]), ...(site.jobs_wiki||[])];"
                    "process.stdout.write(String(jobs.filter((j) => j?.title && j?.url && isThisWeekJob(j)).length));",
                ],
                cwd=ROOT,
                text=True,
            )
        )
        job_list = built.split('id="jobList"', 1)[1].split("</div>", 1)[0]
        if this_week_n:
            self.assertIn("data-static-job", job_list)
        else:
            self.assertNotIn("data-static-job", job_list)
        js = (ROOT / "src" / "main.js").read_text(encoding="utf-8")
        self.assertIn('querySelector("[data-static-job]")', js)
        pkg = (ROOT / "package.json").read_text(encoding="utf-8")
        self.assertIn("inject_static_jobs.mjs", pkg)
        self.assertIn("generate_video_pages.mjs", pkg)
        self.assertIn("generate_zh_pages.mjs", pkg)

    def test_opt5_fonts_hero_and_static_jobs(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        css = (ROOT / "src" / "style.css").read_text(encoding="utf-8")
        vite = (ROOT / "vite.config.js").read_text(encoding="utf-8")
        fonts = [m.group(0) for m in re.finditer(r"family=([A-Za-z0-9+]+)", html)]
        self.assertLessEqual(len(set(fonts)), 2)
        self.assertIn("family=Noto+Sans+TC", html)
        self.assertIn("family=Oswald", html)
        self.assertNotIn("Barlow", html)
        self.assertNotIn("IBM+Plex", html)
        self.assertIn("display=swap", html)
        self.assertIn("ui-monospace", css)
        self.assertIn("min-height: min(34vh, 260px)", css)
        self.assertIn("inject-static-jobs", vite)
        self.assertIn("data-static-job", vite)
        self.assertIn('id="jobList"', html)
        self.assertIn('id="crawlJobs"', html)
        script = (ROOT / "scripts" / "inject_static_jobs.mjs").read_text(encoding="utf-8")
        self.assertIn("public/data/site.json", script)
        self.assertIn("dist/data/site.json", script)
        self.assertNotIn("public/data/sample.json", script)
        gen = (ROOT / "scripts" / "generate_video_pages.mjs").read_text(encoding="utf-8")
        self.assertIn("videos_archive.json", gen)
        self.assertIn("dist/v", gen)
        self.assertIn("sitemap.xml", gen)
        zh_gen = (ROOT / "scripts" / "generate_zh_pages.mjs").read_text(encoding="utf-8")
        self.assertIn("dist/zh", zh_gen)
        self.assertIn("applyHtmlI18n", zh_gen)
        self.assertIn("Require crawler-visible weekly title", (ROOT / ".github" / "workflows" / "pages.yml").read_text(encoding="utf-8"))

    def test_live_bahamut_never_uses_bare_cphp(self):
        site = load_hub()
        for it in site.get("forum_bahamut") or []:
            url = it.get("url") or ""
            self.assertNotEqual(url.rstrip("/"), "https://forum.gamer.com.tw/C.php")
            self.assertTrue("bsn=" in url, url)

    def test_ch01_this_week_default_hides_old_weeklies(self):
        import subprocess

        js = (ROOT / "src" / "main.js").read_text(encoding="utf-8")
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        week = (ROOT / "src" / "thisWeek.js").read_text(encoding="utf-8")
        i18n = (ROOT / "src" / "i18n.js").read_text(encoding="utf-8")
        self.assertIn("本週尚無卡片", i18n)
        self.assertIn("No cards this week", i18n)
        self.assertIn("Earlier weeklies", html)
        self.assertIn("較早週更", i18n)
        self.assertIn("isThisWeekJob", js)
        self.assertIn("showOlderJobs", js)
        self.assertIn("THIS_WEEK_MAX", week)
        self.assertNotIn("THIS_WEEK_MAX_AGE_DAYS", week)
        self.assertNotIn("ageCut", week)
        extras = (ROOT / "src" / "homeExtras.js").read_text(encoding="utf-8")
        pick_fn = extras.split("export function pickOfficialWeekly", 1)[1].split("export function gta6ScheduleLine", 1)[0]
        self.assertNotIn("isThisWeekJob", pick_fn)
        self.assertIn("pickOfficialWeekly", js)
        self.assertIn("homeExtras.js", js)
        site = load_hub()
        titles = [it.get("title", "") + " " + str(it.get("updated", "")) for it in (site.get("jobs_gtabase") or [])]
        self.assertTrue(any("August 27" in t or "2026-08-27" in t for t in titles))
        self.assertTrue(any("July" in t or "2026-07" in t for t in titles))
        self.assertTrue(any("August 13" in t or "2026-08-13" in t for t in titles))
        subprocess.check_call(["node", str(ROOT / "tests" / "test_this_week.mjs")], cwd=ROOT)

    def test_ch02_stale_owned_short_expiry_and_ch01_rerank(self):
        js = (ROOT / "src" / "main.js").read_text(encoding="utf-8")
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        baha = (ROOT / "src" / "bahaTime.js").read_text(encoding="utf-8")
        week = (ROOT / "src" / "thisWeek.js").read_text(encoding="utf-8")
        inject = (ROOT / "scripts" / "inject_static_jobs.mjs").read_text(encoding="utf-8")
        vite = (ROOT / "vite.config.js").read_text(encoding="utf-8")
        i18n = (ROOT / "src" / "i18n.js").read_text(encoding="utf-8")
        self.assertIn("熱門影片來源這輪未更新，仍顯示上次成功快照", baha + i18n)
        self.assertIn("isHotSnapshotStale", js)
        self.assertIn("HOT_STALE_HINT", baha)
        self.assertIn("hotStale", js)
        self.assertIn('id="hotHint"', html)
        hot_fn = js.split("function renderHot(", 1)[1].split("function renderNew", 1)[0]
        self.assertIn("videoCard", hot_fn)
        i18n = (ROOT / "src" / "i18n.js").read_text(encoding="utf-8")
        self.assertIn("本週尚無新 Short", i18n)
        self.assertIn("isOwnedShortThisWeek", js + week)
        self.assertIn("上一則", i18n)
        self.assertIn("@sessionscan", js)
        self.assertIn("withDisplayRanks", js + week)
        self.assertIn("withDisplayRanks(list)", js)
        self.assertIn("withDisplayRanks", inject)
        self.assertIn("withDisplayRanks", vite)
        self.assertNotIn("j.rank ??", vite)
        self.assertNotIn("job.rank ??", inject)

    def test_copy_hierarchy_title_og_and_header(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        css = (ROOT / "src/style.css").read_text(encoding="utf-8")
        head = html.split("<body", 1)[0]
        header = html.split("<header", 1)[1].split("</header>", 1)[0]
        footer = html.split("<footer", 1)[1].split("</footer>", 1)[0]
        self.assertIn(">SessionScan GTA</title>", head)
        self.assertIn('content="SessionScan GTA"', head)
        desc = "GTA 5 / Online / GTA 6 hub. This week's signals, outbound titles only — no full guides. Unrelated to other apps of the same name."
        self.assertIn(f'name="description" data-i18n-content="metaDesc" content="{desc}"', head)
        self.assertIn(f'property="og:description" data-i18n-content="metaDesc" content="{desc}"', head)
        self.assertIn(f'name="twitter:description" data-i18n-content="metaDesc" content="{desc}"', head)
        for blob in (head,):
            self.assertNotIn("WET ASPHALT", blob)
            self.assertNotIn("VICE DUSK", blob)
        self.assertIn("<strong>SESSIONSCAN</strong>", header)
        self.assertIn("GTA HUB", header)
        self.assertNotIn("GTA HUB · 夜掃描", header)
        self.assertNotIn("無廣告 · 非官方 · 快照非即時", header)
        self.assertNotIn("brand-disclaimer", header)
        self.assertIn("channel-link-short", header)
        self.assertIn("channel-link-full", header)
        self.assertIn("@sessionscan", header)
        self.assertIn("Subscribe on YouTube", header)
        self.assertIn("footer-social", footer)
        self.assertIn("Subscribe on YouTube", footer)
        self.assertIn('id="home-jsonld"', head)
        self.assertIn('"@type":"WebSite"', head)
        self.assertIn('"@type":"Organization"', head)
        self.assertNotIn("SearchAction", head)
        self.assertNotIn("instagram.com", html.lower())
        self.assertIn("lang-switch", header)
        self.assertIn("data-lang-link=\"en\"", header)
        self.assertIn("data-lang-link=\"zh\"", header)
        kicker = html.split('class="official-kicker"', 1)[1].split("</div>", 1)[0]
        self.assertIn("No ads · Unofficial · Snapshot, not live", kicker)
        self.assertNotIn("WET ASPHALT", header)
        self.assertNotIn("VICE DUSK", header)
        self.assertIn("hub, unrelated to other apps of the same name", footer)
        self.assertIn("No ads", footer)
        self.assertIn('class="first-screen"', html)
        self.assertIn(".first-screen .hero { order: 1; }", css)
        self.assertIn(".first-screen .official-banner { order: 2; }", css)
        self.assertIn(".first-screen .sample-banner { order: 3; }", css)
        self.assertIn(".first-screen .official-banner { order: 1; }", css)
        self.assertIn(".first-screen .sample-banner { order: 2; }", css)
        self.assertIn(".first-screen .hero { order: 3; flex: 0 0 auto; }", css)
        self.assertIn("min-height: calc(100dvh - 8rem)", css)
        self.assertNotRegex(css, r"\.hero[^{]*\{[^}]*min-height:\s*100vh")
        self.assertNotRegex(css, r"\.cta-grid[^{]*\{[^}]*min-height:\s*100vh")
        self.assertNotRegex(css, r"\.cta-card[^{]*\{[^}]*min-height:\s*100vh")

    def test_homepage_extras_chrome_and_logic(self):
        import subprocess

        html = (ROOT / "index.html").read_text(encoding="utf-8")
        js = (ROOT / "src" / "main.js").read_text(encoding="utf-8")
        css = (ROOT / "src" / "style.css").read_text(encoding="utf-8")
        extras = (ROOT / "src" / "homeExtras.js").read_text(encoding="utf-8")
        build = (ROOT / "build_site.py").read_text(encoding="utf-8")
        self.assertIn('id="highlightsBar"', html)
        self.assertIn("This week", html)
        self.assertIn('id="hubStats"', html)
        self.assertIn("Scan stats", html)
        self.assertIn('data-sort-for="hot"', html)
        self.assertIn('data-period-for="hot"', html)
        self.assertIn('id="hotChannel"', html)
        self.assertIn("data-play", js)
        self.assertIn("rankDeltaHtml", js)
        self.assertIn("filterSortVideos", js)
        self.assertIn("youtube-nocookie.com/embed/", js)
        self.assertNotIn("youtube-nocookie.com/embed/", js.split("function videoCard", 1)[1].split("function sessionScanSlot", 1)[0])
        self.assertIn("extract_rank_prev", build)
        self.assertIn("rank_prev", extras + build)
        self.assertIn(".highlights-bar", css)
        self.assertIn(".rank-delta", css)
        self.assertIn(".hub-stats", css)
        subprocess.check_call(["node", str(ROOT / "tests" / "test_home_extras.mjs")], cwd=ROOT)

    def test_card_share_ids_and_hash_parse(self):
        import subprocess

        js = (ROOT / "src" / "main.js").read_text(encoding="utf-8")
        share = (ROOT / "src" / "cardShare.js").read_text(encoding="utf-8")
        css = (ROOT / "src" / "style.css").read_text(encoding="utf-8")
        self.assertIn("cardShare.js", js)
        self.assertIn("data-card-id", js)
        self.assertIn("card-share", js + css)
        self.assertIn("x.com/intent/post", share)
        self.assertIn("via @sessionscan", share)
        self.assertIn("videoPageUrl", share)
        self.assertIn('VIDEO_PAGE_PREFIX = "v"', share)
        self.assertIn("分享到 X", share)
        self.assertIn("Share to X", share)
        self.assertIn("Xでシェア", share)
        self.assertNotIn("scraper.py", share)
        subprocess.check_call(["node", str(ROOT / "tests" / "test_card_share.mjs")], cwd=ROOT)
        subprocess.check_call(["node", str(ROOT / "tests" / "test_video_pages.mjs")], cwd=ROOT)

    def test_shorts_default_grid_drops_ko_and_js_filters(self):
        import subprocess

        js = (ROOT / "src" / "main.js").read_text(encoding="utf-8")
        src = (ROOT / "scraper.py").read_text(encoding="utf-8")
        self.assertIn("filter_other_shorts", src)
        self.assertIn("filterOtherShorts", js)
        self.assertIn('v.lang === "ko"', js)
        i18n = (ROOT / "src" / "i18n.js").read_text(encoding="utf-8")
        self.assertIn("韓文", i18n)
        self.assertIn("Korean", i18n)
        subprocess.check_call(["node", str(ROOT / "tests" / "test_shorts_baha.mjs")], cwd=ROOT)
        subprocess.check_call(["node", str(ROOT / "tests" / "test_i18n.mjs")], cwd=ROOT)

    def test_bahamut_fixture_time_is_absolute(self):
        site = load_hub()
        sample = json.loads(SAMPLE_JSON.read_text(encoding="utf-8"))
        js = (ROOT / "src" / "main.js").read_text(encoding="utf-8")
        i18n = (ROOT / "src" / "i18n.js").read_text(encoding="utf-8")
        self.assertIn("來源相對時間，以快照為準", i18n)
        self.assertIn("Source used relative time; snapshot is authoritative", i18n)
        self.assertIn("isRelativeForumTime", js)
        self.assertIn("forumTimeMeta", js)
        self.assertIn("bahaAbsTime", js)
        rel = re.compile(r"\d+\s*分前")
        for blob in (site, sample):
            for it in blob.get("forum_bahamut") or []:
                t = str(it.get("time") or "")
                if not t:
                    continue
                if rel.search(t) and not re.match(r"\d{4}-\d{2}-\d{2}", t):
                    self.fail(f"Bahamut time is expiring relative only: {t!r}")
                if it.get("time_relative"):
                    self.assertTrue(t)

    def test_header_children_do_not_overlap(self):
        import subprocess

        # Painted header boxes (subscribe vs @sessionscan on landscape iPhone)
        # cannot be proven from CSS source; this launches headless Chrome.
        if not (ROOT / "dist" / "index.html").is_file():
            subprocess.check_call(["npm", "run", "build"], cwd=ROOT, stdout=subprocess.DEVNULL)
        subprocess.check_call(["node", str(ROOT / "tests" / "test_header_overlap.mjs")], cwd=ROOT)


if __name__ == "__main__":
    unittest.main()
