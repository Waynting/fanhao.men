"use client"

/**
 * Mirrors the local store to Supabase for signed-in users.
 * Pull everything newer than the cursor, merge (newer updatedAt wins), then push local changes.
 */

import { useSyncExternalStore } from "react"
import { getSupabase } from "@/lib/supabase"
import {
  applyRemote,
  getDirtyRecords,
  getSyncState,
  markPushed,
  setSyncUser,
  type SyncRecord,
} from "@/lib/local-store"

const PAGE_SIZE = 1000
const PUSH_BATCH = 200
// Rows from transactions that committed late can carry a slightly older synced_at; re-read a margin.
const CURSOR_OVERLAP_MS = 60_000

/** Coarse cause of a failed sync, so the UI can show friendly text instead of the raw message. */
export type SyncErrorKind = "offline" | "network" | "auth" | "permission" | "unknown"

export type SyncStatus = {
  state: "idle" | "syncing" | "error"
  lastSyncedAt: Date | null
  /** Raw message of the last failure (for details/tooltips), null when the last run succeeded. */
  error: string | null
  errorKind: SyncErrorKind | null
}

let status: SyncStatus = { state: "idle", lastSyncedAt: null, error: null, errorKind: null }
const listeners = new Set<() => void>()

function setStatus(next: Partial<SyncStatus>) {
  status = { ...status, ...next }
  listeners.forEach((l) => l())
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => status,
    () => status
  )
}

interface Row {
  id: string
  kind: SyncRecord["kind"]
  data: SyncRecord["data"]
  deleted: boolean
  updated_at: string
  synced_at: string
}

async function pull(userId: string) {
  const supabase = getSupabase()!
  const cursor = getSyncState().cursor
  const since = cursor ? new Date(Date.parse(cursor) - CURSOR_OVERLAP_MS).toISOString() : null
  let latest = cursor
  const records: SyncRecord[] = []

  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase
      .from("user_records")
      .select("id, kind, data, deleted, updated_at, synced_at")
      .eq("user_id", userId)
      .order("synced_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (since) query = query.gt("synced_at", since)
    const { data, error } = await query.returns<Row[]>()
    if (error) throw error
    for (const row of data) {
      records.push({ id: row.id, kind: row.kind, data: row.data, deleted: row.deleted, updatedAt: row.updated_at })
      if (!latest || Date.parse(row.synced_at) > Date.parse(latest)) latest = row.synced_at
    }
    if (data.length < PAGE_SIZE) break
  }

  applyRemote(records, latest)
}

async function push() {
  const supabase = getSupabase()!
  const dirty = getDirtyRecords()
  for (let i = 0; i < dirty.length; i += PUSH_BATCH) {
    const batch = dirty.slice(i, i + PUSH_BATCH)
    const { error } = await supabase.rpc("push_records", {
      records: batch.map((r) => ({
        id: r.id,
        kind: r.kind,
        data: r.data,
        deleted: r.deleted,
        updated_at: r.updatedAt,
      })),
    })
    if (error) throw error
    markPushed(batch)
  }
}

let running: Promise<void> | null = null
let again = false

/** Runs a sync now. Concurrent calls coalesce into one follow-up run. */
export function syncNow(): Promise<void> {
  if (running) {
    again = true
    return running
  }
  running = (async () => {
    const supabase = getSupabase()
    if (!supabase) return
    const { data } = await supabase.auth.getSession()
    const user = data.session?.user
    if (!user) return
    setSyncUser(user.id)
    setStatus({ state: "syncing", error: null, errorKind: null })
    try {
      do {
        again = false
        await pull(user.id)
        await push()
      } while (again)
      setStatus({ state: "idle", lastSyncedAt: new Date() })
    } catch (error) {
      // Supabase errors are plain objects with a message, not Error instances
      const message = (error as { message?: string } | null)?.message
      setStatus({ state: "error", error: message || null, errorKind: classifySyncError(error) })
    }
  })().finally(() => {
    running = null
  })
  return running
}

function classifySyncError(error: unknown): SyncErrorKind {
  if (typeof navigator !== "undefined" && !navigator.onLine) return "offline"
  const { message = "", code = "" } = (error ?? {}) as { message?: string; code?: string }
  // fetch() rejections surface as "TypeError: Failed to fetch" (Chrome), "Load failed" (Safari),
  // "NetworkError when attempting to fetch resource" (Firefox)
  if (error instanceof TypeError || /failed to fetch|load failed|networkerror|network request failed/i.test(message)) {
    return "network"
  }
  // PostgREST: PGRST301/302/303 = missing/invalid/expired JWT
  if (/^PGRST30/.test(code) || /jwt|refresh token|not authenticated/i.test(message)) return "auth"
  if (code === "42501" || /permission denied|row-level security/i.test(message)) return "permission"
  return "unknown"
}

export function hasPendingChanges() {
  return getSyncState().dirty.length > 0
}
