#!/usr/bin/env node
/**
 * Why this test matters: iPhone users had to tap Shorts twice — facade loaded an
 * iframe with only autoplay=1, and iOS blocked unmuted autoplay. The play src
 * must always carry mute=1 + playsinline=1 + autoplay=1 so one tap starts playback.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { youtubeEmbedUrl, youtubeFacadePlaySrc } from "../src/structuredData.js";

function fail(msg, extra) {
  console.error(msg, extra ?? "");
  process.exit(1);
}

const id = "XWOBrn69Tzc";
const fromId = youtubeFacadePlaySrc(id);
const u = new URL(fromId);
if (!fromId.startsWith(youtubeEmbedUrl(id))) fail("play src must use nocookie embed", fromId);
if (u.searchParams.get("autoplay") !== "1") fail("autoplay", fromId);
if (u.searchParams.get("mute") !== "1") fail("mute", fromId);
if (u.searchParams.get("playsinline") !== "1") fail("playsinline", fromId);

const base = youtubeEmbedUrl(id);
const fromUrl = youtubeFacadePlaySrc(base);
if (fromUrl !== fromId) fail("id and embed URL must normalize equally", { fromId, fromUrl });

const already = youtubeFacadePlaySrc(`${base}?autoplay=1`);
const a = new URL(already);
if (a.searchParams.get("autoplay") !== "1" || a.searchParams.get("mute") !== "1" || a.searchParams.get("playsinline") !== "1") {
  fail("must upgrade bare autoplay URLs", already);
}

if (youtubeFacadePlaySrc("") !== "") fail("empty → empty");
if (youtubeFacadePlaySrc(null) !== "") fail("null → empty");

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mainSrc = readFileSync(resolve(root, "src/main.js"), "utf8");
if (!mainSrc.includes("youtubeFacadePlaySrc")) {
  fail("main.js must wire facade clicks through youtubeFacadePlaySrc");
}
const clickChunk = mainSrc.match(/const playBtn = e\.target\.closest\("\[data-play\]"\)[\s\S]*?return;/)?.[0] || "";
if (!clickChunk.includes("youtubeFacadePlaySrc")) {
  fail("click handler missing youtubeFacadePlaySrc", clickChunk.slice(0, 200));
}
if (/autoplay=1(?!.*youtubeFacadePlaySrc)/.test(clickChunk) && clickChunk.includes("`autoplay")) {
  fail("click handler still builds autoplay query inline", clickChunk);
}

console.log("test_youtube_facade_play.mjs ok");
