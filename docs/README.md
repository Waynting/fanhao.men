# fanhao.men 技術文件

[fanhao.men](https://fanhao.men) 是一個管理番號收藏清單的 Next.js 15 網頁應用程式。它以「番號優先」為核心：使用者整理的是番號（例如 `SSIS-123`、`FC2-PPV-1234567`），而不是影片網址；網址由「來源範本」（含 `{code}` 佔位符）即時產生。所有資料預設存在瀏覽器的 `localStorage`，不登入也能完整使用；用 Google 帳號登入（選用，Supabase Auth）後，資料會同步到雲端並在多台裝置間保持一致。分享清單不需要伺服器：整份清單壓縮後放在網址的 hash 裡。網站可安裝成 PWA，部署在 Vercel，DNS 由 Cloudflare 代管（proxy 關閉）。

## 文件索引

| 文件 | 內容 |
| --- | --- |
| [architecture.md](./architecture.md) | 系統架構、資料層、同步引擎、認證、分享 codec、番號正規化、PWA、SEO、Analytics |
| [database.md](./database.md) | Supabase 資料表、函式、RLS policy、grant，以及 migration 套用與本機測試方式 |
| [deployment.md](./deployment.md) | Vercel、Cloudflare DNS、Supabase 與 Google OAuth 設定清單、疑難排解 |
| [development.md](./development.md) | 開發慣例與陷阱、新增 mutation／番號格式的步驟、手動測試清單、路線圖與技術債 |
| [user-journey.md](./user-journey.md) | 使用者旅程：從首次造訪、建立清單、分享到登入同步的流程 |

## 快速開始

需求：Node.js 18.18 以上（建議 20+，CI 用 22）與 npm。

```bash
npm install
cp .env.local.example .env.local   # 全部留空也能跑：純本機模式
npm run dev                        # http://localhost:3000（Turbopack）
```

`.env.local` 的變數全部是選用的：

| 變數 | 用途 | 留空時 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 專案網址 | 隱藏登入 UI，navbar 顯示「資料僅儲存在此裝置」 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key | 同上（兩個都要有才會啟用登入） |
| `NEXT_PUBLIC_SITE_URL` | 正式網址（metadata、robots、sitemap 用），正式環境設 `https://fanhao.men` | Vercel 上用正式網域，本機用 `http://localhost:3000` |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4 Measurement ID（`G-XXXXXXXXXX`） | 不載入 GA，`trackEvent` 變成 no-op |

要在本機測登入同步，請先依 [database.md](./database.md) 套用 migration，並依 [deployment.md](./deployment.md) 把 `http://localhost:3000/auth/callback` 加進 Supabase 的 Redirect URLs。

## 常用指令

| 指令 | 說明 |
| --- | --- |
| `npm run dev` | 開發伺服器（Turbopack）。不註冊 service worker |
| `npm run build` | 正式版 build，同時做型別檢查（ESLint 在 build 時被略過） |
| `npm run start` | 啟動正式版伺服器；測 PWA／離線請用 `build` + `start` |
| `npm run stats` | 重算熱門排行（需要 `DATABASE_URL`，見 [database.md](./database.md)）；`-- --dry-run` 只印不寫 |
| `npm run lint` | `next lint`，目前尚未設定 ESLint，會跳出互動式設定提示（見 [development.md](./development.md#已知技術債)） |
