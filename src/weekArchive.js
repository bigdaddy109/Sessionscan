/**
 * Phase C weekly archive: index of past Rockstar weeks + frozen /week/YYYY-MM-DD/ pages.
 * Titles / highlights / outbound links only — never invent numbers or Short URLs.
 */

import { CARD_SITE_BASE, youtubeId } from "./cardShare.js";
import { snapshotNow } from "./homeExtras.js";
import { UI, t } from "./i18n.js";
import {
  absoluteUrl,
  esc,
  localePath,
  pageById,
  renderSitePage,
} from "./sitePages.js";
import {
  isJobInWeek,
  isOwnedShortThisWeek,
  jobDates,
  parseISODate,
  rockstarWeekStart,
  toIsoDate,
} from "./thisWeek.js";
import {
  buildWeekBullets,
  claimedStorageKey,
  formatClaimedProgress,
  freezeClaimedChecklistScript,
  pickHomeShort,
  weekSignalItems,
} from "./thisWeekHome.js";

export const WEEK_ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
/** Absolute Atom path for weekly archive freezes (EN freeze URLs). */
export const ARCHIVE_ATOM_PATH = "/week/feed.xml";

function isWeeklyTitle(item) {
  const blob = `${item?.title || ""} ${item?.title_en || ""} ${item?.tags || ""}`.toLowerCase();
  return /weekly|本週|本周|每週|每周|獎勵與折扣|bonuses?\s*&?\s*discounts/.test(blob);
}

/** Mid-week Date used so isThisWeekJob / bullets resolve to this Thursday key. */
export function weekRefDate(weekIso) {
  const start = parseISODate(weekIso);
  if (!start) return null;
  const mid = new Date(start.getTime());
  mid.setUTCDate(mid.getUTCDate() + 3);
  mid.setUTCHours(12, 0, 0, 0);
  return mid;
}

/**
 * Past weeks present in hub JSON (GTABase / IGN weekly titles with YYYY-MM-DD).
 * Newest first. Skips undated evergreen cards.
 */
export function listArchiveWeeks(data) {
  const map = new Map();
  const pools = [
    ...(data?.jobs_gtabase || []).map((j) => ({ ...j, _pool: "gtabase" })),
    ...(data?.jobs_ign || []).map((j) => ({ ...j, _pool: "ign" })),
  ];

  for (const job of pools) {
    if (!job || !isWeeklyTitle(job)) continue;
    const updated = parseISODate(job.updated);
    if (!updated) continue;
    const weekIso = toIsoDate(rockstarWeekStart(updated));
    if (!WEEK_ISO_RE.test(weekIso)) continue;
    const title = String(job.title || job.title_en || "").trim();
    if (!title) continue;
    const prev = map.get(weekIso);
    const row = {
      week: weekIso,
      title,
      url: String(job.url || "").trim(),
      source: String(job.source || "").trim(),
      updated: toIsoDate(updated),
      path: `week/${weekIso}/`,
    };
    if (!prev) {
      map.set(weekIso, row);
      continue;
    }
    // Prefer GTABase title; otherwise keep the earlier (usually richer) row.
    if (job._pool === "gtabase" && prev.source !== "GTABase") {
      map.set(weekIso, row);
    }
  }

  return [...map.values()].sort((a, b) => b.week.localeCompare(a.week));
}

export function weekPagePath(weekIso, lang = "en") {
  return localePath(lang, `week/${weekIso}/`);
}

/** Newest archive week row from hub JSON, or null. */
export function latestArchiveWeek(data) {
  const weeks = listArchiveWeeks(data);
  return weeks[0] || null;
}

/**
 * Home “latest freeze” link HTML under this-week bullets.
 * Uses listArchiveWeeks — never invents a week key.
 * Empty hub: hidden placeholder (browse index is `#weekArchiveIndex`).
 */
export function latestArchiveLinkHtml(data, lang = "en") {
  const ui = lang === "zh" ? "zh" : "en";
  const latest = latestArchiveWeek(data);
  if (!latest?.week) {
    return `<p class="week-archive-latest is-empty" hidden></p>`;
  }
  const href = weekPagePath(latest.week, ui);
  const label = t("weekArchiveLatestLink", { week: latest.week }, ui);
  return `<p class="week-archive-latest"><a href="${esc(href)}">${esc(label)}</a></p>`;
}

/**
 * Home browse-all archive index — locale `/week/` (always visible under this-week).
 * Complements tip freeze + Atom so players can open the full week list in-panel.
 */
export function homeArchiveIndexLinkHtml(lang = "en") {
  const ui = lang === "zh" ? "zh" : "en";
  const href = localePath(ui, "week/");
  return `<p class="week-archive-index" id="weekArchiveIndex"><a href="${esc(href)}" data-i18n="weekArchiveIndexLink">${esc(t("weekArchiveIndexLink", {}, ui))}</a></p>`;
}

/**
 * Inject home archive-index browse link under this-week bullets (before Atom).
 * Single source with archive index path — never invents a week URL.
 */
export function injectHomeArchiveIndexLink(html, { lang = "en" } = {}) {
  let out = String(html || "");
  const ui = lang === "zh" ? "zh" : "en";
  const body = homeArchiveIndexLinkHtml(ui);
  if (/id="weekArchiveIndex"/.test(out)) {
    out = out.replace(/<p class="week-archive-index"[^>]*>[\s\S]*?<\/p>/, body);
  } else if (/id="weekArchiveLatest"/.test(out)) {
    out = out.replace(
      /(<p class="week-archive-latest"[^>]*>[\s\S]*?<\/p>)/,
      `$1\n      ${body}`,
    );
  } else if (/id="weekArchiveFeed"/.test(out)) {
    out = out.replace(/(<p class="week-archive-feed[\s\S]*?<\/p>)/, `${body}\n      $1`);
  }
  return out;
}

/**
 * Home Atom discovery link — same `/week/feed.xml` as archive index (no invented path).
 */
export function homeArchiveFeedLinkHtml(lang = "en") {
  const ui = lang === "zh" ? "zh" : "en";
  return `<p class="week-archive-feed archive-feed-link" id="weekArchiveFeed"><a href="${esc(ARCHIVE_ATOM_PATH)}" type="application/atom+xml" data-i18n="archiveAtomLink">${esc(t("archiveAtomLink", {}, ui))}</a></p>`;
}

/**
 * Freeze-page money guide CTA — same path + copy as home `#homeMoneyGuideLink`
 * (locale `/guides/money/`), so players ticking a week can open cited takes
 * without scrolling to the related strip.
 */
export function freezeMoneyGuideLinkHtml(lang = "en") {
  const ui = lang === "zh" ? "zh" : "en";
  const page = pageById("money");
  const href = localePath(ui, page?.path || "guides/money/");
  return `<p class="archive-money-link home-money-link" id="archiveMoneyGuideLink"><a href="${esc(href)}" data-i18n="homeMoneyGuideLink">${esc(t("homeMoneyGuideLink", {}, ui))}</a></p>`;
}

/**
 * Freeze-page businesses CTA — same path + copy as home `#homeBusinessGuideLink`.
 */
export function freezeBusinessGuideLinkHtml(lang = "en") {
  const ui = lang === "zh" ? "zh" : "en";
  const page = pageById("businesses");
  const href = localePath(ui, page?.path || "guides/businesses/");
  return `<p class="archive-business-link home-business-link" id="archiveBusinessGuideLink"><a href="${esc(href)}" data-i18n="homeBusinessGuideLink">${esc(t("homeBusinessGuideLink", {}, ui))}</a></p>`;
}

/**
 * Freeze-page GTA 6 CTA — same path + copy as home `#homeGta6Link`, so players
 * on a freeze can open the official countdown without scrolling to related/footer.
 */
export function freezeGta6LinkHtml(lang = "en") {
  const ui = lang === "zh" ? "zh" : "en";
  const page = pageById("gta6");
  const href = localePath(ui, page?.path || "gta6/");
  return `<p class="archive-gta6-link home-gta6-link" id="archiveGta6Link"><a href="${esc(href)}" data-i18n="homeGta6Link">${esc(t("homeGta6Link", {}, ui))}</a></p>`;
}

/** Absolute Atom URL for home `<link rel="alternate">` (EN freeze entries). */
export function archiveAtomAbsoluteUrl() {
  return `${CARD_SITE_BASE.replace(/\/?$/, "")}${ARCHIVE_ATOM_PATH}`;
}

/**
 * Inject home Atom discovery: head alternate + body link under this-week bullets.
 * Single source with archive index feed path — never invents a feed URL.
 */
export function injectHomeAtomDiscovery(html, { lang = "en" } = {}) {
  let out = String(html || "");
  const ui = lang === "zh" ? "zh" : "en";
  const feedAbs = archiveAtomAbsoluteUrl();
  const alt = `<link rel="alternate" type="application/atom+xml" title="SessionScan weekly archive" href="${esc(feedAbs)}" />`;
  if (!/rel=["']alternate["'][^>]*application\/atom\+xml|type=["']application\/atom\+xml["'][^>]*rel=["']alternate["']/.test(out)) {
    out = out.replace("</head>", `    ${alt}\n  </head>`);
  }
  const body = homeArchiveFeedLinkHtml(ui);
  if (/id="weekArchiveFeed"/.test(out)) {
    out = out.replace(/<p class="week-archive-feed[\s\S]*?<\/p>/, body);
  } else if (/id="weekArchiveLatest"/.test(out)) {
    out = out.replace(
      /(<p class="week-archive-latest"[^>]*>[\s\S]*?<\/p>)/,
      `$1\n      ${body}`,
    );
  }
  return out;
}

/** Share URL for Short/IG captions — utm_source + utm_campaign=week-YYYY-MM-DD. */
export function weekShareUrl(weekIso, { lang = "en", source = "youtube" } = {}) {
  if (!WEEK_ISO_RE.test(String(weekIso || ""))) return "";
  const path = weekPagePath(weekIso, lang).replace(/^\//, "");
  const url = new URL(path, CARD_SITE_BASE);
  const src = String(source || "youtube").trim() || "youtube";
  url.searchParams.set("utm_source", src);
  url.searchParams.set("utm_campaign", `week-${weekIso}`);
  return url.toString();
}

/**
 * Owned Short for a freeze page. Dated Shorts only match their week; undated
 * Shorts attach only to the snapshot's current Rockstar week (never invent).
 */
export function pickArchiveShort(data, weekIso, snapshot = null) {
  if (!WEEK_ISO_RE.test(String(weekIso || ""))) return null;
  const short = data?.sessionscan_slot?.short;
  if (!short) return null;
  const id = youtubeId(short) || String(short.video_id || short.id || "").trim();
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;

  const item = {
    title: `${short.title || ""} ${short.title_en || ""}`,
    title_en: short.title_en || "",
    updated: short.date || "",
  };
  const dates = jobDates(item, parseISODate(weekIso) || new Date());
  if (dates.length) {
    if (!isJobInWeek(item, weekIso)) return null;
  } else {
    const live = snapshot || snapshotNow(data?.meta || {}) || new Date();
    const currentIso = toIsoDate(rockstarWeekStart(live));
    if (currentIso !== weekIso) return null;
    if (!isOwnedShortThisWeek(short, live)) return null;
  }

  return {
    ...short,
    video_id: id,
    owned: true,
    url: short.url || `https://www.youtube.com/shorts/${id}`,
  };
}

export function weekOutboundLinks(data, weekIso) {
  const ref = weekRefDate(weekIso);
  if (!ref) return [];
  const signals = weekSignalItems(data, ref).filter((s) => s.kind === "official" || s.kind === "job");
  const seen = new Set();
  const out = [];
  for (const s of signals) {
    if (!s.url || !s.title) continue;
    if (seen.has(s.url)) continue;
    seen.add(s.url);
    out.push({ title: s.title, url: s.url, source: s.source, updated: s.updated });
  }
  return out;
}

export function archiveSitemapUrls(weeks) {
  const out = [];
  for (const w of weeks || []) {
    const iso = typeof w === "string" ? w : w?.week;
    if (!WEEK_ISO_RE.test(String(iso || ""))) continue;
    out.push(absoluteUrl(`week/${iso}/`, "en"));
    out.push(absoluteUrl(`week/${iso}/`, "zh"));
  }
  return out;
}

/**
 * Freeze bullet list. Tip week only may be claimable — same localStorage key as home.
 * Older freezes stay read-only highlights (no invented checklist history).
 */
function bulletsHtml(bullets, { claimable = false, lang = "en", weekIso = "" } = {}) {
  const ui = lang === "zh" ? "zh" : "en";
  const ref = weekIso ? weekRefDate(weekIso) : null;
  const weekKey = claimable && ref ? claimedStorageKey(ref) : "";
  const listAttrs = claimable && weekKey
    ? ` id="archiveBulletList" data-claimed-key="${esc(weekKey)}"`
    : "";
  return `<ul class="week-bullet-list archive-bullet-list"${listAttrs}>
    ${bullets
      .map((b) => {
        const access = b.url
          ? `<a class="week-bullet-how" href="${esc(b.url)}" target="_blank" rel="noopener noreferrer">${esc(b.how)}</a>`
          : `<span class="week-bullet-how is-muted">${esc(b.how)}</span>`;
        const claim = claimable
          ? `<label class="week-bullet-claim">
          <input type="checkbox" class="week-bullet-check" data-bullet-id="${esc(b.id)}" />
          <span class="week-bullet-claim-text">${esc(t("weekBulletClaim", { label: b.label }, ui))}</span>
        </label>`
          : "";
        return `<li class="week-bullet${b.pending ? " is-pending" : ""}" data-bullet="${esc(b.id)}">
        ${claim}
        <span class="week-bullet-label">${esc(b.label)}</span>
        <span class="week-bullet-reward">${esc(b.reward)}</span>
        ${access}
      </li>`;
      })
      .join("")}
  </ul>`;
}

function shortEmbedHtml(short, ui) {
  if (!short?.video_id) {
    return `<p class="week-short-empty">${esc(t("archiveShortEmpty", {}, ui))}</p>`;
  }
  const id = short.video_id;
  const embed = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
  const watch = short.url || `https://www.youtube.com/shorts/${id}`;
  return `<div class="archive-short-embed">
    <iframe
      title="${esc(short.title || "SessionScan Short")}"
      src="${esc(embed)}"
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerpolicy="strict-origin-when-cross-origin"
      allowfullscreen
    ></iframe>
    <p class="archive-short-caption">
      <a href="${esc(watch)}" target="_blank" rel="noopener noreferrer">${esc(short.title || "SessionScan Short")}</a>
    </p>
  </div>`;
}

function outboundListHtml(links, ui) {
  if (!links.length) {
    return `<p class="archive-empty">${esc(t("archiveLinksEmpty", {}, ui))}</p>`;
  }
  return `<ul class="archive-outbound-list">
    ${links
      .map((link) => {
        const meta = [link.source, link.updated].filter(Boolean).join(" · ");
        return `<li>
        <a href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">${esc(link.title)}</a>
        ${meta ? `<span class="archive-outbound-meta">${esc(meta)}</span>` : ""}
      </li>`;
      })
      .join("")}
  </ul>`;
}

export function archiveIndexBodyHtml(data, lang = "en") {
  const ui = lang === "zh" ? "zh" : "en";
  const weeks = listArchiveWeeks(data);
  const intro = `<div class="page-body"><p>${esc(t("archiveIndexIntro", {}, ui))}</p></div>`;
  const feedLink = `<p class="archive-feed-link"><a href="${esc(ARCHIVE_ATOM_PATH)}" type="application/atom+xml">${esc(t("archiveAtomLink", {}, ui))}</a></p>`;
  if (!weeks.length) {
    return `${intro}${feedLink}<p class="archive-empty">${esc(t("archiveIndexEmpty", {}, ui))}</p>`;
  }
  // Tip of listArchiveWeeks only — never invent a "Latest" on an older row.
  const latestWeek = weeks[0]?.week;
  const list = `<ul class="archive-week-list">
    ${weeks
      .map((w, i) => {
        const href = weekPagePath(w.week, ui);
        const isLatest = i === 0 && w.week === latestWeek;
        const badge = isLatest
          ? `<span class="archive-latest-badge">${esc(t("archiveLatestBadge", {}, ui))}</span>`
          : "";
        const linkClass = isLatest ? "archive-week-link is-latest" : "archive-week-link";
        return `<li${isLatest ? ' class="archive-week-item is-latest"' : ""}>
        <a class="${linkClass}" href="${esc(href)}">
          <time datetime="${esc(w.week)}">${esc(w.week)}</time>
          <span class="archive-week-title">${esc(w.title)}${badge}</span>
        </a>
      </li>`;
      })
      .join("")}
  </ul>`;
  return `${intro}${feedLink}${list}`;
}

/**
 * Atom feed of listArchiveWeeks tip→older. Entries link EN freeze pages only.
 * Never invents week keys.
 */
export function renderArchiveAtomFeed(data) {
  const weeks = listArchiveWeeks(data);
  const feedUrl = `${CARD_SITE_BASE.replace(/\/?$/, "")}${ARCHIVE_ATOM_PATH}`;
  const indexUrl = absoluteUrl("week/", "en");
  const updated = weeks[0]?.week ? `${weeks[0].week}T12:00:00Z` : "1970-01-01T00:00:00Z";
  const entries = weeks
    .map((w) => {
      const href = absoluteUrl(`week/${w.week}/`, "en");
      const entryUpdated = `${w.week}T12:00:00Z`;
      return `  <entry>
    <id>${esc(href)}</id>
    <title>${esc(w.title || w.week)}</title>
    <updated>${esc(entryUpdated)}</updated>
    <link rel="alternate" href="${esc(href)}" />
    <summary>${esc(w.title || w.week)}</summary>
  </entry>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>SessionScan weekly archive</title>
  <subtitle>Frozen GTA Online Thursday weeks — titles and outbound links only</subtitle>
  <id>${esc(feedUrl)}</id>
  <link rel="self" href="${esc(feedUrl)}" type="application/atom+xml" />
  <link rel="alternate" href="${esc(indexUrl)}" />
  <updated>${esc(updated)}</updated>
  <author><name>SessionScan</name></author>
${entries}
</feed>
`;
}

/**
 * Adjacent freeze weeks from listArchiveWeeks (newest-first).
 * newer = closer to tip; older = further back. Never invents week keys.
 */
export function archiveAdjacentWeeks(data, weekIso) {
  const weeks = listArchiveWeeks(data);
  const idx = weeks.findIndex((w) => w.week === weekIso);
  if (idx < 0) return { newer: null, older: null };
  return {
    newer: idx > 0 ? weeks[idx - 1] : null,
    older: idx < weeks.length - 1 ? weeks[idx + 1] : null,
  };
}

export function archiveWeekPagerHtml(data, weekIso, lang = "en") {
  const ui = lang === "zh" ? "zh" : "en";
  const { newer, older } = archiveAdjacentWeeks(data, weekIso);
  if (!newer && !older) return "";
  const olderLink = older
    ? `<a class="archive-pager-older" rel="prev" href="${esc(weekPagePath(older.week, ui))}">${esc(t("archivePagerOlder", { week: older.week }, ui))}</a>`
    : `<span class="archive-pager-older is-empty" aria-hidden="true"></span>`;
  const newerLink = newer
    ? `<a class="archive-pager-newer" rel="next" href="${esc(weekPagePath(newer.week, ui))}">${esc(t("archivePagerNewer", { week: newer.week }, ui))}</a>`
    : `<span class="archive-pager-newer is-empty" aria-hidden="true"></span>`;
  return `<nav class="archive-week-pager" aria-label="${esc(t("archivePagerAria", {}, ui))}">
    ${olderLink}
    ${newerLink}
  </nav>`;
}

/** Callout when viewing an older freeze — links tip of listArchiveWeeks only. */
export function archiveJumpLatestHtml(data, weekIso, lang = "en") {
  const ui = lang === "zh" ? "zh" : "en";
  const tip = latestArchiveWeek(data);
  if (!tip?.week || tip.week === weekIso) return "";
  const href = weekPagePath(tip.week, ui);
  return `<p class="archive-jump-latest"><a href="${esc(href)}">${esc(t("archiveJumpLatest", { week: tip.week }, ui))}</a></p>`;
}

export function weekFreezeBodyHtml(data, weekIso, lang = "en") {
  const ui = lang === "zh" ? "zh" : "en";
  const ref = weekRefDate(weekIso);
  if (!ref) return `<p class="archive-empty">${esc(t("archiveWeekInvalid", {}, ui))}</p>`;

  const weeks = listArchiveWeeks(data);
  const entry = weeks.find((w) => w.week === weekIso);
  const snapshot = snapshotNow(data?.meta || {}) || ref;
  const short = pickArchiveShort(data, weekIso, snapshot);
  const bullets = buildWeekBullets(data, ref, ui);
  const links = weekOutboundLinks(data, weekIso);
  const indexHref = localePath(ui, "week/");
  const ytShare = weekShareUrl(weekIso, { lang: ui, source: "youtube" });
  const igShare = weekShareUrl(weekIso, { lang: ui, source: "instagram" });
  // Tip of listArchiveWeeks only — same Rockstar-week key as home claimed checklist.
  const tipWeek = latestArchiveWeek(data)?.week;
  const claimable = Boolean(tipWeek && tipWeek === weekIso);

  const heading = entry?.title
    ? `<p class="archive-week-lead">${esc(entry.title)}</p>`
    : "";

  return `${heading}
    ${archiveJumpLatestHtml(data, weekIso, ui)}
    <section class="week-short archive-freeze-short" aria-labelledby="archiveShortHeading">
      <div class="week-panel-kicker">
        <strong id="archiveShortHeading" data-i18n="archiveShortKicker">${esc(t("archiveShortKicker", {}, ui))}</strong>
        <span data-i18n="archiveShortTag">${esc(t("archiveShortTag", {}, ui))}</span>
      </div>
      ${shortEmbedHtml(short, ui)}
    </section>
    <section class="week-bullets archive-freeze-bullets" aria-labelledby="archiveBulletsHeading">
      <div class="week-panel-kicker">
        <strong id="archiveBulletsHeading" data-i18n="archiveBulletsKicker">${esc(t("archiveBulletsKicker", {}, ui))}</strong>
        <span data-i18n="weekBulletsTag">${esc(t("weekBulletsTag", {}, ui))}</span>
      </div>
      ${claimable ? `<p class="week-bullets-hint" data-i18n="archiveBulletsClaimHint">${esc(t("archiveBulletsClaimHint", {}, ui))}</p>` : ""}
      ${claimable ? (() => {
        const tpl = String((UI[ui] || UI.en).weekClaimProgress || UI.en.weekClaimProgress || "Claimed {done} of {total}");
        const zero = formatClaimedProgress(0, bullets.length, ui);
        const clearLabel = t("weekClaimClear", {}, ui);
        const clearAria = t("weekClaimClearAria", {}, ui);
        return `<div class="week-claim-toolbar">
        <p class="week-claim-progress" id="archiveClaimProgress" data-progress-template="${esc(tpl)}" aria-live="polite">${esc(zero)}</p>
        <button type="button" class="week-claim-clear" id="archiveClaimClear" hidden data-i18n="weekClaimClear" data-i18n-aria="weekClaimClearAria" aria-label="${esc(clearAria)}">${esc(clearLabel)}</button>
      </div>`;
      })() : ""}
      ${bulletsHtml(bullets, { claimable, lang: ui, weekIso })}
      ${freezeMoneyGuideLinkHtml(ui)}
      ${freezeBusinessGuideLinkHtml(ui)}
      ${freezeGta6LinkHtml(ui)}
    </section>
    <section class="archive-outbound" aria-labelledby="archiveLinksHeading">
      <div class="week-panel-kicker">
        <strong id="archiveLinksHeading" data-i18n="archiveLinksKicker">${esc(t("archiveLinksKicker", {}, ui))}</strong>
        <span data-i18n="archiveLinksTag">${esc(t("archiveLinksTag", {}, ui))}</span>
      </div>
      ${outboundListHtml(links, ui)}
    </section>
    <p class="archive-share-hint">${esc(t("archiveShareHint", {}, ui))}
      <a href="${esc(ytShare)}">YouTube utm</a> ·
      <a href="${esc(igShare)}">Instagram utm</a>
    </p>
    ${archiveWeekPagerHtml(data, weekIso, ui)}
    <p class="page-home-link"><a href="${esc(indexHref)}">${esc(t("archiveBackToIndex", {}, ui))}</a></p>
    ${claimable ? freezeClaimedChecklistScript() : ""}`;
}

export function renderArchiveIndexPage(data, opts = {}) {
  const page = pageById("week");
  if (!page) return "";
  const lang = opts.lang === "zh" ? "zh" : "en";
  const bodyHtml = `
      <h1 data-i18n="pageWeekHeading">${esc(t("pageWeekHeading", {}, lang))}</h1>
      ${archiveIndexBodyHtml(data, lang)}`;
  const feedAbs = `${CARD_SITE_BASE.replace(/\/?$/, "")}${ARCHIVE_ATOM_PATH}`;
  return renderSitePage(
    { ...page, stub: false },
    {
      ...opts,
      lang,
      bodyHtml,
      title: t("pageWeekTitle", {}, lang),
      desc: t("pageWeekDesc", {}, lang),
      extraHead: `<link rel="alternate" type="application/atom+xml" title="SessionScan weekly archive" href="${esc(feedAbs)}" />`,
    },
  );
}

export function renderWeekFreezePage(data, weekIso, opts = {}) {
  if (!WEEK_ISO_RE.test(String(weekIso || ""))) return "";
  const lang = opts.lang === "zh" ? "zh" : "en";
  const path = `week/${weekIso}/`;
  const weeks = listArchiveWeeks(data);
  const entry = weeks.find((w) => w.week === weekIso);
  const title = t("archiveWeekTitle", { week: weekIso }, lang);
  const desc = t(
    "archiveWeekDesc",
    { week: weekIso, title: entry?.title || weekIso },
    lang,
  );
  const bodyHtml = `
      <h1>${esc(t("archiveWeekHeading", { week: weekIso }, lang))}</h1>
      ${weekFreezeBodyHtml(data, weekIso, lang)}`;
  return renderSitePage(
    {
      id: "week-freeze",
      path,
      navKey: "navArchive",
      titleKey: "archiveWeekTitle",
      descKey: "archiveWeekDesc",
      stub: false,
    },
    {
      ...opts,
      lang,
      bodyHtml,
      title,
      desc,
      activeId: "week",
      jsonLdName: title,
      jsonLdDesc: desc,
    },
  );
}

/** Dev-server helper: match /week/YYYY-MM-DD/ (+ /zh/). */
export function matchWeekFreezePath(urlPath) {
  const clean = String(urlPath || "").split("?")[0].split("#")[0].replace(/\/index\.html$/, "") || "/";
  const normalized = clean.endsWith("/") || clean === "/" ? clean : `${clean}/`;
  const m = normalized.match(/^\/(?:zh\/)?week\/(\d{4}-\d{2}-\d{2})\/$/);
  if (!m) return null;
  const weekIso = m[1];
  if (!WEEK_ISO_RE.test(weekIso)) return null;
  const lang = normalized.startsWith("/zh/") ? "zh" : "en";
  return { weekIso, lang, path: weekPagePath(weekIso, lang) };
}

/** Convenience for home/tests: current-week Short pick unchanged. */
export { pickHomeShort };
