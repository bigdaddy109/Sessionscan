#!/usr/bin/env node
/**
 * Why this test matters: Jeff's iPhone Safari recording showed the page
 * suddenly zooming out while scrolling, with the Subscribe control then
 * covering @sessionscan. iOS shrinks the visual viewport when any layout
 * box is wider than the screen — often the post-scroll channel-mini bar
 * or a hero layer sized from an SVG viewBox. CSS media queries cannot
 * prove document.scrollWidth or painted header boxes; we measure them.
 */
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, readdirSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const OVERLAP_WIDTHS = [375, 430, 768, 874, 932, 956, 1024, 1280];
const OVERFLOW_CASES = [
  { width: 375, height: 812 },
  { width: 375, height: 430 },
  { width: 430, height: 932 },
  { width: 430, height: 400 },
  { width: 874, height: 800 },
  { width: 874, height: 400 },
  { width: 932, height: 800 },
  { width: 932, height: 430 },
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
  if (built.status !== 0) fail("npm run build failed for header overlap test");
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
      resolvePromise({ server, port });
    });
  });
}

function boxesIntersect(a, b, slack = 0.5) {
  return a.left < b.right - slack && a.right > b.left + slack && a.top < b.bottom - slack && a.bottom > b.top + slack;
}

async function measureHeader(page) {
  return page.evaluate(() => {
    const inner = document.querySelector(".header-inner");
    if (!inner) return { error: "missing .header-inner" };
    const painted = (el) => {
      if (!el) return false;
      const style = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      return (
        box.width > 1 &&
        box.height > 1 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) !== 0
      );
    };
    const kids = [...inner.children]
      .filter(painted)
      .map((el) => {
        const box = el.getBoundingClientRect();
        return {
          name: el.className || el.tagName,
          left: box.left,
          right: box.right,
          top: box.top,
          bottom: box.bottom,
          width: box.width,
          height: box.height,
        };
      });
    const full = document.querySelector(".header-inner .channel-link-full");
    const short = document.querySelector(".header-inner .channel-link-short");
    const innerBox = inner.getBoundingClientRect();
    return {
      kids,
      inner: { left: innerBox.left, right: innerBox.right, top: innerBox.top, bottom: innerBox.bottom },
      fullPainted: painted(full),
      shortPainted: painted(short),
    };
  });
}

async function measureOverflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const client = doc.clientWidth;
    const slack = 1;
    const box = (el) => {
      if (!el) return null;
      const style = getComputedStyle(el);
      if (style.display === "none" || el.hidden) return null;
      const r = el.getBoundingClientRect();
      return { name: el.className || el.id || el.tagName, left: r.left, right: r.right, width: r.width, scrollWidth: el.scrollWidth };
    };
    const within = (info) => {
      if (!info) return true;
      return info.left >= -slack && info.right <= client + slack;
    };
    const mini = document.querySelector("#channelMini");
    const checked = [
      box(document.querySelector(".site-header")),
      box(document.querySelector(".header-inner")),
      box(document.querySelector(".tabs")),
      box(mini && !mini.hidden ? mini : null),
      box(mini && !mini.hidden ? mini.querySelector(".channel-mini-pills") : null),
      box(document.querySelector(".hero")),
      box(document.querySelector(".hero-palms")),
      box(document.querySelector(".hero-copy")),
    ].filter(Boolean);
    return {
      client,
      scroll: doc.scrollWidth,
      heroScroll: document.querySelector(".hero")?.scrollWidth ?? 0,
      viewport: document.querySelector('meta[name="viewport"]')?.getAttribute("content") || "",
      miniHidden: mini ? mini.hidden : true,
      outside: checked.filter((info) => !within(info)),
    };
  });
}

function reportOverlaps(label, measured) {
  if (measured.error) return [`${label}: ${measured.error}`];
  const errors = [];
  if (measured.fullPainted && measured.shortPainted) {
    errors.push(`${label}: Subscribe label and @sessionscan handle both painted`);
  }
  const kids = measured.kids;
  for (let i = 0; i < kids.length; i += 1) {
    for (let j = i + 1; j < kids.length; j += 1) {
      if (boxesIntersect(kids[i], kids[j])) {
        errors.push(`${label}: overlap ${JSON.stringify(kids[i])} vs ${JSON.stringify(kids[j])}`);
      }
    }
    const kid = kids[i];
    if (kid.left < measured.inner.left - 1 || kid.right > measured.inner.right + 1) {
      errors.push(`${label}: ${kid.name} overflows header-inner`);
    }
  }
  return errors;
}

function reportOverflow(label, measured) {
  const errors = [];
  if (measured.scroll > measured.client + 1) {
    errors.push(`${label}: document.scrollWidth ${measured.scroll} > clientWidth ${measured.client}`);
  }
  if (measured.heroScroll > measured.client + 1) {
    errors.push(`${label}: .hero scrollWidth ${measured.heroScroll} > clientWidth ${measured.client}`);
  }
  if (measured.viewport !== "width=device-width, initial-scale=1, viewport-fit=cover") {
    errors.push(`${label}: viewport meta is ${JSON.stringify(measured.viewport)}`);
  }
  for (const info of measured.outside) {
    errors.push(`${label}: ${info.name} box ${Math.round(info.left)}–${Math.round(info.right)} exceeds ${measured.client}`);
  }
  return errors;
}

async function ready(page) {
  await page.waitForSelector(".header-inner", { timeout: 10000 });
  await page.evaluate(() => (document.fonts ? document.fonts.ready : null)).catch(() => {});
}

async function scrollPositions(page, { expectMini }) {
  const positions = [{ name: "top", y: 0 }];
  const mainY = await page.evaluate(() => {
    const main = document.querySelector("#main");
    return main ? Math.max(0, Math.round(main.getBoundingClientRect().top + window.scrollY - 8)) : 0;
  });
  if (mainY > 40) positions.push({ name: "main", y: mainY });

  const maxY = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
  if (maxY > 80) positions.push({ name: "mid", y: Math.round(maxY / 2) });
  if (maxY > 0) positions.push({ name: "bottom", y: maxY });

  if (expectMini) {
    await page.evaluate(() => document.querySelector('[data-tab="hot"]')?.click());
    await page.evaluate((y) => window.scrollTo(0, y), Math.max(mainY + 120, Math.min(maxY, mainY + 240)));
    await page.waitForTimeout(80);
    const shown = await page
      .waitForFunction(() => {
        const mini = document.querySelector("#channelMini");
        return Boolean(mini && !mini.hidden);
      }, { timeout: 4000 })
      .then(() => true)
      .catch(() => false);
    if (shown) {
      const y = await page.evaluate(() => window.scrollY);
      positions.push({ name: "compact-header", y });
    }
  }
  return positions;
}

async function checkPage(page, pageInfo, width, height, errors, { overflow, scroll }) {
  const base = `${pageInfo.label} ${width}x${height}`;
  await ready(page);
  const header = await measureHeader(page);
  errors.push(...reportOverlaps(`${base} top`, header));
  if (overflow) {
    errors.push(...reportOverflow(`${base} top`, await measureOverflow(page)));
  }
  if (!scroll) return;
  const spots = await scrollPositions(page, { expectMini: pageInfo.label !== "video" });
  for (const spot of spots) {
    await page.evaluate((y) => window.scrollTo(0, y), spot.y);
    await page.waitForTimeout(50);
    const label = `${base} @${spot.name}`;
    errors.push(...reportOverlaps(label, await measureHeader(page)));
    errors.push(...reportOverflow(label, await measureOverflow(page)));
  }
}

async function main() {
  ensureDist();
  const videoRoot = join(dist, "v");
  const videoId = existsSync(videoRoot)
    ? readdirSync(videoRoot).find((id) => existsSync(join(videoRoot, id, "index.html")))
    : null;
  if (!videoId) fail("expected at least one built share page under dist/v/");

  const { server, port } = await startStaticServer();
  const origin = `http://127.0.0.1:${port}`;
  const pages = [
    { label: "en-home", path: "/" },
    { label: "zh-home", path: "/zh/" },
    { label: "video", path: `/v/${videoId}/` },
  ];

  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });

  const errors = [];
  try {
    for (const width of OVERLAP_WIDTHS) {
      const heights = width >= 768 ? [800, 430] : [800];
      if (width >= 874) heights.push(400);
      for (const height of heights) {
        for (const pageInfo of pages) {
          const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
          const page = await context.newPage();
          const response = await page.goto(`${origin}${pageInfo.path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
          if (!response || !response.ok()) {
            errors.push(`${pageInfo.label} ${width}x${height}: HTTP ${response ? response.status() : "no response"}`);
            await context.close();
            continue;
          }
          await checkPage(page, pageInfo, width, height, errors, { overflow: false, scroll: false });
          await context.close();
        }
      }
    }

    for (const { width, height } of OVERFLOW_CASES) {
      for (const pageInfo of pages) {
        const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
        const page = await context.newPage();
        const response = await page.goto(`${origin}${pageInfo.path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
        if (!response || !response.ok()) {
          errors.push(`${pageInfo.label} ${width}x${height}: HTTP ${response ? response.status() : "no response"}`);
          await context.close();
          continue;
        }
        await checkPage(page, pageInfo, width, height, errors, { overflow: true, scroll: true });
        await context.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  if (errors.length) fail("header overflow/overlap", `\n${errors.join("\n")}`);
  console.log("test_header_overlap.mjs ok", OVERLAP_WIDTHS.length, "overlap widths", OVERFLOW_CASES.length, "overflow cases");
}

main().catch((err) => fail(err.stack || String(err)));
