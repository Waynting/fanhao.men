"use client"

import { useState } from "react"
import { useFormatter, useNow, useTranslations } from "next-intl"
import { Check, History, Plus, X } from "lucide-react"
import { AddItemsToPlaylistDialog } from "@/components/add-items-to-playlist-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useStore } from "@/lib/local-store"
import { clearRecentOpens, dismissRecentOpens, forgetOpened, useRecentOpens } from "@/lib/recent-opens"

function useSavedCodes() {
  const store = useStore()
  return new Set(store?.playlists.flatMap((p) => p.items.map((i) => i.normalizedCode)))
}

/** Lists recently opened codes with checkboxes; the checked ones go to a playlist. */
export function RecentOpensDialog({ trigger }: { trigger: React.ReactNode }) {
  const t = useTranslations("RecentOpens")
  const format = useFormatter()
  const now = useNow({ updateInterval: 60_000 })
  const recent = useRecentOpens()
  const saved = useSavedCodes()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const entries = recent?.entries ?? []
  const unsaved = entries.filter((e) => !saved.has(e.code))
  const picked = entries.filter((e) => selected.has(e.code))

  const handleOpenChange = (next: boolean) => {
    // Codes already in a playlist start unchecked, so "add" means "the new ones".
    // Dismissed on close, not open: the prompt holding this dialog would unmount it.
    if (next) setSelected(new Set(unsaved.map((e) => e.code)))
    else dismissRecentOpens()
    setOpen(next)
  }

  const toggle = (code: string, on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(code)
      else next.delete(code)
      return next
    })
  }

  const allPicked = entries.length > 0 && picked.length === entries.length

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {entries.length === 0 ? (
          <p className="text-sm text-zinc-500 py-8 text-center">{t("empty")}</p>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <button
                type="button"
                className="hover:text-zinc-900"
                onClick={() => setSelected(allPicked ? new Set() : new Set(entries.map((e) => e.code)))}
              >
                {allPicked ? t("selectNone") : t("selectAll")}
              </button>
              <span>{t("selectedCount", { count: picked.length, total: entries.length })}</span>
            </div>
            <ul className="max-h-[50vh] overflow-y-auto -mx-1 divide-y divide-zinc-100">
              {entries.map((entry) => (
                <li key={entry.code}>
                  <label className="flex items-center gap-3 px-1 py-2.5 cursor-pointer hover:bg-zinc-50 rounded-md">
                    <Checkbox checked={selected.has(entry.code)} onCheckedChange={(on) => toggle(entry.code, on === true)} />
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
          </>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={entries.length === 0}
            onClick={() => {
              clearRecentOpens()
              handleOpenChange(false)
            }}
          >
            {t("clear")}
          </Button>
          <AddItemsToPlaylistDialog
            items={picked.map((e) => ({ videoCode: e.code, normalizedCode: e.code }))}
            defaultNewName={t("defaultPlaylistName")}
            source="recent"
            onDone={() => {
              forgetOpened(picked.map((e) => e.code))
              handleOpenChange(false)
            }}
            trigger={
              <Button type="button" className="flex-1" disabled={picked.length === 0}>
                <Plus className="h-4 w-4 mr-2" />
                {t("addCount", { count: picked.length })}
              </Button>
            }
          />
        </div>
        <p className="text-xs text-zinc-400">{t("privacy")}</p>
      </DialogContent>
    </Dialog>
  )
}

/** Floating reminder after opening codes from the site; hides once reviewed or dismissed. */
export function RecentOpensPrompt() {
  const t = useTranslations("RecentOpens")
  const recent = useRecentOpens()
  const saved = useSavedCodes()
  if (!recent) return null

  const pending = recent.entries.filter(
    (e) => !saved.has(e.code) && (!recent.dismissedAt || e.openedAt > recent.dismissedAt)
  )
  if (pending.length === 0) return null

  return (
    <div className="fixed z-40 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-6 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-6 flex items-center rounded-full bg-zinc-900 text-white shadow-lg pl-1 pr-1">
      <RecentOpensDialog
        trigger={
          <button className="flex items-center gap-2 pl-3 pr-2 h-10 text-sm font-medium whitespace-nowrap">
            <History className="h-4 w-4" />
            {t("prompt", { count: pending.length })}
          </button>
        }
      />
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
