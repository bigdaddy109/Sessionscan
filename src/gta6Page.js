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

/** Traditional Chinese VI hub. /VI/zh-TW sets Rockstar's locale cookie, then serves /VI. */
export const GTA6_VI_ZH_URL = "https://www.rockstargames.com/VI/zh-TW";

export const GTA6_PS_FEATURES_URL = "https://www.playstation.com/GTAVIfeatures/";

export const GTA6_LEONIDA_URL = "https://www.rockstargames.com/VI/only-in-leonida";

/** Newswire article whose title is the preload date. Body is a JS shell; the VI page states the date. */
export const GTA6_PRELOAD_URL =
  "https://www.rockstargames.com/newswire/article/k4ak9okk485712/grand-theft-auto-vi-pre-load-begins-on-november-10";

export const GTA6_PRELOAD_ZH_URL =
  "https://www.rockstargames.com/tw/newswire/article/k4ak9okk485712/grand-theft-auto-vi-pre-load-begins-on-november-10";

export const GTA6_LAUNCH_TRAILER_URL =
  "https://www.rockstargames.com/newswire/article/517572321a549a/watch-the-grand-theft-auto-vi-launch-trailer";

export const GTA6_JUSTICE_URL =
  "https://www.rockstargames.com/newswire/article/39ak8a12395591/grand-theft-auto-vi-original-score-by-justice";

export function gta6ViPageUrl(lang = "en") {
  return lang === "zh" ? GTA6_VI_ZH_URL : GTA6_OFFICIAL_URL;
}

export function gta6PreloadUrl(lang = "en") {
  return lang === "zh" ? GTA6_PRELOAD_ZH_URL : GTA6_PRELOAD_URL;
}

/**
 * Official GTA VI films on rockstargames.com/VI, newest first.
 * youtubeId is set only when that page's player links a YouTube watch URL.
 * Launch Trailer, Trailer 2, and Trailer 1 have links.youtube unset there —
 * outbound official URL, no poster, no iframe. Do not invent an id.
 */
export const GTA6_FILMS = [
  {
    id: "launch-trailer",
    youtubeId: "",
    titleKey: "pageGta6FilmLaunchTitle",
    whenKey: "pageGta6FilmLaunchWhen",
    linkKey: "pageGta6FilmLaunchLink",
    href: () => GTA6_LAUNCH_TRAILER_URL,
  },
  {
    id: "extended-look",
    youtubeId: "tJbzMqJGH4k",
    titleKey: "pageGta6FilmExtendedTitle",
    whenKey: "pageGta6FilmExtendedWhen",
    noteKey: "pageGta6FilmExtendedNote",
    href: () => GTA6_OFFICIAL_TRAILER_WATCH_URL,
  },
  {
    id: "trailer-2",
    youtubeId: "",
    titleKey: "pageGta6FilmTrailer2Title",
    whenKey: "pageGta6FilmTrailer2When",
    linkKey: "homeGta6ViLink",
    href: (lang) => gta6ViPageUrl(lang),
  },
  {
    id: "trailer-1",
    youtubeId: "",
    titleKey: "pageGta6FilmTrailer1Title",
    whenKey: "pageGta6FilmTrailer1When",
    linkKey: "homeGta6ViLink",
    href: (lang) => gta6ViPageUrl(lang),
  },
];

/**
 * Official Rockstar YouTube id hosted on rockstargames.com/VI
 * (“Grand Theft Auto VI: An Extended Look” — Rockstar Games channel).
 * Poster + outbound watch only — no third-party iframe (age-gate on embed).
 */
export const GTA6_OFFICIAL_TRAILER_YOUTUBE_ID = "tJbzMqJGH4k";

export const GTA6_OFFICIAL_TRAILER_WATCH_URL =
  `https://www.youtube.com/watch?v=${GTA6_OFFICIAL_TRAILER_YOUTUBE_ID}`;

/**
 * Official YouTube thumbnail (i.ytimg.com) — static image, not an embed.
 * maxresdefault is 1280×720 for this Rockstar id, so the 16:9 poster frame
 * is not upscaling a 480×360 hqdefault (letterboxed, then object-fit: cover).
 */
export const GTA6_OFFICIAL_TRAILER_POSTER_URL =
  `https://i.ytimg.com/vi/${GTA6_OFFICIAL_TRAILER_YOUTUBE_ID}/maxresdefault.jpg`;

/** Always-available thumb if maxres 404s. Same video id — never a different clip. */
export const GTA6_OFFICIAL_TRAILER_POSTER_FALLBACK_URL =
  `https://i.ytimg.com/vi/${GTA6_OFFICIAL_TRAILER_YOUTUBE_ID}/hqdefault.jpg`;

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
        relatedLink: [
          `${relatedPrefix}week/`,
          `${relatedPrefix}guides/money/`,
          `${relatedPrefix}guides/businesses/`,
        ],
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

function outbound(href, label, { i18nKey = "" } = {}) {
  const key = i18nKey ? ` data-i18n="${esc(i18nKey)}"` : "";
  return `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer"${key}>${esc(label)}</a>`;
}

/**
 * Poster + play control for the one film whose YouTube id is on rockstargames.com/VI.
 * No youtube-nocookie iframe (age-restricted embeds fail for many visitors).
 */
export function gta6OfficialTrailerHtml(lang = "en") {
  const ui = lang === "zh" ? "zh" : "en";
  const title = t("pageGta6FilmExtendedTitle", {}, ui);
  const playAria = t("playAria", { title }, ui);
  return `<div class="gta6-trailer" id="gta6OfficialTrailer">
        <div class="gta6-trailer-frame">
          <a
            class="gta6-trailer-poster"
            id="gta6TrailerPoster"
            href="${esc(GTA6_OFFICIAL_TRAILER_WATCH_URL)}"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="${esc(playAria)}"
          >
            <img
              class="gta6-trailer-thumb"
              src="${esc(GTA6_OFFICIAL_TRAILER_POSTER_URL)}"
              alt=""
              width="1280"
              height="720"
              loading="lazy"
              decoding="async"
              data-poster-fallback="${esc(GTA6_OFFICIAL_TRAILER_POSTER_FALLBACK_URL)}"
              onerror="this.onerror=null;this.src=this.getAttribute('data-poster-fallback')"
            />
            <span class="gta6-trailer-play" aria-hidden="true"><span></span></span>
          </a>
        </div>
        <p class="gta6-trailer-source">
          <a href="${esc(GTA6_OFFICIAL_TRAILER_WATCH_URL)}" target="_blank" rel="noopener noreferrer" data-i18n="pageGta6TrailerWatch">${esc(t("pageGta6TrailerWatch", {}, ui))}</a>
          <span aria-hidden="true"> · </span>
          <a href="${esc(gta6ViPageUrl(ui))}" target="_blank" rel="noopener noreferrer" data-i18n="pageGta6TrailerVia">${esc(t("pageGta6TrailerVia", {}, ui))}</a>
        </p>
      </div>`;
}

function gta6CountdownBlock(ui, now, { source = true } = {}) {
  const target = gta6ReleaseAt();
  const parts = countdownParts(target, now);
  const display =
    parts.totalMs > 0
      ? formatGta6Countdown(parts)
      : t("pageGta6CountdownLive", {}, ui);
  const sourceHtml = source
    ? `<p class="gta6-countdown-source">${outbound(
        gta6ViPageUrl(ui),
        t("pageGta6SourceNote", { date: GTA6_RELEASE_ISO_DATE }, ui),
      )}</p>`
    : "";
  return `<div class="gta6-countdown" role="group" aria-labelledby="gta6-countdown-heading">
        <div class="week-panel-kicker">
          <strong id="gta6-countdown-heading" data-i18n="pageGta6CountdownKicker">${esc(t("pageGta6CountdownKicker", {}, ui))}</strong>
          <span data-i18n="pageGta6CountdownTag">${esc(t("pageGta6CountdownTag", {}, ui))}</span>
        </div>
        <p
          class="week-countdown-display"
          id="gta6CountdownDisplay"
          data-target="${esc(target.toISOString())}"
          data-live="${esc(t("pageGta6CountdownLive", {}, ui))}"
        >${esc(display)}</p>
        ${sourceHtml}
      </div>`;
}

function gta6FilmItemHtml(film, ui) {
  const title = t(film.titleKey, {}, ui);
  const when = t(film.whenKey, {}, ui);
  const verifiedPoster = film.youtubeId === GTA6_OFFICIAL_TRAILER_YOUTUBE_ID;
  const media = verifiedPoster
    ? gta6OfficialTrailerHtml(ui)
    : `<p class="gta6-film-link">${outbound(film.href(ui), t(film.linkKey, {}, ui), { i18nKey: film.linkKey })}</p>`;
  const note = film.noteKey
    ? `<p class="gta6-film-note" data-i18n="${esc(film.noteKey)}">${esc(t(film.noteKey, {}, ui))}</p>`
    : "";
  return `<li class="gta6-film" id="gta6-film-${esc(film.id)}">
        <h3 data-i18n="${esc(film.titleKey)}">${esc(title)}</h3>
        <p class="gta6-film-when" data-i18n="${esc(film.whenKey)}">${esc(when)}</p>
        ${media}
        ${note}
      </li>`;
}

export function gta6FilmsHtml(lang = "en") {
  const ui = lang === "zh" ? "zh" : "en";
  const items = GTA6_FILMS.map((film) => gta6FilmItemHtml(film, ui)).join("");
  return `<section class="gta6-section" id="gta6Films" aria-labelledby="gta6-films-heading">
        <h2 id="gta6-films-heading" data-i18n="pageGta6FilmsHeading">${esc(t("pageGta6FilmsHeading", {}, ui))}</h2>
        <ol class="gta6-film-list">${items}</ol>
      </section>`;
}

function gta6EditionHtml(ui, { titleKey, bodyKey, kickerKey = "" }) {
  const kicker = kickerKey
    ? `<p class="gta6-edition-kicker" data-i18n="${esc(kickerKey)}">${esc(t(kickerKey, {}, ui))}</p>`
    : "";
  return `<article class="gta6-edition">
        <h3 data-i18n="${esc(titleKey)}">${esc(t(titleKey, {}, ui))}</h3>
        ${kicker}
        <p data-i18n="${esc(bodyKey)}">${esc(t(bodyKey, {}, ui))}</p>
        <p class="gta6-edition-link">${outbound(gta6ViPageUrl(ui), t("homeGta6ViLink", {}, ui), { i18nKey: "homeGta6ViLink" })}</p>
      </article>`;
}

function gta6EditionsHtml(ui) {
  return `<section class="gta6-section" id="gta6Editions" aria-labelledby="gta6-editions-heading">
        <h2 id="gta6-editions-heading" data-i18n="pageGta6EditionsHeading">${esc(t("pageGta6EditionsHeading", {}, ui))}</h2>
        ${gta6EditionHtml(ui, {
          titleKey: "pageGta6EditionUltimateTitle",
          bodyKey: "pageGta6EditionUltimateBody",
        })}
        ${gta6EditionHtml(ui, {
          titleKey: "pageGta6EditionVintageTitle",
          kickerKey: "pageGta6EditionVintageKicker",
          bodyKey: "pageGta6EditionVintageBody",
        })}
      </section>`;
}

function gta6NewswireHtml(ui) {
  const items = [
    { href: gta6PreloadUrl(ui), titleKey: "pageGta6NewsPreload", dateKey: "pageGta6NewsPreloadDate" },
    { href: GTA6_JUSTICE_URL, titleKey: "pageGta6NewsJustice", dateKey: "pageGta6NewsJusticeDate" },
    { href: GTA6_LAUNCH_TRAILER_URL, titleKey: "pageGta6NewsLaunch", dateKey: "pageGta6NewsLaunchDate" },
  ];
  const lis = items
    .map(
      (item) => `<li>${outbound(item.href, t(item.titleKey, {}, ui), { i18nKey: item.titleKey })} <span class="gta6-news-date" data-i18n="${esc(item.dateKey)}">${esc(t(item.dateKey, {}, ui))}</span></li>`,
    )
    .join("");
  return `<section class="gta6-section" id="gta6Newswire" aria-labelledby="gta6-newswire-heading">
        <h2 id="gta6-newswire-heading" data-i18n="pageGta6NewswireHeading">${esc(t("pageGta6NewswireHeading", {}, ui))}</h2>
        <ul class="page-links gta6-news-list">${lis}</ul>
        <ul class="page-links">
          <li>${outbound(gta6ViPageUrl(ui), t("pageGta6Official", {}, ui), { i18nKey: "pageGta6Official" })}</li>
          <li>${outbound(GTA6_NEWSWIRE_URL, t("pageGta6Newswire", {}, ui), { i18nKey: "pageGta6Newswire" })}</li>
        </ul>
      </section>`;
}

/**
 * GTA 6 → tip freeze CTA (reciprocal of freezeGta6LinkHtml).
 * tipWeek must be a real Rockstar-week key from listArchiveWeeks — never invent.
 */
export function gta6TipFreezeLinkHtml(tipWeek, lang = "en") {
  const ui = lang === "zh" ? "zh" : "en";
  const week = String(tipWeek || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) {
    return `<p class="gta6-tip-freeze is-empty" id="gta6TipFreezeLink" hidden></p>`;
  }
  const href = ui === "zh" ? `/zh/week/${week}/` : `/week/${week}/`;
  return `<p class="gta6-tip-freeze" id="gta6TipFreezeLink"><a href="${esc(href)}">${esc(t("weekArchiveLatestLink", { week }, ui))}</a></p>`;
}

/**
 * Body for /gta6/ — official date, live countdown, Rockstar outbound links.
 * @param {string} [lang]
 * @param {{ tipWeek?: string, now?: Date }} [opts]
 */
export function renderGta6PageBody(lang = "en", opts = {}) {
  const ui = lang === "zh" ? "zh" : "en";
  // Backward-compat: older callers passed `now` as the 2nd argument.
  const tipWeek = opts instanceof Date ? "" : opts?.tipWeek || "";
  const now = opts instanceof Date ? opts : opts?.now instanceof Date ? opts.now : new Date();
  const vi = gta6ViPageUrl(ui);
  return `<h1 data-i18n="pageGta6Heading">${esc(t("pageGta6Heading", {}, ui))}</h1>
      <div class="page-body" data-i18n-html="pageGta6Body">${t("pageGta6Body", {}, ui)}</div>
      <section class="gta6-section" id="gta6Release" aria-labelledby="gta6-release-heading">
        <h2 id="gta6-release-heading" data-i18n="pageGta6ReleaseHeading">${esc(t("pageGta6ReleaseHeading", {}, ui))}</h2>
        <p class="gta6-coming" data-i18n="homeGta6Coming">${esc(t("homeGta6Coming", {}, ui))}</p>
        ${gta6CountdownBlock(ui, now, { source: false })}
        <p data-i18n="homeGta6Platforms">${esc(t("homeGta6Platforms", {}, ui))}</p>
        <p>${outbound(GTA6_PS_FEATURES_URL, t("pageGta6PsBenefits", {}, ui), { i18nKey: "pageGta6PsBenefits" })}</p>
        <p class="gta6-countdown-source">${outbound(vi, t("pageGta6SourceNote", { date: GTA6_RELEASE_ISO_DATE }, ui))}</p>
      </section>
      <section class="gta6-section" id="gta6Preload" aria-labelledby="gta6-preload-heading">
        <h2 id="gta6-preload-heading" data-i18n="pageGta6PreloadHeading">${esc(t("pageGta6PreloadHeading", {}, ui))}</h2>
        <p data-i18n="homeGta6Preload">${esc(t("homeGta6Preload", {}, ui))}</p>
        <p>${outbound(gta6PreloadUrl(ui), t("homeGta6PreloadLink", {}, ui), { i18nKey: "homeGta6PreloadLink" })}</p>
      </section>
      ${gta6FilmsHtml(ui)}
      ${gta6EditionsHtml(ui)}
      <section class="gta6-section" id="gta6Leonida" aria-labelledby="gta6-leonida-heading">
        <h2 id="gta6-leonida-heading" data-i18n="pageGta6LeonidaHeading">${esc(t("pageGta6LeonidaHeading", {}, ui))}</h2>
        <h3 data-i18n="pageGta6LeonidaTitle">${esc(t("pageGta6LeonidaTitle", {}, ui))}</h3>
        <p data-i18n="pageGta6LeonidaBody">${esc(t("pageGta6LeonidaBody", {}, ui))}</p>
        <p>${outbound(GTA6_LEONIDA_URL, t("pageGta6LeonidaLink", {}, ui), { i18nKey: "pageGta6LeonidaLink" })}</p>
      </section>
      ${gta6NewswireHtml(ui)}
      <p class="gta6-home-link"><a href="${esc(ui === "zh" ? "/zh/" : "/")}">${esc(t("gta6HomeLink", {}, ui))}</a></p>
      ${gta6TipFreezeLinkHtml(tipWeek, ui)}`;
}

/**
 * Home official-status block. Sits above the weekly tools.
 * Newest film is the Launch Trailer: official link, no poster (no YouTube id).
 */
export function homeGta6StatusHtml(lang = "en", now = new Date()) {
  const ui = lang === "zh" ? "zh" : "en";
  const openHref = ui === "zh" ? "/zh/gta6/" : "/gta6/";
  return `<section class="home-gta6-status" id="homeGta6Status" aria-labelledby="home-gta6-status-heading">
      <div class="week-panel-kicker">
        <strong id="home-gta6-status-heading" data-i18n="homeGta6StatusKicker">${esc(t("homeGta6StatusKicker", {}, ui))}</strong>
        <span data-i18n="homeGta6StatusTag">${esc(t("homeGta6StatusTag", {}, ui))}</span>
      </div>
      <p class="gta6-coming" data-i18n="homeGta6Coming">${esc(t("homeGta6Coming", {}, ui))}</p>
      ${gta6CountdownBlock(ui, now, { source: false })}
      <p data-i18n="homeGta6Preload">${esc(t("homeGta6Preload", {}, ui))}</p>
      <p>${outbound(gta6PreloadUrl(ui), t("homeGta6PreloadLink", {}, ui), { i18nKey: "homeGta6PreloadLink" })}</p>
      <p data-i18n="homeGta6Platforms">${esc(t("homeGta6Platforms", {}, ui))}</p>
      <p>${outbound(gta6ViPageUrl(ui), t("homeGta6ViLink", {}, ui), { i18nKey: "homeGta6ViLink" })}</p>
      <p data-i18n="homeGta6NewestFilm">${esc(t("homeGta6NewestFilm", {}, ui))}</p>
      <p>${outbound(GTA6_LAUNCH_TRAILER_URL, t("pageGta6FilmLaunchLink", {}, ui), { i18nKey: "pageGta6FilmLaunchLink" })}</p>
      <p class="home-gta6-open"><a href="${esc(openHref)}" data-i18n="homeGta6Open">${esc(t("homeGta6Open", {}, ui))}</a></p>
    </section>`;
}

/**
 * Replace #homeGta6Status and drop the old countdown CTA so the date is not said twice.
 */
export function injectHomeGta6Status(html, { lang = "en", now = new Date() } = {}) {
  let out = String(html || "");
  const ui = lang === "zh" ? "zh" : "en";
  const body = homeGta6StatusHtml(ui, now);
  if (/id="homeGta6Status"/.test(out)) {
    out = out.replace(/<section class="home-gta6-status"[^>]*>[\s\S]*?<\/section>/, body);
  } else if (/id="officialBanner"/.test(out)) {
    out = out.replace(
      /(<aside class="official-banner"[^>]*id="officialBanner")/,
      `${body}\n    $1`,
    );
  }
  out = out.replace(/<p class="home-gta6-link"[^>]*id="homeGta6Link"[\s\S]*?<\/p>\s*/g, "");
  if (out.includes('id="gta6CountdownDisplay"') && !out.includes('getElementById("gta6CountdownDisplay")')) {
    out = out.replace(/<script type="module"/, `${gta6CountdownScript()}\n    <script type="module"`);
  }
  return out;
}

/** Home → `/gta6/` discovery link (reciprocal of gta6HomeLink). */
export function homeGta6LinkHtml(lang = "en") {
  const ui = lang === "zh" ? "zh" : "en";
  const href = ui === "zh" ? "/zh/gta6/" : "/gta6/";
  return `<p class="home-gta6-link" id="homeGta6Link"><a href="${esc(href)}" data-i18n="homeGta6Link">${esc(t("homeGta6Link", {}, ui))}</a></p>`;
}

/**
 * The home countdown no longer repeats a GTA 6 date link.
 * The status block above the weekly tools is the path to /gta6/.
 * Freeze pages keep their own CTA (freezeGta6LinkHtml).
 */
export function injectHomeGta6Link(html) {
  return String(html || "").replace(
    /<p class="home-gta6-link"[^>]*id="homeGta6Link"[\s\S]*?<\/p>\s*/g,
    "",
  );
}
