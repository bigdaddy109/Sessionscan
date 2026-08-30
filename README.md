# SessionScan

GTA 5／GTA Online／GTA 6 靜態情報站。繁體中文為主。不含 GTA 4。不含 RDO。

線上版：https://bigdaddy109.github.io/Sessionscan/

換自訂網域時，一併改 `index.html` 的 canonical／og:url、`public/robots.txt` 的 Sitemap、以及 `public/sitemap.xml` 的 `<loc>`。

## 每日掃描

Frank 同款資料管線（不是 PoE 皮膚）：

1. GitHub Actions 每天三次 **台北 08:00／15:00／21:00**（UTC `0 0,7,13 * * *`，含週末）跑 `scraper.py`
2. 各來源寫入 `data/*.json`，再由 `build_site.py` 彙整成 `public/data/site.json`
3. `npm run build` 後部署 GitHub Pages
4. 成功的 JSON 會 commit 回 repo，方便隔天對照

也可手動刷新：

```bash
gh workflow run daily.yml --ref main
```

本機：

```bash
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt
python scraper.py
python build_site.py
npm install
npm run dev
```

本機預覽：http://127.0.0.1:43173/

## 來源失敗：保留昨日檔

任一來源抓不到或解析為空時：

- 記錄錯誤到 `logs/scraper.log`
- **不覆寫**該來源的 JSON
- 昨天的卡片繼續上線

空檔不會取代舊檔。全來源都失敗時，前端繼續使用 `public/data/sample.json` 範例橫幅。

掃描完成後橫幅仍標「資料快照 / SNAPSHOT」，並註明不是即時爬蟲——時間是公開來源彙整當下，不是 live crawl。

## 來源

| 區塊 | 作法 |
|------|------|
| 本週賺錢與工作 | GTABase／IGN／GTA Wiki 公開列表：**只外連標題、連結、日期**，不轉載攻略全文 |
| 熱門攻略影片（CH-02） | yt-dlp（不需 API key），分 中文／English／日本語；縮圖直連 `i.ytimg.com`，不存檔 |
| 當紅 Short（CH-03） | 第一格：`@sessionscan/shorts` 最新自有 Short（oEmbed 確認作者）。其餘：YouTube 當紅 GTA Shorts。失敗保留昨日檔。**不偽造** SessionScan 影片網址 |
| 巴哈姆特 | HTML 解析 `bsn=4737` |
| Reddit | `r/gtaonline`、`r/GTA6` RSS 外連卡 |
| X / Twitter | ddgs `site:x.com` + syndication（免 key），Rockstar／GTA 6 相關 |

範圍：GTA 5、GTA Online、GTA 6。標題或網址碰到 GTA 4、RDO／Red Dead、或舊世代會丟棄。

## 授權

Apache License 2.0。資料管線改寫自 [franky5440-afk/poe2](https://github.com/franky5440-afk/poe2)；視覺與文案為 SessionScan 的修改。見 [NOTICE](./NOTICE) 與 [LICENSE](./LICENSE)。
