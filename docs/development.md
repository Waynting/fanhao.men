# 開發指南

> 相關文件：[README](./README.md) · [架構](./architecture.md) · [資料庫](./database.md) · [部署](./deployment.md) · [使用者旅程](./user-journey.md)

## 慣例與陷阱

| # | 規則 | 原因／位置 |
| --- | --- | --- |
| 1 | 讀資料的頁面必須 `"use client"`，並處理 `useStore() === null`（顯示 `<PageLoading />`） | SSR 時沒有 `localStorage`，`useStore()` 的 server snapshot 是 `null` |
| 2 | 只透過 `lib/local-store.ts` export 的函式修改資料，不要直接寫 `localStorage` | Mutation 會 `save()` 並通知訂閱者，UI 自動更新，不需要 `router.refresh()` |
| 3 | 每個 mutation 都要 `save(next, touched)`，刪除要寫 tombstone | 否則變更不會同步（見下方「新增會同步的 mutation」） |
| 4 | 修改清單內容一律經過 `updatePlaylistIn()` | 它會更新 `updatedAt`，同步靠這個時間戳決定誰贏 |
| 5 | Store 結構改變時，換 key／version 並在 `normalize()` 遷移 | 目前 `av-collector:v2`，會讀取並遷移 v1 |
| 6 | 刪除要提供「復原」 | 用 toast action 呼叫 `restorePlaylist` / `restoreItems`（snapshot 還原） |
| 7 | 清單頁的選取狀態只放在 `PlaylistPageClient`（`Set` of ids）往下傳 | 不要在 table 裡再存一份 |
| 8 | Clipboard API 要 `try/catch` 並提供手動複製的備案 | 非 localhost 的 `http://`（例如手機連區網 demo）沒有 Clipboard API。範例：`playlist-header.tsx` 的分享對話框 |
| 9 | Sticky toolbar 用 `top-16` | Navbar 是 `h-16` 且 sticky |
| 10 | 來自 URL 的資料（分享連結）要重新驗證 | `/share` 對每個番號重跑 `isValidVideoCode` |
| 11 | 不要在 `onAuthStateChange` callback 裡 await Supabase API | 用 `setTimeout` 排程（見 `sync-provider.tsx`、`lib/profile.ts`） |
| 12 | Service worker 只在 production 註冊；修改 `public/sw.js` 要調高 `CACHE_VERSION` | 測離線用 `npm run build && npm run start` |
| 13 | 沒有 server actions、沒有 ORM、沒有自己的 API route 處理使用者資料 | 雲端存取一律走 supabase-js + RLS／RPC |
| 14 | UI 文字用繁體中文（台灣用語），錯誤訊息直接丟中文 `Error` 讓 toast 顯示 | 例如 `throw new Error("請輸入清單名稱")` |
| 15 | 登入相關 UI 都要先檢查 `authEnabled` 與 `useSession().ready` | 沒有 Supabase 環境變數時要能完整運作 |

## 新增一個會同步的 store mutation

以「重新命名項目」為例：

```ts
// lib/local-store.ts
export function renameItem(playlistId: string, itemId: string, videoCode: string) {
  save(
    updatePlaylistIn(load(), playlistId, (p) => ({          // 1. 經過 updatePlaylistIn → 自動更新 updatedAt
      ...p,
      items: p.items.map((i) => (i.id === itemId ? { ...i, videoCode } : i)),
    })),
    [playlistId]                                             // 2. touched：同步的單位是整份清單
  )
}
```

檢查清單：

- [ ] 用 `load()` 取得目前資料，回傳新物件（immutable），不要原地修改。
- [ ] `save(next, touched)` 的 `touched` 包含所有被改到的**紀錄** id（清單或範本 id，不是項目 id）。
- [ ] 若是刪除整筆紀錄：從陣列移除，並寫 `deleted[id] = { kind, at: now() }`，`touched` 也要包含它。
- [ ] 若是「復原」：移除 tombstone，並把 `updatedAt` 設為 `now()`，才會比雲端的刪除紀錄新。
- [ ] 範本的修改要設定 `updatedAt: now()`（範本不經過 `updatePlaylistIn`）。
- [ ] 若新增了紀錄的種類（`RecordKind`），DB 的 `kind` check constraint、`localRecord()`、`applyRemote()` 都要一起改。
- [ ] 需要追蹤時，在 `lib/analytics.ts` 新增事件並更新 [architecture.md](./architecture.md#analyticslibanalyticsts) 的表格。
- [ ] 用兩個瀏覽器 profile 實測同步（見下方測試清單）。

## 新增一種番號格式

1. `lib/code-normalizer.ts`：**同時**修改 `normalizeVideoCode()` 與 `isValidVideoCode()`，兩者規則要一致。注意規則順序：FC2 判斷在「字母 + 數字」之前。
2. 若支援從網址擷取：修改 `lib/url-parser.ts` 的 `parseFromUrl()`（新增網域分支或調整 generic 規則）。
3. 更新 `components/unified-add-videos-dialog.tsx` 的 placeholder 範例文字。
4. 若會影響熱門排行：DB 的 `record_clicks()` 與 `jobs/stats/sources/*.mjs` 只接受 `^[A-Z0-9][A-Z0-9-]{1,29}$`，新格式的正規化結果必須符合，否則要一併調整。
5. 記得原始輸入存在 `videoCode`、正規化結果存在 `normalizedCode`，去重以後者為準。
6. 手動測：大小寫、有無 `-`、前後空白、網址輸入、批次加入重複。

## 手動測試清單

目前沒有自動化測試，發布前請逐項檢查。

### 番號與清單

- [ ] 正規化：`ssis123` → `SSIS-123`、` waaa-412 ` → `WAAA-412`、`fc2ppv1234567` → `FC2-PPV-1234567`、`1234567` → `FC2-PPV-1234567`、`ABC.123` 被當成番號而不是網址。
- [ ] 網址解析：missav、javdb（`/v/`）、javlibrary（`?v=`）、FC2 文章頁、其他網站最後一段路徑。
- [ ] 批次加入時含重複番號（同批內重複、與清單既有項目重複），回報的新增數量正確。
- [ ] 刪除項目與刪除清單後按「復原」能還原。
- [ ] 產生連結、複製番號；在 `http://<區網 IP>:3000` 用手機測複製失敗時的備案。

### 分享

- [ ] 產生分享連結，在**全新的瀏覽器 profile**（無任何資料、未登入）開啟，內容與註記正確。
- [ ] 把分享清單加入自己的清單（新清單、既有清單）。
- [ ] 竄改 hash（截斷、亂碼）顯示「分享連結無效」。

### 備份

- [ ] 設定頁匯出 JSON，清除資料後以「取代」匯入，內容一致。
- [ ] 以「合併」匯入：id 衝突的清單取得新 id，相同網址的自訂來源不重複。
- [ ] 已登入時匯入，資料會同步到另一台裝置。

### 同步（兩個瀏覽器 profile，A 與 B，同一個 Google 帳號）

- [ ] A 未登入時建立資料，登入後資料上傳；B 登入後看得到。
- [ ] A 編輯清單（改名、加項目、改註記），B 切回分頁（focus）後更新。
- [ ] A 刪除清單，B 消失；A 按復原，B 又出現。
- [ ] 刪除自訂來源同步到 B。
- [ ] A 登出（保留資料）再登入，不產生重複清單。
- [ ] A 登出並移除資料，裝置變空；再登入資料從雲端回來。
- [ ] 離線時編輯，恢復網路（`online` 事件）後自動推送。
- [ ] 設定頁「清除所有資料」：已登入時雲端與 B 一併清空；未登入時只清本機。

### 登入與 onboarding

- [ ] Google 登入後回到原本的頁面（`?next=`）。
- [ ] 第一次登入出現 onboarding 對話框，暱稱預填 Google 名字；空白或超過 20 字被拒絕。
- [ ] 完成後重新整理不再出現；在 B 登入也不出現（profile 在雲端）。
- [ ] 關閉 onboarding 不填，本次瀏覽不再跳出，重新整理後再次出現。
- [ ] 沒有設定 Supabase 環境變數時，app 完整可用且沒有任何登入 UI。

### PWA

- [ ] `npm run build && npm run start`，安裝 PWA，離線時開啟已造訪過的頁面可用；未快取的頁面顯示離線頁。

## 路線圖（規劃中，尚未實作）

| 項目 | 說明 |
| --- | --- |
| 社群／論壇 | 使用者可公開清單、留言討論 |
| `/code/[code]` 頁面 | 每個番號一個可被索引的頁面（收藏數、相關清單），也有助 SEO |
| 公開 profiles view | 建立只露出 `display_name`、並依 `show_email` 決定是否附 email 的 view；不要放寬 `profiles` 本身的 RLS |
| 內容審核 | 檢舉、隱藏、封鎖機制，暱稱與公開內容的過濾 |
| Rate limit | 對社群寫入（發文、留言、檢舉）做每人頻率限制；目前只有 `record_clicks()` 有每日上限 |

## 已知技術債

| 項目 | 現況 | 建議 |
| --- | --- | --- |
| ESLint 未設定 | 沒有 ESLint 設定檔，`npm run lint`（`next lint`）會跳出互動式設定提示；`next.config.ts` 設 `eslint.ignoreDuringBuilds: true` | 新增 `eslint.config.mjs`（`eslint-config-next`），並讓 CI 執行 |
| 沒有自動化測試 | 全靠上面的手動清單 | 先替純函式加單元測試：`code-normalizer`、`url-parser`、`share-codec`、`applyRemote` 的合併邏輯 |
| 家目錄多一個 `package-lock.json` | `~/package-lock.json` 讓 Next 誤判 workspace root | 已用 `next.config.ts` 的 `turbopack.root` 與 `outputFileTracingRoot` 釘住；也可直接刪掉那個檔案 |
| 整份清單 LWW | 兩台裝置同時修改同一份清單，較舊的那份變更會遺失 | 未來可改成項目層級合併 |
| Tombstone 不會清除 | 本機 `deleted` 與雲端刪除列會持續累積 | 加入過期清理（需確認所有裝置都已同步） |
| Migration 沒有紀錄表 | 靠人工記錄哪些已套用 | 導入 Supabase CLI（`supabase init` + `supabase db push`） |
| 部分 clipboard 呼叫沒有 catch | `share-page-content.tsx` 的 `navigator.clipboard.writeText` 沒有 `try/catch`，違反慣例 #8 | 補上錯誤處理與手動複製備案 |
| Analytics 參數 | `create_template` 的 `template_id` 實際傳的是範本名稱 | 改傳 id，或把參數改名為 `template_name` |
| 備份檔名 | 仍是 `av-collector-backup-YYYY-MM-DD.json`（舊品牌名） | 視需要改成 `fanhao-men-backup-*` |
