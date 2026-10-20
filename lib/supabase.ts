"use client"

import { useSyncExternalStore } from "react"
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

/** Login is optional: without these env vars the app runs local-only and hides account UI. */
export const authEnabled = Boolean(url && publishableKey)

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (!authEnabled || typeof window === "undefined") return null
  client ??= createClient(url!, publishableKey!, {
    auth: {
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: true,
      // /auth/callback exchanges the OAuth code explicitly
      detectSessionInUrl: false,
    },
  })
  return client
}

/** sessionStorage key for the page to return to after the OAuth round trip. */
export const AUTH_RETURN_KEY = "fanhao:auth-return"

/**
 * Google is the only sign-in method. The return path is kept in sessionStorage rather than a
 * ?next= query, so redirectTo is exactly /auth/callback and matches Supabase's allow-list as-is.
 */
export async function signInWithGoogle() {
  const supabase = getSupabase()
  if (!supabase) return
  try {
    sessionStorage.setItem(AUTH_RETURN_KEY, window.location.pathname + window.location.search)
  } catch {
    // Storage blocked: the callback falls back to /dashboard
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  })
  if (error) throw error
}

// ---------- Session hook ----------

type SessionState = { ready: boolean; session: Session | null }

let sessionState: SessionState = { ready: false, session: null }
const listeners = new Set<() => void>()
let started = false

function start() {
  if (started) return
  started = true
  const supabase = getSupabase()
  if (!supabase) {
    sessionState = { ready: true, session: null }
    return
  }
  supabase.auth.onAuthStateChange((_event, session) => {
    sessionState = { ready: true, session }
    listeners.forEach((l) => l())
  })
}

function subscribe(listener: () => void) {
  start()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const SERVER_STATE: SessionState = { ready: false, session: null }

/** Current auth session. `ready` is false until Supabase has restored it from storage. */
export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, () => sessionState, () => SERVER_STATE)
}

export function onSessionChange(listener: (session: Session | null) => void) {
  return subscribe(() => listener(sessionState.session))
}
