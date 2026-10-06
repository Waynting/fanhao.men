"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { addItems } from "@/lib/local-store"
import { trackAddItems } from "@/lib/analytics"
import { toast } from "sonner"
import { Plus, ListPlus, CheckCircle2, XCircle } from "lucide-react"
import {
  parseVideoInput,
  parseMultipleInputs,
  getParseStats,
  type ParseResult
} from "@/lib/url-parser"

type Mode = "single" | "bulk"

interface UnifiedAddVideosDialogProps {
  playlistId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  existingItems: Array<{ normalizedCode: string }>
}

export function UnifiedAddVideosDialog({
  playlistId,
  open,
  onOpenChange,
  existingItems,
}: UnifiedAddVideosDialogProps) {
  const [mode, setMode] = useState<Mode>("single")
  const [input, setInput] = useState("")
  const [singleResult, setSingleResult] = useState<ParseResult | null>(null)
  const [bulkResults, setBulkResults] = useState<ParseResult[]>([])

  // Smart mode detection based on input
  useEffect(() => {
    const lines = input.split('\n').filter(line => line.trim().length > 0)

    if (lines.length > 1 && mode === "single") {
      // Auto-switch to bulk if multiple lines detected
      setMode("bulk")
    }
  }, [input, mode])

  // Parse input in real-time with duplicate checking
  useEffect(() => {
    if (!input.trim()) {
      setSingleResult(null)
      setBulkResults([])
      return
    }

    // Create a Set of existing normalized codes for fast lookup
    const existingCodes = new Set(existingItems.map(item => item.normalizedCode))

    if (mode === "single") {
      const result = parseVideoInput(input)
      // Check if it's a duplicate
      if (result.success && result.normalizedCode && existingCodes.has(result.normalizedCode)) {
        result.isDuplicate = true
      }
      setSingleResult(result)
    } else {
      const results = parseMultipleInputs(input)
      // Mark duplicates in bulk results
      results.forEach(result => {
        if (!result.success || !result.normalizedCode) return
        // Duplicate if already in the playlist or repeated earlier in this paste
        if (existingCodes.has(result.normalizedCode)) result.isDuplicate = true
        existingCodes.add(result.normalizedCode)
      })
      setBulkResults(results)
    }
  }, [input, mode, existingItems])

  // Reset on close
  useEffect(() => {
    if (!open) {
      setInput("")
      setMode("single")
      setSingleResult(null)
      setBulkResults([])
    }
  }, [open])

  const stats = getParseStats(bulkResults)

  const toNewItem = (r: ParseResult) => ({
    // Keep what the user typed (code part of a URL, or the raw code) alongside the normalized form
    videoCode: r.code ?? r.originalInput.trim(),
    normalizedCode: r.normalizedCode!,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (mode === "single") {
        if (!singleResult?.success) {
          toast.error(singleResult?.error || "格式不正確")
          return
        }
        if (singleResult.isDuplicate) {
          toast.error("這個番號已經在清單中")
          return
        }
        addItems(playlistId, [toNewItem(singleResult)])
        trackAddItems({ playlist_id: playlistId, item_count: 1, method: singleResult.source === "url" ? "url_parse" : "single" })
        toast.success(`已加入 ${singleResult.normalizedCode}`)
      } else {
        if (stats.successful === 0) {
          toast.error("沒有可加入的有效番號")
          return
        }
        const count = addItems(
          playlistId,
          bulkResults.filter((r) => r.success && !r.isDuplicate).map(toNewItem)
        )
        trackAddItems({ playlist_id: playlistId, item_count: count, method: "bulk" })
        const parts = [`已加入 ${count} 個番號`]
        if (stats.duplicates > 0) parts.push(`略過 ${stats.duplicates} 個重複`)
        if (stats.failed > 0) parts.push(`${stats.failed} 個無法辨識`)
        toast.success(parts.join("，"))
      }
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || "加入失敗")
    }
  }

  const isValid = mode === "single"
    ? (singleResult?.success && !singleResult?.isDuplicate)
    : stats.successful > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">新增番號</DialogTitle>
            {/* Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setMode("single")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  mode === "single"
                    ? "bg-white text-black shadow-sm"
                    : "text-gray-600 hover:text-black"
                }`}
              >
                <Plus className="h-3 w-3 inline mr-1" />
                單筆
              </button>
              <button
                type="button"
                onClick={() => setMode("bulk")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  mode === "bulk"
                    ? "bg-white text-black shadow-sm"
                    : "text-gray-600 hover:text-black"
                }`}
              >
                <ListPlus className="h-3 w-3 inline mr-1" />
                批次
              </button>
            </div>
          </div>
          <DialogDescription>
            {mode === "single"
              ? "輸入番號或貼上影片網址"
              : "一行一個番號或網址，可直接整批貼上"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <Textarea
              id="video-input"
              placeholder={
                mode === "single"
                  ? "SSIS-123、fc2ppv1234567 或網址..."
                  : "SSIS-123\nIPX-920\nFC2-PPV-1234567\n..."
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={mode === "single" ? 3 : 10}
              autoFocus
              required
                            className={`border-gray-300 focus:border-black focus:ring-black transition-all ${
                mode === "bulk" ? "font-mono text-sm" : ""
              }`}
            />

            {/* Real-time Preview */}
            {mode === "single" && singleResult && (
              <div className="text-sm">
                {singleResult.success ? (
                  singleResult.isDuplicate ? (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-300 rounded-lg">
                      <XCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-amber-900 mb-1">⚠️ 已在清單中</p>
                        <code className="font-mono font-semibold text-amber-900">
                          {singleResult.normalizedCode}
                        </code>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-green-700 mb-1">
                          {singleResult.source === 'url' ? '✓ 已從網址擷取' : '✓ 格式正確'}
                        </p>
                        <code className="font-mono font-semibold text-green-900">
                          {singleResult.normalizedCode}
                        </code>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-red-900 mb-1">無法辨識</p>
                      <p className="text-xs text-red-700">{singleResult.error}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bulk Stats */}
            {mode === "bulk" && bulkResults.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm flex-wrap">
                  {stats.successful > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-100 border border-green-300 rounded-md">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-700" />
                      <span className="font-semibold text-green-900">{stats.successful} 個有效</span>
                    </div>
                  )}
                  {stats.duplicates > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 border border-amber-300 rounded-md">
                      <XCircle className="h-3.5 w-3.5 text-amber-700" />
                      <span className="text-amber-900">{stats.duplicates} 個重複</span>
                    </div>
                  )}
                  {stats.failed > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-100 border border-red-300 rounded-md">
                      <XCircle className="h-3.5 w-3.5 text-red-700" />
                      <span className="text-red-900">{stats.failed} 個無法辨識</span>
                    </div>
                  )}
                </div>

                {/* Show duplicate items if any */}
                {stats.duplicates > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs font-medium text-amber-900 mb-2">
                      ⚠️ {stats.duplicates} 個番號重複，將略過
                    </p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {bulkResults
                        .filter(r => r.isDuplicate)
                        .slice(0, 5)
                        .map((r, i) => (
                          <div key={i} className="text-xs font-mono text-amber-800 bg-white px-2 py-1 rounded border border-amber-200 truncate">
                            {r.normalizedCode}
                          </div>
                        ))}
                      {stats.duplicates > 5 && (
                        <p className="text-xs text-amber-700 pt-1">
                          還有 {stats.duplicates - 5} 個...
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Show failed items if any */}
                {stats.failed > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs font-medium text-red-900 mb-2">
                      {stats.failed} 行無法辨識
                    </p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {bulkResults
                        .filter(r => !r.success)
                        .slice(0, 5)
                        .map((r, i) => (
                          <div key={i} className="text-xs font-mono text-red-800 bg-white px-2 py-1 rounded border border-red-200 truncate">
                            {r.originalInput}
                          </div>
                        ))}
                      {stats.failed > 5 && (
                        <p className="text-xs text-red-700 pt-1">
                          還有 {stats.failed - 5} 個...
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
                          >
              取消
            </Button>
            <Button
              type="submit"
              className=""
              disabled={!isValid}
            >
              {mode === "single" ? (
                <>
                  <Plus className="h-4 w-4 mr-1.5" />
                  加入
                </>
              ) : (
                <>
                  <ListPlus className="h-4 w-4 mr-1.5" />
                  {`加入 ${stats.successful} 個`}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
