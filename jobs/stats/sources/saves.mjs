// Codes added to playlists by signed-in users, read from their synced playlists.
// Counts distinct users whose item was added inside the window, so deleting an item drops it.

import { readdirSync, readFileSync } from "node:fs"

// Descriptions (in every locale) of the playlist created by loadDemoData() in lib/local-store.ts;
// its codes aren't real saves
const MESSAGES_DIR = new URL("../../../messages/", import.meta.url)
const DEMO_DESCRIPTIONS = readdirSync(MESSAGES_DIR).map(
  (locale) => JSON.parse(readFileSync(new URL(`${locale}/Demo.json`, MESSAGES_DIR), "utf8")).description
)

export default {
  name: "saves",
  weight: 3,
  async collect(db, { from, to }) {
    // `data` is client-written jsonb, so guard every access instead of casting.
    // createdAt is an ISO string from toISOString(), which sorts correctly as text.
    const { rows } = await db.query(
      `select item->>'normalizedCode' as code, count(distinct r.user_id)::int as users
       from public.user_records r
       cross join lateral jsonb_array_elements(
         case when jsonb_typeof(r.data->'items') = 'array' then r.data->'items' else '[]'::jsonb end
       ) as item
       where r.kind = 'playlist'
         and not r.deleted
         and coalesce(r.data->>'description', '') <> all($3::text[])
         and item->>'createdAt' >= $1 and item->>'createdAt' < $2
         and item->>'normalizedCode' ~ '^[A-Z0-9][A-Z0-9-]{1,29}$'
         and not exists (select 1 from public.stats_opt_outs o where o.user_id = r.user_id)
       group by 1`,
      [from.toISOString(), to.toISOString(), DEMO_DESCRIPTIONS]
    )
    return rows
  },
}
