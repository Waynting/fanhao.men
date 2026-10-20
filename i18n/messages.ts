import type { Locale } from "./routing"

/** One JSON file per namespace in messages/<locale>/. Add new namespaces here and in source-messages.ts. */
export const NAMESPACES = [
  "Common",
  "Errors",
  "Metadata",
  "Nav",
  "Home",
  "About",
  "Dashboard",
  "Playlist",
  "Share",
  "Settings",
  "Explore",
  "Auth",
  "NotFound",
  "Demo",
] as const

export async function loadMessages(locale: Locale) {
  const entries = await Promise.all(
    NAMESPACES.map(async (ns) => [ns, (await import(`../messages/${locale}/${ns}.json`)).default] as const)
  )
  return Object.fromEntries(entries)
}
