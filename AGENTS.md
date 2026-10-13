# AGENTS.md

SessionScan：GTA 5／GTA Online／GTA 6 靜態情報站（Vite + 每日 Python 掃描）。程式、測試、workflow 在 `main`；掃出來的 JSON 在 `data`。介面預設英文，繁體中文在 `/zh/`。不含 GTA 4、不含 RDO。

沒有 `specs/` 目錄。沒有 TypeScript，也沒有 typecheck／`tsc`／mypy／`npm test` 指令。

## 建置／測試／型別

本機前端：

```bash
npm install
npm run dev          # http://127.0.0.1:43173/ （strictPort）
npm run build        # vite build + inject_static_jobs + generate_video_pages + generate_zh_pages + generate_site_pages
npm run preview      # 同上 host／port，伺服 dist
```

`npm run build` 已在本機跑過會過。PR／Pages 閘道（`.github/workflows/ci.yml`，Node 22 + Python 3.12）會 `pip install -r requirements.txt`、建置、跑全部 `node tests/test_*.mjs` 與 `python3 tests/test_pipeline.py`／`test_search_aliases.py`（含 Playwright `channel: "chrome"`，workflow 會裝 Google Chrome）。Pages CI 在建置後還會檢查：

```bash
grep -E 'gtabase.com|GTA Online Weekly' dist/index.html
grep 'id="crawlJobs"' dist/index.html
```

`pages.yml`：`push`／`workflow_dispatch` 時 `build`／`deploy` `needs: ci`（reusable `workflow_call`）；suite 紅就不會上傳 Pages artifact。`workflow_run`（daily／fast scrape → data）略過完整 CI，只建置＋部署（仍保留 dist grep 檢查）。`build` 與 `deploy` 都要用 `if: always() && …`（`deploy` 看 `needs.build.result == 'success'`），否則 skipped `ci` 會連帶跳過 `deploy`，artifact 建了卻不上線。PR 上同一套由 `ci.yml` 的 `pull_request` 觸發，閘道不弱化。

單元測試（不依賴 checkout `data`；讀 `tests/fixtures/hub.json` 或 `public/data/sample.json`）：

```bash
# JS（自訂 runner，失敗 process.exit(1)；本機全過）
node tests/test_card_share.mjs
node tests/test_home_extras.mjs
node tests/test_i18n.mjs
node tests/test_shorts_baha.mjs
node tests/test_this_week.mjs
node tests/test_video_pages.mjs
node tests/test_cf_analytics.mjs     # 需先 npm run build；斷言 dist 內每個 .html 都有 CF Web Analytics beacon（src/cfWebAnalytics.js）
node tests/test_header_overlap.mjs   # Playwright + system Chrome；需先 npm run build。量 header 子元素 bounding box，375–1280（含橫向高度）中英不可重疊
node tests/test_mobile_tabs.mjs      # Playwright + system Chrome；需先 npm run build。手機 375/390/430 與 iPad 768/820/1024（直向＋橫向）斷言頻道標籤完整可及、點擊後 heading＋tag row 不被 sticky header 蓋住
node tests/test_static_home.mjs      # CH-01 靜態預渲染 helper（固定 now=；不依賴牆鐘本週）
node tests/test_site_pages.mjs       # Phase A 多頁殼：path nav、hash→path、sitemap／JSON-LD（建置後會再驗 dist）
node tests/test_seo_meta.mjs         # 全站 title／meta／OG／Twitter／hreflang／canonical（home＋殼頁＋freeze；建置後再驗 dist）
node tests/test_youtube_websub.mjs   # Owned WebSub：topic／challenge／Atom parse／dispatch URL（無網路）
# 量首屏 job card（需 dist 內已有 data-static-job；可暫時用 data 分支 site.json 建置，勿 commit）：
# node scripts/measure_first_content.mjs

# Python（需 pip install -r requirements.txt；CI 用 3.12）

python3 tests/test_pipeline.py
python3 tests/test_search_aliases.py   # 會過；內含 npm run build，並再跑多個 node tests/test_*.mjs
```

掃描／彙整（會打網路；日常由 `.github/workflows/daily.yml` 寫入 `data`，不要手動把 scrape JSON 推進 `main`）：

```bash
python3 scraper.py               # full: jobs + videos + shorts + forum + tweets
python3 scraper.py --fast        # fast.yml: videos + shorts + tweets only
python3 scraper.py --owned-only  # owned-refresh.yml / WebSub: @sessionscan slot only
python3 build_site.py
```

`fast scrape`（`.github/workflows/fast.yml`）與 `owned refresh`（`.github/workflows/owned-refresh.yml`）僅 `workflow_dispatch`；與 daily 共用 concurrency `daily-scrape`。`pages.yml` 的 `workflow_run` 同時聽 `daily scrape`、`fast scrape`、`owned refresh`（都略過完整 CI，只建置＋部署）。

型別檢查：無此指令。

## 已知坑

- **`main`／`data` 分開。** 不要手動在 `main` 塞 scrape JSON。每日掃描只 `git push` 到 `data`。`data` 分支本身沒有 workflow 檔，push 不會跑 `pages.yml`；部署靠 default branch 上的 `workflow_run`。
- **沒有 `npm test`。** 前端測 `node tests/test_*.mjs`；Python 測直接跑檔案。`test_pipeline.py` 會 import `scraper`（requests／bs4／ddgs）。
- **`test_pipeline.py` 日期窗要注入 `now=`。** `keep_tweet`／`tweet_date_ok`／`parse_ign_weekly_wiki` 預設 `datetime.now()` + 28 天；fixture 寫死 2026-08 時必須傳 `now=date(...)`，不要靠「今天還在窗內」。
- **`/zh/`：** `npm run dev` 靠 Vite `configureServer` 改寫到 `index.html`；建置後的正式頁是 `scripts/generate_zh_pages.mjs` 寫的 `dist/zh/`。不要在 `preview` 再改寫 `/zh/`。
- **port 43173 + `strictPort`：** 被佔就失敗，不會換埠。不要用 `file://` 開站，JSON 載不進來。
- **換自訂網域** 要一併改根目錄與 `public/CNAME`、`src/cardShare.js` 的 `CARD_SITE_BASE`、`index.html` canonical／og:url、`public/robots.txt`、`public/sitemap.xml`。
- 來源抓空時 **不覆寫** 昨日 JSON（keep-yesterday）。SessionScan 自有 Short 槽位沒有影片時保持空槽，不偽造網址。
- 首頁 JSON-LD（WebSite + Organization）單一來源是 `src/structuredData.js`；`generate_zh_pages` 會 `replaceHomeJsonLd(..., "zh")`。站內搜尋是 hash `#q=`，沒有可用的 `?q=`，所以不加 SearchAction。分享頁 VideoObject 由 `renderVideoPage` 寫入；`tests/test_video_pages.mjs` 用 `JSON.parse` 斷言欄位。
- **Cloudflare Web Analytics：** beacon 單一來源是 `src/cfWebAnalytics.js`（token + `type="module"` snippet）。Vite `transformIndexHtml` 寫進 `dist/index.html`（`/zh/` 由此複製）；`renderVideoPage` 必須自行嵌入，否則 `/v/{id}/` 沒有計數。`tests/test_cf_analytics.mjs` 會掃整個 `dist/**/*.html`。
- **CH-01 靜態預渲染：** `#jobList` 由 `src/staticHomeJobs.js` 單一來源寫入（Vite `transformIndexHtml` + `inject_static_jobs.mjs` + `generate_zh_pages` 再蓋 zh 分享標籤）。預設與 client 相同：只取 `jobs_gtabase` 本週（`THIS_WEEK_MAX`）。沒有本週卡時 `#jobList` 可為空；banner／noscript 仍可有 firstJob。量 first-card 時對 `site.json` 加延遲才能看出 JS fetch 路徑的差距。
- **Phase A 多頁殼：** 靜態頁（`/week/`、`/guides/money/`、`/guides/businesses/`、`/gta6/`、`/about/` ＋ `/zh/…`）單一來源 `src/sitePages.js`，建置後 `scripts/generate_site_pages.mjs` 寫入 `dist`；Vite `configureServer` 在 `npm run dev` 直接 render 同殼。Primary nav 是 `.site-nav` 真 `<a>`；home 仍保留 channel `.tabs` 至 Phase B。Legacy hash→path 腳本掛在 `/` 與 `/zh/`（`legacyHashRedirectScript`／`injectHomeShell`）。Sitemap 靜態 URL 由 `staticSitemapUrls()` 併入 `sitemapUrls`。新殼頁測 `node tests/test_site_pages.mjs`。
- **Phase C Archive：** `/week/` 索引＋`/week/YYYY-MM-DD/` 凍結頁（EN＋`/zh/`）單一來源 `src/weekArchive.js`（`listArchiveWeeks` 從 hub 週更標題取 Thursday key；`generate_site_pages.mjs` 寫入 dist；sitemap 經 `archiveSitemapUrls`）。只列標題／一行重點／外連；無日期的 owned Short 只掛快照當週，不偽造。測 `node tests/test_week_archive.mjs`（可在 build 後再跑驗 dist）。
- **Phase C Money：** `/guides/money/`（＋`/zh/`）單一來源 `src/moneyGuide.js`（有出處的 GTA$ 分紅排序＋簡易分鐘→$/hr 計算機；每個數字要有 source URL＋date，不發明數字）。`renderSitePage` 對 money 寫入 inline calculator script 與 `ItemList` JSON-LD。測 `node tests/test_money_guide.mjs`（可在 build 後再跑驗 dist）。
- **Phase C Business ranking：** `/guides/businesses/` 內容單一來源 `src/businessRanking.js`（排名＋Newswire 出處＋`BUSINESS_LIST_UPDATED`）；`sitePages` 對 `businesses` 關閉 stub、嵌入 ItemList JSON-LD。不寫未附來源的 GTA$ 數字。測 `node tests/test_business_ranking.mjs`（建置後再驗 `dist/**/guides/businesses/`）。
- **Phase C cross-links：** Archive／Money／Businesses 互連＋home 發現列單一來源 `relatedPagesHtml`／`footerGuidesHtml`（`src/sitePages.js`）；`injectHomeShell` 寫進 `/`＋`/zh/`；`homeJsonLd` 用 `WebSite.hasPart`，頁級 `relatedLink`（不加 SearchAction）。測 `node tests/test_site_pages.mjs`。
- **SEO meta：** Home `metaTitle`／`metaDesc` 與殼頁 `page*Title`／`page*Desc`／`archiveWeek*` 在 `src/i18n.js`；OG 圖共用 `OG_IMAGE_URL`（`public/og.jpg`）、`twitter:site`＝`TWITTER_SITE`（`@SessionScanGTA`）。`homeJsonLd` 的 WebSite.`name` 用 `siteName`（品牌），頁面 `<title>` 用 `metaTitle`。測 `node tests/test_seo_meta.mjs`。
- **Fast scrape Cloudflare Worker：** `workers/dispatch-fast-scrape/` 以 cron `0 */2 * * *`（每 2 小時）對 `.github/workflows/fast.yml` 發 `workflow_dispatch`。不進 Vite build；測 `node tests/test_dispatch_fast_scrape_worker.mjs`。`GITHUB_PAT` 只放 CF secret。合併順序：先 `fast.yml`，再 Worker，再 `wrangler deploy`。
- **橫向 iPhone header／整頁縮小：** Safari 在任一元素比 viewport 寬時會 shrink-to-fit（越滑越小）。元兇曾是 `.hero-palms` 依 SVG viewBox 算出比螢幕還寬、以及捲動後 `.channel-mini` 篩選列溢出。裝飾層必須 `width: 100%` + `.hero { contain: paint }`，sticky 列 `min-width: 0` / `overflow-x: auto` 包在 header 的 `overflow-x: clip` 裡。`html, body` 的 `overflow-x: clip` 只當安全網。viewport 維持 `width=device-width, initial-scale=1, viewport-fit=cover`，不要寫 `100vw`。`tests/test_header_overlap.mjs` 量 header 重疊，並在 375/430/874/932（直向＋橫向、含 compact header）斷言 `scrollWidth <= clientWidth`。
- **Owned WebSub：** `@sessionscan` channel id `UCfpCdZdtCdCFNXuEW9xvZcQ`；topic 用 `feeds/videos.xml?channel_id=…`（免費 Atom，無 Data API）。Callback 在 `workers/youtube-websub/`；推送後 dispatch `owned-refresh.yml`（`scraper.py --owned-only`）。與 `daily.yml`／`fast.yml` 共用 concurrency group `daily-scrape`；`pages.yml` `workflow_run` 聽 `owned refresh`（CI-skip）。Hub lease 約數日，Worker cron 只負責續訂，不是 2h scrape cron。測：`node tests/test_youtube_websub.mjs`。
- **Fonts / Lighthouse mobile：** Oswald 自架在 `public/fonts/*.woff2`（`src/style.css` `@font-face` + `fontLinks.js` preload，`font-display: optional`）。EN 頁不要掛 Google Fonts／Noto；`/zh/` 才非阻塞載入 Noto TC（`generate_zh_pages` 注入）。首屏 official／sample／countdown 要留 `min-height`，手機不要把 banner 排到 `#hero` 上面，否則 snapshot 文字一換 CLS 會爆。測：`node tests/test_font_links.mjs`。

## Ralph 迴圈做法（我們的版本）
每次任務開始：
1. 先讀 AGENTS.md（建置／測試指令、已知坑）與 fix_plan.md（優先序待辦）；有 specs/ 也要讀。
2. 只做一件最重要的事（任務指定的，或 fix_plan.md 最上面那項）。不順手做別的。
3. 開新功能迭代前：確認目前工作已 commit；在 `main` tip 打並 push 回滾 tag `pre-<feature>-YYYYMMDD`（feature 用短 kebab slug），再開 branch 動手。
告示牌（必守）：
- 改之前先搜尋程式碼，不要假設「還沒做」；避免重複實作。
- 不准寫空殼、佔位、TODO 假實作；要完整實作。
- 單一事實來源，不加轉接層／遷移殼。
- 寫測試時用註解說明「為什麼這個測試重要」。
- 只開 PR，不直接推 `main`。回滾用 `pre-*` tag 可以打；不要亂打 release／其他 tag。
- **不要付費 X API**（維持現有免金鑰抓法；勿引入付費 X／Data API 依賴）。
完成門檻／合併政策：
- 跑相關測試＋建置全過才 commit；無關測試壞了也要修或記入 fix_plan.md。
- CI 全綠、變更已 commit、preview／本機驗證截圖備好 → 回報 PR 連結後**等待**；等的期間**不要合併**。CI 綠本身不夠。
- Agent 可以自己合 PR，**僅限** 研發程式明確說「可以合 #<n>」（或同等清楚點名該 PR 的核准）。沒有這句就等。
- 等 review 期間可平行開另一 branch 做下一項。
- 核准合併後：在 https://sessionscan.net 做 live-verify，再繼續下一個。
收尾：
- 更新 fix_plan.md：完成的移除，新發現的 bug 依優先序加入。
- 學到的建置／測試技巧簡短寫進 AGENTS.md；不要寫進度報告。
