#!/usr/bin/env node
/**
 * Why this test matters: Phase C Businesses must ship a real ranked list with
 * last-updated + cited sources (no stub). Invented GTA$ figures without a
 * source URL would violate the redesign proposal and mislead players.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ACID_LAB_GUIDE } from "../src/acidLabGuide.js";
import {
  BIZ_OWNED_STORAGE_KEY,
  BUSINESS_LIST_UPDATED,
  BUSINESS_RANKING,
  RANKING_CONSENSUS,
  ROCKSTAR_GAMES_YT_AUTHOR_URL,
  ROCKSTAR_GAMES_YT_CHANNEL_ID,
  assertNoUnsourcedFigures,
  businessTipFreezeLinkHtml,
  businessTrailerEmbedHtml,
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
  isVerifiedRockstarTrailer,
  knownBusinessIds,
  loadOwnedBusinessIds,
  saveOwnedBusinessIds,
  toggleOwnedBusinessId,
} from "../src/businessRanking.js";
import {
  DRAFT_SITE_PAGES,
  SITE_PAGES,
  isSitePagePublished,
  primaryNavHtml,
  publishedSitePages,
  renderSitePage,
  staticSitemapUrls,
} from "../src/sitePages.js";
import { parseJsonLdScripts } from "../src/structuredData.js";
import { renderSitemap, sitemapUrls } from "../src/videoPages.js";

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
if (!bodyEn.includes("Fooligans") || bodyEn.includes("Fooliganz")) {
  fail("Acid Lab highlight must spell Fooligans");
}
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

// Why: Solo/Owned looked like no-ops on live — .biz-rank-item { display:grid }
// overrides the UA [hidden] rule, so item.hidden=true still paints the row.
{
  const css = readFileSync(resolve(root, "src/style.css"), "utf8");
  if (!/\.biz-rank-item\[hidden\]\s*\{\s*display:\s*none\s*;?\s*\}/.test(css)) {
    fail("CSS must force .biz-rank-item[hidden]{display:none} so filters hide rows");
  }
  if (!/\.biz-filter-empty\[hidden\]\s*\{\s*display:\s*none\s*;?\s*\}/.test(css)) {
    fail("CSS must force .biz-filter-empty[hidden]{display:none}");
  }
  const script = businessesSoloFilterScript();
  if (!script.includes("item.hidden = !show")) {
    fail("filter script must set HTML hidden for non-matching rows");
  }
  if (!script.includes('mode === "solo"') || !script.includes('mode === "owned"')) {
    fail("filter script must handle solo + owned modes");
  }
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
// Why: each businesses row may embed only a video we already checked belongs to
// @RockstarGames. A fan/IGN reupload, or the stale channel id UCmDTrq0LNgPodDOFZiSbsww,
// must produce no iframe. The Newswire link stays either way.
const OFFICIAL_TRAILERS = {
  "acid-lab": "Ybq_FGtSCN8",
  nightclub: "5FBipicBoJg",
  agency: "aLUGHQq2aek",
  kosatka: "tyDRtSUYTRs",
  "auto-shop": "mP6KvFnltWc",
  bunker: "TOTCzcYzYuc",
  hangar: "KI1ukKxPsGc",
  "salvage-yard": "Sp1wvWZ_2MQ",
};
if (ROCKSTAR_GAMES_YT_CHANNEL_ID !== "UC6VcWc1rAoWdBCM0JxrRQ3A") {
  fail("rockstar channel id drifted", ROCKSTAR_GAMES_YT_CHANNEL_ID);
}
if (ROCKSTAR_GAMES_YT_AUTHOR_URL !== "https://www.youtube.com/@RockstarGames") {
  fail("rockstar author url drifted");
}
if (ROCKSTAR_GAMES_YT_CHANNEL_ID === "UCmDTrq0LNgPodDOFZiSbsww") {
  fail("stale channel id is not @RockstarGames");
}
const trailerCount = (html) => (html.match(/youtube-nocookie\.com\/embed\//g) || []).length;
if (trailerCount(bodyEn) !== BUSINESS_RANKING.length) {
  fail("EN trailer count", trailerCount(bodyEn));
}
if (trailerCount(bodyZh) !== BUSINESS_RANKING.length) fail("zh trailer count", trailerCount(bodyZh));
if (/youtube\.com\/embed\//.test(bodyEn) || /youtube\.com\/embed\//.test(bodyZh)) {
  fail("embed host must be youtube-nocookie");
}
for (const item of BUSINESS_RANKING) {
  const expectedId = OFFICIAL_TRAILERS[item.id];
  if (!expectedId) fail("missing official trailer id", item.id);
  if (!isVerifiedRockstarTrailer(item.trailer) || item.trailer.videoId !== expectedId) {
    fail("trailer failed rockstar check", item.id);
  }
  const src = `https://www.youtube-nocookie.com/embed/${expectedId}`;
  if (!bodyEn.includes(src) || !bodyZh.includes(src)) fail("missing nocookie src", item.id);
  if (!bodyEn.includes(item.source.url)) fail("newswire link dropped", item.id);
  const embed = businessTrailerEmbedHtml(item, "en");
  if (!embed.includes('loading="lazy"') || !embed.includes('title="Official Rockstar trailer:')) {
    fail("EN iframe lazy+title", item.id);
  }
  const embedZh = businessTrailerEmbedHtml(item, "zh");
  if (!embedZh.includes('title="Rockstar 官方預告：')) fail("zh iframe title", item.id);
  const row = bodyEn.match(new RegExp(`data-biz-id="${item.id}"[\\s\\S]*?</li>`))?.[0] || "";
  if (!row.includes("biz-source-row") || !row.includes("biz-source-link") || !row.includes(src)) {
    fail("trailer must sit beside the Newswire link", item.id);
  }
}
const stale = businessTrailerEmbedHtml(
  {
    trailer: {
      videoId: "Ybq_FGtSCN8",
      title: "wrong channel",
      channelId: "UCmDTrq0LNgPodDOFZiSbsww",
      authorUrl: ROCKSTAR_GAMES_YT_AUTHOR_URL,
    },
  },
  "en",
);
if (stale) fail("stale channel id must not embed");
const ign = businessTrailerEmbedHtml(
  {
    trailer: {
      videoId: "UM5sUofywmw",
      title: "IGN reupload",
      channelId: "UCIGNIGNIGN",
      authorUrl: "https://www.youtube.com/@IGN",
    },
  },
  "en",
);
if (ign) fail("non-rockstar author must not embed");
if (businessTrailerEmbedHtml({ id: "none" }, "en")) fail("missing trailer must render nothing");
{
  const css = readFileSync(resolve(root, "src/style.css"), "utf8");
  const trailerCss = css.slice(css.indexOf(".biz-trailer {"));
  if (!trailerCss.startsWith(".biz-trailer {") || !trailerCss.slice(0, 400).includes("aspect-ratio: 16 / 9")) {
    fail("biz trailer must be responsive 16:9");
  }
  if (!trailerCss.slice(0, 500).includes("position: absolute")) {
    fail("iframe must be absolutely positioned inside the 16:9 box");
  }
  if (!css.includes("@media (max-width: 640px)") || !css.includes("grid-template-columns: minmax(0, 1fr)")) {
    fail("narrow screens must stack the trailer under the Newswire link");
  }
}

// Why: the Acid Lab guide is reserved as an outline only. Publishing, linking,
// or sitemap-indexing it would ship unfinished $750K copy before a source exists.
if (ACID_LAB_GUIDE.draft !== true || ACID_LAB_GUIDE.published !== false) {
  fail("acid lab guide must stay draft unpublished");
}
if (ACID_LAB_GUIDE.path !== "guides/acid-lab/") fail("acid lab guide path", ACID_LAB_GUIDE.path);
const outlineIds = ACID_LAB_GUIDE.outline.map((step) => step.id).join(",");
if (outlineIds !== "first-dose,mutt-upgrade,resupply,money-loop") {
  fail("acid lab outline order", outlineIds);
}
const mutt = ACID_LAB_GUIDE.outline.find((step) => step.id === "mutt-upgrade");
if (!mutt?.en.includes("$750K") || !mutt?.zh.includes("$750K")) fail("mutt upgrade outline", mutt);
if (!ACID_LAB_GUIDE.outline[0].en.includes("6 missions")) fail("first dose outline");
if (SITE_PAGES.some((p) => p.path === ACID_LAB_GUIDE.path || p.id === ACID_LAB_GUIDE.id)) {
  fail("acid lab guide must not be a published SITE_PAGE");
}
if (!DRAFT_SITE_PAGES.includes(ACID_LAB_GUIDE)) fail("acid lab guide missing from DRAFT_SITE_PAGES");
if (isSitePagePublished(ACID_LAB_GUIDE)) fail("isSitePagePublished must reject the draft");
if (publishedSitePages([...SITE_PAGES, ACID_LAB_GUIDE]).some((p) => p.path === ACID_LAB_GUIDE.path)) {
  fail("publishedSitePages must drop the draft even if concatenated");
}
const navHtml = primaryNavHtml("en", "businesses");
if (navHtml.includes("acid-lab") || navHtml.includes("guides/acid-lab")) fail("nav must not link the draft");
const staticUrls = staticSitemapUrls();
if (staticUrls.some((url) => url.includes("acid-lab"))) fail("static sitemap leaked acid lab", staticUrls);
const sitemapXml = renderSitemap(sitemapUrls([]));
if (sitemapXml.includes("acid-lab")) fail("sitemap xml leaked acid lab guide");
if (bodyEn.includes("guides/acid-lab") || bodyZh.includes("guides/acid-lab") || bodyEn.includes("$750K")) {
  fail("published businesses page must not link the draft or print $750K");
}
if (html.includes("guides/acid-lab") || zhHtml.includes("guides/acid-lab")) {
  fail("rendered shell linked the draft guide");
}

const distBizTip = resolve(root, "dist/guides/businesses/index.html");
if (existsSync(distBizTip)) {
  const built = readFileSync(distBizTip, "utf8");
  if (!built.includes('id="businessTipFreezeLink"')) fail("dist businesses missing tip freeze slot");
  const hasWeek = /href="\/week\/\d{4}-\d{2}-\d{2}\//.test(built);
  const empty = built.includes("is-empty");
  if (!hasWeek && !empty) fail("dist businesses tip freeze needs week href or empty state");
  if (!built.includes("Fooligans") || built.includes("Fooliganz")) fail("dist EN Fooligans spelling");
  if (built.includes("guides/acid-lab") || built.includes("$750K")) fail("dist EN published the acid lab draft");
  for (const id of Object.values(OFFICIAL_TRAILERS)) {
    if (!built.includes(`https://www.youtube-nocookie.com/embed/${id}`)) fail("dist EN missing trailer", id);
    if (!built.includes('loading="lazy"')) fail("dist EN iframe not lazy");
  }
}
const distZhBiz = resolve(root, "dist/zh/guides/businesses/index.html");
if (existsSync(distZhBiz)) {
  const built = readFileSync(distZhBiz, "utf8");
  if (!built.includes("Rockstar 官方預告")) fail("dist zh trailer title");
  if (built.includes("guides/acid-lab")) fail("dist zh linked acid lab draft");
  for (const id of Object.values(OFFICIAL_TRAILERS)) {
    if (!built.includes(`https://www.youtube-nocookie.com/embed/${id}`)) fail("dist zh missing trailer", id);
  }
}
for (const rel of ["dist/guides/acid-lab/index.html", "dist/zh/guides/acid-lab/index.html"]) {
  if (existsSync(resolve(root, rel))) fail("draft acid lab page was written", rel);
}
const distSitemap = resolve(root, "dist/sitemap.xml");
if (existsSync(distSitemap) && readFileSync(distSitemap, "utf8").includes("acid-lab")) {
  fail("dist sitemap indexed the acid lab guide");
}

console.log(
  "test_business_ranking.mjs ok",
  BUSINESS_RANKING.length,
  "businesses",
  "updated",
  BUSINESS_LIST_UPDATED,
);
