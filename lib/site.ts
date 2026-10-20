// Site identity, shared by metadata, the manifest, robots/sitemap and the UI.
import type { Metadata } from "next"
import type { Messages } from "next-intl"
import { hasLocale } from "next-intl"
import { getMessages, getTranslations } from "next-intl/server"
import { OG_LOCALES, localePath, routing, type Locale } from "@/i18n/routing"

export const SITE_NAME = "fanhao.men"
/**
 * Canonical origin for metadata, robots and sitemap. Set NEXT_PUBLIC_SITE_URL per environment;
 * on Vercel it falls back to the project's production domain, locally to localhost.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "")

type PageKey = keyof Messages["Metadata"]["pages"]
type LocaleParams = { params: Promise<{ locale: string }> }

/** Title separator: full-width bar for CJK titles without spaces, " | " otherwise. */
export function titleSeparator(locale: Locale) {
  return locale === "zh-Hant" || locale === "zh-Hans" || locale === "ja" ? "｜" : " | "
}

/** hreflang map for an unprefixed path; x-default points at the default (unprefixed) locale. */
export function languageAlternates(path: string) {
  return {
    ...Object.fromEntries(routing.locales.map((l) => [l, localePath(l, path)])),
    "x-default": path,
  }
}

/**
 * Metadata for a page in the request's locale, as a `generateMetadata` function. Title and
 * description come from Metadata.pages.<page> (the site title/description when `page` is omitted).
 * A child's `openGraph`/`twitter` replaces the root's wholesale, and plain `title`/`description`
 * never reach them, so share cards need these set on every page.
 */
export function pageMetadata({
  page,
  path,
  noindex = false,
}: {
  page?: PageKey
  /** Unprefixed path ("/about"). Omit for pages whose URL is meaningless to others (local or one-off). */
  path?: string
  noindex?: boolean
}) {
  return async ({ params }: LocaleParams): Promise<Metadata> => {
    const requested = (await params).locale
    const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale
    const t = await getTranslations({ locale, namespace: "Metadata" })
    // Not every page has its own description, so read the page's entry as a whole
    const pages: Record<PageKey, { title: string; description?: string }> = (await getMessages({ locale })).Metadata.pages
    const own = page ? pages[page] : null
    const title = own ? `${own.title}${titleSeparator(locale)}${SITE_NAME}` : t("siteTitle")
    const description = own?.description ?? t("siteDescription")
    const url = path && localePath(locale, path)
    const image = { url: "/opengraph-image", width: 1200, height: 630, alt: t("ogAlt") }

    return {
      title: { absolute: title },
      description,
      ...(noindex
        ? { robots: { index: false, follow: false } }
        : path && { alternates: { canonical: url, languages: languageAlternates(path) } }),
      openGraph: {
        type: "website",
        siteName: SITE_NAME,
        locale: OG_LOCALES[locale],
        alternateLocale: routing.locales.filter((l) => l !== locale).map((l) => OG_LOCALES[l]),
        images: [image],
        title,
        description,
        ...(url && { url }),
      },
      twitter: { card: "summary_large_image", images: [image], title, description },
    }
  }
}
