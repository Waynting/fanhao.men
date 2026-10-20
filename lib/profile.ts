"use client"

import { useSyncExternalStore } from "react"
import type { User } from "@supabase/supabase-js"
import { getSupabase } from "@/lib/supabase"

export interface Profile {
  displayName: string
  showEmail: boolean
}

type ProfileState =
  | { status: "signed-out"; userId: null; profile: null }
  | { status: "loading" | "error"; userId: string; profile: null }
  /** `profile` null = signed in but onboarding not finished */
  | { status: "ready"; userId: string; profile: Profile | null }

export const DISPLAY_NAME_MAX = 20

/** Returns an error message, or null when valid. Mirrors the check in 0002_profiles.sql. */
export function validateDisplayName(name: string): string | null {
  const length = [...name.trim()].length
  if (length === 0) return "請輸入暱稱"
  if (length > DISPLAY_NAME_MAX) return `暱稱最多 ${DISPLAY_NAME_MAX} 個字`
  return null
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
    .select("display_name, show_email")
    .eq("id", userId)
    .maybeSingle()
  if (state.userId !== userId) return // signed out or switched account meanwhile
  if (error) set({ status: "error", userId, profile: null })
  else
    set({
      status: "ready",
      userId,
      profile: data ? { displayName: data.display_name, showEmail: data.show_email } : null,
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
  if (!supabase || !userId) throw new Error("請先登入")
  const invalid = validateDisplayName(input.displayName)
  if (invalid) throw new Error(invalid)
  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    display_name: input.displayName.trim(),
    show_email: input.showEmail,
    updated_at: new Date().toISOString(),
  })
  if (error) throw new Error("儲存失敗，請稍後再試")
  set({ status: "ready", userId, profile: { displayName: input.displayName.trim(), showEmail: input.showEmail } })
}

/** Retry after a failed load (e.g. offline at sign-in). */
export function reloadProfile() {
  if (state.userId) {
    set({ status: "loading", userId: state.userId, profile: null })
    void fetchProfile(state.userId)
  }
}
