"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { SmartActionToolbar } from "./smart-action-toolbar"
import { PlaylistItemsTable } from "./playlist-items-table"
import { UnifiedAddVideosDialog } from "./unified-add-videos-dialog"
import { trackDeleteItems } from "@/lib/analytics"
import { deleteItems, restoreDeletedItems, useStore, type Playlist, type SourceTemplate } from "@/lib/local-store"

interface PlaylistPageClientProps {
  playlist: Playlist
  templates: SourceTemplate[]
}

export function PlaylistPageClient({ playlist, templates }: PlaylistPageClientProps) {
  const t = useTranslations("Playlist.page")
  const tCommon = useTranslations("Common")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showAddDialog, setShowAddDialog] = useState(false)

  const store = useStore()
  const items = playlist.items

  const otherPlaylistCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const other of store?.playlists ?? []) {
      if (other.id === playlist.id) continue
      for (const item of other.items) counts.set(item.normalizedCode, (counts.get(item.normalizedCode) ?? 0) + 1)
    }
    return counts
  }, [store, playlist.id])
  // Drop ids of items that no longer exist (e.g. deleted in another tab)
  const selectedItems = useMemo(() => items.filter((item) => selectedIds.has(item.id)), [items, selectedIds])

  const removeItems = (ids: string[]) => {
    // Keep only what this delete removed, so undo can't revert later edits
    const idSet = new Set(ids)
    const removed = items.flatMap((item, index) => (idSet.has(item.id) ? [{ item, index }] : []))
    deleteItems(playlist.id, ids)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.delete(id))
      return next
    })
    trackDeleteItems({ playlist_id: playlist.id, item_count: ids.length })
    toast.success(t("deletedItems", { count: ids.length }), {
      action: { label: tCommon("undo"), onClick: () => restoreDeletedItems(playlist.id, removed) },
    })
  }

  return (
    <>
      <SmartActionToolbar
        allItems={items}
        playlistId={playlist.id}
        selectedItems={selectedItems}
        templates={templates}
        onClearSelection={() => setSelectedIds(new Set())}
        onOpenAddDialog={() => setShowAddDialog(true)}
        onDelete={() => removeItems(selectedItems.map((item) => item.id))}
      />

      <PlaylistItemsTable
        playlistId={playlist.id}
        items={items}
        templates={templates}
        selectedIds={selectedIds}
        otherPlaylistCounts={otherPlaylistCounts}
        onSelectedIdsChange={setSelectedIds}
        onDeleteItem={(id) => removeItems([id])}
        onOpenAddDialog={() => setShowAddDialog(true)}
      />

      <UnifiedAddVideosDialog
        playlistId={playlist.id}
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        existingItems={items}
      />
    </>
  )
}
