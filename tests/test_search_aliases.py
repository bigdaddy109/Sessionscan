#!/usr/bin/env python3
"""Local search aliases and live-data honesty checks (no network)."""
import json
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
]


def alias_terms_for(word: str) -> list[str]:
    w = str(word or "").lower()
    if not w:
        return []
    for group in SEARCH_ALIAS_GROUPS:
        lower = [t.lower() for t in group]
        hit = any(t == w or (len(w) >= 2 and (t in w or w in t)) for t in lower)
        if hit:
            return lower
    return [w]


def matches(item: dict, keys: list[str], words: list[str]) -> bool:
    parts = []
    for k in keys:
        v = item.get(k)
        if isinstance(v, list):
            parts.append(" ".join(str(x) for x in v))
        else:
            parts.append("" if v is None else str(v))
    hay = " ".join(parts).lower()
    return all(any(term in hay for term in alias_terms_for(w)) for w in words)


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
        self.assertNotEqual(vid, "EACOWE6cHCI")
        others = site.get("videos_shorts") or []
        self.assertGreaterEqual(len(others), 1)
        self.assertNotIn(vid, [v.get("video_id") for v in others])
        self.assertNotIn("EACOWE6cHCI", [v.get("video_id") for v in others])
        hay = f"{short.get('channel','')} {short.get('title','')}".lower()
        self.assertIn("sessionscan", hay)

    def test_live_bahamut_never_uses_bare_cphp(self):
        site = json.loads((ROOT / "public" / "data" / "site.json").read_text(encoding="utf-8"))
        for it in site.get("forum_bahamut") or []:
            url = it.get("url") or ""
            self.assertNotEqual(url.rstrip("/"), "https://forum.gamer.com.tw/C.php")
            self.assertTrue("bsn=" in url, url)


if __name__ == "__main__":
    unittest.main()
