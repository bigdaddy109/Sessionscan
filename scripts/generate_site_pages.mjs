#!/usr/bin/env node
/**
 * Post-vite: write static shell pages (EN + /zh/) for multi-page nav.
 * Home stays Vite index.html; this covers /week/, /week/YYYY-MM-DD/, /guides/*, /gta6/, /about/.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DRAFT_SITE_PAGES,
  assetPrefix,
  localePath,
  publishedSitePages,
  renderSitePage,
} from "../src/sitePages.js";
import {
  latestArchiveWeek,
  listArchiveWeeks,
  renderArchiveAtomFeed,
  renderArchiveIndexPage,
  renderWeekFreezePage,
} from "../src/weekArchive.js";

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

function cssHrefFor(pathname, indexHtml) {
  const m = String(indexHtml || "").match(/href="((?:\.\.\/|\.\/)?assets\/[^"]+\.css)"/);
  const asset = m ? m[1].replace(/^\.\//, "").replace(/^\.\.\//, "assets/") : "assets/index.css";
  const file = asset.startsWith("assets/") ? asset : `assets/${asset}`;
  return `${assetPrefix(pathname)}${file}`;
}

function faviconHrefFor(pathname) {
  return `${assetPrefix(pathname)}favicon.svg`;
}

if (!existsSync(resolve(dist, "index.html"))) {
  console.warn("generate_site_pages: dist/index.html missing");
  process.exit(0);
}

const indexHtml = readDistIndex();
const hub =
  loadJson("public/data/site.json") ||
  loadJson("dist/data/site.json") ||
  loadJson("public/data/sample.json") ||
  {};
const weeks = listArchiveWeeks(hub);
const tipWeek = latestArchiveWeek(hub)?.week || "";
let written = 0;

for (const page of publishedSitePages()) {
  for (const lang of ["en", "zh"]) {
    const path = localePath(lang, page.path);
    const dir = resolve(dist, path.replace(/^\//, ""));
    mkdirSync(dir, { recursive: true });
    const opts = {
      lang,
      cssHref: cssHrefFor(path, indexHtml),
      faviconHref: faviconHrefFor(path),
      tipWeek,
    };
    let html = "";
    if (page.id === "week") {
      html = renderArchiveIndexPage(hub, opts);
    } else {
      html = renderSitePage(page, opts);
    }
    if (!html) continue;
    writeFileSync(resolve(dir, "index.html"), html);
    written += 1;
  }
}

for (const week of weeks) {
  for (const lang of ["en", "zh"]) {
    const path = localePath(lang, week.path);
    const dir = resolve(dist, path.replace(/^\//, ""));
    mkdirSync(dir, { recursive: true });
    const html = renderWeekFreezePage(hub, week.week, {
      lang,
      cssHref: cssHrefFor(path, indexHtml),
      faviconHref: faviconHrefFor(path),
    });
    if (!html) continue;
    writeFileSync(resolve(dir, "index.html"), html);
    written += 1;
  }
}

const feedDir = resolve(dist, "week");
mkdirSync(feedDir, { recursive: true });
writeFileSync(resolve(feedDir, "feed.xml"), renderArchiveAtomFeed(hub));

// Draft shells (Acid Lab guide) stay off disk so they are not crawled or linked.
for (const page of DRAFT_SITE_PAGES) {
  if (page.draft !== true && page.published !== false) {
    console.error("DRAFT_SITE_PAGES entry must stay unpublished", page.id || page.path);
    process.exit(1);
  }
  for (const lang of ["en", "zh"]) {
    const path = localePath(lang, page.path);
    const file = resolve(dist, path.replace(/^\//, ""), "index.html");
    if (existsSync(file)) {
      console.error("draft page must not be written", file);
      process.exit(1);
    }
  }
}

console.log(
  `generate_site_pages: ${written} pages -> dist/{,zh/}{week,week/YYYY-MM-DD,guides,gta6,about}/ (${weeks.length} freeze weeks); week/feed.xml`,
);
