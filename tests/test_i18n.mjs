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
import { homeJsonLd, parseJsonLdScripts, replaceHomeJsonLd } from "../src/structuredData.js";

function fail(msg, extra) {
  console.error(msg, extra ?? "");
  process.exit(1);
}

if (t("metaTitle", {}, "en") !== "SessionScan GTA") fail("en meta title");
if (t("metaTitle", {}, "zh") !== "SessionScan GTA｜夜掃描") fail("zh meta title");
if (t("channelFull", {}, "en") !== "Subscribe on YouTube") fail("en subscribe label");
if (t("channelFull", {}, "zh") !== "訂閱 YouTube") fail("zh subscribe label");
if (!t("channelAria", {}, "en").includes("@sessionscan")) fail("en subscribe aria keeps handle");
if (!t("channelAria", {}, "zh").includes("@sessionscan")) fail("zh subscribe aria keeps handle");
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
if (!langHay("zh").includes("中文") || !langHay("zh").includes("chinese")) fail("lang hay");
if (!SEARCH_ALIAS_GROUPS.some((g) => g.includes("中文") && g.includes("chinese"))) {
  fail("search aliases must match Chinese and English language words");
}

const html = `<html lang="en" data-ui-lang="en">
  <title data-i18n="metaTitle">SessionScan GTA</title>
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

console.log("test_i18n.mjs ok");
