/**
 * GTA 6 shell page — official Rockstar announcements / dates only.
 * Single source for /gta6/ (+ /zh/): countdown to the announced release day,
 * outbound Rockstar links, and Event JSON-LD. No leaks, no rumor-as-fact.
 */

import { CARD_SITE_BASE } from "./cardShare.js";
import { SITE_ORIGIN, htmlLang, localeHome, t } from "./i18n.js";
import { countdownParts } from "./thisWeekHome.js";
import { organizationJsonLd } from "./structuredData.js";

/** Rockstar-announced release calendar day (UTC midnight). */
export const GTA6_RELEASE_ISO_DATE = "2026-11-19";

/** Canonical Rockstar VI hub — citation for the announced date. */
export const GTA6_OFFICIAL_URL = "https://www.rockstargames.com/VI";

export const GTA6_NEWSWIRE_URL = "https://www.rockstargames.com/newswire";

/** UTC midnight of the announced release day. */
export function gta6ReleaseAt() {
  return new Date(`${GTA6_RELEASE_ISO_DATE}T00:00:00.000Z`);
}

/**
 * Format a compact countdown string (matches home week countdown shape).
 * @param {{ days: number, hours: number, minutes: number, seconds: number, totalMs: number }} parts
 */
export function formatGta6Countdown(parts) {
  if (!parts || parts.totalMs <= 0) return "";
  const dd = String(parts.days);
  const hh = String(parts.hours).padStart(2, "0");
  const mm = String(parts.minutes).padStart(2, "0");
  const ss = String(parts.seconds).padStart(2, "0");
  return `${dd}d ${hh}:${mm}:${ss}`;
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function pageUrl(lang = "en") {
  const ui = lang === "zh" ? "zh" : "en";
  return `${CARD_SITE_BASE}${ui === "zh" ? "zh/" : ""}gta6/`;
}

/**
 * WebPage + Event graph for the announced Rockstar release date.
 * Event.startDate is the official calendar day only — not a leak clock.
 */
export function gta6PageJsonLd(lang = "en") {
  const ui = lang === "zh" ? "zh" : "en";
  const url = pageUrl(ui);
  const relatedPrefix = ui === "zh" ? `${CARD_SITE_BASE}zh/` : CARD_SITE_BASE;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        name: t("pageGta6Title", {}, ui),
        description: t("pageGta6Desc", {}, ui),
        url,
        inLanguage: htmlLang(ui),
        isPartOf: { "@id": `${localeHome(ui)}#website` },
        publisher: { "@id": `${SITE_ORIGIN}/#organization` },
        relatedLink: [`${relatedPrefix}`, `${relatedPrefix}about/`],
        mainEntity: { "@id": `${url}#release` },
      },
      {
        "@type": "Event",
        "@id": `${url}#release`,
        name: t("pageGta6EventName", {}, ui),
        description: t("pageGta6EventDesc", {}, ui),
        startDate: GTA6_RELEASE_ISO_DATE,
        eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
        eventStatus: "https://schema.org/EventScheduled",
        url: GTA6_OFFICIAL_URL,
        organizer: {
          "@type": "Organization",
          name: "Rockstar Games",
          url: "https://www.rockstargames.com/",
        },
        location: {
          "@type": "VirtualLocation",
          url: GTA6_OFFICIAL_URL,
        },
      },
      organizationJsonLd(),
    ],
  };
}

/** Inline tick — same shape as home week countdown; reserves min-height via CSS. */
export function gta6CountdownScript() {
  return `<script>
(function () {
  var el = document.getElementById("gta6CountdownDisplay");
  if (!el) return;
  var targetMs = Date.parse(el.getAttribute("data-target") || "");
  if (!Number.isFinite(targetMs)) return;
  var live = el.getAttribute("data-live") || "";
  function pad(n) { return String(n).padStart(2, "0"); }
  function tick() {
    var ms = Math.max(0, targetMs - Date.now());
    if (ms <= 0) {
      el.textContent = live;
      return;
    }
    var days = Math.floor(ms / 86400000);
    ms -= days * 86400000;
    var hours = Math.floor(ms / 3600000);
    ms -= hours * 3600000;
    var minutes = Math.floor(ms / 60000);
    ms -= minutes * 60000;
    var seconds = Math.floor(ms / 1000);
    el.textContent = days + "d " + pad(hours) + ":" + pad(minutes) + ":" + pad(seconds);
  }
  tick();
  setInterval(tick, 1000);
})();
</script>`;
}

/**
 * Body for /gta6/ — official date, live countdown, Rockstar outbound links.
 * @param {string} [lang]
 * @param {Date} [now] injectable for tests
 */
export function renderGta6PageBody(lang = "en", now = new Date()) {
  const ui = lang === "zh" ? "zh" : "en";
  const target = gta6ReleaseAt();
  const parts = countdownParts(target, now);
  const display =
    parts.totalMs > 0
      ? formatGta6Countdown(parts)
      : t("pageGta6CountdownLive", {}, ui);
  return `<h1 data-i18n="pageGta6Heading">${esc(t("pageGta6Heading", {}, ui))}</h1>
      <div class="page-body" data-i18n-html="pageGta6Body">${t("pageGta6Body", {}, ui)}</div>
      <section class="gta6-countdown" aria-labelledby="gta6-countdown-heading">
        <div class="week-panel-kicker">
          <strong id="gta6-countdown-heading">${esc(t("pageGta6CountdownKicker", {}, ui))}</strong>
          <span>${esc(t("pageGta6CountdownTag", {}, ui))}</span>
        </div>
        <p
          class="week-countdown-display"
          id="gta6CountdownDisplay"
          data-target="${esc(target.toISOString())}"
          data-live="${esc(t("pageGta6CountdownLive", {}, ui))}"
        >${esc(display)}</p>
        <p class="gta6-countdown-source">
          <a href="${esc(GTA6_OFFICIAL_URL)}" target="_blank" rel="noopener noreferrer">${esc(t("pageGta6SourceNote", { date: GTA6_RELEASE_ISO_DATE }, ui))}</a>
        </p>
      </section>
      <ul class="page-links">
        <li><a href="${esc(GTA6_OFFICIAL_URL)}" target="_blank" rel="noopener noreferrer">${esc(t("pageGta6Official", {}, ui))}</a></li>
        <li><a href="${esc(GTA6_NEWSWIRE_URL)}" target="_blank" rel="noopener noreferrer">${esc(t("pageGta6Newswire", {}, ui))}</a></li>
      </ul>`;
}
