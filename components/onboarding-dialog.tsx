"use client"

import { useRef, useState } from "react"
import { ArrowLeft, ArrowRight, Check, CloudUpload, Loader2, RefreshCw, Smartphone } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { ProfileFields } from "@/components/profile-fields"
import { UserAvatar } from "@/components/user-avatar"
import { useSession } from "@/lib/supabase"
import { googleIdentity, saveProfile, useProfile, validateDisplayName } from "@/lib/profile"
import { useStore } from "@/lib/local-store"
import { useErrorText } from "@/i18n/use-error-text"

/** Staggered entrance for each step's content: RISE class + delay(ms) style. */
const RISE = "animate-in fade-in slide-in-from-bottom-2 duration-500"
const delay = (ms: number) => ({ animationDelay: `${ms}ms`, animationFillMode: "both" as const })

type Identity = ReturnType<typeof googleIdentity>

/**
 * Shown after sign-in until the user has a profile row.
 * "稍後再說" hides it for this page load only; it comes back on the next visit.
 */
export function OnboardingDialog() {
  const { session } = useSession()
  const profile = useProfile()
  const store = useStore()
  const [dismissed, setDismissed] = useState(false)

  const user = session?.user
  if (!user) return null
  const identity = googleIdentity(user)
  const open = profile.status === "ready" && profile.profile === null && !dismissed

  return (
    <OnboardingFlow
      key={user.id}
      open={open}
      identity={identity}
      playlistCount={store?.playlists.length ?? 0}
      onDismiss={() => setDismissed(true)}
    />
  )
}

interface OnboardingFlowProps {
  open: boolean
  identity: Identity
  playlistCount: number
  onDismiss: () => void
}

/** The two-step dialog itself, without the session/profile wiring. */
export function OnboardingFlow({ open, identity, playlistCount, onDismiss }: OnboardingFlowProps) {
  const t = useTranslations("Settings.onboarding")
  const errorText = useErrorText()
  const [step, setStep] = useState<1 | 2>(1)
  const primaryRef = useRef<HTMLButtonElement>(null)
  const [displayName, setDisplayName] = useState(identity.name)
  const [showEmail, setShowEmail] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault()
    const invalid = validateDisplayName(displayName)
    if (invalid) {
      setError(errorText(invalid))
      return
    }
    setSaving(true)
    try {
      await saveProfile({ displayName, showEmail, tags })
      toast.success(t("welcomeToast", { name: displayName.trim() }))
    } catch (err) {
      toast.error(errorText(err, "saveFailed"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !saving && onDismiss()}>
      <DialogContent
        // minmax(0,1fr): without it a long nickname widens the grid track past the viewport on phones
        className="p-0 gap-0 grid-cols-[minmax(0,1fr)] sm:w-[calc(100vw-2rem)] sm:rounded-xl sm:max-w-md overflow-x-hidden overflow-y-auto [&>button:last-child]:text-white sm:[&>button:last-child]:top-3.5"
        onInteractOutside={(e) => e.preventDefault()}
        // Focus the primary action rather than "稍後再說", which otherwise opens looking pre-selected
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          primaryRef.current?.focus({ preventScroll: true })
        }}
      >
        {/* Header band: same ink as the navbar, dotted grid for texture */}
        <div className="relative bg-zinc-900 px-6 pt-6 pb-10 text-white">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.15]"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)",
              backgroundSize: "14px 14px",
              maskImage: "linear-gradient(to bottom, black, transparent)",
            }}
          />
          <div className="relative flex items-center gap-1.5" aria-label={t("stepLabel", { step, total: 2 })}>
            {[1, 2].map((n) => (
              <span
                key={n}
                className={`h-1 rounded-full transition-all duration-300 ${
                  n === step ? "w-6 bg-white" : n < step ? "w-3 bg-white/60" : "w-3 bg-white/20"
                }`}
              />
            ))}
            <span className="ml-2 text-[11px] text-zinc-400 tabular-nums">{step} / 2</span>
          </div>
        </div>

        <div className="relative px-6 -mt-7">
          <UserAvatar
            src={identity.avatarUrl}
            name={displayName || identity.name}
            className="h-14 w-14 text-xl ring-4 ring-white shadow-md"
          />
        </div>

        {step === 1 ? (
          <div key="welcome" className="px-6 pt-3 pb-6 space-y-5">
            <div className={RISE} style={delay(0)}>
              <DialogTitle className="text-xl font-semibold tracking-tight text-zinc-900">
                {identity.name ? t("welcomeName", { name: identity.name }) : t("welcome")}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-zinc-500">
                {t.rich("signedInAs", {
                  hl: (chunks) => <span className="text-zinc-700">{chunks}</span>,
                  email: identity.email,
                })}
              </DialogDescription>
            </div>

            <ul className="space-y-3">
              {[
                {
                  icon: CloudUpload,
                  title: playlistCount > 0 ? t("syncLocal", { count: playlistCount }) : t("backupAuto"),
                  body: t("mergeBody"),
                },
                { icon: RefreshCw, title: t("autoSyncTitle"), body: t("autoSyncBody") },
                { icon: Smartphone, title: t("devicesTitle"), body: t("devicesBody") },
              ].map(({ icon: Icon, title, body }, i) => (
                <li key={title} style={delay(80 + i * 70)} className={`${RISE} flex gap-3`}>
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                    <Icon className="h-3.5 w-3.5 text-zinc-700" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{title}</p>
                    <p className="text-xs text-zinc-500 leading-relaxed">{body}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div style={delay(320)} className={`${RISE} flex flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-1`}>
              <Button variant="ghost" className="text-zinc-500" onClick={onDismiss}>
                {t("later")}
              </Button>
              <Button ref={primaryRef} onClick={() => setStep(2)}>
                {t("setupProfile")}
                <ArrowRight />
              </Button>
            </div>
          </div>
        ) : (
          <form key="profile" onSubmit={handleFinish} className="px-6 pt-3 pb-6 space-y-5">
            <div className={RISE} style={delay(0)}>
              <DialogTitle className="text-xl font-semibold tracking-tight text-zinc-900">{t("profileTitle")}</DialogTitle>
              <DialogDescription className="mt-1 text-sm text-zinc-500">{t("profileDescription")}</DialogDescription>
            </div>

            <div className={RISE} style={delay(80)}>
              <ProfileFields
                displayName={displayName}
                onDisplayNameChange={(value) => {
                  setDisplayName(value)
                  setError(null)
                }}
                showEmail={showEmail}
                onShowEmailChange={setShowEmail}
                tags={tags}
                onTagsChange={setTags}
                email={identity.email}
                avatarUrl={identity.avatarUrl}
                error={error}
                autoFocus
              />
            </div>

            <div style={delay(160)} className={`${RISE} flex flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-1`}>
              <Button type="button" variant="ghost" className="text-zinc-500" onClick={() => setStep(1)} disabled={saving}>
                <ArrowLeft />
                {t("back")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : <Check />}
                {t("finish")}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
