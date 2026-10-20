"use client"

import { useState } from "react"
import Link from "next/link"
import { Cloud, CloudOff, Loader2, LogIn } from "lucide-react"
import { LoginDialog } from "@/components/login-dialog"
import { authEnabled, useSession } from "@/lib/supabase"
import { useSyncStatus } from "@/lib/sync"

/** Navbar entry: "登入" when signed out, sync status (linking to settings) when signed in. */
export function AccountButton() {
  const { ready, session } = useSession()
  const sync = useSyncStatus()
  const [loginOpen, setLoginOpen] = useState(false)

  if (!authEnabled) {
    return <span className="text-[11px] text-zinc-500 hidden sm:inline">資料僅儲存在此裝置</span>
  }
  if (!ready) return null

  if (!session) {
    return (
      <>
        <button
          onClick={() => setLoginOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <LogIn className="h-4 w-4" />
          登入同步
        </button>
        <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      </>
    )
  }

  const Icon = sync.state === "syncing" ? Loader2 : sync.state === "error" ? CloudOff : Cloud
  const label = sync.state === "syncing" ? "同步中" : sync.state === "error" ? "同步失敗" : "已同步"

  return (
    <Link
      href="/settings#account"
      title={session.user.email ?? undefined}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-white/10 ${
        sync.state === "error" ? "text-red-400" : "text-zinc-400 hover:text-white"
      }`}
    >
      <Icon className={`h-4 w-4 ${sync.state === "syncing" ? "animate-spin" : ""}`} />
      <span>{label}</span>
    </Link>
  )
}
