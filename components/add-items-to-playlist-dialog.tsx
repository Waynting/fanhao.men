"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { useErrorText } from "@/i18n/use-error-text"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowRightLeft, Plus } from "lucide-react"
import { toast } from "sonner"
import {
  addItems,
  createPlaylist,
  deleteItems,
  deletePlaylist,
  moveItems,
  restoreItems,
  restoreItemSnapshots,
  useStore,
  type NewItem,
} from "@/lib/local-store"
import { trackAddFromSharedPlaylist } from "@/lib/analytics"

const NEW_PLAYLIST = "__new__"

interface AddItemsToPlaylistDialogProps {
  items: NewItem[]
  defaultNewName: string
  trigger: React.ReactNode
  /** Where the items came from, for analytics */
  source?: "share" | "explore" | "playlist"
  /** Set when copying out of one of the user's own playlists: hides it as a target and offers "move" */
  fromPlaylist?: { id: string; itemIds: string[] }
  onDone?: () => void
}

export function AddItemsToPlaylistDialog({
  items,
  defaultNewName,
  trigger,
  source = "share",
  fromPlaylist,
  onDone,
}: AddItemsToPlaylistDialogProps) {
  const store = useStore()
  const router = useRouter()
  const t = useTranslations("Playlist.saveDialog")
  const tCommon = useTranslations("Common")
  const errorText = useErrorText()
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState<string>(NEW_PLAYLIST)
  const [newName, setNewName] = useState(defaultNewName)
  const [move, setMove] = useState(false)

  const playlists = (store?.playlists ?? []).filter((p) => p.id !== fromPlaylist?.id)
  const targetPlaylist = playlists.find((p) => p.id === target)
  const existing = new Set(targetPlaylist?.items.map((i) => i.normalizedCode))
  const newCount = items.filter((i) => !existing.has(i.normalizedCode)).length

  const handleOpenChange = (next: boolean) => {
    if (next) {
      // From an own playlist, the usual move is into another existing one
      const recent = fromPlaylist && [...playlists].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
      setTarget(recent ? recent.id : NEW_PLAYLIST)
      setNewName(defaultNewName)
      setMove(false)
    }
    setOpen(next)
  }

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (fromPlaylist && move) {
        handleMove(fromPlaylist)
        return
      }
      if (target === NEW_PLAYLIST) {
        const playlist = createPlaylist({ name: newName, items })
        trackAddFromSharedPlaylist({ source_playlist_id: source, target_playlist_id: playlist.id, item_count: items.length })
        toast.success(t("created", { name: playlist.name, count: playlist.items.length }), {
          action: { label: t("view"), onClick: () => router.push(`/playlist/${playlist.id}`) },
        })
      } else {
        const count = addItems(target, items)
        trackAddFromSharedPlaylist({ source_playlist_id: source, target_playlist_id: target, item_count: count })
        const skipped = items.length - count
        toast.success(skipped > 0 ? t("addedSkipped", { count, skipped }) : t("added", { count }), {
          action: { label: t("view"), onClick: () => router.push(`/playlist/${target}`) },
        })
      }
      setOpen(false)
      onDone?.()
    } catch (error) {
      toast.error(errorText(error))
    }
  }

  const handleMove = (from: { id: string; itemIds: string[] }) => {
    const all = store?.playlists ?? []
    const fromSnapshot = all.find((p) => p.id === from.id)?.items ?? []
    if (target === NEW_PLAYLIST) {
      const playlist = createPlaylist({ name: newName, items })
      deleteItems(from.id, from.itemIds)
      trackAddFromSharedPlaylist({ source_playlist_id: source, target_playlist_id: playlist.id, item_count: items.length })
      toast.success(t("movedToNew", { name: playlist.name, count: playlist.items.length }), {
        action: {
          label: tCommon("undo"),
          onClick: () => {
            deletePlaylist(playlist.id)
            restoreItems(from.id, fromSnapshot)
          },
        },
      })
    } else {
      const targetSnapshot = targetPlaylist?.items ?? []
      const count = moveItems(from.id, from.itemIds, target)
      trackAddFromSharedPlaylist({ source_playlist_id: source, target_playlist_id: target, item_count: count })
      toast.success(t("moved", { count: from.itemIds.length, name: targetPlaylist?.name ?? "" }), {
        action: {
          label: tCommon("undo"),
          onClick: () =>
            restoreItemSnapshots([
              { id: from.id, items: fromSnapshot },
              { id: target, items: targetSnapshot },
            ]),
        },
      })
    }
    setOpen(false)
    onDone?.()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{fromPlaylist ? t("titleFromPlaylist") : t("title")}</DialogTitle>
          <DialogDescription>{t("description", { count: items.length })}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAdd} className="space-y-5 mt-2">
          <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 flex flex-wrap gap-1.5">
            {items.slice(0, 6).map((item) => (
              <code key={item.normalizedCode} className="px-2 py-0.5 bg-white border border-zinc-300 rounded text-xs font-semibold">
                {item.normalizedCode}
              </code>
            ))}
            {items.length > 6 && <span className="px-2 py-0.5 text-xs text-zinc-500">+{items.length - 6}</span>}
          </div>

          <div className="space-y-2">
            <Label>{t("target")}</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NEW_PLAYLIST}>{t("newPlaylist")}</SelectItem>
                {playlists.map((playlist) => (
                  <SelectItem key={playlist.id} value={playlist.id}>
                    {t("playlistOption", { name: playlist.name, count: playlist.items.length })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {target === NEW_PLAYLIST ? (
            <div className="space-y-2">
              <Label htmlFor="new-playlist-name">{t("newName")}</Label>
              <Input
                id="new-playlist-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={100}
                required
              />
            </div>
          ) : (
            newCount < items.length && (
              <p className="text-xs text-amber-700">
                {t(move ? "skipNoticeMove" : "skipNotice", {
                  count: items.length - newCount,
                  name: targetPlaylist?.name ?? "",
                })}
              </p>
            )
          )}

          {fromPlaylist && (
            <label className="flex items-start gap-3 rounded-lg border border-zinc-200 p-3 cursor-pointer hover:bg-zinc-50">
              <Checkbox checked={move} onCheckedChange={(on) => setMove(on === true)} className="mt-0.5" />
              <span>
                <span className="block text-sm font-medium text-zinc-900">{t("moveLabel")}</span>
                <span className="block text-xs text-zinc-500 mt-0.5">{t("moveHint")}</span>
              </span>
            </label>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              {tCommon("cancel")}
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={target === NEW_PLAYLIST ? !newName.trim() : newCount === 0 && !move}
            >
              {move ? <ArrowRightLeft className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              {move
                ? t("moveCount", { count: items.length })
                : target === NEW_PLAYLIST
                  ? t("createAndAdd")
                  : t("addCount", { count: newCount })}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
