"use client"

import { useEffect } from "react"
import { getSupabase } from "@/lib/supabase"
import { hasPendingChanges, syncNow } from "@/lib/sync"
import { subscribeStore } from "@/lib/local-store"

const EDIT_DEBOUNCE_MS = 2000

/** Triggers sync on sign-in, when the app regains focus or network, and shortly after local edits. */
export function SyncProvider() {
  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) return

    let timer: ReturnType<typeof setTimeout> | undefined
    const schedule = (delay: number) => {
      clearTimeout(timer)
      timer = setTimeout(() => void syncNow(), delay)
    }

    // Supabase warns against awaiting its own calls inside this callback, hence the timer
    const { data: auth } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "INITIAL_SESSION" || event === "SIGNED_IN")) schedule(0)
    })
    const onVisible = () => {
      if (document.visibilityState === "visible") schedule(0)
    }
    const onOnline = () => schedule(0)
    const unsubscribeStore = subscribeStore(() => {
      if (hasPendingChanges()) schedule(EDIT_DEBOUNCE_MS)
    })

    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("online", onOnline)
    return () => {
      clearTimeout(timer)
      auth.subscription.unsubscribe()
      unsubscribeStore()
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("online", onOnline)
    }
  }, [])

  return null
}
