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
  footerGuidesHtml,
  injectHomeShell,
  legacyHashRedirectTarget,
  localePath,
  pairedLocalePath,
  primaryNavHtml,
  relatedPagesHtml,
  renderSitePage,
  staticSitemapUrls,
  webPageJsonLd,
} from "../src/sitePages.js";
import { homeJsonLd, parseJsonLdScripts } from "../src/structuredData.js";
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
// Why: About was a dead-end (lone home link); players need guide discovery
// without putting About into every footer strip (stays out of CROSS_LINK_PAGE_IDS).
if (!about.includes('class="related-pages"') || !about.includes('data-related="home"')) {
  fail("about related must include home");
}
if (!about.includes('data-related="week"') || !about.includes('data-related="money"')) {
  fail("about related → archive + money");
}
if (!about.includes('data-related="businesses"') || !about.includes('data-related="gta6"')) {
  fail("about related → businesses + gta6");
}
if (about.includes('data-related="about"')) fail("about related must omit self");
if (!about.includes('class="footer-guides"') || !about.includes('data-footer-guide="gta6"')) {
  fail("about footer guides");
}
if (about.includes('data-footer-guide="about"')) fail("footer guides must not list about");
if (about.includes('class="page-home-link"')) fail("about uses related-pages, not lone page-home-link");

const week = renderSitePage(
  SITE_PAGES.find((p) => p.id === "week"),
  { lang: "en", cssHref: "../assets/x.css", faviconHref: "../favicon.svg" },
);
if (!week.includes('class="site-breadcrumbs"') || !week.includes("Archive")) {
  fail("week page visible breadcrumbs");
}
// a11y: nav + aria-label; last crumb is not a link and marks current page.
if (!week.includes('<nav class="site-breadcrumbs" aria-label="Breadcrumb">')) {
  fail("week breadcrumbs nav aria-label Breadcrumb");
}
const weekCrumbNav = week.match(/<nav class="site-breadcrumbs"[\s\S]*?<\/nav>/)?.[0] || "";
if (!weekCrumbNav.includes('aria-current="page"')) fail("week last crumb aria-current");
if (/site-breadcrumbs-current[\s\S]*?<a\s/i.test(weekCrumbNav)) {
  fail("week current crumb must not be a link", weekCrumbNav);
}
if (week.includes("page-stub-flag")) fail("week archive is not a stub");
if (!SITE_PAGES.find((p) => p.id === "week") || SITE_PAGES.find((p) => p.id === "week").stub) {
  fail("SITE_PAGES week stub flag must be false");
}
// Cross-links matter: Archive must discover Money / Businesses / home without relying on sticky nav alone.
if (!week.includes('class="related-pages"')) fail("week related-pages");
if (!week.includes('data-related="money"') || !week.includes('href="/guides/money/"')) {
  fail("week → money cross-link");
}
if (!week.includes('data-related="businesses"') || !week.includes('href="/guides/businesses/"')) {
  fail("week → businesses cross-link");
}
if (!week.includes('data-related="home"') || !week.includes('href="/"')) fail("week → home");
if (week.includes('data-related="week"')) fail("week must not self-link in related");
if (!week.includes('class="footer-guides"') || !week.includes('data-footer-guide="money"')) {
  fail("week footer guides");
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
if (!money.includes('href="/zh/week/"') || !money.includes('href="/zh/guides/businesses/"')) {
  fail("zh money cross-links");
}
if (!money.includes('data-related="home"') || !money.includes('href="/zh/"')) fail("zh money → home");

const businesses = renderSitePage(
  SITE_PAGES.find((p) => p.id === "businesses"),
  { lang: "en", cssHref: "../../../assets/x.css", faviconHref: "../../../favicon.svg" },
);
if (businesses.includes("page-stub-flag")) fail("businesses must not be stub");
if (!businesses.includes("biz-rank-list")) fail("businesses ranked list");
if (!businesses.includes("https://sessionscan.net/guides/businesses/")) fail("businesses url");
if (!businesses.includes('data-related="week"') || !businesses.includes('data-related="money"')) {
  fail("businesses related to archive + money");
}

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
if (!pageNode?.relatedLink?.includes("https://sessionscan.net/week/")) {
  fail("about relatedLink → week");
}
if (!pageNode?.relatedLink?.includes("https://sessionscan.net/gta6/")) {
  fail("about relatedLink → gta6");
}

const weekLd = parseJsonLdScripts(week).find((b) => b["@graph"]);
const weekPage = weekLd?.["@graph"]?.find((n) => n["@type"] === "WebPage");
if (!weekPage?.relatedLink?.includes("https://sessionscan.net/guides/money/")) {
  fail("week WebPage relatedLink → money");
}
if (!weekPage?.relatedLink?.includes("https://sessionscan.net/guides/businesses/")) {
  fail("week WebPage relatedLink → businesses");
}
if (!weekPage?.relatedLink?.includes("https://sessionscan.net/gta6/")) {
  fail("week WebPage relatedLink → gta6");
}
// BreadcrumbList on shell pages — Home → Archive (SEO trail; no invented paths).
const weekCrumbs = weekLd?.["@graph"]?.find((n) => n["@type"] === "BreadcrumbList");
if (!weekCrumbs?.itemListElement?.length) fail("week BreadcrumbList missing");
const weekCrumbUrls = weekCrumbs.itemListElement.map((it) => it.item);
const weekCrumbNames = weekCrumbs.itemListElement.map((it) => it.name);
if (weekCrumbUrls[0] !== "https://sessionscan.net/" || weekCrumbUrls.at(-1) !== "https://sessionscan.net/week/") {
  fail("week breadcrumb Home → Archive", weekCrumbUrls);
}
if (weekCrumbNames[0] !== "Home" || weekCrumbNames[1] !== "Archive") {
  fail("EN week breadcrumb names", weekCrumbNames);
}
for (let i = 0; i < weekCrumbs.itemListElement.length; i++) {
  if (weekCrumbs.itemListElement[i].position !== i + 1) fail("week breadcrumb positions");
}
const aboutCrumbs = aboutLd?.["@graph"]?.find((n) => n["@type"] === "BreadcrumbList");
if (!aboutCrumbs?.itemListElement?.some((it) => it.item === "https://sessionscan.net/about/")) {
  fail("about BreadcrumbList current page");
}
const zhWeekHtml = renderSitePage(SITE_PAGES.find((p) => p.id === "week"), {
  lang: "zh",
  cssHref: "../assets/x.css",
  faviconHref: "../favicon.svg",
});
const zhWeekLd = parseJsonLdScripts(zhWeekHtml).find((b) => b["@graph"]);
const zhWeekBc = zhWeekLd?.["@graph"]?.find((n) => n["@type"] === "BreadcrumbList");
const zhWeekNames = (zhWeekBc?.itemListElement || []).map((it) => it.name);
const zhWeekUrls = (zhWeekBc?.itemListElement || []).map((it) => it.item);
if (zhWeekNames[0] !== "回首頁" || zhWeekNames[1] !== "週更封存") {
  fail("ZH week breadcrumb names", zhWeekNames);
}
if (!zhWeekUrls.every((u) => String(u).startsWith("https://sessionscan.net/zh/"))) {
  fail("ZH week crumb URLs under /zh/", zhWeekUrls);
}
const moneyLd = parseJsonLdScripts(money).find((b) => b["@graph"]);
const moneyPageNode = moneyLd?.["@graph"]?.find((n) => n["@type"] === "WebPage");
if (!moneyPageNode?.relatedLink?.includes("https://sessionscan.net/zh/week/")) {
  fail("zh money relatedLink → archive");
}
const bizLd = parseJsonLdScripts(businesses).find((b) => b["@graph"]);
const bizPage = bizLd?.["@graph"]?.find((n) => n["@type"] === "WebPage");
if (!bizPage?.relatedLink?.includes("https://sessionscan.net/guides/money/")) {
  fail("businesses relatedLink → money");
}
if (!bizPage?.relatedLink?.includes("https://sessionscan.net/gta6/")) {
  fail("businesses relatedLink → gta6");
}
if (!moneyPageNode?.relatedLink?.includes("https://sessionscan.net/zh/gta6/")) {
  fail("zh money relatedLink → gta6");
}
const gta6Html = renderSitePage(SITE_PAGES.find((p) => p.id === "gta6"), {
  lang: "en",
  cssHref: "../assets/x.css",
  faviconHref: "../favicon.svg",
});
if (!gta6Html.includes('class="related-pages"') || !gta6Html.includes('data-related="week"')) {
  fail("gta6 page related-pages");
}
if (!gta6Html.includes('data-related="money"') || !gta6Html.includes('data-related="businesses"')) {
  fail("gta6 related must include money + businesses");
}
if (gta6Html.includes('data-related="gta6"')) fail("gta6 related must omit self");
if (!gta6Html.includes('data-footer-guide="gta6"')) fail("footer guides include gta6 on gta6 page");
const gta6Ld = parseJsonLdScripts(gta6Html).find((b) => b["@graph"]);
const gta6PageNode = gta6Ld?.["@graph"]?.find((n) => n["@type"] === "WebPage");
if (!gta6PageNode?.relatedLink?.includes("https://sessionscan.net/week/")) {
  fail("gta6 relatedLink → week");
}

const homeLd = homeJsonLd("en");
const siteNode = homeLd["@graph"]?.find((n) => n["@type"] === "WebSite");
const hasPartUrls = (siteNode?.hasPart || []).map((p) => p.url);
for (const u of [
  "https://sessionscan.net/week/",
  "https://sessionscan.net/guides/money/",
  "https://sessionscan.net/guides/businesses/",
  "https://sessionscan.net/gta6/",
]) {
  if (!hasPartUrls.includes(u)) fail("home WebSite.hasPart missing", u);
}
if (siteNode?.potentialAction?.["@type"] === "SearchAction") fail("no SearchAction on home");

const staticUrls = staticSitemapUrls();
if (!staticUrls.includes("https://sessionscan.net/about/")) fail("sitemap static about");
if (!staticUrls.includes("https://sessionscan.net/zh/guides/money/")) fail("sitemap static zh money");
if (!staticUrls.includes("https://sessionscan.net/week/")) fail("sitemap static week");
if (!staticUrls.includes("https://sessionscan.net/zh/guides/businesses/")) {
  fail("sitemap static zh businesses");
}
const sm = renderSitemap(sitemapUrls([]));
if (!sm.includes("<loc>https://sessionscan.net/gta6/</loc>")) fail("sitemap gta6");
if (!sm.includes('hreflang="zh-Hant" href="https://sessionscan.net/zh/gta6/"')) fail("sitemap gta6 hreflang");
if (!sm.includes("<loc>https://sessionscan.net/week/</loc>")) fail("sitemap week loc");
if (!sm.includes('hreflang="zh-Hant" href="https://sessionscan.net/zh/guides/money/"')) {
  fail("sitemap money hreflang");
}
if (!sm.includes("<loc>https://sessionscan.net/guides/businesses/</loc>")) fail("sitemap businesses loc");

const indexHtml = readFileSync(resolve(root, "index.html"), "utf8");
if (!indexHtml.includes('class="site-nav"')) fail("index.html must include site-nav source");
if (!indexHtml.includes('href="/guides/money/"')) fail("index.html money nav");
const shelled = injectHomeShell(indexHtml, { lang: "en" });
if (!shelled.includes("data-legacy-hash-redirect")) fail("injectHomeShell adds hash redirect");
if (shelled.includes('href="#hero"')) fail("brand must not stay on #hero");
// Home discovery: in-page related + footer guides (not only sticky site-nav).
if (!shelled.includes('class="related-pages"')) fail("home inject related-pages");
if (!shelled.includes('data-related="week"') || !shelled.includes('href="/week/"')) {
  fail("home → archive");
}
if (!shelled.includes('data-related="money"') || !shelled.includes('data-related="businesses"')) {
  fail("home → money + businesses");
}
if (!shelled.includes('data-related="gta6"') || !shelled.includes('href="/gta6/"')) {
  fail("home → gta6");
}
if (shelled.includes('data-related="home"')) fail("home related must omit self");
if (!shelled.includes('class="footer-guides"')) fail("home footer guides");
if (!shelled.includes('data-footer-guide="gta6"')) fail("home footer guides include gta6");
const footer = footerGuidesHtml("zh");
if (!footer.includes("/zh/week/") || !footer.includes("/zh/guides/money/")) fail("zh footer guides");
if (!footer.includes("/zh/gta6/") || !footer.includes('data-footer-guide="gta6"')) {
  fail("zh footer guides include gta6");
}
const relatedHome = relatedPagesHtml("en", { currentId: "home" });
if (relatedHome.includes('data-related="home"')) fail("relatedPagesHtml home skip self");

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
