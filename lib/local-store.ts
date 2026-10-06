"use client"

/**
 * Device-local data store backed by localStorage.
 * Replaces the former Supabase + Prisma backend: no login, data lives per browser/device.
 */

import { useSyncExternalStore } from "react"
import { nanoid } from "nanoid"

export interface PlaylistItem {
  id: string
  videoCode: string
  normalizedCode: string
  note: string | null
  createdAt: string
}

export interface Playlist {
  id: string
  name: string
  description: string | null
  items: PlaylistItem[]
  createdAt: string
  updatedAt: string
}

export interface SourceTemplate {
  id: string
  name: string
  baseTemplate: string
  isDefault: boolean
  isBuiltIn?: boolean
}

export interface StoreData {
  version: 1
  playlists: Playlist[]
  templates: SourceTemplate[]
}

export interface NewItem {
  videoCode: string
  normalizedCode: string
  note?: string | null
}

const STORAGE_KEY = "av-collector:v1"
const EMPTY: StoreData = { version: 1, playlists: [], templates: [] }

let cache: StoreData | null = null
const listeners = new Set<() => void>()

function load(): StoreData {
  if (cache) return cache
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    cache = raw ? normalize(JSON.parse(raw)) : EMPTY
  } catch {
    cache = EMPTY
  }
  return cache
}

function normalize(data: unknown): StoreData {
  const d = (data ?? {}) as Partial<StoreData>
  return {
    version: 1,
    playlists: Array.isArray(d.playlists) ? d.playlists : [],
    templates: Array.isArray(d.templates) ? d.templates : [],
  }
}

function save(next: StoreData) {
  cache = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    throw new Error("儲存失敗：瀏覽器儲存空間已滿或被停用")
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // Keep multiple tabs on the same device in sync
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return
    cache = null
    listener()
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

/** Returns null during SSR / before hydration so pages can show a loading state. */
export function useStore(): StoreData | null {
  return useSyncExternalStore(subscribe, load, () => null)
}

const now = () => new Date().toISOString()

function updatePlaylistIn(data: StoreData, id: string, fn: (p: Playlist) => Playlist): StoreData {
  const exists = data.playlists.some((p) => p.id === id)
  if (!exists) throw new Error("找不到這個清單")
  return {
    ...data,
    playlists: data.playlists.map((p) => (p.id === id ? { ...fn(p), updatedAt: now() } : p)),
  }
}

// ---------- Playlists ----------

export function createPlaylist(input: { name: string; description?: string | null; items?: NewItem[] }): Playlist {
  const name = input.name.trim()
  if (!name) throw new Error("請輸入清單名稱")
  const playlist: Playlist = {
    id: nanoid(10),
    name,
    description: input.description?.trim() || null,
    items: [],
    createdAt: now(),
    updatedAt: now(),
  }
  playlist.items = mergeItems([], input.items ?? []).items
  const data = load()
  save({ ...data, playlists: [playlist, ...data.playlists] })
  return playlist
}

export function updatePlaylist(id: string, input: { name: string; description?: string | null }) {
  const name = input.name.trim()
  if (!name) throw new Error("請輸入清單名稱")
  save(updatePlaylistIn(load(), id, (p) => ({ ...p, name, description: input.description?.trim() || null })))
}

export function deletePlaylist(id: string) {
  const data = load()
  save({ ...data, playlists: data.playlists.filter((p) => p.id !== id) })
}

/** Restores a previously deleted playlist (used for undo). */
export function restorePlaylist(playlist: Playlist) {
  const data = load()
  if (data.playlists.some((p) => p.id === playlist.id)) return
  save({ ...data, playlists: [playlist, ...data.playlists] })
}

// ---------- Items ----------

function mergeItems(existing: PlaylistItem[], incoming: NewItem[]) {
  const seen = new Set(existing.map((i) => i.normalizedCode))
  const added: PlaylistItem[] = []
  for (const item of incoming) {
    if (seen.has(item.normalizedCode)) continue
    seen.add(item.normalizedCode)
    added.push({
      id: nanoid(10),
      videoCode: item.videoCode,
      normalizedCode: item.normalizedCode,
      note: item.note?.trim() || null,
      createdAt: now(),
    })
  }
  return { items: [...existing, ...added], added: added.length }
}

/** Adds items, skipping codes already in the playlist. Returns the number actually added. */
export function addItems(playlistId: string, items: NewItem[]): number {
  let added = 0
  save(
    updatePlaylistIn(load(), playlistId, (p) => {
      const result = mergeItems(p.items, items)
      added = result.added
      return { ...p, items: result.items }
    })
  )
  return added
}

export function deleteItems(playlistId: string, itemIds: string[]) {
  const ids = new Set(itemIds)
  save(updatePlaylistIn(load(), playlistId, (p) => ({ ...p, items: p.items.filter((i) => !ids.has(i.id)) })))
}

/** Replaces the item list with an earlier snapshot (used for undo). */
export function restoreItems(playlistId: string, snapshot: PlaylistItem[]) {
  save(updatePlaylistIn(load(), playlistId, (p) => ({ ...p, items: snapshot })))
}

export function updateItemNote(playlistId: string, itemId: string, note: string) {
  save(
    updatePlaylistIn(load(), playlistId, (p) => ({
      ...p,
      items: p.items.map((i) => (i.id === itemId ? { ...i, note: note.trim() || null } : i)),
    }))
  )
}

// ---------- Source templates ----------

export function createTemplate(input: { name: string; baseTemplate: string }) {
  const name = input.name.trim()
  const baseTemplate = input.baseTemplate.trim()
  if (!name) throw new Error("請輸入名稱")
  if (!baseTemplate.includes("{code}")) throw new Error("網址必須包含 {code}")
  try {
    new URL(baseTemplate.replace("{code}", "TEST-001"))
  } catch {
    throw new Error("網址格式不正確")
  }
  const data = load()
  save({ ...data, templates: [...data.templates, { id: nanoid(10), name, baseTemplate, isDefault: false }] })
}

export function deleteTemplate(id: string) {
  const data = load()
  save({ ...data, templates: data.templates.filter((t) => t.id !== id) })
}

// ---------- Backup ----------

export function exportData(): string {
  return JSON.stringify(load(), null, 2)
}

/** Imports a backup file. "merge" keeps existing playlists; "replace" overwrites everything. */
export function importData(json: string, mode: "merge" | "replace"): number {
  let parsed: StoreData
  try {
    parsed = normalize(JSON.parse(json))
  } catch {
    throw new Error("檔案格式不正確")
  }
  if (mode === "replace") {
    save(parsed)
    return parsed.playlists.length
  }
  const data = load()
  const ids = new Set(data.playlists.map((p) => p.id))
  const incoming = parsed.playlists.map((p) => (ids.has(p.id) ? { ...p, id: nanoid(10) } : p))
  const templateUrls = new Set(data.templates.map((t) => t.baseTemplate))
  save({
    ...data,
    playlists: [...incoming, ...data.playlists],
    templates: [...data.templates, ...parsed.templates.filter((t) => !templateUrls.has(t.baseTemplate))],
  })
  return incoming.length
}

export function clearAllData() {
  save(EMPTY)
}

// ---------- Demo ----------

export function loadDemoData(): Playlist {
  const codes = ["SSIS-001", "IPX-920", "WAAA-412", "MIDV-018", "FC2-PPV-1234567"]
  return createPlaylist({
    name: "示範清單",
    description: "這是一份示範清單，可以試著產生連結、加註記或分享。",
    items: codes.map((c, i) => ({
      videoCode: c,
      normalizedCode: c,
      note: i === 0 ? "這是一則註記範例" : null,
    })),
  })
}
