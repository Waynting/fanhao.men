-- Trending codes for /explore. Only signed-in users are counted.
-- Raw signals: playlists in user_records (saves) and code_clicks (opened / copied links).
-- jobs/stats aggregates them into trending_codes, the only table the page reads.

-- Users who turned off "參與熱門統計". Excluded from every source.
create table public.stats_opt_outs (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.stats_opt_outs enable row level security;

create policy "Users read their own opt-out"
  on public.stats_opt_outs for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users opt out"
  on public.stats_opt_outs for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users opt back in"
  on public.stats_opt_outs for delete to authenticated
  using (user_id = (select auth.uid()));

-- One row per user, code and day: repeat clicks on the same day count once.
create table public.code_clicks (
  user_id uuid not null references auth.users (id) on delete cascade,
  code    text not null,
  day     date not null default current_date,
  primary key (user_id, code, day)
);

create index code_clicks_day on public.code_clicks (day);

-- No policies: written only through record_clicks(), read only by the stats script.
alter table public.code_clicks enable row level security;

create or replace function public.record_clicks(codes text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  today_count int;
begin
  if uid is null or exists (select 1 from public.stats_opt_outs where user_id = uid) then
    return;
  end if;

  -- Cap per user per day so one account can't flood the ranking
  select count(*) into today_count from public.code_clicks where user_id = uid and day = current_date;
  if today_count >= 300 then
    return;
  end if;

  insert into public.code_clicks (user_id, code)
  select uid, c
  from unnest(codes[1:50]) as c
  where c ~ '^[A-Z0-9][A-Z0-9-]{1,29}$'
  limit 300 - today_count
  on conflict do nothing;
end;
$$;

revoke execute on function public.record_clicks(text[]) from public, anon;
grant execute on function public.record_clicks(text[]) to authenticated;

-- Snapshot written by jobs/stats. `counts` holds distinct users per source ({"saves": 4, "clicks": 9}),
-- so adding a source doesn't need a schema change.
create table public.trending_codes (
  period      text not null check (period in ('7d', '30d')),
  code        text not null,
  rank        int not null,
  score       numeric not null,
  counts      jsonb not null,
  prev_rank   int,               -- rank in the window before this one; null = new entry
  computed_at timestamptz not null,
  primary key (period, code)
);

alter table public.trending_codes enable row level security;

create policy "Anyone reads trending codes"
  on public.trending_codes for select to anon, authenticated
  using (true);
