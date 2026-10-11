# AGENTS.md

SessionScan：GTA 5／GTA Online／GTA 6 靜態情報站（Vite + 每日 Python 掃描）。程式、測試、workflow 在 `main`；掃出來的 JSON 在 `data`。介面預設英文，繁體中文在 `/zh/`。不含 GTA 4、不含 RDO。

沒有 `specs/` 目錄。沒有 TypeScript，也沒有 typecheck／`tsc`／mypy／`npm test` 指令。

## 建置／測試／型別

本機前端：

```bash
npm install
npm run dev          # http://127.0.0.1:43173/ （strictPort）
npm run build        # vite build + inject_static_jobs + generate_video_pages + generate_zh_pages
npm run preview      # 同上 host／port，伺服 dist
```

`npm run build` 已在本機跑過會過。Pages CI（Node 22）在建置後還會檢查：

```bash
grep -E 'gtabase.com|GTA Online Weekly' dist/index.html
grep 'id="crawlJobs"' dist/index.html
```

單元測試（不依賴 checkout `data`；讀 `tests/fixtures/hub.json` 或 `public/data/sample.json`）：

```bash
# JS（自訂 runner，失敗 process.exit(1)；本機全過）
node tests/test_card_share.mjs
node tests/test_home_extras.mjs
node tests/test_i18n.mjs
node tests/test_shorts_baha.mjs
node tests/test_this_week.mjs
node tests/test_video_pages.mjs
node tests/test_header_overlap.mjs   # Playwright + system Chrome；需先 npm run build。量 header 子元素 bounding box，375–1280（含橫向高度）中英不可重疊
node tests/test_static_home.mjs      # CH-01 靜態預渲染 helper（固定 now=；不依賴牆鐘本週）
# 量首屏 job card（需 dist 內已有 data-static-job；可暫時用 data 分支 site.json 建置，勿 commit）：
# node scripts/measure_first_content.mjs

# Python（需 pip install -r requirements.txt；CI 用 3.12）
python3 tests/test_pipeline.py         # 見 fix_plan.md：目前 2 個失敗
python3 tests/test_search_aliases.py   # 會過；內含 npm run build，並再跑多個 node tests/test_*.mjs
```

掃描／彙整（會打網路；日常由 `.github/workflows/daily.yml` 寫入 `data`，不要手動把 scrape JSON 推進 `main`）：

```bash
python3 scraper.py
python3 build_site.py
```

型別檢查：無此指令。

## 已知坑

- **`main`／`data` 分開。** 不要手動在 `main` 塞 scrape JSON。每日掃描只 `git push` 到 `data`。`data` 分支本身沒有 workflow 檔，push 不會跑 `pages.yml`；部署靠 default branch 上的 `workflow_run`。
- **沒有 `npm test`。** 前端測 `node tests/test_*.mjs`；Python 測直接跑檔案。`test_pipeline.py` 會 import `scraper`（requests／bs4／ddgs）。
- **`test_pipeline.py` 部分案例吃牆鐘。** `keep_tweet`／`parse_ign_weekly_wiki` 用 `datetime.now()` + 28 天窗；fixture 寫死 2026-08，過期就紅（見 `fix_plan.md`）。測日期邏輯請注入 `now=`，不要靠「今天還在窗內」。
- **`/zh/`：** `npm run dev` 靠 Vite `configureServer` 改寫到 `index.html`；建置後的正式頁是 `scripts/generate_zh_pages.mjs` 寫的 `dist/zh/`。不要在 `preview` 再改寫 `/zh/`。
- **port 43173 + `strictPort`：** 被佔就失敗，不會換埠。不要用 `file://` 開站，JSON 載不進來。
- **換自訂網域** 要一併改根目錄與 `public/CNAME`、`src/cardShare.js` 的 `CARD_SITE_BASE`、`index.html` canonical／og:url、`public/robots.txt`、`public/sitemap.xml`。
- 來源抓空時 **不覆寫** 昨日 JSON（keep-yesterday）。SessionScan 自有 Short 槽位沒有影片時保持空槽，不偽造網址。
- 首頁 JSON-LD（WebSite + Organization）單一來源是 `src/structuredData.js`；`generate_zh_pages` 會 `replaceHomeJsonLd(..., "zh")`。站內搜尋是 hash `#q=`，沒有可用的 `?q=`，所以不加 SearchAction。分享頁 VideoObject 由 `renderVideoPage` 寫入；`tests/test_video_pages.mjs` 用 `JSON.parse` 斷言欄位。
- **CH-01 靜態預渲染：** `#jobList` 由 `src/staticHomeJobs.js` 單一來源寫入（Vite `transformIndexHtml` + `inject_static_jobs.mjs` + `generate_zh_pages` 再蓋 zh 分享標籤）。預設與 client 相同：只取 `jobs_gtabase` 本週（`THIS_WEEK_MAX`）。沒有本週卡時 `#jobList` 可為空；banner／noscript 仍可有 firstJob。量 first-card 時對 `site.json` 加延遲才能看出 JS fetch 路徑的差距。
- **橫向 iPhone header／整頁縮小：** Safari 在任一元素比 viewport 寬時會 shrink-to-fit（越滑越小）。元兇曾是 `.hero-palms` 依 SVG viewBox 算出比螢幕還寬、以及捲動後 `.channel-mini` 篩選列溢出。裝飾層必須 `width: 100%` + `.hero { contain: paint }`，sticky 列 `min-width: 0` / `overflow-x: auto` 包在 header 的 `overflow-x: clip` 裡。`html, body` 的 `overflow-x: clip` 只當安全網。viewport 維持 `width=device-width, initial-scale=1, viewport-fit=cover`，不要寫 `100vw`。`tests/test_header_overlap.mjs` 量 header 重疊，並在 375/430/874/932（直向＋橫向、含 compact header）斷言 `scrollWidth <= clientWidth`。

## Ralph 迴圈做法（我們的版本）
每次任務開始：
1. 先讀 AGENTS.md（建置／測試指令、已知坑）與 fix_plan.md（優先序待辦）；有 specs/ 也要讀。
2. 只做一件最重要的事（任務指定的，或 fix_plan.md 最上面那項）。不順手做別的。
告示牌（必守）：
- 改之前先搜尋程式碼，不要假設「還沒做」；避免重複實作。
- 不准寫空殼、佔位、TODO 假實作；要完整實作。
- 單一事實來源，不加轉接層／遷移殼。
- 寫測試時用註解說明「為什麼這個測試重要」。
完成門檻：
- 跑相關測試＋建置全過才 commit；無關測試壞了也要修或記入 fix_plan.md。
- 只開 PR，不直接推 main、不自己合併、不打 tag。
收尾：
- 更新 fix_plan.md：完成的移除，新發現的 bug 依優先序加入。
- 學到的建置／測試技巧簡短寫進 AGENTS.md；不要寫進度報告。
