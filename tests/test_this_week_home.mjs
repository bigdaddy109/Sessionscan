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
  CLAIMED_STORAGE_PREFIX,
  WEEK_BULLET_CATEGORIES,
  buildWeekBullets,
  claimedStorageKey,
  countClaimedProgress,
  countdownParts,
  formatClaimedProgress,
  loadClaimedIds,
  nextWeeklyUpdateAt,
  pickHomeShort,
  saveClaimedIds,
  toggleClaimedId,
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

// Claimed checklist: local-only, keyed by Rockstar week so Thu reset is automatic.
const mem = new Map();
const fakeStore = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => {
    mem.set(k, String(v));
  },
};
const keyA = claimedStorageKey(now);
const keyB = claimedStorageKey(new Date(now.getTime() + 7 * 86400000));
if (!keyA.startsWith(CLAIMED_STORAGE_PREFIX)) fail("claimed key prefix", keyA);
if (keyA === keyB) fail("adjacent Rockstar weeks must not share claimed key", { keyA, keyB });
saveClaimedIds(keyA, ["multipliers", "free"], fakeStore);
const loaded = loadClaimedIds(keyA, fakeStore);
if (!loaded.has("multipliers") || !loaded.has("free") || loaded.size !== 2) {
  fail("loadClaimedIds", [...loaded]);
}
toggleClaimedId(keyA, "multipliers", fakeStore);
if (loadClaimedIds(keyA, fakeStore).has("multipliers")) fail("toggle off failed");
toggleClaimedId(keyA, "podium", fakeStore);
if (!loadClaimedIds(keyA, fakeStore).has("podium")) fail("toggle on failed");
// Other week key stays empty — no cross-week bleed.
if (loadClaimedIds(keyB, fakeStore).size !== 0) fail("other week must start empty");

// Progress copy — players need a glanceable “done of total” on home / tip freeze.
{
  const sampleBullets = WEEK_BULLET_CATEGORIES.map((c) => ({ id: c.id }));
  const prog0 = countClaimedProgress(sampleBullets, new Set());
  if (prog0.done !== 0 || prog0.total !== 5) fail("empty claimed progress", prog0);
  const prog2 = countClaimedProgress(sampleBullets, new Set(["free", "podium"]));
  if (prog2.done !== 2 || prog2.total !== 5) fail("partial claimed progress", prog2);
  const en = formatClaimedProgress(2, 5, "en");
  if (!en.includes("2") || !en.includes("5") || !/claimed/i.test(en)) fail("en progress copy", en);
  const zh = formatClaimedProgress(2, 5, "zh");
  if (!zh.includes("2") || !zh.includes("5") || !zh.includes("已完成")) fail("zh progress copy", zh);
}

// Halloween week titles (live 2026-10-08): Freebies + Bonuses & Discounts fill;
// bare "Halloween Event/Series" must NOT invent a multipliers slot — only explicit Nx.
const halloweenNow = new Date("2026-10-10T12:00:00Z");
const halloweenHubNoNx = {
  jobs_gtabase: [
    {
      title: "GTA Online Weekly Update (October 8-14): Second Week of Halloween Event, Bonuses & Discounts",
      url: "https://www.gtabase.com/example-halloween-week",
      updated: "2026-10-08",
      source: "GTABase",
    },
  ],
  jobs_ign: [
    {
      title: "GTA Online Weekly Updates (October 8, 2026): Halloween Series Continues, New Freebies, and More",
      url: "https://www.ign.com/wikis/gta-5/example-halloween",
      updated: "2026-10-08",
      source: "IGN",
    },
  ],
  sessionscan_slot: { short: null },
};
const noNxBullets = buildWeekBullets(halloweenHubNoNx, halloweenNow, "en");
const noNxMulti = noNxBullets.find((b) => b.id === "multipliers");
if (!noNxMulti?.pending) {
  fail("Halloween Event/Series without Nx must leave multipliers pending", noNxMulti);
}
if (noNxMulti && /\d+\s*[xX×]/.test(noNxMulti.reward) && !noNxMulti.pending) {
  fail("must not fabricate Nx in reward text", noNxMulti);
}
const noNxFree = noNxBullets.find((b) => b.id === "free");
if (!noNxFree || noNxFree.pending || !/freebies/i.test(noNxFree.reward)) {
  fail("Freebies title must fill free slot", noNxFree);
}
const noNxDisc = noNxBullets.find((b) => b.id === "discounts");
if (!noNxDisc || noNxDisc.pending || !/discount/i.test(noNxDisc.reward)) {
  fail("Bonuses & Discounts must fill discounts", noNxDisc);
}

// With an explicit 3X Short title, multipliers uses that original title (not a made-up rate).
const halloweenHubNx = {
  ...halloweenHubNoNx,
  sessionscan_slot: {
    short: {
      title: "3X Halloween Survival This Week | GTA Online",
      video_id: "abcdefghijk",
      url: "https://www.youtube.com/shorts/abcdefghijk",
      date: "2026-10-09",
      channel: "SessionScan",
    },
  },
};
const nxBullets = buildWeekBullets(halloweenHubNx, halloweenNow, "en");
const nxMulti = nxBullets.find((b) => b.id === "multipliers");
if (!nxMulti || nxMulti.pending) fail("3X Short must fill multipliers", nxMulti);
if (!/^3X Halloween Survival/i.test(nxMulti.reward)) {
  fail("multipliers reward must be original Nx title, not Halloween Event prose", nxMulti);
}
// Must not prefer bare Halloween Event over the Nx Short when both exist.
if (/Halloween Event/i.test(nxMulti.reward) && !/3X/i.test(nxMulti.reward)) {
  fail("must not use non-Nx Halloween Event for multipliers when Nx Short exists", nxMulti);
}

console.log("test_this_week_home.mjs ok");
