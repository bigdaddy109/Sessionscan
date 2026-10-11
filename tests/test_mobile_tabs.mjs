#!/usr/bin/env node
/**
 * Why this test matters: Jeff's iPhone recording showed pink channel jump-nav
 * labels truncating with ellipsis ("This week's mone…") and taps scrolling
 * #main under the multi-row sticky header so the section heading + tag row
 * disappeared. CSS source cannot prove painted label boxes or post-tap
 * scroll offsets; we measure them on phone + iPad viewports.
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

/** Portrait sizes; landscape swaps width/height. */
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
  if (built.status !== 0) fail("npm run build failed for mobile tabs test");
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

function viewports() {
  const out = [];
  for (const { width, height } of [...PHONE_PORTRAIT, ...IPAD_PORTRAIT]) {
    out.push({ width, height, orient: "portrait" });
    out.push({ width: height, height: width, orient: "landscape" });
  }
  return out;
}

async function ready(page) {
  await page.waitForSelector(".tabs .tab", { timeout: 10000 });
  await page.evaluate(() => (document.fonts ? document.fonts.ready : null)).catch(() => {});
  await page.waitForFunction(() => {
    const tabs = [...document.querySelectorAll(".tabs .tab")];
    return tabs.length >= 5 && tabs.every((t) => t.querySelector(".tab-name")?.textContent?.trim());
  }, { timeout: 10000 });
}

async function assertTagsReachable(page, label, errors) {
  const report = await page.evaluate(() => {
    const tabsNav = document.querySelector(".tabs");
    if (!tabsNav) return { error: "missing .tabs" };
    const tabs = [...tabsNav.querySelectorAll(".tab")];
    const issues = [];
    if (tabs.length < 5) issues.push(`expected >=5 tabs, got ${tabs.length}`);

    const navBox = tabsNav.getBoundingClientRect();
    for (const tab of tabs) {
      const name = tab.querySelector(".tab-name");
      const ch = tab.querySelector(".ch");
      const text = (name?.textContent || "").trim();
      const style = name ? getComputedStyle(name) : null;
      if (!name) {
        issues.push(`${ch?.textContent || "?"} missing .tab-name`);
        continue;
      }
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) {
        issues.push(`${text || ch?.textContent}: .tab-name not painted`);
      }
      if (text.length < 2) issues.push(`${ch?.textContent}: empty label`);
      // Full label must not be CSS-truncated inside the button.
      if (tab.scrollWidth > tab.clientWidth + 1) {
        issues.push(`${text}: tab scrollWidth ${tab.scrollWidth} > clientWidth ${tab.clientWidth}`);
      }
      if (name.scrollWidth > name.clientWidth + 1) {
        issues.push(`${text}: name scrollWidth ${name.scrollWidth} > clientWidth ${name.clientWidth}`);
      }

      // Bring the tab into the strip's visible range (horizontal scroll), then
      // require it intersects the nav viewport — "reachable".
      const tBox = tabsNav.getBoundingClientRect();
      const aBox = tab.getBoundingClientRect();
      if (aBox.left < tBox.left + 2) tabsNav.scrollLeft += aBox.left - tBox.left - 8;
      else if (aBox.right > tBox.right - 2) tabsNav.scrollLeft += aBox.right - tBox.right + 8;
      const after = tab.getBoundingClientRect();
      const nav = tabsNav.getBoundingClientRect();
      const visible = after.left < nav.right - 2 && after.right > nav.left + 2 && after.width > 1;
      if (!visible) issues.push(`${text}: not reachable inside .tabs`);
    }

    // Document must not grow horizontally because of the tab strip.
    const doc = document.documentElement;
    if (doc.scrollWidth > doc.clientWidth + 1) {
      issues.push(`document.scrollWidth ${doc.scrollWidth} > clientWidth ${doc.clientWidth}`);
    }
    if (navBox.left < -1 || navBox.right > doc.clientWidth + 1) {
      issues.push(`.tabs box ${Math.round(navBox.left)}–${Math.round(navBox.right)} exceeds ${doc.clientWidth}`);
    }
    return { issues, labels: tabs.map((t) => (t.querySelector(".tab-name")?.textContent || "").trim()) };
  });

  if (report.error) {
    errors.push(`${label}: ${report.error}`);
    return;
  }
  for (const issue of report.issues) errors.push(`${label}: ${issue}`);
}

async function assertAfterTabTap(page, tabName, label, errors) {
  // Instant scroll so assertions do not race smooth behavior.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator(`.tabs .tab[data-tab="${tabName}"]`).click();
  await page.waitForTimeout(80);
  await page.waitForFunction(
    (name) => {
      const tab = document.querySelector(`.tabs .tab[data-tab="${name}"]`);
      const view = document.querySelector(`#view-${name}`);
      return Boolean(tab?.classList.contains("active") && view && !view.classList.contains("hidden"));
    },
    tabName,
    { timeout: 5000 },
  );
  // Allow layout + scroll-margin application to settle.
  await page.waitForFunction(
    (name) => {
      const header = document.querySelector(".site-header");
      const tabs = document.querySelector(".tabs");
      const head = document.querySelector(`#view-${name} .view-head`);
      if (!header || !tabs || !head) return false;
      const hb = header.getBoundingClientRect().bottom;
      const headBox = head.getBoundingClientRect();
      const tabsBox = tabs.getBoundingClientRect();
      const vh = window.innerHeight;
      const headOk = headBox.top >= hb - 2 && headBox.top < vh && headBox.bottom > 0;
      const tabsOk = tabsBox.bottom > 0 && tabsBox.top < vh && tabsBox.height > 1;
      return headOk && tabsOk;
    },
    tabName,
    { timeout: 5000 },
  ).catch(() => {});

  const measured = await page.evaluate((name) => {
    const header = document.querySelector(".site-header");
    const tabs = document.querySelector(".tabs");
    const head = document.querySelector(`#view-${name} .view-head`);
    const controls = document.querySelector(`#view-${name} .controls`);
    if (!header || !tabs || !head) {
      return { error: "missing header/tabs/view-head" };
    }
    const hb = header.getBoundingClientRect().bottom;
    const headBox = head.getBoundingClientRect();
    const tabsBox = tabs.getBoundingClientRect();
    const vh = window.innerHeight;
    const issues = [];
    if (!(tabsBox.bottom > 0 && tabsBox.top < vh)) {
      issues.push(`tag row not in view (top=${tabsBox.top.toFixed(1)} bottom=${tabsBox.bottom.toFixed(1)} vh=${vh})`);
    }
    if (headBox.top < hb - 2) {
      issues.push(`heading under sticky header (head.top=${headBox.top.toFixed(1)} header.bottom=${hb.toFixed(1)})`);
    }
    if (!(headBox.top < vh && headBox.bottom > 0)) {
      issues.push(`heading not in view (top=${headBox.top.toFixed(1)} bottom=${headBox.bottom.toFixed(1)})`);
    }
    if (controls) {
      const cBox = controls.getBoundingClientRect();
      if (cBox.top < hb - 2) {
        issues.push(`filter chips under sticky header (controls.top=${cBox.top.toFixed(1)} header.bottom=${hb.toFixed(1)})`);
      }
    }
    return { issues };
  }, tabName);

  if (measured.error) {
    errors.push(`${label} tap ${tabName}: ${measured.error}`);
    return;
  }
  for (const issue of measured.issues) errors.push(`${label} tap ${tabName}: ${issue}`);
}

async function checkPage(page, pageInfo, vp, errors) {
  const base = `${pageInfo.label} ${vp.width}x${vp.height} ${vp.orient}`;
  await ready(page);
  await assertTagsReachable(page, `${base} tags`, errors);

  // Exercise every channel tab; scroll back to a mid-page start between taps
  // so each jump re-applies sticky offset (matches Jeff's tap-from-content flow).
  const tabNames = await page.$$eval(".tabs .tab", (els) => els.map((el) => el.dataset.tab).filter(Boolean));
  for (const name of tabNames) {
    await page.evaluate(() => {
      const hero = document.querySelector("#hero");
      if (hero) window.scrollTo(0, Math.max(0, hero.getBoundingClientRect().height * 0.35));
      else window.scrollTo(0, 120);
    });
    await page.waitForTimeout(40);
    await assertAfterTabTap(page, name, base, errors);
  }
}

async function main() {
  ensureDist();
  const { server, port } = await startStaticServer();
  const origin = `http://127.0.0.1:${port}`;
  const pages = [
    { label: "en-home", path: "/" },
    { label: "zh-home", path: "/zh/" },
  ];
  const vps = viewports();

  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });

  const errors = [];
  try {
    for (const vp of vps) {
      for (const pageInfo of pages) {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: 1,
        });
        const page = await context.newPage();
        await page.emulateMedia({ reducedMotion: "reduce" });
        const response = await page.goto(`${origin}${pageInfo.path}`, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });
        if (!response || !response.ok()) {
          errors.push(`${pageInfo.label} ${vp.width}x${vp.height}: HTTP ${response ? response.status() : "no response"}`);
          await context.close();
          continue;
        }
        await checkPage(page, pageInfo, vp, errors);
        await context.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  if (errors.length) fail("mobile tabs / scroll offset", `\n${errors.join("\n")}`);
  console.log(
    "test_mobile_tabs.mjs ok",
    vps.length,
    "viewports",
    pages.length,
    "pages",
  );
}

main().catch((err) => fail(err.stack || String(err)));
