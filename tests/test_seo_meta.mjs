#!/usr/bin/env node
/**
 * Why this test matters: every user-facing EN+/zh/ page must ship unique title +
 * description, matching OG/Twitter fields, correct canonicals, and hreflang
 * en/zh-Hant/x-default — otherwise share previews and multilingual SEO drift.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  OG_IMAGE_HEIGHT,
  OG_IMAGE_URL,
  OG_IMAGE_WIDTH,
  TWITTER_SITE,
  UI,
  t,
} from "../src/i18n.js";
import {
  PAGE_OG_IMAGE_BY_ID,
  PAGE_OG_IMAGE_FILES,
  ogImageUrlForPage,
} from "../src/ogImages.js";
import { SITE_PAGES, renderSitePage } from "../src/sitePages.js";
import { renderArchiveIndexPage, renderWeekFreezePage } from "../src/weekArchive.js";
import { renderVideoPage } from "../src/videoPages.js";
import { statSync } from "node:fs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function fail(msg, extra) {
  console.error(msg, extra ?? "");
  process.exit(1);
}

function titleOf(html) {
  const m = String(html || "").match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return (m ? m[1] : "").trim();
}

function metaContent(html, name) {
  const re = new RegExp(`<meta[^>]*name="${name}"[^>]*content="([^"]*)"`, "i");
  const m = String(html || "").match(re);
  if (m) return m[1];
  const re2 = new RegExp(`<meta[^>]*content="([^"]*)"[^>]*name="${name}"`, "i");
  const m2 = String(html || "").match(re2);
  return m2 ? m2[1] : "";
}

function propContent(html, prop) {
  const re = new RegExp(`<meta[^>]*property="${prop}"[^>]*content="([^"]*)"`, "i");
  const m = String(html || "").match(re);
  if (m) return m[1];
  const re2 = new RegExp(`<meta[^>]*content="([^"]*)"[^>]*property="${prop}"`, "i");
  const m2 = String(html || "").match(re2);
  return m2 ? m2[1] : "";
}

function canonical(html) {
  const m = String(html || "").match(/rel="canonical"\s+href="([^"]+)"/);
  return m ? m[1] : "";
}

function hreflang(html, lang) {
  const re = new RegExp(`rel="alternate"\\s+hreflang="${lang}"\\s+href="([^"]+)"`);
  const m = String(html || "").match(re);
  return m ? m[1] : "";
}

function assertPageSeo(html, { title, desc, url, enUrl, zhUrl, label, ogImage }) {
  if (titleOf(html) !== title) fail(`${label} title`, titleOf(html));
  if (metaContent(html, "description") !== desc) fail(`${label} description`, metaContent(html, "description"));
  if (canonical(html) !== url) fail(`${label} canonical`, canonical(html));
  if (hreflang(html, "en") !== enUrl) fail(`${label} hreflang en`, hreflang(html, "en"));
  if (hreflang(html, "zh-Hant") !== zhUrl) fail(`${label} hreflang zh-Hant`, hreflang(html, "zh-Hant"));
  if (hreflang(html, "x-default") !== enUrl) fail(`${label} hreflang x-default`, hreflang(html, "x-default"));
  if (propContent(html, "og:title") !== title) fail(`${label} og:title`);
  if (propContent(html, "og:description") !== desc) fail(`${label} og:description`);
  if (propContent(html, "og:url") !== url) fail(`${label} og:url`, propContent(html, "og:url"));
  const image = propContent(html, "og:image");
  const expectImage = ogImage || OG_IMAGE_URL;
  if (image !== expectImage && !image.includes("ytimg.com")) {
    fail(`${label} og:image`, image);
  }
  if (image === expectImage || image.startsWith("https://sessionscan.net/og")) {
    if (propContent(html, "og:image:width") !== OG_IMAGE_WIDTH) fail(`${label} og:image:width`);
    if (propContent(html, "og:image:height") !== OG_IMAGE_HEIGHT) fail(`${label} og:image:height`);
  }
  if (!propContent(html, "og:image:alt")) fail(`${label} og:image:alt missing`);
  if (propContent(html, "og:site_name") !== "SessionScan") fail(`${label} og:site_name`);
  if (metaContent(html, "twitter:card") !== "summary_large_image") fail(`${label} twitter:card`);
  if (metaContent(html, "twitter:site") !== TWITTER_SITE) fail(`${label} twitter:site`, metaContent(html, "twitter:site"));
  if (metaContent(html, "twitter:title") !== title) fail(`${label} twitter:title`);
  if (metaContent(html, "twitter:description") !== desc) fail(`${label} twitter:description`);
  if (metaContent(html, "twitter:image") !== image) fail(`${label} twitter:image mismatch`, metaContent(html, "twitter:image"));
  if (!String(image).startsWith("https://")) fail(`${label} og:image must be absolute`, image);
}

// Why these files matter: crawlers fetch absolute og:image URLs; missing
// or oversize art breaks summary_large_image previews on Discord/LINE/X.
const homeOg = resolve(root, "public/og.jpg");
if (!existsSync(homeOg)) fail("public/og.jpg missing");
if (statSync(homeOg).size > 300 * 1024) fail("public/og.jpg over 300KB");
for (const file of PAGE_OG_IMAGE_FILES) {
  const path = resolve(root, "public", file);
  if (!existsSync(path)) fail(`page OG missing: ${file}`);
  if (statSync(path).size > 300 * 1024) fail(`page OG over 300KB: ${file}`);
}
for (const page of SITE_PAGES) {
  const url = ogImageUrlForPage(page.id);
  if (url === OG_IMAGE_URL) fail(`shell page must not reuse home og.jpg`, page.id);
  if (!url.startsWith("https://sessionscan.net/og-")) fail(`shell og url shape`, url);
}
if (ogImageUrlForPage("week-freeze") !== PAGE_OG_IMAGE_BY_ID.week) {
  fail("week-freeze must reuse archive OG art");
}

// Home source (EN)
const indexHtml = readFileSync(resolve(root, "index.html"), "utf8");
assertPageSeo(indexHtml, {
  title: UI.en.metaTitle,
  desc: UI.en.metaDesc,
  url: "https://sessionscan.net/",
  enUrl: "https://sessionscan.net/",
  zhUrl: "https://sessionscan.net/zh/",
  label: "home en source",
  ogImage: OG_IMAGE_URL,
});
if (!indexHtml.includes(`content="${UI.en.metaOgImageAlt}"`)) fail("home og:image:alt copy");

// Titles must stay unique across shells
const titles = new Set([UI.en.metaTitle, UI.zh.metaTitle]);
const descs = new Set([UI.en.metaDesc, UI.zh.metaDesc]);
for (const page of SITE_PAGES) {
  for (const lang of ["en", "zh"]) {
    const title = t(page.titleKey, {}, lang);
    const desc = t(page.descKey, {}, lang);
    if (titles.has(title)) fail("duplicate page title", `${page.id}/${lang}: ${title}`);
    if (descs.has(desc)) fail("duplicate page description", `${page.id}/${lang}`);
    titles.add(title);
    descs.add(desc);
    const html = renderSitePage(page, {
      lang,
      cssHref: "/assets/x.css",
      faviconHref: "/favicon.svg",
    });
    const url =
      lang === "zh"
        ? `https://sessionscan.net/zh/${page.path}`
        : `https://sessionscan.net/${page.path}`;
    const enUrl = `https://sessionscan.net/${page.path}`;
    const zhUrl = `https://sessionscan.net/zh/${page.path}`;
    assertPageSeo(html, {
      title,
      desc,
      url,
      enUrl,
      zhUrl,
      label: `${page.id}/${lang}`,
      ogImage: ogImageUrlForPage(page.id),
    });
  }
}

const hubPath = resolve(root, "tests/fixtures/hub.json");
const hub = JSON.parse(readFileSync(hubPath, "utf8"));
const archiveEn = renderArchiveIndexPage(hub, { lang: "en", cssHref: "/assets/x.css", faviconHref: "/favicon.svg" });
assertPageSeo(archiveEn, {
  title: t("pageWeekTitle", {}, "en"),
  desc: t("pageWeekDesc", {}, "en"),
  url: "https://sessionscan.net/week/",
  enUrl: "https://sessionscan.net/week/",
  zhUrl: "https://sessionscan.net/zh/week/",
  label: "archive index en",
  ogImage: ogImageUrlForPage("week"),
});

const freezeWeek = "2026-08-27";
const freezeZh = renderWeekFreezePage(hub, freezeWeek, {
  lang: "zh",
  cssHref: "/assets/x.css",
  faviconHref: "/favicon.svg",
});
const freezeTitle = t("archiveWeekTitle", { week: freezeWeek }, "zh");
const freezeDescActual = metaContent(freezeZh, "description");
assertPageSeo(freezeZh, {
  title: freezeTitle,
  desc: freezeDescActual,
  url: `https://sessionscan.net/zh/week/${freezeWeek}/`,
  enUrl: `https://sessionscan.net/week/${freezeWeek}/`,
  zhUrl: `https://sessionscan.net/zh/week/${freezeWeek}/`,
  label: "week freeze zh",
  ogImage: ogImageUrlForPage("week-freeze"),
});
if (!freezeDescActual.includes(freezeWeek)) fail("freeze desc mentions week");
if (freezeTitle === t("pageWeekTitle", {}, "zh")) fail("freeze title must differ from archive index");

// Video pages: unique title, twitter:site parity, thumbnail OG (not site og.jpg)
const sample = JSON.parse(readFileSync(resolve(root, "public/data/sample.json"), "utf8"));
const vids = [].concat(sample.videos_hot_zh || [], sample.videos_shorts || []);
const video = vids.find((v) => String(v.url || "").includes("5XBMNYmFmTs") || v.video_id === "5XBMNYmFmTs");
if (!video) fail("sample video fixture missing");
const vHtml = renderVideoPage(video, { cssHref: "../../assets/x.css", faviconHref: "../../favicon.svg" });
if (metaContent(vHtml, "twitter:site") !== TWITTER_SITE) fail("video twitter:site", metaContent(vHtml, "twitter:site"));
if (propContent(vHtml, "og:image") === OG_IMAGE_URL) fail("video must not use site og.jpg");
if (!propContent(vHtml, "og:image").includes("ytimg.com")) fail("video og:image must be YouTube thumb");
if (metaContent(vHtml, "twitter:card") !== "summary_large_image") fail("video twitter:card");
if (metaContent(vHtml, "twitter:image") !== propContent(vHtml, "og:image")) fail("video twitter:image");
if (propContent(vHtml, "og:image:width") !== OG_IMAGE_WIDTH) fail("video og:image:width");
if (!canonical(vHtml).includes("/v/")) fail("video canonical");

// Built dist (when present): no broken/duplicate canonicals on key pages
const distChecks = [
  ["dist/index.html", "https://sessionscan.net/", UI.en.metaTitle, OG_IMAGE_URL],
  ["dist/zh/index.html", "https://sessionscan.net/zh/", UI.zh.metaTitle, OG_IMAGE_URL],
  ["dist/about/index.html", "https://sessionscan.net/about/", t("pageAboutTitle", {}, "en"), ogImageUrlForPage("about")],
  ["dist/zh/about/index.html", "https://sessionscan.net/zh/about/", t("pageAboutTitle", {}, "zh"), ogImageUrlForPage("about")],
  ["dist/guides/money/index.html", "https://sessionscan.net/guides/money/", t("pageMoneyTitle", {}, "en"), ogImageUrlForPage("money")],
  ["dist/zh/guides/money/index.html", "https://sessionscan.net/zh/guides/money/", t("pageMoneyTitle", {}, "zh"), ogImageUrlForPage("money")],
  ["dist/guides/businesses/index.html", "https://sessionscan.net/guides/businesses/", t("pageBusinessesTitle", {}, "en"), ogImageUrlForPage("businesses")],
  ["dist/gta6/index.html", "https://sessionscan.net/gta6/", t("pageGta6Title", {}, "en"), ogImageUrlForPage("gta6")],
  ["dist/week/index.html", "https://sessionscan.net/week/", t("pageWeekTitle", {}, "en"), ogImageUrlForPage("week")],
];
for (const [rel, url, expectTitle, expectOg] of distChecks) {
  const path = resolve(root, rel);
  if (!existsSync(path)) continue;
  const html = readFileSync(path, "utf8");
  if (canonical(html) !== url) fail(`dist canonical ${rel}`, canonical(html));
  if (titleOf(html) !== expectTitle) fail(`dist title ${rel}`, titleOf(html));
  const cans = [...html.matchAll(/rel="canonical"/g)];
  if (cans.length !== 1) fail(`dist duplicate/missing canonical ${rel}`, cans.length);
  if (metaContent(html, "twitter:site") !== TWITTER_SITE) fail(`dist twitter:site ${rel}`);
  if (propContent(html, "og:image") !== expectOg) fail(`dist og:image ${rel}`, propContent(html, "og:image"));
  if (metaContent(html, "twitter:card") !== "summary_large_image") fail(`dist twitter:card ${rel}`);
  if (metaContent(html, "twitter:image") !== expectOg) fail(`dist twitter:image ${rel}`);
}

console.log("test_seo_meta.mjs ok", titles.size, "unique titles");
