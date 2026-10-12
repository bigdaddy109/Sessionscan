#!/usr/bin/env node
/**
 * Why this test matters: Phase C Money must replace the stub with cited
 * takes only (every figure needs a source URL + date) and a working $/hr
 * calculator — inventing GTA$ numbers would break the redesign trust rule.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MONEY_LAST_UPDATED,
  MONEY_ROUTES,
  dollarsPerHour,
  formatGtaMoney,
  moneyGuideJsonLd,
  moneyRoutesRanked,
  renderMoneyGuideBody,
} from "../src/moneyGuide.js";
import { SITE_PAGES, renderSitePage, webPageJsonLd } from "../src/sitePages.js";
import { parseJsonLdScripts } from "../src/structuredData.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function fail(msg, extra) {
  console.error(msg, extra ?? "");
  process.exit(1);
}

if (!/^\d{4}-\d{2}-\d{2}$/.test(MONEY_LAST_UPDATED)) fail("MONEY_LAST_UPDATED date");

const ranked = moneyRoutesRanked();
if (ranked.length < 3) fail("need several money routes");
for (let i = 1; i < ranked.length; i++) {
  if (ranked[i - 1].takeGta < ranked[i].takeGta) fail("routes must sort by take desc");
}

for (const route of MONEY_ROUTES) {
  if (!route.id) fail("route id");
  if (!route.title?.en || !route.title?.zh) fail("route bilingual title", route.id);
  if (!route.highlight?.en || !route.highlight?.zh) fail("route bilingual highlight", route.id);
  if (!Number.isFinite(route.takeGta) || route.takeGta <= 0) fail("route takeGta", route.id);
  if (!route.takeLabel?.en || !route.takeLabel?.zh) fail("route takeLabel", route.id);
  if (!route.sourceName) fail("route sourceName", route.id);
  if (!/^https:\/\//.test(route.sourceUrl || "")) fail("route sourceUrl https", route.id);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(route.sourceDate || "")) fail("route sourceDate", route.id);
}

if (formatGtaMoney(1_300_000) !== "GTA$1,300,000") fail("formatGtaMoney");
if (dollarsPerHour(600_000, 60) !== 600_000) fail("calc 60 min");
if (dollarsPerHour(600_000, 30) !== 1_200_000) fail("calc 30 min");
if (dollarsPerHour(600_000, 0) !== null) fail("calc rejects 0 min");
if (dollarsPerHour(600_000, -5) !== null) fail("calc rejects negative min");

const moneyPage = SITE_PAGES.find((p) => p.id === "money");
if (!moneyPage || moneyPage.stub) fail("money page must not be stub");

const en = renderSitePage(moneyPage, { lang: "en", cssHref: "../../assets/x.css", faviconHref: "../../favicon.svg" });
if (en.includes("page-stub-flag")) fail("en money must drop stub flag");
if (!en.includes("money-route-list")) fail("en money rank list");
if (!en.includes("moneyCalcRoute") || !en.includes("data-money-calculator")) fail("en money calculator");
if (!en.includes(MONEY_LAST_UPDATED)) fail("en last updated");
if (!en.includes("https://gta.fandom.com/wiki/The_Cayo_Perico_Heist/Finale")) fail("en cayo source");
if (!en.includes("GTA$1,300,000")) fail("en cited cayo take");

const zh = renderSitePage(moneyPage, { lang: "zh", cssHref: "../../../assets/x.css", faviconHref: "../../../favicon.svg" });
if (zh.includes("page-stub-flag")) fail("zh money must drop stub flag");
if (!zh.includes("lang=\"zh-Hant\"")) fail("zh lang");
if (!zh.includes("佩里克島") && !zh.includes("賺錢指南")) fail("zh money copy");
if (!zh.includes("/zh/guides/money/")) fail("zh money url");

const body = renderMoneyGuideBody("en");
if (body.includes("Stub")) fail("body must not say Stub");
for (const route of MONEY_ROUTES) {
  if (!body.includes(route.sourceUrl)) fail("body missing source", route.id);
}

let ld;
try {
  ld = parseJsonLdScripts(en).find((b) => b["@graph"]);
} catch (err) {
  fail("money JSON-LD parse", err);
}
const list = ld?.["@graph"]?.find((n) => n["@type"] === "ItemList");
if (!list || list.numberOfItems !== ranked.length) fail("ItemList JSON-LD");
const expected = webPageJsonLd(moneyPage, "en");
if (expected["@graph"]?.find((n) => n["@type"] === "ItemList")?.numberOfItems !== ranked.length) {
  fail("moneyGuideJsonLd ItemList");
}
if (moneyGuideJsonLd("zh")["@graph"][0].inLanguage !== "zh-Hant") fail("zh JSON-LD lang");

const distMoney = resolve(root, "dist/guides/money/index.html");
if (existsSync(distMoney)) {
  const built = readFileSync(distMoney, "utf8");
  if (built.includes("page-stub-flag")) fail("dist money still stub");
  if (!built.includes("money-route-list")) fail("dist money missing rank");
  if (!built.includes("static.cloudflareinsights.com/beacon.min.js")) fail("dist money CF beacon");
}

console.log("test_money_guide.mjs ok", MONEY_ROUTES.length, "routes");
