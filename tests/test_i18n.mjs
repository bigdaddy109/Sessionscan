#!/usr/bin/env node
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

function fail(msg, extra) {
  console.error(msg, extra ?? "");
  process.exit(1);
}

if (t("metaTitle", {}, "en") !== "SessionScan GTA") fail("en meta title");
if (t("metaTitle", {}, "zh") !== "SessionScan GTA｜夜掃描") fail("zh meta title");
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

console.log("test_i18n.mjs ok");
