# 資料庫（Supabase Postgres）

> 相關文件：[README](./README.md) · [架構](./architecture.md) · [部署](./deployment.md) · [開發指南](./development.md)

資料庫只在使用者登入時使用；app 本身以 `localStorage` 為主（見 [architecture.md](./architecture.md#資料層liblocal-storets)）。瀏覽器用 publishable key 直接連 Supabase，**所有權限都靠 RLS 與 `security definer` 函式**，沒有中間的 API server。

## Migration 一覽

| 檔案 | 內容 | 狀態 |
| --- | --- | --- |
| `supabase/migrations/0001_user_records.sql` | `user_records`、`push_records()` | 已上線 |
| `supabase/migrations/0002_profiles.sql` | `profiles` | 新增中（登入／onboarding 工作的一部分） |
| `supabase/migrations/0003_trending.sql` | `stats_opt_outs`、`code_clicks`、`record_clicks()`、`trending_codes` | 開發中，尚未 commit（`/explore`、`lib/trending.ts`） |
| `supabase/migrations/0004_public_playlists.sql` | `get_public_playlist()` | 開發中，尚未 commit（`/p/[owner]/[id]`、`lib/public-playlist.ts`） |

## 角色與權限的基本觀念

| 角色 | 說明 |
| --- | --- |
| `anon` | 未登入的請求（只帶 publishable key） |
| `authenticated` | 帶有效 JWT 的登入使用者；`auth.uid()` 回傳其 `auth.users.id` |
| `postgres`／service role | 繞過 RLS，只在 SQL editor 或 `jobs/stats` 這類後台腳本使用，絕不放到前端 |

Supabase 預設會把 `public` schema 的資料表權限授予 `anon`、`authenticated`，所以**真正的存取控制是 RLS**：資料表啟用 RLS 後，沒有對應 policy 的操作一律被拒絕。Policy 中寫 `(select auth.uid())` 而非 `auth.uid()`，讓 Postgres 每個查詢只算一次（官方建議的效能寫法）。

---

## `public.user_records`（0001）

每位登入使用者的清單與自訂來源，一筆紀錄一列。同步機制見 [architecture.md](./architecture.md#同步引擎libsyncts)。

| 欄位 | 型別 | 約束／預設 | 說明 |
| --- | --- | --- | --- |
| `user_id` | `uuid` | not null，default `auth.uid()`，FK → `auth.users(id)` **on delete cascade** | 擁有者 |
| `id` | `text` | not null | 本機的 nanoid（清單或範本 id） |
| `kind` | `text` | not null，check in (`'playlist'`, `'template'`) | 紀錄類型 |
| `data` | `jsonb` | check：`data is null or octet_length(data::text) < 1000000` | 整份清單／範本；tombstone 時為 `null` |
| `deleted` | `boolean` | not null，default `false` | tombstone 旗標 |
| `updated_at` | `timestamptz` | not null | **客戶端**編輯時間，用於衝突解決 |
| `synced_at` | `timestamptz` | not null，default `now()` | **伺服器**寫入時間，用作 pull 的 cursor |

- Primary key：`(user_id, id)`，同一個 id 在不同使用者之間互不影響。
- Index：`user_records_user_synced (user_id, synced_at)`，對應 pull 查詢 `where user_id = ? and synced_at > ? order by synced_at`。
- `data` 小於 1 MB：避免單一列過大（一般清單遠小於此）。

### RLS

| 操作 | Policy | 條件 |
| --- | --- | --- |
| select | `Users read their own records`（to `authenticated`） | `user_id = (select auth.uid())` |
| insert／update／delete | **無** | 直接寫入一律被拒絕 |

為什麼不開放直接寫入：如果允許 `upsert`，一台很久沒同步的裝置就能用舊資料蓋掉新資料。寫入只能走 `push_records()`，由它強制「較新才寫」。

### `public.push_records(records jsonb) returns void`

```sql
language sql security definer set search_path = ''
```

- 輸入：`[{ id, kind, data, deleted, updated_at }, ...]`（客戶端每批最多 200 筆）。
- `user_id` 一律取 `auth.uid()`，客戶端無法替別人寫入；`auth.uid()` 為 null（未登入）時不寫任何資料。
- `deleted = true` 時強制 `data = null`。
- `on conflict (user_id, id) do update ... where excluded.updated_at > t.updated_at`：**只有比既有紀錄新的寫入才生效**，舊的寫入被靜默忽略（不報錯）。每次成功寫入都把 `synced_at` 設為 `now()`。
- `security definer`：以函式擁有者身分執行以繞過「沒有 insert/update policy」的限制；`set search_path = ''` 並以完整名稱 `public.user_records` 引用，防止 search_path 劫持。

| Grant | 對象 |
| --- | --- |
| `revoke execute` | `public`、`anon` |
| `grant execute` | `authenticated` |

---

## `public.profiles`（0002_profiles）

使用者的公開身分資料（顯示名稱等），首次登入後由 onboarding 對話框建立。**沒有這一列 = 使用者還沒完成 onboarding。**

| 欄位 | 型別 | 約束／預設 | 說明 |
| --- | --- | --- | --- |
| `id` | `uuid` | primary key，default `auth.uid()`，FK → `auth.users(id)` **on delete cascade** | 等於使用者 id，一人一列 |
| `display_name` | `text` | not null，check：`trim` 後長度 1–20 字元 | 顯示名稱 |
| `show_email` | `boolean` | not null，default `false` | 是否願意公開 email（給未來社群功能用） |
| `created_at` | `timestamptz` | not null，default `now()` | |
| `updated_at` | `timestamptz` | not null，default `now()` | |

節錄自 migration：

```sql
create table public.profiles (
  id           uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 20),
  show_email   boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.profiles enable row level security;
```

### RLS

| 操作 | Policy | 條件 |
| --- | --- | --- |
| select | `Users read their own profile`（to `authenticated`） | `using (id = (select auth.uid()))` |
| insert | `Users create their own profile`（to `authenticated`） | `with check (id = (select auth.uid()))` |
| update | `Users update their own profile`（to `authenticated`） | `using` 與 `with check` 皆為 `id = (select auth.uid())` |
| delete | **無 policy** | 不能從前端刪除；使用者在 Supabase 刪除 `auth.users` 時，透過 `on delete cascade` 一併刪除 |

設計考量：

- `id` 預設 `auth.uid()`：前端 insert 時不必傳 id，也無法替別人建立 profile。
- `display_name` 的長度檢查在 DB 端，前端驗證只是 UX；繞過前端也無法寫入空白或過長名稱。
- `show_email` 預設 `false`（隱私優先）。email 本身不存在 profiles，而是在 `auth.users`。
- `updated_at` 只有預設值，migration 沒有 trigger；更新時需由前端一併設定 `updated_at`，否則它會停在建立時間。
- **尚未建立公開讀取的 view。** 目前每個人只能讀自己的 profile。未來社群功能需要另外建立一個 view（只露出 `display_name`，並依 `show_email` 決定是否附上 email），不要直接放寬 `profiles` 的 select policy。

---

## 熱門統計（0003_trending，尚未 commit）

給 `/explore` 熱門番號頁使用（前端在 `lib/trending.ts`）。只統計登入使用者。

### `public.stats_opt_outs`

| 欄位 | 型別 | 約束 |
| --- | --- | --- |
| `user_id` | `uuid` | PK，default `auth.uid()`，FK → `auth.users` on delete cascade |
| `created_at` | `timestamptz` | not null，default `now()` |

有一列 = 使用者關閉「參與熱門統計」。RLS：自己可 select、insert（opt out）、delete（opt back in）。

### `public.code_clicks`

| 欄位 | 型別 | 約束 |
| --- | --- | --- |
| `user_id` | `uuid` | not null，FK → `auth.users` on delete cascade |
| `code` | `text` | not null |
| `day` | `date` | not null，default `current_date` |

- PK `(user_id, code, day)`：同一人同一天點同一個番號只算一次。Index `code_clicks_day (day)`。
- 啟用 RLS 但**沒有任何 policy**：前端無法直接讀寫，只能透過 `record_clicks()` 寫入，由統計腳本以資料庫密碼讀取。

### `public.record_clicks(codes text[]) returns void`

`plpgsql`、`security definer`、`search_path = ''`；只 grant 給 `authenticated`（revoke `public`、`anon`）。

- 未登入或已 opt out → 直接 return。
- 每人每天最多 300 筆；每次呼叫最多取前 50 個番號。
- 番號需符合 `^[A-Z0-9][A-Z0-9-]{1,29}$`（即正規化後的格式）。
- `on conflict do nothing`。

### `public.trending_codes`

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `period` | `text` | check in (`'7d'`, `'30d'`) |
| `code` | `text` | |
| `rank` | `int` | |
| `score` | `numeric` | 各來源 `users × weight` 加總 |
| `counts` | `jsonb` | 各來源的不重複使用者數，例如 `{"saves": 4, "clicks": 9}` |
| `prev_rank` | `int` | 上一個區間的名次；`null` = 新上榜 |
| `computed_at` | `timestamptz` | |

PK `(period, code)`。RLS：`anon`、`authenticated` 都可 select（公開資料）。只由統計腳本寫入。

統計腳本在 `jobs/stats/run.mjs`（`npm run stats`，`npm run stats -- --dry-run` 只印出），由 `.github/workflows` 每小時第 17 分執行（也可手動 `workflow_dispatch`），需要 repository secret `DATABASE_URL`，未設定時 job 會略過。腳本用 `DATABASE_URL`（Session pooler 連線字串，含資料庫密碼）直接連線，從 `user_records`（saves，權重 3，排除示範清單）與 `code_clicks`（clicks，權重 1）計算，排除 opt out 的使用者，且某番號至少要有 `STATS_MIN_USERS`（預設 3）位使用者才上榜，避免反推個人。

---

## 公開清單（0004_public_playlists，尚未 commit）

清單的 `data` 裡 `isPublic: true` 時，任何人（含 `anon`）都能透過 `/p/<owner>/<id>` 讀取。沒有新增資料表：公開與否就是清單本身的欄位，跟著一般同步走（較新的整份清單勝出），所以關閉公開或刪除清單後，同步完成網址就失效。

### `public.get_public_playlist(owner uuid, playlist_id text)`

- 回傳 `(data jsonb, updated_at timestamptz, display_name text)`，條件：`kind = 'playlist'`、未刪除、`data->>'isPublic' = 'true'`。不符合就回傳 0 列，呼叫端無法分辨「不存在」與「不公開」。
- `security definer` 繞過 `user_records` 的「只能讀自己」RLS，但只回傳指定的那一筆；無法列舉其他人的清單。
- `display_name` 來自 `profiles`（暱稱本來就是公開身分）；不回傳 email。
- URL 帶 owner 是因為 `user_records` 的主鍵是 `(user_id, id)`，清單 id 只在同一使用者內唯一。
- 授權給 `anon`、`authenticated`。

## 套用 migration

正式環境（目前做法，repo 沒有 Supabase CLI 設定檔）：

1. 開啟 Supabase Dashboard → **SQL Editor**。
2. 依檔名順序，把 `supabase/migrations/` 裡**尚未套用**的檔案內容逐一貼上並執行。
3. 到 **Table Editor** 確認資料表出現且顯示 RLS enabled；到 **Database → Functions** 確認函式存在。

注意：

- Migration 不是 idempotent（`create table` 沒有 `if not exists`），同一個檔案不要執行兩次。
- 沒有 migration 紀錄表，請自行記錄哪些檔案已套用到哪個環境。
- 新增 migration 時檔名用下一個編號，不要修改已套用的檔案。

## 用 Postgres container 本機測試

一般 Postgres 沒有 Supabase 的 `auth` schema 與角色，需要先建立最小替身。

```bash
docker run --rm -d --name fanhao-pg -e POSTGRES_PASSWORD=postgres -p 54322:5432 postgres:15
docker exec -i fanhao-pg psql -U postgres <<'SQL'
-- Supabase 替身：角色、auth.users、auth.uid()
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth, public to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
SQL

# 依序套用 migration
for f in supabase/migrations/*.sql; do docker exec -i fanhao-pg psql -U postgres -v ON_ERROR_STOP=1 < "$f"; done

# 模擬 Supabase 的預設 grant（RLS 才是實際限制）
docker exec -i fanhao-pg psql -U postgres -c \
  "grant select, insert, update, delete on all tables in schema public to anon, authenticated;"
```

測試 RLS 與「較新才寫」（`docker exec -it fanhao-pg psql -U postgres` 後逐段執行；以 session 層級切換身分，預期失敗的語句不會中斷後續測試）：

```sql
insert into auth.users values ('11111111-1111-1111-1111-111111111111'), ('22222222-2222-2222-2222-222222222222');

-- 以使用者 1 的身分
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.push_records('[{"id":"p1","kind":"playlist","data":{"items":[]},"deleted":false,"updated_at":"2026-01-02T00:00:00Z"}]');
-- 較舊的寫入應被忽略
select public.push_records('[{"id":"p1","kind":"playlist","data":{"items":["x"]},"deleted":false,"updated_at":"2026-01-01T00:00:00Z"}]');
select id, data, updated_at from public.user_records;                          -- 應為 items: []
insert into public.user_records (id, kind, updated_at) values ('p2', 'playlist', now()); -- 應失敗（無 insert policy）
insert into public.profiles (display_name) values ('  ');                     -- 應違反 check
insert into public.profiles (display_name) values ('Wayn');                   -- 成功，id = 使用者 1
delete from public.profiles;                                                   -- 0 列（無 delete policy）

-- 切換成使用者 2
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select count(*) from public.user_records;  -- 應為 0（看不到別人的資料）
select count(*) from public.profiles;      -- 應為 0
reset role;
```

測完 `docker stop fanhao-pg`（`--rm` 會自動刪除 container）。

替代方案：安裝 Supabase CLI 後 `supabase start` 可得到含真正 `auth` schema 的完整本機環境，但 repo 目前沒有 `supabase/config.toml`，需要先 `supabase init`。
