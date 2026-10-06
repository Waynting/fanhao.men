"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { SmartActionToolbar } from "./smart-action-toolbar"
import { PlaylistItemsTable } from "./playlist-items-table"
import { UnifiedAddVideosDialog } from "./unified-add-videos-dialog"
import { trackDeleteItems } from "@/lib/analytics"
import { deleteItems, restoreItems, type Playlist, type SourceTemplate } from "@/lib/local-store"

interface PlaylistPageClientProps {
  playlist: Playlist
  templates: SourceTemplate[]
}

export function PlaylistPageClient({ playlist, templates }: PlaylistPageClientProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showAddDialog, setShowAddDialog] = useState(false)

  const items = playlist.items
  // Drop ids of items that no longer exist (e.g. deleted in another tab)
  const selectedItems = useMemo(() => items.filter((item) => selectedIds.has(item.id)), [items, selectedIds])

  const removeItems = (ids: string[]) => {
    const snapshot = items
    deleteItems(playlist.id, ids)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.delete(id))
      return next
    })
    trackDeleteItems({ playlist_id: playlist.id, item_count: ids.length })
    toast.success(`已刪除 ${ids.length} 個番號`, {
      action: { label: "復原", onClick: () => restoreItems(playlist.id, snapshot) },
    })
  }

  return (
    <>
      <SmartActionToolbar
        allItems={items}
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
