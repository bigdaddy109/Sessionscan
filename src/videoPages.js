/** Collect YouTube videos and render static per-video share pages / sitemap. */

import { CARD_SITE_BASE, cardActionsHtml, cardAttrs, videoPageUrl, youtubeId } from "./cardShare.js";
import { cfWebAnalyticsHtml } from "./cfWebAnalytics.js";
import { fontHeadLinks } from "./fontLinks.js";
import {
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  SITE_ORIGIN,
  TWITTER_SITE,
  copyFor,
  fmtViews as fmtViewsI18n,
  htmlLang,
  langLabel as i18nLangLabel,
  localeHome,
  ogLocale,
  t,
} from "./i18n.js";
import {
  SITE_PAGES,
  absoluteUrl,
  breadcrumbsNavHtml,
  footerGuidesHtml,
  relatedPagesHtml,
  staticSitemapUrls,
} from "./sitePages.js";
import {
  VIDEO_JSON_LD_ID,
  YOUTUBE_CHANNEL_URL,
  breadcrumbListJsonLd,
  jsonLdScript,
  videoObjectJsonLd,
} from "./structuredData.js";
import { archiveSitemapUrls } from "./weekArchive.js";

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

/** Home → video title; absolute sessionscan.net URLs for JSON-LD + visible crumbs. */
export function videoBreadcrumbItems(video, lang = "en") {
  const ui = lang === "zh" ? "zh" : "en";
  const id = youtubeId(video);
  const page = videoPageUrl(id, ui);
  if (!page) return [];
  const name =
    String(video?.title || "").trim() ||
    t("videoUntitled", {}, ui) ||
    t("videoPageTitleFallback", {}, ui);
  return [
    { name: t("videoHome", {}, ui), url: localeHome(ui) },
    { name, url: page },
  ];
}

/** VideoObject + BreadcrumbList in one @graph (same trail as visible nav). */
export function videoPageJsonLd(video, { lang = "en", description } = {}) {
  const vo = videoObjectJsonLd(video, { lang, description });
  if (!vo) return null;
  const { "@context": _ctx, ...videoNode } = vo;
  const crumbs = videoBreadcrumbItems(video, lang);
  const breadcrumb = breadcrumbListJsonLd(crumbs);
  const graph = [videoNode];
  if (breadcrumb) graph.push(breadcrumb);
  return { "@context": "https://schema.org", "@graph": graph };
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

function xhtmlLinks(enHref, zhHref) {
  const en = enHref || CARD_SITE_BASE;
  const zh = zhHref || `${CARD_SITE_BASE}zh/`;
  return [
    ["en", en],
    ["zh-Hant", zh],
    ["x-default", en],
  ]
    .map(([lang, href]) => `    <xhtml:link rel="alternate" hreflang="${xmlEsc(lang)}" href="${xmlEsc(href)}"/>`)
    .join("\n");
}

function sitemapAlternates(loc) {
  const zhHome = `${CARD_SITE_BASE}zh/`;
  if (loc === CARD_SITE_BASE || loc === zhHome) return xhtmlLinks(CARD_SITE_BASE, zhHome);
  for (const page of SITE_PAGES) {
    const en = absoluteUrl(page.path, "en");
    const zh = absoluteUrl(page.path, "zh");
    if (loc === en || loc === zh) return xhtmlLinks(en, zh);
  }
  const videoId = String(loc || "").match(
    /^https:\/\/sessionscan\.net(?:\/zh)?\/v\/([A-Za-z0-9_-]{11})\/$/,
  )?.[1];
  if (videoId) return xhtmlLinks(videoPageUrl(videoId, "en"), videoPageUrl(videoId, "zh"));
  return "";
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
  const body = locs
    .map((loc) => {
      const alt = sitemapAlternates(loc);
      const extra = alt ? `\n${alt}` : "";
      return `  <url>\n    <loc>${xmlEsc(loc)}</loc>${extra}\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${body}\n</urlset>\n`;
}

export function sitemapUrls(videos, { weeks } = {}) {
  const videoLocs = [];
  for (const v of videos || []) {
    const en = videoPageUrl(v.video_id, "en");
    const zh = videoPageUrl(v.video_id, "zh");
    if (en) videoLocs.push(en);
    if (zh) videoLocs.push(zh);
  }
  return [
    CARD_SITE_BASE,
    `${CARD_SITE_BASE}zh/`,
    ...staticSitemapUrls(),
    ...archiveSitemapUrls(weeks || []),
    ...videoLocs,
  ];
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
        <div class="play" aria-hidden="true"><span></span></div>
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
    // Prefer the baked page locale so /zh/v/{id}/ crumbs/JSON-LD stay zh.
    var pageLang = document.documentElement.getAttribute("data-ui-lang");
    if (pageLang === "zh" || pageLang === "en") return pageLang;
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
      var href = switcher.getAttribute("href") || "";
      // Real EN↔ZH video URLs: navigate so static crumbs/JSON-LD match the locale.
      if (/\\/v\\/[A-Za-z0-9_-]{11}\\/?$/.test(href) || /\\/zh\\/v\\/[A-Za-z0-9_-]{11}\\/?$/.test(href)) {
        try { localStorage.setItem(KEY, switcher.getAttribute("data-lang-link") === "zh" ? "zh" : "en"); } catch (err) {}
        return;
      }
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
  const page = videoPageUrl(id, ui);
  const enPage = videoPageUrl(id, "en");
  const zhPage = videoPageUrl(id, "zh");
  const title = videoPageTitle(video, ui);
  const desc = videoPageDescription(video, ui);
  const image = thumbUrl(id, "hqdefault");
  const css = cssHref || (ui === "zh" ? "../../../assets/index.css" : "../../assets/index.css");
  const icon = faviconHref || (ui === "zh" ? "../../../favicon.svg" : "../../favicon.svg");
  const home = ui === "zh" ? `${SITE_ORIGIN}/zh/` : `${SITE_ORIGIN}/`;
  const crumbs = videoBreadcrumbItems(video, ui);
  const crumbsHtml = breadcrumbsNavHtml(crumbs, ui);
  const jsonLd = jsonLdScript(
    VIDEO_JSON_LD_ID,
    videoPageJsonLd(video, { lang: ui, description: desc }),
  );
  return `<!DOCTYPE html>
<html lang="${htmlLang(ui)}" data-ui-lang="${ui}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(desc)}" />
    ${jsonLd}
    <link rel="canonical" href="${esc(page)}" />
    <link rel="alternate" hreflang="en" href="${esc(enPage)}" />
    <link rel="alternate" hreflang="zh-Hant" href="${esc(zhPage)}" />
    <link rel="alternate" hreflang="x-default" href="${esc(enPage)}" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="${ogLocale(ui)}" />
    <meta property="og:site_name" content="SessionScan" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(desc)}" />
    <meta property="og:url" content="${esc(page)}" />
    <meta property="og:image" content="${esc(image)}" />
    <meta property="og:image:width" content="${OG_IMAGE_WIDTH}" />
    <meta property="og:image:height" content="${OG_IMAGE_HEIGHT}" />
    <meta property="og:image:alt" content="${esc(video.title || title)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="${TWITTER_SITE}" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(desc)}" />
    <meta name="twitter:image" content="${esc(image)}" />
    <link rel="icon" href="${esc(icon)}" type="image/svg+xml" />
    ${fontHeadLinks(ui)}
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
          <span class="channel-link-play" aria-hidden="true">▶</span>
          <span class="channel-link-full" data-i18n="channelFull" aria-hidden="true">${esc(t("channelFull", {}, ui))}</span>
          <span class="channel-link-short" aria-hidden="true">@sessionscan</span>
        </a>
        <nav class="lang-switch" aria-label="${esc(t("langSwitchAria", {}, ui))}">
          <a href="${esc(enPage)}" data-lang-link="en" hreflang="en"${ui === "en" ? ' aria-current="page"' : ""}>EN</a>
          <span class="lang-switch-sep" aria-hidden="true">/</span>
          <a href="${esc(zhPage)}" data-lang-link="zh" hreflang="zh-Hant"${ui === "zh" ? ' aria-current="page"' : ""}>中文</a>
        </nav>
        <a class="header-home-link" data-home-link data-i18n="videoHome" href="${esc(home)}">${esc(t("videoHome", {}, ui))}</a>
      </div>
    </header>
    <main class="video-page-main" id="video">
      ${crumbsHtml}
      ${videoCardHtml(video, ui)}
      <p class="video-page-links">
        <a class="watch-yt" data-i18n="videoWatch" href="${esc(video.url)}" target="_blank" rel="noopener noreferrer">${esc(t("videoWatch", {}, ui))}</a>
        <a data-home-link data-i18n="videoHome" href="${esc(home)}">${esc(t("videoHome", {}, ui))}</a>
      </p>
      ${relatedPagesHtml(ui, { currentId: "video" })}
    </main>
    <footer class="site-footer">
      <p class="footer-social">
        <a class="footer-social-link" href="${YOUTUBE_CHANNEL_URL}" target="_blank" rel="noopener noreferrer" data-i18n-aria="channelAria" aria-label="${esc(t("channelAria", {}, ui))}">
          <span data-i18n="channelFull" aria-hidden="true">${esc(t("channelFull", {}, ui))}</span>
          <span class="footer-social-handle" aria-hidden="true">@sessionscan</span>
        </a>
      </p>
      ${footerGuidesHtml(ui)}
      <p><strong>SessionScan</strong> · <span data-i18n="footerAbout">${esc(t("footerAbout", {}, ui))}</span></p>
      <p data-i18n="footerScope">${esc(t("footerScope", {}, ui))}</p>
    </footer>
    ${videoPageScript(ui)}
    ${cfWebAnalyticsHtml()}
  </body>
</html>
`;
}
