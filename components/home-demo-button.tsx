"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { useRouter } from "@/i18n/navigation"
import { loadDemoData, useStore } from "@/lib/local-store"

/** Landing-page CTA: opens the demo playlist, creating it first unless this device already has one. */
export function HomeDemoButton({ children }: { children: React.ReactNode }) {
  const tDemo = useTranslations("Demo")
  const router = useRouter()
  const store = useStore()

  const handleClick = () => {
    const text = { name: tDemo("name"), description: tDemo("description"), note: tDemo("note") }
    const existing = store?.playlists.find((p) => p.description === text.description)
    const playlist = existing ?? loadDemoData(text)
    router.push(`/playlist/${playlist.id}`)
  }

  return (
    <Button size="lg" variant="outline" onClick={handleClick}>
      {children}
    </Button>
  )
}
