"use client"

import { useState } from "react"
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
import { Trash2, ListVideo, Search, Link as LinkIcon, Plus, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { EditNoteDialog } from "@/components/edit-note-dialog"
import { LinkGeneratorPopover } from "@/components/link-generator-popover"
import type { PlaylistItem, SourceTemplate } from "@/lib/local-store"

interface PlaylistItemsTableProps {
  playlistId: string
  items: PlaylistItem[]
  templates: SourceTemplate[]
  selectedIds: Set<string>
  onSelectedIdsChange: (ids: Set<string>) => void
  onDeleteItem: (itemId: string) => void
  onOpenAddDialog: () => void
}

export function PlaylistItemsTable({
  playlistId,
  items,
  templates,
  selectedIds,
  onSelectedIdsChange,
  onDeleteItem,
  onOpenAddDialog,
}: PlaylistItemsTableProps) {
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
        <h3 className="text-lg sm:text-xl font-semibold text-zinc-800 mb-2">清單還是空的</h3>
        <p className="text-sm sm:text-base text-gray-600 mb-6 max-w-md mx-auto leading-relaxed">
          可以輸入番號或貼上影片網址，一次一個或整批貼上都可以。
        </p>
        <Button onClick={onOpenAddDialog}>
          <Plus className="h-4 w-4 mr-2" />
          新增番號
        </Button>
        <div className="flex flex-wrap gap-2 justify-center mt-6 text-xs text-gray-500 items-center">
          例如：
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜尋番號或註記..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-20 text-base"
          />
          {query && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <span className="text-xs text-gray-500">
                {filteredItems.length}/{items.length}
              </span>
              <button
                onClick={() => setSearchQuery("")}
                className="p-1 rounded hover:bg-zinc-100"
                aria-label="清除搜尋"
              >
                <X className="h-3.5 w-3.5 text-gray-500" />
              </button>
            </div>
          )}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-12 px-4">
          <Search className="h-10 w-10 text-gray-300 mx-auto mb-4" />
          <h3 className="text-base sm:text-lg font-semibold text-black mb-2">找不到符合的番號</h3>
          <p className="text-sm text-gray-600">沒有符合「{searchQuery}」的結果</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50">
                <TableHead className="w-10 sm:w-14">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={(checked) => handleSelectAll(checked === true)}
                    aria-label="全選"
                    className="mx-auto"
                  />
                </TableHead>
                <TableHead className="w-10 font-semibold text-xs sm:text-sm hidden sm:table-cell">#</TableHead>
                <TableHead className="font-semibold text-xs sm:text-sm">番號</TableHead>
                <TableHead className="font-semibold text-xs sm:text-sm hidden md:table-cell">註記</TableHead>
                <TableHead className="w-28 sm:w-32 font-semibold text-xs sm:text-sm text-right pr-4">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item, index) => {
                const isSelected = selectedIds.has(item.id)
                const showOriginal = item.videoCode && item.videoCode !== item.normalizedCode
                return (
                  <TableRow key={item.id} className={isSelected ? "bg-gray-100 hover:bg-gray-200" : "hover:bg-gray-50"}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectItem(item.id, checked === true)}
                        aria-label={`選取 ${item.normalizedCode}`}
                        className="mx-auto"
                      />
                    </TableCell>
                    <TableCell className="text-gray-500 font-mono text-xs sm:text-sm hidden sm:table-cell">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <code className="px-2 sm:px-2.5 py-1 bg-zinc-100 text-zinc-800 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap">
                        {item.normalizedCode}
                      </code>
                      {showOriginal && (
                        <div className="text-[11px] text-zinc-400 font-mono mt-1 truncate max-w-[180px]" title={item.videoCode}>
                          原始輸入：{item.videoCode}
                        </div>
                      )}
                      {item.note && (
                        <div className="md:hidden text-xs text-gray-600 mt-1 line-clamp-2">{item.note}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 hidden md:table-cell max-w-xs">
                      <span className="line-clamp-2">{item.note || <span className="text-gray-400">—</span>}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-0.5">
                        <LinkGeneratorPopover
                          items={[item]}
                          templates={templates}
                          trigger={
                            <Button variant="ghost" size="sm" className="h-8 w-8 sm:h-9 sm:w-9 p-0" aria-label="產生連結">
                              <LinkIcon className="h-4 w-4" />
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
                          aria-label={`刪除 ${item.normalizedCode}`}
                          className="hover:bg-red-50 hover:text-red-600 h-8 w-8 sm:h-9 sm:w-9 p-0"
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
