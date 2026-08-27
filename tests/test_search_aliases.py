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
        keys = ["title", "channel", "game", "lang"]
        cayo = [v for v in videos if "佩裏科" in str(v.get("title", ""))]
        self.assertTrue(cayo, "live site.json must keep the 佩裏科島 YouTube card")
        for query in ("佩里克島", "佩里克", "佩裏科", "佩裡科", "Cayo", "Cayo Perico"):
            words = query.lower().split()
            self.assertTrue(
                any(matches(v, keys, words) for v in videos),
                f"{query!r} should hit the Cayo card",
            )

    def test_live_jobs_are_not_the_old_three_card_sample(self):
        site = json.loads((ROOT / "public" / "data" / "site.json").read_text(encoding="utf-8"))
        jobs = site.get("jobs_gtabase") or []
        self.assertGreaterEqual(len(jobs), 6)
        ja = site.get("videos_hot_ja") or []
        self.assertGreater(len(ja), 0)

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


if __name__ == "__main__":
    unittest.main()
