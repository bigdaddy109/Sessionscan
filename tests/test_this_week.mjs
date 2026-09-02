#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { HOT_STALE_HINT, isHotSnapshotStale } from "../src/bahaTime.js";
import { isOwnedShortThisWeek, isThisWeekJob, thisWeekJobs, withDisplayRanks } from "../src/thisWeek.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const hub = JSON.parse(readFileSync(resolve(root, "tests/fixtures/hub.json"), "utf8"));
const now = new Date("2026-08-31T12:00:00+08:00");

const jobs = [
  ...(hub.jobs_gtabase || []),
  ...(hub.jobs_ign || []),
  ...(hub.jobs_wiki || []),
];
const shown = thisWeekJobs(jobs, now);
const blob = shown.map((j) => `${j.title} ${j.updated}`).join("\n");
if (/July|2026-07|August 13|2026-08-13|August 20|2026-08-20|2026-06-01/i.test(blob)) {
  console.error("this-week default leaked an old weekly:\n", blob);
  process.exit(1);
}
if (!shown.some((j) => /August 27|2026-08-27/.test(`${j.title} ${j.updated}`))) {
  console.error("this-week default missing current weekly:\n", blob);
  process.exit(1);
}
if (shown.length > 2) {
  console.error("this-week default must be 1–2 cards, got", shown.length);
  process.exit(1);
}

const cases = [
  [{ title: "GTA Online Weekly Update (August 27 - September 2)", updated: "2026-08-27" }, true],
  [{ title: "GTA Online Weekly Update (August 20-26)", updated: "2026-08-20" }, false],
  [{ title: "GTA Online Weekly Update (August 13-19)", updated: "2026-08-13" }, false],
  [{ title: "GTA Online Weekly Update (July 23-29)", updated: "2026-07-23" }, false],
  [{ title: "The Cayo Perico Heist — 佩里克島", updated: "2026-06-01" }, false],
  [{ title: "Fresh card with no week words", updated: "2026-08-25" }, true],
  [{ title: "No date at all" }, false],
];
const failed = cases.filter(([item, exp]) => isThisWeekJob(item, now) !== exp);
if (failed.length) {
  console.error("isThisWeekJob mismatches", failed.map(([item]) => item));
  process.exit(1);
}

// 1. CH-02 stale-source hint: aged hot stamp shows the sentence; near-current does not.
const agedHot = {
  ...hub.meta,
  _last_run: "2026-08-20 14:00",
  jobs: "2026-08-20 14:00",
  hot: "2026-08-19 20:00",
  videos_hot_zh: "2026-08-19 20:00",
};
const freshHot = {
  ...hub.meta,
  _last_run: "2026-08-20 14:00",
  jobs: "2026-08-20 14:00",
  hot: "2026-08-20 10:00",
  videos_hot_zh: "2026-08-20 10:00",
};
if (!isHotSnapshotStale(agedHot, "zh")) {
  console.error("aged hot snapshot must be stale");
  process.exit(1);
}
if (isHotSnapshotStale(freshHot, "zh")) {
  console.error("near-current hot snapshot must not be stale");
  process.exit(1);
}
if (HOT_STALE_HINT !== "熱門影片來源這輪未更新，仍顯示上次成功快照") {
  console.error("stale hint copy changed", HOT_STALE_HINT);
  process.exit(1);
}

// 2. Owned Short week expiry: last week's dated/title-week short is not this week's slot.
const expiredShort = {
  video_id: "OldShort001",
  title: "6X Drift + Transform This Weekend | GTA Online",
  date: "2026-08-20",
};
const expiredByTitle = {
  video_id: "OldShort002",
  title: "GTA Online Weekly Short (August 20-26)",
};
const currentShort = {
  video_id: "NewShort001",
  title: "6X Drift + Transform This Weekend | GTA Online",
  date: "2026-08-27",
};
const unparseable = hub.sessionscan_slot.short;
const weekendOnly = {
  video_id: "WeekendOnly1",
  title: "6X Drift + Transform This Weekend | GTA Online",
};
if (isOwnedShortThisWeek(expiredShort, now) || isOwnedShortThisWeek(expiredByTitle, now)) {
  console.error("expired owned short still treated as this week");
  process.exit(1);
}
if (!isOwnedShortThisWeek(currentShort, now)) {
  console.error("current owned short should stay featured");
  process.exit(1);
}
if (!isOwnedShortThisWeek(unparseable, now) || !isOwnedShortThisWeek(weekendOnly, now)) {
  console.error("unparseable owned short must be left as-is");
  process.exit(1);
}

// 3. CH-01 on-screen re-rank: this-week GTABase+IGN are 1 and 2, not two 1s.
const weekCards = [
  ...(thisWeekJobs(hub.jobs_gtabase, now)),
  ...(thisWeekJobs(hub.jobs_ign, now)),
].slice(0, 2);
if (weekCards.length !== 2 || weekCards[0].rank !== 1 || weekCards[1].rank !== 1) {
  console.error("fixture this-week GTABase+IGN should both be source rank 1", weekCards.map((j) => j.rank));
  process.exit(1);
}
const ranked = withDisplayRanks(weekCards);
if (ranked.length !== 2 || ranked[0].rank !== 1 || ranked[1].rank !== 2) {
  console.error("this-week cards must rank 1, 2", ranked.map((j) => j.rank));
  process.exit(1);
}
const older = withDisplayRanks(hub.jobs_gtabase || []);
const olderRanks = older.map((j) => j.rank);
if (olderRanks.join(",") !== older.map((_, i) => i + 1).join(",")) {
  console.error("較早週更 list must re-rank 1..n", olderRanks);
  process.exit(1);
}

console.log("test_this_week.mjs ok", shown.map((j) => j.updated), ranked.map((j) => j.rank));
