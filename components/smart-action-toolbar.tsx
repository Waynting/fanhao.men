"use client"

import { Button } from "@/components/ui/button"
import { Plus, Trash2, Copy, Link as LinkIcon } from "lucide-react"
import { toast } from "sonner"
import { trackCopyCodes } from "@/lib/analytics"
import { LinkGeneratorPopover } from "@/components/link-generator-popover"
import type { PlaylistItem, SourceTemplate } from "@/lib/local-store"

interface SmartActionToolbarProps {
  allItems: PlaylistItem[]
  selectedItems: PlaylistItem[]
  templates: SourceTemplate[]
  onClearSelection: () => void
  onOpenAddDialog: () => void
  onDelete: () => void
}

export function SmartActionToolbar({
  allItems,
  selectedItems,
  templates,
  onClearSelection,
  onOpenAddDialog,
  onDelete,
}: SmartActionToolbarProps) {
  const hasSelection = selectedItems.length > 0
  const targetItems = hasSelection ? selectedItems : allItems

  const handleCopyCodes = async () => {
    try {
      await navigator.clipboard.writeText(targetItems.map((item) => item.normalizedCode).join("\n"))
      trackCopyCodes({ item_count: targetItems.length, has_selection: hasSelection })
      toast.success(`已複製 ${targetItems.length} 個番號`)
    } catch {
      toast.error("無法存取剪貼簿")
    }
  }

  return (
    // Sits just below the sticky navbar (h-16) instead of sliding under it
    <div className="sticky top-16 z-40 -mx-4 sm:mx-0 bg-white/95 backdrop-blur border-y sm:border sm:rounded-xl border-gray-200 shadow-sm">
      <div className="px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-black whitespace-nowrap">
            {hasSelection ? (
              <>
                <span>
                  已選 <span className="font-bold">{selectedItems.length}</span>
                  <span className="text-gray-500"> / {allItems.length}</span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearSelection}
                  className="h-7 px-2 text-xs text-gray-600 hover:text-black"
                >
                  取消選取
                </Button>
              </>
            ) : (
              <span>
                <span className="font-bold">{allItems.length}</span>
                <span className="text-gray-500 ml-1">個番號</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={onOpenAddDialog}>
              <Plus className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">新增</span>
            </Button>

            {allItems.length > 0 && (
              <>
                <LinkGeneratorPopover
                  items={targetItems}
                  templates={templates}
                  trigger={
                    <Button variant="outline" size="sm" aria-label="產生連結">
                      <LinkIcon className="h-4 w-4 sm:mr-1.5" />
                      <span className="hidden sm:inline">產生連結</span>
                      {hasSelection && <span className="ml-1 text-xs text-gray-500">({selectedItems.length})</span>}
                    </Button>
                  }
                />

                <Button variant="outline" size="sm" onClick={handleCopyCodes} aria-label="複製番號">
                  <Copy className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">複製番號</span>
                  {hasSelection && <span className="ml-1 text-xs text-gray-500">({selectedItems.length})</span>}
                </Button>
              </>
            )}

            {hasSelection && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                aria-label="刪除選取"
                className="text-red-600 hover:bg-red-50 hover:border-red-300"
              >
                <Trash2 className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">刪除 ({selectedItems.length})</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
