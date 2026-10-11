# fix_plan.md

優先序待辦（僅收錄 repo 內可核實的項目）。

（目前無開放項目。）

## 合併後跟進（非本 PR）

- Fast scrape：合併後用 `gh workflow run "fast scrape" --ref main -f source=manual` 驗一次，確認 `data` commit＋Pages `workflow_run` 會跟；再授權 Cloudflare Worker 每 2h `workflow_dispatch`（不在本 PR）。
- Phase B this-week home：合併後在 https://sessionscan.net `/` 與 `/zh/` 驗五格一行 bullets、Short embed（空槽不偽造）、YT／IG／X `@SessionScanGTA`、週更倒數、無 channel tab-grids；header overflow 實機再驗。Jeff live-verify 後再授權 Phase C（archive）。
- Instagram header 按鈕：合併後在 https://sessionscan.net `/` 與 `/zh/` 用手機寬度驗 header 不溢位、IG 開新分頁、JSON-LD `sameAs` 含 Instagram。
- 行動版 sticky header／site-nav：合併本 PR 後在 https://sessionscan.net 用 iPhone／iPad 實機或錄影再驗一次（部署站 verify）。

已完成：
- Fast scrape workflow（`fast scrape` / `fast.yml`）：`workflow_dispatch`＋`scraper.py --fast`（videos／shorts／tweets only）；`pages.yml` 監聽成功後部署；daily.yml 不變。
- `pages.yml`：`workflow_run`（daily／fast scrape → data）略過完整 CI；`push`／`workflow_dispatch` 與 PR（`ci.yml` `pull_request`）仍跑全套。
- 頁尾移除 franky5440／poe2 歸屬連結（`footerLegal`）；`/` 與 `/zh/` 同源 `index.html` + i18n，NOTICE／LICENSE 仍保留 Apache 歸屬。
- CH-01 home list 建置時靜態預渲染（`/` + `/zh/`），單一來源 `src/staticHomeJobs.js`，與 client 預設 GTABase／本週對齊；JS 篩選／搜尋仍可蓋上。
