#!/usr/bin/env node
/**
 * Why this test matters: /guides/acid-lab/ is the reserved route the owner
 * approved copy for. A second path, a paraphrased English paragraph, a
 * missing Short, or a long-form iframe while LONG_VIDEO_ID is empty would
 * ship the wrong guide.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ACID_LAB_COPY,
  ACID_LAB_GUIDE,
  ACID_LAB_SHORT_EMBED_URL,
  ACID_LAB_SHORT_WATCH_URL,
  LONG_VIDEO_ID,
  acidLabLongVideoHtml,
  renderAcidLabGuideBody,
} from "../src/acidLabGuide.js";
import { t } from "../src/i18n.js";
import { renderSitePage, staticSitemapUrls } from "../src/sitePages.js";

function fail(msg, extra) {
  console.error(msg, extra ?? "");
  process.exit(1);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const enApproved = {
  title: "Acid Lab Guide: Sell for 50% More (Tested)",
  quick:
    "Quick answer: rename your product first and sell in a public lobby. In our test the same 40 units went from $62,360 to $93,510.",
  sections: [
    [
      "How to get the Acid Lab",
      "Do Dax's six First Dose missions, then the lab steal setup. You get the Acid Lab, which is the Brickade truck, when it's finished. Our payouts per mission are in the video below.",
    ],
    [
      "Step 1: Rename your product (+5%)",
      "Interaction Menu → Services Vehicles → Acid Lab → Product Name. You pick from a list, and the first rename is free. In our test the value per unit went from $1,485 to $1,559.",
    ],
    [
      "Step 2: Sell in a public lobby (up to +50%)",
      "Sell value rises with the number of rival players in the session. Our 40-unit sale was listed at $62,360 and paid out $93,510, about 1.5 times as much.",
    ],
    [
      "Without the equipment upgrade",
      "A full supply bar costs $60,000 when supplies are under 20 units. It makes 50 units worth $74,250 at base price, so buying supplies barely pays unless you rename and sell public. Free resupply missions add 25 units each.",
    ],
  ],
  watch: "Watch the full run",
};

if (ACID_LAB_COPY.en.title !== enApproved.title) fail("en title drifted", ACID_LAB_COPY.en.title);
if (ACID_LAB_COPY.en.quick !== enApproved.quick) fail("en quick answer drifted", ACID_LAB_COPY.en.quick);
if (ACID_LAB_COPY.en.watch !== enApproved.watch) fail("en watch heading drifted");
if (ACID_LAB_COPY.en.sections.length !== enApproved.sections.length) fail("en section count");
for (let i = 0; i < enApproved.sections.length; i++) {
  const got = ACID_LAB_COPY.en.sections[i];
  const [heading, body] = enApproved.sections[i];
  if (got.heading !== heading || got.body !== body) fail("en section drifted", got);
}
if (t("pageAcidLabHeading", {}, "en") !== enApproved.title) fail("heading key must match approved title");
if (t("pageAcidLabDesc", {}, "en") !== enApproved.quick) fail("meta description must be the approved quick answer");
if (t("pageAcidLabTitle", {}, "en") !== `${enApproved.title} | SessionScan`) fail("meta title");
if (t("pageAcidLabHeading", {}, "zh") !== ACID_LAB_COPY.zh.title) fail("zh heading must match zh title");
if (t("pageAcidLabDesc", {}, "zh") !== ACID_LAB_COPY.zh.quick) fail("zh meta description");
if (!ACID_LAB_COPY.zh.title || !ACID_LAB_COPY.zh.quick || ACID_LAB_COPY.zh.sections.length !== 4) {
  fail("zh guide incomplete");
}
if (ACID_LAB_COPY.zh.quick.includes("Quick answer")) fail("zh quick answer should be Traditional Chinese");

if (LONG_VIDEO_ID !== "") fail("LONG_VIDEO_ID must stay empty until the full run exists", LONG_VIDEO_ID);
if (ACID_LAB_SHORT_EMBED_URL !== "https://www.youtube.com/embed/LL3J2wKC_Ik") fail("short embed url");
if (ACID_LAB_SHORT_WATCH_URL !== "https://youtube.com/shorts/LL3J2wKC_Ik") fail("short watch url");

const enBody = renderAcidLabGuideBody("en");
const zhBody = renderAcidLabGuideBody("zh");
for (const bit of [enApproved.title, enApproved.quick, ...enApproved.sections.flat(), enApproved.watch]) {
  const visible = bit.replaceAll("'", "&#39;");
  if (!enBody.includes(visible)) fail("en html missing approved text", bit);
}
if (!zhBody.includes(ACID_LAB_COPY.zh.title) || !zhBody.includes("迷幻藥實驗室")) fail("zh html");
if (enBody.includes("$750K") || zhBody.includes("$750K")) fail("unsourced $750K must not ship");

if (!enBody.includes(`src="${ACID_LAB_SHORT_EMBED_URL}"`) || !enBody.includes('loading="lazy"')) {
  fail("short iframe");
}
if (!enBody.includes('class="acid-short"') || !enBody.includes(ACID_LAB_SHORT_WATCH_URL)) fail("short block");
if (!enBody.includes('data-acid-long="pending"') || !enBody.includes("Full video coming soon")) {
  fail("empty LONG_VIDEO_ID must show the coming-soon note");
}
if (enBody.includes('class="acid-long"')) fail("empty LONG_VIDEO_ID must not render a long iframe");
if (!enBody.includes("LONG_VIDEO_ID:")) fail("long-form slot comment missing");

const filled = acidLabLongVideoHtml("dQw4w9WgXcQ", "en");
if (!filled.includes('src="https://www.youtube.com/embed/dQw4w9WgXcQ"') || !filled.includes('class="acid-long"')) {
  fail("a real LONG_VIDEO_ID must render the embed", filled);
}
if (!filled.includes('loading="lazy"')) fail("long embed must be lazy");
if (acidLabLongVideoHtml("nope", "en").includes("<iframe")) fail("invalid id must not embed");

const page = renderSitePage(ACID_LAB_GUIDE, { lang: "en", cssHref: "/assets/x.css", faviconHref: "/favicon.svg" });
const pageZh = renderSitePage(ACID_LAB_GUIDE, { lang: "zh", cssHref: "/assets/x.css", faviconHref: "/favicon.svg" });
if (!page.includes('rel="canonical" href="https://sessionscan.net/guides/acid-lab/"')) fail("canonical");
if (!page.includes('hreflang="zh-Hant" href="https://sessionscan.net/zh/guides/acid-lab/"')) fail("hreflang");
if (!page.includes('data-nav="acid-lab-guide"') || !page.includes('aria-current="page"')) fail("active nav");
if (!page.includes('class="related-pages"') || !page.includes('href="/guides/businesses/"')) {
  fail("guide should keep the usual related-page links");
}
if (!pageZh.includes('lang="zh-Hant"') || !pageZh.includes("/zh/guides/acid-lab/")) fail("zh shell");
if (!page.includes("https://sessionscan.net/og-acid-lab.jpg")) fail("og image");

const urls = staticSitemapUrls();
if (!urls.includes("https://sessionscan.net/guides/acid-lab/")) fail("static sitemap");
if (!urls.includes("https://sessionscan.net/zh/guides/acid-lab/")) fail("static sitemap zh");

const css = readFileSync(resolve(root, "src/style.css"), "utf8");
const shortRules = css.match(/\.acid-short \{[^}]+\}/g) || [];
if (!shortRules.some((rule) => rule.includes("aspect-ratio: 9 / 16"))) {
  fail("short must be responsive 9:16", shortRules);
}
const longRules = css.match(/\.acid-long \{[^}]+\}/g) || [];
if (!longRules.some((rule) => rule.includes("aspect-ratio: 16 / 9"))) {
  fail("long video slot must be 16:9 when present");
}
if (!css.includes(".acid-short iframe") || !css.includes("position: absolute")) {
  fail("embeds must be absolutely positioned inside their ratio box");
}
const publicSitemap = readFileSync(resolve(root, "public/sitemap.xml"), "utf8");
if (!publicSitemap.includes("https://sessionscan.net/guides/acid-lab/")) fail("public sitemap");
if (!publicSitemap.includes("https://sessionscan.net/zh/guides/acid-lab/")) fail("public sitemap zh");

console.log("test_acid_lab_guide.mjs ok");
