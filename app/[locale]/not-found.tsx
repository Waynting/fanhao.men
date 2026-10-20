import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  const t = useTranslations("NotFound")
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="text-center px-4">
        <h1 className="text-6xl font-bold text-zinc-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-zinc-700 mb-2">{t("title")}</h2>
        <p className="text-zinc-600 mb-8">{t("body")}</p>
        <Button asChild size="lg">
          <Link href="/dashboard">{t("cta")}</Link>
        </Button>
      </div>
    </div>
  )
}
