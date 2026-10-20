# 部署

> 相關文件：[README](./README.md) · [架構](./architecture.md) · [資料庫](./database.md) · [開發指南](./development.md)

| 元件 | 服務 |
| --- | --- |
| Next.js app | Vercel（push 到 `main` 自動部署） |
| 網域 `fanhao.men` | Cloudflare DNS，**proxy 關閉**（灰色雲） |
| 登入與雲端同步 | Supabase（Auth + Postgres） |
| Google 登入 | Google Cloud OAuth client（只設定在 Supabase） |
| 熱門排行統計 | GitHub Actions（`.github/workflows`，開發中） |

## Vercel

### 部署方式

- GitHub repo 連結 Vercel 專案；**push 到 `main` 即部署 production**，其他分支／PR 產生 preview deployment。
- Build 指令是預設的 `next build`（同時做型別檢查；ESLint 在 build 時被 `ignoreDuringBuilds` 略過）。
- `next.config.ts` 釘住 `outputFileTracingRoot` 與 `turbopack.root`，避免 build 機器上多餘的 lockfile 讓 Next 判斷錯專案根目錄。

### 環境變數

在 Vercel → Project → Settings → Environment Variables 設定：

| 變數 | 範例 | 必要性 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` | 要登入／同步就必填 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys 的 publishable key | 要登入／同步就必填 |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | `G-XXXXXXXXXX` | 選填；未設定就不載入 GA |
| `NEXT_PUBLIC_SITE_URL` | `https://fanhao.men` | 選填；未設定時用 Vercel 的正式網域（`NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL`） |

> **`NEXT_PUBLIC_*` 會在 build 時直接寫進 JS bundle。** 修改後必須 **Redeploy**（Deployments → 最新一筆 → Redeploy）才會生效；只改設定不重新 build，線上版本不會變。

- 這些值都是公開的（會出現在瀏覽器端），不要放任何 secret。安全性靠 Supabase 的 RLS，不靠隱藏 key。
- Supabase 的 service role key、資料庫密碼、Google client secret **都不能**放到 Vercel。
- Preview deployment 的網址不在 Supabase Redirect URLs 名單中，preview 上登入會被導回 Site URL；需要時可在 Supabase 加入 `https://*-<team>.vercel.app/**` 之類的萬用字元網址。

## Cloudflare DNS

`fanhao.men` 的 DNS 在 Cloudflare，記錄指向 Vercel（依 Vercel → Domains 頁面提示的 A／CNAME 值），**Proxy status 設為 DNS only（灰色雲）**。

為什麼不開 proxy（橘色雲）：

| 問題 | 說明 |
| --- | --- |
| 雙層 CDN | Vercel 本身就是 CDN。再疊一層 Cloudflare 只會多一次轉送，快取規則也要維護兩套 |
| 憑證簽發 | Vercel 用 HTTP challenge 自動簽 Let's Encrypt 憑證；Cloudflare proxy 會攔截請求，導致簽發或續約失敗，還可能出現 SSL 模式（Flexible／Full）造成的重新導向迴圈 |
| 快取衝突 | `/sw.js` 必須 `no-cache` 才能讓 service worker 及時更新；Cloudflare 若快取了舊的 `sw.js` 或 HTML，使用者會卡在舊版本。頁面採 network-first，也依賴拿到真正最新的回應 |

## Supabase 設定清單

### 1. 專案與資料庫

- [ ] 建立 Supabase 專案，記下 `<project-ref>`。
- [ ] 依檔名順序在 **SQL Editor** 執行 `supabase/migrations/*.sql`（詳見 [database.md](./database.md#套用-migration)）。
- [ ] Table Editor 確認每張表都是 RLS enabled。
- [ ] Project Settings → API Keys 取得 URL 與 **publishable key**，設定到 Vercel 與本機 `.env.local`。

### 2. Google OAuth client（Google Cloud Console）

- [ ] APIs & Services → OAuth consent screen：設定 app 名稱、支援信箱、授權網域 `fanhao.men`、`supabase.co`。
- [ ] Credentials → Create credentials → OAuth client ID → **Web application**。
- [ ] Authorized redirect URIs **只放一個**：`https://<project-ref>.supabase.co/auth/v1/callback`
  - 不要放 `https://fanhao.men/auth/callback`：Google 是先回到 Supabase，再由 Supabase 導回網站。
- [ ] 記下 Client ID 與 Client secret。

### 3. Supabase Auth

- [ ] **Authentication → Sign In / Providers → Google**：啟用，貼上 Client ID 與 Client secret。
  - 注意是 **Sign In / Providers**，不是「Third-Party Auth」（那是給 Firebase、Auth0 等外部身分系統用的，設在那裡會出現 provider not enabled）。
- [ ] 同一頁 **停用 Email provider**：登入只支援 Google，避免有人用 Supabase API 直接註冊 email 帳號。
- [ ] **Authentication → URL Configuration**：
  - Site URL：`https://fanhao.men`
  - Redirect URLs：
    - `https://fanhao.men/auth/callback`
    - `http://localhost:3000/auth/callback`
  - App 送出的 `redirectTo` 固定是 `<origin>/auth/callback`，不帶 query（登入前的頁面存在 `sessionStorage`），所以上面兩個網址完全比對即可，不需要萬用字元。

### 4. Secret 放哪裡

| Secret | 唯一存放位置 |
| --- | --- |
| Google client secret | Supabase → Google provider 設定 |
| Supabase 資料庫密碼／`DATABASE_URL` | 本機 `.env.local`（執行 `npm run stats`）、GitHub repository secret `DATABASE_URL` |
| Supabase service role key | 不使用 |

不要把任何 secret commit 到 repo，也不要放進 Vercel 的 `NEXT_PUBLIC_*` 變數。`.env.local` 已在 `.gitignore` 中。

## GitHub Actions（熱門排行，開發中）

`.github/workflows` 中的 Trending stats workflow 每小時第 17 分執行 `npm run stats`，重算 `trending_codes`。到 GitHub repo → Settings → Secrets and variables → Actions 新增 `DATABASE_URL`（Supabase → Connect → **Session pooler** 連線字串）。未設定時 workflow 會跳過所有步驟，不會失敗。

## 部署後檢查

- [ ] `https://fanhao.men` 正常，憑證有效。
- [ ] Navbar 右上角顯示「登入」按鈕（沒有設定 Supabase 時這裡會是空的）。
- [ ] Google 登入後回到原頁面，首次登入出現 onboarding 對話框。
- [ ] 在另一台裝置登入，清單同步過來。
- [ ] `https://fanhao.men/robots.txt`、`/sitemap.xml` 的網址是 `https://fanhao.men`。
- [ ] Chrome DevTools → Application → Service Workers 看到 `/sw.js` 已啟用。

## 疑難排解

| 症狀 | 原因 | 解法 |
| --- | --- | --- |
| Navbar 右上角是空的，沒有登入按鈕 | Build 時沒有 `NEXT_PUBLIC_SUPABASE_URL` 或 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`（`authEnabled === false`） | 在 Vercel 設定兩個變數（注意套用的環境是否包含 Production），然後 **Redeploy** |
| 登入時出現 `Unsupported provider: provider is not enabled` | Supabase 沒有啟用 Google provider，或設到 Third-Party Auth | Authentication → Sign In / Providers → Google 啟用並填入 Client ID／secret |
| Google 顯示 `Error 400: redirect_uri_mismatch` | Google OAuth client 的 Authorized redirect URI 不是 Supabase callback | 設為 `https://<project-ref>.supabase.co/auth/v1/callback`（注意 project ref、https、沒有結尾斜線） |
| 登入後被導到 `https://fanhao.men` 首頁而非原頁面，或本機登入跳到正式站 | `redirectTo` 不在 Supabase Redirect URLs 名單，Supabase 退回 Site URL | 把對應的 `/auth/callback` 網址加進 Redirect URLs |
| 頁面顯示「登入連結已失效，請重新登入」 | PKCE code 已用過、過期，或 code verifier 不在這個瀏覽器（例如在別的瀏覽器開啟回呼網址） | 在同一個瀏覽器重新登入 |
| 本機 `npm run start` 之後改用 `npm run dev`，畫面停在舊版或 chunk 載入錯誤 | `next start` 時註冊的 service worker 仍在 localhost 上服務舊快取 | DevTools → Application → Service Workers → Unregister，並 Clear site data；必要時 `rm -rf .next` 後重新啟動 |
| 正式站部署後使用者仍看到舊版 | Service worker 尚未更新，或 `sw.js` 被中間層快取 | 確認 `/sw.js` 回應標頭是 `no-cache`、Cloudflare proxy 是關閉的；修改 `sw.js` 時記得調高 `CACHE_VERSION` |
| 同步顯示「同步失敗」，訊息含 `Failed to fetch` 或連線逾時 | Supabase 免費方案在一段時間沒有活動後會**暫停專案** | 到 Supabase Dashboard 按 Restore／Resume project；長期可升級方案或定期有流量 |
| 同步失敗，訊息為 `permission denied` 或 function 不存在 | Migration 沒有套用完整 | 在 SQL Editor 依序補跑缺少的 migration |
| `/explore` 沒有資料 | `trending_codes` 尚未計算，或未達 `STATS_MIN_USERS` 門檻 | 確認 GitHub secret `DATABASE_URL`，手動執行 workflow 或 `npm run stats -- --dry-run` 檢查 |
| 憑證錯誤或無限重新導向 | Cloudflare proxy 被打開 | 把 DNS 記錄改回 DNS only（灰色雲） |
