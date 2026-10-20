"use client"

import { Button } from "@/components/ui/button"
import { Plus, Trash2, Copy, Link as LinkIcon, ListPlus } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { trackCopyCodes } from "@/lib/analytics"
import { LinkGeneratorPopover } from "@/components/link-generator-popover"
import { AddItemsToPlaylistDialog } from "@/components/add-items-to-playlist-dialog"
import type { PlaylistItem, SourceTemplate } from "@/lib/local-store"
import { cn } from "@/lib/utils"

interface SmartActionToolbarProps {
  playlistId: string
  allItems: PlaylistItem[]
  selectedItems: PlaylistItem[]
  templates: SourceTemplate[]
  onClearSelection: () => void
  onOpenAddDialog: () => void
  onDelete: () => void
}

export function SmartActionToolbar({
  playlistId,
  allItems,
  selectedItems,
  templates,
  onClearSelection,
  onOpenAddDialog,
  onDelete,
}: SmartActionToolbarProps) {
  const t = useTranslations("Playlist.toolbar")
  const tCommon = useTranslations("Common")
  const hasSelection = selectedItems.length > 0
  const targetItems = hasSelection ? selectedItems : allItems

  const handleCopyCodes = async () => {
    try {
      await navigator.clipboard.writeText(targetItems.map((item) => item.normalizedCode).join("\n"))
      trackCopyCodes({ item_count: targetItems.length, has_selection: hasSelection })
      toast.success(t("copiedCodes", { count: targetItems.length }))
    } catch {
      toast.error(tCommon("clipboardUnavailable"))
    }
  }

  // Phones: ≥40px tap targets; while selecting, actions get their own full-width row
  const actionClass = cn("h-10 min-w-10 px-3 sm:h-9", hasSelection && "flex-1 sm:flex-none")
  const countBadge = hasSelection && <span className="ml-1 text-xs text-zinc-500">({selectedItems.length})</span>

  return (
    // Sits just below the sticky navbar (h-16 + iOS status bar inset) instead of sliding under it
    <div className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-40 -mx-4 sm:mx-0 bg-white/95 backdrop-blur border-y sm:border sm:rounded-xl border-zinc-200 shadow-sm">
      <div className="px-4 sm:px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div
            className={cn(
              "flex items-center gap-2 text-sm font-medium text-black whitespace-nowrap",
              hasSelection && "w-full justify-between sm:w-auto sm:justify-start"
            )}
          >
            {hasSelection ? (
              <>
                <span>
                  {t.rich("selected", {
                    selected: selectedItems.length,
                    total: allItems.length,
                    b: (chunks) => <span className="font-bold">{chunks}</span>,
                    muted: (chunks) => <span className="text-zinc-500">{chunks}</span>,
                  })}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearSelection}
                  className="h-10 sm:h-8 px-3 -mr-3 sm:mr-0 text-xs text-zinc-600 hover:text-black"
                >
                  {t("clearSelection")}
                </Button>
              </>
            ) : (
              <span>
                {t.rich("codeCount", {
                  count: allItems.length,
                  b: (chunks) => <span className="font-bold">{chunks}</span>,
                  muted: (chunks) => <span className="text-zinc-500">{chunks}</span>,
                })}
              </span>
            )}
          </div>

          <div className={cn("flex flex-wrap items-center justify-end gap-2", hasSelection && "w-full sm:w-auto")}>
            {/* Make room for the selection actions on phones */}
            <Button
              size="sm"
              onClick={onOpenAddDialog}
              aria-label={t("add")}
              className={cn(actionClass, hasSelection && "hidden sm:inline-flex")}
            >
              <Plus className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">{t("add")}</span>
            </Button>

            {allItems.length > 0 && (
              <>
                <LinkGeneratorPopover
                  items={targetItems}
                  templates={templates}
                  trigger={
                    <Button variant="outline" size="sm" aria-label={t("generateLinks")} className={actionClass}>
                      <LinkIcon className="h-4 w-4 sm:mr-1.5" />
                      <span className="hidden sm:inline">{t("generateLinks")}</span>
                      {countBadge}
                    </Button>
                  }
                />

                <Button variant="outline" size="sm" onClick={handleCopyCodes} aria-label={t("copyCodes")} className={actionClass}>
                  <Copy className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">{t("copyCodes")}</span>
                  {countBadge}
                </Button>
              </>
            )}

            {hasSelection && (
              <AddItemsToPlaylistDialog
                items={selectedItems}
                defaultNewName=""
                source="playlist"
                fromPlaylist={{ id: playlistId, itemIds: selectedItems.map((item) => item.id) }}
                onDone={onClearSelection}
                trigger={
                  <Button variant="outline" size="sm" aria-label={t("addToPlaylist")} className={actionClass}>
                    <ListPlus className="h-4 w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">{t("addToPlaylist")}</span>
                  </Button>
                }
              />
            )}

            {hasSelection && (
              <>
                {/* Set the destructive action apart from copy/links */}
                <span aria-hidden className="h-6 w-px shrink-0 bg-zinc-200" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDelete}
                  aria-label={t("deleteSelected")}
                  className={cn(
                    actionClass,
                    "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-300 hover:text-red-800"
                  )}
                >
                  <Trash2 className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">{t("deleteCount", { count: selectedItems.length })}</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
