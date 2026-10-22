#!/usr/bin/env node
/**
 * Why this test matters: Phase B removed channel hash-tabs; primary chrome is
 * `.site-nav` path links. Phone/iPad must show every nav label without a
 * hidden horizontal scroll — on 375–430, GTA 6 and About (zh: 關於) used to
 * sit past a thin scrollbar. Do not scrollIntoView before measuring, or that
 * bug passes again. Scrolling to #main must keep the jobs heading below the
 * sticky header (a wrapped nav makes the header taller).
 */
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");

const PHONE_PORTRAIT = [
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
];
const IPAD_PORTRAIT = [
  { width: 768, height: 1024 },
  { width: 820, height: 1180 },
  { width: 1024, height: 1366 },
];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".xml": "application/xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function fail(msg, extra) {
  console.error(msg, extra ?? "");
  process.exit(1);
}

function ensureDist() {
  if (existsSync(join(dist, "index.html")) && existsSync(join(dist, "zh", "index.html"))) return;
  const built = spawnSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });
  if (built.status !== 0) fail("npm run build failed for site-nav mobile test");
}

function safeJoin(base, urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  const rel = clean.replace(/^\/+/, "") || "index.html";
  const abs = normalize(join(base, rel));
  if (!abs.startsWith(base)) return null;
  return abs;
}

async function fileFor(urlPath) {
  const abs = safeJoin(dist, urlPath);
  if (!abs) return null;
  const tryPaths = [];
  try {
    const st = await stat(abs);
    if (st.isDirectory()) tryPaths.push(join(abs, "index.html"));
    else tryPaths.push(abs);
  } catch {
    if (!extname(abs)) tryPaths.push(`${abs}.html`, join(abs, "index.html"));
  }
  for (const candidate of tryPaths) {
    try {
      const st = await stat(candidate);
      if (st.isFile()) return candidate;
    } catch {
      /* next */
    }
  }
  return null;
}

function startStaticServer() {
  const server = createServer(async (req, res) => {
    const urlPath = req.url || "/";
    const file = await fileFor(urlPath);
    if (!file) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
    res.end(body);
  });
  return new Promise((resolvePromise) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolvePromise({ server, base: `http://127.0.0.1:${port}` });
    });
  });
}

async function measureNav(page) {
  return page.evaluate(() => {
    const nav = document.querySelector(".site-nav");
    if (!nav) return { error: "missing .site-nav" };
    const links = [...nav.querySelectorAll(".site-nav-link")];
    const navBox = nav.getBoundingClientRect();
    const doc = document.documentElement;
    const issues = [];
    // Measure the first paint. scrollIntoView would pull off-screen labels
    // into a scrollbar and hide the 375–430 GTA 6 / About clip.
    if (nav.scrollWidth > nav.clientWidth + 1) {
      issues.push(`.site-nav scrolls ${nav.scrollWidth}>${nav.clientWidth}; labels must wrap into view`);
    }
    for (const link of links) {
      const after = link.getBoundingClientRect();
      const text = (link.textContent || "").trim();
      if (!text || text.endsWith("…") || text.endsWith("...")) {
        issues.push(`${text || "(empty)"}: truncated label`);
      }
      const fully =
        after.left >= navBox.left - 1 &&
        after.right <= navBox.right + 1 &&
        after.top >= navBox.top - 1 &&
        after.bottom <= navBox.bottom + 1 &&
        after.width > 1;
      if (!fully) issues.push(`${text}: not fully visible without scrolling .site-nav`);
    }
    if (navBox.left < -1 || navBox.right > doc.clientWidth + 1) {
      issues.push(`.site-nav box ${Math.round(navBox.left)}–${Math.round(navBox.right)} exceeds ${doc.clientWidth}`);
    }
    if (document.querySelector(".tabs")) issues.push("channel .tabs must be removed from Phase B home");
    if (document.querySelector("#ctaGrid")) issues.push("cta-grid must be removed from Phase B home");
    return {
      count: links.length,
      ids: links.map((el) => el.dataset.nav).filter(Boolean),
      issues,
    };
  });
}

async function checkJobsScroll(page) {
  await page.evaluate(() => {
    const main = document.querySelector("#main");
    if (main) main.scrollIntoView({ block: "start" });
  });
  await page.waitForTimeout(80);
  return page.evaluate(() => {
    const header = document.querySelector(".site-header");
    const head = document.querySelector("#view-jobs .view-head");
    if (!header || !head) return { error: "missing header or jobs head" };
    const hBottom = header.getBoundingClientRect().bottom;
    const top = head.getBoundingClientRect().top;
    return { covered: top < hBottom - 2, top, hBottom };
  });
}

async function runViewport(browser, base, path, size, landscape) {
  const width = landscape ? size.height : size.width;
  const height = landscape ? size.width : size.height;
  const page = await browser.newPage({ viewport: { width, height } });
  const issues = [];
  try {
    await page.goto(`${base}${path}`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForSelector(".site-nav .site-nav-link", { timeout: 10000 });
    const nav = await measureNav(page);
    if (nav.error) issues.push(nav.error);
    else {
      if (nav.count < 6) issues.push(`expected ≥6 nav links, got ${nav.count}`);
      for (const id of ["home", "week", "money", "businesses", "gta6", "about"]) {
        if (!nav.ids.includes(id)) issues.push(`missing nav id ${id}`);
      }
      issues.push(...(nav.issues || []));
    }
    const scroll = await checkJobsScroll(page);
    if (scroll.error) issues.push(scroll.error);
    else if (scroll.covered) {
      issues.push(`jobs heading covered by sticky header (top=${scroll.top} header=${scroll.hBottom})`);
    }
  } finally {
    await page.close();
  }
  return issues.map((msg) => `${path} ${width}x${height}: ${msg}`);
}

async function main() {
  ensureDist();
  const { server, base } = await startStaticServer();
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const errors = [];
  try {
    const pages = ["/", "/zh/"];
    const sizes = [...PHONE_PORTRAIT, ...IPAD_PORTRAIT];
    for (const path of pages) {
      for (const size of sizes) {
        errors.push(...(await runViewport(browser, base, path, size, false)));
        errors.push(...(await runViewport(browser, base, path, size, true)));
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
  if (errors.length) fail(errors.join("\n"));
  console.log("test_mobile_tabs.mjs ok", PHONE_PORTRAIT.length + IPAD_PORTRAIT.length, "viewports", 2, "pages");
}

main().catch((err) => fail(err?.stack || String(err)));
