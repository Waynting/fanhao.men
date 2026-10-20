"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowDown, ArrowUp, Check, ExternalLink, Plus, RefreshCw, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageLoading } from "@/components/page-loading"
import { AddItemsToPlaylistDialog } from "@/components/add-items-to-playlist-dialog"
import { LinkGeneratorPopover } from "@/components/link-generator-popover"
import { mergeTemplates } from "@/lib/default-templates"
import { useStore } from "@/lib/local-store"
import { authEnabled, useSession } from "@/lib/supabase"
import { fetchTrending, type TrendingCode, type TrendingPeriod } from "@/lib/trending"

const PERIODS: { value: TrendingPeriod; label: string }[] = [
  { value: "7d", label: "本週" },
  { value: "30d", label: "本月" },
]

// Display order and wording for trending_codes.counts keys; unknown sources are skipped
const SOURCE_LABELS: [string, string][] = [
  ["saves", "人收藏"],
  ["clicks", "人點擊"],
]

type State = { status: "loading" } | { status: "error" } | { status: "ready"; codes: TrendingCode[] }

export default function ExplorePage() {
  const store = useStore()
  const { session } = useSession()
  const [period, setPeriod] = useState<TrendingPeriod>("7d")
  const [state, setState] = useState<State>({ status: "loading" })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ status: "loading" })
    fetchTrending(period)
      .then((codes) => !cancelled && setState({ status: "ready", codes }))
      .catch(() => !cancelled && setState({ status: "error" }))
    return () => {
      cancelled = true
    }
  }, [period, attempt])

  if (!store) return <PageLoading />

  const templates = mergeTemplates(store.templates)
  const saved = new Set(store.playlists.flatMap((p) => p.items.map((i) => i.normalizedCode)))
  const computedAt = state.status === "ready" ? state.codes[0]?.computedAt : undefined

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900 tracking-tight">探索</h1>
          <p className="text-zinc-500 mt-1 text-sm sm:text-base">大家最近收藏和點擊最多的番號</p>
        </div>
        <div className="inline-flex self-start sm:self-auto rounded-lg bg-zinc-100 p-1" role="tablist">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              role="tab"
              aria-selected={period === p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                period === p.value ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {!authEnabled ? (
        <EmptyState title="這個站台沒有啟用熱門統計" body="排行需要登入功能，目前只能使用自己的清單。" />
      ) : state.status === "loading" ? (
        <PageLoading />
      ) : state.status === "error" ? (
        <EmptyState
          title="排行載入失敗"
          body="可能是網路不穩，稍後再試一次。"
          action={
            <Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              重新載入
            </Button>
          }
        />
      ) : state.codes.length === 0 ? (
        <EmptyState
          title="資料累積中"
          body="還沒有足夠多人收藏或點擊同一個番號。登入後你的收藏也會計入排行。"
          action={
            !session && (
              <Button asChild>
                <Link href="/settings#account">登入</Link>
              </Button>
            )
          }
        />
      ) : (
        <ol className="bg-white border border-zinc-200/80 rounded-xl divide-y divide-zinc-100">
          {state.codes.map((item) => (
            <li key={item.code} className="flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-3">
              <span
                className={`w-7 text-right font-mono tabular-nums ${
                  item.rank <= 3 ? "text-lg font-bold text-zinc-900" : "text-sm text-zinc-400"
                }`}
              >
                {item.rank}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-zinc-900 truncate">{item.code}</span>
                  <RankChange rank={item.rank} prevRank={item.prevRank} />
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {SOURCE_LABELS.filter(([key]) => item.counts[key])
                    .map(([key, label]) => `${item.counts[key]} ${label}`)
                    .join(" · ")}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {saved.has(item.code) ? (
                  <span className="inline-flex items-center gap-1 px-2.5 h-8 text-xs text-zinc-400">
                    <Check className="h-3.5 w-3.5" />
                    已收藏
                  </span>
                ) : (
                  <AddItemsToPlaylistDialog
                    items={[{ videoCode: item.code, normalizedCode: item.code }]}
                    defaultNewName="探索收藏"
                    source="explore"
                    trigger={
                      <Button size="sm" variant="outline" className="h-8" aria-label={`把 ${item.code} 加入清單`}>
                        <Plus className="h-3.5 w-3.5 sm:mr-1" />
                        <span className="hidden sm:inline">加入清單</span>
                      </Button>
                    }
                  />
                )}
                <LinkGeneratorPopover
                  items={[{ normalizedCode: item.code }]}
                  templates={templates}
                  trigger={
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label={`${item.code} 的連結`}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  }
                />
              </div>
            </li>
          ))}
        </ol>
      )}

      <p className="text-xs text-zinc-400 leading-relaxed">
        排行只統計登入用戶，至少 3 人以上的番號才會列出，不會顯示是誰收藏或點擊。
        {computedAt && ` 更新於 ${new Date(computedAt).toLocaleString("zh-TW")}。`}
        {session && (
          <>
            {" "}
            可以在
            <Link href="/settings" className="underline underline-offset-2">設定</Link>
            退出統計。
          </>
        )}
      </p>
    </div>
  )
}

function RankChange({ rank, prevRank }: { rank: number; prevRank: number | null }) {
  if (prevRank === null) {
    return <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-900 text-white font-medium">新</span>
  }
  const diff = prevRank - rank
  if (diff === 0) return null
  return diff > 0 ? (
    <span className="inline-flex items-center text-[11px] font-medium text-green-600">
      <ArrowUp className="h-3 w-3" />
      {diff}
    </span>
  ) : (
    <span className="inline-flex items-center text-[11px] font-medium text-zinc-400">
      <ArrowDown className="h-3 w-3" />
      {-diff}
    </span>
  )
}

function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="bg-white border border-zinc-200/80 rounded-xl flex flex-col items-center text-center py-12 px-6">
      <TrendingUp className="h-10 w-10 text-zinc-300 mb-4" strokeWidth={1.5} />
      <h3 className="text-lg font-semibold text-zinc-800 mb-2">{title}</h3>
      <p className="text-zinc-500 text-sm max-w-md mb-6">{body}</p>
      {action}
    </div>
  )
}
