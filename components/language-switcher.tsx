"use client"

import { useLocale, useTranslations } from "next-intl"
import { Check, Globe } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usePathname, useRouter } from "@/i18n/navigation"
import { LOCALE_NAMES, routing, type Locale } from "@/i18n/routing"

/** Globe menu in the navbar. Switching also saves the choice in the locale cookie. */
export function LanguageSwitcher() {
  const t = useTranslations("Nav")
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()

  const switchTo = (next: Locale) => {
    // Keep the query and hash: the share page carries its playlist in the hash
    router.replace(`${pathname}${window.location.search}${window.location.hash}`, { locale: next })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("language")}
        className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition-colors outline-none"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{LOCALE_NAMES[locale]}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {routing.locales.map((l) => (
          <DropdownMenuItem key={l} lang={l} onSelect={() => switchTo(l)} className="justify-between gap-6">
            {LOCALE_NAMES[l]}
            {l === locale && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
