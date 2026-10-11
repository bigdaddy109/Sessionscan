# fix_plan.md

優先序待辦（僅收錄 repo 內可核實的項目）。

1. **P0** `python3 tests/test_pipeline.py` → `ScopeTests.test_tweet_lang_and_cleanliness` 失敗。`keep_tweet(fresh)`（`date: 2026-08-28`，未傳 `now=`）被 `tweet_date_ok` 的牆鐘 + `TWEET_MAX_AGE_DAYS = 28` 拒絕（2026-10-10 重跑確認）。
2. **P0** 同檔 `ParserTests.test_ign_weekly_wiki_headings_become_outbound_cards` 失敗。`parse_ign_weekly_wiki` 用 `datetime.now()` 丟掉 age > 28 的 h2；fixture「August 27, 2026」過期後只剩 fallback 標題 `GTA Online Weekly Updates`，斷言要求 title 同時含 `August 27` 與 `Weekly`。

已完成（本輪）：
- CH-01 home list 建置時靜態預渲染（`/` + `/zh/`），單一來源 `src/staticHomeJobs.js`，與 client 預設 GTABase／本週對齊；JS 篩選／搜尋仍可蓋上。
