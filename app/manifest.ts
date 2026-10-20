import type { MetadataRoute } from "next"
import { SITE_NAME } from "@/lib/site"
// The manifest has no locale, so it uses the default one (zh-Hant)
import metadata from "@/messages/zh-Hant/Metadata.json"
import nav from "@/messages/zh-Hant/Nav.json"
import dashboard from "@/messages/zh-Hant/Dashboard.json"

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${SITE_NAME}｜${metadata.appleTitle}`,
    short_name: SITE_NAME,
    description: metadata.siteDescription,
    lang: "zh-Hant",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#fcfcfc",
    theme_color: "#18181b",
    categories: ["utilities", "productivity"],
    shortcuts: [
      { name: dashboard.new.title, url: "/dashboard/new", icons: [{ src: "/pwa-icon/192", sizes: "192x192" }] },
      { name: nav.recent, url: "/recent", icons: [{ src: "/pwa-icon/192", sizes: "192x192" }] },
      { name: nav.explore, url: "/explore", icons: [{ src: "/pwa-icon/192", sizes: "192x192" }] },
    ],
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Captured from demo data; Chrome shows the richer install dialog only when these exist
    screenshots: [
      { src: "/screenshots/mobile-dashboard.jpg", sizes: "780x1688", type: "image/jpeg", form_factor: "narrow", label: "我的清單" },
      { src: "/screenshots/mobile-playlist.jpg", sizes: "780x1688", type: "image/jpeg", form_factor: "narrow", label: "清單內容" },
      { src: "/screenshots/mobile-links.jpg", sizes: "780x1688", type: "image/jpeg", form_factor: "narrow", label: "一鍵產生影片連結" },
      { src: "/screenshots/wide-dashboard.jpg", sizes: "2560x1600", type: "image/jpeg", form_factor: "wide", label: "我的清單" },
      { src: "/screenshots/wide-playlist.jpg", sizes: "2560x1600", type: "image/jpeg", form_factor: "wide", label: "清單內容" },
    ],
  }
}
