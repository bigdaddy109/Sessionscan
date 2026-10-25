#!/usr/bin/env node
/**
 * Why this test matters: a 16:9 iframe with the browser's default 300px width
 * sits beside the Newswire link. On a 375px phone that pair is wider than the
 * viewport, and Safari shrink-to-fit then shrinks the whole page. CSS media
 * queries cannot prove scrollWidth or that the trailer actually stacked.
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
const CASES = [
  { width: 375, height: 812, stacked: true },
  { width: 390, height: 844, stacked: true },
  { width: 430, height: 932, stacked: true },
  { width: 768, height: 1024, stacked: false },
  { width: 1280, height: 800, stacked: false },
];
const PAGES = ["/guides/businesses/", "/zh/guides/businesses/"];
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".xml": "application/xml",
  ".json": "application/json",
};

function fail(msg, extra) {
  console.error(msg, extra ?? "");
  process.exit(1);
}

function ensureDist() {
  if (existsSync(join(dist, "guides/businesses/index.html"))) return;
  const built = spawnSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });
  if (built.status !== 0) fail("npm run build failed for business trailer layout");
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
    if (!extname(abs)) tryPaths.push(join(abs, "index.html"));
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
    const file = await fileFor(req.url || "/");
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

ensureDist();

const { server, port } = await startStaticServer();
const origin = `http://127.0.0.1:${port}`;
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
});

try {
  for (const path of PAGES) {
    for (const spec of CASES) {
      const context = await browser.newContext({
        viewport: { width: spec.width, height: spec.height },
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();
      const response = await page.goto(`${origin}${path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
      if (!response || response.status() !== 200) fail(`${path} ${spec.width} status`, response?.status());
      const measured = await page.evaluate(() => {
        const doc = document.documentElement;
        const items = [...document.querySelectorAll(".biz-rank-item")].map((item) => {
          const source = item.querySelector(".biz-rank-source");
          const frame = item.querySelector(".biz-trailer iframe");
          const sourceBox = source?.getBoundingClientRect();
          const frameBox = frame?.getBoundingClientRect();
          return {
            id: item.getAttribute("data-biz-id"),
            newswire: source?.querySelector("a.biz-source-link")?.getAttribute("href") || "",
            src: frame?.getAttribute("src") || "",
            title: frame?.getAttribute("title") || "",
            loading: frame?.getAttribute("loading") || "",
            source: sourceBox
              ? { left: sourceBox.left, right: sourceBox.right, top: sourceBox.top, bottom: sourceBox.bottom, width: sourceBox.width }
              : null,
            frame: frameBox
              ? { left: frameBox.left, right: frameBox.right, top: frameBox.top, bottom: frameBox.bottom, width: frameBox.width, height: frameBox.height }
              : null,
          };
        });
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          items,
        };
      });
      if (measured.scrollWidth > measured.clientWidth + 1) {
        fail(`${path} ${spec.width} overflow`, measured);
      }
      if (spec.width === 375) {
        await page.locator('[data-biz-filter="solo"]').click();
        const solo = await page.evaluate(() => {
          const doc = document.documentElement;
          const visible = [...document.querySelectorAll(".biz-rank-item")].filter((el) => !el.hidden);
          return {
            scrollWidth: doc.scrollWidth,
            clientWidth: doc.clientWidth,
            ids: visible.map((el) => el.getAttribute("data-biz-id")),
            trailers: visible.filter((el) => el.querySelector(".biz-trailer iframe")).length,
          };
        });
        if (solo.scrollWidth > solo.clientWidth + 1) fail(`${path} solo filter overflow`, solo);
        if (!solo.ids.includes("acid-lab") || solo.ids.includes("nightclub")) {
          fail(`${path} solo filter ids`, solo.ids);
        }
        if (solo.trailers !== solo.ids.length) fail(`${path} solo rows lost trailers`, solo);
        await page.locator('[data-biz-filter="all"]').click();
      }
      if (measured.items.length !== 8) fail(`${path} business count`, measured.items.length);
      for (const item of measured.items) {
        if (!item.newswire.startsWith("https://www.rockstargames.com/")) {
          fail(`${path} ${item.id} lost Newswire link`, item.newswire);
        }
        if (!item.src.startsWith("https://www.youtube-nocookie.com/embed/")) {
          fail(`${path} ${item.id} embed src`, item.src);
        }
        if (item.loading !== "lazy" || !item.title) fail(`${path} ${item.id} iframe attrs`, item);
        if (!item.frame || item.frame.width < 120 || item.frame.height < 60) {
          fail(`${path} ${item.id} trailer box`, item.frame);
        }
        const ratio = item.frame.width / item.frame.height;
        if (Math.abs(ratio - 16 / 9) > 0.08) fail(`${path} ${spec.width} ${item.id} not 16:9`, ratio);
        if (item.frame.right > spec.width + 1) fail(`${path} ${item.id} trailer past viewport`, item.frame);
        if (spec.stacked) {
          if (item.frame.top + 1 < item.source.bottom) {
            fail(`${path} ${spec.width} ${item.id} trailer should stack under the link`, item);
          }
        } else if (item.frame.left + 1 < item.source.right) {
          fail(`${path} ${spec.width} ${item.id} trailer should sit beside the link`, item);
        }
      }
      await context.close();
    }
  }

  // Why: the Acid Lab guide is a real page now. A 9:16 Short with the iframe's
  // default 300px width used to blow past 375 and make Safari shrink the page.
  for (const spec of [
    { path: "/guides/acid-lab/", width: 375, height: 812 },
    { path: "/guides/acid-lab/", width: 1280, height: 800 },
    { path: "/zh/guides/acid-lab/", width: 375, height: 812 },
  ]) {
    const context = await browser.newContext({ viewport: { width: spec.width, height: spec.height } });
    const page = await context.newPage();
    const response = await page.goto(`${origin}${spec.path}`, { waitUntil: "domcontentloaded", timeout: 15000 });
    if (!response || response.status() !== 200) fail(`${spec.path} must be published`, response?.status());
    const box = await page.evaluate(() => {
      const doc = document.documentElement;
      const frame = document.querySelector(".acid-short iframe");
      const soon = document.querySelector(".acid-long-soon");
      const rect = frame ? frame.getBoundingClientRect() : null;
      return {
        overflow: doc.scrollWidth > doc.clientWidth + 1,
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        src: frame?.getAttribute("src") || "",
        loading: frame?.getAttribute("loading") || "",
        width: rect?.width || 0,
        height: rect?.height || 0,
        hasSoon: Boolean(soon),
        longIframe: Boolean(document.querySelector(".acid-long iframe")),
      };
    });
    if (box.overflow) fail(`${spec.path} ${spec.width} horizontal overflow`, box);
    if (box.src !== "https://www.youtube.com/embed/LL3J2wKC_Ik" || box.loading !== "lazy") {
      fail(`${spec.path} short embed`, box);
    }
    if (!box.hasSoon || box.longIframe) fail(`${spec.path} long video placeholder`, box);
    const ratio = box.width / box.height;
    if (box.width < 120 || Math.abs(ratio - 9 / 16) > 0.08) fail(`${spec.path} ${spec.width} short not 9:16`, box);
    if (box.width > spec.width) fail(`${spec.path} short wider than viewport`, box);
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise((resolvePromise) => server.close(resolvePromise));
}

console.log("test_business_trailers_layout.mjs ok");
