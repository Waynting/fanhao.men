"use client"

import { useState } from "react"
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
import { Cloud, Loader2, LogIn, LogOut, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { LoginDialog } from "@/components/login-dialog"
import { getSupabase, useSession } from "@/lib/supabase"
import { hasPendingChanges, syncNow, useSyncStatus } from "@/lib/sync"
import { resetLocalData, setSyncUser } from "@/lib/local-store"

export function AccountSection() {
  const { ready, session } = useSession()
  const sync = useSyncStatus()
  const [loginOpen, setLoginOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

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
            : "登入後可在手機、電腦之間同步清單。不登入也能照常使用，資料只會留在這台裝置。"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!ready ? null : !session ? (
          <Button onClick={() => setLoginOpen(true)}>
            <LogIn />
            登入
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="text-sm space-y-1">
              <p>
                <span className="text-zinc-500">帳號：</span>
                <span className="font-medium">{session.user.email}</span>
              </p>
              <p className="text-zinc-500">
                {sync.state === "syncing"
                  ? "同步中…"
                  : sync.state === "error"
                    ? <span className="text-red-600">同步失敗：{sync.error}</span>
                    : sync.lastSyncedAt
                      ? `上次同步：${sync.lastSyncedAt.toLocaleTimeString("zh-TW")}`
                      : "尚未同步"}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => void syncNow()} disabled={sync.state === "syncing"}>
                {sync.state === "syncing" ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                立即同步
              </Button>
              <Button variant="ghost" onClick={() => setLogoutOpen(true)}>
                <LogOut />
                登出
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />

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
