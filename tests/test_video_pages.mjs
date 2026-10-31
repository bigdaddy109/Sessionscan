#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectVideos,
  hubHasVideos,
  renderSitemap,
  renderVideoPage,
  sitemapUrls,
  thumbUrl,
  videoPageDescription,
} from "../src/videoPages.js";
import { videoPageUrl } from "../src/cardShare.js";
import {
  HAS_SEARCH_URL_PARAM,
  parseJsonLdScripts,
  videoObjectJsonLd,
} from "../src/structuredData.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sample = JSON.parse(readFileSync(resolve(root, "public/data/sample.json"), "utf8"));

function fail(msg, extra) {
  console.error(msg, extra ?? "");
  process.exit(1);
}

if (!hubHasVideos(sample)) fail("sample hub must contain videos");

const fromSample = collectVideos({ hubs: [sample] });
const ids = fromSample.map((v) => v.video_id);
if (!ids.includes("5XBMNYmFmTs")) fail("sample must yield 5XBMNYmFmTs", ids);
if (new Set(ids).size !== ids.length) fail("video ids must be unique", ids);
if (ids.some((id) => !/^[A-Za-z0-9_-]{11}$/.test(id))) fail("only 11-char youtube ids", ids);

const dropped = {
  video_id: "dQw4w9WgXcQ",
  title: "已下榜但仍可分享",
  channel: "Archive",
  url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  lang: "en",
};
const merged = collectVideos({
  archive: { videos: [dropped] },
  hubs: [{ videos_hot_zh: sample.videos_hot_zh }],
});
if (!merged.some((v) => v.video_id === "dQw4w9WgXcQ")) fail("archive video must survive a refresh");
if (!merged.some((v) => v.video_id === "5XBMNYmFmTs")) fail("current hub videos still collected");

const video = fromSample.find((v) => v.video_id === "5XBMNYmFmTs");
const html = renderVideoPage(video, { cssHref: "../../assets/index-test.css", faviconHref: "../../favicon.svg" });
if (!html.startsWith("<!DOCTYPE html>")) fail("page must be complete HTML");
if (!html.includes('lang="en"')) fail("en lang");
if (!html.includes("佩里克島最高效率攻略 | SessionScan")) fail("title tag", html.slice(0, 400));
for (const needle of [
  'property="og:title"',
  'property="og:description"',
  'property="og:url"',
  'property="og:image"',
  'name="twitter:card" content="summary_large_image"',
  'name="twitter:image"',
  'rel="canonical" href="https://sessionscan.net/v/5XBMNYmFmTs/"',
  thumbUrl("5XBMNYmFmTs", "hqdefault"),
  "Watch on YouTube",
  "Home",
  video.url,
  "../../assets/index-test.css",
]) {
  if (!html.includes(needle)) fail("missing page content", needle);
}
if (html.includes('property="og:image" content="https://sessionscan.net/og.jpg"')) {
  fail("video page must use the video thumbnail, not the site og.jpg");
}
if (!html.includes(videoPageDescription(video).slice(0, 12))) fail("description should mention channel/date");

// Why: the live sitemap was ~2,280 URLs because every archived share page (and its zh twin)
// was listed. Keep home, shell/guide pages, and recent popular videos. Old or quiet videos
// stay as pages but drop out of the sitemap.
const sitemapNow = new Date("2026-10-29T12:00:00Z");
const popularId = "PopVideo01x";
const quietId = "QuietVid001";
const ownedId = "OwnedShort1";
const sitemapVideos = [
  ...fromSample,
  { video_id: popularId, title: "Recent popular", date: "2026-10-20", views: 250000 },
  { video_id: quietId, title: "Recent but quiet", date: "2026-10-20", views: 500 },
  { video_id: ownedId, title: "Owned short", date: "", views: 12, owned: true },
];
const sitemap = renderSitemap(
  sitemapUrls(sitemapVideos, { weeks: ["2026-08-27"], now: sitemapNow }),
);
if (!sitemap.includes("<loc>https://sessionscan.net/</loc>")) fail("sitemap homepage");
if (!sitemap.includes("<loc>https://sessionscan.net/zh/</loc>")) fail("sitemap zh homepage");
if (!sitemap.includes('hreflang="zh-Hant"')) fail("sitemap hreflang");
if (!sitemap.includes(`<loc>https://sessionscan.net/v/${popularId}/</loc>`)) fail("sitemap recent popular");
if (!sitemap.includes(`<loc>https://sessionscan.net/zh/v/${popularId}/</loc>`)) fail("sitemap zh recent popular");
if (sitemap.includes("5XBMNYmFmTs")) fail("old sample video must leave the sitemap");
if (sitemap.includes(quietId)) fail("recent low-view video must leave the sitemap");
if (!sitemap.includes(`<loc>https://sessionscan.net/v/${ownedId}/</loc>`)) fail("owned page stays listed");
if (sitemap.includes("/week/2026-08-27/")) fail("dated freeze pages are sitemap long tail");
if (!sitemap.includes("<loc>https://sessionscan.net/week/</loc>")) fail("week index stays");
if (!sitemap.includes("<loc>https://sessionscan.net/about/</loc>")) fail("sitemap about");
if (!sitemap.includes("<loc>https://sessionscan.net/zh/guides/money/</loc>")) fail("sitemap zh money");
if (!sitemap.includes("<loc>https://sessionscan.net/guides/acid-lab/</loc>")) fail("sitemap acid lab");
if (sitemap.includes("dQw4w9WgXcQ")) fail("sample sitemap should not invent archive ids");
if (!sitemap.includes(`hreflang="zh-Hant" href="${videoPageUrl(popularId, "zh")}"`)) {
  fail("sitemap video hreflang zh-Hant");
}
{
  const many = [];
  for (let i = 0; i < 41; i += 1) {
    many.push({
      video_id: `a${String(i).padStart(10, "0")}`,
      date: "2026-10-10",
      views: 100000 + i,
    });
  }
  const capped = sitemapUrls(many, { now: sitemapNow });
  const videoLocs = capped.filter((u) => u.includes("/v/"));
  if (videoLocs.length !== 80) fail("sitemap popular cap is 40 videos × 2 locales", videoLocs.length);
  if (capped.some((u) => u.includes("/v/a0000000000/"))) fail("lowest-view video must fall off the cap");
}

const empty = renderVideoPage({ title: "no id" });
if (empty) fail("video without youtube id must not render");

// Share pages must ship valid VideoObject JSON-LD so crawlers can read title, date, and embed from existing hub fields.
let videoLd;
let breadcrumbLd;
try {
  const blocks = parseJsonLdScripts(html);
  const graphBlock = blocks.find((block) => Array.isArray(block["@graph"]));
  const graph = graphBlock?.["@graph"] || [];
  videoLd = graph.find((n) => n?.["@type"] === "VideoObject")
    || blocks.find((block) => block["@type"] === "VideoObject");
  breadcrumbLd = graph.find((n) => n?.["@type"] === "BreadcrumbList");
} catch (err) {
  fail("share page JSON-LD must parse", err);
}
if (!videoLd) fail("share page must include VideoObject JSON-LD");
const expectedLd = videoObjectJsonLd(video, { description: videoPageDescription(video) });
for (const key of ["name", "description", "thumbnailUrl", "uploadDate", "embedUrl", "contentUrl"]) {
  if (videoLd[key] !== expectedLd[key]) fail(`VideoObject.${key}`, videoLd[key]);
}
if (videoLd.name !== video.title) fail("VideoObject name is the video title", videoLd.name);
if (videoLd.uploadDate !== video.date) fail("VideoObject uploadDate comes from hub date", videoLd.uploadDate);
if (videoLd.contentUrl !== video.url) fail("VideoObject contentUrl comes from hub url", videoLd.contentUrl);
if (!videoLd.thumbnailUrl.includes(video.video_id)) fail("VideoObject thumbnailUrl", videoLd.thumbnailUrl);
if (!videoLd.embedUrl.includes(video.video_id)) fail("VideoObject embedUrl", videoLd.embedUrl);
// Why: share pages need the same a11y breadcrumb contract as shell/freeze (#73) so
// Home is one click away and the current title is not a self-link.
if (!html.includes('<nav class="site-breadcrumbs" aria-label="Breadcrumb">')) {
  fail("video page visible breadcrumbs nav aria-label");
}
const crumbNav = html.match(/<nav class="site-breadcrumbs"[\s\S]*?<\/nav>/)?.[0] || "";
if (!crumbNav.includes('aria-current="page"') || /site-breadcrumbs-current[\s\S]*?<a\s/i.test(crumbNav)) {
  fail("video current crumb not a link + aria-current", crumbNav);
}
if (!crumbNav.includes('href="/"') || !crumbNav.includes(video.title)) {
  fail("video crumbs Home + title", crumbNav);
}
if (!breadcrumbLd?.itemListElement?.length) fail("video BreadcrumbList JSON-LD");
const bcUrls = breadcrumbLd.itemListElement.map((it) => it.item);
if (bcUrls[0] !== "https://sessionscan.net/" || !String(bcUrls[1] || "").includes(`/v/${video.video_id}/`)) {
  fail("video BreadcrumbList absolute URLs", bcUrls);
}
if (HAS_SEARCH_URL_PARAM) fail("search is hash-only; do not advertise a SearchAction URL param");
if (!html.includes("Subscribe on YouTube")) fail("share header/footer subscribe label");
if (!html.includes("https://www.youtube.com/@sessionscan")) fail("share pages keep the owned YouTube URL");
if (!html.includes("viewport-fit=cover")) fail("share pages must honor iOS safe-area via viewport-fit=cover");
if (!html.includes("channel-link-play")) fail("share header merges subscribe into one ▶ control");
if (!html.includes("header-home-link")) fail("share header home link must not reuse channel-link");
// Why: share pages only offered YouTube. Players landing on /v/{id}/ could not
// open the same Instagram and X profiles the homepage header already shows.
const videoHeader = html.match(/<nav class="header-social"[\s\S]*?<\/nav>/)?.[0] || "";
const videoFooter = html.match(/<p class="footer-social">[\s\S]*?<\/p>/)?.[0] || "";
for (const href of [
  "https://www.youtube.com/@sessionscan",
  "https://www.instagram.com/sessionscan/",
  "https://x.com/SessionScanGTA",
]) {
  if (!videoHeader.includes(href)) fail("video header social missing", href);
  if (!videoFooter.includes(href)) fail("video footer social missing", href);
}
if (!videoHeader.includes('aria-label="Follow on X @SessionScanGTA"')) {
  fail("video header X accessible name");
}
// Why: visible "▶" inside a control whose accessible name is only "Play: {title}"
// fails Lighthouse label-content-name-mismatch (WCAG 2.5.3). CSS triangle only.
if (html.includes("▶</span></div>")) fail("video play chrome must not use ▶ text inside .play");
if (!html.includes('<div class="play" aria-hidden="true"><span></span></div>')) {
  fail("video play chrome uses empty span + CSS triangle");
}

// Why: #74 live gate asked for ZH video crumbs; /zh/v/{id}/ must ship with localized
// nav + BreadcrumbList so Home → /zh/ and last crumb is not a self-link.
const zhHtml = renderVideoPage(video, {
  cssHref: "../../../assets/index-test.css",
  faviconHref: "../../../favicon.svg",
  lang: "zh",
});
if (!zhHtml.includes('lang="zh-Hant"') || !zhHtml.includes('data-ui-lang="zh"')) fail("zh video lang");
if (!zhHtml.includes("追蹤 X @SessionScanGTA") || !zhHtml.includes("https://www.instagram.com/sessionscan/")) {
  fail("zh video header/footer must keep IG and X");
}
if (!zhHtml.includes('aria-label="麵包屑導覽"')) fail("zh video breadcrumbs aria-label");
const zhNav = zhHtml.match(/<nav class="site-breadcrumbs"[\s\S]*?<\/nav>/)?.[0] || "";
if (!zhNav.includes('href="/zh/"') || !zhNav.includes("回首頁")) fail("zh video Home crumb", zhNav);
if (!zhNav.includes('aria-current="page"') || /site-breadcrumbs-current[\s\S]*?<a\s/i.test(zhNav)) {
  fail("zh video current crumb not a link", zhNav);
}
if (!zhHtml.includes(`rel="canonical" href="${videoPageUrl(video.video_id, "zh")}"`)) {
  fail("zh video canonical");
}
if (!zhHtml.includes(`hreflang="en" href="${videoPageUrl(video.video_id, "en")}"`)) {
  fail("zh video hreflang en peer");
}
const zhBlocks = parseJsonLdScripts(zhHtml);
const zhGraph = zhBlocks.find((b) => Array.isArray(b["@graph"]))?.["@graph"] || [];
const zhBc = zhGraph.find((n) => n?.["@type"] === "BreadcrumbList");
const zhVo = zhGraph.find((n) => n?.["@type"] === "VideoObject");
if (!zhVo || !zhBc) fail("zh video @graph VideoObject + BreadcrumbList");
const zhBcUrls = (zhBc.itemListElement || []).map((it) => it.item);
if (zhBcUrls[0] !== "https://sessionscan.net/zh/" || zhBcUrls[1] !== videoPageUrl(video.video_id, "zh")) {
  fail("zh video BreadcrumbList absolute URLs", zhBcUrls);
}
if (zhVo.url !== videoPageUrl(video.video_id, "zh")) fail("zh VideoObject.url is locale page", zhVo.url);
// Why: the copy button and Share to X read one data-copy / intent URL.
// /zh/v/{id}/ used to paste the English page, so a Traditional Chinese
// share opened the wrong locale in LINE and Discord.
const enCopy = html.match(/data-copy="([^"]+)"/)?.[1] || "";
const zhCopy = zhHtml.match(/data-copy="([^"]+)"/)?.[1] || "";
if (enCopy !== videoPageUrl(video.video_id, "en")) fail("en video copy link", enCopy);
if (zhCopy !== videoPageUrl(video.video_id, "zh")) fail("zh video copy link", zhCopy);
if (!zhHtml.includes(encodeURIComponent(videoPageUrl(video.video_id, "zh")))) {
  fail("zh video Share to X must use the zh page");
}

// Why: share pages were a dead-end after crumbs; reuse shell related/footer
// guides so Archive/Money/Businesses stay one click away on EN and ZH videos.
for (const [label, pageHtml] of [
  ["en", html],
  ["zh", zhHtml],
]) {
  if (!pageHtml.includes('class="related-pages"')) fail(`${label} video related-pages`);
  if (!pageHtml.includes('data-related="week"') || !pageHtml.includes('data-related="money"')) {
    fail(`${label} video related Archive/Money`, pageHtml.match(/related-pages[\s\S]{0,200}/)?.[0]);
  }
  if (!pageHtml.includes('class="footer-guides"') || !pageHtml.includes('data-footer-guide="businesses"')) {
    fail(`${label} video footer-guides`);
  }
}

// Why: video shares should match shell primary path nav so This week / Archive /
// Money stay reachable without hunting related/footer links (proposal §2).
const enSiteNav = html.match(/<nav class="site-nav"[\s\S]*?<\/nav>/)?.[0] || "";
const zhSiteNav = zhHtml.match(/<nav class="site-nav"[\s\S]*?<\/nav>/)?.[0] || "";
if (!enSiteNav.includes('data-nav="week"') || !enSiteNav.includes('href="/week/"')) {
  fail("en video primary site-nav", enSiteNav.slice(0, 200));
}
if (!zhSiteNav.includes('href="/zh/week/"') || !zhSiteNav.includes('href="/zh/guides/money/"')) {
  fail("zh video primary site-nav locale hrefs", zhSiteNav.slice(0, 200));
}
if (enSiteNav.includes('aria-current="page"') || zhSiteNav.includes('aria-current="page"')) {
  fail("video site-nav must not mark a shell page as current");
}

console.log("test_video_pages.mjs ok", fromSample.length, "sample videos");
