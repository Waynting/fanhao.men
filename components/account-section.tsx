"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Cloud, Loader2, LogOut, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { useFormatter, useNow, useTranslations } from "next-intl"
import { DATE_TIME } from "@/lib/date-formats"
import { ProfileFields } from "@/components/profile-fields"
import { UserAvatar } from "@/components/user-avatar"
import { getSupabase, signInWithGoogle, useSession } from "@/lib/supabase"
import { googleIdentity, reloadProfile, saveProfile, useProfile, validateDisplayName } from "@/lib/profile"
import { hasPendingChanges, syncNow, useSyncStatus } from "@/lib/sync"
import { resetLocalData, setSyncUser } from "@/lib/local-store"
import { useErrorText } from "@/i18n/use-error-text"

export function AccountSection() {
  const t = useTranslations("Settings.account")
  const format = useFormatter()
  // Re-render periodically so "2 minutes ago" stays current
  const now = useNow({ updateInterval: 30_000 })
  const errorText = useErrorText()
  const { ready, session } = useSession()
  const profile = useProfile()
  const sync = useSyncStatus()
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  // Profile form, seeded from the saved profile
  const [displayName, setDisplayName] = useState("")
  const [showEmail, setShowEmail] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [nameError, setNameError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const saved = profile.status === "ready" ? profile.profile : null

  useEffect(() => {
    if (saved) {
      setDisplayName(saved.displayName)
      setShowEmail(saved.showEmail)
      setTags(saved.tags)
    }
  }, [saved])

  const handleSignIn = async () => {
    setRedirecting(true)
    try {
      await signInWithGoogle()
    } catch {
      toast.error(t("googleUnavailable"))
      setRedirecting(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    const invalid = validateDisplayName(displayName)
    if (invalid) {
      setNameError(errorText(invalid))
      return
    }
    setSaving(true)
    try {
      await saveProfile({ displayName, showEmail, tags })
      toast.success(t("profileUpdated"))
    } catch (error) {
      toast.error(errorText(error, "saveFailed"))
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async (removeLocal: boolean) => {
    const supabase = getSupabase()
    if (!supabase) return
    setSigningOut(true)
    // Flush pending edits first so nothing is lost when the device data is removed
    if (hasPendingChanges()) await syncNow()
    if (removeLocal && hasPendingChanges()) {
      toast.error(t("pendingChanges"))
      setSigningOut(false)
      return
    }
    await supabase.auth.signOut()
    setSyncUser(null)
    if (removeLocal) resetLocalData()
    setSigningOut(false)
    setLogoutOpen(false)
    toast.success(removeLocal ? t("signedOutRemoved") : t("signedOut"))
  }

  const identity = session ? googleIdentity(session.user) : null
  const dirty =
    saved !== null && (displayName.trim() !== saved.displayName || showEmail !== saved.showEmail || tags.join("\n") !== saved.tags.join("\n"))

  return (
    <Card id="account" className="scroll-mt-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Cloud className="h-5 w-5" />
          {t("title")}
        </CardTitle>
        <CardDescription>
          {session
            ? t("signedInDescription")
            : t("signedOutDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!ready ? null : !session || !identity ? (
          <Button onClick={handleSignIn} disabled={redirecting}>
            {redirecting ? <Loader2 className="animate-spin" /> : <GoogleIcon />}
            {t("signIn")}
          </Button>
        ) : (
          <div className="space-y-6">
            {/* Who + sync */}
            <div className="flex items-center gap-3">
              <UserAvatar src={identity.avatarUrl} name={saved?.displayName ?? identity.name} className="h-11 w-11 text-base" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium text-zinc-900 truncate">{saved?.displayName ?? identity.name}</p>
                <p className="text-zinc-500 truncate">{identity.email}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg bg-zinc-50 px-3 py-2.5">
              <div className="flex-1 min-w-0 text-sm text-zinc-600">
                {sync.state === "syncing" ? (
                  t("syncing")
                ) : sync.state === "error" ? (
                  <div className={sync.errorKind === "offline" ? "text-zinc-600" : "text-red-600"}>
                    <p className="font-medium">{t("syncFailed")}</p>
                    <p>{t(`syncErrors.${sync.errorKind ?? "unknown"}`)}</p>
                    {/* Raw server message, for bug reports */}
                    {sync.error && (
                      <details className="mt-1 text-xs text-zinc-500">
                        <summary className="cursor-pointer select-none w-fit">{t("syncErrorDetails")}</summary>
                        <code className="mt-1 block break-all font-mono">{sync.error}</code>
                      </details>
                    )}
                  </div>
                ) : sync.lastSyncedAt ? (
                  <span title={format.dateTime(sync.lastSyncedAt, DATE_TIME)}>
                    {t("lastSynced", {
                      // Relative within a day ("2 minutes ago"), full date and time beyond that
                      time:
                        now.getTime() - sync.lastSyncedAt.getTime() < 86_400_000
                          ? // `now` only ticks every 30s, so it can trail a sync that just finished
                            format.relativeTime(sync.lastSyncedAt, new Date(Math.max(now.getTime(), sync.lastSyncedAt.getTime())))
                          : format.dateTime(sync.lastSyncedAt, DATE_TIME),
                    })}
                  </span>
                ) : (
                  t("notSynced")
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => void syncNow()} disabled={sync.state === "syncing"}>
                {sync.state === "syncing" ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                {t("syncNow")}
              </Button>
            </div>

            {/* Profile */}
            <div className="border-t border-zinc-100 pt-5">
              <p className="text-sm font-semibold text-zinc-800 mb-4">{t("profile")}</p>
              {profile.status === "loading" ? (
                <Loader2 className="h-5 w-5 animate-spin text-zinc-300" />
              ) : profile.status === "error" ? (
                <div className="text-sm text-zinc-500 space-y-2">
                  <p>{t("profileLoadFailed")}</p>
                  <Button variant="outline" size="sm" onClick={reloadProfile}>
                    {t("retry")}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <ProfileFields
                    displayName={displayName}
                    onDisplayNameChange={(value) => {
                      setDisplayName(value)
                      setNameError(null)
                    }}
                    showEmail={showEmail}
                    onShowEmailChange={setShowEmail}
                    tags={tags}
                    onTagsChange={setTags}
                    email={identity.email}
                    avatarUrl={identity.avatarUrl}
                    error={nameError}
                  />
                  <Button type="submit" size="sm" disabled={saving || (saved !== null && !dirty)}>
                    {saving && <Loader2 className="animate-spin" />}
                    {saved ? t("saveChanges") : t("createProfile")}
                  </Button>
                </form>
              )}
            </div>

            <div className="border-t border-zinc-100 pt-4">
              <Button variant="ghost" className="-ml-2 text-zinc-600" onClick={() => setLogoutOpen(true)}>
                <LogOut />
                {t("signOut")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={logoutOpen} onOpenChange={(open) => !signingOut && setLogoutOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("signOut")}</DialogTitle>
            <DialogDescription>
              {t("signOutDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => handleSignOut(false)} disabled={signingOut}>
              {t("signOutKeep")}
            </Button>
            <Button variant="destructive" onClick={() => handleSignOut(true)} disabled={signingOut}>
              {signingOut && <Loader2 className="animate-spin" />}
              {t("signOutRemove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.96 10.96 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  )
}
