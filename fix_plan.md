# fix_plan.md

優先序待辦（僅收錄 repo 內可核實的項目）。

- `/v/{id}/`（＋`/zh/v/`）主站 `.site-nav`（`primaryNavHtml`；等研發程式 「可以合」後再合）。測 `tests/test_video_pages.mjs`。Rollback：`pre-video-page-site-nav-20261013`。

合併政策（權威在 `AGENTS.md` Ralph 段）：開 PR → 等研發程式「可以合 #<n>」→ 再合 → sessionscan.net live-verify。CI 綠本身不夠；不等同 auto-merge。

## 合併後跟進（非本 PR）

- Faster fetch Worker：程式含 `GET /health`（#63）後仍需 CF 帳號持有人 `wrangler deploy`＋確認 cron／`GITHUB_PAT`（見 `docs/cf-fast-worker-handoff.md`；health 2026-10-13：~26h 無 cron）。可用 `gh workflow run "fast scrape" --ref main -f source=manual` 先驗 data＋Pages。
- Owned YouTube WebSub：Worker `/health`＋`POST /renew` 已通；`owned-refresh` 尚無 run。CF 帳號持有人確認 secrets 後上傳一支 owned Short 驗 push→deploy。
- Instagram header 按鈕：合併後在 https://sessionscan.net `/` 與 `/zh/` 用手機寬度驗 header 不溢位、IG 開新分頁、JSON-LD `sameAs` 含 Instagram。
- 行動版 sticky header／site-nav：合併後在 https://sessionscan.net 用 iPhone／iPad 實機或錄影再驗一次（部署站 verify）。

已完成：
- `/v/{id}/`（＋`/zh/v/`）相關頁／頁尾攻略列（`relatedPagesHtml`／`footerGuidesHtml`；#76；rollback `pre-video-page-guides-20261013`；核准：研發程式 「可以合 #76」）。測 `tests/test_video_pages.mjs`。
- `/zh/v/{id}/` 繁中分享頁（`renderVideoPage(..., lang:"zh")`＋sitemap hreflang；#75；rollback `pre-zh-video-pages-20261013`；核准：研發程式 「可以合 #75」）。測 `tests/test_video_pages.mjs`。
- `/v/{id}/` 可見麵包屑＋BreadcrumbList（`videoBreadcrumbItems`／`breadcrumbsNavHtml`；#74；rollback `pre-video-page-breadcrumbs-20261013`；核准：研發程式 「可以合 #74」）。測 `tests/test_video_pages.mjs`。
- 殼頁可見麵包屑（`shellBreadcrumbsHtml`；與 JSON-LD 同源 `shellBreadcrumbItems`；#73；rollback `pre-visible-breadcrumbs-20261013`；核准：研發程式 「可以合 #73」）。測 `tests/test_site_pages.mjs`、`tests/test_week_archive.mjs`。
- 殼頁／凍結頁 BreadcrumbList JSON-LD（`shellBreadcrumbItems`；#72；rollback `pre-shell-breadcrumbs-20261013`；核准：研發程式 「可以合 #72」）。測 `tests/test_breadcrumb_dist.mjs`。
- 較舊凍結頁「跳到最新週」（`archiveJumpLatestHtml`；#70＋zh → hotfix #71；rollback `pre-freeze-jump-latest-20261013`；核准：研發程式 「可以合 #70」）。測 `tests/test_week_archive.mjs`。
- `/week/feed.xml` Atom 訂閱（`renderArchiveAtomFeed`；#69；rollback `pre-week-archive-rss-20261013`；核准：研發程式 「可以合 #69」）。測 `tests/test_week_archive.mjs`。
- `/week/YYYY-MM-DD/` 凍結頁相鄰週 prev／next（`archiveWeekPagerHtml`；#68；rollback `pre-week-freeze-prev-next-20261013`；核准：研發程式 「可以合 #68」）。測 `tests/test_week_archive.mjs`。
- `/week/` 索引最新週「Latest／最新」標記（`archiveIndexBodyHtml`；#67；rollback `pre-archive-latest-callout-20261013`；核准：研發程式 「可以合 #67」）。測 `tests/test_week_archive.mjs`。
- Home 本週區連到最新 `/week/YYYY-MM-DD/` 封存（`latestArchiveLinkHtml`；#66；rollback `pre-home-latest-archive-20261013`；核准：研發程式 「可以合 #66」）。測 `tests/test_week_archive.mjs`。
- Home 本週 bullets「claimed」勾選（localStorage／Rockstar 週鍵；#64；rollback `pre-week-claimed-checklist-20261013`；核准：研發程式 「可以合 #64」）。測 `tests/test_this_week_home.mjs`。
- Fast Worker `GET /health`（`workers/dispatch-fast-scrape`；#63；rollback `pre-fast-worker-health-20261013`；核准：研發程式 「可以合 #63」）。合後仍需 CF redeploy。測 `tests/test_dispatch_fast_scrape_worker.mjs`。
- GTA 6 `/gta6/` 官方上市日倒數＋Event JSON-LD（`src/gta6Page.js`；#62；rollback `pre-gta6-official-countdown-20261013`；核准：研發程式 「可以合 #62」）。測 `tests/test_gta6_page.mjs`。
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
