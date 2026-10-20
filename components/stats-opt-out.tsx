"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { TrendingUp } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useSession } from "@/lib/supabase"
import { getStatsOptOut, setStatsOptOut } from "@/lib/trending"

/** Settings card for "參與熱門統計". Only shown when signed in, since only signed-in users are counted. */
export function StatsOptOut() {
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
      toast.success(next ? "已加入熱門統計" : "已退出熱門統計，下次更新排行時生效")
    } catch {
      toast.error("設定失敗，請稍後再試")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5" />
          熱門統計
        </CardTitle>
        <CardDescription>
          <Link href="/explore" className="underline underline-offset-2">探索</Link>
          頁的排行來自登入用戶收藏的番號和點擊的連結。只會顯示匯總後的人數，不會公開你是誰、存了什麼；
          至少 3 人以上的番號才會出現在排行。
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
            把我的收藏與點擊計入熱門統計
          </Label>
        </div>
      </CardContent>
    </Card>
  )
}
