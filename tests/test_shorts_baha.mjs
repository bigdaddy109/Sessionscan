#!/usr/bin/env node
import { filterOtherShorts } from "../src/shortsFilter.js";
import { bahaAbsTime, parseSnapshotNow, snapshotAgeParts } from "../src/bahaTime.js";

const shorts = filterOtherShorts([
  { video_id: "a", title: "Que Animal Consigue Esconderse #gta #gtav", channel: "FAZZGTA", lang: "en" },
  { video_id: "b", title: "Que Animal Consigue Esconderse #gta  #gtav", channel: "FAZZGTA", lang: "en" },
  { video_id: "c", title: "Que Animal Consigue Esconderse  #EB #gtav", channel: "FAZZGTA", lang: "en" },
  { video_id: "d", title: "Trolling A GTA 5 Cops As A Traffic Bollards #gta5", channel: "Gaurav Gaming", lang: "en" },
  { video_id: "e", title: "Trolling A GTA 5 Cops With Fake Mop #gta5", channel: "Gaurav Gaming", lang: "en" },
  { video_id: "f", title: "GTA 온라인 주간 보상 쇼츠", channel: "한채널", lang: "zh", views: 12 },
]);
const titles = shorts.map((s) => s.title);
if (titles.filter((t) => /Que Animal/i.test(t)).length !== 1) {
  console.error("expected 1 Que Animal card", titles);
  process.exit(1);
}
if (titles.filter((t) => /^Trolling A GTA 5/.test(t)).length !== 1) {
  console.error("expected 1 trolling series card", titles);
  process.exit(1);
}
const ko = shorts.find((s) => /온라인/.test(s.title));
if (!ko || ko.lang !== "ko") {
  console.error("Hangul must be lang ko", ko);
  process.exit(1);
}

const now = parseSnapshotNow("2026-08-30 02:56");
const min11 = bahaAbsTime("11 分前", now);
const yest = bahaAbsTime("昨天 20:33", now);
if (min11.relative || min11.text !== "2026-08-30 02:45") {
  console.error("11 分前", min11);
  process.exit(1);
}
if (yest.relative || yest.text !== "2026-08-29 20:33") {
  console.error("昨天 20:33", yest);
  process.exit(1);
}
const junk = bahaAbsTime("剛剛發的不明時間", now);
if (!junk.relative || junk.text !== "剛剛發的不明時間") {
  console.error("unparseable", junk);
  process.exit(1);
}

// Why: home banner relative age must use Taipei meta stamps, not wall-clock invent.
{
  const fixedNow = parseSnapshotNow("2026-10-14 02:00");
  const hours = snapshotAgeParts("2026-10-13 14:51", fixedNow);
  if (!hours || hours.unit !== "hours" || hours.n !== 11) {
    console.error("snapshotAgeParts hours", hours);
    process.exit(1);
  }
  const mins = snapshotAgeParts("2026-10-14 01:45", fixedNow);
  if (!mins || mins.unit !== "minutes" || mins.n !== 15) {
    console.error("snapshotAgeParts minutes", mins);
    process.exit(1);
  }
  const just = snapshotAgeParts("2026-10-14 02:00", fixedNow);
  if (!just || just.unit !== "now") {
    console.error("snapshotAgeParts now", just);
    process.exit(1);
  }
  if (snapshotAgeParts("not-a-date", fixedNow) != null) {
    console.error("snapshotAgeParts must null on junk");
    process.exit(1);
  }
}
console.log("test_shorts_baha.mjs ok", titles.length, min11.text, yest.text);
