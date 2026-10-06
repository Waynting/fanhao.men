"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/local-store"
import { mergeTemplates } from "@/lib/default-templates"
import { PlaylistHeader } from "@/components/playlist-header"
import { PlaylistPageClient } from "@/components/playlist-page-client"
import { PageLoading } from "@/components/page-loading"

export default function PlaylistPage() {
  const { id } = useParams<{ id: string }>()
  const store = useStore()

  if (!store) return <PageLoading />

  const playlist = store.playlists.find((p) => p.id === id)

  if (!playlist) {
    return (
      <div className="text-center py-24">
        <h1 className="text-xl font-semibold text-zinc-900 mb-2">找不到這個清單</h1>
        <p className="text-zinc-500 mb-6 text-sm">它可能已被刪除，或是建立在另一台裝置上。</p>
        <Button asChild>
          <Link href="/dashboard">返回我的清單</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-8">
      <PlaylistHeader playlist={playlist} />
      <PlaylistPageClient playlist={playlist} templates={mergeTemplates(store.templates)} />
    </div>
  )
}
