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
  BIZ_OWNED_STORAGE_KEY,
  BUSINESS_LIST_UPDATED,
  BUSINESS_RANKING,
  RANKING_CONSENSUS,
  assertNoUnsourcedFigures,
  businessTipFreezeLinkHtml,
  businessesPageBodyHtml,
  businessesPageJsonLd,
  businessesSoloFilterHtml,
  businessesSoloFilterScript,
  clearOwnedBusinessIds,
  formatOwnedBusinessesPlainText,
  formatSourceDate,
  homeBusinessGuideLinkHtml,
  injectHomeBusinessGuideLink,
  isSoloFriendlyBusiness,
  knownBusinessIds,
  loadOwnedBusinessIds,
  saveOwnedBusinessIds,
  toggleOwnedBusinessId,
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

// Why: solo filter must only flag businesses whose published highlight already
// says solo/單人 — never invent a playstyle tag detached from that copy.
const soloIds = BUSINESS_RANKING.filter(isSoloFriendlyBusiness).map((b) => b.id);
if (!soloIds.includes("acid-lab") || !soloIds.includes("kosatka")) {
  fail("acid-lab + kosatka must be solo-friendly from highlight", soloIds);
}
if (soloIds.includes("nightclub")) fail("nightclub must not be solo-tagged", soloIds);
if (!bodyEn.includes('id="bizFilter"') || !bodyEn.includes('data-biz-filter="solo"')) {
  fail("EN missing solo filter chrome", bodyEn.match(/biz-filter[\s\S]{0,160}/)?.[0]);
}
if (!bodyEn.includes('data-biz-id="acid-lab" data-rank="1" data-solo="1"')) {
  fail("EN acid-lab data-solo", bodyEn.match(/data-biz-id="acid-lab"[^>]*/)?.[0]);
}
const nightclubLi = bodyEn.match(/data-biz-id="nightclub"[^>]*/)?.[0] || "";
if (!/data-solo="0"/.test(nightclubLi)) fail("EN nightclub data-solo=0 expected", nightclubLi);
const filterZh = businessesSoloFilterHtml("zh");
if (!filterZh.includes("單人友善") || !filterZh.includes("全部")) fail("zh filter labels", filterZh);
if (!filterZh.includes("我擁有") || !filterZh.includes('data-biz-filter="owned"')) {
  fail("zh owned filter label", filterZh);
}

// Why: Owned filter is personal inventory (localStorage), not a published tag —
// helpers must only accept known BUSINESS_RANKING ids so we never invent properties.
if (BIZ_OWNED_STORAGE_KEY !== "sessionscan:biz-owned") fail("owned storage key");
const known = knownBusinessIds();
if (!known.has("acid-lab") || known.has("not-a-business")) fail("knownBusinessIds", [...known]);
function memStore(seed = {}) {
  const bag = { ...seed };
  return {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(bag, k) ? bag[k] : null),
    setItem: (k, v) => {
      bag[k] = String(v);
    },
    removeItem: (k) => {
      delete bag[k];
    },
  };
}
const store = memStore();
saveOwnedBusinessIds(["acid-lab", "fake-id", "nightclub"], store);
const loaded = loadOwnedBusinessIds(store);
if (!loaded.has("acid-lab") || !loaded.has("nightclub") || loaded.has("fake-id")) {
  fail("save/load owned filters known ids", [...loaded]);
}
toggleOwnedBusinessId("acid-lab", store);
if (loadOwnedBusinessIds(store).has("acid-lab")) fail("toggle off acid-lab");
toggleOwnedBusinessId("acid-lab", store);
if (!loadOwnedBusinessIds(store).has("acid-lab")) fail("toggle on acid-lab");
clearOwnedBusinessIds(store);
if (loadOwnedBusinessIds(store).size !== 0) fail("clear owned");

if (!bodyEn.includes('data-biz-filter="owned"') || !bodyEn.includes('id="bizOwnedClear"')) {
  fail("EN missing owned filter chrome");
}
if (!bodyEn.includes("biz-own-check") || !bodyEn.includes('data-owned="0"')) {
  fail("EN missing own checkboxes");
}
if (!bodyEn.includes("I own this")) fail("EN own label");

// Why: Copy owned closes the inventory loop for Discord/LINE — rank order, known
// ids only, sourced titles/URLs, never invent GTA$. Empty set still ends with page URL.
const ownedText = formatOwnedBusinessesPlainText(["nightclub", "acid-lab", "fake-id"], {
  lang: "en",
});
if (!ownedText.startsWith("My businesses\n")) fail("owned plain heading", ownedText.slice(0, 40));
if (!ownedText.includes("• Acid Lab") || !ownedText.includes("• Nightclub")) {
  fail("owned plain missing titles", ownedText);
}
const acidIdx = ownedText.indexOf("Acid Lab");
const nightIdx = ownedText.indexOf("Nightclub");
if (acidIdx < 0 || nightIdx < 0 || acidIdx > nightIdx) {
  fail("owned plain must follow ranking order", ownedText);
}
if (ownedText.includes("fake-id") || /GTA\$\s*\d/.test(ownedText)) {
  fail("owned plain must not invent ids or GTA$", ownedText);
}
const acid = BUSINESS_RANKING.find((b) => b.id === "acid-lab");
if (!ownedText.includes(acid.source.url)) fail("owned plain missing Acid Lab source");
if (!ownedText.trimEnd().endsWith("https://sessionscan.net/guides/businesses/")) {
  fail("owned plain missing page URL", ownedText.slice(-80));
}
const emptyOwned = formatOwnedBusinessesPlainText([], { lang: "zh" });
if (!emptyOwned.startsWith("我的生意\n") || !emptyOwned.includes("https://sessionscan.net/zh/guides/businesses/")) {
  fail("empty owned zh plain", emptyOwned);
}
if (!bodyEn.includes('id="bizOwnedCopy"') || !bodyEn.includes("Copy owned")) {
  fail("EN missing copy owned chrome");
}

const bodyZh = businessesPageBodyHtml("zh");
if (!bodyZh.includes("迷幻藥實驗室") && !bodyZh.includes("生意")) fail("zh body missing zh copy");
if (!bodyZh.includes("biz-rank-list")) fail("zh missing list");
if (!bodyZh.includes("單人友善")) fail("zh missing solo filter label");
if (!bodyZh.includes("我擁有") || !bodyZh.includes("biz-own-check")) fail("zh missing owned chrome");
if (!bodyZh.includes("複製持有清單") || !bodyZh.includes('id="bizOwnedCopy"')) {
  fail("zh missing copy owned chrome");
}

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
if (!html.includes("data-biz-solo-filter")) fail("rendered missing solo filter script");
if (!html.includes("sessionscan:biz-owned") || !html.includes('data-biz-filter="owned"')) {
  fail("rendered missing owned inventory script wiring");
}

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
  if (!built.includes("business-week-link") || !built.includes('href="/"')) {
    fail("dist EN missing businessWeekLink home CTA");
  }
  if (!built.includes('id="bizFilter"') || !built.includes("data-biz-solo-filter")) {
    fail("dist EN missing solo filter");
  }
  if (!built.includes('data-biz-filter="owned"') || !built.includes("biz-own-check")) {
    fail("dist EN missing owned filter");
  }
}
if (existsSync(distZh)) {
  const built = readFileSync(distZh, "utf8");
  if (built.includes("page-stub-flag")) fail("dist zh still stub");
  if (!built.includes("biz-rank-list")) fail("dist zh missing list");
  if (!built.includes('href="/zh/"') || !built.includes("首頁本週")) {
    fail("dist zh missing businessWeekLink");
  }
  if (!built.includes("單人友善") || !built.includes("data-biz-solo-filter")) {
    fail("dist zh missing solo filter");
  }
  if (!built.includes("我擁有") || !built.includes("biz-own-check")) {
    fail("dist zh missing owned filter");
  }
}

// Why: players on home jobs need a reciprocal CTA to business ranking
// (businesses page links home via businessWeekLink); path must stay locale-correct.
if (!bodyEn.includes("business-week-link") || !bodyEn.includes('href="/"')) {
  fail("EN body missing businessWeekLink");
}
if (!bodyZh.includes('href="/zh/"') || !bodyZh.includes("首頁本週")) {
  fail("zh body missing businessWeekLink");
}
const homeBizEn = homeBusinessGuideLinkHtml("en");
if (!homeBizEn.includes('id="homeBusinessGuideLink"') || !homeBizEn.includes('href="/guides/businesses/"')) {
  fail("home business link en", homeBizEn);
}
if (!homeBizEn.includes("Business ranking")) fail("home business en copy");
const homeBizZh = homeBusinessGuideLinkHtml("zh");
if (!homeBizZh.includes('href="/zh/guides/businesses/"') || !homeBizZh.includes("生意排名")) {
  fail("home business link zh", homeBizZh);
}
const moneyThenBiz = `<p class="home-money-link" id="homeMoneyGuideLink"><a href="/guides/money/">m</a></p>`;
const injected = injectHomeBusinessGuideLink(moneyThenBiz, { lang: "en" });
if (!injected.includes('id="homeBusinessGuideLink"') || !injected.includes('href="/guides/businesses/"')) {
  fail("inject after money link", injected);
}
const zhInjected = injectHomeBusinessGuideLink(
  `<p class="home-business-link" id="homeBusinessGuideLink"><a href="/guides/businesses/">x</a></p>`,
  { lang: "zh" },
);
if (!zhInjected.includes('href="/zh/guides/businesses/"')) fail("inject replaces zh href", zhInjected);

const distHome = resolve(root, "dist/index.html");
const distZhHome = resolve(root, "dist/zh/index.html");
if (existsSync(distHome)) {
  const home = readFileSync(distHome, "utf8");
  if (!home.includes('id="homeBusinessGuideLink"') || !home.includes('href="/guides/businesses/"')) {
    fail("dist home missing business guide link");
  }
}
if (existsSync(distZhHome)) {
  const zhHome = readFileSync(distZhHome, "utf8");
  if (!zhHome.includes('href="/zh/guides/businesses/"') || !zhHome.includes("生意排名")) {
    fail("dist zh home missing business guide link");
  }
}

// Why: freeze→business (#88) needs the reciprocal businesses→tip freeze so
// players ranking businesses can open this week's checklist without inventing a week key.
const tipFixture = "2026-08-07";
const tipEn = businessTipFreezeLinkHtml(tipFixture, "en");
if (!tipEn.includes('id="businessTipFreezeLink"') || !tipEn.includes(`href="/week/${tipFixture}/"`)) {
  fail("business tip freeze en", tipEn);
}
if (!tipEn.includes("Open archive for week of")) fail("business tip freeze en copy", tipEn);
const tipZh = businessTipFreezeLinkHtml(tipFixture, "zh");
if (!tipZh.includes(`href="/zh/week/${tipFixture}/"`) || !tipZh.includes("打開")) {
  fail("business tip freeze zh", tipZh);
}
const emptyTip = businessTipFreezeLinkHtml("", "en");
if (!emptyTip.includes("is-empty") || !emptyTip.includes("hidden")) {
  fail("empty tipWeek must hide business tip freeze", emptyTip);
}
const bodyWithTip = businessesPageBodyHtml("en", { tipWeek: tipFixture });
if (!bodyWithTip.includes(`href="/week/${tipFixture}/"`) || !bodyWithTip.includes('id="businessTipFreezeLink"')) {
  fail("businessesPageBodyHtml tipWeek", bodyWithTip.slice(-400));
}
const shelledTip = renderSitePage(SITE_PAGES.find((p) => p.id === "businesses"), {
  lang: "zh",
  cssHref: "../../../../assets/x.css",
  faviconHref: "../../../../favicon.svg",
  tipWeek: tipFixture,
});
if (!shelledTip.includes('id="businessTipFreezeLink"') || !shelledTip.includes(`/zh/week/${tipFixture}/`)) {
  fail("renderSitePage tipWeek businesses zh");
}
const distBizTip = resolve(root, "dist/guides/businesses/index.html");
if (existsSync(distBizTip)) {
  const built = readFileSync(distBizTip, "utf8");
  if (!built.includes('id="businessTipFreezeLink"')) fail("dist businesses missing tip freeze slot");
  const hasWeek = /href="\/week\/\d{4}-\d{2}-\d{2}\//.test(built);
  const empty = built.includes("is-empty");
  if (!hasWeek && !empty) fail("dist businesses tip freeze needs week href or empty state");
}

console.log(
  "test_business_ranking.mjs ok",
  BUSINESS_RANKING.length,
  "businesses",
  "updated",
  BUSINESS_LIST_UPDATED,
);
