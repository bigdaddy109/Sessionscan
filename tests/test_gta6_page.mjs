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
  GTA6_OFFICIAL_TRAILER_POSTER_URL,
  GTA6_OFFICIAL_TRAILER_WATCH_URL,
  GTA6_OFFICIAL_TRAILER_YOUTUBE_ID,
  GTA6_OFFICIAL_URL,
  GTA6_RELEASE_ISO_DATE,
  formatGta6Countdown,
  gta6CountdownScript,
  gta6OfficialTrailerHtml,
  gta6PageJsonLd,
  gta6ReleaseAt,
  gta6TipFreezeLinkHtml,
  homeGta6LinkHtml,
  injectHomeGta6Link,
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

// Why: /gta6/ must cite the same Rockstar-hosted trailer id as
// rockstargames.com/VI — inventing a different video would mislead players.
// Poster + outbound watch only: youtube-nocookie iframes age-gate this title.
if (GTA6_OFFICIAL_TRAILER_YOUTUBE_ID !== "tJbzMqJGH4k") {
  fail("official trailer YouTube id drift", GTA6_OFFICIAL_TRAILER_YOUTUBE_ID);
}
if (
  GTA6_OFFICIAL_TRAILER_POSTER_URL !==
  "https://i.ytimg.com/vi/tJbzMqJGH4k/hqdefault.jpg"
) {
  fail("trailer poster URL drift", GTA6_OFFICIAL_TRAILER_POSTER_URL);
}
if (!GTA6_OFFICIAL_TRAILER_WATCH_URL.includes("watch?v=tJbzMqJGH4k")) {
  fail("trailer watch URL drift", GTA6_OFFICIAL_TRAILER_WATCH_URL);
}
const trailerEn = gta6OfficialTrailerHtml("en");
if (!trailerEn.includes('id="gta6OfficialTrailer"')) fail("trailer section missing");
if (!trailerEn.includes('id="gta6TrailerPoster"')) fail("trailer poster link missing");
if (!trailerEn.includes(GTA6_OFFICIAL_TRAILER_POSTER_URL)) fail("trailer poster img missing");
if (!trailerEn.includes(`href="${GTA6_OFFICIAL_TRAILER_WATCH_URL}"`)) {
  fail("trailer poster must open watch URL");
}
if (!trailerEn.includes('target="_blank"')) fail("trailer must open new tab");
if (/iframe|youtube-nocookie/i.test(trailerEn)) {
  fail("trailer must not load a third-party iframe", trailerEn.slice(0, 400));
}
if (!trailerEn.includes("Official look")) fail("trailer en kicker");
if (!trailerEn.includes("Watch on YouTube")) fail("trailer en watch link");
if (!trailerEn.includes(GTA6_OFFICIAL_URL)) fail("trailer must cite Rockstar VI");
if (!trailerEn.includes("Play:")) fail("trailer play aria missing");
const trailerZh = gta6OfficialTrailerHtml("zh");
if (!trailerZh.includes("官方預告") || !trailerZh.includes("在 YouTube 觀看")) {
  fail("trailer zh copy", trailerZh.slice(0, 300));
}
if (!trailerZh.includes("播放：") || /iframe|youtube-nocookie/i.test(trailerZh)) {
  fail("zh trailer must be poster link, not iframe");
}
if (!body.includes('id="gta6OfficialTrailer"') || !body.includes(GTA6_OFFICIAL_TRAILER_POSTER_URL)) {
  fail("EN body missing official trailer poster");
}
if (!zhBody.includes('id="gta6OfficialTrailer"') || !zhBody.includes("官方預告")) {
  fail("zh body missing official trailer");
}

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
if (!html.includes('id="gta6OfficialTrailer"') || !html.includes(GTA6_OFFICIAL_TRAILER_POSTER_URL)) {
  fail("renderSitePage missing official trailer poster");
}
if (/youtube-nocookie|<iframe/i.test(html)) {
  fail("renderSitePage gta6 must not embed youtube iframe");
}
if (!html.includes('"@type":"Event"')) fail("rendered HTML missing Event JSON-LD");
if (!html.includes("site-page-main--gta6")) fail("gta6 main class missing");
// Why: once gta6 joins CROSS_LINK_PAGE_IDS it gets related-pages (not lone page-home-link).
if (!html.includes('class="related-pages"') || !html.includes('data-related="week"')) {
  fail("gta6 must include related-pages cross-links");
}
if (!html.includes('data-related="money"') || !html.includes('data-related="businesses"')) {
  fail("gta6 related must include money + businesses");
}
if (html.includes('data-related="gta6"')) fail("gta6 related must omit self");
if (!html.includes('class="footer-guides"') || !html.includes('data-footer-guide="gta6"')) {
  fail("gta6 footer guides must list gta6 among guides");
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
  if (!dist.includes("gta6-home-link") || !dist.includes('href="/"')) {
    fail("dist EN missing gta6HomeLink");
  }
  if (!dist.includes("gta6OfficialTrailer") || !dist.includes("gta6TrailerPoster")) {
    fail("dist EN missing official trailer poster");
  }
  if (!dist.includes("i.ytimg.com/vi/tJbzMqJGH4k/hqdefault.jpg")) {
    fail("dist EN missing trailer thumb");
  }
  if (/youtube-nocookie|<iframe/i.test(dist)) {
    fail("dist EN must not embed youtube iframe on /gta6/");
  }
}
if (existsSync(distZh)) {
  const dist = readFileSync(distZh, "utf8");
  if (!dist.includes("官方上市日倒數")) fail("dist ZH missing kicker");
  if (!dist.includes('href="/zh/"') || !dist.includes("首頁本週")) {
    fail("dist ZH missing gta6HomeLink");
  }
  if (!dist.includes("gta6OfficialTrailer") || !dist.includes("gta6TrailerPoster")) {
    fail("dist ZH missing official trailer poster");
  }
  if (/youtube-nocookie|<iframe/i.test(dist)) {
    fail("dist ZH must not embed youtube iframe on /zh/gta6/");
  }
}

// Why: players near the weekly countdown need a durable CTA to the official
// GTA 6 page (not the conditional banner schedule line); path must stay locale-correct.
if (!body.includes("gta6-home-link") || !body.includes('href="/"')) {
  fail("EN body missing gta6HomeLink");
}
if (!zhBody.includes('href="/zh/"') || !zhBody.includes("首頁本週")) {
  fail("zh body missing gta6HomeLink");
}
const homeEn = homeGta6LinkHtml("en");
if (!homeEn.includes('id="homeGta6Link"') || !homeEn.includes('href="/gta6/"')) {
  fail("home gta6 link en", homeEn);
}
if (!homeEn.includes("GTA 6 official countdown")) fail("home gta6 en copy");
const homeZh = homeGta6LinkHtml("zh");
if (!homeZh.includes('href="/zh/gta6/"') || !homeZh.includes("官方上市日倒數")) {
  fail("home gta6 link zh", homeZh);
}
const shell = `<aside class="week-countdown" id="weekCountdown"><p>—</p></aside>
    <section class="week-short" id="weekShort"></section>`;
const injected = injectHomeGta6Link(shell, { lang: "en" });
if (!injected.includes('id="homeGta6Link"') || !injected.includes('href="/gta6/"')) {
  fail("injectHomeGta6Link under weekCountdown", injected);
}
const zhInjected = injectHomeGta6Link(
  `<p class="home-gta6-link" id="homeGta6Link"><a href="/gta6/">x</a></p>`,
  { lang: "zh" },
);
if (!zhInjected.includes('href="/zh/gta6/"')) fail("inject replaces zh href", zhInjected);

const distHome = resolve(root, "dist/index.html");
const distZhHome = resolve(root, "dist/zh/index.html");
if (existsSync(distHome)) {
  const home = readFileSync(distHome, "utf8");
  if (!home.includes('id="homeGta6Link"') || !home.includes('href="/gta6/"')) {
    fail("dist home missing gta6 link");
  }
}
if (existsSync(distZhHome)) {
  const zhHome = readFileSync(distZhHome, "utf8");
  if (!zhHome.includes('href="/zh/gta6/"') || !zhHome.includes("官方上市日倒數")) {
    fail("dist zh home missing gta6 link");
  }
}

// Why: freeze→gta6 (#89) needs the reciprocal gta6→tip freeze so players on
// the countdown page can open this week's checklist without inventing a week key.
const tipFixture = "2026-08-07";
const tipEn = gta6TipFreezeLinkHtml(tipFixture, "en");
if (!tipEn.includes('id="gta6TipFreezeLink"') || !tipEn.includes(`href="/week/${tipFixture}/"`)) {
  fail("gta6 tip freeze en", tipEn);
}
if (!tipEn.includes("Open archive for week of")) fail("gta6 tip freeze en copy", tipEn);
const tipZh = gta6TipFreezeLinkHtml(tipFixture, "zh");
if (!tipZh.includes(`href="/zh/week/${tipFixture}/"`) || !tipZh.includes("打開")) {
  fail("gta6 tip freeze zh", tipZh);
}
const emptyTip = gta6TipFreezeLinkHtml("", "en");
if (!emptyTip.includes("is-empty") || !emptyTip.includes("hidden")) {
  fail("empty tipWeek must hide gta6 tip freeze", emptyTip);
}
const bodyWithTip = renderGta6PageBody("en", { tipWeek: tipFixture, now });
if (!bodyWithTip.includes(`href="/week/${tipFixture}/"`) || !bodyWithTip.includes('id="gta6TipFreezeLink"')) {
  fail("renderGta6PageBody tipWeek", bodyWithTip.slice(-400));
}
const shelledTip = renderSitePage(page, {
  lang: "zh",
  cssHref: "../../assets/x.css",
  faviconHref: "../../favicon.svg",
  tipWeek: tipFixture,
});
if (!shelledTip.includes('id="gta6TipFreezeLink"') || !shelledTip.includes(`/zh/week/${tipFixture}/`)) {
  fail("renderSitePage tipWeek gta6 zh");
}
if (existsSync(distEn)) {
  const built = readFileSync(distEn, "utf8");
  if (!built.includes('id="gta6TipFreezeLink"')) fail("dist gta6 missing tip freeze slot");
  const hasWeek = /href="\/week\/\d{4}-\d{2}-\d{2}\//.test(built);
  const empty = built.includes("is-empty");
  if (!hasWeek && !empty) fail("dist gta6 tip freeze needs week href or empty state");
}

console.log("test_gta6_page: ok");
