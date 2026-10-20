-- Public playlists: a playlist whose synced data has "isPublic": true can be read by anyone,
-- signed in or not, at /p/<owner>/<id>. The URL carries the owner because playlist ids are
-- only unique per user. Turning it off (or deleting the playlist) makes the link stop working.

create or replace function public.get_public_playlist(owner uuid, playlist_id text)
returns table (data jsonb, updated_at timestamptz, display_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select r.data, r.updated_at, p.display_name
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
