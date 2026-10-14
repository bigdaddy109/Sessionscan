#!/usr/bin/env node
/**
 * Why this test matters: Phase B home is the Thursday “what to do” verdict.
 * Bullets, countdown, and owned-Short pick must stay honest (no fabricated
 * Short URL) and keep working when snapshot titles only hint at categories.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { snapshotNow } from "../src/homeExtras.js";
import {
  CLAIMED_STORAGE_PREFIX,
  WEEK_BULLET_CATEGORIES,
  buildWeekBullets,
  claimedStorageKey,
  clearClaimedIds,
  countClaimedProgress,
  countdownParts,
  formatClaimedProgress,
  formatWeekCountdown,
  formatWeekTipPlainText,
  injectStaticWeekBullets,
  injectStaticWeekCountdown,
  loadClaimedIds,
  nextWeeklyUpdateAt,
  pickHomeShort,
  saveClaimedIds,
  staticWeekBulletsInnerHtml,
  staticWeekCountdownText,
  toggleClaimedId,
  weekBulletItemsHtml,
  weekSignalItems,
  weekTipCopyButtonHtml,
  weekTipTextFromListEl,
} from "../src/thisWeekHome.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sample = JSON.parse(readFileSync(resolve(root, "public/data/sample.json"), "utf8"));
const site = JSON.parse(readFileSync(resolve(root, "public/data/site.json"), "utf8"));

function fail(msg, extra) {
  console.error(msg, extra ?? "");
  process.exit(1);
}

if (WEEK_BULLET_CATEGORIES.length !== 5) fail("five bullet slots");

const now = new Date("2026-08-29T12:00:00Z"); // Saturday UTC
const next = nextWeeklyUpdateAt(now);
// Next Rockstar drop is Thursday 10:00 UTC (not Taipei week-start midnight).
if (next.toISOString() !== "2026-09-03T10:00:00.000Z") {
  fail("next weekly = next Thu 10:00 UTC", next.toISOString());
}

const parts = countdownParts(new Date(now.getTime() + 90061000), now);
if (parts.days !== 1 || parts.hours !== 1 || parts.minutes !== 1) fail("countdown parts", parts);
if (countdownParts(now, now).totalMs !== 0) fail("zero countdown");

// Why: Taipei Thu morning is still Wednesday UTC — using local weekday made the
// countdown jump a full week (bug: 7d+ when ~11h remained to Thu 10:00 UTC).
function assertNext(label, nowIso, expectIso) {
  const got = nextWeeklyUpdateAt(new Date(nowIso)).toISOString();
  if (got !== expectIso) fail(`nextWeeklyUpdateAt ${label}`, { nowIso, got, expectIso });
}
// UTC Wednesday evening / Taipei Thursday morning (~11h to drop)
assertNext(
  "UTC Wed evening → this Thu 10:00",
  "2026-10-14T22:55:00.000Z",
  "2026-10-15T10:00:00.000Z",
);
assertNext(
  "Taipei Thu 06:55 (= UTC Wed 22:55) → this Thu 10:00",
  "2026-10-14T22:55:00.000Z",
  "2026-10-15T10:00:00.000Z",
);
// America/Los_Angeles Wed afternoon = UTC Wed evening (same wall as above case)
assertNext(
  "LA Wed afternoon path → this Thu 10:00 UTC",
  "2026-10-14T22:55:00.000Z",
  "2026-10-15T10:00:00.000Z",
);
// Thursday early UTC (before 10:00) — still this week's drop
assertNext(
  "UTC Thu 06:00 → same Thu 10:00",
  "2026-10-15T06:00:00.000Z",
  "2026-10-15T10:00:00.000Z",
);
assertNext(
  "UTC Thu 09:59 → same Thu 10:00",
  "2026-10-15T09:59:00.000Z",
  "2026-10-15T10:00:00.000Z",
);
// Exactly at / just after 10:00 UTC → next week
assertNext(
  "UTC Thu 10:00 → next Thu",
  "2026-10-15T10:00:00.000Z",
  "2026-10-22T10:00:00.000Z",
);
assertNext(
  "UTC Thu 10:01 → next Thu",
  "2026-10-15T10:01:00.000Z",
  "2026-10-22T10:00:00.000Z",
);
// Remaining minutes before drop (Jeff report shape: ~11h not 7d)
const jeffNow = new Date("2026-10-14T22:55:00.000Z");
const jeffParts = countdownParts(nextWeeklyUpdateAt(jeffNow), jeffNow);
if (jeffParts.days !== 0 || jeffParts.hours !== 11 || jeffParts.minutes !== 5) {
  fail("Jeff Wed 22:55 UTC must be ~11h05 to Thu 10:00", jeffParts);
}
const fmt = formatWeekCountdown(jeffParts, "en");
if (!/^0d 11:05:\d{2}$/.test(fmt)) fail("countdown format near drop", fmt);

// Why: process TZ must not change the target — reproduce under Taipei / LA / UTC.
for (const tz of ["Asia/Taipei", "America/Los_Angeles", "UTC"]) {
  const probe = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import { nextWeeklyUpdateAt, countdownParts } from ${JSON.stringify(resolve(root, "src/thisWeekHome.js"))};
const now = new Date("2026-10-14T22:55:00.000Z");
const n = nextWeeklyUpdateAt(now);
const p = countdownParts(n, now);
if (n.toISOString() !== "2026-10-15T10:00:00.000Z") process.exit(2);
if (p.days !== 0 || p.hours !== 11 || p.minutes !== 5) process.exit(3);
`,
    ],
    { env: { ...process.env, TZ: tz }, encoding: "utf8" },
  );
  if (probe.status !== 0) {
    fail(`TZ=${tz} must keep Thu 10:00 UTC target`, { status: probe.status, stderr: probe.stderr, stdout: probe.stdout });
  }
}

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

// Clear checks — players need a one-tap reset for the Rockstar week (shared home/tip key).
{
  saveClaimedIds(keyA, ["multipliers", "free", "podium"], fakeStore);
  if (loadClaimedIds(keyA, fakeStore).size !== 3) fail("pre-clear claimed size");
  const emptied = clearClaimedIds(keyA, fakeStore);
  if (emptied.size !== 0 || loadClaimedIds(keyA, fakeStore).size !== 0) fail("clearClaimedIds must empty week");
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

// Why: home week countdown used to ship as "—" until JS ticks — first paint
// should show a real timer (speed / UX), with fixed now= so CI is deterministic.
{
  const fixed = new Date("2026-10-14T03:00:00Z");
  const text = staticWeekCountdownText(fixed, "en");
  if (!/^\d+d \d{2}:\d{2}:\d{2}$/.test(text)) fail("staticWeekCountdownText shape", text);
  const live = formatWeekCountdown(countdownParts(fixed, fixed), "zh");
  if (live !== "新一週視窗已開始") fail("formatWeekCountdown live zh", live);
  const shell = `<p class="week-countdown-display" id="weekCountdownDisplay">—</p>`;
  const stamped = injectStaticWeekCountdown(shell, { lang: "en", now: fixed });
  if (stamped.includes(">—<") || !stamped.includes(text)) {
    fail("injectStaticWeekCountdown", stamped);
  }
  const enDist = resolve(root, "dist/index.html");
  const zhDist = resolve(root, "dist/zh/index.html");
  if (existsSync(enDist) && existsSync(zhDist)) {
    const enHtml = readFileSync(enDist, "utf8");
    const zhHtml = readFileSync(zhDist, "utf8");
    const enCd = enHtml.match(/id="weekCountdownDisplay">([^<]*)</)?.[1] || "";
    const zhCd = zhHtml.match(/id="weekCountdownDisplay">([^<]*)</)?.[1] || "";
    if (enCd === "—" || zhCd === "—") fail("dist week countdown still em dash", { enCd, zhCd });
    if (!/^\d+d \d{2}:\d{2}:\d{2}$/.test(enCd) && !/week window|視窗/.test(enCd)) {
      fail("dist EN countdown unexpected", enCd);
    }
  }
}

// Why: home's core “do this” list was empty until JS while tip freezes already
// shipped five bullets in HTML — that is a content gap, not chrome polish.
{
  const siteNow = snapshotNow(site.meta || {}) || new Date("2026-10-14T12:00:00Z");
  const bullets = buildWeekBullets(site, siteNow, "en");
  const items = weekBulletItemsHtml(bullets, { claimable: true, lang: "en" });
  if ((items.match(/data-bullet="/g) || []).length !== 5) {
    fail("weekBulletItemsHtml must emit 5 claimable rows", items);
  }
  if (!items.includes('class="week-bullet-check"')) fail("claimable checkboxes missing", items);
  const inner = staticWeekBulletsInnerHtml(site, { lang: "en", now: siteNow });
  if (!inner.includes("week-bullet-reward")) fail("staticWeekBulletsInnerHtml empty", inner);
  const shell = `<p class="week-claim-progress" id="weekClaimProgress" hidden aria-live="polite"></p>
<ul class="week-bullet-list" id="weekBulletList"></ul>`;
  const stamped = injectStaticWeekBullets(shell, { data: site, lang: "en", now: siteNow });
  if (!stamped.includes('id="weekBulletList"') || !stamped.includes("data-claimed-key=")) {
    fail("injectStaticWeekBullets claimed key", stamped);
  }
  if ((stamped.match(/data-bullet="/g) || []).length !== 5) {
    fail("injectStaticWeekBullets must stamp 5 bullets", stamped);
  }
  if (/id="weekBulletList"[^>]*>\s*<\/ul>/.test(stamped)) {
    fail("injectStaticWeekBullets left list empty", stamped);
  }
  if (!stamped.includes("Claimed 0 of 5") || /id="weekClaimProgress"[^>]*\bhidden\b/.test(stamped)) {
    fail("injectStaticWeekBullets must unhide Claimed 0 of 5", stamped);
  }
  const enDist = resolve(root, "dist/index.html");
  const zhDist = resolve(root, "dist/zh/index.html");
  if (existsSync(enDist) && existsSync(zhDist)) {
    const enHtml = readFileSync(enDist, "utf8");
    const zhHtml = readFileSync(zhDist, "utf8");
    const enCount = (enHtml.match(/id="weekBulletList"[\s\S]*?<\/ul>/)?.[0].match(/data-bullet="/g) || []).length;
    const zhCount = (zhHtml.match(/id="weekBulletList"[\s\S]*?<\/ul>/)?.[0].match(/data-bullet="/g) || []).length;
    if (enCount !== 5 || zhCount !== 5) {
      fail("dist home week bullets missing", { enCount, zhCount });
    }
    if (!enHtml.includes("2X / 3X") && !enHtml.includes("week-bullet-label")) {
      fail("dist EN bullets lack labels", enCount);
    }
    if (!zhHtml.includes("2X／3X") && !zhHtml.includes("倍數")) {
      fail("dist ZH bullets lack zh labels", zhCount);
    }
  }
}

// Why: players paste the weekly tip into Discord / LINE — clipboard text must
// list real rewards only (skip pending) and end with the locale home URL.
{
  const siteNow = snapshotNow(site.meta || {}) || new Date("2026-10-14T12:00:00Z");
  const bullets = buildWeekBullets(site, siteNow, "en");
  const text = formatWeekTipPlainText(bullets, { lang: "en" });
  if (!text.startsWith("This week — do this")) fail("tip text heading", text);
  if (!text.includes("https://sessionscan.net/")) fail("tip text needs home URL", text);
  if (/No clear title signal/i.test(text)) fail("tip text must skip pending", text);
  const filled = bullets.filter((b) => !b.pending);
  for (const b of filled) {
    if (!text.includes(b.label) || !text.includes(b.reward)) {
      fail("tip text missing filled bullet", { label: b.label, reward: b.reward, text });
    }
  }
  const zhText = formatWeekTipPlainText(bullets, { lang: "zh" });
  if (!zhText.includes("https://sessionscan.net/zh/")) fail("zh tip URL", zhText);
  if (!zhText.startsWith("本週 — 先做這些")) fail("zh tip heading", zhText);

  const fakeHost = {
    querySelectorAll(sel) {
      if (sel !== ".week-bullet") return [];
      return [
        {
          classList: { contains: (c) => c === "is-pending" },
          querySelector(q) {
            if (q === ".week-bullet-label") return { textContent: "Discounts" };
            if (q === ".week-bullet-reward") return { textContent: "Pending line" };
            return null;
          },
        },
        {
          classList: { contains: () => false },
          querySelector(q) {
            if (q === ".week-bullet-label") return { textContent: "Free / limited" };
            if (q === ".week-bullet-reward") return { textContent: "New Freebies" };
            if (q === "a.week-bullet-how") return { getAttribute: () => "https://example.com/a" };
            return null;
          },
        },
      ];
    },
  };
  const fromDom = weekTipTextFromListEl(fakeHost, { lang: "en" });
  if (fromDom.includes("Pending line") || !fromDom.includes("New Freebies")) {
    fail("weekTipTextFromListEl pending filter", fromDom);
  }
  if (!fromDom.includes("https://example.com/a")) fail("weekTipTextFromListEl url", fromDom);

  const btn = weekTipCopyButtonHtml("zh", { id: "archiveTipCopy" });
  if (!btn.includes('id="archiveTipCopy"') || !btn.includes("複製 tip")) {
    fail("weekTipCopyButtonHtml", btn);
  }
}

console.log("test_this_week_home.mjs ok");
