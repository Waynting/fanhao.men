"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SharePageContent } from "@/components/share-page-content"
import { PageLoading } from "@/components/page-loading"
import { decodeShareHash, type SharedPlaylist } from "@/lib/share-codec"
import { isValidVideoCode, normalizeVideoCode } from "@/lib/code-normalizer"
import { mergeTemplates } from "@/lib/default-templates"
import { useStore } from "@/lib/local-store"

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; playlist: SharedPlaylist }

export default function SharedPlaylistPage() {
  const store = useStore()
  const [state, setState] = useState<State>({ status: "loading" })

  useEffect(() => {
    const load = () => {
      const hash = window.location.hash
      if (!hash || hash.length < 3) {
        setState({ status: "error" })
        return
      }
      decodeShareHash(hash)
        .then((playlist) => setState({ status: "ready", playlist }))
        .catch(() => setState({ status: "error" }))
    }
    load()
    window.addEventListener("hashchange", load)
    return () => window.removeEventListener("hashchange", load)
  }, [])

  if (state.status === "loading" || !store) return <PageLoading />

  if (state.status === "error") {
    return (
      <div className="text-center py-24">
        <h1 className="text-xl font-semibold text-zinc-900 mb-2">分享連結無效</h1>
        <p className="text-zinc-500 mb-6 text-sm">連結可能不完整，請確認有複製到完整的網址。</p>
        <Button asChild>
          <Link href="/dashboard">前往我的清單</Link>
        </Button>
      </div>
    )
  }

  const { playlist } = state
  // Shared data comes from the URL, so re-validate every code before use
  const items = playlist.items
    .filter((item) => isValidVideoCode(item.code))
    .map((item, index) => {
      const normalizedCode = normalizeVideoCode(item.code)
      return { id: `${index}-${normalizedCode}`, videoCode: normalizedCode, normalizedCode, note: item.note }
    })

  return (
    <div className="max-w-5xl mx-auto">
      <div className="border-b border-zinc-100 pb-6 mb-6">
        <p className="text-xs font-medium text-zinc-400 mb-2">分享的清單</p>
        <h1 className="text-2xl md:text-3xl font-semibold text-zinc-900 mb-2 break-words">{playlist.name}</h1>
        {playlist.description && (
          <p className="text-base text-gray-600 mb-3 whitespace-pre-wrap">{playlist.description}</p>
        )}
        <p className="text-sm text-zinc-500">{items.length} 個番號</p>
      </div>

      <SharePageContent items={items} playlistName={playlist.name} templates={mergeTemplates(store.templates)} />
    </div>
  )
}
