// Rebuilds public.trending_codes from every source in ./sources.
//
//   npm run stats             # compute and write
//   npm run stats -- --dry-run  # compute and print only
//
// Env: DATABASE_URL (Supabase → Connect → Session pooler; the direct db.*.supabase.co host is IPv6-only)
//      STATS_MIN_USERS  a code is listed only once some source has this many distinct users (default 3)
//      STATS_TOP        codes kept per period (default 100)

import pg from "pg"
import { sources } from "./sources/index.mjs"

const PERIODS = { "7d": 7, "30d": 30 }
const DAY_MS = 86_400_000
const MIN_USERS = Number(process.env.STATS_MIN_USERS ?? 3)
const TOP = Number(process.env.STATS_TOP ?? 100)
const dryRun = process.argv.includes("--dry-run")

/** Score every code in [from, to). Returns entries above the threshold, best first. */
async function rank(db, from, to) {
  const byCode = new Map()
  for (const source of sources) {
    for (const { code, users } of await source.collect(db, { from, to })) {
      const entry = byCode.get(code) ?? { code, score: 0, counts: {} }
      entry.counts[source.name] = users
      entry.score += users * source.weight
      byCode.set(code, entry)
    }
  }
  // Small counts could point at a specific person, so hide codes nobody else shares
  return [...byCode.values()]
    .filter((e) => Math.max(...Object.values(e.counts)) >= MIN_USERS)
    .sort((a, b) => b.score - a.score || a.code.localeCompare(b.code))
    .map((e, i) => ({ ...e, rank: i + 1 }))
}

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL is not set")
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url)
  const db = new pg.Client({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false } })
  await db.connect()

  try {
    // Whole UTC days, today included, so both windows line up with code_clicks.day
    const now = new Date()
    const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
    const computedAt = now.toISOString()

    for (const [period, days] of Object.entries(PERIODS)) {
      const from = new Date(to.getTime() - days * DAY_MS)
      const prevFrom = new Date(from.getTime() - days * DAY_MS)
      const current = (await rank(db, from, to)).slice(0, TOP)
      const prevRanks = new Map((await rank(db, prevFrom, from)).map((e) => [e.code, e.rank]))
      const rows = current.map((e) => ({ ...e, prevRank: prevRanks.get(e.code) ?? null }))

      console.log(`\n${period}: ${rows.length} codes (${from.toISOString().slice(0, 10)} → ${to.toISOString().slice(0, 10)})`)
      console.table(
        rows.slice(0, 20).map((r) => ({ rank: r.rank, code: r.code, score: r.score, prev: r.prevRank ?? "new", ...r.counts }))
      )
      if (dryRun) continue

      await db.query("begin")
      await db.query("delete from public.trending_codes where period = $1", [period])
      if (rows.length > 0) {
        await db.query(
          `insert into public.trending_codes (period, code, rank, score, counts, prev_rank, computed_at)
           select $1, r.code, r.rank, r.score, r.counts, r.prev_rank, $2
           from jsonb_to_recordset($3) as r (code text, rank int, score numeric, counts jsonb, prev_rank int)`,
          [
            period,
            computedAt,
            JSON.stringify(rows.map((r) => ({ code: r.code, rank: r.rank, score: r.score, counts: r.counts, prev_rank: r.prevRank }))),
          ]
        )
      }
      await db.query("commit")
    }
    console.log(dryRun ? "\nDry run, nothing written." : "\nWrote trending_codes.")
  } catch (error) {
    await db.query("rollback").catch(() => {})
    throw error
  } finally {
    await db.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
