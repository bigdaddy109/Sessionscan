#!/usr/bin/env node
/**
 * Headless Chrome: time until #jobList .job-card exists, with site.json delayed.
 * Compares empty #jobList (JS+fetch) vs build-time static cards.
 * Usage: node scripts/measure_first_content.mjs [--dist dist]
 */
import { createServer } from "node:http";
import { readFile, writeFile, stat } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distArg = process.argv.includes("--dist")
  ? process.argv[process.argv.indexOf("--dist") + 1]
  : "dist";
const dist = resolve(root, distArg);
const JSON_DELAY_MS = 2000;
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

function chromePath() {
  for (const p of [
    process.env.CHROME_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ]) {
    if (p && existsSync(p)) return p;
  }
  return "google-chrome";
}

async function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      let rel = decodeURIComponent(url.pathname);
      if (rel.endsWith("/")) rel += "index.html";
      if (rel.startsWith("/")) rel = rel.slice(1);
      const file = normalize(join(dist, rel));
      if (!file.startsWith(dist)) {
        res.writeHead(403);
        res.end();
        return;
      }
      if (rel.endsWith("site.json") || rel.endsWith("sample.json")) {
        await new Promise((r) => setTimeout(r, JSON_DELAY_MS));
      }
      const data = await readFile(file);
      res.writeHead(200, { "Content-Type": MIME[extname(file)] || "application/octet-stream" });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("missing");
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  return { server, port };
}

async function stripJobList(htmlPath) {
  const html = await readFile(htmlPath, "utf8");
  const next = html.replace(
    /<div class="job-list" id="jobList">[\s\S]*?<\/div>(?=\s*<\/section>)/,
    '<div class="job-list" id="jobList"></div>',
  );
  await writeFile(htmlPath, next);
  return html;
}

async function measure(port, path, label) {
  const browser = await chromium.launch({
    executablePath: chromePath(),
    headless: true,
    args: ["--disable-gpu", "--no-sandbox"],
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const t0 = Date.now();
  let firstCardMs = null;
  const wait = page
    .waitForFunction(() => Boolean(document.querySelector("#jobList .job-card")), {
      timeout: 15000,
    })
    .then(() => {
      firstCardMs = Date.now() - t0;
    });
  await page.goto(`http://127.0.0.1:${port}${path}`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await wait;
  const hasStatic = await page.evaluate(() =>
    Boolean(document.querySelector("#jobList [data-static-job]")),
  );
  const title = await page.evaluate(
    () => document.querySelector("#jobList .job-card h3")?.textContent?.trim() || "",
  );
  await browser.close();
  return { label, path, firstCardMs, hasStatic, title: title.slice(0, 80) };
}

async function main() {
  if (!existsSync(resolve(dist, "index.html"))) {
    console.error("dist/index.html missing — run npm run build first");
    process.exit(1);
  }
  const enPath = resolve(dist, "index.html");
  const zhPath = resolve(dist, "zh/index.html");
  const enBackup = await readFile(enPath, "utf8");
  const zhBackup = existsSync(zhPath) ? await readFile(zhPath, "utf8") : null;

  const { server, port } = await startServer();
  const results = [];

  // AFTER (current dist with static cards)
  results.push(await measure(port, "/", "after-en"));
  if (zhBackup) results.push(await measure(port, "/zh/", "after-zh"));

  // BEFORE: empty jobList, same assets, delayed JSON
  await stripJobList(enPath);
  if (zhPath && zhBackup) await stripJobList(zhPath);
  results.push(await measure(port, "/", "before-en"));
  if (zhBackup) results.push(await measure(port, "/zh/", "before-zh"));

  // restore
  await writeFile(enPath, enBackup);
  if (zhBackup) await writeFile(zhPath, zhBackup);

  server.close();
  const out = {
    jsonDelayMs: JSON_DELAY_MS,
    results,
    summary: {
      afterEn: results.find((r) => r.label === "after-en")?.firstCardMs,
      beforeEn: results.find((r) => r.label === "before-en")?.firstCardMs,
      afterZh: results.find((r) => r.label === "after-zh")?.firstCardMs,
      beforeZh: results.find((r) => r.label === "before-zh")?.firstCardMs,
    },
  };
  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
