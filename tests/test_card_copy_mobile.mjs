#!/usr/bin/env node
/**
 * Why this test matters: ≤420px used to set `.card-copy { display: none }`,
 * so 375/390 phones only showed Share to X. The weekly card and this week's
 * Short could not be pasted into LINE or Discord. Measure before any
 * scrollIntoView — a hidden button that is scrolled into view is still hidden.
 * Title text must not cover either button, and the page must not grow wider
 * than the viewport (Safari shrink-to-fit).
 * Do not inject the probe into #jobList: renderJobs replaces that HTML after
 * site.json loads, and a fast insert loses the race on CI.
 */
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const css = readFileSync(resolve(root, "src/style.css"), "utf8");

const VIEWPORTS = [
  { width: 375, height: 812, label: "375" },
  { width: 390, height: 844, label: "390" },
  { width: 1280, height: 800, label: "1280" },
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

const PROBE = `
<article class="job-card" id="probe-job" data-card data-card-id="probe-job">
  <div class="card-actions">
    <a class="card-share" href="https://x.com/intent/post" aria-label="Share to X">S</a>
    <button type="button" class="card-copy" data-copy="https://sessionscan.net/#jobs&amp;v=probe-job" aria-label="Copy link">C</button>
  </div>
  <div class="rank">1</div>
  <h3><a href="https://www.gtabase.com/articles/probe">GTA Online Weekly Update probe title that must stay clear of the share and copy buttons</a></h3>
</article>
<article class="video-card" id="probe-video">
  <div class="video-info">
    <div class="video-info-top">
      <h3><a href="https://sessionscan.net/v/abcdefghijk/">This week's Short probe title</a></h3>
      <div class="card-actions">
        <a class="card-share" href="https://x.com/intent/post" aria-label="Share to X">S</a>
        <button type="button" class="card-copy" data-copy="https://sessionscan.net/v/abcdefghijk/" aria-label="Copy link">C</button>
      </div>
    </div>
  </div>
</article>`;

function fail(msg, extra) {
  console.error(msg, extra ?? "");
  process.exit(1);
}

if (/@media\s*\(\s*max-width:\s*420px\s*\)[\s\S]*?\.card-copy\s*\{[^}]*display\s*:\s*none/.test(css)) {
  fail("≤420px must not hide .card-copy");
}

function ensureDist() {
  if (existsSync(join(dist, "index.html")) && existsSync(join(dist, "assets"))) return;
  const built = spawnSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });
  if (built.status !== 0) fail("npm run build failed for card-copy mobile test");
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

function boxesIntersect(a, b, slack = 1) {
  return a.left < b.right - slack && a.right > b.left + slack && a.top < b.bottom - slack && a.bottom > b.top + slack;
}

ensureDist();

const { server, port } = await startStaticServer();
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
});

try {
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    const dataReady = page.waitForResponse(
      (res) => res.url().includes("/data/site.json") || res.url().includes("/data/sample.json"),
    );
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "domcontentloaded" });
    await dataReady;
    // renderJobs rewrites #jobList. Wait until that pass finishes, then park
    // the probe on #main so a later rewrite cannot delete it.
    await page.waitForFunction(() => {
      const list = document.querySelector("#jobList");
      return Boolean(list && list.querySelector(".job-card, .empty-msg"));
    });
    await page.evaluate((html) => {
      const main = document.querySelector("#main");
      if (!main) throw new Error("missing #main");
      main.insertAdjacentHTML("beforeend", html);
    }, PROBE);

    const report = await page.evaluate(() => {
      const painted = (el) => {
        if (!el) return false;
        const style = getComputedStyle(el);
        const box = el.getBoundingClientRect();
        return box.width > 8 && box.height > 8 && style.display !== "none" && style.visibility !== "hidden";
      };
      const boxOf = (el) => {
        const box = el.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
      };
      const cards = ["#probe-job", "#probe-video"].map((sel) => {
        const card = document.querySelector(sel);
        const copy = card?.querySelector(".card-copy");
        const share = card?.querySelector(".card-share");
        const title = card?.querySelector("h3");
        return {
          sel,
          copy: copy && painted(copy) ? boxOf(copy) : null,
          share: share && painted(share) ? boxOf(share) : null,
          title: title ? boxOf(title) : null,
          label: copy?.getAttribute("aria-label") || "",
          link: copy?.getAttribute("data-copy") || "",
        };
      });
      const doc = document.documentElement;
      return {
        cards,
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
      };
    });

    if (report.scrollWidth > report.clientWidth + 1) {
      fail(`${vp.label} page is wider than the viewport`, report);
    }
    for (const card of report.cards) {
      if (!card.copy) fail(`${vp.label} ${card.sel} copy button is not painted`, card);
      if (!card.share) fail(`${vp.label} ${card.sel} share button is not painted`, card);
      if (boxesIntersect(card.copy, card.title)) fail(`${vp.label} ${card.sel} copy covers the title`, card);
      if (boxesIntersect(card.share, card.title)) fail(`${vp.label} ${card.sel} share covers the title`, card);
      if (boxesIntersect(card.copy, card.share)) fail(`${vp.label} ${card.sel} copy covers share`, card);
    }

    await page.evaluate(() => {
      window.__copied = "";
      const clip = navigator.clipboard || {};
      clip.writeText = async (text) => {
        window.__copied = String(text);
      };
      navigator.clipboard = clip;
    });
    await page.click("#probe-job .card-copy");
    await page.waitForFunction(
      () => document.querySelector("#probe-job .card-copy")?.getAttribute("aria-label") === "Copied",
    );
    const copied = await page.evaluate(() => window.__copied);
    const label = await page.locator("#probe-job .card-copy").getAttribute("aria-label");
    if (copied !== "https://sessionscan.net/#jobs&v=probe-job") fail(`${vp.label} copy wrote the wrong link`, copied);
    if (label !== "Copied") fail(`${vp.label} copy did not confirm`, label);
    await page.close();
  }

  const videoId = readdirSync(join(dist, "v")).find((name) => existsSync(join(dist, "v", name, "index.html")));
  if (!videoId) fail("dist has no video share page to check copy on");
  for (const path of [`/v/${videoId}/`, `/zh/v/${videoId}/`]) {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    await page.goto(`http://127.0.0.1:${port}${path}`, { waitUntil: "domcontentloaded" });
    const report = await page.evaluate(() => {
      const card = document.querySelector(".video-page-card");
      const copy = card?.querySelector(".card-copy");
      const share = card?.querySelector(".card-share");
      const title = card?.querySelector("h1");
      const painted = (el) => {
        if (!el) return false;
        const style = getComputedStyle(el);
        const box = el.getBoundingClientRect();
        return box.width > 8 && box.height > 8 && style.display !== "none" && style.visibility !== "hidden";
      };
      const boxOf = (el) => {
        const box = el.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
      };
      const doc = document.documentElement;
      return {
        copy: copy && painted(copy) ? boxOf(copy) : null,
        share: share && painted(share) ? boxOf(share) : null,
        title: title ? boxOf(title) : null,
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        label: copy?.getAttribute("aria-label") || "",
      };
    });
    if (report.scrollWidth > report.clientWidth + 1) fail(`${path} is wider than 375`, report);
    if (!report.copy || !report.share) fail(`${path} copy or share is not painted`, report);
    if (boxesIntersect(report.copy, report.title) || boxesIntersect(report.share, report.title)) {
      fail(`${path} action covers the title`, report);
    }
    if (boxesIntersect(report.copy, report.share)) fail(`${path} copy covers share`, report);
    await page.close();
  }
  console.log("card copy stays visible at 375, 390, and 1280");
} finally {
  await browser.close();
  server.close();
}
