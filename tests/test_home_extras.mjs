#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractRankPrev,
  filterSortVideos,
  formatSnapshotAgeLabel,
  gta6ScheduleBannerHtml,
  gta6ScheduleLine,
  hubStats,
  injectStaticHomeFreshness,
  isLiveHubData,
  pickOfficialWeekly,
  rankDelta,
  rankDeltaHtml,
  snapshotNow,
  staticDataBannerHtml,
  staticLastRunText,
  videoChannels,
  videoKey,
  weekHighlights,
} from "../src/homeExtras.js";
import { parseSnapshotNow } from "../src/bahaTime.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sample = JSON.parse(readFileSync(resolve(root, "public/data/sample.json"), "utf8"));
const now = snapshotNow(sample.meta);

function fail(msg, extra) {
  console.error(msg, extra ?? "");
  process.exit(1);
}

if (videoKey({ video_id: "5XBMNYmFmTs" }) !== "5XBMNYmFmTs") fail("videoKey youtube id");
if (videoKey({ video_id: "nope" }) !== "") fail("videoKey must reject short ids");

const prev = extractRankPrev({
  videos_hot_zh: [
    { video_id: "aaaaaaaaaaa" },
    { video_id: "bbbbbbbbbbb" },
  ],
});
if (prev.videos_hot_zh.aaaaaaaaaaa !== 1 || prev.videos_hot_zh.bbbbbbbbbbb !== 2) {
  fail("extractRankPrev ranks", prev);
}

if (rankDelta("x", 1, {}).kind !== "none") fail("empty prev map is none");
if (rankDelta("aaaaaaaaaaa", 1, prev.videos_hot_zh).kind !== "same") fail("same rank");
const up = rankDelta("bbbbbbbbbbb", 1, prev.videos_hot_zh);
if (up.kind !== "up" || up.delta !== 1) fail("up delta", up);
const down = rankDelta("aaaaaaaaaaa", 3, prev.videos_hot_zh);
if (down.kind !== "down" || down.delta !== 2) fail("down delta", down);
if (rankDelta("ccccccccccc", 1, prev.videos_hot_zh).kind !== "new") fail("new badge");
if (!rankDeltaHtml({ kind: "up", delta: 3 }).includes("▲3")) fail("up html");
if (!rankDeltaHtml({ kind: "down", delta: 2 }).includes("▼2")) fail("down html");
if (!rankDeltaHtml({ kind: "new", delta: 0 }).includes("NEW")) fail("new html");
if (rankDeltaHtml({ kind: "same", delta: 0 }) !== "") fail("same html empty");

const weekly = pickOfficialWeekly(sample);
if (!weekly?.title || !/weekly|每週|本週/i.test(`${weekly.title} ${weekly.title_en}`)) {
  fail("sample official weekly", weekly);
}

const highlights = weekHighlights(sample, now);
if (!highlights.some((h) => h.kicker === "Official weekly")) fail("highlights missing weekly", highlights);
if (!highlights.some((h) => h.tab === "hot" && h.title)) fail("highlights missing video", highlights);
const highlightsZh = weekHighlights(sample, now, "zh");
if (!highlightsZh.some((h) => h.kicker === "官方週更")) fail("zh highlights missing weekly", highlightsZh);

const stats = hubStats(sample, now);
if (stats.videoCount < 3) fail("stats videoCount", stats);
if (stats.totalViews == null || stats.avgViews == null) fail("stats views", stats);
if (stats.topChannel !== "Kim 阿金") fail("top channel this week from dated sample video", stats);

const zh = sample.videos_hot_zh;
const byViews = filterSortVideos(zh, { sort: "views", now });
if (byViews[0].video_id !== "OAbemtpGAew") fail("sort views", byViews.map((v) => v.video_id));
const newest = filterSortVideos(zh, { sort: "newest", now });
if (newest[0].video_id !== "OAbemtpGAew") fail("sort newest", newest.map((v) => v.video_id));
const weekOnly = filterSortVideos(zh, { period: "week", now });
if (weekOnly.length !== 1 || weekOnly[0].video_id !== "OAbemtpGAew") fail("period week", weekOnly);
const yu = filterSortVideos(zh, { channel: "Yu", now });
if (yu.length !== 2 || yu.some((v) => v.channel !== "Yu")) fail("channel filter", yu);
if (yu[0]._rank !== 1 || yu[1]._rank !== 2) fail("filter keeps original ranks", yu);
if (videoChannels(zh).join(",") !== "Kim 阿金,Yu") fail("channels", videoChannels(zh));

const samplePrev = sample.rank_prev.videos_hot_zh;
if (rankDelta("5XBMNYmFmTs", 1, samplePrev).kind !== "up") fail("sample #1 rose");
if (rankDelta("kIomnva1jGU", 2, samplePrev).kind !== "down") fail("sample #2 fell");
if (rankDelta("OAbemtpGAew", 3, samplePrev).kind !== "new") fail("sample #3 is NEW");

// Why: when snapshot text mentions the announced GTA 6 date, the CH-00 banner
// note must link to /gta6/ (locale path) — plain text wasted a discovery chance.
const scheduleData = {
  jobs_gtabase: [{ title: "GTA 6 coming November 19 — Rockstar" }],
};
if (!gta6ScheduleLine(scheduleData, "en").includes("November 19")) {
  fail("schedule line en", gta6ScheduleLine(scheduleData, "en"));
}
const bannerEn = gta6ScheduleBannerHtml(scheduleData, "en");
if (!bannerEn.includes('data-gta6-schedule-link') || !bannerEn.includes('href="/gta6/"')) {
  fail("banner schedule en link", bannerEn);
}
if (!bannerEn.includes("GTA 6 date announced")) fail("banner schedule en copy");
const bannerZh = gta6ScheduleBannerHtml(
  { jobs_gtabase: [{ title: "俠盜獵車手 6 · 11 月 19 日" }] },
  "zh",
);
if (!bannerZh.includes('href="/zh/gta6/"') || !bannerZh.includes("已公開時程")) {
  fail("banner schedule zh link", bannerZh);
}
if (gta6ScheduleBannerHtml({ jobs_gtabase: [{ title: "weekly bonuses only" }] }, "en") !== "") {
  fail("banner empty without GTA 6 date signal");
}

// Why: players need glanceable freshness on the snapshot banner, not only absolute stamps.
{
  const fixedNow = parseSnapshotNow("2026-10-14 02:00");
  const enAge = formatSnapshotAgeLabel("2026-10-13 14:51", "en", fixedNow);
  if (enAge !== "11h ago") fail("formatSnapshotAgeLabel en hours", enAge);
  const zhAge = formatSnapshotAgeLabel("2026-10-13 14:51", "zh", fixedNow);
  if (zhAge !== "11 小時前") fail("formatSnapshotAgeLabel zh hours", zhAge);
  if (formatSnapshotAgeLabel("", "en", fixedNow) !== "") fail("empty stamp → empty age");
}

// Why: home used to flash LOADING until site.json fetch; static stamp+age on first
// paint is the user-felt half of #91 (relative age) without waiting for JS.
{
  const hub = JSON.parse(readFileSync(resolve(root, "tests/fixtures/hub.json"), "utf8"));
  const fixedNow = parseSnapshotNow("2026-08-20 11:00");
  if (!isLiveHubData(hub)) fail("fixture hub must count as live");
  if (isLiveHubData(sample)) fail("sample.json must not count as live");
  const banner = staticDataBannerHtml(hub, "en", fixedNow);
  if (!banner.includes("SNAPSHOT") || !banner.includes("2026-08-20 00:00") || !banner.includes("11h ago")) {
    fail("staticDataBannerHtml live en", banner);
  }
  const bannerZh = staticDataBannerHtml(hub, "zh", fixedNow);
  if (!bannerZh.includes("資料快照") || !bannerZh.includes("11 小時前")) {
    fail("staticDataBannerHtml live zh", bannerZh);
  }
  const sampleBanner = staticDataBannerHtml(sample, "en", fixedNow);
  if (!sampleBanner.includes("EXAMPLE DATA") || sampleBanner.includes("ago")) {
    fail("static sample banner must not invent relative age", sampleBanner);
  }
  const last = staticLastRunText(hub, "en", fixedNow);
  if (!last.includes("11h ago") || !last.includes("2026-08-20 00:00")) {
    fail("staticLastRunText en", last);
  }
  const shell = `<div class="sample-banner" id="dataBanner" role="status"><strong>LOADING</strong><span>…</span></div>
      <p class="footer-meta" id="lastRun">Loading snapshot</p>`;
  const stamped = injectStaticHomeFreshness(shell, { lang: "en", data: hub, now: fixedNow });
  if (stamped.includes("LOADING") || !stamped.includes("11h ago") || !stamped.includes('id="lastRun"')) {
    fail("injectStaticHomeFreshness", stamped);
  }
  const enDist = resolve(root, "dist/index.html");
  const zhDist = resolve(root, "dist/zh/index.html");
  if (existsSync(enDist) && existsSync(zhDist)) {
    const enHtml = readFileSync(enDist, "utf8");
    const zhHtml = readFileSync(zhDist, "utf8");
    const enBanner = enHtml.match(/id="dataBanner"[^>]*>([\s\S]*?)<\/div>/)?.[1] || "";
    const zhBanner = zhHtml.match(/id="dataBanner"[^>]*>([\s\S]*?)<\/div>/)?.[1] || "";
    if (enBanner.includes("LOADING") || zhBanner.includes("載入中") || zhBanner.includes("LOADING")) {
      fail("dist home banner still shows loading placeholder");
    }
    if (!/id="lastRun"[^>]*>[^<]*(Snapshot|資料快照|EXAMPLE|範例)/.test(enHtml + zhHtml)) {
      fail("dist lastRun missing static freshness copy");
    }
  }
}

console.log("test_home_extras.mjs ok", {
  highlights: highlights.map((h) => h.kicker),
  stats: { videoCount: stats.videoCount, topChannel: stats.topChannel },
});
