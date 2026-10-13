#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SEARCH_ALIAS_GROUPS,
  UI,
  applyHtmlI18n,
  detectLang,
  isZhPath,
  langHay,
  localeHref,
  shouldRedirectToZh,
  t,
} from "../src/i18n.js";
import {
  INSTAGRAM_URL,
  YOUTUBE_CHANNEL_URL,
  homeJsonLd,
  organizationJsonLd,
  parseJsonLdScripts,
  replaceHomeJsonLd,
} from "../src/structuredData.js";

function fail(msg, extra) {
  console.error(msg, extra ?? "");
  process.exit(1);
}

if (t("siteName", {}, "en") !== "SessionScan GTA") fail("en site name");
if (t("siteName", {}, "zh") !== "SessionScan GTA｜夜掃描") fail("zh site name");
if (t("metaTitle", {}, "en") !== "This week in GTA Online | SessionScan") fail("en meta title");
if (t("metaTitle", {}, "zh") !== "本週 GTA Online｜SessionScan") fail("zh meta title");
if (t("channelFull", {}, "en") !== "Subscribe on YouTube") fail("en subscribe label");
if (t("channelFull", {}, "zh") !== "訂閱 YouTube") fail("zh subscribe label");
if (!t("channelAria", {}, "en").includes("@sessionscan")) fail("en subscribe aria keeps handle");
if (!t("channelAria", {}, "zh").includes("@sessionscan")) fail("zh subscribe aria keeps handle");
if (t("instagramFull", {}, "en") !== "Follow on Instagram") fail("en instagram label");
if (t("instagramFull", {}, "zh") !== "追蹤 Instagram") fail("zh instagram label");
// Why: Lighthouse label-content-name-mismatch fails when visible "Follow on Instagram" / "IG"
// (or zh "追蹤 Instagram") is not a substring of the accessible name.
if (!t("instagramAria", {}, "en").includes("Follow on Instagram")) fail("en instagram aria keeps visible label");
if (!t("instagramAria", {}, "en").includes("IG")) fail("en instagram aria keeps compact IG");
if (!t("instagramAria", {}, "zh").includes("追蹤 Instagram")) fail("zh instagram aria keeps visible label");
if (!t("instagramAria", {}, "zh").includes("IG")) fail("zh instagram aria keeps compact IG");
if (!t("weekSocialXAria", {}, "en").includes("Follow on X")) fail("en X aria keeps visible label");
if (!t("weekSocialXAria", {}, "en").includes("@SessionScanGTA")) fail("en X aria keeps handle");
if (!t("weekSocialXAria", {}, "zh").includes("追蹤 X")) fail("zh X aria keeps visible label");
if (!t("weekSocialXAria", {}, "zh").includes("@SessionScanGTA")) fail("zh X aria keeps handle");
if (t("tabJobs", {}, "en").includes("本週")) fail("en tab must not mix Chinese");
if (!t("tabJobs", {}, "zh").includes("本週")) fail("zh tab");
if (isZhPath("/zh/") !== true || isZhPath("/") !== false) fail("isZhPath");
if (detectLang({ pathname: "/", stored: "" }) !== "en") fail("default en");
if (detectLang({ pathname: "/zh/", stored: "en" }) !== "zh") fail("path wins");
if (detectLang({ pathname: "/", stored: "zh" }) !== "zh") fail("stored zh");
if (!shouldRedirectToZh({ pathname: "/", stored: "zh" })) fail("redirect / + stored zh");
if (shouldRedirectToZh({ pathname: "/zh/", stored: "zh" })) fail("no redirect on /zh/");
if (shouldRedirectToZh({ pathname: "/v/5XBMNYmFmTs/", stored: "zh" })) fail("no redirect on video page");
if (localeHref("zh", { hash: "#jobs" }) !== "/zh/#jobs") fail("zh href keeps hash");
if (localeHref("en", { hash: "#hot" }) !== "/#hot") fail("en href keeps hash");
if (localeHref("zh", { path: "/about/" }) !== "/zh/about/") fail("zh pairs about path");
if (localeHref("en", { path: "/zh/guides/money/" }) !== "/guides/money/") fail("en pairs money path");
if (t("navThisWeek", {}, "en") !== "This week") fail("en primary nav label");
if (t("navThisWeek", {}, "zh") !== "本週") fail("zh primary nav label");
if (!langHay("zh").includes("中文") || !langHay("zh").includes("chinese")) fail("lang hay");
if (!SEARCH_ALIAS_GROUPS.some((g) => g.includes("中文") && g.includes("chinese"))) {
  fail("search aliases must match Chinese and English language words");
}

const html = `<html lang="en" data-ui-lang="en">
  <title data-i18n="metaTitle">This week in GTA Online | SessionScan</title>
  <a data-i18n="tabJobs">This week's money & jobs</a>
  <link rel="canonical" href="https://sessionscan.net/" />
  <meta property="og:url" content="https://sessionscan.net/" />
  <meta property="og:locale" content="en_US" />
</html>`;
const zh = applyHtmlI18n(html, "zh");
if (!zh.includes('lang="zh-Hant"')) fail("applyHtmlI18n lang", zh.slice(0, 200));
if (!zh.includes(UI.zh.tabJobs)) fail("applyHtmlI18n tab");
if (!zh.includes('href="https://sessionscan.net/zh/"')) fail("applyHtmlI18n canonical");
if (zh.includes("This week's money")) fail("zh html still has English chrome");

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const indexHtml = readFileSync(resolve(root, "index.html"), "utf8");
let homeLd;
try {
  homeLd = parseJsonLdScripts(indexHtml);
} catch (err) {
  fail("home JSON-LD must be well-formed", err);
}
if (JSON.stringify(homeLd[0]) !== JSON.stringify(homeJsonLd("en"))) {
  fail("index.html JSON-LD must match homeJsonLd(en)");
}
const graph = homeLd[0]?.["@graph"] || [];
if (!graph.some((node) => node["@type"] === "WebSite")) fail("home JSON-LD WebSite");
if (!graph.some((node) => node["@type"] === "Organization")) fail("home JSON-LD Organization");
if (graph.some((node) => node.potentialAction?.["@type"] === "SearchAction")) {
  fail("do not emit SearchAction; search is hash #q= not a URL param");
}
const website = graph.find((node) => node["@type"] === "WebSite");
const hasPartUrls = (website?.hasPart || []).map((p) => p.url);
for (const u of [
  "https://sessionscan.net/week/",
  "https://sessionscan.net/guides/money/",
  "https://sessionscan.net/guides/businesses/",
  "https://sessionscan.net/gta6/",
]) {
  if (!hasPartUrls.includes(u)) fail("home WebSite.hasPart must list Phase C pages", u);
}
const org = organizationJsonLd();
if (!Array.isArray(org.sameAs) || !org.sameAs.includes(YOUTUBE_CHANNEL_URL)) {
  fail("Organization sameAs must include YouTube", org.sameAs);
}
if (!org.sameAs.includes(INSTAGRAM_URL)) {
  fail("Organization sameAs must include Instagram", org.sameAs);
}
if (!indexHtml.includes(INSTAGRAM_URL)) fail("index.html must link Instagram in header/JSON-LD");
if (!indexHtml.includes("channel-link-ig")) fail("index.html must render Instagram header control");
if (!indexHtml.includes('href="https://www.instagram.com/sessionscan/"')) {
  fail("index.html Instagram href must match owned profile");
}
if (!indexHtml.includes('rel="noopener noreferrer"') || !indexHtml.includes('target="_blank"')) {
  fail("Instagram header link must open in a new tab with noopener");
}

// Footer must not credit unrelated franky5440 / poe2 projects on the live site chrome.
if ("footerLegal" in UI.en || "footerLegal" in UI.zh) {
  fail("footerLegal i18n key must be removed from EN and ZH");
}
if (/franky5440|poe2/i.test(indexHtml)) {
  fail("index.html footer must not link franky5440 / poe2");
}
if (indexHtml.includes('data-i18n-html="footerLegal"')) {
  fail("index.html must not render footerLegal paragraph");
}

const zhHome = replaceHomeJsonLd(indexHtml, "zh");
let zhLd;
try {
  zhLd = parseJsonLdScripts(zhHome);
} catch (err) {
  fail("zh home JSON-LD must parse", err);
}
if (JSON.stringify(zhLd[0]) !== JSON.stringify(homeJsonLd("zh"))) fail("zh JSON-LD rewrite");
if (zhLd[0]["@graph"][0].inLanguage !== "zh-Hant") fail("zh WebSite inLanguage");
if (zhLd[0]["@graph"][0].url !== "https://sessionscan.net/zh/") fail("zh WebSite url");
const zhOrg = (zhLd[0]["@graph"] || []).find((node) => node["@type"] === "Organization");
if (!zhOrg?.sameAs?.includes(INSTAGRAM_URL)) fail("zh Organization sameAs must include Instagram", zhOrg?.sameAs);

// Static home HTML must ship the same Label-in-Name-safe aria strings (pre-JS).
if (!indexHtml.includes('aria-label="Follow on Instagram · IG"')) {
  fail("index.html IG aria must include visible Follow on Instagram + IG");
}
if (!indexHtml.includes('aria-label="Follow on X @SessionScanGTA"')) {
  fail("index.html X aria must include visible Follow on X + handle");
}
if (indexHtml.includes("Follow SessionScan on Instagram")) {
  fail("index.html must not keep old IG aria that omitted visible label text");
}

console.log("test_i18n.mjs ok");
