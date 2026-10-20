"use client"

import { useEffect, useState } from "react"
import { useFormatter, useTranslations } from "next-intl"
import { DATE_TIME } from "@/lib/date-formats"
import { ArrowDown, ArrowUp, Check, ExternalLink, Plus, RefreshCw, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageLoading } from "@/components/page-loading"
import { AddItemsToPlaylistDialog } from "@/components/add-items-to-playlist-dialog"
import { LinkGeneratorPopover } from "@/components/link-generator-popover"
import { mergeTemplates } from "@/lib/default-templates"
import { useStore } from "@/lib/local-store"
import { authEnabled, useSession } from "@/lib/supabase"
import { fetchTrending, type TrendingCode, type TrendingPeriod } from "@/lib/trending"
import { Link } from "@/i18n/navigation"

const PERIODS: TrendingPeriod[] = ["7d", "30d"]

// Display order for trending_codes.counts keys (wording in Explore.counts); unknown sources are skipped
const SOURCE_LABELS = ["saves", "clicks"] as const

type State = { status: "loading" } | { status: "error" } | { status: "ready"; codes: TrendingCode[] }

export default function ExplorePage() {
  const t = useTranslations("Explore")
  const format = useFormatter()
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
          <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900 tracking-tight">{t("title")}</h1>
          <p className="text-zinc-500 mt-1 text-sm sm:text-base">{t("subtitle")}</p>
        </div>
        <div className="inline-flex self-start sm:self-auto rounded-lg bg-zinc-100 p-1" role="tablist">
          {PERIODS.map((p) => (
            <button
              key={p}
              role="tab"
              aria-selected={period === p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                period === p ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {t(`periods.${p}`)}
            </button>
          ))}
        </div>
      </div>

      {!authEnabled ? (
        <EmptyState title={t("disabledTitle")} body={t("disabledBody")} />
      ) : state.status === "loading" ? (
        <PageLoading />
      ) : state.status === "error" ? (
        <EmptyState
          title={t("errorTitle")}
          body={t("errorBody")}
          action={
            <Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t("reload")}
            </Button>
          }
        />
      ) : state.codes.length === 0 ? (
        <EmptyState
          title={t("emptyTitle")}
          body={t("emptyBody")}
          action={
            !session && (
              <Button asChild>
                <Link href="/settings#account">{t("signIn")}</Link>
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
                  {SOURCE_LABELS.filter((key) => item.counts[key])
                    .map((key) => t(`counts.${key}`, { count: item.counts[key] }))
                    .join(" · ")}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {saved.has(item.code) ? (
                  <span className="inline-flex items-center gap-1 px-2.5 h-8 text-xs text-zinc-400">
                    <Check className="h-3.5 w-3.5" />
                    {t("saved")}
                  </span>
                ) : (
                  <AddItemsToPlaylistDialog
                    items={[{ videoCode: item.code, normalizedCode: item.code }]}
                    defaultNewName={t("defaultPlaylistName")}
                    source="explore"
                    trigger={
                      <Button size="sm" variant="outline" className="h-8" aria-label={t("addLabel", { code: item.code })}>
                        <Plus className="h-3.5 w-3.5 sm:mr-1" />
                        <span className="hidden sm:inline">{t("addToPlaylist")}</span>
                      </Button>
                    }
                  />
                )}
                <LinkGeneratorPopover
                  items={[{ normalizedCode: item.code }]}
                  templates={templates}
                  trigger={
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label={t("linksLabel", { code: item.code })}>
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
        {t("footer")}
        {computedAt &&
          t("updatedAt", { time: format.dateTime(new Date(computedAt), DATE_TIME) })}
        {session &&
          t.rich("optOut", {
            link: (chunks) => (
              <Link href="/settings" className="underline underline-offset-2">
                {chunks}
              </Link>
            ),
          })}
      </p>
    </div>
  )
}

function RankChange({ rank, prevRank }: { rank: number; prevRank: number | null }) {
  const t = useTranslations("Explore")
  if (prevRank === null) {
    return <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-900 text-white font-medium">{t("new")}</span>
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
