#!/usr/bin/env node
/**
 * Why this test matters: /gta6/ is the only official-date surface. If the
 * countdown target, Rockstar citation, or Event JSON-LD drifts, we either
 * invent a leak clock or lose the SEO Event — catch that without a browser.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  GTA6_NEWSWIRE_URL,
  GTA6_OFFICIAL_URL,
  GTA6_RELEASE_ISO_DATE,
  formatGta6Countdown,
  gta6CountdownScript,
  gta6PageJsonLd,
  gta6ReleaseAt,
  renderGta6PageBody,
} from "../src/gta6Page.js";
import { countdownParts } from "../src/thisWeekHome.js";
import { SITE_PAGES, renderSitePage, webPageJsonLd } from "../src/sitePages.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function fail(msg, extra) {
  console.error(msg, extra ?? "");
  process.exit(1);
}

if (GTA6_RELEASE_ISO_DATE !== "2026-11-19") {
  fail("release ISO must match Rockstar announced day", GTA6_RELEASE_ISO_DATE);
}
if (GTA6_OFFICIAL_URL !== "https://www.rockstargames.com/VI") {
  fail("official URL drift", GTA6_OFFICIAL_URL);
}
if (!GTA6_NEWSWIRE_URL.includes("rockstargames.com/newswire")) {
  fail("newswire URL drift", GTA6_NEWSWIRE_URL);
}

const release = gta6ReleaseAt();
if (release.toISOString() !== "2026-11-19T00:00:00.000Z") {
  fail("gta6ReleaseAt must be UTC midnight of announced day", release.toISOString());
}

// Fixed now= so the assertion does not depend on wall clock.
const now = new Date("2026-10-13T12:00:00.000Z");
const parts = countdownParts(release, now);
const formatted = formatGta6Countdown(parts);
if (!/^\d+d \d{2}:\d{2}:\d{2}$/.test(formatted)) {
  fail("countdown format", formatted);
}
if (parts.days < 30 || parts.days > 50) {
  fail("expected ~37 days from fixture now to Nov 19", parts);
}

const body = renderGta6PageBody("en", now);
if (!body.includes('id="gta6CountdownDisplay"')) fail("countdown display missing");
if (!body.includes(`data-target="${release.toISOString()}"`)) fail("data-target mismatch");
if (!body.includes(formatted)) fail("static countdown not prerendered", body.slice(0, 400));
if (!body.includes(GTA6_OFFICIAL_URL)) fail("official link missing");
if (!body.includes("November 19, 2026")) fail("announced date missing from body");
if (/leak|rumor as fact|unconfirmed/i.test(body) && !/do not publish leaks/i.test(body)) {
  fail("body must stay official-only framing");
}

const zhBody = renderGta6PageBody("zh", now);
if (!zhBody.includes("官方上市日倒數")) fail("zh kicker missing");
if (!zhBody.includes("2026 年 11 月 19 日")) fail("zh announced date missing");

const ld = gta6PageJsonLd("en");
const event = (ld["@graph"] || []).find((n) => n["@type"] === "Event");
if (!event) fail("Event JSON-LD missing");
if (event.startDate !== GTA6_RELEASE_ISO_DATE) fail("Event.startDate drift", event.startDate);
if (event.url !== GTA6_OFFICIAL_URL) fail("Event.url must be Rockstar VI");
if (event.eventStatus !== "https://schema.org/EventScheduled") fail("eventStatus");

const page = SITE_PAGES.find((p) => p.id === "gta6");
if (!page) fail("SITE_PAGES missing gta6");
const viaWeb = webPageJsonLd(page, "en");
if (!JSON.stringify(viaWeb).includes('"@type":"Event"')) {
  fail("webPageJsonLd(gta6) must embed Event");
}

const html = renderSitePage(page, {
  lang: "en",
  cssHref: "../assets/x.css",
  faviconHref: "../favicon.svg",
});
if (!html.includes('id="gta6CountdownDisplay"')) fail("renderSitePage missing countdown");
if (!html.includes("Date.parse") || !html.includes("setInterval")) {
  fail("inline countdown script missing");
}
if (!html.includes('"@type":"Event"')) fail("rendered HTML missing Event JSON-LD");
if (!html.includes("site-page-main--gta6")) fail("gta6 main class missing");
if ((html.match(/class="page-home-link"/g) || []).length !== 1) {
  fail("expected exactly one home link from renderSitePage");
}

const script = gta6CountdownScript();
if (!script.includes("gta6CountdownDisplay")) fail("script selector drift");

// Optional dist check after build — skip if dist not present.
const distEn = resolve(root, "dist/gta6/index.html");
const distZh = resolve(root, "dist/zh/gta6/index.html");
if (existsSync(distEn)) {
  const dist = readFileSync(distEn, "utf8");
  if (!dist.includes("gta6CountdownDisplay")) fail("dist EN missing countdown");
  if (!dist.includes('"@type":"Event"')) fail("dist EN missing Event JSON-LD");
}
if (existsSync(distZh)) {
  const dist = readFileSync(distZh, "utf8");
  if (!dist.includes("官方上市日倒數")) fail("dist ZH missing kicker");
}

console.log("test_gta6_page: ok");
