#!/usr/bin/env node
/**
 * Why this test matters: BreadcrumbList JSON-LD on dist shell/freeze pages must
 * ship absolute sessionscan.net URLs, contiguous positions from 1, and locale-
 * correct names — relative crumbs or EN strings on /zh/ break rich results.
 * Runs after npm run build (CI); skips cleanly if dist is absent locally.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { t } from "../src/i18n.js";
import {
  absoluteBreadcrumbItemUrl,
  parseJsonLdScripts,
} from "../src/structuredData.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");

function fail(msg, extra) {
  console.error(msg, extra ?? "");
  process.exit(1);
}

function assertBreadcrumb(html, { lang, expectUrls, expectNames, label }) {
  const ui = lang === "zh" ? "zh" : "en";
  const blocks = parseJsonLdScripts(html);
  const graph = blocks.find((b) => Array.isArray(b?.["@graph"]))?.["@graph"];
  if (!graph) fail(`${label}: no @graph JSON-LD`);
  const bc = graph.find((n) => n?.["@type"] === "BreadcrumbList");
  if (!bc) fail(`${label}: BreadcrumbList missing`);
  const els = bc.itemListElement || [];
  if (!els.length) fail(`${label}: empty itemListElement`);

  for (let i = 0; i < els.length; i++) {
    const el = els[i];
    if (el.position !== i + 1) fail(`${label}: position not contiguous from 1`, { i, el });
    const itemUrl = absoluteBreadcrumbItemUrl(el.item);
    if (!/^https:\/\/sessionscan\.net\//.test(itemUrl)) {
      fail(`${label}: crumb item must be absolute https://sessionscan.net/…`, { itemUrl, el });
    }
    if (ui === "zh" && !itemUrl.startsWith("https://sessionscan.net/zh/")) {
      fail(`${label}: zh crumb must stay under /zh/`, itemUrl);
    }
    if (ui === "en" && itemUrl.startsWith("https://sessionscan.net/zh/")) {
      fail(`${label}: en crumb must not use /zh/`, itemUrl);
    }
  }

  const urls = els.map((el) => absoluteBreadcrumbItemUrl(el.item));
  const names = els.map((el) => el.name);
  for (const u of expectUrls) {
    if (!urls.includes(u)) fail(`${label}: missing crumb URL ${u}`, urls);
  }
  if (expectNames) {
    for (const n of expectNames) {
      if (!names.includes(n)) fail(`${label}: missing crumb name ${n}`, names);
    }
  }
  // Locale smoke: Home / Archive labels must match page language.
  if (ui === "en") {
    if (!names.includes(t("videoHome", {}, "en"))) fail(`${label}: EN Home name`, names);
    if (names.includes(t("videoHome", {}, "zh"))) fail(`${label}: ZH Home leaked into EN`, names);
  } else {
    if (!names.includes(t("videoHome", {}, "zh"))) fail(`${label}: ZH Home name`, names);
    if (names.includes("Home") && !names.includes("回首頁")) fail(`${label}: EN Home on ZH page`, names);
  }
  return { urls, names, bc };
}

if (!existsSync(resolve(dist, "week/index.html"))) {
  console.log("test_breadcrumb_dist.mjs skip (dist/week missing — run npm run build)");
  process.exit(0);
}

const enWeek = readFileSync(resolve(dist, "week/index.html"), "utf8");
assertBreadcrumb(enWeek, {
  lang: "en",
  label: "dist/week",
  expectUrls: ["https://sessionscan.net/", "https://sessionscan.net/week/"],
  expectNames: [t("videoHome", {}, "en"), t("navArchive", {}, "en")],
});

const zhWeek = readFileSync(resolve(dist, "zh/week/index.html"), "utf8");
assertBreadcrumb(zhWeek, {
  lang: "zh",
  label: "dist/zh/week",
  expectUrls: ["https://sessionscan.net/zh/", "https://sessionscan.net/zh/week/"],
  expectNames: [t("videoHome", {}, "zh"), t("navArchive", {}, "zh")],
});

const weekDirs = readdirSync(resolve(dist, "week"), { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(d.name))
  .map((d) => d.name)
  .sort()
  .reverse();
if (!weekDirs.length) fail("dist has no freeze week dirs");
const tip = weekDirs[0];

const enFreeze = readFileSync(resolve(dist, `week/${tip}/index.html`), "utf8");
const enFr = assertBreadcrumb(enFreeze, {
  lang: "en",
  label: `dist/week/${tip}`,
  expectUrls: [
    "https://sessionscan.net/",
    "https://sessionscan.net/week/",
    `https://sessionscan.net/week/${tip}/`,
  ],
  expectNames: [
    t("videoHome", {}, "en"),
    t("navArchive", {}, "en"),
    t("archiveWeekHeading", { week: tip }, "en"),
  ],
});
if (enFr.names.at(-1) !== t("archiveWeekHeading", { week: tip }, "en")) {
  fail("EN freeze last crumb must be archiveWeekHeading", enFr.names);
}

const zhFreeze = readFileSync(resolve(dist, `zh/week/${tip}/index.html`), "utf8");
const zhFr = assertBreadcrumb(zhFreeze, {
  lang: "zh",
  label: `dist/zh/week/${tip}`,
  expectUrls: [
    "https://sessionscan.net/zh/",
    "https://sessionscan.net/zh/week/",
    `https://sessionscan.net/zh/week/${tip}/`,
  ],
  expectNames: [
    t("videoHome", {}, "zh"),
    t("navArchive", {}, "zh"),
    t("archiveWeekHeading", { week: tip }, "zh"),
  ],
});
if (zhFr.names.at(-1) !== t("archiveWeekHeading", { week: tip }, "zh")) {
  fail("ZH freeze last crumb must be archiveWeekHeading", zhFr.names);
}

// Money page also carries breadcrumbs after build.
const moneyEn = resolve(dist, "guides/money/index.html");
if (existsSync(moneyEn)) {
  assertBreadcrumb(readFileSync(moneyEn, "utf8"), {
    lang: "en",
    label: "dist/guides/money",
    expectUrls: ["https://sessionscan.net/", "https://sessionscan.net/guides/money/"],
    expectNames: [t("videoHome", {}, "en"), t("navMoney", {}, "en")],
  });
}

console.log("test_breadcrumb_dist.mjs ok", tip);
