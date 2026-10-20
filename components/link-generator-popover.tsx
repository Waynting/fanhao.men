"use client"

import { useState } from "react"
import Link from "next/link"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Copy, Check, ExternalLink, Settings } from "lucide-react"
import { toast } from "sonner"
import { trackGenerateLinks } from "@/lib/analytics"
import { recordClicks } from "@/lib/trending"
import type { SourceTemplate } from "@/lib/local-store"

interface LinkGeneratorPopoverProps {
  items: { normalizedCode: string }[]
  templates: SourceTemplate[]
  trigger: React.ReactNode
}

export function LinkGeneratorPopover({ items, templates, trigger }: LinkGeneratorPopoverProps) {
  const [open, setOpen] = useState(false)
  const [copiedSource, setCopiedSource] = useState<string | null>(null)

  if (items.length === 0) return null

  const isSingle = items.length === 1
  const previewCode = items[0].normalizedCode
  const buildUrl = (template: SourceTemplate, code: string) => template.baseTemplate.replace("{code}", code)

  const handleCopyLinks = async (template: SourceTemplate) => {
    try {
      await navigator.clipboard.writeText(items.map((item) => buildUrl(template, item.normalizedCode)).join("\n"))
    } catch {
      toast.error("無法存取剪貼簿")
      return
    }
    trackGenerateLinks({ source_name: template.name, item_count: items.length, is_single_item: isSingle })
    recordClicks(items.map((item) => item.normalizedCode))
    setCopiedSource(template.id)
    toast.success(`已複製 ${items.length} 個 ${template.name} 連結`)
    setTimeout(() => setCopiedSource(null), 2000)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className="w-[calc(100vw-2rem)] sm:w-[380px] p-0 bg-white border border-zinc-200/80 shadow-lg rounded-xl"
        sideOffset={8}
        align="end"
      >
        <div className="px-3 py-2.5 border-b border-zinc-100">
          <h3 className="text-sm font-semibold text-zinc-800">產生連結</h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            {isSingle ? `${previewCode}：開啟或複製網址` : `將 ${items.length} 個番號轉成網址並複製`}
          </p>
        </div>

        <div className="p-2 space-y-1 max-h-[60vh] sm:max-h-[350px] overflow-y-auto">
          {templates.map((template) => {
            const previewUrl = buildUrl(template, previewCode)
            const isCopied = copiedSource === template.id

            return (
              <div key={template.id} className="flex items-center gap-2 p-2 hover:bg-zinc-50 rounded-lg">
                <div className="flex-shrink-0 w-7 h-7 bg-zinc-100 text-zinc-600 rounded-lg flex items-center justify-center font-semibold text-[10px]">
                  {template.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-sm text-zinc-800 truncate">{template.name}</span>
                    {!template.isBuiltIn && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-zinc-900 text-white rounded-md font-medium">自訂</span>
                    )}
                  </div>
                  <p className="text-[10px] font-mono text-zinc-400 truncate">{previewUrl}</p>
                </div>
                {isSingle && (
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => recordClicks([previewCode])}
                    className="w-8 h-8 flex items-center justify-center hover:bg-zinc-100 rounded-lg"
                    aria-label={`在 ${template.name} 開啟`}
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-zinc-500" />
                  </a>
                )}
                <button
                  onClick={() => handleCopyLinks(template)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-zinc-100 rounded-lg"
                  aria-label={`複製 ${template.name} 連結`}
                >
                  {isCopied ? (
                    <Check className="h-4 w-4 text-green-600" strokeWidth={3} />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-zinc-500" />
                  )}
                </button>
              </div>
            )
          })}
        </div>

        <div className="px-3 py-2 border-t border-zinc-100">
          <Link
            href="/settings"
            className="text-xs text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1"
            onClick={() => setOpen(false)}
          >
            <Settings className="h-3 w-3" />
            管理自訂來源
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
