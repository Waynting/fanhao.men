"use client"

import { useEffect, useState } from "react"
import { TrendingUp } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useSession } from "@/lib/supabase"
import { getStatsOptOut, setStatsOptOut } from "@/lib/trending"

/** Settings card for "參與熱門統計". Only shown when signed in, since only signed-in users are counted. */
export function StatsOptOut() {
  const t = useTranslations("Settings.stats")
  const { session } = useSession()
  const userId = session?.user.id
  // null = still loading
  const [participating, setParticipating] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    setParticipating(null)
    getStatsOptOut()
      .then((optOut) => !cancelled && setParticipating(!optOut))
      .catch(() => !cancelled && setParticipating(true))
    return () => {
      cancelled = true
    }
  }, [userId])

  if (!userId) return null

  const handleChange = async (next: boolean) => {
    setSaving(true)
    try {
      await setStatsOptOut(!next)
      setParticipating(next)
      toast.success(next ? t("joined") : t("left"))
    } catch {
      toast.error(t("failed"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5" />
          {t("title")}
        </CardTitle>
        <CardDescription>
          {t.rich("description", {
            link: (chunks) => (
              <Link href="/explore" className="underline underline-offset-2">
                {chunks}
              </Link>
            ),
          })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-3">
          <Checkbox
            id="stats-participate"
            checked={participating ?? false}
            disabled={participating === null || saving}
            onCheckedChange={(checked) => void handleChange(checked === true)}
            className="mt-0.5"
          />
          <Label htmlFor="stats-participate" className="text-sm font-normal leading-snug">
            {t("participate")}
          </Label>
        </div>
      </CardContent>
    </Card>
  )
}
