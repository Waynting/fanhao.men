"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { addItems, createPlaylist, useStore, type NewItem } from "@/lib/local-store"
import { trackAddFromSharedPlaylist } from "@/lib/analytics"

const NEW_PLAYLIST = "__new__"

interface AddItemsToPlaylistDialogProps {
  items: NewItem[]
  defaultNewName: string
  trigger: React.ReactNode
  /** Where the items came from, for analytics */
  source?: "share" | "explore"
}

export function AddItemsToPlaylistDialog({ items, defaultNewName, trigger, source = "share" }: AddItemsToPlaylistDialogProps) {
  const store = useStore()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState<string>(NEW_PLAYLIST)
  const [newName, setNewName] = useState(defaultNewName)

  const playlists = store?.playlists ?? []
  const targetPlaylist = playlists.find((p) => p.id === target)
  const existing = new Set(targetPlaylist?.items.map((i) => i.normalizedCode))
  const newCount = items.filter((i) => !existing.has(i.normalizedCode)).length

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setTarget(NEW_PLAYLIST)
      setNewName(defaultNewName)
    }
    setOpen(next)
  }

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (target === NEW_PLAYLIST) {
        const playlist = createPlaylist({ name: newName, items })
        trackAddFromSharedPlaylist({ source_playlist_id: source, target_playlist_id: playlist.id, item_count: items.length })
        toast.success(`已建立「${playlist.name}」，共 ${playlist.items.length} 個番號`, {
          action: { label: "查看", onClick: () => router.push(`/playlist/${playlist.id}`) },
        })
      } else {
        const count = addItems(target, items)
        trackAddFromSharedPlaylist({ source_playlist_id: source, target_playlist_id: target, item_count: count })
        const skipped = items.length - count
        toast.success(`已加入 ${count} 個番號${skipped > 0 ? `，略過 ${skipped} 個重複` : ""}`, {
          action: { label: "查看", onClick: () => router.push(`/playlist/${target}`) },
        })
      }
      setOpen(false)
    } catch (error: any) {
      toast.error(error.message || "加入失敗")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>存到我的清單</DialogTitle>
          <DialogDescription>將 {items.length} 個番號存到這台裝置</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAdd} className="space-y-5 mt-2">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex flex-wrap gap-1.5">
            {items.slice(0, 6).map((item) => (
              <code key={item.normalizedCode} className="px-2 py-0.5 bg-white border border-gray-300 rounded text-xs font-semibold">
                {item.normalizedCode}
              </code>
            ))}
            {items.length > 6 && <span className="px-2 py-0.5 text-xs text-gray-500">+{items.length - 6}</span>}
          </div>

          <div className="space-y-2">
            <Label>目標清單</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NEW_PLAYLIST}>＋ 建立新清單</SelectItem>
                {playlists.map((playlist) => (
                  <SelectItem key={playlist.id} value={playlist.id}>
                    {playlist.name}（{playlist.items.length}）
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {target === NEW_PLAYLIST ? (
            <div className="space-y-2">
              <Label htmlFor="new-playlist-name">新清單名稱</Label>
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
                其中 {items.length - newCount} 個已在「{targetPlaylist?.name}」中，將會略過。
              </p>
            )
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              取消
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={target === NEW_PLAYLIST ? !newName.trim() : newCount === 0}
            >
              <Plus className="h-4 w-4 mr-2" />
              {target === NEW_PLAYLIST ? "建立並加入" : `加入 ${newCount} 個`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
