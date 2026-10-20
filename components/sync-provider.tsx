"use client"

import { useEffect, useRef } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { getSupabase } from "@/lib/supabase"
import { hasPendingChanges, syncNow, useSyncStatus } from "@/lib/sync"
import { subscribeStore } from "@/lib/local-store"

const EDIT_DEBOUNCE_MS = 2000
const ERROR_TOAST_ID = "sync-error"

/** Triggers sync on sign-in, when the app regains focus or network, and shortly after local edits. */
export function SyncProvider() {
  useSyncErrorToast()

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

/**
 * Toasts once when sync starts failing. Automatic retries that keep failing stay quiet (the navbar
 * avatar and settings still show the error); the next toast comes only after a successful sync,
 * or when the user presses the toast's retry button and that retry fails too.
 */
function useSyncErrorToast() {
  const t = useTranslations("Nav")
  const tErrors = useTranslations("Settings.account.syncErrors")
  const { state, errorKind } = useSyncStatus()
  const alerted = useRef(false)

  useEffect(() => {
    if (state === "idle") {
      // Recovered (or never failed): dismiss a stale error toast and re-arm
      if (alerted.current) toast.dismiss(ERROR_TOAST_ID)
      alerted.current = false
      return
    }
    if (state !== "error" || alerted.current) return
    alerted.current = true

    const kind = errorKind ?? "unknown"
    if (kind === "offline") {
      // Expected while offline; the "online" listener retries on its own, so no retry button
      toast(t("syncOfflineToast"), { id: ERROR_TOAST_ID, description: tErrors("offline") })
      return
    }
    toast.error(t("syncErrorToast"), {
      id: ERROR_TOAST_ID,
      description: tErrors(kind),
      duration: 10_000,
      action: {
        label: t("retry"),
        onClick: () => {
          // A failure the user explicitly asked to retry deserves feedback again
          alerted.current = false
          void syncNow()
        },
      },
    })
  }, [state, errorKind, t, tErrors])
}
