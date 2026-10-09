import { THIS_WEEK_MAX, isOwnedShortThisWeek, isThisWeekJob, withDisplayRanks } from "./thisWeek.js";
import { filterOtherShorts } from "./shortsFilter.js";
import { bahaAbsTime, isHotSnapshotStale, isRelativeForumTime, parseSnapshotNow } from "./bahaTime.js";
import {
  TAB_TO_HASH,
  cardActionsHtml,
  cardAttrs,
  cardId,
  findCardLocation,
  parseHash,
  uiCopy,
} from "./cardShare.js";
import {
  filterSortVideos,
  gta6ScheduleLine,
  hubStats,
  pickOfficialWeekly,
  rankDelta,
  rankDeltaHtml,
  snapshotNow,
  videoChannels,
  videoKey,
  weekHighlights,
} from "./homeExtras.js";
import {
  SEARCH_ALIAS_GROUPS,
  applyDomI18n,
  dataUrl,
  fmtViews as fmtViewsI18n,
  getUiLang,
  isZhPath,
  langHay,
  langLabel,
  localeHref,
  persistLang,
  setUiLang,
  t,
} from "./i18n.js";

const SOURCE_HINT_KEYS = {
  gtabase: "jobsHintGtabase",
  ign: "jobsHintIgn",
  wiki: "jobsHintWiki",
};

function isLiveData(data) {
  const meta = data?.meta || {};
  if (meta.sample === true || meta.scraper_status === "disabled") return false;
  return Boolean(meta._last_run);
}

const state = {
  data: null,
  jobsSource: "gtabase",
  forumSource: "bahamut",
  hotLang: "en",
  newLang: "zh",
  tweetsLang: "en",
  activeTab: "jobs",
  hashLock: false,
  showOlderJobs: false,
  hotSort: "rank",
  hotChannel: "",
  hotPeriod: "all",
  newSort: "rank",
  newChannel: "",
  newPeriod: "all",
};

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

function esc(value) {
  const d = document.createElement("div");
  d.textContent = value == null ? "" : String(value);
  return d.innerHTML.replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function fmtViews(n) {
  return fmtViewsI18n(n, { live: isLiveData(state.data) });
}

function sampleBadge() {
  if (isLiveData(state.data)) return "";
  return `<span class="tag sample">${esc(t("sampleBadge"))}</span>`;
}

function uiLang() {
  return getUiLang();
}

function shareLang() {
  return uiLang();
}

function jobCard(item) {
  return `
    <article class="job-card" ${cardAttrs(item)}>
      ${cardActionsHtml(item, "jobs", shareLang())}
      <div class="rank">${esc(item.rank)}</div>
      <h3><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${esc(item.title)}</a></h3>
      <div class="card-meta">
        ${sampleBadge()}
        <span class="tag">${esc(item.source)}</span>
        <span class="tag">${esc(item.game)}</span>
        ${item.updated ? `<span>⏱ ${esc(item.updated)}</span>` : ""}
      </div>
      ${item.blurb ? `<p class="blurb">${esc(item.blurb)}</p>` : ""}
    </article>`;
}

function videoCard(v, rank, extraClass, tab = "hot", rankKey = "") {
  const id = v.video_id;
  const thumb = `https://i.ytimg.com/vi/${encodeURIComponent(id)}/mqdefault.jpg`;
  const lang = langLabel(v.lang) || t("langLabelEn");
  const cls = extraClass ? `video-card ${extraClass}` : "video-card";
  const channelLink = v.owned
    ? `<p class="blurb"><a href="${esc(v.channel_url || "https://www.youtube.com/@sessionscan")}" target="_blank" rel="noopener noreferrer">${esc(t("channelOwned"))}</a></p>`
    : "";
  const delta = rank != null && rankKey
    ? rankDeltaHtml(rankDelta(videoKey(v), rank, state.data?.rank_prev?.[rankKey]))
    : "";
  return `
    <article class="${cls}" ${cardAttrs(v)}>
      <button type="button" class="thumb-link" data-play="${esc(id)}" aria-label="${esc(t("playAria", { title: v.title }))}">
        ${rank != null ? `<div class="rank">${rank}</div>` : ""}
        ${delta}
        <img class="thumb" src="${thumb}" alt="" loading="lazy" />
        <div class="play" aria-hidden="true"><span>▶</span></div>
      </button>
      <div class="video-info">
        <div class="video-info-top">
          <h3><a href="${esc(v.url)}" target="_blank" rel="noopener noreferrer">${esc(v.title)}</a></h3>
          ${cardActionsHtml(v, tab, shareLang())}
        </div>
        <div class="card-meta">
          ${sampleBadge()}
          ${v.owned ? `<span class="tag">SessionScan</span>` : ""}
          <span class="tag">${lang}</span>
          <span>${esc(v.channel)}</span>
          ${v.views != null ? `<span>👁 ${esc(fmtViews(v.views))}</span>` : ""}
          ${v.date ? `<span>${esc(v.date)}</span>` : ""}
        </div>
        ${channelLink}
      </div>
    </article>`;
}

function ownedChannelLink(channel) {
  return `<p class="blurb"><a href="${esc(channel)}" target="_blank" rel="noopener noreferrer">${esc(t("channelOwned"))}</a></p>`;
}

function expiredOwnedSlot(channel, short) {
  const prevUrl = short?.url || (short?.video_id ? `https://www.youtube.com/shorts/${short.video_id}` : "");
  const prev = prevUrl
    ? `<p class="blurb"><a href="${esc(prevUrl)}" target="_blank" rel="noopener noreferrer">${esc(t("prevShort", { title: short.title || "SessionScan Short" }))}</a></p>`
    : "";
  return `
    <article class="slot-card owned-short empty" data-card>
      <strong>SESSIONSCAN</strong>
      <p>${esc(t("noOwnedShort"))}</p>
      ${ownedChannelLink(channel)}
      ${prev}
      <div class="card-meta" style="justify-content:center;margin-top:10px">
        ${sampleBadge()}
        <span class="tag">${esc(t("ownedShortTag"))}</span>
        <span class="tag">${esc(t("noFakeLink"))}</span>
      </div>
    </article>`;
}

function sessionScanSlot(slot) {
  const channel = slot?.channel_url || "https://www.youtube.com/@sessionscan";
  const short = slot?.short;
  const id = short?.video_id || "";
  if (/^[A-Za-z0-9_-]{11}$/.test(id)) {
    if (!isOwnedShortThisWeek(short)) {
      return expiredOwnedSlot(channel, short);
    }
    const embed = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
    const thumb = `https://i.ytimg.com/vi/${encodeURIComponent(id)}/mqdefault.jpg`;
    const lang = langLabel(short.lang) || t("langLabelEn");
    return `
    <article class="video-card owned-short" ${cardAttrs(short)}>
      <button type="button" class="thumb-link embed-wrap" data-play="${esc(id)}" data-embed="${esc(embed)}" aria-label="${esc(t("playAria", { title: short.title || "SessionScan Short" }))}">
        <div class="rank">1</div>
        <img class="thumb" src="${thumb}" alt="" loading="lazy" />
        <div class="play" aria-hidden="true"><span>▶</span></div>
      </button>
      <div class="video-info">
        <div class="video-info-top">
          <h3>${esc(short.title || "SessionScan Short")}</h3>
          ${cardActionsHtml(short, "new", shareLang())}
        </div>
        <div class="card-meta">
          ${sampleBadge()}
          <span class="tag">SessionScan</span>
          <span class="tag">${lang}</span>
          <span>SessionScan</span>
          ${short.date ? `<span>${esc(short.date)}</span>` : ""}
        </div>
        ${ownedChannelLink(channel)}
      </div>
    </article>`;
  }
  return `
    <article class="slot-card owned-short empty" data-card>
      <strong>SESSIONSCAN</strong>
      <p>${esc(t("noOwnedShort"))}</p>
      ${ownedChannelLink(channel)}
      <div class="card-meta" style="justify-content:center;margin-top:10px">
        ${sampleBadge()}
        <span class="tag">${esc(t("ownedShortTag"))}</span>
        <span class="tag">${esc(t("noFakeLink"))}</span>
      </div>
    </article>`;
}

function jaNote(note) {
  const lang = uiLang();
  const title = lang === "zh"
    ? (note.title_zh || t("jaNoteTitle"))
    : (note.title_en || t("jaNoteTitle"));
  const body = lang === "zh"
    ? (note.body_zh || t("jaNoteBody"))
    : (note.body_en || t("jaNoteBody"));
  const links = (note.links || [])
    .map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.title)}</a></li>`)
    .join("");
  return `
    <div class="ja-note" data-card>
      <p><strong>${esc(title)}</strong></p>
      <p class="blurb">${esc(body)}</p>
      <ul class="blurb">${links}</ul>
    </div>`;
}

function forumSnapshotNow() {
  const meta = state.data?.meta || {};
  return parseSnapshotNow(meta.forum_bahamut || meta.forum || meta._last_run || meta.snapshot_date);
}

function forumTimeMeta(item) {
  const raw = item?.time || "";
  if (!raw) return "";
  const { text, relative } = bahaAbsTime(raw, forumSnapshotNow());
  if (relative || item?.time_relative || isRelativeForumTime(text)) {
    return `<span>${esc(text || raw)}</span><span class="tag">${esc(t("relativeTimeTag"))}</span>`;
  }
  return `<span>${esc(text)}</span>`;
}

function threadCard(item) {
  return `
    <article class="thread-item" ${cardAttrs(item)}>
      ${cardActionsHtml(item, "forum", shareLang())}
      <div class="rank">${esc(item.rank)}</div>
      <h3><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${esc(item.title)}</a></h3>
      <div class="card-meta">
        ${sampleBadge()}
        <span class="tag">${esc(item.source)}</span>
        <span class="tag">${esc(item.game)}</span>
        <span>${esc(item.author)}</span>
        ${forumTimeMeta(item)}
        ${item.replies != null ? `<span class="reply">${esc(t("replies", { n: item.replies }))}${isLiveData(state.data) ? "" : esc(t("repliesSample"))}</span>` : ""}
      </div>
      ${item.blurb ? `<p class="blurb">${esc(item.blurb)}</p>` : ""}
    </article>`;
}

const X_PLACEHOLDER_HANDLE = "user" + "Handle";

function isPlaceholderXTweet(tw) {
  const ph = X_PLACEHOLDER_HANDLE.toLowerCase();
  const author = String(tw?.author || "").toLowerCase().replace(/^@/, "");
  const url = String(tw?.url || "").toLowerCase();
  return author === ph || url.includes(`/${ph}/`);
}

function tweetCard(tw) {
  const display = tw.author_name || tw.author || "";
  const fake = isPlaceholderXTweet(tw);
  const url = fake ? "" : String(tw.url || "");
  const live = Boolean(url);
  const nameEl = live
    ? `<a class="author" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(display)}</a>`
    : `<span class="author">${esc(display)}</span>`;
  const handleEl = live
    ? `<span>@${esc(tw.author)}</span>`
    : `<span>${esc(t("handleUnresolved"))}</span>`;
  const outbound = live
    ? `<p class="blurb"><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(t("tweetOutbound"))}</a></p>`
    : `<p class="blurb">${esc(t("handleUnresolved"))}</p>`;
  return `
    <article class="tweet-item" ${cardAttrs(tw)}>
      ${cardActionsHtml(tw, "x", shareLang())}
      <div class="tweet-head">
        ${nameEl}
        ${handleEl}
        ${tw.date ? `<span>${esc(tw.date)}</span>` : ""}
        ${sampleBadge()}
        ${tw.game ? `<span class="tag">${esc(tw.game)}</span>` : ""}
      </div>
      <p class="tweet-text">${esc(tw.text)}</p>
      ${outbound}
    </article>`;
}

function isIgnPaused() {
  return isLiveData(state.data) && !(state.data.jobs_ign || []).length;
}

function syncIgnPill() {
  const pill = document.querySelector('.pill[data-source="ign"]');
  if (!pill) return;
  const paused = isIgnPaused();
  pill.disabled = paused;
  pill.setAttribute("aria-disabled", paused ? "true" : "false");
  pill.title = paused ? t("ignPausedTitle") : "";
  if (paused && state.jobsSource === "ign") {
    state.jobsSource = "gtabase";
    pill.closest(".pill-group")?.querySelectorAll(".pill").forEach((p) => {
      p.classList.toggle("active", p.dataset.source === "gtabase");
    });
  }
}

function wikiVisibleCount() {
  const raw = state.data?.jobs_wiki || [];
  if (state.showOlderJobs) return raw.length;
  return raw.filter((it) => isThisWeekJob(it)).length;
}

function syncWikiPill() {
  const empty = wikiVisibleCount() === 0;
  $$('.pill[data-source="wiki"]').forEach((pill) => {
    pill.hidden = empty;
  });
  if (empty && state.jobsSource === "wiki") {
    state.jobsSource = "gtabase";
    $$('.pill[data-source="gtabase"]').forEach((p) => p.classList.add("active"));
    $$('.pill[data-source="wiki"]').forEach((p) => p.classList.remove("active"));
  }
}

function renderJobs() {
  syncIgnPill();
  syncWikiPill();
  if (state.jobsSource === "ign" && isIgnPaused()) {
    $("#jobHint").textContent = t("ignPausedHint");
    $("#jobList").innerHTML = `<p class="empty-msg">${esc(t("ignPausedEmpty"))}</p>`;
    return;
  }
  const key = `jobs_${state.jobsSource}`;
  const raw = state.data[key] || [];
  const list = state.showOlderJobs ? raw : raw.filter((it) => isThisWeekJob(it)).slice(0, THIS_WEEK_MAX);
  $("#jobHint").textContent = t(SOURCE_HINT_KEYS[state.jobsSource] || "") || "";
  if (list.length) {
    $("#jobList").innerHTML = withDisplayRanks(list).map(jobCard).join("");
    return;
  }
  if (!state.showOlderJobs) {
    $("#jobList").innerHTML = `<p class="empty-msg">${esc(t("noCardsThisWeek"))}</p>`;
    return;
  }
  if ($("#jobList")?.querySelector("[data-static-job]")) return;
  $("#jobList").innerHTML = `<p class="empty-msg">${esc(isLiveData(state.data) ? t("noCardsLive") : t("noCardsSample"))}</p>`;
}

function renderHotHint() {
  const hint = $("#hotHint");
  const meta = state.data?.meta || {};
  const live = isLiveData(state.data);
  const stale = live && isHotSnapshotStale(meta, state.hotLang);
  if (hint) {
    hint.textContent = stale ? t("hotStale") : "";
    hint.hidden = !stale;
  }
  const timeEl = document.querySelector('#view-hot [data-meta="hot"]');
  if (!timeEl) return;
  if (!live) {
    timeEl.textContent = t("sampleTime", { stamp: meta.snapshot_date || meta.hot || "" });
    return;
  }
  const stamp = (state.hotLang && meta[`videos_hot_${state.hotLang}`]) || meta.hot || meta._last_run || meta.snapshot_date || "";
  timeEl.textContent = stale
    ? t("snapshotTimeStale", { stamp: stamp || "—", hint: t("hotStale") })
    : t("snapshotTime", { stamp: stamp || "—" });
}

function renderHot() {
  renderHotHint();
  const raw = state.data[`videos_hot_${state.hotLang}`] || [];
  if (state.hotLang === "ja" && !raw.length) {
    $("#hotGrid").innerHTML = jaNote(state.data.ja_video_note);
    return;
  }
  const now = snapshotNow(state.data?.meta || {});
  state.hotChannel = fillChannelSelect($("#hotChannel"), videoChannels(raw), state.hotChannel) || "";
  const list = filterSortVideos(raw, {
    sort: state.hotSort,
    channel: state.hotChannel,
    period: state.hotPeriod,
    now,
  });
  const rankKey = `videos_hot_${state.hotLang}`;
  if (list.length) {
    $("#hotGrid").innerHTML = list.map((v) => videoCard(v, v._rank, "", "hot", rankKey)).join("");
    return;
  }
  const empty = raw.length
    ? t("noVideosFilter")
    : (isLiveData(state.data) ? t("noVideosLive") : t("noVideosSample"));
  $("#hotGrid").innerHTML = `<p class="empty-msg">${esc(empty)}</p>`;
}

function renderNew() {
  const slot = sessionScanSlot(state.data.sessionscan_slot);
  const owned = state.data.sessionscan_slot?.short?.video_id;
  const others = filterOtherShorts(state.data.videos_shorts || []).filter((v) => {
    if (!v.video_id || v.video_id === owned) return false;
    if (v.lang === "ko") return false;
    return true;
  });
  const now = snapshotNow(state.data?.meta || {});
  state.newChannel = fillChannelSelect($("#newChannel"), videoChannels(others), state.newChannel) || "";
  const list = filterSortVideos(others, {
    sort: state.newSort,
    channel: state.newChannel,
    period: state.newPeriod,
    now,
  });
  const cards = list.map((v) => videoCard(v, v._rank + 1, "", "new", "videos_shorts")).join("");
  const empty = others.length && !list.length
    ? `<p class="empty-msg">${esc(t("noShortsFilter"))}</p>`
    : (cards || `<p class="empty-msg">${esc(isLiveData(state.data) ? t("noShortsLive") : t("noShortsSample"))}</p>`);
  $("#newGrid").innerHTML = slot + empty;
}

function renderForum() {
  const key = state.forumSource === "reddit" ? "forum_reddit" : "forum_bahamut";
  const list = state.data[key] || [];
  $("#forumList").innerHTML = list.length
    ? list.map(threadCard).join("")
    : `<p class="empty-msg">${esc(isLiveData(state.data) ? t("noThreadsLive") : t("noThreadsSample"))}</p>`;
}

function usableZhTweet(tw) {
  if (isPlaceholderXTweet(tw)) return false;
  const t = tw?.text || "";
  if (t.length < 12) return false;
  if (/\.\.\.\s*$|…\s*$|【\.\.\.|【…/.test(t)) return false;
  if (!/[\u4e00-\u9fff]/.test(t)) return false;
  if (/[们这为发会时对说]/.test(t) && !/[們這為發會時對說彙]/.test(t)) return false;
  return true;
}

function renderTweets() {
  let list = (state.data[`tweets_${state.tweetsLang}`] || []).filter((tw) => !isPlaceholderXTweet(tw));
  if (state.tweetsLang === "zh") list = list.filter(usableZhTweet);
  if (list.length) {
    $("#tweetList").innerHTML = list.map(tweetCard).join("");
    return;
  }
  if (state.tweetsLang === "zh") {
    $("#tweetList").innerHTML = `<p class="empty-msg">${esc(t("noZhTweets"))}</p>`;
    return;
  }
  $("#tweetList").innerHTML = `<p class="empty-msg">${esc(isLiveData(state.data) ? t("noTweetsLive") : t("noTweetsSample"))}</p>`;
}

function fillChannelSelect(sel, channels, current) {
  if (!sel) return;
  const keep = channels.includes(current) ? current : "";
  const opts = [`<option value="">${esc(t("allChannels"))}</option>`]
    .concat(channels.map((ch) => `<option value="${esc(ch)}"${ch === keep ? " selected" : ""}>${esc(ch)}</option>`));
  sel.innerHTML = opts.join("");
  sel.value = keep;
  return keep;
}

function renderOfficialBanner() {
  const el = $("#officialBannerBody");
  if (!el) return;
  const weekly = pickOfficialWeekly(state.data || {});
  const schedule = gta6ScheduleLine(state.data || {}, uiLang());
  if (!weekly) {
    el.innerHTML = `<span>${esc(t("officialPending"))}</span>${schedule ? `<span class="official-sub">${esc(schedule)}</span>` : ""}`;
    return;
  }
  const extra = schedule ? `<span class="official-sub">${esc(schedule)}</span>` : "";
  const sourceLine = t("officialSource", { source: weekly.source || "" });
  el.innerHTML = `<a href="${esc(weekly.url)}" target="_blank" rel="noopener noreferrer">${esc(weekly.title)}</a><span class="official-sub">${esc(sourceLine)}${weekly.updated ? ` · ${esc(weekly.updated)}` : ""}</span>${extra}`;
}

function renderHighlights() {
  const host = $("#highlightsList");
  if (!host) return;
  const now = snapshotNow(state.data?.meta || {});
  const items = weekHighlights(state.data || {}, now, uiLang());
  if (!items.length) {
    host.innerHTML = `<p class="highlights-empty">${esc(t("highlightsEmpty"))}</p>`;
    return;
  }
  host.innerHTML = items.map((it) => `
    <button type="button" class="highlight-card" data-jump-tab="${esc(it.tab || "")}" data-jump-id="${esc(it.id || "")}">
      <span class="highlight-kicker">${esc(it.kicker)}</span>
      <span class="highlight-title">${esc(it.title)}</span>
      ${it.meta ? `<span class="highlight-meta">${esc(it.meta)}</span>` : ""}
    </button>`).join("");
}

function renderHubStats() {
  const box = $("#hubStats");
  const row = $("#hubStatsRow");
  if (!box || !row) return;
  const now = snapshotNow(state.data?.meta || {});
  const stats = hubStats(state.data || {}, now);
  const chips = [];
  if (stats.videoCount) chips.push(`<div class="stat-chip"><strong>${stats.videoCount}</strong><span>${esc(t("statVideos"))}</span></div>`);
  if (stats.totalViews != null) chips.push(`<div class="stat-chip"><strong>${esc(fmtViews(stats.totalViews))}</strong><span>${esc(t("statViews"))}</span></div>`);
  if (stats.avgViews != null) chips.push(`<div class="stat-chip"><strong>${esc(fmtViews(stats.avgViews))}</strong><span>${esc(t("statAvg"))}</span></div>`);
  if (stats.topChannel) chips.push(`<div class="stat-chip"><strong>${esc(stats.topChannel)}</strong><span>${esc(t("statChannel"))}</span></div>`);
  row.innerHTML = chips.join("");
  box.hidden = chips.length === 0;
}

function renderAll() {
  renderJobs();
  renderHot();
  renderNew();
  renderForum();
  renderTweets();
  renderOfficialBanner();
  renderHighlights();
  renderHubStats();
  syncFilterPills();
  const meta = state.data.meta || {};
  const live = isLiveData(state.data);
  const banner = $("#dataBanner");
  if (banner) {
    if (live) {
      const stamp = meta._last_run || meta.snapshot_date || "—";
      banner.innerHTML = `<strong>${esc(t("snapshotStrong"))}</strong><span>${esc(t("snapshotSpan", { stamp }))}</span>`;
    } else {
      banner.innerHTML = `<strong>${esc(t("sampleStrong"))}</strong><span>${esc(t("sampleSpan"))}</span>`;
    }
  }
  $$("[data-meta]").forEach((el) => {
    if (el.dataset.meta === "hot") return;
    const stamp = meta[el.dataset.meta] || meta._last_run || meta.snapshot_date || "";
    el.textContent = live
      ? t("snapshotTime", { stamp: stamp || "—" })
      : t("sampleTime", { stamp: meta.snapshot_date || stamp || "" });
  });
  renderHotHint();
  $("#lastRun").textContent = live
    ? t("lastRunLive", { stamp: meta._last_run || "—" })
    : t("lastRunSample", { stamp: meta.snapshot_date || "" });
}

function desiredHash() {
  const q = $("#searchInput")?.value.trim() || "";
  const searchView = $("#view-search");
  if (q && searchView && !searchView.classList.contains("hidden")) {
    return `q=${encodeURIComponent(q)}`;
  }
  return TAB_TO_HASH[state.activeTab] || "jobs";
}

function writeHash() {
  const next = desiredHash();
  const cur = (location.hash || "").replace(/^#/, "");
  if (cur === next) return;
  state.hashLock = true;
  location.hash = next;
  queueMicrotask(() => {
    state.hashLock = false;
  });
}

function setSearchExpanded(open) {
  $("#searchForm")?.classList.toggle("is-open", Boolean(open));
}

const CHANNEL_SHORT = { jobs: "CH-01", hot: "CH-02", new: "CH-03", forum: "CH-04", x: "CH-05" };

function activeViewEl() {
  return $("#main")?.querySelector(".view:not(.hidden)");
}

function headerBottomExMini() {
  const header = $(".site-header");
  const mini = $("#channelMini");
  if (!header) return 0;
  const box = header.getBoundingClientRect();
  if (mini && !mini.hidden) return box.bottom - mini.getBoundingClientRect().height;
  return box.bottom;
}

function viewHeadIsPast() {
  const view = activeViewEl();
  const head = view?.querySelector(".view-head");
  if (!view || !head || view.id === "view-search") return false;
  return head.getBoundingClientRect().bottom < headerBottomExMini() - 1;
}

function fillChannelMini(view) {
  const name = $("#channelMiniName");
  const host = $("#channelMiniPills");
  if (!name || !host) return;
  const tab = view.id.replace(/^view-/, "");
  name.textContent = CHANNEL_SHORT[tab] || "";
  host.replaceChildren();
  view.querySelectorAll(".controls .pill-group").forEach((group) => {
    host.appendChild(group.cloneNode(true));
  });
}

function syncChannelMini({ refill = false } = {}) {
  const mini = $("#channelMini");
  const name = $("#channelMiniName");
  const host = $("#channelMiniPills");
  if (!mini || !name || !host) return;
  const view = activeViewEl();
  const tab = view?.id?.replace(/^view-/, "") || "";
  const show = Boolean(view && tab !== "search" && viewHeadIsPast());
  if (!show) {
    mini.hidden = true;
    name.textContent = "";
    host.replaceChildren();
    return;
  }
  if (refill || mini.hidden || name.textContent !== (CHANNEL_SHORT[tab] || "")) {
    fillChannelMini(view);
  }
  mini.hidden = false;
}

function requestChannelMiniSync(opts) {
  requestAnimationFrame(() => syncChannelMini(opts));
}

function originalPillForClone(view, pill) {
  if (pill.dataset.source) return view.querySelector(`.controls .pill[data-source="${pill.dataset.source}"]`);
  if (pill.dataset.forum) return view.querySelector(`.controls .pill[data-forum="${pill.dataset.forum}"]`);
  if (pill.dataset.lang) return view.querySelector(`.controls .pill[data-lang="${pill.dataset.lang}"]`);
  if (pill.dataset.jobsRange) return view.querySelector(`.controls .pill[data-jobs-range="${pill.dataset.jobsRange}"]`);
  if (pill.dataset.sort) return view.querySelector(`.controls .pill[data-sort="${pill.dataset.sort}"]`);
  if (pill.dataset.period) return view.querySelector(`.controls .pill[data-period="${pill.dataset.period}"]`);
  return null;
}

function jobVisibleByDefault(item, jobsSource) {
  const raw = state.data?.[`jobs_${jobsSource}`] || [];
  const visible = raw.filter((it) => isThisWeekJob(it)).slice(0, THIS_WEEK_MAX);
  const id = cardId(item);
  return Boolean(id && visible.some((it) => cardId(it) === id));
}

function locateCard(id, preferTab) {
  const loc = findCardLocation(state.data, id, preferTab);
  if (!loc) return null;
  if (loc.tab === "x") {
    if (isPlaceholderXTweet(loc.item)) return null;
    if (loc.tweetsLang === "zh" && !usableZhTweet(loc.item)) return null;
  }
  if (loc.tab === "new" && !loc.owned) {
    if (loc.item?.lang === "ko") return null;
    const owned = state.data?.sessionscan_slot?.short?.video_id;
    if (owned && loc.item?.video_id === owned) return null;
    const others = filterOtherShorts(state.data?.videos_shorts || []);
    if (!others.some((v) => cardId(v) === loc.id)) return null;
  }
  if (loc.tab === "new" && loc.owned && !isOwnedShortThisWeek(loc.item)) return null;
  return loc;
}

function syncFilterPills() {
  $$('.pill[data-source]').forEach((p) => p.classList.toggle("active", p.dataset.source === state.jobsSource));
  $$('.pill[data-forum]').forEach((p) => p.classList.toggle("active", p.dataset.forum === state.forumSource));
  $$("#view-hot .pill[data-lang]").forEach((p) => p.classList.toggle("active", p.dataset.lang === state.hotLang));
  $$("#view-x .pill[data-lang]").forEach((p) => p.classList.toggle("active", p.dataset.lang === state.tweetsLang));
  $$('.pill[data-jobs-range="older"]').forEach((p) => {
    p.classList.toggle("active", state.showOlderJobs);
    p.setAttribute("aria-pressed", state.showOlderJobs ? "true" : "false");
  });
  $$('#view-hot .pill[data-sort]').forEach((p) => p.classList.toggle("active", p.dataset.sort === state.hotSort));
  $$('#view-hot .pill[data-period]').forEach((p) => p.classList.toggle("active", p.dataset.period === state.hotPeriod));
  $$('#view-new .pill[data-sort]').forEach((p) => p.classList.toggle("active", p.dataset.sort === state.newSort));
  $$('#view-new .pill[data-period]').forEach((p) => p.classList.toggle("active", p.dataset.period === state.newPeriod));
}

function applyCardLocation(loc) {
  if (loc.tab === "jobs") {
    if (loc.jobsSource) state.jobsSource = loc.jobsSource;
    if (!jobVisibleByDefault(loc.item, loc.jobsSource)) state.showOlderJobs = true;
  } else if (loc.tab === "hot" && loc.hotLang) {
    state.hotLang = loc.hotLang;
    state.hotSort = "rank";
    state.hotChannel = "";
    state.hotPeriod = "all";
  } else if (loc.tab === "new") {
    state.newSort = "rank";
    state.newChannel = "";
    state.newPeriod = "all";
  } else if (loc.tab === "forum" && loc.forumSource) {
    state.forumSource = loc.forumSource;
  } else if (loc.tab === "x" && loc.tweetsLang) {
    state.tweetsLang = loc.tweetsLang;
  }
  syncFilterPills();
  if (loc.tab === "jobs") renderJobs();
  else if (loc.tab === "hot") renderHot();
  else if (loc.tab === "new") renderNew();
  else if (loc.tab === "forum") renderForum();
  else if (loc.tab === "x") renderTweets();
}

function highlightCard(id) {
  if (!id) return false;
  const root = activeViewEl() || document;
  let el = null;
  try {
    el = root.querySelector(`[data-card-id="${CSS.escape(id)}"]`);
  } catch {
    el = root.querySelector(`[data-card-id="${id}"]`);
  }
  if (!el) return false;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  el.classList.remove("card-flash");
  const scroll = () => {
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    el.classList.add("card-flash");
    const clear = () => el.classList.remove("card-flash");
    el.addEventListener("animationend", clear, { once: true });
    setTimeout(clear, 2200);
  };
  requestAnimationFrame(() => requestAnimationFrame(scroll));
  return true;
}

function applyHash({ scroll = false } = {}) {
  const parsed = parseHash(location.hash);
  if (parsed.q) {
    const input = $("#searchInput");
    if (input) input.value = parsed.q;
    setSearchExpanded(true);
    doSearch(parsed.q);
    return;
  }
  const loc = parsed.v ? locateCard(parsed.v, parsed.tab) : null;
  if (loc) {
    applyCardLocation(loc);
    switchView(loc.tab, { write: false });
    highlightCard(loc.id);
    return;
  }
  switchView(parsed.tab || state.activeTab || "jobs", { write: false });
  if (scroll) $("#main")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function switchView(name, { write = true } = {}) {
  if (name !== "search") state.activeTab = name;
  $$(".card-flash").forEach((el) => el.classList.remove("card-flash"));
  $$(".view").forEach((el) => el.classList.add("hidden"));
  const view = $(`#view-${name}`);
  if (view) view.classList.remove("hidden");
  $$(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
  if (write) writeHash();
  syncChannelMini({ refill: true });
}

function searchHay(item, keys) {
  const parts = keys.map((k) => (Array.isArray(item[k]) ? item[k].join(" ") : String(item[k] ?? "")));
  if (item.lang) parts.push(langHay(item.lang));
  return parts.join(" ").toLowerCase();
}

function queryWords(raw) {
  const q = String(raw || "").trim().toLowerCase();
  if (!q) return [];
  for (const group of SEARCH_ALIAS_GROUPS) {
    if (group.some((t) => t.toLowerCase() === q)) return [q];
  }
  return q.split(/\s+/).filter(Boolean);
}

function aliasTermsFor(word) {
  const w = String(word || "").toLowerCase();
  if (!w) return [];
  const tiny = w.length < 3 || /^vi\.?$/.test(w);
  for (const group of SEARCH_ALIAS_GROUPS) {
    const lower = group.map((t) => t.toLowerCase());
    const hit = lower.some((t) => t === w || (!tiny && (t.includes(w) || w.includes(t))));
    if (hit) return lower;
  }
  return [w];
}

function termInHay(term, hay) {
  if (term.length < 3) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`).test(hay);
  }
  return hay.includes(term);
}

function matches(item, keys, words) {
  const hay = searchHay(item, keys);
  return words.every((w) => aliasTermsFor(w).some((term) => termInHay(term, hay)));
}

function localSearch(raw) {
  const q = raw.trim().toLowerCase();
  if (!q) return null;
  const words = queryWords(q);
  const d = state.data;
  const jobs = [...(d.jobs_gtabase || []), ...(d.jobs_ign || []), ...(d.jobs_wiki || [])]
    .filter((b) => matches(b, ["title", "title_en", "source", "game", "tags", "blurb"], words));
  const hot = [...(d.videos_hot_zh || []), ...(d.videos_hot_en || []), ...(d.videos_hot_ja || [])]
    .filter((v) => matches(v, ["title", "channel", "game", "lang"], words));
  const fresh = filterOtherShorts([...(d.videos_shorts || [])])
    .filter((v) => v.lang !== "ko")
    .filter((v) => matches(v, ["title", "channel", "game", "lang"], words));
  const forum = [...(d.forum_bahamut || []), ...(d.forum_reddit || [])]
    .filter((b) => matches(b, ["title", "author", "source", "game", "blurb"], words));
  const tweets = [...(d.tweets_zh || []), ...(d.tweets_en || [])]
    .filter((t) => !isPlaceholderXTweet(t))
    .filter((t) => matches(t, ["text", "author", "author_name", "game"], words));
  const slot = d.sessionscan_slot || {};
  const slotHay = {
    ...slot,
    short_title: slot.short?.title || "",
    short_channel: slot.short?.channel || "",
  };
  const slotHit = matches(slotHay, ["title_zh", "title_en", "note_zh", "note_en", "status", "short_title", "short_channel", "channel_handle"], words);
  return {
    jobs, hot, fresh, forum, tweets, slot: slotHit,
    total: jobs.length + hot.length + fresh.length + forum.length + tweets.length + (slotHit ? 1 : 0),
  };
}

function doSearch(raw) {
  const q = raw.trim();
  if (!q) return;
  setSearchExpanded(true);
  const r = localSearch(q);
  $("#searchTitle").textContent = isLiveData(state.data)
    ? t("searchTitleLive", { q, n: r.total })
    : t("searchTitleSample", { q, n: r.total });
  let html = "";
  if (r.jobs.length) html += `<h3 class="group-title">${esc(t("groupJobs", { n: r.jobs.length }))}</h3>${r.jobs.map(jobCard).join("")}`;
  if (r.hot.length) html += `<h3 class="group-title">${esc(t("groupHot", { n: r.hot.length }))}</h3><div class="video-grid">${r.hot.map((v) => videoCard(v)).join("")}</div>`;
  if (r.fresh.length) html += `<h3 class="group-title">${esc(t("groupShorts", { n: r.fresh.length }))}</h3><div class="video-grid">${r.fresh.map((v) => videoCard(v, null, "", "new")).join("")}</div>`;
  if (r.slot) html += `<h3 class="group-title">${esc(t("groupSlot"))}</h3>${sessionScanSlot(state.data.sessionscan_slot)}`;
  if (r.forum.length) html += `<h3 class="group-title">${esc(t("groupForum", { n: r.forum.length }))}</h3>${r.forum.map(threadCard).join("")}`;
  if (r.tweets.length) html += `<h3 class="group-title">${esc(t("groupX", { n: r.tweets.length }))}</h3>${r.tweets.map(tweetCard).join("")}`;
  $("#searchResults").innerHTML = html || `<p class="no-result">${t("noResult", { q: esc(q) })}</p>`;
  switchView("search");
  $("#main").scrollIntoView({ behavior: "smooth", block: "start" });
}

function leaveSearchIfEmpty() {
  if ($("#searchInput").value.trim()) return;
  const searchView = $("#view-search");
  if (searchView && !searchView.classList.contains("hidden")) {
    switchView(state.activeTab);
  }
  setSearchExpanded(false);
}

function tickClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const el = $("#hudClock");
  if (el) el.textContent = `${hh}:${mm}:${ss}`;
}

document.addEventListener(
  "error",
  (e) => {
    const img = e.target;
    if (img.tagName === "IMG" && img.classList.contains("thumb")) img.style.visibility = "hidden";
  },
  true,
);

function bootLocale() {
  const lang = isZhPath(location.pathname) ? "zh" : "en";
  setUiLang(lang);
  persistLang(lang);
  applyDomI18n(document, lang);
  if (lang === "zh") {
    state.hotLang = "zh";
    state.tweetsLang = "zh";
  } else {
    state.hotLang = "en";
    state.tweetsLang = "en";
  }
}

function wireLangSwitch() {
  $$("[data-lang-link]").forEach((a) => {
    a.addEventListener("click", (e) => {
      const next = a.dataset.langLink === "zh" ? "zh" : "en";
      persistLang(next);
      if ((next === "zh") === isZhPath(location.pathname)) return;
      e.preventDefault();
      location.assign(localeHref(next, { hash: location.hash, search: location.search }));
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  bootLocale();
  wireLangSwitch();
  tickClock();
  setInterval(tickClock, 1000);
  try {
    let live = null;
    try {
      const res = await fetch(dataUrl("site.json"));
      if (res.ok) live = await res.json();
    } catch {
      live = null;
    }
    state.data = isLiveData(live) ? live : await (await fetch(dataUrl("sample.json"))).json();
  } catch {
    $("#main").insertAdjacentHTML(
      "afterbegin",
      `<p class="empty-msg">${esc(t("loadFail"))}</p>`,
    );
    return;
  }
  renderAll();
  applyHash();
  window.addEventListener("hashchange", () => {
    if (state.hashLock) return;
    applyHash({ scroll: true });
  });
  $$(".tab").forEach((t) => {
    t.addEventListener("click", () => {
      switchView(t.dataset.tab);
      $("#main").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  $$("#ctaGrid .cta-card").forEach((card) => {
    card.addEventListener("click", () => {
      switchView(card.dataset.tab);
      $("#main").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  document.addEventListener("click", (e) => {
    const playBtn = e.target.closest("[data-play]");
    if (playBtn && !playBtn.classList.contains("is-playing")) {
      const id = playBtn.dataset.play || "";
      if (/^[A-Za-z0-9_-]{11}$/.test(id)) {
        const base = playBtn.dataset.embed || `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
        const src = base.includes("autoplay=") ? base : `${base}${base.includes("?") ? "&" : "?"}autoplay=1`;
        const title = playBtn.getAttribute("aria-label") || "YouTube";
        playBtn.classList.add("is-playing");
        playBtn.innerHTML = `<iframe src="${esc(src)}" title="${esc(title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
      }
      return;
    }
    const jump = e.target.closest("[data-jump-tab]");
    if (jump) {
      const tab = jump.dataset.jumpTab || "jobs";
      const id = jump.dataset.jumpId || "";
      const loc = id ? locateCard(id, tab) : null;
      if (loc) {
        applyCardLocation(loc);
        switchView(loc.tab);
        highlightCard(loc.id);
        $("#main")?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        switchView(tab);
        $("#main")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }
    const copyBtn = e.target.closest(".card-copy");
    if (copyBtn) {
      const link = copyBtn.dataset.copy || "";
      if (!link) return;
      const labels = uiCopy();
      const done = () => {
        copyBtn.classList.add("is-copied");
        copyBtn.setAttribute("aria-label", labels.copied);
        setTimeout(() => {
          copyBtn.classList.remove("is-copied");
          copyBtn.setAttribute("aria-label", labels.copy);
        }, 1600);
      };
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(link).then(done).catch(() => {});
      }
      return;
    }
    const pill = e.target.closest(".pill");
    if (!pill || pill.disabled) return;
    if (pill.dataset.jobsRange === "older") {
      state.showOlderJobs = !state.showOlderJobs;
      pill.classList.toggle("active", state.showOlderJobs);
      pill.setAttribute("aria-pressed", state.showOlderJobs ? "true" : "false");
      renderJobs();
      syncChannelMini({ refill: true });
      return;
    }
    if (pill.dataset.sort) {
      const which = pill.closest(".pill-group")?.dataset.sortFor;
      if (which) state[`${which}Sort`] = pill.dataset.sort;
      pill.closest(".pill-group").querySelectorAll(".pill").forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      if (which === "hot") renderHot();
      else if (which === "new") renderNew();
      syncChannelMini({ refill: true });
      return;
    }
    if (pill.dataset.period) {
      const which = pill.closest(".pill-group")?.dataset.periodFor;
      if (which) state[`${which}Period`] = pill.dataset.period;
      pill.closest(".pill-group").querySelectorAll(".pill").forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      if (which === "hot") renderHot();
      else if (which === "new") renderNew();
      syncChannelMini({ refill: true });
      return;
    }
    pill.closest(".pill-group").querySelectorAll(".pill").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    if (pill.dataset.source) {
      state.jobsSource = pill.dataset.source;
      renderJobs();
    } else if (pill.dataset.forum) {
      state.forumSource = pill.dataset.forum;
      renderForum();
    } else if (pill.dataset.lang) {
      const which = pill.closest(".pill-group").dataset.langFor;
      state[`${which}Lang`] = pill.dataset.lang;
      renderHot();
      renderNew();
      renderTweets();
    }
    syncChannelMini({ refill: true });
  });
  document.addEventListener("change", (e) => {
    const sel = e.target.closest("select[data-channel-for]");
    if (!sel) return;
    const which = sel.dataset.channelFor;
    const value = sel.value || "";
    if (which === "hot") {
      state.hotChannel = value;
      renderHot();
    } else if (which === "new") {
      state.newChannel = value;
      renderNew();
    }
    if (sel.closest("#channelMini")) {
      const view = activeViewEl();
      const orig = view?.querySelector(`select[data-channel-for="${which}"]`);
      if (orig && orig !== sel) orig.value = value;
    }
    syncChannelMini({ refill: true });
  });
  $("#channelMini")?.addEventListener("click", (e) => {
    const pill = e.target.closest(".pill");
    if (!pill || pill.disabled) return;
    e.preventDefault();
    e.stopPropagation();
    const view = activeViewEl();
    originalPillForClone(view, pill)?.click();
  });
  window.addEventListener("scroll", () => requestChannelMiniSync(), { passive: true });
  window.addEventListener("resize", () => requestChannelMiniSync());
  const searchForm = $("#searchForm");
  const searchInput = $("#searchInput");
  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    doSearch(searchInput.value);
  });
  searchForm.addEventListener("click", (e) => {
    if (searchForm.classList.contains("is-open")) return;
    if (e.target.closest(".btn-scan")) e.preventDefault();
    searchInput.focus();
  });
  searchForm.addEventListener("focusin", () => setSearchExpanded(true));
  searchInput.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    searchInput.blur();
    if (!searchInput.value.trim()) setSearchExpanded(false);
  });
  searchInput.addEventListener("blur", () => {
    queueMicrotask(() => {
      if (searchForm.contains(document.activeElement)) return;
      if (searchInput.value.trim()) return;
      setSearchExpanded(false);
    });
  });
  const clearToLastTab = () => {
    searchInput.value = "";
    setSearchExpanded(false);
    switchView(state.activeTab);
  };
  $("#clearSearch").addEventListener("click", clearToLastTab);
  searchInput.addEventListener("search", leaveSearchIfEmpty);
  searchInput.addEventListener("input", leaveSearchIfEmpty);
});
