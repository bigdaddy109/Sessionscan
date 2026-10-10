/** Collect YouTube videos and render static per-video share pages / sitemap. */

import { CARD_SITE_BASE, cardActionsHtml, cardAttrs, videoPageUrl, youtubeId } from "./cardShare.js";
import { SITE_ORIGIN, copyFor, fmtViews as fmtViewsI18n, htmlLang, langLabel as i18nLangLabel, ogLocale, t } from "./i18n.js";
import { VIDEO_JSON_LD_ID, YOUTUBE_CHANNEL_URL, jsonLdScript, videoObjectJsonLd } from "./structuredData.js";

export const VIDEO_LIST_KEYS = [
  "videos_hot_zh",
  "videos_hot_en",
  "videos_hot_ja",
  "videos_new_zh",
  "videos_new_en",
  "videos_new_ja",
  "videos_shorts",
];

const BRAND_MARK = `<svg class="brand-mark" viewBox="0 0 64 64" aria-hidden="true">
            <circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" stroke-width="1.6" class="teal" />
            <circle cx="32" cy="32" r="14" fill="none" stroke="currentColor" stroke-width="1.4" class="pink" />
            <path d="M32 32 L50 22" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" class="mint" />
            <circle cx="32" cy="32" r="3" fill="currentColor" class="pink" />
            <path d="M22 40c0-4 4-7 10-7s10 3 10 7" fill="none" stroke="currentColor" stroke-width="1.6" />
            <path d="M20 36c-2 0-3 2-3 4v3c0 1 1 2 2 2h2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            <path d="M44 36c2 0 3 2 3 4v3c0 1-1 2-2 2h-2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>`;

export function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function compactVideo(item, extra = {}) {
  const id = youtubeId({ ...item, ...extra });
  if (!id) return null;
  const src = { ...(item && typeof item === "object" ? item : {}), ...extra };
  const kind = String(src.kind || "").trim();
  let url = String(src.url || "").trim();
  if (!url) {
    url = kind === "short" ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`;
  }
  const out = {
    video_id: id,
    title: String(src.title || "").trim(),
    channel: String(src.channel || "").trim(),
    url,
    lang: String(src.lang || "").trim(),
    game: String(src.game || "").trim(),
    date: src.date || "",
    views: src.views,
    kind,
  };
  if (src.owned) out.owned = true;
  if (src.channel_url) out.channel_url = String(src.channel_url);
  if (src.first_seen) out.first_seen = src.first_seen;
  if (src.last_seen) out.last_seen = src.last_seen;
  return out;
}

function assignVideo(map, item, extra) {
  const row = compactVideo(item, extra);
  if (!row) return;
  const prev = map.get(row.video_id) || {};
  const next = { ...prev };
  for (const [key, value] of Object.entries(row)) {
    if (value == null || value === "") continue;
    next[key] = value;
  }
  if (!next.url) {
    next.url =
      next.kind === "short"
        ? `https://www.youtube.com/shorts/${next.video_id}`
        : `https://www.youtube.com/watch?v=${next.video_id}`;
  }
  map.set(row.video_id, next);
}

export function archiveVideoRows(archive) {
  if (!archive) return [];
  if (Array.isArray(archive)) return archive;
  if (Array.isArray(archive.videos)) return archive.videos;
  if (archive.videos && typeof archive.videos === "object") return Object.values(archive.videos);
  if (typeof archive === "object") {
    const values = Object.values(archive);
    if (values.every((v) => v && typeof v === "object" && (v.video_id || v.url))) return values;
  }
  return [];
}

export function collectHubVideos(hub) {
  const map = new Map();
  if (!hub || typeof hub !== "object") return map;
  for (const key of VIDEO_LIST_KEYS) {
    for (const item of hub[key] || []) assignVideo(map, item);
  }
  const slot = hub.sessionscan_slot || {};
  const short = slot.short;
  if (short) {
    assignVideo(map, short, {
      owned: true,
      kind: short.kind || "short",
      channel: short.channel || "SessionScan",
      channel_url: slot.channel_url,
    });
  }
  return map;
}

export function collectVideos({ archive, hubs } = {}) {
  const map = new Map();
  for (const item of archiveVideoRows(archive)) assignVideo(map, item);
  for (const hub of hubs || []) {
    for (const row of collectHubVideos(hub).values()) assignVideo(map, row);
  }
  return [...map.values()].sort((a, b) => String(a.video_id).localeCompare(String(b.video_id)));
}

export function hubHasVideos(hub) {
  return collectHubVideos(hub).size > 0;
}

export function thumbUrl(id, size = "hqdefault") {
  return `https://i.ytimg.com/vi/${encodeURIComponent(id)}/${size}.jpg`;
}

export function langLabel(lang, ui = "en") {
  return i18nLangLabel(lang, ui);
}

export function fmtViews(n, ui = "en") {
  return fmtViewsI18n(n, { live: true, lang: ui });
}

export function videoPageTitle(video, ui = "en") {
  const title = String(video?.title || "").trim();
  return title ? `${title} | SessionScan` : t("videoPageTitleFallback", {}, ui);
}

export function videoPageDescription(video, ui = "en") {
  const bits = [video?.channel, video?.date, video?.game].map((x) => String(x || "").trim()).filter(Boolean);
  const tail = t("videoDescTail", {}, ui);
  if (bits.length) {
    return ui === "zh" ? `${bits.join(" · ")}。${tail}` : `${bits.join(" · ")}. ${tail}`;
  }
  return ui === "zh" ? `GTA Online 攻略影片。${tail}` : `GTA Online guide video. ${tail}`;
}

function xmlEsc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const HOME_ALTERNATES = [
  ["en", CARD_SITE_BASE],
  ["zh-Hant", `${CARD_SITE_BASE}zh/`],
  ["x-default", CARD_SITE_BASE],
];

function xhtmlLinks() {
  return HOME_ALTERNATES.map(
    ([lang, href]) => `    <xhtml:link rel="alternate" hreflang="${xmlEsc(lang)}" href="${xmlEsc(href)}"/>`,
  ).join("\n");
}

export function renderSitemap(urls) {
  const locs = [];
  const seen = new Set();
  for (const raw of urls || []) {
    const loc = String(raw || "").trim();
    if (!loc || seen.has(loc)) continue;
    seen.add(loc);
    locs.push(loc);
  }
  const zhHome = `${CARD_SITE_BASE}zh/`;
  const body = locs
    .map((loc) => {
      const home = loc === CARD_SITE_BASE || loc === zhHome;
      const extra = home ? `\n${xhtmlLinks()}` : "";
      return `  <url>\n    <loc>${xmlEsc(loc)}</loc>${extra}\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${body}\n</urlset>\n`;
}

export function sitemapUrls(videos) {
  return [CARD_SITE_BASE, `${CARD_SITE_BASE}zh/`, ...videos.map((v) => videoPageUrl(v.video_id)).filter(Boolean)];
}

function videoCardHtml(video, ui = "en") {
  const id = video.video_id;
  const thumb = thumbUrl(id, "hqdefault");
  const lang = langLabel(video.lang, ui);
  const views = fmtViews(video.views, ui);
  const langKey = video.lang === "zh" ? "langLabelZh" : video.lang === "ja" ? "langLabelJa" : video.lang === "ko" ? "langLabelKo" : video.lang === "en" ? "langLabelEn" : "";
  const channelLink =
    video.owned && video.channel_url
      ? `<p class="blurb"><a href="${esc(video.channel_url)}" target="_blank" rel="noopener noreferrer" data-i18n="channelOwned">${esc(t("channelOwned", {}, ui))}</a></p>`
      : "";
  return `<article class="video-card video-page-card" ${cardAttrs(video)}>
      <a class="thumb-link" href="${esc(video.url)}" target="_blank" rel="noopener noreferrer">
        <img class="thumb" src="${esc(thumb)}" alt="${esc(video.title || "")}" />
        <div class="play" aria-hidden="true"><span>▶</span></div>
      </a>
      <div class="video-info">
        <div class="video-info-top">
          <h1><a href="${esc(video.url)}" target="_blank" rel="noopener noreferrer">${esc(video.title || t("videoUntitled", {}, ui))}</a></h1>
          ${cardActionsHtml(video, video.kind === "short" ? "new" : "hot", ui)}
        </div>
        <div class="card-meta">
          ${video.owned ? `<span class="tag">SessionScan</span>` : ""}
          ${video.kind === "short" ? `<span class="tag">Short</span>` : ""}
          ${lang ? `<span class="tag"${langKey ? ` data-i18n="${langKey}"` : ""}>${esc(lang)}</span>` : ""}
          ${video.game ? `<span class="tag">${esc(video.game)}</span>` : ""}
          ${video.channel ? `<span>${esc(video.channel)}</span>` : ""}
          ${views ? `<span>👁 ${esc(views)}</span>` : ""}
          ${video.date ? `<span>${esc(video.date)}</span>` : ""}
        </div>
        ${channelLink}
      </div>
    </article>`;
}

function videoPageScript(ui) {
  const en = copyFor("en");
  const zh = copyFor("zh");
  const copies = JSON.stringify({
    en: {
      skip: en.skip,
      brandAriaHome: en.brandAriaHome,
      brandEm: en.brandEm,
      videoHome: en.videoHome,
      videoWatch: en.videoWatch,
      footerAbout: en.footerAbout,
      footerScope: en.footerScope,
      copy: en.copy,
      copied: en.copied,
      langLabelZh: en.langLabelZh,
      langLabelJa: en.langLabelJa,
      langLabelKo: en.langLabelKo,
      langLabelEn: en.langLabelEn,
      channelOwned: en.channelOwned,
      channelFull: en.channelFull,
      channelAria: en.channelAria,
    },
    zh: {
      skip: zh.skip,
      brandAriaHome: zh.brandAriaHome,
      brandEm: zh.brandEm,
      videoHome: zh.videoHome,
      videoWatch: zh.videoWatch,
      footerAbout: zh.footerAbout,
      footerScope: zh.footerScope,
      copy: zh.copy,
      copied: zh.copied,
      langLabelZh: zh.langLabelZh,
      langLabelJa: zh.langLabelJa,
      langLabelKo: zh.langLabelKo,
      langLabelEn: zh.langLabelEn,
      channelOwned: zh.channelOwned,
      channelFull: zh.channelFull,
      channelAria: zh.channelAria,
    },
  });
  return `<script>
(function () {
  var COPIES = ${copies};
  var KEY = "sessionscan-lang";
  function readLang() {
    try {
      var stored = localStorage.getItem(KEY);
      if (stored === "zh" || stored === "en") return stored;
    } catch (e) {}
    return ${JSON.stringify(ui === "zh" ? "zh" : "en")};
  }
  function apply(lang) {
    var copy = COPIES[lang] || COPIES.en;
    document.documentElement.lang = lang === "zh" ? "zh-Hant" : "en";
    document.documentElement.setAttribute("data-ui-lang", lang);
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (copy[key]) el.textContent = copy[key];
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-aria");
      if (copy[key]) el.setAttribute("aria-label", copy[key]);
    });
    document.querySelectorAll("[data-home-link]").forEach(function (el) {
      el.setAttribute("href", lang === "zh" ? "${SITE_ORIGIN}/zh/" : "${SITE_ORIGIN}/");
    });
    document.querySelectorAll("[data-lang-link]").forEach(function (el) {
      if (el.getAttribute("data-lang-link") === lang) el.setAttribute("aria-current", "page");
      else el.removeAttribute("aria-current");
    });
    try { localStorage.setItem(KEY, lang); } catch (e) {}
  }
  document.addEventListener("click", function (e) {
    var switcher = e.target.closest("[data-lang-link]");
    if (switcher) {
      e.preventDefault();
      apply(switcher.getAttribute("data-lang-link") === "zh" ? "zh" : "en");
      return;
    }
    var btn = e.target.closest(".card-copy");
    if (!btn) return;
    var link = btn.getAttribute("data-copy") || "";
    if (!link || !navigator.clipboard || !navigator.clipboard.writeText) return;
    var lang = document.documentElement.getAttribute("data-ui-lang") || "en";
    var copy = COPIES[lang] || COPIES.en;
    navigator.clipboard.writeText(link).then(function () {
      btn.classList.add("is-copied");
      btn.setAttribute("aria-label", copy.copied);
      setTimeout(function () {
        btn.classList.remove("is-copied");
        btn.setAttribute("aria-label", copy.copy);
      }, 1600);
    }).catch(function () {});
  });
  apply(readLang());
})();
</script>`;
}

export function renderVideoPage(video, { cssHref, faviconHref, lang = "en" } = {}) {
  const id = youtubeId(video);
  if (!id) return "";
  const ui = lang === "zh" ? "zh" : "en";
  const page = videoPageUrl(id);
  const title = videoPageTitle(video, ui);
  const desc = videoPageDescription(video, ui);
  const image = thumbUrl(id, "hqdefault");
  const css = cssHref || "../../assets/index.css";
  const icon = faviconHref || "../../favicon.svg";
  const home = ui === "zh" ? `${SITE_ORIGIN}/zh/` : `${SITE_ORIGIN}/`;
  const jsonLd = jsonLdScript(VIDEO_JSON_LD_ID, videoObjectJsonLd(video, { lang: ui, description: desc }));
  return `<!DOCTYPE html>
<html lang="${htmlLang(ui)}" data-ui-lang="${ui}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(desc)}" />
    ${jsonLd}
    <link rel="canonical" href="${esc(page)}" />
    <link rel="alternate" hreflang="en" href="${esc(page)}" />
    <link rel="alternate" hreflang="zh-Hant" href="${esc(page)}" />
    <link rel="alternate" hreflang="x-default" href="${esc(page)}" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="${ogLocale(ui)}" />
    <meta property="og:site_name" content="SessionScan" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(desc)}" />
    <meta property="og:url" content="${esc(page)}" />
    <meta property="og:image" content="${esc(image)}" />
    <meta property="og:image:alt" content="${esc(video.title || title)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@sessionscan" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(desc)}" />
    <meta name="twitter:image" content="${esc(image)}" />
    <link rel="icon" href="${esc(icon)}" type="image/svg+xml" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700&family=Oswald:wght@500;700&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="${esc(css)}" />
  </head>
  <body class="video-page">
    <div class="scanlines" aria-hidden="true"></div>
    <div class="vignette" aria-hidden="true"></div>
    <a class="skip" href="#video" data-i18n="skip">${esc(t("skip", {}, ui))}</a>
    <header class="site-header">
      <div class="header-inner">
        <a class="brand" data-home-link href="${esc(home)}" data-i18n-aria="brandAriaHome" aria-label="${esc(t("brandAriaHome", {}, ui))}">
          ${BRAND_MARK}
          <span class="brand-text">
            <strong>SESSIONSCAN</strong>
            <em data-i18n="brandEm">${esc(t("brandEm", {}, ui))}</em>
          </span>
        </a>
        <a class="channel-link" href="${YOUTUBE_CHANNEL_URL}" target="_blank" rel="noopener noreferrer" data-i18n-aria="channelAria" aria-label="${esc(t("channelAria", {}, ui))}">
          <span class="channel-link-full" data-i18n="channelFull">${esc(t("channelFull", {}, ui))}</span>
          <span class="channel-link-short">@sessionscan</span>
        </a>
        <nav class="lang-switch" aria-label="${esc(t("langSwitchAria", {}, ui))}">
          <a href="${SITE_ORIGIN}/" data-lang-link="en" hreflang="en"${ui === "en" ? ' aria-current="page"' : ""}>EN</a>
          <span class="lang-switch-sep" aria-hidden="true">/</span>
          <a href="${SITE_ORIGIN}/zh/" data-lang-link="zh" hreflang="zh-Hant"${ui === "zh" ? ' aria-current="page"' : ""}>中文</a>
        </nav>
        <a class="channel-link" data-home-link data-i18n="videoHome" href="${esc(home)}">${esc(t("videoHome", {}, ui))}</a>
      </div>
    </header>
    <main class="video-page-main" id="video">
      ${videoCardHtml(video, ui)}
      <p class="video-page-links">
        <a class="watch-yt" data-i18n="videoWatch" href="${esc(video.url)}" target="_blank" rel="noopener noreferrer">${esc(t("videoWatch", {}, ui))}</a>
        <a data-home-link data-i18n="videoHome" href="${esc(home)}">${esc(t("videoHome", {}, ui))}</a>
      </p>
    </main>
    <footer class="site-footer">
      <p class="footer-social">
        <a class="footer-social-link" href="${YOUTUBE_CHANNEL_URL}" target="_blank" rel="noopener noreferrer" data-i18n-aria="channelAria" aria-label="${esc(t("channelAria", {}, ui))}">
          <span data-i18n="channelFull">${esc(t("channelFull", {}, ui))}</span>
          <span class="footer-social-handle">@sessionscan</span>
        </a>
      </p>
      <p><strong>SessionScan</strong> · <span data-i18n="footerAbout">${esc(t("footerAbout", {}, ui))}</span></p>
      <p data-i18n="footerScope">${esc(t("footerScope", {}, ui))}</p>
    </footer>
    ${videoPageScript(ui)}
  </body>
</html>
`;
}
