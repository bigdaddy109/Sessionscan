/** Multi-page shell: primary path nav, static pages, legacy hash redirects, sitemap entries. */

import { CARD_SITE_BASE, parseHash, videoPageUrl } from "./cardShare.js";
import { cfWebAnalyticsHtml } from "./cfWebAnalytics.js";
import {
  OG_IMAGE_HEIGHT,
  OG_IMAGE_URL,
  OG_IMAGE_WIDTH,
  SITE_ORIGIN,
  TWITTER_SITE,
  htmlLang,
  localeHome,
  ogLocale,
  t,
} from "./i18n.js";
import {
  moneyCalculatorScript,
  moneyGuideJsonLd,
  renderMoneyGuideBody,
} from "./moneyGuide.js";
import { fontHeadLinks } from "./fontLinks.js";
import {
  INSTAGRAM_URL,
  YOUTUBE_CHANNEL_URL,
  breadcrumbListJsonLd,
  jsonLdScript,
  organizationJsonLd,
} from "./structuredData.js";
import {
  businessesPageBodyHtml,
  businessesPageJsonLd,
} from "./businessRanking.js";
import {
  gta6CountdownScript,
  gta6PageJsonLd,
  renderGta6PageBody,
} from "./gta6Page.js";

export const X_PROFILE_URL = "https://x.com/SessionScanGTA";
export const X_HANDLE = "@SessionScanGTA";

const BRAND_MARK = `<svg class="brand-mark" viewBox="0 0 64 64" aria-hidden="true">
            <circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" stroke-width="1.6" class="teal" />
            <circle cx="32" cy="32" r="14" fill="none" stroke="currentColor" stroke-width="1.4" class="pink" />
            <path d="M32 32 L50 22" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" class="mint" />
            <circle cx="32" cy="32" r="3" fill="currentColor" class="pink" />
            <path d="M22 40c0-4 4-7 10-7s10 3 10 7" fill="none" stroke="currentColor" stroke-width="1.6" />
            <path d="M20 36c-2 0-3 2-3 4v3c0 1 1 2 2 2h2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            <path d="M44 36c2 0 3 2 3 4v3c0 1-1 2-2 2h-2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>`;

const YT_CARD_ID = /^yt-([A-Za-z0-9_-]{11})$/;

/** Primary destinations (Phase A). Home stays Vite `index.html`. */
export const SITE_PAGES = [
  {
    id: "week",
    path: "week/",
    navKey: "navArchive",
    titleKey: "pageWeekTitle",
    descKey: "pageWeekDesc",
    headingKey: "pageWeekHeading",
    bodyKey: "pageWeekBody",
    stub: false,
  },
  {
    id: "money",
    path: "guides/money/",
    navKey: "navMoney",
    titleKey: "pageMoneyTitle",
    descKey: "pageMoneyDesc",
    headingKey: "pageMoneyHeading",
    bodyKey: "pageMoneyBody",
    stub: false,
  },
  {
    id: "businesses",
    path: "guides/businesses/",
    navKey: "navBusinesses",
    titleKey: "pageBusinessesTitle",
    descKey: "pageBusinessesDesc",
    headingKey: "pageBusinessesHeading",
    bodyKey: "pageBusinessesBody",
    stub: false,
  },
  {
    id: "gta6",
    path: "gta6/",
    navKey: "navGta6",
    titleKey: "pageGta6Title",
    descKey: "pageGta6Desc",
    headingKey: "pageGta6Heading",
    bodyKey: "pageGta6Body",
    stub: false,
  },
  {
    id: "about",
    path: "about/",
    navKey: "navAbout",
    titleKey: "pageAboutTitle",
    descKey: "pageAboutDesc",
    headingKey: "pageAboutHeading",
    bodyKey: "pageAboutBody",
    stub: false,
  },
];

export function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function normalizePathname(pathname = "/") {
  let p = String(pathname || "/").replace(/\/index\.html$/, "") || "/";
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p || "/";
}

/** Absolute site URL for an EN path (`about/` → https://…/about/). */
export function absoluteUrl(enPath = "", lang = "en") {
  const clean = String(enPath || "").replace(/^\/+/, "");
  const prefix = lang === "zh" ? "zh/" : "";
  return `${CARD_SITE_BASE}${prefix}${clean}`;
}

export function localePath(lang, enPath = "/") {
  const raw = String(enPath || "/");
  if (raw === "/" || raw === "") return lang === "zh" ? "/zh/" : "/";
  const clean = raw.replace(/^\/+/, "").replace(/\/+$/, "");
  const path = `/${clean}/`;
  return lang === "zh" ? `/zh${path}` : path;
}

/** Pair EN ↔ ZH for the current pathname (keeps nested routes). */
export function pairedLocalePath(lang, pathname = "/") {
  const p = normalizePathname(pathname);
  let enPath = "/";
  if (p === "/zh" || p === "/") enPath = "/";
  else if (p.startsWith("/zh/")) enPath = `/${p.slice(4)}/`.replace(/\/+$/, "/") || "/";
  else enPath = `${p}/`.replace(/\/{2,}/g, "/");
  if (enPath !== "/" && !enPath.endsWith("/")) enPath = `${enPath}/`;
  return localePath(lang, enPath === "//" ? "/" : enPath);
}

/** Relative prefix to site root from a pathname (`/guides/money/` → `../../`). */
export function assetPrefix(pathname = "/") {
  const p = normalizePathname(pathname);
  const parts = p.split("/").filter(Boolean);
  if (!parts.length) return "./";
  return "../".repeat(parts.length);
}

export function pageById(id) {
  return SITE_PAGES.find((p) => p.id === id) || null;
}

export function navItems(lang = "en") {
  const ui = lang === "zh" ? "zh" : "en";
  return [
    { id: "home", href: localePath(ui, "/"), label: t("navThisWeek", {}, ui) },
    ...SITE_PAGES.map((page) => ({
      id: page.id,
      href: localePath(ui, page.path),
      label: t(page.navKey, {}, ui),
    })),
  ];
}

export function primaryNavHtml(lang = "en", activeId = "") {
  const ui = lang === "zh" ? "zh" : "en";
  const links = navItems(ui)
    .map((item) => {
      const current = item.id === activeId ? ' aria-current="page"' : "";
      return `<a class="site-nav-link" href="${esc(item.href)}" data-nav="${esc(item.id)}"${current}>${esc(item.label)}</a>`;
    })
    .join("");
  return `<nav class="site-nav" data-i18n-aria="siteNavAria" aria-label="${esc(t("siteNavAria", {}, ui))}">${links}</nav>`;
}

/** Phase C discovery trio — Archive / Money / Businesses (home links here too). */
export const CROSS_LINK_PAGE_IDS = ["week", "money", "businesses", "gta6"];

function crossLinkSkipId(currentId = "") {
  if (currentId === "week-freeze") return "week";
  return currentId || "";
}

/** Absolute URLs for JSON-LD relatedLink / WebSite.hasPart. */
export function crossLinkPageRefs(lang = "en", { excludeId = "" } = {}) {
  const ui = lang === "zh" ? "zh" : "en";
  const skip = crossLinkSkipId(excludeId);
  return CROSS_LINK_PAGE_IDS.filter((id) => id !== skip).map((id) => {
    const page = pageById(id);
    return {
      id,
      path: page.path,
      url: absoluteUrl(page.path, ui),
      name: t(page.navKey, {}, ui),
      title: t(page.titleKey, {}, ui),
    };
  });
}

/**
 * In-page discovery links: other Phase C pages + home (when not on home).
 * Single source for home footer strip, Archive / Money / Businesses bodies.
 */
export function relatedPagesHtml(lang = "en", { currentId = "" } = {}) {
  const ui = lang === "zh" ? "zh" : "en";
  const skip = crossLinkSkipId(currentId);
  const items = [];
  if (skip && skip !== "home") {
    items.push({
      id: "home",
      href: localePath(ui, "/"),
      label: t("videoHome", {}, ui),
    });
  }
  for (const ref of crossLinkPageRefs(ui, { excludeId: skip })) {
    items.push({ id: ref.id, href: localePath(ui, ref.path), label: ref.name });
  }
  if (!items.length) return "";
  const list = items
    .map(
      (item) =>
        `<li><a href="${esc(item.href)}" data-related="${esc(item.id)}">${esc(item.label)}</a></li>`,
    )
    .join("");
  return `<nav class="related-pages" data-i18n-aria="relatedPagesAria" aria-label="${esc(t("relatedPagesAria", {}, ui))}">
      <p class="related-pages-kicker" data-i18n="relatedPagesKicker">${esc(t("relatedPagesKicker", {}, ui))}</p>
      <ul class="related-pages-list">${list}</ul>
    </nav>`;
}

/** Compact footer row of Archive · Money · Businesses · GTA 6 (always all four). */
export function footerGuidesHtml(lang = "en") {
  const ui = lang === "zh" ? "zh" : "en";
  const links = CROSS_LINK_PAGE_IDS.map((id) => {
    const page = pageById(id);
    return `<a href="${esc(localePath(ui, page.path))}" data-footer-guide="${esc(id)}">${esc(t(page.navKey, {}, ui))}</a>`;
  }).join('<span class="footer-guides-sep" aria-hidden="true"> · </span>');
  return `<nav class="footer-guides" data-i18n-aria="footerGuidesAria" aria-label="${esc(t("footerGuidesAria", {}, ui))}">${links}</nav>`;
}

const LEGACY_TAB_TOKENS = new Set(["jobs", "hot", "shorts", "new", "forum", "x", "hero"]);

/**
 * Legacy hash → path for `/` and `/zh/` (proposal §4).
 * Returns a same-origin path+search (no hash) to location.replace, or "" to keep.
 */
export function legacyHashRedirectTarget(pathname = "/", hash = "", search = "") {
  const path = normalizePathname(pathname);
  const isZh = path === "/zh" || path.startsWith("/zh/");
  const isHome = path === "/" || path === "/zh";
  if (!isHome) return "";

  const raw = String(hash || "");
  if (!raw || raw === "#") return "";
  const parsed = parseHash(raw);
  // Prefer keep client parse for search hashes until a search page exists.
  if (String(parsed.q || "").trim()) return "";

  const v = String(parsed.v || "").trim();
  const yt = v.match(YT_CARD_ID)?.[1] || "";
  if (yt) {
    const page = videoPageUrl(yt);
    if (page) {
      try {
        return `${new URL(page).pathname}${search || ""}`;
      } catch {
        return `/v/${yt}/${search || ""}`;
      }
    }
  }

  const home = `${isZh ? "/zh/" : "/"}${search || ""}`;
  const token = raw.replace(/^#/, "").split("&")[0];
  if (parsed.tab || LEGACY_TAB_TOKENS.has(token) || v) return home;
  return "";
}

/** Inline head script for `/` + `/zh/` — single source used by index.html inject. */
export function legacyHashRedirectScript() {
  // Keep this self-contained: no imports at runtime in the browser.
  return `<script>
(function () {
  try {
    var path = location.pathname.replace(/\\/index\\.html$/, "") || "/";
    var isHome = path === "/" || path === "/zh" || path === "/zh/";
    if (!isHome) return;
    var hash = location.hash || "";
    if (!hash || hash === "#") return;
    var body = hash.replace(/^#/, "");
    if (!body) return;
    var parts = body.split("&").filter(Boolean);
    var tab = null;
    var q = "";
    var v = "";
    var TAB = { jobs: "jobs", hot: "hot", shorts: "new", new: "new", forum: "forum", x: "x" };
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      if (part.indexOf("q=") === 0) {
        try { q = decodeURIComponent(part.slice(2).replace(/\\+/g, " ")); }
        catch (e) { q = part.slice(2); }
      } else if (part.indexOf("v=") === 0) {
        try { v = decodeURIComponent(part.slice(2)); }
        catch (e) { v = part.slice(2); }
      } else if (TAB[part]) tab = TAB[part];
    }
    if (q) return;
    var yt = (v.match(/^yt-([A-Za-z0-9_-]{11})$/) || [])[1] || "";
    if (yt) {
      location.replace("/v/" + yt + "/" + (location.search || ""));
      return;
    }
    var token = parts[0] || "";
    var home = (path === "/zh" || path.indexOf("/zh/") === 0) ? "/zh/" : "/";
    if (token === "hero" || tab || token === "jobs" || token === "hot" || token === "shorts" || token === "new" || token === "forum" || token === "x" || v) {
      location.replace(home + (location.search || ""));
    }
  } catch (e) {}
})();
</script>`;
}

function relatedLinkUrls(lang = "en", excludeId = "") {
  return crossLinkPageRefs(lang, { excludeId }).map((ref) => ref.url);
}

/** Home → page (→ freeze week when week-freeze). Never invents paths. */
export function shellBreadcrumbItems(page, lang = "en", { name } = {}) {
  const ui = lang === "zh" ? "zh" : "en";
  if (!page?.path) return [];
  const crumbs = [{ name: t("videoHome", {}, ui), url: localeHome(ui) }];
  if (page.id === "week-freeze") {
    const weekIso = String(page.path || "").match(/week\/(\d{4}-\d{2}-\d{2})\//)?.[1] || "";
    crumbs.push({ name: t("navArchive", {}, ui), url: absoluteUrl("week/", ui) });
    crumbs.push({
      // Prefer localized heading (not meta title) so EN/zh crumb names match the page H1.
      name: weekIso
        ? t("archiveWeekHeading", { week: weekIso }, ui)
        : name || t(page.titleKey || "pageWeekHeading", {}, ui),
      url: absoluteUrl(page.path, ui),
    });
    return crumbs;
  }
  const label = page.navKey ? t(page.navKey, {}, ui) : name || t(page.titleKey, {}, ui);
  crumbs.push({ name: label, url: absoluteUrl(page.path, ui) });
  return crumbs;
}

function withBreadcrumbGraph(ld, page, lang, { name } = {}) {
  if (!ld || typeof ld !== "object") return ld;
  const crumbs = shellBreadcrumbItems(page, lang, { name });
  const breadcrumb = breadcrumbListJsonLd(crumbs);
  if (!breadcrumb) return ld;
  const graph = Array.isArray(ld["@graph"]) ? [...ld["@graph"]] : [];
  if (!graph.some((n) => n?.["@type"] === "BreadcrumbList")) graph.push(breadcrumb);
  return { ...ld, "@graph": graph };
}

/**
 * Visible breadcrumb nav from [{ name, url }, …].
 * Last crumb is never a link; marks aria-current="page".
 */
export function breadcrumbsNavHtml(crumbs, lang = "en") {
  const ui = lang === "zh" ? "zh" : "en";
  const list = Array.isArray(crumbs) ? crumbs : [];
  if (list.length < 2) return "";
  const lis = list
    .map((c, i) => {
      const last = i === list.length - 1;
      const href = String(c.url || "").replace(/^https:\/\/sessionscan\.net/, "") || "/";
      if (last) {
        return `<li class="site-breadcrumbs-current" aria-current="page"><span>${esc(c.name)}</span></li>`;
      }
      return `<li><a href="${esc(href)}">${esc(c.name)}</a></li>`;
    })
    .join("");
  return `<nav class="site-breadcrumbs" aria-label="${esc(t("breadcrumbsAria", {}, ui))}"><ol>${lis}</ol></nav>`;
}

/** Visible trail matching shellBreadcrumbItems (same names; path hrefs). */
export function shellBreadcrumbsHtml(page, lang = "en", { name } = {}) {
  return breadcrumbsNavHtml(shellBreadcrumbItems(page, lang, { name }), lang);
}

export function webPageJsonLd(page, lang = "en", { name, description } = {}) {
  let ld;
  if (page?.id === "money") ld = moneyGuideJsonLd(lang);
  else if (page?.id === "businesses") ld = businessesPageJsonLd(lang);
  else if (page?.id === "gta6") ld = gta6PageJsonLd(lang);
  else {
    const ui = lang === "zh" ? "zh" : "en";
    const url = absoluteUrl(page.path, ui);
    const related = relatedLinkUrls(ui, page?.id);
    const webpage = {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      name: name || t(page.titleKey, {}, ui),
      description: description || t(page.descKey, {}, ui),
      url,
      inLanguage: htmlLang(ui),
      isPartOf: { "@id": `${localeHome(ui)}#website` },
      publisher: { "@id": `${SITE_ORIGIN}/#organization` },
    };
    if (related.length) webpage.relatedLink = related;
    ld = {
      "@context": "https://schema.org",
      "@graph": [webpage, organizationJsonLd()],
    };
  }
  return withBreadcrumbGraph(ld, page, lang, { name });
}

export function staticSitemapUrls() {
  const out = [];
  for (const page of SITE_PAGES) {
    out.push(absoluteUrl(page.path, "en"));
    out.push(absoluteUrl(page.path, "zh"));
  }
  return out;
}

function pageBodyHtml(page, ui) {
  if (page.id === "money") {
    return `<h1 data-i18n="${esc(page.headingKey)}">${esc(t(page.headingKey, {}, ui))}</h1>
      ${renderMoneyGuideBody(ui)}`;
  }
  if (page.id === "businesses") {
    return `<h1 data-i18n="${esc(page.headingKey)}">${esc(t(page.headingKey, {}, ui))}</h1>
      ${businessesPageBodyHtml(ui)}`;
  }
  if (page.id === "gta6") {
    return renderGta6PageBody(ui);
  }
  const stub = page.stub
    ? `<p class="page-stub-flag" data-i18n="pageStubFlag">${esc(t("pageStubFlag", {}, ui))}</p>`
    : "";
  let extra = "";
  if (page.id === "about") {
    extra = `<ul class="page-links">
      <li><a href="${YOUTUBE_CHANNEL_URL}" target="_blank" rel="noopener noreferrer">YouTube @sessionscan</a></li>
      <li><a href="${INSTAGRAM_URL}" target="_blank" rel="noopener noreferrer">Instagram @sessionscan</a></li>
      <li><a href="${X_PROFILE_URL}" target="_blank" rel="noopener noreferrer">X ${X_HANDLE}</a></li>
    </ul>`;
  }
  return `${stub}
      <h1 data-i18n="${esc(page.headingKey)}">${esc(t(page.headingKey, {}, ui))}</h1>
      <div class="page-body" data-i18n-html="${esc(page.bodyKey)}">${t(page.bodyKey, {}, ui)}</div>
      ${extra}`;
}

export function renderSitePage(
  page,
  {
    lang = "en",
    cssHref,
    faviconHref,
    bodyHtml,
    title: titleOverride,
    desc: descOverride,
    activeId,
    jsonLdName,
    jsonLdDesc,
    extraHead = "",
  } = {},
) {
  if (!page?.path) return "";
  const ui = lang === "zh" ? "zh" : "en";
  const path = localePath(ui, page.path);
  const url = absoluteUrl(page.path, ui);
  const enUrl = absoluteUrl(page.path, "en");
  const zhUrl = absoluteUrl(page.path, "zh");
  const title = titleOverride || t(page.titleKey, {}, ui);
  const desc = descOverride || t(page.descKey, {}, ui);
  const prefix = assetPrefix(path);
  const css = cssHref || `${prefix}assets/index.css`;
  const icon = faviconHref || `${prefix}favicon.svg`;
  const jsonLd = jsonLdScript(
    `page-jsonld-${page.id}`,
    webPageJsonLd(page, ui, { name: jsonLdName || title, description: jsonLdDesc || desc }),
  );
  const nav = primaryNavHtml(ui, activeId || page.id);
  const otherLang = ui === "zh" ? "en" : "zh";
  const otherHref = localePath(otherLang, page.path);
  const crossId = page.id;
  // About is discovery-only (related + footer) — not in CROSS_LINK_PAGE_IDS,
  // so About stays out of every guide footer strip.
  const wantsRelated =
    CROSS_LINK_PAGE_IDS.includes(crossId) ||
    crossId === "week-freeze" ||
    crossId === "about";
  let mainBody = bodyHtml != null ? bodyHtml : pageBodyHtml(page, ui);
  if (wantsRelated) {
    if (!String(mainBody).includes('class="related-pages"')) {
      mainBody = `${mainBody}
      ${relatedPagesHtml(ui, { currentId: crossId })}`;
    }
  } else if (bodyHtml == null) {
    mainBody = `${mainBody}
      <p class="page-home-link"><a href="${esc(ui === "zh" ? "/zh/" : "/")}">${esc(t("videoHome", {}, ui))}</a></p>`;
  }
  const crumbsHtml = shellBreadcrumbsHtml(page, ui, { name: jsonLdName || title });
  if (crumbsHtml && !String(mainBody).includes('class="site-breadcrumbs"')) {
    mainBody = `${crumbsHtml}
      ${mainBody}`;
  }
  const footerGuides = wantsRelated ? `\n      ${footerGuidesHtml(ui)}` : "";

  return `<!DOCTYPE html>
<html lang="${htmlLang(ui)}" data-ui-lang="${ui}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(desc)}" />
    ${jsonLd}
    <link rel="canonical" href="${esc(url)}" />
    <link rel="alternate" hreflang="en" href="${esc(enUrl)}" />
    <link rel="alternate" hreflang="zh-Hant" href="${esc(zhUrl)}" />
    <link rel="alternate" hreflang="x-default" href="${esc(enUrl)}" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="${ogLocale(ui)}" />
    <meta property="og:locale:alternate" content="${ui === "zh" ? "en_US" : "zh_TW"}" />
    <meta property="og:site_name" content="SessionScan" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(desc)}" />
    <meta property="og:url" content="${esc(url)}" />
    <meta property="og:image" content="${OG_IMAGE_URL}" />
    <meta property="og:image:width" content="${OG_IMAGE_WIDTH}" />
    <meta property="og:image:height" content="${OG_IMAGE_HEIGHT}" />
    <meta property="og:image:alt" content="${esc(title)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="${TWITTER_SITE}" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(desc)}" />
    <meta name="twitter:image" content="${OG_IMAGE_URL}" />
    <link rel="icon" href="${esc(icon)}" type="image/svg+xml" />
    ${fontHeadLinks(ui)}
    <link rel="stylesheet" href="${esc(css)}" />
    ${extraHead ? `${extraHead}\n` : ""}  </head>
  <body class="site-page" data-page="${esc(page.id)}">
    <div class="scanlines" aria-hidden="true"></div>
    <div class="vignette" aria-hidden="true"></div>
    <a class="skip" href="#main" data-i18n="skip">${esc(t("skip", {}, ui))}</a>
    <header class="site-header">
      <div class="header-inner">
        <a class="brand" href="${esc(ui === "zh" ? "/zh/" : "/")}" data-i18n-aria="brandAriaHome" aria-label="${esc(t("brandAriaHome", {}, ui))}">
          ${BRAND_MARK}
          <span class="brand-text">
            <strong>SESSIONSCAN</strong>
            <em data-i18n="brandEm">${esc(t("brandEm", {}, ui))}</em>
          </span>
        </a>
        <nav class="header-social" data-i18n-aria="headerSocialAria" aria-label="${esc(t("headerSocialAria", {}, ui))}">
          <a class="channel-link" href="${YOUTUBE_CHANNEL_URL}" target="_blank" rel="noopener noreferrer" data-i18n-aria="channelAria" aria-label="${esc(t("channelAria", {}, ui))}">
            <span class="channel-link-play" aria-hidden="true">▶</span>
            <span class="channel-link-full" data-i18n="channelFull" aria-hidden="true">${esc(t("channelFull", {}, ui))}</span>
            <span class="channel-link-short" aria-hidden="true">@sessionscan</span>
          </a>
          <a class="channel-link channel-link-ig" href="${INSTAGRAM_URL}" target="_blank" rel="noopener noreferrer" data-i18n-aria="instagramAria" aria-label="${esc(t("instagramAria", {}, ui))}">
            <span class="channel-link-full" data-i18n="instagramFull" aria-hidden="true">${esc(t("instagramFull", {}, ui))}</span>
            <span class="channel-link-short" aria-hidden="true">IG</span>
          </a>
        </nav>
        <nav class="lang-switch" data-i18n-aria="langSwitchAria" aria-label="${esc(t("langSwitchAria", {}, ui))}">
          <a href="${esc(ui === "en" ? path : otherHref)}" data-lang-link="en" hreflang="en"${ui === "en" ? ' aria-current="page"' : ""}>EN</a>
          <span class="lang-switch-sep" aria-hidden="true">/</span>
          <a href="${esc(ui === "zh" ? path : otherHref)}" data-lang-link="zh" hreflang="zh-Hant"${ui === "zh" ? ' aria-current="page"' : ""}>中文</a>
        </nav>
      </div>
      ${nav}
    </header>
    <main id="main" class="site-page-main${page.id === "money" ? " site-page-main--money" : ""}${page.id === "gta6" ? " site-page-main--gta6" : ""}">
      ${mainBody}
    </main>
    <footer class="site-footer">
      <p class="footer-social">
        <a class="footer-social-link" href="${YOUTUBE_CHANNEL_URL}" target="_blank" rel="noopener noreferrer" data-i18n-aria="channelAria" aria-label="${esc(t("channelAria", {}, ui))}">
          <span data-i18n="channelFull" aria-hidden="true">${esc(t("channelFull", {}, ui))}</span>
          <span class="footer-social-handle" aria-hidden="true">@sessionscan</span>
        </a>
      </p>${footerGuides}
      <p><strong>SessionScan</strong> · <span data-i18n="footerAbout">${esc(t("footerAbout", {}, ui))}</span></p>
      <p data-i18n="footerScope">${esc(t("footerScope", {}, ui))}</p>
    </footer>
    ${page.id === "money" ? moneyCalculatorScript() : ""}
    ${page.id === "gta6" ? gta6CountdownScript() : ""}
    ${cfWebAnalyticsHtml()}
  </body>
</html>
`;
}

/** Inject primary path nav + hash redirect into home HTML (EN source / built index). */
export function injectHomeShell(html, { lang = "en" } = {}) {
  let out = String(html || "");
  const ui = lang === "zh" ? "zh" : "en";
  const nav = primaryNavHtml(ui, "home");
  if (/<nav class="site-nav"[\s\S]*?<\/nav>/.test(out)) {
    out = out.replace(/<nav class="site-nav"[\s\S]*?<\/nav>/, nav);
  } else if (out.includes('class="tabs"')) {
    out = out.replace(/<nav class="tabs"/, `${nav}\n      <nav class="tabs"`);
  } else if (out.includes("</header>")) {
    out = out.replace("</header>", `      ${nav}\n    </header>`);
  }
  if (!out.includes("data-legacy-hash-redirect")) {
    const script = legacyHashRedirectScript().replace(
      "<script>",
      '<script data-legacy-hash-redirect>',
    );
    out = out.replace("</head>", `    ${script}\n  </head>`);
  }
  // Brand → home path (drop #hero as primary).
  out = out.replace(
    /(<a class="brand"[^>]*href=")#[^"]*(")/g,
    `$1${ui === "zh" ? "/zh/" : "/"}$2`,
  );
  out = out.replace(/data-i18n-aria="brandAria"/g, 'data-i18n-aria="brandAriaHome"');
  out = out.replace(
    /(<a class="brand"[^>]*aria-label=")[^"]*(")/,
    `$1${esc(t("brandAriaHome", {}, ui))}$2`,
  );

  // In-page + footer discovery for Archive / Money / Businesses (single source).
  const related = relatedPagesHtml(ui, { currentId: "home" });
  if (related) {
    if (/<nav class="related-pages"[\s\S]*?<\/nav>/.test(out)) {
      out = out.replace(/<nav class="related-pages"[\s\S]*?<\/nav>/, related);
    } else if (out.includes('<footer class="site-footer">')) {
      out = out.replace('<footer class="site-footer">', `${related}\n    <footer class="site-footer">`);
    } else if (out.includes("</main>")) {
      out = out.replace("</main>", `    ${related}\n    </main>`);
    }
  }
  const guides = footerGuidesHtml(ui);
  if (guides) {
    if (/<nav class="footer-guides"[\s\S]*?<\/nav>/.test(out)) {
      out = out.replace(/<nav class="footer-guides"[\s\S]*?<\/nav>/, guides);
    } else if (out.includes('<footer class="site-footer">')) {
      out = out.replace(
        /(<footer class="site-footer">\s*<p class="footer-social">[\s\S]*?<\/p>)/,
        `$1\n      ${guides}`,
      );
    }
  }
  return out;
}
