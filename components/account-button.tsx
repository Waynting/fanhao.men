"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { CloudOff, Loader2, LogIn } from "lucide-react"
import { toast } from "sonner"
import { ProfileTags } from "@/components/profile-tags"
import { UserAvatar } from "@/components/user-avatar"
import { Link } from "@/i18n/navigation"
import { authEnabled, signInWithGoogle, useSession } from "@/lib/supabase"
import { googleIdentity, useProfile } from "@/lib/profile"
import { useSyncStatus } from "@/lib/sync"

/** Navbar entry: Google sign-in when signed out; avatar, nickname and sync state (linking to settings) when signed in. */
export function AccountButton() {
  const t = useTranslations("Nav")
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
        toast.error(t("signInFailed"))
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
        {t("signIn")}
      </button>
    )
  }

  const identity = googleIdentity(session.user)
  const name = profile.profile?.displayName ?? identity.name
  const tags = profile.profile?.tags ?? []
  const failed = sync.state === "error"
  // Offline is expected and self-heals, so it's shown in grey rather than red
  const offline = failed && sync.errorKind === "offline"
  const statusLabel = t(
    sync.state === "syncing" ? "syncing" : offline ? "syncOfflineToast" : failed ? "syncFailed" : "synced"
  )

  return (
    <Link
      href="/settings#account"
      title={[name, ...tags.map((tag) => `#${tag}`), statusLabel].join("・")}
      className="group flex items-center gap-2 pl-1 pr-1 sm:pr-3 py-1 rounded-full hover:bg-white/10 transition-colors"
    >
      <span className="relative">
        <UserAvatar src={identity.avatarUrl} name={name} className="h-7 w-7 text-xs" />
        {/* Sync state as a dot on the avatar: pulsing while syncing, red on error */}
        <span
          aria-hidden="true"
          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-zinc-900 ${
            offline ? "bg-zinc-400" : failed ? "bg-red-500" : sync.state === "syncing" ? "bg-amber-400 animate-pulse" : "bg-emerald-500"
          }`}
        />
      </span>
      {/* The status line below is hidden on phones, so make a failure visible there with an icon */}
      {failed && (
        <CloudOff aria-hidden="true" className={`sm:hidden h-4 w-4 ${offline ? "text-zinc-400" : "text-red-400"}`} />
      )}
      <span className="hidden sm:flex flex-col leading-tight text-left">
        <span className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-zinc-200 group-hover:text-white max-w-[9rem] truncate">{name}</span>
          {/* Navbar room is tight: first tag only, the rest are in the tooltip and settings */}
          <ProfileTags tags={tags} max={1} tone="dark" className="hidden lg:flex flex-nowrap [&>span]:max-w-[6rem]" />
        </span>
        <span className={`text-[10px] flex items-center gap-1 ${failed && !offline ? "text-red-400" : "text-zinc-500"}`}>
          {failed && <CloudOff className="h-2.5 w-2.5" />}
          {statusLabel}
        </span>
      </span>
      <span className="sr-only">{t("goToAccount", { status: statusLabel })}</span>
    </Link>
  )
}
