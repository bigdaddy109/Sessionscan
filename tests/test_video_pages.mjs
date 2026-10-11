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

const sitemap = renderSitemap(sitemapUrls(fromSample));
if (!sitemap.includes("<loc>https://sessionscan.net/</loc>")) fail("sitemap homepage");
if (!sitemap.includes("<loc>https://sessionscan.net/zh/</loc>")) fail("sitemap zh homepage");
if (!sitemap.includes('hreflang="zh-Hant"')) fail("sitemap hreflang");
if (!sitemap.includes("<loc>https://sessionscan.net/v/5XBMNYmFmTs/</loc>")) fail("sitemap video url");
if (sitemap.includes("dQw4w9WgXcQ")) fail("sample sitemap should not invent archive ids");

const empty = renderVideoPage({ title: "no id" });
if (empty) fail("video without youtube id must not render");

// Share pages must ship valid VideoObject JSON-LD so crawlers can read title, date, and embed from existing hub fields.
let videoLd;
try {
  const blocks = parseJsonLdScripts(html);
  videoLd = blocks.find((block) => block["@type"] === "VideoObject");
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
if (HAS_SEARCH_URL_PARAM) fail("search is hash-only; do not advertise a SearchAction URL param");
if (!html.includes("Subscribe on YouTube")) fail("share header/footer subscribe label");
if (!html.includes("https://www.youtube.com/@sessionscan")) fail("share pages keep the owned YouTube URL");
if (!html.includes("viewport-fit=cover")) fail("share pages must honor iOS safe-area via viewport-fit=cover");
if (!html.includes("channel-link-play")) fail("share header merges subscribe into one ▶ control");
if (!html.includes("header-home-link")) fail("share header home link must not reuse channel-link");

console.log("test_video_pages.mjs ok", fromSample.length, "sample videos");
