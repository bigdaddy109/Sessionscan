#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractRankPrev,
  filterSortVideos,
  hubStats,
  pickOfficialWeekly,
  rankDelta,
  rankDeltaHtml,
  snapshotNow,
  videoChannels,
  videoKey,
  weekHighlights,
} from "../src/homeExtras.js";

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
if (!highlights.some((h) => h.kicker === "官方週更")) fail("highlights missing weekly", highlights);
if (!highlights.some((h) => h.tab === "hot" && h.title)) fail("highlights missing video", highlights);

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

console.log("test_home_extras.mjs ok", {
  highlights: highlights.map((h) => h.kicker),
  stats: { videoCount: stats.videoCount, topChannel: stats.topChannel },
});
