#!/usr/bin/env node
/**
 * Why this test matters: Cloudflare Web Analytics only counts pages that ship
 * the beacon. /v/{id}/ share pages were generated without it, so most visits
 * never appeared in the dashboard. Guard the shared snippet and every built HTML.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CF_WEB_ANALYTICS_MARKER,
  CF_WEB_ANALYTICS_SCRIPT_SRC,
  CF_WEB_ANALYTICS_TOKEN,
  cfWebAnalyticsHtml,
  ensureCfWebAnalytics,
  hasCfWebAnalytics,
} from "../src/cfWebAnalytics.js";
import { collectVideos, renderVideoPage } from "../src/videoPages.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");

function fail(msg, extra) {
  console.error(msg, extra ?? "");
  process.exit(1);
}

const snippet = cfWebAnalyticsHtml();
if (!snippet.includes(CF_WEB_ANALYTICS_SCRIPT_SRC)) fail("snippet must load beacon.min.js");
if (!snippet.includes(CF_WEB_ANALYTICS_TOKEN)) fail("snippet must include sessionscan.net token");
if (!snippet.includes('type="module"')) fail("official CF embed uses type=module");
if (!snippet.includes("data-cf-beacon")) fail("snippet must set data-cf-beacon");
if (snippet.includes("github.io")) fail("beacon must not target github.io");

const bare = "<!DOCTYPE html><html><body><p>x</p></body></html>";
const injected = ensureCfWebAnalytics(bare);
if (!hasCfWebAnalytics(injected)) fail("ensureCfWebAnalytics must inject beacon");
if (ensureCfWebAnalytics(injected) !== injected) fail("ensure must be idempotent");
if (!hasCfWebAnalytics(`...${CF_WEB_ANALYTICS_MARKER}...`)) fail("hasCfWebAnalytics marker check");

const sample = JSON.parse(readFileSync(resolve(root, "public/data/sample.json"), "utf8"));
const videos = collectVideos({ hubs: [sample] });
const video = videos.find((v) => v.video_id === "5XBMNYmFmTs") || videos[0];
if (!video) fail("sample must yield a video for share-page beacon check");
const videoHtml = renderVideoPage(video);
if (!hasCfWebAnalytics(videoHtml)) {
  fail("renderVideoPage must include Cloudflare Web Analytics beacon");
}
if (!videoHtml.includes(CF_WEB_ANALYTICS_TOKEN)) {
  fail("share page beacon must use the sessionscan.net token");
}

const vite = readFileSync(resolve(root, "vite.config.js"), "utf8");
if (!vite.includes("ensureCfWebAnalytics") || !vite.includes("cfWebAnalytics.js")) {
  fail("vite build plugin must use src/cfWebAnalytics.js (single source)");
}
if (vite.includes("a2ed116dcca9428aae207121d25629e5") && !vite.includes("cfWebAnalytics")) {
  fail("token must not be duplicated outside the shared module");
}

function walkHtml(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) walkHtml(path, out);
    else if (name.endsWith(".html")) out.push(path);
  }
  return out;
}

if (!existsSync(resolve(dist, "index.html"))) {
  fail("dist/index.html missing — run npm run build before this test");
}

const pages = walkHtml(dist);
if (pages.length < 3) fail("expected home, zh, and at least one /v/ page in dist", pages.length);

const missing = [];
for (const path of pages) {
  const html = readFileSync(path, "utf8");
  if (!hasCfWebAnalytics(html) || !html.includes(CF_WEB_ANALYTICS_TOKEN)) {
    missing.push(path.replace(root + "/", ""));
  }
}
if (missing.length) {
  fail("built HTML pages missing Cloudflare Web Analytics beacon", missing.slice(0, 20).join(", "));
}

const home = readFileSync(resolve(dist, "index.html"), "utf8");
const zh = readFileSync(resolve(dist, "zh/index.html"), "utf8");
if (!hasCfWebAnalytics(home) || !hasCfWebAnalytics(zh)) fail("home and /zh/ must both ship the beacon");

const videoDirs = readdirSync(resolve(dist, "v")).filter((name) =>
  existsSync(resolve(dist, "v", name, "index.html")),
);
if (!videoDirs.length) fail("dist/v must contain share pages");
for (const id of videoDirs.slice(0, 5)) {
  const html = readFileSync(resolve(dist, "v", id, "index.html"), "utf8");
  if (!hasCfWebAnalytics(html)) fail(`share page missing beacon: /v/${id}/`);
}

console.log(
  `ok: cf web analytics beacon on ${pages.length} built HTML pages (token ${CF_WEB_ANALYTICS_TOKEN.slice(0, 8)}…)`,
);
