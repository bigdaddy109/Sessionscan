# fix_plan.md

優先序待辦（僅收錄 repo 內可核實的項目）。

（目前無開放項目。）

## 合併後跟進（非本 PR）

- Phase A multi-page shell：合併後在 https://sessionscan.net 驗 `/` `/week/` `/guides/money/` `/guides/businesses/` `/gta6/` `/about/`（＋`/zh/…`）可開、primary `<a>` nav、`/#jobs`→`/` 與 `/#hot&v=yt-…`→`/v/…/` redirects；Jeff live-verify 後再授權 Phase B。
- Instagram header 按鈕：合併後在 https://sessionscan.net `/` 與 `/zh/` 用手機寬度驗 header 不溢位、IG 開新分頁、JSON-LD `sameAs` 含 Instagram。
- 行動版頻道標籤截斷＋sticky 捲動偏移：合併本 PR 後在 https://sessionscan.net 用 iPhone／iPad 實機或錄影再驗一次（部署站 verify）。

已完成：
- `pages.yml`：`workflow_run`（daily scrape → data）略過完整 CI；`push`／`workflow_dispatch` 與 PR（`ci.yml` `pull_request`）仍跑全套。
- 頁尾移除 franky5440／poe2 歸屬連結（`footerLegal`）；`/` 與 `/zh/` 同源 `index.html` + i18n，NOTICE／LICENSE 仍保留 Apache 歸屬。
- CH-01 home list 建置時靜態預渲染（`/` + `/zh/`），單一來源 `src/staticHomeJobs.js`，與 client 預設 GTABase／本週對齊；JS 篩選／搜尋仍可蓋上。
