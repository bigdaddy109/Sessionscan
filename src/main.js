const SOURCE_HINTS = {
  gtabase: "GTABase 公開每週更新與資料庫。卡片只外連，不轉載全文。",
  ign: "IGN 維基／遊戲頁入口。GTA Online、RDO、GTA 6。不含 GTA 4。",
  wiki: "GTA Wiki / Red Dead Wiki 公開條目。本站不重寫攻略正文。",
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

function videoCard(v, rank) {
  const id = v.video_id;
  const thumb = `https://i.ytimg.com/vi/${encodeURIComponent(id)}/mqdefault.jpg`;
  const lang = v.lang === "zh" ? "中文" : v.lang === "ja" ? "日文" : "EN";
  return `
    <article class="video-card" data-card>
      <a class="thumb-link" href="${esc(v.url)}" target="_blank" rel="noopener noreferrer">
        ${rank != null ? `<div class="rank">${rank}</div>` : ""}
        <img class="thumb" src="${thumb}" alt="" loading="lazy" />
        <div class="play" aria-hidden="true"><span>▶</span></div>
      </a>
      <div class="video-info">
        <h3><a href="${esc(v.url)}" target="_blank" rel="noopener noreferrer">${esc(v.title)}</a></h3>
        <div class="card-meta">
          ${sampleBadge()}
          <span class="tag">${lang}</span>
          <span>${esc(v.channel)}</span>
          ${v.views != null ? `<span>👁 ${esc(fmtViews(v.views))}</span>` : ""}
          ${v.date ? `<span>${esc(v.date)}</span>` : ""}
        </div>
      </div>
    </article>`;
}

function sessionScanSlot(slot) {
  return `
    <article class="slot-card" data-card>
      <strong>SESSIONSCAN SLOT</strong>
      <p>${esc(slot.note_zh)}</p>
      <p>${esc(slot.note_en)}</p>
      <div class="card-meta" style="justify-content:center;margin-top:10px">
        ${sampleBadge()}
        <span class="tag">頻道可能離線</span>
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
        <span>${esc(item.time)}</span>
        ${item.replies != null ? `<span class="reply">回 ${esc(item.replies)}${isLiveData(state.data) ? "" : "（範例）"}</span>` : ""}
      </div>
      ${item.blurb ? `<p class="blurb">${esc(item.blurb)}</p>` : ""}
    </article>`;
}

function tweetCard(tw) {
  return `
    <article class="tweet-item" data-card>
      <div class="tweet-head">
        <a class="author" href="${esc(tw.url)}" target="_blank" rel="noopener noreferrer">${esc(tw.author_name || tw.author)}</a>
        <span>@${esc(tw.author)}</span>
        ${tw.date ? `<span>${esc(tw.date)}</span>` : ""}
        ${sampleBadge()}
        ${tw.game ? `<span class="tag">${esc(tw.game)}</span>` : ""}
      </div>
      <p class="tweet-text">${esc(tw.text)}</p>
      <p class="blurb"><a href="${esc(tw.url)}" target="_blank" rel="noopener noreferrer">外連原文 / 帳號 ↗</a></p>
    </article>`;
}

function renderJobs() {
  const key = `jobs_${state.jobsSource}`;
  const list = state.data[key] || [];
  $("#jobHint").textContent = SOURCE_HINTS[state.jobsSource] || "";
  $("#jobList").innerHTML = list.length
    ? list.map(jobCard).join("")
    : `<p class="empty-msg">${isLiveData(state.data) ? "此來源尚無卡片，等待下次掃描。" : "此來源尚無範例卡片。"}</p>`;
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
  const list = state.data[`videos_new_${state.newLang}`] || [];
  const slot = sessionScanSlot(state.data.sessionscan_slot);
  if (state.newLang === "ja" && !list.length) {
    $("#newGrid").innerHTML = slot + jaNote(state.data.ja_video_note);
    return;
  }
  const cards = list.length ? list.map((v) => videoCard(v)).join("") : "";
  $("#newGrid").innerHTML = slot + (cards || `<p class="empty-msg">${isLiveData(state.data) ? "此語言尚無影片，等待下次掃描。" : "此語言尚無範例影片。"}</p>`);
}

function renderForum() {
  const key = state.forumSource === "reddit" ? "forum_reddit" : "forum_bahamut";
  const list = state.data[key] || [];
  $("#forumList").innerHTML = list.length
    ? list.map(threadCard).join("")
    : `<p class="empty-msg">${isLiveData(state.data) ? "尚無討論，等待下次掃描。" : "尚無範例討論。"}</p>`;
}

function renderTweets() {
  const list = state.data[`tweets_${state.tweetsLang}`] || [];
  $("#tweetList").innerHTML = list.length
    ? list.map(tweetCard).join("")
    : `<p class="empty-msg">${isLiveData(state.data) ? "尚無訊號，等待下次掃描。" : "尚無範例訊號。"}</p>`;
}

function renderAll() {
  renderJobs();
  renderHot();
  renderNew();
  renderForum();
  renderTweets();
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

function switchView(name) {
  if (name !== "search") state.activeTab = name;
  $$(".view").forEach((el) => el.classList.add("hidden"));
  const view = $(`#view-${name}`);
  if (view) view.classList.remove("hidden");
  $$(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
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
];

function searchHay(item, keys) {
  return keys
    .map((k) => (Array.isArray(item[k]) ? item[k].join(" ") : String(item[k] ?? "")))
    .join(" ")
    .toLowerCase();
}

function aliasTermsFor(word) {
  const w = String(word || "").toLowerCase();
  if (!w) return [];
  for (const group of SEARCH_ALIAS_GROUPS) {
    const lower = group.map((t) => t.toLowerCase());
    const hit = lower.some((t) => t === w || (w.length >= 2 && (t.includes(w) || w.includes(t))));
    if (hit) return lower;
  }
  return [w];
}

function matches(item, keys, words) {
  const hay = searchHay(item, keys);
  return words.every((w) => aliasTermsFor(w).some((term) => hay.includes(term)));
}

function localSearch(raw) {
  const q = raw.trim().toLowerCase();
  if (!q) return null;
  const words = q.split(/\s+/);
  const d = state.data;
  const jobs = [...(d.jobs_gtabase || []), ...(d.jobs_ign || []), ...(d.jobs_wiki || [])]
    .filter((b) => matches(b, ["title", "title_en", "source", "game", "tags", "blurb"], words));
  const hot = [...(d.videos_hot_zh || []), ...(d.videos_hot_en || []), ...(d.videos_hot_ja || [])]
    .filter((v) => matches(v, ["title", "channel", "game", "lang"], words));
  const fresh = [...(d.videos_new_zh || []), ...(d.videos_new_en || []), ...(d.videos_new_ja || [])]
    .filter((v) => matches(v, ["title", "channel", "game", "lang"], words));
  const forum = [...(d.forum_bahamut || []), ...(d.forum_reddit || [])]
    .filter((b) => matches(b, ["title", "author", "source", "game", "blurb"], words));
  const tweets = [...(d.tweets_zh || []), ...(d.tweets_en || [])]
    .filter((t) => matches(t, ["text", "author", "author_name", "game"], words));
  const slotHit = matches(d.sessionscan_slot, ["title_zh", "title_en", "note_zh", "note_en", "status"], words);
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
  if (r.fresh.length) html += `<h3 class="group-title">最新影片（${r.fresh.length}）</h3><div class="video-grid">${r.fresh.map((v) => videoCard(v)).join("")}</div>`;
  if (r.slot) html += `<h3 class="group-title">SessionScan 預留</h3>${sessionScanSlot(state.data.sessionscan_slot)}`;
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
    if (!pill) return;
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
