"use client"

import { useSyncExternalStore } from "react"
import type { User } from "@supabase/supabase-js"
import { getSupabase } from "@/lib/supabase"
import { AppError } from "@/lib/errors"

export interface Profile {
  displayName: string
  showEmail: boolean
  tags: string[]
}

type ProfileState =
  | { status: "signed-out"; userId: null; profile: null }
  | { status: "loading" | "error"; userId: string; profile: null }
  /** `profile` null = signed in but onboarding not finished */
  | { status: "ready"; userId: string; profile: Profile | null }

export const DISPLAY_NAME_MAX = 20

/** Returns the error, or null when valid. Mirrors the check in 0002_profiles.sql. */
export function validateDisplayName(name: string): AppError | null {
  const length = [...name.trim()].length
  if (length === 0) return new AppError("nicknameRequired")
  if (length > DISPLAY_NAME_MAX) return new AppError("nicknameTooLong", { max: DISPLAY_NAME_MAX })
  return null
}

export const TAG_MAX_COUNT = 5
export const TAG_MAX_LENGTH = 12

/** Trims, collapses inner whitespace and drops a leading "#", so "#FC2  派" and "FC2 派" are the same tag. */
export function normalizeTag(raw: string) {
  return raw.trim().replace(/^#+/, "").replace(/\s+/g, " ").trim()
}

/**
 * Adds a tag, or returns the error that prevents it. Duplicates (ignoring case) are a no-op.
 * Mirrors profile_tags_valid() in 0005_profile_tags.sql.
 */
export function addTag(tags: string[], raw: string): string[] | AppError {
  const tag = normalizeTag(raw)
  if (!tag) return tags
  if (tags.some((t) => t.toLowerCase() === tag.toLowerCase())) return tags
  if ([...tag].length > TAG_MAX_LENGTH) return new AppError("tagTooLong", { max: TAG_MAX_LENGTH })
  if (tags.length >= TAG_MAX_COUNT) return new AppError("tagLimit", { max: TAG_MAX_COUNT })
  return [...tags, tag]
}

/** Google profile fields Supabase copies into user_metadata. */
export function googleIdentity(user: User) {
  const meta = user.user_metadata ?? {}
  const name: string = meta.full_name || meta.name || user.email?.split("@")[0] || ""
  return {
    name: [...name.trim()].slice(0, DISPLAY_NAME_MAX).join(""),
    avatarUrl: (meta.avatar_url || meta.picture || null) as string | null,
    email: user.email ?? "",
  }
}

// ---------- Store ----------

const SIGNED_OUT: ProfileState = { status: "signed-out", userId: null, profile: null }
let state: ProfileState = SIGNED_OUT
const listeners = new Set<() => void>()
let started = false

function set(next: ProfileState) {
  state = next
  listeners.forEach((l) => l())
}

async function fetchProfile(userId: string) {
  const supabase = getSupabase()
  if (!supabase) return
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, show_email, tags")
    .eq("id", userId)
    .maybeSingle()
  if (state.userId !== userId) return // signed out or switched account meanwhile
  if (error) set({ status: "error", userId, profile: null })
  else
    set({
      status: "ready",
      userId,
      profile: data ? { displayName: data.display_name, showEmail: data.show_email, tags: data.tags ?? [] } : null,
    })
}

function start() {
  if (started) return
  started = true
  const supabase = getSupabase()
  if (!supabase) return
  supabase.auth.onAuthStateChange((_event, session) => {
    const userId = session?.user.id ?? null
    if (userId === state.userId) return
    if (!userId) {
      set(SIGNED_OUT)
      return
    }
    set({ status: "loading", userId, profile: null })
    // Supabase warns against awaiting its own calls inside this callback
    setTimeout(() => void fetchProfile(userId), 0)
  })
}

export function useProfile(): ProfileState {
  return useSyncExternalStore(
    (listener) => {
      start()
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => state,
    () => SIGNED_OUT
  )
}

export async function saveProfile(input: Profile) {
  const supabase = getSupabase()
  const userId = state.userId
  if (!supabase || !userId) throw new AppError("signInRequired")
  const invalid = validateDisplayName(input.displayName)
  if (invalid) throw invalid
  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    display_name: input.displayName.trim(),
    show_email: input.showEmail,
    tags: input.tags,
    updated_at: new Date().toISOString(),
  })
  if (error) throw new AppError("saveFailed")
  set({ status: "ready", userId, profile: { ...input, displayName: input.displayName.trim() } })
}

/** Retry after a failed load (e.g. offline at sign-in). */
export function reloadProfile() {
  if (state.userId) {
    set({ status: "loading", userId: state.userId, profile: null })
    void fetchProfile(state.userId)
  }
}
