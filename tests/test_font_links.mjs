/**
 * Why this test matters: EN pages must not pull Google Fonts CSS (especially Noto CJK)
 * into the critical path — that was the top Lighthouse mobile render-blocking / unused-CSS hit.
 * Oswald is self-hosted + preloaded; /zh/ still gets Noto via fontLinks.js.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FONT_HREF_ZH_NOTO,
  fontHeadLinks,
  fontHref,
  oswaldPreloadLinks,
} from "../src/fontLinks.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const indexHtml = readFileSync(join(root, "index.html"), "utf8");
const css = readFileSync(join(root, "src/style.css"), "utf8");

function fail(msg) {
  console.error("FAIL:", msg);
  process.exit(1);
}

if (fontHref("en") !== "") fail("fontHref(en) must be empty (self-hosted Oswald)");
if (fontHref("zh") !== FONT_HREF_ZH_NOTO) fail("fontHref(zh) must be Noto stylesheet");
if (!FONT_HREF_ZH_NOTO.includes("Noto+Sans+TC")) fail("ZH Noto href missing family");
if (!FONT_HREF_ZH_NOTO.includes("display=optional")) fail("Noto must use display=optional");

const enHead = fontHeadLinks("en");
const zhHead = fontHeadLinks("zh");
if (!enHead.includes("/fonts/oswald-latin-700-normal.woff2")) fail("EN must preload Oswald 700");
if (enHead.includes("fonts.googleapis.com")) fail("EN head must not hit Google Fonts");
if (!zhHead.includes("Noto+Sans+TC")) fail("ZH head must include Noto");
if (!zhHead.includes('media="print"') || !zhHead.includes("onload=")) {
  fail("ZH Noto must use print→all non-blocking pattern");
}
if (!oswaldPreloadLinks().includes("as=\"font\"")) fail("Oswald preload must be as=font");

for (const file of [
  "public/fonts/oswald-latin-500-normal.woff2",
  "public/fonts/oswald-latin-700-normal.woff2",
]) {
  if (!existsSync(join(root, file))) fail(`missing ${file}`);
}

if (!css.includes('url("/fonts/oswald-latin-700-normal.woff2")')) {
  fail("style.css must @font-face self-hosted Oswald");
}
if (!css.includes("font-display: optional")) fail("Oswald @font-face needs font-display:optional");

if (!indexHtml.includes("oswald-latin-500-normal.woff2")) {
  fail("index.html must preload self-hosted Oswald");
}
if (indexHtml.includes("fonts.googleapis.com") || indexHtml.includes("Noto+Sans+TC")) {
  fail("index.html EN must not load Google Fonts / Noto");
}
if (indexHtml.includes('role="tablist"')) {
  fail("jobs source pills are toggles, not tabs — use role=group (aria-required-children)");
}
if (!indexHtml.includes('role="group"') || !indexHtml.includes("jobsSourceAria")) {
  fail("jobs source pill-group should stay role=group with jobsSourceAria");
}

const genZh = readFileSync(join(root, "scripts/generate_zh_pages.mjs"), "utf8");
if (!genZh.includes("FONT_HREF_ZH_NOTO") || !genZh.includes("Noto")) {
  fail("generate_zh_pages must inject Noto for /zh/");
}

console.log("ok test_font_links");
