"use client"

/**
 * Trending codes on /explore. Only signed-in users are counted: their synced playlists (saves)
 * and the links they open or copy (clicks, via record_clicks()). jobs/stats builds the ranking.
 */

import { getSupabase } from "@/lib/supabase"

export type TrendingPeriod = "7d" | "30d"

export interface TrendingCode {
  code: string
  rank: number
  /** Distinct users per source, e.g. { saves: 4, clicks: 9 } */
  counts: Record<string, number>
  /** Rank in the previous window; null = new entry */
  prevRank: number | null
  computedAt: string
}

interface Row {
  code: string
  rank: number
  counts: Record<string, number>
  prev_rank: number | null
  computed_at: string
}

export async function fetchTrending(period: TrendingPeriod): Promise<TrendingCode[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase
    .from("trending_codes")
    .select("code, rank, counts, prev_rank, computed_at")
    .eq("period", period)
    .order("rank", { ascending: true })
    .returns<Row[]>()
  if (error) throw error
  return data.map((r) => ({ code: r.code, rank: r.rank, counts: r.counts, prevRank: r.prev_rank, computedAt: r.computed_at }))
}

// Codes already sent today; the server dedupes too, this just avoids repeat requests
const sent = new Set<string>()

/** Counts a link click for each code. Fire-and-forget; a no-op when signed out or opted out (checked server-side). */
export function recordClicks(codes: string[]) {
  const supabase = getSupabase()
  if (!supabase) return
  const day = new Date().toISOString().slice(0, 10)
  const fresh = [...new Set(codes)].filter((c) => !sent.has(`${day}:${c}`))
  if (fresh.length === 0) return
  void (async () => {
    const { data } = await supabase.auth.getSession()
    if (!data.session) return
    for (let i = 0; i < fresh.length; i += 50) {
      const batch = fresh.slice(i, i + 50)
      const { error } = await supabase.rpc("record_clicks", { codes: batch })
      if (error) return
      batch.forEach((c) => sent.add(`${day}:${c}`))
    }
  })()
}

export async function getStatsOptOut(): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase) return false
  const { data, error } = await supabase.from("stats_opt_outs").select("user_id").maybeSingle()
  if (error) throw error
  return data !== null
}

export async function setStatsOptOut(optOut: boolean) {
  const supabase = getSupabase()
  if (!supabase) return
  const { data } = await supabase.auth.getSession()
  const userId = data.session?.user.id
  if (!userId) return
  const { error } = optOut
    ? await supabase.from("stats_opt_outs").upsert({ user_id: userId }, { ignoreDuplicates: true })
    : await supabase.from("stats_opt_outs").delete().eq("user_id", userId)
  if (error) throw error
}
