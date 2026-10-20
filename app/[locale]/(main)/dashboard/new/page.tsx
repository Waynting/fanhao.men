"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createPlaylist } from "@/lib/local-store"
import { trackCreatePlaylist } from "@/lib/analytics"
import { toast } from "sonner"
import { ArrowLeft } from "lucide-react"
import { Link, useRouter } from "@/i18n/navigation"
import { useErrorText } from "@/i18n/use-error-text"

export default function NewPlaylistPage() {
  const t = useTranslations("Dashboard.new")
  const tCommon = useTranslations("Common")
  const errorText = useErrorText()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      const playlist = createPlaylist({ name, description })
      trackCreatePlaylist({ playlist_id: playlist.id, has_description: !!playlist.description })
      toast.success(t("created"))
      router.push(`/playlist/${playlist.id}`)
    } catch (error) {
      toast.error(errorText(error))
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" asChild className="-ml-2">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {tCommon("backToDashboard")}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">{t("nameLabel")}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
                maxLength={100}
                autoFocus
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t("descriptionLabel")}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("descriptionPlaceholder")}
                maxLength={500}
                rows={4}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={!name.trim()}>{t("submit")}</Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard">{tCommon("cancel")}</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
