/** English-first UI copy, /zh/ locale, and bilingual search helpers. */

export const LANG_STORAGE_KEY = "sessionscan-lang";
export const SITE_ORIGIN = "https://sessionscan.net";
/** Home Open Graph / Twitter card image (`public/og.jpg`). Shell pages: `ogImages.js`. */
export const OG_IMAGE_URL = `${SITE_ORIGIN}/og.jpg`;
export const OG_IMAGE_WIDTH = "1200";
export const OG_IMAGE_HEIGHT = "630";
/** X handle for twitter:site (matches header X profile). */
export const TWITTER_SITE = "@SessionScanGTA";

export const UI = {
  en: {
    siteName: "SessionScan GTA",
    metaTitle: "This week in GTA Online | SessionScan",
    metaDesc:
      "What to do this week in GTA Online — bonuses, money & jobs, and this week's Short. GTA 5 / Online / GTA 6 hub; titles and outbound links only. Unrelated to other apps of the same name.",
    metaOgImageAlt: "SessionScan — GTA Online weekly hub",
    skip: "Skip to content",
    brandAria: "SessionScan back to top",
    brandAriaHome: "SessionScan back to home",
    brandEm: "GTA HUB",
    channelFull: "Subscribe on YouTube",
    channelAria: "Subscribe on YouTube @sessionscan",
    instagramFull: "Follow on Instagram",
    // Visible labels are "Follow on Instagram" (desktop) and "IG" (compact header).
    // Accessible name must contain both for WCAG 2.5.3 / Lighthouse label-content-name-mismatch.
    instagramAria: "Follow on Instagram · IG",
    headerSocialAria: "SessionScan social",
    langSwitchAria: "Language",
    searchAria: "Scan page cards",
    scanLabel: "SCAN",
    scanBtn: "SCAN",
    searchPh: "Scan keywords — Cayo, GTA 6, Bahamut…",
    navAria: "Channels",
    siteNavAria: "Site",
    navThisWeek: "This week",
    navArchive: "Archive",
    navMoney: "Money",
    navBusinesses: "Businesses",
    navAcidLab: "Acid Lab",
    navGta6: "GTA 6",
    navAbout: "About",
    relatedPagesKicker: "Also on SessionScan",
    relatedPagesAria: "Related SessionScan pages",
    footerGuidesAria: "Guides and archive",
    pageStubFlag: "Stub — full content ships in a later phase.",
    pageWeekTitle: "Weekly archive | SessionScan",
    pageWeekDesc:
      "Frozen weekly GTA Online updates from SessionScan — titles, highlights, and outbound links only.",
    pageWeekHeading: "Weekly archive",
    pageWeekBody:
      "<p>Past Rockstar Thursday weeks, frozen from the public snapshot. Each week page lists titles, one-line highlights, and outbound links — no full guide copies.</p>",
    archiveIndexIntro:
      "Past Rockstar Thursday weeks from the public snapshot. Titles and outbound links only — no full guide copies, no invented numbers.",
    archiveIndexEmpty: "No dated weekly titles in this snapshot yet. Check this week on the home page.",
    archiveLatestBadge: "Latest",
    archiveAtomLink: "Atom feed of archived weeks ↗",
    archiveWeekInvalid: "That week key is not a valid YYYY-MM-DD freeze.",
    archiveWeekTitle: "Week of {week} | SessionScan",
    archiveWeekDesc: "Frozen GTA Online week of {week}: {title}. Titles and outbound links only.",
    archiveWeekHeading: "Week of {week}",
    archiveShortKicker: "That week's Short",
    archiveShortTag: "SESSIONSCAN · embed when dated",
    archiveShortEmpty: "No SessionScan Short for this freeze — slot stays empty (no fabricated link).",
    archiveBulletsKicker: "Frozen highlights",
    archiveBulletsClaimHint:
      "Checks sync with home on this device for this Rockstar week (Thu–Wed).",
    archiveLinksKicker: "Outbound titles",
    archiveLinksTag: "SOURCES · titles only",
    archiveLinksEmpty: "No outbound weekly titles for this freeze in the snapshot.",
    archiveShareHint: "Caption-ready week URLs:",
    archivePagerAria: "Adjacent archived weeks",
    archivePagerOlder: "← Older · {week}",
    archivePagerNewer: "Newer · {week} →",
    archiveJumpLatest: "View latest freeze · {week} →",
    breadcrumbsAria: "Breadcrumb",
    archiveBackToIndex: "← All archived weeks",
    pageMoneyTitle: "Money guide | SessionScan",
    pageMoneyDesc:
      "GTA Online evergreen money routes ranked by cited GTA$ take, with source links and a lightweight $/hr calculator. Titles and highlights only — no invented figures.",
    pageMoneyHeading: "Money guide",
    pageMoneyBody:
      "<p>Evergreen money-making routes ranked by <strong>cited GTA$ take</strong> (each figure links to its source + date). Enter your run time in the calculator for a rough $/hr. We do not invent numbers. For this week's bonuses, see <a href=\"/\">home</a>.</p>",
    moneyLastUpdated: "Last updated {date}",
    moneyRankHeading: "Ranked by cited take",
    moneyRankNote:
      "Order uses the cited GTA$ figure — not a guaranteed hourly rate. Rough $/hr on each row follows Your minutes above (same math as the calculator). Tap a row to select it. Rockstar can change payouts; open the source before you grind.",
    moneySourceMeta: "Source · {source} · {date} ↗",
    moneyRouteRate: "≈ {rate}/hr at {minutes} min (rough)",
    moneyCalcHeading: "Simple $/hr calculator",
    moneyCalcNote: "Pick a cited route, enter how many minutes your full run usually takes, get a rough GTA$/hr. The ranked list below updates with the same minutes.",
    moneyCalcRoute: "Route (cited take)",
    moneyCalcMinutes: "Your minutes",
    moneyCalcPresetsAria: "Quick minute presets",
    moneyCalcPresetAria: "{minutes} minutes",
    moneyCalcEmpty: "Enter minutes to see rough GTA$/hr.",
    moneyCalcResult: "{rate}/hr (rough)",
    moneyWeekLink: "This week's money & jobs on home ↗",
    homeMoneyGuideLink: "Money guide — cited takes & $/hr ↗",
    homeBusinessGuideLink: "Business ranking — worth buying order ↗",
    businessWeekLink: "This week's money & jobs on home ↗",
    pageBusinessesTitle: "Business ranking | SessionScan",
    pageBusinessesDesc:
      "Which GTA Online businesses are worth buying — ranked list with Rockstar Newswire sources and last-updated dates. Titles and highlights only; no invented GTA$ figures.",
    pageBusinessesHeading: "Business ranking",
    pageBusinessesBody:
      "<p>Worth-buying order for typical solo / grinder accounts. Highlights describe what each property unlocks — not payout math. Weekly discounts can change buy timing; check <a href=\"/\">this week</a> and Newswire before you spend.</p>",
    bizUpdatedHtml: "<strong>Last updated</strong> <time datetime=\"{date}\">{date}</time>",
    bizMethodologyLabel: "Ranking order follows:",
    bizSourceDate: "Source date {date}",
    bizFilterAria: "Filter businesses by playstyle or inventory",
    bizFilterAll: "All",
    bizFilterSolo: "Solo-friendly",
    bizFilterOwned: "Owned",
    bizFilterEmpty: "No businesses match this filter.",
    bizOwnLabel: "I own this",
    bizOwnedCopy: "Copy owned",
    bizOwnedCopyAria: "Copy owned businesses as plain text",
    bizOwnedCopied: "Copied",
    bizOwnedCopyHeading: "My businesses",
    bizOwnedClear: "Clear owned",
    bizOwnedClearAria: "Clear all owned business marks",
    bizOfficialTrailerTitle: "Official Rockstar trailer: {title}",
    bizDisclaimer:
      "SessionScan does not invent purchase prices or $/hr. Every outbound link is Rockstar Newswire or a named secondary used for rank order. Figures you see on those pages are theirs — verify before spending.",
    bizAcidLabGuideLink: "Acid Lab guide ↗",
    pageAcidLabTitle: "Acid Lab Guide: Sell for 50% More (Tested) | SessionScan",
    pageAcidLabDesc:
      "Quick answer: rename your product first and sell in a public lobby. In our test the same 40 units went from $62,360 to $93,510.",
    pageAcidLabHeading: "Acid Lab Guide: Sell for 50% More (Tested)",
    acidLabLongSoon: "Full video coming soon",
    acidLabLongTitle: "Acid Lab full run",
    acidLabShortWatch: "Watch the Short on YouTube ↗",
    pageGta6Title: "GTA 6 | SessionScan",
    pageGta6Desc:
      "Official Grand Theft Auto VI release date countdown and Rockstar links only — no leaks, no rumors as fact.",
    pageGta6Heading: "GTA 6",
    pageGta6Body:
      "<p>Official information only. SessionScan links to Rockstar sources; we do not publish leaks or frame rumors as fact.</p><p>Announced release date (Rockstar): <strong>November 19, 2026</strong>.</p>",
    pageGta6Official: "Rockstar — Grand Theft Auto VI ↗",
    pageGta6Newswire: "Rockstar Newswire ↗",
    homeGta6Link: "GTA 6 official countdown ↗",
    gta6HomeLink: "This week's money & jobs on home ↗",
    pageGta6CountdownKicker: "Official release countdown",
    pageGta6CountdownTag: "COUNTDOWN · Rockstar announced date",
    pageGta6CountdownLive: "Release day window is open (per Rockstar announcement)",
    pageGta6SourceNote: "Source: Rockstar — announced {date}",
    pageGta6TrailerKicker: "Official look",
    pageGta6TrailerTag: "ROCKSTAR · YouTube",
    pageGta6TrailerTitle: "Grand Theft Auto VI: An Extended Look",
    pageGta6TrailerWatch: "Watch on YouTube ↗",
    pageGta6TrailerVia: "Via rockstargames.com/VI ↗",
    pageGta6EventName: "Grand Theft Auto VI — announced release",
    pageGta6EventDesc:
      "Rockstar-announced release date for Grand Theft Auto VI. SessionScan cites the official announcement only.",
    pageAboutTitle: "About | SessionScan",
    pageAboutDesc: "What SessionScan is: GTA 5 / Online / GTA 6 hub, scope, disclaimer, and social links.",
    pageAboutHeading: "About SessionScan",
    pageAboutBody:
      "<p>SessionScan is a static GTA 5 / Online / GTA 6 intelligence hub. We surface this week's signals and outbound titles only — we do not copy full guides.</p><p><strong>Scope:</strong> GTA 5, GTA Online (counts as GTA 5), and GTA 6. No GTA 4. No Red Dead Online.</p><p>Unofficial fan site · no ads · snapshot data, not a live scrape. Unrelated to other apps of the same name. See NOTICE and LICENSE in the site root for attribution.</p>",
    tabJobs: "This week's money & jobs",
    tabHot: "Hot videos · last 30 days",
    tabNew: "Trending Shorts",
    tabForum: "Forums",
    tabX: "X / Twitter",
    channelMiniAria: "Channel filters",
    eyebrow: "NIGHT SCAN // WET ASPHALT",
    hudLine: "CH-07 · NIGHT SCAN · VICE DUSK",
    ledeHtml:
      "What to do this week in GTA Online — reward + how to access, this week's Short, and outbound money cards.<br /><span>Focus: GTA 5 · GTA 6. Online counts as GTA 5. No GTA 4. No RDO.</span>",
    weekCountdownKicker: "Next weekly update",
    weekCountdownTag: "COUNTDOWN · Rockstar Thursday week",
    weekCountdownLive: "New week window is open",
    weekShortKicker: "This week's Short",
    weekShortTag: "SESSIONSCAN · embed",
    weekShortEmpty: "No SessionScan Short this week — slot stays empty (no fabricated link).",
    weekSocialKicker: "Follow SessionScan",
    weekSocialTag: "YT · IG · X",
    weekSocialX: "Follow on X",
    // Visible "Follow on X" / "X" / "@SessionScanGTA" must appear in the accessible name.
    weekSocialXAria: "Follow on X @SessionScanGTA",
    weekBulletsKicker: "This week — do this",
    weekBulletsTag: "ONE LINE · reward + access",
    weekBulletMultipliers: "2X / 3X & money multipliers",
    weekBulletFree: "Free / limited",
    weekBulletDiscounts: "Discounts",
    weekBulletPodium: "Podium & Prize Ride",
    weekBulletSalvageCayo: "Salvage Yard / Cayo",
    weekBulletPending: "No clear title signal in this week's snapshot",
    weekBulletHowSource: "Open source ↗",
    weekBulletHowWeekly: "Open this week's official update ↗",
    weekBulletHowNone: "Waiting for next snapshot",
    weekBulletClaim: "Mark done: {label}",
    weekBulletsHint: "Checks stay on this device for the current Rockstar week (Thu–Wed).",
    weekClaimProgress: "Claimed {done} of {total}",
    weekTipCopy: "Copy tip",
    weekTipCopied: "Copied",
    weekTipCopyAria: "Copy this week's tip as plain text",
    weekClaimClear: "Clear checks",
    weekClaimClearAria: "Clear all claimed checks for this Rockstar week",
    weekArchiveLatestLink: "Open archive for week of {week} ↗",
    weekArchiveIndexLink: "Browse weekly archive ↗",
    weekJobsKicker: "This week's money & jobs",
    weekJobsTag: "OUTBOUND · titles only",
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
    snapshotSpan: "Public source titles, not a live crawl. Snapshot {stamp}{age}. Failed sources keep the last good file.",
    snapshotAgeNow: "just now",
    snapshotAgeMinutes: "{n}m ago",
    snapshotAgeHours: "{n}h ago",
    snapshotAgeDays: "{n}d ago",
    sampleStrong: "EXAMPLE DATA",
    sampleSpan: "First-pass static shell. Numbers, times, and thread titles are samples, not a live crawl.",
    lastRunLive: "Snapshot: {stamp}{age} · not a live crawl",
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
    siteName: "SessionScan GTA｜夜掃描",
    metaTitle: "本週 GTA Online｜SessionScan",
    metaDesc:
      "本週 GTA Online 怎麼玩 — 加成、賺錢與工作、本週 Short。GTA 5／Online／GTA 6 情報站；只掛標題外連，不轉載。與其他同名 App 無關。",
    metaOgImageAlt: "SessionScan — GTA Online 週更情報站",
    skip: "跳至內容",
    brandAria: "SessionScan 回頂端",
    brandAriaHome: "SessionScan 回首頁",
    brandEm: "夜掃描",
    channelFull: "訂閱 YouTube",
    channelAria: "訂閱 YouTube 頻道 @sessionscan",
    instagramFull: "追蹤 Instagram",
    // Visible labels: "追蹤 Instagram" (desktop) and "IG" (compact header).
    instagramAria: "追蹤 Instagram · IG",
    headerSocialAria: "SessionScan 社群",
    langSwitchAria: "語言",
    searchAria: "掃描頁面卡片",
    scanLabel: "掃描",
    scanBtn: "掃描",
    searchPh: "掃描關鍵字 — Cayo、GTA 6、巴哈…",
    navAria: "頻道",
    siteNavAria: "站內",
    navThisWeek: "本週",
    navArchive: "週更封存",
    navMoney: "賺錢",
    navBusinesses: "生意",
    navAcidLab: "迷幻藥",
    navGta6: "GTA 6",
    navAbout: "關於",
    relatedPagesKicker: "站內也看這些",
    relatedPagesAria: "相關 SessionScan 頁面",
    footerGuidesAria: "攻略與週更封存",
    pageStubFlag: "佔位頁 — 完整內容之後的階段才會上線。",
    pageWeekTitle: "週更封存｜SessionScan",
    pageWeekDesc: "SessionScan 凍結的 GTA Online 週更 — 只列標題、重點與外連，不轉載全文。",
    pageWeekHeading: "週更封存",
    pageWeekBody:
      "<p>依公開快照凍結的 Rockstar 週四週更。每週頁只列標題、一行重點與外連 — 不轉載攻略全文。</p>",
    archiveIndexIntro:
      "依公開快照列出過去的 Rockstar 週四週更。只列標題與外連 — 不轉載全文、不捏造數字。",
    archiveIndexEmpty: "此快照尚無帶日期的週更標題。請先看首頁本週。",
    archiveLatestBadge: "最新",
    archiveAtomLink: "封存週 Atom 訂閱 ↗",
    archiveWeekInvalid: "此週鍵不是有效的 YYYY-MM-DD 凍結頁。",
    archiveWeekTitle: "{week} 當週｜SessionScan",
    archiveWeekDesc: "凍結的 GTA Online 週更 {week}：{title}。只列標題與外連。",
    archiveWeekHeading: "{week} 當週",
    archiveShortKicker: "當週 Short",
    archiveShortTag: "SESSIONSCAN · 有日期才嵌入",
    archiveShortEmpty: "此凍結週沒有 SessionScan Short — 空槽保留（不偽造連結）。",
    archiveBulletsKicker: "凍結重點",
    archiveBulletsClaimHint: "勾選與首頁共用本機儲存，依此 Rockstar 週（週四–週三）重置。",
    archiveLinksKicker: "外連標題",
    archiveLinksTag: "來源 · 只列標題",
    archiveLinksEmpty: "此凍結週在快照中沒有外連週更標題。",
    archiveShareHint: "字幕可用的週頁網址：",
    archivePagerAria: "相鄰封存週",
    archivePagerOlder: "← 較舊 · {week}",
    archivePagerNewer: "較新 · {week} →",
    archiveJumpLatest: "打開最新凍結週 · {week} →",
    breadcrumbsAria: "麵包屑導覽",
    archiveBackToIndex: "← 全部封存週",
    pageMoneyTitle: "賺錢指南｜SessionScan",
    pageMoneyDesc:
      "GTA Online 常駐賺錢路線，依有出處的 GTA$ 分紅排序，附來源連結與簡易 $/hr 計算機。只列標題與重點 — 不發明數字。",
    pageMoneyHeading: "賺錢指南",
    pageMoneyBody:
      "<p>常駐賺錢路線依<strong>有出處的 GTA$ 分紅</strong>排序（每個數字都連到來源與日期）。在計算機輸入你的耗時可得到粗估 $/hr。我們不發明數字。本週加成請看<a href=\"/zh/\">首頁</a>。</p>",
    moneyLastUpdated: "最後更新 {date}",
    moneyRankHeading: "依引用分紅排序",
    moneyRouteRate: "≈ {rate}/hr（以 {minutes} 分鐘粗估）",
    moneyRankNote:
      "排序用的是引用的 GTA$ 數字 — 不是保證時薪。每列粗估 $/hr 跟著上方「你的分鐘數」（與計算機同一套算法）。點一列可選進計算機。Rockstar 可能改動分紅；開刷前請先打開來源確認。",
    moneySourceMeta: "來源 · {source} · {date} ↗",
    moneyCalcHeading: "簡易 $/hr 計算機",
    moneyCalcNote: "選一條有出處的路線，輸入你整趟通常要幾分鐘，得到粗估 GTA$/hr。下方排名列表會用同一分鐘數更新。",
    moneyCalcRoute: "路線（引用分紅）",
    moneyCalcMinutes: "你的分鐘數",
    moneyCalcPresetsAria: "分鐘快選",
    moneyCalcPresetAria: "{minutes} 分鐘",
    moneyCalcEmpty: "輸入分鐘數以顯示粗估 GTA$/hr。",
    moneyCalcResult: "{rate}/hr（粗估）",
    moneyWeekLink: "首頁本週賺錢與工作 ↗",
    homeMoneyGuideLink: "賺錢指南 — 有出處分紅與 $/hr ↗",
    homeBusinessGuideLink: "生意排名 — 入手優先順序 ↗",
    businessWeekLink: "首頁本週賺錢與工作 ↗",
    pageBusinessesTitle: "生意排名｜SessionScan",
    pageBusinessesDesc:
      "哪些 GTA Online 生意值得買 — 附 Rockstar Newswire 出處與更新日期的排名。只列標題與重點，不編造 GTA$ 數字。",
    pageBusinessesHeading: "生意排名",
    pageBusinessesBody:
      "<p>依典型單人／肝帝帳戶的入手優先順序排列。重點說明各產業解鎖什麼 — 不是產值公式。每週折扣可能改變下手時機；花錢前請先看<a href=\"/zh/\">本週</a>與 Newswire。</p>",
    bizUpdatedHtml: "<strong>最後更新</strong> <time datetime=\"{date}\">{date}</time>",
    bizMethodologyLabel: "排名順序參考：",
    bizSourceDate: "來源日期 {date}",
    bizFilterAria: "依遊玩方式或持有清單篩選生意",
    bizFilterAll: "全部",
    bizFilterSolo: "單人友善",
    bizFilterOwned: "我擁有",
    bizFilterEmpty: "沒有符合此篩選的生意。",
    bizOwnLabel: "我擁有",
    bizOwnedCopy: "複製持有清單",
    bizOwnedCopyAria: "複製持有生意純文字",
    bizOwnedCopied: "已複製",
    bizOwnedCopyHeading: "我的生意",
    bizOwnedClear: "清除持有標記",
    bizOwnedClearAria: "清除全部持有生意標記",
    bizOfficialTrailerTitle: "Rockstar 官方預告：{title}",
    bizDisclaimer:
      "SessionScan 不編造購價或 $/hr。外連皆為 Rockstar Newswire 或具名二級排名來源。那些頁面上的數字屬對方 — 花錢前請自行核對。",
    bizAcidLabGuideLink: "迷幻藥實驗室攻略 ↗",
    pageAcidLabTitle: "迷幻藥實驗室攻略：多賣 50%（實測）｜SessionScan",
    pageAcidLabDesc:
      "快速答案：先改產品名稱，再到公開大廳販售。我們實測同一批 40 單位從 $62,360 變成 $93,510。",
    pageAcidLabHeading: "迷幻藥實驗室攻略：多賣 50%（實測）",
    acidLabLongSoon: "完整影片即將推出",
    acidLabLongTitle: "迷幻藥實驗室完整流程",
    acidLabShortWatch: "在 YouTube 看這支 Short ↗",
    pageGta6Title: "GTA 6｜SessionScan",
    pageGta6Desc: "僅官方 Grand Theft Auto VI 上市日倒數與 Rockstar 連結 — 不轉載洩漏、不以傳聞當事實。",
    pageGta6Heading: "GTA 6",
    pageGta6Body:
      "<p>僅官方資訊。SessionScan 連到 Rockstar 來源；不發布洩漏，也不把傳聞寫成真確。</p><p>已公告上市日（Rockstar）：<strong>2026 年 11 月 19 日</strong>。</p>",
    pageGta6Official: "Rockstar — Grand Theft Auto VI ↗",
    pageGta6Newswire: "Rockstar Newswire ↗",
    homeGta6Link: "GTA 6 官方上市日倒數 ↗",
    gta6HomeLink: "首頁本週賺錢與工作 ↗",
    pageGta6CountdownKicker: "官方上市日倒數",
    pageGta6CountdownTag: "COUNTDOWN · Rockstar 已公告日期",
    pageGta6CountdownLive: "上市日窗口已開（依 Rockstar 公告）",
    pageGta6SourceNote: "來源：Rockstar — 已公告 {date}",
    pageGta6TrailerKicker: "官方預告／預覽",
    pageGta6TrailerTag: "ROCKSTAR · YouTube",
    pageGta6TrailerTitle: "Grand Theft Auto VI: An Extended Look",
    pageGta6TrailerWatch: "在 YouTube 觀看 ↗",
    pageGta6TrailerVia: "出自 rockstargames.com/VI ↗",
    pageGta6EventName: "Grand Theft Auto VI — 已公告上市日",
    pageGta6EventDesc: "Rockstar 公告的 Grand Theft Auto VI 上市日。SessionScan 只引用官方公告。",
    pageAboutTitle: "關於｜SessionScan",
    pageAboutDesc: "SessionScan 是什麼：GTA 5／Online／GTA 6 情報站、範圍、免責與社群連結。",
    pageAboutHeading: "關於 SessionScan",
    pageAboutBody:
      "<p>SessionScan 是靜態 GTA 5／Online／GTA 6 情報站。我們整理本週訊號與標題外連，不轉載全文攻略。</p><p><strong>範圍：</strong>GTA 5、GTA Online（算 GTA 5）、GTA 6。不含 GTA 4。不含 Red Dead Online。</p><p>非官方粉絲站 · 無廣告 · 快照資料非即時爬蟲。與其他同名 App 無關。著作權與歸屬見站根目錄 NOTICE、LICENSE。</p>",
    tabJobs: "本週賺錢與工作",
    tabHot: "近 30 天熱門影片",
    tabNew: "當紅 Short",
    tabForum: "論壇",
    tabX: "X / Twitter",
    channelMiniAria: "頻道篩選",
    eyebrow: "夜掃描 // 濕瀝青",
    hudLine: "CH-07 · 夜掃描 · 黃昏",
    ledeHtml:
      "GTA Online 本週該做什麼 — 獎勵＋怎麼進、本週 Short、外連賺錢卡片。<br /><span>範圍：GTA 5 · GTA 6。線上模式算 GTA 5。不含 GTA 4。不含 RDO。</span>",
    weekCountdownKicker: "距離下次週更",
    weekCountdownTag: "倒數 · Rockstar 週四週期",
    weekCountdownLive: "新一週視窗已開始",
    weekShortKicker: "本週 Short",
    weekShortTag: "SESSIONSCAN · 嵌入",
    weekShortEmpty: "本週尚無 SessionScan Short — 槽位留空，不偽造連結。",
    weekSocialKicker: "追蹤 SessionScan",
    weekSocialTag: "YT · IG · X",
    weekSocialX: "追蹤 X",
    // Visible "追蹤 X" / "X" / "@SessionScanGTA" must appear in the accessible name.
    weekSocialXAria: "追蹤 X @SessionScanGTA",
    weekBulletsKicker: "本週 — 先做這些",
    weekBulletsTag: "一行 · 獎勵＋入口",
    weekBulletMultipliers: "2X／3X 與倍數獎勵",
    weekBulletFree: "免費／限時",
    weekBulletDiscounts: "折扣",
    weekBulletPodium: "展台與 Prize Ride",
    weekBulletSalvageCayo: "廢車場／佩里克",
    weekBulletPending: "本週快照標題尚無明確訊號",
    weekBulletHowSource: "打開來源 ↗",
    weekBulletHowWeekly: "打開本週官方更新 ↗",
    weekBulletHowNone: "等待下次掃描",
    weekBulletClaim: "標記完成：{label}",
    weekBulletsHint: "勾選只存在本機，並依 Rockstar 週（週四–週三）自動重置。",
    weekClaimProgress: "已完成 {done}／{total}",
    weekTipCopy: "複製 tip",
    weekTipCopied: "已複製",
    weekTipCopyAria: "複製本週 tip 純文字",
    weekClaimClear: "清除勾選",
    weekClaimClearAria: "清除本 Rockstar 週的全部完成勾選",
    weekArchiveLatestLink: "打開 {week} 當週封存 ↗",
    weekArchiveIndexLink: "瀏覽週更封存 ↗",
    weekJobsKicker: "本週賺錢與工作",
    weekJobsTag: "外連 · 只掛標題",
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
    snapshotSpan: "公開來源標題彙整，不是即時爬蟲。快照 {stamp}{age}。來源失敗時保留既有檔。",
    snapshotAgeNow: "剛剛",
    snapshotAgeMinutes: "{n} 分鐘前",
    snapshotAgeHours: "{n} 小時前",
    snapshotAgeDays: "{n} 天前",
    sampleStrong: "範例資料",
    sampleSpan: "第一版靜態殼。數字、時間、討論標題皆為樣本，不是即時爬蟲。",
    lastRunLive: "資料快照：{stamp}{age} · 非即時爬蟲",
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

export function localeHref(lang, { hash = "", search = "", path } = {}) {
  let base = lang === "zh" ? "/zh/" : "/";
  if (path != null && path !== "") {
    let p = String(path).replace(/\/index\.html$/, "") || "/";
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    if (p === "/zh" || p.startsWith("/zh/")) {
      const en = p === "/zh" ? "/" : `/${p.slice(4)}`;
      p = en === "/" ? "/" : en.startsWith("/") ? en : `/${en}`;
    }
    if (p === "/") base = lang === "zh" ? "/zh/" : "/";
    else {
      const clean = p.replace(/^\/+/, "").replace(/\/+$/, "");
      base = lang === "zh" ? `/zh/${clean}/` : `/${clean}/`;
    }
  }
  return `${base}${search || ""}${hash || ""}`;
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
  if (p === "/" || p === "") return "./";
  const parts = p.split("/").filter(Boolean);
  if (!parts.length) return "./";
  return "../".repeat(parts.length);
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
