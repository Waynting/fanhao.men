import { getTranslations, setRequestLocale } from "next-intl/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ChevronRight, Github, ExternalLink, History, Mail, MousePointerClick } from "lucide-react"
import { Link } from "@/i18n/navigation"
import type { Locale } from "@/i18n/routing"
import { pageMetadata } from "@/lib/site"

export const generateMetadata = pageMetadata({ page: "about", path: "/about" })

const PROBLEMS = ["problem1", "problem2", "problem3", "problem4"] as const
const SOLUTIONS = ["solution1", "solution2", "solution3", "solution4"] as const
const RECENT_STEPS = ["step1", "step2", "step3", "step4"] as const

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale
  setRequestLocale(locale)
  const t = await getTranslations("About")
  const tCommon = await getTranslations("Common")

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {tCommon("backToDashboard")}
          </Link>
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 mb-2">{t("title")}</h1>
        <p className="text-zinc-600">{t("subtitle")}</p>
      </div>

      <div className="space-y-6">
        {/* Contact & Support */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-zinc-900">
              <Mail className="h-5 w-5" />
              {t("contact.title")}
            </CardTitle>
            <CardDescription className="text-zinc-700">{t("contact.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-zinc-600 mb-3">{t("contact.body")}</p>
              <a
                href="mailto:wayntingliu@gmail.com"
                className="inline-flex items-center gap-2 text-zinc-900 hover:text-zinc-700 font-medium transition-colors"
              >
                <Mail className="h-4 w-4" />
                wayntingliu@gmail.com
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <p className="text-xs text-zinc-500">{t("contact.tip")}</p>
          </CardContent>
        </Card>

        {/* GitHub Link */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Github className="h-5 w-5" />
              {t("openSource.title")}
            </CardTitle>
            <CardDescription>{t("openSource.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <a href="https://github.com/Waynting/fanhao.men" target="_blank" rel="noopener noreferrer">
              <Button className="w-full sm:w-auto">
                <Github className="h-4 w-4 mr-2" />
                {t("openSource.button")}
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </a>
          </CardContent>
        </Card>

        {/* Changelog */}
        <Link href="/changelog" className="block group">
          <Card className="transition-colors group-hover:border-zinc-300">
            <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
              <div className="space-y-1.5">
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  {t("changelog.title")}
                </CardTitle>
                <CardDescription>{t("changelog.description")}</CardDescription>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5" />
            </CardHeader>
          </Card>
        </Link>

        {/* Recently opened: how to use */}
        <Card id="recent-opens">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MousePointerClick className="h-5 w-5" />
              {t("recentOpens.title")}
            </CardTitle>
            <CardDescription>{t("recentOpens.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-zinc-700">
            <ol className="list-decimal list-inside space-y-2 ml-4">
              {RECENT_STEPS.map((key) => (
                <li key={key}>
                  <strong>{t(`recentOpens.${key}Label`)}</strong>
                  {t(`recentOpens.${key}`)}
                </li>
              ))}
            </ol>
            <p className="text-sm text-zinc-500">{t("recentOpens.privacy")}</p>
            <p className="text-sm text-zinc-500">{t("recentOpens.limit")}</p>
          </CardContent>
        </Card>

        {/* Why I Built This */}
        <Card>
          <CardHeader>
            <CardTitle>{t("why.title")}</CardTitle>
            <CardDescription>{t("why.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-zinc-700">
            <p>
              <strong>{t("why.problemLead")}</strong>
              {t("why.problemIntro")}
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              {PROBLEMS.map((key) => (
                <li key={key}>{t(`why.${key}`)}</li>
              ))}
            </ul>

            <p>
              <strong>{t("why.solutionLead")}</strong>
              {t("why.solutionIntro")}
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              {SOLUTIONS.map((key) => (
                <li key={key}>
                  <strong>{t(`why.${key}Label`)}</strong>
                  {t(`why.${key}`)}
                </li>
              ))}
            </ul>

            <p className="pt-2">
              <strong>{t("why.techLead")}</strong>
              {t("why.tech")}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
