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
import { ProfileFields } from "@/components/profile-fields"
import { UserAvatar } from "@/components/user-avatar"
import { getSupabase, signInWithGoogle, useSession } from "@/lib/supabase"
import { googleIdentity, reloadProfile, saveProfile, useProfile, validateDisplayName } from "@/lib/profile"
import { hasPendingChanges, syncNow, useSyncStatus } from "@/lib/sync"
import { resetLocalData, setSyncUser } from "@/lib/local-store"

export function AccountSection() {
  const { ready, session } = useSession()
  const profile = useProfile()
  const sync = useSyncStatus()
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  // Profile form, seeded from the saved profile
  const [displayName, setDisplayName] = useState("")
  const [showEmail, setShowEmail] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const saved = profile.status === "ready" ? profile.profile : null

  useEffect(() => {
    if (saved) {
      setDisplayName(saved.displayName)
      setShowEmail(saved.showEmail)
    }
  }, [saved])

  const handleSignIn = async () => {
    setRedirecting(true)
    try {
      await signInWithGoogle()
    } catch {
      toast.error("無法連線到 Google，請稍後再試")
      setRedirecting(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    const invalid = validateDisplayName(displayName)
    if (invalid) {
      setNameError(invalid)
      return
    }
    setSaving(true)
    try {
      await saveProfile({ displayName, showEmail })
      toast.success("已更新個人資料")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "儲存失敗")
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
      toast.error("還有變更尚未上傳，請連上網路後再試")
      setSigningOut(false)
      return
    }
    await supabase.auth.signOut()
    setSyncUser(null)
    if (removeLocal) resetLocalData()
    setSigningOut(false)
    setLogoutOpen(false)
    toast.success(removeLocal ? "已登出並移除這台裝置上的資料" : "已登出")
  }

  const identity = session ? googleIdentity(session.user) : null
  const dirty =
    saved !== null && (displayName.trim() !== saved.displayName || showEmail !== saved.showEmail)

  return (
    <Card id="account" className="scroll-mt-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Cloud className="h-5 w-5" />
          帳號與同步
        </CardTitle>
        <CardDescription>
          {session
            ? "清單與自訂來源會自動同步到你登入的所有裝置。"
            : "用 Google 帳號登入，就能在手機、電腦之間同步清單。不登入也能照常使用，資料只會留在這台裝置。"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!ready ? null : !session || !identity ? (
          <Button onClick={handleSignIn} disabled={redirecting}>
            {redirecting ? <Loader2 className="animate-spin" /> : <GoogleIcon />}
            使用 Google 登入
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
              <p className="flex-1 text-sm text-zinc-600">
                {sync.state === "syncing" ? (
                  "同步中…"
                ) : sync.state === "error" ? (
                  <span className="text-red-600">同步失敗：{sync.error}</span>
                ) : sync.lastSyncedAt ? (
                  `上次同步：${sync.lastSyncedAt.toLocaleTimeString("zh-TW")}`
                ) : (
                  "尚未同步"
                )}
              </p>
              <Button variant="outline" size="sm" onClick={() => void syncNow()} disabled={sync.state === "syncing"}>
                {sync.state === "syncing" ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                立即同步
              </Button>
            </div>

            {/* Profile */}
            <div className="border-t border-zinc-100 pt-5">
              <p className="text-sm font-semibold text-zinc-800 mb-4">個人資料</p>
              {profile.status === "loading" ? (
                <Loader2 className="h-5 w-5 animate-spin text-zinc-300" />
              ) : profile.status === "error" ? (
                <div className="text-sm text-zinc-500 space-y-2">
                  <p>無法載入個人資料，可能是網路中斷。</p>
                  <Button variant="outline" size="sm" onClick={reloadProfile}>
                    重試
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
                    email={identity.email}
                    avatarUrl={identity.avatarUrl}
                    error={nameError}
                  />
                  <Button type="submit" size="sm" disabled={saving || (saved !== null && !dirty)}>
                    {saving && <Loader2 className="animate-spin" />}
                    {saved ? "儲存變更" : "建立個人資料"}
                  </Button>
                </form>
              )}
            </div>

            <div className="border-t border-zinc-100 pt-4">
              <Button variant="ghost" className="-ml-2 text-zinc-600" onClick={() => setLogoutOpen(true)}>
                <LogOut />
                登出
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={logoutOpen} onOpenChange={(open) => !signingOut && setLogoutOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>登出</DialogTitle>
            <DialogDescription>
              雲端的資料會保留，下次登入就會回來。如果這是共用裝置，建議一併移除這台裝置上的資料。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => handleSignOut(false)} disabled={signingOut}>
              登出，保留這台裝置的資料
            </Button>
            <Button variant="destructive" onClick={() => handleSignOut(true)} disabled={signingOut}>
              {signingOut && <Loader2 className="animate-spin" />}
              登出並移除
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
