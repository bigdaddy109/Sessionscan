#!/usr/bin/env node
/**
 * Why this test matters: Phase B home is the Thursday “what to do” verdict.
 * Bullets, countdown, and owned-Short pick must stay honest (no fabricated
 * Short URL) and keep working when snapshot titles only hint at categories.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { snapshotNow } from "../src/homeExtras.js";
import { rockstarWeekStart } from "../src/thisWeek.js";
import {
  WEEK_BULLET_CATEGORIES,
  buildWeekBullets,
  countdownParts,
  nextWeeklyUpdateAt,
  pickHomeShort,
  weekSignalItems,
} from "../src/thisWeekHome.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sample = JSON.parse(readFileSync(resolve(root, "public/data/sample.json"), "utf8"));
const site = JSON.parse(readFileSync(resolve(root, "public/data/site.json"), "utf8"));

function fail(msg, extra) {
  console.error(msg, extra ?? "");
  process.exit(1);
}

if (WEEK_BULLET_CATEGORIES.length !== 5) fail("five bullet slots");

const now = new Date("2026-08-29T12:00:00Z");
const next = nextWeeklyUpdateAt(now);
const start = rockstarWeekStart(now);
if (next.getTime() !== start.getTime() + 7 * 86400000) fail("next weekly = current Thu + 7d", { next, start });

const parts = countdownParts(new Date(now.getTime() + 90061000), now);
if (parts.days !== 1 || parts.hours !== 1 || parts.minutes !== 1) fail("countdown parts", parts);
if (countdownParts(now, now).totalMs !== 0) fail("zero countdown");

const siteNow = snapshotNow(site.meta) || new Date("2026-08-30T02:00:00Z");
const signals = weekSignalItems(site, siteNow);
if (!signals.some((s) => /weekly update/i.test(s.title))) fail("signals include official weekly", signals.map((s) => s.title));

const bullets = buildWeekBullets(site, siteNow, "en");
if (bullets.length !== 5) fail("bullet count", bullets.length);
const multi = bullets.find((b) => b.id === "multipliers");
if (!multi || multi.pending) fail("6X short should fill multipliers", multi);
const disc = bullets.find((b) => b.id === "discounts");
if (!disc || disc.pending) fail("Bonuses & Discounts should fill discounts", disc);
if (!disc.url) fail("discount bullet needs outbound url");

const zh = buildWeekBullets(site, siteNow, "zh");
if (!zh.every((b) => b.label)) fail("zh labels");
if (!zh.some((b) => /倍數|折扣|免費|展台|廢車/.test(b.label))) fail("zh category labels", zh.map((b) => b.label));

const short = pickHomeShort(site, siteNow);
if (!short || short.video_id !== "J0XqcPVN7Yg") fail("pick owned short from site.json", short);

const emptyShort = pickHomeShort(sample, snapshotNow(sample.meta) || now);
if (emptyShort) fail("sample with null short must not invent a video", emptyShort);

console.log("test_this_week_home.mjs ok");
