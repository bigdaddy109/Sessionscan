#!/usr/bin/env python3
"""Unit tests for SessionScan scrape helpers (no live network)."""
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scraper import (  # noqa: E402
    baha_outbound_url,
    clean_heading,
    is_gta4,
    is_in_scope,
    is_old_gta,
    parse_baha_rows,
    parse_gtabase_listing,
    parse_ign_game_page,
    parse_ign_rss,
    parse_reddit_atom,
    save_or_keep,
)
import scraper as scraper_mod  # noqa: E402


class ScopeTests(unittest.TestCase):
    def test_keeps_in_scope_titles(self):
        self.assertTrue(is_in_scope("GTA Online Weekly Update (August 20-26)"))
        self.assertTrue(is_in_scope("Grand Theft Auto VI Extended Look"))
        self.assertTrue(is_in_scope("Red Dead Online monthly bonuses"))
        self.assertTrue(is_in_scope("俠盜獵車手6 第二支預告"))

    def test_drops_gta4_and_old_titles(self):
        self.assertTrue(is_gta4("GTA 4 remaster rumor"))
        self.assertTrue(is_gta4("Grand Theft Auto IV complete edition"))
        self.assertFalse(is_in_scope("GTA 4 重製版傳聞"))
        self.assertTrue(is_old_gta("GTA San Andreas 100% guide"))
        self.assertFalse(is_in_scope("https://www.gtabase.com/grand-theft-auto-iv/"))


class KeepYesterdayTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        scraper_mod.DATA = Path(self.tmp.name)
        Path(self.tmp.name, "yesterday.json").write_text('[{"id":"old"}]', encoding="utf-8")

    def tearDown(self):
        self.tmp.cleanup()

    def test_empty_does_not_overwrite(self):
        yesterday = Path(self.tmp.name, "jobs_gtabase.json")
        yesterday.write_text('[{"id":"keep-me"}]', encoding="utf-8")
        ok = save_or_keep("jobs_gtabase", [])
        self.assertFalse(ok)
        self.assertEqual(json.loads(yesterday.read_text(encoding="utf-8")), [{"id": "keep-me"}])

    def test_nonempty_overwrites(self):
        ok = save_or_keep("jobs_ign", [{"id": "fresh", "title": "GTA 6"}])
        self.assertTrue(ok)
        payload = json.loads(Path(self.tmp.name, "jobs_ign.json").read_text(encoding="utf-8"))
        self.assertEqual(payload[0]["id"], "fresh")


class ParserTests(unittest.TestCase):
    def test_clean_heading_strips_ign_chrome(self):
        raw = "Aug 5, 2026 GTA 5 Actor Auditioned for 60 Roles in GTA 6, But Heard Nothing from Rockstar Aug 5, 2026 - Rejected. GTA 5 Cade Onder 18"
        self.assertEqual(
            clean_heading(raw),
            "GTA 5 Actor Auditioned for 60 Roles in GTA 6, But Heard Nothing from Rockstar",
        )

    def test_clean_heading_strips_relative_time_crumbs(self):
        self.assertEqual(
            clean_heading(
                "15h ago Grand Theft Auto 6 Will Have RPG Mechanics Like Eating, Exercising, and More 15h ago - Pulling back the layers. GTA 6 Cade Onder 52"
            ),
            "Grand Theft Auto 6 Will Have RPG Mechanics Like Eating, Exercising, and More",
        )
        self.assertEqual(
            clean_heading(
                "1d ago Grand Theft Auto 6: An Extended Look Global Release Times Confirmed 1d ago - Vice precedent. GTA 6 Tom Phillips 85"
            ),
            "Grand Theft Auto 6: An Extended Look Global Release Times Confirmed",
        )
        self.assertNotIn("ago", clean_heading("16h ago Leaker Posts Extended Gameplay From GTA 6 Prologue 16h ago - As leaker claims access."))

    def test_bahamut_skips_pin_and_gta4(self):
        html = (ROOT / "tests/fixtures/baha_sample.html").read_text(encoding="utf-8")
        rows = parse_baha_rows(html)
        titles = [r["title"] for r in rows]
        self.assertEqual(titles, ["GTA Online 本週獎勵討論"])
        self.assertEqual(rows[0]["url"], "https://forum.gamer.com.tw/C.php?bsn=4737&snA=99")
        self.assertEqual(rows[0]["author"], "作者甲")

    def test_bahamut_never_emits_bare_cphp(self):
        self.assertEqual(baha_outbound_url("https://forum.gamer.com.tw/C.php"), "https://forum.gamer.com.tw/B.php?bsn=4737")
        self.assertEqual(baha_outbound_url("C.php"), "https://forum.gamer.com.tw/B.php?bsn=4737")
        self.assertEqual(
            baha_outbound_url("C.php?bsn=4737&snA=12345"),
            "https://forum.gamer.com.tw/C.php?bsn=4737&snA=12345",
        )
        html = """
        <table>
          <tr class="b-list__row">
            <td class="b-list__main">
              <a href="C.php"><p class="b-list__main__title">GTA Online 本週獎勵</p></a>
            </td>
          </tr>
        </table>
        """
        rows = parse_baha_rows(html)
        self.assertEqual(rows[0]["url"], "https://forum.gamer.com.tw/B.php?bsn=4737")
        self.assertNotEqual(rows[0]["url"].rstrip("/"), "https://forum.gamer.com.tw/C.php")

    def test_gtabase_drops_gta4_and_nav(self):
        html = """
        <a href="/articles/grand-theft-auto-v/news/gta-online-weekly-update-august-20-26">
          GTA Online Weekly Update (August 20-26): Brand Wars
        </a>
        <a href="/articles/gta-6/gta-6-extended-look">GTA 6 Extended Look Coming August 27</a>
        <a href="/grand-theft-auto-iv/">Grand Theft Auto IV</a>
        <a href="/articles/gta-4/gta-4-remaster">GTA 4 remaster rumor</a>
        <a href="/membership/">Join MyGTA</a>
        """
        items = parse_gtabase_listing(html)
        titles = [i["title"] for i in items]
        self.assertTrue(any("Weekly Update" in t for t in titles))
        self.assertTrue(any("GTA 6" in t for t in titles))
        self.assertFalse(any("IV" in t or "GTA 4" in t for t in titles))

    def test_ign_game_page_strips_card_chrome(self):
        html = """
        <a href="/articles/grand-theft-auto-6-will-have-rpg-mechanics-like-eating-exercising-and-more">
          15h ago
          <h3>Grand Theft Auto 6 Will Have RPG Mechanics Like Eating, Exercising, and More</h3>
          15h ago - Pulling back the layers. GTA 6 Cade Onder 52
        </a>
        """
        items = parse_ign_game_page(html, "https://www.ign.com/games/grand-theft-auto-vi")
        self.assertEqual(len(items), 1)
        self.assertEqual(
            items[0]["title"],
            "Grand Theft Auto 6 Will Have RPG Mechanics Like Eating, Exercising, and More",
        )
        self.assertNotIn("ago", items[0]["title"])

    def test_ign_rss_filters_scope(self):
        xml = """<?xml version="1.0"?>
        <rss><channel>
          <item><title>Xbox news</title><link>https://www.ign.com/articles/xbox</link><pubDate>Thu, 27 Aug 2026 00:00:00 +0000</pubDate></item>
          <item><title>GTA 6 Extended Look date</title><link>https://www.ign.com/articles/gta-6-look</link><pubDate>Thu, 27 Aug 2026 00:00:00 +0000</pubDate></item>
        </channel></rss>"""
        items = parse_ign_rss(xml)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["game"], "GTA 6")
        self.assertEqual(items[0]["updated"], "2026-08-27")

    def test_reddit_atom_skips_hub_and_sorts(self):
        xml = """<?xml version="1.0"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <entry>
            <title>Community Hub</title>
            <link href="https://www.reddit.com/r/gtaonline/comments/hub/"/>
            <updated>2026-07-01T00:00:00+00:00</updated>
            <author><name>/u/mod</name></author>
          </entry>
          <entry>
            <title>Weekly Bonuses and Discounts</title>
            <link href="https://www.reddit.com/r/gtaonline/comments/week/"/>
            <updated>2026-08-26T00:00:00+00:00</updated>
            <author><name>/u/PapaXan</name></author>
          </entry>
        </feed>"""
        items = parse_reddit_atom(xml, "r/gtaonline", "GTA Online")
        self.assertEqual(len(items), 1)
        self.assertIn("Weekly Bonuses", items[0]["title"])
        self.assertEqual(items[0]["time"], "2026-08-26")


class BuildSiteTests(unittest.TestCase):
    def test_refuses_empty_merge(self):
        sys.path.insert(0, str(ROOT))
        import build_site

        self.assertFalse(build_site.has_real_payload({"meta": {}, "jobs_gtabase": []}))
        self.assertTrue(
            build_site.has_real_payload({
                "meta": {"_last_run": "2026-08-27 08:00"},
                "jobs_gtabase": [{"id": "x"}],
            })
        )

    def test_sanitize_strips_ign_crumbs_and_bare_cphp(self):
        sys.path.insert(0, str(ROOT))
        import build_site

        merged = {
            "jobs_ign": [{
                "title": "15h ago Grand Theft Auto 6 Will Have RPG Mechanics 15h ago - Pulling back the layers. GTA 6 Cade Onder 52",
            }],
            "forum_bahamut": [{"url": "https://forum.gamer.com.tw/C.php"}],
        }
        build_site.sanitize_merged(merged)
        self.assertEqual(merged["jobs_ign"][0]["title"], "Grand Theft Auto 6 Will Have RPG Mechanics")
        self.assertEqual(merged["forum_bahamut"][0]["url"], "https://forum.gamer.com.tw/B.php?bsn=4737")


if __name__ == "__main__":
    unittest.main()
