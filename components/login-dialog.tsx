"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, Mail } from "lucide-react"
import { toast } from "sonner"
import { getSupabase } from "@/lib/supabase"

interface LoginDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Google OAuth or an emailed one-time code. A code (not a magic link) is used on purpose:
 * an installed PWA has its own storage, so a link opened in the mail app's browser
 * would sign in the wrong browser.
 */
export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [step, setStep] = useState<"email" | "code">("email")
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setStep("email")
    setCode("")
    setBusy(false)
  }

  const handleGoogle = async () => {
    const supabase = getSupabase()
    if (!supabase) return
    setBusy(true)
    const next = window.location.pathname + window.location.search
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    })
    if (error) {
      toast.error(error.message || "無法連線到 Google")
      setBusy(false)
    }
  }

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = getSupabase()
    if (!supabase) return
    setBusy(true)
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim() })
    setBusy(false)
    if (error) {
      toast.error(error.message || "寄送失敗，請稍後再試")
      return
    }
    setStep("code")
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = getSupabase()
    if (!supabase) return
    setBusy(true)
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" })
    setBusy(false)
    if (error) {
      toast.error("驗證碼錯誤或已過期")
      return
    }
    toast.success("已登入，正在同步資料")
    onOpenChange(false)
    reset()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) reset()
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>登入以同步清單</DialogTitle>
          <DialogDescription>
            登入後，這台裝置的清單會上傳並和你的其他裝置同步。不登入也能照常使用。
          </DialogDescription>
        </DialogHeader>

        {step === "email" ? (
          <div className="space-y-4">
            <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={busy}>
              <GoogleIcon />
              使用 Google 登入
            </Button>
            <div className="flex items-center gap-3 text-xs text-zinc-400">
              <div className="h-px flex-1 bg-zinc-200" />
              或
              <div className="h-px flex-1 bg-zinc-200" />
            </div>
            <form onSubmit={handleSendCode} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy || !email.trim()}>
                {busy ? <Loader2 className="animate-spin" /> : <Mail />}
                寄送登入驗證碼
              </Button>
            </form>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="space-y-3">
            <p className="text-sm text-zinc-600">
              驗證碼已寄到 <span className="font-medium text-zinc-900">{email}</span>，請在 1 小時內輸入。
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="login-code">驗證碼</Label>
              <Input
                id="login-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6,8}"
                maxLength={8}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="font-mono tracking-widest"
                autoFocus
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy || code.length < 6}>
              {busy && <Loader2 className="animate-spin" />}
              登入
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={reset} disabled={busy}>
              換一個 Email
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
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
