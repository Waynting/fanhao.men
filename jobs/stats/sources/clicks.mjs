// Links opened or copied by signed-in users (recorded by record_clicks()).
// Counts distinct users who clicked the code on any day inside the window.

export default {
  name: "clicks",
  weight: 1,
  async collect(db, { from, to }) {
    const { rows } = await db.query(
      `select code, count(distinct user_id)::int as users
       from public.code_clicks c
       where day >= $1::date and day < $2::date
         and not exists (select 1 from public.stats_opt_outs o where o.user_id = c.user_id)
       group by code`,
      [from.toISOString().slice(0, 10), to.toISOString().slice(0, 10)]
    )
    return rows
  },
}
