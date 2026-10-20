"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useErrorText } from "@/i18n/use-error-text"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Search } from "lucide-react"
import { toast } from "sonner"
import {
  createPlaylist,
  restoreItemSnapshots,
  setCodePlaylists,
  useStore,
  type NewItem,
  type Playlist,
} from "@/lib/local-store"

interface SaveToPlaylistsDialogProps {
  item: NewItem
  /** Playlist the dialog was opened from; listed first and labeled */
  currentPlaylistId?: string
  trigger: React.ReactNode
}

/** Spotify-style "save to playlists": tick every playlist the code should be in. */
export function SaveToPlaylistsDialog({ item, currentPlaylistId, trigger }: SaveToPlaylistsDialogProps) {
  const store = useStore()
  const t = useTranslations("Playlist.saveTo")
  const tCommon = useTranslations("Common")
  const errorText = useErrorText()
  const [open, setOpen] = useState(false)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  // Order frozen when the dialog opens so rows don't jump around while ticking
  const [order, setOrder] = useState<string[]>([])
  const [query, setQuery] = useState("")
  const [newName, setNewName] = useState<string | null>(null)

  const playlists = store?.playlists ?? []
  const byId = new Map(playlists.map((p) => [p.id, p]))
  const contains = (p: Playlist) => p.items.some((i) => i.normalizedCode === item.normalizedCode)
  const initial = new Set(playlists.filter(contains).map((p) => p.id))
  const changed = playlists.filter((p) => initial.has(p.id) !== checked.has(p.id)).length

  const q = query.trim().toLowerCase()
  const rows = order
    .map((id) => byId.get(id))
    .filter((p): p is Playlist => !!p && (!q || p.name.toLowerCase().includes(q)))

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setChecked(initial)
      setQuery("")
      setNewName(null)
      // Current first, then playlists already holding the code, then most recently updated
      const rank = (p: Playlist) => (p.id === currentPlaylistId ? 0 : initial.has(p.id) ? 1 : 2)
      setOrder(
        [...playlists]
          .sort((a, b) => rank(a) - rank(b) || b.updatedAt.localeCompare(a.updatedAt))
          .map((p) => p.id)
      )
    }
    setOpen(next)
  }

  const toggle = (id: string, on: boolean) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Created right away (like Spotify) and already ticked, so "Done" has nothing left to do for it
      const playlist = createPlaylist({ name: newName ?? "", items: [item] })
      setOrder((prev) => [playlist.id, ...prev])
      setChecked((prev) => new Set(prev).add(playlist.id))
      setNewName(null)
      toast.success(t("created", { name: playlist.name }))
    } catch (error) {
      toast.error(errorText(error))
    }
  }

  const handleDone = () => {
    if (changed === 0) {
      setOpen(false)
      return
    }
    const snapshot = playlists.map((p) => ({ id: p.id, items: p.items }))
    try {
      const touched = setCodePlaylists(item, [...checked])
      const added = touched.filter((id) => checked.has(id)).length
      const removed = touched.length - added
      toast.success(t("updated", { code: item.normalizedCode, added, removed }), {
        action: {
          label: tCommon("undo"),
          onClick: () => restoreItemSnapshots(snapshot.filter((s) => touched.includes(s.id))),
        },
      })
      setOpen(false)
    } catch (error) {
      toast.error(errorText(error))
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[440px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t.rich("description", {
              code: item.normalizedCode,
              mono: (chunks) => (
                <code className="px-1.5 py-0.5 bg-zinc-100 text-zinc-800 rounded font-semibold">{chunks}</code>
              ),
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-3 space-y-2">
          {order.length > 6 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="pl-9 h-9 text-base sm:text-sm"
              />
            </div>
          )}

          {newName === null ? (
            <button
              type="button"
              onClick={() => setNewName("")}
              className="w-full flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100 transition-colors"
            >
              <span className="h-8 w-8 rounded-md border border-dashed border-zinc-300 flex items-center justify-center">
                <Plus className="h-4 w-4" />
              </span>
              {t("newPlaylist")}
            </button>
          ) : (
            <form onSubmit={handleCreate} className="flex gap-2">
              <Input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && (e.stopPropagation(), setNewName(null))}
                placeholder={t("newNamePlaceholder")}
                maxLength={100}
                className="h-9 text-base sm:text-sm"
              />
              <Button type="submit" size="sm" className="h-9" disabled={!newName.trim()}>
                {t("create")}
              </Button>
            </form>
          )}
        </div>

        <ul className="max-h-[50vh] overflow-y-auto border-y border-zinc-100 px-4 py-2">
          {rows.length === 0 ? (
            <li className="py-6 text-center text-sm text-zinc-500">{t("noMatch")}</li>
          ) : (
            rows.map((p) => {
              const id = `save-to-${p.id}`
              return (
                <li key={p.id}>
                  <label
                    htmlFor={id}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 cursor-pointer hover:bg-zinc-50 transition-colors"
                  >
                    <span className="h-8 w-8 shrink-0 rounded-md bg-zinc-100 text-zinc-600 text-xs font-semibold tabular-nums flex items-center justify-center">
                      {p.items.length}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-zinc-900 truncate">{p.name}</span>
                      {p.id === currentPlaylistId && (
                        <span className="block text-xs text-zinc-400">{t("current")}</span>
                      )}
                    </span>
                    <Checkbox
                      id={id}
                      checked={checked.has(p.id)}
                      onCheckedChange={(on) => toggle(p.id, on === true)}
                      className="h-5 w-5 rounded-full data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                    />
                  </label>
                </li>
              )
            })
          )}
        </ul>

        <div className="flex gap-3 px-6 py-4">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
            {tCommon("cancel")}
          </Button>
          <Button type="button" onClick={handleDone} className="flex-1">
            {changed > 0 ? t("doneCount", { count: changed }) : t("done")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
