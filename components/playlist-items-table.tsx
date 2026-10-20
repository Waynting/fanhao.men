"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Trash2, ListVideo, Search, Link as LinkIcon, Plus, X, ListPlus, ListChecks } from "lucide-react"
import { Input } from "@/components/ui/input"
import { EditNoteDialog } from "@/components/edit-note-dialog"
import { LinkGeneratorPopover } from "@/components/link-generator-popover"
import { SaveToPlaylistsDialog } from "@/components/save-to-playlists-dialog"
import type { PlaylistItem, SourceTemplate } from "@/lib/local-store"

interface PlaylistItemsTableProps {
  playlistId: string
  items: PlaylistItem[]
  templates: SourceTemplate[]
  selectedIds: Set<string>
  /** normalizedCode → number of other playlists that also contain it */
  otherPlaylistCounts: Map<string, number>
  onSelectedIdsChange: (ids: Set<string>) => void
  onDeleteItem: (itemId: string) => void
  onOpenAddDialog: () => void
}

export function PlaylistItemsTable({
  playlistId,
  items,
  templates,
  selectedIds,
  otherPlaylistCounts,
  onSelectedIdsChange,
  onDeleteItem,
  onOpenAddDialog,
}: PlaylistItemsTableProps) {
  const t = useTranslations("Playlist.table")
  const [searchQuery, setSearchQuery] = useState("")

  const query = searchQuery.trim().toLowerCase()
  const filteredItems = query
    ? items.filter(
        (item) =>
          item.normalizedCode.toLowerCase().includes(query) ||
          item.videoCode.toLowerCase().includes(query) ||
          item.note?.toLowerCase().includes(query)
      )
    : items

  const isAllSelected = filteredItems.length > 0 && filteredItems.every((item) => selectedIds.has(item.id))

  const handleSelectAll = (checked: boolean) => {
    const next = new Set(selectedIds)
    filteredItems.forEach((item) => (checked ? next.add(item.id) : next.delete(item.id)))
    onSelectedIdsChange(next)
  }

  const handleSelectItem = (itemId: string, checked: boolean) => {
    const next = new Set(selectedIds)
    if (checked) next.add(itemId)
    else next.delete(itemId)
    onSelectedIdsChange(next)
  }

  if (items.length === 0) {
    return (
      <div className="bg-white border border-zinc-200/80 rounded-xl py-12 px-6 text-center">
        <ListVideo className="h-10 w-10 sm:h-12 sm:w-12 text-zinc-300 mx-auto mb-6" strokeWidth={1.5} />
        <h3 className="text-lg sm:text-xl font-semibold text-zinc-800 mb-2">{t("emptyTitle")}</h3>
        <p className="text-sm sm:text-base text-zinc-600 mb-6 max-w-md mx-auto leading-relaxed">
          {t("emptyDescription")}
        </p>
        <Button onClick={onOpenAddDialog}>
          <Plus className="h-4 w-4 mr-2" />
          {t("addCodes")}
        </Button>
        <div className="flex flex-wrap gap-2 justify-center mt-6 text-xs text-zinc-500 items-center">
          {t("example")}
          {["SSIS-123", "ipx920", "fc2ppv1234567"].map((code) => (
            <code key={code} className="px-2.5 py-1 bg-zinc-100 text-zinc-800 rounded-lg font-medium">
              {code}
            </code>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-zinc-200/80 rounded-xl overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-zinc-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-20 text-base"
          />
          {query && (
            <div className="absolute right-0 sm:right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <span className="text-xs text-zinc-500">
                {filteredItems.length}/{items.length}
              </span>
              <button
                onClick={() => setSearchQuery("")}
                className="flex h-10 w-10 items-center justify-center rounded hover:bg-zinc-100 sm:h-auto sm:w-auto sm:p-1"
                aria-label={t("clearSearch")}
              >
                <X className="h-3.5 w-3.5 text-zinc-500" />
              </button>
            </div>
          )}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-12 px-4">
          <Search className="h-10 w-10 text-zinc-300 mx-auto mb-4" />
          <h3 className="text-base sm:text-lg font-semibold text-black mb-2">{t("noMatchTitle")}</h3>
          <p className="text-sm text-zinc-600">{t("noMatchDescription", { query: searchQuery })}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50 hover:bg-zinc-50">
                <TableHead className="w-11 sm:w-14 p-0">
                  {/* The label is the hit area (44px on phones) so the 16px box stays visually small */}
                  <label className="flex h-12 w-full items-center justify-center cursor-pointer">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={(checked) => handleSelectAll(checked === true)}
                      aria-label={t("selectAll")}
                    />
                  </label>
                </TableHead>
                <TableHead className="w-10 font-semibold text-xs sm:text-sm hidden sm:table-cell">#</TableHead>
                <TableHead className="px-2 sm:px-4 font-semibold text-xs sm:text-sm">{t("colCode")}</TableHead>
                <TableHead className="font-semibold text-xs sm:text-sm hidden md:table-cell">{t("colNote")}</TableHead>
                <TableHead className="sm:w-40 font-semibold text-xs sm:text-sm text-right pr-1 sm:pr-4">{t("colActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item, index) => {
                const isSelected = selectedIds.has(item.id)
                const showOriginal = item.videoCode && item.videoCode !== item.normalizedCode
                const otherCount = otherPlaylistCounts.get(item.normalizedCode) ?? 0
                return (
                  <TableRow key={item.id} className={isSelected ? "bg-zinc-100 hover:bg-zinc-200" : "hover:bg-zinc-50"}>
                    <TableCell className="p-0">
                      <label className="flex h-12 w-full min-w-11 items-center justify-center cursor-pointer">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectItem(item.id, checked === true)}
                          aria-label={t("select", { code: item.normalizedCode })}
                        />
                      </label>
                    </TableCell>
                    <TableCell className="text-zinc-500 font-mono text-xs sm:text-sm hidden sm:table-cell">
                      {index + 1}
                    </TableCell>
                    <TableCell className="px-2 sm:px-4">
                      <code className="px-2 sm:px-2.5 py-1 bg-zinc-100 text-zinc-800 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap">
                        {item.normalizedCode}
                      </code>
                      {showOriginal && (
                        <div className="text-[11px] text-zinc-400 font-mono mt-1 truncate max-w-[180px]" title={item.videoCode}>
                          {t("originalInput", { code: item.videoCode })}
                        </div>
                      )}
                      {item.note && (
                        <div className="md:hidden text-xs text-zinc-600 mt-1 line-clamp-2">{item.note}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-600 hidden md:table-cell max-w-xs">
                      <span className="line-clamp-2">{item.note || <span className="text-zinc-400">—</span>}</span>
                    </TableCell>
                    <TableCell className="pl-0 pr-1 sm:p-4">
                      <div className="flex items-center justify-end gap-0.5">
                        <LinkGeneratorPopover
                          items={[item]}
                          templates={templates}
                          trigger={
                            <Button variant="ghost" size="sm" className="h-10 w-9 sm:h-9 sm:w-9 p-0" aria-label={t("generateLinks")}>
                              <LinkIcon className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <SaveToPlaylistsDialog
                          item={item}
                          currentPlaylistId={playlistId}
                          trigger={
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`relative h-10 w-9 sm:h-9 sm:w-9 p-0 ${otherCount > 0 ? "text-emerald-600 hover:text-emerald-700" : ""}`}
                              aria-label={
                                otherCount > 0
                                  ? t("saveToWithCount", { code: item.normalizedCode, count: otherCount })
                                  : t("saveTo", { code: item.normalizedCode })
                              }
                              title={otherCount > 0 ? t("inOtherPlaylists", { count: otherCount }) : t("saveToTitle")}
                            >
                              {otherCount > 0 ? <ListChecks className="h-4 w-4" /> : <ListPlus className="h-4 w-4" />}
                              {otherCount > 0 && (
                                <span className="absolute top-0.5 right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-semibold leading-[14px] tabular-nums">
                                  {otherCount}
                                </span>
                              )}
                            </Button>
                          }
                        />
                        <EditNoteDialog
                          playlistId={playlistId}
                          itemId={item.id}
                          videoCode={item.normalizedCode}
                          currentNote={item.note}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteItem(item.id)}
                          aria-label={t("deleteItem", { code: item.normalizedCode })}
                          className="hover:bg-red-50 hover:text-red-600 h-10 w-9 sm:h-9 sm:w-9 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
