import type { MetadataRoute } from "next"
import { localePath, routing } from "@/i18n/routing"
import { SITE_URL } from "@/lib/site"

const PAGES = [
  { path: "/", changeFrequency: "monthly", priority: 1 },
  { path: "/about", changeFrequency: "yearly", priority: 0.5 },
  { path: "/changelog", changeFrequency: "weekly", priority: 0.3 },
] as const

/** Every indexable page in every locale, each listing its translations as hreflang alternates. */
export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.flatMap(({ path, changeFrequency, priority }) => {
    const languages = {
      ...Object.fromEntries(routing.locales.map((l) => [l, SITE_URL + localePath(l, path)])),
      "x-default": SITE_URL + path,
    }
    return routing.locales.map((locale) => ({
      url: SITE_URL + localePath(locale, path),
      changeFrequency,
      priority,
      alternates: { languages },
    }))
  })
}
