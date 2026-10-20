"use client"

/**
 * Public playlists: the synced cloud copy of a playlist with isPublic set, readable by anyone
 * through get_public_playlist(). Unlike /share links these are live, not snapshots.
 */

import { getSupabase } from "@/lib/supabase"
import type { Playlist, PlaylistItem } from "@/lib/local-store"

export interface PublicPlaylist {
  name: string
  description: string | null
  items: { code: string; note: string | null }[]
  updatedAt: string
  /** Owner's nickname; null if they haven't finished onboarding */
  ownerName: string | null
  ownerTags: string[]
}

interface Row {
  data: Partial<Playlist> | null
  updated_at: string
  display_name: string | null
  tags: string[] | null
}

/** Unprefixed path of a public playlist. */
export function publicPlaylistPath(ownerId: string, playlistId: string) {
  return `/p/${ownerId}/${playlistId}`
}

/** Null when it doesn't exist, isn't public, or login isn't configured. */
export async function fetchPublicPlaylist(ownerId: string, playlistId: string): Promise<PublicPlaylist | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data, error } = await supabase.rpc("get_public_playlist", { owner: ownerId, playlist_id: playlistId })
  // An owner that isn't a uuid fails the cast; treat it like a missing playlist
  if (error) {
    if (error.code === "22P02") return null
    throw error
  }
  const row = (data as Row[] | null)?.[0]
  if (!row?.data) return null
  const p = row.data
  return {
    name: typeof p.name === "string" ? p.name : "",
    description: typeof p.description === "string" ? p.description : null,
    items: (Array.isArray(p.items) ? p.items : []).map((i: Partial<PlaylistItem> | null) => ({
      code: String(i?.normalizedCode ?? ""),
      note: typeof i?.note === "string" ? i.note : null,
    })),
    updatedAt: row.updated_at,
    ownerName: row.display_name,
    ownerTags: Array.isArray(row.tags) ? row.tags.filter((tag) => typeof tag === "string") : [],
  }
}
