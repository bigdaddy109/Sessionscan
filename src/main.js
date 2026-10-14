import { THIS_WEEK_MAX, isOwnedShortThisWeek, isThisWeekJob, withDisplayRanks } from "./thisWeek.js";
import { filterOtherShorts } from "./shortsFilter.js";
import { bahaAbsTime, isRelativeForumTime, parseSnapshotNow } from "./bahaTime.js";
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
  formatSnapshotAgeLabel,
  gta6ScheduleBannerHtml,
  isLiveHubData,
  pickOfficialWeekly,
  rankDelta,
  rankDeltaHtml,
  snapshotNow,
  videoKey,
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
import {
  buildWeekBullets,
  claimedStorageKey,
  clearClaimedIds,
  countClaimedProgress,
  countdownParts,
  formatClaimedProgress,
  loadClaimedIds,
  nextWeeklyUpdateAt,
  pickHomeShort,
  toggleClaimedId,
} from "./thisWeekHome.js";
import { latestArchiveLinkHtml } from "./weekArchive.js";

const SOURCE_HINT_KEYS = {
  gtabase: "jobsHintGtabase",
  ign: "jobsHintIgn",
  wiki: "jobsHintWiki",
};

function isLiveData(data) {
  return isLiveHubData(data);
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
  countdownTimer: 0,
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
      ${rank != null ? `<div class="rank" aria-hidden="true">${rank}</div>` : ""}
      ${delta}
      <button type="button" class="thumb-link" data-play="${esc(id)}" aria-label="${esc(t("playAria", { title: v.title }))}">
        <img class="thumb" src="${thumb}" alt="" loading="lazy" />
        <div class="play" aria-hidden="true"><span></span></div>
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
      <div class="rank" aria-hidden="true">1</div>
      <button type="button" class="thumb-link embed-wrap" data-play="${esc(id)}" data-embed="${esc(embed)}" aria-label="${esc(t("playAria", { title: short.title || "SessionScan Short" }))}">
        <img class="thumb" src="${thumb}" alt="" loading="lazy" />
        <div class="play" aria-hidden="true"><span></span></div>
      </button>
      <div class="video-info">
        <div class="video-info-top">
          <p class="video-card-title">${esc(short.title || "SessionScan Short")}</p>
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

function jobListCardIds(root) {
  return [...(root?.querySelectorAll("[data-card-id]") || [])].map((el) => el.getAttribute("data-card-id") || "");
}

function sameJobCardIds(list) {
  const host = $("#jobList");
  if (!host?.querySelector("[data-static-job]")) return false;
  const next = withDisplayRanks(list).map((item) => cardId(item) || "");
  const prev = jobListCardIds(host);
  return prev.length === next.length && prev.every((id, i) => id && id === next[i]);
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
    // Progressive enhancement: keep build-time #jobList when it already matches
    // the default this-week GTABase set so filters/search can replace it later.
    if (!state.showOlderJobs && state.jobsSource === "gtabase" && sameJobCardIds(list)) return;
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

function usableZhTweet(tw) {
  if (isPlaceholderXTweet(tw)) return false;
  const text = tw?.text || "";
  if (text.length < 12) return false;
  if (/\.\.\.\s*$|…\s*$|【\.\.\.|【…/.test(text)) return false;
  if (!/[\u4e00-\u9fff]/.test(text)) return false;
  if (/[们这为发会时对说]/.test(text) && !/[們這為發會時對說彙]/.test(text)) return false;
  return true;
}

function renderWeekCountdown() {
  const el = $("#weekCountdownDisplay");
  if (!el) return;
  const target = nextWeeklyUpdateAt(new Date());
  const parts = countdownParts(target, new Date());
  if (parts.totalMs <= 0) {
    el.textContent = t("weekCountdownLive");
    return;
  }
  const pad = (n) => String(n).padStart(2, "0");
  el.textContent = `${parts.days}d ${pad(parts.hours)}:${pad(parts.minutes)}:${pad(parts.seconds)}`;
}

function renderWeekShort() {
  const host = $("#weekShortBody");
  if (!host) return;
  const now = snapshotNow(state.data?.meta || {});
  const short = pickHomeShort(state.data || {}, now);
  if (!short) {
    host.innerHTML = `<p class="week-short-empty">${esc(t("weekShortEmpty"))}</p>${sessionScanSlot(state.data?.sessionscan_slot)}`;
    return;
  }
  host.innerHTML = sessionScanSlot({
    ...(state.data?.sessionscan_slot || {}),
    short,
    channel_url: state.data?.sessionscan_slot?.channel_url || "https://www.youtube.com/@sessionscan",
  });
}

function updateWeekClaimProgress(bullets, claimed) {
  const el = $("#weekClaimProgress");
  const clearBtn = $("#weekClaimClear");
  if (!el) return;
  const { done, total } = countClaimedProgress(bullets, claimed);
  if (!total) {
    el.hidden = true;
    el.textContent = "";
    if (clearBtn) clearBtn.hidden = true;
    return;
  }
  el.hidden = false;
  el.textContent = formatClaimedProgress(done, total, uiLang());
  if (clearBtn) {
    clearBtn.hidden = done === 0;
    clearBtn.setAttribute("aria-label", t("weekClaimClearAria"));
    const label = t("weekClaimClear");
    if (clearBtn.textContent !== label) clearBtn.textContent = label;
  }
}

function renderWeekBullets() {
  const host = $("#weekBulletList");
  if (!host) return;
  const now = snapshotNow(state.data?.meta || {});
  const bullets = buildWeekBullets(state.data || {}, now, uiLang());
  const weekKey = claimedStorageKey(now);
  const claimed = loadClaimedIds(weekKey);
  host.dataset.claimedKey = weekKey;
  host.innerHTML = bullets
    .map((b) => {
      const done = claimed.has(b.id);
      const access = b.url
        ? `<a class="week-bullet-how" href="${esc(b.url)}" target="_blank" rel="noopener noreferrer">${esc(b.how)}</a>`
        : `<span class="week-bullet-how is-muted">${esc(b.how)}</span>`;
      const claimLabel = t("weekBulletClaim", { label: b.label });
      return `<li class="week-bullet${b.pending ? " is-pending" : ""}${done ? " is-claimed" : ""}" data-bullet="${esc(b.id)}">
        <label class="week-bullet-claim">
          <input type="checkbox" class="week-bullet-check" data-bullet-id="${esc(b.id)}" ${done ? "checked" : ""} />
          <span class="week-bullet-claim-text">${esc(claimLabel)}</span>
        </label>
        <span class="week-bullet-label">${esc(b.label)}</span>
        <span class="week-bullet-reward">${esc(b.reward)}</span>
        ${access}
      </li>`;
    })
    .join("");
  updateWeekClaimProgress(bullets, claimed);
}

function bindWeekBulletClaims() {
  const host = $("#weekBulletList");
  if (!host || host.dataset.claimBound === "1") return;
  host.dataset.claimBound = "1";
  host.addEventListener("change", (ev) => {
    const input = ev.target?.closest?.(".week-bullet-check");
    if (!input) return;
    const id = input.getAttribute("data-bullet-id") || "";
    const weekKey = host.dataset.claimedKey || claimedStorageKey(snapshotNow(state.data?.meta || {}));
    const claimed = toggleClaimedId(weekKey, id);
    const row = input.closest(".week-bullet");
    if (row) row.classList.toggle("is-claimed", Boolean(input.checked));
    const now = snapshotNow(state.data?.meta || {});
    const bullets = buildWeekBullets(state.data || {}, now, uiLang());
    updateWeekClaimProgress(bullets, claimed);
  });
  const clearBtn = $("#weekClaimClear");
  if (clearBtn && clearBtn.dataset.clearBound !== "1") {
    clearBtn.dataset.clearBound = "1";
    clearBtn.addEventListener("click", () => {
      const weekKey = host.dataset.claimedKey || claimedStorageKey(snapshotNow(state.data?.meta || {}));
      clearClaimedIds(weekKey);
      renderWeekBullets();
    });
  }
}

function renderLatestArchiveLink() {
  const el = $("#weekArchiveLatest");
  if (!el) return;
  const wrap = document.createElement("div");
  wrap.innerHTML = latestArchiveLinkHtml(state.data || {}, uiLang());
  const next = wrap.firstElementChild;
  if (!next) return;
  next.id = "weekArchiveLatest";
  el.replaceWith(next);
}

function renderOfficialBanner() {
  const el = $("#officialBannerBody");
  if (!el) return;
  const weekly = pickOfficialWeekly(state.data || {});
  const scheduleHtml = gta6ScheduleBannerHtml(state.data || {}, uiLang());
  if (!weekly) {
    el.innerHTML = `<span>${esc(t("officialPending"))}</span>${scheduleHtml}`;
    return;
  }
  const sourceLine = t("officialSource", { source: weekly.source || "" });
  el.innerHTML = `<a href="${esc(weekly.url)}" target="_blank" rel="noopener noreferrer">${esc(weekly.title)}</a><span class="official-sub">${esc(sourceLine)}${weekly.updated ? ` · ${esc(weekly.updated)}` : ""}</span>${scheduleHtml}`;
}

function renderAll() {
  renderJobs();
  renderOfficialBanner();
  renderWeekCountdown();
  renderWeekShort();
  renderWeekBullets();
  renderLatestArchiveLink();
  syncFilterPills();
  const meta = state.data.meta || {};
  const live = isLiveData(state.data);
  const banner = $("#dataBanner");
  if (banner) {
    if (live) {
      const stamp = meta._last_run || meta.snapshot_date || "—";
      const ageLabel = formatSnapshotAgeLabel(stamp, uiLang());
      const age = ageLabel ? ` · ${ageLabel}` : "";
      banner.innerHTML = `<strong>${esc(t("snapshotStrong"))}</strong><span>${esc(t("snapshotSpan", { stamp, age }))}</span>`;
    } else {
      banner.innerHTML = `<strong>${esc(t("sampleStrong"))}</strong><span>${esc(t("sampleSpan"))}</span>`;
    }
  }
  $$("[data-meta]").forEach((el) => {
    const stamp = meta[el.dataset.meta] || meta._last_run || meta.snapshot_date || "";
    el.textContent = live
      ? t("snapshotTime", { stamp: stamp || "—" })
      : t("sampleTime", { stamp: meta.snapshot_date || stamp || "" });
  });
  if (live) {
    const stamp = meta._last_run || "—";
    const ageLabel = formatSnapshotAgeLabel(stamp, uiLang());
    const age = ageLabel ? ` · ${ageLabel}` : "";
    $("#lastRun").textContent = t("lastRunLive", { stamp, age });
  } else {
    $("#lastRun").textContent = t("lastRunSample", { stamp: meta.snapshot_date || "" });
  }
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

function activeViewEl() {
  return $("#main")?.querySelector(".view:not(.hidden)");
}

/** Sticky header height for scroll-margin (Phase B: no channel-mini strip). */
function stickyHeaderOffsetPx() {
  const header = $(".site-header");
  if (!header) return 0;
  return Math.max(0, Math.ceil(header.getBoundingClientRect().height));
}

function syncStickyScrollMargin() {
  document.documentElement.style.setProperty("--sticky-header-offset", `${stickyHeaderOffsetPx()}px`);
}

/** Scroll #main just below sticky chrome (honors scroll-margin-top + safe-area). */
function scrollMainIntoView() {
  const main = $("#main");
  if (!main) return;
  syncStickyScrollMargin();
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  main.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
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
  $$(".pill[data-source]").forEach((p) => p.classList.toggle("active", p.dataset.source === state.jobsSource));
  $$('.pill[data-jobs-range="older"]').forEach((p) => {
    p.classList.toggle("active", state.showOlderJobs);
    p.setAttribute("aria-pressed", state.showOlderJobs ? "true" : "false");
  });
}

function applyCardLocation(loc) {
  if (loc.tab !== "jobs") return;
  if (loc.jobsSource) state.jobsSource = loc.jobsSource;
  if (!jobVisibleByDefault(loc.item, loc.jobsSource)) state.showOlderJobs = true;
  syncFilterPills();
  renderJobs();
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
  // Legacy channel hashes redirect away in head; leftover v= for job cards still lands here.
  const loc = parsed.v ? locateCard(parsed.v, parsed.tab || "jobs") : null;
  if (loc && loc.tab === "jobs") {
    applyCardLocation(loc);
    switchView("jobs", { write: false });
    highlightCard(loc.id);
    return;
  }
  switchView("jobs", { write: false });
  if (scroll) scrollMainIntoView();
}

function switchView(name, { write = true } = {}) {
  const target = name === "search" ? "search" : "jobs";
  if (target !== "search") state.activeTab = "jobs";
  $$(".card-flash").forEach((el) => el.classList.remove("card-flash"));
  $$(".view").forEach((el) => el.classList.add("hidden"));
  const view = $(`#view-${target}`);
  if (view) view.classList.remove("hidden");
  if (write) writeHash();
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
  scrollMainIntoView();
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
      location.assign(
        localeHref(next, {
          hash: location.hash,
          search: location.search,
          path: location.pathname,
        }),
      );
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
  bindWeekBulletClaims();
  applyHash();
  if (state.countdownTimer) clearInterval(state.countdownTimer);
  state.countdownTimer = setInterval(renderWeekCountdown, 1000);
  window.addEventListener("hashchange", () => {
    if (state.hashLock) return;
    applyHash({ scroll: true });
  });
  syncStickyScrollMargin();
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
      return;
    }
    if (!pill.dataset.source) return;
    pill.closest(".pill-group")?.querySelectorAll(".pill").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    state.jobsSource = pill.dataset.source;
    renderJobs();
  });
  window.addEventListener("resize", () => {
    syncStickyScrollMargin();
  });
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
