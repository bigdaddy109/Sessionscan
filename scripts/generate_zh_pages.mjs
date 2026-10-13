#!/usr/bin/env node
/**
 * Post-vite: write dist/zh/index.html as the Traditional Chinese locale.
 * Rewrites relative assets to ../ and applies zh UI copy.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FONT_HREF_ZH_NOTO } from "../src/fontLinks.js";
import { UI, applyHtmlI18n, rewriteAssetBase } from "../src/i18n.js";
import { injectHomeBusinessGuideLink } from "../src/businessRanking.js";
import { injectHomeGta6Link } from "../src/gta6Page.js";
import { injectHomeMoneyGuideLink } from "../src/moneyGuide.js";
import { injectHomeShell } from "../src/sitePages.js";
import { replaceHomeJsonLd } from "../src/structuredData.js";
import { injectJobListHtml, renderStaticHomeJobList } from "../src/staticHomeJobs.js";
import { injectHomeAtomDiscovery } from "../src/weekArchive.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const srcPath = resolve(dist, "index.html");

function loadSite() {
  for (const rel of ["public/data/site.json", "dist/data/site.json"]) {
    const path = resolve(root, rel);
    if (!existsSync(path)) continue;
    try {
      const data = JSON.parse(readFileSync(path, "utf8"));
      if (data && typeof data === "object") return data;
    } catch {
      /* try next */
    }
  }
  return null;
}

if (!existsSync(srcPath)) {
  console.warn("generate_zh_pages: dist/index.html missing");
  process.exit(0);
}

const en = readFileSync(srcPath, "utf8");
let zh = applyHtmlI18n(en, "zh");
zh = replaceHomeJsonLd(zh, "zh");
zh = injectHomeShell(zh, { lang: "zh" });
zh = injectHomeAtomDiscovery(zh, { lang: "zh" });
zh = injectHomeMoneyGuideLink(zh, { lang: "zh" });
zh = injectHomeBusinessGuideLink(zh, { lang: "zh" });
zh = injectHomeGta6Link(zh, { lang: "zh" });
zh = rewriteAssetBase(zh, "../");
// EN has Oswald preloads only (vite may emit ./fonts); inject non-blocking Noto TC for CJK UI.
if (!zh.includes("Noto+Sans+TC")) {
  const notoTail = `<link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="preload" as="style" href="${FONT_HREF_ZH_NOTO}" />
    <link rel="stylesheet" href="${FONT_HREF_ZH_NOTO}" media="print" onload="this.media='all'" />
    <noscript><link rel="stylesheet" href="${FONT_HREF_ZH_NOTO}" /></noscript>
    `;
  const replaced = zh.replace(
    /(<link rel="preload" href="[^"]*fonts\/oswald-latin-700-normal\.woff2"[^>]*>)/,
    `$1\n    ${notoTail}`,
  );
  if (replaced === zh) {
    console.warn("generate_zh_pages: Oswald preload not found; appending Noto before </head>");
    zh = zh.replace("</head>", `    ${notoTail}</head>`);
  } else {
    zh = replaced;
  }
}
zh = zh.replaceAll("Official weekly signal pending next snapshot", UI.zh.officialPending);
zh = zh.replaceAll(">All channels<", `>${UI.zh.allChannels}<`);
zh = zh.replace(
  /(<button class="pill active" data-lang="en")/g,
  '<button class="pill" data-lang="en"',
);
zh = zh.replace(
  /(<button class="pill" data-lang="zh")/g,
  '<button class="pill active" data-lang="zh"',
);

// Re-stamp #jobList with zh card-action labels so /zh/ matches en progressive enhancement.
const site = loadSite();
if (site) {
  const cards = renderStaticHomeJobList(site, { lang: "zh" });
  if (cards) zh = injectJobListHtml(zh, cards);
}

const outDir = resolve(dist, "zh");
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, "index.html"), zh);
console.log("generate_zh_pages: dist/zh/index.html");
