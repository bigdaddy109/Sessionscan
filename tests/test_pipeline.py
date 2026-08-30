#!/usr/bin/env python3
"""Unit tests for SessionScan scrape helpers (no live network)."""
import json
import os
import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scraper import (  # noqa: E402
    baha_outbound_url,
    clean_heading,
    empty_owned_slot,
    is_gta4,
    is_gta6_news_not_jobs,
    is_in_scope,
    is_jobs_item,
    is_old_gta,
    is_rdo,
    is_sessionscan_author,
    keep_tweet,
    parse_ddgs_x_hit,
    parse_ign_weekly_wiki,
    parse_baha_rows,
    is_truncated_tweet,
    parse_gtabase_listing,
    parse_ign_game_page,
    parse_ign_rss,
    parse_reddit_atom,
    save_or_keep,
    scrape_other_shorts,
    scrape_owned_short,
    shorts_ids_from_html,
    tweet_lang,
)
import scraper as scraper_mod  # noqa: E402


class ScopeTests(unittest.TestCase):
    def test_keeps_in_scope_titles(self):
        self.assertTrue(is_in_scope("GTA Online Weekly Update (August 20-26)"))
        self.assertTrue(is_in_scope("Grand Theft Auto VI Extended Look"))
        self.assertFalse(is_in_scope("Red Dead Online monthly bonuses"))
        self.assertTrue(is_in_scope("俠盜獵車手6 第二支預告"))

    def test_drops_gta4_and_old_titles(self):
        self.assertTrue(is_gta4("GTA 4 remaster rumor"))
        self.assertTrue(is_gta4("Grand Theft Auto IV complete edition"))
        self.assertFalse(is_in_scope("GTA 4 重製版傳聞"))
        self.assertTrue(is_old_gta("GTA San Andreas 100% guide"))
        self.assertFalse(is_in_scope("https://www.gtabase.com/grand-theft-auto-iv/"))

    def test_drops_rdo_and_red_dead(self):
        self.assertTrue(is_rdo("Red Dead Online monthly bonuses"))
        self.assertTrue(is_rdo("RDO weekly bonuses"))
        self.assertTrue(is_rdo("https://reddead.fandom.com/wiki/Red_Dead_Online"))
        self.assertTrue(is_rdo("https://www.ign.com/wikis/red-dead-redemption-2"))
        self.assertTrue(is_rdo("r/RedDeadOnline camp money"))
        self.assertTrue(is_rdo("碧血狂怒線上賞金"))
        self.assertFalse(is_in_scope("Red Dead Online roles and money"))
        self.assertFalse(is_in_scope("RDR2 online bounty hunter week"))
        self.assertTrue(is_in_scope("GTA Online Weekly Update"))
        self.assertFalse(is_rdo("GTA 6 trailer before Chess 2"))

    def test_jobs_prefer_online_money_not_gta6_news(self):
        self.assertTrue(is_jobs_item("GTA Online Weekly Update (August 27-2): Bonuses & Discounts", "GTABase"))
        self.assertTrue(is_jobs_item("GTA Online: The Kortz Center Heist Update patch notes", "GTABase"))
        self.assertTrue(is_jobs_item("GTA Online weekly bonuses and discounts", "IGN"))
        self.assertFalse(is_jobs_item("The Grand Theft Auto 6 Gameplay Just Makes Me Want a PC Version", "IGN"))
        self.assertFalse(is_jobs_item("GTA 6 Extended Look Coming August 27", "GTABase"))
        self.assertFalse(is_jobs_item("'Mind-Blowingly Good': The Internet Reacts to Rockstar's GTA 6", "IGN"))
        self.assertTrue(is_gta6_news_not_jobs("GTA 6 trailer recap and extended look"))
        self.assertFalse(is_gta6_news_not_jobs("GTA Online Weekly Update bonuses"))
        self.assertFalse(is_jobs_item("GTA Online Bonuses (November 2018 Part 1)", "GTA Wiki"))

    def test_tweet_lang_and_cleanliness(self):
        self.assertEqual(tweet_lang("俠盜獵車手6 第二支預告出來了"), "zh")
        self.assertEqual(tweet_lang("GTA 6 trailer is out"), "en")
        self.assertEqual(tweet_lang("『GTA 6』パッケージ版にディスクなし"), "ja")
        self.assertEqual(tweet_lang("我们为 GTA 6 做了一条数据更新日志"), "zh-hans")
        self.assertTrue(is_truncated_tweet('"GTA 6 的官方發表會辦了，但內容已經在網路上 ...'))
        self.assertFalse(is_truncated_tweet("《俠盜獵車手6》雙主角可望即時切換，開車射擊免載入"))
        self.assertFalse(keep_tweet({
            "tid": "2092447164517757418",
            "author": "kyd1031578",
            "text": "\"我们为 GTA 6 做了一条“数据更新日志”： • 每次更新...",
            "date": "2026-08-26",
        }))
        dirty = {
            "tid": "1730587560726892883",
            "author": "rockstargames",
            "text": "December 1, 2023 - Rockstar Games · @RockstarGames · 2:00 PM · Dec 1, 2023248.3MViews · 61K",
            "date": "2023-12-01",
        }
        self.assertFalse(keep_tweet(dirty))
        old_official = {
            "tid": "1919746311382851812",
            "author": "rockstargames",
            "text": "Watch Grand Theft Auto VI Trailer 2 Now",
            "date": "2025-05-06",
        }
        self.assertFalse(keep_tweet(old_official))
        fresh = {
            "tid": "2093145954320843050",
            "author": "gtavi_countdown",
            "text": "The 4K uncompressed version of GTA 6’s Extended Look is 14.2GB.",
            "date": "2026-08-28",
        }
        self.assertTrue(keep_tweet(fresh))
        long_one = {
            "tid": "2090804906936435002",
            "author": "gtasix_",
            "text": "New GTA 6 leaked gameplay: " + ("police " * 120),
            "date": "2026-08-21",
        }
        self.assertFalse(keep_tweet(long_one))
        concat = {
            "tid": "2085335127287030232",
            "author": "rockstargames",
            "text": 'Grand Theft Auto VI: An Extended Look ...Rockstar Games on X / X - TwitterGTA News on X: "Pre-orders"',
            "date": "2026-08-06",
        }
        self.assertFalse(keep_tweet(concat))
        weekend = {
            "tid": "2093700196811059569",
            "author": "rockstargames",
            "text": "GTA Online Weekend Bonus\n\nTake advantage of a special 6X GTA$ and RP on select Drift and Transform Races through August 30",
            "date": "2026-08-29",
        }
        self.assertTrue(keep_tweet(weekend, now=date(2026, 8, 30)))
        self.assertEqual(scraper_mod.snowflake_date("2093700196811059569"), "2026-08-29")
        self.assertTrue(scraper_mod.tweet_date_ok("2026-08-29", now=date(2026, 8, 30)))
        self.assertTrue(scraper_mod.tweet_date_ok("2026-08-30", now=date(2026, 8, 30)))

    def test_x_search_asks_for_recent(self):
        self.assertEqual(scraper_mod.X_SEARCH_TIMELIMITS, ("d", "w"))
        self.assertIn("duckduckgo", scraper_mod.X_SEARCH_BACKEND)
        self.assertNotIn("wikipedia", scraper_mod.X_SEARCH_BACKEND)
        src = (ROOT / "scraper.py").read_text(encoding="utf-8")
        self.assertIn("timelimit=timelimit", src)
        self.assertIn("backend=X_SEARCH_BACKEND", src)
        self.assertIn("GTA site:x.com/RockstarGames/status", src)
        hit = parse_ddgs_x_hit({
            "href": "https://x.com/RockstarGames/status/2093700196811059569",
            "title": 'Rockstar Games on X: "GTA Online Weekend Bonus"',
            "body": "Take advantage of a special 6X GTA$ and RP",
        })
        self.assertEqual(hit["tid"], "2093700196811059569")
        self.assertEqual(hit["author"], "rockstargames")
        self.assertIn("GTA Online Weekend Bonus", hit["text"])


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
        self.assertFalse(any("Extended Look" in t for t in titles))
        self.assertFalse(any("IV" in t or "GTA 4" in t for t in titles))

    def test_ign_game_page_strips_card_chrome(self):
        html = """
        <a href="/articles/gta-online-weekly-bonuses-and-discounts-august-27">
          15h ago
          <h3>GTA Online Weekly Bonuses and Discounts (August 27)</h3>
          15h ago - Pulling back the layers. GTA Online Cade Onder 52
        </a>
        <a href="/articles/gta-6-just-blew-me-away">
          <h3>GTA 6 Just Blew Me Away; I'm So Glad I Avoided the Leaks</h3>
        </a>
        """
        items = parse_ign_game_page(html, "https://www.ign.com/wikis/gta-online")
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["title"], "GTA Online Weekly Bonuses and Discounts (August 27)")
        self.assertNotIn("ago", items[0]["title"])
        self.assertEqual(items[0]["updated"], "2026-08-27")

    def test_ign_rss_filters_scope(self):
        xml = """<?xml version="1.0"?>
        <rss><channel>
          <item><title>Xbox news</title><link>https://www.ign.com/articles/xbox</link><pubDate>Thu, 27 Aug 2026 00:00:00 +0000</pubDate></item>
          <item><title>GTA 6 Extended Look date</title><link>https://www.ign.com/articles/gta-6-look</link><pubDate>Thu, 27 Aug 2026 00:00:00 +0000</pubDate></item>
          <item><title>GTA Online Weekly Update bonuses</title><link>https://www.ign.com/articles/gta-online-weekly</link><pubDate>Thu, 27 Aug 2026 00:00:00 +0000</pubDate></item>
        </channel></rss>"""
        items = parse_ign_rss(xml)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["game"], "GTA Online")
        self.assertEqual(items[0]["updated"], "2026-08-27")

    def test_ign_weekly_wiki_headings_become_outbound_cards(self):
        html = """
        <h2 id="aug27">August 27, 2026: Known/Unknown Races, Drift and Transform Race Bonuses, and More</h2>
        <h2>August 20, 2026: Brand Wars Event Continues, VIP Work Bonuses, and More</h2>
        <h2>July 2, 2024: Old archive week</h2>
        """
        items = parse_ign_weekly_wiki(html, "https://www.ign.com/wikis/gta-5/GTA_Online_Weekly_Updates")
        self.assertGreaterEqual(len(items), 1)
        self.assertTrue(all(it["source"] == "IGN" for it in items))
        self.assertTrue(all("ign.com/wikis/" in it["url"] for it in items))
        self.assertTrue(any("August 27" in it["title"] and "Weekly" in it["title"] for it in items))
        self.assertFalse(any("2024" in it["title"] for it in items))

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


class ShortsTests(unittest.TestCase):
    def setUp(self):
        self._oembed = scraper_mod.yt_oembed

    def tearDown(self):
        scraper_mod.yt_oembed = self._oembed

    def test_ids_only_from_shorts_path(self):
        html = (ROOT / "tests/fixtures/shorts_owned.html").read_text(encoding="utf-8")
        self.assertEqual(shorts_ids_from_html(html), ["5ZNYHSFIBRc", "3-EhyHtd5Aw"])
        self.assertNotIn("WatchLong001", shorts_ids_from_html(html))

    def test_sessionscan_author_check(self):
        self.assertTrue(is_sessionscan_author({
            "author_name": "SessionScan",
            "author_url": "https://www.youtube.com/@sessionscan",
        }))
        self.assertFalse(is_sessionscan_author({
            "author_name": "Some Other Channel",
            "author_url": "https://www.youtube.com/@other",
        }))

    def test_owned_short_uses_page_ids_and_oembed(self):
        html = (ROOT / "tests/fixtures/shorts_owned.html").read_text(encoding="utf-8")

        def fake_oembed(vid):
            return {
                "title": f"title-{vid}",
                "author_name": "SessionScan",
                "author_url": "https://www.youtube.com/@sessionscan",
            }

        scraper_mod.yt_oembed = fake_oembed
        slot, ok = scrape_owned_short(html)
        self.assertTrue(ok)
        self.assertEqual(slot["status"], "online")
        self.assertEqual(slot["short"]["video_id"], "5ZNYHSFIBRc")
        self.assertEqual(slot["short"]["url"], "https://www.youtube.com/shorts/5ZNYHSFIBRc")
        self.assertNotEqual(slot["status"], "offline")
        self.assertIsNone(empty_owned_slot()["short"])

    def test_other_shorts_exclude_owned_gta4_and_longform(self):
        html = (ROOT / "tests/fixtures/shorts_trend.html").read_text(encoding="utf-8")

        def fake_oembed(vid):
            titles = {
                "aaaaaaaaaaa": ("GTA Online weekly Short", "OtherChan"),
                "bbbbbbbbbbb": ("GTA 4 remaster clip", "OldChan"),
                "5ZNYHSFIBRc": ("owned", "SessionScan"),
                "ddddddddddd": ("GTA 6 leak clip Short", "GtaChan"),
            }
            title, author = titles.get(vid, ("Nope", "X"))
            return {
                "title": title,
                "author_name": author,
                "author_url": f"https://www.youtube.com/@{author}",
            }

        scraper_mod.yt_oembed = fake_oembed
        items = scrape_other_shorts(
            {"https://example.test/trend": html},
            exclude_ids={"5ZNYHSFIBRc"},
        )
        ids = [it["video_id"] for it in items]
        self.assertEqual(ids, ["aaaaaaaaaaa", "ddddddddddd"])
        self.assertTrue(all(it["url"].startswith("https://www.youtube.com/shorts/") for it in items))
        self.assertNotIn("bbbbbbbbbbb", ids)
        self.assertNotIn("ccccccccccc", ids)
        self.assertNotIn("WatchLong001", ids)


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
                "title": "15h ago GTA Online Weekly Bonuses and Discounts 15h ago - Pulling back the layers. GTA Online Cade Onder 52",
            }],
            "forum_bahamut": [{"url": "https://forum.gamer.com.tw/C.php"}],
        }
        build_site.sanitize_merged(merged)
        self.assertEqual(merged["jobs_ign"][0]["title"], "GTA Online Weekly Bonuses and Discounts")
        self.assertEqual(merged["forum_bahamut"][0]["url"], "https://forum.gamer.com.tw/B.php?bsn=4737")

    def test_sanitize_drops_rdo_cards(self):
        sys.path.insert(0, str(ROOT))
        import build_site

        merged = {
            "jobs_ign": [
                {"title": "GTA Online Weekly Update bonuses", "game": "GTA Online", "url": "https://www.ign.com/articles/gta-online-weekly"},
                {"title": "Red Dead Online roles", "game": "RDO", "url": "https://reddead.fandom.com/wiki/Red_Dead_Online"},
            ],
            "forum_reddit": [{"title": "r/RedDeadOnline camp", "game": "RDO"}],
            "videos_shorts": [{"title": "GTA Online Short", "game": "GTA Online"}],
            "meta": {"scope": ["GTA 5", "RDO", "GTA 6"], "excluded": ["GTA 4"]},
        }
        build_site.sanitize_merged(merged)
        self.assertEqual(len(merged["jobs_ign"]), 1)
        self.assertEqual(merged["jobs_ign"][0]["game"], "GTA Online")
        self.assertEqual(merged["forum_reddit"], [])
        self.assertEqual(merged["meta"]["scope"], ["GTA 5", "GTA Online", "GTA 6"])
        self.assertIn("RDO", merged["meta"]["excluded"])


if __name__ == "__main__":
    unittest.main()
