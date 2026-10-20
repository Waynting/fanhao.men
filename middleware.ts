import createMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"

export default createMiddleware(routing)

export const config = {
  // Skip API/internal paths, files with an extension (sw.js, robots.txt, sitemap.xml, ...)
  // and the generated icon/OG image routes, which live outside [locale]
  matcher: ["/((?!api|_next|_vercel|icon|apple-icon|opengraph-image|pwa-icon|.*\\..*).*)"],
}
