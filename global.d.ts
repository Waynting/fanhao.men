import type { Locale } from "@/i18n/routing"
import type messages from "@/i18n/source-messages"

declare module "next-intl" {
  interface AppConfig {
    Locale: Locale
    Messages: typeof messages
  }
}
