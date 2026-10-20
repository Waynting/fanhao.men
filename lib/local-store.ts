"use client"

/**
 * Device-local data store backed by localStorage. Works fully without login;
 * when signed in, lib/sync.ts mirrors it to the cloud (see the "Sync" section below).
 */

import { useSyncExternalStore } from "react"
import { nanoid } from "nanoid"
import { AppError } from "./errors"

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
  /** Anyone can view it at /p/<owner>/<id> once synced. Needs sign-in; absent = private. */
  isPublic?: boolean
  createdAt: string
  updatedAt: string
}

export interface SourceTemplate {
  id: string
  name: string
  baseTemplate: string
  isDefault: boolean
  isBuiltIn?: boolean
  /** Always set on stored templates (normalize() fills it); absent on built-ins */
  updatedAt?: string
}

export type RecordKind = "playlist" | "template"

/** Sync bookkeeping. Not part of backups. */
export interface SyncState {
  /** Account this device last synced with; null = never synced / signed out */
  userId: string | null
  /** Highest server `synced_at` already pulled */
  cursor: string | null
  /** Ids changed locally since the last successful push */
  dirty: string[]
}

export interface StoreData {
  version: 2
  playlists: Playlist[]
  templates: SourceTemplate[]
  /** Deletion markers (id → kind + time) so deletes propagate through sync */
  deleted: Record<string, { kind: RecordKind; at: string }>
  sync: SyncState
}

export interface NewItem {
  videoCode: string
  normalizedCode: string
  note?: string | null
}

const STORAGE_KEY = "av-collector:v2"
const LEGACY_KEY = "av-collector:v1"
const EPOCH = new Date(0).toISOString()
const EMPTY_SYNC: SyncState = { userId: null, cursor: null, dirty: [] }
const EMPTY: StoreData = { version: 2, playlists: [], templates: [], deleted: {}, sync: EMPTY_SYNC }

let cache: StoreData | null = null
const listeners = new Set<() => void>()

function load(): StoreData {
  if (cache) return cache
  try {
    // v1 had the same shape minus sync fields; normalize() fills them in
    const raw = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_KEY)
    cache = raw ? normalize(JSON.parse(raw)) : EMPTY
  } catch {
    cache = EMPTY
  }
  return cache
}

function normalize(data: unknown): StoreData {
  const d = (data ?? {}) as Partial<StoreData>
  const sync = (d.sync ?? {}) as Partial<SyncState>
  return {
    version: 2,
    playlists: Array.isArray(d.playlists) ? d.playlists : [],
    templates: Array.isArray(d.templates)
      ? d.templates.map((t) => ({ ...t, updatedAt: t.updatedAt ?? EPOCH }))
      : [],
    deleted: d.deleted && typeof d.deleted === "object" ? d.deleted : {},
    sync: {
      userId: typeof sync.userId === "string" ? sync.userId : null,
      cursor: typeof sync.cursor === "string" ? sync.cursor : null,
      dirty: Array.isArray(sync.dirty) ? sync.dirty : [],
    },
  }
}

/** Saves and marks `touched` ids for the next sync push. */
function save(next: StoreData, touched: string[] = []) {
  if (touched.length > 0) {
    next = { ...next, sync: { ...next.sync, dirty: [...new Set([...next.sync.dirty, ...touched])] } }
  }
  cache = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    throw new AppError("storageFull")
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
  if (!exists) throw new AppError("playlistNotFound")
  return {
    ...data,
    playlists: data.playlists.map((p) => (p.id === id ? { ...fn(p), updatedAt: now() } : p)),
  }
}

// ---------- Playlists ----------

export function createPlaylist(input: { name: string; description?: string | null; items?: NewItem[] }): Playlist {
  const name = input.name.trim()
  if (!name) throw new AppError("playlistNameRequired")
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
  save({ ...data, playlists: [playlist, ...data.playlists] }, [playlist.id])
  return playlist
}

export function updatePlaylist(id: string, input: { name: string; description?: string | null }) {
  const name = input.name.trim()
  if (!name) throw new AppError("playlistNameRequired")
  save(updatePlaylistIn(load(), id, (p) => ({ ...p, name, description: input.description?.trim() || null })), [id])
}

export function setPlaylistPublic(id: string, isPublic: boolean) {
  save(updatePlaylistIn(load(), id, (p) => ({ ...p, isPublic })), [id])
}

export function deletePlaylist(id: string) {
  const data = load()
  save(
    {
      ...data,
      playlists: data.playlists.filter((p) => p.id !== id),
      deleted: { ...data.deleted, [id]: { kind: "playlist", at: now() } },
    },
    [id]
  )
}

/** Restores a previously deleted playlist (used for undo). */
export function restorePlaylist(playlist: Playlist) {
  const data = load()
  if (data.playlists.some((p) => p.id === playlist.id)) return
  const { [playlist.id]: _, ...deleted } = data.deleted
  // Fresh updatedAt so the restore beats the already-synced deletion
  save({ ...data, playlists: [{ ...playlist, updatedAt: now() }, ...data.playlists], deleted }, [playlist.id])
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
    }),
    [playlistId]
  )
  return added
}

export function deleteItems(playlistId: string, itemIds: string[]) {
  const ids = new Set(itemIds)
  save(updatePlaylistIn(load(), playlistId, (p) => ({ ...p, items: p.items.filter((i) => !ids.has(i.id)) })), [playlistId])
}

/** Replaces the item list with an earlier snapshot (used for undo). */
export function restoreItems(playlistId: string, snapshot: PlaylistItem[]) {
  save(updatePlaylistIn(load(), playlistId, (p) => ({ ...p, items: snapshot })), [playlistId])
}

/**
 * Undo for deleteItems: puts back only the removed items at their old indexes, so
 * edits made since (notes, adds, other deletes) survive. Skips codes already back.
 */
export function restoreDeletedItems(playlistId: string, removed: { item: PlaylistItem; index: number }[]) {
  const data = load()
  if (!data.playlists.some((p) => p.id === playlistId)) return
  save(
    updatePlaylistIn(data, playlistId, (p) => {
      const items = [...p.items]
      const seen = new Set(items.map((i) => i.normalizedCode))
      // Ascending order so earlier inserts don't shift later target indexes
      for (const { item, index } of [...removed].sort((a, b) => a.index - b.index)) {
        if (seen.has(item.normalizedCode)) continue
        seen.add(item.normalizedCode)
        items.splice(Math.min(Math.max(index, 0), items.length), 0, item)
      }
      return { ...p, items }
    }),
    [playlistId]
  )
}

/** Restores several playlists' item lists in one save (undo for multi-playlist edits). Skips deleted playlists. */
export function restoreItemSnapshots(snapshots: Pick<Playlist, "id" | "items">[]) {
  const data = load()
  const byId = new Map(snapshots.map((s) => [s.id, s.items]))
  const touched = data.playlists.filter((p) => byId.has(p.id)).map((p) => p.id)
  if (touched.length === 0) return
  save(
    {
      ...data,
      playlists: data.playlists.map((p) => (byId.has(p.id) ? { ...p, items: byId.get(p.id)!, updatedAt: now() } : p)),
    },
    touched
  )
}

/**
 * Moves items to another playlist in one save. Codes the target already has are
 * only removed from the source. Returns the number actually added to the target.
 */
export function moveItems(fromId: string, itemIds: string[], toId: string): number {
  const data = load()
  const from = data.playlists.find((p) => p.id === fromId)
  if (!from) throw new AppError("playlistNotFound")
  const ids = new Set(itemIds)
  let added = 0
  const next = updatePlaylistIn(data, toId, (p) => {
    const result = mergeItems(p.items, from.items.filter((i) => ids.has(i.id)))
    added = result.added
    return { ...p, items: result.items }
  })
  save(updatePlaylistIn(next, fromId, (p) => ({ ...p, items: p.items.filter((i) => !ids.has(i.id)) })), [fromId, toId])
  return added
}

/**
 * Puts one code in exactly the given playlists: adds it where missing, removes it
 * elsewhere. Only playlists whose membership changes are touched; returns their ids.
 */
export function setCodePlaylists(item: NewItem, playlistIds: string[]): string[] {
  const data = load()
  const want = new Set(playlistIds)
  const touched: string[] = []
  const playlists = data.playlists.map((p) => {
    const has = p.items.some((i) => i.normalizedCode === item.normalizedCode)
    if (has === want.has(p.id)) return p
    touched.push(p.id)
    const items = has
      ? p.items.filter((i) => i.normalizedCode !== item.normalizedCode)
      : mergeItems(p.items, [item]).items
    return { ...p, items, updatedAt: now() }
  })
  if (touched.length > 0) save({ ...data, playlists }, touched)
  return touched
}

export function updateItemNote(playlistId: string, itemId: string, note: string) {
  save(
    updatePlaylistIn(load(), playlistId, (p) => ({
      ...p,
      items: p.items.map((i) => (i.id === itemId ? { ...i, note: note.trim() || null } : i)),
    })),
    [playlistId]
  )
}

// ---------- Source templates ----------

export function createTemplate(input: { name: string; baseTemplate: string }) {
  const name = input.name.trim()
  const baseTemplate = input.baseTemplate.trim()
  if (!name) throw new AppError("nameRequired")
  if (!baseTemplate.includes("{code}")) throw new AppError("templateMissingCode")
  try {
    new URL(baseTemplate.replace("{code}", "TEST-001"))
  } catch {
    throw new AppError("invalidUrl")
  }
  const data = load()
  const id = nanoid(10)
  save(
    { ...data, templates: [...data.templates, { id, name, baseTemplate, isDefault: false, updatedAt: now() }] },
    [id]
  )
}

export function deleteTemplate(id: string) {
  const data = load()
  save(
    {
      ...data,
      templates: data.templates.filter((t) => t.id !== id),
      deleted: { ...data.deleted, [id]: { kind: "template", at: now() } },
    },
    [id]
  )
}

/** Restores a previously deleted template (used for undo). */
export function restoreTemplate(template: SourceTemplate) {
  const data = load()
  if (data.templates.some((t) => t.id === template.id)) return
  const { [template.id]: _, ...deleted } = data.deleted
  // Fresh updatedAt so the restore beats the already-synced deletion
  save({ ...data, templates: [...data.templates, { ...template, updatedAt: now() }], deleted }, [template.id])
}

// ---------- Backup ----------

export function exportData(): string {
  const { playlists, templates } = load()
  return JSON.stringify({ version: 2, playlists, templates }, null, 2)
}

function markDeleted(data: StoreData, playlists: Playlist[], templates: SourceTemplate[]) {
  const at = now()
  const deleted = { ...data.deleted }
  for (const p of playlists) deleted[p.id] = { kind: "playlist", at }
  for (const t of templates) deleted[t.id] = { kind: "template", at }
  return deleted
}

/** Imports a backup file. "merge" keeps existing playlists; "replace" overwrites everything. */
export function importData(json: string, mode: "merge" | "replace"): number {
  let parsed: StoreData
  try {
    parsed = normalize(JSON.parse(json))
  } catch {
    throw new AppError("invalidFile")
  }
  const data = load()
  // Imported records count as fresh edits, so they win over older cloud copies
  const touch = <T extends { updatedAt?: string }>(r: T): T & { updatedAt: string } => ({ ...r, updatedAt: now() })
  if (mode === "replace") {
    const playlists = parsed.playlists.map(touch)
    const templates = parsed.templates.map(touch)
    const keep = new Set([...playlists, ...templates].map((r) => r.id))
    const removedPlaylists = data.playlists.filter((p) => !keep.has(p.id))
    const removedTemplates = data.templates.filter((t) => !keep.has(t.id))
    const deleted = markDeleted(data, removedPlaylists, removedTemplates)
    for (const id of keep) delete deleted[id]
    save({ ...data, playlists, templates, deleted }, [
      ...keep,
      ...[...removedPlaylists, ...removedTemplates].map((r) => r.id),
    ])
    return playlists.length
  }
  const ids = new Set([...data.playlists.map((p) => p.id), ...Object.keys(data.deleted)])
  const incoming = parsed.playlists.map((p) => touch(ids.has(p.id) ? { ...p, id: nanoid(10) } : p))
  const templateUrls = new Set(data.templates.map((t) => t.baseTemplate))
  const newTemplates = parsed.templates
    .filter((t) => !templateUrls.has(t.baseTemplate))
    .map((t) => touch({ ...t, id: nanoid(10) }))
  save(
    {
      ...data,
      playlists: [...incoming, ...data.playlists],
      templates: [...data.templates, ...newTemplates],
    },
    [...incoming, ...newTemplates].map((r) => r.id)
  )
  return incoming.length
}

/** Deletes every playlist and template. When signed in, this propagates to the cloud. */
export function clearAllData() {
  const data = load()
  const ids = [...data.playlists, ...data.templates].map((r) => r.id)
  save({ ...data, playlists: [], templates: [], deleted: markDeleted(data, data.playlists, data.templates) }, ids)
}

/** Wipes this device only (sign-out "remove data from this device"); nothing is synced. */
export function resetLocalData() {
  save(EMPTY)
}

// ---------- Sync (used by lib/sync.ts only) ----------

/** One playlist or template as stored in the cloud. `data` is null for deletions. */
export interface SyncRecord {
  id: string
  kind: RecordKind
  data: Playlist | SourceTemplate | null
  deleted: boolean
  updatedAt: string
}

export const subscribeStore = subscribe

export function getSyncState(): SyncState {
  return load().sync
}

/** Switches the account this device syncs with. A new account re-pushes everything and pulls from scratch. */
export function setSyncUser(userId: string | null) {
  const data = load()
  if (data.sync.userId === userId) return
  const all = [...data.playlists, ...data.templates].map((r) => r.id).concat(Object.keys(data.deleted))
  save({ ...data, sync: { userId, cursor: null, dirty: userId ? all : [] } })
}

function localRecord(data: StoreData, id: string): SyncRecord | null {
  const playlist = data.playlists.find((p) => p.id === id)
  if (playlist) return { id, kind: "playlist", data: playlist, deleted: false, updatedAt: playlist.updatedAt }
  const template = data.templates.find((t) => t.id === id)
  if (template) return { id, kind: "template", data: template, deleted: false, updatedAt: template.updatedAt ?? EPOCH }
  const tombstone = data.deleted[id]
  if (tombstone) return { id, kind: tombstone.kind, data: null, deleted: true, updatedAt: tombstone.at }
  return null
}

/** Local versions of everything changed since the last push. */
export function getDirtyRecords(): SyncRecord[] {
  const data = load()
  return data.sync.dirty.map((id) => localRecord(data, id)).filter((r): r is SyncRecord => r !== null)
}

/** Clears dirty flags for pushed records, unless they were edited again while the push was in flight. */
export function markPushed(pushed: SyncRecord[]) {
  const data = load()
  const done = new Set(
    pushed.filter((r) => localRecord(data, r.id)?.updatedAt === r.updatedAt).map((r) => r.id)
  )
  if (done.size === 0) return
  save({ ...data, sync: { ...data.sync, dirty: data.sync.dirty.filter((id) => !done.has(id)) } })
}

const isNewer = (a: string, b: string) => Date.parse(a) > Date.parse(b)

/** Merges pulled records: per record, the newer `updatedAt` wins. */
export function applyRemote(records: SyncRecord[], cursor: string | null) {
  const data = load()
  let { playlists, templates } = data
  const deleted = { ...data.deleted }
  const superseded = new Set<string>()

  for (const remote of records) {
    const malformed =
      !remote.deleted && (!remote.data || (remote.kind === "playlist" && !Array.isArray((remote.data as Playlist).items)))
    if (malformed) continue
    const local = localRecord({ ...data, playlists, templates, deleted }, remote.id)
    if (local && !isNewer(remote.updatedAt, local.updatedAt)) continue
    superseded.add(remote.id)
    playlists = playlists.filter((p) => p.id !== remote.id)
    templates = templates.filter((t) => t.id !== remote.id)
    if (remote.deleted) {
      deleted[remote.id] = { kind: remote.kind, at: remote.updatedAt }
      continue
    }
    delete deleted[remote.id]
    if (remote.kind === "playlist") {
      const p = { ...(remote.data as Playlist), id: remote.id, updatedAt: remote.updatedAt }
      // Keep the list newest-first, matching createPlaylist
      const at = playlists.findIndex((q) => q.createdAt < p.createdAt)
      playlists = at === -1 ? [...playlists, p] : [...playlists.slice(0, at), p, ...playlists.slice(at)]
    } else {
      templates = [...templates, { ...(remote.data as SourceTemplate), id: remote.id, updatedAt: remote.updatedAt }]
    }
  }

  if (superseded.size === 0 && cursor === data.sync.cursor) return
  save({
    ...data,
    playlists,
    templates,
    deleted,
    sync: { ...data.sync, cursor, dirty: data.sync.dirty.filter((id) => !superseded.has(id)) },
  })
}

// ---------- Demo ----------

/**
 * Text comes from the Demo messages of the current locale. jobs/stats/sources/saves.mjs spots the
 * demo playlist by its description in any locale, so keep those strings unique.
 */
export function loadDemoData(text: { name: string; description: string; note: string }): Playlist {
  const codes = ["SSIS-001", "IPX-920", "WAAA-412", "MIDV-018", "FC2-PPV-1234567"]
  return createPlaylist({
    name: text.name,
    description: text.description,
    items: codes.map((c, i) => ({
      videoCode: c,
      normalizedCode: c,
      note: i === 0 ? text.note : null,
    })),
  })
}
