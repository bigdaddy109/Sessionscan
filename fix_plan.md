# fix_plan.md

優先序待辦（僅收錄 repo 內可核實的項目）。

（目前無開放項目。）

## 合併後跟進（非本 PR）

- Faster fetch Worker：`fast.yml` 已在 main；合併 `workers/dispatch-fast-scrape/` 後 Jeff 在 Cloudflare 設 `GITHUB_PAT`（fine-grained、Actions write）並 `wrangler deploy`（cron 每 2h `workflow_dispatch`）。勿把 PAT 寫進 git。可用 `gh workflow run "fast scrape" --ref main -f source=manual` 先驗 data commit＋Pages `workflow_run`。
- Owned YouTube WebSub：合併後 Jeff 部署 `workers/youtube-websub/`（`wrangler deploy` + `GITHUB_PAT`／`HUB_SECRET`／`CALLBACK_URL`），向 `pubsubhubbub.appspot.com` 訂閱 topic `feeds/videos.xml?channel_id=UCfpCdZdtCdCFNXuEW9xvZcQ`，再上傳一支 Short 驗 `owned-refresh` 有跑、`data` 有更新、Pages `workflow_run` 有部署。不依賴付費 X／Data API。預設仍 dispatch `owned-refresh.yml`（`--owned-only`）；若要改走完整 fast scrape 可設 Worker `WORKFLOW_FILE=fast.yml`。
- Phase C Money／Businesses：Archive 合併＋live-verify 後再開；勿與 Archive 同 PR。
- Instagram header 按鈕：合併後在 https://sessionscan.net `/` 與 `/zh/` 用手機寬度驗 header 不溢位、IG 開新分頁、JSON-LD `sameAs` 含 Instagram。
- 行動版 sticky header／site-nav：合併本 PR 後在 https://sessionscan.net 用 iPhone／iPad 實機或錄影再驗一次（部署站 verify）。

已完成：
- Phase C Archive：`/week/` 索引＋`/week/YYYY-MM-DD/` 凍結頁（EN＋`/zh/`），`src/weekArchive.js` 單一來源；stub 文案移除；測 `tests/test_week_archive.mjs`。
- Phase B this-week home：五格一行 bullets、Short embed、YT／IG／X、週更倒數（`src/thisWeekHome.js`）。
- Fast scrape workflow（`fast scrape` / `fast.yml`）：`workflow_dispatch`＋`scraper.py --fast`（videos／shorts／tweets only）；`pages.yml` 監聽成功後部署；daily.yml 不變。
- `pages.yml`：`workflow_run`（daily／fast scrape → data）略過完整 CI；`push`／`workflow_dispatch` 與 PR（`ci.yml` `pull_request`）仍跑全套。
- `pages.yml` `deploy`：`if: always() && needs.build.result == 'success'`，避免 #45 skip-CI 後 build 成功卻 deploy skipped（live 不更新）。
- 頁尾移除 franky5440／poe2 歸屬連結（`footerLegal`）；`/` 與 `/zh/` 同源 `index.html` + i18n，NOTICE／LICENSE 仍保留 Apache 歸屬。
- CH-01 home list 建置時靜態預渲染（`/` + `/zh/`），單一來源 `src/staticHomeJobs.js`，與 client 預設 GTABase／本週對齊；JS 篩選／搜尋仍可蓋上。
- Owned-channel WebSub 程式＋`owned-refresh` workflow（部署／訂閱仍屬合併後跟進）。
