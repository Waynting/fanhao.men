"use client"

import { useState, useMemo } from "react"
import { Copy, Check, CheckCircle2, ExternalLink, StickyNote, Plus, ChevronDown, ChevronUp, Search, Download, Link as LinkIcon } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { useErrorText } from "@/i18n/use-error-text"
import { AddItemsToPlaylistDialog } from "@/components/add-items-to-playlist-dialog"
import { LinkGeneratorPopover } from "@/components/link-generator-popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { trackAddFromSharedPlaylist, trackEvent } from "@/lib/analytics"
import { copyText } from "@/lib/clipboard"
import { recordClicks } from "@/lib/trending"
import { rememberOpened } from "@/lib/recent-opens"
import { createPlaylist, deletePlaylist, useStore, type SourceTemplate } from "@/lib/local-store"

interface SharedItem {
  id: string
  normalizedCode: string
  videoCode: string
  note: string | null
}

interface SharePageContentProps {
  items: SharedItem[]
  playlistName: string
  playlistDescription?: string | null
  templates: SourceTemplate[]
}

export function SharePageContent({ items, playlistName, playlistDescription, templates }: SharePageContentProps) {
  const t = useTranslations("Share.content")
  const tc = useTranslations("Common")
  const store = useStore()
  const router = useRouter()
  const errorText = useErrorText()
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items

    const query = searchQuery.toLowerCase()
    return items.filter(item =>
      item.normalizedCode.toLowerCase().includes(query) ||
      item.videoCode.toLowerCase().includes(query) ||
      (item.note && item.note.toLowerCase().includes(query))
    )
  }, [items, searchQuery])

  const saveItems = searchQuery ? filteredItems : items
  // A playlist of the same name that already holds every code counts as "already saved",
  // so pressing the one-click button twice doesn't make duplicates
  const savedPlaylist = store?.playlists.find((p) => {
    if (p.name !== playlistName.trim()) return false
    const codes = new Set(p.items.map((i) => i.normalizedCode))
    return saveItems.every((item) => codes.has(item.normalizedCode))
  })

  const handleSaveAsNew = () => {
    try {
      const playlist = createPlaylist({ name: playlistName, description: playlistDescription, items: saveItems })
      trackAddFromSharedPlaylist({ source_playlist_id: "share", target_playlist_id: playlist.id, item_count: playlist.items.length })
      toast.success(t("savedAsNew", { name: playlist.name, count: playlist.items.length }), {
        action: { label: t("view"), onClick: () => router.push(`/playlist/${playlist.id}`) },
        cancel: { label: tc("undo"), onClick: () => deletePlaylist(playlist.id) },
      })
    } catch (error) {
      toast.error(errorText(error))
    }
  }

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-600">{t("empty")}</p>
      </div>
    )
  }

  const handleCopyCode = async (code: string) => {
    if (!(await copyText(code))) {
      toast.error(tc("copyManually"), { description: code, duration: 10000 })
      return
    }
    setCopiedCode(code)
    toast.success(t("copiedCode", { code }))

    // Track event
    trackEvent("copy_code_from_share", {
      code: code,
    })

    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleCopyUrl = async (url: string, sourceName: string, code: string) => {
    if (!(await copyText(url))) {
      toast.error(tc("copyManually"), { description: url, duration: 10000 })
      return
    }
    recordClicks([code])
    rememberOpened([code])
    setCopiedUrl(url)
    toast.success(t("copiedUrl", { source: sourceName }))

    // Track event
    trackEvent("copy_url_from_share", {
      source_name: sourceName,
    })

    setTimeout(() => setCopiedUrl(null), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
        <Input
          type="text"
          placeholder={t("searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-12 text-base"
        />
        {searchQuery && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
            {t("matchCount", { shown: filteredItems.length, total: items.length })}
          </div>
        )}
      </div>

      {/* Action Bar - Save to this device */}
      {filteredItems.length > 0 && (
        <div className="bg-zinc-900 text-white rounded-xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold mb-1">{t("saveTitle")}</h3>
              <p className="text-sm text-zinc-400">
                {searchQuery
                  ? t("saveFiltered", { count: filteredItems.length })
                  : t("saveAll", { count: items.length })}
              </p>
            </div>
            <div className="flex w-full sm:w-auto flex-col-reverse sm:flex-row gap-2">
              <AddItemsToPlaylistDialog
                items={saveItems}
                defaultNewName={playlistName}
                trigger={
                  <Button variant="ghost" className="text-zinc-300 hover:text-white hover:bg-zinc-800">
                    <Plus className="h-4 w-4 mr-2" />
                    {t("addToExisting")}
                  </Button>
                }
              />
              {savedPlaylist ? (
                <Button
                  className="bg-emerald-500 text-white hover:bg-emerald-400"
                  onClick={() => router.push(`/playlist/${savedPlaylist.id}`)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {t("alreadySaved")}
                </Button>
              ) : (
                <Button className="bg-white text-black hover:bg-zinc-100" onClick={handleSaveAsNew}>
                  <Download className="h-4 w-4 mr-2" />
                  {searchQuery ? t("saveFilteredButton") : t("saveAllButton")}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* No Results */}
      {filteredItems.length === 0 && searchQuery && (
        <div className="text-center py-12">
          <p className="text-zinc-600">{t("noResults", { query: searchQuery })}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchQuery("")}
            className="mt-4"
          >
            {t("clearSearch")}
          </Button>
        </div>
      )}

      {/* Bulk links: one popover for every (filtered) code instead of opening each item's sources */}
      {filteredItems.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-zinc-500">{tc("codeCount", { count: filteredItems.length })}</p>
          <LinkGeneratorPopover
            items={filteredItems}
            templates={templates}
            trigger={
              <Button variant="outline">
                <LinkIcon className="h-4 w-4" />
                {searchQuery ? t("generateFilteredLinks") : t("generateAllLinks")}
              </Button>
            }
          />
        </div>
      )}

      {/* Video Items */}
      {filteredItems.map((item, index) => {
        const isExpanded = expandedItems.has(item.id)

        return (
          <div
          key={item.id}
          className="border border-zinc-200/80 bg-white hover:border-zinc-300 hover:shadow-sm transition-all duration-150 rounded-xl overflow-hidden"
        >
          {/* Video Code Header */}
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-zinc-300">#{index + 1}</span>
              <h3 className="text-base font-semibold font-mono text-zinc-900">{item.normalizedCode}</h3>
              {item.note && (
                <StickyNote className="h-3.5 w-3.5 text-zinc-300" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <AddItemsToPlaylistDialog
                items={[item]}
                defaultNewName={playlistName}
                trigger={
                  <button
                    className="h-10 sm:h-auto px-3 sm:py-1.5 bg-zinc-900 text-white hover:bg-zinc-700 transition-all duration-150 rounded-lg text-xs font-medium whitespace-nowrap"
                    title={t("addToMyPlaylists")}
                  >
                    {t("addToPlaylist")}
                  </button>
                }
              />
              <button
                onClick={() => handleCopyCode(item.normalizedCode)}
                className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-zinc-100 transition-all duration-150 rounded-lg"
                aria-label={`${t("copyCode")} ${item.normalizedCode}`}
                title={t("copyCode")}
              >
                {copiedCode === item.normalizedCode ? (
                  <Check className="h-4 w-4 text-green-600" strokeWidth={3} />
                ) : (
                  <Copy className="h-4 w-4 text-zinc-400" />
                )}
              </button>
            </div>
          </div>

          {/* Author Note */}
          {item.note && (
            <div className="px-4 py-2.5">
              <div className="flex items-start gap-2">
                <StickyNote className="h-3.5 w-3.5 text-zinc-300 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-zinc-600 whitespace-pre-wrap">{item.note}</p>
              </div>
            </div>
          )}

          {/* Source Links - Collapsible */}
          <div>
            <button
              onClick={() => toggleExpanded(item.id)}
              className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-zinc-50 transition-colors duration-150 border-t border-zinc-100"
            >
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-zinc-400">{t("sources")}</p>
                <span className="text-xs text-zinc-300">({templates.length})</span>
              </div>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-zinc-300" />
              ) : (
                <ChevronDown className="h-4 w-4 text-zinc-300" />
              )}
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 pt-1 space-y-1.5">
                {templates.map((template) => {
                  const url = template.baseTemplate.replace("{code}", item.normalizedCode)
                  const isCopied = copiedUrl === url

                  return (
                    <div
                      key={template.id}
                      className="group flex items-center gap-3 p-2.5 hover:bg-zinc-50 transition-all duration-150 rounded-lg"
                    >
                      {/* Source Icon */}
                      <div className="flex-shrink-0 w-7 h-7 bg-zinc-100 text-zinc-600 rounded-lg flex items-center justify-center font-semibold text-xs">
                        {template.name.substring(0, 2).toUpperCase()}
                      </div>

                      {/* Source Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-zinc-800">
                          {template.name}
                        </p>
                        <p className="text-xs font-mono text-zinc-400 truncate">{url}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            recordClicks([item.normalizedCode])
                            rememberOpened([item.normalizedCode])
                          }}
                          className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-zinc-100 transition-all duration-150 rounded-lg"
                          aria-label={`${t("openLink")}: ${template.name}`}
                          title={t("openLink")}
                        >
                          <ExternalLink className="h-4 w-4 text-zinc-400" />
                        </a>
                        <button
                          onClick={() => handleCopyUrl(url, template.name, item.normalizedCode)}
                          className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-zinc-100 transition-all duration-150 rounded-lg"
                          aria-label={`${t("copyLink")}: ${template.name}`}
                          title={t("copyLink")}
                        >
                          {isCopied ? (
                            <Check className="h-4 w-4 text-green-600" strokeWidth={3} />
                          ) : (
                            <Copy className="h-4 w-4 text-zinc-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        )
      })}
    </div>
  )
}
