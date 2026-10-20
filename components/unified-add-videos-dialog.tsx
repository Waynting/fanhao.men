"use client"

import { useState, useEffect, useRef } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { useErrorText } from "@/i18n/use-error-text"

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
  const t = useTranslations("Playlist.addDialog")
  const tCommon = useTranslations("Common")
  const errorText = useErrorText()
  const [mode, setMode] = useState<Mode>("single")
  const [input, setInput] = useState("")
  const [singleResult, setSingleResult] = useState<ParseResult | null>(null)
  const [bulkResults, setBulkResults] = useState<ParseResult[]>([])
  // Feedback for the last add while the dialog stays open (cleared as soon as the user types again)
  const [lastAdded, setLastAdded] = useState<string | null>(null)
  const [bulkNotice, setBulkNotice] = useState<{ added: number; skipped: number; failed: number } | null>(null)
  const [addedAny, setAddedAny] = useState(false)
  const [isMac, setIsMac] = useState(true)
  const singleInputRef = useRef<HTMLInputElement>(null)
  const bulkInputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad|iPod/.test(navigator.userAgent))
  }, [])

  const isMultiLine = input.split("\n").filter((line) => line.trim().length > 0).length > 1

  const changeInput = (value: string) => {
    setInput(value)
    setLastAdded(null)
    setBulkNotice(null)
  }

  const switchMode = (next: Mode) => {
    if (next === mode) return
    setMode(next)
    // Hand focus to the newly mounted field
    requestAnimationFrame(() => (next === "single" ? singleInputRef.current : bulkInputRef.current)?.focus())
  }

  // An <input> drops newlines, so a multi-line paste switches to bulk with the pasted text intact
  const handleSinglePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text")
    if (pasted.split(/\r?\n/).filter((line) => line.trim().length > 0).length < 2) return
    e.preventDefault()
    const el = e.currentTarget
    const before = input.slice(0, el.selectionStart ?? input.length).trim()
    const after = input.slice(el.selectionEnd ?? input.length).trim()
    changeInput([before, pasted.replace(/\r\n/g, "\n").trim(), after].filter(Boolean).join("\n"))
    switchMode("bulk")
  }

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
      setLastAdded(null)
      setBulkNotice(null)
      setAddedAny(false)
    }
  }, [open])

  const stats = getParseStats(bulkResults)

  const toNewItem = (r: ParseResult) => ({
    // Keep what the user typed (code part of a URL, or the raw code) alongside the normalized form
    videoCode: r.code ?? r.originalInput.trim(),
    normalizedCode: r.normalizedCode!,
  })

  const submit = () => {
    try {
      if (mode === "single") {
        // Invalid or duplicate input is already explained by the inline preview
        if (!singleResult?.success || singleResult.isDuplicate) return
        addItems(playlistId, [toNewItem(singleResult)])
        trackAddItems({ playlist_id: playlistId, item_count: 1, method: singleResult.source === "url" ? "url_parse" : "single" })
        // Stay open for the next code: clear, refocus, and say what was just added
        setInput("")
        setBulkNotice(null)
        setLastAdded(singleResult.normalizedCode!)
        setAddedAny(true)
        singleInputRef.current?.focus()
        return
      }

      if (stats.successful === 0) {
        toast.error(t("noValidCodes"))
        return
      }
      const count = addItems(
        playlistId,
        bulkResults.filter((r) => r.success && !r.isDuplicate).map(toNewItem)
      )
      trackAddItems({ playlist_id: playlistId, item_count: count, method: "bulk" })
      if (stats.failed > 0) {
        // Keep only the unrecognized lines so they can be fixed instead of lost
        setInput(bulkResults.filter((r) => !r.success).map((r) => r.originalInput.trim()).join("\n"))
        setLastAdded(null)
        setBulkNotice({ added: count, skipped: stats.duplicates, failed: stats.failed })
        setAddedAny(true)
        bulkInputRef.current?.focus()
        return
      }
      const parts = [t("bulkAdded", { count })]
      if (stats.duplicates > 0) parts.push(t("bulkSkipped", { count: stats.duplicates }))
      toast.success(parts.join(t("separator")))
      onOpenChange(false)
    } catch (error) {
      toast.error(errorText(error))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submit()
  }

  const handleSingleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enter that confirms an IME candidate (Chinese/Japanese input) must not submit
    if (e.key !== "Enter" || e.nativeEvent.isComposing || e.keyCode === 229) return
    e.preventDefault()
    submit()
  }

  const handleBulkKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || !(e.metaKey || e.ctrlKey) || e.nativeEvent.isComposing) return
    e.preventDefault()
    submit()
  }

  const isValid = mode === "single"
    ? (singleResult?.success && !singleResult?.isDuplicate)
    : stats.successful > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          {/* Right padding keeps the mode toggle clear of the dialog's close button */}
          <div className="flex items-center justify-between pr-10 sm:pr-8">
            <DialogTitle className="text-xl">{t("title")}</DialogTitle>
            {/* Mode Toggle */}
            <div className="flex bg-zinc-100 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => switchMode("single")}
                // Several lines can't go into the single-line field
                disabled={mode === "bulk" && isMultiLine}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  mode === "single"
                    ? "bg-white text-black shadow-sm"
                    : "text-zinc-600 hover:text-black"
                }`}
              >
                <Plus className="h-3 w-3 inline mr-1" />
                {t("single")}
              </button>
              <button
                type="button"
                onClick={() => switchMode("bulk")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  mode === "bulk"
                    ? "bg-white text-black shadow-sm"
                    : "text-zinc-600 hover:text-black"
                }`}
              >
                <ListPlus className="h-3 w-3 inline mr-1" />
                {t("bulk")}
              </button>
            </div>
          </div>
          <DialogDescription>
            {mode === "single"
              ? t("singleDescription")
              : t("bulkDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            {mode === "single" ? (
              <Input
                ref={singleInputRef}
                id="video-input"
                placeholder={t("singlePlaceholder")}
                value={input}
                onChange={(e) => changeInput(e.target.value)}
                onKeyDown={handleSingleKeyDown}
                onPaste={handleSinglePaste}
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
                enterKeyHint="go"
                className="h-11 border-zinc-300"
              />
            ) : (
              <Textarea
                ref={bulkInputRef}
                id="video-input"
                placeholder={"SSIS-123\nIPX-920\nFC2-PPV-1234567\n..."}
                value={input}
                onChange={(e) => changeInput(e.target.value)}
                onKeyDown={handleBulkKeyDown}
                rows={10}
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="border-zinc-300 font-mono text-sm"
              />
            )}

            {/* What the last submit did, while the dialog stays open for more */}
            {mode === "single" && lastAdded && !input && (
              <div role="status" className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                <span>{t.rich("addedInline", { code: lastAdded, c: (chunks) => <code className="font-mono font-semibold">{chunks}</code> })}</span>
              </div>
            )}
            {mode === "bulk" && bulkNotice && (
              <div role="status" className="flex items-start gap-2 p-3 text-sm bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
                <XCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  {[
                    t("bulkAdded", { count: bulkNotice.added }),
                    ...(bulkNotice.skipped > 0 ? [t("bulkSkipped", { count: bulkNotice.skipped })] : []),
                    t("failedKept", { count: bulkNotice.failed }),
                  ].join(t("separator"))}
                </span>
              </div>
            )}

            {/* Real-time Preview */}
            {mode === "single" && singleResult && (
              <div className="text-sm">
                {singleResult.success ? (
                  singleResult.isDuplicate ? (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-300 rounded-lg">
                      <XCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-amber-900 mb-1">{t("alreadyInPlaylist")}</p>
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
                          {singleResult.source === 'url' ? t("extractedFromUrl") : t("validFormat")}
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
                      <p className="text-xs font-medium text-red-900 mb-1">{t("unrecognized")}</p>
                      <p className="text-xs text-red-700">{errorText(singleResult.error, "invalidCode")}</p>
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
                      <span className="font-semibold text-green-900">{t("validCount", { count: stats.successful })}</span>
                    </div>
                  )}
                  {stats.duplicates > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 border border-amber-300 rounded-md">
                      <XCircle className="h-3.5 w-3.5 text-amber-700" />
                      <span className="text-amber-900">{t("duplicateCount", { count: stats.duplicates })}</span>
                    </div>
                  )}
                  {stats.failed > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-100 border border-red-300 rounded-md">
                      <XCircle className="h-3.5 w-3.5 text-red-700" />
                      <span className="text-red-900">{t("failedCount", { count: stats.failed })}</span>
                    </div>
                  )}
                </div>

                {/* Show duplicate items if any */}
                {stats.duplicates > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs font-medium text-amber-900 mb-2">
                      {t("duplicatesSkipped", { count: stats.duplicates })}
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
                          {t("moreItems", { count: stats.duplicates - 5 })}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Show failed items if any */}
                {stats.failed > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs font-medium text-red-900 mb-2">
                      {t("failedLines", { count: stats.failed })}
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
                          {t("moreItems", { count: stats.failed - 5 })}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            {/* Keyboard hint, desktop only */}
            <p className="hidden sm:block mr-auto text-xs text-zinc-400">
              {mode === "single"
                ? t("singleHint")
                : t("bulkHint", { key: isMac ? "⌘" : "Ctrl" })}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {addedAny ? tCommon("close") : tCommon("cancel")}
            </Button>
            <Button
              type="submit"
              className=""
              disabled={!isValid}
            >
              {mode === "single" ? (
                <>
                  <Plus className="h-4 w-4 mr-1.5" />
                  {t("add")}
                </>
              ) : (
                <>
                  <ListPlus className="h-4 w-4 mr-1.5" />
                  {t("addCount", { count: stats.successful })}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
