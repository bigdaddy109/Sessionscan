#!/usr/bin/env node
/**
 * Post-vite: write static shell pages (EN + /zh/) for Phase A multi-page nav.
 * Home stays Vite index.html; this covers /week/, /guides/*, /gta6/, /about/.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE_PAGES, assetPrefix, localePath, renderSitePage } from "../src/sitePages.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");

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
let written = 0;

for (const page of SITE_PAGES) {
  for (const lang of ["en", "zh"]) {
    const path = localePath(lang, page.path);
    const dir = resolve(dist, path.replace(/^\//, ""));
    mkdirSync(dir, { recursive: true });
    const html = renderSitePage(page, {
      lang,
      cssHref: cssHrefFor(path, indexHtml),
      faviconHref: faviconHrefFor(path),
    });
    if (!html) continue;
    writeFileSync(resolve(dir, "index.html"), html);
    written += 1;
  }
}

console.log(`generate_site_pages: ${written} pages -> dist/{,zh/}{week,guides,gta6,about}/`);
