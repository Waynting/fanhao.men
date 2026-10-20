"use client"

import { Eye, EyeOff, MessageSquare } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { UserAvatar } from "@/components/user-avatar"
import { DISPLAY_NAME_MAX } from "@/lib/profile"

interface ProfileFieldsProps {
  displayName: string
  onDisplayNameChange: (value: string) => void
  showEmail: boolean
  onShowEmailChange: (value: boolean) => void
  email: string
  avatarUrl: string | null
  error?: string | null
  autoFocus?: boolean
}

/** Nickname + email visibility, with a live preview of how others will see you. Used by onboarding and settings. */
export function ProfileFields({
  displayName,
  onDisplayNameChange,
  showEmail,
  onShowEmailChange,
  email,
  avatarUrl,
  error,
  autoFocus,
}: ProfileFieldsProps) {
  const length = [...displayName.trim()].length
  const shownName = displayName.trim() || "你的暱稱"

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="profile-name">暱稱</Label>
          <span className={`text-xs tabular-nums ${length > DISPLAY_NAME_MAX ? "text-red-600" : "text-zinc-400"}`}>
            {length}/{DISPLAY_NAME_MAX}
          </span>
        </div>
        <Input
          id="profile-name"
          value={displayName}
          onChange={(e) => onDisplayNameChange(e.target.value)}
          placeholder="大家會看到的名字"
          autoComplete="nickname"
          autoFocus={autoFocus}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "profile-name-error" : undefined}
        />
        {error && (
          <p id="profile-name-error" className="text-xs text-red-600">
            {error}
          </p>
        )}
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <Label htmlFor="profile-show-email" className="cursor-pointer">
            公開顯示我的 Gmail
          </Label>
          <p className="text-xs text-zinc-500 leading-relaxed">
            預設不公開。其他人只會看到你的暱稱和頭像。
          </p>
        </div>
        <Switch id="profile-show-email" checked={showEmail} onCheckedChange={onShowEmailChange} />
      </div>

      {/* Live preview: how this identity will read next to a post */}
      <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-3.5">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-400 mb-2.5">其他人看到的你</p>
        <div className="flex items-center gap-3">
          <UserAvatar src={avatarUrl} name={shownName} className="h-9 w-9 text-sm" />
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold truncate ${displayName.trim() ? "text-zinc-900" : "text-zinc-400"}`}>
              {shownName}
            </p>
            <p className="text-xs text-zinc-500 truncate flex items-center gap-1">
              {showEmail ? (
                <>
                  <Eye className="h-3 w-3 shrink-0" />
                  {email}
                </>
              ) : (
                <>
                  <EyeOff className="h-3 w-3 shrink-0" />
                  Gmail 不公開
                </>
              )}
            </p>
          </div>
          <MessageSquare className="h-4 w-4 text-zinc-300 shrink-0" aria-hidden="true" />
        </div>
      </div>
      <p className="text-[11px] text-zinc-400 -mt-2">目前沒有任何內容會公開，這些設定會在社群功能推出後生效。</p>
    </div>
  )
}
