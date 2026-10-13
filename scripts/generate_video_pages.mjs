#!/usr/bin/env node
/**
 * Post-vite: write /v/{youtubeId}/index.html + sitemap.xml from hub JSON + archive.
 * Archive (data/videos_archive.json) keeps pages after a video leaves the homepage list.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { collectVideos, hubHasVideos, renderSitemap, renderVideoPage, sitemapUrls } from "../src/videoPages.js";
import { listArchiveWeeks } from "../src/weekArchive.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");

function loadJson(rel) {
  const path = resolve(root, rel);
  if (!existsSync(path)) return null;
  try {
    const data = JSON.parse(readFileSync(path, "utf8"));
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

function readDistIndex() {
  const path = resolve(dist, "index.html");
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf8");
}

function cssHrefFromIndex(html) {
  const m = html.match(/href="((?:\.\.\/|\.\/)?assets\/[^"]+\.css)"/);
  if (!m) return "../../assets/index.css";
  const href = m[1].replace(/^\.\//, "");
  return href.startsWith("../") ? href : `../../${href}`;
}

if (!existsSync(resolve(dist, "index.html"))) {
  console.warn("generate_video_pages: dist/index.html missing");
  process.exit(0);
}

const archive = loadJson("data/videos_archive.json");
const site = loadJson("public/data/site.json") || loadJson("dist/data/site.json");
const sample = loadJson("public/data/sample.json");
const hubs = [];
if (site && hubHasVideos(site)) hubs.push(site);
else if (sample && hubHasVideos(sample)) hubs.push(sample);

const videos = collectVideos({ archive, hubs });
const indexHtml = readDistIndex();
const cssHref = cssHrefFromIndex(indexHtml);
const faviconHref = "../../favicon.svg";

const zhCssHref = cssHref.replace(/^\.\.\/\.\.\//, "../../../");
const zhFaviconHref = "../../../favicon.svg";

let written = 0;
let writtenZh = 0;
for (const video of videos) {
  const dir = resolve(dist, "v", video.video_id);
  mkdirSync(dir, { recursive: true });
  const html = renderVideoPage(video, { cssHref, faviconHref, lang: "en" });
  if (!html) continue;
  writeFileSync(resolve(dir, "index.html"), html);
  written += 1;

  const zhDir = resolve(dist, "zh", "v", video.video_id);
  mkdirSync(zhDir, { recursive: true });
  const zhHtml = renderVideoPage(video, {
    cssHref: zhCssHref,
    faviconHref: zhFaviconHref,
    lang: "zh",
  });
  if (zhHtml) {
    writeFileSync(resolve(zhDir, "index.html"), zhHtml);
    writtenZh += 1;
  }
}

const weeks = listArchiveWeeks(site || sample || {});
const sitemapPath = resolve(dist, "sitemap.xml");
writeFileSync(sitemapPath, renderSitemap(sitemapUrls(videos, { weeks })));

console.log(
  `generate_video_pages: ${written} EN + ${writtenZh} ZH pages -> dist/v/*/ + dist/zh/v/*/index.html; sitemap written (${weeks.length} archive weeks)`,
);
