/** Font head tags — Oswald is self-hosted; Noto TC stays on Google for /zh/ only. */

/** Noto Sans TC for /zh/ UI (CJK). Oswald ships from /fonts/*.woff2 via style.css. */
export const FONT_HREF_ZH_NOTO =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700&display=optional";

/** @deprecated kept for generate_zh_pages swap helpers / tests that mention EN Google href */
export const FONT_HREF_EN = "";

/** @deprecated use FONT_HREF_ZH_NOTO; historical combined URL */
export const FONT_HREF_ZH = FONT_HREF_ZH_NOTO;

export function fontHref(ui = "en") {
  return ui === "zh" ? FONT_HREF_ZH_NOTO : "";
}

/** Preload self-hosted Oswald (latin 500/700). Absolute /fonts works on /zh/ and /v/. */
export function oswaldPreloadLinks() {
  return `<link rel="preload" href="/fonts/oswald-latin-500-normal.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="preload" href="/fonts/oswald-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin />`;
}

/**
 * EN: preload Oswald only (faces live in style.css).
 * ZH: preload Oswald + non-blocking Noto TC stylesheet.
 */
export function fontHeadLinks(ui = "en") {
  const oswald = oswaldPreloadLinks();
  if (ui !== "zh") return oswald;
  const href = FONT_HREF_ZH_NOTO;
  return `${oswald}
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="preload" as="style" href="${href}" />
    <link rel="stylesheet" href="${href}" media="print" onload="this.media='all'" />
    <noscript><link rel="stylesheet" href="${href}" /></noscript>`;
}
