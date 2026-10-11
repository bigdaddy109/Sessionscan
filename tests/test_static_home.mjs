#!/usr/bin/env node
/**
 * Why this test matters: the home job list must ship in dist HTML for / and
 * /zh/ before JS runs (progressive enhancement). Mixing IGN into the static
 * default caused a flash when client filters defaulted to GTABase only — this
 * locks the build helper to that same default and a fixed `now=`.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_HOME_JOBS_KEY,
  injectJobListHtml,
  renderStaticHomeJobList,
  selectHomeJobs,
} from "../src/staticHomeJobs.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function fail(msg, extra) {
  console.error(msg, extra ?? "");
  process.exit(1);
}

const hub = JSON.parse(readFileSync(resolve(root, "tests/fixtures/hub.json"), "utf8"));
const now = new Date("2026-08-28T12:00:00+08:00");

const selected = selectHomeJobs(hub, now);
if (DEFAULT_HOME_JOBS_KEY !== "jobs_gtabase") fail("default key drifted");
if (!selected.length) fail("fixture should have this-week GTABase jobs at now=", now.toISOString());
if (selected.some((j) => String(j.source || "").toLowerCase().includes("ign"))) {
  fail("static home must not mix IGN into the default list", selected.map((j) => j.source));
}

const en = renderStaticHomeJobList(hub, { now, lang: "en" });
if (!en.includes("data-static-job")) fail("en cards missing data-static-job");
if (!en.includes("Share to X")) fail("en share label");
if (!/gtabase\.com|GTA Online Weekly/i.test(en)) fail("en missing weekly title/url", en.slice(0, 200));

const zh = renderStaticHomeJobList(hub, { now, lang: "zh" });
if (!zh.includes("分享到 X")) fail("zh share label");
if (!zh.includes("複製連結")) fail("zh copy label");

const shell = `<section class="view" id="view-jobs"><div class="job-list" id="jobList"></div></section>`;
const stamped = injectJobListHtml(shell, en);
if (!stamped.includes("data-static-job")) fail("injectJobListHtml failed");
if (injectJobListHtml(shell, "") !== shell) fail("empty cards must leave shell unchanged");

// Optional: if a prior build exists with this-week cards, assert both locales.
const enDist = resolve(root, "dist/index.html");
const zhDist = resolve(root, "dist/zh/index.html");
if (existsSync(enDist) && existsSync(zhDist)) {
  const enHtml = readFileSync(enDist, "utf8");
  const zhHtml = readFileSync(zhDist, "utf8");
  const enList = enHtml.split('id="jobList"', 1)[1]?.split("</div>", 1)[0] || "";
  const zhList = zhHtml.split('id="jobList"', 1)[1]?.split("</div>", 1)[0] || "";
  const enStatic = enList.includes("data-static-job");
  const zhStatic = zhList.includes("data-static-job");
  if (enStatic !== zhStatic) {
    fail("en/zh static job presence mismatch", { enStatic, zhStatic });
  }
  if (zhStatic && !zhList.includes("分享到 X") && !zhHtml.includes('aria-label="分享到 X"')) {
    fail("zh dist static cards should use zh action labels");
  }
}

console.log("test_static_home.mjs ok");
