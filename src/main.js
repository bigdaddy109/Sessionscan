import { THIS_WEEK_MAX, isThisWeekJob } from "./thisWeek.js";

const SOURCE_HINTS = {
  gtabase: "GTABase 本週賺錢與工作：每週更新、獎勵、折扣。卡片只外連，不轉載全文。",
  ign: "IGN 只收 GTA Online 每週獎勵／賺錢。不含 GTA 6 新聞回顧。不含 GTA 4。不含 RDO。",
  wiki: "GTA Wiki 本週活動與賺錢條目。不含 Red Dead Wiki。本站不重寫攻略正文。",
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
  hotLang: "zh",
  newLang: "zh",
  tweetsLang: "zh",
  activeTab: "jobs",
  hashLock: false,
  showOlderJobs: false,
};

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

function esc(value) {
  const d = document.createElement("div");
  d.textContent = value == null ? "" : String(value);
  return d.innerHTML.replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function fmtViews(n) {
  if (typeof n !== "number") return "";
  const suffix = isLiveData(state.data) ? "" : "（範例）";
  if (n >= 10000) return `${(n / 10000).toFixed(1).replace(/\.0$/, "")} 萬${suffix}`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K${suffix}`;
  return `${n}${suffix}`;
}

function sampleBadge() {
  if (isLiveData(state.data)) return "";
  return `<span class="tag sample">範例 EXAMPLE</span>`;
}

function jobCard(item) {
  return `
    <article class="job-card" data-card>
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

function videoCard(v, rank, extraClass) {
  const id = v.video_id;
  const thumb = `https://i.ytimg.com/vi/${encodeURIComponent(id)}/mqdefault.jpg`;
  const lang = v.lang === "zh" ? "中文" : v.lang === "ja" ? "日文" : v.lang === "ko" ? "韓文" : "EN";
  const cls = extraClass ? `video-card ${extraClass}` : "video-card";
  const channelLink = v.owned
    ? `<p class="blurb"><a href="${esc(v.channel_url || "https://www.youtube.com/@sessionscan")}" target="_blank" rel="noopener noreferrer">SessionScan 頻道 @sessionscan ↗</a></p>`
    : "";
  return `
    <article class="${cls}" data-card>
      <a class="thumb-link" href="${esc(v.url)}" target="_blank" rel="noopener noreferrer">
        ${rank != null ? `<div class="rank">${rank}</div>` : ""}
        <img class="thumb" src="${thumb}" alt="" loading="lazy" />
        <div class="play" aria-hidden="true"><span>▶</span></div>
      </a>
      <div class="video-info">
        <h3><a href="${esc(v.url)}" target="_blank" rel="noopener noreferrer">${esc(v.title)}</a></h3>
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

function sessionScanSlot(slot) {
  const channel = slot?.channel_url || "https://www.youtube.com/@sessionscan";
  const short = slot?.short;
  const id = short?.video_id || "";
  if (/^[A-Za-z0-9_-]{11}$/.test(id)) {
    const embed = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
    const lang = short.lang === "zh" ? "中文" : short.lang === "ja" ? "日文" : short.lang === "ko" ? "韓文" : "EN";
    return `
    <article class="video-card owned-short" data-card>
      <div class="thumb-link embed-wrap">
        <div class="rank">1</div>
        <iframe src="${esc(embed)}" title="${esc(short.title || "SessionScan Short")}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe>
      </div>
      <div class="video-info">
        <h3>${esc(short.title || "SessionScan Short")}</h3>
        <div class="card-meta">
          ${sampleBadge()}
          <span class="tag">SessionScan</span>
          <span class="tag">${lang}</span>
          <span>SessionScan</span>
          ${short.date ? `<span>${esc(short.date)}</span>` : ""}
        </div>
        <p class="blurb"><a href="${esc(channel)}" target="_blank" rel="noopener noreferrer">SessionScan 頻道 @sessionscan ↗</a></p>
      </div>
    </article>`;
  }
  return `
    <article class="slot-card owned-short empty" data-card>
      <strong>SESSIONSCAN</strong>
      <p>本週尚無 Short</p>
      <p class="blurb"><a href="${esc(channel)}" target="_blank" rel="noopener noreferrer">SessionScan 頻道 @sessionscan ↗</a></p>
      <div class="card-meta" style="justify-content:center;margin-top:10px">
        ${sampleBadge()}
        <span class="tag">自有 Short</span>
        <span class="tag">無偽造連結</span>
      </div>
    </article>`;
}

function jaNote(note) {
  const links = (note.links || [])
    .map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.title)}</a></li>`)
    .join("");
  return `
    <div class="ja-note" data-card>
      <p><strong>${esc(note.title_zh)}</strong> · ${esc(note.title_en)}</p>
      <p class="blurb">${esc(note.body_zh)}</p>
      <ul class="blurb">${links}</ul>
    </div>`;
}

function isRelativeForumTime(t) {
  return /(?:\d+\s*(?:秒|分|分鐘|小時|小时|天)前|刚刚|剛剛)/.test(String(t || ""));
}

function forumTimeMeta(item) {
  const t = item?.time || "";
  if (!t) return "";
  if (item?.time_relative || isRelativeForumTime(t)) {
    return `<span>${esc(t)}</span><span class="tag">來源相對時間，以快照為準</span>`;
  }
  return `<span>${esc(t)}</span>`;
}

function threadCard(item) {
  return `
    <article class="thread-item" data-card>
      <div class="rank">${esc(item.rank)}</div>
      <h3><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${esc(item.title)}</a></h3>
      <div class="card-meta">
        ${sampleBadge()}
        <span class="tag">${esc(item.source)}</span>
        <span class="tag">${esc(item.game)}</span>
        <span>${esc(item.author)}</span>
        ${forumTimeMeta(item)}
        ${item.replies != null ? `<span class="reply">回 ${esc(item.replies)}${isLiveData(state.data) ? "" : "（範例）"}</span>` : ""}
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
    : `<span>帳號未解析</span>`;
  const outbound = live
    ? `<p class="blurb"><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">外連原文 / 帳號 ↗</a></p>`
    : `<p class="blurb">帳號未解析</p>`;
  return `
    <article class="tweet-item" data-card>
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
  pill.title = paused ? "此來源暫停" : "";
  if (paused && state.jobsSource === "ign") {
    state.jobsSource = "gtabase";
    pill.closest(".pill-group")?.querySelectorAll(".pill").forEach((p) => {
      p.classList.toggle("active", p.dataset.source === "gtabase");
    });
  }
}

function renderJobs() {
  syncIgnPill();
  if (state.jobsSource === "ign" && isIgnPaused()) {
    $("#jobHint").textContent = "此來源暫停。IGN 目前沒有本週 GTA Online 獎勵外連卡。";
    $("#jobList").innerHTML = `<p class="empty-msg">此來源暫停</p>`;
    return;
  }
  const key = `jobs_${state.jobsSource}`;
  const raw = state.data[key] || [];
  const list = state.showOlderJobs ? raw : raw.filter((it) => isThisWeekJob(it)).slice(0, THIS_WEEK_MAX);
  $("#jobHint").textContent = SOURCE_HINTS[state.jobsSource] || "";
  if (list.length) {
    $("#jobList").innerHTML = list.map(jobCard).join("");
    return;
  }
  if (!state.showOlderJobs) {
    $("#jobList").innerHTML = `<p class="empty-msg">本週尚無卡片</p>`;
    return;
  }
  if ($("#jobList")?.querySelector("[data-static-job]")) return;
  $("#jobList").innerHTML = `<p class="empty-msg">${isLiveData(state.data) ? "此來源尚無卡片，等待下次掃描。" : "此來源尚無範例卡片。"}</p>`;
}

function renderHot() {
  const list = state.data[`videos_hot_${state.hotLang}`] || [];
  if (state.hotLang === "ja" && !list.length) {
    $("#hotGrid").innerHTML = jaNote(state.data.ja_video_note);
    return;
  }
  $("#hotGrid").innerHTML = list.length
    ? list.map((v, i) => videoCard(v, i + 1)).join("")
    : `<p class="empty-msg">${isLiveData(state.data) ? "此語言尚無影片，等待下次掃描。" : "此語言尚無範例影片。"}</p>`;
}

function renderNew() {
  const slot = sessionScanSlot(state.data.sessionscan_slot);
  const others = (state.data.videos_shorts || []).filter((v) => {
    const owned = state.data.sessionscan_slot?.short?.video_id;
    if (!v.video_id || v.video_id === owned) return false;
    if (v.lang === "ko") return false;
    return true;
  });
  const cards = others.map((v, i) => videoCard(v, i + 2)).join("");
  $("#newGrid").innerHTML = slot + (cards || `<p class="empty-msg">${isLiveData(state.data) ? "尚無他人當紅 Short，等待下次掃描。" : "尚無範例 Short。"}</p>`);
}

function renderForum() {
  const key = state.forumSource === "reddit" ? "forum_reddit" : "forum_bahamut";
  const list = state.data[key] || [];
  $("#forumList").innerHTML = list.length
    ? list.map(threadCard).join("")
    : `<p class="empty-msg">${isLiveData(state.data) ? "尚無討論，等待下次掃描。" : "尚無範例討論。"}</p>`;
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
    $("#tweetList").innerHTML = `<p class="empty-msg">今日無中文訊號</p>`;
    return;
  }
  $("#tweetList").innerHTML = `<p class="empty-msg">${isLiveData(state.data) ? "尚無訊號，等待下次掃描。" : "尚無範例訊號。"}</p>`;
}

function isWeeklyJobCard(item) {
  const blob = `${item?.title || ""} ${item?.title_en || ""} ${item?.tags || ""}`.toLowerCase();
  return /weekly|本週|本周|每週|每周|獎勵|折扣|bonus|discount/.test(blob);
}

function pickOfficialWeekly(data) {
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

function gta6ScheduleLine(data) {
  const blobs = [];
  for (const key of ["jobs_gtabase", "jobs_ign", "jobs_wiki", "videos_hot_zh", "videos_hot_en", "tweets_zh", "tweets_en"]) {
    for (const it of data?.[key] || []) {
      blobs.push(`${it.title || ""} ${it.title_en || ""} ${it.text || ""} ${it.blurb || ""}`);
    }
  }
  const hay = blobs.join("\n");
  if (!/gta\s*6|gta\s*vi|俠盜獵車手\s*6|grand theft auto\s*(?:6|vi)/i.test(hay)) return "";
  if (/11\s*月\s*19\s*日/.test(hay) || /november\s*19/i.test(hay)) {
    return "GTA 6 已公開時程：11 月 19 日";
  }
  return "";
}

function renderOfficialBanner() {
  const el = $("#officialBannerBody");
  if (!el) return;
  const weekly = pickOfficialWeekly(state.data || {});
  const schedule = gta6ScheduleLine(state.data || {});
  if (!weekly) {
    el.innerHTML = `<span>本週官方訊號待下次掃描</span>${schedule ? `<span class="official-sub">${esc(schedule)}</span>` : ""}`;
    return;
  }
  const extra = schedule ? `<span class="official-sub">${esc(schedule)}</span>` : "";
  el.innerHTML = `<a href="${esc(weekly.url)}" target="_blank" rel="noopener noreferrer">${esc(weekly.title)}</a><span class="official-sub">來源 ${esc(weekly.source || "")}${weekly.updated ? ` · ${esc(weekly.updated)}` : ""}</span>${extra}`;
}

function renderAll() {
  renderJobs();
  renderHot();
  renderNew();
  renderForum();
  renderTweets();
  renderOfficialBanner();
  const meta = state.data.meta || {};
  const live = isLiveData(state.data);
  const banner = $("#dataBanner");
  if (banner) {
    if (live) {
      const stamp = meta._last_run || meta.snapshot_date || "—";
      banner.innerHTML = `<strong>資料快照 / SNAPSHOT</strong><span>公開來源標題彙整，不是即時爬蟲。快照 ${esc(stamp)}。來源失敗時保留既有檔。</span>`;
    } else {
      banner.innerHTML = `<strong>範例資料 / EXAMPLE DATA</strong><span>第一版靜態殼。數字、時間、討論標題皆為樣本，不是即時爬蟲。</span>`;
    }
  }
  $$("[data-meta]").forEach((el) => {
    const stamp = meta[el.dataset.meta] || meta._last_run || meta.snapshot_date || "";
    el.textContent = live ? `資料快照：${stamp || "—"} · 非即時掃描` : `範例快照：${meta.snapshot_date || stamp || ""}`;
  });
  $("#lastRun").textContent = live
    ? `資料快照：${meta._last_run || "—"} · 非即時爬蟲`
    : `爬蟲狀態：未啟用 · 範例快照 ${meta.snapshot_date || ""}`;
}

const TAB_TO_HASH = { jobs: "jobs", hot: "hot", new: "shorts", forum: "forum", x: "x" };
const HASH_TO_TAB = { jobs: "jobs", hot: "hot", shorts: "new", new: "new", forum: "forum", x: "x" };

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

function applyHash({ scroll = false } = {}) {
  const raw = (location.hash || "").replace(/^#/, "");
  let tab = null;
  let q = "";
  for (const part of raw.split("&").filter(Boolean)) {
    if (part.startsWith("q=")) q = decodeURIComponent(part.slice(2).replace(/\+/g, " "));
    else if (HASH_TO_TAB[part]) tab = HASH_TO_TAB[part];
  }
  if (!tab && !q && raw.startsWith("q=")) q = decodeURIComponent(raw.slice(2).replace(/\+/g, " "));
  if (q) {
    const input = $("#searchInput");
    if (input) input.value = q;
    doSearch(q);
    return;
  }
  switchView(tab || state.activeTab || "jobs", { write: false });
  if (scroll) $("#main")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function switchView(name, { write = true } = {}) {
  if (name !== "search") state.activeTab = name;
  $$(".view").forEach((el) => el.classList.add("hidden"));
  const view = $(`#view-${name}`);
  if (view) view.classList.remove("hidden");
  $$(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
  if (write) writeHash();
}

const SEARCH_ALIAS_GROUPS = [
  [
    "cayo perico",
    "cayo",
    "perico",
    "佩里克島",
    "佩里克",
    "佩裏科島",
    "佩裏科",
    "佩裡科島",
    "佩裡科",
  ],
  ["gta 6", "gta6", "gta vi", "gta vi.", "俠盜獵車手6", "俠盜獵車手 vi"],
  ["weekly", "本週獎勵", "每週"],
  ["ceo", "總裁", "辦公室"],
  ["autoshop", "改車廠"],
  ["diamond", "賭場", "賭場豪劫"],
];

function searchHay(item, keys) {
  return keys
    .map((k) => (Array.isArray(item[k]) ? item[k].join(" ") : String(item[k] ?? "")))
    .join(" ")
    .toLowerCase();
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
  const fresh = [...(d.videos_shorts || [])]
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
  const r = localSearch(q);
  $("#searchTitle").textContent = isLiveData(state.data)
    ? `「${q}」掃描結果：${r.total} 筆`
    : `「${q}」掃描結果：${r.total} 筆（僅範例資料）`;
  let html = "";
  if (r.jobs.length) html += `<h3 class="group-title">賺錢與工作（${r.jobs.length}）</h3>${r.jobs.map(jobCard).join("")}`;
  if (r.hot.length) html += `<h3 class="group-title">熱門影片（${r.hot.length}）</h3><div class="video-grid">${r.hot.map((v) => videoCard(v)).join("")}</div>`;
  if (r.fresh.length) html += `<h3 class="group-title">當紅 Short（${r.fresh.length}）</h3><div class="video-grid">${r.fresh.map((v) => videoCard(v)).join("")}</div>`;
  if (r.slot) html += `<h3 class="group-title">SessionScan Short</h3>${sessionScanSlot(state.data.sessionscan_slot)}`;
  if (r.forum.length) html += `<h3 class="group-title">論壇（${r.forum.length}）</h3>${r.forum.map(threadCard).join("")}`;
  if (r.tweets.length) html += `<h3 class="group-title">X / Twitter（${r.tweets.length}）</h3>${r.tweets.map(tweetCard).join("")}`;
  $("#searchResults").innerHTML = html || `<p class="no-result">掃描不到符合「${esc(q)}」的卡片。</p>`;
  switchView("search");
  $("#main").scrollIntoView({ behavior: "smooth", block: "start" });
}

function leaveSearchIfEmpty() {
  if ($("#searchInput").value.trim()) return;
  const searchView = $("#view-search");
  if (searchView && !searchView.classList.contains("hidden")) {
    switchView(state.activeTab);
  }
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

document.addEventListener("DOMContentLoaded", async () => {
  tickClock();
  setInterval(tickClock, 1000);
  try {
    let live = null;
    try {
      const res = await fetch("./data/site.json");
      if (res.ok) live = await res.json();
    } catch {
      live = null;
    }
    state.data = isLiveData(live) ? live : await (await fetch("./data/sample.json")).json();
  } catch {
    $("#main").insertAdjacentHTML(
      "afterbegin",
      `<p class="empty-msg">無法載入 JSON。請用本機靜態伺服器開啟，不要直接雙擊檔案。</p>`,
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
    const pill = e.target.closest(".pill");
    if (!pill || pill.disabled) return;
    if (pill.dataset.jobsRange === "older") {
      state.showOlderJobs = !state.showOlderJobs;
      pill.classList.toggle("active", state.showOlderJobs);
      pill.setAttribute("aria-pressed", state.showOlderJobs ? "true" : "false");
      renderJobs();
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
  });
  $("#searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    doSearch($("#searchInput").value);
  });
  const searchInput = $("#searchInput");
  const clearToLastTab = () => {
    searchInput.value = "";
    switchView(state.activeTab);
  };
  $("#clearSearch").addEventListener("click", clearToLastTab);
  searchInput.addEventListener("search", leaveSearchIfEmpty);
  searchInput.addEventListener("input", leaveSearchIfEmpty);
});
