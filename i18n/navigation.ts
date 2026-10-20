import { createNavigation } from "next-intl/navigation"
import { routing } from "./routing"

// Locale-aware replacements for next/link and next/navigation: hrefs are written unprefixed
// ("/dashboard") and get the current locale's prefix.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
