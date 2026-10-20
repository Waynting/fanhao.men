"use client"

import { useState } from "react"
import Link from "next/link"
import { CloudOff, Loader2, LogIn } from "lucide-react"
import { toast } from "sonner"
import { UserAvatar } from "@/components/user-avatar"
import { authEnabled, signInWithGoogle, useSession } from "@/lib/supabase"
import { googleIdentity, useProfile } from "@/lib/profile"
import { useSyncStatus } from "@/lib/sync"

/** Navbar entry: Google sign-in when signed out; avatar, nickname and sync state (linking to settings) when signed in. */
export function AccountButton() {
  const { ready, session } = useSession()
  const profile = useProfile()
  const sync = useSyncStatus()
  const [redirecting, setRedirecting] = useState(false)

  if (!authEnabled || !ready) return null

  if (!session) {
    const handleSignIn = async () => {
      setRedirecting(true)
      try {
        await signInWithGoogle()
      } catch {
        toast.error("無法連線到 Google，請稍後再試")
        setRedirecting(false)
      }
    }
    return (
      <button
        onClick={handleSignIn}
        disabled={redirecting}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-60"
      >
        {redirecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
        登入
      </button>
    )
  }

  const identity = googleIdentity(session.user)
  const name = profile.profile?.displayName ?? identity.name
  const statusLabel = sync.state === "syncing" ? "同步中" : sync.state === "error" ? "同步失敗" : "已同步"

  return (
    <Link
      href="/settings#account"
      title={`${name}・${statusLabel}`}
      className="group flex items-center gap-2 pl-1 pr-1 sm:pr-3 py-1 rounded-full hover:bg-white/10 transition-colors"
    >
      <span className="relative">
        <UserAvatar src={identity.avatarUrl} name={name} className="h-7 w-7 text-xs" />
        {/* Sync state as a dot on the avatar: pulsing while syncing, red on error */}
        <span
          aria-hidden="true"
          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-zinc-900 ${
            sync.state === "error" ? "bg-red-500" : sync.state === "syncing" ? "bg-amber-400 animate-pulse" : "bg-emerald-500"
          }`}
        />
      </span>
      <span className="hidden sm:flex flex-col leading-tight text-left">
        <span className="text-sm font-medium text-zinc-200 group-hover:text-white max-w-[9rem] truncate">{name}</span>
        <span className={`text-[10px] flex items-center gap-1 ${sync.state === "error" ? "text-red-400" : "text-zinc-500"}`}>
          {sync.state === "error" && <CloudOff className="h-2.5 w-2.5" />}
          {statusLabel}
        </span>
      </span>
      <span className="sr-only">{statusLabel}，前往帳號設定</span>
    </Link>
  )
}
