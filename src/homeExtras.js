/** Homepage extras: highlights, snapshot stats, rank deltas, video sort/filter. */

import { parseSnapshotNow } from "./bahaTime.js";
import { cardId } from "./cardShare.js";
import { fmtViews, t } from "./i18n.js";
import { filterOtherShorts } from "./shortsFilter.js";
import { isOwnedShortThisWeek, isThisWeekJob } from "./thisWeek.js";

export const VIDEO_RANK_KEYS = ["videos_hot_zh", "videos_hot_en", "videos_hot_ja", "videos_shorts"];

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

export function snapshotNow(meta = {}) {
  return parseSnapshotNow(meta._last_run || meta.snapshot_date || meta.hot);
}

export function videoKey(item) {
  const id = String(item?.video_id || "").trim();
  if (YT_ID.test(id)) return id;
  return "";
}

export function extractRankPrev(site) {
  const prev = {};
  if (!site || typeof site !== "object") return prev;
  for (const key of VIDEO_RANK_KEYS) {
    const mapping = {};
    const rows = site[key] || [];
    if (!Array.isArray(rows)) continue;
    rows.forEach((item, i) => {
      const id = videoKey(item);
      if (id) mapping[id] = i + 1;
    });
    if (Object.keys(mapping).length) prev[key] = mapping;
  }
  return prev;
}

/** Compare list position to the previous snapshot. Missing list map → no badge. */
export function rankDelta(videoId, currentRank, prevMap) {
  if (!videoId || currentRank == null) return { kind: "none", delta: 0 };
  if (!prevMap || typeof prevMap !== "object" || !Object.keys(prevMap).length) {
    return { kind: "none", delta: 0 };
  }
  const prev = prevMap[videoId];
  if (prev == null) return { kind: "new", delta: 0 };
  const d = Number(prev) - Number(currentRank);
  if (d > 0) return { kind: "up", delta: d };
  if (d < 0) return { kind: "down", delta: -d };
  return { kind: "same", delta: 0 };
}

export function rankDeltaHtml(delta) {
  if (!delta || delta.kind === "none" || delta.kind === "same") return "";
  if (delta.kind === "new") return `<span class="rank-delta rank-new">NEW</span>`;
  if (delta.kind === "up") return `<span class="rank-delta rank-up">▲${delta.delta}</span>`;
  if (delta.kind === "down") return `<span class="rank-delta rank-down">▼${delta.delta}</span>`;
  return "";
}

function isWeeklyJobCard(item) {
  const blob = `${item?.title || ""} ${item?.title_en || ""} ${item?.tags || ""}`.toLowerCase();
  return /weekly|本週|本周|每週|每周|獎勵|折扣|bonus|discount/.test(blob);
}

export function pickOfficialWeekly(data) {
  const pools = [
    ...(data?.jobs_gtabase || []),
    ...(data?.jobs_ign || []),
    ...(data?.jobs_wiki || []),
  ].filter((it) => it && it.url && it.title && isWeeklyJobCard(it));
  pools.sort((a, b) => {
    const da = String(a.updated || "");
    const db = String(b.updated || "");
    if (da !== db) return db.localeCompare(da);
    return (a.rank || 99) - (b.rank || 99);
  });
  return pools[0] || null;
}

export function gta6ScheduleLine(data, lang = "en") {
  const blobs = [];
  for (const key of ["jobs_gtabase", "jobs_ign", "jobs_wiki", "videos_hot_zh", "videos_hot_en", "tweets_zh", "tweets_en"]) {
    for (const it of data?.[key] || []) {
      blobs.push(`${it.title || ""} ${it.title_en || ""} ${it.text || ""} ${it.blurb || ""}`);
    }
  }
  const hay = blobs.join("\n");
  if (!/gta\s*6|gta\s*vi|俠盜獵車手\s*6|grand theft auto\s*(?:6|vi)/i.test(hay)) return "";
  if (/11\s*月\s*19\s*日/.test(hay) || /november\s*19/i.test(hay)) {
    return t("gta6Schedule", {}, lang);
  }
  return "";
}

export function collectTrackedVideos(data) {
  const seen = new Set();
  const out = [];
  const push = (v) => {
    if (!v) return;
    const id = videoKey(v);
    const key = id || `${v.title || ""}|${v.url || ""}`;
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(v);
  };
  for (const lang of ["zh", "en", "ja"]) {
    for (const v of data?.[`videos_hot_${lang}`] || []) push(v);
  }
  push(data?.sessionscan_slot?.short);
  for (const v of filterOtherShorts(data?.videos_shorts || [])) {
    if (v.lang === "ko") continue;
    push(v);
  }
  return out;
}

export function isThisWeekVideo(item, now = new Date()) {
  return isThisWeekJob(
    { title: item?.title || "", title_en: item?.title_en || "", updated: item?.date || "" },
    now,
  );
}

export function daysBetween(dateStr, now = new Date()) {
  const m = String(dateStr || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const ref = now instanceof Date ? now : new Date(now);
  const taipei = new Date(ref.getTime() + 8 * 60 * 60 * 1000);
  const t = Date.UTC(taipei.getUTCFullYear(), taipei.getUTCMonth(), taipei.getUTCDate());
  return Math.round((t - d) / 86400000);
}

export function hubStats(data, now = new Date()) {
  const videos = collectTrackedVideos(data);
  const withViews = videos.filter((v) => typeof v.views === "number");
  const totalViews = withViews.reduce((sum, v) => sum + v.views, 0);
  const channelViews = new Map();
  for (const v of videos) {
    if (!isThisWeekVideo(v, now)) continue;
    const ch = String(v.channel || "").trim();
    if (!ch || typeof v.views !== "number") continue;
    channelViews.set(ch, (channelViews.get(ch) || 0) + v.views);
  }
  let topChannel = "";
  let topChannelViews = 0;
  for (const [ch, views] of channelViews) {
    if (views > topChannelViews) {
      topChannel = ch;
      topChannelViews = views;
    }
  }
  return {
    videoCount: videos.length,
    viewedCount: withViews.length,
    totalViews: withViews.length ? totalViews : null,
    avgViews: withViews.length ? Math.round(totalViews / withViews.length) : null,
    topChannel,
    topChannelViews: topChannel ? topChannelViews : null,
  };
}

export function videoChannels(list) {
  const set = new Set();
  for (const v of list || []) {
    const ch = String(v.channel || "").trim();
    if (ch) set.add(ch);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "zh-Hant"));
}

export function filterSortVideos(list, { sort = "rank", channel = "", period = "all", now = new Date() } = {}) {
  let out = (list || []).map((v, i) => ({ ...v, _rank: i + 1 }));
  if (channel) {
    out = out.filter((v) => String(v.channel || "").trim() === channel);
  }
  if (period === "week") {
    out = out.filter((v) => isThisWeekVideo(v, now));
  } else if (period === "30d") {
    out = out.filter((v) => {
      const age = daysBetween(v.date, now);
      return age == null || age <= 30;
    });
  }
  if (sort === "views") {
    out.sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0) || a._rank - b._rank);
  } else if (sort === "newest") {
    out.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || a._rank - b._rank);
  } else {
    out.sort((a, b) => a._rank - b._rank);
  }
  return out;
}

export function weekHighlights(data, now = new Date(), lang = "en") {
  const items = [];
  const weekly = pickOfficialWeekly(data || {});
  if (weekly) {
    items.push({
      kind: "job",
      tab: "jobs",
      id: cardId(weekly),
      kicker: t("highlightOfficial", {}, lang),
      title: weekly.title,
      meta: [weekly.source, weekly.updated].filter(Boolean).join(" · "),
    });
  }
  const schedule = gta6ScheduleLine(data || {}, lang);
  if (schedule) {
    items.push({
      kind: "note",
      tab: "jobs",
      id: "",
      kicker: t("highlightSchedule", {}, lang),
      title: schedule,
      meta: "",
    });
  }
  const hotPools = [];
  for (const lang of ["zh", "en", "ja"]) {
    (data?.[`videos_hot_${lang}`] || []).forEach((v, i) => {
      hotPools.push({ ...v, _rank: i + 1, hotLang: lang });
    });
  }
  const weekHot = hotPools.filter((v) => isThisWeekVideo(v, now));
  const pool = weekHot.length ? weekHot : hotPools;
  const topHot = pool.slice().sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0) || a._rank - b._rank)[0];
  if (topHot) {
    const views = typeof topHot.views === "number" ? fmtViews(topHot.views, { live: true, lang }) : "";
    items.push({
      kind: "video",
      tab: "hot",
      id: cardId(topHot),
      kicker: weekHot.length ? t("highlightHotWeek", {}, lang) : t("highlightHotGuide", {}, lang),
      title: topHot.title,
      meta: [topHot.channel, views ? `👁 ${views}` : ""].filter(Boolean).join(" · "),
    });
  }
  const owned = data?.sessionscan_slot?.short;
  if (owned && (owned.video_id || owned.url) && isOwnedShortThisWeek(owned, now)) {
    items.push({
      kind: "short",
      tab: "new",
      id: cardId(owned),
      kicker: t("highlightOwnedShort", {}, lang),
      title: owned.title || "SessionScan Short",
      meta: "SessionScan",
    });
  } else {
    const shorts = filterOtherShorts(data?.videos_shorts || []).filter((v) => v.lang !== "ko");
    const weekShorts = shorts.filter((v) => isThisWeekVideo(v, now));
    const topShort = weekShorts[0] || shorts[0];
    if (topShort) {
      items.push({
        kind: "short",
        tab: "new",
        id: cardId(topShort),
        kicker: t("highlightTrendingShort", {}, lang),
        title: topShort.title,
        meta: topShort.channel || "",
      });
    }
  }
  return items.slice(0, 4);
}
