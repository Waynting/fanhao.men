import { Fragment } from "react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import type { Locale } from "@/i18n/routing"
import { loadChangelog } from "@/lib/changelog"
import { pageMetadata } from "@/lib/site"

export const generateMetadata = pageMetadata({ page: "changelog", path: "/changelog" })

// Group headings in CHANGELOG.md; anything else falls back to the outline style
const GROUP_STYLES: Record<string, string> = {
  新增: "bg-zinc-900 text-white border-zinc-900",
  改善: "bg-zinc-100 text-zinc-700 border-zinc-100",
  修正: "bg-white text-zinc-600 border-zinc-300",
}

/** Renders `code` spans; the file uses no other inline markdown. */
function Inline({ text }: { text: string }) {
  return text.split(/(`[^`]+`)/).map((part, i) =>
    part.startsWith("`") && part.endsWith("`") ? (
      <code key={i} className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[0.85em] text-zinc-800">
        {part.slice(1, -1)}
      </code>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  )
}

export default async function ChangelogPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale
  setRequestLocale(locale)
  const t = await getTranslations("About")
  const tCommon = await getTranslations("Common")
  const log = await loadChangelog()
  const note = t("changelog.note")

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {tCommon("backToDashboard")}
          </Link>
        </Button>
      </div>

      <header className="mb-10 sm:mb-14">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{log.title}</h1>
        {log.intro.map((p) => (
          <p key={p} className="mt-2 text-zinc-500">
            {p}
          </p>
        ))}
        {note && <p className="mt-4 rounded-lg bg-zinc-50 px-4 py-3 text-sm text-zinc-600">{note}</p>}
      </header>

      <ol className="relative">
        {log.releases.map((release, i) => (
          <li key={release.date} className="relative grid gap-4 pb-12 sm:grid-cols-[9rem_1fr] sm:gap-8">
            {/* Timeline rail: dot on the date, line down to the next release (left edge on phones, between the columns on wider screens) */}
            <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-zinc-900 ring-4 ring-white sm:left-[calc(10rem-5px)]" />
            {i < log.releases.length - 1 && (
              <span className="absolute left-[4.5px] top-5 -bottom-1.5 w-px bg-zinc-200 sm:left-[calc(10rem-0.5px)]" />
            )}
            <div className="pl-6 sm:pl-0">
              <div className="flex items-baseline gap-2 font-mono text-sm tabular-nums sm:sticky sm:top-[calc(6rem+env(safe-area-inset-top))] sm:flex-col sm:gap-0.5">
                {release.version && <span className="font-semibold text-zinc-900">v{release.version}</span>}
                <time
                  dateTime={release.date}
                  className={release.version ? "text-zinc-500" : "font-medium text-zinc-900"}
                >
                  {release.date}
                </time>
              </div>
            </div>

            <div className="space-y-6 pl-6 sm:pl-0">
              {release.groups.map((group) => (
                <section key={group.label}>
                  <h2
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                      GROUP_STYLES[group.label] ?? GROUP_STYLES["修正"]
                    }`}
                  >
                    {group.label}
                  </h2>
                  <ul className="mt-3 space-y-2.5">
                    {group.items.map((item) => (
                      <li key={item} className="flex gap-3 text-[15px] leading-relaxed text-zinc-700">
                        <span aria-hidden className="mt-[0.7em] h-px w-2.5 shrink-0 bg-zinc-400" />
                        <span>
                          <Inline text={item} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
