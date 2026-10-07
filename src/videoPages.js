/** Collect YouTube videos and render static per-video share pages / sitemap. */

import { CARD_SITE_BASE, cardActionsHtml, cardAttrs, videoPageUrl, youtubeId } from "./cardShare.js";

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

export function langLabel(lang) {
  if (lang === "zh") return "中文";
  if (lang === "ja") return "日文";
  if (lang === "ko") return "韓文";
  if (lang === "en") return "EN";
  return "";
}

export function fmtViews(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "";
  if (n >= 10000) return `${(n / 10000).toFixed(1).replace(/\.0$/, "")} 萬`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

export function videoPageTitle(video) {
  const title = String(video?.title || "").trim();
  return title ? `${title}｜SessionScan` : `YouTube 影片｜SessionScan`;
}

export function videoPageDescription(video) {
  const bits = [video?.channel, video?.date, video?.game].map((x) => String(x || "").trim()).filter(Boolean);
  const tail = "SessionScan 只掛標題外連，不轉載。";
  return bits.length ? `${bits.join(" · ")}。${tail}` : `GTA Online 攻略影片。${tail}`;
}

function xmlEsc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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
    .map((loc) => `  <url>\n    <loc>${xmlEsc(loc)}</loc>\n  </url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function sitemapUrls(videos) {
  return [CARD_SITE_BASE, ...videos.map((v) => videoPageUrl(v.video_id)).filter(Boolean)];
}

function videoCardHtml(video) {
  const id = video.video_id;
  const thumb = thumbUrl(id, "hqdefault");
  const lang = langLabel(video.lang);
  const views = fmtViews(video.views);
  const channelLink =
    video.owned && video.channel_url
      ? `<p class="blurb"><a href="${esc(video.channel_url)}" target="_blank" rel="noopener noreferrer">SessionScan 頻道 @sessionscan ↗</a></p>`
      : "";
  return `<article class="video-card video-page-card" ${cardAttrs(video)}>
      <a class="thumb-link" href="${esc(video.url)}" target="_blank" rel="noopener noreferrer">
        <img class="thumb" src="${esc(thumb)}" alt="${esc(video.title || "")}" />
        <div class="play" aria-hidden="true"><span>▶</span></div>
      </a>
      <div class="video-info">
        <div class="video-info-top">
          <h1><a href="${esc(video.url)}" target="_blank" rel="noopener noreferrer">${esc(video.title || "YouTube 影片")}</a></h1>
          ${cardActionsHtml(video, video.kind === "short" ? "new" : "hot")}
        </div>
        <div class="card-meta">
          ${video.owned ? `<span class="tag">SessionScan</span>` : ""}
          ${video.kind === "short" ? `<span class="tag">Short</span>` : ""}
          ${lang ? `<span class="tag">${esc(lang)}</span>` : ""}
          ${video.game ? `<span class="tag">${esc(video.game)}</span>` : ""}
          ${video.channel ? `<span>${esc(video.channel)}</span>` : ""}
          ${views ? `<span>👁 ${esc(views)}</span>` : ""}
          ${video.date ? `<span>${esc(video.date)}</span>` : ""}
        </div>
        ${channelLink}
      </div>
    </article>`;
}

const COPY_SCRIPT = `<script>
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".card-copy");
  if (!btn) return;
  const link = btn.getAttribute("data-copy") || "";
  if (!link || !navigator.clipboard?.writeText) return;
  navigator.clipboard.writeText(link).then(() => {
    btn.classList.add("is-copied");
    btn.setAttribute("aria-label", "已複製");
    setTimeout(() => {
      btn.classList.remove("is-copied");
      btn.setAttribute("aria-label", "複製連結");
    }, 1600);
  }).catch(() => {});
});
</script>`;

export function renderVideoPage(video, { cssHref, faviconHref } = {}) {
  const id = youtubeId(video);
  if (!id) return "";
  const page = videoPageUrl(id);
  const title = videoPageTitle(video);
  const desc = videoPageDescription(video);
  const image = thumbUrl(id, "hqdefault");
  const css = cssHref || "../../assets/index.css";
  const icon = faviconHref || "../../favicon.svg";
  const home = "../../";
  return `<!DOCTYPE html>
<html lang="zh-Hant">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(desc)}" />
    <link rel="canonical" href="${esc(page)}" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="zh_TW" />
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
    <a class="skip" href="#video">跳至內容 Skip to content</a>
    <header class="site-header">
      <div class="header-inner">
        <a class="brand" href="${esc(home)}" aria-label="SessionScan 回首頁">
          ${BRAND_MARK}
          <span class="brand-text">
            <strong>SESSIONSCAN</strong>
            <em>GTA HUB · 夜掃描</em>
          </span>
        </a>
        <a class="channel-link" href="${esc(home)}">回首頁</a>
      </div>
    </header>
    <main class="video-page-main" id="video">
      ${videoCardHtml(video)}
      <p class="video-page-links">
        <a class="watch-yt" href="${esc(video.url)}" target="_blank" rel="noopener noreferrer">在 YouTube 觀看 ↗</a>
        <a href="${esc(home)}">回首頁</a>
      </p>
    </main>
    <footer class="site-footer">
      <p><strong>SessionScan</strong> · GTA 5／Online／GTA 6 情報站，與其他同名 App 無關 · 無廣告</p>
      <p>範圍：GTA 5、GTA 6（GTA Online 歸在 GTA 5）。不含 GTA 4。不含 RDO。卡片只外連，不轉載攻略全文。</p>
    </footer>
    ${COPY_SCRIPT}
  </body>
</html>
`;
}
