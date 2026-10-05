#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CARD_SITE_BASE,
  X_INTENT_URL,
  X_WEIGHTED_LIMIT,
  cardDeepLink,
  cardHash,
  cardId,
  cardLocations,
  findCardLocation,
  parseHash,
  shareCaption,
  uiCopy,
  uiLang,
  weightedLen,
  xIntentHref,
  youtubeId,
} from "../src/cardShare.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sample = JSON.parse(readFileSync(resolve(root, "public/data/sample.json"), "utf8"));
const hub = JSON.parse(readFileSync(resolve(root, "tests/fixtures/hub.json"), "utf8"));

function fail(msg, extra) {
  console.error(msg, extra ?? "");
  process.exit(1);
}

if (cardId({ video_id: "5XBMNYmFmTs", title: "A" }) !== "yt-5XBMNYmFmTs") {
  fail("youtube video_id must become yt-<id>");
}
if (cardId({ url: "https://www.youtube.com/watch?v=5XBMNYmFmTs" }) !== "yt-5XBMNYmFmTs") {
  fail("youtube watch url must yield the same id");
}
if (cardId({ url: "https://youtu.be/5XBMNYmFmTs" }) !== "yt-5XBMNYmFmTs") {
  fail("youtu.be url must yield the same id");
}
if (cardId({ url: "https://www.youtube.com/shorts/5XBMNYmFmTs" }) !== "yt-5XBMNYmFmTs") {
  fail("shorts url must yield the same id");
}
if (cardId({ rank: 9, video_id: "5XBMNYmFmTs" }) !== cardId({ rank: 1, video_id: "5XBMNYmFmTs" })) {
  fail("id must ignore list position");
}

const baha = cardId({ url: "https://forum.gamer.com.tw/C.php?bsn=4737&snA=117691", title: "thread" });
if (baha !== "baha-4737-117691") fail("bahamut thread id", baha);

const flipped = cardId({ url: "https://forum.gamer.com.tw/C.php?snA=117691&bsn=4737", title: "thread" });
if (flipped !== "baha-4737-117691") fail("bahamut param order must not matter", flipped);

const rd = cardId({
  url: "https://www.reddit.com/r/gtaonline/comments/1w1d7n5/i_analysed_400_games/",
  title: "post",
});
if (rd !== "rd-1w1d7n5") fail("reddit post id", rd);

const tweet = cardId({
  tid: "2093901346189742563",
  url: "https://x.com/r5168_eth/status/2093901346189742563",
  text: "hello",
});
if (tweet !== "x-2093901346189742563") fail("tweet tid", tweet);
if (cardId({ url: "https://twitter.com/foo/status/2093901346189742563" }) !== tweet) {
  fail("twitter.com status must match x.com tid");
}

const jobA = cardId({
  url: "https://www.gtabase.com/articles/grand-theft-auto-v/news/gta-online-weekly-update",
  title: "Weekly A",
  rank: 1,
});
const jobB = cardId({
  url: "https://www.gtabase.com/articles/grand-theft-auto-v/news/gta-online-weekly-update",
  title: "Weekly A renamed",
  rank: 99,
});
if (!jobA.startsWith("u-") || jobA !== jobB) fail("job url id must be stable across rank/title", { jobA, jobB });
const jobOther = cardId({
  url: "https://www.gtabase.com/articles/grand-theft-auto-v/news/other-article",
  title: "Weekly A",
});
if (jobA === jobOther) fail("different job urls must not collide");

const board1 = cardId({ url: "https://forum.gamer.com.tw/B.php?bsn=4737", title: "【範例】本週獎勵" });
const board2 = cardId({ url: "https://forum.gamer.com.tw/B.php?bsn=4737", title: "【範例】佩里克島" });
if (!board1 || board1 === board2) fail("weak board urls must still be unique per title", { board1, board2 });

const sampleIds = cardLocations(sample).map((h) => `${h.tab}:${h.id}`);
if (new Set(sampleIds).size !== sampleIds.length) fail("sample card ids must be unique per tab", sampleIds);
if (cardLocations(sample).some((h) => !h.id || /\s|&|#|=/.test(h.id))) {
  fail("card ids must be hash-safe", cardLocations(sample).map((h) => h.id));
}

const hot = findCardLocation(sample, "yt-5XBMNYmFmTs", "hot");
if (!hot || hot.tab !== "hot" || hot.hotLang !== "zh") fail("find youtube in hot zh", hot);
const missing = findCardLocation(sample, "yt-___________", "hot");
if (missing) fail("unknown id must be null");

const jobsTab = parseHash("#jobs");
if (jobsTab.tab !== "jobs" || jobsTab.q || jobsTab.v) fail("tab-only hash", jobsTab);
const shortsTab = parseHash("#shorts");
if (shortsTab.tab !== "new") fail("shorts alias", shortsTab);
const search = parseHash("#q=Cayo%20Perico");
if (search.q !== "Cayo Perico" || search.tab || search.v) fail("search hash", search);
const plus = parseHash("#q=gta+6");
if (plus.q !== "gta 6") fail("plus in search", plus);
const deep = parseHash("#hot&v=yt-5XBMNYmFmTs");
if (deep.tab !== "hot" || deep.v !== "yt-5XBMNYmFmTs") fail("tab+v hash", deep);
const vOnly = parseHash("#v=yt-5XBMNYmFmTs");
if (vOnly.v !== "yt-5XBMNYmFmTs" || vOnly.tab) fail("v-only hash", vOnly);
const both = parseHash("#jobs&q=weekly");
if (both.tab !== "jobs" || both.q !== "weekly") fail("legacy tab+search", both);
if (parseHash("").tab || parseHash("#nope").tab) fail("unknown hash stays empty");

if (cardHash("hot", "yt-5XBMNYmFmTs") !== "hot&v=yt-5XBMNYmFmTs") fail("cardHash format");
if (cardHash("new", "yt-abcABCabc12") !== "shorts&v=yt-abcABCabc12") fail("new tab hash is shorts");
const link = cardDeepLink("forum", "baha-4737-117691");
if (link !== `${CARD_SITE_BASE}#forum&v=baha-4737-117691`) fail("deep link", link);

const zh = uiCopy("zh-Hant");
const en = uiCopy("en-US");
const ja = uiCopy("ja");
if (zh.share !== "分享到 X" || en.share !== "Share to X" || ja.share !== "Xでシェア") {
  fail("localized share labels", { zh, en, ja });
}
if (uiLang("zh-TW") !== "zh" || uiLang("en") !== "en" || uiLang("ja-JP") !== "ja") {
  fail("uiLang mapping");
}

const longTitle = "佩里克島最高效率攻略".repeat(40);
const caption = shareCaption(longTitle, link, zh.via);
if (!caption.includes(link) || !caption.includes("via @sessionscan")) fail("caption must keep link + via");
if (weightedLen(caption.replace(link, "x".repeat(23))) > X_WEIGHTED_LIMIT) {
  fail("caption exceeds X weighted limit", weightedLen(caption.replace(link, "x".repeat(23))));
}
const href = xIntentHref(caption);
if (!href.startsWith(`${X_INTENT_URL}?text=`)) fail("intent url", href);
if (decodeURIComponent(href.split("text=")[1]) !== caption) fail("intent text roundtrip");

const hubVid = youtubeId(hub.videos_hot_zh[0]);
if (hubVid !== "5XBMNYmFmTs") fail("hub fixture youtube from url", hubVid);

console.log("test_card_share.mjs ok", cardLocations(sample).length, "sample cards");
