/** English-first UI copy, /zh/ locale, and bilingual search helpers. */

export const LANG_STORAGE_KEY = "sessionscan-lang";
export const SITE_ORIGIN = "https://sessionscan.net";

export const UI = {
  en: {
    metaTitle: "SessionScan GTA",
    metaDesc:
      "GTA 5 / Online / GTA 6 hub. This week's signals, outbound titles only — no full guides. Unrelated to other apps of the same name.",
    skip: "Skip to content",
    brandAria: "SessionScan back to top",
    brandAriaHome: "SessionScan back to home",
    brandEm: "GTA HUB",
    channelFull: "Subscribe on YouTube",
    channelAria: "Subscribe on YouTube @sessionscan",
    langSwitchAria: "Language",
    searchAria: "Scan page cards",
    scanLabel: "SCAN",
    scanBtn: "SCAN",
    searchPh: "Scan keywords — Cayo, GTA 6, Bahamut…",
    navAria: "Channels",
    tabJobs: "This week's money & jobs",
    tabHot: "Hot videos · last 30 days",
    tabNew: "Trending Shorts",
    tabForum: "Forums",
    tabX: "X / Twitter",
    channelMiniAria: "Channel filters",
    eyebrow: "NIGHT SCAN // WET ASPHALT",
    hudLine: "CH-07 · NIGHT SCAN · VICE DUSK",
    ledeHtml:
      "Scan this week's jobs, money routes, guide videos, and community signals.<br /><span>Focus: GTA 5 · GTA 6. Online counts as GTA 5. No GTA 4. No RDO.</span>",
    ctaJobs: "This week's money & jobs",
    ctaHot: "Hot videos · last 30 days",
    ctaNew: "Trending Shorts",
    ctaForum: "Forum signals",
    ctaX: "X / Twitter",
    ctaJobsSub: "MONEY & JOBS",
    ctaHotSub: "HOT GUIDES",
    ctaNewSub: "SHORTS",
    ctaForumSub: "BAHAMUT / REDDIT",
    ctaXSub: "ROCKSTAR / GTA 6",
    ctaGo: "Enter ↗",
    officialKicker: "CH-00 · Official weekly",
    officialFlags: "No ads · Unofficial · Snapshot, not live",
    officialPending: "Official weekly signal pending next snapshot",
    officialSource: "Source {source}",
    loadingStrong: "LOADING",
    loadingSpan: "Reading the public-source snapshot.",
    highlightsKicker: "This week",
    highlightsTag: "THIS WEEK · snapshot picks",
    highlightsLoading: "Loading this week's picks",
    highlightsEmpty: "This week's picks pending next snapshot",
    highlightOfficial: "Official weekly",
    highlightSchedule: "Schedule",
    highlightHotWeek: "Hot this week",
    highlightHotGuide: "Hot guides",
    highlightOwnedShort: "Owned Short",
    highlightTrendingShort: "Trending Short",
    gta6Schedule: "GTA 6 date announced: November 19",
    statsKicker: "Scan stats",
    statsTag: "STATS · snapshot counts only",
    statVideos: "Videos tracked",
    statViews: "Total views",
    statAvg: "Average views",
    statChannel: "Channel this week",
    jobsH2: "This week's money & jobs",
    jobsEm: "Money & jobs",
    hotH2: "Hot guide videos · last 30 days",
    hotEm: "Hot guides",
    newH2: "Trending Shorts",
    newEm: "Shorts",
    forumH2: "Forums",
    forumEm: "Bahamut / Reddit",
    xH2: "X / Twitter",
    xEm: "Rockstar / GTA 6",
    metaLoading: "Loading snapshot",
    jobsHintGtabase: "GTABase this week's money & jobs: weekly updates, bonuses, discounts. Cards link out; we do not copy full guides.",
    jobsHintIgn: "IGN is limited to GTA Online weekly bonuses / money. No GTA 6 recap news. No GTA 4. No RDO.",
    jobsHintWiki: "GTA Wiki this-week events and money pages. No Red Dead Wiki. This site does not rewrite guide text.",
    jobsSourceAria: "Guide sources",
    jobsRangeAria: "Weekly range",
    olderWeeklies: "Earlier weeklies",
    langAria: "Language",
    langZh: "Chinese",
    langEn: "English",
    langJa: "Japanese",
    langLabelZh: "Chinese",
    langLabelJa: "Japanese",
    langLabelKo: "Korean",
    langLabelEn: "EN",
    sortAria: "Sort",
    sortRank: "Rank",
    sortViews: "Views",
    sortNewest: "Newest",
    periodAria: "Period",
    periodAll: "All",
    periodWeek: "This week",
    period30d: "Last 30 days",
    channelFilterAria: "Channel",
    allChannels: "All channels",
    newHint: "Slot 1 is the SessionScan Short; the rest are other trending Shorts. No long-form videos.",
    forumSourceAria: "Forum sources",
    forumBahamut: "Bahamut",
    forumReddit: "Reddit",
    searchHeading: "Scan results",
    clearSearch: "✕ Clear scan",
    footerAbout: "GTA 5 / Online / GTA 6 hub, unrelated to other apps of the same name · No ads",
    footerScope:
      "Scope: GTA 5, GTA 6 (GTA Online counts as GTA 5). No GTA 4. No RDO. Cards link out; we do not copy full guides.",
    footerLegal:
      'Information architecture adapted from <a href="https://github.com/franky5440-afk/poe2" rel="noopener noreferrer">franky5440-afk/poe2</a> (Apache 2.0). Visual design, copy, and sample data are original modifications. See <a href="./NOTICE">NOTICE</a> and <a href="./LICENSE">LICENSE</a>.',
    sampleBadge: "SAMPLE",
    viewsSample: " (sample)",
    playAria: "Play: {title}",
    channelOwned: "SessionScan channel @sessionscan ↗",
    noOwnedShort: "No new Short this week",
    prevShort: "Previous: {title} ↗",
    ownedShortTag: "Owned Short",
    noFakeLink: "No fabricated links",
    relativeTimeTag: "Source used relative time; snapshot is authoritative",
    replies: "Replies {n}",
    repliesSample: " (sample)",
    handleUnresolved: "Account not resolved",
    tweetOutbound: "Open original / profile ↗",
    ignPausedTitle: "This source is paused",
    ignPausedHint: "This source is paused. IGN has no outbound GTA Online weekly bonus cards right now.",
    ignPausedEmpty: "This source is paused",
    noCardsThisWeek: "No cards this week",
    noCardsLive: "No cards from this source yet. Waiting for the next snapshot.",
    noCardsSample: "No sample cards from this source.",
    hotStale: "Hot-video source did not update this run; still showing the last good snapshot",
    snapshotTime: "Snapshot: {stamp} · not a live crawl",
    snapshotTimeStale: "Snapshot: {stamp} · not a live crawl · {hint}",
    sampleTime: "Sample snapshot: {stamp}",
    noVideosFilter: "No videos for these filters",
    noVideosLive: "No videos in this language yet. Waiting for the next snapshot.",
    noVideosSample: "No sample videos in this language.",
    noShortsFilter: "No Shorts for these filters",
    noShortsLive: "No other trending Shorts yet. Waiting for the next snapshot.",
    noShortsSample: "No sample Shorts.",
    noThreadsLive: "No threads yet. Waiting for the next snapshot.",
    noThreadsSample: "No sample threads.",
    noZhTweets: "No Chinese signals today",
    noTweetsLive: "No signals yet. Waiting for the next snapshot.",
    noTweetsSample: "No sample signals.",
    snapshotStrong: "SNAPSHOT",
    snapshotSpan: "Public source titles, not a live crawl. Snapshot {stamp}. Failed sources keep the last good file.",
    sampleStrong: "EXAMPLE DATA",
    sampleSpan: "First-pass static shell. Numbers, times, and thread titles are samples, not a live crawl.",
    lastRunLive: "Snapshot: {stamp} · not a live crawl",
    lastRunSample: "Scraper status: off · sample snapshot {stamp}",
    searchTitleLive: "“{q}” · {n} results",
    searchTitleSample: "“{q}” · {n} results (sample data only)",
    groupJobs: "Money & jobs ({n})",
    groupHot: "Hot videos ({n})",
    groupShorts: "Trending Shorts ({n})",
    groupSlot: "SessionScan Short",
    groupForum: "Forums ({n})",
    groupX: "X / Twitter ({n})",
    noResult: "No cards match “{q}”.",
    loadFail: "Could not load JSON. Serve the site locally; do not open the file directly.",
    jaNoteTitle: "Japanese tab is optional",
    jaNoteBody: "No unverified YouTube IDs in this pass. Public Japanese guide index linked instead.",
    videoHome: "Home",
    videoWatch: "Watch on YouTube ↗",
    videoUntitled: "YouTube video",
    videoDescTail: "SessionScan links out to titles only; it does not copy guides.",
    videoPageTitleFallback: "YouTube video | SessionScan",
    share: "Share to X",
    copy: "Copy link",
    copied: "Copied",
  },
  zh: {
    metaTitle: "SessionScan GTA｜夜掃描",
    metaDesc: "GTA 5／Online／GTA 6 情報站。本週訊號、只掛標題外連，不轉載。與其他同名 App 無關。",
    skip: "跳至內容",
    brandAria: "SessionScan 回頂端",
    brandAriaHome: "SessionScan 回首頁",
    brandEm: "夜掃描",
    channelFull: "訂閱 YouTube",
    channelAria: "訂閱 YouTube 頻道 @sessionscan",
    langSwitchAria: "語言",
    searchAria: "掃描頁面卡片",
    scanLabel: "掃描",
    scanBtn: "掃描",
    searchPh: "掃描關鍵字 — Cayo、GTA 6、巴哈…",
    navAria: "頻道",
    tabJobs: "本週賺錢與工作",
    tabHot: "近 30 天熱門影片",
    tabNew: "當紅 Short",
    tabForum: "論壇",
    tabX: "X / Twitter",
    channelMiniAria: "頻道篩選",
    eyebrow: "夜掃描 // 濕瀝青",
    hudLine: "CH-07 · 夜掃描 · 黃昏",
    ledeHtml:
      "掃描本週工作、賺錢路線、攻略影片與社群訊號。<br /><span>範圍：GTA 5 · GTA 6。線上模式算 GTA 5。不含 GTA 4。不含 RDO。</span>",
    ctaJobs: "本週賺錢與工作",
    ctaHot: "近 30 天熱門影片",
    ctaNew: "當紅 Short",
    ctaForum: "論壇訊號",
    ctaX: "X / Twitter",
    ctaJobsSub: "賺錢與工作",
    ctaHotSub: "熱門攻略",
    ctaNewSub: "短片",
    ctaForumSub: "巴哈／Reddit",
    ctaXSub: "R星／GTA 6",
    ctaGo: "切入 ↗",
    officialKicker: "CH-00 · 官方週更",
    officialFlags: "無廣告 · 非官方 · 快照非即時",
    officialPending: "本週官方訊號待下次掃描",
    officialSource: "來源 {source}",
    loadingStrong: "載入中",
    loadingSpan: "正在讀取公開來源快照。",
    highlightsKicker: "本週重點",
    highlightsTag: "本週 · 快照精選",
    highlightsLoading: "本週重點載入中",
    highlightsEmpty: "本週重點待下次掃描",
    highlightOfficial: "官方週更",
    highlightSchedule: "時程",
    highlightHotWeek: "本週熱門",
    highlightHotGuide: "熱門攻略",
    highlightOwnedShort: "自有 Short",
    highlightTrendingShort: "當紅 Short",
    gta6Schedule: "GTA 6 已公開時程：11 月 19 日",
    statsKicker: "掃描統計",
    statsTag: "統計 · 只計快照數字",
    statVideos: "影片追蹤",
    statViews: "總觀看",
    statAvg: "平均觀看",
    statChannel: "本週頻道",
    jobsH2: "本週賺錢與工作",
    jobsEm: "賺錢與工作",
    hotH2: "近 30 天熱門攻略影片",
    hotEm: "熱門攻略",
    newH2: "當紅 Short",
    newEm: "短片",
    forumH2: "論壇",
    forumEm: "巴哈姆特 / Reddit",
    xH2: "X / Twitter",
    xEm: "R星 / GTA 6",
    metaLoading: "快照載入中",
    jobsHintGtabase: "GTABase 本週賺錢與工作：每週更新、獎勵、折扣。卡片只外連，不轉載全文。",
    jobsHintIgn: "IGN 只收 GTA Online 每週獎勵／賺錢。不含 GTA 6 新聞回顧。不含 GTA 4。不含 RDO。",
    jobsHintWiki: "GTA Wiki 本週活動與賺錢條目。不含 Red Dead Wiki。本站不重寫攻略正文。",
    jobsSourceAria: "指南來源",
    jobsRangeAria: "週更範圍",
    olderWeeklies: "較早週更",
    langAria: "語言",
    langZh: "中文",
    langEn: "English",
    langJa: "日本語",
    langLabelZh: "中文",
    langLabelJa: "日文",
    langLabelKo: "韓文",
    langLabelEn: "EN",
    sortAria: "排序",
    sortRank: "排名",
    sortViews: "觀看",
    sortNewest: "最新",
    periodAria: "期間",
    periodAll: "全部",
    periodWeek: "本週",
    period30d: "近 30 天",
    channelFilterAria: "頻道",
    allChannels: "全部頻道",
    newHint: "第一格為 SessionScan 自有 Short，其餘為他人當紅 Short。不含長影片。",
    forumSourceAria: "論壇來源",
    forumBahamut: "巴哈姆特",
    forumReddit: "Reddit",
    searchHeading: "掃描結果",
    clearSearch: "✕ 清除掃描",
    footerAbout: "GTA 5／Online／GTA 6 情報站，與其他同名 App 無關 · 無廣告",
    footerScope: "範圍：GTA 5、GTA 6（GTA Online 歸在 GTA 5）。不含 GTA 4。不含 RDO。卡片只外連，不轉載攻略全文。",
    footerLegal:
      '資訊架構改寫自 <a href="https://github.com/franky5440-afk/poe2" rel="noopener noreferrer">franky5440-afk/poe2</a>（Apache 2.0）。視覺與文案為 SessionScan 的修改。見 <a href="./NOTICE">NOTICE</a> 與 <a href="./LICENSE">LICENSE</a>。',
    sampleBadge: "範例",
    viewsSample: "（範例）",
    playAria: "播放：{title}",
    channelOwned: "SessionScan 頻道 @sessionscan ↗",
    noOwnedShort: "本週尚無新 Short",
    prevShort: "上一則：{title} ↗",
    ownedShortTag: "自有 Short",
    noFakeLink: "無偽造連結",
    relativeTimeTag: "來源相對時間，以快照為準",
    replies: "回 {n}",
    repliesSample: "（範例）",
    handleUnresolved: "帳號未解析",
    tweetOutbound: "外連原文 / 帳號 ↗",
    ignPausedTitle: "此來源暫停",
    ignPausedHint: "此來源暫停。IGN 目前沒有本週 GTA Online 獎勵外連卡。",
    ignPausedEmpty: "此來源暫停",
    noCardsThisWeek: "本週尚無卡片",
    noCardsLive: "此來源尚無卡片，等待下次掃描。",
    noCardsSample: "此來源尚無範例卡片。",
    hotStale: "熱門影片來源這輪未更新，仍顯示上次成功快照",
    snapshotTime: "資料快照：{stamp} · 非即時掃描",
    snapshotTimeStale: "資料快照：{stamp} · 非即時掃描 · {hint}",
    sampleTime: "範例快照：{stamp}",
    noVideosFilter: "此條件沒有影片",
    noVideosLive: "此語言尚無影片，等待下次掃描。",
    noVideosSample: "此語言尚無範例影片。",
    noShortsFilter: "此條件沒有 Short",
    noShortsLive: "尚無他人當紅 Short，等待下次掃描。",
    noShortsSample: "尚無範例 Short。",
    noThreadsLive: "尚無討論，等待下次掃描。",
    noThreadsSample: "尚無範例討論。",
    noZhTweets: "今日無中文訊號",
    noTweetsLive: "尚無訊號，等待下次掃描。",
    noTweetsSample: "尚無範例訊號。",
    snapshotStrong: "資料快照",
    snapshotSpan: "公開來源標題彙整，不是即時爬蟲。快照 {stamp}。來源失敗時保留既有檔。",
    sampleStrong: "範例資料",
    sampleSpan: "第一版靜態殼。數字、時間、討論標題皆為樣本，不是即時爬蟲。",
    lastRunLive: "資料快照：{stamp} · 非即時爬蟲",
    lastRunSample: "爬蟲狀態：未啟用 · 範例快照 {stamp}",
    searchTitleLive: "「{q}」掃描結果：{n} 筆",
    searchTitleSample: "「{q}」掃描結果：{n} 筆（僅範例資料）",
    groupJobs: "賺錢與工作（{n}）",
    groupHot: "熱門影片（{n}）",
    groupShorts: "當紅 Short（{n}）",
    groupSlot: "SessionScan Short",
    groupForum: "論壇（{n}）",
    groupX: "X / Twitter（{n}）",
    noResult: "掃描不到符合「{q}」的卡片。",
    loadFail: "無法載入 JSON。請用本機靜態伺服器開啟，不要直接雙擊檔案。",
    jaNoteTitle: "日本語區為可選分頁",
    jaNoteBody: "此版未放入未核對的 YouTube 連結。可改連公開日文攻略索引。",
    videoHome: "回首頁",
    videoWatch: "在 YouTube 觀看 ↗",
    videoUntitled: "YouTube 影片",
    videoDescTail: "SessionScan 只掛標題外連，不轉載。",
    videoPageTitleFallback: "YouTube 影片｜SessionScan",
    share: "分享到 X",
    copy: "複製連結",
    copied: "已複製",
  },
};

export const SEARCH_ALIAS_GROUPS = [
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
  ["chinese", "中文", "zh", "繁體", "繁体"],
  ["english", "英文", "en", "英語"],
  ["japanese", "日本語", "日文", "ja", "日語"],
  ["korean", "韓文", "ko", "韓語", "한국어"],
  ["bahamut", "巴哈", "巴哈姆特"],
  ["shorts", "短片", "當紅"],
];

export const LANG_SEARCH_ALIASES = {
  zh: ["zh", "中文", "chinese", "繁體", "繁体", "國語"],
  en: ["en", "english", "英文", "英語"],
  ja: ["ja", "日本語", "japanese", "日文", "日語"],
  ko: ["ko", "韓文", "korean", "한국어", "韓語"],
};

let _lang = "en";

export function normalizeLang(raw) {
  const lang = String(raw || "").toLowerCase();
  if (lang.startsWith("zh")) return "zh";
  if (lang.startsWith("ja")) return "ja";
  if (lang.startsWith("en")) return "en";
  return "";
}

export function isZhPath(pathname = "") {
  const p = String(pathname || "").replace(/\/index\.html$/, "") || "/";
  return p === "/zh" || p.startsWith("/zh/");
}

export function isVideoPath(pathname = "") {
  return /\/v\/[A-Za-z0-9_-]{11}\/?$/.test(String(pathname || ""));
}

export function detectLang({ pathname = "/", stored = "", defaultLang = "en" } = {}) {
  if (isZhPath(pathname)) return "zh";
  if (stored === "zh" || stored === "en") return stored;
  return defaultLang;
}

export function htmlLang(lang) {
  return lang === "zh" ? "zh-Hant" : "en";
}

export function ogLocale(lang) {
  return lang === "zh" ? "zh_TW" : "en_US";
}

export function localeHome(lang) {
  return lang === "zh" ? `${SITE_ORIGIN}/zh/` : `${SITE_ORIGIN}/`;
}

export function localeHref(lang, { hash = "", search = "" } = {}) {
  const path = lang === "zh" ? "/zh/" : "/";
  return `${path}${search || ""}${hash || ""}`;
}

export function readStoredLang() {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    return stored === "zh" || stored === "en" ? stored : "";
  } catch {
    return "";
  }
}

export function persistLang(lang) {
  const next = lang === "zh" ? "zh" : "en";
  try {
    localStorage.setItem(LANG_STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  return next;
}

export function getUiLang() {
  if (typeof document !== "undefined") {
    const fromDom = normalizeLang(document.documentElement?.dataset?.uiLang || document.documentElement?.lang || "");
    if (fromDom === "zh" || fromDom === "en") return fromDom;
  }
  return _lang === "zh" ? "zh" : "en";
}

export function setUiLang(lang) {
  _lang = lang === "zh" ? "zh" : "en";
  if (typeof document !== "undefined") {
    document.documentElement.lang = htmlLang(_lang);
    document.documentElement.dataset.uiLang = _lang;
  }
  return _lang;
}

export function copyFor(lang = getUiLang()) {
  return UI[lang === "zh" ? "zh" : "en"];
}

export function interpolate(template, vars = {}) {
  return String(template ?? "").replace(/\{(\w+)\}/g, (_, key) => (vars[key] == null ? "" : String(vars[key])));
}

export function t(key, vars, lang) {
  const pack = copyFor(lang);
  const fallback = UI.en[key];
  const raw = pack[key] ?? fallback ?? key;
  return vars ? interpolate(raw, vars) : raw;
}

export function langLabel(code, lang = getUiLang()) {
  if (code === "zh") return t("langLabelZh", {}, lang);
  if (code === "ja") return t("langLabelJa", {}, lang);
  if (code === "ko") return t("langLabelKo", {}, lang);
  if (code === "en") return t("langLabelEn", {}, lang);
  return "";
}

export function fmtViews(n, { live = true, lang = getUiLang() } = {}) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "";
  const suffix = live ? "" : t("viewsSample", {}, lang);
  if (lang === "zh") {
    if (n >= 10000) return `${(n / 10000).toFixed(1).replace(/\.0$/, "")} 萬${suffix}`;
    if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K${suffix}`;
    return `${n}${suffix}`;
  }
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, "")}M${suffix}`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K${suffix}`;
  return `${n}${suffix}`;
}

export function siteBase(pathname = typeof location !== "undefined" ? location.pathname : "/") {
  const explicit = typeof document !== "undefined" ? document.documentElement?.dataset?.siteBase : "";
  if (explicit) return explicit.endsWith("/") ? explicit : `${explicit}/`;
  const p = String(pathname || "/").replace(/\/index\.html$/, "") || "/";
  if (p === "/zh" || p === "/zh/") return "../";
  if (/\/zh\/v\/[A-Za-z0-9_-]{11}\/?$/.test(p)) return "../../../";
  if (/\/v\/[A-Za-z0-9_-]{11}\/?$/.test(p)) return "../../";
  return "./";
}

export function dataUrl(file, pathname) {
  return `${siteBase(pathname)}data/${file}`;
}

function escapeText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttr(value) {
  return escapeText(value).replaceAll('"', "&quot;");
}

function copyValue(lang, key) {
  const pack = copyFor(lang);
  return pack[key] ?? UI.en[key];
}

export function applyDomI18n(root, lang = getUiLang()) {
  if (!root?.querySelectorAll) return;
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    const value = copyValue(lang, key);
    if (value != null) el.textContent = value;
  });
  root.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const key = el.dataset.i18nHtml;
    const value = copyValue(lang, key);
    if (value != null) el.innerHTML = value;
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    const value = copyValue(lang, key);
    if (value != null) el.setAttribute("placeholder", value);
  });
  root.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    const key = el.dataset.i18nAria;
    const value = copyValue(lang, key);
    if (value != null) el.setAttribute("aria-label", value);
  });
  root.querySelectorAll("[data-i18n-content]").forEach((el) => {
    const key = el.dataset.i18nContent;
    const value = copyValue(lang, key);
    if (value != null) el.setAttribute("content", value);
  });
  root.querySelectorAll("[data-lang-link]").forEach((el) => {
    const target = el.dataset.langLink;
    if (target === lang) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  });
}

export function applyHtmlI18n(html, lang) {
  const pack = copyFor(lang);
  let out = String(html || "");
  const locale = htmlLang(lang);
  const home = localeHome(lang);
  const altLocale = lang === "zh" ? "en_US" : "zh_TW";

  out = out.replace(/<html\b([^>]*)>/i, (_, attrs) => {
    let a = String(attrs || "")
      .replace(/\slang="[^"]*"/i, "")
      .replace(/\sdata-ui-lang="[^"]*"/i, "")
      .replace(/\sdata-site-base="[^"]*"/i, "");
    const base = lang === "zh" ? ' data-site-base="../"' : "";
    return `<html lang="${locale}" data-ui-lang="${lang === "zh" ? "zh" : "en"}"${base}${a}>`;
  });

  out = out.replace(/<([a-zA-Z0-9]+)([^>]*\sdata-i18n="([^"]+)"[^>]*)>([^<]*)/g, (full, _tag, attrs, key, text) => {
    const value = pack[key] ?? UI.en[key];
    if (value == null) return full;
    return `<${_tag}${attrs}>${escapeText(value)}`;
  });

  out = out.replace(/<([a-zA-Z0-9]+)([^>]*\sdata-i18n-html="([^"]+)"[^>]*)>[\s\S]*?<\/\1>/g, (full, tag, attrs, key) => {
    const value = pack[key] ?? UI.en[key];
    if (value == null) return full;
    return `<${tag}${attrs}>${value}</${tag}>`;
  });

  const attrMaps = [
    ["data-i18n-placeholder", "placeholder"],
    ["data-i18n-aria", "aria-label"],
    ["data-i18n-content", "content"],
  ];
  for (const [dataAttr, target] of attrMaps) {
    out = out.replace(new RegExp(`<[^>]*\\s${dataAttr}="([^"]+)"[^>]*>`, "g"), (tag, key) => {
      const value = pack[key] ?? UI.en[key];
      if (value == null) return tag;
      const esc = escapeAttr(value);
      if (new RegExp(`\\s${target}="`).test(tag)) {
        return tag.replace(new RegExp(`\\s${target}="[^"]*"`), ` ${target}="${esc}"`);
      }
      return tag.replace(/>$/, ` ${target}="${esc}">`);
    });
  }

  out = out.replace(/<title\b([^>]*)>[\s\S]*?<\/title>/i, `<title$1>${escapeText(pack.metaTitle)}</title>`);
  out = out.replace(/\scontent="https:\/\/sessionscan\.net\/(?:zh\/)?"/g, (m, offset) => {
    const slice = out.slice(Math.max(0, offset - 80), offset);
    if (/og:url|canonical/.test(slice) || /rel="canonical"/.test(out.slice(Math.max(0, offset - 120), offset))) {
      return ` content="${home}"`;
    }
    return m;
  });
  out = out.replace(/rel="canonical" href="[^"]*"/, `rel="canonical" href="${home}"`);
  out = out.replace(/property="og:url" content="[^"]*"/, `property="og:url" content="${home}"`);
  out = out.replace(/property="og:locale" content="[^"]*"/, `property="og:locale" content="${ogLocale(lang)}"`);
  out = out.replace(/property="og:locale:alternate" content="[^"]*"/, `property="og:locale:alternate" content="${altLocale}"`);

  out = out.replace(/\saria-current="page"/g, "");
  out = out.replace(
    new RegExp(`(<a[^>]*data-lang-link="${lang === "zh" ? "zh" : "en"}"[^>]*)>`, "g"),
    `$1 aria-current="page">`,
  );

  if (lang === "zh") {
    out = out.replaceAll("Share to X", pack.share);
    out = out.replaceAll("Copy link", pack.copy);
    out = out.replaceAll("Copied", pack.copied);
  }

  return out;
}

export function rewriteAssetBase(html, prefix = "../") {
  return String(html || "")
    .replace(/(href|src)="\.\//g, `$1="${prefix}`)
    .replace(/(href|src)="assets\//g, `$1="${prefix}assets/`);
}

export function hreflangLinks() {
  return [
    `<link rel="alternate" hreflang="en" href="${SITE_ORIGIN}/" />`,
    `<link rel="alternate" hreflang="zh-Hant" href="${SITE_ORIGIN}/zh/" />`,
    `<link rel="alternate" hreflang="x-default" href="${SITE_ORIGIN}/" />`,
  ].join("\n    ");
}

export function shouldRedirectToZh({ pathname = "/", stored = "" } = {}) {
  return stored === "zh" && !isZhPath(pathname) && !isVideoPath(pathname);
}

export function langHay(code) {
  return (LANG_SEARCH_ALIASES[code] || []).join(" ");
}
