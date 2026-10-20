import { defineRouting } from "next-intl/routing"

export const routing = defineRouting({
  // zh-Hant is the original language and keeps the unprefixed URLs (and existing links/SEO);
  // the others live under /en, /ja, ...
  locales: ["zh-Hant", "zh-Hans", "en", "ja", "ko"],
  defaultLocale: "zh-Hant",
  localePrefix: "as-needed",
  // hreflang is emitted in each page's <head> by localizedMetadata()
  alternateLinks: false,
})

export type Locale = (typeof routing.locales)[number]

/** Names shown in the language switcher, each in its own language. */
export const LOCALE_NAMES: Record<Locale, string> = {
  "zh-Hant": "繁體中文",
  "zh-Hans": "简体中文",
  en: "English",
  ja: "日本語",
  ko: "한국어",
}

/** Open Graph locale per app locale. */
export const OG_LOCALES: Record<Locale, string> = {
  "zh-Hant": "zh_TW",
  "zh-Hans": "zh_CN",
  en: "en_US",
  ja: "ja_JP",
  ko: "ko_KR",
}

/** Path of `path` (unprefixed, starting with "/") in `locale`. */
export function localePath(locale: Locale, path: string) {
  if (locale === routing.defaultLocale) return path
  return path === "/" ? `/${locale}` : `/${locale}${path}`
}
