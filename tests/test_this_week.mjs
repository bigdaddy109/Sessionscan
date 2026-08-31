#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isThisWeekJob, thisWeekJobs } from "../src/thisWeek.js";

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

console.log("test_this_week.mjs ok", shown.map((j) => j.updated));
