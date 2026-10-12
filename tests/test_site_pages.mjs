#!/usr/bin/env node
/**
 * Why this test matters: Phase A multi-page shell must ship real EN+/zh/ paths,
 * primary <a> nav, legacy hash→path redirects, per-page meta/JSON-LD, and sitemap
 * entries — without waiting for Phase B content rewrites. Regressions here break
 * shareable URLs and bookmark redirects Jeff approved in the redesign proposal.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SITE_PAGES,
  injectHomeShell,
  legacyHashRedirectTarget,
  localePath,
  pairedLocalePath,
  primaryNavHtml,
  renderSitePage,
  staticSitemapUrls,
  webPageJsonLd,
} from "../src/sitePages.js";
import { parseJsonLdScripts } from "../src/structuredData.js";
import { renderSitemap, sitemapUrls } from "../src/videoPages.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function fail(msg, extra) {
  console.error(msg, extra ?? "");
  process.exit(1);
}

const expectedPaths = ["week/", "guides/money/", "guides/businesses/", "gta6/", "about/"];
for (const path of expectedPaths) {
  if (!SITE_PAGES.some((p) => p.path === path)) fail("missing SITE_PAGES path", path);
}

if (localePath("en", "about/") !== "/about/") fail("en about path");
if (localePath("zh", "about/") !== "/zh/about/") fail("zh about path");
if (localePath("zh", "/") !== "/zh/") fail("zh home path");
if (pairedLocalePath("zh", "/guides/money/") !== "/zh/guides/money/") fail("pair money zh");
if (pairedLocalePath("en", "/zh/gta6/") !== "/gta6/") fail("pair gta6 en");

const nav = primaryNavHtml("en", "home");
if (!nav.includes('href="/"') || !nav.includes('data-nav="home"')) fail("nav home link");
for (const id of ["week", "money", "businesses", "gta6", "about"]) {
  if (!nav.includes(`data-nav="${id}"`)) fail("nav missing", id);
}
if (!nav.includes("/guides/money/") || !nav.includes("/about/")) fail("nav paths");

// Legacy hash redirects (§4)
if (legacyHashRedirectTarget("/", "#jobs") !== "/") fail("#jobs → /");
if (legacyHashRedirectTarget("/zh/", "#jobs") !== "/zh/") fail("zh #jobs");
if (legacyHashRedirectTarget("/", "#hot") !== "/") fail("#hot → /");
if (legacyHashRedirectTarget("/", "#shorts") !== "/") fail("#shorts → /");
if (legacyHashRedirectTarget("/", "#forum") !== "/") fail("#forum → /");
if (legacyHashRedirectTarget("/", "#x") !== "/") fail("#x → /");
if (legacyHashRedirectTarget("/", "#hero") !== "/") fail("#hero → /");
if (legacyHashRedirectTarget("/", "#q=cayo") !== "") fail("#q= stays");
if (legacyHashRedirectTarget("/", "#hot&v=yt-5XBMNYmFmTs") !== "/v/5XBMNYmFmTs/") {
  fail("yt deep link → /v/", legacyHashRedirectTarget("/", "#hot&v=yt-5XBMNYmFmTs"));
}
if (legacyHashRedirectTarget("/about/", "#jobs") !== "") fail("non-home ignores hash redirect");

const about = renderSitePage(
  SITE_PAGES.find((p) => p.id === "about"),
  { lang: "en", cssHref: "../../assets/x.css", faviconHref: "../../favicon.svg" },
);
if (!about.includes('rel="canonical" href="https://sessionscan.net/about/"')) fail("about canonical");
if (!about.includes('hreflang="zh-Hant" href="https://sessionscan.net/zh/about/"')) fail("about hreflang");
if (!about.includes('class="site-nav"')) fail("about has site-nav");
if (!about.includes('aria-current="page"') || !about.includes('data-nav="about"')) fail("about active nav");
if (!about.includes("No GTA 4")) fail("about scope copy");
if (about.includes("page-stub-flag")) fail("about is not a stub");

const week = renderSitePage(
  SITE_PAGES.find((p) => p.id === "week"),
  { lang: "en", cssHref: "../assets/x.css", faviconHref: "../favicon.svg" },
);
if (week.includes("page-stub-flag")) fail("week archive is not a stub");
if (!SITE_PAGES.find((p) => p.id === "week") || SITE_PAGES.find((p) => p.id === "week").stub) {
  fail("SITE_PAGES week stub flag must be false");
}

const money = renderSitePage(
  SITE_PAGES.find((p) => p.id === "money"),
  { lang: "zh", cssHref: "../../../assets/x.css", faviconHref: "../../../favicon.svg" },
);
if (!money.includes('lang="zh-Hant"')) fail("money zh lang");
if (money.includes("page-stub-flag")) fail("money must not be stub");
if (!money.includes("money-route-list")) fail("money rank list");
if (!money.includes("https://sessionscan.net/zh/guides/money/")) fail("money zh url");
const moneyPage = SITE_PAGES.find((p) => p.id === "money");
if (moneyPage?.stub) fail("SITE_PAGES money stub false");

let aboutLd;
try {
  aboutLd = parseJsonLdScripts(about).find((b) => b["@graph"]);
} catch (err) {
  fail("about JSON-LD parse", err);
}
const pageNode = aboutLd?.["@graph"]?.find((n) => n["@type"] === "WebPage");
if (!pageNode) fail("about WebPage JSON-LD");
const expected = webPageJsonLd(SITE_PAGES.find((p) => p.id === "about"), "en");
if (pageNode.name !== expected["@graph"][0].name) fail("WebPage name");

const staticUrls = staticSitemapUrls();
if (!staticUrls.includes("https://sessionscan.net/about/")) fail("sitemap static about");
if (!staticUrls.includes("https://sessionscan.net/zh/guides/money/")) fail("sitemap static zh money");
const sm = renderSitemap(sitemapUrls([]));
if (!sm.includes("<loc>https://sessionscan.net/gta6/</loc>")) fail("sitemap gta6");
if (!sm.includes('hreflang="zh-Hant" href="https://sessionscan.net/zh/gta6/"')) fail("sitemap gta6 hreflang");

const indexHtml = readFileSync(resolve(root, "index.html"), "utf8");
if (!indexHtml.includes('class="site-nav"')) fail("index.html must include site-nav source");
if (!indexHtml.includes('href="/guides/money/"')) fail("index.html money nav");
const shelled = injectHomeShell(indexHtml, { lang: "en" });
if (!shelled.includes("data-legacy-hash-redirect")) fail("injectHomeShell adds hash redirect");
if (shelled.includes('href="#hero"')) fail("brand must not stay on #hero");

// Built dist (when present after npm run build)
const distAbout = resolve(root, "dist/about/index.html");
const distZhAbout = resolve(root, "dist/zh/about/index.html");
if (existsSync(distAbout)) {
  const built = readFileSync(distAbout, "utf8");
  if (!built.includes("About SessionScan") && !built.includes("About | SessionScan")) {
    fail("dist about title/heading", built.slice(0, 200));
  }
  if (!built.includes("static.cloudflareinsights.com/beacon.min.js")) fail("dist about CF beacon");
}
if (existsSync(distZhAbout)) {
  const built = readFileSync(distZhAbout, "utf8");
  if (!built.includes("關於 SessionScan")) fail("dist zh about heading");
  if (!built.includes('href="/zh/guides/money/"')) fail("dist zh about nav money");
}

console.log("test_site_pages.mjs ok", SITE_PAGES.length, "shell pages");
