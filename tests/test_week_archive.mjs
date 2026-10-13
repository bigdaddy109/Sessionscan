#!/usr/bin/env node
/**
 * Why this test matters: Phase C Archive must freeze real weeks from hub JSON
 * (titles / highlights / outbound links only), list them on /week/, and never
 * invent Short URLs or pull a newer week's article into an older freeze.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { snapshotNow } from "../src/homeExtras.js";
import { buildWeekBullets } from "../src/thisWeekHome.js";
import {
  archiveSitemapUrls,
  latestArchiveLinkHtml,
  latestArchiveWeek,
  listArchiveWeeks,
  matchWeekFreezePath,
  pickArchiveShort,
  renderArchiveIndexPage,
  renderWeekFreezePage,
  weekOutboundLinks,
  weekPagePath,
  weekShareUrl,
} from "../src/weekArchive.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const site = JSON.parse(readFileSync(resolve(root, "public/data/site.json"), "utf8"));
const hub = JSON.parse(readFileSync(resolve(root, "tests/fixtures/hub.json"), "utf8"));

function fail(msg, extra) {
  console.error(msg, extra ?? "");
  process.exit(1);
}

const weeks = listArchiveWeeks(site);
if (!weeks.length) fail("site.json should yield archive weeks");
if (weeks[0].week < weeks[weeks.length - 1].week) fail("weeks newest-first", weeks.map((w) => w.week));
for (const w of weeks) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(w.week)) fail("week iso", w);
  if (!w.title || !w.path.startsWith("week/")) fail("week row shape", w);
}

const hubWeeks = listArchiveWeeks(hub);
if (!hubWeeks.some((w) => w.week === "2026-08-27")) fail("hub lists 2026-08-27", hubWeeks);

const older = weeks.find((w) => w.week !== weeks[0].week) || weeks[0];
const bullets = buildWeekBullets(site, new Date(`${older.week}T12:00:00Z`), "en");
if (bullets.length !== 5) fail("freeze bullets");
const links = weekOutboundLinks(site, older.week);
for (const link of links) {
  if (!link.url || !link.title) fail("outbound link incomplete", link);
  // Older freeze must not silently use the newest week's URL as its only signal
  // when the newest week is a different Thursday key.
  if (weeks.length > 1 && older.week !== weeks[0].week && link.url === weeks[0].url && links.length === 1) {
    // Allow only if that URL's title also belongs to older week — title check via list
    const own = weeks.find((w) => w.week === older.week);
    if (own && own.url !== link.url) fail("older freeze leaked newest weekly url", { older, link, newest: weeks[0] });
  }
}

const snap = snapshotNow(site.meta) || new Date("2026-08-30T02:00:00Z");
const currentIso = weeks[0]?.week;
const shortNow = pickArchiveShort(site, currentIso, snap);
// Undated Short may attach to snapshot's current week only.
const pastIso = weeks.find((w) => w.week !== currentIso)?.week;
if (pastIso) {
  const shortPast = pickArchiveShort(site, pastIso, snap);
  if (shortPast && !site.sessionscan_slot?.short?.date) {
    fail("undated Short must not appear on historical freeze", { pastIso, shortPast });
  }
}
if (shortNow && !/^[A-Za-z0-9_-]{11}$/.test(shortNow.video_id)) fail("short id", shortNow);

const share = weekShareUrl("2026-08-27", { lang: "en", source: "youtube" });
if (!share.includes("/week/2026-08-27/")) fail("share path", share);
if (!share.includes("utm_source=youtube")) fail("utm source", share);
if (!share.includes("utm_campaign=week-2026-08-27")) fail("utm campaign", share);
const shareZh = weekShareUrl("2026-08-27", { lang: "zh", source: "instagram" });
if (!shareZh.includes("/zh/week/2026-08-27/")) fail("zh share path", shareZh);
if (!shareZh.includes("utm_source=instagram")) fail("ig utm", shareZh);

if (matchWeekFreezePath("/week/2026-10-08/")?.weekIso !== "2026-10-08") fail("match en freeze");
if (matchWeekFreezePath("/zh/week/2026-10-08/")?.lang !== "zh") fail("match zh freeze");
if (matchWeekFreezePath("/week/") != null) fail("index is not a freeze match");

const indexHtml = renderArchiveIndexPage(site, { lang: "en", cssHref: "../assets/x.css", faviconHref: "../favicon.svg" });
if (indexHtml.includes("page-stub-flag")) fail("archive index must not be stub");
if (indexHtml.includes("Archive pages expand in a later phase")) fail("stub copy leaked");
if (!indexHtml.includes("archive-week-list")) fail("index list missing");
if (!indexHtml.includes(`/week/${weeks[0].week}/`)) fail("index links newest week");
// Latest callout must mark only listArchiveWeeks tip — older freezes stay unmarked.
if (!indexHtml.includes("archive-latest-badge")) fail("index missing Latest badge");
if (!indexHtml.includes(">Latest<")) fail("EN Latest badge copy", indexHtml.match(/archive-latest-badge[\s\S]{0,40}/)?.[0]);
const latestLi = indexHtml.match(
  /<li class="archive-week-item is-latest">[\s\S]*?<\/li>/,
);
if (!latestLi) fail("newest row missing is-latest wrapper");
if (!latestLi[0].includes(`/week/${weeks[0].week}/`)) fail("Latest badge not on tip week", latestLi[0]);
if ((indexHtml.match(/archive-latest-badge/g) || []).length !== 1) {
  fail("Latest badge must appear once", (indexHtml.match(/archive-latest-badge/g) || []).length);
}
if (weeks.length > 1) {
  const olderIso = weeks[1].week;
  const olderChunk = indexHtml.split(`datetime="${olderIso}"`)[1]?.slice(0, 280) || "";
  if (olderChunk.includes("archive-latest-badge") || olderChunk.includes("is-latest")) {
    fail("older week must not carry Latest callout", { olderIso, olderChunk });
  }
}
const indexZh = renderArchiveIndexPage(site, { lang: "zh", cssHref: "../assets/x.css", faviconHref: "../favicon.svg" });
if (!indexZh.includes(">最新<")) fail("zh Latest badge copy");
if (!indexZh.includes(`/zh/week/${weeks[0].week}/`)) fail("zh index links tip week");

const freeze = renderWeekFreezePage(site, older.week, {
  lang: "zh",
  cssHref: "../../../assets/x.css",
  faviconHref: "../../../favicon.svg",
});
if (!freeze.includes('lang="zh-Hant"')) fail("freeze zh lang");
if (!freeze.includes(`https://sessionscan.net/zh/week/${older.week}/`)) fail("freeze canonical zh");
if (freeze.includes("page-stub-flag")) fail("freeze not stub");
if (!freeze.includes("archive-outbound") && !freeze.includes("archive-empty")) fail("freeze outbound section");
if (!freeze.includes('data-nav="week"') || !freeze.includes('aria-current="page"')) fail("archive nav active");

const sm = archiveSitemapUrls(weeks);
if (!sm.includes(`https://sessionscan.net/week/${weeks[0].week}/`)) fail("sitemap en week");
if (!sm.includes(`https://sessionscan.net/zh/week/${weeks[0].week}/`)) fail("sitemap zh week");

const distWeek = resolve(root, "dist/week/index.html");
if (existsSync(distWeek)) {
  const built = readFileSync(distWeek, "utf8");
  if (built.includes("page-stub-flag")) fail("dist week stub flag");
  if (built.includes("land in Phase C") || built.includes("之後的階段才會上線")) fail("dist stub copy");
  if (!built.includes("archive-week-list") && !built.includes("archive-empty")) fail("dist week index body");
  const freezeDir = resolve(root, `dist/week/${weeks[0].week}/index.html`);
  if (existsSync(freezeDir)) {
    const fz = readFileSync(freezeDir, "utf8");
    if (!fz.includes("archive-freeze-bullets") && !fz.includes("week-bullet-list")) fail("dist freeze bullets");
  }
}

// Home “latest freeze” link — same listArchiveWeeks tip; never invent a week key.
const tip = latestArchiveWeek(site);
if (!tip || tip.week !== weeks[0].week) fail("latestArchiveWeek must be newest list tip", tip);
const latestHtml = latestArchiveLinkHtml(site, "en");
if (!latestHtml.includes(weekPagePath(tip.week, "en"))) fail("latest link href", latestHtml);
if (!latestHtml.includes(tip.week)) fail("latest link shows week iso", latestHtml);
const zhLatest = latestArchiveLinkHtml(site, "zh");
if (!zhLatest.includes(`/zh/week/${tip.week}/`)) fail("zh latest path", zhLatest);
const emptyHtml = latestArchiveLinkHtml({ jobs_gtabase: [], jobs_ign: [] }, "en");
if (!emptyHtml.includes("/week/") || !emptyHtml.includes("is-empty")) {
  fail("empty hub falls back to archive index", emptyHtml);
}

console.log("test_week_archive.mjs ok", weeks.length, "weeks");
