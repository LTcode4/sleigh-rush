# 雪橇快遞 Sleigh Rush

平安夜駕著雪橇出發，一戶一戶送禮去。手機直式 3D 網頁小遊戲。

正式連結：https://sleigh-rush.web-interactive.org

## 玩法

- **點底部禮物按鈕**選禮物；**畫面往左 / 往右滑**把禮物丟給該側的住家。
- 住家門口的對話框顯示想要的禮物，**對話框出現就代表可以丟**，往哪邊滑就丟給那一側要這個禮物的住家（沒有就丟給最近的一間），不用抓時機。
- 禮物共 5 種形狀 × 紅、綠 2 色，每場抽 3 種放進禮物袋，而且一定有同形狀的紅綠兩色，要看清楚顏色。
- 丟錯或漏送都算失誤，左上角 5 個鈴鐺扣光就結束；窗戶亮著、掛滿燈泡的住家已經收過禮物，不用理它。後段偶爾左右兩側同時要禮物。
- 分數 = 答對禮物 × 100 + 雪道距離（公尺）；最佳紀錄存在 localStorage。
- 畫面顯示「魔法加速」的時速與公里：從 50 km/h 起約每 10 秒翻倍。結算時依達成的距離（小琉球環島 → 太陽）與速度（獵豹 → 派克太陽探測器）跳出點點粒子彩蛋。
- 選雪橇頁挑雪橇顏色（紅 / 綠）；第一次進遊戲會有新手教學。
- 完整數值見 `document/遊戲機制說明.md`。

## 技術

| 項目 | 使用 |
|---|---|
| 框架 | Vue 3 + Quasar 2（`@quasar/app-vite`，Vite 2）+ TypeScript |
| 3D | three.js，自訂抖色（dither）shader、vertex shader 世界彎曲 |
| 狀態 | Pinia |
| 樣式 | Tailwind CSS + SCSS |
| 音效 | Web Audio API 即時合成，沒有音檔 |
| 監控 / 埋點 | Sentry（`@sentry/vue`）、Google Tag Manager |
| 部署 | Cloudflare Workers 靜態資產（wrangler） |

## 開發

需要 Node.js 24（見 `.nvmrc`，先執行 `nvm use`）。

```bash
npm install
npm run dev              # 開發環境，http://localhost:9000
npm run dev:staging      # 用 staging 的環境變數
npm run dev:production   # 用 production 的環境變數
npm run lint
npm run format
```

開發環境下 `window.game` 會掛上遊戲實例，方便在 console 除錯；development、staging 環境網址加 `?debug=true` 會從 CDN 載入 vConsole（手機上看 console）。

### 環境變數

放在 `variables/` 資料夾（已被 `.gitignore` 排除，需另外取得），由 `variables/parser.js` 依 `ENVIRONMENT` 合併 `.env` 與 `.env.<環境>`：

| 變數 | 用途 |
|---|---|
| `QUASAR_ENVIRONMENT` | `development` / `staging` / `production`，送進 Sentry 的 environment |
| `QUASAR_GTM_ID` | Google Tag Manager 容器 ID，空值就不載入 |
| `QUASAR_SENTRY_DSN` | Sentry DSN，空值就不啟用 |

## 建置與部署

```bash
npm run build:staging       # 輸出到 dist/spa，--debug：不壓縮、保留 sourcemap
npm run build:production
make deploy-prd             # 詢問版本號 → build:production → wrangler deploy
```

- `Makefile` 與 `wrangler.jsonc` 已被 `.gitignore` 排除，需另外取得。
- 部署使用 `wrangler login` 的 OAuth 登入。
- Vue Router 是 history 模式，`wrangler.jsonc` 設定 `not_found_handling: "single-page-application"`，子路徑都回傳 `index.html`。

### 版本發布流程

1. 在 `develop` 開發、commit。
2. 更新 `package.json` 版本號，commit `chore: 版本號 x.y.z`。
3. `main` 以 `--no-ff` 合併 `develop`，commit 訊息 `release: vx.y.z`，打上 annotated tag `vx.y.z`。
4. 推送 `develop`、`main` 與 tag，再執行 `make deploy-prd`。

## 專案結構

```
src/
├── boot/          # 啟動時執行：axios、gtm、sentry、vconsole
├── game/          # 遊戲核心（純 TS + three.js，不依賴 Vue）
│   ├── SleighGame.ts  # 遊戲主迴圈、住家生成、丟擲判定、難度參數、計分
│   ├── world.ts       # 雪道、住家、雪橇、路燈等場景建模
│   ├── gifts.ts       # 禮物種類（形狀 × 顏色）與每場抽選
│   ├── milestones.ts  # 魔法時速／距離公式與里程碑點點圖案
│   ├── cube-gift.ts   # 3D 禮物盒與緞帶
│   ├── icons.ts       # 介面用禮物圖示（SVG）
│   ├── gift-art.ts    # 禮物像素圖
│   ├── dither.ts      # 抖色 shader
│   ├── sound.ts       # Web Audio 音樂與音效
│   └── quality.ts     # 依裝置效能自動調整畫質
├── pages/         # 首頁、選雪橇、遊戲、結果、404
├── components/    # 教學、禮物袋、速度表、跳窗、雪景、手勢提示等
├── utils/         # 預載、橫向偵測、頁面轉場
├── stores/        # Pinia：雪橇顏色、最佳紀錄、教學是否看過、上一場結果
├── layouts/       # MainLayout：預載資源
└── css/app.scss   # 全域樣式與共用動畫
```

## 開發備註

- **難度調整**：數值集中在 `src/game/SleighGame.ts` 開頭的常數（`MAX_MISTAKES`、`SPEED_MIN`、`SPEED_MAX`、`DIFF_DISTANCE`、`BUBBLE_SHOW`、`HOUSE_GAP`、`DECOR_CHANCE` 等）。完整說明在 `document/遊戲機制說明.md`（本機文件，未納入 git），調整數值時請一併更新。
- **只能直玩**：觸控裝置橫拿時顯示「請轉成直的玩」並暫停（`src/utils/orientation.ts`、`RotateHint.vue`）。
- **vConsole**：不打包進專案，只在需要時從 CDN 載入，維持打包容量 1MB 內。
- **埋點事件**：`level_start`、`level_end`、`post_score`（`src/utils/track.ts`，在 `GamePage.vue` 送出）。GTM 容器 `GTM-MH45H5SM` 把這三個事件轉送到 GA4（`G-9XNN8D4W1G`）。
