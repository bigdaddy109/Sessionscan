# fix_plan.md

優先序待辦（僅收錄 repo 內可核實的項目）。

（目前無開放項目。）

## 合併後跟進（非本 PR）

- Faster fetch Worker：`fast.yml` 已在 main；合併 `workers/dispatch-fast-scrape/` 後 Jeff 在 Cloudflare 設 `GITHUB_PAT`（fine-grained、Actions write）並 `wrangler deploy`（cron 每 2h `workflow_dispatch`）。勿把 PAT 寫進 git。可用 `gh workflow run "fast scrape" --ref main -f source=manual` 先驗 data commit＋Pages `workflow_run`。觀測：2026-10-13 僅見 1 次手動 `fast scrape`，2h Worker cron 尚未上線。
- Owned YouTube WebSub：合併後 Jeff 部署 `workers/youtube-websub/`（`wrangler deploy` + `GITHUB_PAT`／`HUB_SECRET`／`CALLBACK_URL`），向 `pubsubhubbub.appspot.com` 訂閱 topic `feeds/videos.xml?channel_id=UCfpCdZdtCdCFNXuEW9xvZcQ`，再上傳一支 Short 驗 `owned-refresh` 有跑、`data` 有更新、Pages `workflow_run` 有部署。不依賴付費 X／Data API。預設仍 dispatch `owned-refresh.yml`（`--owned-only`）；若要改走完整 fast scrape 可設 Worker `WORKFLOW_FILE=fast.yml`。觀測：2026-10-13 `owned-refresh` 尚無 run。
- Instagram header 按鈕：合併後在 https://sessionscan.net `/` 與 `/zh/` 用手機寬度驗 header 不溢位、IG 開新分頁、JSON-LD `sameAs` 含 Instagram。
- 行動版 sticky header／site-nav：合併本 PR 後在 https://sessionscan.net 用 iPhone／iPad 實機或錄影再驗一次（部署站 verify）。

已完成：
- A11y Label in Name（daily 2026-10-13）：IG／X `aria-label` 含可見文案（`Follow on Instagram · IG`／`Follow on X @…`＋zh）；Short／video play 按鈕移出 rank、以 CSS 三角取代 `▶` 文字，消 Lighthouse `label-content-name-mismatch`。測 `tests/test_i18n.mjs`、`tests/test_video_pages.mjs`。
- Phase C cross-links：home＋Archive／Money／Businesses 互連（`relatedPagesHtml`／`footerGuidesHtml`）；sitemap 含 EN／zh；`WebSite.hasPart`＋頁級 `relatedLink`（無 SearchAction）；測 `tests/test_site_pages.mjs`。
- Phase C Money：`/guides/money/`（＋`/zh/`）有出處 GTA$ 分紅排序＋簡易 $/hr 計算機（`src/moneyGuide.js`）；stub 移除；測 `tests/test_money_guide.mjs`；live-verify 手機寬度 stub 已消失（`2b72932`／calc fix `2c81da1`）。
- Phase C Archive：`/week/` 索引＋`/week/YYYY-MM-DD/` 凍結頁（EN＋`/zh/`），`src/weekArchive.js` 單一來源；stub 文案移除；測 `tests/test_week_archive.mjs`。
- Phase C Money：`/guides/money/`（＋`/zh/`），`src/moneyGuide.js` 單一來源；有出處分紅排序＋$/hr 計算機；測 `tests/test_money_guide.mjs`。
- Phase C Business ranking：`/guides/businesses/`（＋`/zh/`），`src/businessRanking.js` 單一來源；Newswire 出處＋last-updated；無未附來源 GTA$；測 `tests/test_business_ranking.mjs`。
- Phase B this-week home：五格一行 bullets、Short embed、YT／IG／X、週更倒數（`src/thisWeekHome.js`）。
- Fast scrape workflow（`fast scrape` / `fast.yml`）：`workflow_dispatch`＋`scraper.py --fast`（videos／shorts／tweets only）；`pages.yml` 監聽成功後部署；daily.yml 不變。
- `pages.yml`：`workflow_run`（daily／fast scrape → data）略過完整 CI；`push`／`workflow_dispatch` 與 PR（`ci.yml` `pull_request`）仍跑全套。
- `pages.yml` `deploy`：`if: always() && needs.build.result == 'success'`，避免 #45 skip-CI 後 build 成功卻 deploy skipped（live 不更新）。
- 頁尾移除 franky5440／poe2 歸屬連結（`footerLegal`）；`/` 與 `/zh/` 同源 `index.html` + i18n，NOTICE／LICENSE 仍保留 Apache 歸屬。
- CH-01 home list 建置時靜態預渲染（`/` + `/zh/`），單一來源 `src/staticHomeJobs.js`，與 client 預設 GTABase／本週對齊；JS 篩選／搜尋仍可蓋上。
- Owned-channel WebSub 程式＋`owned-refresh` workflow（部署／訂閱仍屬合併後跟進）。
