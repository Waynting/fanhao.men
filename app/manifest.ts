import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AV Number Collector",
    short_name: "番號收藏",
    description: "輕鬆管理你的番號收藏",
    lang: "zh-Hant",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#fcfcfc",
    theme_color: "#18181b",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
