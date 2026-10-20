"use client"

/**
 * Codes the user opened (or copied a link for) from this site, so they can pick which ones to
 * save afterwards. Device-only: not part of the store, backups, sync or the explore stats.
 */

import { useSyncExternalStore } from "react"

export interface RecentOpen {
  code: string
  openedAt: string
}

interface RecentData {
  entries: RecentOpen[]
  /** Opens at or before this time were dismissed from the "review" prompt */
  dismissedAt: string | null
}

const STORAGE_KEY = "av-collector:recent-opens"
const MAX_ENTRIES = 100
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const EMPTY: RecentData = { entries: [], dismissedAt: null }

let cache: RecentData | null = null
const listeners = new Set<() => void>()

function load(): RecentData {
  if (cache) return cache
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null")
    const cutoff = Date.now() - MAX_AGE_MS
    const entries = Array.isArray(raw?.entries)
      ? raw.entries.filter(
          (e: RecentOpen) => typeof e?.code === "string" && typeof e.openedAt === "string" && Date.parse(e.openedAt) > cutoff
        )
      : []
    cache = { entries, dismissedAt: typeof raw?.dismissedAt === "string" ? raw.dismissedAt : null }
  } catch {
    cache = EMPTY
  }
  return cache
}

/** Re-reads storage before a write, so a write never rests on a stale cache. */
function current(): RecentData {
  cache = null
  return load()
}

function save(next: RecentData) {
  cache = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Private mode or storage full: the list just won't survive a reload
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
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

/** Newest first. null during SSR/before hydration. */
export function useRecentOpens(): RecentData | null {
  return useSyncExternalStore(subscribe, load, () => null)
}

/** Remembers codes as just opened; an already listed code moves back to the top. */
export function rememberOpened(codes: string[]) {
  if (typeof window === "undefined" || codes.length === 0) return
  const now = new Date().toISOString()
  const fresh = [...new Set(codes)]
  const { entries, dismissedAt } = current()
  const rest = entries.filter((e) => !fresh.includes(e.code))
  save({ entries: [...fresh.map((code) => ({ code, openedAt: now })), ...rest].slice(0, MAX_ENTRIES), dismissedAt })
}

export function forgetOpened(codes: string[]) {
  const drop = new Set(codes)
  const data = current()
  save({ ...data, entries: data.entries.filter((e) => !drop.has(e.code)) })
}

export function clearRecentOpens() {
  save(EMPTY)
}

/** Hides the prompt until something new is opened; the list itself stays. */
export function dismissRecentOpens() {
  save({ ...current(), dismissedAt: new Date().toISOString() })
}
