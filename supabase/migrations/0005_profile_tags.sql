-- Free-form tags on a profile ("FC2 派", "素人"), shown next to the nickname.
-- Limits mirror lib/profile.ts: at most 5 tags, each 1-12 characters after trimming, no duplicates.

create function public.profile_tags_valid(tags text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality(tags) <= 5
    and coalesce(bool_and(char_length(t) between 1 and 12 and t = btrim(t)), true)
    and count(distinct lower(t)) = count(*)
  from unnest(tags) as t;
$$;

alter table public.profiles
  add column tags text[] not null default '{}'
  check (public.profile_tags_valid(tags));

-- Public playlists show the owner's tags too. The return type changes, so drop and recreate.
drop function public.get_public_playlist(uuid, text);

create function public.get_public_playlist(owner uuid, playlist_id text)
returns table (data jsonb, updated_at timestamptz, display_name text, tags text[])
language sql
stable
security definer
set search_path = ''
as $$
  select r.data, r.updated_at, p.display_name, p.tags
  from public.user_records r
  left join public.profiles p on p.id = r.user_id
  where r.user_id = owner
    and r.id = playlist_id
    and r.kind = 'playlist'
    and not r.deleted
    and r.data->>'isPublic' = 'true';
$$;

revoke execute on function public.get_public_playlist(uuid, text) from public;
grant execute on function public.get_public_playlist(uuid, text) to anon, authenticated;
