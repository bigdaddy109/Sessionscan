/** Stable card ids, hash deep-links, and Share-to-X captions. Frontend-only. */

export const CARD_SITE_BASE = "https://sessionscan.net/";
export const X_INTENT_URL = "https://x.com/intent/post";
export const X_WEIGHTED_LIMIT = 280;
export const X_URL_WEIGHT = 23;

export const TAB_TO_HASH = { jobs: "jobs", hot: "hot", new: "shorts", forum: "forum", x: "x" };
export const HASH_TO_TAB = { jobs: "jobs", hot: "hot", shorts: "new", new: "new", forum: "forum", x: "x" };

export const UI_COPY = {
  zh: {
    share: "分享到 X",
    copy: "複製連結",
    copied: "已複製",
    via: "via @sessionscan",
  },
  en: {
    share: "Share to X",
    copy: "Copy link",
    copied: "Copied",
    via: "via @sessionscan",
  },
  ja: {
    share: "Xでシェア",
    copy: "リンクをコピー",
    copied: "コピーしました",
    via: "via @sessionscan",
  },
};

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const YT_FROM_URL =
  /(?:youtube\.com\/(?:watch\?(?:[^#]*?&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i;
const X_STATUS = /(?:^|\/\/)(?:www\.)?(?:x|twitter)\.com\/[^/]+\/status\/(\d+)/i;
const BAHA_BSN = /[?&]bsn=(\d+)/i;
const BAHA_SNA = /[?&]snA=(\d+)/i;
const REDDIT_POST = /reddit\.com\/(?:r\/[^/]+\/)?comments\/([a-z0-9]+)/i;

export function uiLang(raw) {
  const src =
    raw ?? (typeof document !== "undefined" ? document.documentElement?.lang : "") ?? "";
  const lang = String(src || "zh").toLowerCase();
  if (lang.startsWith("ja")) return "ja";
  if (lang.startsWith("en")) return "en";
  return "zh";
}

export function uiCopy(lang) {
  return UI_COPY[uiLang(lang)] || UI_COPY.zh;
}

function fnv1a32(str) {
  let h = 0x811c9cd5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function normUrl(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  try {
    const u = new URL(s);
    const drop = [];
    for (const [k] of u.searchParams) {
      if (/^utm_/i.test(k) || /^(fbclid|gclid|si)$/i.test(k)) drop.push(k);
    }
    for (const k of drop) u.searchParams.delete(k);
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");
    let out = u.toString();
    if (u.pathname === "/" && !u.search && !u.hash) {
      out = `${u.protocol}//${u.host}`;
    }
    return out;
  } catch {
    return s.replace(/\/+$/, "");
  }
}

export function youtubeId(item) {
  const direct = String(item?.video_id || "").trim();
  if (YT_ID.test(direct)) return direct;
  const url = String(item?.url || "");
  const m = url.match(YT_FROM_URL);
  return m ? m[1] : "";
}

export function xStatusId(item) {
  const tid = String(item?.tid || "").trim();
  if (/^\d{5,}$/.test(tid)) return tid;
  const m = String(item?.url || "").match(X_STATUS);
  return m ? m[1] : "";
}

export function bahaThreadId(item) {
  const url = String(item?.url || "");
  if (!/forum\.gamer\.com\.tw\/C\.php/i.test(url)) return "";
  const bsn = url.match(BAHA_BSN)?.[1];
  const sna = url.match(BAHA_SNA)?.[1];
  return bsn && sna ? `${bsn}-${sna}` : "";
}

export function redditPostId(item) {
  const m = String(item?.url || "").match(REDDIT_POST);
  return m ? m[1] : "";
}

function isWeakUrl(url) {
  if (!url) return true;
  if (/forum\.gamer\.com\.tw\/B\.php/i.test(url) && !/[?&]snA=/i.test(url)) return true;
  if (/(?:x|twitter)\.com\/[^/?#]+\/?$/i.test(url)) return true;
  if (/(?:x|twitter)\.com\/search/i.test(url)) return true;
  if (/reddit\.com\/r\/[^/]+\/?$/i.test(url)) return true;
  if (/rockstargames\.com(?:\/(?:VI|newswire))?\/?$/i.test(url)) return true;
  return false;
}

function seedTitle(item) {
  return String(item?.title || item?.text || item?.title_zh || "").trim();
}

/** Identity from the item itself — never list position. */
export function cardId(item) {
  if (!item || typeof item !== "object") return "";
  const yt = youtubeId(item);
  if (yt) return `yt-${yt}`;
  const x = xStatusId(item);
  if (x) return `x-${x}`;
  const baha = bahaThreadId(item);
  if (baha) return `baha-${baha}`;
  const rd = redditPostId(item);
  if (rd) return `rd-${rd}`;
  const url = normUrl(item.url || "");
  if (url && !isWeakUrl(url)) return `u-${fnv1a32(url)}`;
  const seed = `${url}\n${seedTitle(item)}`;
  if (!seed.trim()) return "";
  return `u-${fnv1a32(seed)}`;
}

export function parseHash(raw) {
  const hash = String(raw || "").replace(/^#/, "");
  const out = { tab: null, q: "", v: "" };
  const parts = hash.split("&").filter(Boolean);
  for (const part of parts) {
    if (part.startsWith("q=")) {
      try {
        out.q = decodeURIComponent(part.slice(2).replace(/\+/g, " "));
      } catch {
        out.q = part.slice(2);
      }
    } else if (part.startsWith("v=")) {
      try {
        out.v = decodeURIComponent(part.slice(2));
      } catch {
        out.v = part.slice(2);
      }
    } else if (HASH_TO_TAB[part]) {
      out.tab = HASH_TO_TAB[part];
    }
  }
  if (!out.tab && !out.q && !out.v && hash.startsWith("q=")) {
    try {
      out.q = decodeURIComponent(hash.slice(2).replace(/\+/g, " "));
    } catch {
      out.q = hash.slice(2);
    }
  }
  return out;
}

export function cardHash(tab, id) {
  const tabHash = TAB_TO_HASH[tab] || tab || "";
  const safe = encodeURIComponent(id);
  if (tabHash && id) return `${tabHash}&v=${safe}`;
  if (id) return `v=${safe}`;
  return tabHash || "";
}

export function cardDeepLink(tab, id) {
  return `${CARD_SITE_BASE}#${cardHash(tab, id)}`;
}

/** Stable per-video path. YouTube ids stay put when a card leaves the homepage list. */
export const VIDEO_PAGE_PREFIX = "v";

export function videoPagePath(youtubeId) {
  const id = String(youtubeId || "").trim();
  if (!YT_ID.test(id)) return "";
  return `${VIDEO_PAGE_PREFIX}/${id}/`;
}

export function videoPageUrl(youtubeId) {
  const path = videoPagePath(youtubeId);
  return path ? `${CARD_SITE_BASE}${path}` : "";
}

export function cardShareLink(item, tab) {
  const yt = youtubeId(item);
  if (yt) return videoPageUrl(yt);
  const id = cardId(item);
  return id ? cardDeepLink(tab, id) : "";
}

export function weightedLen(text) {
  let n = 0;
  for (const ch of String(text || "")) {
    n += ch.codePointAt(0) > 0x7f ? 2 : 1;
  }
  return n;
}

export function clipWeighted(text, max) {
  const s = String(text || "");
  if (weightedLen(s) <= max) return s;
  const ellipsis = "…";
  const budget = Math.max(0, max - weightedLen(ellipsis));
  let n = 0;
  let out = "";
  for (const ch of s) {
    const w = ch.codePointAt(0) > 0x7f ? 2 : 1;
    if (n + w > budget) break;
    out += ch;
    n += w;
  }
  return `${out.replace(/\s+$/, "")}${ellipsis}`;
}

export function cardTitle(item) {
  return seedTitle(item);
}

export function shareCaption(title, deepLink, via = UI_COPY.zh.via) {
  const viaLine = String(via || UI_COPY.zh.via);
  const reserved = X_URL_WEIGHT + weightedLen(`\n\n${viaLine}`);
  const titleBudget = Math.max(16, X_WEIGHTED_LIMIT - reserved);
  const head = clipWeighted(String(title || "").replace(/\s+/g, " ").trim(), titleBudget);
  return `${head}\n${deepLink}\n${viaLine}`;
}

export function xIntentHref(text) {
  return `${X_INTENT_URL}?text=${encodeURIComponent(text)}`;
}

export function cardLocations(data) {
  const out = [];
  if (!data || typeof data !== "object") return out;
  const push = (item, extra) => {
    const id = cardId(item);
    if (!id) return;
    out.push({ id, item, ...extra });
  };
  for (const [jobsSource, key] of [
    ["gtabase", "jobs_gtabase"],
    ["ign", "jobs_ign"],
    ["wiki", "jobs_wiki"],
  ]) {
    for (const item of data[key] || []) push(item, { tab: "jobs", jobsSource });
  }
  for (const lang of ["zh", "en", "ja"]) {
    for (const item of data[`videos_hot_${lang}`] || []) push(item, { tab: "hot", hotLang: lang });
  }
  const owned = data.sessionscan_slot?.short;
  if (owned && (owned.video_id || owned.url)) push(owned, { tab: "new", owned: true });
  for (const item of data.videos_shorts || []) push(item, { tab: "new" });
  for (const [forumSource, key] of [
    ["bahamut", "forum_bahamut"],
    ["reddit", "forum_reddit"],
  ]) {
    for (const item of data[key] || []) push(item, { tab: "forum", forumSource });
  }
  for (const lang of ["zh", "en"]) {
    for (const item of data[`tweets_${lang}`] || []) push(item, { tab: "x", tweetsLang: lang });
  }
  return out;
}

export function findCardLocation(data, id, preferTab) {
  if (!id) return null;
  const hits = cardLocations(data).filter((h) => h.id === id);
  if (!hits.length) return null;
  if (preferTab) {
    const pref = hits.find((h) => h.tab === preferTab);
    if (pref) return pref;
  }
  return hits[0];
}

function escAttr(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const SHARE_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14.2 10.4 21.6 2h-1.8l-6.4 7.3L8.3 2H2l7.8 11.1L2 22h1.8l6.8-7.8L15.7 22H22l-7.8-11.6Zm-2.4 2.7-.8-1.1L4.4 3.3h2.7l5.1 7.2.8 1.1 6.6 9.2h-2.7l-5.1-7.2Z"/></svg>';
const COPY_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M5 16V5h11" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>';

export function cardAttrs(item) {
  const id = cardId(item);
  if (!id) return 'data-card';
  return `data-card data-card-id="${escAttr(id)}"`;
}

export function cardActionsHtml(item, tab, lang) {
  const id = cardId(item);
  if (!id) return "";
  const copy = uiCopy(lang);
  const link = cardShareLink(item, tab) || cardDeepLink(tab, id);
  const href = xIntentHref(shareCaption(cardTitle(item), link, copy.via));
  return `<div class="card-actions">
      <a class="card-share" href="${escAttr(href)}" target="_blank" rel="noopener noreferrer" aria-label="${escAttr(copy.share)}">${SHARE_ICON}</a>
      <button type="button" class="card-copy" data-copy="${escAttr(link)}" aria-label="${escAttr(copy.copy)}">${COPY_ICON}</button>
    </div>`;
}
