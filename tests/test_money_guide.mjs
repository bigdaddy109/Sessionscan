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
  MONEY_CALC_MINUTE_PRESETS,
  MONEY_LAST_UPDATED,
  MONEY_ROUTES,
  dollarsPerHour,
  formatGtaMoney,
  homeMoneyGuideLinkHtml,
  injectHomeMoneyGuideLink,
  moneyCalcMinutePresetsHtml,
  moneyGuideJsonLd,
  moneyRoutesRanked,
  moneyTipFreezeLinkHtml,
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
// Why: t()/interpolate would wipe `{rate}` from data-template — calculator must keep the placeholder.
if (!en.includes('data-template="{rate}/hr')) fail("en calc template keeps {rate}");
// Why: players estimate $/hr faster with one-tap minutes — presets must match the calculator input.
if (!Array.isArray(MONEY_CALC_MINUTE_PRESETS) || MONEY_CALC_MINUTE_PRESETS.join(",") !== "15,30,45,60") {
  fail("MONEY_CALC_MINUTE_PRESETS", MONEY_CALC_MINUTE_PRESETS);
}
if (!en.includes('id="moneyCalcPresets"') || !en.includes('data-minutes="15"') || !en.includes('data-minutes="60"')) {
  fail("en money calc presets missing", en.match(/money-calc-presets[\s\S]{0,200}/)?.[0]);
}
const presetHtml = moneyCalcMinutePresetsHtml("zh");
if (!presetHtml.includes("分鐘快選") || !presetHtml.includes('data-minutes="30"')) {
  fail("zh moneyCalcMinutePresetsHtml", presetHtml);
}
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
  if (!built.includes('id="moneyCalcPresets"') || !built.includes('data-minutes="45"')) {
    fail("dist money missing minute presets");
  }
}

// Why: players on home jobs need a reciprocal CTA to the evergreen money guide
// (money page already links back via moneyWeekLink); path must stay locale-correct.
const homeMoneyEn = homeMoneyGuideLinkHtml("en");
if (!homeMoneyEn.includes('id="homeMoneyGuideLink"') || !homeMoneyEn.includes('href="/guides/money/"')) {
  fail("home money link en", homeMoneyEn);
}
if (!homeMoneyEn.includes("Money guide") || !homeMoneyEn.includes("$/hr")) fail("home money en copy");
const homeMoneyZh = homeMoneyGuideLinkHtml("zh");
if (!homeMoneyZh.includes('href="/zh/guides/money/"') || !homeMoneyZh.includes("賺錢指南")) {
  fail("home money link zh", homeMoneyZh);
}
const jobShell = `<section class="view" id="view-jobs"><p class="source-hint" id="jobHint"></p><div class="controls"></div></section>`;
const injected = injectHomeMoneyGuideLink(jobShell, { lang: "en" });
if (!injected.includes('id="homeMoneyGuideLink"') || !injected.includes('href="/guides/money/"')) {
  fail("injectHomeMoneyGuideLink under jobHint", injected);
}
const zhInjected = injectHomeMoneyGuideLink(
  `<p class="home-money-link" id="homeMoneyGuideLink"><a href="/guides/money/">x</a></p>`,
  { lang: "zh" },
);
if (!zhInjected.includes('href="/zh/guides/money/"')) fail("inject replaces zh href", zhInjected);

const distHome = resolve(root, "dist/index.html");
const distZhHome = resolve(root, "dist/zh/index.html");
if (existsSync(distHome)) {
  const home = readFileSync(distHome, "utf8");
  if (!home.includes('id="homeMoneyGuideLink"') || !home.includes('href="/guides/money/"')) {
    fail("dist home missing money guide link");
  }
}
if (existsSync(distZhHome)) {
  const zhHome = readFileSync(distZhHome, "utf8");
  if (!zhHome.includes('href="/zh/guides/money/"') || !zhHome.includes("賺錢指南")) {
    fail("dist zh home missing money guide link");
  }
}

// Why: freeze→money (#88) needs the reciprocal money→tip freeze so players
// planning a money session can open this week's checklist without inventing a week key.
const tipFixture = "2026-08-07";
const tipEn = moneyTipFreezeLinkHtml(tipFixture, "en");
if (!tipEn.includes('id="moneyTipFreezeLink"') || !tipEn.includes(`href="/week/${tipFixture}/"`)) {
  fail("money tip freeze en", tipEn);
}
if (!tipEn.includes("Open archive for week of")) fail("money tip freeze en copy", tipEn);
const tipZh = moneyTipFreezeLinkHtml(tipFixture, "zh");
if (!tipZh.includes(`href="/zh/week/${tipFixture}/"`) || !tipZh.includes("打開")) {
  fail("money tip freeze zh", tipZh);
}
const emptyTip = moneyTipFreezeLinkHtml("", "en");
if (!emptyTip.includes("is-empty") || !emptyTip.includes("hidden")) {
  fail("empty tipWeek must hide money tip freeze", emptyTip);
}
const bodyWithTip = renderMoneyGuideBody("en", { tipWeek: tipFixture });
if (!bodyWithTip.includes(`href="/week/${tipFixture}/"`) || !bodyWithTip.includes('id="moneyTipFreezeLink"')) {
  fail("renderMoneyGuideBody tipWeek", bodyWithTip.slice(-400));
}
const shelledTip = renderSitePage(moneyPage, {
  lang: "en",
  cssHref: "../../assets/x.css",
  faviconHref: "../../favicon.svg",
  tipWeek: tipFixture,
});
if (!shelledTip.includes('id="moneyTipFreezeLink"') || !shelledTip.includes(`/week/${tipFixture}/`)) {
  fail("renderSitePage tipWeek money", shelledTip.includes("moneyTipFreezeLink"));
}
const distMoneyTip = resolve(root, "dist/guides/money/index.html");
if (existsSync(distMoneyTip)) {
  const built = readFileSync(distMoneyTip, "utf8");
  if (!built.includes('id="moneyTipFreezeLink"')) fail("dist money missing tip freeze slot");
  const hasWeek = /href="\/week\/\d{4}-\d{2}-\d{2}\//.test(built);
  const empty = built.includes('id="moneyTipFreezeLink"') && built.includes("is-empty");
  if (!hasWeek && !empty) fail("dist money tip freeze needs week href or empty state");
}

console.log("test_money_guide.mjs ok", MONEY_ROUTES.length, "routes");
