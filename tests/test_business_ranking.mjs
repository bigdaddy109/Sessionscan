#!/usr/bin/env node
/**
 * Why this test matters: Phase C Businesses must ship a real ranked list with
 * last-updated + cited sources (no stub). Invented GTA$ figures without a
 * source URL would violate the redesign proposal and mislead players.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BUSINESS_LIST_UPDATED,
  BUSINESS_RANKING,
  RANKING_CONSENSUS,
  assertNoUnsourcedFigures,
  businessesPageBodyHtml,
  businessesPageJsonLd,
  formatSourceDate,
} from "../src/businessRanking.js";
import { SITE_PAGES, renderSitePage } from "../src/sitePages.js";
import { parseJsonLdScripts } from "../src/structuredData.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function fail(msg, extra) {
  console.error(msg, extra ?? "");
  process.exit(1);
}

if (!formatSourceDate(BUSINESS_LIST_UPDATED)) fail("list updated date");
if (!RANKING_CONSENSUS.url.startsWith("https://")) fail("consensus url");
if (BUSINESS_RANKING.length < 5) fail("ranking too short", BUSINESS_RANKING.length);

const unsourced = assertNoUnsourcedFigures();
if (unsourced.length) fail("unsourced figures or missing source", unsourced);

const ranks = BUSINESS_RANKING.map((b) => b.rank);
if (ranks.join(",") !== [...ranks].sort((a, b) => a - b).join(",")) {
  fail("ranks must be ascending", ranks);
}

for (const item of BUSINESS_RANKING) {
  if (!item.id || !item.title?.en || !item.title?.zh) fail("missing title", item.id);
  if (!item.highlight?.en || !item.highlight?.zh) fail("missing highlight", item.id);
  if (!/^https:\/\/www\.rockstargames\.com\//.test(item.source.url)) {
    fail("feature source must be Rockstar", item.id);
  }
  if (!formatSourceDate(item.source.date)) fail("source date", item.id);
}

const bodyEn = businessesPageBodyHtml("en");
if (bodyEn.includes("page-stub-flag")) fail("EN body must not be stub");
if (!bodyEn.includes("biz-rank-list")) fail("EN missing rank list");
if (!bodyEn.includes(BUSINESS_LIST_UPDATED)) fail("EN missing last-updated");
if (!bodyEn.includes("Acid Lab")) fail("EN missing Acid Lab");
if (!bodyEn.includes(RANKING_CONSENSUS.url)) fail("EN missing consensus link");
for (const item of BUSINESS_RANKING) {
  if (!bodyEn.includes(item.source.url)) fail("EN missing source url", item.id);
}

const bodyZh = businessesPageBodyHtml("zh");
if (!bodyZh.includes("迷幻藥實驗室") && !bodyZh.includes("生意")) fail("zh body missing zh copy");
if (!bodyZh.includes("biz-rank-list")) fail("zh missing list");

const page = SITE_PAGES.find((p) => p.id === "businesses");
if (!page || page.stub) fail("businesses SITE_PAGES must not be stub");

const html = renderSitePage(page, {
  lang: "en",
  cssHref: "../../../assets/x.css",
  faviconHref: "../../../favicon.svg",
});
if (html.includes("page-stub-flag")) fail("rendered businesses still stub");
if (!html.includes('rel="canonical" href="https://sessionscan.net/guides/businesses/"')) {
  fail("businesses canonical");
}
if (!html.includes("biz-rank-list")) fail("rendered missing list");

let ld;
try {
  ld = parseJsonLdScripts(html).find((b) => b["@graph"]);
} catch (err) {
  fail("businesses JSON-LD parse", err);
}
const graph = ld?.["@graph"] || [];
const webpage = graph.find((n) => n["@type"] === "WebPage");
const itemList = graph.find((n) => n["@type"] === "ItemList");
if (!webpage) fail("WebPage JSON-LD");
if (!itemList || itemList.numberOfItems !== BUSINESS_RANKING.length) {
  fail("ItemList JSON-LD", itemList?.numberOfItems);
}
const expected = businessesPageJsonLd("en");
if (webpage.dateModified !== BUSINESS_LIST_UPDATED) fail("WebPage dateModified");
if (itemList.itemListElement?.length !== expected["@graph"].find((n) => n["@type"] === "ItemList").itemListElement.length) {
  fail("ItemList length mismatch");
}

const zhHtml = renderSitePage(page, {
  lang: "zh",
  cssHref: "../../../../assets/x.css",
  faviconHref: "../../../../favicon.svg",
});
if (!zhHtml.includes('lang="zh-Hant"')) fail("zh lang");
if (!zhHtml.includes("https://sessionscan.net/zh/guides/businesses/")) fail("zh url");
if (zhHtml.includes("page-stub-flag")) fail("zh still stub");

const distEn = resolve(root, "dist/guides/businesses/index.html");
const distZh = resolve(root, "dist/zh/guides/businesses/index.html");
if (existsSync(distEn)) {
  const built = readFileSync(distEn, "utf8");
  if (built.includes("page-stub-flag")) fail("dist EN still stub");
  if (!built.includes("biz-rank-list")) fail("dist EN missing list");
  if (!built.includes("static.cloudflareinsights.com/beacon.min.js")) fail("dist EN CF beacon");
}
if (existsSync(distZh)) {
  const built = readFileSync(distZh, "utf8");
  if (built.includes("page-stub-flag")) fail("dist zh still stub");
  if (!built.includes("biz-rank-list")) fail("dist zh missing list");
}

console.log(
  "test_business_ranking.mjs ok",
  BUSINESS_RANKING.length,
  "businesses",
  "updated",
  BUSINESS_LIST_UPDATED,
);
