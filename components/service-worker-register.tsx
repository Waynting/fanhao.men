"use client"

import { useEffect } from "react"

// Registers public/sw.js in production only; in dev the cache would serve stale Turbopack chunks.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Not fatal: the app works without offline support (e.g. plain http on a LAN).
    })
  }, [])

  return null
}
