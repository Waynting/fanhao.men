"use client"

import { useState } from "react"
import { useFormatter, useLocale, useTranslations } from "next-intl"
import { DATE } from "@/lib/date-formats"
import { Link, useRouter } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, History, ListVideo, Sparkles, Globe, Search, X, LayoutGrid, List, ArrowDownUp, ChevronRight } from "lucide-react"
import { useStore, loadDemoData, type Playlist } from "@/lib/local-store"
import { PageLoading } from "@/components/page-loading"
import { RecentOpensDialog } from "@/components/recent-opens"
import { useRecentOpens } from "@/lib/recent-opens"
import { cn } from "@/lib/utils"

const SORTS = ["updated", "created", "name", "most", "fewest"] as const
type Sort = (typeof SORTS)[number]
type View = "grid" | "list"

// Per-device view preference; not part of the synced store
const PREFS_KEY = "av-collector:dashboard-view"

function loadPrefs(): { sort: Sort; view: View } {
  const fallback = { sort: "updated" as Sort, view: "grid" as View }
  if (typeof window === "undefined") return fallback
  try {
    const raw = JSON.parse(window.localStorage.getItem(PREFS_KEY) ?? "{}")
    return {
      sort: SORTS.includes(raw.sort) ? raw.sort : fallback.sort,
      view: raw.view === "list" ? "list" : fallback.view,
    }
  } catch {
    return fallback
  }
}

function savePrefs(prefs: { sort: Sort; view: View }) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // Private mode or storage full: the preference just won't stick
  }
}

/** Lowercase and drop separators so "ssis123" finds "SSIS-123". */
const squash = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "")

export default function DashboardPage() {
  const t = useTranslations("Dashboard")
  const tDemo = useTranslations("Demo")
  const format = useFormatter()
  const locale = useLocale()
  const store = useStore()
  const recent = useRecentOpens()
  const tRecent = useTranslations("RecentOpens")
  const router = useRouter()
  const [prefs, setPrefs] = useState(loadPrefs)
  const [searchQuery, setSearchQuery] = useState("")

  if (!store) return <PageLoading />

  const updatePrefs = (next: Partial<typeof prefs>) => {
    const merged = { ...prefs, ...next }
    setPrefs(merged)
    savePrefs(merged)
  }

  const compare: Record<Sort, (a: Playlist, b: Playlist) => number> = {
    updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
    created: (a, b) => b.createdAt.localeCompare(a.createdAt),
    name: (a, b) => a.name.localeCompare(b.name, locale, { numeric: true }),
    most: (a, b) => b.items.length - a.items.length || b.updatedAt.localeCompare(a.updatedAt),
    fewest: (a, b) => a.items.length - b.items.length || b.updatedAt.localeCompare(a.updatedAt),
  }

  const query = searchQuery.trim().toLowerCase()
  const squashed = squash(query)
  // Codes that matched the search, so cards can show them instead of the first few
  const matchedCodes = new Map<string, string[]>()
  const playlists = store.playlists
    .filter((p) => {
      if (!query) return true
      const codes = squashed ? p.items.filter((i) => squash(i.normalizedCode).includes(squashed)) : []
      if (codes.length > 0) matchedCodes.set(p.id, codes.map((i) => i.normalizedCode))
      return (
        p.name.toLowerCase().includes(query) || !!p.description?.toLowerCase().includes(query) || codes.length > 0
      )
    })
    .sort(compare[prefs.sort])

  const showCreated = prefs.sort === "created"
  const dateLabel = (p: Playlist) =>
    showCreated
      ? t("createdAt", { date: format.dateTime(new Date(p.createdAt), DATE) })
      : t("updatedAt", { date: format.dateTime(new Date(p.updatedAt), DATE) })

  const previewCodes = (p: Playlist, max: number) => {
    const matched = matchedCodes.get(p.id)
    const codes = matched ?? p.items.map((i) => i.normalizedCode)
    return { codes: codes.slice(0, max), rest: codes.length - max, highlighted: !!matched }
  }

  const handleLoadDemo = () => {
    const playlist = loadDemoData({ name: tDemo("name"), description: tDemo("description"), note: tDemo("note") })
    router.push(`/playlist/${playlist.id}`)
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900 tracking-tight">{t("title")}</h1>
        </div>
        <div className="flex gap-2">
          {recent && recent.entries.length > 0 && (
            <RecentOpensDialog
              trigger={
                <Button variant="outline" size="lg">
                  <History className="h-4 w-4 mr-2" />
                  {tRecent("title")}
                </Button>
              }
            />
          )}
          <Button asChild size="lg" className="flex-1 sm:flex-none">
            <Link href="/dashboard/new">
              <Plus className="h-4 w-4 mr-2" />
              {t("newPlaylist")}
            </Link>
          </Button>
        </div>
      </div>

      {/* Content Section */}
      {store.playlists.length === 0 ? (
        <div className="bg-white border border-zinc-200/80 rounded-xl">
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <ListVideo className="h-10 w-10 sm:h-12 sm:w-12 text-zinc-300 mb-4" strokeWidth={1.5} />
            <h3 className="text-lg sm:text-xl font-semibold text-zinc-800 mb-2">{t("emptyTitle")}</h3>
            <p className="text-zinc-500 text-center mb-6 max-w-md text-sm sm:text-base">
              {t("emptyBody")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg">
                <Link href="/dashboard/new">
                  <Plus className="h-5 w-5 mr-2" />
                  {t("createFirst")}
                </Link>
              </Button>
              <Button size="lg" variant="outline" onClick={handleLoadDemo}>
                <Sparkles className="h-5 w-5 mr-2" />
                {t("loadDemo")}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Library controls */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                type="search"
                placeholder={t("library.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 h-10 text-base bg-white [&::-webkit-search-cancel-button]:hidden"
                aria-label={t("library.searchPlaceholder")}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-zinc-100"
                  aria-label={t("library.clearSearch")}
                >
                  <X className="h-3.5 w-3.5 text-zinc-500" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <Select value={prefs.sort} onValueChange={(value) => updatePrefs({ sort: value as Sort })}>
                <SelectTrigger className="h-10 flex-1 sm:w-44 bg-white justify-start gap-2 [&>span]:flex-1 [&>span]:text-left" aria-label={t("library.sortLabel")}>
                  <ArrowDownUp className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORTS.map((sort) => (
                    <SelectItem key={sort} value={sort}>
                      {t(`library.sort.${sort}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex shrink-0 rounded-md border border-zinc-200 bg-white p-0.5" role="group">
                {(["grid", "list"] as const).map((view) => {
                  const Icon = view === "grid" ? LayoutGrid : List
                  const active = prefs.view === view
                  return (
                    <button
                      key={view}
                      onClick={() => updatePrefs({ view })}
                      aria-pressed={active}
                      aria-label={t(view === "grid" ? "library.viewGrid" : "library.viewList")}
                      className={cn(
                        "h-8 w-9 flex items-center justify-center rounded transition-colors",
                        active ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <p className="text-xs text-zinc-500" aria-live="polite">
            {query ? t("library.matches", { count: playlists.length }) : t("library.total", { count: playlists.length })}
          </p>

          {playlists.length === 0 ? (
            <div className="bg-white border border-zinc-200/80 rounded-xl text-center py-12 px-4">
              <Search className="h-10 w-10 text-zinc-300 mx-auto mb-4" strokeWidth={1.5} />
              <h3 className="text-base sm:text-lg font-semibold text-zinc-900 mb-2">{t("library.noMatchTitle")}</h3>
              <p className="text-sm text-zinc-500 mb-4">{t("library.noMatchBody", { query: searchQuery.trim() })}</p>
              <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>
                {t("library.clearSearch")}
              </Button>
            </div>
          ) : prefs.view === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {playlists.map((playlist) => {
                const preview = previewCodes(playlist, 3)
                return (
                  <Link key={playlist.id} href={`/playlist/${playlist.id}`} className="group">
                    <div className="bg-white border border-zinc-200/80 rounded-xl hover:border-zinc-300 hover:shadow-sm transition-all duration-150 h-full overflow-hidden">
                      <div className="p-6">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <h3 className="text-lg font-semibold text-zinc-900 line-clamp-1">{playlist.name}</h3>
                          {playlist.isPublic && (
                            <span className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                              <Globe className="h-3 w-3" />
                              {t("public")}
                            </span>
                          )}
                        </div>
                        {playlist.description && (
                          <p className="text-sm text-zinc-500 line-clamp-2 mb-4">{playlist.description}</p>
                        )}
                        {preview.codes.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-1">
                            {preview.codes.map((code) => (
                              <code
                                key={code}
                                className={cn(
                                  "px-2 py-0.5 rounded text-xs font-medium",
                                  preview.highlighted ? "bg-amber-100 text-amber-900" : "bg-zinc-100 text-zinc-700"
                                )}
                              >
                                {code}
                              </code>
                            ))}
                            {preview.rest > 0 && (
                              <span className="text-xs text-zinc-400 px-1 py-0.5">+{preview.rest}</span>
                            )}
                          </div>
                        )}
                        <div className="pt-4 mt-4 border-t border-zinc-100 flex items-center justify-between">
                          <div className="text-sm text-zinc-900">
                            <span className="font-semibold">{playlist.items.length}</span>
                            <span className="text-zinc-400 ml-1">{t("codeCountLabel")}</span>
                          </div>
                          <div className="text-xs text-zinc-400">{dateLabel(playlist)}</div>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <ul className="bg-white border border-zinc-200/80 rounded-xl divide-y divide-zinc-100 overflow-hidden">
              {playlists.map((playlist) => {
                const preview = previewCodes(playlist, 2)
                return (
                  <li key={playlist.id}>
                    <Link
                      href={`/playlist/${playlist.id}`}
                      className="group flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 hover:bg-zinc-50 transition-colors"
                    >
                      <div className="h-10 w-10 shrink-0 rounded-lg bg-zinc-900 text-white flex flex-col items-center justify-center leading-none">
                        <span className="text-sm font-semibold tabular-nums">{playlist.items.length}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-zinc-900 truncate">{playlist.name}</span>
                          {playlist.isPublic && <Globe className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-label={t("public")} />}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-0.5 min-w-0">
                          {preview.highlighted ? (
                            <>
                              {preview.codes.map((code) => (
                                <code key={code} className="px-1.5 rounded bg-amber-100 text-amber-900 font-medium shrink-0">
                                  {code}
                                </code>
                              ))}
                              {preview.rest > 0 && <span className="text-zinc-400 shrink-0">+{preview.rest}</span>}
                            </>
                          ) : (
                            <span className="truncate">{playlist.description || dateLabel(playlist)}</span>
                          )}
                        </div>
                      </div>
                      <span className="hidden sm:block shrink-0 text-xs text-zinc-400">{dateLabel(playlist)}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
