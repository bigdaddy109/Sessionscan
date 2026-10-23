/**
 * Phase C Business ranking — single source for /guides/businesses/ (+ /zh/).
 * Titles + qualitative highlights only. No invented GTA$ figures; every claim
 * that could be a number is omitted unless a source URL is attached. Ranking
 * order follows a cited secondary consensus; feature blurbs cite Rockstar Newswire.
 */

import { CARD_SITE_BASE } from "./cardShare.js";
import { SITE_ORIGIN, htmlLang, localeHome, t } from "./i18n.js";
import { jsonLdScript, organizationJsonLd } from "./structuredData.js";

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function absoluteUrl(enPath = "", lang = "en") {
  const clean = String(enPath || "").replace(/^\/+/, "");
  const prefix = lang === "zh" ? "zh/" : "";
  return `${CARD_SITE_BASE}${prefix}${clean}`;
}

/** Editorial pass date for the ranked list (ISO day). */
export const BUSINESS_LIST_UPDATED = "2026-10-23";

/**
 * Official Rockstar Games YouTube channel (@RockstarGames).
 * Confirmed 2026-10-23 from the channel page canonical URL and each trailer's
 * oEmbed author_url. UCmDTrq0LNgPodDOFZiSbsww is a different channel — do not
 * whitelist it.
 */
export const ROCKSTAR_GAMES_YT_CHANNEL_ID = "UC6VcWc1rAoWdBCM0JxrRQ3A";
export const ROCKSTAR_GAMES_YT_AUTHOR_URL = "https://www.youtube.com/@RockstarGames";

/**
 * Secondary ranking consensus used for order (not payout math).
 * Dot Esports “Best GTA Online businesses, ranked (2025)” — last updated Apr 29, 2025.
 */
export const RANKING_CONSENSUS = {
  id: "dotesports-2025",
  label: {
    en: "Dot Esports — Best GTA Online businesses, ranked (2025)",
    zh: "Dot Esports — 2025 年 GTA Online 最佳生意排名",
  },
  url: "https://dotesports.com/gta/news/best-gta-online-businesses-ranked",
  date: "2025-04-29",
};

/**
 * Worth-buying list. Order matches RANKING_CONSENSUS top picks (Acid Lab → …).
 * Each row: title, qualitative highlight, Rockstar (or official) feature source.
 * Intentionally no purchase prices or $/hr — those change with weekly discounts.
 */
export const BUSINESS_RANKING = [
  {
    id: "acid-lab",
    rank: 1,
    title: { en: "Acid Lab", zh: "迷幻藥實驗室" },
    highlight: {
      en: "Solo-friendly mobile product loop after First Dose — one-vehicle sells; unlock path via Fooligans story.",
      zh: "完成 First Dose 後解鎖的行動式產銷循環，適合單人；販售通常一輛載具即可送完。",
    },
    source: {
      name: { en: "Rockstar Newswire", zh: "Rockstar Newswire" },
      title: {
        en: "GTA Online: Los Santos Drug Wars Now Available",
        zh: "GTA Online：洛聖都毒品戰爭現已推出",
      },
      url: "https://www.rockstargames.com/newswire/article/75258k488okk33/gta-online-los-santos-drug-wars-now-available",
      date: "2022-12-13",
    },
    trailer: {
      videoId: "Ybq_FGtSCN8",
      title: "GTA Online: Los Santos Drug Wars Now Available",
      channelId: "UC6VcWc1rAoWdBCM0JxrRQ3A",
      authorUrl: "https://www.youtube.com/@RockstarGames",
    },
  },
  {
    id: "nightclub",
    rank: 2,
    title: { en: "Nightclub", zh: "夜總會" },
    highlight: {
      en: "Warehouse technicians pull from businesses you already own; daily safe income rises with popularity.",
      zh: "倉庫技師會從你已擁有的生意進貨；人氣越高，每日保險櫃收入越好。",
    },
    source: {
      name: { en: "Rockstar Newswire", zh: "Rockstar Newswire" },
      title: {
        en: "GTA Online: After Hours Out Now",
        zh: "GTA Online：After Hours 現已推出",
      },
      url: "https://www.rockstargames.com/newswire/article/1748koo9o1229a/GTA-Online-After-Hours-Out-Now",
      date: "2018-07-24",
    },
    trailer: {
      videoId: "5FBipicBoJg",
      title: "GTA Online: After Hours",
      channelId: "UC6VcWc1rAoWdBCM0JxrRQ3A",
      authorUrl: "https://www.youtube.com/@RockstarGames",
    },
  },
  {
    id: "agency",
    rank: 3,
    title: { en: "Agency", zh: "事務所" },
    highlight: {
      en: "Security Contracts, Payphone Hits, and the Dr. Dre VIP Contract — short active sessions with Franklin.",
      zh: "保全合約、公用電話刺殺與 Dr. Dre VIP 合約 — 與 Franklin 一起打短局主動任務。",
    },
    source: {
      name: { en: "Rockstar Newswire", zh: "Rockstar Newswire" },
      title: {
        en: "GTA Online: The Contract — Out Now",
        zh: "GTA Online：The Contract 現已推出",
      },
      url: "https://www.rockstargames.com/newswire/article/ak759k91592728/gta-online-the-contract-out-now",
      date: "2021-12-15",
    },
    trailer: {
      videoId: "aLUGHQq2aek",
      title: "GTA Online: The Contract – Coming December 15",
      channelId: "UC6VcWc1rAoWdBCM0JxrRQ3A",
      authorUrl: "https://www.youtube.com/@RockstarGames",
    },
  },
  {
    id: "kosatka",
    rank: 4,
    title: { en: "Kosatka (Cayo Perico)", zh: "虎鯨號（佩里克島）" },
    highlight: {
      en: "Submarine HQ for the Cayo Perico Heist — first heist playable fully solo from planning to finale.",
      zh: "佩里克島搶劫的潛艦總部 — 首個可全程單人規劃到終章的搶劫。",
    },
    source: {
      name: { en: "Rockstar Newswire", zh: "Rockstar Newswire" },
      title: {
        en: "Out Now: The Cayo Perico Heist",
        zh: "現已推出：佩里克島搶劫",
      },
      url: "https://www.rockstargames.com/newswire/article/1748koo9oo583k/out-now-the-cayo-perico-heist",
      date: "2020-12-15",
    },
    trailer: {
      videoId: "tyDRtSUYTRs",
      title: "GTA Online: The Cayo Perico Heist",
      channelId: "UC6VcWc1rAoWdBCM0JxrRQ3A",
      authorUrl: "https://www.youtube.com/@RockstarGames",
    },
  },
  {
    id: "auto-shop",
    rank: 5,
    title: { en: "Auto Shop", zh: "改車舖" },
    highlight: {
      en: "Tuner Contracts and customer car deliveries from your Auto Shop — short prep loops for active play.",
      zh: "改車舖合約與客戶改裝車交付 — 適合主動遊玩的短準備循環。",
    },
    source: {
      name: { en: "Rockstar Newswire", zh: "Rockstar Newswire" },
      title: {
        en: "Los Santos Tuners Coming July 20",
        zh: "洛聖都改裝文化 7 月 20 日登場",
      },
      url: "https://www.rockstargames.com/newswire/article/25o1829o5o4993/los-santos-tuners-coming-july-20",
      date: "2021-07-13",
    },
    trailer: {
      videoId: "mP6KvFnltWc",
      title: "GTA Online: Los Santos Tuners — Out Now",
      channelId: "UC6VcWc1rAoWdBCM0JxrRQ3A",
      authorUrl: "https://www.youtube.com/@RockstarGames",
    },
  },
  {
    id: "bunker",
    rank: 6,
    title: { en: "Bunker (Gunrunning)", zh: "地堡（軍火走私）" },
    highlight: {
      en: "Weapons research + manufacture/sell loop; strong Nightclub feeder and frequent Newswire bonus target.",
      zh: "武器研發與產銷循環；夜總會重要進貨來源，也常是 Newswire 加倍週目標。",
    },
    source: {
      name: { en: "Rockstar Newswire", zh: "Rockstar Newswire" },
      title: {
        en: "Gunrunning Pays Dividends in GTA Online with Bunker Bonuses",
        zh: "GTA Online 軍火走私地堡獎勵",
      },
      url: "https://www.rockstargames.com/newswire/article/511aoa4828o771/gunrunning-pays-dividends-in-gta-online-with-bunker-bonuses",
      date: "2025-02-27",
    },
    trailer: {
      videoId: "TOTCzcYzYuc",
      title: "GTA Online: Gunrunning Trailer",
      channelId: "UC6VcWc1rAoWdBCM0JxrRQ3A",
      authorUrl: "https://www.youtube.com/@RockstarGames",
    },
  },
  {
    id: "hangar",
    rank: 7,
    title: { en: "Hangar (Smuggler's Run)", zh: "機庫（走私跑）" },
    highlight: {
      en: "Air cargo source/sell from your Hangar — pairs with Nightclub air goods once you want a full feeder set.",
      zh: "從機庫進行空運貨物產銷 — 想湊齊夜總會進貨網時再買。",
    },
    source: {
      name: { en: "Rockstar Newswire", zh: "Rockstar Newswire" },
      title: {
        en: "GTA Online: Smuggler's Run Now Available",
        zh: "GTA Online：Smuggler's Run 現已推出",
      },
      url: "https://www.rockstargames.com/newswire/article/ak14o8838a9a51/GTA-Online-Smuggler-s-Run-Now-Available",
      date: "2017-08-29",
    },
    trailer: {
      videoId: "KI1ukKxPsGc",
      title: "GTA Online: Smuggler's Run Trailer",
      channelId: "UC6VcWc1rAoWdBCM0JxrRQ3A",
      authorUrl: "https://www.youtube.com/@RockstarGames",
    },
  },
  {
    id: "salvage-yard",
    rank: 8,
    title: { en: "Salvage Yard", zh: "廢車場" },
    highlight: {
      en: "Weekly Salvage Yard Robberies plus tow/salvage — sell to Yusuf or strip for parts over time.",
      zh: "每週廢車場搶劫加上拖吊／拆解 — 可賣給 Yusuf 或慢慢拆零件。",
    },
    source: {
      name: { en: "Rockstar Newswire", zh: "Rockstar Newswire" },
      title: {
        en: "GTA Online: The Chop Shop Now Available",
        zh: "GTA Online：The Chop Shop 現已推出",
      },
      url: "https://www.rockstargames.com/newswire/article/75k3149ko747ka/gta-online-the-chop-shop-now-available",
      date: "2023-12-12",
    },
    trailer: {
      videoId: "Sp1wvWZ_2MQ",
      title: "GTA Online: The Chop Shop Now Available",
      channelId: "UC6VcWc1rAoWdBCM0JxrRQ3A",
      authorUrl: "https://www.youtube.com/@RockstarGames",
    },
  },
];

function pickLocale(map, lang) {
  const ui = lang === "zh" ? "zh" : "en";
  if (!map || typeof map !== "object") return "";
  return String(map[ui] || map.en || "").trim();
}

/**
 * Solo-friendly when the existing highlight already says so (EN solo / ZH 單人).
 * No invented tags — filter only surfaces copy we already publish.
 */
export function isSoloFriendlyBusiness(item) {
  const blob = `${pickLocale(item?.highlight, "en")} ${pickLocale(item?.highlight, "zh")}`;
  return /\bsolo(?:-friendly)?\b|單人/.test(blob);
}

/** localStorage key for evergreen “I own” inventory (not week-keyed). */
export const BIZ_OWNED_STORAGE_KEY = "sessionscan:biz-owned";

/** Known business ids from BUSINESS_RANKING — owned list never invents ids. */
export function knownBusinessIds(items = BUSINESS_RANKING) {
  return new Set(items.map((b) => b?.id).filter((id) => typeof id === "string" && id));
}

/**
 * @param {Storage} [store]
 * @returns {Set<string>}
 */
export function loadOwnedBusinessIds(store = globalThis.localStorage) {
  const known = knownBusinessIds();
  const out = new Set();
  if (!store) return out;
  try {
    const raw = store.getItem(BIZ_OWNED_STORAGE_KEY);
    if (!raw) return out;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return out;
    for (const id of parsed) {
      if (typeof id === "string" && known.has(id)) out.add(id);
    }
  } catch {
    /* corrupt → empty */
  }
  return out;
}

/**
 * @param {Iterable<string>} ids
 * @param {Storage} [store]
 */
export function saveOwnedBusinessIds(ids, store = globalThis.localStorage) {
  if (!store) return;
  const known = knownBusinessIds();
  const list = [...new Set([...ids].filter((id) => typeof id === "string" && known.has(id)))].sort();
  try {
    store.setItem(BIZ_OWNED_STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* quota / private mode — ignore */
  }
}

/** @returns {Set<string>} */
export function clearOwnedBusinessIds(store = globalThis.localStorage) {
  saveOwnedBusinessIds([], store);
  return new Set();
}

/**
 * Toggle one known business id; returns the new owned set.
 * @param {string} id
 * @param {Storage} [store]
 * @returns {Set<string>}
 */
export function toggleOwnedBusinessId(id, store = globalThis.localStorage) {
  const known = knownBusinessIds();
  const next = loadOwnedBusinessIds(store);
  if (typeof id !== "string" || !known.has(id)) return next;
  if (next.has(id)) next.delete(id);
  else next.add(id);
  saveOwnedBusinessIds(next, store);
  return next;
}

/**
 * Plain-text owned inventory for clipboard / Discord / LINE.
 * Rank order only; titles + Rockstar source URLs — never invent GTA$.
 * @param {Iterable<string>} ids
 * @param {{ lang?: string, siteUrl?: string }} [opts]
 */
export function formatOwnedBusinessesPlainText(ids, { lang = "en", siteUrl = "" } = {}) {
  const ui = lang === "zh" ? "zh" : "en";
  const wanted = new Set(
    [...(ids || [])].filter((id) => typeof id === "string" && knownBusinessIds().has(id)),
  );
  const lines = [t("bizOwnedCopyHeading", {}, ui)];
  for (const item of BUSINESS_RANKING) {
    if (!wanted.has(item.id)) continue;
    const title = pickLocale(item.title, ui);
    const highlight = pickLocale(item.highlight, ui);
    if (!title) continue;
    lines.push(highlight ? `• ${title} — ${highlight}` : `• ${title}`);
    const src = String(item?.source?.url || "").trim();
    if (src) lines.push(`  ${src}`);
  }
  lines.push("");
  const page =
    siteUrl ||
    (ui === "zh" ? `${CARD_SITE_BASE}zh/guides/businesses/` : `${CARD_SITE_BASE}guides/businesses/`);
  lines.push(page);
  return lines.join("\n");
}

/** Format ISO day for display (keeps YYYY-MM-DD — stable across locales). */
export function formatSourceDate(isoDay) {
  const m = String(isoDay || "").trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : "";
}

/**
 * Reject rows that claim GTA$ / digit payouts without a figureUrl.
 * Why: proposal forbids invented numbers; every figure needs a source URL.
 */
export function assertNoUnsourcedFigures(items = BUSINESS_RANKING) {
  const moneyish = /GTA\$|\$\s*\d|\d[\d,]*\s*(?:GTA\$|per\s*(?:hour|hr|day)|\/\s*hr)/i;
  const bad = [];
  for (const item of items) {
    const blob = `${pickLocale(item.title, "en")} ${pickLocale(item.highlight, "en")} ${pickLocale(item.highlight, "zh")}`;
    if (moneyish.test(blob) && !item.figureUrl) {
      bad.push(item.id || item.rank);
    }
    if (!item?.source?.url) bad.push(`${item.id}:missing-source`);
  }
  return bad;
}

export function businessItemListJsonLd(lang = "en") {
  const ui = lang === "zh" ? "zh" : "en";
  const pageUrl = absoluteUrl("guides/businesses/", ui);
  return {
    "@type": "ItemList",
    "@id": `${pageUrl}#itemlist`,
    name: t("pageBusinessesHeading", {}, ui),
    description: t("pageBusinessesDesc", {}, ui),
    numberOfItems: BUSINESS_RANKING.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    dateModified: BUSINESS_LIST_UPDATED,
    itemListElement: BUSINESS_RANKING.map((item) => ({
      "@type": "ListItem",
      position: item.rank,
      name: pickLocale(item.title, ui),
      url: item.source.url,
      description: pickLocale(item.highlight, ui),
    })),
  };
}

export function businessesPageJsonLd(lang = "en") {
  const ui = lang === "zh" ? "zh" : "en";
  const url = absoluteUrl("guides/businesses/", ui);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        name: t("pageBusinessesTitle", {}, ui),
        description: t("pageBusinessesDesc", {}, ui),
        url,
        inLanguage: htmlLang(ui),
        dateModified: BUSINESS_LIST_UPDATED,
        isPartOf: { "@id": `${localeHome(ui)}#website` },
        publisher: { "@id": `${SITE_ORIGIN}/#organization` },
        mainEntity: { "@id": `${url}#itemlist` },
        relatedLink: [
          absoluteUrl("week/", ui),
          absoluteUrl("guides/money/", ui),
          absoluteUrl("gta6/", ui),
        ],
      },
      businessItemListJsonLd(ui),
      organizationJsonLd(),
    ],
  };
}

export function businessesJsonLdScript(lang = "en") {
  return jsonLdScript("page-jsonld-businesses", businessesPageJsonLd(lang));
}

function sourceMetaHtml(source, ui) {
  const name = pickLocale(source.name, ui);
  const title = pickLocale(source.title, ui);
  const date = formatSourceDate(source.date);
  const dateLabel = t("bizSourceDate", { date }, ui);
  return `<span class="biz-source-name">${esc(name)}</span>
      <a class="biz-source-link" href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(title)} ↗</a>
      <time class="biz-source-date" datetime="${esc(date)}">${esc(dateLabel)}</time>`;
}

/**
 * Businesses → tip freeze CTA (reciprocal of freezeBusinessGuideLinkHtml).
 * tipWeek must be a real Rockstar-week key from listArchiveWeeks — never invent.
 */
export function businessTipFreezeLinkHtml(tipWeek, lang = "en") {
  const ui = lang === "zh" ? "zh" : "en";
  const week = String(tipWeek || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) {
    return `<p class="business-tip-freeze is-empty" id="businessTipFreezeLink" hidden></p>`;
  }
  const href = ui === "zh" ? `/zh/week/${week}/` : `/week/${week}/`;
  return `<p class="business-tip-freeze" id="businessTipFreezeLink"><a href="${esc(href)}">${esc(t("weekArchiveLatestLink", { week }, ui))}</a></p>`;
}

/**
 * Filter chips: All / Solo-friendly / Owned (+ copy / clear owned).
 * Owned is client inventory (localStorage) — not a published playstyle tag.
 */
export function businessesSoloFilterHtml(lang = "en") {
  const ui = lang === "zh" ? "zh" : "en";
  const copyLabel = t("bizOwnedCopy", {}, ui);
  const copyAria = t("bizOwnedCopyAria", {}, ui);
  const copied = t("bizOwnedCopied", {}, ui);
  const heading = t("bizOwnedCopyHeading", {}, ui);
  const pageUrl =
    ui === "zh" ? `${CARD_SITE_BASE}zh/guides/businesses/` : `${CARD_SITE_BASE}guides/businesses/`;
  return `<div class="biz-filter" id="bizFilter" role="group" aria-label="${esc(t("bizFilterAria", {}, ui))}">
      <button type="button" class="biz-filter-btn is-active" data-biz-filter="all" aria-pressed="true">${esc(t("bizFilterAll", {}, ui))}</button>
      <button type="button" class="biz-filter-btn" data-biz-filter="solo" aria-pressed="false">${esc(t("bizFilterSolo", {}, ui))}</button>
      <button type="button" class="biz-filter-btn" data-biz-filter="owned" aria-pressed="false">${esc(t("bizFilterOwned", {}, ui))}</button>
    </div>
    <p class="biz-owned-toolbar">
      <button type="button" class="biz-owned-copy" id="bizOwnedCopy" hidden data-i18n="bizOwnedCopy" data-i18n-aria="bizOwnedCopyAria" data-i18n-copy="${esc(copyLabel)}" data-i18n-copied="${esc(copied)}" data-owned-heading="${esc(heading)}" data-owned-page="${esc(pageUrl)}" aria-label="${esc(copyAria)}">${esc(copyLabel)}</button>
      <button type="button" class="biz-owned-clear" id="bizOwnedClear" hidden data-i18n-aria="bizOwnedClearAria" aria-label="${esc(t("bizOwnedClearAria", {}, ui))}">${esc(t("bizOwnedClear", {}, ui))}</button>
    </p>
    <p class="biz-filter-empty" id="bizFilterEmpty" hidden>${esc(t("bizFilterEmpty", {}, ui))}</p>`;
}

/** Inline All/Solo/Owned filter + own checkboxes — static pages have no module entry. */
export function businessesSoloFilterScript() {
  return `<script data-biz-solo-filter>
(function () {
  var STORAGE_KEY = ${JSON.stringify(BIZ_OWNED_STORAGE_KEY)};
  var KNOWN = ${JSON.stringify([...knownBusinessIds()])};
  function knownSet() {
    var s = {};
    for (var i = 0; i < KNOWN.length; i++) s[KNOWN[i]] = 1;
    return s;
  }
  function loadOwned() {
    var out = {};
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return out;
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return out;
      var known = knownSet();
      for (var i = 0; i < parsed.length; i++) {
        var id = parsed[i];
        if (typeof id === "string" && known[id]) out[id] = 1;
      }
    } catch (e) {}
    return out;
  }
  function saveOwned(map) {
    var list = [];
    for (var id in map) if (map[id]) list.push(id);
    list.sort();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (e) {}
  }
  function ownedCount(map) {
    var n = 0;
    for (var id in map) if (map[id]) n += 1;
    return n;
  }
  function currentMode(host) {
    var active = host && host.querySelector(".biz-filter-btn.is-active");
    return (active && active.getAttribute("data-biz-filter")) || "all";
  }
  function syncToolbar(map) {
    var empty = ownedCount(map) === 0;
    var clear = document.getElementById("bizOwnedClear");
    var copy = document.getElementById("bizOwnedCopy");
    if (clear) clear.hidden = empty;
    if (copy) copy.hidden = empty;
  }
  function ownedPlainText(map) {
    var copy = document.getElementById("bizOwnedCopy");
    var heading = (copy && copy.getAttribute("data-owned-heading")) || "";
    var page = (copy && copy.getAttribute("data-owned-page")) || "";
    var lines = [];
    if (heading) lines.push(heading);
    var list = document.querySelector(".biz-rank-list");
    var items = list ? list.querySelectorAll(".biz-rank-item") : [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var id = item.getAttribute("data-biz-id") || "";
      if (!map[id]) continue;
      var titleEl = item.querySelector(".biz-rank-title");
      var hiEl = item.querySelector(".biz-rank-highlight");
      var title = titleEl ? String(titleEl.textContent || "").trim() : "";
      var hi = hiEl ? String(hiEl.textContent || "").trim() : "";
      if (!title) continue;
      lines.push(hi ? "• " + title + " — " + hi : "• " + title);
      var src = item.querySelector(".biz-rank-source a");
      var href = src ? src.getAttribute("href") || "" : "";
      if (href) lines.push("  " + href);
    }
    lines.push("");
    lines.push(page);
    return lines.join("\\n");
  }
  function hydrate(map) {
    var list = document.querySelector(".biz-rank-list");
    if (!list) return;
    var items = list.querySelectorAll(".biz-rank-item");
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var id = item.getAttribute("data-biz-id") || "";
      var on = !!map[id];
      item.setAttribute("data-owned", on ? "1" : "0");
      if (on) item.classList.add("is-owned");
      else item.classList.remove("is-owned");
      var check = item.querySelector(".biz-own-check");
      if (check) check.checked = on;
    }
    syncToolbar(map);
  }
  function apply(mode) {
    var list = document.querySelector(".biz-rank-list");
    var empty = document.getElementById("bizFilterEmpty");
    var host = document.getElementById("bizFilter");
    if (!list || !host) return;
    var items = list.querySelectorAll(".biz-rank-item");
    var visible = 0;
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var solo = item.getAttribute("data-solo") === "1";
      var owned = item.getAttribute("data-owned") === "1";
      var show = true;
      if (mode === "solo") show = solo;
      else if (mode === "owned") show = owned;
      item.hidden = !show;
      if (show) visible += 1;
    }
    if (empty) empty.hidden = visible > 0;
    var buttons = host.querySelectorAll(".biz-filter-btn");
    for (var j = 0; j < buttons.length; j++) {
      var btn = buttons[j];
      var on = btn.getAttribute("data-biz-filter") === mode;
      if (on) btn.classList.add("is-active");
      else btn.classList.remove("is-active");
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    }
  }
  document.addEventListener("DOMContentLoaded", function () {
    var host = document.getElementById("bizFilter");
    var list = document.querySelector(".biz-rank-list");
    if (!host || !list || host.getAttribute("data-filter-bound") === "1") return;
    host.setAttribute("data-filter-bound", "1");
    var map = loadOwned();
    hydrate(map);
    host.addEventListener("click", function (ev) {
      var btn = ev.target && ev.target.closest ? ev.target.closest(".biz-filter-btn") : null;
      if (!btn || !host.contains(btn)) return;
      apply(btn.getAttribute("data-biz-filter") || "all");
    });
    list.addEventListener("change", function (ev) {
      var check = ev.target && ev.target.classList && ev.target.classList.contains("biz-own-check")
        ? ev.target
        : null;
      if (!check) return;
      var id = check.getAttribute("data-biz-id") || "";
      var known = knownSet();
      if (!id || !known[id]) return;
      if (check.checked) map[id] = 1;
      else delete map[id];
      saveOwned(map);
      hydrate(map);
      apply(currentMode(host));
    });
    var clear = document.getElementById("bizOwnedClear");
    if (clear && clear.getAttribute("data-clear-bound") !== "1") {
      clear.setAttribute("data-clear-bound", "1");
      clear.addEventListener("click", function () {
        map = {};
        saveOwned(map);
        hydrate(map);
        apply(currentMode(host));
      });
    }
    var copy = document.getElementById("bizOwnedCopy");
    if (copy && copy.getAttribute("data-copy-bound") !== "1") {
      copy.setAttribute("data-copy-bound", "1");
      copy.addEventListener("click", function () {
        if (ownedCount(map) === 0) return;
        var text = ownedPlainText(map);
        var labelCopy = copy.getAttribute("data-i18n-copy") || copy.textContent || "Copy owned";
        var labelCopied = copy.getAttribute("data-i18n-copied") || "Copied";
        function painted() {
          copy.textContent = labelCopied;
          copy.setAttribute("aria-label", labelCopied);
          copy.classList.add("is-copied");
          window.setTimeout(function () {
            copy.textContent = labelCopy;
            copy.setAttribute("aria-label", copy.getAttribute("data-i18n-aria") || labelCopy);
            copy.classList.remove("is-copied");
          }, 1600);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(painted).catch(function () {});
        }
      });
    }
    apply("all");
  });
})();
</script>`;
}

/**
 * Official Rockstar trailer only. Anything else (fan reupload, IGN, a stale
 * channel id) renders nothing — the Newswire link stays, no extra iframe.
 */
export function isVerifiedRockstarTrailer(trailer) {
  if (!trailer || typeof trailer !== "object") return false;
  const id = String(trailer.videoId || "");
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return false;
  if (trailer.channelId !== ROCKSTAR_GAMES_YT_CHANNEL_ID) return false;
  const author = String(trailer.authorUrl || "").replace(/\/+$/, "").toLowerCase();
  if (author !== ROCKSTAR_GAMES_YT_AUTHOR_URL.toLowerCase()) return false;
  if (!String(trailer.title || "").trim()) return false;
  return true;
}

/** youtube-nocookie embed beside the Newswire source. Empty when unverified. */
export function businessTrailerEmbedHtml(item, lang = "en") {
  const trailer = item?.trailer;
  if (!isVerifiedRockstarTrailer(trailer)) return "";
  const ui = lang === "zh" ? "zh" : "en";
  const title = t("bizOfficialTrailerTitle", { title: trailer.title }, ui);
  const src = `https://www.youtube-nocookie.com/embed/${trailer.videoId}`;
  return `<div class="biz-trailer">
        <iframe src="${esc(src)}" title="${esc(title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
      </div>`;
}

/** Ranked list + methodology + last-updated chrome for the Businesses page body. */
export function businessesPageBodyHtml(lang = "en", { tipWeek = "" } = {}) {
  const ui = lang === "zh" ? "zh" : "en";
  const updated = formatSourceDate(BUSINESS_LIST_UPDATED);
  const consensus = RANKING_CONSENSUS;
  const consensusLabel = pickLocale(consensus.label, ui);
  const consensusDate = formatSourceDate(consensus.date);

  const items = BUSINESS_RANKING.map((item) => {
    const title = pickLocale(item.title, ui);
    const highlight = pickLocale(item.highlight, ui);
    const solo = isSoloFriendlyBusiness(item);
    const ownLabel = t("bizOwnLabel", {}, ui);
    const trailer = businessTrailerEmbedHtml(item, ui);
    const source = `<p class="biz-rank-source">${sourceMetaHtml(item.source, ui)}</p>`;
    const sourceRow = trailer
      ? `<div class="biz-source-row">${source}${trailer}</div>`
      : source;
    return `<li class="biz-rank-item" data-biz-id="${esc(item.id)}" data-rank="${esc(String(item.rank))}" data-solo="${solo ? "1" : "0"}" data-owned="0">
      <div class="biz-rank-num" aria-hidden="true">${esc(String(item.rank))}</div>
      <div class="biz-rank-body">
        <h2 class="biz-rank-title">${esc(title)}</h2>
        <p class="biz-rank-highlight">${esc(highlight)}</p>
        ${sourceRow}
        <label class="biz-own-claim">
          <input type="checkbox" class="biz-own-check" data-biz-id="${esc(item.id)}" />
          <span class="biz-own-claim-text">${esc(ownLabel)}</span>
        </label>
      </div>
    </li>`;
  }).join("\n");

  const home = ui === "zh" ? "/zh/" : "/";
  return `<p class="biz-updated">${t("bizUpdatedHtml", { date: updated }, ui)}</p>
    <div class="page-body biz-intro">${t("pageBusinessesBody", {}, ui)}</div>
    <p class="biz-methodology">
      <span>${esc(t("bizMethodologyLabel", {}, ui))}</span>
      <a href="${esc(consensus.url)}" target="_blank" rel="noopener noreferrer">${esc(consensusLabel)} ↗</a>
      <time datetime="${esc(consensusDate)}">${esc(t("bizSourceDate", { date: consensusDate }, ui))}</time>
    </p>
    ${businessesSoloFilterHtml(ui)}
    <ol class="biz-rank-list" data-biz-count="${BUSINESS_RANKING.length}">
      ${items}
    </ol>
    <p class="biz-disclaimer">${esc(t("bizDisclaimer", {}, ui))}</p>
    <p class="business-week-link"><a href="${esc(home)}">${esc(t("businessWeekLink", {}, ui))}</a></p>
    ${businessTipFreezeLinkHtml(tipWeek, ui)}`;
}

/** Home → `/guides/businesses/` discovery link (reciprocal of businessWeekLink). */
export function homeBusinessGuideLinkHtml(lang = "en") {
  const ui = lang === "zh" ? "zh" : "en";
  const href = ui === "zh" ? "/zh/guides/businesses/" : "/guides/businesses/";
  return `<p class="home-business-link" id="homeBusinessGuideLink"><a href="${esc(href)}" data-i18n="homeBusinessGuideLink">${esc(t("homeBusinessGuideLink", {}, ui))}</a></p>`;
}

/**
 * Inject home businesses discovery under #view-jobs (after money link when present).
 * Single source with businesses page path — never invents a guides URL.
 */
export function injectHomeBusinessGuideLink(html, { lang = "en" } = {}) {
  let out = String(html || "");
  const ui = lang === "zh" ? "zh" : "en";
  const body = homeBusinessGuideLinkHtml(ui);
  if (/id="homeBusinessGuideLink"/.test(out)) {
    out = out.replace(/<p class="home-business-link"[^>]*>[\s\S]*?<\/p>/, body);
  } else if (/id="homeMoneyGuideLink"/.test(out)) {
    out = out.replace(
      /(<p class="home-money-link"[^>]*>[\s\S]*?<\/p>)/,
      `$1\n        ${body}`,
    );
  } else if (/id="jobHint"/.test(out)) {
    out = out.replace(/(<p class="source-hint" id="jobHint"><\/p>)/, `$1\n        ${body}`);
  } else if (/id="view-jobs"/.test(out)) {
    out = out.replace(
      /(<section class="view" id="view-jobs">)/,
      `$1\n        ${body}`,
    );
  }
  return out;
}
