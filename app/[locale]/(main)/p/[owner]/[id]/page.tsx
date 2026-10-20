"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useFormatter, useTranslations } from "next-intl"
import { DATE } from "@/lib/date-formats"
import { Pencil } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { SharePageContent } from "@/components/share-page-content"
import { PageLoading } from "@/components/page-loading"
import { ProfileTags } from "@/components/profile-tags"
import { fetchPublicPlaylist, type PublicPlaylist } from "@/lib/public-playlist"
import { isValidVideoCode, normalizeVideoCode } from "@/lib/code-normalizer"
import { mergeTemplates } from "@/lib/default-templates"
import { useStore } from "@/lib/local-store"
import { useSession } from "@/lib/supabase"

type State =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error" }
  | { status: "ready"; playlist: PublicPlaylist }

export default function PublicPlaylistPage() {
  const { owner, id } = useParams<{ owner: string; id: string }>()
  const t = useTranslations("Share.public")
  const tPage = useTranslations("Share.page")
  const tc = useTranslations("Common")
  const format = useFormatter()
  const store = useStore()
  const { session } = useSession()
  const [state, setState] = useState<State>({ status: "loading" })

  useEffect(() => {
    let cancelled = false
    fetchPublicPlaylist(owner, id)
      .then((playlist) => !cancelled && setState(playlist ? { status: "ready", playlist } : { status: "missing" }))
      .catch(() => !cancelled && setState({ status: "error" }))
    return () => {
      cancelled = true
    }
  }, [owner, id])

  if (state.status === "loading" || !store) return <PageLoading />

  if (state.status !== "ready") {
    const missing = state.status === "missing"
    return (
      <div className="text-center py-24">
        <h1 className="text-xl font-semibold text-zinc-900 mb-2">{missing ? t("missingTitle") : t("errorTitle")}</h1>
        <p className="text-zinc-500 mb-6 text-sm">{missing ? t("missingBody") : t("errorBody")}</p>
        <Button asChild>
          <Link href="/dashboard">{tPage("goToDashboard")}</Link>
        </Button>
      </div>
    )
  }

  const { playlist } = state
  // Cloud data was written by the owner's client, so re-validate every code like the share page does
  const items = playlist.items
    .filter((item) => isValidVideoCode(item.code))
    .map((item, index) => {
      const normalizedCode = normalizeVideoCode(item.code)
      return { id: `${index}-${normalizedCode}`, videoCode: normalizedCode, normalizedCode, note: item.note }
    })
  const isOwner = session?.user.id === owner && store.playlists.some((p) => p.id === id)

  return (
    <div className="max-w-5xl mx-auto">
      <div className="border-b border-zinc-100 pb-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="mb-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-xs font-medium text-zinc-400">
              {playlist.ownerName ? t("labelWithOwner", { name: playlist.ownerName }) : t("label")}
            </p>
            {playlist.ownerName && <ProfileTags tags={playlist.ownerTags} />}
          </div>
          {isOwner && (
            <Button variant="outline" size="sm" asChild className="shrink-0">
              <Link href={`/playlist/${id}`}>
                <Pencil className="h-4 w-4 mr-2" />
                {t("edit")}
              </Link>
            </Button>
          )}
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold text-zinc-900 mb-2 break-words">{playlist.name}</h1>
        {playlist.description && (
          <p className="text-base text-zinc-600 mb-3 whitespace-pre-wrap">{playlist.description}</p>
        )}
        <p className="text-sm text-zinc-500">
          {tc("codeCount", { count: items.length })}
          <span className="mx-2 text-zinc-300">·</span>
          {t("updatedAt", { date: format.dateTime(new Date(playlist.updatedAt), DATE) })}
        </p>
      </div>

      <SharePageContent
        items={items}
        playlistName={playlist.name}
        playlistDescription={playlist.description}
        templates={mergeTemplates(store.templates)}
      />
    </div>
  )
}
