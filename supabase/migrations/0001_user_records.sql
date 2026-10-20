-- Cloud copy of each signed-in user's playlists and templates.
-- One row per record; the client merges by updated_at (newer wins).

create table public.user_records (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id         text not null,
  kind       text not null check (kind in ('playlist', 'template')),
  data       jsonb check (data is null or octet_length(data::text) < 1000000),
  deleted    boolean not null default false,
  updated_at timestamptz not null,          -- client edit time, used for conflict resolution
  synced_at  timestamptz not null default now(),  -- server write time, used as the pull cursor
  primary key (user_id, id)
);

create index user_records_user_synced on public.user_records (user_id, synced_at);

alter table public.user_records enable row level security;

create policy "Users read their own records"
  on public.user_records for select to authenticated
  using (user_id = (select auth.uid()));

-- Writes go through push_records() so a stale device can't overwrite newer data.
create or replace function public.push_records(records jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.user_records as t (user_id, id, kind, data, deleted, updated_at, synced_at)
  select auth.uid(), r.id, r.kind, case when r.deleted then null else r.data end, r.deleted, r.updated_at, now()
  from jsonb_to_recordset(records) as r (id text, kind text, data jsonb, deleted boolean, updated_at timestamptz)
  where auth.uid() is not null
  on conflict (user_id, id) do update
    set kind = excluded.kind,
        data = excluded.data,
        deleted = excluded.deleted,
        updated_at = excluded.updated_at,
        synced_at = now()
    where excluded.updated_at > t.updated_at;
$$;

revoke execute on function public.push_records(jsonb) from public, anon;
grant execute on function public.push_records(jsonb) to authenticated;
