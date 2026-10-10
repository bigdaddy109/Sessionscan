/** JSON-LD for home (WebSite + Organization) and /v/{id}/ share pages (VideoObject). */

import { CARD_SITE_BASE, videoPageUrl, youtubeId } from "./cardShare.js";
import { SITE_ORIGIN, htmlLang, localeHome, t } from "./i18n.js";

export const YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@sessionscan";
export const YOUTUBE_HANDLE = "@sessionscan";
export const HOME_JSON_LD_ID = "home-jsonld";
export const VIDEO_JSON_LD_ID = "video-jsonld";

/** Search is hash-only (`#q=`). There is no working `?q=` URL param, so no SearchAction. */
export const HAS_SEARCH_URL_PARAM = false;

export function organizationJsonLd() {
  return {
    "@type": "Organization",
    "@id": `${SITE_ORIGIN}/#organization`,
    name: "SessionScan",
    url: `${SITE_ORIGIN}/`,
    logo: `${SITE_ORIGIN}/og.jpg`,
    sameAs: [YOUTUBE_CHANNEL_URL],
  };
}

export function homeJsonLd(lang = "en") {
  const ui = lang === "zh" ? "zh" : "en";
  const url = localeHome(ui);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${url}#website`,
        name: t("metaTitle", {}, ui),
        alternateName: "SessionScan",
        url,
        description: t("metaDesc", {}, ui),
        inLanguage: htmlLang(ui),
        publisher: { "@id": `${SITE_ORIGIN}/#organization` },
      },
      organizationJsonLd(),
    ],
  };
}

export function isoDate(raw) {
  const value = String(raw || "").trim();
  const day = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (day) return day[1];
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  return "";
}

export function youtubeEmbedUrl(id) {
  const vid = String(id || "").trim();
  return vid ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(vid)}` : "";
}

export function youtubeThumbUrl(id, size = "hqdefault") {
  const vid = String(id || "").trim();
  return vid ? `https://i.ytimg.com/vi/${encodeURIComponent(vid)}/${size}.jpg` : "";
}

export function videoObjectJsonLd(video, { lang = "en", description } = {}) {
  const id = youtubeId(video);
  if (!id) return null;
  const ui = lang === "zh" ? "zh" : "en";
  const name = String(video?.title || "").trim() || t("videoUntitled", {}, ui);
  const contentUrl =
    String(video?.url || "").trim() ||
    (video?.kind === "short" ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`);
  const uploadDate = isoDate(video?.date || video?.first_seen);
  const out = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name,
    description: String(description || "").trim() || name,
    thumbnailUrl: youtubeThumbUrl(id),
    embedUrl: youtubeEmbedUrl(id),
    contentUrl,
    url: videoPageUrl(id) || `${CARD_SITE_BASE}v/${id}/`,
  };
  if (uploadDate) out.uploadDate = uploadDate;
  return out;
}

export function jsonLdScript(id, data) {
  if (!data) return "";
  const raw = JSON.stringify(data);
  JSON.parse(raw);
  const json = raw.replace(/</g, "\\u003c");
  const idAttr = id ? ` id="${id}"` : "";
  return `<script type="application/ld+json"${idAttr}>${json}</script>`;
}

export function parseJsonLdScripts(html) {
  const out = [];
  const re = /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(String(html || "")))) {
    out.push(JSON.parse(match[1]));
  }
  return out;
}

export function replaceHomeJsonLd(html, lang = "en") {
  const script = jsonLdScript(HOME_JSON_LD_ID, homeJsonLd(lang));
  const re = /<script type="application\/ld\+json" id="home-jsonld">[\s\S]*?<\/script>/;
  if (re.test(html)) return String(html).replace(re, script);
  return String(html || "").replace("</head>", `    ${script}\n  </head>`);
}
