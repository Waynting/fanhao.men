"use client"

import { useState } from "react"
import { Eye, EyeOff, MessageSquare, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ProfileTags } from "@/components/profile-tags"
import { UserAvatar } from "@/components/user-avatar"
import { useErrorText } from "@/i18n/use-error-text"
import { DISPLAY_NAME_MAX, TAG_MAX_COUNT, TAG_MAX_LENGTH, addTag } from "@/lib/profile"

interface ProfileFieldsProps {
  displayName: string
  onDisplayNameChange: (value: string) => void
  showEmail: boolean
  onShowEmailChange: (value: boolean) => void
  tags: string[]
  onTagsChange: (value: string[]) => void
  email: string
  avatarUrl: string | null
  error?: string | null
  autoFocus?: boolean
}

/** Nickname, tags and email visibility, with a live preview of how others will see you. Used by onboarding and settings. */
export function ProfileFields({
  displayName,
  onDisplayNameChange,
  showEmail,
  onShowEmailChange,
  tags,
  onTagsChange,
  email,
  avatarUrl,
  error,
  autoFocus,
}: ProfileFieldsProps) {
  const t = useTranslations("Settings.profileFields")
  const length = [...displayName.trim()].length
  const shownName = displayName.trim() || t("yourNickname")

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="profile-name">{t("nickname")}</Label>
          <span className={`text-xs tabular-nums ${length > DISPLAY_NAME_MAX ? "text-red-600" : "text-zinc-400"}`}>
            {length}/{DISPLAY_NAME_MAX}
          </span>
        </div>
        <Input
          id="profile-name"
          value={displayName}
          onChange={(e) => onDisplayNameChange(e.target.value)}
          placeholder={t("nicknamePlaceholder")}
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

      <TagsField tags={tags} onTagsChange={onTagsChange} />

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <Label htmlFor="profile-show-email" className="cursor-pointer">
            {t("showEmail")}
          </Label>
          <p className="text-xs text-zinc-500 leading-relaxed">
            {t("showEmailHint")}
          </p>
        </div>
        <Switch id="profile-show-email" checked={showEmail} onCheckedChange={onShowEmailChange} />
      </div>

      {/* Live preview: how this identity will read next to a post */}
      <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-3.5">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-400 mb-2.5">{t("previewTitle")}</p>
        <div className="flex items-center gap-3">
          <UserAvatar src={avatarUrl} name={shownName} className="h-9 w-9 text-sm" />
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold truncate ${displayName.trim() ? "text-zinc-900" : "text-zinc-400"}`}>
              {shownName}
            </p>
            <ProfileTags tags={tags} className="my-1" />
            <p className="text-xs text-zinc-500 truncate flex items-center gap-1">
              {showEmail ? (
                <>
                  <Eye className="h-3 w-3 shrink-0" />
                  {email}
                </>
              ) : (
                <>
                  <EyeOff className="h-3 w-3 shrink-0" />
                  {t("emailHidden")}
                </>
              )}
            </p>
          </div>
          <MessageSquare className="h-4 w-4 text-zinc-300 shrink-0" aria-hidden="true" />
        </div>
      </div>
      <p className="text-[11px] text-zinc-400 -mt-2">{t("notPublicYet")}</p>
    </div>
  )
}

/** Chips plus a text box: Enter or a comma adds the typed tag, Backspace on an empty box removes the last one. */
function TagsField({ tags, onTagsChange }: { tags: string[]; onTagsChange: (value: string[]) => void }) {
  const t = useTranslations("Settings.profileFields")
  const errorText = useErrorText()
  const [draft, setDraft] = useState("")
  const [error, setError] = useState<string | null>(null)
  const full = tags.length >= TAG_MAX_COUNT

  const commit = (raw: string) => {
    const next = addTag(tags, raw)
    if (next instanceof Error) {
      setError(errorText(next))
      return false
    }
    onTagsChange(next)
    setDraft("")
    setError(null)
    return true
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // isComposing: Enter that confirms a Chinese/Japanese IME candidate must not add the tag yet
    if (e.nativeEvent.isComposing) return
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault() // also keeps Enter from submitting the profile form
      commit(draft)
    } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
      onTagsChange(tags.slice(0, -1))
      setError(null)
    }
  }

  const handleChange = (value: string) => {
    // A pasted or IME-typed "a, b，c" adds every finished piece and keeps the last one as the draft
    const parts = value.split(/[,，、]/)
    if (parts.length > 1) {
      let next = tags
      for (const part of parts.slice(0, -1)) {
        const added = addTag(next, part)
        if (added instanceof Error) {
          setError(errorText(added))
          break
        }
        next = added
      }
      onTagsChange(next)
      setDraft(parts.at(-1) ?? "")
      return
    }
    setDraft(value)
    setError(null)
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label htmlFor="profile-tags">{t("tags")}</Label>
        <span className="text-xs tabular-nums text-zinc-400">
          {tags.length}/{TAG_MAX_COUNT}
        </span>
      </div>
      <div
        className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
      >
        {tags.map((tag) => (
          <span key={tag} className="inline-flex max-w-full items-center gap-0.5 rounded-full bg-zinc-900 py-0.5 pl-2.5 pr-1 text-xs font-medium text-white">
            <span className="truncate">{tag}</span>
            <button
              type="button"
              onClick={() => {
                onTagsChange(tags.filter((x) => x !== tag))
                setError(null)
              }}
              aria-label={t("removeTag", { tag })}
              // ::after widens the hit area to 40px on phones without making the chip bigger
              className="relative grid h-5 w-5 shrink-0 place-items-center rounded-full text-zinc-400 hover:bg-white/15 hover:text-white after:absolute after:-inset-2.5 after:content-[''] sm:after:-inset-1"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {!full && (
          <input
            id="profile-tags"
            value={draft}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            // Finish the typed tag when leaving the field instead of silently dropping it
            onBlur={() => draft.trim() && commit(draft)}
            placeholder={tags.length === 0 ? t("tagsPlaceholder") : t("tagsPlaceholderMore")}
            maxLength={TAG_MAX_LENGTH * 2}
            enterKeyHint="done"
            aria-invalid={Boolean(error)}
            aria-describedby="profile-tags-hint"
            className="h-7 min-w-[6rem] flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
          />
        )}
      </div>
      <p id="profile-tags-hint" className={`text-xs ${error ? "text-red-600" : "text-zinc-500"}`}>
        {error ?? t("tagsHint", { count: TAG_MAX_COUNT, length: TAG_MAX_LENGTH })}
      </p>
    </div>
  )
}
