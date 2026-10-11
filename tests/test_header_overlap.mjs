#!/usr/bin/env node
/**
 * Why this test matters: Jeff's iPhone 17 Pro Max Safari landscape recording
 * (about 874–956×400) showed the YouTube subscribe control painted on top of
 * @sessionscan. CSS media queries cannot prove painted boxes miss each other;
 * we measure getBoundingClientRect() on the built / , /zh/ , and /v/* headers.
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
const WIDTHS = [375, 430, 768, 874, 932, 956, 1024, 1280];
const HEIGHTS_BY_WIDTH = {
  default: 800,
  landscape: 430,
  shortLandscape: 400,
};
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

function heightsFor(width) {
  const out = [HEIGHTS_BY_WIDTH.default, HEIGHTS_BY_WIDTH.landscape];
  if (width >= 768) out.push(HEIGHTS_BY_WIDTH.shortLandscape);
  return [...new Set(out)];
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

function reportOverlaps(pageLabel, width, height, measured) {
  if (measured.error) return [`${pageLabel} ${width}x${height}: ${measured.error}`];
  const errors = [];
  if (measured.fullPainted && measured.shortPainted) {
    errors.push(`${pageLabel} ${width}x${height}: Subscribe label and @sessionscan handle both painted`);
  }
  const kids = measured.kids;
  for (let i = 0; i < kids.length; i += 1) {
    for (let j = i + 1; j < kids.length; j += 1) {
      if (boxesIntersect(kids[i], kids[j])) {
        errors.push(
          `${pageLabel} ${width}x${height}: overlap ${JSON.stringify(kids[i])} vs ${JSON.stringify(kids[j])}`,
        );
      }
    }
    const kid = kids[i];
    const slack = 1;
    if (kid.left < measured.inner.left - slack || kid.right > measured.inner.right + slack) {
      errors.push(`${pageLabel} ${width}x${height}: ${kid.name} overflows header-inner`);
    }
  }
  return errors;
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
    for (const width of WIDTHS) {
      for (const height of heightsFor(width)) {
        for (const pageInfo of pages) {
          const context = await browser.newContext({
            viewport: { width, height },
            deviceScaleFactor: 1,
          });
          const page = await context.newPage();
          const url = `${origin}${pageInfo.path}`;
          const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
          if (!response || !response.ok()) {
            errors.push(`${pageInfo.label} ${width}x${height}: HTTP ${response ? response.status() : "no response"}`);
            await context.close();
            continue;
          }
          await page.waitForSelector(".header-inner", { timeout: 10000 });
          await page.evaluate(() => (document.fonts ? document.fonts.ready : null)).catch(() => {});
          const measured = await measureHeader(page);
          errors.push(...reportOverlaps(pageInfo.label, width, height, measured));
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  if (errors.length) fail("header overlap", `\n${errors.join("\n")}`);
  console.log("test_header_overlap.mjs ok", WIDTHS.length, "widths", pages.length, "pages");
}

main().catch((err) => fail(err.stack || String(err)));
