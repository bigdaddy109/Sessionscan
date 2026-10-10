#!/usr/bin/env node
/**
 * Post-vite: write dist/zh/index.html as the Traditional Chinese locale.
 * Rewrites relative assets to ../ and applies zh UI copy.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { UI, applyHtmlI18n, rewriteAssetBase } from "../src/i18n.js";
import { replaceHomeJsonLd } from "../src/structuredData.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const srcPath = resolve(dist, "index.html");

if (!existsSync(srcPath)) {
  console.warn("generate_zh_pages: dist/index.html missing");
  process.exit(0);
}

const en = readFileSync(srcPath, "utf8");
let zh = applyHtmlI18n(en, "zh");
zh = replaceHomeJsonLd(zh, "zh");
zh = rewriteAssetBase(zh, "../");
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

const outDir = resolve(dist, "zh");
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, "index.html"), zh);
console.log("generate_zh_pages: dist/zh/index.html");
