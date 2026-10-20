"use client"

import { useEffect, useState } from "react"
import { useFormatter, useNow, useTranslations } from "next-intl"
import { Check, ExternalLink, History, Plus, X } from "lucide-react"
import { AddItemsToPlaylistDialog } from "@/components/add-items-to-playlist-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Link, usePathname } from "@/i18n/navigation"
import { mergeTemplates } from "@/lib/default-templates"
import { useStore, type SourceTemplate } from "@/lib/local-store"
import {
  clearRecentOpens,
  dismissRecentOpens,
  forgetOpened,
  rememberOpened,
  useRecentOpens,
} from "@/lib/recent-opens"
import { recordClicks } from "@/lib/trending"
import { parseVideoInput } from "@/lib/url-parser"

function useSavedCodes() {
  const store = useStore()
  return new Set(store?.playlists.flatMap((p) => p.items.map((i) => i.normalizedCode)))
}

const buildUrl = (template: SourceTemplate, code: string) => template.baseTemplate.replace("{code}", code)

// Opened from /recent itself, where the list is already on screen: no need to prompt about it later
function markOpened(code: string) {
  recordClicks([code])
  rememberOpened([code])
  dismissRecentOpens()
}

/** Type or paste a code (or video URL) and open it in a source; the open is remembered. */
export function QuickOpen() {
  const t = useTranslations("RecentOpens")
  const store = useStore()
  const saved = useSavedCodes()
  const [input, setInput] = useState("")

  if (!store) return null

  const templates = mergeTemplates(store.templates)
  const primary = templates.find((tpl) => tpl.isDefault) ?? templates[0]
  const parsed = input.trim() ? parseVideoInput(input) : null
  const code = parsed?.success ? parsed.normalizedCode : null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!code || !primary) return
    markOpened(code)
    window.open(buildUrl(primary, code), "_blank", "noopener,noreferrer")
    setInput("")
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={t("inputPlaceholder")}
        className="h-12 text-base font-mono"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
      />
      <p className="text-xs min-h-4">
        {parsed && !code && <span className="text-amber-700">{t("invalid")}</span>}
        {code && (
          <span className="text-zinc-500">
            <span className="font-mono font-semibold text-zinc-900">{code}</span>
            {saved.has(code) && <span className="ml-2 text-emerald-600">{t("saved")}</span>}
          </span>
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        {templates.map((template) =>
          code ? (
            <Button key={template.id} asChild variant={template === primary ? "default" : "outline"} size="sm">
              <a
                href={buildUrl(template, code)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  markOpened(code)
                  setInput("")
                }}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                {template.name}
              </a>
            </Button>
          ) : (
            <Button key={template.id} type="button" variant={template === primary ? "default" : "outline"} size="sm" disabled>
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              {template.name}
            </Button>
          )
        )}
      </div>
    </form>
  )
}

/** Recently opened codes with checkboxes; the checked ones go to a playlist. */
export function RecentOpensPicker() {
  const t = useTranslations("RecentOpens")
  const format = useFormatter()
  const now = useNow({ updateInterval: 60_000 })
  const recent = useRecentOpens()
  const saved = useSavedCodes()
  // Codes the user unchecked or checked by hand; everything else follows "new = checked"
  const [overrides, setOverrides] = useState<Map<string, boolean>>(new Map())

  const entries = recent?.entries ?? []
  const isPicked = (code: string) => overrides.get(code) ?? !saved.has(code)
  const picked = entries.filter((e) => isPicked(e.code))
  const allPicked = entries.length > 0 && picked.length === entries.length

  const setPicked = (codes: string[], on: boolean) =>
    setOverrides((prev) => {
      const next = new Map(prev)
      codes.forEach((c) => next.set(c, on))
      return next
    })

  if (entries.length === 0) {
    return <p className="text-sm text-zinc-500 py-10 text-center">{t("empty")}</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <button
          type="button"
          className="hover:text-zinc-900"
          onClick={() => setPicked(entries.map((e) => e.code), !allPicked)}
        >
          {allPicked ? t("selectNone") : t("selectAll")}
        </button>
        <span>{t("selectedCount", { count: picked.length, total: entries.length })}</span>
      </div>
      <ul className="divide-y divide-zinc-100 border-y border-zinc-100">
        {entries.map((entry) => (
          <li key={entry.code}>
            <label className="flex items-center gap-3 px-1 py-2.5 cursor-pointer hover:bg-zinc-50 rounded-md">
              <Checkbox checked={isPicked(entry.code)} onCheckedChange={(on) => setPicked([entry.code], on === true)} />
              <span className="flex-1 min-w-0 font-mono font-semibold text-sm text-zinc-900 truncate">{entry.code}</span>
              {saved.has(entry.code) && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                  <Check className="h-3 w-3" />
                  {t("saved")}
                </span>
              )}
              <span className="text-xs text-zinc-400 tabular-nums">
                {format.relativeTime(new Date(entry.openedAt), new Date(Math.max(now.getTime(), Date.parse(entry.openedAt))))}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
        <Button type="button" variant="outline" className="sm:flex-1" onClick={clearRecentOpens}>
          {t("clear")}
        </Button>
        <AddItemsToPlaylistDialog
          items={picked.map((e) => ({ videoCode: e.code, normalizedCode: e.code }))}
          defaultNewName={t("defaultPlaylistName")}
          source="recent"
          onDone={() => {
            forgetOpened(picked.map((e) => e.code))
            setOverrides(new Map())
          }}
          trigger={
            <Button type="button" className="sm:flex-1" disabled={picked.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              {t("addCount", { count: picked.length })}
            </Button>
          }
        />
      </div>
    </div>
  )
}

/** Marks everything seen while the /recent page is open, so the prompt doesn't pop up right after. */
export function DismissRecentOpensOnView() {
  useEffect(() => {
    dismissRecentOpens()
    return () => dismissRecentOpens()
  }, [])
  return null
}

/** Floating reminder after opening codes from the site; links to /recent. Hidden on that page. */
export function RecentOpensPrompt() {
  const t = useTranslations("RecentOpens")
  const pathname = usePathname()
  const recent = useRecentOpens()
  const saved = useSavedCodes()
  if (!recent || pathname.startsWith("/recent")) return null

  const pending = recent.entries.filter(
    (e) => !saved.has(e.code) && (!recent.dismissedAt || e.openedAt > recent.dismissedAt)
  )
  if (pending.length === 0) return null

  return (
    <div className="fixed z-40 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-6 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-6 flex items-center rounded-full bg-zinc-900 text-white shadow-lg pl-1 pr-1">
      <Link href="/recent" className="flex items-center gap-2 pl-3 pr-2 h-10 text-sm font-medium whitespace-nowrap">
        <History className="h-4 w-4" />
        {t("prompt", { count: pending.length })}
      </Link>
      <button
        onClick={dismissRecentOpens}
        className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-white/10"
        aria-label={t("dismiss")}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
