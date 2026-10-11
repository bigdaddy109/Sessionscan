#!/usr/bin/env node
/**
 * Post-vite: stamp real outbound titles into dist/index.html from site.json.
 * Reads public/data/site.json or dist/data/site.json (Pages overlay). Does not invent titles.
 * CH-01 #jobList uses the same default filter as the client (GTABase · this week).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { injectJobListHtml, renderStaticHomeJobList, selectHomeJobs } from "../src/staticHomeJobs.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function loadSite() {
  for (const rel of ["public/data/site.json", "dist/data/site.json"]) {
    const path = resolve(root, rel);
    if (!existsSync(path)) continue;
    try {
      const data = JSON.parse(readFileSync(path, "utf8"));
      if (data && typeof data === "object") return data;
    } catch {
      /* try next */
    }
  }
  return null;
}

function firstJob(data) {
  for (const key of ["jobs_gtabase", "jobs_ign", "jobs_wiki"]) {
    for (const item of data[key] || []) {
      if (item?.title && item?.url) return item;
    }
  }
  return null;
}

function ownedShort(data) {
  const short = data?.sessionscan_slot?.short;
  if (!short?.title) return null;
  const url = short.url || (short.video_id ? `https://www.youtube.com/shorts/${short.video_id}` : "");
  if (!url.startsWith("https://www.youtube.com/")) return null;
  return { title: short.title, url };
}

function crawlList(job, short) {
  const items = [];
  if (job) items.push(`<li><a href="${esc(job.url)}">${esc(job.title)}</a></li>`);
  if (short) items.push(`<li><a href="${esc(short.url)}">${esc(short.title)}</a></li>`);
  if (!items.length) return "";
  return `<ul>${items.join("")}</ul>`;
}

const htmlPath = resolve(root, "dist/index.html");
if (!existsSync(htmlPath)) {
  console.warn("inject_static_jobs: dist/index.html missing");
  process.exit(0);
}

const data = loadSite();
const job = data ? firstJob(data) : null;
const weekJobs = data ? selectHomeJobs(data) : [];
const short = data ? ownedShort(data) : null;
let html = readFileSync(htmlPath, "utf8");

const crawl = crawlList(job, short);
html = html.replace(
  /<noscript id="crawlJobs">[\s\S]*?<\/noscript>/,
  `<noscript id="crawlJobs">${crawl}</noscript>`,
);

if (job) {
  html = html.replace(
    /<p id="officialBannerBody"[^>]*>[\s\S]*?<\/p>/,
    `<p id="officialBannerBody"><a href="${esc(job.url)}" target="_blank" rel="noopener noreferrer">${esc(job.title)}</a></p>`,
  );
}

const cards = data ? renderStaticHomeJobList(data, { lang: "en" }) : "";
html = injectJobListHtml(html, cards);

writeFileSync(htmlPath, html);
if (job) {
  console.log(`inject_static_jobs: ${job.title} -> ${job.url}`);
} else {
  console.log("inject_static_jobs: no site.json jobs; left empty pending snapshot");
}
if (weekJobs.length) {
  console.log(`inject_static_jobs: ${weekJobs.length} static home job card(s)`);
} else {
  console.log("inject_static_jobs: no this-week GTABase cards for #jobList");
}
