/**
 * Phase C Money guide: evergreen routes ranked by cited take, plus a simple
 * $/hr calculator. Every GTA$ figure must carry a source URL + date — no invented numbers.
 */

import { CARD_SITE_BASE } from "./cardShare.js";
import { SITE_ORIGIN, UI, htmlLang, localeHome, t } from "./i18n.js";
import { organizationJsonLd } from "./structuredData.js";

/** SessionScan verified these citations (not a Rockstar patch date). */
export const MONEY_LAST_UPDATED = "2026-10-12";

/**
 * Evergreen money routes. `takeGta` is the ranked figure; only include values
 * that appear on the linked source page.
 */
export const MONEY_ROUTES = [
  {
    id: "cayo-pink-diamond",
    title: { en: "Cayo Perico Heist — Pink Diamond", zh: "佩里克島搶劫 — 粉紅鑽石" },
    highlight: {
      en: "Solo-capable island heist · primary target (normal difficulty).",
      zh: "可單人完成的島嶼搶劫 · 主要目標（普通難度）。",
    },
    takeGta: 1_300_000,
    takeLabel: { en: "Primary target (normal)", zh: "主要目標（普通）" },
    sourceName: "GTA Wiki",
    sourceUrl: "https://gta.fandom.com/wiki/The_Cayo_Perico_Heist/Finale",
    sourceDate: "2023-09-28",
  },
  {
    id: "dre-finale",
    title: { en: "Don't Fuck With Dre (Agency finale)", zh: "Don't Fuck With Dre（事務所結局）" },
    highlight: {
      en: "Agency VIP Contract finale · host payout cited on GTA Wiki.",
      zh: "事務所 VIP 合約結局 · 隊長分紅見 GTA Wiki。",
    },
    takeGta: 1_000_000,
    takeLabel: { en: "Host finale payout", zh: "隊長結局分紅" },
    sourceName: "GTA Wiki",
    sourceUrl: "https://gta.fandom.com/wiki/Don%27t_Fuck_With_Dre",
    sourceDate: "2021-12-15",
  },
  {
    id: "cluckin-bell",
    title: { en: "Cluckin' Bell Farm Raid finale", zh: "Cluckin' Bell 農場突襲結局" },
    highlight: {
      en: "Fixed leader take · free contact strand (no property required).",
      zh: "隊長固定分紅 · 免費聯絡任務線（不需產業）。",
    },
    takeGta: 500_000,
    takeLabel: { en: "Leader finale payout", zh: "隊長結局分紅" },
    sourceName: "GTA Wiki",
    sourceUrl: "https://gta.fandom.com/wiki/The_Cluckin%27_Bell_Farm_Raid",
    sourceDate: "2024-03-07",
  },
  {
    id: "salvage-stinger-tt",
    title: { en: "Salvage Yard robbery — sell example", zh: "廢車場搶劫 — 販售範例" },
    highlight: {
      en: "Weekly target cars vary · cited max sell for Grotti Stinger TT (week of 2026-01-29).",
      zh: "每週目標車不同 · 引用 Grotti Stinger TT 最高販售價（2026-01-29 當週）。",
    },
    takeGta: 402_000,
    takeLabel: { en: "Max sell value (that week)", zh: "最高販售價（該週）" },
    sourceName: "GTA Wiki",
    sourceUrl: "https://gta.fandom.com/wiki/Salvage_Yard_Robberies",
    sourceDate: "2026-01-29",
  },
  {
    id: "union-depository",
    title: { en: "Union Depository Contract (solo)", zh: "聯儲銀行合約（單人）" },
    highlight: {
      en: "Auto Shop Robbery Contract · solo leader cut after Sessanta/KDJ 10%.",
      zh: "改裝工坊搶劫合約 · 單人隊長分紅（已扣 Sessanta／KDJ 10%）。",
    },
    takeGta: 270_000,
    takeLabel: { en: "Solo leader cut", zh: "單人隊長分紅" },
    sourceName: "GTA Wiki",
    sourceUrl: "https://gta.fandom.com/wiki/The_Union_Depository_Contract/Finale",
    sourceDate: "2021-09-02",
  },
];

export function moneyRoutesRanked(routes = MONEY_ROUTES) {
  return [...routes].sort((a, b) => Number(b.takeGta) - Number(a.takeGta) || String(a.id).localeCompare(String(b.id)));
}

export function formatGtaMoney(amount) {
  const n = Math.round(Number(amount));
  if (!Number.isFinite(n)) return "";
  return `GTA$${n.toLocaleString("en-US")}`;
}

/** Rough $/hr from cited take + player-entered minutes. Returns null if inputs invalid. */
export function dollarsPerHour(takeGta, minutes) {
  const take = Number(takeGta);
  const mins = Number(minutes);
  if (!Number.isFinite(take) || take < 0) return null;
  if (!Number.isFinite(mins) || mins <= 0) return null;
  return Math.round((take / mins) * 60);
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function pickLang(field, ui) {
  if (field && typeof field === "object") return field[ui] || field.en || "";
  return String(field ?? "");
}

export function moneyGuideJsonLd(lang = "en") {
  const ui = lang === "zh" ? "zh" : "en";
  const path = "guides/money/";
  const url = `${CARD_SITE_BASE}${ui === "zh" ? "zh/" : ""}${path}`;
  const ranked = moneyRoutesRanked();
  const relatedPrefix = ui === "zh" ? `${CARD_SITE_BASE}zh/` : CARD_SITE_BASE;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        name: t("pageMoneyTitle", {}, ui),
        description: t("pageMoneyDesc", {}, ui),
        url,
        inLanguage: htmlLang(ui),
        dateModified: MONEY_LAST_UPDATED,
        isPartOf: { "@id": `${localeHome(ui)}#website` },
        publisher: { "@id": `${SITE_ORIGIN}/#organization` },
        relatedLink: [
          `${relatedPrefix}week/`,
          `${relatedPrefix}guides/businesses/`,
          `${relatedPrefix}gta6/`,
        ],
      },
      {
        "@type": "ItemList",
        "@id": `${url}#routes`,
        name: t("moneyRankHeading", {}, ui),
        numberOfItems: ranked.length,
        itemListOrder: "https://schema.org/ItemListOrderDescending",
        itemListElement: ranked.map((route, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: pickLang(route.title, ui),
          url: route.sourceUrl,
          description: `${formatGtaMoney(route.takeGta)} · ${pickLang(route.takeLabel, ui)}`,
        })),
      },
      organizationJsonLd(),
    ],
  };
}

function routeOptionsHtml(ranked, ui) {
  return ranked
    .map((route) => {
      const label = `${pickLang(route.title, ui)} — ${formatGtaMoney(route.takeGta)}`;
      return `<option value="${esc(route.id)}" data-take="${esc(route.takeGta)}">${esc(label)}</option>`;
    })
    .join("");
}

function rankListHtml(ranked, ui) {
  return ranked
    .map((route, i) => {
      const title = pickLang(route.title, ui);
      const highlight = pickLang(route.highlight, ui);
      const takeLabel = pickLang(route.takeLabel, ui);
      const sourceLabel = t("moneySourceMeta", { source: route.sourceName, date: route.sourceDate }, ui);
      return `<li class="money-route" data-money-id="${esc(route.id)}" data-take="${esc(route.takeGta)}">
        <div class="money-route-rank" aria-hidden="true">${i + 1}</div>
        <div class="money-route-body">
          <h2 class="money-route-title">${esc(title)}</h2>
          <p class="money-route-highlight">${esc(highlight)}</p>
          <p class="money-route-take"><span class="money-route-take-value">${esc(formatGtaMoney(route.takeGta))}</span> <span class="money-route-take-label">${esc(takeLabel)}</span></p>
          <p class="money-route-source"><a href="${esc(route.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(sourceLabel)}</a></p>
        </div>
      </li>`;
    })
    .join("");
}

/** Inline calculator — static pages have no bundled module entry. */
export function moneyCalculatorScript() {
  return `<script data-money-calculator>
(function () {
  function parseTake(el) {
    var opt = el && el.options && el.options[el.selectedIndex];
    if (!opt) return NaN;
    return Number(opt.getAttribute("data-take"));
  }
  function dollarsPerHour(take, minutes) {
    var t = Number(take);
    var m = Number(minutes);
    if (!isFinite(t) || t < 0 || !isFinite(m) || m <= 0) return null;
    return Math.round((t / m) * 60);
  }
  function formatGta(n) {
    return "GTA$" + Math.round(n).toLocaleString("en-US");
  }
  function update() {
    var route = document.getElementById("moneyCalcRoute");
    var mins = document.getElementById("moneyCalcMinutes");
    var out = document.getElementById("moneyCalcResult");
    if (!route || !mins || !out) return;
    var take = parseTake(route);
    var rate = dollarsPerHour(take, mins.value);
    var empty = out.getAttribute("data-empty") || "";
    if (rate == null) {
      out.textContent = empty;
      return;
    }
    var tpl = out.getAttribute("data-template") || "{rate}/hr";
    out.textContent = tpl.replace("{rate}", formatGta(rate));
  }
  document.addEventListener("DOMContentLoaded", function () {
    var route = document.getElementById("moneyCalcRoute");
    var mins = document.getElementById("moneyCalcMinutes");
    if (route) route.addEventListener("change", update);
    if (mins) {
      mins.addEventListener("input", update);
      mins.addEventListener("change", update);
    }
    update();
  });
})();
</script>`;
}

export function renderMoneyGuideBody(lang = "en") {
  const ui = lang === "zh" ? "zh" : "en";
  const ranked = moneyRoutesRanked();
  const home = ui === "zh" ? "/zh/" : "/";
  // Raw pack string — do not run through t()/interpolate or `{rate}` is wiped.
  const calcTemplate = String((UI[ui] || UI.en).moneyCalcResult || UI.en.moneyCalcResult || "{rate}/hr");
  return `<p class="money-updated">${esc(t("moneyLastUpdated", { date: MONEY_LAST_UPDATED }, ui))}</p>
      <div class="page-body money-intro" data-i18n-html="pageMoneyBody">${t("pageMoneyBody", {}, ui)}</div>
      <section class="money-rank" aria-labelledby="money-rank-heading">
        <h2 id="money-rank-heading">${esc(t("moneyRankHeading", {}, ui))}</h2>
        <p class="money-rank-note">${esc(t("moneyRankNote", {}, ui))}</p>
        <ol class="money-route-list">
          ${rankListHtml(ranked, ui)}
        </ol>
      </section>
      <section class="money-calc" aria-labelledby="money-calc-heading">
        <h2 id="money-calc-heading">${esc(t("moneyCalcHeading", {}, ui))}</h2>
        <p class="money-calc-note">${esc(t("moneyCalcNote", {}, ui))}</p>
        <form class="money-calc-form" id="moneyCalcForm" action="#" method="get" onsubmit="return false;">
          <label class="money-calc-field">
            <span>${esc(t("moneyCalcRoute", {}, ui))}</span>
            <select id="moneyCalcRoute" name="route">${routeOptionsHtml(ranked, ui)}</select>
          </label>
          <label class="money-calc-field">
            <span>${esc(t("moneyCalcMinutes", {}, ui))}</span>
            <input id="moneyCalcMinutes" name="minutes" type="number" inputmode="numeric" min="1" step="1" value="60" />
          </label>
          <p class="money-calc-out" id="moneyCalcResult" data-empty="${esc(t("moneyCalcEmpty", {}, ui))}" data-template="${esc(calcTemplate)}">${esc(t("moneyCalcEmpty", {}, ui))}</p>
        </form>
      </section>
      <p class="money-week-link"><a href="${esc(home)}">${esc(t("moneyWeekLink", {}, ui))}</a></p>`;
}

/** Home → `/guides/money/` discovery link (reciprocal of moneyWeekLink). */
export function homeMoneyGuideLinkHtml(lang = "en") {
  const ui = lang === "zh" ? "zh" : "en";
  const href = ui === "zh" ? "/zh/guides/money/" : "/guides/money/";
  return `<p class="home-money-link" id="homeMoneyGuideLink"><a href="${esc(href)}" data-i18n="homeMoneyGuideLink">${esc(t("homeMoneyGuideLink", {}, ui))}</a></p>`;
}

/**
 * Inject home money-guide discovery under #view-jobs / #jobHint.
 * Single source with money page path — never invents a guides URL.
 */
export function injectHomeMoneyGuideLink(html, { lang = "en" } = {}) {
  let out = String(html || "");
  const ui = lang === "zh" ? "zh" : "en";
  const body = homeMoneyGuideLinkHtml(ui);
  if (/id="homeMoneyGuideLink"/.test(out)) {
    out = out.replace(/<p class="home-money-link"[^>]*>[\s\S]*?<\/p>/, body);
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
